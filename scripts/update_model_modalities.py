#!/usr/bin/env python3
"""
Update all models in database with correct modality_support arrays
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from services.supabase_service import supabase_service

def infer_modalities(model):
    """Infer modalities from model name and family"""
    name = model['name'].lower()
    family = model['family'].lower()
    
    modalities = ['text']  # All models support text
    
    # Vision/Image models
    if any(k in name or k in family for k in 
           ['vision', 'vl', 'llava', 'qwen2', 'qwen2.5', 'phi', 'cogvlm', 'intern', 'blip', 'flamingo']):
        modalities.append('image')
    
    # Audio models
    if any(k in name or k in family for k in ['whisper', 'audio', 'speech']):
        modalities.append('audio')
    
    # Video models
    if any(k in name or k in family for k in ['video', 'vid', 'vora']):
        modalities.append('video')
    
    # Omni models support everything
    if 'omni' in name or 'omni' in family:
        modalities = ['text', 'image', 'audio', 'video']
    
    return modalities

def update_all_models():
    """Update all models with modality_support"""
    try:
        models = supabase_service.get_models(skip=0, limit=1000)
        
        print(f"Found {len(models['items'])} models to update")
        
        for model in models['items']:
            modalities = infer_modalities(model)
            print(f"Updating {model['name']}: {modalities}")
            
            # Update model with modality_support
            supabase_service.update_model(model['id'], {
                'modality_support': modalities
            })
        
        print(f"Successfully updated {len(models['items'])} models")
        
    except Exception as e:
        print(f"Error updating models: {e}")
        return False
    
    return True

if __name__ == '__main__':
    print("Updating model modalities...")
    success = update_all_models()
    if success:
        print("Model modality update completed successfully!")
    else:
        print("Model modality update failed!")
        sys.exit(1)
