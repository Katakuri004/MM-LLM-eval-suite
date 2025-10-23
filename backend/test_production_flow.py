"""
Test script for production evaluation flow.

This script tests the complete evaluation workflow:
1. Model and benchmark retrieval
2. Evaluation creation
3. Progress monitoring
4. Result retrieval
"""

import asyncio
import requests
import time
from typing import Dict, Any

BASE_URL = "http://localhost:8000/api/v1"

async def test_evaluation_flow():
    """Test the complete evaluation flow."""
    print("=" * 60)
    print("PRODUCTION EVALUATION FLOW TEST")
    print("=" * 60)
    
    # Step 1: Get models
    print("\n1. Fetching models...")
    response = requests.get(f"{BASE_URL}/models")
    if response.status_code != 200:
        print(f"❌ Failed to get models: {response.status_code}")
        return
    
    models = response.json().get('models', [])
    print(f"✓ Found {len(models)} models")
    
    if not models:
        print("❌ No models found. Please add models first.")
        return
    
    model = models[0]
    print(f"✓ Using model: {model['name']} (ID: {model['id']})")
    
    # Step 2: Get benchmarks
    print("\n2. Fetching benchmarks...")
    response = requests.get(f"{BASE_URL}/benchmarks")
    if response.status_code != 200:
        print(f"❌ Failed to get benchmarks: {response.status_code}")
        return
    
    benchmarks = response.json().get('benchmarks', [])
    print(f"✓ Found {len(benchmarks)} benchmarks")
    
    if not benchmarks:
        print("❌ No benchmarks found. Please add benchmarks first.")
        return
    
    benchmark = benchmarks[0]
    print(f"✓ Using benchmark: {benchmark['name']} (ID: {benchmark['id']})")
    
    # Step 3: Start evaluation
    print("\n3. Starting evaluation...")
    evaluation_request = {
        "model_id": model['id'],
        "benchmark_ids": [benchmark['id']],
        "name": f"Test Evaluation - {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "config": {
            "batch_size": 1,
            "num_fewshot": 0,
            "limit": 10  # Small limit for testing
        }
    }
    
    response = requests.post(
        f"{BASE_URL}/evaluations",
        json=evaluation_request
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to start evaluation: {response.status_code}")
        print(f"Error: {response.text}")
        return
    
    result = response.json()
    evaluation_id = result['evaluation_id']
    print(f"✓ Evaluation started: {evaluation_id}")
    
    # Step 4: Monitor progress
    print("\n4. Monitoring progress...")
    print("-" * 60)
    
    max_wait = 300  # 5 minutes max
    start_time = time.time()
    
    while True:
        if time.time() - start_time > max_wait:
            print("\n❌ Timeout waiting for evaluation")
            break
        
        # Get evaluation status
        response = requests.get(f"{BASE_URL}/evaluations/{evaluation_id}")
        if response.status_code != 200:
            print(f"❌ Failed to get status: {response.status_code}")
            break
        
        evaluation = response.json()
        status = evaluation['status']
        
        # Get progress
        progress_response = requests.get(f"{BASE_URL}/evaluations/{evaluation_id}/progress")
        progress = 0
        message = "Starting..."
        if progress_response.status_code == 200:
            progress_data = progress_response.json()
            progress = progress_data.get('progress_percentage', 0)
            message = progress_data.get('status_message', 'Running...')
        
        print(f"Status: {status:12} | Progress: {progress:3}% | {message}", end='\r')
        
        if status in ['completed', 'failed', 'cancelled']:
            print()  # New line
            break
        
        time.sleep(2)
    
    # Step 5: Get results
    print("\n5. Retrieving results...")
    response = requests.get(f"{BASE_URL}/evaluations/{evaluation_id}/results")
    
    if response.status_code != 200:
        print(f"❌ Failed to get results: {response.status_code}")
        return
    
    results_data = response.json()
    results = results_data.get('results', [])
    
    print(f"✓ Found {len(results)} result(s)")
    
    for result in results:
        print(f"\nBenchmark: {result['benchmark_name']}")
        print(f"Task: {result['task_name']}")
        print("Metrics:")
        for metric, value in result.get('metrics', {}).items():
            print(f"  - {metric}: {value}")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETED SUCCESSFULLY")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_evaluation_flow())
