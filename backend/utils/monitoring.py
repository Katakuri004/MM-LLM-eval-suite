"""
Monitoring utilities for the LMMS-Eval Dashboard.

This module provides monitoring and metrics collection for the application.
"""

import time
from typing import Dict, Any, Optional
import structlog
from datetime import datetime, timedelta

from config import settings

# Configure structured logging
logger = structlog.get_logger(__name__)


class MetricsCollector:
    """
    Metrics collector for application monitoring.
    
    Collects and stores various metrics for monitoring and alerting.
    """
    
    def __init__(self):
        """Initialize metrics collector."""
        self.metrics: Dict[str, Any] = {}
        self.counters: Dict[str, int] = {}
        self.timers: Dict[str, float] = {}
        self.gauges: Dict[str, float] = {}
        self.histograms: Dict[str, list] = {}
        
        logger.info("Metrics collector initialized")
    
    def increment_counter(self, name: str, value: int = 1):
        """
        Increment a counter metric.
        
        Args:
            name: Counter name
            value: Value to increment by
        """
        if name not in self.counters:
            self.counters[name] = 0
        self.counters[name] += value
    
    def set_gauge(self, name: str, value: float):
        """
        Set a gauge metric value.
        
        Args:
            name: Gauge name
            value: Gauge value
        """
        self.gauges[name] = value
    
    def record_timer(self, name: str, duration: float):
        """
        Record a timer metric.
        
        Args:
            name: Timer name
            duration: Duration in seconds
        """
        if name not in self.timers:
            self.timers[name] = 0.0
        self.timers[name] += duration
    
    def record_histogram(self, name: str, value: float):
        """
        Record a histogram metric.
        
        Args:
            name: Histogram name
            value: Value to record
        """
        if name not in self.histograms:
            self.histograms[name] = []
        self.histograms[name].append(value)
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get all collected metrics.
        
        Returns:
            Dict[str, Any]: All metrics
        """
        return {
            "counters": dict(self.counters),
            "timers": dict(self.timers),
            "gauges": dict(self.gauges),
            "histograms": {
                name: {
                    "count": len(values),
                    "min": min(values) if values else 0,
                    "max": max(values) if values else 0,
                    "avg": sum(values) / len(values) if values else 0
                }
                for name, values in self.histograms.items()
            }
        }
    
    def reset_metrics(self):
        """Reset all metrics."""
        self.counters.clear()
        self.timers.clear()
        self.gauges.clear()
        self.histograms.clear()
        logger.info("Metrics reset")


# Global metrics collector
metrics_collector = MetricsCollector()


def setup_monitoring():
    """
    Setup monitoring and metrics collection.
    
    Configures monitoring systems and starts background tasks.
    """
    try:
        if not settings.enable_metrics:
            logger.info("Metrics collection disabled")
            return
        
        # Initialize metrics
        metrics_collector.set_gauge("application_start_time", time.time())
        metrics_collector.increment_counter("application_starts")
        
        logger.info("Monitoring setup completed")
        
    except Exception as e:
        logger.error("Failed to setup monitoring", error=str(e))
        raise


def record_api_request(method: str, path: str, status_code: int, duration: float):
    """
    Record API request metrics.
    
    Args:
        method: HTTP method
        path: Request path
        status_code: Response status code
        duration: Request duration in seconds
    """
    try:
        # Record request counter
        metrics_collector.increment_counter(f"api_requests_total")
        metrics_collector.increment_counter(f"api_requests_{method.lower()}")
        metrics_collector.increment_counter(f"api_requests_{status_code}")
        
        # Record request duration
        metrics_collector.record_timer("api_request_duration", duration)
        metrics_collector.record_histogram("api_request_duration_histogram", duration)
        
        # Record status code distribution
        metrics_collector.increment_counter(f"api_status_{status_code}")
        
    except Exception as e:
        logger.error("Failed to record API request metrics", error=str(e))


def record_database_operation(operation: str, table: str, duration: float, success: bool):
    """
    Record database operation metrics.
    
    Args:
        operation: Database operation
        table: Table name
        duration: Operation duration in seconds
        success: Whether operation was successful
    """
    try:
        # Record operation counter
        metrics_collector.increment_counter(f"database_operations_total")
        metrics_collector.increment_counter(f"database_operations_{operation}")
        metrics_collector.increment_counter(f"database_operations_{table}")
        
        if success:
            metrics_collector.increment_counter(f"database_operations_success")
        else:
            metrics_collector.increment_counter(f"database_operations_error")
        
        # Record operation duration
        metrics_collector.record_timer("database_operation_duration", duration)
        metrics_collector.record_histogram("database_operation_duration_histogram", duration)
        
    except Exception as e:
        logger.error("Failed to record database operation metrics", error=str(e))


def record_websocket_event(event_type: str, run_id: str):
    """
    Record WebSocket event metrics.
    
    Args:
        event_type: Event type
        run_id: Run ID
    """
    try:
        metrics_collector.increment_counter(f"websocket_events_total")
        metrics_collector.increment_counter(f"websocket_events_{event_type}")
        
    except Exception as e:
        logger.error("Failed to record WebSocket event metrics", error=str(e))


def record_run_event(event_type: str, run_id: str, duration: Optional[float] = None):
    """
    Record run event metrics.
    
    Args:
        event_type: Event type
        run_id: Run ID
        duration: Event duration in seconds (if applicable)
    """
    try:
        metrics_collector.increment_counter(f"run_events_total")
        metrics_collector.increment_counter(f"run_events_{event_type}")
        
        if duration is not None:
            metrics_collector.record_timer(f"run_event_duration_{event_type}", duration)
            metrics_collector.record_histogram(f"run_event_duration_histogram", duration)
        
    except Exception as e:
        logger.error("Failed to record run event metrics", error=str(e))


def record_gpu_utilization(gpu_id: str, utilization: float, memory_usage: float):
    """
    Record GPU utilization metrics.
    
    Args:
        gpu_id: GPU ID
        utilization: GPU utilization percentage
        memory_usage: Memory usage percentage
    """
    try:
        metrics_collector.set_gauge(f"gpu_utilization_{gpu_id}", utilization)
        metrics_collector.set_gauge(f"gpu_memory_usage_{gpu_id}", memory_usage)
        
        metrics_collector.record_histogram("gpu_utilization_histogram", utilization)
        metrics_collector.record_histogram("gpu_memory_usage_histogram", memory_usage)
        
    except Exception as e:
        logger.error("Failed to record GPU utilization metrics", error=str(e))


def record_security_event(event_type: str, severity: str = "medium"):
    """
    Record security event metrics.
    
    Args:
        event_type: Security event type
        severity: Event severity (low, medium, high, critical)
    """
    try:
        metrics_collector.increment_counter(f"security_events_total")
        metrics_collector.increment_counter(f"security_events_{event_type}")
        metrics_collector.increment_counter(f"security_events_{severity}")
        
    except Exception as e:
        logger.error("Failed to record security event metrics", error=str(e))


def get_health_metrics() -> Dict[str, Any]:
    """
    Get health metrics for monitoring.
    
    Returns:
        Dict[str, Any]: Health metrics
    """
    try:
        metrics = metrics_collector.get_metrics()
        
        # Add health-specific metrics
        health_metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": time.time() - metrics_collector.gauges.get("application_start_time", time.time()),
            "metrics": metrics
        }
        
        return health_metrics
        
    except Exception as e:
        logger.error("Failed to get health metrics", error=str(e))
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }


def get_performance_metrics() -> Dict[str, Any]:
    """
    Get performance metrics for monitoring.
    
    Returns:
        Dict[str, Any]: Performance metrics
    """
    try:
        metrics = metrics_collector.get_metrics()
        
        # Calculate performance indicators
        performance_metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "api_requests_per_second": _calculate_rate(metrics["counters"].get("api_requests_total", 0)),
            "average_api_duration": metrics["timers"].get("api_request_duration", 0) / max(metrics["counters"].get("api_requests_total", 1), 1),
            "database_operations_per_second": _calculate_rate(metrics["counters"].get("database_operations_total", 0)),
            "average_database_duration": metrics["timers"].get("database_operation_duration", 0) / max(metrics["counters"].get("database_operations_total", 1), 1),
            "metrics": metrics
        }
        
        return performance_metrics
        
    except Exception as e:
        logger.error("Failed to get performance metrics", error=str(e))
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }


def _calculate_rate(counter_value: int) -> float:
    """
    Calculate rate per second for a counter.
    
    Args:
        counter_value: Counter value
        
    Returns:
        float: Rate per second
    """
    try:
        # This is a simplified calculation
        # In a real system, you would track timestamps and calculate actual rates
        uptime = time.time() - metrics_collector.gauges.get("application_start_time", time.time())
        return counter_value / max(uptime, 1)
    except Exception:
        return 0.0


def reset_metrics():
    """Reset all metrics."""
    try:
        metrics_collector.reset_metrics()
        logger.info("Metrics reset successfully")
    except Exception as e:
        logger.error("Failed to reset metrics", error=str(e))
