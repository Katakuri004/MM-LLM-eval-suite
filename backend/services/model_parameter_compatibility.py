"""
Model Parameter Compatibility Service

This service manages which parameters each lmms-eval model type accepts,
preventing "Unexpected kwargs" errors by filtering incompatible parameters.
"""

from typing import Dict, List, Set
import structlog

logger = structlog.get_logger(__name__)

# Model parameter support registry
# Based on analysis of lmms-eval model constructors
MODEL_PARAMETER_SUPPORT = {
    # Models that accept dtype parameter
    'vora': ['pretrained', 'dtype', 'device', 'batch_size', 'trust_remote_code'],
    'video_llava': ['pretrained', 'dtype', 'device', 'batch_size', 'trust_remote_code'],
    'phi3v': ['pretrained', 'dtype', 'device', 'batch_size', 'trust_remote_code'],
    'phi4_multimodal': ['pretrained', 'dtype', 'device', 'batch_size', 'trust_remote_code'],
    
    # Qwen models - no dtype (use torch_dtype="auto" internally)
    'qwen2_vl': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames', 
                 'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'qwen2_5_vl': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                   'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'qwen2_5_omni': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                     'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'qwen2_5_vl_interleave': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                              'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'qwen2_audio': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                    'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'qwen_vl': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'qwen_vl_api': ['pretrained', 'device'],
    
    # LLaVA models - no dtype
    'llava': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
              'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'llava_hf': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                 'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'llava_sglang': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                     'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'llava_vid': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                  'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'llava_onevision': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                        'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'llava_onevision1_5': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                           'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'llava_onevision_moviechat': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                                 'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    
    # Video models - no dtype
    'llama_vid': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                  'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'videochat2': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                   'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'videochat_flash': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                        'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'moviechat': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                  'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'longva': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
               'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'videollama3': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                    'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    
    # InternVL models - no dtype
    'internvl': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                 'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'internvl2': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                  'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'internvideo2': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                    'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'internvideo2_5': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                       'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    
    # Other specialized models - no dtype
    'idefics2': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                 'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'cogvlm2': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'instructblip': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                    'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'blip2': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
              'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'open_flamingo': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                      'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    
    # API models - minimal parameters
    'gpt4v': ['pretrained', 'device'],
    'claude': ['pretrained', 'device'],
    'gemini_api': ['pretrained', 'device'],
    'openai_compatible': ['pretrained', 'device'],
    'batch_gpt4': ['pretrained', 'device'],
    'reka': ['pretrained', 'device'],
    'srt_api': ['pretrained', 'device'],
    
    # Default for unknown models (no dtype)
    '_default': ['pretrained', 'device']
}

# Pattern matching for model families
PATTERN_PARAMETER_SUPPORT = {
    'qwen*': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
              'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'llava*': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
               'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'video*': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
               'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'intern*': ['pretrained', 'device', 'max_pixels', 'min_pixels', 'max_num_frames',
                'system_prompt', 'interleave_visuals', 'reasoning_prompt', 'use_flash_attention_2'],
    'phi*': ['pretrained', 'dtype', 'device', 'batch_size', 'trust_remote_code'],
    'vora*': ['pretrained', 'dtype', 'device', 'batch_size', 'trust_remote_code'],
}

def get_supported_parameters(model_name: str) -> List[str]:
    """
    Get list of supported parameters for a model.
    
    Args:
        model_name: The lmms-eval model name
        
    Returns:
        List of supported parameter names
    """
    # Check exact match first
    if model_name in MODEL_PARAMETER_SUPPORT:
        return MODEL_PARAMETER_SUPPORT[model_name]
    
    # Check pattern matching
    for pattern, params in PATTERN_PARAMETER_SUPPORT.items():
        if model_name.startswith(pattern.rstrip('*')):
            return params
    
    # Default fallback
    return MODEL_PARAMETER_SUPPORT['_default']

def filter_model_args(model_name: str, all_args: Dict[str, str]) -> Dict[str, str]:
    """
    Filter model arguments to only include supported parameters.
    
    Args:
        model_name: The lmms-eval model name
        all_args: Dictionary of all possible arguments
        
    Returns:
        Dictionary with only supported arguments
    """
    supported_params = get_supported_parameters(model_name)
    filtered_args = {k: v for k, v in all_args.items() if k in supported_params}
    
    # Log filtered parameters for debugging
    if len(all_args) != len(filtered_args):
        filtered_out = set(all_args.keys()) - set(filtered_args.keys())
        logger.debug(
            "Filtered incompatible model args",
            model_name=model_name,
            filtered_params=list(filtered_out),
            used_params=list(filtered_args.keys()),
            total_supported=len(supported_params)
        )
    
    return filtered_args

def is_dtype_supported(model_name: str) -> bool:
    """
    Check if a model supports dtype parameter.
    
    Args:
        model_name: The lmms-eval model name
        
    Returns:
        True if dtype is supported, False otherwise
    """
    supported_params = get_supported_parameters(model_name)
    return 'dtype' in supported_params

def get_model_compatibility_info(model_name: str) -> Dict[str, any]:
    """
    Get comprehensive compatibility information for a model.
    
    Args:
        model_name: The lmms-eval model name
        
    Returns:
        Dictionary with compatibility information
    """
    supported_params = get_supported_parameters(model_name)
    
    return {
        'model_name': model_name,
        'supported_parameters': supported_params,
        'supports_dtype': 'dtype' in supported_params,
        'supports_max_pixels': 'max_pixels' in supported_params,
        'supports_system_prompt': 'system_prompt' in supported_params,
        'total_supported': len(supported_params),
        'is_exact_match': model_name in MODEL_PARAMETER_SUPPORT,
        'is_pattern_match': not (model_name in MODEL_PARAMETER_SUPPORT) and any(
            model_name.startswith(pattern.rstrip('*')) 
            for pattern in PATTERN_PARAMETER_SUPPORT.keys()
        )
    }

# Create a singleton instance
model_parameter_compatibility = type('ModelParameterCompatibility', (), {
    'get_supported_parameters': staticmethod(get_supported_parameters),
    'filter_model_args': staticmethod(filter_model_args),
    'is_dtype_supported': staticmethod(is_dtype_supported),
    'get_model_compatibility_info': staticmethod(get_model_compatibility_info),
})()
