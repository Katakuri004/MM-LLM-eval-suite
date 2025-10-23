"""
WebSocket endpoints for real-time evaluation updates.
"""

import asyncio
import json
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.security import HTTPBearer
import structlog

from services.websocket_manager import websocket_manager
from services.evaluation_service import evaluation_service
from services.supabase_service import supabase_service
from utils.logging import log_websocket_event

logger = structlog.get_logger(__name__)

# Simple WebSocket message class
class WebSocketMessage:
    def __init__(self, message_type: str, data: Dict[str, Any], run_id: Optional[str] = None):
        self.message_type = message_type
        self.data = data
        self.run_id = run_id
        self.timestamp = datetime.utcnow().isoformat()
    
    def to_dict(self):
        return {
            "type": self.message_type,
            "data": self.data,
            "run_id": self.run_id,
            "timestamp": self.timestamp
        }

# WebSocket router
router = APIRouter()

# Security
security = HTTPBearer(auto_error=False)

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint for general connections.
    Handles connection management and basic messaging.
    """
    connection_id = str(uuid.uuid4())
    client_ip = websocket.client.host if websocket.client else "unknown"
    
    try:
        # Accept connection
        if not await websocket_manager.connect(websocket, connection_id, client_ip):
            await websocket.close(code=1008, reason="Connection not allowed")
            return
        
        logger.info("WebSocket connection established", 
                   connection_id=connection_id, 
                   client_ip=client_ip)
        
        # Handle messages
        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Handle the message
                await websocket_manager.handle_message(connection_id, message_data)
                
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected", connection_id=connection_id)
                break
            except json.JSONDecodeError:
                logger.warning("Invalid JSON received", connection_id=connection_id)
                error_message = WebSocketMessage(
                    "error",
                    {"code": "INVALID_JSON", "message": "Invalid JSON format"}
                )
                await websocket_manager._send_to_connection(connection_id, error_message)
            except Exception as e:
                logger.error("Error handling WebSocket message", 
                           connection_id=connection_id, 
                           error=str(e))
                break
    
    except Exception as e:
        logger.error("WebSocket connection error", 
                    connection_id=connection_id, 
                    error=str(e))
    finally:
        # Clean up connection
        websocket_manager.disconnect(connection_id)

@router.websocket("/ws/runs/{run_id}")
async def websocket_run_endpoint(websocket: WebSocket, run_id: str):
    """
    WebSocket endpoint for specific run updates.
    Automatically subscribes to the specified run.
    """
    connection_id = str(uuid.uuid4())
    client_ip = websocket.client.host if websocket.client else "unknown"
    
    try:
        # Validate run exists
        if not supabase_service.is_available():
            await websocket.close(code=1008, reason="Database not available")
            return
        
        run = supabase_service.get_run_by_id(run_id)
        if not run:
            await websocket.close(code=1008, reason="Run not found")
            return
        
        # Accept connection
        if not await websocket_manager.connect(websocket, connection_id, client_ip):
            await websocket.close(code=1008, reason="Connection not allowed")
            return
        
        # Auto-subscribe to the run
        await websocket_manager.subscribe_to_run(connection_id, run_id)
        
        logger.info("WebSocket run connection established", 
                   connection_id=connection_id, 
                   run_id=run_id,
                   client_ip=client_ip)
        
        # Send initial run status
        initial_status = await evaluation_service.get_run_status(run_id)
        if initial_status:
            status_message = WebSocketMessage(
                "run_status",
                initial_status,
                run_id=run_id
            )
            await websocket_manager._send_to_connection(connection_id, status_message)
        
        # Handle messages
        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Handle the message
                await websocket_manager.handle_message(connection_id, message_data)
                
            except WebSocketDisconnect:
                logger.info("WebSocket run connection disconnected", 
                           connection_id=connection_id, 
                           run_id=run_id)
                break
            except json.JSONDecodeError:
                logger.warning("Invalid JSON received in run connection", 
                             connection_id=connection_id, 
                             run_id=run_id)
                error_message = WebSocketMessage(
                    "error",
                    {"code": "INVALID_JSON", "message": "Invalid JSON format"},
                    run_id=run_id
                )
                await websocket_manager._send_to_connection(connection_id, error_message)
            except Exception as e:
                logger.error("Error handling WebSocket run message", 
                           connection_id=connection_id, 
                           run_id=run_id, 
                           error=str(e))
                break
    
    except Exception as e:
        logger.error("WebSocket run connection error", 
                    connection_id=connection_id, 
                    run_id=run_id, 
                    error=str(e))
    finally:
        # Clean up connection
        websocket_manager.disconnect(connection_id)

@router.get("/ws/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics."""
    try:
        stats = websocket_manager.get_connection_stats()
        return {
            "status": "success",
            "data": stats
        }
    except Exception as e:
        logger.error("Failed to get WebSocket stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get WebSocket statistics")

@router.post("/ws/broadcast")
async def broadcast_message(message_data: Dict[str, Any]):
    """
    Broadcast a message to all WebSocket connections.
    This endpoint should be protected in production.
    """
    try:
        message_type = message_data.get("type", "broadcast")
        data = message_data.get("data", {})
        run_id = message_data.get("run_id")
        
        message = WebSocketMessage(message_type, data, run_id)
        
        if run_id:
            await websocket_manager.broadcast_to_run(run_id, message)
        else:
            await websocket_manager.broadcast_to_all(message)
        
        return {
            "status": "success",
            "message": "Message broadcasted successfully"
        }
        
    except Exception as e:
        logger.error("Failed to broadcast message", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to broadcast message")

@router.post("/ws/runs/{run_id}/broadcast")
async def broadcast_to_run(run_id: str, message_data: Dict[str, Any]):
    """
    Broadcast a message to all connections subscribed to a specific run.
    """
    try:
        # Validate run exists
        if not supabase_service.is_available():
            raise HTTPException(status_code=503, detail="Database not available")
        
        run = supabase_service.get_run_by_id(run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        
        message_type = message_data.get("type", "run_update")
        data = message_data.get("data", {})
        
        message = WebSocketMessage(message_type, data, run_id)
        await websocket_manager.broadcast_to_run(run_id, message)
        
        return {
            "status": "success",
            "message": f"Message broadcasted to run {run_id} subscribers"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to broadcast to run", run_id=run_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to broadcast to run")

# WebSocket event handlers for evaluation service integration

async def send_run_progress_update(run_id: str, progress_data: Dict[str, Any]):
    """Send progress update to run subscribers."""
    try:
        message = WebSocketMessage("progress_update", progress_data, run_id)
        await websocket_manager.broadcast_to_run(run_id, message)
        log_websocket_event("progress_update", run_id, progress=progress_data.get("progress", 0))
    except Exception as e:
        logger.error("Failed to send progress update", run_id=run_id, error=str(e))

async def send_run_log_update(run_id: str, log_data: Dict[str, Any]):
    """Send log update to run subscribers."""
    try:
        message = WebSocketMessage("log_update", log_data, run_id)
        await websocket_manager.broadcast_to_run(run_id, message)
        log_websocket_event("log_update", run_id, log_level=log_data.get("level", "INFO"))
    except Exception as e:
        logger.error("Failed to send log update", run_id=run_id, error=str(e))

async def send_run_status_update(run_id: str, status_data: Dict[str, Any]):
    """Send status update to run subscribers."""
    try:
        message = WebSocketMessage("status_update", status_data, run_id)
        await websocket_manager.broadcast_to_run(run_id, message)
        log_websocket_event("status_update", run_id, status=status_data.get("status"))
    except Exception as e:
        logger.error("Failed to send status update", run_id=run_id, error=str(e))

async def send_run_metric_update(run_id: str, metric_data: Dict[str, Any]):
    """Send metric update to run subscribers."""
    try:
        message = WebSocketMessage("metric_update", metric_data, run_id)
        await websocket_manager.broadcast_to_run(run_id, message)
        log_websocket_event("metric_update", run_id, metrics=metric_data.get("metrics", {}))
    except Exception as e:
        logger.error("Failed to send metric update", run_id=run_id, error=str(e))

async def send_run_error_update(run_id: str, error_data: Dict[str, Any]):
    """Send error update to run subscribers."""
    try:
        message = WebSocketMessage("error_update", error_data, run_id)
        await websocket_manager.broadcast_to_run(run_id, message)
        log_websocket_event("error_update", run_id, error=error_data.get("error"))
    except Exception as e:
        logger.error("Failed to send error update", run_id=run_id, error=str(e))

# Background task for connection cleanup
async def websocket_cleanup_task():
    """Background task to clean up stale WebSocket connections."""
    while True:
        try:
            await asyncio.sleep(300)  # Run every 5 minutes
            await websocket_manager.cleanup_stale_connections()
        except Exception as e:
            logger.error("Error in WebSocket cleanup task", error=str(e))
            await asyncio.sleep(60)  # Wait 1 minute before retrying
