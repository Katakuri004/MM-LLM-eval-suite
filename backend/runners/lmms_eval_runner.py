"""
LMMS-Eval runner for executing evaluations.

This module provides a comprehensive wrapper around the lmms-eval framework
for executing multimodal evaluations in the LMMS-Eval Dashboard.

Supports all modalities: Text, Image, Video, and Audio tasks.
"""

import subprocess
import json
import os
import tempfile
import shutil
import asyncio
from typing import List, Dict, Any, Generator, Optional, Union
import structlog
from datetime import datetime
from pathlib import Path
from config import get_settings
from services.supabase_service import supabase_service

# Configure structured logging
logger = structlog.get_logger(__name__)


class LMMSEvalRunner:
    """
    Comprehensive runner for executing lmms-eval evaluations.
    
    Supports all modalities (Text, Image, Video, Audio) and provides
    advanced features like model-specific configurations, benchmark
    management, and real-time progress tracking.
    
    Based on: https://github.com/EvolvingLMMs-Lab/lmms-eval
    """
    
    def __init__(
        self,
        model_id: str,
        benchmark_ids: List[str],
        config: Dict[str, Any],
        lmms_eval_path: Optional[str] = None
    ):
        """
        Initialize LMMS-Eval runner.
        
        Args:
            model_id: Model ID (e.g., 'llava', 'qwen2_vl', 'llama_vision')
            benchmark_ids: List of benchmark IDs to evaluate
            config: Run configuration including model args, evaluation params
            lmms_eval_path: Optional path to lmms-eval installation
        """
        self.model_id = model_id
        self.benchmark_ids = benchmark_ids
        self.config = config
        self.settings = get_settings()
        self.lmms_eval_path = lmms_eval_path or self._find_lmms_eval_path()
        self.process: Optional[subprocess.Popen] = None
        self.log_file: Optional[str] = None
        self.stdout: str = ""
        self.stderr: str = ""
        self.work_dir: Optional[str] = None
        
        # Validate lmms-eval installation
        self._validate_installation()
        
        logger.info(
            "LMMS-Eval runner initialized",
            model_id=model_id,
            benchmark_count=len(benchmark_ids),
            lmms_eval_path=self.lmms_eval_path
        )
    
    def _find_lmms_eval_path(self) -> str:
        """
        Find lmms-eval installation path.
        
        Returns:
            str: Path to lmms-eval installation
        """
        # First check if path is configured in settings
        if hasattr(self.settings, 'lmms_eval_path') and self.settings.lmms_eval_path:
            configured_path = self.settings.lmms_eval_path
            if os.path.exists(os.path.join(configured_path, "lmms_eval")):
                logger.info(f"Using configured lmms-eval path: {configured_path}")
                return configured_path
            else:
                logger.warning(f"Configured lmms-eval path not found: {configured_path}")
        
        # Check local lmms-eval directory first
        local_paths = [
            os.path.join(os.getcwd(), "lmms-eval"),
            os.path.join(os.path.dirname(os.getcwd()), "lmms-eval"),
            "/lmms-eval",
            "C:\\lmms-eval",  # Windows absolute path
            os.path.join(os.getcwd(), "lmms-eval")  # Current directory
        ]
        
        for path in local_paths:
            if os.path.exists(os.path.join(path, "lmms_eval")):
                logger.info(f"Found local lmms-eval at: {path}")
                return path
        
        # Check common installation paths
        possible_paths = [
            "/opt/lmms-eval",
            "/usr/local/lmms-eval", 
            os.path.expanduser("~/lmms-eval"),
            os.path.join(os.getcwd(), "lmms-eval"),
            os.path.join(os.getcwd(), "..", "lmms-eval")
        ]
        
        for path in possible_paths:
            if os.path.exists(os.path.join(path, "lmms_eval")):
                return path
        
        # Try to find via Python import
        try:
            import lmms_eval
            return os.path.dirname(lmms_eval.__file__)
        except ImportError:
            pass
        
        # Default to current directory
        return os.getcwd()
    
    def _validate_installation(self):
        """
        Validate lmms-eval installation and dependencies.
        """
        try:
            # Check if lmms-eval is accessible from the correct directory
            test_cmd = ["python", "-m", "lmms_eval", "--help"]
            result = subprocess.run(
                test_cmd,
                capture_output=True,
                text=True,
                timeout=30,
                cwd=self.lmms_eval_path
            )
            
            if result.returncode != 0:
                # Try alternative validation - check if the module directory exists
                lmms_eval_module = os.path.join(self.lmms_eval_path, "lmms_eval")
                if os.path.exists(lmms_eval_module):
                    logger.info("lmms-eval module found, assuming installation is valid")
                    return
                else:
                    raise RuntimeError(f"lmms-eval not properly installed: {result.stderr}")
            
            logger.info("lmms-eval installation validated successfully")
            
        except Exception as e:
            # Try alternative validation - check if the module directory exists
            lmms_eval_module = os.path.join(self.lmms_eval_path, "lmms_eval")
            if os.path.exists(lmms_eval_module):
                logger.info("lmms-eval module found, assuming installation is valid")
                return
            else:
                logger.error(
                    "lmms-eval installation validation failed",
                    error=str(e)
                )
                raise RuntimeError(f"lmms-eval validation failed: {str(e)}")
    
    def _get_model_args(self) -> Dict[str, Any]:
        """
        Get model-specific arguments based on model type.
        
        Returns:
            Dict[str, Any]: Model arguments
        """
        model_args = self.config.get("model_args", {})
        
        # Model-specific configurations
        if self.model_id in ["llava", "llava_onevision", "llava_onevision1_5"]:
            model_args.update({
                "pretrained": model_args.get("pretrained", "llava-hf/llava-1.5-7b-hf"),
                "conv_template": model_args.get("conv_template", "vicuna_v1")
            })
        elif self.model_id in ["qwen2_vl", "qwen2_5_vl"]:
            model_args.update({
                "pretrained": model_args.get("pretrained", "Qwen/Qwen2-VL-2B-Instruct"),
                "conv_template": model_args.get("conv_template", "qwen2_vl")
            })
        elif self.model_id == "llama_vision":
            model_args.update({
                "pretrained": model_args.get("pretrained", "meta-llama/Llama-3.2-3B-Vision-Instruct"),
                "conv_template": model_args.get("conv_template", "llama3_2")
            })
        
        return model_args
    
    def _create_work_directory(self) -> str:
        """
        Create working directory for evaluation.
        
        Returns:
            str: Path to work directory
        """
        work_dir = tempfile.mkdtemp(prefix="lmms_eval_")
        self.work_dir = work_dir
        
        # Create subdirectories
        os.makedirs(os.path.join(work_dir, "outputs"), exist_ok=True)
        os.makedirs(os.path.join(work_dir, "logs"), exist_ok=True)
        os.makedirs(os.path.join(work_dir, "cache"), exist_ok=True)
        
        logger.info(f"Created work directory: {work_dir}")
        return work_dir
    
    def prepare_command(self) -> List[str]:
        """
        Build comprehensive lmms-eval CLI command with support for multiple model sources.
        
        Returns:
            List[str]: Command arguments
        """
        try:
            # Create work directory
            work_dir = self._create_work_directory()
            
            # Get model information from database
            model_info = self._get_model_info()
            loading_method = model_info.get('loading_method', 'huggingface')
            
            # Base command
            command = ["python", "-m", "lmms_eval"]
            
            # Model arguments based on loading method
            if loading_method == 'huggingface':
                command.extend(["--model", self.model_id])
                model_args = self._get_huggingface_model_args(model_info)
            elif loading_method == 'local':
                command.extend(["--model", self.model_id])
                model_args = self._get_local_model_args(model_info)
            elif loading_method == 'api':
                command.extend(["--model", self.model_id])
                model_args = self._get_api_model_args(model_info)
            elif loading_method == 'vllm':
                command.extend(["--model", self.model_id])
                model_args = self._get_vllm_model_args(model_info)
            else:
                # Default to HuggingFace
                command.extend(["--model", self.model_id])
                model_args = self._get_model_args()
            
            # Add model-specific arguments
            if model_args:
                for key, value in model_args.items():
                    command.extend([f"--model_args", f"{key}={value}"])
            
            # Benchmark arguments
            for benchmark_id in self.benchmark_ids:
                command.extend(["--benchmark", benchmark_id])
            
            # Evaluation configuration
            if "shots" in self.config:
                command.extend(["--shots", str(self.config["shots"])])
            
            if "seed" in self.config:
                command.extend(["--seed", str(self.config["seed"])])
            
            if "temperature" in self.config:
                command.extend(["--temperature", str(self.config["temperature"])])
            
            if "batch_size" in self.config:
                command.extend(["--batch_size", str(self.config["batch_size"])])
            
            if "num_fewshot" in self.config:
                command.extend(["--num_fewshot", str(self.config["num_fewshot"])])
            
            # Device configuration
            if "gpu_device_id" in self.config:
                command.extend(["--device", self.config["gpu_device_id"]])
            
            # Output configuration
            self.log_file = os.path.join(work_dir, "outputs", "results.json")
            command.extend(["--output", self.log_file])
            
            # Logging configuration
            log_file = os.path.join(work_dir, "logs", "evaluation.log")
            command.extend(["--log_file", log_file])
            command.extend(["--log_level", "INFO"])
            
            # Performance configuration
            if "limit" in self.config:
                command.extend(["--limit", str(self.config["limit"])])
            
            if "write_out" in self.config:
                command.extend(["--write_out"])
            
            if "write_out_path" in self.config:
                command.extend(["--write_out_path", self.config["write_out_path"]])
            
            # Additional arguments
            command.extend(["--verbose"])
            
            # Set working directory
            command.extend(["--work_dir", work_dir])
            
            logger.info(
                "LMMS-Eval command prepared",
                command=" ".join(command),
                model_id=self.model_id,
                benchmark_count=len(self.benchmark_ids),
                work_dir=work_dir
            )
            
            return command
            
        except Exception as e:
            logger.error(
                "Failed to prepare LMMS-Eval command",
                error=str(e),
                model_id=self.model_id
            )
            raise
    
    def start(self) -> int:
        """
        Start the lmms-eval process.
        
        Returns:
            int: Process ID
            
        Raises:
            RuntimeError: If process start fails
        """
        try:
            # Prepare command
            command = self.prepare_command()
            
            # Start process
            self.process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            logger.info(
                "LMMS-Eval process started",
                pid=self.process.pid,
                model_id=self.model_id
            )
            
            return self.process.pid
            
        except Exception as e:
            logger.error(
                "Failed to start LMMS-Eval process",
                error=str(e),
                model_id=self.model_id
            )
            raise RuntimeError(f"Failed to start LMMS-Eval process: {str(e)}")
    
    def stream_logs(self) -> Generator[str, None, None]:
        """
        Stream log lines from the process in real-time.
        
        Yields:
            str: Log line
            
        Raises:
            RuntimeError: If process is not running
        """
        if not self.process:
            raise RuntimeError("Process not started")
        
        try:
            # Stream stdout
            for line in iter(self.process.stdout.readline, ''):
                if line:
                    self.stdout += line
                    yield line.strip()
            
            # Stream stderr
            for line in iter(self.process.stderr.readline, ''):
                if line:
                    self.stderr += line
                    yield f"ERROR: {line.strip()}"
            
            # Wait for process to complete
            self.process.wait()
            
            logger.info(
                "LMMS-Eval process completed",
                pid=self.process.pid,
                return_code=self.process.returncode
            )
            
        except Exception as e:
            logger.error(
                "Failed to stream LMMS-Eval logs",
                error=str(e),
                model_id=self.model_id
            )
            raise
    
    def parse_metrics(self, output: str) -> Dict[str, Dict[str, float]]:
        """
        Parse lmms-eval output and extract metrics from JSON results.
        
        Args:
            output: Process output
            
        Returns:
            Dict[str, Dict[str, float]]: Parsed metrics by benchmark
        """
        try:
            metrics = {}
            
            # Try to parse JSON output from results file
            if self.log_file and os.path.exists(self.log_file):
                try:
                    with open(self.log_file, 'r') as f:
                        results_data = json.load(f)
                    
                    # lmms-eval outputs results in specific format
                    if "results" in results_data:
                        results = results_data["results"]
                        
                        # Extract metrics for each benchmark
                        for benchmark_id in self.benchmark_ids:
                            if benchmark_id in results:
                                benchmark_results = results[benchmark_id]
                                
                                # Extract all metrics from the benchmark results
                                benchmark_metrics = {}
                                for metric_name, metric_value in benchmark_results.items():
                                    if isinstance(metric_value, (int, float)):
                                        benchmark_metrics[metric_name] = float(metric_value)
                                    elif isinstance(metric_value, dict):
                                        # Handle nested metrics
                                        for nested_name, nested_value in metric_value.items():
                                            if isinstance(nested_value, (int, float)):
                                                benchmark_metrics[f"{metric_name}_{nested_name}"] = float(nested_value)
                                
                                if benchmark_metrics:
                                    metrics[benchmark_id] = benchmark_metrics
                    
                    # Also check for direct benchmark results
                    for benchmark_id in self.benchmark_ids:
                        if benchmark_id in results_data:
                            benchmark_data = results_data[benchmark_id]
                            if isinstance(benchmark_data, dict):
                                benchmark_metrics = {}
                                for key, value in benchmark_data.items():
                                    if isinstance(value, (int, float)):
                                        benchmark_metrics[key] = float(value)
                                if benchmark_metrics:
                                    metrics[benchmark_id] = benchmark_metrics
                    
                except (json.JSONDecodeError, KeyError) as e:
                    logger.warning(
                        "Failed to parse JSON results file",
                        error=str(e),
                        log_file=self.log_file
                    )
            
            # Fallback: parse from stdout/stderr for real-time metrics
            if not metrics:
                metrics = self._parse_metrics_from_output(output)
            
            # Store raw results for debugging
            if self.work_dir:
                raw_results_file = os.path.join(self.work_dir, "outputs", "raw_results.json")
                try:
                    with open(raw_results_file, 'w') as f:
                        json.dump(metrics, f, indent=2)
                except Exception as e:
                    logger.warning(f"Failed to save raw results: {e}")
            
            logger.info(
                "Metrics parsed successfully",
                benchmark_count=len(metrics),
                model_id=self.model_id,
                metrics_summary={bid: len(mets) for bid, mets in metrics.items()}
            )
            
            return metrics
            
        except Exception as e:
            logger.error(
                "Failed to parse metrics",
                error=str(e),
                model_id=self.model_id
            )
            return {}
    
    def _parse_metrics_from_output(self, output: str) -> Dict[str, Dict[str, float]]:
        """
        Parse metrics from process output.
        
        Args:
            output: Process output
            
        Returns:
            Dict[str, Dict[str, float]]: Parsed metrics
        """
        metrics = {}
        
        # Simple parsing logic - this would need to be more sophisticated
        # in a real implementation
        lines = output.split('\n')
        
        for line in lines:
            if 'accuracy:' in line.lower():
                try:
                    # Extract accuracy value
                    accuracy = float(line.split(':')[-1].strip())
                    for benchmark_id in self.benchmark_ids:
                        if benchmark_id not in metrics:
                            metrics[benchmark_id] = {}
                        metrics[benchmark_id]['accuracy'] = accuracy
                except (ValueError, IndexError):
                    continue
        
        return metrics
    
    def get_available_benchmarks(self) -> List[str]:
        """
        Get list of available benchmarks from lmms-eval.
        
        Returns:
            List[str]: Available benchmark names
        """
        try:
            cmd = ["python", "-m", "lmms_eval", "--benchmarks"]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                benchmarks = []
                for line in result.stdout.split('\n'):
                    if line.strip() and not line.startswith('#'):
                        benchmarks.append(line.strip())
                return benchmarks
            else:
                logger.warning("Failed to get available benchmarks", error=result.stderr)
                return []
                
        except Exception as e:
            logger.error("Failed to get available benchmarks", error=str(e))
            return []
    
    def get_available_models(self) -> List[str]:
        """
        Get list of available models from lmms-eval.
        
        Returns:
            List[str]: Available model names
        """
        try:
            cmd = ["python", "-m", "lmms_eval", "--models"]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                models = []
                for line in result.stdout.split('\n'):
                    if line.strip() and not line.startswith('#'):
                        models.append(line.strip())
                return models
            else:
                logger.warning("Failed to get available models", error=result.stderr)
                return []
                
        except Exception as e:
            logger.error("Failed to get available models", error=str(e))
            return []
    
    def get_benchmark_info(self, benchmark_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific benchmark.
        
        Args:
            benchmark_id: Benchmark identifier
            
        Returns:
            Dict[str, Any]: Benchmark information
        """
        try:
            cmd = ["python", "-m", "lmms_eval", "--benchmark_info", benchmark_id]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                try:
                    return json.loads(result.stdout)
                except json.JSONDecodeError:
                    return {"description": result.stdout.strip()}
            else:
                logger.warning(f"Failed to get benchmark info for {benchmark_id}", error=result.stderr)
                return {}
                
        except Exception as e:
            logger.error(f"Failed to get benchmark info for {benchmark_id}", error=str(e))
            return {}
    
    def cleanup(self):
        """
        Clean up resources and terminate process.
        """
        try:
            # Terminate process if still running
            if self.process and self.process.poll() is None:
                self.process.terminate()
                self.process.wait(timeout=10)
            
            # Archive work directory instead of deleting
            if self.work_dir and os.path.exists(self.work_dir):
                try:
                    # Create archive directory
                    archive_dir = os.path.join(os.getcwd(), "archives")
                    os.makedirs(archive_dir, exist_ok=True)
                    
                    # Move work directory to archive
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    archive_name = f"lmms_eval_{self.model_id}_{timestamp}"
                    archive_path = os.path.join(archive_dir, archive_name)
                    
                    shutil.move(self.work_dir, archive_path)
                    logger.info(f"Archived work directory to: {archive_path}")
                    
                except Exception as e:
                    logger.warning(f"Failed to archive work directory: {e}")
                    # Fallback: remove directory
                    try:
                        shutil.rmtree(self.work_dir)
                    except Exception:
                        pass
            
            logger.info(
                "LMMS-Eval runner cleanup completed",
                model_id=self.model_id
            )
            
        except Exception as e:
            logger.error(
                "Failed to cleanup LMMS-Eval runner",
                error=str(e),
                model_id=self.model_id
            )
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get current runner status.
        
        Returns:
            Dict[str, Any]: Runner status
        """
        status = {
            "model_id": self.model_id,
            "benchmark_ids": self.benchmark_ids,
            "config": self.config,
            "is_running": False,
            "return_code": None,
            "stdout_length": len(self.stdout),
            "stderr_length": len(self.stderr)
        }
        
        if self.process:
            status["is_running"] = self.process.poll() is None
            status["return_code"] = self.process.returncode
        
        return status
    
    # New helper methods for multiple model sources
    
    def _get_model_info(self) -> Dict[str, Any]:
        """Get model information from database."""
        try:
            # Try to get model by name first, then by ID
            model = supabase_service.get_model_by_id(self.model_id)
            if not model:
                # Try to find by name
                models = supabase_service.get_models()
                for m in models:
                    if m.get('name') == self.model_id:
                        model = m
                        break
            
            if not model:
                logger.warning(f"Model not found in database: {self.model_id}")
                return {'loading_method': 'huggingface'}
            
            return model
            
        except Exception as e:
            logger.error(f"Failed to get model info: {e}")
            return {'loading_method': 'huggingface'}
    
    def _get_huggingface_model_args(self, model_info: Dict[str, Any]) -> Dict[str, Any]:
        """Get model arguments for HuggingFace models."""
        model_args = {}
        
        # Model path
        model_path = model_info.get('model_path', self.model_id)
        if model_path:
            model_args['pretrained'] = model_path
        
        # Cache path (optional, not stored in DB)
        # cache_path = model_info.get('cache_path')
        # if cache_path:
        #     model_args['cache_dir'] = cache_path
        
        # Model-specific configurations
        if 'llava' in self.model_id.lower():
            model_args['conv_template'] = 'llava_v1'
        elif 'qwen' in self.model_id.lower():
            model_args['conv_template'] = 'qwen_vl'
        elif 'llama' in self.model_id.lower():
            model_args['conv_template'] = 'llama_v2'
        
        # Hardware requirements (from metadata)
        metadata = model_info.get('metadata', {})
        hardware_req = metadata.get('hardware_requirements', {})
        if 'min_gpu_memory' in hardware_req:
            model_args['gpu_memory_utilization'] = 0.9
        
        return model_args
    
    def _get_local_model_args(self, model_info: Dict[str, Any]) -> Dict[str, Any]:
        """Get model arguments for local models."""
        model_args = {}
        
        # Local model path
        model_path = model_info.get('model_path')
        if model_path:
            model_args['pretrained'] = model_path
            model_args['local_only'] = True
        
        # Model type detection
        model_family = model_info.get('family', '').lower()
        if 'llava' in model_family:
            model_args['conv_template'] = 'llava_v1'
        elif 'qwen' in model_family:
            model_args['conv_template'] = 'qwen_vl'
        elif 'llama' in model_family:
            model_args['conv_template'] = 'llama_v2'
        
        return model_args
    
    def _get_api_model_args(self, model_info: Dict[str, Any]) -> Dict[str, Any]:
        """Get model arguments for API-based models."""
        model_args = {}
        
        # API credentials
        api_credentials = model_info.get('api_credentials', {})
        provider = api_credentials.get('provider', 'openai')
        api_key = api_credentials.get('api_key')
        model_name = api_credentials.get('model_name', self.model_id)
        
        if api_key:
            model_args['api_key'] = api_key
        
        # Provider-specific configurations
        if provider == 'openai':
            model_args['provider'] = 'openai'
            model_args['model_name'] = model_name
            model_args['api_base'] = model_info.get('api_endpoint', 'https://api.openai.com/v1')
        elif provider == 'anthropic':
            model_args['provider'] = 'anthropic'
            model_args['model_name'] = model_name
            model_args['api_base'] = model_info.get('api_endpoint', 'https://api.anthropic.com')
        elif provider == 'google':
            model_args['provider'] = 'google'
            model_args['model_name'] = model_name
            model_args['api_base'] = model_info.get('api_endpoint', 'https://generativelanguage.googleapis.com/v1')
        
        return model_args
    
    def _get_vllm_model_args(self, model_info: Dict[str, Any]) -> Dict[str, Any]:
        """Get model arguments for vLLM-served models."""
        model_args = {}
        
        # vLLM endpoint
        api_endpoint = model_info.get('api_endpoint')
        if api_endpoint:
            model_args['api_url'] = api_endpoint
            model_args['provider'] = 'vllm'
        
        # Authentication
        api_credentials = model_info.get('api_credentials', {})
        auth_token = api_credentials.get('auth_token')
        if auth_token:
            model_args['auth_token'] = auth_token
        
        # Hardware requirements (from metadata)
        metadata = model_info.get('metadata', {})
        hardware_req = metadata.get('hardware_requirements', {})
        gpu_count = hardware_req.get('gpu_count', 1)
        if gpu_count > 1:
            model_args['tensor_parallel'] = gpu_count
        
        return model_args
