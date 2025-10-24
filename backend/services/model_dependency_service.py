"""
Model Dependency Management Service

Maps model types to their required dependencies and provides dependency checking functionality.
Based on lmms-eval's model structure and optional dependencies.
"""

import subprocess
import re
import time
from typing import Dict, List, Set, Optional, Tuple
from pathlib import Path
import structlog

logger = structlog.get_logger(__name__)

class ModelDependencyService:
    """Service for managing model-specific dependencies."""
    
    def __init__(self):
        """Initialize the dependency service."""
        self._installed_packages: Optional[Set[str]] = None
        self._cache_timestamp: Optional[float] = None
        self._cache_ttl = 300  # 5 minutes cache
        
        # Enhanced caching for dependency status
        self._dependency_status_cache: Dict[str, Dict] = {}
        self._status_cache_timestamp: Dict[str, float] = {}
        self._status_cache_ttl = 600  # 10 minutes for dependency status
        
        # Model dependency mappings based on lmms-eval structure
        # NOTE: All dependencies are now pre-installed in the backend
        self.MODEL_DEPENDENCIES = {
            # Qwen models (dependencies pre-installed)
            'qwen2_vl': [],
            'qwen2_5_vl': [],
            'qwen2_5_omni': [],
            'qwen2_5_vl_interleave': [],
            'qwen2_audio': [],
            'qwen_vl': [],
            'qwen_vl_api': [],
            
            # Video models (dependencies pre-installed)
            'llava_vid': [],
            'llava_onevision': [],
            'llava_onevision1_5': [],
            'llava_onevision_moviechat': [],
            'llama_vid': [],
            'videochat2': [],
            'videochat_flash': [],
            'moviechat': [],
            'longva': [],
            'internvideo2': [],
            'internvideo2_5': [],
            'vita': [],
            'vila': [],
            'videollama3': [],
            'mplug_owl_video': [],
            
            # Audio models (dependencies pre-installed)
            'gpt4o_audio': [],
            'qwen2_audio': [],
            
            # API models (no additional dependencies)
            'gpt4v': [],
            'claude': [],
            'gemini_api': [],
            'openai_compatible': [],
            'batch_gpt4': [],
            
            # Other specialized models (dependencies pre-installed)
            'internvl': [],
            'internvl2': [],
            'idefics2': [],
            'phi4_multimodal': [],
            'phi3v': [],
            'mantis': [],
            'minicpm_v': [],
            'minimonkey': [],
            'oryx': [],
            'ola': [],
            'ross': [],
            'slime': [],
            'reka': [],
            'srt_api': [],
            'auroracap': [],
            'aria': [],
            'aero': [],
            'plm': [],
            'fuyu': [],
            'instructblip': [],
            'llava': [],
            'llava_hf': [],
            'llava_sglang': [],
            'llama_vision': [],
            'cogvlm2': [],
            'from_log': [],
            'gemma3': [],
        }
        
        # Pattern matching for model families (dependencies pre-installed)
        self.PATTERN_DEPENDENCIES = {
            'video_*': [],
            'audio_*': [],
            'qwen*': [],
            'llava*': [],
            'llama*': [],
            'intern*': [],
        }
    
    def get_model_dependencies(self, model_name: str) -> List[str]:
        """
        Get required dependencies for a model.
        
        Args:
            model_name: The lmms-eval model name (e.g., 'qwen2_vl')
            
        Returns:
            List of required package names
        """
        # Direct mapping first
        if model_name in self.MODEL_DEPENDENCIES:
            return self.MODEL_DEPENDENCIES[model_name].copy()
        
        # Pattern matching
        dependencies = set()
        for pattern, deps in self.PATTERN_DEPENDENCIES.items():
            if self._matches_pattern(model_name, pattern):
                dependencies.update(deps)
        
        return list(dependencies)
    
    def _matches_pattern(self, model_name: str, pattern: str) -> bool:
        """Check if model name matches a pattern."""
        if pattern.endswith('*'):
            prefix = pattern[:-1]
            return model_name.startswith(prefix)
        return model_name == pattern
    
    def check_dependencies(self, dependencies: List[str]) -> Dict[str, bool]:
        """
        Check which dependencies are installed.
        
        Args:
            dependencies: List of package names to check
            
        Returns:
            Dict mapping package name to installation status
        """
        if not dependencies:
            return {}
        
        installed_packages = self._get_installed_packages()
        return {dep: dep in installed_packages for dep in dependencies}
    
    def get_missing_dependencies(self, model_name: str) -> List[str]:
        """
        Get missing dependencies for a model.
        
        Args:
            model_name: The lmms-eval model name
            
        Returns:
            List of missing package names
        """
        required_deps = self.get_model_dependencies(model_name)
        if not required_deps:
            return []
        
        status = self.check_dependencies(required_deps)
        return [dep for dep, installed in status.items() if not installed]
    
    def get_install_command(self, dependencies: List[str]) -> str:
        """
        Generate pip install command for missing dependencies.
        
        Args:
            dependencies: List of package names to install
            
        Returns:
            pip install command string
        """
        if not dependencies:
            return ""
        
        # Validate package names to prevent command injection
        safe_deps = []
        for dep in dependencies:
            if self._is_safe_package_name(dep):
                safe_deps.append(dep)
            else:
                logger.warning("Skipping potentially unsafe package name", package=dep)
        
        if not safe_deps:
            return ""
        
        return f"pip install {' '.join(safe_deps)}"
    
    def _is_safe_package_name(self, package_name: str) -> bool:
        """Validate package name to prevent command injection."""
        # Allow alphanumeric, hyphens, underscores, and dots
        return bool(re.match(r'^[a-zA-Z0-9._-]+$', package_name))
    
    def _get_installed_packages(self) -> Set[str]:
        """
        Get set of installed package names.
        Uses caching to avoid repeated subprocess calls.
        """
        current_time = time.time()
        
        # Return cached result if still valid
        if (self._installed_packages is not None and 
            self._cache_timestamp is not None and
            current_time - self._cache_timestamp < self._cache_ttl):
            return self._installed_packages
        
        try:
            # Run pip list to get installed packages
            result = subprocess.run(
                ['pip', 'list', '--format=freeze'],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                logger.error("Failed to get installed packages", error=result.stderr)
                return set()
            
            # Parse package names from pip list output
            packages = set()
            for line in result.stdout.strip().split('\n'):
                if '==' in line:
                    package_name = line.split('==')[0].lower()
                    packages.add(package_name)
            
            # Cache the result
            self._installed_packages = packages
            self._cache_timestamp = current_time
            
            logger.debug("Retrieved installed packages", count=len(packages))
            return packages
            
        except subprocess.TimeoutExpired:
            logger.error("Timeout getting installed packages")
            return set()
        except Exception as e:
            logger.error("Failed to get installed packages", error=str(e))
            return set()
    
    def clear_cache(self):
        """Clear the dependency cache."""
        self._installed_packages = None
        self._cache_timestamp = None
        self._dependency_status_cache.clear()
        self._status_cache_timestamp.clear()
        logger.debug("Dependency cache cleared")
    
    def get_cached_dependency_status(self, model_name: str) -> Optional[Dict]:
        """Get cached dependency status for a model."""
        current_time = time.time()
        
        if (model_name in self._dependency_status_cache and 
            model_name in self._status_cache_timestamp and
            current_time - self._status_cache_timestamp[model_name] < self._status_cache_ttl):
            logger.debug("Returning cached dependency status", model=model_name)
            return self._dependency_status_cache[model_name]
        
        return None
    
    def cache_dependency_status(self, model_name: str, status: Dict):
        """Cache dependency status for a model."""
        current_time = time.time()
        self._dependency_status_cache[model_name] = status
        self._status_cache_timestamp[model_name] = current_time
        logger.debug("Cached dependency status", model=model_name)
    
    def get_enhanced_dependency_status(self, model_name: str) -> Dict:
        """Get enhanced dependency status with caching."""
        # Check cache first
        cached_status = self.get_cached_dependency_status(model_name)
        if cached_status:
            return cached_status
        
        # Generate fresh status
        status = self.get_dependency_status(model_name)
        
        # Cache the result
        self.cache_dependency_status(model_name, status)
        
        return status
    
    def get_dependency_status(self, model_name: str) -> Dict[str, any]:
        """
        Get comprehensive dependency status for a model.
        
        Args:
            model_name: The lmms-eval model name
            
        Returns:
            Dict with dependency information
        """
        required_deps = self.get_model_dependencies(model_name)
        missing_deps = self.get_missing_dependencies(model_name)
        install_cmd = self.get_install_command(missing_deps)
        
        return {
            'model_name': model_name,
            'required_dependencies': required_deps,
            'missing_dependencies': missing_deps,
            'all_installed': len(missing_deps) == 0,
            'install_command': install_cmd,
            'total_required': len(required_deps),
            'total_missing': len(missing_deps)
        }

# Global instance
model_dependency_service = ModelDependencyService()
