"""
Test script to verify if real evaluations can be run.
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1"

def test_real_evaluation():
    """Test if we can run a real evaluation."""
    print("=" * 60)
    print("TESTING REAL EVALUATION CAPABILITY")
    print("=" * 60)
    
    # Step 1: Get models
    print("\n1. Fetching models...")
    try:
        response = requests.get(f"{BASE_URL}/models")
        if response.status_code != 200:
            print(f"❌ Failed to get models: {response.status_code}")
            return False
        
        models = response.json().get('models', [])
        print(f"✓ Found {len(models)} models")
        
        if not models:
            print("❌ No models found")
            return False
        
        model = models[0]
        print(f"✓ Using model: {model['name']} (ID: {model['id']})")
        
    except Exception as e:
        print(f"❌ Error getting models: {e}")
        return False
    
    # Step 2: Get benchmarks
    print("\n2. Fetching benchmarks...")
    try:
        response = requests.get(f"{BASE_URL}/benchmarks")
        if response.status_code != 200:
            print(f"❌ Failed to get benchmarks: {response.status_code}")
            return False
        
        benchmarks = response.json().get('benchmarks', [])
        print(f"✓ Found {len(benchmarks)} benchmarks")
        
        if not benchmarks:
            print("❌ No benchmarks found")
            return False
        
        benchmark = benchmarks[0]
        print(f"✓ Using benchmark: {benchmark['name']} (ID: {benchmark['id']})")
        
    except Exception as e:
        print(f"❌ Error getting benchmarks: {e}")
        return False
    
    # Step 3: Test evaluation creation
    print("\n3. Testing evaluation creation...")
    try:
        evaluation_request = {
            "model_id": model['id'],
            "benchmark_ids": [benchmark['id']],
            "name": f"Real Test Evaluation - {time.strftime('%Y-%m-%d %H:%M:%S')}",
            "config": {
                "batch_size": 1,
                "num_fewshot": 0,
                "limit": 5  # Very small limit for testing
            }
        }
        
        print(f"Request: {json.dumps(evaluation_request, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/evaluations",
            json=evaluation_request
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            evaluation_id = result['evaluation_id']
            print(f"✅ Evaluation created successfully: {evaluation_id}")
            return True
        else:
            print(f"❌ Failed to create evaluation: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating evaluation: {e}")
        return False

if __name__ == "__main__":
    success = test_real_evaluation()
    if success:
        print("\n✅ REAL EVALUATION SYSTEM IS WORKING!")
        print("You can now run evaluations that will:")
        print("- Execute real lmms-eval commands")
        print("- Generate actual benchmark results")
        print("- Store results in the database")
        print("- Display results in the frontend")
    else:
        print("\n❌ EVALUATION SYSTEM HAS ISSUES")
        print("Check the errors above for details")
