# LMMS-Eval Framework Integration

## 🎯 Overview

This document describes how the [lmms-eval](https://github.com/EvolvingLMMs-Lab/lmms-eval) framework is integrated into the LMMS-Eval Dashboard, providing comprehensive multimodal evaluation capabilities across Text, Image, Video, and Audio tasks.

## 🏗️ Architecture Integration

### High-Level Integration

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

### Integration Components

1. **LMMSEvalRunner**: Core wrapper around lmms-eval CLI
2. **Model Registry**: Integration with lmms-eval model system
3. **Benchmark Management**: Support for all lmms-eval benchmarks
4. **Real-time Monitoring**: Live progress tracking and metrics
5. **Result Processing**: Advanced metrics parsing and storage

## 🔧 Technical Implementation

### 1. LMMSEvalRunner Class

The `LMMSEvalRunner` class provides a comprehensive wrapper around the lmms-eval framework:

```python
class LMMSEvalRunner:
    """
    Comprehensive runner for executing lmms-eval evaluations.
    
    Supports all modalities (Text, Image, Video, Audio) and provides
    advanced features like model-specific configurations, benchmark
    management, and real-time progress tracking.
    """
    
    def __init__(self, model_id: str, benchmark_ids: List[str], config: Dict[str, Any]):
        # Initialize with model and benchmark configuration
        
    def prepare_command(self) -> List[str]:
        # Build comprehensive lmms-eval CLI command
        
    def start(self) -> int:
        # Start the evaluation process
        
    def stream_logs(self) -> Generator[str, None, None]:
        # Stream real-time logs and progress
        
    def parse_metrics(self, output: str) -> Dict[str, Dict[str, float]]:
        # Parse evaluation results and metrics
```

### 2. Model Support

The integration supports all major multimodal models:

#### Vision-Language Models
- **LLaVA Series**: `llava`, `llava_onevision`, `llava_onevision1_5`
- **Qwen2-VL Series**: `qwen2_vl`, `qwen2_5_vl`
- **Llama Vision**: `llama_vision`
- **InstructBLIP**: `instructblip`
- **BLIP Series**: `blip`, `blip2`

#### Audio Models
- **Whisper**: `whisper`
- **AudioCaps**: `audiocaps`

#### Video Models
- **Video-ChatGPT**: `video_chatgpt`
- **Video-LLaMA**: `video_llama`

### 3. Benchmark Integration

Supports comprehensive benchmark coverage:

#### Vision Benchmarks
```python
VISION_BENCHMARKS = [
    "mme",           # Multimodal Evaluation
    "coco_caption",  # Image Captioning
    "vqa_v2",        # Visual Question Answering
    "textvqa",       # Text-based VQA
    "refcoco",       # Referring Expression Comprehension
    "nocaps",        # NoCaps Captioning
    "flickr30k",     # Flickr30k Captioning
    "gqa",           # GQA Visual Question Answering
    "okvqa",         # OK-VQA
    "aokvqa",        # A-OKVQA
    "scienceqa",     # ScienceQA
    "ai2d",          # AI2D Diagram Understanding
    "chartqa",       # ChartQA
    "docvqa",        # DocVQA
    "infographicvqa", # InfographicVQA
    "tabfact",       # TabFact
    "websrc",        # WebSRC
    "mathvista",     # MathVista
    "hallusionbench", # HallusionBench
    "pope",          # POPE
    "mmehallu",      # MME Hallucination
    "seed_bench",    # SEED-Bench
    "mmbench",       # MMBench
    "mmbench_cn",    # MMBench-CN
    "llavabench",    # LLaVABench
    "mmmu",          # MMMU
    "ceval",         # C-Eval
    "cmmlu",         # CMMLU
    "agieval",       # AGIEval
    "gaokao",        # GaoKao
    "bustm",         # BuST-M
    "flores",        # FLORES
    "xstorycloze",   # XStoryCloze
    "xwinograd",     # XWinograd
    "xcopa",         # XCOPA
    "xhellaswag",    # XHellaSwag
    "xcommonsenseqa", # XCommonsenseQA
    "xcsqa",         # XCSQA
    "siqa",          # SIQA
    "socialiqa",     # SocialIQA
    "piqa",          # PIQA
    "winogrande",    # WinoGrande
    "arc",           # ARC
    "hellaswag",     # HellaSwag
    "openbookqa",    # OpenBookQA
    "squad",         # SQuAD
    "race",          # RACE
    "mmlu",          # MMLU
    "truthfulqa",    # TruthfulQA
    "toxigen",       # ToxiGen
    "crowspairs",    # CrowSPairs
    "stereoset",     # StereoSet
    "bbq",           # BBQ
    "bold",          # BOLD
    "wino",          # Wino
    "honest",        # HONEST
    "regard",        # REGARD
    "safetyscore",   # SafetyScore
    "safetybench",   # SafetyBench
    "safetybench_cn", # SafetyBench-CN
    "safetybench_ja", # SafetyBench-JA
    "safetybench_ko", # SafetyBench-KO
    "safetybench_es", # SafetyBench-ES
    "safetybench_fr",  # SafetyBench-FR
    "safetybench_de", # SafetyBench-DE
    "safetybench_it", # SafetyBench-IT
    "safetybench_pt", # SafetyBench-PT
    "safetybench_ru", # SafetyBench-RU
    "safetybench_ar", # SafetyBench-AR
    "safetybench_hi", # SafetyBench-HI
    "safetybench_th", # SafetyBench-TH
    "safetybench_vi", # SafetyBench-VI
    "safetybench_id", # SafetyBench-ID
    "safetybench_sw", # SafetyBench-SW
    "safetybench_am", # SafetyBench-AM
    "safetybench_ha", # SafetyBench-HA
    "safetybench_yo", # SafetyBench-YO
    "safetybench_ig", # SafetyBench-IG
    "safetybench_zu", # SafetyBench-ZU
    "safetybench_xh", # SafetyBench-XH
    "safetybench_st", # SafetyBench-ST
    "safetybench_tn", # SafetyBench-TN
    "safetybench_ss", # SafetyBench-SS
    "safetybench_ve", # SafetyBench-VE
    "safetybench_ts", # SafetyBench-TS
    "safetybench_nr", # SafetyBench-NR
    "safetybench_nso", # SafetyBench-NSO
    "safetybench_zu", # SafetyBench-ZU
    "safetybench_xh", # SafetyBench-XH
    "safetybench_st", # SafetyBench-ST
    "safetybench_tn", # SafetyBench-TN
    "safetybench_ss", # SafetyBench-SS
    "safetybench_ve", # SafetyBench-VE
    "safetybench_ts", # SafetyBench-TS
    "safetybench_nr", # SafetyBench-NR
    "safetybench_nso", # SafetyBench-NSO
]
```

#### Audio Benchmarks
```python
AUDIO_BENCHMARKS = [
    "asr",           # Automatic Speech Recognition
    "audio_caption", # Audio Captioning
    "audio_qa",      # Audio Question Answering
    "audio_classification", # Audio Classification
    "audio_emotion", # Audio Emotion Recognition
    "audio_sentiment", # Audio Sentiment Analysis
]
```

#### Video Benchmarks
```python
VIDEO_BENCHMARKS = [
    "video_qa",      # Video Question Answering
    "video_caption", # Video Captioning
    "video_classification", # Video Classification
    "video_retrieval", # Video Retrieval
    "video_summarization", # Video Summarization
]
```

### 4. Real-time Monitoring

The integration provides comprehensive real-time monitoring:

```python
# WebSocket integration for live updates
async def stream_run_updates(self, run_id: str, runner: LMMSEvalRunner):
    """
    Stream real-time updates from lmms-eval evaluation.
    """
    for log_line in runner.stream_logs():
        # Parse log line for progress information
        progress_data = self._parse_progress_log(log_line)
        
        # Broadcast via WebSocket
        await websocket_manager.broadcast(run_id, {
            "type": "progress",
            "data": progress_data
        })
        
        # Parse metrics from log
        metrics = self._parse_metrics_from_log(log_line)
        if metrics:
            await websocket_manager.broadcast(run_id, {
                "type": "metric_update",
                "data": metrics
            })
```

### 5. Advanced Metrics Parsing

The integration includes sophisticated metrics parsing:

```python
def parse_metrics(self, output: str) -> Dict[str, Dict[str, float]]:
    """
    Parse lmms-eval output and extract comprehensive metrics.
    """
    metrics = {}
    
    # Parse JSON results file
    if self.log_file and os.path.exists(self.log_file):
        with open(self.log_file, 'r') as f:
            results_data = json.load(f)
        
        # Extract metrics for each benchmark
        for benchmark_id in self.benchmark_ids:
            if benchmark_id in results_data.get("results", {}):
                benchmark_results = results_data["results"][benchmark_id]
                
                # Parse all metric types
                for metric_name, metric_value in benchmark_results.items():
                    if isinstance(metric_value, (int, float)):
                        metrics[benchmark_id] = metrics.get(benchmark_id, {})
                        metrics[benchmark_id][metric_name] = float(metric_value)
                    elif isinstance(metric_value, dict):
                        # Handle nested metrics (e.g., per-category results)
                        for nested_name, nested_value in metric_value.items():
                            if isinstance(nested_value, (int, float)):
                                metrics[benchmark_id] = metrics.get(benchmark_id, {})
                                metrics[benchmark_id][f"{metric_name}_{nested_name}"] = float(nested_value)
    
    return metrics
```

## 🚀 Usage Examples

### 1. Basic Evaluation

```python
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

# Stream results
for log_line in runner.stream_logs():
    print(f"Log: {log_line}")

# Parse final metrics
metrics = runner.parse_metrics(runner.stdout)
print(f"Results: {metrics}")
```

### 2. Advanced Configuration

```python
# Multi-modal evaluation
runner = LMMSEvalRunner(
    model_id="qwen2_vl",
    benchmark_ids=["mme", "coco_caption", "vqa_v2", "textvqa"],
    config={
        "shots": 5,
        "seed": 42,
        "temperature": 0.1,
        "batch_size": 4,
        "limit": 1000,
        "model_args": {
            "pretrained": "Qwen/Qwen2-VL-7B-Instruct",
            "conv_template": "qwen2_vl"
        },
        "write_out": True,
        "write_out_path": "/path/to/outputs"
    }
)
```

### 3. Real-time Monitoring

```javascript
// Frontend WebSocket integration
const ws = new WebSocket('ws://localhost:8000/ws/runs/run-id');

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
    case 'error':
      showErrorMessage(message.data);
      break;
  }
};
```

## 🔧 Configuration Options

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
    "device": "cuda:0",            # Device for evaluation
    "work_dir": None,              # Working directory
    "log_level": "INFO",           # Logging level
    "verbose": True                # Verbose output
}
```

## 📊 Supported Metrics

The integration supports comprehensive metrics across all modalities:

### Vision Metrics
- **Accuracy**: Overall accuracy
- **F1-Score**: F1 score for classification
- **BLEU**: BLEU score for captioning
- **CIDEr**: CIDEr score for captioning
- **ROUGE**: ROUGE score for captioning
- **METEOR**: METEOR score for captioning
- **SPICE**: SPICE score for captioning

### Audio Metrics
- **WER**: Word Error Rate for ASR
- **CER**: Character Error Rate
- **BLEU**: BLEU score for audio captioning

### Video Metrics
- **Accuracy**: Video QA accuracy
- **F1-Score**: Video classification F1
- **BLEU**: Video captioning BLEU

### Text Metrics
- **Accuracy**: Text understanding accuracy
- **F1-Score**: Text classification F1
- **Exact Match**: Exact match accuracy
- **BLEU**: Text generation BLEU

## 🔄 Workflow Integration

### 1. Run Creation
```python
# Create evaluation run
run_data = {
    "name": "LLaVA-1.5-7B-Comprehensive-Eval",
    "model_id": "llava",
    "benchmark_ids": ["mme", "vqa_v2", "coco_caption", "textvqa"],
    "config": {
        "shots": 0,
        "seed": 42,
        "temperature": 0.0,
        "model_args": {
            "pretrained": "llava-hf/llava-1.5-7b-hf",
            "conv_template": "vicuna_v1"
        }
    }
}
```

### 2. Real-time Execution
```python
# Execute with real-time monitoring
async def execute_evaluation(run_id: str):
    runner = LMMSEvalRunner(**run_config)
    
    # Start evaluation
    process_id = runner.start()
    
    # Stream logs and metrics
    for log_line in runner.stream_logs():
        # Parse progress
        progress = parse_progress_log(log_line)
        
        # Update database
        await update_run_progress(run_id, progress)
        
        # Broadcast via WebSocket
        await broadcast_progress(run_id, progress)
    
    # Parse final results
    metrics = runner.parse_metrics(runner.stdout)
    
    # Store results
    await store_evaluation_results(run_id, metrics)
    
    # Cleanup
    runner.cleanup()
```

### 3. Result Processing
```python
# Process and store results
async def process_evaluation_results(run_id: str, metrics: Dict):
    for benchmark_id, benchmark_metrics in metrics.items():
        # Store benchmark results
        await store_benchmark_results(run_id, benchmark_id, benchmark_metrics)
        
        # Update leaderboard
        await update_leaderboard(benchmark_id, benchmark_metrics)
        
        # Generate analytics
        analytics = generate_analytics(benchmark_metrics)
        await store_analytics(run_id, benchmark_id, analytics)
```

## 🎯 Advanced Features

### 1. Multi-GPU Support
```python
# Configure multi-GPU evaluation
config = {
    "gpu_device_id": "cuda:0,1,2,3",
    "tensor_parallel": True,
    "pipeline_parallel": False
}
```

### 2. Distributed Evaluation
```python
# Configure distributed evaluation
config = {
    "distributed": True,
    "world_size": 4,
    "rank": 0,
    "master_addr": "localhost",
    "master_port": 12355
}
```

### 3. Custom Benchmarks
```python
# Add custom benchmark
custom_benchmark = {
    "name": "custom_benchmark",
    "path": "/path/to/custom/benchmark",
    "config": {
        "task_type": "multiple_choice",
        "metrics": ["accuracy", "f1_score"]
    }
}
```

## 🔍 Debugging and Troubleshooting

### 1. Log Analysis
```python
# Enable detailed logging
config = {
    "log_level": "DEBUG",
    "verbose": True,
    "write_out": True,
    "write_out_path": "/path/to/debug/outputs"
}
```

### 2. Error Handling
```python
try:
    runner = LMMSEvalRunner(**config)
    process_id = runner.start()
    
    for log_line in runner.stream_logs():
        if "ERROR" in log_line:
            logger.error(f"Evaluation error: {log_line}")
            # Handle error appropriately
            
except Exception as e:
    logger.error(f"Runner initialization failed: {e}")
    # Handle initialization error
```

### 3. Performance Monitoring
```python
# Monitor evaluation performance
import time

start_time = time.time()
for log_line in runner.stream_logs():
    # Process log line
    current_time = time.time()
    elapsed = current_time - start_time
    
    if elapsed > 3600:  # 1 hour timeout
        logger.warning("Evaluation timeout reached")
        runner.cleanup()
        break
```

## 📈 Performance Optimization

### 1. Memory Optimization
```python
# Configure memory-efficient evaluation
config = {
    "batch_size": 1,
    "gradient_checkpointing": True,
    "cpu_offload": True,
    "mixed_precision": True
}
```

### 2. Speed Optimization
```python
# Configure for speed
config = {
    "batch_size": 8,
    "num_workers": 4,
    "pin_memory": True,
    "prefetch_factor": 2
}
```

### 3. Storage Optimization
```python
# Configure storage
config = {
    "cache_dir": "/path/to/cache",
    "temp_dir": "/path/to/temp",
    "output_dir": "/path/to/outputs",
    "cleanup": True
}
```

## 🎉 Conclusion

The lmms-eval integration provides a comprehensive, production-ready solution for multimodal evaluation. It supports all major models and benchmarks across Text, Image, Video, and Audio modalities, with advanced features like real-time monitoring, distributed evaluation, and comprehensive metrics parsing.

The integration is designed to be:
- **Scalable**: Supports distributed evaluation across multiple GPUs
- **Flexible**: Configurable for different models and benchmarks
- **Robust**: Comprehensive error handling and recovery
- **Efficient**: Optimized for performance and resource usage
- **User-friendly**: Simple API with powerful features

This integration enables researchers and practitioners to easily evaluate multimodal models at scale, with comprehensive monitoring and analysis capabilities.
