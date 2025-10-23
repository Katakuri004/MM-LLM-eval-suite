#!/usr/bin/env python3
"""
Test all server endpoints to ensure they work correctly.
"""

import requests
import json
import time

def test_endpoint(url, expected_status=200, description=""):
    """Test a single endpoint."""
    try:
        print(f"🧪 Testing {description or url}")
        response = requests.get(url, timeout=10)
        
        if response.status_code == expected_status:
            print(f"✅ {description or url} - Status: {response.status_code}")
            return True
        else:
            print(f"❌ {description or url} - Status: {response.status_code}, Expected: {expected_status}")
            if response.text:
                print(f"   Response: {response.text[:200]}...")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ {description or url} - Connection failed (server not running)")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ {description or url} - Timeout")
        return False
    except Exception as e:
        print(f"❌ {description or url} - Error: {e}")
        return False

def main():
    """Test all server endpoints."""
    print("🧪 Server Endpoint Test")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    
    endpoints = [
        (f"{base_url}/api/v1/health", 200, "Health Check"),
        (f"{base_url}/api/v1/models", 200, "Models Endpoint"),
        (f"{base_url}/api/v1/benchmarks", 200, "Benchmarks Endpoint"),
        (f"{base_url}/api/v1/evaluations", 200, "Evaluations Endpoint"),
    ]
    
    results = []
    
    for url, expected_status, description in endpoints:
        result = test_endpoint(url, expected_status, description)
        results.append((description, result))
        time.sleep(0.5)  # Small delay between requests
    
    # Summary
    print(f"\n{'='*50}")
    print("TEST SUMMARY")
    print('='*50)
    
    passed = 0
    total = len(results)
    
    for description, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{description}: {status}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} endpoints working")
    
    if passed == total:
        print("\n🎉 All endpoints working! Server is fully operational.")
        return True
    else:
        print(f"\n⚠️  {total - passed} endpoints failed. Check server logs for details.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
