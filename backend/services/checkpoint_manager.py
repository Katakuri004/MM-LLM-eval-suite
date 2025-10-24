"""
Checkpoint Manager Service

Handles saving and resuming evaluation checkpoints to enable
resuming interrupted evaluations from where they left off.
"""

import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import structlog

from services.supabase_service import supabase_service

logger = structlog.get_logger(__name__)

class CheckpointManager:
    """Service for managing evaluation checkpoints."""
    
    def __init__(self):
        """Initialize the checkpoint manager."""
        self.workspace_root = Path("C:/temp/lmms_eval_workspace")
        self.checkpoints_dir = self.workspace_root / "checkpoints"
        self.checkpoints_dir.mkdir(exist_ok=True, parents=True)
        
        logger.info("Checkpoint manager initialized", 
                   workspace=str(self.workspace_root))
    
    async def save_checkpoint(
        self, 
        evaluation_id: str, 
        checkpoint_data: Dict[str, Any]
    ) -> None:
        """
        Save evaluation checkpoint.
        
        Args:
            evaluation_id: ID of the evaluation
            checkpoint_data: Checkpoint data to save
        """
        try:
            # Create checkpoint record
            checkpoint = {
                "evaluation_id": evaluation_id,
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0",
                "data": checkpoint_data
            }
            
            # Save to file system
            await self._save_to_filesystem(evaluation_id, checkpoint)
            
            # Save to database
            await self._save_to_database(checkpoint)
            
            logger.info(
                "Checkpoint saved",
                evaluation_id=evaluation_id,
                checkpoint_keys=list(checkpoint_data.keys())
            )
            
        except Exception as e:
            logger.error(
                "Failed to save checkpoint",
                evaluation_id=evaluation_id,
                error=str(e)
            )
            raise
    
    async def _save_to_filesystem(
        self, 
        evaluation_id: str, 
        checkpoint: Dict[str, Any]
    ) -> None:
        """Save checkpoint to file system."""
        try:
            # Create evaluation-specific checkpoint file
            checkpoint_file = self.checkpoints_dir / f"{evaluation_id}.json"
            
            with open(checkpoint_file, 'w') as f:
                json.dump(checkpoint, f, indent=2)
            
            logger.debug("Checkpoint saved to filesystem", 
                        evaluation_id=evaluation_id,
                        file=str(checkpoint_file))
            
        except Exception as e:
            logger.error("Failed to save checkpoint to filesystem", error=str(e))
            raise
    
    async def _save_to_database(self, checkpoint: Dict[str, Any]) -> None:
        """Save checkpoint to database."""
        try:
            # Update evaluation with checkpoint data
            update_data = {
                "checkpoint_data": checkpoint["data"],
                "last_checkpoint_at": checkpoint["timestamp"],
                "updated_at": datetime.utcnow().isoformat()
            }
            
            supabase_service.update_evaluation(
                checkpoint["evaluation_id"], 
                update_data
            )
            
        except Exception as e:
            logger.error("Failed to save checkpoint to database", error=str(e))
            raise
    
    async def load_checkpoint(self, evaluation_id: str) -> Optional[Dict[str, Any]]:
        """
        Load evaluation checkpoint.
        
        Args:
            evaluation_id: ID of the evaluation
            
        Returns:
            Checkpoint data if found, None otherwise
        """
        try:
            # Try to load from file system first
            checkpoint_file = self.checkpoints_dir / f"{evaluation_id}.json"
            
            if checkpoint_file.exists():
                with open(checkpoint_file, 'r') as f:
                    checkpoint = json.load(f)
                
                logger.info(
                    "Checkpoint loaded from filesystem",
                    evaluation_id=evaluation_id,
                    timestamp=checkpoint.get("timestamp")
                )
                
                return checkpoint["data"]
            
            # Fallback to database
            evaluation = supabase_service.get_evaluation(evaluation_id)
            if evaluation and evaluation.get("checkpoint_data"):
                logger.info(
                    "Checkpoint loaded from database",
                    evaluation_id=evaluation_id
                )
                
                return evaluation["checkpoint_data"]
            
            logger.warning("No checkpoint found", evaluation_id=evaluation_id)
            return None
            
        except Exception as e:
            logger.error("Failed to load checkpoint", evaluation_id=evaluation_id, error=str(e))
            return None
    
    async def can_resume(self, evaluation_id: str) -> bool:
        """
        Check if evaluation can be resumed from checkpoint.
        
        Args:
            evaluation_id: ID of the evaluation
            
        Returns:
            True if can resume, False otherwise
        """
        try:
            checkpoint = await self.load_checkpoint(evaluation_id)
            if not checkpoint:
                return False
            
            # Check if checkpoint is recent (within 24 hours)
            checkpoint_time = datetime.fromisoformat(
                checkpoint.get("timestamp", datetime.utcnow().isoformat())
            )
            time_diff = datetime.utcnow() - checkpoint_time
            
            if time_diff.total_seconds() > 86400:  # 24 hours
                logger.warning(
                    "Checkpoint too old to resume",
                    evaluation_id=evaluation_id,
                    age_hours=time_diff.total_seconds() / 3600
                )
                return False
            
            # Check if evaluation is in a resumable state
            evaluation = supabase_service.get_evaluation(evaluation_id)
            if not evaluation:
                return False
            
            resumable_statuses = ["running", "failed", "failed_partial"]
            if evaluation.get("status") not in resumable_statuses:
                logger.info(
                    "Evaluation not in resumable state",
                    evaluation_id=evaluation_id,
                    status=evaluation.get("status")
                )
                return False
            
            logger.info("Evaluation can be resumed", evaluation_id=evaluation_id)
            return True
            
        except Exception as e:
            logger.error("Failed to check resume capability", evaluation_id=evaluation_id, error=str(e))
            return False
    
    async def get_checkpoint_info(self, evaluation_id: str) -> Dict[str, Any]:
        """
        Get checkpoint information.
        
        Args:
            evaluation_id: ID of the evaluation
            
        Returns:
            Checkpoint information
        """
        try:
            checkpoint = await self.load_checkpoint(evaluation_id)
            if not checkpoint:
                return {"exists": False}
            
            evaluation = supabase_service.get_evaluation(evaluation_id)
            
            return {
                "exists": True,
                "timestamp": checkpoint.get("timestamp"),
                "completed_benchmarks": checkpoint.get("completed_benchmarks", []),
                "current_benchmark": checkpoint.get("current_benchmark"),
                "progress_percentage": checkpoint.get("progress_percentage", 0),
                "total_benchmarks": len(checkpoint.get("benchmark_ids", [])),
                "can_resume": await self.can_resume(evaluation_id),
                "evaluation_status": evaluation.get("status") if evaluation else "unknown"
            }
            
        except Exception as e:
            logger.error("Failed to get checkpoint info", evaluation_id=evaluation_id, error=str(e))
            return {"exists": False, "error": str(e)}
    
    async def cleanup_checkpoint(self, evaluation_id: str) -> None:
        """
        Clean up checkpoint files.
        
        Args:
            evaluation_id: ID of the evaluation
        """
        try:
            # Remove checkpoint file
            checkpoint_file = self.checkpoints_dir / f"{evaluation_id}.json"
            if checkpoint_file.exists():
                checkpoint_file.unlink()
                logger.info("Checkpoint file cleaned up", evaluation_id=evaluation_id)
            
            # Clear checkpoint data from database
            supabase_service.update_evaluation(
                evaluation_id,
                {
                    "checkpoint_data": None,
                    "last_checkpoint_at": None,
                    "updated_at": datetime.utcnow().isoformat()
                }
            )
            
        except Exception as e:
            logger.error("Failed to cleanup checkpoint", evaluation_id=evaluation_id, error=str(e))
    
    async def list_checkpoints(self) -> List[Dict[str, Any]]:
        """
        List all available checkpoints.
        
        Returns:
            List of checkpoint information
        """
        try:
            checkpoints = []
            
            for checkpoint_file in self.checkpoints_dir.glob("*.json"):
                try:
                    with open(checkpoint_file, 'r') as f:
                        checkpoint = json.load(f)
                    
                    evaluation_id = checkpoint_file.stem
                    checkpoint_info = await self.get_checkpoint_info(evaluation_id)
                    
                    checkpoints.append({
                        "evaluation_id": evaluation_id,
                        "timestamp": checkpoint.get("timestamp"),
                        "can_resume": checkpoint_info.get("can_resume", False),
                        "progress_percentage": checkpoint_info.get("progress_percentage", 0),
                        "completed_benchmarks": len(checkpoint_info.get("completed_benchmarks", [])),
                        "total_benchmarks": checkpoint_info.get("total_benchmarks", 0)
                    })
                    
                except Exception as e:
                    logger.warning("Failed to load checkpoint file", 
                                 file=str(checkpoint_file), error=str(e))
            
            # Sort by timestamp (newest first)
            checkpoints.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            
            return checkpoints
            
        except Exception as e:
            logger.error("Failed to list checkpoints", error=str(e))
            return []
    
    async def create_benchmark_checkpoint(
        self,
        evaluation_id: str,
        benchmark_id: str,
        benchmark_name: str,
        completed_benchmarks: List[str],
        progress_percentage: float,
        benchmark_results: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Create checkpoint after completing a benchmark.
        
        Args:
            evaluation_id: ID of the evaluation
            benchmark_id: ID of the completed benchmark
            benchmark_name: Name of the completed benchmark
            completed_benchmarks: List of completed benchmark IDs
            progress_percentage: Current progress percentage
            benchmark_results: Results from the completed benchmark
        """
        try:
            # Get current evaluation data
            evaluation = supabase_service.get_evaluation(evaluation_id)
            if not evaluation:
                logger.warning("Evaluation not found for checkpoint", evaluation_id=evaluation_id)
                return
            
            # Create checkpoint data
            checkpoint_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "completed_benchmarks": completed_benchmarks,
                "current_benchmark": benchmark_id,
                "progress_percentage": progress_percentage,
                "benchmark_results": benchmark_results or {},
                "evaluation_config": evaluation.get("config", {}),
                "benchmark_ids": evaluation.get("benchmark_ids", []),
                "model_id": evaluation.get("model_id"),
                "last_completed": {
                    "benchmark_id": benchmark_id,
                    "benchmark_name": benchmark_name,
                    "completed_at": datetime.utcnow().isoformat()
                }
            }
            
            # Save checkpoint
            await self.save_checkpoint(evaluation_id, checkpoint_data)
            
            logger.info(
                "Benchmark checkpoint created",
                evaluation_id=evaluation_id,
                benchmark_id=benchmark_id,
                progress=progress_percentage,
                completed_count=len(completed_benchmarks)
            )
            
        except Exception as e:
            logger.error("Failed to create benchmark checkpoint", 
                        evaluation_id=evaluation_id, 
                        benchmark_id=benchmark_id, 
                        error=str(e))

# Global instance
checkpoint_manager = CheckpointManager()
