"""
Pytest configuration and shared fixtures for backend tests.
"""

import pytest
import asyncio
import os
import sys
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def mock_settings():
    """Mock application settings."""
    with patch('config.get_settings') as mock:
        mock.return_value = Mock(
            supabase_url="https://test.supabase.co",
            supabase_key="test-key",
            supabase_service_role_key="test-service-key",
            api_v1_str="/api/v1",
            project_name="LMMS-Eval Dashboard Test",
            version="1.0.0",
            backend_cors_origins=["http://localhost:3000"],
            log_level="DEBUG",
            available_gpus=["cuda:0", "cuda:1"],
            default_compute_profile="test-profile",
            debug=True,
            lmms_eval_path="/test/lmms-eval",
            hf_home="/test/hf",
            hf_token="test-hf-token"
        )
        yield mock.return_value

@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client."""
    with patch('supabase.create_client') as mock:
        client_mock = Mock()
        client_mock.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []
        mock.return_value = client_mock
        yield client_mock

@pytest.fixture
def mock_environment():
    """Mock environment variables."""
    env_vars = {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "SUPABASE_SERVICE_ROLE_KEY": "test-service-key",
        "SECRET_KEY": "test-secret-key",
        "LOG_LEVEL": "DEBUG",
        "LMMS_EVAL_PATH": "/test/lmms-eval",
        "HF_HOME": "/test/hf",
        "HF_TOKEN": "test-hf-token"
    }
    
    with patch.dict(os.environ, env_vars):
        yield env_vars

@pytest.fixture
def temp_directory():
    """Create a temporary directory for tests."""
    import tempfile
    with tempfile.TemporaryDirectory() as temp_dir:
        yield Path(temp_dir)

@pytest.fixture
def mock_lmms_eval_path(temp_directory):
    """Create a mock lmms-eval directory structure."""
    lmms_eval_dir = temp_directory / "lmms-eval"
    lmms_eval_dir.mkdir()
    
    # Create mock files
    (lmms_eval_dir / "lmms_eval").mkdir()
    (lmms_eval_dir / "lmms_eval" / "__init__.py").touch()
    (lmms_eval_dir / "setup.py").write_text("""
from setuptools import setup, find_packages

setup(
    name="lmms-eval",
    version="0.1.0",
    packages=find_packages(),
)
""")
    
    return lmms_eval_dir

@pytest.fixture
def mock_model_data():
    """Mock model data for testing."""
    return {
        "id": "test-model-id",
        "name": "test-model",
        "family": "TestFamily",
        "source": "huggingface",
        "loading_method": "huggingface",
        "model_path": "test/model",
        "dtype": "float16",
        "num_parameters": 7000000000,
        "notes": "Test model",
        "metadata": {"version": "1.0"},
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00",
        "validation_status": "validated",
        "validation_results": {"status": "success"}
    }

@pytest.fixture
def mock_benchmark_data():
    """Mock benchmark data for testing."""
    return {
        "id": "test-benchmark-id",
        "name": "test-benchmark",
        "modality": "vision",
        "category": "vqa",
        "task_type": "visual_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 100,
        "description": "Test benchmark",
        "created_at": "2024-01-01T00:00:00"
    }

@pytest.fixture
def mock_run_data():
    """Mock run data for testing."""
    return {
        "id": "test-run-id",
        "name": "Test Evaluation",
        "model_id": "test-model-id",
        "benchmark_id": "test-benchmark-id",
        "status": "running",
        "config": {"shots": 0, "seed": 42},
        "started_at": "2024-01-01T00:00:00",
        "completed_at": None,
        "duration_seconds": None,
        "results": None,
        "error_message": None,
        "created_at": "2024-01-01T00:00:00"
    }

@pytest.fixture
def mock_result_data():
    """Mock result data for testing."""
    return {
        "id": "test-result-id",
        "run_id": "test-run-id",
        "metric_name": "accuracy",
        "metric_value": 0.85,
        "metric_type": "primary",
        "metadata": {
            "duration": 120.5,
            "timestamp": "2024-01-01T01:00:00"
        },
        "created_at": "2024-01-01T01:00:00"
    }

@pytest.fixture
def mock_websocket():
    """Mock WebSocket for testing."""
    websocket = Mock()
    websocket.accept = AsyncMock()
    websocket.send_text = AsyncMock()
    websocket.send_json = AsyncMock()
    websocket.receive_text = AsyncMock()
    websocket.receive_json = AsyncMock()
    websocket.close = AsyncMock()
    websocket.client.host = "127.0.0.1"
    return websocket

@pytest.fixture
def mock_subprocess():
    """Mock subprocess for testing."""
    with patch('asyncio.create_subprocess_exec') as mock:
        process_mock = Mock()
        process_mock.pid = 12345
        process_mock.wait = AsyncMock(return_value=0)
        process_mock.stdout.readline = AsyncMock(return_value=b"")
        mock.return_value = process_mock
        yield mock

@pytest.fixture(autouse=True)
def reset_global_state():
    """Reset global state between tests."""
    # Reset connection manager
    from services.websocket_manager import connection_manager
    connection_manager.active_connections.clear()
    connection_manager.connection_metadata.clear()
    connection_manager.run_subscriptions.clear()
    connection_manager.connection_subscriptions.clear()
    connection_manager.blocked_ips.clear()
    connection_manager.message_counts.clear()
    
    # Reset evaluation service
    from services.evaluation_service import evaluation_service
    evaluation_service.active_runs.clear()
    
    yield
    
    # Cleanup after test
    connection_manager.active_connections.clear()
    connection_manager.connection_metadata.clear()
    connection_manager.run_subscriptions.clear()
    connection_manager.connection_subscriptions.clear()
    connection_manager.blocked_ips.clear()
    connection_manager.message_counts.clear()
    evaluation_service.active_runs.clear()
