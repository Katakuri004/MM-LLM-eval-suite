"""
API endpoints for external results management.
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from typing import Optional, List
from urllib.parse import unquote
import structlog

from services.external_results_parser import external_results_parser
from services.external_results_parser import get_results_root, get_processed_root  # type: ignore
from pathlib import Path
import mimetypes
from services.external_results_parser import read_json_file

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
    offset: int = 0,
    modality: Optional[str] = None,
    correctness: Optional[str] = None,
    search: Optional[str] = None
):
    """Get sample responses for an external model with pagination and filtering.
    
    correctness: 'correct' | 'incorrect'
    modality: 'text' | 'image' | 'audio' | 'video' | 'multimodal'
    """
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
                try:
                    # Attach benchmark id
                    sample['benchmark_id'] = benchmark.get('benchmark_id')
                    # Ensure a stable sample_key
                    sample_uid = sample.get('sample_uid') or sample.get('uid') or sample.get('id')
                    sample_idx = sample.get('sample_idx') if isinstance(sample.get('sample_idx'), int) else sample.get('index')
                    if sample_uid:
                        sample['sample_key'] = str(sample_uid)
                    elif sample_idx is not None:
                        sample['sample_key'] = str(sample_idx)
                    else:
                        # Fallback to hash of minimal identity
                        import hashlib, json as _json
                        hsrc = _json.dumps({'b': sample.get('benchmark_id'), 'i': sample_idx, 'u': sample_uid}, sort_keys=True).encode('utf-8')
                        sample['sample_key'] = hashlib.sha256(hsrc).hexdigest()[:16]
                    # Best-effort modality
                    modality_val = sample.get('modality')
                    if not modality_val:
                        assets = sample.get('asset_refs') or {}
                        if assets.get('image_path'):
                            modality_val = 'image'
                        elif assets.get('video_path'):
                            modality_val = 'video'
                        elif assets.get('audio_path'):
                            modality_val = 'audio'
                        else:
                            modality_val = 'text'
                        sample['modality'] = modality_val
                    # Normalize is_correct from per_sample_metrics if missing
                    if 'is_correct' not in sample:
                        psm = sample.get('per_sample_metrics') or {}
                        if isinstance(psm, dict) and 'correct' in psm:
                            try:
                                sample['is_correct'] = bool(psm.get('correct'))
                            except Exception:
                                pass
                    all_samples.append(sample)
                except Exception:
                    # If normalization fails, still include as-is
                    all_samples.append(sample)
        
        # Apply server-side filters
        if modality:
            all_samples = [s for s in all_samples if (s.get('modality') or '').lower() == modality.lower()]
        if correctness in ('correct', 'incorrect'):
            want = correctness == 'correct'
            def is_corr(s):
                if 'is_correct' in s:
                    return bool(s.get('is_correct'))
                psm = s.get('per_sample_metrics') or {}
                return bool(psm.get('correct')) if isinstance(psm, dict) and 'correct' in psm else False
            all_samples = [s for s in all_samples if is_corr(s) == want]
        if search:
            q = search.lower()
            def match(s):
                parts = [
                    s.get('benchmark_id', ''),
                    s.get('sample_key', ''),
                    (s.get('input') or s.get('question') or s.get('prompt') or ''),
                    (s.get('prediction') or s.get('output') or ''),
                    (s.get('label') or s.get('gold') or ''),
                ]
                return q in ' '.join(map(str, parts)).lower()
            all_samples = [s for s in all_samples if match(s)]

        # Build counts for modality and correctness for UI facets
        counts = {'modality': {}, 'correctness': {'correct': 0, 'incorrect': 0}}
        for s in all_samples:
            m = (s.get('modality') or 'text').lower()
            counts['modality'][m] = counts['modality'].get(m, 0) + 1
            ic = s.get('is_correct')
            if ic is None:
                psm = s.get('per_sample_metrics') or {}
                if isinstance(psm, dict) and 'correct' in psm:
                    ic = bool(psm.get('correct'))
            if bool(ic):
                counts['correctness']['correct'] += 1
            else:
                counts['correctness']['incorrect'] += 1

        # Apply pagination
        total = len(all_samples)
        paginated_samples = all_samples[offset:offset + limit]
        
        return {
            "model_id": normalized_id,
            "benchmark_id": benchmark_id,
            "samples": paginated_samples,
            "total": total,
            "limit": limit,
            "offset": offset,
            "counts": counts
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get external model samples", model_id=model_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get external model samples: {str(e)}")


@router.get("/{model_id}/samples/summary")
async def get_external_model_samples_summary(model_id: str):
    """Return available benchmarks, total sample estimate, and modality counts (approx) for filters."""
    try:
        normalized_id = normalize_model_id(model_id)
        detail = external_results_parser.ensure_processed_external_model(normalized_id)
        if not detail:
            raise HTTPException(status_code=404, detail=f"External model not found: {normalized_id}")

        benchmarks = []
        modality_counts = {}
        total = 0
        for b in detail.get('benchmarks', []):
            bid = b.get('benchmark_id')
            if bid:
                benchmarks.append(bid)
            total += b.get('total_samples', 0) or len(b.get('samples_preview', []))
            for s in b.get('samples_preview', []) or []:
                mod = (s.get('modality') or '').lower()
                if not mod:
                    assets = s.get('asset_refs') or {}
                    if assets.get('image_path'):
                        mod = 'image'
                    elif assets.get('video_path'):
                        mod = 'video'
                    elif assets.get('audio_path'):
                        mod = 'audio'
                    else:
                        mod = 'text'
                modality_counts[mod] = modality_counts.get(mod, 0) + 1

        return {
            "model_id": normalized_id,
            "benchmarks": benchmarks,
            "total": total,
            "modality_counts": modality_counts,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get external model samples summary", model_id=model_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get external model samples summary: {str(e)}")


@router.get("/{model_id}/benchmarks/{benchmark_id}/preview")
async def get_benchmark_preview(
    model_id: str,
    benchmark_id: str,
    limit: int = 2
):
    """Return up to N preview samples for a specific benchmark (normalized)."""
    try:
        normalized_id = normalize_model_id(model_id)
        detail = external_results_parser.ensure_processed_external_model(normalized_id)
        if not detail:
            raise HTTPException(status_code=404, detail=f"External model not found: {normalized_id}")

        target = None
        for b in detail.get('benchmarks', []):
            if b.get('benchmark_id') == benchmark_id:
                target = b
                break
        if not target:
            raise HTTPException(status_code=404, detail=f"Benchmark not found: {benchmark_id}")

        samples = []
        # Prefer processed responses file
        for rf in target.get('raw_files', []):
            if '_responses_' in rf.get('filename', ''):
                try:
                    resp_file = Path(rf.get('absolute_path', ''))
                    if resp_file.exists():
                        data = read_json_file(resp_file) or {}
                        samples = (data.get('samples', []) or [])[:limit]
                        break
                except Exception:
                    pass
        if not samples:
            samples = (target.get('samples_preview', []) or [])[:limit]

        # Normalize a bit (ensure modality and sample_key)
        normalized = []
        for sample in samples:
            s = dict(sample)
            s['benchmark_id'] = benchmark_id
            s_uid = s.get('sample_uid') or s.get('uid') or s.get('id')
            s_idx = s.get('sample_idx') if isinstance(s.get('sample_idx'), int) else s.get('index')
            if s_uid:
                s_key = str(s_uid)
            elif s_idx is not None:
                s_key = str(s_idx)
            else:
                import hashlib, json as _json
                hsrc = _json.dumps({'b': benchmark_id, 'i': s_idx, 'u': s_uid}, sort_keys=True).encode('utf-8')
                s_key = hashlib.sha256(hsrc).hexdigest()[:16]
            s['sample_key'] = s_key

            if not s.get('modality'):
                assets = s.get('asset_refs') or {}
                if assets.get('image_path'):
                    s['modality'] = 'image'
                elif assets.get('video_path'):
                    s['modality'] = 'video'
                elif assets.get('audio_path'):
                    s['modality'] = 'audio'
                else:
                    s['modality'] = 'text'
            normalized.append(s)

        return {
            "model_id": normalized_id,
            "benchmark_id": benchmark_id,
            "limit": limit,
            "samples": normalized
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get benchmark preview", model_id=model_id, benchmark_id=benchmark_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get benchmark preview: {str(e)}")


@router.get("/{model_id}/benchmarks/{benchmark_id}/stats")
async def get_benchmark_stats(
    model_id: str,
    benchmark_id: str
):
    """Return task-level metrics and basic counts for a benchmark."""
    try:
        normalized_id = normalize_model_id(model_id)
        detail = external_results_parser.ensure_processed_external_model(normalized_id)
        if not detail:
            raise HTTPException(status_code=404, detail=f"External model not found: {normalized_id}")

        target = None
        for b in detail.get('benchmarks', []):
            if b.get('benchmark_id') == benchmark_id:
                target = b
                break
        if not target:
            raise HTTPException(status_code=404, detail=f"Benchmark not found: {benchmark_id}")

        total = target.get('total_samples', 0) or len(target.get('samples_preview', []) or [])
        metrics = target.get('metrics', {}) or {}

        # Lightweight modality/counts estimate from previews
        modality_counts = {}
        for s in target.get('samples_preview', []) or []:
            mod = (s.get('modality') or '').lower()
            if not mod:
                assets = s.get('asset_refs') or {}
                if assets.get('image_path'): mod = 'image'
                elif assets.get('video_path'): mod = 'video'
                elif assets.get('audio_path'): mod = 'audio'
                else: mod = 'text'
            modality_counts[mod] = modality_counts.get(mod, 0) + 1

        return {
            "model_id": normalized_id,
            "benchmark_id": benchmark_id,
            "total_samples": total,
            "metrics": metrics,
            "modality_counts": modality_counts
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get benchmark stats", model_id=model_id, benchmark_id=benchmark_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get benchmark stats: {str(e)}")


@router.get("/media")
async def get_external_media(p: str = Query(..., description="File path or relative path under results/processed roots")):
    """
    Serve media files (image/audio/video) from the results or processed directories.
    Validates that the resolved path stays within allowed roots.
    """
    try:
        # Decode path up to a few times
        raw = p
        for _ in range(5):
            try:
                dec = unquote(raw)
                if dec == raw:
                    break
                raw = dec
            except Exception:
                break

        candidate = Path(raw)
        results_root = get_results_root()
        processed_root = get_processed_root()

        def is_allowed(path: Path) -> bool:
            try:
                rp = path.resolve()
                return str(rp).startswith(str(results_root.resolve())) or str(rp).startswith(str(processed_root.resolve()))
            except Exception:
                return False

        # Try as absolute or relative to results/processed
        paths_to_try = [
            candidate,
            results_root / candidate,
            processed_root / candidate,
        ]
        chosen = None
        for c in paths_to_try:
            if c.exists() and c.is_file() and is_allowed(c):
                chosen = c
                break

        if not chosen:
            raise HTTPException(status_code=404, detail="Media file not found")

        media_type, _ = mimetypes.guess_type(str(chosen))
        return FileResponse(path=str(chosen), media_type=media_type or 'application/octet-stream')
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve media: {str(e)}")
@router.get("/{model_id}/samples/{sample_key}")
async def get_external_model_sample_detail(
    model_id: str,
    sample_key: str
):
    """Get a single sample detail for an external model by sample_key."""
    try:
        normalized_id = normalize_model_id(model_id)
        detail = external_results_parser.ensure_processed_external_model(normalized_id)
        if not detail:
            raise HTTPException(status_code=404, detail=f"External model not found: {normalized_id}")

        # Search across benchmarks and their response files
        from pathlib import Path
        from services.external_results_parser import read_json_file

        for benchmark in detail.get('benchmarks', []):
            # Try responses file first (full list)
            for rf in benchmark.get('raw_files', []):
                if '_responses_' in rf.get('filename', ''):
                    try:
                        resp_file = Path(rf.get('absolute_path', ''))
                        if not resp_file.exists():
                            continue
                        response_data = read_json_file(resp_file)
                        for sample in response_data.get('samples', []):
                            # Normalize the same way we do in list
                            s = dict(sample)
                            s['benchmark_id'] = benchmark.get('benchmark_id')
                            s_uid = s.get('sample_uid') or s.get('uid') or s.get('id')
                            s_idx = s.get('sample_idx') if isinstance(s.get('sample_idx'), int) else s.get('index')
                            if s_uid:
                                s_key = str(s_uid)
                            elif s_idx is not None:
                                s_key = str(s_idx)
                            else:
                                import hashlib, json as _json
                                hsrc = _json.dumps({'b': s.get('benchmark_id'), 'i': s_idx, 'u': s_uid}, sort_keys=True).encode('utf-8')
                                s_key = hashlib.sha256(hsrc).hexdigest()[:16]
                            if s_key == sample_key:
                                # Ensure modality
                                if not s.get('modality'):
                                    assets = s.get('asset_refs') or {}
                                    if assets.get('image_path'):
                                        s['modality'] = 'image'
                                    elif assets.get('video_path'):
                                        s['modality'] = 'video'
                                    elif assets.get('audio_path'):
                                        s['modality'] = 'audio'
                                    else:
                                        s['modality'] = 'text'
                                s['sample_key'] = s_key
                                return {
                                    "model_id": normalized_id,
                                    "benchmark_id": benchmark.get('benchmark_id'),
                                    "sample": s
                                }
                    except Exception:
                        continue
            # Fallback to preview set
            for sample in benchmark.get('samples_preview', []):
                s = dict(sample)
                s['benchmark_id'] = benchmark.get('benchmark_id')
                s_uid = s.get('sample_uid') or s.get('uid') or s.get('id')
                s_idx = s.get('sample_idx') if isinstance(s.get('sample_idx'), int) else s.get('index')
                if s_uid:
                    s_key = str(s_uid)
                elif s_idx is not None:
                    s_key = str(s_idx)
                else:
                    import hashlib, json as _json
                    hsrc = _json.dumps({'b': s.get('benchmark_id'), 'i': s_idx, 'u': s_uid}, sort_keys=True).encode('utf-8')
                    s_key = hashlib.sha256(hsrc).hexdigest()[:16]
                if s_key == sample_key:
                    if not s.get('modality'):
                        assets = s.get('asset_refs') or {}
                        if assets.get('image_path'):
                            s['modality'] = 'image'
                        elif assets.get('video_path'):
                            s['modality'] = 'video'
                        elif assets.get('audio_path'):
                            s['modality'] = 'audio'
                        else:
                            s['modality'] = 'text'
                    s['sample_key'] = s_key
                    return {
                        "model_id": normalized_id,
                        "benchmark_id": benchmark.get('benchmark_id'),
                        "sample": s
                    }

        raise HTTPException(status_code=404, detail=f"Sample not found: {sample_key}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get external model sample detail", model_id=model_id, sample_key=sample_key, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get external model sample detail: {str(e)}")


