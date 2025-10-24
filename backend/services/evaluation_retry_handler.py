"""
Evaluation Retry Handler Service

Handles retry logic for failed evaluations with exponential backoff,
circuit breaker pattern, and intelligent error classification.
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Type
from enum import Enum
import structlog

from services.supabase_service import supabase_service

logger = structlog.get_logger(__name__)

class RetryableError(Exception):
    """Exception that can be retried."""
    pass

class NonRetryableError(Exception):
    """Exception that should not be retried."""
    pass

class RetryStatus(Enum):
    """Retry status enumeration."""
    PENDING = "pending"
    RETRYING = "retrying"
    SUCCESS = "success"
    FAILED = "failed"
    CIRCUIT_OPEN = "circuit_open"

class RetryHandler:
    """Service for handling evaluation retries with exponential backoff."""
    
    def __init__(self):
        """Initialize the retry handler."""
        self.max_retries = 3
        self.base_delay = 2  # seconds
        self.max_delay = 60  # seconds
        self.backoff_multiplier = 2
        self.circuit_breaker_threshold = 5  # failures before circuit opens
        self.circuit_breaker_timeout = 300  # seconds (5 minutes)
        
        # Circuit breaker state
        self.circuit_breaker_failures = 0
        self.circuit_breaker_last_failure = None
        self.circuit_breaker_state = "closed"  # closed, open, half-open
        
        # Retry tracking
        self.active_retries: Dict[str, Dict[str, Any]] = {}
        
        logger.info("Retry handler initialized", 
                   max_retries=self.max_retries,
                   base_delay=self.base_delay,
                   max_delay=self.max_delay)
    
    async def execute_with_retry(
        self, 
        evaluation_id: str,
        func: Callable,
        *args, 
        **kwargs
    ) -> Any:
        """
        Execute function with retry logic.
        
        Args:
            evaluation_id: ID of the evaluation
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Function result
            
        Raises:
            NonRetryableError: If error is not retryable
            Exception: If all retries exhausted
        """
        try:
            # Check circuit breaker
            if self._is_circuit_open():
                raise NonRetryableError("Circuit breaker is open - too many recent failures")
            
            # Track retry attempt
            retry_info = {
                "evaluation_id": evaluation_id,
                "attempt": 0,
                "max_attempts": self.max_retries + 1,
                "status": RetryStatus.PENDING.value,
                "started_at": datetime.utcnow().isoformat(),
                "errors": []
            }
            
            self.active_retries[evaluation_id] = retry_info
            
            for attempt in range(self.max_retries + 1):
                try:
                    retry_info["attempt"] = attempt + 1
                    retry_info["status"] = RetryStatus.RETRYING.value if attempt > 0 else RetryStatus.PENDING.value
                    
                    # Update database with retry attempt
                    await self._update_retry_status(evaluation_id, retry_info)
                    
                    logger.info(
                        "Executing function with retry",
                        evaluation_id=evaluation_id,
                        attempt=attempt + 1,
                        max_attempts=self.max_retries + 1
                    )
                    
                    # Execute function
                    result = await func(*args, **kwargs)
                    
                    # Success - update status
                    retry_info["status"] = RetryStatus.SUCCESS.value
                    retry_info["completed_at"] = datetime.utcnow().isoformat()
                    
                    await self._update_retry_status(evaluation_id, retry_info)
                    
                    # Reset circuit breaker on success
                    self._reset_circuit_breaker()
                    
                    logger.info(
                        "Function executed successfully",
                        evaluation_id=evaluation_id,
                        attempt=attempt + 1,
                        total_attempts=attempt + 1
                    )
                    
                    return result
                    
                except RetryableError as e:
                    retry_info["errors"].append({
                        "attempt": attempt + 1,
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
                    if attempt < self.max_retries:
                        # Calculate delay with exponential backoff
                        delay = min(
                            self.base_delay * (self.backoff_multiplier ** attempt),
                            self.max_delay
                        )
                        
                        logger.warning(
                            "Retryable error occurred, retrying",
                            evaluation_id=evaluation_id,
                            attempt=attempt + 1,
                            error=str(e),
                            delay=delay
                        )
                        
                        # Wait before retry
                        await asyncio.sleep(delay)
                    else:
                        # All retries exhausted
                        retry_info["status"] = RetryStatus.FAILED.value
                        retry_info["completed_at"] = datetime.utcnow().isoformat()
                        
                        await self._update_retry_status(evaluation_id, retry_info)
                        self._record_circuit_breaker_failure()
                        
                        logger.error(
                            "All retries exhausted",
                            evaluation_id=evaluation_id,
                            total_attempts=attempt + 1,
                            final_error=str(e)
                        )
                        
                        raise e
                        
                except NonRetryableError as e:
                    # Non-retryable error - fail immediately
                    retry_info["status"] = RetryStatus.FAILED.value
                    retry_info["completed_at"] = datetime.utcnow().isoformat()
                    retry_info["errors"].append({
                        "attempt": attempt + 1,
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "timestamp": datetime.utcnow().isoformat(),
                        "non_retryable": True
                    })
                    
                    await self._update_retry_status(evaluation_id, retry_info)
                    
                    logger.error(
                        "Non-retryable error occurred",
                        evaluation_id=evaluation_id,
                        attempt=attempt + 1,
                        error=str(e)
                    )
                    
                    raise e
                    
                except Exception as e:
                    # Classify error as retryable or non-retryable
                    if self._is_retryable_error(e):
                        # Treat as retryable error
                        retry_info["errors"].append({
                            "attempt": attempt + 1,
                            "error": str(e),
                            "error_type": type(e).__name__,
                            "timestamp": datetime.utcnow().isoformat()
                        })
                        
                        if attempt < self.max_retries:
                            delay = min(
                                self.base_delay * (self.backoff_multiplier ** attempt),
                                self.max_delay
                            )
                            
                            logger.warning(
                                "Retryable error occurred, retrying",
                                evaluation_id=evaluation_id,
                                attempt=attempt + 1,
                                error=str(e),
                                delay=delay
                            )
                            
                            await asyncio.sleep(delay)
                        else:
                            retry_info["status"] = RetryStatus.FAILED.value
                            retry_info["completed_at"] = datetime.utcnow().isoformat()
                            
                            await self._update_retry_status(evaluation_id, retry_info)
                            self._record_circuit_breaker_failure()
                            
                            logger.error(
                                "All retries exhausted",
                                evaluation_id=evaluation_id,
                                total_attempts=attempt + 1,
                                final_error=str(e)
                            )
                            
                            raise e
                    else:
                        # Non-retryable error
                        retry_info["status"] = RetryStatus.FAILED.value
                        retry_info["completed_at"] = datetime.utcnow().isoformat()
                        retry_info["errors"].append({
                            "attempt": attempt + 1,
                            "error": str(e),
                            "error_type": type(e).__name__,
                            "timestamp": datetime.utcnow().isoformat(),
                            "non_retryable": True
                        })
                        
                        await self._update_retry_status(evaluation_id, retry_info)
                        
                        logger.error(
                            "Non-retryable error occurred",
                            evaluation_id=evaluation_id,
                            attempt=attempt + 1,
                            error=str(e)
                        )
                        
                        raise NonRetryableError(f"Non-retryable error: {str(e)}")
            
        finally:
            # Clean up retry tracking
            if evaluation_id in self.active_retries:
                del self.active_retries[evaluation_id]
    
    def _is_retryable_error(self, error: Exception) -> bool:
        """Determine if an error is retryable."""
        error_str = str(error).lower()
        error_type = type(error).__name__
        
        # Non-retryable errors
        non_retryable_patterns = [
            'validation error',
            'invalid input',
            'not found',
            'permission denied',
            'authentication failed',
            'authorization failed',
            'circuit breaker',
            'dependency not found'
        ]
        
        non_retryable_types = [
            'ValueError',
            'TypeError',
            'KeyError',
            'AttributeError',
            'ImportError',
            'ModuleNotFoundError'
        ]
        
        # Check patterns
        for pattern in non_retryable_patterns:
            if pattern in error_str:
                return False
        
        # Check types
        if error_type in non_retryable_types:
            return False
        
        # Default to retryable for network/system errors
        retryable_types = [
            'ConnectionError',
            'TimeoutError',
            'RuntimeError',
            'OSError',
            'IOError'
        ]
        
        return error_type in retryable_types
    
    def _is_circuit_open(self) -> bool:
        """Check if circuit breaker is open."""
        if self.circuit_breaker_state == "open":
            # Check if timeout has passed
            if (self.circuit_breaker_last_failure and 
                datetime.utcnow() - self.circuit_breaker_last_failure > timedelta(seconds=self.circuit_breaker_timeout)):
                self.circuit_breaker_state = "half-open"
                return False
            return True
        return False
    
    def _record_circuit_breaker_failure(self):
        """Record a circuit breaker failure."""
        self.circuit_breaker_failures += 1
        self.circuit_breaker_last_failure = datetime.utcnow()
        
        if self.circuit_breaker_failures >= self.circuit_breaker_threshold:
            self.circuit_breaker_state = "open"
            logger.warning(
                "Circuit breaker opened",
                failures=self.circuit_breaker_failures,
                threshold=self.circuit_breaker_threshold
            )
    
    def _reset_circuit_breaker(self):
        """Reset circuit breaker on success."""
        self.circuit_breaker_failures = 0
        self.circuit_breaker_state = "closed"
        self.circuit_breaker_last_failure = None
    
    async def _update_retry_status(self, evaluation_id: str, retry_info: Dict[str, Any]) -> None:
        """Update retry status in database."""
        try:
            # Update evaluation with retry information
            update_data = {
                "retry_count": retry_info["attempt"] - 1,
                "retry_status": retry_info["status"],
                "retry_errors": retry_info["errors"],
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if "completed_at" in retry_info:
                update_data["retry_completed_at"] = retry_info["completed_at"]
            
            supabase_service.update_evaluation(evaluation_id, update_data)
            
        except Exception as e:
            logger.error("Failed to update retry status", evaluation_id=evaluation_id, error=str(e))
    
    def get_retry_status(self, evaluation_id: str) -> Optional[Dict[str, Any]]:
        """Get retry status for an evaluation."""
        return self.active_retries.get(evaluation_id)
    
    def get_circuit_breaker_status(self) -> Dict[str, Any]:
        """Get circuit breaker status."""
        return {
            "state": self.circuit_breaker_state,
            "failures": self.circuit_breaker_failures,
            "threshold": self.circuit_breaker_threshold,
            "last_failure": self.circuit_breaker_last_failure.isoformat() if self.circuit_breaker_last_failure else None,
            "timeout": self.circuit_breaker_timeout
        }
    
    def reset_circuit_breaker(self) -> None:
        """Manually reset circuit breaker."""
        self._reset_circuit_breaker()
        logger.info("Circuit breaker manually reset")

# Global instance
retry_handler = RetryHandler()
