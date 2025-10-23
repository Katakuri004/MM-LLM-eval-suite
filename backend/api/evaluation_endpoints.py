"""
API endpoints for evaluation management.
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import structlog

from services.production_evaluation_orchestrator import (
    production_orchestrator,
    EvaluationRequest as OrchestratorRequest
)
from services.supabase_service import supabase_service
from services.websocket_manager import websocket_manager

logger = structlog.get_logger(__name__)

router = APIRouter()

# Pydantic models for request/response
class EvaluationRequest(BaseModel):
    model_id: str
    benchmark_ids: List[str]
    config: Dict[str, Any] = {}
    name: Optional[str] = None

class EvaluationResponse(BaseModel):
    evaluation_id: str
    status: str
    message: str

class EvaluationStatus(BaseModel):
    id: str
    model_id: str
    name: str
    status: str
    progress: int
    current_benchmark: Optional[str]
    started_at: Optional[str]
    completed_at: Optional[str]
    error_message: Optional[str]

# Evaluation endpoints
@router.post("/", response_model=EvaluationResponse)
async def create_evaluation(request: EvaluationRequest):
    """Start a new evaluation using the production orchestrator."""
    try:
        # Convert API request to orchestrator request
        orchestrator_request = OrchestratorRequest(
            model_id=request.model_id,
            benchmark_ids=request.benchmark_ids,
            name=request.name,
            config=request.config,
            user_id=None  # Add user authentication later
        )
        
        # Start evaluation
        evaluation_id = await production_orchestrator.start_evaluation(orchestrator_request)
        
        # Get evaluation details
        evaluation = supabase_service.get_evaluation(evaluation_id)
        
        return EvaluationResponse(
            evaluation_id=evaluation_id,
            status=evaluation['status'],
            message="Evaluation started successfully"
        )
        
    except ValueError as e:
        logger.error("Validation error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error("Runtime error", error=str(e))
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("Failed to create evaluation", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start evaluation: {str(e)}")

@router.get("/")
async def get_evaluations(skip: int = 0, limit: int = 100, model_id: Optional[str] = None):
    """Get evaluations with optional filtering."""
    try:
        evaluations = supabase_service.get_evaluations(skip=skip, limit=limit, model_id=model_id)
        
        # Get progress for each evaluation
        for evaluation in evaluations:
            progress = supabase_service.get_evaluation_progress(evaluation['id'])
            if progress:
                evaluation['progress'] = progress['progress_percentage']
                evaluation['current_benchmark'] = progress['current_benchmark']
            else:
                evaluation['progress'] = 0
                evaluation['current_benchmark'] = None
        
        return {
            "evaluations": evaluations,
            "total": len(evaluations),
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        logger.error("Failed to get evaluations", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get evaluations")

@router.get("/{evaluation_id}")
async def get_evaluation(evaluation_id: str):
    """Get evaluation details."""
    try:
        evaluation = supabase_service.get_evaluation(evaluation_id)
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        # Get progress
        progress = supabase_service.get_evaluation_progress(evaluation_id)
        if progress:
            evaluation['progress'] = progress['progress_percentage']
            evaluation['current_benchmark'] = progress['current_benchmark']
            evaluation['status_message'] = progress['status_message']
        else:
            evaluation['progress'] = 0
            evaluation['current_benchmark'] = None
            evaluation['status_message'] = None
        
        return evaluation
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get evaluation", evaluation_id=evaluation_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get evaluation")

@router.get("/{evaluation_id}/results")
async def get_evaluation_results(evaluation_id: str):
    """Get evaluation results."""
    try:
        evaluation = supabase_service.get_evaluation(evaluation_id)
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        results = supabase_service.get_evaluation_results(evaluation_id)
        
        return {
            "evaluation": evaluation,
            "results": results,
            "total_results": len(results)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get evaluation results", evaluation_id=evaluation_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get evaluation results")

@router.delete("/{evaluation_id}")
async def cancel_evaluation(evaluation_id: str):
    """Cancel a running evaluation."""
    try:
        # Check evaluation exists
        evaluation = supabase_service.get_evaluation(evaluation_id)
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        # Check if cancellable
        if evaluation['status'] not in ['pending', 'running']:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel evaluation in status: {evaluation['status']}"
            )
        
        # Cancel using orchestrator
        success = await production_orchestrator.cancel_evaluation(evaluation_id)
        
        if success:
            return {"message": "Evaluation cancelled successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to cancel evaluation")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to cancel evaluation", evaluation_id=evaluation_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/active")
async def get_active_evaluations():
    """Get list of active evaluation IDs."""
    try:
        active_ids = production_orchestrator.get_active_evaluations()
        
        return {
            "active_evaluations": active_ids,
            "count": len(active_ids)
        }
        
    except Exception as e:
        logger.error("Failed to get active evaluations", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get active evaluations")

# WebSocket endpoint for real-time updates
@router.websocket("/ws/{evaluation_id}")
async def websocket_evaluation_updates(websocket: WebSocket, evaluation_id: str):
    """WebSocket endpoint for real-time evaluation updates."""
    await websocket_manager.connect_to_evaluation(websocket, evaluation_id)
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        await websocket_manager.disconnect(websocket, evaluation_id)
        logger.info("WebSocket disconnected for evaluation", evaluation_id=evaluation_id)

# WebSocket endpoint for general updates
@router.websocket("/ws/updates")
async def websocket_general_updates(websocket: WebSocket):
    """WebSocket endpoint for general updates."""
    client_id = f"client_{id(websocket)}"
    await websocket_manager.connect(websocket, client_id)
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        await websocket_manager.disconnect(websocket, client_id)
        logger.info("WebSocket disconnected", client_id=client_id)
