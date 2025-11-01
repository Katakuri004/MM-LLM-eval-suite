#!/usr/bin/env python3
"""Test script to check actual metric values from backend."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from services.external_results_parser import external_results_parser

def test_metric_values():
    """Test actual metric values to see their ranges."""
    print("Testing metric values from backend...")
    
    models = external_results_parser.scan_external_models()
    if not models:
        print("No models found")
        return
    
    print(f"\nFound {len(models)} models")
    
    # Test first model with benchmarks
    for model in models[:1]:
        print(f"\nTesting model: {model['id']}")
        detail = external_results_parser.ensure_processed_external_model(model['id'])
        
        if not detail:
            print("Could not get detail")
            continue
        
        benchmarks = detail.get('benchmarks', [])
        print(f"Number of benchmarks: {len(benchmarks)}")
        
        for bench in benchmarks[:5]:  # Check first 5 benchmarks
            print(f"\nBenchmark: {bench.get('benchmark_id')}")
            metrics = bench.get('metrics', {})
            print(f"  Metrics found: {len(metrics)}")
            
            # Show actual values
            for key, value in list(metrics.items())[:10]:
                if isinstance(value, (int, float)):
                    print(f"    {key}: {value} (raw value)")
                    # Check if it looks like percentage already
                    if 0 <= value <= 1:
                        print(f"      -> Looks like 0-1 range, * 100 = {value * 100}%")
                    elif 0 <= value <= 100:
                        print(f"      -> Looks like percentage already (0-100)")
                    elif value > 1 and value <= 10:
                        print(f"      -> Might be >1 ratio (e.g., WER can be >1)")
                    else:
                        print(f"      -> Unusual value")

if __name__ == '__main__':
    test_metric_values()

