"""
WebSocket connection manager for real-time evaluation updates.
Handles connection management, message broadcasting, and rate limiting.
"""

import asyncio
import json
import time
from typing import Dict, Set, List, Optional, Any
from datetime import datetime, timedelta
import structlog
from fastapi import WebSocket, WebSocketDisconnect
from collections import defaultdict, deque

from utils.monitoring import record_websocket_event
from utils.logging import log_websocket_event

logger = structlog.get_logger(__name__)

class WebSocketMessage:
    """WebSocket message structure."""
    
    def __init__(self, message_type: str, data: Any, run_id: Optional[str] = None, timestamp: Optional[datetime] = None):
        self.type = message_type
        self.data = data
        self.run_id = run_id
        self.timestamp = timestamp or datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary for JSON serialization."""
        return {
            "type": self.type,
            "data": self.data,
            "run_id": self.run_id,
            "timestamp": self.timestamp.isoformat()
        }

class ConnectionManager:
    """Manages WebSocket connections with rate limiting and security."""
    
    def __init__(self, max_connections: int = 100, rate_limit_per_minute: int = 60):
        """
        Initialize connection manager.
        
        Args:
            max_connections: Maximum number of concurrent connections
            rate_limit_per_minute: Maximum messages per minute per connection
        """
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        self.run_subscriptions: Dict[str, Set[str]] = defaultdict(set)  # run_id -> connection_ids
        self.connection_subscriptions: Dict[str, Set[str]] = defaultdict(set)  # connection_id -> run_ids
        
        # Rate limiting
        self.rate_limit_per_minute = rate_limit_per_minute
        self.message_counts: Dict[str, deque] = defaultdict(lambda: deque())
        
        # Connection limits
        self.max_connections = max_connections
        
        # Security
        self.blocked_ips: Set[str] = set()
        self.connection_attempts: Dict[str, List[datetime]] = defaultdict(list)
        
        logger.info("WebSocket connection manager initialized", 
                   max_connections=max_connections, 
                   rate_limit=rate_limit_per_minute)
    
    async def connect(self, websocket: WebSocket, connection_id: str, client_ip: str) -> bool:
        """
        Accept a new WebSocket connection with security checks.
        
        Args:
            websocket: WebSocket connection
            connection_id: Unique connection identifier
            client_ip: Client IP address
            
        Returns:
            bool: True if connection accepted, False otherwise
        """
        try:
            # Security checks
            if not self._is_connection_allowed(client_ip):
                logger.warning("Connection blocked", client_ip=client_ip, connection_id=connection_id)
                return False
            
            # Check connection limits
            if len(self.active_connections) >= self.max_connections:
                logger.warning("Maximum connections reached", 
                             current_connections=len(self.active_connections),
                             max_connections=self.max_connections)
                return False
            
            # Accept connection
            await websocket.accept()
            
            # Store connection
            self.active_connections[connection_id] = websocket
            self.connection_metadata[connection_id] = {
                "connected_at": datetime.utcnow(),
                "client_ip": client_ip,
                "last_activity": datetime.utcnow(),
                "message_count": 0,
                "subscriptions": set()
            }
            
            # Record connection event
            record_websocket_event("connection_established", connection_id)
            log_websocket_event("connection_established", connection_id, 
                              client_ip=client_ip, total_connections=len(self.active_connections))
            
            # Send welcome message
            welcome_message = WebSocketMessage(
                "connection_established",
                {
                    "connection_id": connection_id,
                    "server_time": datetime.utcnow().isoformat(),
                    "rate_limit": self.rate_limit_per_minute
                }
            )
            await self._send_to_connection(connection_id, welcome_message)
            
            logger.info("WebSocket connection established", 
                       connection_id=connection_id, 
                       client_ip=client_ip,
                       total_connections=len(self.active_connections))
            
            return True
            
        except Exception as e:
            logger.error("Failed to establish WebSocket connection", 
                        connection_id=connection_id, 
                        client_ip=client_ip, 
                        error=str(e))
            return False
    
    def disconnect(self, connection_id: str):
        """Remove a WebSocket connection."""
        try:
            if connection_id in self.active_connections:
                # Remove from subscriptions
                if connection_id in self.connection_subscriptions:
                    for run_id in self.connection_subscriptions[connection_id]:
                        self.run_subscriptions[run_id].discard(connection_id)
                        if not self.run_subscriptions[run_id]:
                            del self.run_subscriptions[run_id]
                    del self.connection_subscriptions[connection_id]
                
                # Remove connection
                del self.active_connections[connection_id]
                del self.connection_metadata[connection_id]
                
                # Clean up rate limiting data
                if connection_id in self.message_counts:
                    del self.message_counts[connection_id]
                
                # Record disconnection event
                record_websocket_event("connection_closed", connection_id)
                log_websocket_event("connection_closed", connection_id,
                                  total_connections=len(self.active_connections))
                
                logger.info("WebSocket connection closed", 
                           connection_id=connection_id,
                           total_connections=len(self.active_connections))
            
        except Exception as e:
            logger.error("Error during WebSocket disconnection", 
                        connection_id=connection_id, 
                        error=str(e))
    
    async def subscribe_to_run(self, connection_id: str, run_id: str) -> bool:
        """
        Subscribe a connection to updates for a specific run.
        
        Args:
            connection_id: Connection identifier
            run_id: Run identifier to subscribe to
            
        Returns:
            bool: True if subscription successful
        """
        try:
            if connection_id not in self.active_connections:
                logger.warning("Attempted to subscribe with invalid connection", 
                             connection_id=connection_id, run_id=run_id)
                return False
            
            # Add subscription
            self.run_subscriptions[run_id].add(connection_id)
            self.connection_subscriptions[connection_id].add(run_id)
            self.connection_metadata[connection_id]["subscriptions"].add(run_id)
            
            # Send confirmation
            subscription_message = WebSocketMessage(
                "subscription_confirmed",
                {"run_id": run_id, "subscribed": True},
                run_id=run_id
            )
            await self._send_to_connection(connection_id, subscription_message)
            
            record_websocket_event("run_subscribed", run_id)
            log_websocket_event("run_subscribed", run_id, connection_id=connection_id)
            
            logger.info("Connection subscribed to run", 
                       connection_id=connection_id, run_id=run_id)
            
            return True
            
        except Exception as e:
            logger.error("Failed to subscribe to run", 
                        connection_id=connection_id, 
                        run_id=run_id, 
                        error=str(e))
            return False
    
    async def unsubscribe_from_run(self, connection_id: str, run_id: str) -> bool:
        """Unsubscribe a connection from run updates."""
        try:
            if connection_id in self.connection_subscriptions:
                self.connection_subscriptions[connection_id].discard(run_id)
                self.connection_metadata[connection_id]["subscriptions"].discard(run_id)
            
            if run_id in self.run_subscriptions:
                self.run_subscriptions[run_id].discard(connection_id)
                if not self.run_subscriptions[run_id]:
                    del self.run_subscriptions[run_id]
            
            # Send confirmation
            unsubscription_message = WebSocketMessage(
                "subscription_confirmed",
                {"run_id": run_id, "subscribed": False},
                run_id=run_id
            )
            await self._send_to_connection(connection_id, unsubscription_message)
            
            record_websocket_event("run_unsubscribed", run_id)
            log_websocket_event("run_unsubscribed", run_id, connection_id=connection_id)
            
            logger.info("Connection unsubscribed from run", 
                       connection_id=connection_id, run_id=run_id)
            
            return True
            
        except Exception as e:
            logger.error("Failed to unsubscribe from run", 
                        connection_id=connection_id, 
                        run_id=run_id, 
                        error=str(e))
            return False
    
    async def broadcast_to_run(self, run_id: str, message: WebSocketMessage):
        """Broadcast a message to all connections subscribed to a run."""
        try:
            if run_id not in self.run_subscriptions:
                logger.debug("No subscribers for run", run_id=run_id)
                return
            
            subscribers = self.run_subscriptions[run_id].copy()
            if not subscribers:
                return
            
            # Send to all subscribers
            tasks = []
            for connection_id in subscribers:
                if connection_id in self.active_connections:
                    tasks.append(self._send_to_connection(connection_id, message))
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
                record_websocket_event("message_broadcast", run_id)
                logger.debug("Message broadcasted to run subscribers", 
                           run_id=run_id, subscriber_count=len(subscribers))
            
        except Exception as e:
            logger.error("Failed to broadcast message to run", 
                        run_id=run_id, 
                        error=str(e))
    
    async def broadcast_to_all(self, message: WebSocketMessage):
        """Broadcast a message to all active connections."""
        try:
            if not self.active_connections:
                return
            
            tasks = []
            for connection_id in self.active_connections:
                tasks.append(self._send_to_connection(connection_id, message))
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
                record_websocket_event("message_broadcast_all", "global")
                logger.debug("Message broadcasted to all connections", 
                           connection_count=len(self.active_connections))
            
        except Exception as e:
            logger.error("Failed to broadcast message to all connections", error=str(e))
    
    async def _send_to_connection(self, connection_id: str, message: WebSocketMessage):
        """Send a message to a specific connection with error handling."""
        try:
            if connection_id not in self.active_connections:
                return
            
            websocket = self.active_connections[connection_id]
            await websocket.send_text(json.dumps(message.to_dict()))
            
            # Update connection metadata
            if connection_id in self.connection_metadata:
                self.connection_metadata[connection_id]["last_activity"] = datetime.utcnow()
                self.connection_metadata[connection_id]["message_count"] += 1
            
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected during send", connection_id=connection_id)
            self.disconnect(connection_id)
        except Exception as e:
            logger.error("Failed to send message to connection", 
                        connection_id=connection_id, 
                        error=str(e))
            # Remove problematic connection
            self.disconnect(connection_id)
    
    def _is_connection_allowed(self, client_ip: str) -> bool:
        """Check if connection is allowed based on security rules."""
        # Check if IP is blocked
        if client_ip in self.blocked_ips:
            return False
        
        # Check connection attempt rate
        now = datetime.utcnow()
        attempts = self.connection_attempts[client_ip]
        
        # Remove attempts older than 1 hour
        attempts[:] = [attempt for attempt in attempts if now - attempt < timedelta(hours=1)]
        
        # Block if more than 10 connection attempts in the last hour
        if len(attempts) > 10:
            self.blocked_ips.add(client_ip)
            logger.warning("IP blocked due to excessive connection attempts", client_ip=client_ip)
            return False
        
        # Record this attempt
        attempts.append(now)
        return True
    
    def _check_rate_limit(self, connection_id: str) -> bool:
        """Check if connection is within rate limits."""
        now = time.time()
        message_times = self.message_counts[connection_id]
        
        # Remove messages older than 1 minute
        while message_times and now - message_times[0] > 60:
            message_times.popleft()
        
        # Check if under limit
        if len(message_times) >= self.rate_limit_per_minute:
            return False
        
        # Record this message
        message_times.append(now)
        return True
    
    async def handle_message(self, connection_id: str, message_data: Dict[str, Any]):
        """Handle incoming WebSocket message with rate limiting."""
        try:
            # Check rate limit
            if not self._check_rate_limit(connection_id):
                logger.warning("Rate limit exceeded", connection_id=connection_id)
                error_message = WebSocketMessage(
                    "error",
                    {"code": "RATE_LIMIT_EXCEEDED", "message": "Too many messages"}
                )
                await self._send_to_connection(connection_id, error_message)
                return
            
            message_type = message_data.get("type")
            
            if message_type == "subscribe":
                run_id = message_data.get("run_id")
                if run_id:
                    await self.subscribe_to_run(connection_id, run_id)
            
            elif message_type == "unsubscribe":
                run_id = message_data.get("run_id")
                if run_id:
                    await self.unsubscribe_from_run(connection_id, run_id)
            
            elif message_type == "ping":
                pong_message = WebSocketMessage("pong", {"timestamp": datetime.utcnow().isoformat()})
                await self._send_to_connection(connection_id, pong_message)
            
            else:
                logger.warning("Unknown message type", 
                             connection_id=connection_id, 
                             message_type=message_type)
            
        except Exception as e:
            logger.error("Error handling WebSocket message", 
                        connection_id=connection_id, 
                        error=str(e))
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics for monitoring."""
        return {
            "active_connections": len(self.active_connections),
            "max_connections": self.max_connections,
            "run_subscriptions": len(self.run_subscriptions),
            "blocked_ips": len(self.blocked_ips),
            "connection_metadata": {
                connection_id: {
                    "connected_at": metadata["connected_at"].isoformat(),
                    "client_ip": metadata["client_ip"],
                    "last_activity": metadata["last_activity"].isoformat(),
                    "message_count": metadata["message_count"],
                    "subscription_count": len(metadata["subscriptions"])
                }
                for connection_id, metadata in self.connection_metadata.items()
            }
        }
    
    async def cleanup_stale_connections(self):
        """Clean up stale connections (called periodically)."""
        try:
            stale_connections = []
            now = datetime.utcnow()
            
            for connection_id, metadata in self.connection_metadata.items():
                # Consider connection stale if no activity for 30 minutes
                if now - metadata["last_activity"] > timedelta(minutes=30):
                    stale_connections.append(connection_id)
            
            for connection_id in stale_connections:
                logger.info("Cleaning up stale connection", connection_id=connection_id)
                self.disconnect(connection_id)
            
            if stale_connections:
                logger.info("Cleaned up stale connections", count=len(stale_connections))
            
        except Exception as e:
            logger.error("Error during connection cleanup", error=str(e))

# Global connection manager instance
connection_manager = ConnectionManager()
