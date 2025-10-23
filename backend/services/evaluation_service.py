"""
Evaluation service for managing evaluation runs with lmms-eval integration.
"""

import asyncio
import structlog
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid
import json

from runners.lmms_eval_runner import LMMSEvalRunner
from services.supabase_service import supabase_service

logger = structlog.get_logger(__name__)

class EvaluationService:
    """Service for managing evaluation runs."""
    
    def __init__(self):
        """Initialize evaluation service."""
        self.active_runs: Dict[str, asyncio.Task] = {}
        logger.info("Evaluation service initialized")
    
    async def start_evaluation(
        self,
        model_id: str,
        benchmark_ids: List[str],
        config: Dict[str, Any],
        run_name: Optional[str] = None
    ) -> str:
        """Start a new evaluation run."""
        try:
            # Create run record
            run_id = str(uuid.uuid4())
            run_data = {
                "id": run_id,
                "name": run_name or f"Evaluation {run_id[:8]}",
                "model_id": model_id,
                "benchmark_id": benchmark_ids[0] if len(benchmark_ids) == 1 else None,
                "status": "pending",
                "config": config,
                "started_at": datetime.now().isoformat()
            }
            
            # Save to database
            run = supabase_service.create_run(run_data)
            logger.info("Evaluation run created", run_id=run_id)
            
            # Start evaluation task
            task = asyncio.create_task(self._run_evaluation(run_id, model_id, benchmark_ids, config))
            self.active_runs[run_id] = task
            
            return run_id
            
        except Exception as e:
            logger.error("Failed to start evaluation", error=str(e))
            raise
    
    async def _run_evaluation(
        self,
        run_id: str,
        model_id: str,
        benchmark_ids: List[str],
        config: Dict[str, Any]
    ):
        """Run the actual evaluation."""
        try:
            # Update status to running
            supabase_service.update_run_status(run_id, "running")
            logger.info("Starting evaluation", run_id=run_id, model_id=model_id)
            
            # Initialize lmms-eval runner
            runner = LMMSEvalRunner(
                model_id=model_id,
                benchmark_ids=benchmark_ids,
                config=config
            )
            
            # Run evaluation
            start_time = datetime.now()
            results = await self._execute_runner(runner)
            end_time = datetime.now()
            
            # Calculate duration
            duration = (end_time - start_time).total_seconds()
            
            # Save results
            await self._save_results(run_id, results, duration)
            
            # Update run status
            supabase_service.update_run_status(
                run_id,
                "completed",
                completed_at=end_time.isoformat(),
                duration_seconds=str(duration),
                results=results
            )
            
            logger.info("Evaluation completed", run_id=run_id, duration=duration)
            
        except Exception as e:
            logger.error("Evaluation failed", run_id=run_id, error=str(e))
            supabase_service.update_run_status(
                run_id,
                "failed",
                error_message=str(e)
            )
        finally:
            # Clean up active run
            if run_id in self.active_runs:
                del self.active_runs[run_id]
    
    async def _execute_runner(self, runner: LMMSEvalRunner) -> Dict[str, Any]:
        """Execute the lmms-eval runner with real integration."""
        try:
            logger.info("Executing lmms-eval runner", 
                       model_id=runner.model_id, 
                       benchmark_ids=runner.benchmark_ids)
            
            # Prepare the command
            command = runner.prepare_command()
            logger.info("Prepared lmms-eval command", command=command)
            
            # Execute the evaluation with real-time monitoring
            # The runner doesn't store run_id; pass our run_id
            results = await self._run_lmms_eval_command(run_id, command, runner.lmms_eval_path)
            
            return results
            
        except Exception as e:
            logger.error("Failed to execute runner", error=str(e))
            raise
    
    async def _run_lmms_eval_command(self, run_id: str, command: List[str], workdir: str) -> Dict[str, Any]:
        """Run the actual lmms-eval command with real-time monitoring."""
        import subprocess
        import asyncio
        from datetime import datetime
        
        try:
            # Start the process
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=workdir
            )
            
            logger.info("Started lmms-eval process", run_id=run_id, pid=process.pid)
            
            # Send process start notification
            await self._send_websocket_update(run_id, "process_started", {
                "pid": process.pid,
                "command": " ".join(command),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Monitor output in real-time
            output_lines = []
            metrics = {}
            progress = 0
            
            while True:
                # Read output line by line
                line = await process.stdout.readline()
                if not line:
                    break
                
                line_text = line.decode('utf-8').strip()
                output_lines.append(line_text)
                
                # Parse progress and metrics from output
                parsed_data = self._parse_lmms_eval_output(line_text)
                if parsed_data:
                    if "progress" in parsed_data:
                        progress = parsed_data["progress"]
                        await self._send_websocket_update(run_id, "progress_update", {
                            "progress": progress,
                            "message": parsed_data.get("message", ""),
                            "timestamp": datetime.utcnow().isoformat()
                        })
                    
                    if "metrics" in parsed_data:
                        metrics.update(parsed_data["metrics"])
                        await self._send_websocket_update(run_id, "metric_update", {
                            "metrics": parsed_data["metrics"],
                            "timestamp": datetime.utcnow().isoformat()
                        })
                
                # Send log updates
                await self._send_websocket_update(run_id, "log_update", {
                    "level": "INFO",
                    "message": line_text,
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            # Wait for process to complete
            return_code = await process.wait()
            
            if return_code == 0:
                # Parse final results
                final_results = self._parse_final_results(output_lines, metrics)
                
                await self._send_websocket_update(run_id, "evaluation_completed", {
                    "results": final_results,
                    "return_code": return_code,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                return final_results
            else:
                error_message = f"lmms-eval process failed with return code {return_code}"
                logger.error("lmms-eval process failed", run_id=run_id, return_code=return_code)
                
                await self._send_websocket_update(run_id, "evaluation_failed", {
                    "error": error_message,
                    "return_code": return_code,
                    "output": "\n".join(output_lines[-10:]),  # Last 10 lines
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                raise RuntimeError(error_message)
                
        except Exception as e:
            logger.error("Error running lmms-eval command", run_id=run_id, error=str(e))
            
            await self._send_websocket_update(run_id, "evaluation_error", {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            raise
    
    def _parse_lmms_eval_output(self, line: str) -> Optional[Dict[str, Any]]:
        """Parse lmms-eval output to extract progress and metrics."""
        try:
            # Parse progress indicators
            if "Progress:" in line or "progress:" in line:
                # Extract progress percentage
                import re
                progress_match = re.search(r'(\d+)%', line)
                if progress_match:
                    progress = int(progress_match.group(1))
                    return {"progress": progress, "message": line}
            
            # Parse metric updates
            if "=" in line and any(metric in line.lower() for metric in ["accuracy", "f1", "bleu", "rouge", "meteor"]):
                # Extract metric name and value
                import re
                metric_match = re.search(r'(\w+)\s*[:=]\s*([\d.]+)', line)
                if metric_match:
                    metric_name = metric_match.group(1).lower()
                    metric_value = float(metric_match.group(2))
                    return {"metrics": {metric_name: metric_value}}
            
            # Parse benchmark completion
            if "completed" in line.lower() and "benchmark" in line.lower():
                return {"progress": 100, "message": line}
            
            return None
            
        except Exception as e:
            logger.debug("Failed to parse lmms-eval output", line=line, error=str(e))
            return None
    
    def _parse_final_results(self, output_lines: List[str], metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Parse final results from lmms-eval output."""
        try:
            # Look for final results in the last few lines
            final_results = {
                "metrics": metrics.copy(),
                "samples_processed": 0,
                "duration_seconds": 0,
                "model_performance": {},
                "raw_output": output_lines[-20:]  # Last 20 lines
            }
            
            # Parse sample count
            for line in output_lines:
                if "samples" in line.lower() and "processed" in line.lower():
                    import re
                    sample_match = re.search(r'(\d+)\s*samples', line)
                    if sample_match:
                        final_results["samples_processed"] = int(sample_match.group(1))
                        break
            
            # Parse duration
            for line in output_lines:
                if "duration" in line.lower() or "time" in line.lower():
                    import re
                    time_match = re.search(r'(\d+\.?\d*)\s*(seconds?|s|minutes?|min)', line)
                    if time_match:
                        duration = float(time_match.group(1))
                        unit = time_match.group(2).lower()
                        if "min" in unit:
                            duration *= 60
                        final_results["duration_seconds"] = duration
                        break
            
            # Parse memory usage
            for line in output_lines:
                if "memory" in line.lower() or "gpu" in line.lower():
                    import re
                    memory_match = re.search(r'(\d+\.?\d*)\s*(GB|MB)', line)
                    if memory_match:
                        memory = float(memory_match.group(1))
                        unit = memory_match.group(2)
                        if unit == "MB":
                            memory /= 1024
                        final_results["model_performance"]["memory_usage"] = f"{memory:.1f}GB"
                        break
            
            return final_results
            
        except Exception as e:
            logger.error("Failed to parse final results", error=str(e))
            return {
                "metrics": metrics,
                "samples_processed": 0,
                "duration_seconds": 0,
                "model_performance": {},
                "raw_output": output_lines[-10:],
                "parse_error": str(e)
            }
    
    async def _send_websocket_update(self, run_id: str, update_type: str, data: Dict[str, Any]):
        """Send WebSocket update for run progress."""
        try:
            from api.websocket_endpoints import (
                send_run_progress_update,
                send_run_log_update,
                send_run_status_update,
                send_run_metric_update,
                send_run_error_update
            )
            
            if update_type == "progress_update":
                await send_run_progress_update(run_id, data)
            elif update_type == "log_update":
                await send_run_log_update(run_id, data)
            elif update_type == "status_update":
                await send_run_status_update(run_id, data)
            elif update_type == "metric_update":
                await send_run_metric_update(run_id, data)
            elif update_type in ["evaluation_failed", "evaluation_error"]:
                await send_run_error_update(run_id, data)
            else:
                # Generic update
                from services.websocket_manager import connection_manager, WebSocketMessage
                message = WebSocketMessage(update_type, data, run_id)
                await connection_manager.broadcast_to_run(run_id, message)
                
        except Exception as e:
            logger.error("Failed to send WebSocket update", 
                        run_id=run_id, 
                        update_type=update_type, 
                        error=str(e))
    
    async def _save_results(self, run_id: str, results: Dict[str, Any], duration: float):
        """Save evaluation results to database."""
        try:
            # Save individual metrics as results
            if "metrics" in results:
                for metric_name, metric_value in results["metrics"].items():
                    result_data = {
                        "run_id": run_id,
                        "metric_name": metric_name,
                        "metric_value": float(metric_value),
                        "metric_type": "primary",
                        "metadata": {
                            "duration": duration,
                            "timestamp": datetime.now().isoformat()
                        }
                    }
                    supabase_service.create_result(result_data)
            
            logger.info("Results saved successfully", run_id=run_id)
            
        except Exception as e:
            logger.error("Failed to save results", run_id=run_id, error=str(e))
            raise
    
    async def get_run_status(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Get run status."""
        try:
            run = supabase_service.get_run_by_id(run_id)
            if not run:
                return None
            
            # Check if run is still active
            is_active = run_id in self.active_runs
            
            return {
                "run_id": run_id,
                "status": run.status,
                "is_active": is_active,
                "progress": self._calculate_progress(run),
                "results": run.results,
                "error_message": run.error_message,
                "started_at": run.started_at,
                "completed_at": run.completed_at,
                "duration_seconds": run.duration_seconds
            }
            
        except Exception as e:
            logger.error("Failed to get run status", run_id=run_id, error=str(e))
            return None
    
    def _calculate_progress(self, run: Dict[str, Any]) -> int:
        """Calculate run progress percentage."""
        if run.get("status") == "completed":
            return 100
        elif run.get("status") == "failed":
            return 0
        elif run.get("status") == "running":
            # Get actual progress from evaluation_progress table
            progress = supabase_service.get_evaluation_progress(run_id)
            return progress.get("progress_percentage", 0) if progress else 0
        else:
            return 0
    
    async def cancel_run(self, run_id: str) -> bool:
        """Cancel an active run."""
        try:
            if run_id in self.active_runs:
                task = self.active_runs[run_id]
                task.cancel()
                del self.active_runs[run_id]
                
                # Update database
                supabase_service.update_run_status(run_id, "cancelled")
                
                logger.info("Run cancelled", run_id=run_id)
                return True
            
            return False
            
        except Exception as e:
            logger.error("Failed to cancel run", run_id=run_id, error=str(e))
            return False
    
    async def get_active_runs(self) -> List[str]:
        """Get list of active run IDs."""
        return list(self.active_runs.keys())
    
    async def get_run_results(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed results for a run."""
        try:
            run = supabase_service.get_run_by_id(run_id)
            if not run:
                return None
            
            # Get individual results
            results = supabase_service.get_results_by_run_id(run_id)
            
            return {
                "run_id": run_id,
                "status": run.get("status"),
                "results": run.get("results"),
                "individual_results": results,
                "logs": run.get("logs"),
                "error_message": run.get("error_message"),
                "started_at": run.get("started_at"),
                "completed_at": run.get("completed_at"),
                "duration_seconds": run.get("duration_seconds")
            }
            
        except Exception as e:
            logger.error("Failed to get run results", run_id=run_id, error=str(e))
            return None

# Global evaluation service instance
evaluation_service = EvaluationService()
