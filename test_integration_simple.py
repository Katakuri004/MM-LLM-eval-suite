#!/usr/bin/env python3
"""
Simple test script to verify lmms-eval integration with the LMMS-Eval Dashboard.
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def test_lmms_eval_path():
    """Test if lmms-eval is found at the expected path."""
    print("[INFO] Testing lmms-eval path detection...")
    
    # Check if lmms-eval exists in current directory
    lmms_eval_path = os.path.join(os.getcwd(), "lmms-eval")
    if os.path.exists(lmms_eval_path):
        print(f"[SUCCESS] Found lmms-eval at: {lmms_eval_path}")
        
        # Check if lmms_eval module exists
        lmms_eval_module = os.path.join(lmms_eval_path, "lmms_eval")
        if os.path.exists(lmms_eval_module):
            print(f"[SUCCESS] Found lmms_eval module at: {lmms_eval_module}")
            return True
        else:
            print(f"[ERROR] lmms_eval module not found at: {lmms_eval_module}")
            return False
    else:
        print(f"[ERROR] lmms-eval directory not found at: {lmms_eval_path}")
        return False

def test_lmms_eval_cli():
    """Test lmms-eval CLI functionality."""
    print("\n[INFO] Testing lmms-eval CLI...")
    
    try:
        # Test help command
        result = subprocess.run(
            ["python", "-m", "lmms_eval", "--help"],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=os.path.join(os.getcwd(), "lmms-eval")
        )
        
        if result.returncode == 0:
            print("[SUCCESS] lmms-eval CLI is working")
            return True
        else:
            print(f"[ERROR] lmms-eval CLI failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("[ERROR] lmms-eval CLI timed out")
        return False
    except Exception as e:
        print(f"[ERROR] Error running lmms-eval CLI: {e}")
        return False

def test_available_models():
    """Test getting available models."""
    print("\n[INFO] Testing available models...")
    
    try:
        result = subprocess.run(
            ["python", "-m", "lmms_eval", "--help"],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=os.path.join(os.getcwd(), "lmms-eval")
        )
        
        if result.returncode == 0:
            print("[SUCCESS] lmms-eval help command working")
            print("[INFO] Available arguments:")
            help_lines = [line.strip() for line in result.stdout.split('\n') if line.strip() and '--' in line]
            for line in help_lines[:10]:  # Show first 10 arguments
                print(f"   - {line}")
            if len(help_lines) > 10:
                print(f"   ... and {len(help_lines) - 10} more")
            return True
        else:
            print(f"[ERROR] Failed to get help: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"[ERROR] Error getting models: {e}")
        return False

def test_available_benchmarks():
    """Test getting available benchmarks."""
    print("\n[INFO] Testing available benchmarks...")
    
    try:
        result = subprocess.run(
            ["python", "-m", "lmms_eval", "--tasks", "list"],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=os.path.join(os.getcwd(), "lmms-eval")
        )
        
        if result.returncode == 0:
            benchmarks = [line.strip() for line in result.stdout.split('\n') if line.strip()]
            print(f"[SUCCESS] Found {len(benchmarks)} available benchmarks")
            print("[INFO] Available benchmarks:")
            for benchmark in benchmarks[:10]:  # Show first 10 benchmarks
                print(f"   - {benchmark}")
            if len(benchmarks) > 10:
                print(f"   ... and {len(benchmarks) - 10} more")
            return True
        else:
            print(f"[ERROR] Failed to get benchmarks: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"[ERROR] Error getting benchmarks: {e}")
        return False

def test_runner_integration():
    """Test the LMMSEvalRunner integration."""
    print("\n[INFO] Testing LMMSEvalRunner integration...")
    
    try:
        # Add the backend directory to Python path
        backend_dir = os.path.join(os.getcwd(), "backend")
        sys.path.insert(0, backend_dir)
        
        from runners.lmms_eval_runner import LMMSEvalRunner
        
        # Test runner initialization
        runner = LMMSEvalRunner(
            model_id="llava",
            benchmark_ids=["mme"],
            config={
                "shots": 0,
                "seed": 42
            }
        )
        
        print("[SUCCESS] LMMSEvalRunner initialized successfully")
        print(f"[SUCCESS] lmms-eval path: {runner.lmms_eval_path}")
        
        # Test command preparation
        command = runner.prepare_command()
        print(f"[SUCCESS] Command prepared: {' '.join(command[:5])}...")
        
        return True
        
    except ImportError as e:
        print(f"[ERROR] Import error: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Error testing runner: {e}")
        return False

def test_environment_variables():
    """Test environment variable configuration."""
    print("\n[INFO] Testing environment variables...")
    
    # Check if .env file exists
    env_file = os.path.join(os.getcwd(), "backend", ".env")
    if os.path.exists(env_file):
        print("[SUCCESS] .env file found")
        
        # Read and check LMMS_EVAL_PATH
        with open(env_file, 'r') as f:
            content = f.read()
            if "LMMS_EVAL_PATH" in content:
                print("[SUCCESS] LMMS_EVAL_PATH configured")
                return True
            else:
                print("[ERROR] LMMS_EVAL_PATH not configured")
                return False
    else:
        print("[ERROR] .env file not found")
        return False

def main():
    """Run all tests."""
    print("LMMS-Eval Integration Test")
    print("=" * 50)
    
    tests = [
        ("lmms-eval path", test_lmms_eval_path),
        ("lmms-eval CLI", test_lmms_eval_cli),
        ("available models", test_available_models),
        ("available benchmarks", test_available_benchmarks),
        ("runner integration", test_runner_integration),
        ("environment variables", test_environment_variables)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"[ERROR] {test_name} test failed with exception: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("Test Results Summary")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("All tests passed! LMMS-Eval integration is working correctly.")
        return 0
    else:
        print("Some tests failed. Please check the configuration.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
