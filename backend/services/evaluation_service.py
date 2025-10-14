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
from services.database_service import db_service
from models import Run, Result, RunStatus

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
                "status": RunStatus.PENDING.value,
                "config": config,
                "started_at": datetime.now().isoformat()
            }
            
            # Save to database
            run = db_service.create_run(run_data)
            logger.info("Evaluation run created", run_id=run_id)
            
            # Start evaluation task
            task = asyncio.create_task(
                self._run_evaluation(run_id, model_id, benchmark_ids, config)
            )
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
            db_service.update_run_status(run_id, RunStatus.RUNNING.value)
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
            db_service.update_run_status(
                run_id,
                RunStatus.COMPLETED.value,
                completed_at=end_time.isoformat(),
                duration_seconds=str(duration),
                results=results
            )
            
            logger.info("Evaluation completed", run_id=run_id, duration=duration)
            
        except Exception as e:
            logger.error("Evaluation failed", run_id=run_id, error=str(e))
            db_service.update_run_status(
                run_id,
                RunStatus.FAILED.value,
                error_message=str(e)
            )
        finally:
            # Clean up active run
            if run_id in self.active_runs:
                del self.active_runs[run_id]
    
    async def _execute_runner(self, runner: LMMSEvalRunner) -> Dict[str, Any]:
        """Execute the lmms-eval runner."""
        try:
            # This would run the actual evaluation
            # For now, we'll simulate the process
            logger.info("Executing lmms-eval runner")
            
            # In a real implementation, this would:
            # 1. Prepare the command
            # 2. Execute the evaluation
            # 3. Parse the results
            # 4. Return structured results
            
            # Simulate evaluation results
            results = {
                "metrics": {
                    "accuracy": 0.85,
                    "f1_score": 0.82,
                    "bleu_score": 0.78
                },
                "samples_processed": 100,
                "duration_seconds": 120.5,
                "model_performance": {
                    "inference_time": 0.5,
                    "memory_usage": "2.1GB"
                }
            }
            
            return results
            
        except Exception as e:
            logger.error("Failed to execute runner", error=str(e))
            raise
    
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
                    db_service.create_result(result_data)
            
            logger.info("Results saved successfully", run_id=run_id)
            
        except Exception as e:
            logger.error("Failed to save results", run_id=run_id, error=str(e))
            raise
    
    async def get_run_status(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Get run status."""
        try:
            run = db_service.get_run_by_id(run_id)
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
    
    def _calculate_progress(self, run: Run) -> int:
        """Calculate run progress percentage."""
        if run.status == RunStatus.COMPLETED.value:
            return 100
        elif run.status == RunStatus.FAILED.value:
            return 0
        elif run.status == RunStatus.RUNNING.value:
            # This would be calculated based on actual progress
            return 50  # Placeholder
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
                db_service.update_run_status(run_id, RunStatus.CANCELLED.value)
                
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
            run = db_service.get_run_by_id(run_id)
            if not run:
                return None
            
            # Get individual results
            results = db_service.get_results_by_run_id(run_id)
            
            return {
                "run_id": run_id,
                "status": run.status,
                "results": run.results,
                "individual_results": [result.to_dict() for result in results],
                "logs": run.logs,
                "error_message": run.error_message,
                "started_at": run.started_at,
                "completed_at": run.completed_at,
                "duration_seconds": run.duration_seconds
            }
            
        except Exception as e:
            logger.error("Failed to get run results", run_id=run_id, error=str(e))
            return None

# Global evaluation service instance
evaluation_service = EvaluationService()
