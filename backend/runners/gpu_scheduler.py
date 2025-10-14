"""
GPU scheduler for managing GPU resources.

This module provides GPU allocation and management for evaluation runs
in the LMMS-Eval Dashboard.
"""

from typing import List, Dict, Optional, Set
import structlog
from datetime import datetime
import threading

from config import gpu_scheduler_config

# Configure structured logging
logger = structlog.get_logger(__name__)


class GPUScheduler:
    """
    GPU scheduler for managing GPU resources.
    
    Handles GPU allocation, deallocation, and resource tracking
    for evaluation runs.
    """
    
    def __init__(self, available_gpus: Optional[List[str]] = None):
        """
        Initialize GPU scheduler.
        
        Args:
            available_gpus: List of available GPU IDs
        """
        self.available_gpus = available_gpus or gpu_scheduler_config.available_gpus
        self.allocations: Dict[str, List[str]] = {}  # run_id -> [gpu_ids]
        self.gpu_status: Dict[str, Dict[str, Any]] = {}  # gpu_id -> status
        self.lock = threading.Lock()
        
        # Initialize GPU status
        for gpu_id in self.available_gpus:
            self.gpu_status[gpu_id] = {
                "status": "available",
                "allocated_to": None,
                "memory_usage": 0.0,
                "last_updated": datetime.utcnow()
            }
        
        logger.info(
            "GPU scheduler initialized",
            available_gpus=self.available_gpus,
            gpu_count=len(self.available_gpus)
        )
    
    def allocate(self, run_id: str, compute_profile: str) -> List[str]:
        """
        Allocate GPUs for a run based on compute profile.
        
        Args:
            run_id: Run ID
            compute_profile: Compute profile (e.g., "4070-8GB", "2×A100")
            
        Returns:
            List[str]: Allocated GPU IDs
            
        Raises:
            RuntimeError: If allocation fails
        """
        with self.lock:
            try:
                logger.info(
                    "Allocating GPUs for run",
                    run_id=run_id,
                    compute_profile=compute_profile
                )
                
                # Determine required GPUs based on compute profile
                required_gpus = self._parse_compute_profile(compute_profile)
                
                # Find available GPUs
                available_gpus = self._get_available_gpus()
                
                if len(available_gpus) < required_gpus:
                    raise RuntimeError(
                        f"Insufficient GPUs: required {required_gpus}, "
                        f"available {len(available_gpus)}"
                    )
                
                # Allocate GPUs
                allocated_gpus = available_gpus[:required_gpus]
                
                # Update allocations
                self.allocations[run_id] = allocated_gpus
                
                # Update GPU status
                for gpu_id in allocated_gpus:
                    self.gpu_status[gpu_id].update({
                        "status": "allocated",
                        "allocated_to": run_id,
                        "last_updated": datetime.utcnow()
                    })
                
                logger.info(
                    "GPUs allocated successfully",
                    run_id=run_id,
                    allocated_gpus=allocated_gpus,
                    gpu_count=len(allocated_gpus)
                )
                
                return allocated_gpus
                
            except Exception as e:
                logger.error(
                    "Failed to allocate GPUs",
                    error=str(e),
                    run_id=run_id,
                    compute_profile=compute_profile
                )
                raise RuntimeError(f"GPU allocation failed: {str(e)}")
    
    def deallocate(self, run_id: str):
        """
        Deallocate GPUs for a run.
        
        Args:
            run_id: Run ID
        """
        with self.lock:
            try:
                if run_id not in self.allocations:
                    logger.warning(
                        "No GPUs allocated for run",
                        run_id=run_id
                    )
                    return
                
                allocated_gpus = self.allocations[run_id]
                
                # Update GPU status
                for gpu_id in allocated_gpus:
                    self.gpu_status[gpu_id].update({
                        "status": "available",
                        "allocated_to": None,
                        "last_updated": datetime.utcnow()
                    })
                
                # Remove allocation
                del self.allocations[run_id]
                
                logger.info(
                    "GPUs deallocated successfully",
                    run_id=run_id,
                    deallocated_gpus=allocated_gpus,
                    gpu_count=len(allocated_gpus)
                )
                
            except Exception as e:
                logger.error(
                    "Failed to deallocate GPUs",
                    error=str(e),
                    run_id=run_id
                )
    
    def _parse_compute_profile(self, compute_profile: str) -> int:
        """
        Parse compute profile to determine required GPUs.
        
        Args:
            compute_profile: Compute profile string
            
        Returns:
            int: Number of required GPUs
        """
        try:
            # Parse different compute profile formats
            if "×" in compute_profile or "x" in compute_profile:
                # Format: "2×A100" or "2xA100"
                multiplier = int(compute_profile.split("×")[0].split("x")[0])
                return multiplier
            elif compute_profile.endswith("GB"):
                # Format: "4070-8GB" - single GPU
                return 1
            else:
                # Default to single GPU
                return 1
                
        except (ValueError, IndexError):
            logger.warning(
                "Failed to parse compute profile, using default",
                compute_profile=compute_profile
            )
            return 1
    
    def _get_available_gpus(self) -> List[str]:
        """
        Get list of available GPUs.
        
        Returns:
            List[str]: Available GPU IDs
        """
        available_gpus = []
        
        for gpu_id, status in self.gpu_status.items():
            if status["status"] == "available":
                available_gpus.append(gpu_id)
        
        return available_gpus
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get current GPU scheduler status.
        
        Returns:
            Dict[str, Any]: Scheduler status
        """
        with self.lock:
            available_count = len(self._get_available_gpus())
            allocated_count = len(self.available_gpus) - available_count
            
            return {
                "total_gpus": len(self.available_gpus),
                "available_gpus": available_count,
                "allocated_gpus": allocated_count,
                "allocations": dict(self.allocations),
                "gpu_status": dict(self.gpu_status)
            }
    
    def get_gpu_utilization(self) -> Dict[str, float]:
        """
        Get GPU utilization statistics.
        
        Returns:
            Dict[str, float]: GPU utilization data
        """
        with self.lock:
            total_gpus = len(self.available_gpus)
            allocated_gpus = len(self.allocations)
            
            utilization = {
                "total_gpus": total_gpus,
                "allocated_gpus": allocated_gpus,
                "utilization_percent": (allocated_gpus / total_gpus) * 100 if total_gpus > 0 else 0
            }
            
            return utilization
    
    def is_gpu_available(self, gpu_id: str) -> bool:
        """
        Check if a specific GPU is available.
        
        Args:
            gpu_id: GPU ID
            
        Returns:
            bool: True if GPU is available, False otherwise
        """
        with self.lock:
            if gpu_id not in self.gpu_status:
                return False
            
            return self.gpu_status[gpu_id]["status"] == "available"
    
    def get_allocated_gpus(self, run_id: str) -> List[str]:
        """
        Get allocated GPUs for a run.
        
        Args:
            run_id: Run ID
            
        Returns:
            List[str]: Allocated GPU IDs
        """
        with self.lock:
            return self.allocations.get(run_id, [])
    
    def cleanup(self):
        """
        Clean up all allocations and reset GPU status.
        """
        with self.lock:
            try:
                # Reset all GPU status
                for gpu_id in self.available_gpus:
                    self.gpu_status[gpu_id].update({
                        "status": "available",
                        "allocated_to": None,
                        "last_updated": datetime.utcnow()
                    })
                
                # Clear all allocations
                self.allocations.clear()
                
                logger.info("GPU scheduler cleanup completed")
                
            except Exception as e:
                logger.error(
                    "Failed to cleanup GPU scheduler",
                    error=str(e)
                )
