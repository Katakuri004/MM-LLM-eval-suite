"""
Leaderboard API endpoints.

This module provides endpoints for viewing and managing leaderboards
in the LMMS-Eval Dashboard.
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
class LeaderboardEntry(BaseModel):
    """Response model for leaderboard entry."""
    rank: int
    model_name: str
    checkpoint: str
    score: float
    last_run: str
    run_id: str


class LeaderboardResponse(BaseModel):
    """Response model for leaderboard."""
    benchmark: str
    entries: List[LeaderboardEntry]
    slice: str
    total_entries: int


# Initialize services
metric_service = MetricService()


@router.get("/leaderboard/{benchmark_id}", response_model=LeaderboardResponse)
async def get_leaderboard(
    benchmark_id: str,
    slice_id: Optional[str] = Query(None, description="Filter by slice ID"),
    checkpoint_mode: str = Query("best", description="Checkpoint mode: best or specific"),
    sort_by: str = Query("score", description="Sort by: score, date, model"),
    limit: int = Query(50, ge=1, le=100, description="Number of entries to return"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    Get leaderboard for a specific benchmark.
    
    Args:
        benchmark_id: Benchmark ID
        slice_id: Optional slice ID for filtering
        checkpoint_mode: Checkpoint mode (best or specific)
        sort_by: Sort criteria
        limit: Maximum number of entries to return
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        LeaderboardResponse: Leaderboard data
        
    Raises:
        HTTPException: If benchmark not found or leaderboard retrieval fails
    """
    try:
        # Verify benchmark exists
        benchmark_result = await db.execute_query(
            table="benchmarks",
            operation="select",
            filters={"id": benchmark_id}
        )
        
        if not benchmark_result["success"] or not benchmark_result["data"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Benchmark not found"
            )
        
        benchmark_data = benchmark_result["data"][0]
        
        # Get leaderboard data
        leaderboard_data = await metric_service.get_leaderboard(
            benchmark_id=benchmark_id,
            slice_id=slice_id,
            checkpoint_mode=checkpoint_mode,
            sort_by=sort_by,
            limit=limit
        )
        
        # Convert to response models
        entries = []
        for i, entry_data in enumerate(leaderboard_data, 1):
            entries.append(LeaderboardEntry(
                rank=i,
                model_name=entry_data["model_name"],
                checkpoint=entry_data["checkpoint"],
                score=entry_data["score"],
                last_run=entry_data["last_run"],
                run_id=entry_data["run_id"]
            ))
        
        return LeaderboardResponse(
            benchmark=benchmark_data["name"],
            entries=entries,
            slice=slice_id or "all",
            total_entries=len(entries)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get leaderboard",
            error=str(e),
            benchmark_id=benchmark_id,
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
