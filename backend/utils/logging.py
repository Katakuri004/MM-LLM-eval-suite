"""
Logging utilities for the LMMS-Eval Dashboard.

This module provides structured logging configuration and utilities
for the application.
"""

import logging
import sys
from typing import Dict, Any, Optional
import structlog
from datetime import datetime

from config import settings, logging_config


def setup_logging():
    """
    Setup structured logging for the application.
    
    Configures logging with appropriate formatters, handlers, and
    structured logging settings.
    """
    try:
        # Configure standard library logging
        logging.basicConfig(
            level=getattr(logging, settings.log_level.upper()),
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler(logging_config.log_file)
            ]
        )
        
        # Configure structlog
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.add_logger_name,
                structlog.stdlib.add_log_level,
                structlog.stdlib.PositionalArgumentsFormatter(),
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.UnicodeDecoder(),
                structlog.processors.JSONRenderer() if settings.log_format == "json" else structlog.dev.ConsoleRenderer()
            ],
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            wrapper_class=structlog.stdlib.BoundLogger,
            cache_logger_on_first_use=True,
        )
        
        # Set up log rotation
        if logging_config.enable_structured_logging:
            _setup_log_rotation()
        
        # Create application logger
        logger = structlog.get_logger(__name__)
        logger.info(
            "Logging configured successfully",
            log_level=settings.log_level,
            log_format=settings.log_format,
            log_file=logging_config.log_file
        )
        
    except Exception as e:
        print(f"Failed to setup logging: {e}")
        raise


def _setup_log_rotation():
    """
    Setup log rotation for the application.
    
    Configures log rotation to prevent log files from growing too large.
    """
    try:
        from logging.handlers import RotatingFileHandler
        
        # Get the file handler
        file_handler = None
        for handler in logging.getLogger().handlers:
            if isinstance(handler, logging.FileHandler):
                file_handler = handler
                break
        
        if file_handler:
            # Replace with rotating file handler
            rotating_handler = RotatingFileHandler(
                logging_config.log_file,
                maxBytes=logging_config.max_file_size,
                backupCount=logging_config.backup_count
            )
            rotating_handler.setFormatter(file_handler.formatter)
            
            # Remove old handler and add new one
            logging.getLogger().removeHandler(file_handler)
            logging.getLogger().addHandler(rotating_handler)
            
    except Exception as e:
        print(f"Failed to setup log rotation: {e}")


def get_logger(name: str) -> structlog.BoundLogger:
    """
    Get a structured logger for the given name.
    
    Args:
        name: Logger name
        
    Returns:
        structlog.BoundLogger: Structured logger instance
    """
    return structlog.get_logger(name)


def log_function_call(func):
    """
    Decorator to log function calls with parameters and return values.
    
    Args:
        func: Function to decorate
        
    Returns:
        Decorated function
    """
    def wrapper(*args, **kwargs):
        logger = get_logger(func.__module__)
        
        # Log function call
        logger.info(
            "Function called",
            function=func.__name__,
            args=args,
            kwargs=kwargs
        )
        
        try:
            # Call function
            result = func(*args, **kwargs)
            
            # Log successful return
            logger.info(
                "Function completed successfully",
                function=func.__name__,
                result=result
            )
            
            return result
            
        except Exception as e:
            # Log error
            logger.error(
                "Function failed",
                function=func.__name__,
                error=str(e),
                exc_info=True
            )
            raise
    
    return wrapper


def log_performance(func):
    """
    Decorator to log function performance metrics.
    
    Args:
        func: Function to decorate
        
    Returns:
        Decorated function
    """
    def wrapper(*args, **kwargs):
        logger = get_logger(func.__module__)
        start_time = datetime.utcnow()
        
        try:
            result = func(*args, **kwargs)
            
            # Calculate execution time
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Log performance
            logger.info(
                "Function performance",
                function=func.__name__,
                execution_time_seconds=execution_time,
                success=True
            )
            
            return result
            
        except Exception as e:
            # Calculate execution time
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Log performance with error
            logger.error(
                "Function performance",
                function=func.__name__,
                execution_time_seconds=execution_time,
                success=False,
                error=str(e)
            )
            raise
    
    return wrapper


def log_database_operation(operation: str, table: str, **kwargs):
    """
    Log database operation with structured data.
    
    Args:
        operation: Database operation (select, insert, update, delete)
        table: Table name
        **kwargs: Additional logging data
    """
    logger = get_logger("database")
    logger.info(
        "Database operation",
        operation=operation,
        table=table,
        **kwargs
    )


def log_api_request(method: str, path: str, status_code: int, **kwargs):
    """
    Log API request with structured data.
    
    Args:
        method: HTTP method
        path: Request path
        status_code: Response status code
        **kwargs: Additional logging data
    """
    logger = get_logger("api")
    logger.info(
        "API request",
        method=method,
        path=path,
        status_code=status_code,
        **kwargs
    )


def log_websocket_event(event_type: str, run_id: str, **kwargs):
    """
    Log WebSocket event with structured data.
    
    Args:
        event_type: Event type
        run_id: Run ID
        **kwargs: Additional logging data
    """
    logger = get_logger("websocket")
    logger.info(
        "WebSocket event",
        event_type=event_type,
        run_id=run_id,
        **kwargs
    )


def log_run_event(event_type: str, run_id: str, **kwargs):
    """
    Log run event with structured data.
    
    Args:
        event_type: Event type
        run_id: Run ID
        **kwargs: Additional logging data
    """
    logger = get_logger("run")
    logger.info(
        "Run event",
        event_type=event_type,
        run_id=run_id,
        **kwargs
    )


def log_security_event(event_type: str, user_id: Optional[str] = None, **kwargs):
    """
    Log security event with structured data.
    
    Args:
        event_type: Event type
        user_id: User ID (if available)
        **kwargs: Additional logging data
    """
    logger = get_logger("security")
    logger.warning(
        "Security event",
        event_type=event_type,
        user_id=user_id,
        **kwargs
    )


def log_error(error: Exception, context: Optional[Dict[str, Any]] = None):
    """
    Log error with structured data.
    
    Args:
        error: Exception to log
        context: Additional context data
    """
    logger = get_logger("error")
    logger.error(
        "Error occurred",
        error=str(error),
        error_type=type(error).__name__,
        context=context or {},
        exc_info=True
    )
