#!/usr/bin/env python3
"""
Finalize backend setup for LMMS-Eval Dashboard.
This script will guide you through the final steps to complete the backend setup.
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def check_backend_running():
    """Check if the backend is currently running."""
    try:
        import requests
        response = requests.get("http://localhost:8000/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def start_backend():
    """Start the backend server."""
    print("Starting backend server...")
    
    backend_dir = Path("backend")
    if not backend_dir.exists():
        print("ERROR: Backend directory not found!")
        return False
    
    try:
        # Start the backend in a subprocess
        process = subprocess.Popen(
            [sys.executable, "main_complete.py"],
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        print("Backend server starting...")
        time.sleep(3)  # Give it time to start
        
        # Check if it's running
        if check_backend_running():
            print("SUCCESS: Backend server is running!")
            return True
        else:
            print("WARNING: Backend may not have started properly")
            return False
            
    except Exception as e:
        print(f"ERROR: Failed to start backend: {e}")
        return False

def test_backend_functionality():
    """Test backend functionality."""
    print("\nTesting backend functionality...")
    
    try:
        import requests
        
        # Test health endpoint
        response = requests.get("http://localhost:8000/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print(f"SUCCESS: Backend health check passed")
            print(f"  Database: {health_data.get('database')}")
            print(f"  Mode: {health_data.get('mode')}")
            
            if health_data.get('database') == 'connected' and health_data.get('mode') == 'full':
                print("SUCCESS: Backend is in full mode with database connected!")
                return True
            else:
                print("WARNING: Backend is not in full mode")
                return False
        else:
            print(f"ERROR: Health check failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"ERROR: Backend test failed: {e}")
        return False

def create_startup_scripts():
    """Create convenient startup scripts."""
    print("\nCreating startup scripts...")
    
    # Windows batch file
    windows_script = """@echo off
echo Starting LMMS-Eval Dashboard Backend...
cd backend
python main_complete.py
pause
"""
    
    with open("start_backend.bat", "w") as f:
        f.write(windows_script)
    
    # Unix shell script
    unix_script = """#!/bin/bash
echo "Starting LMMS-Eval Dashboard Backend..."
cd backend
python main_complete.py
"""
    
    with open("start_backend.sh", "w") as f:
        f.write(unix_script)
    
    # Make shell script executable
    try:
        os.chmod("start_backend.sh", 0o755)
    except:
        pass  # Windows doesn't support chmod
    
    print("SUCCESS: Created startup scripts:")
    print("  - start_backend.bat (Windows)")
    print("  - start_backend.sh (Unix/Linux/Mac)")

def main():
    """Main function."""
    print("=" * 70)
    print("  LMMS-Eval Dashboard - Backend Finalization")
    print("=" * 70)
    
    print("\nThis script will help you finalize the backend setup.")
    print("\nIMPORTANT: Make sure you have created the database schema in Supabase first!")
    print("If you haven't done this yet, please:")
    print("1. Go to your Supabase dashboard")
    print("2. Navigate to SQL Editor")
    print("3. Copy and execute the contents of database/schema.sql")
    print("4. Then run this script again")
    
    input("\nPress Enter to continue...")
    
    # Check if backend is already running
    if check_backend_running():
        print("SUCCESS: Backend is already running!")
        if test_backend_functionality():
            print("\nBackend is fully functional!")
        else:
            print("\nBackend is running but may not be fully configured.")
    else:
        print("Backend is not running. Starting it now...")
        if start_backend():
            if test_backend_functionality():
                print("\nSUCCESS: Backend is now fully functional!")
            else:
                print("\nWARNING: Backend started but may not be fully configured.")
        else:
            print("\nERROR: Failed to start backend.")
            print("\nYou can start it manually with:")
            print("  cd backend")
            print("  python main_complete.py")
    
    # Create startup scripts
    create_startup_scripts()
    
    print("\n" + "=" * 70)
    print("  BACKEND SETUP COMPLETE")
    print("=" * 70)
    
    print("\nYour LMMS-Eval Dashboard backend is ready!")
    print("\nTo start the backend in the future:")
    print("  Windows: Double-click start_backend.bat")
    print("  Unix/Linux/Mac: ./start_backend.sh")
    print("  Or manually: cd backend && python main_complete.py")
    
    print("\nTo test the backend:")
    print("  python test_backend_setup.py")
    
    print("\nTo start the frontend:")
    print("  cd frontend && npm run dev")
    
    print("\nAccess your dashboard at:")
    print("  http://localhost:5173 (frontend)")
    print("  http://localhost:8000 (backend API)")
    
    return True

if __name__ == "__main__":
    main()
