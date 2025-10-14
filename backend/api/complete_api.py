"""
Complete API endpoints for the LMMS-Eval Dashboard.
"""

from fastapi import APIRouter, HTTPException, Request
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import structlog

from services.supabase_service import supabase_service
from services.evaluation_service import evaluation_service

logger = structlog.get_logger(__name__)

# Pydantic models for request/response
class ModelCreate(BaseModel):
    name: str
    family: str
    source: str
    dtype: str
    num_parameters: int
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class BenchmarkCreate(BaseModel):
    name: str
    modality: str
    category: str
    task_type: str
    primary_metrics: List[str]
    secondary_metrics: List[str]
    num_samples: int
    description: Optional[str] = None

class EvaluationRequest(BaseModel):
    model_id: str
    benchmark_ids: List[str]
    config: Dict[str, Any]
    run_name: Optional[str] = None

class EvaluationResponse(BaseModel):
    run_id: str
    status: str
    message: str

# Create router
router = APIRouter(prefix="/api/v1", tags=["LMMS-Eval Dashboard"])

# Health check
@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "LMMS-Eval Dashboard API"}

# Model endpoints
@router.get("/models")
async def get_models(request: Request, skip: int = 0, limit: int = 100):
    """Get all models."""
    try:
        # Check if database is available
        db_available = getattr(request.app.state, 'database_available', False)
        if not db_available:
            raise HTTPException(status_code=503, detail="Database not available. Use /models/fallback for sample data.")
        
        models = supabase_service.get_models(skip=skip, limit=limit)
        return {
            "models": models,
            "total": len(models)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get models", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get models")

@router.get("/models/{model_id}")
async def get_model(model_id: str):
    """Get model by ID."""
    try:
        model = supabase_service.get_model_by_id(model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        return model
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get model", model_id=model_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get model")

@router.post("/models")
async def create_model(request: Request, model_data: ModelCreate):
    """Create a new model."""
    try:
        # Check if database is available
        db_available = getattr(request.app.state, 'database_available', False)
        if not db_available:
            raise HTTPException(status_code=503, detail="Database not available. Cannot create models in limited mode.")
        
        model = supabase_service.create_model(model_data.dict())
        return model
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to create model", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create model")

# Benchmark endpoints
@router.get("/benchmarks")
async def get_benchmarks(request: Request, skip: int = 0, limit: int = 100):
    """Get all benchmarks."""
    try:
        # Check if database is available
        db_available = getattr(request.app.state, 'database_available', False)
        if not db_available:
            raise HTTPException(status_code=503, detail="Database not available. Use /benchmarks/fallback for sample data.")
        
        benchmarks = supabase_service.get_benchmarks(skip=skip, limit=limit)
        return {
            "benchmarks": benchmarks,
            "total": len(benchmarks)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get benchmarks", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get benchmarks")

@router.get("/benchmarks/{benchmark_id}")
async def get_benchmark(benchmark_id: str):
    """Get benchmark by ID."""
    try:
        benchmark = supabase_service.get_benchmark_by_id(benchmark_id)
        if not benchmark:
            raise HTTPException(status_code=404, detail="Benchmark not found")
        return benchmark
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get benchmark", benchmark_id=benchmark_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get benchmark")

@router.post("/benchmarks")
async def create_benchmark(benchmark_data: BenchmarkCreate):
    """Create a new benchmark."""
    try:
        benchmark = db_service.create_benchmark(benchmark_data.dict())
        return benchmark.to_dict()
    except Exception as e:
        logger.error("Failed to create benchmark", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create benchmark")

# Evaluation endpoints
@router.post("/evaluations", response_model=EvaluationResponse)
async def create_evaluation(evaluation_data: EvaluationRequest):
    """Start a new evaluation."""
    try:
        run_id = await evaluation_service.start_evaluation(
            model_id=evaluation_data.model_id,
            benchmark_ids=evaluation_data.benchmark_ids,
            config=evaluation_data.config,
            run_name=evaluation_data.run_name
        )
        
        return EvaluationResponse(
            run_id=run_id,
            status="started",
            message="Evaluation started successfully"
        )
    except Exception as e:
        logger.error("Failed to start evaluation", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to start evaluation")

@router.get("/evaluations")
async def get_evaluations(skip: int = 0, limit: int = 100):
    """Get all evaluations."""
    try:
        runs = db_service.get_runs(skip=skip, limit=limit)
        return {
            "evaluations": [run.to_dict() for run in runs],
            "total": len(runs)
        }
    except Exception as e:
        logger.error("Failed to get evaluations", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get evaluations")

@router.get("/evaluations/{run_id}")
async def get_evaluation(run_id: str):
    """Get evaluation by ID."""
    try:
        run = db_service.get_run_by_id(run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        return run.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get evaluation", run_id=run_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get evaluation")

@router.get("/evaluations/{run_id}/status")
async def get_evaluation_status(run_id: str):
    """Get evaluation status."""
    try:
        status = await evaluation_service.get_run_status(run_id)
        if not status:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        return status
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get evaluation status", run_id=run_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get evaluation status")

@router.get("/evaluations/{run_id}/results")
async def get_evaluation_results(run_id: str):
    """Get evaluation results."""
    try:
        results = await evaluation_service.get_run_results(run_id)
        if not results:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get evaluation results", run_id=run_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get evaluation results")

@router.delete("/evaluations/{run_id}")
async def cancel_evaluation(run_id: str):
    """Cancel an active evaluation."""
    try:
        success = await evaluation_service.cancel_run(run_id)
        if not success:
            raise HTTPException(status_code=404, detail="Evaluation not found or not active")
        return {"message": "Evaluation cancelled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to cancel evaluation", run_id=run_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to cancel evaluation")

# Active runs endpoint
@router.get("/evaluations/active")
async def get_active_evaluations():
    """Get active evaluations."""
    try:
        active_runs = await evaluation_service.get_active_runs()
        return {"active_runs": active_runs}
    except Exception as e:
        logger.error("Failed to get active evaluations", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get active evaluations")

# Statistics endpoints
@router.get("/stats/overview")
async def get_overview_stats(request: Request):
    """Get overview statistics."""
    try:
        # Check if database is available
        db_available = getattr(request.app.state, 'database_available', False)
        if not db_available:
            raise HTTPException(status_code=503, detail="Database not available. Use /stats/fallback for sample data.")
        
        # Get basic counts
        models = supabase_service.get_models(limit=1000)
        benchmarks = supabase_service.get_benchmarks(limit=1000)
        runs = supabase_service.get_runs(limit=1000)
        
        # Calculate stats
        total_models = len(models)
        total_benchmarks = len(benchmarks)
        total_runs = len(runs)
        
        # Count by status
        status_counts = {}
        for run in runs:
            status = run.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "total_models": total_models,
            "total_benchmarks": total_benchmarks,
            "total_runs": total_runs,
            "status_counts": status_counts,
            "active_runs": len(await evaluation_service.get_active_runs())
        }
    except Exception as e:
        logger.error("Failed to get overview stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get overview statistics")

# Fallback endpoints for when database is not available
@router.get("/models/fallback")
async def get_models_fallback():
    """Get sample models when database is not available."""
    try:
        return {
            "models": [
                {
                    "id": "llava-sample",
                    "name": "llava",
                    "family": "LLaVA",
                    "source": "huggingface",
                    "dtype": "float16",
                    "num_parameters": 7000000000,
                    "notes": "LLaVA-1.5-7B model (sample data)",
                    "metadata": {"version": "1.5", "size": "7B"},
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                },
                {
                    "id": "qwen2-vl-sample",
                    "name": "qwen2-vl",
                    "family": "Qwen2-VL",
                    "source": "huggingface",
                    "dtype": "float16",
                    "num_parameters": 14000000000,
                    "notes": "Qwen2-VL-14B model (sample data)",
                    "metadata": {"version": "2.0", "size": "14B"},
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                }
            ],
            "total": 2
        }
    except Exception as e:
        logger.error("Failed to get fallback models", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get fallback models")

@router.get("/benchmarks/fallback")
async def get_benchmarks_fallback():
    """Get sample benchmarks when database is not available."""
    return {
        "benchmarks": [
            {
                "id": "mme-sample",
                "name": "mme",
                "modality": "vision-language",
                "category": "comprehensive",
                "task_type": "multimodal",
                "primary_metrics": ["accuracy", "f1_score"],
                "secondary_metrics": ["bleu_score", "rouge_score"],
                "num_samples": 1000,
                "description": "Multimodal Evaluation benchmark (sample data)",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "vqa-sample",
                "name": "vqa",
                "modality": "vision-language",
                "category": "question_answering",
                "task_type": "visual_qa",
                "primary_metrics": ["accuracy"],
                "secondary_metrics": ["exact_match"],
                "num_samples": 500,
                "description": "Visual Question Answering benchmark (sample data)",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        ],
        "total": 2
    }

@router.get("/stats/fallback")
async def get_stats_fallback():
    """Get sample stats when database is not available."""
    return {
        "total_models": 2,
        "total_benchmarks": 2,
        "total_runs": 0,
        "status_counts": {},
        "recent_runs": [],
        "mode": "fallback"
    }
