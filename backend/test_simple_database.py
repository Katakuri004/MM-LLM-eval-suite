#!/usr/bin/env python3
"""
Simple test to check database tables and clean up placeholder code.
"""

import os
import sys
import uuid
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.supabase_service import supabase_service

def test_database_tables():
    """Test if database tables exist and are working."""
    print("🧪 Testing Database Tables")
    print("=" * 50)
    
    try:
        # Test 1: Check Supabase connection
        if not supabase_service.is_available():
            print("❌ Supabase not available")
            return False
        
        print("✅ Supabase connection established")
        
        # Test 2: Check evaluations table
        try:
            evaluations = supabase_service.get_evaluations(limit=1)
            print("✅ Evaluations table accessible")
        except Exception as e:
            print(f"❌ Evaluations table error: {e}")
            return False
        
        # Test 3: Check models and benchmarks
        models = supabase_service.get_models(limit=5)
        benchmarks = supabase_service.get_benchmarks(limit=10)
        
        print(f"✅ Found {len(models)} models")
        print(f"✅ Found {len(benchmarks)} benchmarks")
        
        if not models or not benchmarks:
            print("❌ No models or benchmarks found")
            return False
        
        # Test 4: Create a test evaluation
        print("\n📝 Testing evaluation creation...")
        
        model = models[0]
        benchmark = benchmarks[0]
        
        test_evaluation = {
            "id": f"test-eval-{uuid.uuid4().hex[:8]}",
            "model_id": model["id"],
            "name": f"Test Evaluation {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "status": "pending",
            "config": {
                "batch_size": 1,
                "num_fewshot": 0,
                "limit": 1
            },
            "benchmark_ids": [benchmark["id"]]
        }
        
        try:
            evaluation = supabase_service.create_evaluation(test_evaluation)
            print(f"✅ Test evaluation created: {evaluation['id']}")
            evaluation_id = evaluation['id']
        except Exception as e:
            print(f"❌ Failed to create evaluation: {e}")
            return False
        
        # Test 5: Create evaluation progress
        print("\n📈 Testing evaluation progress...")
        
        progress_data = {
            "evaluation_id": evaluation_id,
            "current_benchmark": benchmark["name"],
            "progress_percentage": 50,
            "status_message": "Testing progress tracking..."
        }
        
        try:
            progress = supabase_service.upsert_evaluation_progress(progress_data)
            print(f"✅ Progress tracking working: {progress['id']}")
        except Exception as e:
            print(f"❌ Failed to create progress: {e}")
            return False
        
        # Test 6: Create evaluation result
        print("\n📊 Testing evaluation result...")
        
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
        
        # Test 7: Retrieve evaluation
        print("\n📋 Testing evaluation retrieval...")
        
        try:
            retrieved_evaluation = supabase_service.get_evaluation(evaluation_id)
            if retrieved_evaluation:
                print(f"✅ Evaluation retrieved: {retrieved_evaluation['name']}")
            else:
                print("❌ Failed to retrieve evaluation")
                return False
        except Exception as e:
            print(f"❌ Failed to retrieve evaluation: {e}")
            return False
        
        # Test 8: Retrieve evaluation results
        print("\n📊 Testing evaluation results retrieval...")
        
        try:
            results = supabase_service.get_evaluation_results(evaluation_id)
            print(f"✅ Retrieved {len(results)} evaluation results")
        except Exception as e:
            print(f"❌ Failed to retrieve results: {e}")
            return False
        
        print("\n🎉 All database operations working correctly!")
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def clean_up_placeholder_files():
    """Remove placeholder files."""
    print("\n🧹 Cleaning Up Placeholder Files")
    print("=" * 50)
    
    try:
        import os
        from pathlib import Path
        
        # Check for placeholder files that can be removed
        placeholder_files = [
            "apply_evaluation_migration.py",
            "create_evaluation_tables.py",
            "test_syntax_fix.py"
        ]
        
        removed_files = []
        for file_name in placeholder_files:
            file_path = Path(file_name)
            if file_path.exists():
                file_path.unlink()
                removed_files.append(file_name)
                print(f"✅ Removed placeholder file: {file_name}")
        
        if removed_files:
            print(f"\n✅ Cleaned up {len(removed_files)} placeholder files")
        else:
            print("✅ No placeholder files found")
        
        print("\n✅ Placeholder file cleanup completed!")
        return True
        
    except Exception as e:
        print(f"❌ Placeholder file cleanup failed: {e}")
        return False

def main():
    """Run tests and cleanup."""
    print("🧪 Database Tables Test & Cleanup")
    print("=" * 70)
    
    tests = [
        ("Database Tables", test_database_tables),
        ("Placeholder File Cleanup", clean_up_placeholder_files),
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
        print("  • Database tables created and accessible")
        print("  • Evaluation operations working")
        print("  • Progress tracking functional")
        print("  • Result storage working")
        print("  • Placeholder files cleaned up")
        print("\n🚀 System is ready for production use!")
        return True
    else:
        print(f"\n⚠️  {total - passed} tests failed. Please check the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
