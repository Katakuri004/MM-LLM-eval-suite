#!/usr/bin/env python3
"""
Fixed test to check database tables with proper UUID format.
"""

import os
import sys
import uuid
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.supabase_service import supabase_service

def test_database_connection():
    """Test database connection."""
    print("🔌 Testing Database Connection")
    print("=" * 50)
    
    try:
        if not supabase_service.is_available():
            print("❌ Supabase not available")
            return False
        
        print("✅ Supabase connection established")
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_evaluations_table():
    """Test evaluations table with proper UUID format."""
    print("\n📊 Testing Evaluations Table")
    print("=" * 50)
    
    try:
        # Test basic access
        evaluations = supabase_service.get_evaluations(limit=1)
        print("✅ Evaluations table accessible")
        
        # Test creating a simple evaluation with proper UUID
        test_evaluation = {
            "id": str(uuid.uuid4()),  # Proper UUID format
            "model_id": "00000000-0000-0000-0000-000000000000",  # Dummy UUID
            "name": f"Test Evaluation {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "status": "pending",
            "config": {"batch_size": 1},
            "benchmark_ids": ["test-benchmark"]
        }
        
        print("📝 Testing evaluation creation...")
        evaluation = supabase_service.create_evaluation(test_evaluation)
        print(f"✅ Test evaluation created: {evaluation['id']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Evaluations table test failed: {e}")
        return False

def test_models_and_benchmarks():
    """Test models and benchmarks."""
    print("\n📋 Testing Models and Benchmarks")
    print("=" * 50)
    
    try:
        models = supabase_service.get_models(limit=5)
        benchmarks = supabase_service.get_benchmarks(limit=10)
        
        print(f"✅ Found {len(models)} models")
        print(f"✅ Found {len(benchmarks)} benchmarks")
        
        if models and len(models) > 0:
            print(f"   First model: {models[0]['name']}")
        if benchmarks and len(benchmarks) > 0:
            print(f"   First benchmark: {benchmarks[0]['name']}")
        
        return len(models) > 0 and len(benchmarks) > 0
        
    except Exception as e:
        print(f"❌ Models and benchmarks test failed: {e}")
        return False

def test_evaluation_with_real_data():
    """Test evaluation with real model and benchmark data."""
    print("\n🚀 Testing Evaluation with Real Data")
    print("=" * 50)
    
    try:
        # Get real models and benchmarks
        models = supabase_service.get_models(limit=1)
        benchmarks = supabase_service.get_benchmarks(limit=1)
        
        if not models or len(models) == 0 or not benchmarks or len(benchmarks) == 0:
            print("❌ No models or benchmarks available")
            return False
        
        model = models[0]
        benchmark = benchmarks[0]
        
        print(f"📝 Using model: {model['name']} (ID: {model['id']})")
        print(f"📝 Using benchmark: {benchmark['name']} (ID: {benchmark['id']})")
        
        # Create evaluation with real data and proper UUID
        test_evaluation = {
            "id": str(uuid.uuid4()),  # Proper UUID format
            "model_id": model["id"],
            "name": f"Real Data Test {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "status": "pending",
            "config": {
                "batch_size": 1,
                "num_fewshot": 0,
                "limit": 1
            },
            "benchmark_ids": [benchmark["id"]]
        }
        
        print("📝 Creating evaluation with real data...")
        evaluation = supabase_service.create_evaluation(test_evaluation)
        print(f"✅ Evaluation created: {evaluation['id']}")
        
        # Test progress tracking
        print("📈 Testing progress tracking...")
        progress_data = {
            "evaluation_id": evaluation["id"],
            "current_benchmark": benchmark["name"],
            "progress_percentage": 50,
            "status_message": "Testing with real data..."
        }
        
        progress = supabase_service.upsert_evaluation_progress(progress_data)
        print(f"✅ Progress tracking working: {progress['id']}")
        
        # Test result storage
        print("📊 Testing result storage...")
        result_data = {
            "evaluation_id": evaluation["id"],
            "benchmark_id": benchmark["id"],
            "benchmark_name": benchmark["name"],
            "task_name": "test_task",
            "metrics": {"accuracy": 0.85, "f1_score": 0.82},
            "scores": {"overall": 0.85},
            "samples_count": 1,
            "execution_time_seconds": 30
        }
        
        result = supabase_service.create_evaluation_result(result_data)
        print(f"✅ Result storage working: {result['id']}")
        
        # Test retrieval
        print("📋 Testing retrieval...")
        retrieved_evaluation = supabase_service.get_evaluation(evaluation["id"])
        if retrieved_evaluation:
            print(f"✅ Evaluation retrieved: {retrieved_evaluation['name']}")
        else:
            print("❌ Failed to retrieve evaluation")
            return False
        
        results = supabase_service.get_evaluation_results(evaluation["id"])
        print(f"✅ Retrieved {len(results)} evaluation results")
        
        print("\n✅ All operations with real data working!")
        return True
        
    except Exception as e:
        print(f"❌ Real data test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run fixed database tests."""
    print("🧪 Fixed Database Tests")
    print("=" * 70)
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Evaluations Table", test_evaluations_table),
        ("Models and Benchmarks", test_models_and_benchmarks),
        ("Evaluation with Real Data", test_evaluation_with_real_data),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*70}")
        print(f"Running: {test_name}")
        print('='*70)
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test {test_name} failed with exception: {e}")
            import traceback
            traceback.print_exc()
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
        print("\n🎉 All tests passed! Database is working correctly.")
        print("\n✅ System Status:")
        print("  • Database connection established")
        print("  • Evaluations table working")
        print("  • Models and benchmarks available")
        print("  • Evaluation operations working")
        print("  • Progress tracking functional")
        print("  • Result storage working")
        print("\n🚀 System is ready for production use!")
        return True
    else:
        print(f"\n⚠️  {total - passed} tests failed. Please check the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
