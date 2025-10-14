"""
WebSocket manager for real-time updates.

This module provides WebSocket connection management and broadcasting
for real-time updates in the LMMS-Eval Dashboard.
"""

import asyncio
import json
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
import structlog
from datetime import datetime

# Configure structured logging
logger = structlog.get_logger(__name__)


class WebSocketManager:
    """
    WebSocket manager for handling real-time connections.
    
    Manages WebSocket connections, subscriptions, and broadcasting
    for real-time updates.
    """
    
    def __init__(self):
        """Initialize WebSocket manager."""
        self.connections: Dict[str, Set[WebSocket]] = {}  # run_id -> {websockets}
        self.connection_info: Dict[WebSocket, Dict[str, Any]] = {}  # websocket -> info
        self.lock = asyncio.Lock()
        
        logger.info("WebSocket manager initialized")
    
    async def initialize(self):
        """
        Initialize WebSocket manager.
        
        This method can be used for any async initialization.
        """
        logger.info("WebSocket manager initialization completed")
    
    async def handle_connection(self, websocket: WebSocket, run_id: str):
        """
        Handle a new WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            run_id: Run ID to subscribe to
        """
        try:
            # Accept the connection
            await websocket.accept()
            
            # Add to connections
            async with self.lock:
                if run_id not in self.connections:
                    self.connections[run_id] = set()
                
                self.connections[run_id].add(websocket)
                self.connection_info[websocket] = {
                    "run_id": run_id,
                    "connected_at": datetime.utcnow(),
                    "last_activity": datetime.utcnow()
                }
            
            logger.info(
                "WebSocket connection established",
                run_id=run_id,
                connection_count=len(self.connections[run_id])
            )
            
            # Send initial status
            await self._send_initial_status(websocket, run_id)
            
            # Keep connection alive and handle messages
            await self._handle_messages(websocket, run_id)
            
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected", run_id=run_id)
            await self._remove_connection(websocket, run_id)
        except Exception as e:
            logger.error(
                "WebSocket connection error",
                error=str(e),
                run_id=run_id
            )
            await self._remove_connection(websocket, run_id)
    
    async def _handle_messages(self, websocket: WebSocket, run_id: str):
        """
        Handle incoming WebSocket messages.
        
        Args:
            websocket: WebSocket connection
            run_id: Run ID
        """
        try:
            while True:
                # Wait for message
                message = await websocket.receive_text()
                
                # Update last activity
                async with self.lock:
                    if websocket in self.connection_info:
                        self.connection_info[websocket]["last_activity"] = datetime.utcnow()
                
                # Parse message
                try:
                    data = json.loads(message)
                    await self._handle_message(websocket, run_id, data)
                except json.JSONDecodeError:
                    logger.warning(
                        "Invalid JSON message received",
                        run_id=run_id,
                        message=message
                    )
                    await self._send_error(websocket, "Invalid JSON message")
                
        except WebSocketDisconnect:
            raise
        except Exception as e:
            logger.error(
                "Error handling WebSocket messages",
                error=str(e),
                run_id=run_id
            )
            await self._send_error(websocket, f"Error: {str(e)}")
    
    async def _handle_message(self, websocket: WebSocket, run_id: str, data: Dict[str, Any]):
        """
        Handle a parsed WebSocket message.
        
        Args:
            websocket: WebSocket connection
            run_id: Run ID
            data: Parsed message data
        """
        try:
            message_type = data.get("type")
            
            if message_type == "ping":
                # Respond to ping with pong
                await self._send_message(websocket, {
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            elif message_type == "subscribe":
                # Handle subscription to additional runs
                additional_run_id = data.get("run_id")
                if additional_run_id:
                    await self._subscribe_to_run(websocket, additional_run_id)
            
            elif message_type == "unsubscribe":
                # Handle unsubscription from runs
                unsubscribe_run_id = data.get("run_id")
                if unsubscribe_run_id:
                    await self._unsubscribe_from_run(websocket, unsubscribe_run_id)
            
            else:
                logger.warning(
                    "Unknown message type",
                    message_type=message_type,
                    run_id=run_id
                )
                await self._send_error(websocket, f"Unknown message type: {message_type}")
                
        except Exception as e:
            logger.error(
                "Error handling WebSocket message",
                error=str(e),
                run_id=run_id,
                message_type=data.get("type")
            )
            await self._send_error(websocket, f"Error handling message: {str(e)}")
    
    async def _subscribe_to_run(self, websocket: WebSocket, run_id: str):
        """
        Subscribe WebSocket to additional run.
        
        Args:
            websocket: WebSocket connection
            run_id: Run ID to subscribe to
        """
        async with self.lock:
            if run_id not in self.connections:
                self.connections[run_id] = set()
            
            self.connections[run_id].add(websocket)
            
            # Update connection info
            if websocket in self.connection_info:
                self.connection_info[websocket]["run_id"] = run_id
        
        logger.info(
            "WebSocket subscribed to additional run",
            run_id=run_id,
            connection_count=len(self.connections[run_id])
        )
    
    async def _unsubscribe_from_run(self, websocket: WebSocket, run_id: str):
        """
        Unsubscribe WebSocket from run.
        
        Args:
            websocket: WebSocket connection
            run_id: Run ID to unsubscribe from
        """
        async with self.lock:
            if run_id in self.connections:
                self.connections[run_id].discard(websocket)
                
                # Clean up empty connection sets
                if not self.connections[run_id]:
                    del self.connections[run_id]
        
        logger.info(
            "WebSocket unsubscribed from run",
            run_id=run_id
        )
    
    async def _send_initial_status(self, websocket: WebSocket, run_id: str):
        """
        Send initial status to WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            run_id: Run ID
        """
        try:
            # This would typically fetch the current run status
            # For now, send a simple status message
            await self._send_message(websocket, {
                "type": "status",
                "data": {
                    "run_id": run_id,
                    "status": "connected",
                    "timestamp": datetime.utcnow().isoformat()
                }
            })
            
        except Exception as e:
            logger.error(
                "Failed to send initial status",
                error=str(e),
                run_id=run_id
            )
    
    async def broadcast(self, run_id: str, message: Dict[str, Any]):
        """
        Broadcast message to all connections for a run.
        
        Args:
            run_id: Run ID
            message: Message to broadcast
        """
        try:
            async with self.lock:
                if run_id not in self.connections:
                    return
                
                connections = self.connections[run_id].copy()
            
            # Broadcast to all connections
            disconnected = []
            for websocket in connections:
                try:
                    await self._send_message(websocket, message)
                except Exception as e:
                    logger.warning(
                        "Failed to send message to WebSocket",
                        error=str(e),
                        run_id=run_id
                    )
                    disconnected.append(websocket)
            
            # Clean up disconnected connections
            if disconnected:
                await self._cleanup_disconnected_connections(disconnected, run_id)
            
            logger.debug(
                "Message broadcasted",
                run_id=run_id,
                connection_count=len(connections),
                message_type=message.get("type")
            )
            
        except Exception as e:
            logger.error(
                "Failed to broadcast message",
                error=str(e),
                run_id=run_id
            )
    
    async def _send_message(self, websocket: WebSocket, message: Dict[str, Any]):
        """
        Send message to WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            message: Message to send
        """
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(
                "Failed to send WebSocket message",
                error=str(e)
            )
            raise
    
    async def _send_error(self, websocket: WebSocket, error_message: str):
        """
        Send error message to WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            error_message: Error message
        """
        try:
            await self._send_message(websocket, {
                "type": "error",
                "data": {
                    "message": error_message,
                    "timestamp": datetime.utcnow().isoformat()
                }
            })
        except Exception as e:
            logger.error(
                "Failed to send error message",
                error=str(e),
                error_message=error_message
            )
    
    async def _remove_connection(self, websocket: WebSocket, run_id: str):
        """
        Remove WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            run_id: Run ID
        """
        try:
            async with self.lock:
                # Remove from connections
                if run_id in self.connections:
                    self.connections[run_id].discard(websocket)
                    
                    # Clean up empty connection sets
                    if not self.connections[run_id]:
                        del self.connections[run_id]
                
                # Remove from connection info
                if websocket in self.connection_info:
                    del self.connection_info[websocket]
            
            logger.info(
                "WebSocket connection removed",
                run_id=run_id,
                remaining_connections=len(self.connections.get(run_id, []))
            )
            
        except Exception as e:
            logger.error(
                "Failed to remove WebSocket connection",
                error=str(e),
                run_id=run_id
            )
    
    async def _cleanup_disconnected_connections(
        self,
        disconnected: List[WebSocket],
        run_id: str
    ):
        """
        Clean up disconnected WebSocket connections.
        
        Args:
            disconnected: List of disconnected WebSockets
            run_id: Run ID
        """
        try:
            async with self.lock:
                for websocket in disconnected:
                    if run_id in self.connections:
                        self.connections[run_id].discard(websocket)
                    
                    if websocket in self.connection_info:
                        del self.connection_info[websocket]
                
                # Clean up empty connection sets
                if run_id in self.connections and not self.connections[run_id]:
                    del self.connections[run_id]
            
            logger.info(
                "Disconnected WebSocket connections cleaned up",
                run_id=run_id,
                disconnected_count=len(disconnected)
            )
            
        except Exception as e:
            logger.error(
                "Failed to cleanup disconnected connections",
                error=str(e),
                run_id=run_id
            )
    
    async def close_all_connections(self):
        """
        Close all WebSocket connections.
        """
        try:
            async with self.lock:
                all_connections = []
                for connections in self.connections.values():
                    all_connections.extend(connections)
                
                # Close all connections
                for websocket in all_connections:
                    try:
                        await websocket.close()
                    except Exception:
                        pass  # Ignore errors when closing
                
                # Clear all data
                self.connections.clear()
                self.connection_info.clear()
            
            logger.info("All WebSocket connections closed")
            
        except Exception as e:
            logger.error(
                "Failed to close all connections",
                error=str(e)
            )
    
    def is_healthy(self) -> bool:
        """
        Check if WebSocket manager is healthy.
        
        Returns:
            bool: True if healthy, False otherwise
        """
        try:
            # Simple health check - could be more sophisticated
            return True
        except Exception:
            return False
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get WebSocket manager status.
        
        Returns:
            Dict[str, Any]: Status information
        """
        try:
            total_connections = sum(len(connections) for connections in self.connections.values())
            
            return {
                "total_connections": total_connections,
                "active_runs": len(self.connections),
                "connection_info": {
                    websocket: info for websocket, info in self.connection_info.items()
                }
            }
            
        except Exception as e:
            logger.error(
                "Failed to get WebSocket status",
                error=str(e)
            )
            return {
                "total_connections": 0,
                "active_runs": 0,
                "connection_info": {}
            }


# Global WebSocket manager instance
websocket_manager = WebSocketManager()
