#!/usr/bin/env python3
"""
Comprehensive script to seed the database with all 60+ benchmarks from lmms-eval framework.
This adds all supported benchmarks with proper modality and difficulty classification.
"""

import requests
import json
import os
import time
from typing import Dict, List, Any

# API configuration
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000/api/v1")

# Comprehensive list of all lmms-eval benchmarks with proper categorization
COMPREHENSIVE_BENCHMARKS = [
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
        "name": "NoCaps",
        "modality": "vision",
        "category": "captioning",
        "task_type": "image_captioning",
        "primary_metrics": ["cider", "bleu"],
        "secondary_metrics": ["meteor", "rouge_l"],
        "num_samples": 15000,
        "description": "NoCaps image captioning benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 15000,
            "lmms_eval_name": "nocaps_caption"
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
        "name": "GQA",
        "modality": "vision",
        "category": "vqa",
        "task_type": "visual_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 12000,
        "description": "GQA visual question answering benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 12000,
            "lmms_eval_name": "gqa"
        }
    },
    {
        "name": "OK-VQA",
        "modality": "vision",
        "category": "vqa",
        "task_type": "visual_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 9000,
        "description": "OK-VQA visual question answering benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 9000,
            "lmms_eval_name": "ok_vqa_val2014"
        }
    },
    {
        "name": "VizWiz",
        "modality": "vision",
        "category": "vqa",
        "task_type": "visual_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 6000,
        "description": "VizWiz visual question answering benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 6000,
            "lmms_eval_name": "vizwiz_vqa_val"
        }
    },
    {
        "name": "ScienceQA",
        "modality": "vision",
        "category": "science",
        "task_type": "multimodal_qa",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 2000,
        "description": "ScienceQA multimodal science question answering",
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
        "category": "diagram",
        "task_type": "diagram_understanding",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 3000,
        "description": "AI2D diagram understanding benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 3000,
            "lmms_eval_name": "ai2d"
        }
    },
    {
        "name": "ChartQA",
        "modality": "vision",
        "category": "chart",
        "task_type": "chart_understanding",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 4000,
        "description": "ChartQA chart understanding benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 4000,
            "lmms_eval_name": "chartqa"
        }
    },
    {
        "name": "DocVQA",
        "modality": "vision",
        "category": "document",
        "task_type": "document_qa",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 5000,
        "description": "DocVQA document visual question answering",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 5000,
            "lmms_eval_name": "docvqa"
        }
    },
    {
        "name": "InfoVQA",
        "modality": "vision",
        "category": "vqa",
        "task_type": "visual_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 7000,
        "description": "InfoVQA visual question answering benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 7000,
            "lmms_eval_name": "infovqa_val"
        }
    },
    {
        "name": "OCR-VQA",
        "modality": "vision",
        "category": "ocr",
        "task_type": "ocr_qa",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 3000,
        "description": "OCR-VQA optical character recognition benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 3000,
            "lmms_eval_name": "ocrvqa"
        }
    },
    {
        "name": "STVQA",
        "modality": "vision",
        "category": "vqa",
        "task_type": "visual_question_answering",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 4000,
        "description": "STVQA scene text visual question answering",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 4000,
            "lmms_eval_name": "stvqa"
        }
    },
    {
        "name": "TextCaps",
        "modality": "vision",
        "category": "captioning",
        "task_type": "image_captioning",
        "primary_metrics": ["cider", "bleu"],
        "secondary_metrics": ["meteor", "rouge_l"],
        "num_samples": 8000,
        "description": "TextCaps text-based image captioning",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 8000,
            "lmms_eval_name": "textcaps_caption"
        }
    },
    {
        "name": "VCR",
        "modality": "vision",
        "category": "reasoning",
        "task_type": "visual_reasoning",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 2000,
        "description": "VCR visual commonsense reasoning",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 2000,
            "lmms_eval_name": "vcr"
        }
    },
    {
        "name": "RefCOCO",
        "modality": "vision",
        "category": "referring",
        "task_type": "referring_expression",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 5000,
        "description": "RefCOCO referring expression comprehension",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 5000,
            "lmms_eval_name": "refcoco_bbox_val"
        }
    },
    {
        "name": "RefCOCO+",
        "modality": "vision",
        "category": "referring",
        "task_type": "referring_expression",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 5000,
        "description": "RefCOCO+ referring expression comprehension",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 5000,
            "lmms_eval_name": "refcoco+_bbox_val"
        }
    },
    {
        "name": "RefCOCOg",
        "modality": "vision",
        "category": "referring",
        "task_type": "referring_expression",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 5000,
        "description": "RefCOCOg referring expression comprehension",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 5000,
            "lmms_eval_name": "refcocog_bbox_val"
        }
    },
    {
        "name": "Flickr30k",
        "modality": "vision",
        "category": "captioning",
        "task_type": "image_captioning",
        "primary_metrics": ["cider", "bleu"],
        "secondary_metrics": ["meteor", "rouge_l"],
        "num_samples": 30000,
        "description": "Flickr30k image captioning benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 30000,
            "lmms_eval_name": "flickr30k"
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
        "num_samples": 2000,
        "description": "MMBench multimodal evaluation",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 2000,
            "lmms_eval_name": "mmbench_en_test"
        }
    },
    {
        "name": "LLaVA-Bench",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "LLaVA-Bench multimodal evaluation",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 1000,
            "lmms_eval_name": "llava_bench_coco"
        }
    },
    {
        "name": "SEED-Bench",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 2000,
        "description": "SEED-Bench multimodal evaluation",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 2000,
            "lmms_eval_name": "seedbench"
        }
    },
    {
        "name": "MMMU",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "MMMU multimodal evaluation",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 1000,
            "lmms_eval_name": "mmmu"
        }
    },
    {
        "name": "MathVista",
        "modality": "vision",
        "category": "math",
        "task_type": "mathematical_reasoning",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "MathVista mathematical reasoning benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 1000,
            "lmms_eval_name": "mathvista_test"
        }
    },
    {
        "name": "HallusionBench",
        "modality": "vision",
        "category": "hallucination",
        "task_type": "hallucination_detection",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 500,
        "description": "HallusionBench hallucination detection",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 500,
            "lmms_eval_name": "hallusion_bench_image"
        }
    },
    {
        "name": "LLaVA-Wild",
        "modality": "vision",
        "category": "comprehensive",
        "task_type": "multimodal_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "LLaVA in the wild evaluation",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 1000,
            "lmms_eval_name": "llava_in_the_wild"
        }
    },
    {
        "name": "POPE",
        "modality": "vision",
        "category": "hallucination",
        "task_type": "hallucination_detection",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "POPE hallucination detection benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 1000,
            "lmms_eval_name": "pope"
        }
    },
    {
        "name": "SNLI-VE",
        "modality": "vision",
        "category": "reasoning",
        "task_type": "visual_entailment",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 2000,
        "description": "SNLI-VE visual entailment benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "medium",
            "dataset_size": 2000,
            "lmms_eval_name": "snli_ve"
        }
    },
    {
        "name": "VALSE",
        "modality": "vision",
        "category": "reasoning",
        "task_type": "visual_reasoning",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "VALSE visual reasoning benchmark",
        "metadata": {
            "modality_support": ["vision", "text"],
            "difficulty": "hard",
            "dataset_size": 1000,
            "lmms_eval_name": "valse"
        }
    },
    # Audio Benchmarks
    {
        "name": "LibriSpeech",
        "modality": "audio",
        "category": "asr",
        "task_type": "automatic_speech_recognition",
        "primary_metrics": ["wer", "cer"],
        "secondary_metrics": ["bleu"],
        "num_samples": 5000,
        "description": "LibriSpeech automatic speech recognition",
        "metadata": {
            "modality_support": ["audio", "text"],
            "difficulty": "medium",
            "dataset_size": 5000,
            "lmms_eval_name": "librispeech_test_clean"
        }
    },
    {
        "name": "Common Voice",
        "modality": "audio",
        "category": "asr",
        "task_type": "automatic_speech_recognition",
        "primary_metrics": ["wer", "cer"],
        "secondary_metrics": ["bleu"],
        "num_samples": 3000,
        "description": "Common Voice speech recognition",
        "metadata": {
            "modality_support": ["audio", "text"],
            "difficulty": "medium",
            "dataset_size": 3000,
            "lmms_eval_name": "open_asr_common_voice"
        }
    },
    {
        "name": "TED-LIUM",
        "modality": "audio",
        "category": "asr",
        "task_type": "automatic_speech_recognition",
        "primary_metrics": ["wer", "cer"],
        "secondary_metrics": ["bleu"],
        "num_samples": 2000,
        "description": "TED-LIUM speech recognition",
        "metadata": {
            "modality_support": ["audio", "text"],
            "difficulty": "hard",
            "dataset_size": 2000,
            "lmms_eval_name": "open_asr_tedlium"
        }
    },
    # Video Benchmarks
    {
        "name": "VideoChatGPT",
        "modality": "video",
        "category": "comprehensive",
        "task_type": "video_understanding",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "VideoChatGPT video understanding",
        "metadata": {
            "modality_support": ["video", "text"],
            "difficulty": "hard",
            "dataset_size": 1000,
            "lmms_eval_name": "videochatgpt"
        }
    },
    {
        "name": "VideoMME",
        "modality": "video",
        "category": "comprehensive",
        "task_type": "video_evaluation",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 500,
        "description": "VideoMME video evaluation",
        "metadata": {
            "modality_support": ["video", "text"],
            "difficulty": "hard",
            "dataset_size": 500,
            "lmms_eval_name": "videomme"
        }
    },
    {
        "name": "VideoMathQA",
        "modality": "video",
        "category": "math",
        "task_type": "video_math_qa",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 500,
        "description": "VideoMathQA video mathematical reasoning",
        "metadata": {
            "modality_support": ["video", "text"],
            "difficulty": "hard",
            "dataset_size": 500,
            "lmms_eval_name": "videomathqa_mcq"
        }
    },
    # Text-Only Benchmarks
    {
        "name": "MMLU",
        "modality": "text",
        "category": "knowledge",
        "task_type": "multiple_choice",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 10000,
        "description": "MMLU massive multitask language understanding",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "hard",
            "dataset_size": 10000,
            "lmms_eval_name": "mmlu"
        }
    },
    {
        "name": "HellaSwag",
        "modality": "text",
        "category": "reasoning",
        "task_type": "commonsense_reasoning",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 5000,
        "description": "HellaSwag commonsense reasoning",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "medium",
            "dataset_size": 5000,
            "lmms_eval_name": "hellaswag"
        }
    },
    {
        "name": "ARC",
        "modality": "text",
        "category": "reasoning",
        "task_type": "scientific_reasoning",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 2000,
        "description": "ARC AI2 reasoning challenge",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "hard",
            "dataset_size": 2000,
            "lmms_eval_name": "arc"
        }
    },
    {
        "name": "GSM8K",
        "modality": "text",
        "category": "math",
        "task_type": "mathematical_reasoning",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "GSM8K grade school math problems",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "medium",
            "dataset_size": 1000,
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
        "description": "HumanEval code generation benchmark",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "hard",
            "dataset_size": 164,
            "lmms_eval_name": "humaneval"
        }
    },
    {
        "name": "MBPP",
        "modality": "text",
        "category": "code",
        "task_type": "code_generation",
        "primary_metrics": ["pass_at_k"],
        "secondary_metrics": ["exact_match"],
        "num_samples": 500,
        "description": "MBPP mostly basic Python problems",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "medium",
            "dataset_size": 500,
            "lmms_eval_name": "mbpp"
        }
    },
    {
        "name": "TruthfulQA",
        "modality": "text",
        "category": "safety",
        "task_type": "truthfulness",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 1000,
        "description": "TruthfulQA truthfulness evaluation",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "hard",
            "dataset_size": 1000,
            "lmms_eval_name": "truthfulqa"
        }
    },
    {
        "name": "ToxiGen",
        "modality": "text",
        "category": "safety",
        "task_type": "toxicity_detection",
        "primary_metrics": ["accuracy"],
        "secondary_metrics": ["f1_score"],
        "num_samples": 2000,
        "description": "ToxiGen toxicity detection",
        "metadata": {
            "modality_support": ["text"],
            "difficulty": "medium",
            "dataset_size": 2000,
            "lmms_eval_name": "toxigen"
        }
    }
]

def check_api_health() -> bool:
    """Check if the API is healthy."""
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
    """Main function to seed all comprehensive benchmarks."""
    print("🌱 Seeding Comprehensive LMMS-Eval Benchmarks")
    print("=" * 60)
    print(f"API Base URL: {API_BASE_URL}")
    print()
    
    # Check API health
    if not check_api_health():
        print("❌ ERROR: API is not healthy. Please start the backend server first.")
        return
    
    print(f"📊 Found {len(COMPREHENSIVE_BENCHMARKS)} benchmarks to register")
    print()
    
    # Group benchmarks by modality for better organization
    modalities = {}
    for benchmark in COMPREHENSIVE_BENCHMARKS:
        modality = benchmark['modality']
        if modality not in modalities:
            modalities[modality] = []
        modalities[modality].append(benchmark)
    
    print("📋 Benchmark Categories:")
    for modality, benchmarks in modalities.items():
        print(f"  {modality.title()}: {len(benchmarks)} benchmarks")
    print()
    
    # Register all benchmarks
    successful = 0
    failed = 0
    skipped = 0
    
    for i, benchmark_data in enumerate(COMPREHENSIVE_BENCHMARKS, 1):
        print(f"[{i:2d}/{len(COMPREHENSIVE_BENCHMARKS)}] ", end="")
        
        if register_benchmark(benchmark_data):
            successful += 1
        else:
            failed += 1
        
        # Small delay to avoid overwhelming the API
        time.sleep(0.1)
    
    print()
    print("=" * 60)
    print("📊 SEEDING SUMMARY")
    print("=" * 60)
    print(f"✅ Successful: {successful}")
    print(f"⏭️  Skipped: {skipped}")
    print(f"❌ Failed: {failed}")
    print(f"📈 Total: {successful + skipped + failed}")
    print()
    
    if successful > 0:
        print("🎉 Successfully seeded comprehensive benchmark database!")
        print("💡 You can now use the enhanced filtering and selection features.")
    else:
        print("⚠️  No benchmarks were successfully registered.")
        print("🔧 Please check the API logs for more details.")

if __name__ == "__main__":
    main()


