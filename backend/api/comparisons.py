"""
Comparison API endpoints.

This module provides endpoints for creating and managing model comparisons
in the LMMS-Eval Dashboard.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
import structlog

from auth import get_current_user
from database import get_database, DatabaseManager
from services.comparison_service import ComparisonService

# Configure structured logging
logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models for request/response
class ComparisonCreateRequest(BaseModel):
    """Request model for creating a comparison."""
    name: str = Field(..., min_length=1, max_length=255, description="Comparison name")
    comparison_type: str = Field(..., description="Type of comparison")
    run_ids: List[str] = Field(..., min_items=2, description="List of run IDs to compare")
    benchmark_ids: Optional[List[str]] = Field(None, description="List of benchmark IDs to filter")
    slice_id: Optional[str] = Field(None, description="Slice ID for filtering")


class ComparisonResponse(BaseModel):
    """Response model for comparison data."""
    id: str
    name: str
    comparison_type: str
    run_ids: List[str]
    benchmark_ids: List[str]
    slice_id: Optional[str]
    created_at: str
    updated_at: str


class ComparisonDetailResponse(BaseModel):
    """Response model for detailed comparison data."""
    id: str
    name: str
    comparison_type: str
    runs: List[Dict[str, Any]]
    benchmarks: List[Dict[str, Any]]
    paired_diff_table: List[Dict[str, Any]]
    best_of_heatmap: Dict[str, Any]


# Initialize services
comparison_service = ComparisonService()


@router.post("/comparisons", response_model=ComparisonResponse)
async def create_comparison(
    request: ComparisonCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    Create a new comparison session.
    
    Args:
        request: Comparison creation request
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        ComparisonResponse: Created comparison information
        
    Raises:
        HTTPException: If comparison creation fails
    """
    try:
        logger.info(
            "Creating new comparison",
            user_id=current_user["id"],
            comparison_name=request.name,
            comparison_type=request.comparison_type,
            run_count=len(request.run_ids)
        )
        
        # Validate run IDs exist and user has access
        for run_id in request.run_ids:
            run = await db.get_run_by_id(run_id)
            if not run:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Run {run_id} not found"
                )
            
            # Check user has access to this run
            if run.get("created_by") != current_user["id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied to run {run_id}"
                )
        
        # Create comparison in database
        comparison_data = {
            "name": request.name,
            "comparison_type": request.comparison_type,
            "run_ids": request.run_ids,
            "benchmark_ids": request.benchmark_ids or [],
            "slice_id": request.slice_id,
            "user_id": current_user["id"]
        }
        
        result = await db.execute_query(
            table="comparison_sessions",
            operation="insert",
            data=comparison_data,
            admin_access=True
        )
        
        if not result["success"] or not result["data"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create comparison"
            )
        
        comparison = result["data"][0]
        
        logger.info(
            "Comparison created successfully",
            comparison_id=comparison["id"],
            user_id=current_user["id"]
        )
        
        return ComparisonResponse(
            id=comparison["id"],
            name=comparison["name"],
            comparison_type=comparison["comparison_type"],
            run_ids=comparison["run_ids"],
            benchmark_ids=comparison["benchmark_ids"],
            slice_id=comparison.get("slice_id"),
            created_at=comparison["created_at"],
            updated_at=comparison["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to create comparison",
            error=str(e),
            user_id=current_user["id"],
            comparison_name=request.name
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/comparisons/{comparison_id}", response_model=ComparisonDetailResponse)
async def get_comparison(
    comparison_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    Get detailed comparison data.
    
    Args:
        comparison_id: Comparison ID
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        ComparisonDetailResponse: Detailed comparison data
        
    Raises:
        HTTPException: If comparison not found
    """
    try:
        # Get comparison from database
        result = await db.execute_query(
            table="comparison_sessions",
            operation="select",
            filters={"id": comparison_id, "user_id": current_user["id"]}
        )
        
        if not result["success"] or not result["data"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comparison not found"
            )
        
        comparison = result["data"][0]
        
        # Get detailed comparison data
        comparison_detail = await comparison_service.get_comparison_detail(
            comparison_id=comparison_id,
            run_ids=comparison["run_ids"],
            benchmark_ids=comparison["benchmark_ids"],
            slice_id=comparison.get("slice_id")
        )
        
        return ComparisonDetailResponse(
            id=comparison["id"],
            name=comparison["name"],
            comparison_type=comparison["comparison_type"],
            runs=comparison_detail["runs"],
            benchmarks=comparison_detail["benchmarks"],
            paired_diff_table=comparison_detail["paired_diff_table"],
            best_of_heatmap=comparison_detail["best_of_heatmap"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get comparison",
            error=str(e),
            comparison_id=comparison_id,
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/comparisons")
async def list_comparisons(
    limit: int = Query(20, ge=1, le=100, description="Number of comparisons to return"),
    offset: int = Query(0, ge=0, description="Number of comparisons to skip"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    List user's comparisons.
    
    Args:
        limit: Maximum number of comparisons to return
        offset: Number of comparisons to skip
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        Dict: List of comparisons with pagination
    """
    try:
        # Get comparisons from database
        result = await db.execute_query(
            table="comparison_sessions",
            operation="select",
            filters={"user_id": current_user["id"]}
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve comparisons"
            )
        
        comparisons_data = result["data"]
        total_comparisons = len(comparisons_data)
        
        # Apply pagination
        paginated_comparisons = comparisons_data[offset:offset + limit]
        
        # Convert to response models
        comparisons = []
        for comparison_data in paginated_comparisons:
            comparisons.append(ComparisonResponse(
                id=comparison_data["id"],
                name=comparison_data["name"],
                comparison_type=comparison_data["comparison_type"],
                run_ids=comparison_data["run_ids"],
                benchmark_ids=comparison_data["benchmark_ids"],
                slice_id=comparison_data.get("slice_id"),
                created_at=comparison_data["created_at"],
                updated_at=comparison_data["updated_at"]
            ))
        
        return {
            "comparisons": comparisons,
            "total": total_comparisons,
            "page": offset // limit + 1,
            "page_size": limit
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to list comparisons",
            error=str(e),
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
