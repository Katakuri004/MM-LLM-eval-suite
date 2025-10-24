"""
Benchmark Validation Service

Validates that benchmarks in the database can be mapped to valid lmms-eval tasks.
"""

import structlog
from typing import Dict, List, Optional, Tuple
from services.task_discovery_service import task_discovery_service

logger = structlog.get_logger(__name__)


class BenchmarkValidationService:
    """Service for validating benchmarks against lmms-eval tasks."""
    
    def __init__(self):
        self.task_discovery = task_discovery_service
    
    async def validate_benchmark(self, benchmark: Dict) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validate a benchmark against available lmms-eval tasks.
        
        Returns:
            (is_valid, mapped_task_name, reason)
        """
        available_tasks = await self.task_discovery.get_available_tasks()
        
        # Get task name from benchmark
        task_name = benchmark.get('task_name') or benchmark.get('name', '').lower().replace(' ', '_').replace('-', '_')
        
        # Try direct match
        if task_name in available_tasks:
            return True, task_name, None
        
        # Try alternative mappings
        alternatives = self.task_discovery._get_alternative_mappings(benchmark.get('name', ''))
        for alt in alternatives:
            if alt in available_tasks:
                return True, alt, None
        
        # Try fuzzy match
        fuzzy_match = self.task_discovery.find_closest_match(task_name, available_tasks)
        if fuzzy_match:
            return True, fuzzy_match, None
        
        # No valid mapping found
        return False, None, f"No valid lmms-eval task found for '{benchmark.get('name')}'"
    
    async def validate_all_benchmarks(self, benchmarks: List[Dict]) -> Dict[str, any]:
        """
        Validate all benchmarks and return a report.
        
        Returns:
            {
                'valid': [list of valid benchmarks with mapped tasks],
                'invalid': [list of invalid benchmarks with reasons],
                'total': int,
                'valid_count': int,
                'invalid_count': int
            }
        """
        valid = []
        invalid = []
        
        for benchmark in benchmarks:
            is_valid, mapped_task, reason = await self.validate_benchmark(benchmark)
            
            if is_valid:
                valid.append({
                    'id': benchmark.get('id'),
                    'name': benchmark.get('name'),
                    'task_name': benchmark.get('task_name'),
                    'mapped_task': mapped_task,
                    'modality': benchmark.get('modality')
                })
            else:
                invalid.append({
                    'id': benchmark.get('id'),
                    'name': benchmark.get('name'),
                    'task_name': benchmark.get('task_name'),
                    'reason': reason,
                    'modality': benchmark.get('modality')
                })
        
        return {
            'valid': valid,
            'invalid': invalid,
            'total': len(benchmarks),
            'valid_count': len(valid),
            'invalid_count': len(invalid)
        }


# Global instance
benchmark_validation_service = BenchmarkValidationService()
