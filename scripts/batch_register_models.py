#!/usr/bin/env python3
"""
Batch model registration script for the LMMS-Eval Dashboard.

This script allows users to register multiple models in batch from a CSV file,
supporting all loading methods: HuggingFace, local, API, and vLLM.

Usage:
    python scripts/batch_register_models.py models.csv
    python scripts/batch_register_models.py models.csv --validate
    python scripts/batch_register_models.py models.csv --dry-run
"""

import sys
import os
import csv
import argparse
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import structlog
from datetime import datetime

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from services.model_loader_service import model_loader_service
from services.supabase_service import supabase_service
from config import get_settings

# Configure logging
logger = structlog.get_logger(__name__)

class BatchModelRegistrar:
    """Batch model registration utility."""
    
    def __init__(self, dry_run: bool = False, validate: bool = False):
        """
        Initialize batch registrar.
        
        Args:
            dry_run: If True, don't actually register models
            validate: If True, validate models after registration
        """
        self.dry_run = dry_run
        self.validate = validate
        self.settings = get_settings()
        
        # Results tracking
        self.results = {
            'total': 0,
            'successful': 0,
            'failed': 0,
            'skipped': 0,
            'errors': [],
            'warnings': []
        }
    
    def register_from_csv(self, csv_file: str) -> Dict[str, Any]:
        """
        Register models from CSV file.
        
        Args:
            csv_file: Path to CSV file
            
        Returns:
            Dict[str, Any]: Registration results
        """
        try:
            logger.info("Starting batch model registration", csv_file=csv_file)
            
            # Read CSV file
            models_data = self._read_csv_file(csv_file)
            self.results['total'] = len(models_data)
            
            logger.info(f"Found {len(models_data)} models to register")
            
            # Process each model
            for i, model_data in enumerate(models_data):
                try:
                    self._process_model(i + 1, model_data)
                except Exception as e:
                    self.results['failed'] += 1
                    self.results['errors'].append({
                        'row': i + 1,
                        'model': model_data.get('name', f'Row {i + 1}'),
                        'error': str(e)
                    })
                    logger.error(f"Failed to process model {i + 1}", error=str(e))
            
            # Print summary
            self._print_summary()
            
            return self.results
            
        except Exception as e:
            logger.error("Batch registration failed", error=str(e))
            raise
    
    def _read_csv_file(self, csv_file: str) -> List[Dict[str, Any]]:
        """Read and parse CSV file."""
        if not os.path.exists(csv_file):
            raise FileNotFoundError(f"CSV file not found: {csv_file}")
        
        models_data = []
        
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            # Validate required columns
            required_columns = ['name', 'loading_method']
            missing_columns = [col for col in required_columns if col not in reader.fieldnames]
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                try:
                    # Clean and validate row data
                    model_data = self._clean_row_data(row, row_num)
                    if model_data:
                        models_data.append(model_data)
                except Exception as e:
                    logger.warning(f"Skipping invalid row {row_num}", error=str(e))
                    self.results['warnings'].append({
                        'row': row_num,
                        'warning': f"Invalid row data: {str(e)}"
                    })
        
        return models_data
    
    def _clean_row_data(self, row: Dict[str, str], row_num: int) -> Optional[Dict[str, Any]]:
        """Clean and validate row data."""
        # Remove empty values and strip whitespace
        cleaned_row = {k: v.strip() for k, v in row.items() if v and v.strip()}
        
        if not cleaned_row:
            return None
        
        # Required fields
        name = cleaned_row.get('name')
        loading_method = cleaned_row.get('loading_method', 'huggingface')
        
        if not name:
            raise ValueError("Model name is required")
        
        # Validate loading method
        valid_methods = ['huggingface', 'local', 'api', 'vllm']
        if loading_method not in valid_methods:
            raise ValueError(f"Invalid loading method: {loading_method}. Must be one of: {valid_methods}")
        
        # Build model data based on loading method
        model_data = {
            'name': name,
            'loading_method': loading_method,
            'family': cleaned_row.get('family', ''),
            'source': cleaned_row.get('source', ''),
            'dtype': cleaned_row.get('dtype', 'float16'),
            'num_parameters': self._parse_int(cleaned_row.get('num_parameters', '0')),
            'notes': cleaned_row.get('notes', ''),
            'metadata': {}
        }
        
        # Method-specific fields
        if loading_method == 'huggingface':
            model_data['path'] = cleaned_row.get('path', name)
            model_data['auto_detect'] = self._parse_bool(cleaned_row.get('auto_detect', 'true'))
        elif loading_method == 'local':
            model_data['path'] = cleaned_row.get('path', '')
            if not model_data['path']:
                raise ValueError("Path is required for local models")
        elif loading_method == 'api':
            model_data['provider'] = cleaned_row.get('provider', 'openai')
            model_data['model_name'] = cleaned_row.get('model_name', name)
            model_data['api_key'] = cleaned_row.get('api_key', '')
            model_data['endpoint'] = cleaned_row.get('endpoint', '')
        elif loading_method == 'vllm':
            model_data['endpoint'] = cleaned_row.get('endpoint', '')
            model_data['model_name'] = cleaned_row.get('model_name', name)
            model_data['auth_token'] = cleaned_row.get('auth_token', '')
        
        # Modality support
        modality_str = cleaned_row.get('modality_support', 'text,image')
        model_data['modality_support'] = [m.strip() for m in modality_str.split(',') if m.strip()]
        
        # Hardware requirements
        memory_gb = self._parse_int(cleaned_row.get('memory_gb', '16'))
        recommended_gpus = self._parse_int(cleaned_row.get('recommended_gpus', '1'))
        
        model_data['hardware_requirements'] = {
            'min_gpu_memory': f'{memory_gb}GB',
            'recommended_gpus': recommended_gpus
        }
        
        return model_data
    
    def _process_model(self, row_num: int, model_data: Dict[str, Any]):
        """Process a single model registration."""
        name = model_data['name']
        loading_method = model_data['loading_method']
        
        logger.info(f"Processing model {row_num}: {name} ({loading_method})")
        
        # Check if model already exists
        if self._model_exists(name):
            logger.warning(f"Model {name} already exists, skipping")
            self.results['skipped'] += 1
            return
        
        if self.dry_run:
            logger.info(f"[DRY RUN] Would register model: {name}")
            self.results['successful'] += 1
            return
        
        # Register model based on loading method
        try:
            if loading_method == 'huggingface':
                model_metadata = model_loader_service.load_from_huggingface(
                    model_data['path'],
                    model_data.get('auto_detect', True)
                )
            elif loading_method == 'local':
                model_metadata = model_loader_service.load_from_local(model_data['path'])
            elif loading_method == 'api':
                model_metadata = model_loader_service.register_api_model(
                    model_data['provider'],
                    model_data['model_name'],
                    model_data['api_key'],
                    model_data.get('endpoint')
                )
            elif loading_method == 'vllm':
                model_metadata = model_loader_service.register_vllm_endpoint(
                    model_data['endpoint'],
                    model_data['model_name'],
                    model_data.get('auth_token')
                )
            else:
                raise ValueError(f"Unsupported loading method: {loading_method}")
            
            # Override with CSV data
            model_metadata.update({
                'name': name,
                'family': model_data.get('family', model_metadata.get('family', '')),
                'dtype': model_data.get('dtype', model_metadata.get('dtype', 'float16')),
                'num_parameters': model_data.get('num_parameters', model_metadata.get('num_parameters', 0)),
                'notes': model_data.get('notes', ''),
                'modality_support': model_data.get('modality_support', model_metadata.get('modality_support', ['text'])),
                'hardware_requirements': model_data.get('hardware_requirements', model_metadata.get('hardware_requirements', {}))
            })
            
            # Save to database
            model = supabase_service.create_model(model_metadata)
            
            if model:
                logger.info(f"Successfully registered model: {name}")
                self.results['successful'] += 1
                
                # Validate if requested
                if self.validate:
                    self._validate_model(model['id'], name)
            else:
                raise RuntimeError("Failed to save model to database")
                
        except Exception as e:
            logger.error(f"Failed to register model {name}", error=str(e))
            raise
    
    def _model_exists(self, name: str) -> bool:
        """Check if model already exists."""
        try:
            models = supabase_service.get_models()
            return any(model.get('name') == name for model in models)
        except Exception:
            return False
    
    def _validate_model(self, model_id: str, name: str):
        """Validate a registered model."""
        try:
            logger.info(f"Validating model: {name}")
            validation_results = model_loader_service.validate_model(model_id)
            
            if validation_results['status'] == 'success':
                logger.info(f"Model {name} validation successful")
            else:
                logger.warning(f"Model {name} validation failed: {validation_results.get('error', 'Unknown error')}")
                
        except Exception as e:
            logger.error(f"Failed to validate model {name}", error=str(e))
    
    def _parse_int(self, value: str) -> int:
        """Parse integer value with error handling."""
        try:
            return int(value) if value else 0
        except ValueError:
            return 0
    
    def _parse_bool(self, value: str) -> bool:
        """Parse boolean value."""
        return value.lower() in ('true', '1', 'yes', 'on')
    
    def _print_summary(self):
        """Print registration summary."""
        print("\n" + "="*60)
        print("BATCH MODEL REGISTRATION SUMMARY")
        print("="*60)
        print(f"Total models processed: {self.results['total']}")
        print(f"Successfully registered: {self.results['successful']}")
        print(f"Failed: {self.results['failed']}")
        print(f"Skipped (already exists): {self.results['skipped']}")
        
        if self.results['errors']:
            print(f"\nErrors ({len(self.results['errors'])}):")
            for error in self.results['errors']:
                print(f"  Row {error['row']}: {error['model']} - {error['error']}")
        
        if self.results['warnings']:
            print(f"\nWarnings ({len(self.results['warnings'])}):")
            for warning in self.results['warnings']:
                print(f"  Row {warning['row']}: {warning['warning']}")
        
        print("="*60)


def create_sample_csv(filename: str):
    """Create a sample CSV file with all supported columns."""
    sample_data = [
        {
            'name': 'Qwen2-VL-7B-Instruct',
            'family': 'Qwen2-VL',
            'loading_method': 'huggingface',
            'path': 'Qwen/Qwen2-VL-7B-Instruct',
            'source': 'huggingface://Qwen/Qwen2-VL-7B-Instruct',
            'dtype': 'float16',
            'num_parameters': '7000000000',
            'modality_support': 'text,image',
            'memory_gb': '16',
            'recommended_gpus': '1',
            'auto_detect': 'true',
            'notes': 'Qwen2-VL 7B model for vision-language tasks'
        },
        {
            'name': 'LLaVA-1.5-7B',
            'family': 'LLaVA',
            'loading_method': 'huggingface',
            'path': 'llava-hf/llava-1.5-7b-hf',
            'source': 'huggingface://llava-hf/llava-1.5-7b-hf',
            'dtype': 'float16',
            'num_parameters': '7000000000',
            'modality_support': 'text,image',
            'memory_gb': '16',
            'recommended_gpus': '1',
            'auto_detect': 'true',
            'notes': 'LLaVA 1.5 7B model'
        },
        {
            'name': 'GPT-4V',
            'family': 'OpenAI',
            'loading_method': 'api',
            'provider': 'openai',
            'model_name': 'gpt-4-vision-preview',
            'api_key': 'your_openai_api_key_here',
            'endpoint': 'https://api.openai.com/v1',
            'source': 'api://openai/gpt-4-vision-preview',
            'dtype': 'unknown',
            'num_parameters': '0',
            'modality_support': 'text,image',
            'memory_gb': '0',
            'recommended_gpus': '0',
            'notes': 'OpenAI GPT-4 Vision model via API'
        },
        {
            'name': 'Custom-Omni-Model',
            'family': 'Custom',
            'loading_method': 'local',
            'path': '/path/to/your/local/model',
            'source': 'local:///path/to/your/local/model',
            'dtype': 'float16',
            'num_parameters': '13000000000',
            'modality_support': 'text,image,video,audio',
            'memory_gb': '32',
            'recommended_gpus': '2',
            'notes': 'Custom omni-modal model stored locally'
        },
        {
            'name': 'vLLM-Served-Model',
            'family': 'vLLM',
            'loading_method': 'vllm',
            'endpoint': 'http://localhost:8000',
            'model_name': 'your-model-name',
            'auth_token': 'optional_auth_token',
            'source': 'vllm://http://localhost:8000',
            'dtype': 'float16',
            'num_parameters': '7000000000',
            'modality_support': 'text,image',
            'memory_gb': '16',
            'recommended_gpus': '1',
            'notes': 'Model served via vLLM endpoint'
        }
    ]
    
    fieldnames = [
        'name', 'family', 'loading_method', 'path', 'provider', 'model_name',
        'api_key', 'endpoint', 'auth_token', 'source', 'dtype', 'num_parameters',
        'modality_support', 'memory_gb', 'recommended_gpus', 'auto_detect', 'notes'
    ]
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(sample_data)
    
    print(f"Sample CSV file created: {filename}")
    print("Edit the file with your actual model data before running the registration script.")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Batch register models for LMMS-Eval Dashboard",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Register models from CSV
  python scripts/batch_register_models.py models.csv
  
  # Dry run (don't actually register)
  python scripts/batch_register_models.py models.csv --dry-run
  
  # Register and validate models
  python scripts/batch_register_models.py models.csv --validate
  
  # Create sample CSV file
  python scripts/batch_register_models.py --create-sample models_sample.csv

CSV Format:
  Required columns: name, loading_method
  Optional columns: family, path, provider, model_name, api_key, endpoint, 
                   auth_token, source, dtype, num_parameters, modality_support,
                   memory_gb, recommended_gpus, auto_detect, notes

Loading Methods:
  - huggingface: Register from Hugging Face Hub
  - local: Register from local filesystem
  - api: Register API-based models (OpenAI, Anthropic, etc.)
  - vllm: Register vLLM-served models
        """
    )
    
    parser.add_argument(
        'csv_file',
        nargs='?',
        help='Path to CSV file containing model data'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Don\'t actually register models, just show what would be done'
    )
    
    parser.add_argument(
        '--validate',
        action='store_true',
        help='Validate models after registration'
    )
    
    parser.add_argument(
        '--create-sample',
        metavar='FILENAME',
        help='Create a sample CSV file with example data'
    )
    
    args = parser.parse_args()
    
    # Create sample file if requested
    if args.create_sample:
        create_sample_csv(args.create_sample)
        return
    
    # Validate arguments
    if not args.csv_file:
        parser.error("CSV file is required (or use --create-sample)")
    
    if not os.path.exists(args.csv_file):
        parser.error(f"CSV file not found: {args.csv_file}")
    
    # Run batch registration
    try:
        registrar = BatchModelRegistrar(
            dry_run=args.dry_run,
            validate=args.validate
        )
        
        results = registrar.register_from_csv(args.csv_file)
        
        # Exit with error code if there were failures
        if results['failed'] > 0:
            sys.exit(1)
            
    except Exception as e:
        logger.error("Batch registration failed", error=str(e))
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
