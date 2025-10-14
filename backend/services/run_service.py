"""
Run service for managing evaluation runs.

This module provides business logic for creating, monitoring, and managing
evaluation runs in the LMMS-Eval Dashboard.
"""

from typing import Dict, List, Optional, Any
import structlog
from datetime import datetime
import asyncio

from database import DatabaseManager
from runners.lmms_eval_runner import LMMSEvalRunner
from runners.gpu_scheduler import GPUScheduler
from websocket_manager import websocket_manager

# Configure structured logging
logger = structlog.get_logger(__name__)


class RunService:
    """
    Service for managing evaluation runs.
    
    Handles run creation, execution, monitoring, and status updates.
    """
    
    def __init__(self):
        """Initialize run service."""
        self.active_runs: Dict[str, Dict[str, Any]] = {}
        self.gpu_scheduler = GPUScheduler()
    
    async def create_run(
        self,
        name: str,
        model_id: str,
        benchmark_ids: List[str],
        config: Dict[str, Any],
        user_id: str,
        db: DatabaseManager
    ) -> Optional[str]:
        """
        Create a new evaluation run.
        
        Args:
            name: Run name
            model_id: Model ID
            benchmark_ids: List of benchmark IDs
            config: Run configuration
            user_id: User ID
            db: Database manager
            
        Returns:
            Optional[str]: Run ID if successful, None otherwise
        """
        try:
            logger.info(
                "Creating new run",
                run_name=name,
                model_id=model_id,
                benchmark_count=len(benchmark_ids),
                user_id=user_id
            )
            
            # Create run in database
            run_id = await db.create_run(
                name=name,
                model_id=model_id,
                benchmark_ids=benchmark_ids,
                config=config,
                user_id=user_id
            )
            
            if not run_id:
                logger.error("Failed to create run in database")
                return None
            
            # Queue run for execution
            await self._queue_run(run_id, db)
            
            logger.info("Run created and queued successfully", run_id=run_id)
            return run_id
            
        except Exception as e:
            logger.error(
                "Failed to create run",
                error=str(e),
                run_name=name,
                user_id=user_id
            )
            return None
    
    async def _queue_run(self, run_id: str, db: DatabaseManager):
        """
        Queue a run for execution.
        
        Args:
            run_id: Run ID
            db: Database manager
        """
        try:
            # Update run status to queued
            await db.update_run_status(run_id, "queued")
            
            # Start execution in background
            asyncio.create_task(self._execute_run(run_id, db))
            
            logger.info("Run queued for execution", run_id=run_id)
            
        except Exception as e:
            logger.error(
                "Failed to queue run",
                error=str(e),
                run_id=run_id
            )
            await db.update_run_status(
                run_id, "failed", f"Failed to queue run: {str(e)}"
            )
    
    async def _execute_run(self, run_id: str, db: DatabaseManager):
        """
        Execute a run.
        
        Args:
            run_id: Run ID
            db: Database manager
        """
        try:
            # Get run details
            run = await db.get_run_by_id(run_id)
            if not run:
                logger.error("Run not found", run_id=run_id)
                return
            
            # Allocate GPU
            gpus = self.gpu_scheduler.allocate(
                run_id, run["config"].get("compute_profile", "default")
            )
            
            if not gpus:
                logger.error("No GPUs available for run", run_id=run_id)
                await db.update_run_status(
                    run_id, "failed", "No GPUs available"
                )
                return
            
            # Update run with GPU allocation
            await db.execute_query(
                table="runs",
                operation="update",
                data={"gpu_device_id": ",".join(gpus)},
                filters={"id": run_id},
                admin_access=True
            )
            
            # Update status to running
            await db.update_run_status(run_id, "running")
            await db.execute_query(
                table="runs",
                operation="update",
                data={"started_at": datetime.utcnow().isoformat()},
                filters={"id": run_id},
                admin_access=True
            )
            
            # Create runner
            runner = LMMSEvalRunner(
                model_id=run["model_id"],
                benchmark_ids=run["config"].get("benchmark_ids", []),
                config=run["config"]
            )
            
            # Start execution
            process_id = runner.start()
            await db.execute_query(
                table="runs",
                operation="update",
                data={"process_id": process_id},
                filters={"id": run_id},
                admin_access=True
            )
            
            # Store active run
            self.active_runs[run_id] = {
                "runner": runner,
                "gpus": gpus,
                "start_time": datetime.utcnow()
            }
            
            # Stream logs and metrics
            await self._stream_run_updates(run_id, runner, db)
            
        except Exception as e:
            logger.error(
                "Failed to execute run",
                error=str(e),
                run_id=run_id
            )
            await db.update_run_status(
                run_id, "failed", f"Execution failed: {str(e)}"
            )
            await self._cleanup_run(run_id)
    
    async def _stream_run_updates(
        self,
        run_id: str,
        runner: LMMSEvalRunner,
        db: DatabaseManager
    ):
        """
        Stream run updates via WebSocket.
        
        Args:
            run_id: Run ID
            runner: LMMS eval runner
            db: Database manager
        """
        try:
            # Stream logs
            for log_line in runner.stream_logs():
                # Save to database
                await db.execute_query(
                    table="run_logs",
                    operation="insert",
                    data={
                        "run_id": run_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        "level": "INFO",
                        "message": log_line
                    },
                    admin_access=True
                )
                
                # Broadcast via WebSocket
                await websocket_manager.broadcast(
                    run_id,
                    {
                        "type": "log_line",
                        "data": {
                            "timestamp": datetime.utcnow().isoformat(),
                            "level": "INFO",
                            "message": log_line
                        }
                    }
                )
            
            # Parse and save metrics
            metrics = runner.parse_metrics(runner.stdout)
            for benchmark_id, metric_data in metrics.items():
                await db.insert_metrics(
                    run_id=run_id,
                    benchmark_id=benchmark_id,
                    metrics=metric_data
                )
                
                # Broadcast metric update
                await websocket_manager.broadcast(
                    run_id,
                    {
                        "type": "metric_update",
                        "data": {
                            "benchmark_id": benchmark_id,
                            "metrics": metric_data
                        }
                    }
                )
            
            # Update run status to completed
            await db.update_run_status(run_id, "completed")
            await db.execute_query(
                table="runs",
                operation="update",
                data={"completed_at": datetime.utcnow().isoformat()},
                filters={"id": run_id},
                admin_access=True
            )
            
            # Cleanup
            await self._cleanup_run(run_id)
            
        except Exception as e:
            logger.error(
                "Failed to stream run updates",
                error=str(e),
                run_id=run_id
            )
            await db.update_run_status(
                run_id, "failed", f"Streaming failed: {str(e)}"
            )
            await self._cleanup_run(run_id)
    
    async def _cleanup_run(self, run_id: str):
        """
        Cleanup resources for a run.
        
        Args:
            run_id: Run ID
        """
        try:
            if run_id in self.active_runs:
                run_info = self.active_runs[run_id]
                
                # Cleanup runner
                if "runner" in run_info:
                    run_info["runner"].cleanup()
                
                # Deallocate GPUs
                if "gpus" in run_info:
                    self.gpu_scheduler.deallocate(run_id)
                
                # Remove from active runs
                del self.active_runs[run_id]
                
                logger.info("Run cleanup completed", run_id=run_id)
                
        except Exception as e:
            logger.error(
                "Failed to cleanup run",
                error=str(e),
                run_id=run_id
            )
    
    async def cancel_run(self, run_id: str, db: DatabaseManager) -> bool:
        """
        Cancel a running evaluation.
        
        Args:
            run_id: Run ID
            db: Database manager
            
        Returns:
            bool: True if cancellation successful, False otherwise
        """
        try:
            # Check if run is active
            if run_id in self.active_runs:
                run_info = self.active_runs[run_id]
                
                # Stop runner
                if "runner" in run_info:
                    run_info["runner"].cleanup()
                
                # Deallocate GPUs
                if "gpus" in run_info:
                    self.gpu_scheduler.deallocate(run_id)
                
                # Remove from active runs
                del self.active_runs[run_id]
            
            # Update database status
            success = await db.update_run_status(
                run_id, "cancelled", "Cancelled by user"
            )
            
            if success:
                logger.info("Run cancelled successfully", run_id=run_id)
            
            return success
            
        except Exception as e:
            logger.error(
                "Failed to cancel run",
                error=str(e),
                run_id=run_id
            )
            return False
    
    def get_active_runs(self) -> List[str]:
        """
        Get list of active run IDs.
        
        Returns:
            List[str]: List of active run IDs
        """
        return list(self.active_runs.keys())
    
    async def get_run_progress(self, run_id: str, db: DatabaseManager) -> Optional[Dict[str, Any]]:
        """
        Get run progress information.
        
        Args:
            run_id: Run ID
            db: Database manager
            
        Returns:
            Optional[Dict[str, Any]]: Run progress data
        """
        try:
            run = await db.get_run_by_id(run_id)
            if not run:
                return None
            
            progress_data = {
                "run_id": run_id,
                "status": run["status"],
                "total_tasks": run["total_tasks"],
                "completed_tasks": run["completed_tasks"],
                "progress_percent": (
                    (run["completed_tasks"] / run["total_tasks"]) * 100
                    if run["total_tasks"] > 0 else 0
                ),
                "started_at": run.get("started_at"),
                "completed_at": run.get("completed_at"),
                "error_message": run.get("error_message")
            }
            
            # Add active run specific data
            if run_id in self.active_runs:
                run_info = self.active_runs[run_id]
                progress_data.update({
                    "gpus": run_info.get("gpus", []),
                    "start_time": run_info.get("start_time"),
                    "is_active": True
                })
            else:
                progress_data["is_active"] = False
            
            return progress_data
            
        except Exception as e:
            logger.error(
                "Failed to get run progress",
                error=str(e),
                run_id=run_id
            )
            return None
