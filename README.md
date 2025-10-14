# LMMS-Eval Dashboard

A comprehensive web-based dashboard and GUI system for the [lmms-eval](https://github.com/EvolvingLMMs-Lab/lmms-eval) benchmarking framework, enabling users to orchestrate LMM evaluations, monitor real-time progress, visualize results, and compare model performance across Text, Image, Video, and Audio tasks.

## 🎯 Overview

The LMMS-Eval Dashboard provides a production-ready interface for multimodal model evaluation, built on top of the powerful [lmms-eval](https://github.com/EvolvingLMMs-Lab/lmms-eval) framework. It supports comprehensive evaluation across all modalities with advanced features like real-time monitoring, distributed evaluation, and comprehensive analytics.

## ✨ Key Features

### 🚀 Core Functionality
- **Multimodal Evaluation**: Support for Text, Image, Video, and Audio tasks
- **Real-time Monitoring**: Live progress tracking and metrics visualization
- **Model Management**: Comprehensive model registry and versioning
- **Benchmark Management**: Support for all lmms-eval benchmarks
- **Result Visualization**: Advanced charts, graphs, and analytics
- **Comparison Tools**: Model performance comparison and analysis

### 🔧 Advanced Features
- **Distributed Evaluation**: Multi-GPU and multi-node support
- **Scheduled Evaluations**: Automated recurring evaluations
- **Custom Benchmarks**: Create and manage custom benchmarks
- **Real-time Collaboration**: Multi-user support with live updates
- **Performance Analytics**: Comprehensive performance tracking and analysis
- **Export/Import**: Data export in multiple formats

### 🎨 User Interface
- **Modern React Frontend**: Built with React 18+ and TypeScript
- **Responsive Design**: Mobile-friendly interface
- **Dark Mode Support**: Multiple themes and customization
- **Interactive Dashboards**: Customizable widgets and layouts
- **Real-time Updates**: WebSocket-based live updates

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 LMMS-Eval Dashboard                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Frontend  │ │   Backend   │ │  Database  │          │
│  │   (React)   │ │  (FastAPI)  │ │ (Supabase) │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              LMMS-Eval Framework                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Models    │ │ Benchmarks  │ │ Evaluation  │          │
│  │ (LLaVA,     │ │ (MME, VQA,  │ │   Engine    │          │
│  │ Qwen2-VL,   │ │ COCO, etc.) │ │             │          │
│  │ Llama-V)    │ │             │ │             │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Docker and Docker Compose**
- **CUDA-capable GPU** (recommended)
- **16GB+ RAM** (32GB+ recommended)
- **100GB+ free disk space**

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Katakuri004/MM-LLM-eval-suite
cd gui-test-suite
```

2. **Setup lmms-eval (Already Done)**
Since you have already added lmms-eval locally at `/lmms-eval`, the framework is ready to use. The dashboard will automatically detect and use your local installation.

```bash
# Verify your local lmms-eval installation
cd /lmms-eval
python -m lmms_eval --help
```

3. **Setup the dashboard**
```bash
# Backend setup
cd backend
pip install -r requirements.txt
cp env.example .env
# Edit .env with your configuration

# Frontend setup
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. **Start the application**
```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or run manually
# Backend
cd backend && python main.py

# Frontend
cd frontend && npm run dev
```

### Environment Configuration

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

# Redis (optional)
REDIS_URL=redis://localhost:6379

# GPU Configuration
AVAILABLE_GPUS=["cuda:0", "cuda:1", "cuda:2", "cuda:3"]
DEFAULT_COMPUTE_PROFILE=4070-8GB

# LMMS-Eval Integration
LMMS_EVAL_PATH=/lmms-eval
HF_HOME=/path/to/huggingface/cache
HF_TOKEN=your_huggingface_token

# API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
DASHSCOPE_API_KEY=your_dashscope_key
REKA_API_KEY=your_reka_key
```

#### Frontend Environment Variables (.env.local)
```bash
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_WS_URL=ws://localhost:8000
```

## 📚 Documentation

- **[Setup Guide](SETUP_GUIDE.md)**: Comprehensive setup instructions
- **[LMMS-Eval Integration](docs/LMMS_EVAL_INTEGRATION.md)**: Detailed integration documentation
- **[Testing and Usage](docs/TESTING_AND_USAGE.md)**: Testing and usage guide
- **[Feature Recommendations](docs/FEATURE_RECOMMENDATIONS.md)**: Recommended features and enhancements
- **[API Documentation](docs/API.md)**: Backend API reference
- **[Deployment Guide](docs/DEPLOYMENT.md)**: Deployment instructions

## 🎯 Usage Examples

### Basic Model Evaluation

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
```

### API Usage

```bash
# Create a run
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
      "model_args": {
        "pretrained": "llava-hf/llava-1.5-7b-hf",
        "conv_template": "vicuna_v1"
      }
    }
  }'

# Monitor progress
curl http://localhost:8000/api/v1/runs/your-run-id

# Get metrics
curl http://localhost:8000/api/v1/runs/your-run-id/metrics
```

### WebSocket Integration

```javascript
// Real-time monitoring
const ws = new WebSocket('ws://localhost:8000/ws/runs/your-run-id');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'progress':
      updateProgressBar(message.data);
      break;
    case 'metric_update':
      updateMetricsDisplay(message.data);
      break;
    case 'log_line':
      appendToLogConsole(message.data);
      break;
  }
};
```

## 🔧 Supported Models

### Vision-Language Models
- **LLaVA Series**: `llava`, `llava_onevision`, `llava_onevision1_5`
- **Qwen2-VL Series**: `qwen2_vl`, `qwen2_5_vl`
- **Llama Vision**: `llama_vision`
- **InstructBLIP**: `instructblip`
- **BLIP Series**: `blip`, `blip2`

### Audio Models
- **Whisper**: `whisper`
- **AudioCaps**: `audiocaps`

### Video Models
- **Video-ChatGPT**: `video_chatgpt`
- **Video-LLaMA**: `video_llama`

## 📊 Supported Benchmarks

### Vision Benchmarks
- **MME**: Multimodal Evaluation
- **VQA-v2**: Visual Question Answering
- **COCO Caption**: Image Captioning
- **TextVQA**: Text-based VQA
- **RefCOCO**: Referring Expression Comprehension
- **NoCaps**: NoCaps Captioning
- **Flickr30k**: Flickr30k Captioning
- **GQA**: GQA Visual Question Answering
- **OK-VQA**: OK-VQA
- **A-OKVQA**: A-OKVQA
- **ScienceQA**: ScienceQA
- **AI2D**: AI2D Diagram Understanding
- **ChartQA**: ChartQA
- **DocVQA**: DocVQA
- **InfographicVQA**: InfographicVQA
- **TabFact**: TabFact
- **WebSRC**: WebSRC
- **MathVista**: MathVista
- **HallusionBench**: HallusionBench
- **POPE**: POPE
- **MMEHallu**: MME Hallucination
- **SEED-Bench**: SEED-Bench
- **MMBench**: MMBench
- **MMBench-CN**: MMBench-CN
- **LLaVABench**: LLaVABench
- **MMMU**: MMMU

### Audio Benchmarks
- **ASR**: Automatic Speech Recognition
- **Audio Caption**: Audio Captioning
- **Audio QA**: Audio Question Answering
- **Audio Classification**: Audio Classification
- **Audio Emotion**: Audio Emotion Recognition
- **Audio Sentiment**: Audio Sentiment Analysis

### Video Benchmarks
- **Video QA**: Video Question Answering
- **Video Caption**: Video Captioning
- **Video Classification**: Video Classification
- **Video Retrieval**: Video Retrieval
- **Video Summarization**: Video Summarization

### Text Benchmarks
- **MMLU**: Massive Multitask Language Understanding
- **HellaSwag**: Commonsense Reasoning
- **ARC**: ARC
- **OpenBookQA**: OpenBookQA
- **SQuAD**: SQuAD
- **RACE**: RACE
- **TruthfulQA**: TruthfulQA
- **ToxiGen**: ToxiGen
- **CrowSPairs**: CrowSPairs
- **StereoSet**: StereoSet
- **BBQ**: BBQ
- **BOLD**: BOLD
- **Wino**: Wino
- **HONEST**: HONEST
- **REGARD**: REGARD
- **SafetyBench**: SafetyBench (multiple languages)

## 🚀 Advanced Features

### Distributed Evaluation
```python
# Multi-GPU evaluation
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

### Custom Benchmarks
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
        "write_out_path": "/path/to/outputs"
    }
)
```

### Scheduled Evaluations
```python
# Schedule recurring evaluations
scheduler = ScheduledEvaluations()
scheduler.schedule_evaluation(
    run_config={
        "name": "Daily LLaVA Evaluation",
        "model_id": "llava",
        "benchmark_ids": ["mme"],
        "config": {"shots": 0, "seed": 42}
    },
    schedule="0 2 * * *"  # Daily at 2 AM
)
```

## 🔧 Configuration

### Model Configuration

```python
MODEL_CONFIGS = {
    "llava": {
        "pretrained": "llava-hf/llava-1.5-7b-hf",
        "conv_template": "vicuna_v1"
    },
    "qwen2_vl": {
        "pretrained": "Qwen/Qwen2-VL-2B-Instruct",
        "conv_template": "qwen2_vl"
    },
    "llama_vision": {
        "pretrained": "meta-llama/Llama-3.2-3B-Vision-Instruct",
        "conv_template": "llama3_2"
    }
}
```

### Evaluation Parameters

```python
EVALUATION_CONFIG = {
    "shots": 0,                    # Number of few-shot examples
    "seed": 42,                    # Random seed
    "temperature": 0.0,            # Sampling temperature
    "batch_size": 1,               # Batch size for evaluation
    "limit": None,                 # Limit number of samples
    "num_fewshot": 0,              # Number of few-shot examples
    "write_out": False,            # Write detailed outputs
    "write_out_path": None,        # Path for detailed outputs
    "device": "cuda:0",             # Device for evaluation
    "work_dir": None,              # Working directory
    "log_level": "INFO",           # Logging level
    "verbose": True                # Verbose output
}
```

## 📊 Metrics and Analytics

### Supported Metrics
- **Accuracy**: Overall accuracy
- **F1-Score**: F1 score for classification
- **BLEU**: BLEU score for captioning
- **CIDEr**: CIDEr score for captioning
- **ROUGE**: ROUGE score for captioning
- **METEOR**: METEOR score for captioning
- **SPICE**: SPICE score for captioning
- **WER**: Word Error Rate for ASR
- **CER**: Character Error Rate

### Analytics Features
- **Performance Trends**: Track performance over time
- **Model Comparison**: Compare multiple models
- **Benchmark Analysis**: Analyze benchmark performance
- **Resource Monitoring**: Monitor system resources
- **Cost Analysis**: Track evaluation costs

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Kubernetes Deployment
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Check deployment status
kubectl get pods
kubectl get services
```

### Production Configuration
```bash
# Set production environment variables
export NODE_ENV=production
export PYTHON_ENV=production
export LOG_LEVEL=INFO

# Run production build
npm run build
python main.py --production
```

## 🔍 Monitoring and Logging

### Application Monitoring
```bash
# Check service health
curl http://localhost:8000/health

# View metrics
curl http://localhost:8000/metrics
```

### Log Analysis
```bash
# View application logs
tail -f logs/app.log

# View evaluation logs
tail -f archives/lmms_eval_*/logs/evaluation.log
```

### Performance Monitoring
```bash
# Monitor GPU usage
nvidia-smi -l 1

# Monitor system resources
htop
```

## 🐛 Troubleshooting

### Common Issues

#### lmms-eval Installation Issues
```bash
# Check lmms-eval installation
python -c "import lmms_eval; print('lmms-eval installed successfully')"

# If import fails, reinstall
pip uninstall lmms-eval
pip install -e .
```

#### Database Connection Issues
```bash
# Test Supabase connection
curl -H "apikey: your-supabase-key" \
  https://your-project.supabase.co/rest/v1/
```

#### GPU Issues
```bash
# Check GPU availability
nvidia-smi

# Test CUDA installation
python -c "import torch; print(torch.cuda.is_available())"
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run with debug output
python main.py --debug
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Install development dependencies
pip install -r requirements-dev.txt
npm install

# Run tests
pytest
npm test

# Run linting
black .
isort .
mypy .
flake8 .
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [lmms-eval](https://github.com/EvolvingLMMs-Lab/lmms-eval) - The core evaluation framework
- [FastAPI](https://fastapi.tiangolo.com/) - The backend framework
- [React](https://react.dev/) - The frontend framework
- [Supabase](https://supabase.com/) - The database and authentication service

## 📞 Support

- **Documentation**: [Project Documentation](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Discord**: [Community Discord](https://discord.gg/lmms-eval)

## 🚀 Roadmap

### Phase 1: Core Features (Completed)
- [x] Basic evaluation functionality
- [x] Real-time monitoring
- [x] Model and benchmark management
- [x] Result visualization

### Phase 2: Advanced Features (In Progress)
- [ ] Custom benchmark creation
- [ ] Scheduled evaluations
- [ ] Advanced analytics
- [ ] Multi-user collaboration

### Phase 3: Enterprise Features (Planned)
- [ ] Multi-tenant support
- [ ] Advanced security
- [ ] Predictive analytics
- [ ] AI-powered features

---

**Built with ❤️ for the multimodal evaluation community**