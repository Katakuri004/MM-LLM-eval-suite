"""
Model-Task Compatibility Service

Determines which tasks are compatible with which models based on their capabilities.
"""

from typing import Dict, List, Set, Tuple, Any
import structlog

logger = structlog.get_logger(__name__)

class ModelTaskCompatibilityService:
    """Service for determining model-task compatibility."""
    
    def __init__(self):
        # Define model capabilities
        self.MODEL_CAPABILITIES = {
            # Vision-Language Models (can handle both text and images)
            'qwen2_5_vl': {'text', 'image', 'vision'},
            'qwen2_vl': {'text', 'image', 'vision'},
            'qwen_vl': {'text', 'image', 'vision'},
            'llava': {'text', 'image', 'vision'},
            'llava_onevision': {'text', 'image', 'vision'},
            'llava_vid': {'text', 'image', 'vision', 'video'},
            'video_llava': {'text', 'image', 'vision', 'video'},
            'vora': {'text', 'image', 'vision', 'video'},
            'internvl': {'text', 'image', 'vision'},
            'cogvlm2': {'text', 'image', 'vision'},
            'instructblip': {'text', 'image', 'vision'},
            'phi3v': {'text', 'image', 'vision'},
            'phi4_multimodal': {'text', 'image', 'vision'},
            
            # Omni models (support all modalities)
            'qwen2_5_omni': {'text', 'image', 'vision', 'audio', 'video'},
            'qwen_omni': {'text', 'image', 'vision', 'audio', 'video'},
            
            # Text-Only Models
            'gpt4v': {'text', 'image', 'vision'},  # API model
            'claude': {'text', 'image', 'vision'},  # API model
            'gemini_api': {'text', 'image', 'vision'},  # API model
            
            # Audio Models
            'gpt4o_audio': {'text', 'audio'},
            'qwen2_audio': {'text', 'audio'},
            
            # Video Models
            'videochat2': {'text', 'video'},
            'videochat_flash': {'text', 'video'},
            'moviechat': {'text', 'video'},
            'longva': {'text', 'video'},
            'internvideo2': {'text', 'video'},
            'internvideo2_5': {'text', 'video'},
            'vita': {'text', 'video'},
            'vila': {'text', 'video'},
            'videollama3': {'text', 'video'},
            'mplug_owl_video': {'text', 'video'},
        }
        
        # Define task requirements
        self.TASK_REQUIREMENTS = {
            # Text-only tasks (compatible with all models)
            'ai2_arc': {'text'},
            'gsm8k': {'text'},
            'hellaswag': {'text'},
            'mmlu': {'text'},
            'winogrande': {'text'},
            'piqa': {'text'},
            'openbookqa': {'text'},
            'truthfulqa': {'text'},
            'arc': {'text'},
            
            # Vision tasks (require image capability)
            'vqav2': {'image', 'vision'},
            'coco_caption': {'image', 'vision'},
            'coco_caption2017': {'image', 'vision'},
            'textvqa': {'image', 'vision'},
            'ok_vqa': {'image', 'vision'},
            'gqa': {'image', 'vision'},
            'infovqa': {'image', 'vision'},
            'docvqa': {'image', 'vision'},
            'chartqa': {'image', 'vision'},
            'scienceqa': {'image', 'vision'},
            'pope': {'image', 'vision'},
            'mmbench': {'image', 'vision'},
            'mmbench_cn': {'image', 'vision'},
            'mmbench_en': {'image', 'vision'},
            'cmmmu': {'image', 'vision'},
            'mmmu': {'image', 'vision'},
            'llava_in_the_wild': {'image', 'vision'},
            'llava_bench': {'image', 'vision'},
            'mme': {'image', 'vision'},
            'seedbench': {'image', 'vision'},
            'seedbench_lite': {'image', 'vision'},
            'mvbench': {'image', 'vision'},
            'nocaps': {'image', 'vision'},
            'refcoco': {'image', 'vision'},
            'refcoco+': {'image', 'vision'},
            'refcocog': {'image', 'vision'},
            'flickr30k': {'image', 'vision'},
            'mathvista': {'image', 'vision'},
            'hallusion_bench_image': {'image', 'vision'},
            
            # Video tasks (require video capability)
            'activitynetqa': {'video'},
            'msvd_qa': {'video'},
            'tgif_qa': {'video'},
            'videochatgpt': {'video'},
            'videomme': {'video'},
            'videomathqa_mcq': {'video'},
            
            # Audio tasks (require audio capability)
            'fleurs': {'audio'},
            'common_voice_15': {'audio'},
            'librispeech': {'audio'},
        }
        
        # Default capabilities for unknown models
        self.DEFAULT_CAPABILITIES = {'text'}
        
        # Task type compatibility mapping
        self.MODEL_TASK_TYPE_COMPATIBILITY = {
            # Vision-language generation models (only support generate_until)
            'qwen2_vl': ['generate_until'],
            'qwen2_5_vl': ['generate_until'],
            'qwen_vl': ['generate_until'],
            'llava': ['generate_until'],
            'llava_onevision': ['generate_until'],
            'llava_vid': ['generate_until'],
            'video_llava': ['generate_until'],
            'vora': ['generate_until'],
            'internvl': ['generate_until'],
            'cogvlm2': ['generate_until'],
            'instructblip': ['generate_until'],
            'phi3v': ['generate_until'],
            'phi4_multimodal': ['generate_until'],
            
            # Omni models (support all task types - more general purpose)
            'qwen2_5_omni': ['generate_until', 'loglikelihood', 'multiple_choice'],
            'qwen_omni': ['generate_until', 'loglikelihood', 'multiple_choice'],
            
            # API models (typically support both)
            'gpt4v': ['generate_until', 'loglikelihood', 'multiple_choice'],
            'claude': ['generate_until', 'loglikelihood', 'multiple_choice'],
            'gemini_api': ['generate_until', 'loglikelihood', 'multiple_choice'],
            
            # Text-only models (support all types)
            'huggingface': ['generate_until', 'loglikelihood', 'multiple_choice'],
        }
        
        # Mapping of benchmark names to their task types
        self.BENCHMARK_TASK_TYPES = {
            'mmlu': 'multiple_choice',
            'hellaswag': 'multiple_choice',
            'arc': 'multiple_choice',
            'truthfulqa': 'multiple_choice',
            'winogrande': 'multiple_choice',
            'piqa': 'multiple_choice',
            'openbookqa': 'multiple_choice',
            'ai2_arc': 'multiple_choice',
            'gsm8k': 'generate_until',
            'mbpp': 'generate_until',
            'humaneval': 'generate_until',
            'vqav2': 'generate_until',
            'gqa': 'generate_until',
            'okvqa': 'generate_until',
            'textvqa': 'generate_until',
            'coco_caption': 'generate_until',
            'coco_caption2017': 'generate_until',
            'infovqa': 'generate_until',
            'docvqa': 'generate_until',
            'chartqa': 'generate_until',
            'scienceqa': 'generate_until',
            'pope': 'generate_until',
            'mmbench': 'generate_until',
            'mmbench_cn': 'generate_until',
            'mmbench_en': 'generate_until',
            'cmmmu': 'generate_until',
            'mmmu': 'generate_until',
            'llava_in_the_wild': 'generate_until',
            'llava_bench': 'generate_until',
            'mme': 'generate_until',
            'seedbench': 'generate_until',
            'seedbench_lite': 'generate_until',
            'mvbench': 'generate_until',
            'nocaps': 'generate_until',
            'refcoco': 'generate_until',
            'refcoco+': 'generate_until',
            'refcocog': 'generate_until',
            'flickr30k': 'generate_until',
            'mathvista': 'generate_until',
            'hallusion_bench_image': 'generate_until',
            'activitynetqa': 'generate_until',
            'msvd_qa': 'generate_until',
            'tgif_qa': 'generate_until',
            'videochatgpt': 'generate_until',
            'videomme': 'generate_until',
            'videomathqa_mcq': 'generate_until',
            'fleurs': 'generate_until',
            'common_voice_15': 'generate_until',
            'librispeech': 'generate_until',
        }
    
    def get_model_capabilities(self, model_name: str) -> Set[str]:
        """Get capabilities for a model."""
        return self.MODEL_CAPABILITIES.get(model_name, self.DEFAULT_CAPABILITIES)
    
    def get_task_requirements(self, task_name: str) -> Set[str]:
        """Get requirements for a task."""
        return self.TASK_REQUIREMENTS.get(task_name, {'text'})
    
    def is_compatible(self, model_name: str, task_name: str) -> bool:
        """Check if a model is compatible with a task."""
        model_capabilities = self.get_model_capabilities(model_name)
        task_requirements = self.get_task_requirements(task_name)
        
        # Model must have all required capabilities
        return task_requirements.issubset(model_capabilities)
    
    def get_compatible_tasks(self, model_name: str, available_tasks: List[str]) -> List[str]:
        """Get list of tasks compatible with a model."""
        compatible_tasks = []
        
        for task in available_tasks:
            if self.is_compatible(model_name, task):
                compatible_tasks.append(task)
            else:
                model_caps = self.get_model_capabilities(model_name)
                task_reqs = self.get_task_requirements(task)
                missing_caps = task_reqs - model_caps
                logger.debug(
                    "Task incompatible with model",
                    model=model_name,
                    task=task,
                    model_capabilities=list(model_caps),
                    task_requirements=list(task_reqs),
                    missing_capabilities=list(missing_caps)
                )
        
        return compatible_tasks
    
    def get_incompatible_tasks(self, model_name: str, available_tasks: List[str]) -> List[str]:
        """Get list of tasks incompatible with a model."""
        incompatible_tasks = []
        
        for task in available_tasks:
            if not self.is_compatible(model_name, task):
                incompatible_tasks.append(task)
        
        return incompatible_tasks
    
    def get_compatibility_report(self, model_name: str, available_tasks: List[str]) -> Dict:
        """Get detailed compatibility report."""
        compatible = self.get_compatible_tasks(model_name, available_tasks)
        incompatible = self.get_incompatible_tasks(model_name, available_tasks)
        
        return {
            'model_name': model_name,
            'model_capabilities': list(self.get_model_capabilities(model_name)),
            'total_tasks': len(available_tasks),
            'compatible_tasks': compatible,
            'incompatible_tasks': incompatible,
            'compatibility_ratio': len(compatible) / len(available_tasks) if available_tasks else 0
        }
    
    def get_task_type_for_benchmark(self, benchmark_name: str) -> str:
        """Get the task type for a benchmark."""
        benchmark_lower = benchmark_name.lower()
        for key, task_type in self.BENCHMARK_TASK_TYPES.items():
            if key in benchmark_lower:
                return task_type
        # Default to generate_until for unknown tasks
        return 'generate_until'
    
    def is_task_type_compatible(self, model_name: str, task_type: str) -> bool:
        """Check if a model supports a specific task type."""
        if model_name not in self.MODEL_TASK_TYPE_COMPATIBILITY:
            # If not explicitly defined, assume it supports all types
            return True
        
        supported_types = self.MODEL_TASK_TYPE_COMPATIBILITY[model_name]
        return task_type in supported_types
    
    def filter_compatible_benchmarks(
        self, 
        model_name: str, 
        benchmarks: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Filter benchmarks based on task type compatibility.
        
        Returns:
            Tuple of (compatible_benchmarks, incompatible_benchmarks)
        """
        compatible = []
        incompatible = []
        
        for benchmark in benchmarks:
            benchmark_name = benchmark.get('name', '')
            task_type = self.get_task_type_for_benchmark(benchmark_name)
            
            if self.is_task_type_compatible(model_name, task_type):
                compatible.append(benchmark)
            else:
                incompatible.append({
                    **benchmark,
                    'incompatibility_reason': f"Model '{model_name}' does not support task type '{task_type}'"
                })
        
        return compatible, incompatible

# Global instance
model_task_compatibility = ModelTaskCompatibilityService()
