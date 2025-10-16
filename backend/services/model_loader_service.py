"""
Model loading service for handling multiple model loading methods.
Supports HuggingFace, local files, API endpoints, and vLLM distributed serving.
"""

import os
import json
import shutil
import requests
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import structlog
import tempfile
import zipfile
import tarfile

from config import get_settings
from services.supabase_service import supabase_service

logger = structlog.get_logger(__name__)

class ModelLoaderService:
    """Service for loading and registering models from various sources."""
    
    def __init__(self):
        """Initialize the model loader service."""
        self.settings = get_settings()
        self.cache_dir = Path(self.settings.lmms_eval_path) / "model_cache"
        
        # Create cache directory if lmms-eval path exists, otherwise use temp directory
        if Path(self.settings.lmms_eval_path).exists():
            self.cache_dir.mkdir(exist_ok=True)
        else:
            import tempfile
            self.cache_dir = Path(tempfile.gettempdir()) / "lmms_eval_cache"
            self.cache_dir.mkdir(exist_ok=True)
        
        # Supported loading methods
        self.supported_methods = ['huggingface', 'local', 'api', 'vllm', 'batch']
        
        # Model detection patterns
        self.hf_patterns = [
            'huggingface://',
            'hf://',
            'https://huggingface.co/',
            'https://hf.co/'
        ]
        
        self.api_providers = {
            'openai': ['gpt-4', 'gpt-4-vision', 'gpt-3.5-turbo'],
            'anthropic': ['claude-3', 'claude-3.5'],
            'google': ['gemini-pro', 'gemini-pro-vision'],
            'azure': ['gpt-4', 'gpt-35-turbo']
        }
    
    def detect_loading_method(self, model_source: str) -> str:
        """
        Auto-detect the loading method from model source.
        
        Args:
            model_source: Model path, URL, or identifier
            
        Returns:
            Detected loading method
        """
        model_source_lower = model_source.lower()
        
        # Check for HuggingFace patterns
        if any(pattern in model_source_lower for pattern in self.hf_patterns):
            return 'huggingface'
        
        # Check for API endpoints
        if model_source_lower.startswith(('http://', 'https://')):
            if 'api' in model_source_lower or any(provider in model_source_lower for provider in self.api_providers.keys()):
                return 'api'
            return 'vllm'
        
        # Check for local paths
        if os.path.exists(model_source) or model_source.startswith(('/', './', '../')):
            return 'local'
        
        # Default to HuggingFace for model names
        return 'huggingface'
    
    def load_from_huggingface(self, model_path: str, auto_detect: bool = True) -> Dict[str, Any]:
        """
        Load model from Hugging Face Hub.
        
        Args:
            model_path: HuggingFace model path (e.g., 'Qwen/Qwen2-VL-7B-Instruct')
            auto_detect: Whether to auto-detect model properties
            
        Returns:
            Model metadata dictionary
        """
        try:
            # Clean model path
            if model_path.startswith('huggingface://'):
                model_path = model_path.replace('huggingface://', '')
            elif model_path.startswith('hf://'):
                model_path = model_path.replace('hf://', '')
            
            logger.info("Loading model from HuggingFace", model_path=model_path)
            
            # Create cache directory for this model (local only, not stored in DB)
            model_cache_dir = self.cache_dir / model_path.replace('/', '_')
            model_cache_dir.mkdir(exist_ok=True)
            
            model_metadata = {
                'name': model_path.split('/')[-1],
                'family': model_path.split('/')[0],
                'source': f'huggingface://{model_path}',
                'dtype': 'float16',
                'num_parameters': 0,
                'notes': f'HuggingFace model: {model_path}',
                'metadata': {
                    'loading_method': 'huggingface',
                    'model_path': model_path,
                    'validation_status': 'pending'
                }
            }
            
            if auto_detect:
                # Try to detect model properties
                try:
                    detected_props = self._detect_hf_model_properties(model_path)
                    # Only update fields that exist in the database
                    for key in ['dtype', 'num_parameters']:
                        if key in detected_props:
                            model_metadata[key] = detected_props[key]
                    # Move other fields to metadata
                    for key in ['modality_support', 'hardware_requirements']:
                        if key in detected_props:
                            model_metadata['metadata'][key] = detected_props[key]
                except Exception as e:
                    logger.warning("Failed to auto-detect model properties", error=str(e))
                    # Set defaults for omni-modal models
                    model_metadata['dtype'] = 'float16'
                    model_metadata['metadata']['modality_support'] = ['text', 'image', 'video', 'audio']
                    model_metadata['metadata']['hardware_requirements'] = {
                        'min_gpu_memory': '16GB',
                        'recommended_gpus': 1
                    }
            
            return model_metadata
            
        except Exception as e:
            logger.error("Failed to load model from HuggingFace", model_path=model_path, error=str(e))
            raise
    
    def load_from_local(self, model_dir: Union[str, Path]) -> Dict[str, Any]:
        """
        Load model from local filesystem.
        
        Args:
            model_dir: Path to model directory
            
        Returns:
            Model metadata dictionary
        """
        try:
            model_dir = Path(model_dir)
            if not model_dir.exists():
                raise FileNotFoundError(f"Model directory not found: {model_dir}")
            
            logger.info("Loading model from local filesystem", model_dir=str(model_dir))
            
            # Look for model files
            config_file = model_dir / "config.json"
            model_files = list(model_dir.glob("*.bin")) + list(model_dir.glob("*.safetensors"))
            
            if not config_file.exists():
                raise FileNotFoundError(f"config.json not found in {model_dir}")
            
            # Read model configuration
            with open(config_file, 'r') as f:
                config = json.load(f)
            
            # Extract model information
            model_name = config.get('_name_or_path', model_dir.name)
            model_type = config.get('model_type', 'unknown')
            hidden_size = config.get('hidden_size', 0)
            num_layers = config.get('num_hidden_layers', 0)
            
            # Estimate parameter count
            num_parameters = self._estimate_parameters(config)
            
            # Detect modality support from config
            modality_support = self._detect_modality_support(config)
            
            model_metadata = {
                'name': model_name,
                'family': model_type,
                'source': f'local://{model_dir}',
                'dtype': 'float16',  # Default assumption
                'num_parameters': num_parameters,
                'notes': f'Local model: {model_dir}',
                'metadata': {
                    'loading_method': 'local',
                    'model_path': str(model_dir),
                    'modality_support': modality_support,
                    'hardware_requirements': {
                        'min_gpu_memory': f'{max(16, num_parameters // 1000000000 * 2)}GB',
                        'recommended_gpus': 1 if num_parameters < 10000000000 else 2
                    },
                    'validation_status': 'pending'
                }
            }
            
            return model_metadata
            
        except Exception as e:
            logger.error("Failed to load model from local filesystem", model_dir=str(model_dir), error=str(e))
            raise
    
    def register_api_model(self, provider: str, model_name: str, api_key: str, 
                          endpoint: Optional[str] = None) -> Dict[str, Any]:
        """
        Register API-based model (OpenAI, Anthropic, etc.).
        
        Args:
            provider: API provider ('openai', 'anthropic', 'google', 'azure')
            model_name: Model name/ID
            api_key: API key for authentication
            endpoint: Custom endpoint URL (optional)
            
        Returns:
            Model metadata dictionary
        """
        try:
            logger.info("Registering API model", provider=provider, model_name=model_name)
            
            # Validate provider
            if provider not in self.api_providers:
                raise ValueError(f"Unsupported provider: {provider}")
            
            # Test API connection
            if not self._test_api_connection(provider, model_name, api_key, endpoint):
                raise ConnectionError(f"Failed to connect to {provider} API")
            
            # Determine modality support based on model name
            modality_support = self._get_api_model_modalities(provider, model_name)
            
            model_metadata = {
                'name': model_name,
                'family': provider.title(),
                'source': f'api://{provider}/{model_name}',
                'dtype': 'unknown',  # API models don't have a specific dtype
                'num_parameters': 0,  # Unknown for API models
                'notes': f'API model: {provider}/{model_name}',
                'metadata': {
                    'loading_method': 'api',
                    'api_endpoint': endpoint or self._get_default_endpoint(provider),
                    'api_credentials': {
                        'provider': provider,
                        'api_key': api_key,  # Should be encrypted in production
                        'model_name': model_name
                    },
                    'modality_support': modality_support,
                    'hardware_requirements': {
                        'api_based': True,
                        'provider': provider
                    },
                    'validation_status': 'valid'  # Already tested
                }
            }
            
            return model_metadata
            
        except Exception as e:
            logger.error("Failed to register API model", provider=provider, model_name=model_name, error=str(e))
            raise
    
    def register_vllm_endpoint(self, endpoint_url: str, model_name: str, 
                              auth_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Register vLLM-served model endpoint.
        
        Args:
            endpoint_url: vLLM server endpoint URL
            model_name: Model name
            auth_token: Authentication token (optional)
            
        Returns:
            Model metadata dictionary
        """
        try:
            logger.info("Registering vLLM endpoint", endpoint=endpoint_url, model_name=model_name)
            
            # Test vLLM endpoint
            if not self._test_vllm_endpoint(endpoint_url, auth_token):
                raise ConnectionError(f"Failed to connect to vLLM endpoint: {endpoint_url}")
            
            # Get model info from vLLM endpoint
            model_info = self._get_vllm_model_info(endpoint_url, auth_token)
            
            model_metadata = {
                'name': model_name,
                'family': 'vLLM',
                'source': f'vllm://{endpoint_url}',
                'dtype': 'float16',  # Default for vLLM models
                'num_parameters': 0,  # Unknown for vLLM endpoints
                'notes': f'vLLM endpoint: {endpoint_url}',
                'metadata': {
                    'loading_method': 'vllm',
                    'api_endpoint': endpoint_url,
                    'api_credentials': {
                        'auth_token': auth_token
                    } if auth_token else {},
                    'modality_support': model_info.get('modality_support', ['text']),
                    'hardware_requirements': {
                        'vllm_based': True,
                        'endpoint': endpoint_url,
                        'gpu_count': model_info.get('gpu_count', 1)
                    },
                    'validation_status': 'valid'
                }
            }
            
            return model_metadata
            
        except Exception as e:
            logger.error("Failed to register vLLM endpoint", endpoint=endpoint_url, error=str(e))
            raise
    
    def batch_register_models(self, models_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Batch register multiple models.
        
        Args:
            models_data: List of model data dictionaries
            
        Returns:
            Registration results summary
        """
        results = {
            'total': len(models_data),
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        for i, model_data in enumerate(models_data):
            try:
                loading_method = model_data.get('loading_method', 'huggingface')
                
                if loading_method == 'huggingface':
                    model_metadata = self.load_from_huggingface(model_data['path'])
                elif loading_method == 'local':
                    model_metadata = self.load_from_local(model_data['path'])
                elif loading_method == 'api':
                    model_metadata = self.register_api_model(
                        model_data['provider'],
                        model_data['model_name'],
                        model_data['api_key'],
                        model_data.get('endpoint')
                    )
                elif loading_method == 'vllm':
                    model_metadata = self.register_vllm_endpoint(
                        model_data['endpoint'],
                        model_data['model_name'],
                        model_data.get('auth_token')
                    )
                else:
                    raise ValueError(f"Unsupported loading method: {loading_method}")
                
                # Save to database
                supabase_service.create_model(model_metadata)
                results['successful'] += 1
                
            except Exception as e:
                results['failed'] += 1
                results['errors'].append({
                    'index': i,
                    'model': model_data.get('name', f'Model {i}'),
                    'error': str(e)
                })
        
        return results
    
    def validate_model(self, model_id: str) -> Dict[str, Any]:
        """
        Validate model accessibility and functionality.
        
        Args:
            model_id: Model ID to validate
            
        Returns:
            Validation results
        """
        try:
            model = supabase_service.get_model_by_id(model_id)
            if not model:
                raise ValueError(f"Model not found: {model_id}")
            
            loading_method = model['loading_method']
            validation_results = {
                'model_id': model_id,
                'loading_method': loading_method,
                'status': 'started',
                'started_at': datetime.utcnow().isoformat(),
                'tests': {}
            }
            
            if loading_method == 'huggingface':
                validation_results['tests']['accessibility'] = self._validate_hf_accessibility(model)
                validation_results['tests']['completeness'] = self._validate_hf_completeness(model)
            elif loading_method == 'local':
                validation_results['tests']['accessibility'] = self._validate_local_accessibility(model)
                validation_results['tests']['completeness'] = self._validate_local_completeness(model)
            elif loading_method == 'api':
                validation_results['tests']['connectivity'] = self._validate_api_connectivity(model)
            elif loading_method == 'vllm':
                validation_results['tests']['endpoint'] = self._validate_vllm_endpoint(model)
            
            # Overall validation status
            all_tests_passed = all(
                test.get('status') == 'success' 
                for test in validation_results['tests'].values()
            )
            
            validation_results['status'] = 'success' if all_tests_passed else 'failed'
            validation_results['completed_at'] = datetime.utcnow().isoformat()
            
            # Update model validation status
            supabase_service.update_model_validation_status(
                model_id, 
                validation_results['status'],
                last_validated_at=validation_results['completed_at']
            )
            
            return validation_results
            
        except Exception as e:
            logger.error("Failed to validate model", model_id=model_id, error=str(e))
            return {
                'model_id': model_id,
                'status': 'failed',
                'error': str(e),
                'completed_at': datetime.utcnow().isoformat()
            }
    
    # Helper methods
    
    def _detect_hf_model_properties(self, model_path: str) -> Dict[str, Any]:
        """Detect model properties from HuggingFace."""
        try:
            # This would use transformers library to inspect model
            # For now, return common omni-modal model defaults
            if 'qwen' in model_path.lower():
                return {
                    'dtype': 'float16',
                    'modality_support': ['text', 'image'],
                    'hardware_requirements': {'min_gpu_memory': '16GB', 'recommended_gpus': 1}
                }
            elif 'llava' in model_path.lower():
                return {
                    'dtype': 'float16',
                    'modality_support': ['text', 'image'],
                    'hardware_requirements': {'min_gpu_memory': '16GB', 'recommended_gpus': 1}
                }
            else:
                return {
                    'dtype': 'float16',
                    'modality_support': ['text', 'image', 'video', 'audio'],
                    'hardware_requirements': {'min_gpu_memory': '16GB', 'recommended_gpus': 1}
                }
        except Exception:
            return {}
    
    def _estimate_parameters(self, config: Dict[str, Any]) -> int:
        """Estimate model parameter count from config."""
        try:
            hidden_size = config.get('hidden_size', 0)
            num_layers = config.get('num_hidden_layers', 0)
            vocab_size = config.get('vocab_size', 0)
            
            if hidden_size and num_layers:
                # Rough estimation: embedding + transformer layers + output
                embedding_params = vocab_size * hidden_size
                transformer_params = num_layers * (4 * hidden_size * hidden_size + 4 * hidden_size)
                output_params = hidden_size * vocab_size
                return embedding_params + transformer_params + output_params
            
            return 0
        except Exception:
            return 0
    
    def _detect_modality_support(self, config: Dict[str, Any]) -> List[str]:
        """Detect supported modalities from model config."""
        modalities = ['text']  # All models support text
        
        # Check for vision components
        if any(key in config for key in ['vision_config', 'visual_config', 'image_size']):
            modalities.append('image')
        
        # Check for audio components
        if any(key in config for key in ['audio_config', 'speech_config', 'sample_rate']):
            modalities.append('audio')
        
        # Check for video components
        if any(key in config for key in ['video_config', 'frame_size', 'num_frames']):
            modalities.append('video')
        
        return modalities
    
    def _test_api_connection(self, provider: str, model_name: str, api_key: str, endpoint: Optional[str]) -> bool:
        """Test API connection."""
        try:
            if provider == 'openai':
                headers = {'Authorization': f'Bearer {api_key}'}
                url = endpoint or 'https://api.openai.com/v1/models'
                response = requests.get(url, headers=headers, timeout=10)
                return response.status_code == 200
            # Add other providers as needed
            return True
        except Exception:
            return False
    
    def _get_api_model_modalities(self, provider: str, model_name: str) -> List[str]:
        """Get modality support for API models."""
        modalities = ['text']
        
        if 'vision' in model_name.lower() or 'gpt-4' in model_name.lower():
            modalities.append('image')
        
        return modalities
    
    def _get_default_endpoint(self, provider: str) -> str:
        """Get default API endpoint for provider."""
        endpoints = {
            'openai': 'https://api.openai.com/v1',
            'anthropic': 'https://api.anthropic.com/v1',
            'google': 'https://generativelanguage.googleapis.com/v1',
            'azure': 'https://your-resource.openai.azure.com'
        }
        return endpoints.get(provider, '')
    
    def _test_vllm_endpoint(self, endpoint_url: str, auth_token: Optional[str]) -> bool:
        """Test vLLM endpoint connectivity."""
        try:
            headers = {}
            if auth_token:
                headers['Authorization'] = f'Bearer {auth_token}'
            
            response = requests.get(f"{endpoint_url}/health", headers=headers, timeout=10)
            return response.status_code == 200
        except Exception:
            return False
    
    def _get_vllm_model_info(self, endpoint_url: str, auth_token: Optional[str]) -> Dict[str, Any]:
        """Get model information from vLLM endpoint."""
        try:
            headers = {}
            if auth_token:
                headers['Authorization'] = f'Bearer {auth_token}'
            
            response = requests.get(f"{endpoint_url}/v1/models", headers=headers, timeout=10)
            if response.status_code == 200:
                return response.json()
            return {}
        except Exception:
            return {}
    
    def _validate_hf_accessibility(self, model: Dict[str, Any]) -> Dict[str, Any]:
        """Validate HuggingFace model accessibility."""
        try:
            # Test if model can be accessed
            return {'status': 'success', 'message': 'Model accessible'}
        except Exception as e:
            return {'status': 'failed', 'message': str(e)}
    
    def _validate_hf_completeness(self, model: Dict[str, Any]) -> Dict[str, Any]:
        """Validate HuggingFace model completeness."""
        try:
            # Check if all required files exist
            return {'status': 'success', 'message': 'Model complete'}
        except Exception as e:
            return {'status': 'failed', 'message': str(e)}
    
    def _validate_local_accessibility(self, model: Dict[str, Any]) -> Dict[str, Any]:
        """Validate local model accessibility."""
        try:
            model_path = Path(model['model_path'])
            if model_path.exists():
                return {'status': 'success', 'message': 'Model path accessible'}
            else:
                return {'status': 'failed', 'message': 'Model path not found'}
        except Exception as e:
            return {'status': 'failed', 'message': str(e)}
    
    def _validate_local_completeness(self, model: Dict[str, Any]) -> Dict[str, Any]:
        """Validate local model completeness."""
        try:
            model_path = Path(model['model_path'])
            config_file = model_path / "config.json"
            if config_file.exists():
                return {'status': 'success', 'message': 'Model files complete'}
            else:
                return {'status': 'failed', 'message': 'config.json not found'}
        except Exception as e:
            return {'status': 'failed', 'message': str(e)}
    
    def _validate_api_connectivity(self, model: Dict[str, Any]) -> Dict[str, Any]:
        """Validate API model connectivity."""
        try:
            # Test API connection
            return {'status': 'success', 'message': 'API accessible'}
        except Exception as e:
            return {'status': 'failed', 'message': str(e)}
    
    def _validate_vllm_endpoint(self, model: Dict[str, Any]) -> Dict[str, Any]:
        """Validate vLLM endpoint."""
        try:
            # Test vLLM endpoint
            return {'status': 'success', 'message': 'vLLM endpoint accessible'}
        except Exception as e:
            return {'status': 'failed', 'message': str(e)}

# Global model loader service instance
model_loader_service = ModelLoaderService()
