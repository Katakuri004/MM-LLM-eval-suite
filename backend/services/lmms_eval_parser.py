"""
Comprehensive LMMS-Eval Output Parser

Parses lmms-eval output files and extracts all available metrics, 
per-sample results, and model responses for detailed analysis.
"""

import json
import re
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import structlog

logger = structlog.get_logger(__name__)

class LMMSEvalParser:
    """Comprehensive parser for lmms-eval output files."""
    
    def __init__(self):
        """Initialize the parser."""
        self.supported_metrics = {
            'accuracy', 'f1', 'bleu', 'cider', 'rouge', 'meteor', 'bertscore',
            'exact_match', 'partial_match', 'perplexity', 'loss', 'score',
            'precision', 'recall', 'auc', 'mse', 'mae', 'r2'
        }
        
        logger.info("LMMS-Eval parser initialized")
    
    def parse_results_directory(self, results_dir: Path) -> Dict[str, Any]:
        """
        Parse all result files in a directory.
        
        Args:
            results_dir: Path to the results directory
            
        Returns:
            Structured results data
        """
        try:
            logger.info("Parsing results directory", path=str(results_dir))
            
            if not results_dir.exists():
                raise FileNotFoundError(f"Results directory not found: {results_dir}")
            
            # Find all result files
            result_files = self._find_result_files(results_dir)
            
            if not result_files:
                raise ValueError(f"No result files found in {results_dir}")
            
            # Parse each result file
            all_results = {}
            for file_path in result_files:
                try:
                    file_results = self._parse_result_file(file_path)
                    all_results.update(file_results)
                except Exception as e:
                    logger.warning("Failed to parse result file", file=str(file_path), error=str(e))
            
            # Combine and structure results
            structured_results = self._structure_results(all_results)
            
            logger.info(
                "Results parsing completed",
                files_parsed=len(result_files),
                tasks_found=len(structured_results.get('task_results', {})),
                total_metrics=len(structured_results.get('all_metrics', {}))
            )
            
            return structured_results
            
        except Exception as e:
            logger.error("Failed to parse results directory", path=str(results_dir), error=str(e))
            raise
    
    def _find_result_files(self, results_dir: Path) -> List[Path]:
        """Find all result files in the directory."""
        result_files = []
        
        # Look for common result file patterns
        patterns = [
            "results.json",
            "metrics.json", 
            "*.json",
            "results/*.json",
            "output/*.json"
        ]
        
        for pattern in patterns:
            files = list(results_dir.glob(pattern))
            result_files.extend(files)
        
        # Remove duplicates and sort
        result_files = list(set(result_files))
        result_files.sort()
        
        return result_files
    
    def _parse_result_file(self, file_path: Path) -> Dict[str, Any]:
        """Parse a single result file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Handle different file formats
            if 'results' in data:
                # Standard lmms-eval format
                return self._parse_standard_format(data)
            elif 'metrics' in data:
                # Metrics-only format
                return self._parse_metrics_format(data)
            else:
                # Direct task results
                return self._parse_direct_format(data)
                
        except json.JSONDecodeError as e:
            logger.error("Invalid JSON in result file", file=str(file_path), error=str(e))
            return {}
        except Exception as e:
            logger.error("Failed to parse result file", file=str(file_path), error=str(e))
            return {}
    
    def _parse_standard_format(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse standard lmms-eval output format."""
        results = {}
        
        # Extract task results
        task_results = data.get('results', {})
        for task_name, task_data in task_results.items():
            results[task_name] = {
                'metrics': self._extract_metrics(task_data),
                'metadata': {
                    'task_name': task_name,
                    'samples_count': task_data.get('samples', 0),
                    'version': data.get('versions', {}).get(task_name, 'unknown')
                }
            }
        
        # Extract global metadata
        results['_global'] = {
            'config': data.get('config', {}),
            'versions': data.get('versions', {}),
            'timestamp': data.get('timestamp', datetime.utcnow().isoformat())
        }
        
        return results
    
    def _parse_metrics_format(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse metrics-only format."""
        results = {}
        
        metrics = data.get('metrics', {})
        for task_name, task_metrics in metrics.items():
            results[task_name] = {
                'metrics': self._extract_metrics(task_metrics),
                'metadata': {
                    'task_name': task_name,
                    'samples_count': task_metrics.get('samples', 0)
                }
            }
        
        return results
    
    def _parse_direct_format(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse direct task results format."""
        results = {}
        
        for task_name, task_data in data.items():
            if isinstance(task_data, dict):
                results[task_name] = {
                    'metrics': self._extract_metrics(task_data),
                    'metadata': {
                        'task_name': task_name,
                        'samples_count': task_data.get('samples', 0)
                    }
                }
        
        return results
    
    def _extract_metrics(self, task_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract and normalize metrics from task data."""
        metrics = {}
        
        for key, value in task_data.items():
            if isinstance(value, (int, float)):
                # Normalize metric names
                normalized_key = self._normalize_metric_name(key)
                metrics[normalized_key] = float(value)
            elif isinstance(value, dict):
                # Nested metrics
                for nested_key, nested_value in value.items():
                    if isinstance(nested_value, (int, float)):
                        full_key = f"{key}_{nested_key}"
                        normalized_key = self._normalize_metric_name(full_key)
                        metrics[normalized_key] = float(nested_value)
        
        return metrics
    
    def _normalize_metric_name(self, name: str) -> str:
        """Normalize metric names to standard format."""
        # Convert to lowercase and replace spaces/special chars
        normalized = re.sub(r'[^a-zA-Z0-9_]', '_', name.lower())
        
        # Remove multiple underscores
        normalized = re.sub(r'_+', '_', normalized)
        
        # Remove leading/trailing underscores
        normalized = normalized.strip('_')
        
        return normalized
    
    def _structure_results(self, all_results: Dict[str, Any]) -> Dict[str, Any]:
        """Structure parsed results into a comprehensive format."""
        structured = {
            'task_results': {},
            'all_metrics': {},
            'global_metadata': {},
            'parsing_info': {
                'parsed_at': datetime.utcnow().isoformat(),
                'total_tasks': 0,
                'total_metrics': 0
            }
        }
        
        # Process task results
        for task_name, task_data in all_results.items():
            if task_name == '_global':
                structured['global_metadata'] = task_data
                continue
            
            if isinstance(task_data, dict) and 'metrics' in task_data:
                structured['task_results'][task_name] = task_data
                
                # Aggregate all metrics
                for metric_name, metric_value in task_data['metrics'].items():
                    if metric_name not in structured['all_metrics']:
                        structured['all_metrics'][metric_name] = []
                    structured['all_metrics'][metric_name].append({
                        'task': task_name,
                        'value': metric_value
                    })
        
        # Update parsing info
        structured['parsing_info']['total_tasks'] = len(structured['task_results'])
        structured['parsing_info']['total_metrics'] = len(structured['all_metrics'])
        
        return structured
    
    def parse_samples(self, samples_file: Path) -> List[Dict[str, Any]]:
        """
        Parse per-sample results from a samples file.
        
        Args:
            samples_file: Path to samples file
            
        Returns:
            List of sample results
        """
        try:
            if not samples_file.exists():
                logger.warning("Samples file not found", file=str(samples_file))
                return []
            
            with open(samples_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Handle different sample formats
            if isinstance(data, list):
                return self._parse_sample_list(data)
            elif isinstance(data, dict):
                if 'samples' in data:
                    return self._parse_sample_list(data['samples'])
                else:
                    return self._parse_sample_dict(data)
            else:
                logger.warning("Unknown samples format", file=str(samples_file))
                return []
                
        except Exception as e:
            logger.error("Failed to parse samples file", file=str(samples_file), error=str(e))
            return []
    
    def _parse_sample_list(self, samples: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Parse samples from a list format."""
        parsed_samples = []
        
        for i, sample in enumerate(samples):
            parsed_sample = {
                'sample_id': i,
                'input': sample.get('input', ''),
                'expected_output': sample.get('expected_output', ''),
                'model_output': sample.get('model_output', ''),
                'is_correct': sample.get('is_correct', False),
                'metrics': self._extract_sample_metrics(sample),
                'metadata': sample.get('metadata', {})
            }
            parsed_samples.append(parsed_sample)
        
        return parsed_samples
    
    def _parse_sample_dict(self, samples_dict: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse samples from a dictionary format."""
        parsed_samples = []
        
        for sample_id, sample_data in samples_dict.items():
            parsed_sample = {
                'sample_id': sample_id,
                'input': sample_data.get('input', ''),
                'expected_output': sample_data.get('expected_output', ''),
                'model_output': sample_data.get('model_output', ''),
                'is_correct': sample_data.get('is_correct', False),
                'metrics': self._extract_sample_metrics(sample_data),
                'metadata': sample_data.get('metadata', {})
            }
            parsed_samples.append(parsed_sample)
        
        return parsed_samples
    
    def _extract_sample_metrics(self, sample_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract metrics from a single sample."""
        metrics = {}
        
        for key, value in sample_data.items():
            if isinstance(value, (int, float)) and key not in ['sample_id', 'is_correct']:
                metrics[key] = float(value)
        
        return metrics
    
    def get_task_summary(self, results: Dict[str, Any], task_name: str) -> Dict[str, Any]:
        """Get summary statistics for a specific task."""
        if task_name not in results.get('task_results', {}):
            return {}
        
        task_data = results['task_results'][task_name]
        metrics = task_data.get('metrics', {})
        metadata = task_data.get('metadata', {})
        
        # Calculate summary statistics
        summary = {
            'task_name': task_name,
            'samples_count': metadata.get('samples_count', 0),
            'metrics': metrics,
            'primary_metrics': self._extract_primary_metrics(metrics),
            'performance_score': self._calculate_performance_score(metrics)
        }
        
        return summary
    
    def _extract_primary_metrics(self, metrics: Dict[str, float]) -> Dict[str, float]:
        """Extract primary performance metrics."""
        primary_metrics = {}
        
        # Look for key performance indicators
        key_metrics = ['accuracy', 'f1', 'bleu', 'exact_match', 'score']
        
        for metric in key_metrics:
            if metric in metrics:
                primary_metrics[metric] = metrics[metric]
        
        return primary_metrics
    
    def _calculate_performance_score(self, metrics: Dict[str, float]) -> float:
        """Calculate overall performance score."""
        if not metrics:
            return 0.0
        
        # Weight different metrics
        weights = {
            'accuracy': 0.3,
            'f1': 0.2,
            'bleu': 0.2,
            'exact_match': 0.2,
            'score': 0.1
        }
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for metric, weight in weights.items():
            if metric in metrics:
                weighted_sum += metrics[metric] * weight
                total_weight += weight
        
        if total_weight == 0:
            return 0.0
        
        return weighted_sum / total_weight

# Global instance
lmms_eval_parser = LMMSEvalParser()
