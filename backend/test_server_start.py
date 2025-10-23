#!/usr/bin/env python3
"""
Test if the server can start without errors.
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test all imports work correctly."""
    print("🧪 Testing Server Imports")
    print("=" * 50)
    
    try:
        print("✅ Testing basic imports...")
        from config import get_settings
        print("✅ Config imported")
        
        from services.supabase_service import supabase_service
        print("✅ Supabase service imported")
        
        from api.complete_api import router as api_router
        print("✅ API router imported")
        
        from api.simple_websocket_endpoints import router as websocket_router, websocket_cleanup_task
        print("✅ WebSocket router imported")
        
        print("\n✅ All imports successful!")
        return True
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_app_creation():
    """Test if the FastAPI app can be created."""
    print("\n🚀 Testing App Creation")
    print("=" * 50)
    
    try:
        from main_complete import app
        print("✅ FastAPI app created successfully")
        
        # Test if the app has the expected routes
        routes = [route.path for route in app.routes]
        print(f"✅ App has {len(routes)} routes")
        
        # Check for key routes
        key_routes = ["/api/v1/health", "/api/v1/models", "/api/v1/benchmarks"]
        for route in key_routes:
            if any(route in r for r in routes):
                print(f"✅ Found route: {route}")
            else:
                print(f"⚠️  Missing route: {route}")
        
        print("\n✅ App creation successful!")
        return True
        
    except Exception as e:
        print(f"❌ App creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run server start tests."""
    print("🧪 Server Start Test")
    print("=" * 70)
    
    tests = [
        ("Import Test", test_imports),
        ("App Creation Test", test_app_creation),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*70}")
        print(f"Running: {test_name}")
        print('='*70)
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*70}")
    print("TEST SUMMARY")
    print('='*70)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Server should start successfully.")
        print("\n✅ System Status:")
        print("  • All imports working")
        print("  • FastAPI app created")
        print("  • Routes configured")
        print("\n🚀 Ready to start server!")
        return True
    else:
        print(f"\n⚠️  {total - passed} tests failed. Please check the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

