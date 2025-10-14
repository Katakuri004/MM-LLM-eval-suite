#!/usr/bin/env python3
"""
Database setup script for LMMS-Eval Dashboard.
This script creates the database schema in Supabase.
"""

import os
import sys
import requests
import json
from pathlib import Path

def setup_supabase_schema():
    """Set up the database schema in Supabase."""
    
    # Check if Supabase credentials are available
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Supabase credentials not found!")
        print("Please set the following environment variables:")
        print("  SUPABASE_URL=your_supabase_project_url")
        print("  SUPABASE_KEY=your_supabase_anon_key")
        print("\nYou can find these in your Supabase project settings.")
        return False
    
    print(f"✅ Supabase URL: {supabase_url}")
    print(f"✅ Supabase Key: {supabase_key[:10]}...")
    
    # Read the schema file
    schema_file = Path("database/schema.sql")
    if not schema_file.exists():
        print(f"❌ Schema file not found: {schema_file}")
        return False
    
    with open(schema_file, 'r') as f:
        schema_sql = f.read()
    
    print(f"✅ Schema file loaded: {len(schema_sql)} characters")
    
    # Create the tables using Supabase REST API
    try:
        # Split the schema into individual statements
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        
        print(f"📝 Executing {len(statements)} SQL statements...")
        
        for i, statement in enumerate(statements):
            if not statement:
                continue
                
            # Skip comments and empty statements
            if statement.startswith('--') or statement.startswith('/*'):
                continue
            
            print(f"  [{i+1}/{len(statements)}] Executing statement...")
            
            # Execute the statement using Supabase REST API
            response = requests.post(
                f"{supabase_url}/rest/v1/rpc/exec_sql",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json"
                },
                json={"sql": statement}
            )
            
            if response.status_code not in [200, 201]:
                print(f"    ⚠️  Warning: Statement may have failed (Status: {response.status_code})")
                if response.text:
                    print(f"    Response: {response.text}")
        
        print("✅ Database schema setup completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error setting up database schema: {e}")
        return False

def verify_database_connection():
    """Verify that the database connection is working."""
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        return False
    
    try:
        # Test connection by querying a table
        response = requests.get(
            f"{supabase_url}/rest/v1/models",
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}"
            }
        )
        
        if response.status_code == 200:
            print("✅ Database connection verified!")
            return True
        else:
            print(f"❌ Database connection failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def main():
    """Main setup function."""
    print("🚀 LMMS-Eval Dashboard Database Setup")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path("database/schema.sql").exists():
        print("❌ Please run this script from the project root directory")
        sys.exit(1)
    
    # Set up the database schema
    if setup_supabase_schema():
        print("\n🔍 Verifying database connection...")
        if verify_database_connection():
            print("\n🎉 Database setup completed successfully!")
            print("\nNext steps:")
            print("1. Restart the backend server")
            print("2. The backend should now connect to Supabase in full mode")
            print("3. You can start using the complete API endpoints")
        else:
            print("\n⚠️  Database setup completed but connection verification failed")
            print("Please check your Supabase credentials and try again")
    else:
        print("\n❌ Database setup failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
