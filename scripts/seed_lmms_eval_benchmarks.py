#!/usr/bin/env python3
"""
Script to seed the database with all benchmarks from lmms-eval framework.
This adds all supported benchmarks by default to the web-app.
"""

import requests
import json
import os
import time
from typing import Dict, List, Any

# API configuration
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000/api/v1")

# Comprehensive list of benchmarks from lmms-eval with their details
LMMS_EVAL_BENCHMARKS = [
    # Vision-Language Benchmarks
    {
        "name": "COCO-Caption",
        "modality": "vision",
        "category": "captioning",
        "task_type": "image_captioning",
        "primary_metrics": ["cider", "bleu"],
        "secondary_metrics": ["meteor", "rouge_l"],
        "num_samples": 5000,
        "description": "COCO image captioning benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 5000,
            "lmms_eval_name": "coco_caption"
        }
    },
    {
        "name": "COCO-Caption2017",
        "modality": "vision",
        "category": "captioning",
        "task_type": "image_captioning",
        "primary_metrics": ["cider", "bleu"],
        "secondary_metrics": ["meteor", "rouge_l"],
        "num_samples": 5000,
        "description": "COCO 2017 image captioning benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 5000,
            "lmms_eval_name": "coco_caption2017"
        }
    },
    {
        "name": "VQA-v2",
        "modality": "vision",
        "category": "vqa",
        "task_type": "visual_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 10000,
        "description": "Visual Question Answering v2 benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 10000,
            "lmms_eval_name": "vqav2"
        }
    },
    {
        "name": "TextVQA",
        "modality": "vision",
        "category": "vqa",
        "task_type": "visual_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 8000,
        "description": "Text-based Visual Question Answering benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 8000,
            "lmms_eval_name": "textvqa"
        }
    },
    {
        "name": "MME",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1500,
        "description": "Multimodal Evaluation benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 1500,
            "lmms_eval_name": "mme"
        }
    },
    {
        "name": "MMBench",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 3000,
        "description": "Multimodal Benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 3000,
            "lmms_eval_name": "mmbench"
        }
    },
    {
        "name": "MMBench-CN",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 3000,
        "description": "Multimodal Benchmark Chinese",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 3000,
            "lmms_eval_name": "mmbench_cn"
        }
    },
    {
        "name": "MMBench-EN",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 3000,
        "description": "Multimodal Benchmark English",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 3000,
            "lmms_eval_name": "mmbench_en"
        }
    },
    {
        "name": "MMMU",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 12000,
        "description": "Massive Multitask Multimodal Understanding",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "very_hard",
            "dataset_size": 12000,
            "lmms_eval_name": "mmmu"
        }
    },
    {
        "name": "CMMMU",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 12000,
        "description": "Chinese Massive Multitask Multimodal Understanding",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "very_hard",
            "dataset_size": 12000,
            "lmms_eval_name": "cmmmu"
        }
    },
    {
        "name": "ScienceQA",
        "modality": "vision",
        "category": "science",
        "task_type": "question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 2000,
        "description": "Science Question Answering benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 2000,
            "lmms_eval_name": "scienceqa"
        }
    },
    {
        "name": "AI2D",
        "modality": "vision",
        "category": "science",
        "task_type": "diagram_understanding",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1500,
        "description": "AI2 Diagram Understanding benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 1500,
            "lmms_eval_name": "ai2d"
        }
    },
    {
        "name": "ChartQA",
        "modality": "vision",
        "category": "document",
        "task_type": "chart_understanding",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 3000,
        "description": "Chart Question Answering benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 3000,
            "lmms_eval_name": "chartqa"
        }
    },
    {
        "name": "DocVQA",
        "modality": "vision",
        "category": "document",
        "task_type": "document_understanding",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 5000,
        "description": "Document Visual Question Answering benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 5000,
            "lmms_eval_name": "docvqa"
        }
    },
    {
        "name": "InfographicVQA",
        "modality": "vision",
        "category": "document",
        "task_type": "infographic_understanding",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 2000,
        "description": "Infographic Visual Question Answering benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 2000,
            "lmms_eval_name": "infovqa"
        }
    },
    {
        "name": "OKVQA",
        "modality": "vision",
        "category": "vqa",
        "task_type": "visual_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 9000,
        "description": "OK-VQA benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 9000,
            "lmms_eval_name": "ok_vqa"
        }
    },
    {
        "name": "VizWiz",
        "modality": "vision",
        "category": "vqa",
        "task_type": "visual_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 8000,
        "description": "VizWiz Visual Question Answering benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 8000,
            "lmms_eval_name": "vizwiz_vqa"
        }
    },
    {
        "name": "GQA",
        "modality": "vision",
        "category": "vqa",
        "task_type": "visual_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 12000,
        "description": "GQA Visual Question Answering benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 12000,
            "lmms_eval_name": "gqa"
        }
    },
    {
        "name": "POPE",
        "modality": "vision",
        "category": "hallucination",
        "task_type": "object_detection",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "POPE Hallucination Detection benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 1000,
            "lmms_eval_name": "pope"
        }
    },
    {
        "name": "LLaVA-Bench",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 2000,
        "description": "LLaVA Benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 2000,
            "lmms_eval_name": "llava_bench_coco"
        }
    },
    {
        "name": "LLaVA-In-The-Wild",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "LLaVA In The Wild benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 1000,
            "lmms_eval_name": "llava_in_the_wild"
        }
    },
    {
        "name": "MME-COT",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1500,
        "description": "MME Chain of Thought benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 1500,
            "lmms_eval_name": "mme_cot_direct"
        }
    },
    {
        "name": "MME-COT-Reason",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1500,
        "description": "MME Chain of Thought Reasoning benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 1500,
            "lmms_eval_name": "mme_cot_reason"
        }
    },
    # Audio Benchmarks
    {
        "name": "FLEURS-ASR",
        "modality": "audio",
        "category": "speech_recognition",
        "task_type": "automatic_speech_recognition",
        "primary_metrics": ["wer", "bleu"],
        "secondary_metrics": ["cer"],
        "num_samples": 2000,
        "description": "FLEURS Automatic Speech Recognition benchmark",
        "metadata": {
            "modality_support": ["audio", "text"],
            "difficulty": "medium",
            "dataset_size": 2000,
            "lmms_eval_name": "fleurs_asr"
        }
    },
    {
        "name": "FLEURS-ST",
        "modality": "audio",
        "category": "speech_translation",
        "task_type": "speech_translation",
        "primary_metrics": ["bleu"],
        "secondary_metrics": ["meteor"],
        "num_samples": 2000,
        "description": "FLEURS Speech Translation benchmark",
        "metadata": {
            "modality_support": ["audio", "text"],
            "difficulty": "hard",
            "dataset_size": 2000,
            "lmms_eval_name": "fleurs_st"
        }
    },
    {
        "name": "CommonVoice-ASR",
        "modality": "audio",
        "category": "speech_recognition",
        "task_type": "automatic_speech_recognition",
        "primary_metrics": ["wer", "bleu"],
        "secondary_metrics": ["cer"],
        "num_samples": 5000,
        "description": "CommonVoice Automatic Speech Recognition benchmark",
        "metadata": {
            "modality_support": ["audio", "text"],
            "difficulty": "medium",
            "dataset_size": 5000,
            "lmms_eval_name": "common_voice_asr"
        }
    },
    {
        "name": "LibriSpeech-ASR",
        "modality": "audio",
        "category": "speech_recognition",
        "task_type": "automatic_speech_recognition",
        "primary_metrics": ["wer", "bleu"],
        "secondary_metrics": ["cer"],
        "num_samples": 3000,
        "description": "LibriSpeech Automatic Speech Recognition benchmark",
        "metadata": {
            "modality_support": ["audio", "text"],
            "difficulty": "medium",
            "dataset_size": 3000,
            "lmms_eval_name": "librispeech_asr"
        }
    },
    # Video Benchmarks
    {
        "name": "ActivityNet-QA",
        "modality": "video",
        "category": "video_qa",
        "task_type": "video_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 2000,
        "description": "ActivityNet Video Question Answering benchmark",
        "metadata": {
            "modality_support": ["video", "text"],
            "difficulty": "hard",
            "dataset_size": 2000,
            "lmms_eval_name": "activitynet_qa"
        }
    },
    {
        "name": "MSVD-QA",
        "modality": "video",
        "category": "video_qa",
        "task_type": "video_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1500,
        "description": "MSVD Video Question Answering benchmark",
        "metadata": {
            "modality_support": ["video", "text"],
            "difficulty": "medium",
            "dataset_size": 1500,
            "lmms_eval_name": "msvd_qa"
        }
    },
    {
        "name": "MSRVTT-QA",
        "modality": "video",
        "category": "video_qa",
        "task_type": "video_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 2000,
        "description": "MSR-VTT Video Question Answering benchmark",
        "metadata": {
            "modality_support": ["video", "text"],
            "difficulty": "medium",
            "dataset_size": 2000,
            "lmms_eval_name": "msrvtt_qa"
        }
    },
    {
        "name": "TGIF-QA",
        "modality": "video",
        "category": "video_qa",
        "task_type": "video_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "TGIF Video Question Answering benchmark",
        "metadata": {
            "modality_support": ["video", "text"],
            "difficulty": "hard",
            "dataset_size": 1000,
            "lmms_eval_name": "tgif_qa"
        }
    },
    # Text-Only Benchmarks
    {
        "name": "HellaSwag",
        "modality": "text",
        "category": "commonsense",
        "task_type": "multiple_choice",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 10000,
        "description": "HellaSwag Commonsense Reasoning benchmark",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "medium",
            "dataset_size": 10000,
            "lmms_eval_name": "hellaswag"
        }
    },
    {
        "name": "ARC",
        "modality": "text",
        "category": "science",
        "task_type": "multiple_choice",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 2000,
        "description": "ARC Science Question Answering benchmark",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "hard",
            "dataset_size": 2000,
            "lmms_eval_name": "arc"
        }
    },
    {
        "name": "MMLU",
        "modality": "text",
        "category": "comprehensive",
        "task_type": "multiple_choice",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 15000,
        "description": "Massive Multitask Language Understanding benchmark",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "very_hard",
            "dataset_size": 15000,
            "lmms_eval_name": "mmlu"
        }
    },
    {
        "name": "TruthfulQA",
        "modality": "text",
        "category": "truthfulness",
        "task_type": "multiple_choice",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "TruthfulQA Truthfulness benchmark",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "hard",
            "dataset_size": 1000,
            "lmms_eval_name": "truthfulqa"
        }
    },
    {
        "name": "GSM8K",
        "modality": "text",
        "category": "math",
        "task_type": "math_reasoning",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["exact_match"],
        "num_samples": 2000,
        "description": "GSM8K Math Reasoning benchmark",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "hard",
            "dataset_size": 2000,
            "lmms_eval_name": "gsm8k"
        }
    },
    {
        "name": "HumanEval",
        "modality": "text",
        "category": "code",
        "task_type": "code_generation",
        "primary_metrics": ["pass_at_k"],
        "secondary_metrics": ["exact_match"],
        "num_samples": 164,
        "description": "HumanEval Code Generation benchmark",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "hard",
            "dataset_size": 164,
            "lmms_eval_name": "human_eval"
        }
    },
    {
        "name": "MBPP",
        "modality": "text",
        "category": "code",
        "task_type": "code_generation",
        "primary_metrics": ["pass_at_k"],
        "secondary_metrics": ["exact_match"],
        "num_samples": 1000,
        "description": "MBPP Code Generation benchmark",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "medium",
            "dataset_size": 1000,
            "lmms_eval_name": "mbpp"
        }
    },
    # Additional Vision-Language Benchmarks
    {
        "name": "SEED-Bench",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 20000,
        "description": "SEED-Bench Multimodal Evaluation benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 20000,
            "lmms_eval_name": "seedbench"
        }
    },
    {
        "name": "SEED-Bench-Lite",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 2000,
        "description": "SEED-Bench Lite Multimodal Evaluation benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 2000,
            "lmms_eval_name": "seedbench_lite"
        }
    },
    {
        "name": "MVBench",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "MVBench Multimodal Evaluation benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 1000,
            "lmms_eval_name": "mvbench"
        }
    },
    {
        "name": "LiveBench",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 500,
        "description": "LiveBench Real-time Multimodal Evaluation benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "very_hard",
            "dataset_size": 500,
            "lmms_eval_name": "live_bench"
        }
    }
]

def check_api_health() -> bool:
    """Check if the API is healthy and accessible."""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

def register_benchmark(benchmark_data: Dict[str, Any]) -> bool:
    """Register a single benchmark with the API."""
    try:
        response = requests.post(
            f"{API_BASE_URL}/benchmarks",
            json=benchmark_data,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            print(f"✅ {benchmark_data['name']}")
            return True
        elif response.status_code == 409:
            print(f"⏭️  {benchmark_data['name']} (already exists)")
            return True
        else:
            print(f"❌ {benchmark_data['name']} - {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ {benchmark_data['name']} - Network error: {e}")
        return False

def main():
    """Main function to seed all lmms-eval benchmarks."""
    print("Seeding LMMS-Eval benchmarks into the database...")
    print(f"API Base URL: {API_BASE_URL}")
    print()
    
    # Check API health
    if not check_api_health():
        print("ERROR: API is not healthy. Please start the backend server first.")
        return
    
    print()
    print(f"Found {len(LMMS_EVAL_BENCHMARKS)} benchmarks to register")
    print()
    
    # Register all benchmarks
    successful = 0
    failed = 0
    skipped = 0
    
    for i, benchmark_data in enumerate(LMMS_EVAL_BENCHMARKS, 1):
        print(f"[{i:2d}/{len(LMMS_EVAL_BENCHMARKS)}] ", end="")
        
        if register_benchmark(benchmark_data):
            successful += 1
        else:
            failed += 1
        
        # Small delay to avoid overwhelming the API
        time.sleep(0.1)
    
    print()
    print("Registration Summary:")
    print(f"  Successful: {successful}")
    print(f"  Skipped (exists): {skipped}")
    print(f"  Failed: {failed}")
    print(f"  Total: {len(LMMS_EVAL_BENCHMARKS)}")
    
    if failed == 0:
        print()
        print("All benchmarks registered successfully!")
        print("You can now use these benchmarks in the web-app for evaluation.")
    else:
        print()
        print(f"WARNING: {failed} benchmarks failed to register. Check the errors above.")

if __name__ == "__main__":
    main()
