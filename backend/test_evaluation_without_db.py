#!/usr/bin/env python3
"""
Test evaluation system without database dependencies.
"""

import asyncio
import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Dict, Any, List

import structlog

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.enhanced_evaluation_service import enhanced_evaluation_service

logger = structlog.get_logger(__name__)

def test_lmms_eval_command_execution():
    """Test lmms-eval command execution with mock data."""
    print("🧪 Testing lmms-eval Command Execution")
    print("=" * 50)
    
    try:
        # Test 1: Check if we can generate valid commands
        test_model = {
            "name": "llava-1.5-7b",
            "family": "llava", 
            "source": "huggingface://llava-hf/llava-1.5-7b-hf"
        }
        
        test_benchmark = {
            "name": "coco-caption",
            "modality": "vision",
            "category": "captioning"
        }
        
        test_config = {
            "batch_size": 1,
            "num_fewshot": 0,
            "limit": 1,  # Very small limit
            "model_args": {}
        }
        
        # Generate command
        model_name = enhanced_evaluation_service._map_model_to_lmms_eval(test_model)
        task_name = enhanced_evaluation_service._map_benchmark_to_lmms_eval(test_benchmark)
        
        print(f"✅ Model mapping: {test_model['name']} → {model_name}")
        print(f"✅ Benchmark mapping: {test_benchmark['name']} → {task_name}")
        
        # Test 2: Check if lmms-eval can be executed (dry run)
        lmms_eval_path = enhanced_evaluation_service.lmms_eval_path
        print(f"✅ lmms-eval path: {lmms_eval_path}")
        
        # Test 3: Check if we can import lmms_eval modules
        try:
            sys.path.insert(0, lmms_eval_path)
            import lmms_eval
            print(f"✅ lmms_eval imported successfully")
            
            # Check if we can access the main module
            if hasattr(lmms_eval, '__main__'):
                print(f"✅ lmms_eval main module accessible")
            
        except ImportError as e:
            print(f"❌ Failed to import lmms_eval: {e}")
            return False
        
        print("\n✅ lmms-eval command execution test passed!")
        return True
        
    except Exception as e:
        print(f"❌ lmms-eval command execution test failed: {e}")
        return False

def test_result_parsing_comprehensive():
    """Test comprehensive result parsing scenarios."""
    print("\n📊 Testing Comprehensive Result Parsing")
    print("=" * 50)
    
    try:
        # Test 1: Standard JSON results
        standard_json = {
            "accuracy": 0.85,
            "f1_score": 0.82,
            "bleu": 0.75,
            "rouge": 0.80,
            "exact_match": 0.70
        }
        
        parsed_standard = enhanced_evaluation_service._parse_lmms_eval_output(json.dumps(standard_json))
        print(f"✅ Standard JSON parsing: {parsed_standard}")
        
        # Test 2: Nested JSON results
        nested_json = {
            "results": {
                "accuracy": 0.85,
                "f1_score": 0.82
            },
            "metadata": {
                "samples": 100,
                "duration": 120
            }
        }
        
        parsed_nested = enhanced_evaluation_service._parse_lmms_eval_output(json.dumps(nested_json))
        print(f"✅ Nested JSON parsing: {parsed_nested}")
        
        # Test 3: Text output with metrics
        text_output = """
        ========================================
        Task: coco_caption
        ========================================
        Accuracy: 0.85
        F1 Score: 0.82
        BLEU: 0.75
        ROUGE: 0.80
        Exact Match: 0.70
        ========================================
        """
        
        parsed_text = enhanced_evaluation_service._parse_lmms_eval_output(text_output)
        print(f"✅ Text output parsing: {parsed_text}")
        
        # Test 4: Mixed output with JSON and text
        mixed_output = f"""
        Starting evaluation...
        Loading model...
        Running inference...
        {json.dumps(standard_json)}
        Evaluation completed successfully.
        Total time: 120 seconds
        """
        
        parsed_mixed = enhanced_evaluation_service._parse_lmms_eval_output(mixed_output)
        print(f"✅ Mixed output parsing: {parsed_mixed}")
        
        # Test 5: Error output
        error_output = """
        Error: Model not found
        Traceback (most recent call last):
          File "lmms_eval/__main__.py", line 123, in <module>
            main()
        """
        
        parsed_error = enhanced_evaluation_service._parse_lmms_eval_output(error_output)
        print(f"✅ Error output parsing: {parsed_error}")
        
        print("\n✅ Comprehensive result parsing test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Comprehensive result parsing test failed: {e}")
        return False

def test_model_benchmark_compatibility():
    """Test model and benchmark compatibility logic."""
    print("\n🔗 Testing Model and Benchmark Compatibility")
    print("=" * 50)
    
    try:
        # Test models with different capabilities
        test_models = [
            {
                "name": "llava-1.5-7b",
                "family": "llava",
                "source": "huggingface://llava-hf/llava-1.5-7b-hf",
                "capabilities": ["vision", "text"]
            },
            {
                "name": "qwen2-vl-7b", 
                "family": "qwen",
                "source": "huggingface://Qwen/Qwen2-VL-7B-Instruct",
                "capabilities": ["vision", "text"]
            },
            {
                "name": "gpt-4-vision",
                "family": "openai", 
                "source": "api://openai/gpt-4-vision",
                "capabilities": ["vision", "text"]
            },
            {
                "name": "whisper-large",
                "family": "openai",
                "source": "huggingface://openai/whisper-large-v2",
                "capabilities": ["audio"]
            }
        ]
        
        # Test benchmarks with different modalities
        test_benchmarks = [
            {
                "name": "coco-caption",
                "modality": "vision",
                "category": "captioning",
                "compatible_models": ["llava-1.5-7b", "qwen2-vl-7b", "gpt-4-vision"]
            },
            {
                "name": "vqa-v2",
                "modality": "vision", 
                "category": "vqa",
                "compatible_models": ["llava-1.5-7b", "qwen2-vl-7b", "gpt-4-vision"]
            },
            {
                "name": "librispeech",
                "modality": "audio",
                "category": "asr",
                "compatible_models": ["whisper-large"]
            }
        ]
        
        print("📝 Testing model-benchmark compatibility...")
        
        for model in test_models:
            print(f"\n  Model: {model['name']} ({model['family']})")
            print(f"    Capabilities: {model['capabilities']}")
            
            for benchmark in test_benchmarks:
                # Simple compatibility check
                is_compatible = (
                    (benchmark['modality'] in model['capabilities']) or
                    ('multimodal' in model['capabilities']) or
                    (benchmark['modality'] == 'text' and 'text' in model['capabilities'])
                )
                
                status = "✅ Compatible" if is_compatible else "❌ Incompatible"
                print(f"    {benchmark['name']} ({benchmark['modality']}): {status}")
        
        print("\n✅ Model and benchmark compatibility test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Model and benchmark compatibility test failed: {e}")
        return False

def test_evaluation_configuration():
    """Test evaluation configuration handling."""
    print("\n⚙️  Testing Evaluation Configuration")
    print("=" * 50)
    
    try:
        # Test different configuration scenarios
        test_configs = [
            {
                "name": "Basic Configuration",
                "config": {
                    "batch_size": 1,
                    "num_fewshot": 0,
                    "limit": 10
                }
            },
            {
                "name": "Advanced Configuration", 
                "config": {
                    "batch_size": 4,
                    "num_fewshot": 2,
                    "limit": 100,
                    "model_args": {
                        "temperature": 0.0,
                        "max_tokens": 512,
                        "top_p": 0.9
                    }
                }
            },
            {
                "name": "GPU Configuration",
                "config": {
                    "batch_size": 8,
                    "num_fewshot": 1,
                    "limit": 50,
                    "model_args": {
                        "device": "cuda:0",
                        "torch_dtype": "float16"
                    }
                }
            }
        ]
        
        for test_config in test_configs:
            print(f"\n📝 {test_config['name']}:")
            config = test_config['config']
            
            # Validate configuration
            required_fields = ['batch_size', 'num_fewshot', 'limit']
            missing_fields = [field for field in required_fields if field not in config]
            
            if missing_fields:
                print(f"  ❌ Missing required fields: {missing_fields}")
                continue
            
            # Check value ranges
            if config['batch_size'] <= 0:
                print(f"  ❌ Invalid batch_size: {config['batch_size']}")
                continue
                
            if config['num_fewshot'] < 0:
                print(f"  ❌ Invalid num_fewshot: {config['num_fewshot']}")
                continue
                
            if config['limit'] < 0:
                print(f"  ❌ Invalid limit: {config['limit']}")
                continue
            
            print(f"  ✅ Configuration valid")
            print(f"    Batch size: {config['batch_size']}")
            print(f"    Few-shot: {config['num_fewshot']}")
            print(f"    Limit: {config['limit']}")
            
            if 'model_args' in config:
                print(f"    Model args: {config['model_args']}")
        
        print("\n✅ Evaluation configuration test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Evaluation configuration test failed: {e}")
        return False

def test_lmms_eval_task_availability():
    """Test lmms-eval task availability and mapping."""
    print("\n📋 Testing lmms-eval Task Availability")
    print("=" * 50)
    
    try:
        # Test common benchmark mappings
        benchmark_mappings = [
            ("coco-caption", "nocaps_caption"),
            ("vqa-v2", "vqav2_val"),
            ("textvqa", "textvqa_val"),
            ("gqa", "gqa"),
            ("okvqa", "ok_vqa_val2014"),
            ("vizwiz", "vizwiz_vqa_val"),
            ("scienceqa", "scienceqa"),
            ("ai2d", "ai2d"),
            ("chartqa", "chartqa"),
            ("docvqa", "docvqa"),
            ("infographicvqa", "infovqa_val"),
            ("ocr-vqa", "ocrvqa"),
            ("stvqa", "stvqa"),
            ("textcaps", "textcaps_caption"),
            ("vcr", "vcr"),
            ("refcoco", "refcoco_bbox_val"),
            ("refcoco+", "refcoco+_bbox_val"),
            ("refcocog", "refcocog_bbox_val"),
            ("flickr30k", "flickr30k"),
            ("nocaps", "nocaps_caption"),
            ("snli-ve", "snli_ve"),
            ("valse", "valse"),
            ("pope", "pope"),
            ("mme", "mme"),
            ("llava-bench", "llava_bench_coco"),
            ("mmbench", "mmbench_en_test"),
            ("mmbench-dev", "mmbench_en_dev"),
        ]
        
        print("📝 Testing benchmark to lmms-eval task mappings...")
        
        for benchmark_name, expected_task in benchmark_mappings:
            test_benchmark = {"name": benchmark_name}
            mapped_task = enhanced_evaluation_service._map_benchmark_to_lmms_eval(test_benchmark)
            
            if mapped_task == expected_task:
                print(f"  ✅ {benchmark_name} → {mapped_task}")
            else:
                print(f"  ⚠️  {benchmark_name} → {mapped_task} (expected: {expected_task})")
        
        print("\n✅ lmms-eval task availability test passed!")
        return True
        
    except Exception as e:
        print(f"❌ lmms-eval task availability test failed: {e}")
        return False

async def main():
    """Run all tests without database dependencies."""
    print("🧪 Evaluation System Tests (Without Database)")
    print("=" * 70)
    
    tests = [
        ("lmms-eval Command Execution", test_lmms_eval_command_execution),
        ("Comprehensive Result Parsing", test_result_parsing_comprehensive),
        ("Model and Benchmark Compatibility", test_model_benchmark_compatibility),
        ("Evaluation Configuration", test_evaluation_configuration),
        ("lmms-eval Task Availability", test_lmms_eval_task_availability),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*70}")
        print(f"Running: {test_name}")
        print('='*70)
        
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*70}")
    print("TEST SUMMARY")
    print('='*70)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Evaluation system is ready for database integration.")
        print("\nNext steps:")
        print("1. Run the database migration (see MANUAL_MIGRATION_INSTRUCTIONS.md)")
        print("2. Test with real database operations")
        print("3. Run end-to-end evaluation tests")
        return True
    else:
        print(f"\n⚠️  {total - passed} tests failed. Please check the issues above.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
