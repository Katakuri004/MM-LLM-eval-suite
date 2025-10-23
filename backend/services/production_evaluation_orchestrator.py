"""
Production Evaluation Orchestrator

This is the ONLY service that should be used to start and manage evaluations.
It provides comprehensive functionality including:
- Resource validation and management
- Security checks and input validation
- LMMS-Eval command execution
- Real-time progress monitoring
- Result parsing and storage
- Error handling and recovery
"""

import asyncio
import json
import os
import subprocess
import tempfile
import uuid
import shutil
import psutil
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, AsyncIterator
from dataclasses import dataclass, asdict
from enum import Enum
import structlog

from services.supabase_service import supabase_service
from services.websocket_manager import websocket_manager
from services.task_discovery_service import task_discovery_service

logger = structlog.get_logger(__name__)

# ============================================================================
# DATA MODELS
# ============================================================================

class EvaluationStatus(Enum):
    """Evaluation status enumeration."""
    PENDING = "pending"
    VALIDATING = "validating"
    RUNNING = "running"
    PARSING_RESULTS = "parsing_results"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class ResourceLimits:
    """System resource limits for evaluations."""
    max_memory_gb: float = 2.0  # Adjusted for typical systems
    max_cpu_percent: float = 90.0  # More lenient CPU limit
    max_disk_gb: float = 5.0  # Reasonable disk requirement
    max_duration_seconds: int = 3600
    max_concurrent_evaluations: int = 3

@dataclass
class EvaluationRequest:
    """Evaluation request data model."""
    model_id: str
    benchmark_ids: List[str]
    name: str
    config: Dict[str, Any]
    user_id: Optional[str] = None

@dataclass
class ProgressUpdate:
    """Progress update data model."""
    evaluation_id: str
    status: str
    progress_percentage: int
    current_task: Optional[str]
    message: str
    timestamp: str

# ============================================================================
# PRODUCTION EVALUATION ORCHESTRATOR
# ============================================================================

class ProductionEvaluationOrchestrator:
    """
    Production-ready evaluation orchestrator.
    
    This service coordinates all aspects of evaluation execution:
    1. Validation and security checks
    2. Resource management
    3. LMMS-Eval command execution
    4. Real-time progress monitoring
    5. Result parsing and storage
    6. Error handling and recovery
    """
    
    def __init__(self):
        """Initialize the orchestrator."""
        self.active_evaluations: Dict[str, asyncio.Task] = {}
        self.evaluation_processes: Dict[str, subprocess.Popen] = {}
        self.resource_limits = ResourceLimits()
        
        # Get LMMS-Eval path
        self.lmms_eval_path = self._detect_lmms_eval_path()
        
        # Create workspace directory (Windows-compatible)
        self.workspace_root = Path("C:/temp/lmms_eval_workspace")
        self.workspace_root.mkdir(exist_ok=True, parents=True)
        
        logger.info(
            "Production evaluation orchestrator initialized",
            lmms_eval_path=self.lmms_eval_path,
            workspace=str(self.workspace_root)
        )
    
    def _detect_lmms_eval_path(self) -> Path:
        """Detect LMMS-Eval installation path."""
        # Check project directory
        project_path = Path(__file__).parent.parent.parent / "lmms-eval"
        if project_path.exists() and (project_path / "lmms_eval").exists():
            logger.info("Using local lmms-eval installation", path=str(project_path))
            return project_path
        
        # Check environment variable
        env_path = os.getenv("LMMS_EVAL_PATH")
        if env_path:
            path = Path(env_path)
            if path.exists():
                logger.info("Using lmms-eval from environment", path=str(path))
                return path
        
        raise RuntimeError(
            "LMMS-Eval not found. Please ensure lmms-eval is installed in "
            "the project directory or set LMMS_EVAL_PATH environment variable."
        )
    
    # ========================================================================
    # PUBLIC API
    # ========================================================================
    
    async def start_evaluation(self, request: EvaluationRequest) -> str:
        """
        Start a new evaluation.
        
        Args:
            request: Evaluation request with model, benchmarks, and config
            
        Returns:
            evaluation_id: Unique identifier for the evaluation
            
        Raises:
            ValueError: If validation fails
            RuntimeError: If resources unavailable or system error
        """
        try:
            logger.info("Starting evaluation", request=asdict(request))
            
            # Step 1: Validate request
            await self._validate_request(request)
            
            # Step 2: Check resources
            if not await self._check_resources():
                raise RuntimeError("Insufficient system resources for evaluation")
            
            # Step 3: Create evaluation record
            evaluation_id = await self._create_evaluation_record(request)
            
            # Step 4: Start evaluation task
            task = asyncio.create_task(
                self._execute_evaluation(evaluation_id, request)
            )
            self.active_evaluations[evaluation_id] = task
            
            logger.info("Evaluation started", evaluation_id=evaluation_id)
            return evaluation_id
            
        except Exception as e:
            logger.error("Failed to start evaluation", error=str(e), exc_info=True)
            raise
    
    async def cancel_evaluation(self, evaluation_id: str) -> bool:
        """
        Cancel a running evaluation.
        
        Args:
            evaluation_id: ID of evaluation to cancel
            
        Returns:
            bool: True if cancelled successfully
        """
        try:
            # Cancel the asyncio task
            if evaluation_id in self.active_evaluations:
                self.active_evaluations[evaluation_id].cancel()
            
            # Terminate the process
            if evaluation_id in self.evaluation_processes:
                process = self.evaluation_processes[evaluation_id]
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
            
            # Update database
            supabase_service.update_evaluation(
                evaluation_id,
                {
                    "status": EvaluationStatus.CANCELLED.value,
                    "completed_at": datetime.utcnow().isoformat()
                }
            )
            
            # Send WebSocket update
            await self._send_progress_update(
                evaluation_id,
                EvaluationStatus.CANCELLED.value,
                100,
                None,
                "Evaluation cancelled by user"
            )
            
            logger.info("Evaluation cancelled", evaluation_id=evaluation_id)
            return True
            
        except Exception as e:
            logger.error("Failed to cancel evaluation", evaluation_id=evaluation_id, error=str(e))
            return False
    
    def get_active_evaluations(self) -> List[str]:
        """Get list of active evaluation IDs."""
        return list(self.active_evaluations.keys())
    
    # ========================================================================
    # VALIDATION
    # ========================================================================
    
    async def _validate_request(self, request: EvaluationRequest) -> None:
        """
        Validate evaluation request.
        
        Checks:
        1. Model exists and is accessible
        2. Benchmarks exist and are compatible with model
        3. Configuration parameters are valid
        4. Model dependencies are installed
        5. Concurrent evaluation limits not exceeded
        """
        # Validate model
        model = supabase_service.get_model_by_id(request.model_id)
        if not model:
            raise ValueError(f"Model not found: {request.model_id}")
        
        # Check model dependencies
        model_name = self._map_model_name(model)
        from services.model_dependency_service import model_dependency_service
        
        required_deps = model_dependency_service.get_model_dependencies(model_name)
        missing_deps = model_dependency_service.get_missing_dependencies(model_name)
        
        if missing_deps:
            install_cmd = model_dependency_service.get_install_command(missing_deps)
            raise ValueError(
                f"Missing dependencies for model '{model['name']}': {', '.join(missing_deps)}. "
                f"Install with: {install_cmd}"
            )
        
        # Validate benchmarks
        if not request.benchmark_ids:
            raise ValueError("At least one benchmark must be specified")
        
        valid_benchmarks = []
        for benchmark_id in request.benchmark_ids:
            benchmark = supabase_service.get_benchmark_by_id(benchmark_id)
            if not benchmark:
                raise ValueError(f"Benchmark not found: {benchmark_id}")
            
            # Check compatibility
            if not self._check_compatibility(model, benchmark):
                logger.warning(
                    "Benchmark may not be compatible with model",
                    model=model['name'],
                    benchmark=benchmark['name']
                )
            
            # Validate task mapping
            mapped_task = await self._map_benchmark_name(benchmark)
            if not mapped_task:
                raise ValueError(f"Benchmark '{benchmark['name']}' cannot be mapped to a valid lmms-eval task")
            
            valid_benchmarks.append(benchmark)
        
        # Validate configuration
        self._validate_config(request.config)
        
        # Check concurrent limit
        if len(self.active_evaluations) >= self.resource_limits.max_concurrent_evaluations:
            raise RuntimeError(
                f"Maximum concurrent evaluations reached "
                f"({self.resource_limits.max_concurrent_evaluations})"
            )
    
    def _check_compatibility(self, model: Dict[str, Any], benchmark: Dict[str, Any]) -> bool:
        """Check if model is compatible with benchmark."""
        model_name = model.get('name', '').lower()
        model_family = model.get('family', '').lower()
        benchmark_modality = benchmark.get('modality', 'text').lower()
        
        # Determine model modality
        if any(kw in model_family or kw in model_name for kw in ['llava', 'blip', 'flamingo', 'qwen', 'vision']):
            model_modality = 'image'
        elif any(kw in model_name for kw in ['whisper', 'audio']):
            model_modality = 'audio'
        elif any(kw in model_name for kw in ['video', 'temporal']):
            model_modality = 'video'
        elif 'multimodal' in model_name or 'multi' in model_name:
            model_modality = 'multi-modal'
        else:
            model_modality = 'text'
        
        # Check compatibility
        if benchmark_modality == 'text':
            return True  # All models can handle text
        elif model_modality == 'multi-modal':
            return True  # Multimodal models handle everything
        elif model_modality == benchmark_modality:
            return True
        else:
            return False
    
    def _validate_config(self, config: Dict[str, Any]) -> None:
        """Validate configuration parameters."""
        # Batch size
        batch_size = config.get('batch_size', 1)
        if not isinstance(batch_size, int) or batch_size < 1 or batch_size > 64:
            raise ValueError("batch_size must be between 1 and 64")
        
        # Limit
        limit = config.get('limit', None)
        if limit is not None:
            if not isinstance(limit, int) or limit < 1 or limit > 5000:
                raise ValueError("limit must be between 1 and 5000")
        
        # Few-shot
        num_fewshot = config.get('num_fewshot', 0)
        if not isinstance(num_fewshot, int) or num_fewshot < 0 or num_fewshot > 25:
            raise ValueError("num_fewshot must be between 0 and 25")
    
    # ========================================================================
    # RESOURCE MANAGEMENT
    # ========================================================================
    
    async def _check_resources(self) -> bool:
        """
        Check if system has sufficient resources.
        
        Checks:
        1. Available memory
        2. CPU usage
        3. Disk space
        """
        try:
            # Check memory
            memory = psutil.virtual_memory()
            available_gb = memory.available / (1024 ** 3)
            if available_gb < self.resource_limits.max_memory_gb:
                logger.warning(
                    "Insufficient memory",
                    available=f"{available_gb:.2f}GB",
                    required=f"{self.resource_limits.max_memory_gb}GB"
                )
                return False
            
            # Check CPU
            cpu_percent = psutil.cpu_percent(interval=1)
            if cpu_percent > self.resource_limits.max_cpu_percent:
                logger.warning(
                    "CPU usage too high",
                    current=f"{cpu_percent}%",
                    max=f"{self.resource_limits.max_cpu_percent}%"
                )
                return False
            
            # Check disk space
            disk = shutil.disk_usage(self.workspace_root)
            available_gb = disk.free / (1024 ** 3)
            if available_gb < self.resource_limits.max_disk_gb:
                logger.warning(
                    "Insufficient disk space",
                    available=f"{available_gb:.2f}GB",
                    required=f"{self.resource_limits.max_disk_gb}GB"
                )
                return False
            
            return True
            
        except Exception as e:
            logger.error("Resource check failed", error=str(e))
            return False
    
    # ========================================================================
    # EVALUATION EXECUTION
    # ========================================================================
    
    async def _create_evaluation_record(self, request: EvaluationRequest) -> str:
        """Create evaluation record in database."""
        evaluation_id = str(uuid.uuid4())
        
        evaluation_data = {
            "id": evaluation_id,
            "model_id": request.model_id,
            "name": request.name or f"Evaluation {evaluation_id[:8]}",
            "status": EvaluationStatus.PENDING.value,
            "config": request.config,
            "benchmark_ids": request.benchmark_ids,
            "created_at": datetime.utcnow().isoformat()
        }
        
        supabase_service.create_evaluation(evaluation_data)
        
        # Create progress record
        progress_data = {
            "evaluation_id": evaluation_id,
            "progress_percentage": 0,
            "status_message": "Evaluation initialized",
            "updated_at": datetime.utcnow().isoformat()
        }
        supabase_service.upsert_evaluation_progress(progress_data)
        
        return evaluation_id
    
    async def _execute_evaluation(
        self,
        evaluation_id: str,
        request: EvaluationRequest
    ) -> None:
        """
        Execute the evaluation.
        
        Steps:
        1. Create working directory
        2. Build LMMS-Eval command
        3. Execute command with monitoring
        4. Parse results
        5. Store results
        6. Cleanup
        """
        workdir = None
        try:
            # Update status
            await self._update_status(evaluation_id, EvaluationStatus.RUNNING)
            
            # Create working directory
            workdir = self.workspace_root / f"eval_{evaluation_id}"
            workdir.mkdir(exist_ok=True)
            logger.info("Created workspace", workdir=str(workdir))
            
            # Get model and benchmark details
            model = supabase_service.get_model_by_id(request.model_id)
            benchmarks = [
                supabase_service.get_benchmark_by_id(bid)
                for bid in request.benchmark_ids
            ]
            benchmarks = [b for b in benchmarks if b is not None]
            
            # Build command
            command = await self._build_lmms_eval_command(
                model, benchmarks, request.config, workdir
            )
            logger.info("Built command", command=" ".join(command))
            
            # Execute with monitoring (this is now properly async)
            start_time = datetime.utcnow()
            logger.info("Starting async evaluation execution", 
                       evaluation_id=evaluation_id,
                       command=" ".join(command))
            
            results = await self._execute_with_monitoring(
                evaluation_id, command, workdir
            )
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            logger.info("Evaluation execution completed", 
                       evaluation_id=evaluation_id,
                       duration=duration,
                       results_found=bool(results))
            
            # Parse and store results
            await self._update_status(evaluation_id, EvaluationStatus.PARSING_RESULTS)
            await self._parse_and_store_results(
                evaluation_id, results, workdir, benchmarks, duration
            )
            
            # Complete
            await self._update_status(evaluation_id, EvaluationStatus.COMPLETED)
            supabase_service.update_evaluation(
                evaluation_id,
                {
                    "completed_at": end_time.isoformat(),
                    "duration_seconds": duration
                }
            )
            
            await self._send_progress_update(
                evaluation_id,
                EvaluationStatus.COMPLETED.value,
                100,
                None,
                f"Evaluation completed in {duration:.1f}s"
            )
            
            logger.info("Evaluation completed", evaluation_id=evaluation_id, duration=duration)
            
        except asyncio.CancelledError:
            logger.info("Evaluation cancelled", evaluation_id=evaluation_id)
            raise
            
        except Exception as e:
            logger.error("Evaluation failed", evaluation_id=evaluation_id, error=str(e), exc_info=True)
            
            await self._update_status(evaluation_id, EvaluationStatus.FAILED)
            supabase_service.update_evaluation(
                evaluation_id,
                {
                    "status": EvaluationStatus.FAILED.value,
                    "error_message": str(e),
                    "completed_at": datetime.utcnow().isoformat()
                }
            )
            
            await self._send_progress_update(
                evaluation_id,
                EvaluationStatus.FAILED.value,
                0,
                None,
                f"Evaluation failed: {str(e)}"
            )
            
        finally:
            # Cleanup
            if evaluation_id in self.active_evaluations:
                del self.active_evaluations[evaluation_id]
            if evaluation_id in self.evaluation_processes:
                del self.evaluation_processes[evaluation_id]
            
            # Optionally cleanup workspace
            if workdir and workdir.exists():
                try:
                    shutil.rmtree(workdir)
                    logger.info("Cleaned up workspace", workdir=str(workdir))
                except Exception as e:
                    logger.warning("Failed to cleanup workspace", error=str(e))
    
    async def _build_lmms_eval_command(
        self,
        model: Dict[str, Any],
        benchmarks: List[Dict[str, Any]],
        config: Dict[str, Any],
        workdir: Path
    ) -> List[str]:
        """
        Build LMMS-Eval command.
        
        IMPORTANT: This must create a valid lmms-eval command that will actually run.
        """
        # Map model to lmms-eval model name
        model_name = self._map_model_name(model)
        
        # Get benchmark task names using async mapping (filter out None values)
        task_names = []
        for benchmark in benchmarks:
            mapped_task = await self._map_benchmark_name(benchmark)
            if mapped_task:
                task_names.append(mapped_task)
        
        if not task_names:
            raise ValueError("No valid tasks found for evaluation")
        
        tasks_str = ",".join(task_names)
        logger.info("Using tasks for evaluation", tasks=task_names)
        
        # Build command
        command = [
            "python",
            "-m",
            "lmms_eval",
            "--model", model_name,
            "--tasks", tasks_str,
            "--batch_size", str(config.get('batch_size', 1)),
            "--output_path", str(workdir / "results"),
            "--log_samples"
        ]
        
        # Add optional parameters
        if 'limit' in config and config['limit'] is not None:
            command.extend(["--limit", str(config['limit'])])
        
        if 'num_fewshot' in config:
            command.extend(["--num_fewshot", str(config['num_fewshot'])])
        
        # Add model arguments if needed
        model_args = self._build_model_args(model)
        if model_args:
            command.extend(["--model_args", model_args])
        
        return command
    
    def _map_model_name(self, model: Dict[str, Any]) -> str:
        """Map dashboard model to lmms-eval model name."""
        model_name = model.get('name', '').lower()
        model_family = model.get('family', '').lower()
        
        # Common mappings
        if 'llava' in model_family:
            return 'llava'
        elif 'qwen' in model_family:
            return 'qwen2_vl'
        elif 'blip' in model_family:
            return 'blip2'
        elif 'flamingo' in model_family:
            return 'open_flamingo'
        else:
            # Use family name as default
            return model_family or 'llava'
    
    async def _map_benchmark_name(self, benchmark: Dict[str, Any]) -> Optional[str]:
        """Map dashboard benchmark to lmms-eval task name using task discovery service."""
        try:
            # Use the task discovery service to map the benchmark
            mapped_task = await task_discovery_service.map_benchmark_to_task(benchmark)
            
            if mapped_task:
                logger.info("Benchmark mapping successful", 
                           original=benchmark.get('name', ''),
                           mapped=mapped_task,
                           benchmark_id=benchmark.get('id'))
                return mapped_task
            else:
                logger.warning("No valid task mapping found for benchmark", 
                             benchmark_name=benchmark.get('name', ''),
                             benchmark_id=benchmark.get('id'))
                return None
                
        except Exception as e:
            logger.error("Failed to map benchmark to task", 
                        benchmark=benchmark.get('name', ''),
                        benchmark_id=benchmark.get('id'),
                        error=str(e))
            return None
    
    def _build_model_args(self, model: Dict[str, Any]) -> str:
        """Build model arguments string."""
        args = []
        
        # Add pretrained path if available
        if 'source' in model:
            args.append(f"pretrained={model['source']}")
        
        # Add dtype
        if 'dtype' in model:
            dtype_map = {
                'float16': 'float16',
                'float32': 'float32',
                'bfloat16': 'bfloat16',
                '8bit': 'int8',
                '4bit': 'int4'
            }
            dtype = dtype_map.get(model['dtype'], 'float16')
            args.append(f"dtype={dtype}")
        
        return ",".join(args) if args else ""
    
    async def _execute_with_monitoring(
        self,
        evaluation_id: str,
        command: List[str],
        workdir: Path
    ) -> Dict[str, Any]:
        """
        Execute command with real-time monitoring.
        
        Monitors stdout/stderr and sends progress updates.
        Uses subprocess.Popen for Windows compatibility.
        """
        logger.info("Executing command", command=" ".join(command))
        
        # Use subprocess.Popen for Windows compatibility
        import subprocess
        import threading
        import queue
        
        # Create queues for output
        stdout_queue = queue.Queue()
        stderr_queue = queue.Queue()
        
        def read_stream(stream, output_queue):
            """Read stream in a separate thread."""
            for line in iter(stream.readline, ''):
                if line:
                    output_queue.put(line.strip())
            stream.close()
        
        # Start process
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(self.lmms_eval_path),
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        self.evaluation_processes[evaluation_id] = process
        
        # Start reader threads
        stdout_thread = threading.Thread(
            target=read_stream, 
            args=(process.stdout, stdout_queue)
        )
        stderr_thread = threading.Thread(
            target=read_stream, 
            args=(process.stderr, stderr_queue)
        )
        
        stdout_thread.daemon = True
        stderr_thread.daemon = True
        stdout_thread.start()
        stderr_thread.start()
        
        # Monitor output
        while process.poll() is None:
            # Check stdout
            try:
                while True:
                    line = stdout_queue.get_nowait()
                    if line:
                        logger.info(
                            "lmms-eval output",
                            evaluation_id=evaluation_id,
                            stderr=False,
                            line=line
                        )
                        await self._parse_progress(evaluation_id, line)
            except queue.Empty:
                pass
            
            # Check stderr
            try:
                while True:
                    line = stderr_queue.get_nowait()
                    if line:
                        logger.info(
                            "lmms-eval output",
                            evaluation_id=evaluation_id,
                            stderr=True,
                            line=line
                        )
                        await self._parse_progress(evaluation_id, line)
            except queue.Empty:
                pass
            
            # Small delay to prevent busy waiting
            await asyncio.sleep(0.1)
        
        # Wait for threads to finish
        stdout_thread.join(timeout=5)
        stderr_thread.join(timeout=5)
        
        # Process any remaining output
        while not stdout_queue.empty():
            line = stdout_queue.get_nowait()
            if line:
                logger.info(
                    "lmms-eval output",
                    evaluation_id=evaluation_id,
                    stderr=False,
                    line=line
                )
                await self._parse_progress(evaluation_id, line)
        
        while not stderr_queue.empty():
            line = stderr_queue.get_nowait()
            if line:
                logger.info(
                    "lmms-eval output",
                    evaluation_id=evaluation_id,
                    stderr=True,
                    line=line
                )
                await self._parse_progress(evaluation_id, line)
        
        if process.returncode != 0:
            # Parse error for dependency issues
            error_msg = f"lmms-eval exited with code {process.returncode}"
            
            # Check for ModuleNotFoundError in stderr
            if 'ModuleNotFoundError' in str(stderr_queue.queue):
                missing_module = self._extract_missing_module(str(stderr_queue.queue))
                if missing_module:
                    install_cmd = f"pip install {missing_module}"
                    error_msg = f"Missing dependency: {missing_module}. Install with: {install_cmd}"
            
            raise RuntimeError(error_msg)
        
        # Wait for results file to be created and populated
        results_file = workdir / "results" / "results.json"
        max_wait_time = 30  # Wait up to 30 seconds for results
        wait_interval = 1   # Check every 1 second
        
        for attempt in range(max_wait_time):
            if results_file.exists():
                # Check if file has content (not just created)
                try:
                    with open(results_file, 'r') as f:
                        content = f.read().strip()
                        if content:  # File has content
                            results = json.loads(content)
                            break
                except (json.JSONDecodeError, FileNotFoundError):
                    pass  # File might be being written, continue waiting
            
            if attempt < max_wait_time - 1:  # Don't sleep on last attempt
                await asyncio.sleep(wait_interval)
        else:
            # If we get here, results file still doesn't exist or is empty
            logger.warning("Results file not found or empty after waiting", 
                          results_file=str(results_file), 
                          workdir_contents=list(workdir.iterdir()) if workdir.exists() else [])
            
            # Try to find any result files in the output directory
            output_dir = workdir / "results"
            if output_dir.exists():
                result_files = list(output_dir.glob("*.json"))
                logger.info("Found result files", files=[str(f) for f in result_files])
                
                if result_files:
                    # Use the first available result file
                    results_file = result_files[0]
                    try:
                        with open(results_file, 'r') as f:
                            results = json.load(f)
                    except Exception as e:
                        logger.error("Failed to read result file", file=str(results_file), error=str(e))
                        raise RuntimeError(f"Failed to read results from {results_file}: {e}")
                else:
                    raise RuntimeError("No result files found in output directory")
            else:
                raise RuntimeError("Results directory not found")
        
        return results
    
    async def _parse_progress(self, evaluation_id: str, line: str) -> None:
        """Parse progress from lmms-eval output."""
        # Look for progress indicators
        # Common patterns: "Task X/Y", "Processing sample X/Y", etc.
        
        # Example: "Running task 1/3: vqa"
        task_match = re.search(r'task\s+(\d+)/(\d+)', line, re.IGNORECASE)
        if task_match:
            current = int(task_match.group(1))
            total = int(task_match.group(2))
            progress = int((current / total) * 100)
            
            await self._send_progress_update(
                evaluation_id,
                EvaluationStatus.RUNNING.value,
                progress,
                f"Task {current}/{total}",
                line
            )
        
        # Example: "Processing 50/100 samples"
        sample_match = re.search(r'(\d+)/(\d+)\s+samples?', line, re.IGNORECASE)
        if sample_match:
            current = int(sample_match.group(1))
            total = int(sample_match.group(2))
            progress = int((current / total) * 100)
            
            await self._send_progress_update(
                evaluation_id,
                EvaluationStatus.RUNNING.value,
                progress,
                f"Sample {current}/{total}",
                line
            )
    
    async def _parse_and_store_results(
        self,
        evaluation_id: str,
        results: Dict[str, Any],
        workdir: Path,
        benchmarks: List[Dict[str, Any]],
        duration: float
    ) -> None:
        """
        Parse results from lmms-eval and store in database.
        
        LMMS-Eval output format:
        {
            "results": {
                "task_name": {
                    "metric1": value1,
                    "metric2": value2,
                    ...
                },
                ...
            },
            "versions": {...},
            "config": {...}
        }
        """
        logger.info("Parsing results", evaluation_id=evaluation_id)
        
        task_results = results.get('results', {})
        
        for benchmark in benchmarks:
            task_name = self._map_benchmark_name(benchmark)
            
            if task_name in task_results:
                task_data = task_results[task_name]
                
                # Extract metrics
                metrics = {}
                scores = {}
                for key, value in task_data.items():
                    if isinstance(value, (int, float)):
                        metrics[key] = value
                        if 'accuracy' in key.lower() or 'score' in key.lower():
                            scores[key] = value
                
                # Store result
                result_data = {
                    "evaluation_id": evaluation_id,
                    "benchmark_id": benchmark['id'],
                    "benchmark_name": benchmark['name'],
                    "task_name": task_name,
                    "metrics": metrics,
                    "scores": scores,
                    "samples_count": results.get('config', {}).get('limit', 0),
                    "execution_time_seconds": int(duration),
                    "created_at": datetime.utcnow().isoformat()
                }
                
                supabase_service.create_evaluation_result(result_data)
                logger.info(
                    "Stored result",
                    evaluation_id=evaluation_id,
                    benchmark=benchmark['name'],
                    metrics=metrics
                )
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _extract_missing_module(self, error_output: str) -> Optional[str]:
        """Extract missing module name from ModuleNotFoundError."""
        import re
        
        # Pattern to match "ModuleNotFoundError: No module named 'X'"
        pattern = r"ModuleNotFoundError:\s*No\s+module\s+named\s+['\"]([^'\"]+)['\"]"
        match = re.search(pattern, error_output, re.IGNORECASE)
        
        if match:
            return match.group(1)
        
        return None
    
    async def _update_status(self, evaluation_id: str, status: EvaluationStatus) -> None:
        """Update evaluation status."""
        supabase_service.update_evaluation(
            evaluation_id,
            {
                "status": status.value,
                "updated_at": datetime.utcnow().isoformat()
            }
        )
        
        if status == EvaluationStatus.RUNNING:
            supabase_service.update_evaluation(
                evaluation_id,
                {"started_at": datetime.utcnow().isoformat()}
            )
    
    async def _send_progress_update(
        self,
        evaluation_id: str,
        status: str,
        progress: int,
        current_task: Optional[str],
        message: str
    ) -> None:
        """Send progress update via WebSocket."""
        # Update progress in database
        progress_data = {
            "evaluation_id": evaluation_id,
            "progress_percentage": progress,
            "current_task": current_task,
            "status_message": message,
            "updated_at": datetime.utcnow().isoformat()
        }
        supabase_service.upsert_evaluation_progress(progress_data)
        
        # Send WebSocket update
        await websocket_manager.send_evaluation_update(
            evaluation_id,
            {
                "status": status,
                "progress": progress,
                "current_task": current_task,
                "message": message,
                "timestamp": datetime.utcnow().isoformat()
            }
        )


# Global instance
production_orchestrator = ProductionEvaluationOrchestrator()
