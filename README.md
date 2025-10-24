# LMMS-Eval Dashboard

A comprehensive web-based dashboard and GUI system for the [lmms-eval](https://github.com/EvolvingLMMs-Lab/lmms-eval) benchmarking framework, enabling users to orchestrate LMM evaluations, monitor real-time progress, visualize results, and compare model performance across Text, Image, Video, and Audio tasks.

##  Overview

The LMMS-Eval Dashboard provides a production-ready interface for multimodal model evaluation, built on top of the powerful [lmms-eval](https://github.com/EvolvingLMMs-Lab/lmms-eval) framework. It supports comprehensive evaluation across all modalities with advanced features like real-time monitoring, distributed evaluation, comprehensive analytics, and intelligent dependency management.

## 🆕 Latest Features (v2.0)

### **Model Dependency Management System**
- **Smart Dependency Detection**: Automatically detects missing dependencies for models
- **Pre-flight Validation**: Prevents evaluation failures by checking dependencies before starting
- **Clear Installation Guidance**: Shows exact pip install commands for missing packages
- **Real-time Warnings**: Frontend displays dependency warnings with installation instructions
- **Comprehensive Coverage**: Supports 50+ model types including Qwen, LLaVA, video, and audio models

### **Task Discovery & Mapping System**
- **Dynamic Task Discovery**: Automatically discovers available lmms-eval tasks
- **Intelligent Mapping**: Maps database benchmarks to valid lmms-eval task names
- **Validation Layer**: Ensures only compatible tasks are selected for evaluation
- **Caching System**: 24-hour TTL cache for optimal performance
- **Fuzzy Matching**: Smart task name matching with fallback options

### **Enhanced Evaluation System**
- **Named Evaluations**: Add custom names to evaluation runs for better identification
- **Advanced Filtering**: Filter evaluations by name, model, modality, and status
- **Real-time Progress**: Live progress updates with WebSocket integration
- **Resource Management**: Intelligent resource allocation and monitoring
- **Error Recovery**: Graceful error handling with helpful error messages

##  Key Features

###  Core Functionality
- **Multimodal Evaluation**: Support for Text, Image, Video, and Audio tasks
- **Real-time Monitoring**: Live progress tracking and metrics visualization
- **Model Management**: Comprehensive model registry with dependency checking
- **Benchmark Management**: Support for all lmms-eval benchmarks with task mapping
- **Result Visualization**: Advanced charts, graphs, and analytics
- **Comparison Tools**: Model performance comparison and analysis
- **Dependency Management**: Automatic detection and guidance for missing dependencies

###  Advanced Features
- **Intelligent Task Discovery**: Dynamic discovery of available lmms-eval tasks
- **Pre-flight Validation**: Dependency and compatibility checking before evaluation
- **Named Evaluations**: Custom naming and search for evaluation runs
- **Resource Management**: Smart resource allocation and monitoring
- **Error Recovery**: Graceful error handling with helpful messages
- **Caching System**: Performance optimization with intelligent caching
- **Export/Import**: Data export in multiple formats

###  User Interface
- **Modern Next.js Frontend**: Built with Next.js 14+ and TypeScript
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Interactive Dashboards**: Customizable widgets and layouts
- **Real-time Updates**: WebSocket-based live updates
- **Dependency Warnings**: Clear UI warnings for missing dependencies
- **Advanced Filtering**: Comprehensive filtering and search capabilities

##  Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 LMMS-Eval Dashboard v2.0                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Frontend  │ │   Backend   │ │  Database  │             │
│  │  (Next.js)  │ │  (FastAPI)  │ │ (Supabase) │             │
│  │ + WebSocket │ │ + Services  │ │ + Migrations│             │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              Enhanced Services Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Dependency  │ │   Task      │ │ Evaluation  │            │
│  │ Management  │ │ Discovery   │ │ Orchestrator│            │
│  │ Service     │ │ Service     │ │             │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              LMMS-Eval Framework                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Models    │ │ Benchmarks  │ │ Evaluation  │            │
│  │ (LLaVA,     │ │ (MME, VQA,  │ │   Engine    │            │
│  │ Qwen2-VL,   │ │ COCO, etc.) │ │             │            │
│  │ Llama-V)    │ │             │ │             │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** (for backend and lmms-eval)
- **Node.js 18+** (for frontend)
- **Docker and Docker Compose** (optional)
- **CUDA-capable GPU** (recommended)
- **16GB+ RAM** (32GB+ recommended)
- **100GB+ free disk space**

### Important: System Architecture
This is a **full-stack application** that runs on your local machine or server:
- **Backend**: Python server with lmms-eval (**all dependencies pre-installed** ✅)
- **Frontend**: Web interface in browser (no dependency warnings)
- **Database**: Supabase (cloud-hosted)

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
# Backend setup (all dependencies pre-installed)
cd backend
pip install -r requirements.txt  # Installs everything including:
# - decord (video processing)
# - qwen-vl-utils (Qwen models) 
# - librosa, soundfile (audio processing)
# - All other model dependencies

cp env_template.txt .env
# Edit .env with your configuration

# Frontend setup (Next.js - just web interface)
cd ../frontend-nextjs
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
cd backend && python main_complete.py

# Frontend (Next.js)
cd frontend-nextjs && npm run dev
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
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```



## 💡 **How Dependency Management Works**

### **For Users (Web Interface)**
- Open the web interface in your browser
- Select a model to evaluate
- **No dependency warnings** - all dependencies are pre-installed! ✅
- The "Start Evaluation" button is always enabled
- Run evaluations immediately without any setup

### **For Administrators (Server Setup)**
- **All dependencies are pre-installed** in the backend requirements
- The system automatically includes all model-specific dependencies:
  ```bash
  pip install -r requirements.txt  # Installs everything including:
  # - decord (video processing)
  # - qwen-vl-utils (Qwen models)
  # - librosa, soundfile (audio processing)
  # - All other model dependencies
  ```
- Users can run evaluations immediately without dependency issues

### **Dependency Types** (All Pre-Installed)
- **Video Models**: `decord` ✅ Pre-installed
- **Qwen Models**: `decord` + `qwen-vl-utils` ✅ Pre-installed  
- **Audio Models**: `librosa` + `soundfile` ✅ Pre-installed
- **API Models**: No additional dependencies needed ✅

## 🎯 Usage Examples

### Dependency Management

```bash
# Check model dependencies
curl -X GET "http://localhost:8000/api/v1/models/{model_id}/dependencies"

# Check all model dependencies
curl -X GET "http://localhost:8000/api/v1/dependencies/check"

# Refresh dependency cache
curl -X POST "http://localhost:8000/api/v1/dependencies/refresh"
```

### Task Discovery

```bash
# Get available tasks
curl -X GET "http://localhost:8000/api/v1/tasks/available"

# Get compatible tasks for a model
curl -X GET "http://localhost:8000/api/v1/tasks/compatible/{model_id}"

# Validate task names
curl -X POST "http://localhost:8000/api/v1/tasks/validate" \
  -H "Content-Type: application/json" \
  -d '{"task_names": ["arc", "gsm8k", "hellaswag"]}'
```

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
# Create an evaluation with custom name
curl -X POST http://localhost:8000/api/v1/evaluations \
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
curl http://localhost:8000/api/v1/evaluations/your-evaluation-id

# Get results
curl http://localhost:8000/api/v1/evaluations/your-evaluation-id/results

# Get all evaluations with filtering
curl "http://localhost:8000/api/v1/evaluations?status=running&modality=image"
```

### WebSocket Integration

```javascript
// Real-time monitoring
const ws = new WebSocket('ws://localhost:8000/api/v1/evaluations/ws/updates/your-evaluation-id');

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
    case 'dependency_warning':
      showDependencyWarning(message.data);
      break;
  }
};
```

## 🔧 Supported Models

### Vision-Language Models
- **LLaVA Series**: `llava`, `llava_onevision`, `llava_onevision1_5`, `llava_vid`
- **Qwen2-VL Series**: `qwen2_vl`, `qwen2_5_vl`, `qwen2_5_omni`, `qwen2_audio`
- **Llama Vision**: `llama_vision`, `llama_vid`
- **InstructBLIP**: `instructblip`
- **BLIP Series**: `blip`, `blip2`
- **InternVL Series**: `internvl`, `internvl2`
- **Video Models**: `videochat2`, `moviechat`, `longva`, `videollama3`

### Audio Models
- **Whisper**: `whisper`
- **AudioCaps**: `audiocaps`
- **Qwen2-Audio**: `qwen2_audio`

### API Models
- **OpenAI**: `gpt4v`, `gpt4o_audio`
- **Anthropic**: `claude`
- **Google**: `gemini_api`
- **Reka**: `reka`

### Dependency Requirements
- **Video Models**: Require `decord` for video processing
- **Qwen Models**: Require `decord` and `qwen-vl-utils`
- **Audio Models**: Require `librosa` and `soundfile`
- **API Models**: No additional dependencies required

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



## 🛠️ System Features

### Dependency Management
- **Automatic Detection**: Detects missing dependencies before evaluation
- **Smart Mapping**: Maps 50+ model types to their required dependencies
- **Installation Guidance**: Provides exact pip install commands
- **Pre-flight Validation**: Prevents evaluation failures
- **Real-time Warnings**: Frontend displays dependency warnings

### Task Discovery
- **Dynamic Discovery**: Automatically discovers available lmms-eval tasks
- **Intelligent Mapping**: Maps database benchmarks to valid task names
- **Validation Layer**: Ensures only compatible tasks are selected
- **Caching System**: 24-hour TTL cache for optimal performance
- **Fuzzy Matching**: Smart task name matching with fallbacks

### Evaluation Management
- **Named Evaluations**: Custom names for better identification
- **Advanced Filtering**: Filter by name, model, modality, and status
- **Real-time Progress**: Live progress updates via WebSocket
- **Resource Management**: Intelligent resource allocation
- **Error Recovery**: Graceful error handling with helpful messages

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
- **Dependency Tracking**: Track dependency status across models
- **Task Compatibility**: Analyze task-model compatibility



## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

