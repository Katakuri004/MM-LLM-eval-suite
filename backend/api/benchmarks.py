"""
Benchmark management API endpoints.

This module provides endpoints for managing benchmarks and their metadata
in the LMMS-Eval Dashboard.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
import structlog

from auth import get_current_user
from database import get_database, DatabaseManager

# Configure structured logging
logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models for request/response
class BenchmarkResponse(BaseModel):
    """Response model for benchmark data."""
    id: str
    name: str
    modality: str
    category: str
    task_type: str
    primary_metrics: List[str]
    secondary_metrics: List[str]
    num_samples: int
    description: str


class BenchmarkListResponse(BaseModel):
    """Response model for benchmark list."""
    benchmarks: List[BenchmarkResponse]
    total: int


@router.get("/benchmarks", response_model=BenchmarkListResponse)
async def list_benchmarks(
    category: Optional[str] = Query(None, description="Filter by category"),
    modality: Optional[str] = Query(None, description="Filter by modality"),
    limit: int = Query(50, ge=1, le=100, description="Number of benchmarks to return"),
    offset: int = Query(0, ge=0, description="Number of benchmarks to skip"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    List all available benchmarks.
    
    Args:
        category: Filter by benchmark category
        modality: Filter by modality
        limit: Maximum number of benchmarks to return
        offset: Number of benchmarks to skip
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        BenchmarkListResponse: List of benchmarks
    """
    try:
        # Get benchmarks from database
        benchmarks = await db.get_benchmarks_by_category(
            category=category,
            modality=modality
        )
        
        total_benchmarks = len(benchmarks)
        
        # Apply pagination
        paginated_benchmarks = benchmarks[offset:offset + limit]
        
        # Convert to response models
        benchmark_responses = []
        for benchmark_data in paginated_benchmarks:
            benchmark_responses.append(BenchmarkResponse(
                id=benchmark_data["id"],
                name=benchmark_data["name"],
                modality=benchmark_data["modality"],
                category=benchmark_data["category"],
                task_type=benchmark_data["task_type"],
                primary_metrics=benchmark_data["primary_metrics"],
                secondary_metrics=benchmark_data["secondary_metrics"],
                num_samples=benchmark_data["num_samples"],
                description=benchmark_data["description"]
            ))
        
        return BenchmarkListResponse(
            benchmarks=benchmark_responses,
            total=total_benchmarks
        )
        
    except Exception as e:
        logger.error(
            "Failed to list benchmarks",
            error=str(e),
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/benchmarks/{benchmark_id}", response_model=BenchmarkResponse)
async def get_benchmark(
    benchmark_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    Get benchmark details by ID.
    
    Args:
        benchmark_id: Benchmark ID
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        BenchmarkResponse: Benchmark details
        
    Raises:
        HTTPException: If benchmark not found
    """
    try:
        # Get benchmark from database
        result = await db.execute_query(
            table="benchmarks",
            operation="select",
            filters={"id": benchmark_id}
        )
        
        if not result["success"] or not result["data"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Benchmark not found"
            )
        
        benchmark_data = result["data"][0]
        
        return BenchmarkResponse(
            id=benchmark_data["id"],
            name=benchmark_data["name"],
            modality=benchmark_data["modality"],
            category=benchmark_data["category"],
            task_type=benchmark_data["task_type"],
            primary_metrics=benchmark_data["primary_metrics"],
            secondary_metrics=benchmark_data["secondary_metrics"],
            num_samples=benchmark_data["num_samples"],
            description=benchmark_data["description"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get benchmark",
            error=str(e),
            benchmark_id=benchmark_id,
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
