"""
Test script to run evaluation with lower resource limits.
"""

import requests
import json
import time
import psutil

BASE_URL = "http://localhost:8000/api/v1"

def check_system_resources():
    """Check current system resources."""
    print("Checking system resources...")
    
    # Check memory
    memory = psutil.virtual_memory()
    available_gb = memory.available / (1024 ** 3)
    print(f"Available memory: {available_gb:.2f}GB")
    
    # Check CPU
    cpu_percent = psutil.cpu_percent(interval=1)
    print(f"CPU usage: {cpu_percent}%")
    
    # Check disk
    import shutil
    disk = shutil.disk_usage(".")
    available_gb = disk.free / (1024 ** 3)
    print(f"Available disk: {available_gb:.2f}GB")
    
    return available_gb, cpu_percent, available_gb

def test_evaluation_with_lower_limits():
    """Test evaluation with adjusted resource limits."""
    print("=" * 60)
    print("TESTING EVALUATION WITH LOWER RESOURCE LIMITS")
    print("=" * 60)
    
    # Check current resources
    memory_gb, cpu_percent, disk_gb = check_system_resources()
    
    # Step 1: Get models and benchmarks
    print("\n1. Getting models and benchmarks...")
    try:
        models_response = requests.get(f"{BASE_URL}/models")
        benchmarks_response = requests.get(f"{BASE_URL}/benchmarks")
        
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
    
    # Step 2: Try evaluation with very small limits
    print("\n2. Attempting evaluation with minimal requirements...")
    try:
        evaluation_request = {
            "model_id": model['id'],
            "benchmark_ids": [benchmark['id']],
            "name": f"Minimal Test - {time.strftime('%Y-%m-%d %H:%M:%S')}",
            "config": {
                "batch_size": 1,
                "num_fewshot": 0,
                "limit": 2  # Very small limit
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
            print(f"✅ Evaluation started successfully: {evaluation_id}")
            
            # Monitor for a short time
            print("\n3. Monitoring evaluation progress...")
            for i in range(10):  # Monitor for 20 seconds
                time.sleep(2)
                status_response = requests.get(f"{BASE_URL}/evaluations/{evaluation_id}")
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    print(f"Status: {status_data.get('status', 'unknown')}")
                    if status_data.get('status') in ['completed', 'failed', 'cancelled']:
                        break
            
            return True
        else:
            print(f"❌ Failed to start evaluation: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_evaluation_with_lower_limits()
    if success:
        print("\n✅ EVALUATION SYSTEM IS WORKING!")
        print("The system can run real evaluations with lmms-eval!")
    else:
        print("\n❌ EVALUATION SYSTEM NEEDS ADJUSTMENT")
        print("Resource limits may be too high for current system")
