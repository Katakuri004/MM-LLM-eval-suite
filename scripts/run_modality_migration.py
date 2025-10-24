#!/usr/bin/env python3
"""
Run the modality_support column migration
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from services.supabase_service import supabase_service

def run_migration():
    """Run the modality_support column migration"""
    if not supabase_service.is_available():
        print("Supabase not available, cannot run migration")
        return False
    
    try:
        # Read the migration SQL
        migration_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'migrations', 'add_modality_support_column.sql')
        with open(migration_path, 'r') as f:
            migration_sql = f.read()
        
        print("Running modality_support column migration...")
        
        # Execute the migration SQL
        result = supabase_service.client.rpc('exec_sql', {'sql': migration_sql}).execute()
        
        print("Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"Migration failed: {e}")
        return False

if __name__ == '__main__':
    success = run_migration()
    if success:
        print("Modality support migration completed!")
    else:
        print("Modality support migration failed!")
        sys.exit(1)
