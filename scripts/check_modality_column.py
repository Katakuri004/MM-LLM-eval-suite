#!/usr/bin/env python3
"""
Check if modality_support column exists and show model data
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from services.supabase_service import supabase_service

def check_column():
    """Check if modality_support column exists"""
    if not supabase_service.is_available():
        print("Supabase not available")
        return False
    
    try:
        print("Checking models table structure...")
        
        # Try to get a model and see what columns are available
        models = supabase_service.get_models(skip=0, limit=1)
        if models['items']:
            model = models['items'][0]
            print(f"Sample model: {model['name']}")
            print(f"Available columns: {list(model.keys())}")
            
            if 'modality_support' in model:
                print(f"modality_support value: {model['modality_support']}")
            else:
                print("modality_support column not found in model data")
        
        return True
        
    except Exception as e:
        print(f"Error checking column: {e}")
        return False

if __name__ == '__main__':
    check_column()
