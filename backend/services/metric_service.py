"""
Metric service for handling metrics and leaderboards.

This module provides business logic for aggregating metrics, computing
leaderboards, and handling slice-based analysis.
"""

from typing import Dict, List, Optional, Any
import structlog
from datetime import datetime

from database import DatabaseManager

# Configure structured logging
logger = structlog.get_logger(__name__)


class MetricService:
    """
    Service for handling metrics and leaderboards.
    
    Provides methods for aggregating metrics, computing leaderboards,
    and performing slice-based analysis.
    """
    
    def __init__(self):
        """Initialize metric service."""
        pass
    
    async def get_leaderboard(
        self,
        benchmark_id: str,
        slice_id: Optional[str] = None,
        checkpoint_mode: str = "best",
        sort_by: str = "score",
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get leaderboard for a benchmark.
        
        Args:
            benchmark_id: Benchmark ID
            slice_id: Optional slice ID for filtering
            checkpoint_mode: Checkpoint mode (best or specific)
            sort_by: Sort criteria
            limit: Maximum number of entries
            
        Returns:
            List[Dict[str, Any]]: Leaderboard entries
        """
        try:
            logger.info(
                "Computing leaderboard",
                benchmark_id=benchmark_id,
                slice_id=slice_id,
                checkpoint_mode=checkpoint_mode,
                sort_by=sort_by,
                limit=limit
            )
            
            # This would typically involve complex SQL queries with joins
            # For now, return a simplified implementation
            
            # Build query filters
            filters = {"benchmark_id": benchmark_id}
            if slice_id:
                filters["slice_id"] = slice_id
            
            # Get metrics from database
            # Note: This is a simplified implementation
            # In a real system, you would use complex SQL queries with joins
            # to get the best scores per model/checkpoint combination
            
            leaderboard_entries = []
            
            # TODO: Implement actual leaderboard computation
            # This would involve:
            # 1. Joining run_metrics with runs, models, and model_checkpoints
            # 2. Grouping by model and checkpoint
            # 3. Computing best scores based on checkpoint_mode
            # 4. Sorting by the specified criteria
            # 5. Applying limit
            
            logger.info(
                "Leaderboard computed",
                benchmark_id=benchmark_id,
                entry_count=len(leaderboard_entries)
            )
            
            return leaderboard_entries
            
        except Exception as e:
            logger.error(
                "Failed to compute leaderboard",
                error=str(e),
                benchmark_id=benchmark_id
            )
            return []
    
    async def compute_run_metrics(
        self,
        run_id: str,
        db: DatabaseManager
    ) -> Dict[str, Any]:
        """
        Compute aggregated metrics for a run.
        
        Args:
            run_id: Run ID
            db: Database manager
            
        Returns:
            Dict[str, Any]: Aggregated metrics
        """
        try:
            logger.info("Computing run metrics", run_id=run_id)
            
            # Get run details
            run = await db.get_run_by_id(run_id)
            if not run:
                logger.error("Run not found", run_id=run_id)
                return {}
            
            # Get all metrics for this run
            result = await db.execute_query(
                table="run_metrics",
                operation="select",
                filters={"run_id": run_id}
            )
            
            if not result["success"]:
                logger.error("Failed to get run metrics", run_id=run_id)
                return {}
            
            metrics_data = result["data"]
            
            # Aggregate metrics by benchmark
            aggregated_metrics = {}
            for metric in metrics_data:
                benchmark_id = metric["benchmark_id"]
                metric_name = metric["metric_name"]
                metric_value = metric["metric_value"]
                
                if benchmark_id not in aggregated_metrics:
                    aggregated_metrics[benchmark_id] = {}
                
                aggregated_metrics[benchmark_id][metric_name] = metric_value
            
            logger.info(
                "Run metrics computed",
                run_id=run_id,
                benchmark_count=len(aggregated_metrics)
            )
            
            return aggregated_metrics
            
        except Exception as e:
            logger.error(
                "Failed to compute run metrics",
                error=str(e),
                run_id=run_id
            )
            return {}
    
    async def compute_slice_metrics(
        self,
        run_id: str,
        slice_id: str,
        db: DatabaseManager
    ) -> Dict[str, Any]:
        """
        Compute metrics for a specific slice.
        
        Args:
            run_id: Run ID
            slice_id: Slice ID
            db: Database manager
            
        Returns:
            Dict[str, Any]: Slice metrics
        """
        try:
            logger.info(
                "Computing slice metrics",
                run_id=run_id,
                slice_id=slice_id
            )
            
            # Get slice details
            slice_result = await db.execute_query(
                table="slices",
                operation="select",
                filters={"id": slice_id}
            )
            
            if not slice_result["success"] or not slice_result["data"]:
                logger.error("Slice not found", slice_id=slice_id)
                return {}
            
            slice_data = slice_result["data"][0]
            
            # Get metrics for this run and slice
            result = await db.execute_query(
                table="run_metrics",
                operation="select",
                filters={"run_id": run_id, "slice_id": slice_id}
            )
            
            if not result["success"]:
                logger.error("Failed to get slice metrics", run_id=run_id, slice_id=slice_id)
                return {}
            
            metrics_data = result["data"]
            
            # Aggregate metrics by benchmark
            slice_metrics = {}
            for metric in metrics_data:
                benchmark_id = metric["benchmark_id"]
                metric_name = metric["metric_name"]
                metric_value = metric["metric_value"]
                
                if benchmark_id not in slice_metrics:
                    slice_metrics[benchmark_id] = {}
                
                slice_metrics[benchmark_id][metric_name] = metric_value
            
            logger.info(
                "Slice metrics computed",
                run_id=run_id,
                slice_id=slice_id,
                benchmark_count=len(slice_metrics)
            )
            
            return slice_metrics
            
        except Exception as e:
            logger.error(
                "Failed to compute slice metrics",
                error=str(e),
                run_id=run_id,
                slice_id=slice_id
            )
            return {}
    
    async def get_comparison_diff(
        self,
        run_id_1: str,
        run_id_2: str,
        benchmark_id: str,
        db: DatabaseManager
    ) -> List[Dict[str, Any]]:
        """
        Get per-sample differences between two runs.
        
        Args:
            run_id_1: First run ID
            run_id_2: Second run ID
            benchmark_id: Benchmark ID
            db: Database manager
            
        Returns:
            List[Dict[str, Any]]: Per-sample differences
        """
        try:
            logger.info(
                "Computing comparison diff",
                run_id_1=run_id_1,
                run_id_2=run_id_2,
                benchmark_id=benchmark_id
            )
            
            # Get samples for both runs
            samples_1_result = await db.execute_query(
                table="run_samples",
                operation="select",
                filters={"run_id": run_id_1, "benchmark_id": benchmark_id}
            )
            
            samples_2_result = await db.execute_query(
                table="run_samples",
                operation="select",
                filters={"run_id": run_id_2, "benchmark_id": benchmark_id}
            )
            
            if not samples_1_result["success"] or not samples_2_result["success"]:
                logger.error("Failed to get run samples")
                return []
            
            samples_1 = samples_1_result["data"]
            samples_2 = samples_2_result["data"]
            
            # Compute differences
            differences = []
            for i, (sample_1, sample_2) in enumerate(zip(samples_1, samples_2)):
                diff = {
                    "sample_index": i,
                    "benchmark_id": benchmark_id,
                    "run_1_prediction": sample_1.get("prediction"),
                    "run_2_prediction": sample_2.get("prediction"),
                    "run_1_metrics": sample_1.get("metrics", {}),
                    "run_2_metrics": sample_2.get("metrics", {}),
                    "differences": self._compute_sample_differences(
                        sample_1.get("metrics", {}),
                        sample_2.get("metrics", {})
                    )
                }
                differences.append(diff)
            
            logger.info(
                "Comparison diff computed",
                run_id_1=run_id_1,
                run_id_2=run_id_2,
                benchmark_id=benchmark_id,
                sample_count=len(differences)
            )
            
            return differences
            
        except Exception as e:
            logger.error(
                "Failed to compute comparison diff",
                error=str(e),
                run_id_1=run_id_1,
                run_id_2=run_id_2,
                benchmark_id=benchmark_id
            )
            return []
    
    def _compute_sample_differences(
        self,
        metrics_1: Dict[str, Any],
        metrics_2: Dict[str, Any]
    ) -> Dict[str, float]:
        """
        Compute differences between two sets of sample metrics.
        
        Args:
            metrics_1: First set of metrics
            metrics_2: Second set of metrics
            
        Returns:
            Dict[str, float]: Metric differences
        """
        differences = {}
        
        # Get all metric names
        all_metrics = set(metrics_1.keys()) | set(metrics_2.keys())
        
        for metric_name in all_metrics:
            value_1 = metrics_1.get(metric_name, 0)
            value_2 = metrics_2.get(metric_name, 0)
            
            # Compute difference
            if isinstance(value_1, (int, float)) and isinstance(value_2, (int, float)):
                differences[metric_name] = value_1 - value_2
            else:
                # For non-numeric metrics, use 0 as default
                differences[metric_name] = 0
        
        return differences
