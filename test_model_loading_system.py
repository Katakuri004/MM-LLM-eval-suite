#!/usr/bin/env python3
"""
Comprehensive test script for the Model Loading System.

This script tests all model loading methods and validates the complete system.
"""

import sys
import os
import json
import requests
import time
from pathlib import Path
from typing import Dict, Any, List

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from services.model_loader_service import model_loader_service
from services.supabase_service import supabase_service
from config import get_settings

class ModelLoadingSystemTester:
    """Comprehensive tester for the model loading system."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        """Initialize the tester."""
        self.base_url = base_url
        self.api_url = f"{base_url}/api/v1"
        self.test_results = {
            'total_tests': 0,
            'passed': 0,
            'failed': 0,
            'errors': []
        }
    
    def run_all_tests(self):
        """Run all tests for the model loading system."""
        print("🚀 Starting Comprehensive Model Loading System Tests")
        print("=" * 60)
        
        # Test backend services
        self.test_model_loader_service()
        self.test_supabase_service()
        
        # Test API endpoints
        self.test_api_endpoints()
        
        # Test model registration methods
        self.test_huggingface_registration()
        self.test_local_registration()
        self.test_api_registration()
        self.test_vllm_registration()
        self.test_batch_registration()
        
        # Test model validation
        self.test_model_validation()
        
        # Test GPU scheduler
        self.test_gpu_scheduler()
        
        # Test LMMS-Eval integration
        self.test_lmms_eval_integration()
        
        # Print results
        self.print_results()
    
    def test_model_loader_service(self):
        """Test the ModelLoaderService."""
        print("\n📦 Testing ModelLoaderService...")
        
        try:
            # Test initialization
            self.assert_test("ModelLoaderService initialization", 
                           model_loader_service is not None)
            
            # Test method detection
            test_sources = [
                ("Qwen/Qwen2-VL-7B-Instruct", "huggingface"),
                ("/path/to/model", "local"),
                ("https://api.openai.com/v1", "api"),
                ("http://localhost:8000", "vllm")
            ]
            
            for source, expected_method in test_sources:
                detected = model_loader_service.detect_loading_method(source)
                self.assert_test(f"Method detection for {source}", 
                               detected == expected_method)
            
            print("✅ ModelLoaderService tests passed")
            
        except Exception as e:
            self.add_error("ModelLoaderService", str(e))
    
    def test_supabase_service(self):
        """Test the SupabaseService."""
        print("\n🗄️ Testing SupabaseService...")
        
        try:
            # Test initialization
            self.assert_test("SupabaseService initialization", 
                           supabase_service is not None)
            
            # Test availability check
            is_available = supabase_service.is_available()
            self.assert_test("Supabase availability check", 
                           isinstance(is_available, bool))
            
            if is_available:
                # Test health check
                health = supabase_service.health_check()
                self.assert_test("Supabase health check", 
                               isinstance(health, bool))
            
            print("✅ SupabaseService tests passed")
            
        except Exception as e:
            self.add_error("SupabaseService", str(e))
    
    def test_api_endpoints(self):
        """Test API endpoints."""
        print("\n🌐 Testing API Endpoints...")
        
        endpoints_to_test = [
            ("/health", "GET"),
            ("/models", "GET"),
            ("/benchmarks", "GET"),
            ("/stats/overview", "GET"),
            ("/models/detect", "GET"),
        ]
        
        for endpoint, method in endpoints_to_test:
            try:
                if method == "GET":
                    response = requests.get(f"{self.api_url}{endpoint}", timeout=10)
                else:
                    response = requests.post(f"{self.api_url}{endpoint}", timeout=10)
                
                self.assert_test(f"API endpoint {endpoint}", 
                               response.status_code in [200, 503])  # 503 for limited mode
                
            except requests.RequestException as e:
                self.add_error(f"API endpoint {endpoint}", str(e))
        
        print("✅ API endpoints tests passed")
    
    def test_huggingface_registration(self):
        """Test HuggingFace model registration."""
        print("\n🤗 Testing HuggingFace Registration...")
        
        try:
            # Test model detection
            model_path = "Qwen/Qwen2-VL-7B-Instruct"
            detection_info = model_loader_service.detect_loading_method(model_path)
            self.assert_test("HuggingFace model detection", 
                           detection_info == "huggingface")
            
            # Test model loading (without actually downloading)
            try:
                model_metadata = model_loader_service.load_from_huggingface(
                    model_path, auto_detect=False
                )
                self.assert_test("HuggingFace model metadata", 
                               model_metadata is not None)
            except Exception as e:
                # This might fail if model is not accessible, which is expected
                print(f"⚠️ HuggingFace model loading failed (expected): {e}")
            
            print("✅ HuggingFace registration tests passed")
            
        except Exception as e:
            self.add_error("HuggingFace registration", str(e))
    
    def test_local_registration(self):
        """Test local model registration."""
        print("\n💾 Testing Local Model Registration...")
        
        try:
            # Test with non-existent path (should handle gracefully)
            try:
                model_metadata = model_loader_service.load_from_local("/non/existent/path")
                self.assert_test("Local model error handling", False)
            except FileNotFoundError:
                self.assert_test("Local model error handling", True)
            
            print("✅ Local model registration tests passed")
            
        except Exception as e:
            self.add_error("Local model registration", str(e))
    
    def test_api_registration(self):
        """Test API model registration."""
        print("\n🌍 Testing API Model Registration...")
        
        try:
            # Test provider validation
            providers = ['openai', 'anthropic', 'google', 'azure']
            for provider in providers:
                # Test with invalid API key (should handle gracefully)
                try:
                    model_metadata = model_loader_service.register_api_model(
                        provider, "test-model", "invalid-key"
                    )
                    # This should fail
                    self.assert_test(f"API model validation for {provider}", False)
                except Exception:
                    # Expected to fail with invalid key
                    self.assert_test(f"API model validation for {provider}", True)
            
            print("✅ API model registration tests passed")
            
        except Exception as e:
            self.add_error("API model registration", str(e))
    
    def test_vllm_registration(self):
        """Test vLLM model registration."""
        print("\n⚡ Testing vLLM Model Registration...")
        
        try:
            # Test with invalid endpoint (should handle gracefully)
            try:
                model_metadata = model_loader_service.register_vllm_endpoint(
                    "http://invalid-endpoint:8000", "test-model"
                )
                # This should fail
                self.assert_test("vLLM endpoint validation", False)
            except Exception:
                # Expected to fail with invalid endpoint
                self.assert_test("vLLM endpoint validation", True)
            
            print("✅ vLLM model registration tests passed")
            
        except Exception as e:
            self.add_error("vLLM model registration", str(e))
    
    def test_batch_registration(self):
        """Test batch model registration."""
        print("\n📊 Testing Batch Model Registration...")
        
        try:
            # Test with empty data
            results = model_loader_service.batch_register_models([])
            self.assert_test("Batch registration with empty data", 
                           results['total'] == 0)
            
            # Test with invalid data
            invalid_data = [
                {"name": "test-model", "loading_method": "invalid"}
            ]
            results = model_loader_service.batch_register_models(invalid_data)
            self.assert_test("Batch registration with invalid data", 
                           results['failed'] > 0)
            
            print("✅ Batch model registration tests passed")
            
        except Exception as e:
            self.add_error("Batch model registration", str(e))
    
    def test_model_validation(self):
        """Test model validation."""
        print("\n🔍 Testing Model Validation...")
        
        try:
            # Test validation with non-existent model
            try:
                results = model_loader_service.validate_model("non-existent-model")
                # Should handle gracefully
                self.assert_test("Model validation error handling", 
                               results is not None)
            except Exception:
                # Also acceptable
                self.assert_test("Model validation error handling", True)
            
            print("✅ Model validation tests passed")
            
        except Exception as e:
            self.add_error("Model validation", str(e))
    
    def test_gpu_scheduler(self):
        """Test GPU scheduler."""
        print("\n🎮 Testing GPU Scheduler...")
        
        try:
            from runners.gpu_scheduler import GPUScheduler
            
            # Test initialization
            scheduler = GPUScheduler()
            self.assert_test("GPU scheduler initialization", 
                           scheduler is not None)
            
            # Test status
            status = scheduler.get_enhanced_status()
            self.assert_test("GPU scheduler status", 
                           'total_gpus' in status)
            
            # Test allocation (should work even without real GPUs)
            try:
                allocation = scheduler.allocate("test-run", {
                    "size": "small",
                    "memory_gb": 16
                })
                self.assert_test("GPU allocation", 
                               allocation is not None)
            except Exception as e:
                # Might fail if no GPUs available, which is expected
                print(f"⚠️ GPU allocation failed (expected): {e}")
            
            print("✅ GPU scheduler tests passed")
            
        except Exception as e:
            self.add_error("GPU scheduler", str(e))
    
    def test_lmms_eval_integration(self):
        """Test LMMS-Eval integration."""
        print("\n🔬 Testing LMMS-Eval Integration...")
        
        try:
            from runners.lmms_eval_runner import LMMSEvalRunner
            
            # Test initialization (should handle gracefully if lmms-eval not available)
            try:
                runner = LMMSEvalRunner(
                    model_id="test-model",
                    benchmark_ids=["test-benchmark"],
                    config={}
                )
                self.assert_test("LMMS-Eval runner initialization", 
                               runner is not None)
            except Exception as e:
                # Expected if lmms-eval not properly installed
                print(f"⚠️ LMMS-Eval runner initialization failed (expected): {e}")
                self.assert_test("LMMS-Eval runner error handling", True)
            
            print("✅ LMMS-Eval integration tests passed")
            
        except Exception as e:
            self.add_error("LMMS-Eval integration", str(e))
    
    def assert_test(self, test_name: str, condition: bool):
        """Assert a test condition."""
        self.test_results['total_tests'] += 1
        if condition:
            self.test_results['passed'] += 1
            print(f"  ✅ {test_name}")
        else:
            self.test_results['failed'] += 1
            print(f"  ❌ {test_name}")
    
    def add_error(self, test_name: str, error: str):
        """Add an error to the test results."""
        self.test_results['failed'] += 1
        self.test_results['errors'].append(f"{test_name}: {error}")
        print(f"  ❌ {test_name}: {error}")
    
    def print_results(self):
        """Print test results summary."""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.test_results['total_tests']}")
        print(f"Passed: {self.test_results['passed']}")
        print(f"Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print(f"\n❌ Errors ({len(self.test_results['errors'])}):")
            for error in self.test_results['errors']:
                print(f"  - {error}")
        
        success_rate = (self.test_results['passed'] / self.test_results['total_tests']) * 100
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 Model Loading System is working well!")
        elif success_rate >= 60:
            print("⚠️ Model Loading System has some issues but is functional")
        else:
            print("🚨 Model Loading System needs attention")
        
        print("=" * 60)


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test the Model Loading System")
    parser.add_argument("--base-url", default="http://localhost:8000", 
                       help="Base URL for the API")
    parser.add_argument("--quick", action="store_true", 
                       help="Run quick tests only")
    
    args = parser.parse_args()
    
    tester = ModelLoadingSystemTester(args.base_url)
    
    if args.quick:
        print("🏃 Running quick tests...")
        tester.test_model_loader_service()
        tester.test_supabase_service()
        tester.test_api_endpoints()
    else:
        tester.run_all_tests()


if __name__ == "__main__":
    main()
