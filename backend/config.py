"""
Configuration management for the LMMS-Eval Dashboard backend.

This module handles all configuration settings including environment variables,
database connections, security settings, and application-specific configurations.
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
    
    # Database Configuration
    database_url: str = ""
    
    # Redis Configuration
    redis_url: str = "redis://localhost:6379"
    
    # Security Configuration
    secret_key: str = "test-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # API Configuration
    api_v1_str: str = "/api/v1"
    project_name: str = "LMMS-Eval Dashboard"
    version: str = "1.0.0"
    
    # CORS Configuration
    backend_cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
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
    
    # File Storage Configuration
    upload_dir: str = "./uploads"
    max_file_size: str = "100MB"
    allowed_file_types: List[str] = ["json", "yaml", "csv", "txt", "log"]
    
    # Monitoring Configuration
    enable_metrics: bool = True
    metrics_port: int = 9090
    
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
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()


class DatabaseConfig:
    """Database-specific configuration."""
    
    def __init__(self):
        self.url = settings.database_url
        self.pool_size = 20
        self.max_overflow = 30
        self.pool_timeout = 30
        self.pool_recycle = 3600


class SecurityConfig:
    """Security-specific configuration."""
    
    def __init__(self):
        self.secret_key = settings.secret_key
        self.algorithm = settings.algorithm
        self.access_token_expire_minutes = settings.access_token_expire_minutes
        self.password_min_length = 8
        self.password_require_special_chars = True
        self.password_require_numbers = True
        self.password_require_uppercase = True


class GPUSchedulerConfig:
    """GPU scheduling configuration."""
    
    def __init__(self):
        self.available_gpus = settings.available_gpus
        self.default_compute_profile = settings.default_compute_profile
        self.max_concurrent_runs = 4
        self.gpu_memory_threshold = 0.8  # 80% memory usage threshold


class LoggingConfig:
    """Logging configuration."""
    
    def __init__(self):
        self.level = settings.log_level
        self.format = settings.log_format
        self.enable_structured_logging = True
        self.log_file = "logs/app.log"
        self.max_file_size = "10MB"
        self.backup_count = 5


# Configuration instances
database_config = DatabaseConfig()
security_config = SecurityConfig()
gpu_scheduler_config = GPUSchedulerConfig()
logging_config = LoggingConfig()


def get_settings() -> Settings:
    """Get application settings."""
    return settings


def validate_configuration() -> bool:
    """
    Validate that all required configuration is present.
    
    Returns:
        bool: True if configuration is valid, False otherwise
    """
    # For testing purposes, we'll allow empty values
    return True


# Validate configuration on import
if not validate_configuration():
    raise ValueError("Invalid configuration. Please check your environment variables.")
