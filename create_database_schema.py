#!/usr/bin/env python3
"""
Script to create the database schema in Supabase.
"""

import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

def create_schema():
    """Create the database schema in Supabase."""
    
    print("🚀 Creating Database Schema in Supabase")
    print("=" * 50)
    
    try:
        from config import get_settings
        from supabase import create_client
        
        settings = get_settings()
        
        if not settings.supabase_url or not settings.supabase_key:
            print("❌ Supabase credentials not found!")
            return False
        
        print(f"✅ Connecting to Supabase: {settings.supabase_url[:50]}...")
        
        # Create Supabase client
        client = create_client(settings.supabase_url, settings.supabase_key)
        
        # Read the schema file
        schema_file = Path("database/schema.sql")
        if not schema_file.exists():
            print(f"❌ Schema file not found: {schema_file}")
            return False
        
        with open(schema_file, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        print(f"✅ Loaded schema file: {len(schema_sql)} characters")
        
        # Split into individual statements
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip() and not stmt.strip().startswith('--')]
        
        print(f"📝 Executing {len(statements)} SQL statements...")
        
        success_count = 0
        for i, statement in enumerate(statements):
            if not statement or statement.startswith('--'):
                continue
            
            try:
                print(f"  [{i+1}/{len(statements)}] Executing statement...")
                
                # Execute using Supabase REST API
                response = client.rpc('exec_sql', {'sql': statement}).execute()
                
                if response.data:
                    success_count += 1
                    print(f"    ✅ Success")
                else:
                    print(f"    ⚠️  No data returned (may be expected)")
                    
            except Exception as e:
                error_msg = str(e)
                if "already exists" in error_msg.lower():
                    print(f"    ⚠️  Already exists (skipping)")
                    success_count += 1
                else:
                    print(f"    ❌ Error: {error_msg[:100]}...")
        
        print(f"\n✅ Schema creation completed: {success_count}/{len(statements)} statements successful")
        
        # Test if tables exist
        print("\n🔍 Verifying tables...")
        
        tables_to_check = ['models', 'benchmarks', 'runs', 'run_benchmarks', 'run_metrics']
        
        for table in tables_to_check:
            try:
                response = client.from_(table).select("*").limit(1).execute()
                print(f"  ✅ {table} table exists")
            except Exception as e:
                print(f"  ❌ {table} table error: {str(e)[:50]}...")
        
        print("\n🎉 Database schema setup completed!")
        print("\nNext steps:")
        print("1. Restart the backend server")
        print("2. Check health endpoint - should show 'database': 'connected'")
        print("3. Test API endpoints")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = create_schema()
    sys.exit(0 if success else 1)

