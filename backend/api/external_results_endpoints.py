"""
API endpoints for external results management.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, List
from urllib.parse import unquote
import structlog

from services.external_results_parser import external_results_parser

logger = structlog.get_logger(__name__)

router = APIRouter()


def normalize_model_id(model_id: str) -> str:
    """
    Normalize model ID by removing duplicate external: prefixes and ensuring it has one.
    
    Args:
        model_id: Model ID (may be URL-encoded)
    
    Returns:
        Normalized model ID with exactly one external: prefix
    """
    # Decode URL encoding up to 3 times to handle double-encoding
    id_str = model_id
    for _ in range(3):
        try:
            decoded = unquote(id_str)
            if decoded == id_str:
                break
            id_str = decoded
        except Exception:
            break
    
    # Remove any duplicate external: prefixes
    while id_str.startswith('external:external:'):
        id_str = id_str[len('external:'):]
    
    # Ensure the ID has the external: prefix if it doesn't already
    if not id_str.startswith('external:'):
        id_str = f'external:{id_str}'
    
    return id_str


@router.get("/")
async def get_external_results():
    """Get list of all external models."""
    try:
        discovered = external_results_parser.scan_external_models()
        
        # Ensure processed artifacts exist and build summaries
        models = []
        for m in discovered:
            detail = external_results_parser.ensure_processed_external_model(m['id'])
            if not detail:
                continue
            
            benchmark_count = len(detail.get('benchmarks', []))
            total_samples = sum(b.get('total_samples', 0) for b in detail.get('benchmarks', []))
            
            # Aggregate numeric metrics across benchmarks, excluding time fields
            time_fields = [
                'start_time', 'end_time', 'starttime', 'endtime',
                'created_at', 'updated_at', 'createdat', 'updatedat',
                'timestamp', 'time', 'duration', 'elapsed',
                'date', 'datetime', 'when'
            ]
            
            sums = {}
            for b in detail.get('benchmarks', []):
                for k, v in b.get('metrics', {}).items():
                    if isinstance(v, (int, float)) and not (isinstance(v, float) and (v != v or v == float('inf'))):
                        # Exclude time-related fields
                        key_lower = k.lower().replace('_', '').replace('-', '')
                        if any(tf.lower() in key_lower for tf in time_fields):
                            continue
                        
                        # Exclude config-like fields
                        config_fields = ['fewshot', 'config', 'setting', 'param', 'multiturn']
                        if any(cf.lower() in key_lower for cf in config_fields):
                            continue
                        
                        # Exclude timestamp-like values (very large numbers)
                        if v > 1000000000:
                            continue
                        
                        if k not in sums:
                            sums[k] = {"total": 0, "count": 0}
                        sums[k]["total"] += v
                        sums[k]["count"] += 1
            
            summary_metrics = {}
            for k, v in sums.items():
                if v["count"] > 0:
                    summary_metrics[k] = v["total"] / v["count"]
            
            models.append({
                "id": m['id'],
                "name": m['name'],
                "model_name": m['model_name'],
                "created_at": detail['created_at'],
                "status": "completed",
                "modality": "multi-modal",
                "benchmark_ids": [b['benchmark_id'] for b in detail.get('benchmarks', [])],
                "benchmark_count": benchmark_count,
                "total_samples": total_samples,
                "summary_metrics": summary_metrics
            })
        
        return {"models": models, "total": len(models)}
    
    except Exception as e:
        logger.error("Failed to get external results", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get external results: {str(e)}")


@router.get("/{model_id}")
async def get_external_model(model_id: str):
    """Get external model details."""
    try:
        # Normalize the model ID
        normalized_id = normalize_model_id(model_id)
        
        # Get model detail with processed files
        detail = external_results_parser.ensure_processed_external_model(normalized_id)
        
        if detail:
            return detail
        
        # If not found, return 404
        raise HTTPException(status_code=404, detail=f"External model not found: {normalized_id}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get external model", model_id=model_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get external model: {str(e)}")


@router.get("/{model_id}/results")
async def get_external_model_results(model_id: str):
    """Get detailed results for an external model."""
    try:
        # Normalize the model ID
        normalized_id = normalize_model_id(model_id)
        
        # Get model detail
        detail = external_results_parser.ensure_processed_external_model(normalized_id)
        
        if not detail:
            raise HTTPException(status_code=404, detail=f"External model not found: {normalized_id}")
        
        return {
            "model": detail,
            "results": detail.get('benchmarks', []),
            "total_results": len(detail.get('benchmarks', []))
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get external model results", model_id=model_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get external model results: {str(e)}")


@router.get("/{model_id}/samples")
async def get_external_model_samples(
    model_id: str,
    benchmark_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get sample responses for an external model with pagination."""
    try:
        # Normalize the model ID
        normalized_id = normalize_model_id(model_id)
        
        # Get model detail
        detail = external_results_parser.ensure_processed_external_model(normalized_id)
        
        if not detail:
            raise HTTPException(status_code=404, detail=f"External model not found: {normalized_id}")
        
        # Collect samples from all benchmarks
        all_samples = []
        
        for benchmark in detail.get('benchmarks', []):
            if benchmark_id and benchmark.get('benchmark_id') != benchmark_id:
                continue
            
            # Try to load samples from processed response file
            samples = []
            for rf in benchmark.get('raw_files', []):
                if '_responses_' in rf.get('filename', ''):
                    try:
                        from pathlib import Path
                        from services.external_results_parser import read_json_file
                        resp_file = Path(rf.get('absolute_path', ''))
                        if resp_file.exists():
                            response_data = read_json_file(resp_file)
                            samples.extend(response_data.get('samples', []))
                            break
                    except Exception:
                        pass
            
            # If no processed file, use preview samples
            if not samples:
                samples = benchmark.get('samples_preview', [])
            
            # Add benchmark_id to each sample
            for sample in samples:
                sample['benchmark_id'] = benchmark.get('benchmark_id')
                all_samples.append(sample)
        
        # Apply pagination
        total = len(all_samples)
        paginated_samples = all_samples[offset:offset + limit]
        
        return {
            "model_id": normalized_id,
            "benchmark_id": benchmark_id,
            "samples": paginated_samples,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get external model samples", model_id=model_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get external model samples: {str(e)}")

