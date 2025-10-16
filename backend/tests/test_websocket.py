"""
Comprehensive tests for WebSocket functionality.
"""

import pytest
import asyncio
import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi import WebSocket

from services.websocket_manager import ConnectionManager, WebSocketMessage
from api.websocket_endpoints import router as websocket_router
from main_complete import app

class TestWebSocketMessage:
    """Test WebSocket message structure."""
    
    def test_websocket_message_creation(self):
        """Test WebSocket message creation and serialization."""
        message = WebSocketMessage(
            message_type="test",
            data={"key": "value"},
            run_id="test-run-id",
            timestamp=datetime.utcnow()
        )
        
        assert message.type == "test"
        assert message.data == {"key": "value"}
        assert message.run_id == "test-run-id"
        assert isinstance(message.timestamp, datetime)
        
        # Test serialization
        message_dict = message.to_dict()
        assert message_dict["type"] == "test"
        assert message_dict["data"] == {"key": "value"}
        assert message_dict["run_id"] == "test-run-id"
        assert "timestamp" in message_dict

class TestConnectionManager:
    """Test WebSocket connection manager."""
    
    @pytest.fixture
    def connection_manager(self):
        """Create a connection manager for testing."""
        return ConnectionManager(max_connections=10, rate_limit_per_minute=10)
    
    @pytest.fixture
    def mock_websocket(self):
        """Create a mock WebSocket for testing."""
        websocket = Mock(spec=WebSocket)
        websocket.accept = AsyncMock()
        websocket.send_text = AsyncMock()
        websocket.client.host = "127.0.0.1"
        return websocket
    
    @pytest.mark.asyncio
    async def test_connection_acceptance(self, connection_manager, mock_websocket):
        """Test successful connection acceptance."""
        connection_id = str(uuid.uuid4())
        client_ip = "127.0.0.1"
        
        result = await connection_manager.connect(mock_websocket, connection_id, client_ip)
        
        assert result is True
        assert connection_id in connection_manager.active_connections
        assert connection_id in connection_manager.connection_metadata
        mock_websocket.accept.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_connection_limit(self, connection_manager, mock_websocket):
        """Test connection limit enforcement."""
        # Fill up connections to limit
        for i in range(10):
            connection_id = str(uuid.uuid4())
            websocket = Mock(spec=WebSocket)
            websocket.accept = AsyncMock()
            websocket.client.host = "127.0.0.1"
            
            result = await connection_manager.connect(websocket, connection_id, "127.0.0.1")
            assert result is True
        
        # Try to add one more connection
        connection_id = str(uuid.uuid4())
        result = await connection_manager.connect(mock_websocket, connection_id, "127.0.0.1")
        assert result is False
    
    @pytest.mark.asyncio
    async def test_connection_disconnection(self, connection_manager, mock_websocket):
        """Test connection disconnection."""
        connection_id = str(uuid.uuid4())
        
        # Connect
        await connection_manager.connect(mock_websocket, connection_id, "127.0.0.1")
        assert connection_id in connection_manager.active_connections
        
        # Disconnect
        connection_manager.disconnect(connection_id)
        assert connection_id not in connection_manager.active_connections
        assert connection_id not in connection_manager.connection_metadata
    
    @pytest.mark.asyncio
    async def test_run_subscription(self, connection_manager, mock_websocket):
        """Test run subscription functionality."""
        connection_id = str(uuid.uuid4())
        run_id = "test-run-id"
        
        # Connect
        await connection_manager.connect(mock_websocket, connection_id, "127.0.0.1")
        
        # Subscribe to run
        result = await connection_manager.subscribe_to_run(connection_id, run_id)
        assert result is True
        assert run_id in connection_manager.run_subscriptions
        assert connection_id in connection_manager.run_subscriptions[run_id]
        assert run_id in connection_manager.connection_subscriptions[connection_id]
    
    @pytest.mark.asyncio
    async def test_run_unsubscription(self, connection_manager, mock_websocket):
        """Test run unsubscription functionality."""
        connection_id = str(uuid.uuid4())
        run_id = "test-run-id"
        
        # Connect and subscribe
        await connection_manager.connect(mock_websocket, connection_id, "127.0.0.1")
        await connection_manager.subscribe_to_run(connection_id, run_id)
        
        # Unsubscribe
        result = await connection_manager.unsubscribe_from_run(connection_id, run_id)
        assert result is True
        assert run_id not in connection_manager.connection_subscriptions[connection_id]
    
    @pytest.mark.asyncio
    async def test_broadcast_to_run(self, connection_manager, mock_websocket):
        """Test broadcasting messages to run subscribers."""
        connection_id = str(uuid.uuid4())
        run_id = "test-run-id"
        
        # Connect and subscribe
        await connection_manager.connect(mock_websocket, connection_id, "127.0.0.1")
        await connection_manager.subscribe_to_run(connection_id, run_id)
        
        # Broadcast message
        message = WebSocketMessage("test_message", {"data": "test"}, run_id)
        await connection_manager.broadcast_to_run(run_id, message)
        
        # Verify message was sent
        mock_websocket.send_text.assert_called()
        call_args = mock_websocket.send_text.call_args[0][0]
        message_data = json.loads(call_args)
        assert message_data["type"] == "test_message"
        assert message_data["data"] == {"data": "test"}
    
    def test_rate_limiting(self, connection_manager):
        """Test rate limiting functionality."""
        connection_id = str(uuid.uuid4())
        
        # Should be within rate limit initially
        assert connection_manager._check_rate_limit(connection_id) is True
        
        # Exceed rate limit
        for _ in range(10):
            connection_manager._check_rate_limit(connection_id)
        
        # Should be rate limited now
        assert connection_manager._check_rate_limit(connection_id) is False
    
    def test_connection_stats(self, connection_manager):
        """Test connection statistics."""
        stats = connection_manager.get_connection_stats()
        
        assert "active_connections" in stats
        assert "max_connections" in stats
        assert "run_subscriptions" in stats
        assert "blocked_ips" in stats
        assert "connection_metadata" in stats
        
        assert stats["active_connections"] == 0
        assert stats["max_connections"] == 10

class TestWebSocketEndpoints:
    """Test WebSocket endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)
    
    @pytest.mark.asyncio
    async def test_websocket_stats_endpoint(self, client):
        """Test WebSocket statistics endpoint."""
        response = client.get("/ws/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        assert "active_connections" in data["data"]
    
    @pytest.mark.asyncio
    async def test_broadcast_endpoint(self, client):
        """Test broadcast endpoint."""
        message_data = {
            "type": "test_broadcast",
            "data": {"message": "test"}
        }
        
        response = client.post("/ws/broadcast", json=message_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "Message broadcasted successfully" in data["message"]

class TestWebSocketIntegration:
    """Integration tests for WebSocket functionality."""
    
    @pytest.mark.asyncio
    async def test_websocket_connection_flow(self):
        """Test complete WebSocket connection flow."""
        connection_manager = ConnectionManager()
        mock_websocket = Mock(spec=WebSocket)
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        mock_websocket.client.host = "127.0.0.1"
        
        connection_id = str(uuid.uuid4())
        run_id = "test-run-id"
        
        # Connect
        result = await connection_manager.connect(mock_websocket, connection_id, "127.0.0.1")
        assert result is True
        
        # Subscribe to run
        result = await connection_manager.subscribe_to_run(connection_id, run_id)
        assert result is True
        
        # Send progress update
        progress_message = WebSocketMessage(
            "progress_update",
            {"progress": 50, "message": "Halfway done"},
            run_id
        )
        await connection_manager.broadcast_to_run(run_id, progress_message)
        
        # Verify message was sent
        mock_websocket.send_text.assert_called()
        
        # Disconnect
        connection_manager.disconnect(connection_id)
        assert connection_id not in connection_manager.active_connections
    
    @pytest.mark.asyncio
    async def test_multiple_connections_same_run(self):
        """Test multiple connections subscribing to the same run."""
        connection_manager = ConnectionManager()
        run_id = "test-run-id"
        
        # Create multiple connections
        connections = []
        for i in range(3):
            mock_websocket = Mock(spec=WebSocket)
            mock_websocket.accept = AsyncMock()
            mock_websocket.send_text = AsyncMock()
            mock_websocket.client.host = "127.0.0.1"
            
            connection_id = str(uuid.uuid4())
            await connection_manager.connect(mock_websocket, connection_id, "127.0.0.1")
            await connection_manager.subscribe_to_run(connection_id, run_id)
            connections.append((connection_id, mock_websocket))
        
        # Broadcast message
        message = WebSocketMessage("test_message", {"data": "test"}, run_id)
        await connection_manager.broadcast_to_run(run_id, message)
        
        # Verify all connections received the message
        for connection_id, mock_websocket in connections:
            mock_websocket.send_text.assert_called()
    
    @pytest.mark.asyncio
    async def test_connection_cleanup(self):
        """Test stale connection cleanup."""
        connection_manager = ConnectionManager()
        
        # Create a connection with old last_activity
        mock_websocket = Mock(spec=WebSocket)
        mock_websocket.accept = AsyncMock()
        mock_websocket.client.host = "127.0.0.1"
        
        connection_id = str(uuid.uuid4())
        await connection_manager.connect(mock_websocket, connection_id, "127.0.0.1")
        
        # Manually set old last_activity
        connection_manager.connection_metadata[connection_id]["last_activity"] = (
            datetime.utcnow() - timedelta(minutes=35)
        )
        
        # Run cleanup
        await connection_manager.cleanup_stale_connections()
        
        # Connection should be removed
        assert connection_id not in connection_manager.active_connections

class TestWebSocketSecurity:
    """Test WebSocket security features."""
    
    @pytest.mark.asyncio
    async def test_ip_blocking(self):
        """Test IP blocking functionality."""
        connection_manager = ConnectionManager()
        
        # Block an IP
        blocked_ip = "192.168.1.100"
        connection_manager.blocked_ips.add(blocked_ip)
        
        # Try to connect from blocked IP
        mock_websocket = Mock(spec=WebSocket)
        mock_websocket.client.host = blocked_ip
        
        connection_id = str(uuid.uuid4())
        result = await connection_manager.connect(mock_websocket, connection_id, blocked_ip)
        
        assert result is False
        assert connection_id not in connection_manager.active_connections
    
    @pytest.mark.asyncio
    async def test_connection_attempt_rate_limiting(self):
        """Test connection attempt rate limiting."""
        connection_manager = ConnectionManager()
        client_ip = "192.168.1.101"
        
        # Make many connection attempts
        for i in range(12):  # More than the limit of 10
            mock_websocket = Mock(spec=WebSocket)
            mock_websocket.client.host = client_ip
            
            connection_id = str(uuid.uuid4())
            result = await connection_manager.connect(mock_websocket, connection_id, client_ip)
            
            if i < 10:
                assert result is True
            else:
                assert result is False
        
        # IP should be blocked
        assert client_ip in connection_manager.blocked_ips

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
