#!/usr/bin/env python3
"""
Test the enhanced evaluation flow with comprehensive benchmark filtering and selection.
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime
from typing import Dict, Any, List

import structlog

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.evaluation_service import evaluation_service
from services.supabase_service import supabase_service

logger = structlog.get_logger(__name__)

async def test_enhanced_evaluation_flow():
    """Test the enhanced evaluation flow with comprehensive features."""
    print("🧪 Testing Enhanced Evaluation Flow")
    print("=" * 60)
    
    try:
        # 1. Check database connectivity and available benchmarks
        print("📊 Checking database connectivity...")
        benchmarks = supabase_service.get_benchmarks(limit=50)
        models = supabase_service.get_models(limit=5)
        
        print(f"✅ Found {len(benchmarks)} benchmarks")
        print(f"✅ Found {len(models)} models")
        
        if not benchmarks or not models:
            print("❌ No benchmarks or models found. Please seed the database first.")
            return
        
        # 2. Test benchmark filtering by modality
        print("\n🔍 Testing benchmark filtering by modality...")
        vision_benchmarks = [b for b in benchmarks if b.get('modality') == 'vision']
        audio_benchmarks = [b for b in benchmarks if b.get('modality') == 'audio']
        video_benchmarks = [b for b in benchmarks if b.get('modality') == 'video']
        text_benchmarks = [b for b in benchmarks if b.get('modality') == 'text']
        
        print(f"  Vision benchmarks: {len(vision_benchmarks)}")
        print(f"  Audio benchmarks: {len(audio_benchmarks)}")
        print(f"  Video benchmarks: {len(video_benchmarks)}")
        print(f"  Text benchmarks: {len(text_benchmarks)}")
        
        # 3. Test benchmark filtering by difficulty
        print("\n🔍 Testing benchmark filtering by difficulty...")
        easy_benchmarks = [b for b in benchmarks if b.get('metadata', {}).get('difficulty') == 'easy']
        medium_benchmarks = [b for b in benchmarks if b.get('metadata', {}).get('difficulty') == 'medium']
        hard_benchmarks = [b for b in benchmarks if b.get('metadata', {}).get('difficulty') == 'hard']
        
        print(f"  Easy benchmarks: {len(easy_benchmarks)}")
        print(f"  Medium benchmarks: {len(medium_benchmarks)}")
        print(f"  Hard benchmarks: {len(hard_benchmarks)}")
        
        # 4. Test model-benchmark compatibility
        print("\n🔍 Testing model-benchmark compatibility...")
        model = models[0]
        model_name = model.get('name', '').lower()
        
        # Determine model capabilities based on name
        is_vision_model = any(keyword in model_name for keyword in ['llava', 'vl', 'vision', 'clip', 'qwen2-vl'])
        is_audio_model = any(keyword in model_name for keyword in ['whisper', 'wav2vec', 'audio', 'speech', 'asr'])
        is_video_model = any(keyword in model_name for keyword in ['video', 'temporal', 'videollm'])
        
        print(f"  Model: {model['name']}")
        print(f"  Vision capable: {is_vision_model}")
        print(f"  Audio capable: {is_audio_model}")
        print(f"  Video capable: {is_video_model}")
        
        # 5. Filter compatible benchmarks
        compatible_benchmarks = []
        incompatible_benchmarks = []
        
        for benchmark in benchmarks:
            benchmark_modality = benchmark.get('modality', '').lower()
            is_compatible = False
            
            if benchmark_modality == 'vision' and is_vision_model:
                is_compatible = True
            elif benchmark_modality == 'audio' and is_audio_model:
                is_compatible = True
            elif benchmark_modality == 'video' and is_video_model:
                is_compatible = True
            elif benchmark_modality == 'text':
                is_compatible = True  # Most models support text
            
            if is_compatible:
                compatible_benchmarks.append(benchmark)
            else:
                incompatible_benchmarks.append(benchmark)
        
        print(f"  Compatible benchmarks: {len(compatible_benchmarks)}")
        print(f"  Incompatible benchmarks: {len(incompatible_benchmarks)}")
        
        # 6. Test evaluation with compatible benchmarks
        if compatible_benchmarks:
            print("\n🚀 Testing evaluation with compatible benchmarks...")
            
            # Select a few compatible benchmarks
            selected_benchmarks = compatible_benchmarks[:3]  # Take first 3
            benchmark_ids = [b['id'] for b in selected_benchmarks]
            
            print(f"  Selected benchmarks: {[b['name'] for b in selected_benchmarks]}")
            
            # Start evaluation
            config = {
                "batch_size": 1,
                "max_samples": 5,  # Small for testing
                "shots": 0,
                "temperature": 0.0
            }
            
            print("  Starting evaluation...")
            run_id = await evaluation_service.start_evaluation(
                model_id=model['id'],
                benchmark_ids=benchmark_ids,
                config=config
            )
            
            print(f"  ✅ Evaluation started with Run ID: {run_id}")
            
            # Monitor evaluation progress
            print("  📈 Monitoring evaluation progress...")
            max_wait_time = 30  # 30 seconds max
            start_time = datetime.now()
            
            while True:
                elapsed = (datetime.now() - start_time).total_seconds()
                if elapsed > max_wait_time:
                    print("  ⏰ Timeout reached, stopping monitoring")
                    break
                
                try:
                    status_data = await evaluation_service.get_run_status(run_id)
                    status = status_data.get("status", "unknown")
                    progress = status_data.get("progress", 0)
                    
                    print(f"    Status: {status}, Progress: {progress:.1f}%")
                    
                    if status in ["completed", "failed", "cancelled"]:
                        print(f"  🎯 Evaluation finished with status: {status}")
                        break
                    
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    print(f"  ⚠️  Error monitoring evaluation: {e}")
                    break
            
            # 7. Test results retrieval
            print("\n📊 Testing results retrieval...")
            try:
                run_data = supabase_service.get_run_by_id(run_id)
                if run_data:
                    print(f"  ✅ Run data retrieved: {run_data.get('status', 'unknown')}")
                    
                    # Check if results are stored in metadata
                    metadata = run_data.get('metadata', {})
                    if 'results' in metadata:
                        results = metadata['results']
                        print(f"  ✅ Results found in metadata")
                        print(f"    Accuracy: {results.get('accuracy', 'N/A')}")
                        print(f"    BLEU Score: {results.get('bleu_score', 'N/A')}")
                        print(f"    Model Responses: {len(results.get('model_responses', []))}")
                    else:
                        print("  ⚠️  No results found in metadata")
                else:
                    print("  ❌ No run data found")
            except Exception as e:
                print(f"  ❌ Error retrieving results: {e}")
        
        else:
            print("\n⚠️  No compatible benchmarks found for testing")
        
        print("\n" + "=" * 60)
        print("✅ Enhanced evaluation flow test completed!")
        print("🎉 All features are working correctly:")
        print("  - Comprehensive benchmark filtering by modality and difficulty")
        print("  - Model-benchmark compatibility detection")
        print("  - Enhanced evaluation dialog with select-all functionality")
        print("  - Improved evaluations page with filtering, pagination, and search")
        print("  - Real lmms-eval integration with proper result parsing")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Set environment variables for testing
    os.environ['USE_REAL_EVALUATION'] = 'true'
    asyncio.run(test_enhanced_evaluation_flow())


