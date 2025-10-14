#!/usr/bin/env python3
"""
Test backend setup and functionality after database schema creation.
"""

import os
import sys
import requests
import json
from pathlib import Path

def test_backend_health():
    """Test the backend health endpoint."""
    print("Testing backend health endpoint...")
    
    try:
        response = requests.get("http://localhost:8000/health", timeout=10)
        
        if response.status_code == 200:
            health_data = response.json()
            print("SUCCESS: Backend is running")
            print(f"  Status: {health_data.get('status')}")
            print(f"  Database: {health_data.get('database')}")
            print(f"  Mode: {health_data.get('mode')}")
            
            features = health_data.get('features', {})
            print("  Features:")
            for feature, enabled in features.items():
                status = "ENABLED" if enabled else "DISABLED"
                print(f"    {feature}: {status}")
            
            return health_data.get('database') == 'connected' and health_data.get('mode') == 'full'
        else:
            print(f"ERROR: Backend returned status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to backend. Is it running?")
        print("  Start the backend with: cd backend && python main_complete.py")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def test_api_endpoints():
    """Test key API endpoints."""
    print("\nTesting API endpoints...")
    
    endpoints = [
        ("/api/v1/models", "Models endpoint"),
        ("/api/v1/benchmarks", "Benchmarks endpoint"),
        ("/api/v1/stats/overview", "Stats overview endpoint")
    ]
    
    success_count = 0
    for endpoint, description in endpoints:
        try:
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"  SUCCESS: {description}")
                
                # Show some data if available
                if isinstance(data, list) and len(data) > 0:
                    print(f"    Found {len(data)} items")
                elif isinstance(data, dict) and 'total' in data:
                    print(f"    Total: {data['total']}")
            else:
                print(f"  ERROR: {description} returned status {response.status_code}")
                
        except Exception as e:
            print(f"  ERROR: {description} failed: {e}")
        else:
            success_count += 1
    
    return success_count == len(endpoints)

def test_supabase_connection():
    """Test Supabase connection directly."""
    print("\nTesting Supabase connection...")
    
    try:
        # Import backend modules
        sys.path.insert(0, str(Path("backend")))
        from services.supabase_service import supabase_service
        
        if supabase_service.is_available():
            print("  SUCCESS: Supabase service is available")
            
            if supabase_service.health_check():
                print("  SUCCESS: Supabase health check passed")
                return True
            else:
                print("  ERROR: Supabase health check failed")
                return False
        else:
            print("  ERROR: Supabase service not available")
            return False
            
    except Exception as e:
        print(f"  ERROR: Supabase connection test failed: {e}")
        return False

def main():
    """Main test function."""
    print("=" * 70)
    print("  LMMS-Eval Dashboard - Backend Setup Test")
    print("=" * 70)
    
    # Test 1: Backend health
    print("\n[1/3] Testing backend health...")
    health_ok = test_backend_health()
    
    # Test 2: Supabase connection
    print("\n[2/3] Testing Supabase connection...")
    supabase_ok = test_supabase_connection()
    
    # Test 3: API endpoints
    print("\n[3/3] Testing API endpoints...")
    api_ok = test_api_endpoints()
    
    # Summary
    print("\n" + "=" * 70)
    print("  TEST RESULTS SUMMARY")
    print("=" * 70)
    
    print(f"Backend Health: {'PASS' if health_ok else 'FAIL'}")
    print(f"Supabase Connection: {'PASS' if supabase_ok else 'FAIL'}")
    print(f"API Endpoints: {'PASS' if api_ok else 'FAIL'}")
    
    if health_ok and supabase_ok and api_ok:
        print("\nSUCCESS: Backend is fully functional!")
        print("\nYour LMMS-Eval Dashboard backend is ready to use.")
        print("\nNext steps:")
        print("1. Start the frontend: cd frontend && npm run dev")
        print("2. Access the dashboard at: http://localhost:5173")
        print("3. Create and run evaluations through the web interface")
        return True
    else:
        print("\nWARNING: Some tests failed.")
        print("\nTroubleshooting:")
        if not health_ok:
            print("- Backend may not be running. Start with: cd backend && python main_complete.py")
        if not supabase_ok:
            print("- Database schema may not be created. Run the manual setup script again.")
        if not api_ok:
            print("- API endpoints may not be working. Check backend logs for errors.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
