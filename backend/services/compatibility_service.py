"""
Service for determining model-benchmark compatibility based on modality support.
"""

import structlog
from typing import Dict, List, Any, Optional
from services.supabase_service import supabase_service

logger = structlog.get_logger()

class CompatibilityService:
    """Service for checking model-benchmark compatibility."""
    
    def __init__(self):
        self.logger = logger.bind(service="compatibility")
    
    def get_model_modalities(self, model_id: str) -> List[str]:
        """Get the modalities supported by a model."""
        try:
            model = supabase_service.get_model_by_id(model_id)
            if not model:
                self.logger.warning("Model not found", model_id=model_id)
                return []
            
            # Extract modality support from metadata
            metadata = model.get('metadata', {})
            modality_support = metadata.get('modality_support', [])
            
            # If no modality support in metadata, try to infer from model name/family
            if not modality_support:
                modality_support = self._infer_modalities_from_model(model)
            
            self.logger.info("Model modalities", model_id=model_id, modalities=modality_support)
            return modality_support
            
        except Exception as e:
            self.logger.error("Failed to get model modalities", model_id=model_id, error=str(e))
            return []
    
    def get_benchmark_modalities(self, benchmark_id: str) -> List[str]:
        """Get the modalities required by a benchmark."""
        try:
            benchmark = supabase_service.get_benchmark_by_id(benchmark_id)
            if not benchmark:
                self.logger.warning("Benchmark not found", benchmark_id=benchmark_id)
                return []
            
            # Extract modality support from metadata
            metadata = benchmark.get('metadata', {})
            modality_support = metadata.get('modality_support', [])
            
            # If no modality support in metadata, use the primary modality
            if not modality_support:
                primary_modality = benchmark.get('modality', '').lower()
                if primary_modality:
                    modality_support = [primary_modality]
            
            # Ensure we have at least one modality
            if not modality_support:
                modality_support = ['text']  # Default fallback
            
            self.logger.info("Benchmark modalities", benchmark_id=benchmark_id, modalities=modality_support)
            return modality_support
            
        except Exception as e:
            self.logger.error("Failed to get benchmark modalities", benchmark_id=benchmark_id, error=str(e))
            return []
    
    def is_compatible(self, model_id: str, benchmark_id: str) -> bool:
        """Check if a model is compatible with a benchmark."""
        try:
            model_modalities = self.get_model_modalities(model_id)
            benchmark_modalities = self.get_benchmark_modalities(benchmark_id)
            
            if not model_modalities or not benchmark_modalities:
                self.logger.warning("Missing modality information", 
                                  model_id=model_id, benchmark_id=benchmark_id,
                                  model_modalities=model_modalities, benchmark_modalities=benchmark_modalities)
                return False
            
            # Check if model supports all required benchmark modalities
            model_modalities_lower = [m.lower() for m in model_modalities]
            benchmark_modalities_lower = [m.lower() for m in benchmark_modalities]
            
            # Handle common modality mappings
            modality_mapping = {
                'vision': ['image', 'visual'],
                'image': ['vision', 'visual'],
                'visual': ['vision', 'image'],
                'audio': ['sound', 'speech'],
                'sound': ['audio', 'speech'],
                'speech': ['audio', 'sound'],
                'video': ['temporal', 'motion'],
                'temporal': ['video', 'motion'],
                'motion': ['video', 'temporal']
            }
            
            # Expand modalities with mappings
            expanded_model_modalities = set(model_modalities_lower)
            expanded_benchmark_modalities = set(benchmark_modalities_lower)
            
            for modality in model_modalities_lower:
                if modality in modality_mapping:
                    expanded_model_modalities.update(modality_mapping[modality])
            
            for modality in benchmark_modalities_lower:
                if modality in modality_mapping:
                    expanded_benchmark_modalities.update(modality_mapping[modality])
            
            # Model must support at least one of the benchmark's modalities
            compatible = bool(expanded_model_modalities.intersection(expanded_benchmark_modalities))
            
            self.logger.info("Compatibility check", 
                           model_id=model_id, benchmark_id=benchmark_id,
                           model_modalities=model_modalities, benchmark_modalities=benchmark_modalities,
                           compatible=compatible)
            
            return compatible
            
        except Exception as e:
            self.logger.error("Failed to check compatibility", 
                            model_id=model_id, benchmark_id=benchmark_id, error=str(e))
            return False
    
    def get_compatible_benchmarks(self, model_id: str) -> List[Dict[str, Any]]:
        """Get all benchmarks compatible with a model."""
        try:
            # Get all benchmarks (limit to 50 for performance)
            benchmarks = supabase_service.get_benchmarks(0, 50)
            
            self.logger.info("Checking compatibility for benchmarks", 
                           model_id=model_id, total_benchmarks=len(benchmarks))
            
            # Get model modalities once
            model_modalities = self.get_model_modalities(model_id)
            if not model_modalities:
                self.logger.warning("No model modalities found", model_id=model_id)
                return []
            
            compatible_benchmarks = []
            for benchmark in benchmarks:
                benchmark_id = benchmark['id']
                benchmark_modalities = self.get_benchmark_modalities(benchmark_id)
                
                # Quick compatibility check without full is_compatible call
                if self._quick_compatibility_check(model_modalities, benchmark_modalities):
                    compatible_benchmarks.append(benchmark)
            
            self.logger.info("Compatible benchmarks found", 
                           model_id=model_id, count=len(compatible_benchmarks))
            
            return compatible_benchmarks
            
        except Exception as e:
            self.logger.error("Failed to get compatible benchmarks", model_id=model_id, error=str(e))
            return []
    
    def get_incompatible_benchmarks(self, model_id: str) -> List[Dict[str, Any]]:
        """Get all benchmarks incompatible with a model."""
        try:
            # Get all benchmarks (limit to 50 for performance)
            benchmarks = supabase_service.get_benchmarks(0, 50)
            
            incompatible_benchmarks = []
            for benchmark in benchmarks:
                if not self.is_compatible(model_id, benchmark['id']):
                    incompatible_benchmarks.append(benchmark)
            
            self.logger.info("Incompatible benchmarks found", 
                           model_id=model_id, count=len(incompatible_benchmarks))
            
            return incompatible_benchmarks
            
        except Exception as e:
            self.logger.error("Failed to get incompatible benchmarks", model_id=model_id, error=str(e))
            return []
    
    def _infer_modalities_from_model(self, model: Dict[str, Any]) -> List[str]:
        """Infer model modalities from model name, family, or other attributes."""
        try:
            name = model.get('name', '').lower()
            family = model.get('family', '').lower()
            source = model.get('source', '').lower()
            
            modalities = []
            
            # Check for vision-language models
            if any(keyword in name for keyword in ['vl', 'vision', 'visual', 'llava', 'qwen2-vl', 'gpt-4v', 'gpt4v']):
                modalities.extend(['vision', 'text'])
            
            # Check for audio models
            if any(keyword in name for keyword in ['whisper', 'wav2vec', 'audio', 'speech', 'asr']):
                modalities.extend(['audio', 'text'])
            
            # Check for video models
            if any(keyword in name for keyword in ['video', 'temporal', 'video-llm']):
                modalities.extend(['video', 'text'])
            
            # Check for text-only models
            if any(keyword in name for keyword in ['gpt', 'llama', 'claude', 'gemini', 'text']) and not any(keyword in name for keyword in ['vl', 'vision', 'visual']):
                modalities.append('text')
            
            # Check family patterns
            if 'qwen2-vl' in family:
                modalities.extend(['vision', 'text'])
            elif 'llava' in family:
                modalities.extend(['vision', 'text'])
            elif 'whisper' in family:
                modalities.extend(['audio', 'text'])
            elif 'gpt' in family and 'vision' not in family:
                modalities.append('text')
            
            # Check source patterns
            if 'huggingface' in source:
                # Try to infer from HuggingFace model name
                if any(keyword in source for keyword in ['vl', 'vision', 'visual']):
                    modalities.extend(['vision', 'text'])
                elif any(keyword in source for keyword in ['whisper', 'wav2vec']):
                    modalities.extend(['audio', 'text'])
            
            # Default to text if no modalities found
            if not modalities:
                modalities = ['text']
            
            # Remove duplicates and return
            unique_modalities = list(set(modalities))
            self.logger.info("Inferred modalities", model_id=model.get('id'), modalities=unique_modalities)
            
            return unique_modalities
            
        except Exception as e:
            self.logger.error("Failed to infer modalities", model_id=model.get('id'), error=str(e))
            return ['text']  # Default fallback
    
    def _quick_compatibility_check(self, model_modalities: List[str], benchmark_modalities: List[str]) -> bool:
        """Quick compatibility check without full logging."""
        try:
            if not model_modalities or not benchmark_modalities:
                return False
            
            # Convert to lowercase
            model_modalities_lower = [m.lower() for m in model_modalities]
            benchmark_modalities_lower = [m.lower() for m in benchmark_modalities]
            
            # Handle common modality mappings
            modality_mapping = {
                'vision': ['image', 'visual'],
                'image': ['vision', 'visual'],
                'visual': ['vision', 'image'],
                'audio': ['sound', 'speech'],
                'sound': ['audio', 'speech'],
                'speech': ['audio', 'sound'],
                'video': ['temporal', 'motion'],
                'temporal': ['video', 'motion'],
                'motion': ['video', 'temporal']
            }
            
            # Expand modalities with mappings
            expanded_model_modalities = set(model_modalities_lower)
            expanded_benchmark_modalities = set(benchmark_modalities_lower)
            
            for modality in model_modalities_lower:
                if modality in modality_mapping:
                    expanded_model_modalities.update(modality_mapping[modality])
            
            for modality in benchmark_modalities_lower:
                if modality in modality_mapping:
                    expanded_benchmark_modalities.update(modality_mapping[modality])
            
            # Model must support at least one of the benchmark's modalities
            return bool(expanded_model_modalities.intersection(expanded_benchmark_modalities))
            
        except Exception as e:
            self.logger.error("Failed quick compatibility check", error=str(e))
            return False
    
    def get_compatibility_report(self, model_id: str) -> Dict[str, Any]:
        """Get a comprehensive compatibility report for a model."""
        try:
            model_modalities = self.get_model_modalities(model_id)
            compatible_benchmarks = self.get_compatible_benchmarks(model_id)
            incompatible_benchmarks = self.get_incompatible_benchmarks(model_id)
            
            # Group by modality
            compatible_by_modality = {}
            incompatible_by_modality = {}
            
            for benchmark in compatible_benchmarks:
                modality = benchmark.get('modality', 'unknown')
                if modality not in compatible_by_modality:
                    compatible_by_modality[modality] = []
                compatible_by_modality[modality].append(benchmark)
            
            for benchmark in incompatible_benchmarks:
                modality = benchmark.get('modality', 'unknown')
                if modality not in incompatible_by_modality:
                    incompatible_by_modality[modality] = []
                incompatible_by_modality[modality].append(benchmark)
            
            report = {
                'model_id': model_id,
                'model_modalities': model_modalities,
                'total_benchmarks': len(compatible_benchmarks) + len(incompatible_benchmarks),
                'compatible_count': len(compatible_benchmarks),
                'incompatible_count': len(incompatible_benchmarks),
                'compatible_benchmarks': compatible_benchmarks,
                'incompatible_benchmarks': incompatible_benchmarks,
                'compatible_by_modality': compatible_by_modality,
                'incompatible_by_modality': incompatible_by_modality
            }
            
            self.logger.info("Compatibility report generated", 
                           model_id=model_id, 
                           compatible_count=len(compatible_benchmarks),
                           incompatible_count=len(incompatible_benchmarks))
            
            return report
            
        except Exception as e:
            self.logger.error("Failed to generate compatibility report", model_id=model_id, error=str(e))
            return {
                'model_id': model_id,
                'model_modalities': [],
                'total_benchmarks': 0,
                'compatible_count': 0,
                'incompatible_count': 0,
                'compatible_benchmarks': [],
                'incompatible_benchmarks': [],
                'compatible_by_modality': {},
                'incompatible_by_modality': {}
            }

# Global instance
compatibility_service = CompatibilityService()
