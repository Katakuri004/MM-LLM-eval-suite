"""
WebSocket manager for real-time evaluation updates.
"""

import json
import asyncio
from typing import Dict, Any, Set
from fastapi import WebSocket, WebSocketDisconnect
import structlog

logger = structlog.get_logger(__name__)

class WebSocketManager:
    """Manages WebSocket connections for real-time updates."""
    
    def __init__(self):
        """Initialize WebSocket manager."""
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.evaluation_connections: Dict[str, Set[WebSocket]] = {}
        logger.info("WebSocket manager initialized")
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept a WebSocket connection."""
        await websocket.accept()
        
        if client_id not in self.active_connections:
            self.active_connections[client_id] = set()
        
        self.active_connections[client_id].add(websocket)
        logger.info("WebSocket connected", client_id=client_id)
    
    async def disconnect(self, websocket: WebSocket, client_id: str):
        """Handle WebSocket disconnection."""
        if client_id in self.active_connections:
            self.active_connections[client_id].discard(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        
        # Remove from evaluation connections (create copy to avoid dict changed during iteration)
        evaluation_connections_copy = dict(self.evaluation_connections)
        for evaluation_id, connections in evaluation_connections_copy.items():
            connections.discard(websocket)
            if not connections:
                del self.evaluation_connections[evaluation_id]
        
        logger.info("WebSocket disconnected", client_id=client_id)
    
    async def connect_to_evaluation(self, websocket: WebSocket, evaluation_id: str):
        """Connect WebSocket to specific evaluation."""
        await websocket.accept()
        
        if evaluation_id not in self.evaluation_connections:
            self.evaluation_connections[evaluation_id] = set()
        
        self.evaluation_connections[evaluation_id].add(websocket)
        logger.info("WebSocket connected to evaluation", evaluation_id=evaluation_id)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send message to specific WebSocket."""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error("Failed to send personal message", error=str(e))
    
    async def send_to_client(self, message: str, client_id: str):
        """Send message to specific client."""
        if client_id in self.active_connections:
            connections_to_remove = set()
            
            for websocket in self.active_connections[client_id]:
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.error("Failed to send to client", client_id=client_id, error=str(e))
                    connections_to_remove.add(websocket)
            
            # Remove failed connections
            self.active_connections[client_id] -= connections_to_remove
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
    
    async def send_evaluation_update(self, evaluation_id: str, data: Dict[str, Any]):
        """Send evaluation update to connected clients."""
        if evaluation_id in self.evaluation_connections:
            message = json.dumps({
                "type": "evaluation_update",
                "evaluation_id": evaluation_id,
                "data": data
            })
            
            connections_to_remove = set()
            
            for websocket in self.evaluation_connections[evaluation_id]:
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.error("Failed to send evaluation update", evaluation_id=evaluation_id, error=str(e))
                    connections_to_remove.add(websocket)
            
            # Remove failed connections
            self.evaluation_connections[evaluation_id] -= connections_to_remove
            if not self.evaluation_connections[evaluation_id]:
                del self.evaluation_connections[evaluation_id]
    
    async def broadcast_evaluation_update(self, data: Dict[str, Any]):
        """Broadcast evaluation update to all connected clients."""
        message = json.dumps({
            "type": "evaluation_broadcast",
            "data": data
        })
        
        all_connections = set()
        for connections in self.active_connections.values():
            all_connections.update(connections)
        
        connections_to_remove = set()
        
        for websocket in all_connections:
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error("Failed to broadcast evaluation update", error=str(e))
                connections_to_remove.add(websocket)
        
        # Clean up failed connections
        for client_id, connections in self.active_connections.items():
            connections -= connections_to_remove
            if not connections:
                del self.active_connections[client_id]
    
    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        return sum(len(connections) for connections in self.active_connections.values())
    
    def get_evaluation_connection_count(self, evaluation_id: str) -> int:
        """Get number of connections for specific evaluation."""
        return len(self.evaluation_connections.get(evaluation_id, set()))

# Global WebSocket manager instance
websocket_manager = WebSocketManager()