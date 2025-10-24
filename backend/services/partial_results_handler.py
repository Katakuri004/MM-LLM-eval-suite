"""
Partial Results Handler Service

Handles saving and managing partial results during evaluation runs.
Ensures that results are preserved even if evaluations fail partway through.
"""

import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import structlog

from services.supabase_service import supabase_service

logger = structlog.get_logger(__name__)

class PartialResultsHandler:
    """Service for handling partial results during evaluations."""
    
    def __init__(self):
        """Initialize the partial results handler."""
        self.workspace_root = Path("C:/temp/lmms_eval_workspace")
        self.partial_results_dir = self.workspace_root / "partial_results"
        self.partial_results_dir.mkdir(exist_ok=True, parents=True)
        
        logger.info("Partial results handler initialized", 
                   workspace=str(self.workspace_root))
    
    async def save_partial_result(
        self, 
        evaluation_id: str, 
        benchmark_id: str, 
        benchmark_name: str,
        result_data: Dict[str, Any],
        is_complete: bool = False
    ) -> None:
        """
        Save partial result for a benchmark.
        
        Args:
            evaluation_id: ID of the evaluation
            benchmark_id: ID of the benchmark
            benchmark_name: Name of the benchmark
            result_data: Result data to save
            is_complete: Whether this benchmark is complete
        """
        try:
            # Create partial result record
            partial_result = {
                "evaluation_id": evaluation_id,
                "benchmark_id": benchmark_id,
                "benchmark_name": benchmark_name,
                "result_data": result_data,
                "is_complete": is_complete,
                "saved_at": datetime.utcnow().isoformat(),
                "version": "1.0"
            }
            
            # Save to file system for backup
            await self._save_to_filesystem(evaluation_id, benchmark_id, partial_result)
            
            # Save to database
            await self._save_to_database(partial_result)
            
            logger.info(
                "Partial result saved",
                evaluation_id=evaluation_id,
                benchmark_id=benchmark_id,
                is_complete=is_complete
            )
            
        except Exception as e:
            logger.error(
                "Failed to save partial result",
                evaluation_id=evaluation_id,
                benchmark_id=benchmark_id,
                error=str(e)
            )
            raise
    
    async def _save_to_filesystem(
        self, 
        evaluation_id: str, 
        benchmark_id: str, 
        partial_result: Dict[str, Any]
    ) -> None:
        """Save partial result to file system."""
        try:
            # Create evaluation-specific directory
            eval_dir = self.partial_results_dir / evaluation_id
            eval_dir.mkdir(exist_ok=True)
            
            # Save individual benchmark result
            benchmark_file = eval_dir / f"{benchmark_id}.json"
            with open(benchmark_file, 'w') as f:
                json.dump(partial_result, f, indent=2)
            
            # Update evaluation summary
            await self._update_evaluation_summary(evaluation_id)
            
        except Exception as e:
            logger.error("Failed to save to filesystem", error=str(e))
            raise
    
    async def _save_to_database(self, partial_result: Dict[str, Any]) -> None:
        """Save partial result to database."""
        try:
            # Store in evaluation_results table with is_partial flag
            result_data = {
                "evaluation_id": partial_result["evaluation_id"],
                "benchmark_id": partial_result["benchmark_id"],
                "benchmark_name": partial_result["benchmark_name"],
                "metrics": partial_result["result_data"].get("metrics", {}),
                "scores": partial_result["result_data"].get("scores", {}),
                "is_partial": not partial_result["is_complete"],
                "created_at": partial_result["saved_at"]
            }
            
            supabase_service.create_evaluation_result(result_data)
            
        except Exception as e:
            logger.error("Failed to save to database", error=str(e))
            raise
    
    async def _update_evaluation_summary(self, evaluation_id: str) -> None:
        """Update evaluation summary with partial results info."""
        try:
            eval_dir = self.partial_results_dir / evaluation_id
            
            if not eval_dir.exists():
                return
            
            # Count completed benchmarks
            completed_files = list(eval_dir.glob("*.json"))
            completed_count = len(completed_files)
            
            # Get total benchmarks from evaluation
            evaluation = supabase_service.get_evaluation(evaluation_id)
            if not evaluation:
                return
            
            total_benchmarks = len(evaluation.get('metadata', {}).get('benchmark_ids', []))
            
            # Update evaluation with partial results info
            update_data = {
                "is_partial": completed_count < total_benchmarks,
                "completed_benchmarks_count": completed_count,
                "total_benchmarks_count": total_benchmarks,
                "last_partial_save_at": datetime.utcnow().isoformat()
            }
            
            supabase_service.update_evaluation(evaluation_id, update_data)
            
            logger.info(
                "Evaluation summary updated",
                evaluation_id=evaluation_id,
                completed=completed_count,
                total=total_benchmarks,
                is_partial=update_data["is_partial"]
            )
            
        except Exception as e:
            logger.error("Failed to update evaluation summary", error=str(e))
    
    async def get_partial_results(self, evaluation_id: str) -> List[Dict[str, Any]]:
        """
        Get all partial results for an evaluation.
        
        Args:
            evaluation_id: ID of the evaluation
            
        Returns:
            List of partial results
        """
        try:
            eval_dir = self.partial_results_dir / evaluation_id
            
            if not eval_dir.exists():
                return []
            
            partial_results = []
            for result_file in eval_dir.glob("*.json"):
                with open(result_file, 'r') as f:
                    result_data = json.load(f)
                    partial_results.append(result_data)
            
            # Sort by saved_at timestamp
            partial_results.sort(key=lambda x: x.get('saved_at', ''))
            
            logger.info(
                "Retrieved partial results",
                evaluation_id=evaluation_id,
                count=len(partial_results)
            )
            
            return partial_results
            
        except Exception as e:
            logger.error("Failed to get partial results", error=str(e))
            return []
    
    async def get_completed_benchmarks(self, evaluation_id: str) -> List[str]:
        """
        Get list of completed benchmark IDs for an evaluation.
        
        Args:
            evaluation_id: ID of the evaluation
            
        Returns:
            List of completed benchmark IDs
        """
        try:
            partial_results = await self.get_partial_results(evaluation_id)
            completed_benchmarks = [
                result["benchmark_id"] 
                for result in partial_results 
                if result.get("is_complete", False)
            ]
            
            logger.info(
                "Retrieved completed benchmarks",
                evaluation_id=evaluation_id,
                completed=completed_benchmarks
            )
            
            return completed_benchmarks
            
        except Exception as e:
            logger.error("Failed to get completed benchmarks", error=str(e))
            return []
    
    async def cleanup_partial_results(self, evaluation_id: str) -> None:
        """
        Clean up partial results for a completed evaluation.
        
        Args:
            evaluation_id: ID of the evaluation
        """
        try:
            eval_dir = self.partial_results_dir / evaluation_id
            
            if eval_dir.exists():
                # Move to completed directory instead of deleting
                completed_dir = self.partial_results_dir / "completed"
                completed_dir.mkdir(exist_ok=True)
                
                target_dir = completed_dir / evaluation_id
                if target_dir.exists():
                    import shutil
                    shutil.rmtree(target_dir)
                
                eval_dir.rename(target_dir)
                
                logger.info(
                    "Partial results cleaned up",
                    evaluation_id=evaluation_id,
                    moved_to=str(target_dir)
                )
            
        except Exception as e:
            logger.error("Failed to cleanup partial results", error=str(e))
    
    async def get_evaluation_progress(self, evaluation_id: str) -> Dict[str, Any]:
        """
        Get evaluation progress information.
        
        Args:
            evaluation_id: ID of the evaluation
            
        Returns:
            Progress information dictionary
        """
        try:
            evaluation = supabase_service.get_evaluation(evaluation_id)
            if not evaluation:
                return {"error": "Evaluation not found"}
            
            completed_benchmarks = await self.get_completed_benchmarks(evaluation_id)
            total_benchmarks = len(evaluation.get('metadata', {}).get('benchmark_ids', []))
            
            progress = {
                "evaluation_id": evaluation_id,
                "completed_benchmarks": completed_benchmarks,
                "completed_count": len(completed_benchmarks),
                "total_count": total_benchmarks,
                "progress_percentage": (len(completed_benchmarks) / total_benchmarks * 100) if total_benchmarks > 0 else 0,
                "is_partial": len(completed_benchmarks) < total_benchmarks,
                "last_updated": datetime.utcnow().isoformat()
            }
            
            return progress
            
        except Exception as e:
            logger.error("Failed to get evaluation progress", error=str(e))
            return {"error": str(e)}

# Global instance
partial_results_handler = PartialResultsHandler()
