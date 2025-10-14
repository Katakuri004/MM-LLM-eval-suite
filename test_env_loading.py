#!/usr/bin/env python3
"""
Test script to verify environment variable loading.
"""

import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

def test_env_loading():
    """Test if environment variables are loaded correctly."""
    
    print("🔍 Testing Environment Variable Loading")
    print("=" * 50)
    
    # Test 1: Direct environment variable access
    print("1. Direct environment variable access:")
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    print(f"   SUPABASE_URL: {supabase_url[:50] + '...' if supabase_url and len(supabase_url) > 50 else supabase_url}")
    print(f"   SUPABASE_KEY: {supabase_key[:20] + '...' if supabase_key and len(supabase_key) > 20 else supabase_key}")
    
    # Test 2: Load from .env file
    print("\n2. Loading from .env file:")
    try:
        from dotenv import load_dotenv
        
        # Try loading from backend/.env
        env_file = Path("backend/.env")
        if env_file.exists():
            print(f"   ✅ Found .env file at: {env_file}")
            load_dotenv(env_file)
            
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_KEY')
            
            print(f"   SUPABASE_URL: {supabase_url[:50] + '...' if supabase_url and len(supabase_url) > 50 else supabase_url}")
            print(f"   SUPABASE_KEY: {supabase_key[:20] + '...' if supabase_key and len(supabase_key) > 20 else supabase_key}")
        else:
            print(f"   ❌ .env file not found at: {env_file}")
            
    except ImportError:
        print("   ❌ python-dotenv not installed")
    
    # Test 3: Test backend config loading
    print("\n3. Backend config loading:")
    try:
        from config import get_settings
        
        settings = get_settings()
        print(f"   SUPABASE_URL: {settings.supabase_url[:50] + '...' if settings.supabase_url and len(settings.supabase_url) > 50 else settings.supabase_url}")
        print(f"   SUPABASE_KEY: {settings.supabase_key[:20] + '...' if settings.supabase_key and len(settings.supabase_key) > 20 else settings.supabase_key}")
        
    except Exception as e:
        print(f"   ❌ Error loading backend config: {e}")
    
    # Test 4: Test Supabase client creation
    print("\n4. Supabase client creation test:")
    try:
        from supabase import create_client
        
        if supabase_url and supabase_key:
            client = create_client(supabase_url, supabase_key)
            print("   ✅ Supabase client created successfully")
        else:
            print("   ❌ Missing Supabase credentials")
            
    except Exception as e:
        print(f"   ❌ Error creating Supabase client: {e}")

if __name__ == "__main__":
    test_env_loading()
