# Testing and Usage Guide

## 🧪 Testing the LMMS-Eval Dashboard

This guide provides comprehensive instructions for testing, using, and validating the LMMS-Eval Dashboard with the integrated [lmms-eval](https://github.com/EvolvingLMMs-Lab/lmms-eval) framework.

## 📋 Pre-Testing Checklist

### System Requirements
- [ ] **Python 3.11+** installed and working
- [ ] **Node.js 18+** and npm/yarn installed
- [ ] **Docker and Docker Compose** installed
- [ ] **CUDA-capable GPU** (recommended)
- [ ] **At least 16GB RAM** available
- [ ] **100GB+ free disk space** for models and datasets

### Environment Setup
- [ ] **Supabase project** created and configured
- [ ] **Environment variables** set correctly
- [ ] **lmms-eval** cloned and installed
- [ ] **All dependencies** installed
- [ ] **Database schema** applied

## 🚀 Quick Start Testing

### 1. Test lmms-eval Installation

```bash
# Test basic functionality
python -m lmms_eval --help

# Test available models
python -m lmms_eval --models

# Test available benchmarks
python -m lmms_eval --benchmarks

# Test with a simple evaluation
python -m lmms_eval --model llava --benchmark mme --limit 5
```

### 2. Test Backend API

```bash
# Start backend
cd backend
python main.py

# Test health endpoint
curl http://localhost:8000/health

# Test API endpoints
curl http://localhost:8000/api/v1/models
curl http://localhost:8000/api/v1/benchmarks
```

### 3. Test Frontend

```bash
# Start frontend
cd frontend
npm run dev

# Open browser to http://localhost:3000
# Verify all pages load correctly
```

### 4. Test Full Integration

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:3000
```

## 🔧 Comprehensive Testing

### 1. Unit Tests

#### Backend Tests
```bash
cd backend
python -m pytest tests/ -v

# Test specific modules
python -m pytest tests/test_runners.py -v
python -m pytest tests/test_services.py -v
python -m pytest tests/test_api.py -v
```

#### Frontend Tests
```bash
cd frontend
npm test

# Test specific components
npm test -- --testNamePattern="RunLauncher"
npm test -- --testNamePattern="ModelDetail"
```

### 2. Integration Tests

#### API Integration Tests
```bash
# Test run creation
curl -X POST http://localhost:8000/api/v1/runs/create \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Run",
    "model_id": "llava",
    "benchmark_ids": ["mme"],
    "config": {
      "shots": 0,
      "seed": 42
    }
  }'

# Test run monitoring
curl http://localhost:8000/api/v1/runs/your-run-id

# Test metrics retrieval
curl http://localhost:8000/api/v1/runs/your-run-id/metrics
```

#### WebSocket Integration Tests
```javascript
// Test WebSocket connection
const ws = new WebSocket('ws://localhost:8000/ws/runs/your-run-id');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

### 3. End-to-End Tests

#### Complete Evaluation Workflow
```bash
# 1. Create a run
RUN_ID=$(curl -X POST http://localhost:8000/api/v1/runs/create \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E2E Test Run",
    "model_id": "llava",
    "benchmark_ids": ["mme"],
    "config": {
      "shots": 0,
      "seed": 42,
      "limit": 10
    }
  }' | jq -r '.run_id')

# 2. Monitor progress
curl http://localhost:8000/api/v1/runs/$RUN_ID

# 3. Check metrics
curl http://localhost:8000/api/v1/runs/$RUN_ID/metrics

# 4. Verify results
curl http://localhost:8000/api/v1/runs/$RUN_ID
```

## 🎯 Usage Examples

### 1. Basic Model Evaluation

#### LLaVA Model Evaluation
```python
# Python API usage
from runners.lmms_eval_runner import LMMSEvalRunner

# Initialize runner
runner = LMMSEvalRunner(
    model_id="llava",
    benchmark_ids=["mme", "vqa_v2"],
    config={
        "shots": 0,
        "seed": 42,
        "temperature": 0.0,
        "model_args": {
            "pretrained": "llava-hf/llava-1.5-7b-hf",
            "conv_template": "vicuna_v1"
        }
    }
)

# Start evaluation
process_id = runner.start()

# Monitor progress
for log_line in runner.stream_logs():
    print(f"Log: {log_line}")

# Get results
metrics = runner.parse_metrics(runner.stdout)
print(f"Results: {metrics}")

# Cleanup
runner.cleanup()
```

#### Qwen2-VL Model Evaluation
```python
# Qwen2-VL evaluation
runner = LMMSEvalRunner(
    model_id="qwen2_vl",
    benchmark_ids=["mme", "coco_caption"],
    config={
        "shots": 5,
        "seed": 42,
        "temperature": 0.1,
        "model_args": {
            "pretrained": "Qwen/Qwen2-VL-2B-Instruct",
            "conv_template": "qwen2_vl"
        }
    }
)
```

### 2. Advanced Configuration

#### Multi-GPU Evaluation
```python
# Multi-GPU configuration
runner = LMMSEvalRunner(
    model_id="llava",
    benchmark_ids=["mme", "vqa_v2", "coco_caption"],
    config={
        "shots": 0,
        "seed": 42,
        "batch_size": 4,
        "gpu_device_id": "cuda:0,1,2,3",
        "model_args": {
            "pretrained": "llava-hf/llava-1.5-13b-hf",
            "conv_template": "vicuna_v1"
        }
    }
)
```

#### Custom Benchmark Evaluation
```python
# Custom benchmark configuration
runner = LMMSEvalRunner(
    model_id="llava",
    benchmark_ids=["custom_benchmark"],
    config={
        "shots": 0,
        "seed": 42,
        "limit": 100,
        "write_out": True,
        "write_out_path": "/path/to/outputs",
        "model_args": {
            "pretrained": "llava-hf/llava-1.5-7b-hf",
            "conv_template": "vicuna_v1"
        }
    }
)
```

### 3. Real-time Monitoring

#### WebSocket Integration
```javascript
// Frontend WebSocket integration
const ws = new WebSocket('ws://localhost:8000/ws/runs/run-id');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'progress':
      // Update progress bar
      updateProgressBar(message.data);
      break;
    case 'metric_update':
      // Update metrics display
      updateMetricsDisplay(message.data);
      break;
    case 'log_line':
      // Add to log console
      appendToLogConsole(message.data);
      break;
    case 'error':
      // Show error message
      showErrorMessage(message.data);
      break;
  }
};
```

#### Progress Tracking
```python
# Backend progress tracking
async def monitor_evaluation(run_id: str):
    runner = LMMSEvalRunner(**config)
    
    # Start evaluation
    process_id = runner.start()
    
    # Stream logs and update progress
    for log_line in runner.stream_logs():
        # Parse progress from log
        progress = parse_progress_log(log_line)
        
        # Update database
        await update_run_progress(run_id, progress)
        
        # Broadcast via WebSocket
        await broadcast_progress(run_id, progress)
        
        # Parse metrics
        metrics = parse_metrics_from_log(log_line)
        if metrics:
            await store_metrics(run_id, metrics)
            await broadcast_metrics(run_id, metrics)
```

## 📊 Performance Testing

### 1. Load Testing

#### API Load Testing
```bash
# Install artillery
npm install -g artillery

# Create load test configuration
cat > load-test.yml << EOF
config:
  target: 'http://localhost:8000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Load Test"
    flow:
      - get:
          url: "/health"
      - get:
          url: "/api/v1/models"
      - get:
          url: "/api/v1/benchmarks"
EOF

# Run load test
artillery run load-test.yml
```

#### WebSocket Load Testing
```javascript
// WebSocket load testing
const WebSocket = require('ws');

const connections = [];
const numConnections = 100;

for (let i = 0; i < numConnections; i++) {
  const ws = new WebSocket('ws://localhost:8000/ws/runs/test-run');
  
  ws.on('open', () => {
    console.log(`Connection ${i} opened`);
  });
  
  ws.on('message', (data) => {
    console.log(`Connection ${i} received: ${data}`);
  });
  
  connections.push(ws);
}
```

### 2. Memory Testing

#### Memory Usage Monitoring
```python
# Memory usage monitoring
import psutil
import time

def monitor_memory():
    process = psutil.Process()
    
    while True:
        memory_info = process.memory_info()
        print(f"Memory usage: {memory_info.rss / 1024 / 1024:.2f} MB")
        time.sleep(1)

# Run memory monitoring
monitor_memory()
```

#### GPU Memory Testing
```bash
# Monitor GPU memory usage
nvidia-smi -l 1

# Test GPU memory allocation
python -c "
import torch
print(f'CUDA available: {torch.cuda.is_available()}')
print(f'GPU count: {torch.cuda.device_count()}')
print(f'Current device: {torch.cuda.current_device()}')
print(f'Device name: {torch.cuda.get_device_name()}')
"
```

### 3. Stress Testing

#### Concurrent Evaluations
```python
# Concurrent evaluation testing
import asyncio
import concurrent.futures

async def run_concurrent_evaluations():
    tasks = []
    
    for i in range(10):  # Run 10 concurrent evaluations
        task = asyncio.create_task(run_evaluation(f"test-run-{i}"))
        tasks.append(task)
    
    # Wait for all evaluations to complete
    results = await asyncio.gather(*tasks)
    return results

# Run concurrent evaluations
results = await run_concurrent_evaluations()
```

## 🔍 Debugging and Troubleshooting

### 1. Common Issues

#### lmms-eval Installation Issues
```bash
# Check lmms-eval installation
python -c "import lmms_eval; print('lmms-eval installed successfully')"

# If import fails, reinstall
pip uninstall lmms-eval
pip install -e .

# Check dependencies
pip list | grep -E "(torch|transformers|datasets)"
```

#### Database Connection Issues
```bash
# Test Supabase connection
curl -H "apikey: your-supabase-key" \
  https://your-project.supabase.co/rest/v1/

# Check database schema
psql -h your-host -U your-user -d your-db -c "\dt"
```

#### GPU Issues
```bash
# Check GPU availability
nvidia-smi

# Test CUDA installation
python -c "import torch; print(torch.cuda.is_available())"

# Set CUDA device
export CUDA_VISIBLE_DEVICES=0
```

### 2. Debug Mode

#### Enable Debug Logging
```bash
# Set debug environment variables
export LOG_LEVEL=DEBUG
export DEBUG=true

# Run with debug output
python main.py --debug
```

#### Debug lmms-eval
```python
# Debug lmms-eval execution
runner = LMMSEvalRunner(
    model_id="llava",
    benchmark_ids=["mme"],
    config={
        "shots": 0,
        "seed": 42,
        "verbose": True,
        "log_level": "DEBUG",
        "write_out": True,
        "write_out_path": "/path/to/debug/outputs"
    }
)
```

### 3. Log Analysis

#### Application Logs
```bash
# View application logs
tail -f logs/app.log

# Filter error logs
grep "ERROR" logs/app.log

# Filter warning logs
grep "WARNING" logs/app.log
```

#### Evaluation Logs
```bash
# View evaluation logs
tail -f archives/lmms_eval_*/logs/evaluation.log

# Filter progress logs
grep "progress" archives/lmms_eval_*/logs/evaluation.log

# Filter error logs
grep "error" archives/lmms_eval_*/logs/evaluation.log
```

## 📈 Performance Optimization

### 1. GPU Optimization

#### Batch Size Optimization
```python
# Test different batch sizes
batch_sizes = [1, 2, 4, 8, 16]

for batch_size in batch_sizes:
    config = {
        "batch_size": batch_size,
        "model_args": {...}
    }
    
    # Run evaluation and measure performance
    start_time = time.time()
    runner = LMMSEvalRunner(**config)
    # ... run evaluation
    end_time = time.time()
    
    print(f"Batch size {batch_size}: {end_time - start_time:.2f}s")
```

#### Memory Optimization
```python
# Configure memory-efficient evaluation
config = {
    "batch_size": 1,
    "gradient_checkpointing": True,
    "cpu_offload": True,
    "mixed_precision": True,
    "model_args": {
        "torch_dtype": "float16",
        "device_map": "auto"
    }
}
```

### 2. Storage Optimization

#### Dataset Caching
```python
# Configure dataset caching
config = {
    "cache_dir": "/path/to/cache",
    "temp_dir": "/path/to/temp",
    "output_dir": "/path/to/outputs",
    "cleanup": True
}
```

#### Model Caching
```python
# Configure model caching
config = {
    "model_args": {
        "cache_dir": "/path/to/model/cache",
        "local_files_only": False
    }
}
```

### 3. Network Optimization

#### API Optimization
```python
# Configure API optimization
config = {
    "timeout": 300,
    "retries": 3,
    "backoff_factor": 0.3,
    "max_connections": 100
}
```

#### WebSocket Optimization
```javascript
// WebSocket optimization
const ws = new WebSocket('ws://localhost:8000/ws/runs/run-id', {
  perMessageDeflate: false,
  maxPayload: 1024 * 1024  // 1MB
});
```

## 🎯 Best Practices

### 1. Evaluation Best Practices

#### Model Selection
- Choose appropriate models for your use case
- Consider model size and computational requirements
- Test with smaller models first

#### Benchmark Selection
- Start with well-known benchmarks
- Use appropriate benchmarks for your domain
- Consider benchmark complexity and time requirements

#### Configuration Best Practices
- Use appropriate batch sizes
- Set reasonable limits for testing
- Use consistent random seeds
- Monitor resource usage

### 2. Development Best Practices

#### Code Organization
- Use proper error handling
- Implement logging and monitoring
- Use configuration management
- Follow coding standards

#### Testing Best Practices
- Write comprehensive tests
- Test edge cases and error conditions
- Use realistic test data
- Monitor performance metrics

#### Deployment Best Practices
- Use environment variables for configuration
- Implement proper security measures
- Use containerization for consistency
- Monitor system resources

## 📚 Additional Resources

### Documentation
- [lmms-eval Documentation](https://github.com/EvolvingLMMs-Lab/lmms-eval)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)

### Community
- [lmms-eval GitHub Issues](https://github.com/EvolvingLMMs-Lab/lmms-eval/issues)
- [Discord Community](https://discord.gg/lmms-eval)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/lmms-eval)

### Tools
- [Weights & Biases](https://wandb.ai/) - Experiment tracking
- [TensorBoard](https://www.tensorflow.org/tensorboard) - Visualization
- [MLflow](https://mlflow.org/) - Model management

## 🆘 Support and Troubleshooting

If you encounter issues:

1. **Check the logs** for error messages
2. **Verify configuration** and environment variables
3. **Test individual components** separately
4. **Check system resources** (memory, GPU, disk)
5. **Review documentation** and examples
6. **Search for similar issues** in the community
7. **Create a detailed issue report** with logs and configuration

For additional support, please refer to the project documentation or create an issue in the repository.
