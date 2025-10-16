"""
Comprehensive tests for evaluation service functionality.
"""

import pytest
import asyncio
import json
import uuid
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from services.evaluation_service import EvaluationService
from services.supabase_service import supabase_service
from runners.lmms_eval_runner import LMMSEvalRunner
from main_complete import app

class TestEvaluationService:
    """Test evaluation service functionality."""
    
    @pytest.fixture
    def evaluation_service(self):
        """Create evaluation service for testing."""
        return EvaluationService()
    
    @pytest.fixture
    def mock_supabase_service(self):
        """Create mock Supabase service."""
        with patch('services.evaluation_service.supabase_service') as mock:
            mock.create_run.return_value = {"id": "test-run-id", "status": "pending"}
            mock.update_run_status.return_value = {"id": "test-run-id", "status": "running"}
            mock.get_run_by_id.return_value = {"id": "test-run-id", "status": "running"}
            mock.create_result.return_value = {"id": "test-result-id"}
            yield mock
    
    @pytest.fixture
    def mock_lmms_eval_runner(self):
        """Create mock LMMS-Eval runner."""
        with patch('services.evaluation_service.LMMSEvalRunner') as mock:
            runner_instance = Mock()
            runner_instance.model_id = "test-model"
            runner_instance.benchmark_ids = ["test-benchmark"]
            runner_instance.prepare_command.return_value = ["lmms_eval", "--model", "test-model"]
            mock.return_value = runner_instance
            yield mock
    
    @pytest.mark.asyncio
    async def test_start_evaluation(self, evaluation_service, mock_supabase_service, mock_lmms_eval_runner):
        """Test starting an evaluation."""
        model_id = "test-model"
        benchmark_ids = ["test-benchmark"]
        config = {"shots": 0, "seed": 42}
        run_name = "Test Evaluation"
        
        with patch.object(evaluation_service, '_run_evaluation', new_callable=AsyncMock) as mock_run:
            mock_run.return_value = None
            
            run_id = await evaluation_service.start_evaluation(
                model_id=model_id,
                benchmark_ids=benchmark_ids,
                config=config,
                run_name=run_name
            )
            
            assert run_id is not None
            assert run_id in evaluation_service.active_runs
            mock_supabase_service.create_run.assert_called_once()
            mock_run.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_run_evaluation_success(self, evaluation_service, mock_supabase_service, mock_lmms_eval_runner):
        """Test successful evaluation run."""
        run_id = "test-run-id"
        model_id = "test-model"
        benchmark_ids = ["test-benchmark"]
        config = {"shots": 0, "seed": 42}
        
        with patch.object(evaluation_service, '_run_lmms_eval_command', new_callable=AsyncMock) as mock_run_cmd:
            mock_run_cmd.return_value = {
                "metrics": {"accuracy": 0.85, "f1_score": 0.82},
                "samples_processed": 100,
                "duration_seconds": 120.5
            }
            
            with patch.object(evaluation_service, '_save_results', new_callable=AsyncMock) as mock_save:
                await evaluation_service._run_evaluation(run_id, model_id, benchmark_ids, config)
                
                mock_supabase_service.update_run_status.assert_called()
                mock_run_cmd.assert_called_once()
                mock_save.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_run_evaluation_failure(self, evaluation_service, mock_supabase_service, mock_lmms_eval_runner):
        """Test evaluation run failure."""
        run_id = "test-run-id"
        model_id = "test-model"
        benchmark_ids = ["test-benchmark"]
        config = {"shots": 0, "seed": 42}
        
        with patch.object(evaluation_service, '_run_lmms_eval_command', new_callable=AsyncMock) as mock_run_cmd:
            mock_run_cmd.side_effect = Exception("Evaluation failed")
            
            await evaluation_service._run_evaluation(run_id, model_id, benchmark_ids, config)
            
            # Should update status to failed
            mock_supabase_service.update_run_status.assert_called_with(
                run_id, "failed", error_message="Evaluation failed"
            )
    
    @pytest.mark.asyncio
    async def test_run_lmms_eval_command_success(self, evaluation_service):
        """Test successful lmms-eval command execution."""
        run_id = "test-run-id"
        command = ["lmms_eval", "--model", "test-model", "--benchmark", "test-benchmark"]
        
        # Mock subprocess
        mock_process = Mock()
        mock_process.pid = 12345
        mock_process.wait = AsyncMock(return_value=0)
        
        # Mock stdout
        output_lines = [
            b"Starting evaluation...\n",
            b"Progress: 25%\n",
            b"accuracy = 0.85\n",
            b"Progress: 50%\n",
            b"f1_score = 0.82\n",
            b"Progress: 100%\n",
            b"Evaluation completed successfully\n"
        ]
        
        async def mock_readline():
            for line in output_lines:
                yield line
            yield b""  # End of output
        
        mock_process.stdout.readline = AsyncMock(side_effect=mock_readline())
        
        with patch('asyncio.create_subprocess_exec', return_value=mock_process):
            with patch.object(evaluation_service, '_send_websocket_update', new_callable=AsyncMock) as mock_ws:
                result = await evaluation_service._run_lmms_eval_command(run_id, command)
                
                assert "metrics" in result
                assert "accuracy" in result["metrics"]
                assert result["metrics"]["accuracy"] == 0.85
                assert result["metrics"]["f1_score"] == 0.82
                assert result["samples_processed"] == 0  # Default value
                
                # Verify WebSocket updates were sent
                assert mock_ws.call_count > 0
    
    @pytest.mark.asyncio
    async def test_run_lmms_eval_command_failure(self, evaluation_service):
        """Test lmms-eval command execution failure."""
        run_id = "test-run-id"
        command = ["lmms_eval", "--model", "test-model", "--benchmark", "test-benchmark"]
        
        # Mock subprocess that fails
        mock_process = Mock()
        mock_process.pid = 12345
        mock_process.wait = AsyncMock(return_value=1)  # Non-zero exit code
        
        # Mock stdout with error
        output_lines = [
            b"Starting evaluation...\n",
            b"Error: Model not found\n",
            b"Evaluation failed\n"
        ]
        
        async def mock_readline():
            for line in output_lines:
                yield line
            yield b""  # End of output
        
        mock_process.stdout.readline = AsyncMock(side_effect=mock_readline())
        
        with patch('asyncio.create_subprocess_exec', return_value=mock_process):
            with patch.object(evaluation_service, '_send_websocket_update', new_callable=AsyncMock) as mock_ws:
                with pytest.raises(RuntimeError, match="lmms-eval process failed"):
                    await evaluation_service._run_lmms_eval_command(run_id, command)
                
                # Verify error WebSocket update was sent
                mock_ws.assert_called_with(run_id, "evaluation_failed", 
                                         {"error": "lmms-eval process failed with return code 1", 
                                          "return_code": 1, "output": "Error: Model not found\nEvaluation failed\n", 
                                          "timestamp": mock_ws.call_args[0][2]["timestamp"]})
    
    def test_parse_lmms_eval_output_progress(self, evaluation_service):
        """Test parsing progress from lmms-eval output."""
        # Test progress parsing
        line = "Progress: 75% - Processing batch 15/20"
        result = evaluation_service._parse_lmms_eval_output(line)
        
        assert result is not None
        assert result["progress"] == 75
        assert "Processing batch 15/20" in result["message"]
    
    def test_parse_lmms_eval_output_metrics(self, evaluation_service):
        """Test parsing metrics from lmms-eval output."""
        # Test metric parsing
        line = "accuracy = 0.85"
        result = evaluation_service._parse_lmms_eval_output(line)
        
        assert result is not None
        assert "metrics" in result
        assert result["metrics"]["accuracy"] == 0.85
    
    def test_parse_lmms_eval_output_completion(self, evaluation_service):
        """Test parsing completion from lmms-eval output."""
        # Test completion parsing
        line = "Benchmark completed successfully"
        result = evaluation_service._parse_lmms_eval_output(line)
        
        assert result is not None
        assert result["progress"] == 100
        assert "Benchmark completed successfully" in result["message"]
    
    def test_parse_final_results(self, evaluation_service):
        """Test parsing final results from output."""
        output_lines = [
            "Starting evaluation...",
            "Processing 100 samples",
            "Duration: 120.5 seconds",
            "Memory usage: 2.1GB",
            "Final accuracy: 0.85",
            "Final f1_score: 0.82"
        ]
        
        metrics = {"accuracy": 0.85, "f1_score": 0.82}
        result = evaluation_service._parse_final_results(output_lines, metrics)
        
        assert result["metrics"] == metrics
        assert result["samples_processed"] == 100
        assert result["duration_seconds"] == 120.5
        assert result["model_performance"]["memory_usage"] == "2.1GB"
        assert len(result["raw_output"]) == 6
    
    @pytest.mark.asyncio
    async def test_cancel_run(self, evaluation_service):
        """Test canceling an active run."""
        run_id = "test-run-id"
        
        # Create a mock task
        mock_task = AsyncMock()
        mock_task.cancel = Mock()
        evaluation_service.active_runs[run_id] = mock_task
        
        with patch.object(supabase_service, 'update_run_status') as mock_update:
            result = await evaluation_service.cancel_run(run_id)
            
            assert result is True
            assert run_id not in evaluation_service.active_runs
            mock_task.cancel.assert_called_once()
            mock_update.assert_called_once_with(run_id, "cancelled")
    
    @pytest.mark.asyncio
    async def test_cancel_nonexistent_run(self, evaluation_service):
        """Test canceling a non-existent run."""
        run_id = "nonexistent-run-id"
        
        result = await evaluation_service.cancel_run(run_id)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_get_active_runs(self, evaluation_service):
        """Test getting active runs."""
        # Add some active runs
        evaluation_service.active_runs["run1"] = Mock()
        evaluation_service.active_runs["run2"] = Mock()
        
        active_runs = await evaluation_service.get_active_runs()
        
        assert len(active_runs) == 2
        assert "run1" in active_runs
        assert "run2" in active_runs
    
    @pytest.mark.asyncio
    async def test_get_run_status(self, evaluation_service, mock_supabase_service):
        """Test getting run status."""
        run_id = "test-run-id"
        mock_supabase_service.get_run_by_id.return_value = {
            "id": run_id,
            "status": "running",
            "results": None,
            "error_message": None,
            "started_at": "2024-01-01T00:00:00",
            "completed_at": None,
            "duration_seconds": None
        }
        
        # Add to active runs
        evaluation_service.active_runs[run_id] = Mock()
        
        status = await evaluation_service.get_run_status(run_id)
        
        assert status is not None
        assert status["run_id"] == run_id
        assert status["status"] == "running"
        assert status["is_active"] is True
        assert "progress" in status
    
    @pytest.mark.asyncio
    async def test_get_run_results(self, evaluation_service, mock_supabase_service):
        """Test getting run results."""
        run_id = "test-run-id"
        mock_supabase_service.get_run_by_id.return_value = {
            "id": run_id,
            "status": "completed",
            "results": {"accuracy": 0.85},
            "error_message": None,
            "started_at": "2024-01-01T00:00:00",
            "completed_at": "2024-01-01T01:00:00",
            "duration_seconds": "3600"
        }
        mock_supabase_service.get_results_by_run_id.return_value = [
            {"metric_name": "accuracy", "metric_value": 0.85}
        ]
        
        results = await evaluation_service.get_run_results(run_id)
        
        assert results is not None
        assert results["run_id"] == run_id
        assert results["status"] == "completed"
        assert results["results"] == {"accuracy": 0.85}
        assert len(results["individual_results"]) == 1
    
    @pytest.mark.asyncio
    async def test_save_results(self, evaluation_service, mock_supabase_service):
        """Test saving evaluation results."""
        run_id = "test-run-id"
        results = {
            "metrics": {
                "accuracy": 0.85,
                "f1_score": 0.82
            },
            "samples_processed": 100,
            "duration_seconds": 120.5
        }
        duration = 120.5
        
        await evaluation_service._save_results(run_id, results, duration)
        
        # Verify results were saved
        assert mock_supabase_service.create_result.call_count == 2  # Two metrics
        
        # Check first metric
        first_call = mock_supabase_service.create_result.call_args_list[0][0][0]
        assert first_call["run_id"] == run_id
        assert first_call["metric_name"] in ["accuracy", "f1_score"]
        assert first_call["metric_value"] in [0.85, 0.82]
        assert first_call["metric_type"] == "primary"

class TestEvaluationServiceIntegration:
    """Integration tests for evaluation service."""
    
    @pytest.mark.asyncio
    async def test_complete_evaluation_flow(self):
        """Test complete evaluation flow from start to finish."""
        evaluation_service = EvaluationService()
        
        with patch('services.evaluation_service.supabase_service') as mock_supabase:
            mock_supabase.create_run.return_value = {"id": "test-run-id", "status": "pending"}
            mock_supabase.update_run_status.return_value = {"id": "test-run-id", "status": "running"}
            mock_supabase.create_result.return_value = {"id": "test-result-id"}
            
            with patch('services.evaluation_service.LMMSEvalRunner') as mock_runner_class:
                mock_runner = Mock()
                mock_runner.model_id = "test-model"
                mock_runner.benchmark_ids = ["test-benchmark"]
                mock_runner.prepare_command.return_value = ["lmms_eval", "--model", "test-model"]
                mock_runner_class.return_value = mock_runner
                
                with patch.object(evaluation_service, '_run_lmms_eval_command', new_callable=AsyncMock) as mock_run_cmd:
                    mock_run_cmd.return_value = {
                        "metrics": {"accuracy": 0.85},
                        "samples_processed": 100,
                        "duration_seconds": 120.5
                    }
                    
                    # Start evaluation
                    run_id = await evaluation_service.start_evaluation(
                        model_id="test-model",
                        benchmark_ids=["test-benchmark"],
                        config={"shots": 0, "seed": 42}
                    )
                    
                    # Wait for evaluation to complete
                    await asyncio.sleep(0.1)  # Allow async task to complete
                    
                    # Verify run was created and started
                    assert run_id is not None
                    mock_supabase.create_run.assert_called_once()
                    mock_supabase.update_run_status.assert_called()
                    mock_run_cmd.assert_called_once()
                    
                    # Verify run is no longer active
                    assert run_id not in evaluation_service.active_runs

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
