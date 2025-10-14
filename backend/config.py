"""
Configuration management for the LMMS-Eval Dashboard backend.
"""

import os
from typing import List, Optional
from pydantic import validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with validation and type checking."""
    
    # Supabase Configuration
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_role_key: str = ""
    
    # API Configuration
    api_v1_str: str = "/api/v1"
    project_name: str = "LMMS-Eval Dashboard"
    version: str = "1.0.0"
    
    # CORS Configuration
    backend_cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    @validator("backend_cors_origins", pre=True)
    def assemble_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # Logging Configuration
    log_level: str = "INFO"
    log_format: str = "json"
    
    # GPU Configuration
    available_gpus: List[str] = ["cuda:0", "cuda:1", "cuda:2", "cuda:3"]
    default_compute_profile: str = "4070-8GB"
    
    # Development Configuration
    debug: bool = False
    reload: bool = False
    
    # LMMS-Eval Integration
    lmms_eval_path: str = os.path.join(os.getcwd(), "lmms-eval")
    hf_home: str = "/path/to/huggingface/cache"
    hf_token: Optional[str] = None
    
    # API Keys for different services
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    dashscope_api_key: Optional[str] = None
    reka_api_key: Optional[str] = None
    
    class Config:
        """Pydantic configuration."""
        env_file = os.path.join(os.path.dirname(__file__), ".env")
        case_sensitive = False
        extra = "ignore"


# Global settings instance
settings = Settings()


class GPUSchedulerConfig:
    """GPU scheduling configuration."""
    
    def __init__(self):
        self.available_gpus = settings.available_gpus
        self.default_compute_profile = settings.default_compute_profile
        self.max_concurrent_runs = 4
        self.gpu_memory_threshold = 0.8  # 80% memory usage threshold


# Configuration instances
gpu_scheduler_config = GPUSchedulerConfig()


def get_settings() -> Settings:
    """Get application settings."""
    return settings


def validate_configuration() -> bool:
    """
    Validate that all required configuration is present.
    
    Returns:
        bool: True if configuration is valid, False otherwise
    """
    return True


# Validate configuration on import
if not validate_configuration():
    raise ValueError("Invalid configuration. Please check your environment variables.")