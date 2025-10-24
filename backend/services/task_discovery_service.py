"""
Task Discovery Service

Discovers available tasks from lmms-eval and provides caching and mapping functionality.
"""

import asyncio
import json
import logging
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Optional, Set
from difflib import get_close_matches

import structlog

logger = structlog.get_logger(__name__)


class TaskDiscoveryService:
    """Service for discovering and caching lmms-eval tasks."""
    
    def __init__(self, lmms_eval_path: str = None):
        """Initialize the task discovery service."""
        self.lmms_eval_path = lmms_eval_path or self._find_lmms_eval_path()
        self._cached_tasks: List[str] = []
        self._cache_timestamp: float = 0
        self._cache_ttl: int = 24 * 60 * 60  # 24 hours in seconds
        self._task_metadata: Dict[str, Dict] = {}
        
    def _find_lmms_eval_path(self) -> str:
        """Find the lmms-eval installation path."""
        # Try to find lmms-eval in the project
        project_root = Path(__file__).parent.parent.parent
        lmms_eval_path = project_root / "lmms-eval"
        
        if lmms_eval_path.exists():
            return str(lmms_eval_path)
        
        # Fallback to system PATH
        try:
            result = subprocess.run(
                ["python", "-m", "lmms_eval", "--help"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                return "lmms-eval"  # Available in PATH
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
            
        raise RuntimeError("lmms-eval not found. Please ensure it's installed and accessible.")
    
    async def discover_available_tasks(self) -> List[str]:
        """Discover all available tasks from lmms-eval."""
        logger.info("Discovering available tasks from lmms-eval")
        
        try:
            # Run lmms-eval --tasks list
            cmd = ["python", "-m", "lmms_eval", "--tasks", "list"]
            
            if self.lmms_eval_path != "lmms-eval":
                # If we have a specific path, run from that directory
                result = subprocess.run(
                    cmd,
                    cwd=self.lmms_eval_path,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
            else:
                # Run from system PATH
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
            
            if result.returncode != 0:
                logger.error("Failed to discover tasks", 
                            error=result.stderr, 
                            returncode=result.returncode)
                raise RuntimeError(f"lmms-eval task discovery failed: {result.stderr}")
            
            # Parse the output
            tasks = self._parse_task_list_output(result.stdout)
            logger.info("Discovered tasks", count=len(tasks), tasks=tasks[:10])
            
            return tasks
            
        except subprocess.TimeoutExpired:
            logger.error("Task discovery timed out")
            raise RuntimeError("Task discovery timed out")
        except Exception as e:
            logger.error("Failed to discover tasks", error=str(e))
            raise RuntimeError(f"Task discovery failed: {e}")
    
    def _parse_task_list_output(self, output: str) -> List[str]:
        """Parse the output from lmms-eval --tasks list."""
        tasks = []
        
        # The output format is:
        #  - task1
        #  - task2
        #  ...
        
        lines = output.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            
            # Look for lines that start with " - " (space, dash, space)
            if line.startswith("- "):
                task_name = line[2:].strip()
                if task_name:
                    tasks.append(task_name)
        
        return sorted(tasks)
    
    def get_cached_tasks(self) -> List[str]:
        """Get cached tasks if available and not expired."""
        current_time = time.time()
        
        if (self._cached_tasks and 
            current_time - self._cache_timestamp < self._cache_ttl):
            logger.debug("Returning cached tasks", count=len(self._cached_tasks))
            return self._cached_tasks.copy()
        
        return []
    
    async def refresh_task_cache(self) -> List[str]:
        """Force refresh the task cache."""
        logger.info("Refreshing task cache")
        
        try:
            tasks = await self.discover_available_tasks()
            self._cached_tasks = tasks
            self._cache_timestamp = time.time()
            
            logger.info("Task cache refreshed", count=len(tasks))
            return tasks
            
        except Exception as e:
            logger.error("Failed to refresh task cache", error=str(e))
            # Return cached tasks if available, even if expired
            if self._cached_tasks:
                logger.warning("Using expired cache due to refresh failure")
                return self._cached_tasks.copy()
            raise
    
    async def get_available_tasks(self) -> List[str]:
        """Get available tasks, using cache if valid, otherwise refresh."""
        cached_tasks = self.get_cached_tasks()
        
        if cached_tasks:
            return cached_tasks
        
        # Cache is empty or expired, refresh
        return await self.refresh_task_cache()
    
    def find_closest_match(self, task_name: str, available_tasks: List[str]) -> Optional[str]:
        """Find the closest matching task name using fuzzy matching."""
        if not available_tasks:
            return None
        
        # Try exact match first (case insensitive)
        task_lower = task_name.lower()
        for task in available_tasks:
            if task.lower() == task_lower:
                return task
        
        # Try fuzzy matching
        matches = get_close_matches(
            task_name, 
            available_tasks, 
            n=1, 
            cutoff=0.6
        )
        
        if matches:
            logger.info("Found fuzzy match", 
                       original=task_name, 
                       match=matches[0])
            return matches[0]
        
        logger.warning("No match found for task", task=task_name)
        return None
    
    async def map_benchmark_to_task(self, benchmark: Dict[str, any]) -> Optional[str]:
        """Map a benchmark to its corresponding lmms-eval task name."""
        available_tasks = await self.get_available_tasks()
        
        # Try to get task name from benchmark
        task_name = benchmark.get('task_name')
        if not task_name:
            # Fallback to benchmark name
            task_name = benchmark.get('name', '').lower()
        
        if not task_name:
            logger.warning("No task name found for benchmark", 
                          benchmark_id=benchmark.get('id'))
            return None
        
        # Try direct mapping
        if task_name in available_tasks:
            logger.info("Direct task mapping found", 
                       benchmark=benchmark.get('name', ''),
                       task=task_name)
            return task_name
        
        # Try alternative mappings for common benchmarks
        alternative_mappings = self._get_alternative_mappings(benchmark.get('name', ''))
        for alt_task in alternative_mappings:
            if alt_task in available_tasks:
                logger.info("Alternative mapping found", 
                           benchmark=benchmark.get('name', ''),
                           original_task=task_name,
                           mapped_task=alt_task)
                return alt_task
        
        # Try fuzzy matching as last resort
        mapped_task = self.find_closest_match(task_name, available_tasks)
        if mapped_task:
            logger.info("Fuzzy mapping found", 
                       benchmark=benchmark.get('name', ''),
                       original_task=task_name,
                       mapped_task=mapped_task)
            return mapped_task
        
        # No mapping found
        logger.warning("No valid task mapping found for benchmark", 
                      benchmark_name=benchmark.get('name', ''),
                      benchmark_id=benchmark.get('id'),
                      task_name=task_name,
                      available_tasks_count=len(available_tasks))
        return None
    
    def _get_alternative_mappings(self, benchmark_name: str) -> List[str]:
        """Get alternative task names for common benchmarks."""
        name_lower = benchmark_name.lower()
        
        alternative_mappings = {
            'humaneval': ['humaneval', 'human_eval', 'humanevalplus', 'humaneval_python'],
            'librispeech': ['librispeech', 'librispeech_asr', 'librispeech_clean'],
            'truthfulqa': ['truthful_qa_mc', 'truthful_qa_gen', 'truthful_qa', 'truthfulqa_mc', 'truthfulqa_gen'],
            'arc': ['ai2_arc', 'arc', 'arc_challenge', 'arc_easy'],
            'hellaswag': ['hellaswag', 'hellaswag_0'],
            'mmlu': ['mmlu', 'mmlu_0', 'mmlu_5shot'],
            'gsm8k': ['gsm8k', 'gsm8k_cot'],
            'winogrande': ['winogrande', 'winogrande_0'],
            'piqa': ['piqa', 'piqa_0'],
            'vqa': ['vqav2', 'vqa_v2', 'vqa'],
            'textvqa': ['textvqa', 'text_vqa'],
            'gqa': ['gqa', 'gqa_0'],
            'coco': ['coco_caption', 'coco_caption2017', 'coco_captions'],
            'mme': ['mme', 'mme_full'],
            'mmbench': ['mmbench', 'mmbench_en', 'mmbench_cn'],
            'seedbench': ['seedbench', 'seed_bench'],
            'pope': ['pope', 'pope_adversarial'],
            'mmvet': ['mmvet', 'mm_vet'],
            'mathvista': ['mathvista', 'math_vista'],
            'scienceqa': ['scienceqa', 'science_qa', 'sqa'],
            'chartqa': ['chartqa', 'chart_qa'],
            'docvqa': ['docvqa', 'doc_vqa'],
            'infographicsvqa': ['infographicsvqa', 'infographics_vqa'],
            'ai2d': ['ai2d', 'ai2_diagram'],
            'videomme': ['videomme', 'video_mme'],
            'mmmu': ['mmmu', 'mm_mu']
        }
        
        # Find matching alternatives
        for key, alternatives in alternative_mappings.items():
            if key in name_lower:
                return alternatives
        
        return []
    
    async def get_compatible_tasks_for_model(self, model_id: str) -> List[str]:
        """Get tasks that are compatible with a specific model."""
        # For now, return all available tasks
        # TODO: Implement model-specific compatibility checking
        return await self.get_available_tasks()
    
    def get_task_metadata(self, task_name: str) -> Optional[Dict]:
        """Get metadata for a specific task."""
        return self._task_metadata.get(task_name)
    
    async def validate_tasks(self, task_names: List[str]) -> Dict[str, bool]:
        """Validate that task names exist in lmms-eval."""
        available_tasks = await self.get_available_tasks()
        available_set = set(available_tasks)
        
        validation_results = {}
        for task_name in task_names:
            validation_results[task_name] = task_name in available_set
        
        return validation_results


# Global instance
task_discovery_service = TaskDiscoveryService()
