"""
Slices and fairness analysis API endpoints.

This module provides endpoints for managing slices and performing
fairness analysis in the LMMS-Eval Dashboard.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
import structlog

from auth import get_current_user
from database import get_database, DatabaseManager
from services.metric_service import MetricService

# Configure structured logging
logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models for request/response
class SliceResponse(BaseModel):
    """Response model for slice data."""
    id: str
    name: str
    slice_type: str
    slice_value: str
    associated_benchmarks: List[str]
    description: str


class SliceListResponse(BaseModel):
    """Response model for slice list."""
    slices: List[SliceResponse]
    total: int


class SliceMetricsResponse(BaseModel):
    """Response model for slice metrics."""
    slice: str
    metrics: List[Dict[str, Any]]


# Initialize services
metric_service = MetricService()


@router.get("/slices", response_model=SliceListResponse)
async def list_slices(
    slice_type: Optional[str] = Query(None, description="Filter by slice type"),
    limit: int = Query(50, ge=1, le=100, description="Number of slices to return"),
    offset: int = Query(0, ge=0, description="Number of slices to skip"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    List all available slices.
    
    Args:
        slice_type: Filter by slice type
        limit: Maximum number of slices to return
        offset: Number of slices to skip
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        SliceListResponse: List of slices
    """
    try:
        # Build filters
        filters = {}
        if slice_type:
            filters["slice_type"] = slice_type
        
        # Get slices from database
        result = await db.execute_query(
            table="slices",
            operation="select",
            filters=filters
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve slices"
            )
        
        slices_data = result["data"]
        total_slices = len(slices_data)
        
        # Apply pagination
        paginated_slices = slices_data[offset:offset + limit]
        
        # Convert to response models
        slices = []
        for slice_data in paginated_slices:
            slices.append(SliceResponse(
                id=slice_data["id"],
                name=slice_data["name"],
                slice_type=slice_data["slice_type"],
                slice_value=slice_data["slice_value"],
                associated_benchmarks=slice_data["associated_benchmarks"],
                description=slice_data["description"]
            ))
        
        return SliceListResponse(
            slices=slices,
            total=total_slices
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to list slices",
            error=str(e),
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/slices/{slice_id}/metrics", response_model=SliceMetricsResponse)
async def get_slice_metrics(
    slice_id: str,
    benchmark_id: Optional[str] = Query(None, description="Filter by benchmark ID"),
    limit: int = Query(50, ge=1, le=100, description="Number of metrics to return"),
    offset: int = Query(0, ge=0, description="Number of metrics to skip"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    Get metrics for a specific slice.
    
    Args:
        slice_id: Slice ID
        benchmark_id: Optional benchmark ID filter
        limit: Maximum number of metrics to return
        offset: Number of metrics to skip
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        SliceMetricsResponse: Slice metrics data
        
    Raises:
        HTTPException: If slice not found
    """
    try:
        # Verify slice exists
        slice_result = await db.execute_query(
            table="slices",
            operation="select",
            filters={"id": slice_id}
        )
        
        if not slice_result["success"] or not slice_result["data"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slice not found"
            )
        
        slice_data = slice_result["data"][0]
        
        # Build filters for metrics
        filters = {"slice_id": slice_id}
        if benchmark_id:
            filters["benchmark_id"] = benchmark_id
        
        # Get slice metrics from database
        result = await db.execute_query(
            table="run_metrics",
            operation="select",
            filters=filters
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve slice metrics"
            )
        
        metrics_data = result["data"]
        total_metrics = len(metrics_data)
        
        # Apply pagination
        paginated_metrics = metrics_data[offset:offset + limit]
        
        return SliceMetricsResponse(
            slice=slice_data["name"],
            metrics=paginated_metrics
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get slice metrics",
            error=str(e),
            slice_id=slice_id,
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
