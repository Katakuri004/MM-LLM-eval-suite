#!/usr/bin/env python3
"""
Test the compatibility API endpoint
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from services.supabase_service import supabase_service

def test_compatibility():
    """Test the compatibility logic"""
    if not supabase_service.is_available():
        print("Supabase not available")
        return False
    
    try:
        # Get a model to test with
        models = supabase_service.get_models(skip=0, limit=1)
        if not models['items']:
            print("No models found")
            return False
        
        model = models['items'][0]
        print(f"Testing with model: {model['name']}")
        
        # Test the inference logic
        from api.complete_api import _infer_model_modalities
        modalities = _infer_model_modalities(model)
        print(f"Inferred modalities: {modalities}")
        
        # Test compatibility check
        from api.complete_api import _check_benchmark_compatibility
        from services.production_evaluation_orchestrator import ProductionEvaluationOrchestrator
        
        orchestrator = ProductionEvaluationOrchestrator()
        model_name = orchestrator._map_model_name(model)
        print(f"Mapped model name: {model_name}")
        
        # Get a benchmark to test with
        benchmarks = supabase_service.get_benchmarks(skip=0, limit=1)
        if benchmarks:
            benchmark = benchmarks[0]
            print(f"Testing with benchmark: {benchmark['name']}")
            
            is_compatible, reason = _check_benchmark_compatibility(
                model, model_name, modalities, benchmark
            )
            print(f"Compatible: {is_compatible}, Reason: {reason}")
        
        return True
        
    except Exception as e:
        print(f"Error testing compatibility: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    test_compatibility()
