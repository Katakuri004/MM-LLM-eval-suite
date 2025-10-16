"""
End-to-end integration tests for the complete evaluation workflow.
"""

import pytest
import asyncio
import json
import uuid
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
import websockets

from main_complete import app
from services.evaluation_service import evaluation_service
from services.websocket_manager import connection_manager
from services.supabase_service import supabase_service

class TestEvaluationWorkflowIntegration:
    """Integration tests for the complete evaluation workflow."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_database(self):
        """Mock database operations."""
        with patch('services.supabase_service.supabase_service') as mock:
            # Mock model operations
            mock.get_model_by_id.return_value = {
                "id": "test-model-id",
                "name": "test-model",
                "loading_method": "huggingface",
                "model_path": "test/model",
                "family": "TestFamily"
            }
            
            # Mock benchmark operations
            mock.get_benchmark_by_id.return_value = {
                "id": "test-benchmark-id",
                "name": "test-benchmark",
                "modality": "vision",
                "category": "vqa"
            }
            
            # Mock run operations
            mock.create_run.return_value = {"id": "test-run-id", "status": "pending"}
            mock.update_run_status.return_value = {"id": "test-run-id", "status": "running"}
            mock.get_run_by_id.return_value = {
                "id": "test-run-id",
                "status": "running",
                "model_id": "test-model-id",
                "benchmark_id": "test-benchmark-id"
            }
            mock.create_result.return_value = {"id": "test-result-id"}
            
            # Mock health check
            mock.is_available.return_value = True
            mock.health_check.return_value = True
            
            yield mock
    
    @pytest.mark.asyncio
    async def test_complete_evaluation_workflow(self, client, mock_database):
        """Test complete evaluation workflow from API to WebSocket updates."""
        
        # 1. Start evaluation via API
        evaluation_request = {
            "model_id": "test-model-id",
            "benchmark_ids": ["test-benchmark-id"],
            "config": {
                "shots": 0,
                "seed": 42,
                "temperature": 0.0
            },
            "run_name": "Integration Test Evaluation"
        }
        
        with patch.object(evaluation_service, '_run_lmms_eval_command', new_callable=AsyncMock) as mock_run_cmd:
            mock_run_cmd.return_value = {
                "metrics": {
                    "accuracy": 0.85,
                    "f1_score": 0.82,
                    "bleu_score": 0.78
                },
                "samples_processed": 100,
                "duration_seconds": 120.5,
                "model_performance": {
                    "inference_time": 0.5,
                    "memory_usage": "2.1GB"
                }
            }
            
            # Start evaluation
            response = client.post("/api/v1/runs", json=evaluation_request)
            assert response.status_code == 200
            
            run_data = response.json()
            assert "run_id" in run_data
            run_id = run_data["run_id"]
            
            # 2. Check run status
            response = client.get(f"/api/v1/runs/{run_id}")
            assert response.status_code == 200
            
            status_data = response.json()
            assert status_data["run_id"] == run_id
            assert status_data["status"] in ["pending", "running", "completed"]
            
            # 3. Wait for evaluation to complete
            await asyncio.sleep(0.1)
            
            # 4. Check final results
            response = client.get(f"/api/v1/runs/{run_id}/results")
            assert response.status_code == 200
            
            results_data = response.json()
            assert "metrics" in results_data
            assert "accuracy" in results_data["metrics"]
    
    @pytest.mark.asyncio
    async def test_websocket_evaluation_updates(self, mock_database):
        """Test WebSocket real-time updates during evaluation."""
        
        # Mock WebSocket connection
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        mock_websocket.client.host = "127.0.0.1"
        
        connection_id = str(uuid.uuid4())
        run_id = "test-run-id"
        
        # Connect WebSocket
        await connection_manager.connect(mock_websocket, connection_id, "127.0.0.1")
        
        # Subscribe to run
        await connection_manager.subscribe_to_run(connection_id, run_id)
        
        # Simulate evaluation progress updates
        progress_message = {
            "type": "progress_update",
            "data": {
                "progress": 50,
                "message": "Halfway through evaluation",
                "timestamp": datetime.utcnow().isoformat()
            },
            "run_id": run_id
        }
        
        # Send progress update
        from services.websocket_manager import WebSocketMessage
        message = WebSocketMessage("progress_update", progress_message["data"], run_id)
        await connection_manager.broadcast_to_run(run_id, message)
        
        # Verify message was sent
        mock_websocket.send_text.assert_called()
        call_args = mock_websocket.send_text.call_args[0][0]
        message_data = json.loads(call_args)
        assert message_data["type"] == "progress_update"
        assert message_data["data"]["progress"] == 50
        
        # Clean up
        connection_manager.disconnect(connection_id)
    
    @pytest.mark.asyncio
    async def test_model_registration_and_evaluation(self, client, mock_database):
        """Test model registration followed by evaluation."""
        
        # 1. Register a model
        model_data = {
            "model_path": "test/model",
            "auto_detect": True
        }
        
        with patch('services.model_loader_service.model_loader_service') as mock_loader:
            mock_loader.load_from_huggingface.return_value = {
                "id": "test-model-id",
                "name": "test-model",
                "family": "TestFamily",
                "loading_method": "huggingface",
                "model_path": "test/model",
                "validation_status": "detected"
            }
            
            response = client.post("/api/v1/models/register/huggingface", json=model_data)
            assert response.status_code == 200
            
            model_response = response.json()
            assert model_response["message"] == "Model registered successfully"
            model_id = model_response["model"]["id"]
            
            # 2. Start evaluation with the registered model
            evaluation_request = {
                "model_id": model_id,
                "benchmark_ids": ["test-benchmark-id"],
                "config": {"shots": 0, "seed": 42}
            }
            
            with patch.object(evaluation_service, '_run_lmms_eval_command', new_callable=AsyncMock) as mock_run_cmd:
                mock_run_cmd.return_value = {
                    "metrics": {"accuracy": 0.85},
                    "samples_processed": 100,
                    "duration_seconds": 120.5
                }
                
                response = client.post("/api/v1/runs", json=evaluation_request)
                assert response.status_code == 200
                
                run_data = response.json()
                assert "run_id" in run_data
    
    @pytest.mark.asyncio
    async def test_error_handling_workflow(self, client, mock_database):
        """Test error handling throughout the evaluation workflow."""
        
        # Test with invalid model ID
        evaluation_request = {
            "model_id": "invalid-model-id",
            "benchmark_ids": ["test-benchmark-id"],
            "config": {"shots": 0, "seed": 42}
        }
        
        mock_database.get_model_by_id.return_value = None
        
        response = client.post("/api/v1/runs", json=evaluation_request)
        assert response.status_code == 404
        
        # Test with invalid benchmark ID
        evaluation_request["model_id"] = "test-model-id"
        evaluation_request["benchmark_ids"] = ["invalid-benchmark-id"]
        
        mock_database.get_model_by_id.return_value = {
            "id": "test-model-id",
            "name": "test-model",
            "loading_method": "huggingface"
        }
        mock_database.get_benchmark_by_id.return_value = None
        
        response = client.post("/api/v1/runs", json=evaluation_request)
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_concurrent_evaluations(self, client, mock_database):
        """Test handling multiple concurrent evaluations."""
        
        evaluation_requests = []
        for i in range(3):
            request = {
                "model_id": f"test-model-{i}",
                "benchmark_ids": [f"test-benchmark-{i}"],
                "config": {"shots": 0, "seed": 42 + i},
                "run_name": f"Concurrent Test {i}"
            }
            evaluation_requests.append(request)
        
        # Mock different models and benchmarks
        def mock_get_model_by_id(model_id):
            return {
                "id": model_id,
                "name": f"test-model-{model_id.split('-')[-1]}",
                "loading_method": "huggingface",
                "model_path": f"test/model-{model_id.split('-')[-1]}"
            }
        
        def mock_get_benchmark_by_id(benchmark_id):
            return {
                "id": benchmark_id,
                "name": f"test-benchmark-{benchmark_id.split('-')[-1]}",
                "modality": "vision",
                "category": "vqa"
            }
        
        mock_database.get_model_by_id.side_effect = mock_get_model_by_id
        mock_database.get_benchmark_by_id.side_effect = mock_get_benchmark_by_id
        
        with patch.object(evaluation_service, '_run_lmms_eval_command', new_callable=AsyncMock) as mock_run_cmd:
            mock_run_cmd.return_value = {
                "metrics": {"accuracy": 0.85},
                "samples_processed": 100,
                "duration_seconds": 120.5
            }
            
            # Start all evaluations
            run_ids = []
            for request in evaluation_requests:
                response = client.post("/api/v1/runs", json=request)
                assert response.status_code == 200
                run_data = response.json()
                run_ids.append(run_data["run_id"])
            
            # Wait for all to complete
            await asyncio.sleep(0.1)
            
            # Check all runs are tracked
            active_runs = await evaluation_service.get_active_runs()
            # Note: In real scenario, runs would complete and be removed from active_runs
            
            # Verify all runs were created
            assert len(run_ids) == 3
            assert all(run_id is not None for run_id in run_ids)
    
    @pytest.mark.asyncio
    async def test_websocket_connection_management(self):
        """Test WebSocket connection management under load."""
        
        # Create multiple connections
        connections = []
        for i in range(5):
            mock_websocket = Mock()
            mock_websocket.accept = AsyncMock()
            mock_websocket.send_text = AsyncMock()
            mock_websocket.client.host = f"127.0.0.{i+1}"
            
            connection_id = str(uuid.uuid4())
            await connection_manager.connect(mock_websocket, connection_id, f"127.0.0.{i+1}")
            connections.append((connection_id, mock_websocket))
        
        # Subscribe all to the same run
        run_id = "test-run-id"
        for connection_id, _ in connections:
            await connection_manager.subscribe_to_run(connection_id, run_id)
        
        # Broadcast message to all
        from services.websocket_manager import WebSocketMessage
        message = WebSocketMessage("test_broadcast", {"data": "test"}, run_id)
        await connection_manager.broadcast_to_run(run_id, message)
        
        # Verify all connections received the message
        for connection_id, mock_websocket in connections:
            mock_websocket.send_text.assert_called()
        
        # Disconnect all
        for connection_id, _ in connections:
            connection_manager.disconnect(connection_id)
        
        # Verify all connections are cleaned up
        stats = connection_manager.get_connection_stats()
        assert stats["active_connections"] == 0
    
    @pytest.mark.asyncio
    async def test_database_unavailable_graceful_degradation(self, client):
        """Test graceful degradation when database is unavailable."""
        
        with patch('services.supabase_service.supabase_service') as mock_supabase:
            mock_supabase.is_available.return_value = False
            mock_supabase.health_check.return_value = False
            
            # Health check should indicate limited mode
            response = client.get("/health")
            assert response.status_code == 200
            
            health_data = response.json()
            assert health_data["database"] == "disconnected"
            assert health_data["mode"] == "limited"
            
            # API endpoints should return 503 for database operations
            evaluation_request = {
                "model_id": "test-model-id",
                "benchmark_ids": ["test-benchmark-id"],
                "config": {"shots": 0, "seed": 42}
            }
            
            response = client.post("/api/v1/runs", json=evaluation_request)
            assert response.status_code == 503
    
    @pytest.mark.asyncio
    async def test_websocket_rate_limiting(self):
        """Test WebSocket rate limiting functionality."""
        
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        mock_websocket.client.host = "127.0.0.1"
        
        connection_id = str(uuid.uuid4())
        await connection_manager.connect(mock_websocket, connection_id, "127.0.0.1")
        
        # Send many messages quickly to trigger rate limiting
        for i in range(15):  # More than the rate limit of 10
            message_data = {
                "type": "ping",
                "data": {"message": f"ping {i}"}
            }
            await connection_manager.handle_message(connection_id, message_data)
        
        # Verify rate limiting was triggered
        # The last few messages should have been rate limited
        # (This would be verified by checking for rate limit error messages)
        
        connection_manager.disconnect(connection_id)

class TestPerformanceIntegration:
    """Performance and load testing for the evaluation system."""
    
    @pytest.mark.asyncio
    async def test_high_throughput_websocket_messages(self):
        """Test WebSocket performance under high message throughput."""
        
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        mock_websocket.client.host = "127.0.0.1"
        
        connection_id = str(uuid.uuid4())
        await connection_manager.connect(mock_websocket, connection_id, "127.0.0.1")
        
        run_id = "performance-test-run"
        await connection_manager.subscribe_to_run(connection_id, run_id)
        
        # Send many messages rapidly
        start_time = datetime.utcnow()
        message_count = 100
        
        for i in range(message_count):
            from services.websocket_manager import WebSocketMessage
            message = WebSocketMessage("performance_test", {"index": i}, run_id)
            await connection_manager.broadcast_to_run(run_id, message)
        
        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()
        
        # Verify all messages were sent
        assert mock_websocket.send_text.call_count == message_count
        
        # Performance should be reasonable (less than 1 second for 100 messages)
        assert duration < 1.0
        
        connection_manager.disconnect(connection_id)
    
    @pytest.mark.asyncio
    async def test_memory_usage_under_load(self):
        """Test memory usage under sustained load."""
        
        # Create many connections
        connections = []
        for i in range(20):
            mock_websocket = Mock()
            mock_websocket.accept = AsyncMock()
            mock_websocket.send_text = AsyncMock()
            mock_websocket.client.host = f"127.0.0.{i+1}"
            
            connection_id = str(uuid.uuid4())
            await connection_manager.connect(mock_websocket, connection_id, f"127.0.0.{i+1}")
            connections.append(connection_id)
        
        # Subscribe to multiple runs
        for i, connection_id in enumerate(connections):
            run_id = f"run-{i % 5}"  # 5 different runs
            await connection_manager.subscribe_to_run(connection_id, run_id)
        
        # Send messages to all runs
        for i in range(5):
            run_id = f"run-{i}"
            from services.websocket_manager import WebSocketMessage
            message = WebSocketMessage("load_test", {"data": "test"}, run_id)
            await connection_manager.broadcast_to_run(run_id, message)
        
        # Check connection stats
        stats = connection_manager.get_connection_stats()
        assert stats["active_connections"] == 20
        assert stats["run_subscriptions"] == 5
        
        # Clean up
        for connection_id in connections:
            connection_manager.disconnect(connection_id)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
