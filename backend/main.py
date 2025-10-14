"""
Main FastAPI application for the LMMS-Eval Dashboard.

This module sets up the FastAPI application with all middleware, routes,
WebSocket support, and error handling.
"""

import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any
import structlog
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uvicorn

from config import settings, validate_configuration
from database import db_manager
from auth import auth_manager
from api.runs import router as runs_router
from api.models import router as models_router
from api.benchmarks import router as benchmarks_router
from api.leaderboard import router as leaderboard_router
from api.comparisons import router as comparisons_router
from api.slices import router as slices_router
from websocket_manager import websocket_manager
from utils.logging import setup_logging
from utils.monitoring import setup_monitoring

# Configure structured logging
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles startup and shutdown events for the FastAPI application.
    """
    # Startup
    logger.info("Starting LMMS-Eval Dashboard API")
    
    # Validate configuration
    if not validate_configuration():
        logger.error("Invalid configuration, shutting down")
        raise RuntimeError("Invalid configuration")
    
    # Setup logging
    setup_logging()
    
    # Setup monitoring
    if settings.enable_metrics:
        setup_monitoring()
    
    # Initialize database connections
    try:
        health_check = await db_manager.health_check()
        if not health_check:
            logger.error("Database health check failed")
            raise RuntimeError("Database connection failed")
        logger.info("Database connection established")
    except Exception as e:
        logger.error("Failed to connect to database", error=str(e))
        raise
    
    # Initialize WebSocket manager
    await websocket_manager.initialize()
    logger.info("WebSocket manager initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down LMMS-Eval Dashboard API")
    
    # Close database connections
    await db_manager.close_connections()
    logger.info("Database connections closed")
    
    # Close WebSocket connections
    await websocket_manager.close_all_connections()
    logger.info("WebSocket connections closed")


# Create FastAPI application
app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    description="A comprehensive web-based dashboard for LMM evaluation",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add trusted host middleware for security
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.yourdomain.com"]
)


# Global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with structured logging."""
    logger.warning(
        "HTTP exception occurred",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
        method=request.method
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": request.url.path
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors."""
    logger.warning(
        "Request validation error",
        errors=exc.errors(),
        path=request.url.path,
        method=request.method
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "details": exc.errors(),
            "path": request.url.path
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions with structured logging."""
    logger.error(
        "Unhandled exception occurred",
        error=str(exc),
        path=request.url.path,
        method=request.method,
        exc_info=True
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "path": request.url.path
        }
    )


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        Dict containing health status and system information
    """
    try:
        # Check database connectivity
        db_healthy = await db_manager.health_check()
        
        # Check WebSocket manager
        ws_healthy = websocket_manager.is_healthy()
        
        overall_health = db_healthy and ws_healthy
        
        return {
            "status": "healthy" if overall_health else "unhealthy",
            "database": "healthy" if db_healthy else "unhealthy",
            "websocket": "healthy" if ws_healthy else "unhealthy",
            "version": settings.version,
            "timestamp": asyncio.get_event_loop().time()
        }
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "error": str(e),
                "version": settings.version
            }
        )


# API information endpoint
@app.get("/")
async def root():
    """
    Root endpoint with API information.
    
    Returns:
        Dict containing API information and available endpoints
    """
    return {
        "name": settings.project_name,
        "version": settings.version,
        "description": "LMMS-Eval Dashboard API",
        "docs_url": "/docs" if settings.debug else "Documentation not available in production",
        "health_check": "/health",
        "api_version": settings.api_v1_str
    }


# Include API routers
app.include_router(
    runs_router,
    prefix=settings.api_v1_str,
    tags=["runs"]
)

app.include_router(
    models_router,
    prefix=settings.api_v1_str,
    tags=["models"]
)

app.include_router(
    benchmarks_router,
    prefix=settings.api_v1_str,
    tags=["benchmarks"]
)

app.include_router(
    leaderboard_router,
    prefix=settings.api_v1_str,
    tags=["leaderboard"]
)

app.include_router(
    comparisons_router,
    prefix=settings.api_v1_str,
    tags=["comparisons"]
)

app.include_router(
    slices_router,
    prefix=settings.api_v1_str,
    tags=["slices"]
)


# WebSocket endpoint
@app.websocket("/ws/runs/{run_id}")
async def websocket_endpoint(websocket, run_id: str):
    """
    WebSocket endpoint for real-time run updates.
    
    Args:
        websocket: WebSocket connection
        run_id: Run ID to subscribe to updates for
    """
    await websocket_manager.handle_connection(websocket, run_id)


if __name__ == "__main__":
    # Run the application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.reload,
        log_level=settings.log_level.lower()
    )
