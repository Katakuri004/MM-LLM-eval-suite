"""
Complete API endpoints for the LMMS-Eval Dashboard.
"""

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import structlog
import os
import shutil
import uuid
from pathlib import Path

from services.supabase_service import supabase_service
from services.evaluation_service import evaluation_service
from services.model_loader_service import model_loader_service
from services.task_discovery_service import task_discovery_service
from api.evaluation_endpoints import router as evaluation_router

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

# Model registration models
class HuggingFaceModelRequest(BaseModel):
    model_path: str
    auto_detect: bool = True

class LocalModelRequest(BaseModel):
    model_dir: str
    model_name: Optional[str] = None

class APIModelRequest(BaseModel):
    provider: str
    model_name: str
    api_key: str
    endpoint: Optional[str] = None

class VLLMModelRequest(BaseModel):
    endpoint_url: str
    model_name: str
    auth_token: Optional[str] = None

class BatchModelRequest(BaseModel):
    models_data: List[Dict[str, Any]]

class ModelValidationResponse(BaseModel):
    model_id: str
    status: str
    tests: Dict[str, Any]
    started_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None

# Create router
router = APIRouter(prefix="/api/v1", tags=["LMMS-Eval Dashboard"])

# Include evaluation router
router.include_router(evaluation_router, prefix="/evaluations", tags=["evaluations"])

# Health check
@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "LMMS-Eval Dashboard API"}

# Quick compatibility endpoint to ensure detection works even if another route shadows it
@router.get("/models/detect2")
async def detect_model_config_alt(model_source: str):
    """Alternate auto-detect endpoint (workaround for any path-matching issues)."""
    try:
        loading_method = model_loader_service.detect_loading_method(model_source)
        detection_info = {
            "source": model_source,
            "detected_method": loading_method,
            "suggested_config": {}
        }
        if loading_method == "huggingface":
            detection_info["suggested_config"] = {
                "auto_detect": True,
                "modality_support": ["text", "image", "video", "audio"]
            }
        elif loading_method == "local":
            detection_info["suggested_config"] = {
                "validation_required": True,
                "file_check": True
            }
        elif loading_method == "api":
            detection_info["suggested_config"] = {
                "api_key_required": True,
                "endpoint_test": True
            }
        elif loading_method == "vllm":
            detection_info["suggested_config"] = {
                "endpoint_test": True,
                "auth_optional": True
            }
        return detection_info
    except Exception as e:
        logger.error("Failed to detect model config (alt)", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to detect model: {str(e)}")

# Model endpoints
@router.get("/models")
async def get_models(
    request: Request,
    skip: int = 0,
    limit: int = 25,
    q: Optional[str] = None,
    family: Optional[str] = None,
    sort: Optional[str] = None,
    lean: bool = True,
):
    """Get models with pagination, filters, and lean payloads.

    Query params:
      - skip: offset (default 0)
      - limit: page size (default 25)
      - q: search term for name/family
      - family: filter by family (ilike)
      - sort: e.g. "created_at:desc" (default)
      - lean: omit heavy fields (metadata) for faster responses
    """
    try:
        # Check if database is available
        db_available = getattr(request.app.state, 'database_available', False)
        if not db_available:
            raise HTTPException(status_code=503, detail="Database not available. Use /models/fallback for sample data.")

        result = supabase_service.get_models(skip=skip, limit=limit, q=q, family=family, sort=sort, lean=lean)

        # Add lightweight caching headers to speed up dev reloads
        response = JSONResponse({
            "models": result["items"],
            "total": result["total"],
            "skip": skip,
            "limit": limit,
        })
        response.headers["Cache-Control"] = "public, max-age=10, stale-while-revalidate=60"
        return response
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

@router.post("/models/upload")
async def upload_model_files(
    request: Request,
    files: List[UploadFile] = File(...),
    model_name: str = Form(...),
    model_family: str = Form(...),
    model_dtype: str = Form("float16"),
    num_parameters: int = Form(0),
    notes: Optional[str] = Form(None),
    selected_benchmarks: Optional[str] = Form(None)
):
    """Upload model files and create model entry."""
    try:
        # Check if database is available
        db_available = getattr(request.app.state, 'database_available', False)
        if not db_available:
            raise HTTPException(status_code=503, detail="Database not available. Cannot upload models in limited mode.")
        
        # Create upload directory
        upload_dir = Path("uploads") / "models" / str(uuid.uuid4())
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        uploaded_files = []
        total_size = 0
        
        # Save uploaded files
        for file in files:
            if not file.filename:
                continue
                
            file_path = upload_dir / file.filename
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
                total_size += len(content)
                uploaded_files.append({
                    "filename": file.filename,
                    "path": str(file_path),
                    "size": len(content)
                })
        
        # Parse selected benchmarks
        benchmark_ids = []
        if selected_benchmarks:
            try:
                import json
                benchmark_ids = json.loads(selected_benchmarks)
            except:
                pass
        
        # Create model entry
        model_data = {
            "name": model_name,
            "family": model_family,
            "source": f"local://{upload_dir}",
            "dtype": model_dtype,
            "num_parameters": num_parameters,
            "notes": notes,
            "metadata": {
                "uploaded_files": uploaded_files,
                "total_size": total_size,
                "selected_benchmarks": benchmark_ids,
                "upload_id": str(upload_dir.name)
            }
        }
        
        model = supabase_service.create_model(model_data)
        
        return {
            "model": model,
            "uploaded_files": uploaded_files,
            "total_size": total_size,
            "upload_path": str(upload_dir)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to upload model files", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to upload model files")

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
        benchmark = supabase_service.create_benchmark(benchmark_data.dict())
        return benchmark
    except Exception as e:
        logger.error("Failed to create benchmark", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create benchmark")

# Evaluation endpoints are handled by the imported evaluation_router

# All evaluation endpoints are handled by the imported evaluation_router

# Active evaluations endpoint is handled by the imported evaluation_router

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

# Model Registration Endpoints

@router.post("/models/register/huggingface")
async def register_huggingface_model(request: Request, model_request: HuggingFaceModelRequest):
    """Register a model from Hugging Face Hub."""
    try:
        # Check if database is available
        db_available = getattr(request.app.state, 'database_available', False)
        if not db_available:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Load model from HuggingFace
        model_metadata = model_loader_service.load_from_huggingface(
            model_request.model_path,
            model_request.auto_detect
        )
        
        # Save to database
        model = supabase_service.create_model(model_metadata)
        
        return {
            "message": "Model registered successfully",
            "model": model,
            "loading_method": "huggingface"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Friendly duplicate handling for unique name constraint
        msg = str(e)
        if 'duplicate key value' in msg or 'already exists' in msg or 'models_name_key' in msg:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "MODEL_NAME_TAKEN",
                    "message": "A model with this name already exists. Choose a different name or update the existing model.",
                    "conflict_field": "name"
                }
            )
        logger.error("Failed to register HuggingFace model", error=msg)
        raise HTTPException(status_code=500, detail=f"Failed to register model: {msg}")

@router.post("/models/register/local")
async def register_local_model(request: Request, model_request: LocalModelRequest):
    """Register a model from local filesystem."""
    try:
        # Check if database is available
        db_available = getattr(request.app.state, 'database_available', False)
        if not db_available:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Load model from local filesystem
        model_metadata = model_loader_service.load_from_local(model_request.model_dir)
        
        # Override name if provided
        if model_request.model_name:
            model_metadata['name'] = model_request.model_name
        
        # Save to database
        model = supabase_service.create_model(model_metadata)
        
        return {
            "message": "Model registered successfully",
            "model": model,
            "loading_method": "local"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        msg = str(e)
        if 'duplicate key value' in msg or 'already exists' in msg or 'models_name_key' in msg:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "MODEL_NAME_TAKEN",
                    "message": "A model with this name already exists. Choose a different name or update the existing model.",
                    "conflict_field": "name"
                }
            )
        logger.error("Failed to register local model", error=msg)
        raise HTTPException(status_code=500, detail=f"Failed to register model: {msg}")

@router.post("/models/register/api")
async def register_api_model(request: Request, model_request: APIModelRequest):
    """Register an API-based model (OpenAI, Anthropic, etc.)."""
    try:
        # Check if database is available
        db_available = getattr(request.app.state, 'database_available', False)
        if not db_available:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Register API model
        model_metadata = model_loader_service.register_api_model(
            model_request.provider,
            model_request.model_name,
            model_request.api_key,
            model_request.endpoint
        )
        
        # Save to database
        model = supabase_service.create_model(model_metadata)
        
        return {
            "message": "API model registered successfully",
            "model": model,
            "loading_method": "api"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        msg = str(e)
        if 'duplicate key value' in msg or 'already exists' in msg or 'models_name_key' in msg:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "MODEL_NAME_TAKEN",
                    "message": "A model with this name already exists. Choose a different name or update the existing model.",
                    "conflict_field": "name"
                }
            )
        logger.error("Failed to register API model", error=msg)
        raise HTTPException(status_code=500, detail=f"Failed to register model: {msg}")

@router.post("/models/register/vllm")
async def register_vllm_model(request: Request, model_request: VLLMModelRequest):
    """Register a vLLM-served model endpoint."""
    try:
        # Check if database is available
        db_available = getattr(request.app.state, 'database_available', False)
        if not db_available:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Register vLLM model
        model_metadata = model_loader_service.register_vllm_endpoint(
            model_request.endpoint_url,
            model_request.model_name,
            model_request.auth_token
        )
        
        # Save to database
        model = supabase_service.create_model(model_metadata)
        
        return {
            "message": "vLLM model registered successfully",
            "model": model,
            "loading_method": "vllm"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        msg = str(e)
        if 'duplicate key value' in msg or 'already exists' in msg or 'models_name_key' in msg:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "MODEL_NAME_TAKEN",
                    "message": "A model with this name already exists. Choose a different name or update the existing model.",
                    "conflict_field": "name"
                }
            )
        logger.error("Failed to register vLLM model", error=msg)
        raise HTTPException(status_code=500, detail=f"Failed to register model: {msg}")

@router.post("/models/register/batch")
async def register_batch_models(request: Request, batch_request: BatchModelRequest):
    """Register multiple models in batch."""
    try:
        # Check if database is available
        db_available = getattr(request.app.state, 'database_available', False)
        if not db_available:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Register models in batch
        results = model_loader_service.batch_register_models(batch_request.models_data)
        
        return {
            "message": "Batch registration completed",
            "results": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to register batch models", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to register models: {str(e)}")

@router.post("/models/upload")
async def upload_model_files(
    request: Request,
    model_name: str = Form(...),
    model_family: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """Upload model files and register the model."""
    try:
        # Check if database is available
        db_available = getattr(request.app.state, 'database_available', False)
        if not db_available:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Create upload directory
        upload_dir = Path("backend/uploads/models") / model_name
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Save uploaded files
        for file in files:
            file_path = upload_dir / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        
        # Register as local model
        model_metadata = model_loader_service.load_from_local(str(upload_dir))
        model_metadata['name'] = model_name
        model_metadata['family'] = model_family
        
        # Save to database
        model = supabase_service.create_model(model_metadata)
        
        return {
            "message": "Model files uploaded and registered successfully",
            "model": model,
            "upload_path": str(upload_dir)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to upload model files", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to upload model: {str(e)}")

@router.get("/models/detect")
async def detect_model_config(model_source: str):
    """Auto-detect model configuration from source."""
    try:
        # Detect loading method
        loading_method = model_loader_service.detect_loading_method(model_source)
        
        # Get additional info based on method
        detection_info = {
            "source": model_source,
            "detected_method": loading_method,
            "suggested_config": {}
        }
        
        if loading_method == "huggingface":
            detection_info["suggested_config"] = {
                "auto_detect": True,
                "modality_support": ["text", "image", "video", "audio"]
            }
        elif loading_method == "local":
            detection_info["suggested_config"] = {
                "validation_required": True,
                "file_check": True
            }
        elif loading_method == "api":
            detection_info["suggested_config"] = {
                "api_key_required": True,
                "endpoint_test": True
            }
        elif loading_method == "vllm":
            detection_info["suggested_config"] = {
                "endpoint_test": True,
                "auth_optional": True
            }
        
        return detection_info
        
    except Exception as e:
        logger.error("Failed to detect model config", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to detect model: {str(e)}")

@router.get("/models/validate/{model_id}")
async def validate_model(model_id: str):
    """Validate model accessibility and functionality."""
    try:
        # Validate model
        validation_results = model_loader_service.validate_model(model_id)
        
        return ModelValidationResponse(**validation_results)
        
    except Exception as e:
        logger.error("Failed to validate model", model_id=model_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to validate model: {str(e)}")

@router.get("/models/{model_id}/variants")
async def get_model_variants(model_id: str):
    """Get model variants/checkpoints."""
    try:
        # This would query the model_variants table
        # For now, return empty list
        return {
            "model_id": model_id,
            "variants": []
        }
        
    except Exception as e:
        logger.error("Failed to get model variants", model_id=model_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get model variants")


# Task Management Endpoints
@router.get("/tasks/available")
async def get_available_tasks():
    """Get all available lmms-eval tasks."""
    try:
        tasks = await task_discovery_service.get_available_tasks()
        return {
            "tasks": tasks,
            "count": len(tasks)
        }
    except Exception as e:
        logger.error("Failed to get available tasks", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get available tasks")


@router.post("/tasks/refresh")
async def refresh_task_cache():
    """Force refresh the task cache."""
    try:
        tasks = await task_discovery_service.refresh_task_cache()
        return {
            "message": "Task cache refreshed successfully",
            "tasks": tasks,
            "count": len(tasks)
        }
    except Exception as e:
        logger.error("Failed to refresh task cache", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to refresh task cache")


@router.get("/tasks/compatible/{model_id}")
async def get_compatible_tasks_for_model(model_id: str):
    """Get tasks compatible with a specific model."""
    try:
        # Check if model exists
        model = supabase_service.get_model_by_id(model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        compatible_tasks = await task_discovery_service.get_compatible_tasks_for_model(model_id)
        return {
            "model_id": model_id,
            "compatible_tasks": compatible_tasks,
            "count": len(compatible_tasks)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get compatible tasks", model_id=model_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get compatible tasks")


@router.post("/tasks/validate")
async def validate_tasks(request: Dict[str, List[str]]):
    """Validate that task names exist in lmms-eval."""
    try:
        task_names = request.get("task_names", [])
        if not task_names:
            raise HTTPException(status_code=400, detail="No task names provided")
        
        validation_results = await task_discovery_service.validate_tasks(task_names)
        
        valid_tasks = [task for task, is_valid in validation_results.items() if is_valid]
        invalid_tasks = [task for task, is_valid in validation_results.items() if not is_valid]
        
        return {
            "validation_results": validation_results,
            "valid_tasks": valid_tasks,
            "invalid_tasks": invalid_tasks,
            "valid_count": len(valid_tasks),
            "invalid_count": len(invalid_tasks)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to validate tasks", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to validate tasks")


# ============================================================================
# DEPENDENCY MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/models/{model_id}/dependencies")
async def check_model_dependencies(model_id: str):
    """Check if model dependencies are installed."""
    try:
        from services.model_dependency_service import model_dependency_service
        from services.production_evaluation_orchestrator import production_orchestrator
        
        # Check if model exists
        model = supabase_service.get_model_by_id(model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        # Map model to lmms-eval name
        model_name = production_orchestrator._map_model_name(model)
        
        # Get dependency status with enhanced caching
        status = model_dependency_service.get_enhanced_dependency_status(model_name)
        
        return {
            "model_id": model_id,
            "model_name": model_name,
            "display_name": model['name'],
            "required_dependencies": status['required_dependencies'],
            "missing_dependencies": status['missing_dependencies'],
            "all_installed": status['all_installed'],
            "install_command": status['install_command'],
            "total_required": status['total_required'],
            "total_missing": status['total_missing']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to check model dependencies", model_id=model_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to check model dependencies")


@router.get("/dependencies/check")
async def check_all_dependencies():
    """Check dependencies for all models."""
    try:
        from services.model_dependency_service import model_dependency_service
        from services.production_evaluation_orchestrator import production_orchestrator
        
        # Get all models
        models_response = supabase_service.get_models(limit=1000)
        models = models_response.get('items', [])
        
        dependency_status = []
        for model in models:
            try:
                model_name = production_orchestrator._map_model_name(model)
                status = model_dependency_service.get_dependency_status(model_name)
                
                dependency_status.append({
                    "model_id": model['id'],
                    "model_name": model_name,
                    "display_name": model['name'],
                    "missing_dependencies": status['missing_dependencies'],
                    "all_installed": status['all_installed'],
                    "install_command": status['install_command']
                })
            except Exception as e:
                logger.warning("Failed to check dependencies for model", 
                             model_id=model['id'], 
                             model_name=model['name'], 
                             error=str(e))
                dependency_status.append({
                    "model_id": model['id'],
                    "model_name": "unknown",
                    "display_name": model['name'],
                    "missing_dependencies": [],
                    "all_installed": False,
                    "install_command": None,
                    "error": str(e)
                })
        
        return {
            "dependency_status": dependency_status,
            "total_models": len(models),
            "models_with_missing_deps": len([s for s in dependency_status if not s['all_installed']])
        }
        
    except Exception as e:
        logger.error("Failed to check all dependencies", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to check dependencies")


@router.post("/dependencies/refresh")
async def refresh_dependency_cache():
    """Refresh the dependency cache."""
    try:
        from services.model_dependency_service import model_dependency_service
        
        model_dependency_service.clear_cache()
        
        from datetime import datetime
        return {
            "message": "Dependency cache refreshed successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to refresh dependency cache", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to refresh dependency cache")


# ============================================================================
# MODEL-TASK COMPATIBILITY ENDPOINTS
# ============================================================================

@router.get("/models/{model_id}/compatible-tasks")
async def get_compatible_tasks(model_id: str):
    """Get tasks compatible with a specific model."""
    try:
        from services.model_task_compatibility import model_task_compatibility
        from services.task_discovery_service import task_discovery_service
        from services.production_evaluation_orchestrator import production_orchestrator
        
        # Get model
        model = supabase_service.get_model_by_id(model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        # Map model name
        model_name = production_orchestrator._map_model_name(model)
        
        # Get available tasks
        available_tasks = await task_discovery_service.get_available_tasks()
        
        # Get compatible tasks
        compatible_tasks = model_task_compatibility.get_compatible_tasks(model_name, available_tasks)
        
        # Get compatibility report
        compatibility_report = model_task_compatibility.get_compatibility_report(model_name, available_tasks)
        
        return {
            "model_id": model_id,
            "model_name": model_name,
            "compatible_tasks": compatible_tasks,
            "compatibility_report": compatibility_report
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get compatible tasks", model_id=model_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get compatible tasks")


@router.get("/models/{model_id}/compatibility-check")
async def check_model_compatibility(model_id: str, task_names: str = None):
    """Check compatibility between a model and specific tasks."""
    try:
        from services.model_task_compatibility import model_task_compatibility
        from services.production_evaluation_orchestrator import production_orchestrator
        
        # Get model
        model = supabase_service.get_model_by_id(model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        # Map model name
        model_name = production_orchestrator._map_model_name(model)
        
        # Parse task names
        if task_names:
            tasks_to_check = [t.strip() for t in task_names.split(',')]
        else:
            tasks_to_check = []
        
        # Check compatibility
        compatibility_results = {}
        for task in tasks_to_check:
            is_compatible = model_task_compatibility.is_compatible(model_name, task)
            model_caps = model_task_compatibility.get_model_capabilities(model_name)
            task_reqs = model_task_compatibility.get_task_requirements(task)
            
            compatibility_results[task] = {
                "compatible": is_compatible,
                "model_capabilities": list(model_caps),
                "task_requirements": list(task_reqs),
                "missing_capabilities": list(task_reqs - model_caps) if not is_compatible else []
            }
        
        return {
            "model_id": model_id,
            "model_name": model_name,
            "compatibility_results": compatibility_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to check model compatibility", model_id=model_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to check model compatibility")
