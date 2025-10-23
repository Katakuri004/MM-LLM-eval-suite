"""
Complete LMMS-Eval Dashboard Backend with full functionality.
"""

import os
import sys
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import structlog

from config import get_settings
from services.supabase_service import supabase_service
from api.complete_api import router as api_router
from api.simple_websocket_endpoints import router as websocket_router, websocket_cleanup_task

# Configure structured logging
logger = structlog.get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting LMMS-Eval Dashboard Backend")
    
    try:
        # Initialize Supabase
        logger.info("Initializing Supabase...")
        try:
            # Check Supabase health
            if not supabase_service.is_available():
                logger.warning("Supabase not available, running in limited mode")
                app.state.database_available = False
            elif not supabase_service.health_check():
                logger.warning("Supabase health check failed, running in limited mode")
                app.state.database_available = False
            else:
                logger.info("Supabase initialized successfully")
                app.state.database_available = True
                
                # Add some sample data if database is empty
                await _populate_sample_data()
                
        except Exception as db_error:
            logger.warning("Supabase initialization failed, running in limited mode", error=str(db_error))
            app.state.database_available = False
        
        # Start WebSocket cleanup task
        asyncio.create_task(websocket_cleanup_task())
        
        logger.info("LMMS-Eval Dashboard Backend started successfully")
        
    except Exception as e:
        logger.error("Failed to start backend", error=str(e))
        # Don't raise - allow the app to start in limited mode
        app.state.database_available = False
    
    yield
    
    # Shutdown
    logger.info("Shutting down LMMS-Eval Dashboard Backend")

async def _populate_sample_data():
    """Populate database with sample data if empty."""
    try:
        # Check if we have any models
        models = supabase_service.get_models(limit=1)
        if not models:
            logger.info("Populating database with sample data...")
            
            # Add sample models
            sample_models = [
                {
                    "name": "llava",
                    "family": "LLaVA",
                    "source": "huggingface",
                    "dtype": "float16",
                    "num_parameters": 7000000000,
                    "notes": "LLaVA-1.5-7B model",
                    "metadata": {"version": "1.5", "size": "7B"}
                },
                {
                    "name": "qwen2-vl",
                    "family": "Qwen2-VL",
                    "source": "huggingface", 
                    "dtype": "float16",
                    "num_parameters": 14000000000,
                    "notes": "Qwen2-VL-14B model",
                    "metadata": {"version": "2.0", "size": "14B"}
                },
                {
                    "name": "llama-vision",
                    "family": "Llama",
                    "source": "huggingface",
                    "dtype": "float16", 
                    "num_parameters": 8000000000,
                    "notes": "Llama-3.1-8B with vision",
                    "metadata": {"version": "3.1", "size": "8B"}
                }
            ]
            
            for model_data in sample_models:
                supabase_service.create_model(model_data)
            
            # Add sample benchmarks
            sample_benchmarks = [
                {
                    "name": "mme",
                    "modality": "vision-language",
                    "category": "comprehensive",
                    "task_type": "multimodal",
                    "primary_metrics": ["accuracy", "f1_score"],
                    "secondary_metrics": ["bleu_score", "rouge_score"],
                    "num_samples": 1000,
                    "description": "Multimodal Evaluation benchmark"
                },
                {
                    "name": "vqa",
                    "modality": "vision-language",
                    "category": "question_answering",
                    "task_type": "visual_qa",
                    "primary_metrics": ["accuracy"],
                    "secondary_metrics": ["exact_match"],
                    "num_samples": 500,
                    "description": "Visual Question Answering benchmark"
                },
                {
                    "name": "textvqa",
                    "modality": "vision-language",
                    "category": "text_understanding",
                    "task_type": "text_qa",
                    "primary_metrics": ["accuracy"],
                    "secondary_metrics": ["exact_match"],
                    "num_samples": 300,
                    "description": "Text-based Visual Question Answering"
                }
            ]
            
            for benchmark_data in sample_benchmarks:
                supabase_service.create_benchmark(benchmark_data)
            
            logger.info("Sample data populated successfully")
        
    except Exception as e:
        logger.error("Failed to populate sample data", error=str(e))

# Create FastAPI app
app = FastAPI(
    title="LMMS-Eval Dashboard API",
    description="Complete API for the LMMS-Eval Dashboard - Multimodal LLM Evaluation Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router)

# Include WebSocket router
app.include_router(websocket_router)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "LMMS-Eval Dashboard API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check if database is available
        db_available = getattr(app.state, 'database_available', False)
        
        if db_available:
            db_healthy = supabase_service.health_check()
        else:
            db_healthy = False
        
        return {
            "status": "healthy",
            "service": "LMMS-Eval Dashboard API",
            "version": "1.0.0",
            "database": "connected" if db_healthy else "disconnected",
            "mode": "full" if db_available else "limited",
            "features": {
                "evaluation": True,
                "real_time": db_available,
                "multimodal": True,
                "lmms_eval": True,
                "database": db_available
            }
        }
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Handle 404 errors."""
    return JSONResponse(
        status_code=404,
        content={"error": "Not found", "message": "The requested resource was not found"}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Handle 500 errors."""
    logger.error("Internal server error", error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "message": "An unexpected error occurred"}
    )

if __name__ == "__main__":
    logger.info("Starting LMMS-Eval Dashboard Backend (Complete Mode)")
    uvicorn.run(
        "main_complete:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
