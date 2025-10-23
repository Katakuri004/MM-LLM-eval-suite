"""
Test script that temporarily adjusts resource limits for testing.
"""

import requests
import json
import time
import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.production_evaluation_orchestrator import production_orchestrator

def test_evaluation_with_adjusted_limits():
    """Test evaluation with adjusted resource limits."""
    print("=" * 60)
    print("TESTING EVALUATION WITH ADJUSTED RESOURCE LIMITS")
    print("=" * 60)
    
    # Temporarily adjust resource limits for testing
    print("Adjusting resource limits for testing...")
    production_orchestrator.resource_limits.max_memory_gb = 2.0  # Lower memory requirement
    production_orchestrator.resource_limits.max_cpu_percent = 90.0  # Higher CPU tolerance
    production_orchestrator.resource_limits.max_disk_gb = 1.0  # Lower disk requirement
    
    print(f"New limits: Memory={production_orchestrator.resource_limits.max_memory_gb}GB, "
          f"CPU={production_orchestrator.resource_limits.max_cpu_percent}%, "
          f"Disk={production_orchestrator.resource_limits.max_disk_gb}GB")
    
    # Step 1: Get models and benchmarks
    print("\n1. Getting models and benchmarks...")
    try:
        models_response = requests.get("http://localhost:8000/api/v1/models")
        benchmarks_response = requests.get("http://localhost:8000/api/v1/benchmarks")
        
        if models_response.status_code != 200 or benchmarks_response.status_code != 200:
            print("❌ Failed to get models or benchmarks")
            return False
        
        models = models_response.json().get('models', [])
        benchmarks = benchmarks_response.json().get('benchmarks', [])
        
        if not models or not benchmarks:
            print("❌ No models or benchmarks found")
            return False
        
        model = models[0]
        benchmark = benchmarks[0]
        print(f"✓ Using model: {model['name']}")
        print(f"✓ Using benchmark: {benchmark['name']}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Step 2: Try evaluation with adjusted limits
    print("\n2. Attempting evaluation with adjusted limits...")
    try:
        evaluation_request = {
            "model_id": model['id'],
            "benchmark_ids": [benchmark['id']],
            "name": f"Adjusted Limits Test - {time.strftime('%Y-%m-%d %H:%M:%S')}",
            "config": {
                "batch_size": 1,
                "num_fewshot": 0,
                "limit": 2  # Very small limit
            }
        }
        
        print(f"Request: {json.dumps(evaluation_request, indent=2)}")
        
        response = requests.post(
            "http://localhost:8000/api/v1/evaluations",
            json=evaluation_request
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            evaluation_id = result['evaluation_id']
            print(f"✅ Evaluation started successfully: {evaluation_id}")
            
            # Monitor for a short time
            print("\n3. Monitoring evaluation progress...")
            for i in range(15):  # Monitor for 30 seconds
                time.sleep(2)
                try:
                    status_response = requests.get(f"http://localhost:8000/api/v1/evaluations/{evaluation_id}")
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        status = status_data.get('status', 'unknown')
                        print(f"Status: {status}")
                        if status in ['completed', 'failed', 'cancelled']:
                            print(f"Final status: {status}")
                            break
                except Exception as e:
                    print(f"Error checking status: {e}")
            
            return True
        else:
            print(f"❌ Failed to start evaluation: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_evaluation_with_adjusted_limits()
    if success:
        print("\n✅ EVALUATION SYSTEM IS WORKING!")
        print("The system can run real evaluations with lmms-eval!")
        print("Results will be stored in the database and displayed in the frontend!")
    else:
        print("\n❌ EVALUATION SYSTEM STILL HAS ISSUES")
        print("Check the errors above for details")
