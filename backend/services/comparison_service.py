"""
Comparison service for handling model comparisons.

This module provides business logic for creating and managing model
comparisons, including paired analysis and heatmap generation.
"""

from typing import Dict, List, Optional, Any
import structlog
from datetime import datetime

from database import DatabaseManager
from services.metric_service import MetricService

# Configure structured logging
logger = structlog.get_logger(__name__)


class ComparisonService:
    """
    Service for handling model comparisons.
    
    Provides methods for creating comparisons, computing differences,
    and generating comparison visualizations.
    """
    
    def __init__(self):
        """Initialize comparison service."""
        self.metric_service = MetricService()
    
    async def get_comparison_detail(
        self,
        comparison_id: str,
        run_ids: List[str],
        benchmark_ids: List[str],
        slice_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get detailed comparison data.
        
        Args:
            comparison_id: Comparison ID
            run_ids: List of run IDs to compare
            benchmark_ids: List of benchmark IDs
            slice_id: Optional slice ID for filtering
            
        Returns:
            Dict[str, Any]: Detailed comparison data
        """
        try:
            logger.info(
                "Getting comparison detail",
                comparison_id=comparison_id,
                run_count=len(run_ids),
                benchmark_count=len(benchmark_ids),
                slice_id=slice_id
            )
            
            # Get run details
            runs = []
            for run_id in run_ids:
                # This would typically fetch from database
                # For now, return mock data
                run_data = {
                    "id": run_id,
                    "name": f"Run {run_id}",
                    "model_id": f"model_{run_id}",
                    "status": "completed",
                    "created_at": datetime.utcnow().isoformat()
                }
                runs.append(run_data)
            
            # Get benchmark details
            benchmarks = []
            for benchmark_id in benchmark_ids:
                # This would typically fetch from database
                # For now, return mock data
                benchmark_data = {
                    "id": benchmark_id,
                    "name": f"Benchmark {benchmark_id}",
                    "category": "VQA",
                    "modality": "Vision"
                }
                benchmarks.append(benchmark_data)
            
            # Compute paired differences
            paired_diff_table = await self._compute_paired_differences(
                run_ids, benchmark_ids, slice_id
            )
            
            # Generate best-of heatmap
            best_of_heatmap = await self._generate_best_of_heatmap(
                run_ids, benchmark_ids, slice_id
            )
            
            comparison_detail = {
                "runs": runs,
                "benchmarks": benchmarks,
                "paired_diff_table": paired_diff_table,
                "best_of_heatmap": best_of_heatmap
            }
            
            logger.info(
                "Comparison detail computed",
                comparison_id=comparison_id,
                run_count=len(runs),
                benchmark_count=len(benchmarks)
            )
            
            return comparison_detail
            
        except Exception as e:
            logger.error(
                "Failed to get comparison detail",
                error=str(e),
                comparison_id=comparison_id
            )
            return {
                "runs": [],
                "benchmarks": [],
                "paired_diff_table": [],
                "best_of_heatmap": {}
            }
    
    async def _compute_paired_differences(
        self,
        run_ids: List[str],
        benchmark_ids: List[str],
        slice_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Compute paired differences between runs.
        
        Args:
            run_ids: List of run IDs
            benchmark_ids: List of benchmark IDs
            slice_id: Optional slice ID for filtering
            
        Returns:
            List[Dict[str, Any]]: Paired differences
        """
        try:
            logger.info(
                "Computing paired differences",
                run_count=len(run_ids),
                benchmark_count=len(benchmark_ids),
                slice_id=slice_id
            )
            
            paired_differences = []
            
            # For each benchmark, compute differences between runs
            for benchmark_id in benchmark_ids:
                for i, run_id_1 in enumerate(run_ids):
                    for j, run_id_2 in enumerate(run_ids):
                        if i >= j:  # Avoid duplicate comparisons
                            continue
                        
                        # Get metrics for both runs
                        metrics_1 = await self._get_run_benchmark_metrics(
                            run_id_1, benchmark_id, slice_id
                        )
                        metrics_2 = await self._get_run_benchmark_metrics(
                            run_id_2, benchmark_id, slice_id
                        )
                        
                        # Compute differences
                        differences = self._compute_metric_differences(
                            metrics_1, metrics_2
                        )
                        
                        paired_differences.append({
                            "benchmark_id": benchmark_id,
                            "run_1_id": run_id_1,
                            "run_2_id": run_id_2,
                            "differences": differences
                        })
            
            logger.info(
                "Paired differences computed",
                difference_count=len(paired_differences)
            )
            
            return paired_differences
            
        except Exception as e:
            logger.error(
                "Failed to compute paired differences",
                error=str(e)
            )
            return []
    
    async def _generate_best_of_heatmap(
        self,
        run_ids: List[str],
        benchmark_ids: List[str],
        slice_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate best-of heatmap data.
        
        Args:
            run_ids: List of run IDs
            benchmark_ids: List of benchmark IDs
            slice_id: Optional slice ID for filtering
            
        Returns:
            Dict[str, Any]: Heatmap data
        """
        try:
            logger.info(
                "Generating best-of heatmap",
                run_count=len(run_ids),
                benchmark_count=len(benchmark_ids),
                slice_id=slice_id
            )
            
            # Initialize heatmap structure
            heatmap_data = {
                "rows": benchmark_ids,
                "cols": run_ids,
                "cells": []
            }
            
            # For each benchmark, determine the best run
            for benchmark_id in benchmark_ids:
                benchmark_scores = []
                
                for run_id in run_ids:
                    # Get metrics for this run and benchmark
                    metrics = await self._get_run_benchmark_metrics(
                        run_id, benchmark_id, slice_id
                    )
                    
                    # Get the primary metric score
                    primary_score = self._get_primary_metric_score(metrics)
                    benchmark_scores.append(primary_score)
                
                # Find the best run (highest score)
                best_run_index = benchmark_scores.index(max(benchmark_scores))
                heatmap_data["cells"].append(best_run_index)
            
            logger.info(
                "Best-of heatmap generated",
                benchmark_count=len(benchmark_ids),
                run_count=len(run_ids)
            )
            
            return heatmap_data
            
        except Exception as e:
            logger.error(
                "Failed to generate best-of heatmap",
                error=str(e)
            )
            return {
                "rows": [],
                "cols": [],
                "cells": []
            }
    
    async def _get_run_benchmark_metrics(
        self,
        run_id: str,
        benchmark_id: str,
        slice_id: Optional[str] = None
    ) -> Dict[str, float]:
        """
        Get metrics for a specific run and benchmark.
        
        Args:
            run_id: Run ID
            benchmark_id: Benchmark ID
            slice_id: Optional slice ID for filtering
            
        Returns:
            Dict[str, float]: Metrics data
        """
        try:
            # This would typically query the database
            # For now, return mock data
            mock_metrics = {
                "accuracy": 0.85,
                "f1_score": 0.82,
                "precision": 0.88,
                "recall": 0.79
            }
            
            return mock_metrics
            
        except Exception as e:
            logger.error(
                "Failed to get run benchmark metrics",
                error=str(e),
                run_id=run_id,
                benchmark_id=benchmark_id
            )
            return {}
    
    def _compute_metric_differences(
        self,
        metrics_1: Dict[str, float],
        metrics_2: Dict[str, float]
    ) -> Dict[str, float]:
        """
        Compute differences between two sets of metrics.
        
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
    
    def _get_primary_metric_score(self, metrics: Dict[str, float]) -> float:
        """
        Get the primary metric score from metrics.
        
        Args:
            metrics: Metrics data
            
        Returns:
            float: Primary metric score
        """
        # Common primary metrics in order of preference
        primary_metrics = ["accuracy", "f1_score", "precision", "recall"]
        
        for metric in primary_metrics:
            if metric in metrics:
                return metrics[metric]
        
        # If no primary metric found, return the first available metric
        if metrics:
            return list(metrics.values())[0]
        
        return 0.0
