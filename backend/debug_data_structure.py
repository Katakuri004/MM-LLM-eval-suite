#!/usr/bin/env python3
"""
Debug data structure to understand the issue.
"""

import os
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.supabase_service import supabase_service

def debug_data_structure():
    """Debug the data structure returned by Supabase."""
    print("🔍 Debugging Data Structure")
    print("=" * 50)
    
    try:
        if not supabase_service.is_available():
            print("❌ Supabase not available")
            return False
        
        print("✅ Supabase connection established")
        
        # Check models
        print("\n📋 Checking models...")
        models = supabase_service.get_models(limit=5)
        print(f"Models type: {type(models)}")
        print(f"Models length: {len(models)}")
        print(f"Models content: {models}")
        
        if models and len(models) > 0:
            print(f"First model type: {type(models[0])}")
            print(f"First model content: {models[0]}")
            print(f"First model keys: {list(models[0].keys()) if isinstance(models[0], dict) else 'Not a dict'}")
        
        # Check benchmarks
        print("\n📋 Checking benchmarks...")
        benchmarks = supabase_service.get_benchmarks(limit=5)
        print(f"Benchmarks type: {type(benchmarks)}")
        print(f"Benchmarks length: {len(benchmarks)}")
        print(f"Benchmarks content: {benchmarks}")
        
        if benchmarks and len(benchmarks) > 0:
            print(f"First benchmark type: {type(benchmarks[0])}")
            print(f"First benchmark content: {benchmarks[0]}")
            print(f"First benchmark keys: {list(benchmarks[0].keys()) if isinstance(benchmarks[0], dict) else 'Not a dict'}")
        
        # Check evaluations
        print("\n📊 Checking evaluations...")
        evaluations = supabase_service.get_evaluations(limit=5)
        print(f"Evaluations type: {type(evaluations)}")
        print(f"Evaluations length: {len(evaluations)}")
        print(f"Evaluations content: {evaluations}")
        
        return True
        
    except Exception as e:
        print(f"❌ Debug failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    debug_data_structure()
