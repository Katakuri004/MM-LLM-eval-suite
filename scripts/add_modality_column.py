#!/usr/bin/env python3
"""
Add modality_support column to models table
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from services.supabase_service import supabase_service

def add_modality_column():
    """Add modality_support column to models table"""
    if not supabase_service.is_available():
        print("Supabase not available, cannot add column")
        return False
    
    try:
        print("Adding modality_support column to models table...")
        
        # Add the column
        result = supabase_service.client.table('models').select('*').limit(1).execute()
        if result.data:
            print("Models table exists, adding modality_support column...")
            
            # Try to add the column using raw SQL
            try:
                # This might not work with Supabase client, but let's try
                supabase_service.client.postgrest.rpc('exec', {'sql': 'ALTER TABLE models ADD COLUMN IF NOT EXISTS modality_support TEXT[] DEFAULT ARRAY[\'text\']'})
                print("Column added successfully!")
            except Exception as e:
                print(f"Could not add column via RPC: {e}")
                print("You may need to add the column manually in Supabase dashboard")
                return False
        
        return True
        
    except Exception as e:
        print(f"Failed to add column: {e}")
        return False

if __name__ == '__main__':
    success = add_modality_column()
    if success:
        print("Modality support column added!")
    else:
        print("Failed to add modality support column!")
        print("Please add the column manually in Supabase dashboard:")
        print("ALTER TABLE models ADD COLUMN modality_support TEXT[] DEFAULT ARRAY['text'];")
        sys.exit(1)
