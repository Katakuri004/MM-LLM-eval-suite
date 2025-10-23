"""
Simple WebSocket endpoints for the evaluation system.
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

logger = structlog.get_logger(__name__)

# WebSocket router
router = APIRouter()

# Security
security = HTTPBearer(auto_error=False)

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint for general connections.
    """
    connection_id = str(uuid.uuid4())
    client_ip = websocket.client.host if websocket.client else "unknown"
    
    try:
        await websocket_manager.connect(websocket, connection_id)
        logger.info("WebSocket connected", connection_id=connection_id, client_ip=client_ip)
        
        while True:
            try:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Handle different message types
                if message_data.get("type") == "ping":
                    await websocket_manager.send_personal_message(
                        json.dumps({"type": "pong", "timestamp": datetime.utcnow().isoformat()}),
                        websocket
                    )
                elif message_data.get("type") == "subscribe_evaluation":
                    evaluation_id = message_data.get("evaluation_id")
                    if evaluation_id:
                        await websocket_manager.connect_to_evaluation(websocket, evaluation_id)
                        logger.info("Subscribed to evaluation", connection_id=connection_id, evaluation_id=evaluation_id)
                
            except json.JSONDecodeError:
                await websocket_manager.send_personal_message(
                    json.dumps({"type": "error", "message": "Invalid JSON"}),
                    websocket
                )
            except Exception as e:
                logger.error("WebSocket message handling error", connection_id=connection_id, error=str(e))
                await websocket_manager.send_personal_message(
                    json.dumps({"type": "error", "message": "Internal server error"}),
                    websocket
                )
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected", connection_id=connection_id)
    except Exception as e:
        logger.error("WebSocket connection error", connection_id=connection_id, error=str(e))
    finally:
        await websocket_manager.disconnect(websocket, connection_id)

@router.websocket("/ws/evaluations/{evaluation_id}")
async def websocket_evaluation_endpoint(websocket: WebSocket, evaluation_id: str):
    """
    WebSocket endpoint for evaluation-specific connections.
    """
    connection_id = str(uuid.uuid4())
    client_ip = websocket.client.host if websocket.client else "unknown"
    
    try:
        await websocket_manager.connect_to_evaluation(websocket, evaluation_id)
        logger.info("WebSocket connected to evaluation", connection_id=connection_id, evaluation_id=evaluation_id, client_ip=client_ip)
        
        while True:
            try:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Handle evaluation-specific messages
                if message_data.get("type") == "ping":
                    await websocket_manager.send_personal_message(
                        json.dumps({"type": "pong", "timestamp": datetime.utcnow().isoformat()}),
                        websocket
                    )
                
            except json.JSONDecodeError:
                await websocket_manager.send_personal_message(
                    json.dumps({"type": "error", "message": "Invalid JSON"}),
                    websocket
                )
            except Exception as e:
                logger.error("WebSocket evaluation message handling error", connection_id=connection_id, evaluation_id=evaluation_id, error=str(e))
                await websocket_manager.send_personal_message(
                    json.dumps({"type": "error", "message": "Internal server error"}),
                    websocket
                )
                
    except WebSocketDisconnect:
        logger.info("WebSocket evaluation disconnected", connection_id=connection_id, evaluation_id=evaluation_id)
    except Exception as e:
        logger.error("WebSocket evaluation connection error", connection_id=connection_id, evaluation_id=evaluation_id, error=str(e))
    finally:
        await websocket_manager.disconnect(websocket, connection_id)

@router.get("/ws/stats")
async def get_websocket_stats():
    """
    Get WebSocket connection statistics.
    """
    try:
        stats = {
            "total_connections": websocket_manager.get_connection_count(),
            "timestamp": datetime.utcnow().isoformat()
        }
        return stats
    except Exception as e:
        logger.error("Failed to get WebSocket stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get WebSocket stats")

async def websocket_cleanup_task():
    """
    Background task for WebSocket cleanup.
    """
    while True:
        try:
            # Simple cleanup - just log stats
            total_connections = websocket_manager.get_connection_count()
            logger.info("WebSocket cleanup task", total_connections=total_connections)
            
            await asyncio.sleep(60)  # Run every minute
        except Exception as e:
            logger.error("WebSocket cleanup task error", error=str(e))
            await asyncio.sleep(60)
