# LMMS-Eval Dashboard Setup Guide

## 🎯 Overview

This guide will help you set up the LMMS-Eval Dashboard with proper integration of the [lmms-eval](https://github.com/EvolvingLMMs-Lab/lmms-eval) framework for multimodal evaluation across Text, Image, Video, and Audio tasks.

## 📋 Prerequisites Checklist

### System Requirements
- [ ] **Python 3.11+** installed
- [ ] **Node.js 18+** and npm/yarn installed
- [ ] **Docker and Docker Compose** installed
- [ ] **Git** installed
- [ ] **CUDA-capable GPU** (recommended for model evaluation)
- [ ] **At least 16GB RAM** (32GB+ recommended)
- [ ] **100GB+ free disk space** for models and datasets

### Required Accounts & API Keys
- [ ] **Supabase Account** - [Create account](https://supabase.com)
- [ ] **Hugging Face Account** - [Create account](https://huggingface.co)
- [ ] **GitHub Account** (for cloning repositories)

## 🚀 Step-by-Step Setup

### 1. Setup lmms-eval (Already Done)

Since you have already added lmms-eval locally at `/lmms-eval`, the framework is ready to use. The dashboard will automatically detect and use your local installation.

```bash
# Verify your local lmms-eval installation
cd /lmms-eval
python -m lmms_eval --help

# Check available models
python -m lmms_eval --models

# Check available benchmarks
python -m lmms_eval --benchmarks
```

### 2. Setup LMMS-Eval Dashboard

```bash
# Clone the dashboard repository
git clone <your-dashboard-repo>
cd gui-test-suite

# Setup backend
cd backend
pip install -r requirements.txt
cp env.example .env
# Edit .env with your configuration

# Setup frontend
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 3. Environment Configuration

#### Backend Environment Variables (.env)
```bash
# Supabase Configuration (REQUIRED)
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Security (REQUIRED)
SECRET_KEY=your_secure_secret_key_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lmms_eval

# Redis (optional, for background tasks)
REDIS_URL=redis://localhost:6379

# GPU Configuration
AVAILABLE_GPUS=["cuda:0", "cuda:1", "cuda:2", "cuda:3"]
DEFAULT_COMPUTE_PROFILE=4070-8GB

# LMMS-Eval Integration
LMMS_EVAL_PATH=/lmms-eval
HF_HOME=/path/to/huggingface/cache
HF_TOKEN=your_huggingface_token

# API Keys for different services
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
DASHSCOPE_API_KEY=your_dashscope_key
REKA_API_KEY=your_reka_key

# Logging and Monitoring
LOG_LEVEL=INFO
ENABLE_METRICS=true
```

#### Frontend Environment Variables (.env.local)
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_WS_URL=ws://localhost:8000

# Optional: Analytics
REACT_APP_ANALYTICS_ID=your_analytics_id
```

### 4. Database Setup

#### Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Note down your project URL and API keys
4. Run the database schema:

```sql
-- Copy and paste the contents of database/schema.sql
-- into your Supabase SQL editor and execute
```

#### Alternative: Local PostgreSQL
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb lmms_eval

# Run migrations
cd backend
python scripts/migrate.py
```

### 5. Install Dependencies

#### Backend Dependencies
```bash
cd backend
pip install -r requirements.txt

# Additional dependencies for lmms-eval integration
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install transformers datasets accelerate
pip install sentencepiece protobuf==3.20
pip install httpx==0.23.3
```

#### Frontend Dependencies
```bash
cd frontend
npm install

# Install additional UI dependencies
npm install @radix-ui/react-* lucide-react
npm install recharts @tanstack/react-table
npm install react-hook-form @hookform/resolvers zod
```

### 6. GPU Setup (Optional but Recommended)

```bash
# Install CUDA toolkit
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/cuda-keyring_1.0-1_all.deb
sudo dpkg -i cuda-keyring_1.0-1_all.deb
sudo apt-get update
sudo apt-get -y install cuda

# Install cuDNN
sudo apt-get install libcudnn8 libcudnn8-dev

# Verify GPU setup
nvidia-smi
```

## 🧪 Testing the Setup

### 1. Test lmms-eval Installation

```bash
# Test basic functionality
python -m lmms_eval --help

# Test with a simple benchmark
python -m lmms_eval --model llava --benchmark mme --limit 5

# Test available models and benchmarks
python -m lmms_eval --models
python -m lmms_eval --benchmarks
```

### 2. Test Backend API

```bash
cd backend
python main.py

# In another terminal, test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/models
```

### 3. Test Frontend

```bash
cd frontend
npm run dev

# Open browser to http://localhost:3000
```

### 4. Test Full Integration

```bash
# Start all services with Docker
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

## 🔧 Configuration Details

### Model Configuration

The dashboard supports various model types with specific configurations:

#### LLaVA Models
```json
{
  "model_id": "llava",
  "model_args": {
    "pretrained": "llava-hf/llava-1.5-7b-hf",
    "conv_template": "vicuna_v1"
  }
}
```

#### Qwen2-VL Models
```json
{
  "model_id": "qwen2_vl",
  "model_args": {
    "pretrained": "Qwen/Qwen2-VL-2B-Instruct",
    "conv_template": "qwen2_vl"
  }
}
```

#### Llama Vision Models
```json
{
  "model_id": "llama_vision",
  "model_args": {
    "pretrained": "meta-llama/Llama-3.2-3B-Vision-Instruct",
    "conv_template": "llama3_2"
  }
}
```

### Benchmark Configuration

Supported benchmarks across modalities:

#### Vision Benchmarks
- `mme` - Multimodal Evaluation
- `coco_caption` - Image Captioning
- `vqa_v2` - Visual Question Answering
- `textvqa` - Text-based VQA
- `refcoco` - Referring Expression Comprehension

#### Audio Benchmarks
- `asr` - Automatic Speech Recognition
- `audio_caption` - Audio Captioning

#### Video Benchmarks
- `video_qa` - Video Question Answering
- `video_caption` - Video Captioning

#### Text Benchmarks
- `mmlu` - Massive Multitask Language Understanding
- `hellaswag` - Commonsense Reasoning

## 🚀 Running Evaluations

### 1. Create a Run via API

```bash
curl -X POST http://localhost:8000/api/v1/runs/create \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "LLaVA-1.5-7B-MME-Test",
    "model_id": "llava",
    "benchmark_ids": ["mme"],
    "config": {
      "shots": 0,
      "seed": 42,
      "temperature": 0.0,
      "model_args": {
        "pretrained": "llava-hf/llava-1.5-7b-hf",
        "conv_template": "vicuna_v1"
      }
    }
  }'
```

### 2. Monitor Progress

```javascript
// WebSocket connection for real-time updates
const ws = new WebSocket('ws://localhost:8000/ws/runs/your-run-id');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Update:', message);
};
```

### 3. View Results

```bash
# Get run details
curl http://localhost:8000/api/v1/runs/your-run-id

# Get metrics
curl http://localhost:8000/api/v1/runs/your-run-id/metrics
```

## 🐛 Troubleshooting

### Common Issues

#### 1. lmms-eval Installation Issues
```bash
# If you get import errors
pip install --upgrade pip
pip install -e . --force-reinstall

# If you get CUDA errors
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

#### 2. Database Connection Issues
```bash
# Check Supabase connection
curl -H "apikey: your-supabase-key" https://your-project.supabase.co/rest/v1/

# Check database schema
psql -h your-host -U your-user -d your-db -c "\dt"
```

#### 3. GPU Issues
```bash
# Check GPU availability
nvidia-smi

# Check CUDA installation
python -c "import torch; print(torch.cuda.is_available())"

# Set CUDA device
export CUDA_VISIBLE_DEVICES=0
```

#### 4. Memory Issues
```bash
# Monitor memory usage
htop
nvidia-smi

# Reduce batch size in config
{
  "batch_size": 1,
  "limit": 100
}
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run with verbose output
python main.py --debug

# Check logs
tail -f logs/app.log
```

## 📊 Performance Optimization

### 1. GPU Optimization
- Use appropriate batch sizes
- Enable mixed precision training
- Use tensor parallel for large models

### 2. Memory Optimization
- Use gradient checkpointing
- Enable CPU offloading
- Use quantization for inference

### 3. Storage Optimization
- Use SSD storage for datasets
- Enable dataset caching
- Clean up temporary files regularly

## 🔒 Security Considerations

### 1. API Keys
- Store API keys in environment variables
- Use Supabase RLS for data access control
- Implement rate limiting

### 2. Model Security
- Validate model inputs
- Sanitize user inputs
- Use secure model loading

### 3. Network Security
- Use HTTPS in production
- Implement CORS properly
- Use secure WebSocket connections

## 📈 Monitoring and Logging

### 1. Application Monitoring
```bash
# Check service health
curl http://localhost:8000/health

# View metrics
curl http://localhost:8000/metrics
```

### 2. Log Analysis
```bash
# View application logs
tail -f logs/app.log

# View evaluation logs
tail -f archives/lmms_eval_*/logs/evaluation.log
```

### 3. Performance Monitoring
- Monitor GPU utilization
- Track memory usage
- Monitor evaluation progress

## 🎯 Next Steps

Once setup is complete:

1. **Create your first evaluation run**
2. **Explore the dashboard interface**
3. **Set up monitoring and alerting**
4. **Configure automated evaluations**
5. **Integrate with your ML pipeline**

## 📚 Additional Resources

- [lmms-eval Documentation](https://github.com/EvolvingLMMs-Lab/lmms-eval)
- [Supabase Documentation](https://supabase.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed
5. Check GPU and memory availability

For additional support, please refer to the project documentation or create an issue in the repository.
