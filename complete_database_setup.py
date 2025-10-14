#!/usr/bin/env python3
"""
Complete database setup script for LMMS-Eval Dashboard.
This script will:
1. Verify Supabase credentials are loaded
2. Create database schema using Supabase SQL Editor API
3. Test the database connection
"""

import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

def main():
    print("=" * 70)
    print("  LMMS-Eval Dashboard - Complete Database Setup")
    print("=" * 70)
    
    # Step 1: Load configuration
    print("\n[1/4] Loading configuration...")
    try:
        from config import get_settings
        settings = get_settings()
        
        print(f"  SUPABASE_URL: {settings.supabase_url[:50] + '...' if settings.supabase_url else 'NOT SET'}")
        print(f"  SUPABASE_KEY: {settings.supabase_key[:20] + '...' if settings.supabase_key else 'NOT SET'}")
        
        if not settings.supabase_url or not settings.supabase_key:
            print("\n  ERROR: Supabase credentials not found!")
            print("\n  Please ensure backend/.env file exists with:")
            print("    SUPABASE_URL=https://your-project.supabase.co")
            print("    SUPABASE_KEY=your_anon_key")
            print("    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key")
            return False
            
        if "your_supabase" in settings.supabase_url or "your_" in settings.supabase_key:
            print("\n  ERROR: Please replace placeholder values in backend/.env")
            print("  with your actual Supabase credentials!")
            return False
            
        print("  ✓ Configuration loaded successfully")
        
    except Exception as e:
        print(f"  ERROR: Failed to load configuration: {e}")
        return False
    
    # Step 2: Test Supabase connection
    print("\n[2/4] Testing Supabase connection...")
    try:
        from supabase import create_client
        
        client = create_client(settings.supabase_url, settings.supabase_key)
        
        # Try a simple query
        response = client.from_("models").select("id").limit(1).execute()
        print("  ✓ Successfully connected to Supabase")
        
    except Exception as e:
        print(f"  Note: Connection test failed (this is expected if schema not created yet)")
        print(f"  Error: {str(e)[:100]}...")
    
    # Step 3: Create database schema
    print("\n[3/4] Creating database schema...")
    schema_file = Path("database/schema.sql")
    
    if not schema_file.exists():
        print(f"  ERROR: Schema file not found: {schema_file}")
        return False
    
    with open(schema_file, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    print(f"  Loaded schema file: {len(schema_sql)} characters")
    print("\n  INSTRUCTIONS:")
    print("  1. Go to your Supabase project dashboard")
    print("  2. Navigate to: SQL Editor")
    print("  3. Click 'New Query'")
    print("  4. Copy and paste the contents of: database/schema.sql")
    print("  5. Click 'Run' to execute the schema")
    print("\n  OR")
    print("  Run the SQL directly from Supabase CLI:")
    print(f"    supabase db push")
    
    input("\n  Press Enter after you've created the schema in Supabase...")
    
    # Step 4: Verify database setup
    print("\n[4/4] Verifying database setup...")
    try:
        # Check if tables exist
        response = client.from_("models").select("*").limit(1).execute()
        print("  ✓ models table exists")
        
        response = client.from_("benchmarks").select("*").limit(1).execute()
        print("  ✓ benchmarks table exists")
        
        response = client.from_("runs").select("*").limit(1).execute()
        print("  ✓ runs table exists")
        
        print("\n" + "=" * 70)
        print("  ✓ Database setup completed successfully!")
        print("=" * 70)
        print("\nNext steps:")
        print("  1. Restart the backend server:")
        print("     cd backend && python main_complete.py")
        print("  2. Check health endpoint:")
        print("     curl http://localhost:8000/health")
        print("  3. The backend should now show:")
        print('     "database": "connected"')
        print('     "mode": "full"')
        
        return True
        
    except Exception as e:
        print(f"\n  ERROR: Database verification failed: {e}")
        print("\n  Please ensure you've created the schema in Supabase")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
