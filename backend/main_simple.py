"""
Simple main.py for LMMS-Eval Dashboard without database dependencies.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import structlog

# Configure structured logging
logger = structlog.get_logger(__name__)

# Create FastAPI app
app = FastAPI(
    title="LMMS-Eval Dashboard API",
    description="API for the LMMS-Eval Dashboard - Multimodal LLM Evaluation Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "LMMS-Eval Dashboard API", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "LMMS-Eval Dashboard API",
        "version": "1.0.0"
    }

@app.get("/api/v1/models")
async def get_models():
    """Get available models."""
    # Return some sample models for now
    models = [
        {
            "id": "llava",
            "name": "LLaVA",
            "type": "vision-language",
            "description": "Large Language and Vision Assistant"
        },
        {
            "id": "qwen2-vl",
            "name": "Qwen2-VL",
            "type": "vision-language", 
            "description": "Qwen2 Vision Language Model"
        },
        {
            "id": "llama-vision",
            "name": "Llama Vision",
            "type": "vision-language",
            "description": "Llama with Vision capabilities"
        }
    ]
    return {"models": models}

@app.get("/api/v1/benchmarks")
async def get_benchmarks():
    """Get available benchmarks."""
    # Return some sample benchmarks
    benchmarks = [
        {
            "id": "mme",
            "name": "MME",
            "description": "Multimodal Evaluation",
            "type": "vision-language"
        },
        {
            "id": "vqa",
            "name": "VQA",
            "description": "Visual Question Answering",
            "type": "vision-language"
        },
        {
            "id": "textvqa",
            "name": "TextVQA",
            "description": "Text-based Visual Question Answering",
            "type": "vision-language"
        }
    ]
    return {"benchmarks": benchmarks}

@app.post("/api/v1/evaluations")
async def create_evaluation(evaluation_data: dict):
    """Create a new evaluation."""
    try:
        # For now, just return a mock response
        evaluation_id = f"eval_{hash(str(evaluation_data)) % 10000}"
        
        return {
            "id": evaluation_id,
            "status": "created",
            "message": "Evaluation created successfully",
            "data": evaluation_data
        }
    except Exception as e:
        logger.error("Failed to create evaluation", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create evaluation")

@app.get("/api/v1/evaluations/{evaluation_id}")
async def get_evaluation(evaluation_id: str):
    """Get evaluation status."""
    # Mock response for now
    return {
        "id": evaluation_id,
        "status": "running",
        "progress": 45,
        "message": "Evaluation in progress"
    }

@app.get("/api/v1/evaluations")
async def list_evaluations():
    """List all evaluations."""
    # Mock response for now
    evaluations = [
        {
            "id": "eval_001",
            "model": "llava",
            "benchmark": "mme",
            "status": "completed",
            "created_at": "2025-10-14T17:00:00Z"
        },
        {
            "id": "eval_002", 
            "model": "qwen2-vl",
            "benchmark": "vqa",
            "status": "running",
            "created_at": "2025-10-14T17:30:00Z"
        }
    ]
    return {"evaluations": evaluations}

if __name__ == "__main__":
    logger.info("Starting LMMS-Eval Dashboard API (Simple Mode)")
    uvicorn.run(
        "main_simple:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
