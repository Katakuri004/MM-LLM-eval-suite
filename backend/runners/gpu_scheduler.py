"""
Enhanced GPU scheduler for managing GPU resources with distributed computation support.

This module provides GPU allocation and management for evaluation runs
in the LMMS-Eval Dashboard, supporting 8 GPUs per machine and distributed
computation with vLLM/Ray for large omni-modal models.
"""

from typing import List, Dict, Optional, Set, Any, Tuple
import structlog
from datetime import datetime
import threading
import subprocess
import json
import time
import requests
import os
from pathlib import Path

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
        Initialize enhanced GPU scheduler for 8 GPU setup.
        
        Args:
            available_gpus: List of available GPU IDs (defaults to 8 GPUs)
        """
        # Default to 8 GPUs if not specified
        if available_gpus is None:
            available_gpus = [f"cuda:{i}" for i in range(8)]
        
        self.available_gpus = available_gpus
        self.allocations: Dict[str, Dict[str, Any]] = {}  # run_id -> allocation_info
        self.gpu_status: Dict[str, Dict[str, Any]] = {}  # gpu_id -> status
        self.vllm_servers: Dict[str, Dict[str, Any]] = {}  # run_id -> vllm_server_info
        self.lock = threading.Lock()
        
        # Initialize GPU status with enhanced monitoring
        for gpu_id in self.available_gpus:
            self.gpu_status[gpu_id] = {
                "status": "available",
                "allocated_to": None,
                "memory_usage": 0.0,
                "memory_total": 0.0,
                "utilization": 0.0,
                "temperature": 0.0,
                "last_updated": datetime.utcnow(),
                "model_size": None,
                "tensor_parallel": 1
            }
        
        # Ray cluster configuration
        self.ray_cluster_url = None
        self.ray_initialized = False
        
        logger.info(
            "Enhanced GPU scheduler initialized",
            available_gpus=self.available_gpus,
            gpu_count=len(self.available_gpus),
            supports_distributed=True
        )
    
    def allocate(self, run_id: str, model_requirements: Dict[str, Any]) -> Dict[str, Any]:
        """
        Allocate GPUs for a run based on model requirements.
        
        Args:
            run_id: Run ID
            model_requirements: Model requirements including size, memory, etc.
            
        Returns:
            Dict[str, Any]: Allocation information including GPUs and vLLM config
            
        Raises:
            RuntimeError: If allocation fails
        """
        with self.lock:
            try:
                logger.info(
                    "Allocating GPUs for run",
                    run_id=run_id,
                    model_requirements=model_requirements
                )
                
                # Determine required GPUs based on model requirements
                allocation_info = self._calculate_allocation(model_requirements)
                required_gpus = allocation_info['gpu_count']
                tensor_parallel = allocation_info['tensor_parallel']
                
                # Find available GPUs
                available_gpus = self._get_available_gpus()
                
                if len(available_gpus) < required_gpus:
                    raise RuntimeError(
                        f"Insufficient GPUs: required {required_gpus}, "
                        f"available {len(available_gpus)}"
                    )
                
                # Allocate GPUs (prefer consecutive GPUs for tensor parallelism)
                allocated_gpus = self._allocate_consecutive_gpus(available_gpus, required_gpus)
                
                # Create allocation info
                allocation_data = {
                    "gpu_ids": allocated_gpus,
                    "tensor_parallel": tensor_parallel,
                    "model_size": model_requirements.get('size', 'medium'),
                    "memory_requirement": model_requirements.get('memory_gb', 16),
                    "allocation_time": datetime.utcnow().isoformat(),
                    "vllm_endpoint": None
                }
                
                # Update allocations
                self.allocations[run_id] = allocation_data
                
                # Update GPU status
                for i, gpu_id in enumerate(allocated_gpus):
                    self.gpu_status[gpu_id].update({
                        "status": "allocated",
                        "allocated_to": run_id,
                        "model_size": model_requirements.get('size', 'medium'),
                        "tensor_parallel": tensor_parallel,
                        "gpu_rank": i,
                        "last_updated": datetime.utcnow()
                    })
                
                logger.info(
                    "GPUs allocated successfully",
                    run_id=run_id,
                    allocated_gpus=allocated_gpus,
                    gpu_count=len(allocated_gpus),
                    tensor_parallel=tensor_parallel
                )
                
                return allocation_data
                
            except Exception as e:
                logger.error(
                    "Failed to allocate GPUs",
                    error=str(e),
                    run_id=run_id,
                    model_requirements=model_requirements
                )
                raise RuntimeError(f"GPU allocation failed: {str(e)}")
    
    def deallocate(self, run_id: str):
        """
        Deallocate GPUs for a run and stop vLLM server if running.
        
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
                
                allocation_data = self.allocations[run_id]
                allocated_gpus = allocation_data['gpu_ids']
                
                # Stop vLLM server if running
                if run_id in self.vllm_servers:
                    self._stop_vllm_server(run_id)
                
                # Update GPU status
                for gpu_id in allocated_gpus:
                    self.gpu_status[gpu_id].update({
                        "status": "available",
                        "allocated_to": None,
                        "model_size": None,
                        "tensor_parallel": 1,
                        "gpu_rank": None,
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
    
    def start_vllm_server(self, run_id: str, model_path: str, 
                         tensor_parallel: int = 1) -> str:
        """
        Start vLLM server for distributed inference.
        
        Args:
            run_id: Run ID
            model_path: Path to model
            tensor_parallel: Number of GPUs for tensor parallelism
            
        Returns:
            str: vLLM server endpoint URL
        """
        try:
            if run_id not in self.allocations:
                raise RuntimeError(f"No GPUs allocated for run {run_id}")
            
            allocation_data = self.allocations[run_id]
            gpu_ids = allocation_data['gpu_ids']
            
            if len(gpu_ids) < tensor_parallel:
                raise RuntimeError(f"Insufficient GPUs for tensor parallelism: {tensor_parallel}")
            
            # Start vLLM server
            endpoint_url = self._start_vllm_server_process(
                run_id, model_path, gpu_ids[:tensor_parallel]
            )
            
            # Store server info
            self.vllm_servers[run_id] = {
                "endpoint": endpoint_url,
                "model_path": model_path,
                "tensor_parallel": tensor_parallel,
                "gpu_ids": gpu_ids[:tensor_parallel],
                "started_at": datetime.utcnow().isoformat()
            }
            
            # Update allocation with endpoint
            allocation_data['vllm_endpoint'] = endpoint_url
            
            logger.info(
                "vLLM server started successfully",
                run_id=run_id,
                endpoint=endpoint_url,
                tensor_parallel=tensor_parallel
            )
            
            return endpoint_url
            
        except Exception as e:
            logger.error(
                "Failed to start vLLM server",
                error=str(e),
                run_id=run_id,
                model_path=model_path
            )
            raise
    
    def get_vllm_endpoint(self, run_id: str) -> Optional[str]:
        """
        Get vLLM endpoint for a run.
        
        Args:
            run_id: Run ID
            
        Returns:
            Optional[str]: vLLM endpoint URL if available
        """
        if run_id in self.vllm_servers:
            return self.vllm_servers[run_id]['endpoint']
        return None
    
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
                # Stop all vLLM servers
                for run_id in list(self.vllm_servers.keys()):
                    self._stop_vllm_server(run_id)
                
                # Reset all GPU status
                for gpu_id in self.available_gpus:
                    self.gpu_status[gpu_id].update({
                        "status": "available",
                        "allocated_to": None,
                        "model_size": None,
                        "tensor_parallel": 1,
                        "gpu_rank": None,
                        "last_updated": datetime.utcnow()
                    })
                
                # Clear all allocations
                self.allocations.clear()
                self.vllm_servers.clear()
                
                logger.info("Enhanced GPU scheduler cleanup completed")
                
            except Exception as e:
                logger.error(
                    "Failed to cleanup GPU scheduler",
                    error=str(e)
                )
    
    # New helper methods for enhanced functionality
    
    def _calculate_allocation(self, model_requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate GPU allocation based on model requirements."""
        model_size = model_requirements.get('size', 'medium')
        memory_gb = model_requirements.get('memory_gb', 16)
        num_parameters = model_requirements.get('num_parameters', 0)
        
        # Determine tensor parallelism based on model size
        if model_size == 'small' or memory_gb <= 16:
            gpu_count = 1
            tensor_parallel = 1
        elif model_size == 'medium' or memory_gb <= 32:
            gpu_count = 2
            tensor_parallel = 2
        elif model_size == 'large' or memory_gb <= 64:
            gpu_count = 4
            tensor_parallel = 4
        else:  # xlarge or very large models
            gpu_count = 8
            tensor_parallel = 8
        
        return {
            'gpu_count': gpu_count,
            'tensor_parallel': tensor_parallel,
            'memory_per_gpu': memory_gb / gpu_count
        }
    
    def _allocate_consecutive_gpus(self, available_gpus: List[str], required_count: int) -> List[str]:
        """Allocate consecutive GPUs for tensor parallelism."""
        # Sort GPUs by ID to get consecutive allocation
        sorted_gpus = sorted(available_gpus, key=lambda x: int(x.split(':')[1]))
        
        # Find consecutive GPUs
        for i in range(len(sorted_gpus) - required_count + 1):
            consecutive_gpus = sorted_gpus[i:i + required_count]
            if self._are_consecutive(consecutive_gpus):
                return consecutive_gpus
        
        # Fallback to any available GPUs
        return available_gpus[:required_count]
    
    def _are_consecutive(self, gpu_ids: List[str]) -> bool:
        """Check if GPU IDs are consecutive."""
        try:
            indices = [int(gpu_id.split(':')[1]) for gpu_id in gpu_ids]
            return all(indices[i] == indices[0] + i for i in range(len(indices)))
        except (ValueError, IndexError):
            return False
    
    def _start_vllm_server_process(self, run_id: str, model_path: str, gpu_ids: List[str]) -> str:
        """Start vLLM server process."""
        try:
            # Calculate port for this run
            port = 8000 + hash(run_id) % 1000
            
            # Build vLLM command
            gpu_list = ','.join([gpu_id.split(':')[1] for gpu_id in gpu_ids])
            tensor_parallel = len(gpu_ids)
            
            cmd = [
                "python", "-m", "vllm.entrypoints.openai.api_server",
                "--model", model_path,
                "--tensor-parallel-size", str(tensor_parallel),
                "--gpu-memory-utilization", "0.9",
                "--port", str(port),
                "--host", "0.0.0.0"
            ]
            
            # Set CUDA_VISIBLE_DEVICES
            env = os.environ.copy()
            env['CUDA_VISIBLE_DEVICES'] = gpu_list
            
            # Start process
            process = subprocess.Popen(
                cmd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=Path.cwd()
            )
            
            # Wait for server to start
            endpoint_url = f"http://localhost:{port}"
            self._wait_for_vllm_server(endpoint_url, timeout=60)
            
            return endpoint_url
            
        except Exception as e:
            logger.error("Failed to start vLLM server process", error=str(e))
            raise
    
    def _wait_for_vllm_server(self, endpoint_url: str, timeout: int = 60):
        """Wait for vLLM server to be ready."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(f"{endpoint_url}/health", timeout=5)
                if response.status_code == 200:
                    return
            except requests.RequestException:
                pass
            time.sleep(2)
        
        raise RuntimeError(f"vLLM server failed to start within {timeout} seconds")
    
    def _stop_vllm_server(self, run_id: str):
        """Stop vLLM server for a run."""
        try:
            if run_id in self.vllm_servers:
                server_info = self.vllm_servers[run_id]
                endpoint = server_info['endpoint']
                
                # Try to stop gracefully
                try:
                    requests.post(f"{endpoint}/shutdown", timeout=5)
                except requests.RequestException:
                    pass
                
                # Remove from tracking
                del self.vllm_servers[run_id]
                
                logger.info("vLLM server stopped", run_id=run_id, endpoint=endpoint)
                
        except Exception as e:
            logger.error("Failed to stop vLLM server", run_id=run_id, error=str(e))
    
    def get_enhanced_status(self) -> Dict[str, Any]:
        """Get enhanced GPU scheduler status with vLLM server info."""
        with self.lock:
            available_count = len(self._get_available_gpus())
            allocated_count = len(self.available_gpus) - available_count
            
            return {
                "total_gpus": len(self.available_gpus),
                "available_gpus": available_count,
                "allocated_gpus": allocated_count,
                "allocations": dict(self.allocations),
                "gpu_status": dict(self.gpu_status),
                "vllm_servers": dict(self.vllm_servers),
                "ray_initialized": self.ray_initialized,
                "supports_distributed": True
            }
