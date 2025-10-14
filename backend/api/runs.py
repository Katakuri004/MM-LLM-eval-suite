"""
Run management API endpoints.

This module provides endpoints for creating, monitoring, and managing
evaluation runs in the LMMS-Eval Dashboard.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
import structlog
from datetime import datetime

from auth import get_current_user, require_permission
from database import get_database, DatabaseManager
from services.run_service import RunService
from runners.lmms_eval_runner import LMMSEvalRunner
from runners.gpu_scheduler import GPUScheduler

# Configure structured logging
logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models for request/response
class RunCreateRequest(BaseModel):
    """Request model for creating a new run."""
    name: str = Field(..., min_length=1, max_length=255, description="Run name")
    model_id: str = Field(..., description="Model ID")
    benchmark_ids: List[str] = Field(..., min_items=1, description="List of benchmark IDs")
    checkpoint_variant: str = Field(default="latest", description="Checkpoint variant")
    config: Dict[str, Any] = Field(default_factory=dict, description="Run configuration")


class RunResponse(BaseModel):
    """Response model for run data."""
    id: str
    name: str
    model_id: str
    status: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_tasks: int
    completed_tasks: int
    progress_percent: float
    error_message: Optional[str] = None
    config: Dict[str, Any]


class RunListResponse(BaseModel):
    """Response model for run list."""
    runs: List[RunResponse]
    total: int
    page: int
    page_size: int


class RunCreateResponse(BaseModel):
    """Response model for run creation."""
    run_id: str
    total_tasks: int
    estimated_duration_seconds: int


# Initialize services
run_service = RunService()
gpu_scheduler = GPUScheduler()


@router.post("/runs/create", response_model=RunCreateResponse)
async def create_run(
    request: RunCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    Create a new evaluation run.
    
    Args:
        request: Run creation request
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        RunCreateResponse: Created run information
        
    Raises:
        HTTPException: If run creation fails
    """
    try:
        logger.info(
            "Creating new run",
            user_id=current_user["id"],
            run_name=request.name,
            model_id=request.model_id,
            benchmark_count=len(request.benchmark_ids)
        )
        
        # Validate model exists
        model = await db.get_model_by_id(request.model_id)
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        # Validate benchmarks exist
        for benchmark_id in request.benchmark_ids:
            benchmark_result = await db.execute_query(
                table="benchmarks",
                operation="select",
                filters={"id": benchmark_id}
            )
            if not benchmark_result["success"] or not benchmark_result["data"]:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Benchmark {benchmark_id} not found"
                )
        
        # Create run in database
        run_id = await db.create_run(
            name=request.name,
            model_id=request.model_id,
            benchmark_ids=request.benchmark_ids,
            config=request.config,
            user_id=current_user["id"]
        )
        
        if not run_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create run"
            )
        
        # Calculate estimated duration (simplified)
        estimated_duration = len(request.benchmark_ids) * 3600  # 1 hour per benchmark
        
        logger.info(
            "Run created successfully",
            run_id=run_id,
            user_id=current_user["id"]
        )
        
        return RunCreateResponse(
            run_id=run_id,
            total_tasks=len(request.benchmark_ids),
            estimated_duration_seconds=estimated_duration
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to create run",
            error=str(e),
            user_id=current_user["id"],
            run_name=request.name
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/runs/{run_id}", response_model=RunResponse)
async def get_run(
    run_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    Get run details by ID.
    
    Args:
        run_id: Run ID
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        RunResponse: Run details
        
    Raises:
        HTTPException: If run not found or access denied
    """
    try:
        # Check user has permission to view this run
        await require_permission(
            current_user["id"], "run", run_id, "read"
        )
        
        # Get run from database
        run = await db.get_run_by_id(run_id)
        if not run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Run not found"
            )
        
        # Calculate progress percentage
        progress_percent = (
            (run["completed_tasks"] / run["total_tasks"]) * 100
            if run["total_tasks"] > 0 else 0
        )
        
        return RunResponse(
            id=run["id"],
            name=run["name"],
            model_id=run["model_id"],
            status=run["status"],
            created_at=run["created_at"],
            started_at=run.get("started_at"),
            completed_at=run.get("completed_at"),
            total_tasks=run["total_tasks"],
            completed_tasks=run["completed_tasks"],
            progress_percent=progress_percent,
            error_message=run.get("error_message"),
            config=run.get("config", {})
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get run",
            error=str(e),
            run_id=run_id,
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/runs", response_model=RunListResponse)
async def list_runs(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    model_id: Optional[str] = Query(None, description="Filter by model ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of runs to return"),
    offset: int = Query(0, ge=0, description="Number of runs to skip"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    List runs with optional filtering.
    
    Args:
        status_filter: Filter by run status
        model_id: Filter by model ID
        limit: Maximum number of runs to return
        offset: Number of runs to skip
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        RunListResponse: List of runs with pagination
    """
    try:
        # Build filters
        filters = {"created_by": current_user["id"]}
        if status_filter:
            filters["status"] = status_filter
        if model_id:
            filters["model_id"] = model_id
        
        # Get runs from database
        result = await db.execute_query(
            table="runs",
            operation="select",
            filters=filters
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve runs"
            )
        
        runs_data = result["data"]
        total_runs = len(runs_data)
        
        # Apply pagination
        paginated_runs = runs_data[offset:offset + limit]
        
        # Convert to response models
        runs = []
        for run_data in paginated_runs:
            progress_percent = (
                (run_data["completed_tasks"] / run_data["total_tasks"]) * 100
                if run_data["total_tasks"] > 0 else 0
            )
            
            runs.append(RunResponse(
                id=run_data["id"],
                name=run_data["name"],
                model_id=run_data["model_id"],
                status=run_data["status"],
                created_at=run_data["created_at"],
                started_at=run_data.get("started_at"),
                completed_at=run_data.get("completed_at"),
                total_tasks=run_data["total_tasks"],
                completed_tasks=run_data["completed_tasks"],
                progress_percent=progress_percent,
                error_message=run_data.get("error_message"),
                config=run_data.get("config", {})
            ))
        
        return RunListResponse(
            runs=runs,
            total=total_runs,
            page=offset // limit + 1,
            page_size=limit
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to list runs",
            error=str(e),
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/runs/{run_id}/cancel")
async def cancel_run(
    run_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    Cancel a running evaluation.
    
    Args:
        run_id: Run ID to cancel
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        Dict: Cancellation status
        
    Raises:
        HTTPException: If cancellation fails
    """
    try:
        # Check user has permission to cancel this run
        await require_permission(
            current_user["id"], "run", run_id, "write"
        )
        
        # Get run details
        run = await db.get_run_by_id(run_id)
        if not run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Run not found"
            )
        
        # Check if run can be cancelled
        if run["status"] not in ["pending", "queued", "running"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel run with status: {run['status']}"
            )
        
        # Update run status
        success = await db.update_run_status(
            run_id=run_id,
            status="cancelled",
            error_message="Cancelled by user"
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel run"
            )
        
        # TODO: Stop the actual running process if it's currently running
        # This would involve finding the process and terminating it
        
        logger.info(
            "Run cancelled successfully",
            run_id=run_id,
            user_id=current_user["id"]
        )
        
        return {"status": "cancelled", "run_id": run_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to cancel run",
            error=str(e),
            run_id=run_id,
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/runs/{run_id}/metrics")
async def get_run_metrics(
    run_id: str,
    benchmark_id: Optional[str] = Query(None, description="Filter by benchmark ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    Get metrics for a specific run.
    
    Args:
        run_id: Run ID
        benchmark_id: Optional benchmark ID filter
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        Dict: Run metrics data
    """
    try:
        # Check user has permission to view this run
        await require_permission(
            current_user["id"], "run", run_id, "read"
        )
        
        # Build filters
        filters = {"run_id": run_id}
        if benchmark_id:
            filters["benchmark_id"] = benchmark_id
        
        # Get metrics from database
        result = await db.execute_query(
            table="run_metrics",
            operation="select",
            filters=filters
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve metrics"
            )
        
        return {
            "run_id": run_id,
            "metrics": result["data"],
            "count": result["count"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get run metrics",
            error=str(e),
            run_id=run_id,
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
