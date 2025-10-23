"""
API endpoints for evaluation management.
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import structlog

from services.enhanced_evaluation_service import enhanced_evaluation_service
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
@router.post("/evaluations", response_model=EvaluationResponse)
async def create_evaluation(request: EvaluationRequest):
    """Start a new evaluation."""
    try:
        # Validate model exists
        model = supabase_service.get_model_by_id(request.model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        # Validate benchmarks exist
        for benchmark_id in request.benchmark_ids:
            benchmark = supabase_service.get_benchmark_by_id(benchmark_id)
            if not benchmark:
                raise HTTPException(status_code=404, detail=f"Benchmark {benchmark_id} not found")
        
        # Start evaluation
        evaluation_id = await enhanced_evaluation_service.start_evaluation(
            model_id=request.model_id,
            benchmark_ids=request.benchmark_ids,
            config=request.config,
            evaluation_name=request.name
        )
        
        logger.info("Evaluation started", evaluation_id=evaluation_id, model_id=request.model_id)
        
        return EvaluationResponse(
            evaluation_id=evaluation_id,
            status="started",
            message=f"Evaluation {evaluation_id} started successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to create evaluation", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start evaluation: {str(e)}")

@router.get("/evaluations")
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

@router.get("/evaluations/{evaluation_id}")
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

@router.get("/evaluations/{evaluation_id}/results")
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

@router.delete("/evaluations/{evaluation_id}")
async def cancel_evaluation(evaluation_id: str):
    """Cancel a running evaluation."""
    try:
        evaluation = supabase_service.get_evaluation(evaluation_id)
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        if evaluation['status'] not in ['pending', 'running']:
            raise HTTPException(status_code=400, detail="Evaluation cannot be cancelled")
        
        # Cancel the evaluation
        success = await enhanced_evaluation_service.cancel_evaluation(evaluation_id)
        
        if success:
            return {"message": f"Evaluation {evaluation_id} cancelled successfully"}
        else:
            return {"message": f"Evaluation {evaluation_id} was not running"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to cancel evaluation", evaluation_id=evaluation_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to cancel evaluation")

@router.get("/evaluations/active")
async def get_active_evaluations():
    """Get list of active evaluation IDs."""
    try:
        active_evaluation_ids = enhanced_evaluation_service.get_active_evaluations()
        
        # Get details for active evaluations
        active_evaluations = []
        for evaluation_id in active_evaluation_ids:
            evaluation = supabase_service.get_evaluation(evaluation_id)
            if evaluation:
                active_evaluations.append(evaluation)
        
        return {
            "active_evaluations": active_evaluations,
            "count": len(active_evaluations)
        }
        
    except Exception as e:
        logger.error("Failed to get active evaluations", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get active evaluations")

# WebSocket endpoint for real-time updates
@router.websocket("/ws/evaluations/{evaluation_id}")
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
