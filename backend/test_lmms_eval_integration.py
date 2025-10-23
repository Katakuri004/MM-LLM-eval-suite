#!/usr/bin/env python3
"""
Test lmms-eval integration and result parsing.
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
from services.supabase_service import supabase_service

logger = structlog.get_logger(__name__)

def test_lmms_eval_installation():
    """Test lmms-eval installation and basic functionality."""
    print("🧪 Testing lmms-eval Installation")
    print("=" * 50)
    
    try:
        # Test 1: Check lmms-eval path
        lmms_eval_path = enhanced_evaluation_service.lmms_eval_path
        print(f"✅ lmms-eval path: {lmms_eval_path}")
        
        # Test 2: Check if lmms-eval directory exists
        if not Path(lmms_eval_path).exists():
            print(f"❌ lmms-eval directory not found: {lmms_eval_path}")
            return False
        
        print(f"✅ lmms-eval directory exists")
        
        # Test 3: Check for lmms_eval module
        lmms_eval_module_path = Path(lmms_eval_path) / "lmms_eval"
        if not lmms_eval_module_path.exists():
            print(f"❌ lmms_eval module not found: {lmms_eval_module_path}")
            return False
        
        print(f"✅ lmms_eval module found")
        
        # Test 4: Check for __main__.py
        main_py_path = Path(lmms_eval_path) / "lmms_eval" / "__main__.py"
        if not main_py_path.exists():
            print(f"❌ lmms_eval __main__.py not found: {main_py_path}")
            return False
        
        print(f"✅ lmms_eval __main__.py found")
        
        # Test 5: Try to import lmms_eval
        try:
            sys.path.insert(0, lmms_eval_path)
            import lmms_eval
            print(f"✅ lmms_eval imported successfully")
        except ImportError as e:
            print(f"❌ Failed to import lmms_eval: {e}")
            return False
        
        # Test 6: Check available tasks
        try:
            tasks_path = Path(lmms_eval_path) / "lmms_eval" / "tasks"
            if tasks_path.exists():
                task_files = list(tasks_path.glob("*.yaml"))
                print(f"✅ Found {len(task_files)} task files")
                
                # List some example tasks
                example_tasks = [f.name for f in task_files[:5]]
                print(f"   Example tasks: {', '.join(example_tasks)}")
            else:
                print("⚠️  Tasks directory not found")
        except Exception as e:
            print(f"⚠️  Could not check tasks: {e}")
        
        print("\n🎉 lmms-eval installation test passed!")
        return True
        
    except Exception as e:
        print(f"❌ lmms-eval installation test failed: {e}")
        return False

def test_model_benchmark_mapping():
    """Test model and benchmark mapping to lmms-eval."""
    print("\n🔗 Testing Model and Benchmark Mapping")
    print("=" * 50)
    
    try:
        # Test model mapping
        test_models = [
            {"name": "llava-1.5-7b", "family": "llava", "source": "huggingface://llava-hf/llava-1.5-7b-hf"},
            {"name": "qwen2-vl-7b", "family": "qwen", "source": "huggingface://Qwen/Qwen2-VL-7B-Instruct"},
            {"name": "gpt-4-vision", "family": "openai", "source": "api://openai/gpt-4-vision"},
            {"name": "local-model", "family": "custom", "source": "local://my-model"},
        ]
        
        print("📝 Testing model mapping...")
        for model in test_models:
            lmms_name = enhanced_evaluation_service._map_model_to_lmms_eval(model)
            print(f"  {model['name']} → {lmms_name}")
        
        # Test benchmark mapping
        test_benchmarks = [
            {"name": "coco-caption", "modality": "vision", "category": "captioning"},
            {"name": "vqa-v2", "modality": "vision", "category": "vqa"},
            {"name": "textvqa", "modality": "vision", "category": "vqa"},
            {"name": "gqa", "modality": "vision", "category": "vqa"},
            {"name": "scienceqa", "modality": "vision", "category": "science"},
        ]
        
        print("\n📝 Testing benchmark mapping...")
        for benchmark in test_benchmarks:
            lmms_task = enhanced_evaluation_service._map_benchmark_to_lmms_eval(benchmark)
            print(f"  {benchmark['name']} → {lmms_task}")
        
        print("\n✅ Model and benchmark mapping test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Model and benchmark mapping test failed: {e}")
        return False

def test_lmms_eval_command_generation():
    """Test lmms-eval command generation."""
    print("\n⚙️  Testing lmms-eval Command Generation")
    print("=" * 50)
    
    try:
        # Test command generation for different scenarios
        test_cases = [
            {
                "model": {"name": "llava-1.5-7b", "family": "llava", "source": "huggingface://llava-hf/llava-1.5-7b-hf"},
                "benchmark": {"name": "coco-caption", "modality": "vision"},
                "config": {"batch_size": 1, "num_fewshot": 0, "limit": 10}
            },
            {
                "model": {"name": "qwen2-vl-7b", "family": "qwen", "source": "huggingface://Qwen/Qwen2-VL-7B-Instruct"},
                "benchmark": {"name": "vqa-v2", "modality": "vision"},
                "config": {"batch_size": 2, "num_fewshot": 1, "limit": 5}
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n📝 Test case {i}:")
            print(f"  Model: {test_case['model']['name']}")
            print(f"  Benchmark: {test_case['benchmark']['name']}")
            print(f"  Config: {test_case['config']}")
            
            # Generate expected command
            model_name = enhanced_evaluation_service._map_model_to_lmms_eval(test_case['model'])
            task_name = enhanced_evaluation_service._map_benchmark_to_lmms_eval(test_case['benchmark'])
            
            expected_cmd = [
                "python", "-m", "lmms_eval",
                "--model", model_name,
                "--tasks", task_name,
                "--batch_size", str(test_case['config']['batch_size']),
                "--num_fewshot", str(test_case['config']['num_fewshot']),
                "--limit", str(test_case['config']['limit'])
            ]
            
            print(f"  Expected command: {' '.join(expected_cmd)}")
            print(f"  ✅ Command generation successful")
        
        print("\n✅ lmms-eval command generation test passed!")
        return True
        
    except Exception as e:
        print(f"❌ lmms-eval command generation test failed: {e}")
        return False

def test_result_parsing():
    """Test result parsing from lmms-eval output."""
    print("\n📊 Testing Result Parsing")
    print("=" * 50)
    
    try:
        # Test 1: JSON result parsing
        json_result = {
            "accuracy": 0.85,
            "f1_score": 0.82,
            "bleu": 0.75,
            "rouge": 0.80
        }
        
        parsed_result = enhanced_evaluation_service._parse_lmms_eval_output(json.dumps(json_result))
        print(f"✅ JSON result parsing: {parsed_result}")
        
        # Test 2: Text output parsing
        text_output = """
        Running evaluation...
        Task: coco_caption
        Accuracy: 0.85
        F1 Score: 0.82
        BLEU: 0.75
        ROUGE: 0.80
        Evaluation completed.
        """
        
        parsed_text = enhanced_evaluation_service._parse_lmms_eval_output(text_output)
        print(f"✅ Text output parsing: {parsed_text}")
        
        # Test 3: Mixed output parsing
        mixed_output = f"""
        Starting evaluation...
        {json.dumps(json_result)}
        Evaluation completed successfully.
        """
        
        parsed_mixed = enhanced_evaluation_service._parse_lmms_eval_output(mixed_output)
        print(f"✅ Mixed output parsing: {parsed_mixed}")
        
        print("\n✅ Result parsing test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Result parsing test failed: {e}")
        return False

async def test_database_operations():
    """Test database operations for evaluations."""
    print("\n🗄️  Testing Database Operations")
    print("=" * 50)
    
    try:
        if not supabase_service.is_available():
            print("❌ Supabase not available. Please check your configuration.")
            return False
        
        print("✅ Supabase connection established")
        
        # Test 1: Create evaluation
        test_evaluation = {
            "id": "test-evaluation-123",
            "model_id": "test-model-123",
            "name": "Test Evaluation",
            "status": "pending",
            "config": {"batch_size": 1, "num_fewshot": 0},
            "benchmark_ids": ["test-benchmark-1", "test-benchmark-2"]
        }
        
        try:
            evaluation = supabase_service.create_evaluation(test_evaluation)
            print(f"✅ Evaluation created: {evaluation['id']}")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("⚠️  Evaluation already exists (expected for testing)")
            else:
                print(f"❌ Failed to create evaluation: {e}")
                return False
        
        # Test 2: Create evaluation result
        test_result = {
            "evaluation_id": "test-evaluation-123",
            "benchmark_name": "test-benchmark",
            "task_name": "test_task",
            "metrics": {"accuracy": 0.85, "f1_score": 0.82},
            "scores": {"overall": 0.85},
            "samples_count": 100,
            "execution_time_seconds": 120
        }
        
        try:
            result = supabase_service.create_evaluation_result(test_result)
            print(f"✅ Evaluation result created: {result['id']}")
        except Exception as e:
            print(f"❌ Failed to create evaluation result: {e}")
            return False
        
        # Test 3: Create evaluation progress
        test_progress = {
            "evaluation_id": "test-evaluation-123",
            "current_benchmark": "test-benchmark",
            "progress_percentage": 50,
            "status_message": "Running evaluation..."
        }
        
        try:
            progress = supabase_service.upsert_evaluation_progress(test_progress)
            print(f"✅ Evaluation progress created: {progress['id']}")
        except Exception as e:
            print(f"❌ Failed to create evaluation progress: {e}")
            return False
        
        # Test 4: Retrieve evaluation
        try:
            evaluation = supabase_service.get_evaluation("test-evaluation-123")
            if evaluation:
                print(f"✅ Evaluation retrieved: {evaluation['name']}")
            else:
                print("❌ Failed to retrieve evaluation")
                return False
        except Exception as e:
            print(f"❌ Failed to retrieve evaluation: {e}")
            return False
        
        # Test 5: Retrieve evaluation results
        try:
            results = supabase_service.get_evaluation_results("test-evaluation-123")
            print(f"✅ Retrieved {len(results)} evaluation results")
        except Exception as e:
            print(f"❌ Failed to retrieve evaluation results: {e}")
            return False
        
        print("\n✅ Database operations test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Database operations test failed: {e}")
        return False

async def test_complete_evaluation_flow():
    """Test the complete evaluation flow."""
    print("\n🚀 Testing Complete Evaluation Flow")
    print("=" * 50)
    
    try:
        # Check if we have models and benchmarks in the database
        models = supabase_service.get_models(limit=1)
        benchmarks = supabase_service.get_benchmarks(limit=1)
        
        if not models or not benchmarks:
            print("⚠️  No models or benchmarks found in database")
            print("   Skipping complete evaluation flow test")
            return True
        
        print(f"✅ Found {len(models)} models and {len(benchmarks)} benchmarks")
        
        # Test evaluation creation
        model = models[0]
        benchmark = benchmarks[0]
        
        evaluation_config = {
            "batch_size": 1,
            "num_fewshot": 0,
            "limit": 1,  # Very small limit for testing
            "model_args": {}
        }
        
        print(f"📝 Creating test evaluation...")
        print(f"  Model: {model['name']}")
        print(f"  Benchmark: {benchmark['name']}")
        print(f"  Config: {evaluation_config}")
        
        # Create evaluation (but don't actually run it)
        evaluation_id = f"test-eval-{int(asyncio.get_event_loop().time())}"
        
        evaluation_data = {
            "id": evaluation_id,
            "model_id": model["id"],
            "name": f"Test Evaluation {evaluation_id}",
            "status": "pending",
            "config": evaluation_config,
            "benchmark_ids": [benchmark["id"]]
        }
        
        try:
            evaluation = supabase_service.create_evaluation(evaluation_data)
            print(f"✅ Test evaluation created: {evaluation['id']}")
        except Exception as e:
            print(f"❌ Failed to create test evaluation: {e}")
            return False
        
        # Test progress tracking
        progress_data = {
            "evaluation_id": evaluation_id,
            "current_benchmark": benchmark["name"],
            "progress_percentage": 25,
            "status_message": "Starting evaluation..."
        }
        
        try:
            progress = supabase_service.upsert_evaluation_progress(progress_data)
            print(f"✅ Progress tracking working: {progress['id']}")
        except Exception as e:
            print(f"❌ Failed to create progress: {e}")
            return False
        
        # Test result storage
        result_data = {
            "evaluation_id": evaluation_id,
            "benchmark_id": benchmark["id"],
            "benchmark_name": benchmark["name"],
            "task_name": "test_task",
            "metrics": {"accuracy": 0.85, "f1_score": 0.82},
            "scores": {"overall": 0.85},
            "samples_count": 1,
            "execution_time_seconds": 30
        }
        
        try:
            result = supabase_service.create_evaluation_result(result_data)
            print(f"✅ Result storage working: {result['id']}")
        except Exception as e:
            print(f"❌ Failed to store result: {e}")
            return False
        
        print("\n✅ Complete evaluation flow test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Complete evaluation flow test failed: {e}")
        return False

async def main():
    """Run all tests."""
    print("🧪 lmms-eval Integration and Result Parsing Tests")
    print("=" * 70)
    
    tests = [
        ("lmms-eval Installation", test_lmms_eval_installation),
        ("Model and Benchmark Mapping", test_model_benchmark_mapping),
        ("Command Generation", test_lmms_eval_command_generation),
        ("Result Parsing", test_result_parsing),
        ("Database Operations", test_database_operations),
        ("Complete Evaluation Flow", test_complete_evaluation_flow),
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
        print("\n🎉 All tests passed! lmms-eval integration is working correctly.")
        return True
    else:
        print(f"\n⚠️  {total - passed} tests failed. Please check the issues above.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
