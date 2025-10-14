"""
Model management API endpoints.

This module provides endpoints for managing models and their metadata
in the LMMS-Eval Dashboard.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
import structlog
from datetime import datetime

from auth import get_current_user
from database import get_database, DatabaseManager

# Configure structured logging
logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models for request/response
class ModelResponse(BaseModel):
    """Response model for model data."""
    id: str
    name: str
    family: str
    source: str
    dtype: str
    num_parameters: int
    notes: Optional[str] = None
    created_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ModelListResponse(BaseModel):
    """Response model for model list."""
    models: List[ModelResponse]
    total: int


class CheckpointResponse(BaseModel):
    """Response model for model checkpoint."""
    id: str
    model_id: str
    checkpoint_variant: str
    checkpoint_index: int
    source: str
    created_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)


@router.get("/models", response_model=ModelListResponse)
async def list_models(
    family: Optional[str] = Query(None, description="Filter by model family"),
    limit: int = Query(50, ge=1, le=100, description="Number of models to return"),
    offset: int = Query(0, ge=0, description="Number of models to skip"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    List all available models.
    
    Args:
        family: Filter by model family
        limit: Maximum number of models to return
        offset: Number of models to skip
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        ModelListResponse: List of models
    """
    try:
        # Build filters
        filters = {}
        if family:
            filters["family"] = family
        
        # Get models from database
        result = await db.execute_query(
            table="models",
            operation="select",
            filters=filters
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve models"
            )
        
        models_data = result["data"]
        total_models = len(models_data)
        
        # Apply pagination
        paginated_models = models_data[offset:offset + limit]
        
        # Convert to response models
        models = []
        for model_data in paginated_models:
            models.append(ModelResponse(
                id=model_data["id"],
                name=model_data["name"],
                family=model_data["family"],
                source=model_data["source"],
                dtype=model_data["dtype"],
                num_parameters=model_data["num_parameters"],
                notes=model_data.get("notes"),
                created_at=model_data["created_at"],
                metadata=model_data.get("metadata", {})
            ))
        
        return ModelListResponse(
            models=models,
            total=total_models
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to list models",
            error=str(e),
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/models/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    Get model details by ID.
    
    Args:
        model_id: Model ID
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        ModelResponse: Model details
        
    Raises:
        HTTPException: If model not found
    """
    try:
        # Get model from database
        model = await db.get_model_by_id(model_id)
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        return ModelResponse(
            id=model["id"],
            name=model["name"],
            family=model["family"],
            source=model["source"],
            dtype=model["dtype"],
            num_parameters=model["num_parameters"],
            notes=model.get("notes"),
            created_at=model["created_at"],
            metadata=model.get("metadata", {})
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get model",
            error=str(e),
            model_id=model_id,
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/models/{model_id}/checkpoints", response_model=List[CheckpointResponse])
async def get_model_checkpoints(
    model_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    Get checkpoints for a specific model.
    
    Args:
        model_id: Model ID
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        List[CheckpointResponse]: List of model checkpoints
        
    Raises:
        HTTPException: If model not found
    """
    try:
        # Verify model exists
        model = await db.get_model_by_id(model_id)
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        # Get checkpoints from database
        result = await db.execute_query(
            table="model_checkpoints",
            operation="select",
            filters={"model_id": model_id}
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve checkpoints"
            )
        
        # Convert to response models
        checkpoints = []
        for checkpoint_data in result["data"]:
            checkpoints.append(CheckpointResponse(
                id=checkpoint_data["id"],
                model_id=checkpoint_data["model_id"],
                checkpoint_variant=checkpoint_data["checkpoint_variant"],
                checkpoint_index=checkpoint_data["checkpoint_index"],
                source=checkpoint_data["source"],
                created_at=checkpoint_data["created_at"],
                metadata=checkpoint_data.get("metadata", {})
            ))
        
        return checkpoints
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get model checkpoints",
            error=str(e),
            model_id=model_id,
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/models/{model_id}/runs")
async def get_model_runs(
    model_id: str,
    status: Optional[str] = Query(None, description="Filter by run status"),
    limit: int = Query(20, ge=1, le=100, description="Number of runs to return"),
    offset: int = Query(0, ge=0, description="Number of runs to skip"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """
    Get runs for a specific model.
    
    Args:
        model_id: Model ID
        status: Filter by run status
        limit: Maximum number of runs to return
        offset: Number of runs to skip
        current_user: Current authenticated user
        db: Database manager
        
    Returns:
        Dict: Model runs data
        
    Raises:
        HTTPException: If model not found
    """
    try:
        # Verify model exists
        model = await db.get_model_by_id(model_id)
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        # Build filters
        filters = {
            "model_id": model_id,
            "created_by": current_user["id"]  # Only user's own runs
        }
        if status:
            filters["status"] = status
        
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
        
        return {
            "model_id": model_id,
            "runs": paginated_runs,
            "total": total_runs,
            "page": offset // limit + 1,
            "page_size": limit
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get model runs",
            error=str(e),
            model_id=model_id,
            user_id=current_user["id"]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
