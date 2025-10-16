#!/usr/bin/env python3
"""
Script to seed the database with all models from lmms-eval framework.
This adds all supported models by default to the web-app.
"""

import requests
import json
import os
import time
from typing import Dict, List, Any

# API configuration
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000/api/v1")

# Comprehensive list of models from lmms-eval with their details
LMMS_EVAL_MODELS = [
    # Vision-Language Models
    {
        "name": "Qwen2-VL-7B-Instruct",
        "family": "Qwen2-VL",
        "source": "huggingface://Qwen/Qwen2-VL-7B-Instruct",
        "dtype": "float16",
        "num_parameters": 7000000000,
        "notes": "Qwen2-VL 7B model for vision-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "Qwen/Qwen2-VL-7B-Instruct",
            "modality_support": ["text", "image"],
            "hardware_requirements": {"min_gpu_memory": "16GB", "recommended_gpus": 1},
            "validation_status": "pending"
        }
    },
    {
        "name": "Qwen2-VL-72B-Instruct",
        "family": "Qwen2-VL",
        "source": "huggingface://Qwen/Qwen2-VL-72B-Instruct",
        "dtype": "float16",
        "num_parameters": 72000000000,
        "notes": "Qwen2-VL 72B model for vision-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "Qwen/Qwen2-VL-72B-Instruct",
            "modality_support": ["text", "image"],
            "hardware_requirements": {"min_gpu_memory": "80GB", "recommended_gpus": 4},
            "validation_status": "pending"
        }
    },
    {
        "name": "LLaVA-1.5-7B",
        "family": "LLaVA",
        "source": "huggingface://llava-hf/llava-1.5-7b-hf",
        "dtype": "float16",
        "num_parameters": 7000000000,
        "notes": "LLaVA 1.5 7B model for vision-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "llava-hf/llava-1.5-7b-hf",
            "modality_support": ["text", "image"],
            "hardware_requirements": {"min_gpu_memory": "16GB", "recommended_gpus": 1},
            "validation_status": "pending"
        }
    },
    {
        "name": "LLaVA-1.5-13B",
        "family": "LLaVA",
        "source": "huggingface://llava-hf/llava-1.5-13b-hf",
        "dtype": "float16",
        "num_parameters": 13000000000,
        "notes": "LLaVA 1.5 13B model for vision-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "llava-hf/llava-1.5-13b-hf",
            "modality_support": ["text", "image"],
            "hardware_requirements": {"min_gpu_memory": "32GB", "recommended_gpus": 2},
            "validation_status": "pending"
        }
    },
    {
        "name": "InstructBLIP-7B",
        "family": "InstructBLIP",
        "source": "huggingface://Salesforce/instructblip-vicuna-7b",
        "dtype": "float16",
        "num_parameters": 7000000000,
        "notes": "InstructBLIP 7B model for instruction-following vision tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "Salesforce/instructblip-vicuna-7b",
            "modality_support": ["text", "image"],
            "hardware_requirements": {"min_gpu_memory": "16GB", "recommended_gpus": 1},
            "validation_status": "pending"
        }
    },
    {
        "name": "InstructBLIP-13B",
        "family": "InstructBLIP",
        "source": "huggingface://Salesforce/instructblip-vicuna-13b",
        "dtype": "float16",
        "num_parameters": 13000000000,
        "notes": "InstructBLIP 13B model for instruction-following vision tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "Salesforce/instructblip-vicuna-13b",
            "modality_support": ["text", "image"],
            "hardware_requirements": {"min_gpu_memory": "32GB", "recommended_gpus": 2},
            "validation_status": "pending"
        }
    },
    {
        "name": "CogVLM2-19B",
        "family": "CogVLM2",
        "source": "huggingface://THUDM/cogvlm2-19b-chat",
        "dtype": "float16",
        "num_parameters": 19000000000,
        "notes": "CogVLM2 19B model for vision-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "THUDM/cogvlm2-19b-chat",
            "modality_support": ["text", "image"],
            "hardware_requirements": {"min_gpu_memory": "40GB", "recommended_gpus": 2},
            "validation_status": "pending"
        }
    },
    {
        "name": "InternVL2-26B",
        "family": "InternVL2",
        "source": "huggingface://OpenGVLab/InternVL2-26B",
        "dtype": "float16",
        "num_parameters": 26000000000,
        "notes": "InternVL2 26B model for vision-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "OpenGVLab/InternVL2-26B",
            "modality_support": ["text", "image"],
            "hardware_requirements": {"min_gpu_memory": "52GB", "recommended_gpus": 2},
            "validation_status": "pending"
        }
    },
    {
        "name": "InternVL2-40B",
        "family": "InternVL2",
        "source": "huggingface://OpenGVLab/InternVL2-40B",
        "dtype": "float16",
        "num_parameters": 40000000000,
        "notes": "InternVL2 40B model for vision-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "OpenGVLab/InternVL2-40B",
            "modality_support": ["text", "image"],
            "hardware_requirements": {"min_gpu_memory": "80GB", "recommended_gpus": 4},
            "validation_status": "pending"
        }
    },
    {
        "name": "MiniCPM-V-2.3",
        "family": "MiniCPM-V",
        "source": "huggingface://openbmb/MiniCPM-V-2_3",
        "dtype": "float16",
        "num_parameters": 3000000000,
        "notes": "MiniCPM-V 2.3B model for vision-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "openbmb/MiniCPM-V-2_3",
            "modality_support": ["text", "image"],
            "hardware_requirements": {"min_gpu_memory": "8GB", "recommended_gpus": 1},
            "validation_status": "pending"
        }
    },
    {
        "name": "Phi-3-Vision-14B",
        "family": "Phi-3-Vision",
        "source": "huggingface://microsoft/Phi-3-vision-14b-instruct",
        "dtype": "float16",
        "num_parameters": 14000000000,
        "notes": "Phi-3 Vision 14B model for vision-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "microsoft/Phi-3-vision-14b-instruct",
            "modality_support": ["text", "image"],
            "hardware_requirements": {"min_gpu_memory": "32GB", "recommended_gpus": 2},
            "validation_status": "pending"
        }
    },
    {
        "name": "TinyLlava-1.5B",
        "family": "TinyLlava",
        "source": "huggingface://bczhou/tiny-llava-v1.5-1.1B",
        "dtype": "float16",
        "num_parameters": 1100000000,
        "notes": "TinyLlava 1.1B model for vision-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "bczhou/tiny-llava-v1.5-1.1B",
            "modality_support": ["text", "image"],
            "hardware_requirements": {"min_gpu_memory": "4GB", "recommended_gpus": 1},
            "validation_status": "pending"
        }
    },
    
    # Video-Language Models
    {
        "name": "VideoLLaMA2-7B",
        "family": "VideoLLaMA2",
        "source": "huggingface://LanguageBind/Video-LLaMA2-7B",
        "dtype": "float16",
        "num_parameters": 7000000000,
        "notes": "VideoLLaMA2 7B model for video-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "LanguageBind/Video-LLaMA2-7B",
            "modality_support": ["text", "image", "video"],
            "hardware_requirements": {"min_gpu_memory": "16GB", "recommended_gpus": 1},
            "validation_status": "pending"
        }
    },
    {
        "name": "VideoLLaMA2-13B",
        "family": "VideoLLaMA2",
        "source": "huggingface://LanguageBind/Video-LLaMA2-13B",
        "dtype": "float16",
        "num_parameters": 13000000000,
        "notes": "VideoLLaMA2 13B model for video-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "LanguageBind/Video-LLaMA2-13B",
            "modality_support": ["text", "image", "video"],
            "hardware_requirements": {"min_gpu_memory": "32GB", "recommended_gpus": 2},
            "validation_status": "pending"
        }
    },
    {
        "name": "VideoChat2-7B",
        "family": "VideoChat2",
        "source": "huggingface://THUDM/video-chat2-7b",
        "dtype": "float16",
        "num_parameters": 7000000000,
        "notes": "VideoChat2 7B model for video-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "THUDM/video-chat2-7b",
            "modality_support": ["text", "image", "video"],
            "hardware_requirements": {"min_gpu_memory": "16GB", "recommended_gpus": 1},
            "validation_status": "pending"
        }
    },
    {
        "name": "VideoChat2-13B",
        "family": "VideoChat2",
        "source": "huggingface://THUDM/video-chat2-13b",
        "dtype": "float16",
        "num_parameters": 13000000000,
        "notes": "VideoChat2 13B model for video-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "THUDM/video-chat2-13b",
            "modality_support": ["text", "image", "video"],
            "hardware_requirements": {"min_gpu_memory": "32GB", "recommended_gpus": 2},
            "validation_status": "pending"
        }
    },
    {
        "name": "InternVideo2-26B",
        "family": "InternVideo2",
        "source": "huggingface://OpenGVLab/InternVideo2-26B",
        "dtype": "float16",
        "num_parameters": 26000000000,
        "notes": "InternVideo2 26B model for video-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "OpenGVLab/InternVideo2-26B",
            "modality_support": ["text", "image", "video"],
            "hardware_requirements": {"min_gpu_memory": "52GB", "recommended_gpus": 2},
            "validation_status": "pending"
        }
    },
    {
        "name": "MovieChat-7B",
        "family": "MovieChat",
        "source": "huggingface://MovieChat/MovieChat-7B-v1.0",
        "dtype": "float16",
        "num_parameters": 7000000000,
        "notes": "MovieChat 7B model for movie understanding tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "MovieChat/MovieChat-7B-v1.0",
            "modality_support": ["text", "image", "video"],
            "hardware_requirements": {"min_gpu_memory": "16GB", "recommended_gpus": 1},
            "validation_status": "pending"
        }
    },
    
    # Audio-Language Models
    {
        "name": "Qwen2-Audio-7B",
        "family": "Qwen2-Audio",
        "source": "huggingface://Qwen/Qwen2-Audio-7B-Instruct",
        "dtype": "float16",
        "num_parameters": 7000000000,
        "notes": "Qwen2-Audio 7B model for audio-language tasks",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "Qwen/Qwen2-Audio-7B-Instruct",
            "modality_support": ["text", "audio"],
            "hardware_requirements": {"min_gpu_memory": "16GB", "recommended_gpus": 1},
            "validation_status": "pending"
        }
    },
    {
        "name": "Whisper-Large-v3",
        "family": "Whisper",
        "source": "huggingface://openai/whisper-large-v3",
        "dtype": "float16",
        "num_parameters": 1550000000,
        "notes": "Whisper Large v3 model for speech recognition",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "openai/whisper-large-v3",
            "modality_support": ["audio"],
            "hardware_requirements": {"min_gpu_memory": "4GB", "recommended_gpus": 1},
            "validation_status": "pending"
        }
    },
    
    # Omni-Modal Models (Text + Image + Video + Audio)
    {
        "name": "Qwen2.5-Omni-7B",
        "family": "Qwen2.5-Omni",
        "source": "huggingface://Qwen/Qwen2.5-Omni-7B-Instruct",
        "dtype": "float16",
        "num_parameters": 7000000000,
        "notes": "Qwen2.5 Omni 7B model supporting all modalities",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "Qwen/Qwen2.5-Omni-7B-Instruct",
            "modality_support": ["text", "image", "video", "audio"],
            "hardware_requirements": {"min_gpu_memory": "16GB", "recommended_gpus": 1},
            "validation_status": "pending"
        }
    },
    {
        "name": "Qwen2.5-Omni-72B",
        "family": "Qwen2.5-Omni",
        "source": "huggingface://Qwen/Qwen2.5-Omni-72B-Instruct",
        "dtype": "float16",
        "num_parameters": 72000000000,
        "notes": "Qwen2.5 Omni 72B model supporting all modalities",
        "metadata": {
            "loading_method": "huggingface",
            "model_path": "Qwen/Qwen2.5-Omni-72B-Instruct",
            "modality_support": ["text", "image", "video", "audio"],
            "hardware_requirements": {"min_gpu_memory": "80GB", "recommended_gpus": 4},
            "validation_status": "pending"
        }
    },
    
    # API-Based Models
    {
        "name": "GPT-4V",
        "family": "OpenAI",
        "source": "api://openai/gpt-4-vision-preview",
        "dtype": "unknown",
        "num_parameters": 0,
        "notes": "OpenAI GPT-4V model for vision-language tasks",
        "metadata": {
            "loading_method": "api",
            "api_endpoint": "https://api.openai.com/v1",
            "api_credentials": {
                "provider": "openai",
                "model_name": "gpt-4-vision-preview"
            },
            "modality_support": ["text", "image"],
            "hardware_requirements": {"api_based": True, "provider": "openai"},
            "validation_status": "pending"
        }
    },
    {
        "name": "GPT-4o",
        "family": "OpenAI",
        "source": "api://openai/gpt-4o",
        "dtype": "unknown",
        "num_parameters": 0,
        "notes": "OpenAI GPT-4o model for multimodal tasks",
        "metadata": {
            "loading_method": "api",
            "api_endpoint": "https://api.openai.com/v1",
            "api_credentials": {
                "provider": "openai",
                "model_name": "gpt-4o"
            },
            "modality_support": ["text", "image", "audio"],
            "hardware_requirements": {"api_based": True, "provider": "openai"},
            "validation_status": "pending"
        }
    },
    {
        "name": "Claude-3.5-Sonnet",
        "family": "Anthropic",
        "source": "api://anthropic/claude-3-5-sonnet-20241022",
        "dtype": "unknown",
        "num_parameters": 0,
        "notes": "Anthropic Claude 3.5 Sonnet model for multimodal tasks",
        "metadata": {
            "loading_method": "api",
            "api_endpoint": "https://api.anthropic.com/v1",
            "api_credentials": {
                "provider": "anthropic",
                "model_name": "claude-3-5-sonnet-20241022"
            },
            "modality_support": ["text", "image"],
            "hardware_requirements": {"api_based": True, "provider": "anthropic"},
            "validation_status": "pending"
        }
    },
    {
        "name": "Gemini-Pro-Vision",
        "family": "Google",
        "source": "api://google/gemini-pro-vision",
        "dtype": "unknown",
        "num_parameters": 0,
        "notes": "Google Gemini Pro Vision model for vision-language tasks",
        "metadata": {
            "loading_method": "api",
            "api_endpoint": "https://generativelanguage.googleapis.com/v1",
            "api_credentials": {
                "provider": "google",
                "model_name": "gemini-pro-vision"
            },
            "modality_support": ["text", "image"],
            "hardware_requirements": {"api_based": True, "provider": "google"},
            "validation_status": "pending"
        }
    }
]

def register_model(model_data: Dict[str, Any]) -> bool:
    """Register a single model via the API."""
    try:
        headers = {'Content-Type': 'application/json'}
        response = requests.post(
            f"{API_BASE_URL}/models",
            headers=headers,
            data=json.dumps(model_data)
        )
        response.raise_for_status()
        print(f"SUCCESS: Registered {model_data['name']}")
        return True
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 409:  # Conflict - model already exists
            print(f"SKIPPED (exists): {model_data['name']}")
            return True
        else:
            print(f"FAILED to register {model_data['name']}: {e.response.text}")
            return False
    except Exception as e:
        print(f"ERROR registering {model_data['name']}: {str(e)}")
        return False

def check_api_health() -> bool:
    """Check if the API is healthy and accessible."""
    try:
        response = requests.get(f"{API_BASE_URL.replace('/api/v1', '')}/health")
        response.raise_for_status()
        health_data = response.json()
        print(f"API Health: {health_data.get('status', 'unknown')}")
        print(f"Database: {health_data.get('database', 'unknown')}")
        return health_data.get('status') == 'healthy'
    except Exception as e:
        print(f"ERROR: API health check failed: {str(e)}")
        return False

def main():
    """Main function to seed all lmms-eval models."""
    print("Seeding LMMS-Eval models into the database...")
    print(f"API Base URL: {API_BASE_URL}")
    print()
    
    # Check API health
    if not check_api_health():
        print("ERROR: API is not healthy. Please start the backend server first.")
        return
    
    print()
    print(f"Found {len(LMMS_EVAL_MODELS)} models to register")
    print()
    
    # Register all models
    successful = 0
    failed = 0
    skipped = 0
    
    for i, model_data in enumerate(LMMS_EVAL_MODELS, 1):
        print(f"[{i:2d}/{len(LMMS_EVAL_MODELS)}] ", end="")
        
        if register_model(model_data):
            successful += 1
        else:
            failed += 1
        
        # Small delay to avoid overwhelming the API
        time.sleep(0.1)
    
    print()
    print("Registration Summary:")
    print(f"  Successful: {successful}")
    print(f"  Skipped (exists): {skipped}")
    print(f"  Failed: {failed}")
    print(f"  Total: {len(LMMS_EVAL_MODELS)}")
    
    if failed == 0:
        print()
        print("All models registered successfully!")
        print("You can now use these models in the web-app for benchmarking.")
    else:
        print()
        print(f"WARNING: {failed} models failed to register. Check the errors above.")

if __name__ == "__main__":
    main()
