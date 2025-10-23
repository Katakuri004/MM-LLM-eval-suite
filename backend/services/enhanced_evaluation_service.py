"""
Enhanced evaluation service with full lmms-eval integration.
"""

import asyncio
import json
import os
import subprocess
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable
import structlog

from services.supabase_service import supabase_service
from services.websocket_manager import websocket_manager

logger = structlog.get_logger(__name__)

class EnhancedEvaluationService:
    """Enhanced evaluation service with full lmms-eval integration."""
    
    def __init__(self):
        """Initialize the enhanced evaluation service."""
        self.active_evaluations: Dict[str, asyncio.Task] = {}
        self.lmms_eval_path = self._get_lmms_eval_path()
        logger.info("Enhanced evaluation service initialized", lmms_eval_path=self.lmms_eval_path)
    
    def _get_lmms_eval_path(self) -> str:
        """Get the path to lmms-eval installation."""
        # Check if lmms-eval is in the project directory
        project_lmms_eval = Path(__file__).parent.parent.parent / "lmms-eval"
        if project_lmms_eval.exists():
            logger.info("Using local lmms-eval installation", path=str(project_lmms_eval))
            return str(project_lmms_eval)
        
        # Check if lmms-eval is installed globally
        try:
            result = subprocess.run(["which", "lmms-eval"], capture_output=True, text=True)
            if result.returncode == 0:
                logger.info("Using global lmms-eval installation")
                return "lmms-eval"
        except FileNotFoundError:
            pass
        
        # Check environment variable
        env_path = os.getenv("LMMS_EVAL_PATH")
        if env_path and Path(env_path).exists():
            logger.info("Using lmms-eval from environment variable", path=env_path)
            return env_path
        
        # Default to project lmms-eval
        logger.warning("Using default lmms-eval path", path=str(project_lmms_eval))
        return str(project_lmms_eval)
    
    async def start_evaluation(
        self,
        model_id: str,
        benchmark_ids: List[str],
        config: Dict[str, Any],
        evaluation_name: Optional[str] = None
    ) -> str:
        """Start a new evaluation with lmms-eval integration."""
        try:
            # Create evaluation record
            evaluation_id = str(uuid.uuid4())
            evaluation_data = {
                "id": evaluation_id,
                "model_id": model_id,
                "name": evaluation_name or f"Evaluation {evaluation_id[:8]}",
                "status": "pending",
                "config": config,
                "benchmark_ids": benchmark_ids,
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Save to database
            evaluation = supabase_service.create_evaluation(evaluation_data)
            logger.info("Evaluation created", evaluation_id=evaluation_id)
            
            # Start evaluation task
            task = asyncio.create_task(
                self._run_evaluation(evaluation_id, model_id, benchmark_ids, config)
            )
            self.active_evaluations[evaluation_id] = task
            
            return evaluation_id
            
        except Exception as e:
            logger.error("Failed to start evaluation", error=str(e))
            raise
    
    async def _run_evaluation(
        self,
        evaluation_id: str,
        model_id: str,
        benchmark_ids: List[str],
        config: Dict[str, Any]
    ):
        """Run the evaluation using lmms-eval."""
        try:
            # Update status to running
            await self._update_evaluation_status(evaluation_id, "running")
            
            # Get model information
            model = supabase_service.get_model_by_id(model_id)
            if not model:
                raise ValueError(f"Model {model_id} not found")
            
            # Get benchmark information
            benchmarks = []
            for benchmark_id in benchmark_ids:
                benchmark = supabase_service.get_benchmark_by_id(benchmark_id)
                if benchmark:
                    benchmarks.append(benchmark)
            
            if not benchmarks:
                raise ValueError("No valid benchmarks found")
            
            # Map model to lmms-eval format
            lmms_model_name = self._map_model_to_lmms_eval(model)
            
            # Create temporary directory for evaluation
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                
                # Run each benchmark
                total_benchmarks = len(benchmarks)
                for i, benchmark in enumerate(benchmarks):
                    try:
                        # Update progress
                        progress = int((i / total_benchmarks) * 100)
                        await self._update_evaluation_progress(
                            evaluation_id,
                            benchmark["name"],
                            progress,
                            f"Running {benchmark['name']}..."
                        )
                        
                        # Run benchmark with lmms-eval
                        result = await self._run_benchmark(
                            lmms_model_name,
                            benchmark,
                            config,
                            temp_path
                        )
                        
                        # Store result
                        await self._store_benchmark_result(evaluation_id, benchmark, result)
                        
                        # Send progress update via WebSocket
                        await websocket_manager.send_evaluation_update(
                            evaluation_id,
                            {
                                "type": "benchmark_completed",
                                "benchmark": benchmark["name"],
                                "result": result
                            }
                        )
                        
                    except Exception as e:
                        logger.error(
                            "Failed to run benchmark",
                            evaluation_id=evaluation_id,
                            benchmark=benchmark["name"],
                            error=str(e)
                        )
                        # Continue with other benchmarks
                        continue
                
                # Update status to completed
                await self._update_evaluation_status(evaluation_id, "completed")
                
                # Send completion update
                await websocket_manager.send_evaluation_update(
                    evaluation_id,
                    {"type": "evaluation_completed"}
                )
                
        except Exception as e:
            logger.error("Evaluation failed", evaluation_id=evaluation_id, error=str(e))
            await self._update_evaluation_status(evaluation_id, "failed", str(e))
            
            # Send error update
            await websocket_manager.send_evaluation_update(
                evaluation_id,
                {"type": "evaluation_failed", "error": str(e)}
            )
        
        finally:
            # Clean up
            if evaluation_id in self.active_evaluations:
                del self.active_evaluations[evaluation_id]
    
    async def _run_benchmark(
        self,
        model_name: str,
        benchmark: Dict[str, Any],
        config: Dict[str, Any],
        temp_dir: Path
    ) -> Dict[str, Any]:
        """Run a single benchmark using lmms-eval."""
        try:
            # Map benchmark to lmms-eval task name
            task_name = self._map_benchmark_to_lmms_eval(benchmark)
            
            # Prepare lmms-eval command
            cmd = [
                "python", "-m", "lmms_eval",
                "--model", model_name,
                "--tasks", task_name,
                "--output_path", str(temp_dir / f"{task_name}_results.json"),
                "--batch_size", str(config.get("batch_size", 1)),
                "--num_fewshot", str(config.get("num_fewshot", 0)),
                "--limit", str(config.get("limit", 0)) if config.get("limit", 0) > 0 else "0"
            ]
            
            # Add model-specific arguments
            if "model_args" in config:
                for key, value in config["model_args"].items():
                    cmd.extend([f"--{key}", str(value)])
            
            logger.info("Running lmms-eval command", cmd=cmd)
            
            # Run the command
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.lmms_eval_path
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise RuntimeError(f"lmms-eval failed: {stderr.decode()}")
            
            # Parse results
            results_file = temp_dir / f"{task_name}_results.json"
            if results_file.exists():
                with open(results_file, 'r') as f:
                    results = json.load(f)
            else:
                # Parse from stdout if no results file
                results = self._parse_lmms_eval_output(stdout.decode())
            
            return {
                "task_name": task_name,
                "results": results,
                "stdout": stdout.decode(),
                "stderr": stderr.decode()
            }
            
        except Exception as e:
            logger.error("Failed to run benchmark", benchmark=benchmark["name"], error=str(e))
            raise
    
    def _map_model_to_lmms_eval(self, model: Dict[str, Any]) -> str:
        """Map database model to lmms-eval model name."""
        model_name = model.get("name", "").lower()
        model_family = model.get("family", "").lower()
        model_source = model.get("source", "")
        
        # Handle different model sources
        if model_source.startswith("huggingface://"):
            # Extract HuggingFace model name
            return model_source.replace("huggingface://", "")
        elif model_source.startswith("local://"):
            # Handle local models
            return f"local:{model_name}"
        elif model_source.startswith("api://"):
            # Handle API models
            return f"api:{model_name}"
        else:
            # Default mapping based on name and family
            if "llava" in model_family or "llava" in model_name:
                return f"llava:{model_name}"
            elif "qwen" in model_family or "qwen" in model_name:
                return f"qwen:{model_name}"
            elif "gpt" in model_family or "gpt" in model_name:
                return f"openai:{model_name}"
            else:
                return model_name
    
    def _map_benchmark_to_lmms_eval(self, benchmark: Dict[str, Any]) -> str:
        """Map database benchmark to lmms-eval task name."""
        benchmark_name = benchmark.get("name", "").lower()
        
        # Mapping from database benchmark names to lmms-eval task names
        benchmark_mapping = {
            'coco-caption': 'nocaps_caption',
            'vqa-v2': 'vqav2_val',
            'textvqa': 'textvqa_val',
            'gqa': 'gqa',
            'okvqa': 'ok_vqa_val2014',
            'vizwiz': 'vizwiz_vqa_val',
            'scienceqa': 'scienceqa',
            'ai2d': 'ai2d',
            'chartqa': 'chartqa',
            'docvqa': 'docvqa',
            'infographicvqa': 'infovqa_val',
            'ocr-vqa': 'ocrvqa',
            'stvqa': 'stvqa',
            'textcaps': 'textcaps_caption',
            'vcr': 'vcr',
            'refcoco': 'refcoco_bbox_val',
            'refcoco+': 'refcoco+_bbox_val',
            'refcocog': 'refcocog_bbox_val',
            'flickr30k': 'flickr30k',
            'nocaps': 'nocaps_caption',
            'snli-ve': 'snli_ve',
            'valse': 'valse',
            'pope': 'pope',
            'mme': 'mme',
            'llava-bench': 'llava_bench_coco',
            'mmbench': 'mmbench_en_test',
            'mmbench-dev': 'mmbench_en_dev',
        }
        
        return benchmark_mapping.get(benchmark_name, benchmark_name)
    
    def _parse_lmms_eval_output(self, output: str) -> Dict[str, Any]:
        """Parse lmms-eval output to extract results."""
        try:
            # Look for JSON results in the output
            lines = output.split('\n')
            for line in lines:
                if line.strip().startswith('{') and 'accuracy' in line:
                    return json.loads(line)
            
            # Fallback: return basic structure
            return {"accuracy": 0.0, "raw_output": output}
        except Exception as e:
            logger.error("Failed to parse lmms-eval output", error=str(e))
            return {"accuracy": 0.0, "raw_output": output}
    
    async def _update_evaluation_status(
        self,
        evaluation_id: str,
        status: str,
        error_message: Optional[str] = None
    ):
        """Update evaluation status in database."""
        try:
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if status == "running":
                update_data["started_at"] = datetime.utcnow().isoformat()
            elif status in ["completed", "failed", "cancelled"]:
                update_data["completed_at"] = datetime.utcnow().isoformat()
            
            if error_message:
                update_data["error_message"] = error_message
            
            supabase_service.update_evaluation(evaluation_id, update_data)
            logger.info("Updated evaluation status", evaluation_id=evaluation_id, status=status)
            
        except Exception as e:
            logger.error("Failed to update evaluation status", error=str(e))
    
    async def _update_evaluation_progress(
        self,
        evaluation_id: str,
        current_benchmark: str,
        progress: int,
        status_message: str
    ):
        """Update evaluation progress in database."""
        try:
            progress_data = {
                "evaluation_id": evaluation_id,
                "current_benchmark": current_benchmark,
                "progress_percentage": progress,
                "status_message": status_message,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            supabase_service.upsert_evaluation_progress(progress_data)
            
        except Exception as e:
            logger.error("Failed to update evaluation progress", error=str(e))
    
    async def _store_benchmark_result(
        self,
        evaluation_id: str,
        benchmark: Dict[str, Any],
        result: Dict[str, Any]
    ):
        """Store benchmark result in database."""
        try:
            result_data = {
                "evaluation_id": evaluation_id,
                "benchmark_id": benchmark.get("id"),
                "benchmark_name": benchmark.get("name"),
                "task_name": result.get("task_name"),
                "metrics": result.get("results", {}),
                "scores": result.get("results", {}),
                "samples_count": benchmark.get("num_samples", 0),
                "created_at": datetime.utcnow().isoformat()
            }
            
            supabase_service.create_evaluation_result(result_data)
            logger.info("Stored benchmark result", evaluation_id=evaluation_id, benchmark=benchmark["name"])
            
        except Exception as e:
            logger.error("Failed to store benchmark result", error=str(e))
    
    async def cancel_evaluation(self, evaluation_id: str) -> bool:
        """Cancel a running evaluation."""
        try:
            if evaluation_id in self.active_evaluations:
                task = self.active_evaluations[evaluation_id]
                task.cancel()
                del self.active_evaluations[evaluation_id]
                
                await self._update_evaluation_status(evaluation_id, "cancelled")
                return True
            
            return False
            
        except Exception as e:
            logger.error("Failed to cancel evaluation", error=str(e))
            return False
    
    def get_active_evaluations(self) -> List[str]:
        """Get list of active evaluation IDs."""
        return list(self.active_evaluations.keys())

# Global instance
enhanced_evaluation_service = EnhancedEvaluationService()
