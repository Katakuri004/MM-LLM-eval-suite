#!/usr/bin/env python3
"""
Test script to verify lmms-eval integration with the LMMS-Eval Dashboard.

This script tests the local lmms-eval installation and integration.
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def test_lmms_eval_path():
    """Test if lmms-eval is found at the expected path."""
    print("[INFO] Testing lmms-eval path detection...")
    
    # Check if /lmms-eval exists
    lmms_eval_path = "/lmms-eval"
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
    print("\n🔍 Testing lmms-eval CLI...")
    
    try:
        # Test help command
        result = subprocess.run(
            ["python", "-m", "lmms_eval", "--help"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✅ lmms-eval CLI is working")
            return True
        else:
            print(f"❌ lmms-eval CLI failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ lmms-eval CLI timed out")
        return False
    except Exception as e:
        print(f"❌ Error running lmms-eval CLI: {e}")
        return False

def test_available_models():
    """Test getting available models."""
    print("\n🔍 Testing available models...")
    
    try:
        result = subprocess.run(
            ["python", "-m", "lmms_eval", "--models"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            models = [line.strip() for line in result.stdout.split('\n') if line.strip()]
            print(f"✅ Found {len(models)} available models")
            print("📋 Available models:")
            for model in models[:10]:  # Show first 10 models
                print(f"   - {model}")
            if len(models) > 10:
                print(f"   ... and {len(models) - 10} more")
            return True
        else:
            print(f"❌ Failed to get models: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error getting models: {e}")
        return False

def test_available_benchmarks():
    """Test getting available benchmarks."""
    print("\n🔍 Testing available benchmarks...")
    
    try:
        result = subprocess.run(
            ["python", "-m", "lmms_eval", "--benchmarks"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            benchmarks = [line.strip() for line in result.stdout.split('\n') if line.strip()]
            print(f"✅ Found {len(benchmarks)} available benchmarks")
            print("📋 Available benchmarks:")
            for benchmark in benchmarks[:10]:  # Show first 10 benchmarks
                print(f"   - {benchmark}")
            if len(benchmarks) > 10:
                print(f"   ... and {len(benchmarks) - 10} more")
            return True
        else:
            print(f"❌ Failed to get benchmarks: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error getting benchmarks: {e}")
        return False

def test_runner_integration():
    """Test the LMMSEvalRunner integration."""
    print("\n🔍 Testing LMMSEvalRunner integration...")
    
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
        
        print("✅ LMMSEvalRunner initialized successfully")
        print(f"✅ lmms-eval path: {runner.lmms_eval_path}")
        
        # Test command preparation
        command = runner.prepare_command()
        print(f"✅ Command prepared: {' '.join(command[:5])}...")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error testing runner: {e}")
        return False

def test_environment_variables():
    """Test environment variable configuration."""
    print("\n🔍 Testing environment variables...")
    
    # Check if .env file exists
    env_file = os.path.join(os.getcwd(), "backend", ".env")
    if os.path.exists(env_file):
        print("✅ .env file found")
        
        # Read and check LMMS_EVAL_PATH
        with open(env_file, 'r') as f:
            content = f.read()
            if "LMMS_EVAL_PATH=/lmms-eval" in content:
                print("✅ LMMS_EVAL_PATH configured correctly")
                return True
            else:
                print("❌ LMMS_EVAL_PATH not configured correctly")
                return False
    else:
        print("❌ .env file not found")
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
            print(f"❌ {test_name} test failed with exception: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! LMMS-Eval integration is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the configuration.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
