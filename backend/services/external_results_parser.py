"""
External Results Parser Service

Parses external model results from the file system, similar to the TypeScript
results-parser.ts implementation. Handles discovery, parsing, and processed JSON
file creation for external model folders.
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import structlog

logger = structlog.get_logger(__name__)


def get_results_root() -> Path:
    """Get the root results directory."""
    # Results is sibling to backend => ../results
    backend_dir = Path(__file__).parent.parent
    return backend_dir.parent / "results"


def get_processed_root() -> Path:
    """Get the processed JSON root directory."""
    return get_results_root() / "processed-json"


def safe_stat(path: Path):
    """Safely get file stats, returning None if path doesn't exist."""
    try:
        return path.stat() if path.exists() else None
    except Exception:
        return None


def ensure_dir(dir_path: Path) -> None:
    """Ensure a directory exists."""
    try:
        dir_path.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass


def format_date_yyyy_mm_dd(d: Optional[datetime] = None) -> str:
    """Format date as YYYYMMDD."""
    if d is None:
        d = datetime.utcnow()
    return d.strftime("%Y%m%d")


def read_json_file(path: Path) -> Dict[str, Any]:
    """Read a JSON file."""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def read_jsonl_file(path: Path, preview_limit: int = 100) -> tuple[List[Dict[str, Any]], int]:
    """Read a JSONL file, returning preview lines and total count."""
    lines = []
    total = 0
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                
                total += 1
                if i < preview_limit:
                    try:
                        lines.append(json.loads(line))
                    except json.JSONDecodeError:
                        # Skip malformed lines
                        pass
    except Exception as e:
        logger.warning("Failed to read JSONL file", path=str(path), error=str(e))
    
    return lines, total


def find_results_json(dir_path: Path) -> Optional[Path]:
    """Find results JSON file in a directory."""
    try:
        for file in dir_path.iterdir():
            if file.is_file() and file.name.endswith('_results.json'):
                return file
    except Exception:
        pass
    return None


def find_samples_jsonl(dir_path: Path) -> Optional[Path]:
    """Find samples JSONL file in a directory."""
    try:
        for file in dir_path.iterdir():
            if file.is_file() and '_samples_' in file.name and file.name.endswith('.jsonl'):
                return file
    except Exception:
        pass
    return None


def parse_benchmark(bench_path: Path, benchmark_id: str) -> Dict[str, Any]:
    """Parse a single benchmark directory."""
    results_path = find_results_json(bench_path)
    jsonl_path = find_samples_jsonl(bench_path)
    
    metrics = {}
    if results_path:
        try:
            metrics = read_json_file(results_path)
        except Exception:
            pass
    
    samples_preview = []
    total_samples = 0
    if jsonl_path:
        samples_preview, total_samples = read_jsonl_file(jsonl_path, 100)
    
    raw_files = []
    if results_path:
        raw_files.append({
            "filename": results_path.name,
            "absolute_path": str(results_path)
        })
    if jsonl_path:
        raw_files.append({
            "filename": jsonl_path.name,
            "absolute_path": str(jsonl_path)
        })
    
    # Include submission files if present
    submissions_dir = bench_path / "submissions"
    if submissions_dir.exists() and submissions_dir.is_dir():
        try:
            for sub_file in submissions_dir.iterdir():
                if sub_file.is_file():
                    raw_files.append({
                        "filename": f"submissions/{sub_file.name}",
                        "absolute_path": str(sub_file)
                    })
        except Exception:
            pass
    
    return {
        "benchmark_id": benchmark_id,
        "metrics": metrics,
        "samples_preview": samples_preview,
        "total_samples": total_samples,
        "raw_files": raw_files
    }


class ExternalResultsParser:
    """Parser for external model results from the file system."""
    
    def __init__(self):
        """Initialize the parser."""
        self.results_root = get_results_root()
        self.processed_root = get_processed_root()
        logger.info("External results parser initialized", results_root=str(self.results_root))
    
    def scan_external_models(self) -> List[Dict[str, Any]]:
        """
        Scan for external model folders.
        
        Returns:
            List of external model summaries
        """
        if not self.results_root.exists() or not self.results_root.is_dir():
            return []
        
        models = []
        
        try:
            entries = list(self.results_root.iterdir())
            folders = [e for e in entries if e.is_dir()]
            
            for folder in folders:
                folder_name = folder.name
                
                # Skip if it matches the standard pattern (handled by other parsers)
                parts = folder_name.split('_')
                if len(parts) >= 4:
                    maybe_date = parts[-2]
                    maybe_time = parts[-1]
                    if re.match(r'^\d{8}$', maybe_date) and re.match(r'^\d{6,}$', maybe_time):
                        continue  # Skip standard pattern folders
                
                # Try to find benchmark folders inside
                all_benchmarks = []
                total_samples = [0]
                aggregate_metrics = {}
                metric_count = [0]
                
                try:
                    subdirs = [d for d in folder.iterdir() if d.is_dir()]
                    
                    # Recursively search for benchmark folders
                    for subdir in subdirs:
                        self._process_subdirectory(subdir, all_benchmarks, aggregate_metrics, metric_count, total_samples)
                    
                    # Also check for direct .jsonl folders
                    direct_benchmarks = [d for d in subdirs if d.name.endswith('.jsonl')]
                    for bench_dir in direct_benchmarks:
                        bench_id = bench_dir.name.replace('.jsonl', '').replace('.JSONL', '')
                        detail = parse_benchmark(bench_dir, bench_id)
                        all_benchmarks.append(detail)
                        total_samples[0] += detail.get('total_samples', 0)
                        metric_count[0] += self._aggregate_metrics(detail.get('metrics', {}), aggregate_metrics)
                
                except Exception as e:
                    logger.warning("Failed to process folder", folder=str(folder), error=str(e))
                    continue
                
                if len(all_benchmarks) == 0:
                    continue  # Skip if no benchmarks found
                
                # Calculate summary metrics
                summary_metrics = {}
                if metric_count[0] > 0:
                    for k, v in aggregate_metrics.items():
                        summary_metrics[k] = v / metric_count[0]
                elif aggregate_metrics:
                    summary_metrics = aggregate_metrics
                
                # Get folder mtime for created_at
                stats = safe_stat(folder)
                created_at = datetime.fromtimestamp(stats.st_mtime).isoformat() if stats else datetime.utcnow().isoformat()
                
                # Extract model name from folder name
                model_name = folder_name.replace('_', ' ').strip()
                
                models.append({
                    "id": f"external:{folder_name}",
                    "name": model_name,
                    "model_name": folder_name,
                    "folder_path": str(folder),
                    "created_at": created_at,
                    "benchmark_count": len(all_benchmarks),
                    "total_samples": total_samples[0],
                    "summary_metrics": summary_metrics
                })
        
        except Exception as e:
            logger.error("Failed to scan external models", error=str(e))
        
        # Sort by created_at (newest first)
        models.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return models
    
    def _process_subdirectory(self, subdir: Path, all_benchmarks: List, aggregate_metrics: Dict, metric_count: List[int], total_samples: List[int]) -> None:
        """Process a subdirectory recursively to find benchmarks."""
        try:
            nested = [d for d in subdir.iterdir()]
            benchmark_dirs = [d for d in nested if d.is_dir() and d.name.endswith('.jsonl')]
            
            if benchmark_dirs:
                # This is a subfolder with benchmarks
                for bench_dir in benchmark_dirs:
                    bench_id = bench_dir.name.replace('.jsonl', '').replace('.JSONL', '')
                    detail = parse_benchmark(bench_dir, bench_id)
                    all_benchmarks.append(detail)
                    total_samples[0] += detail.get('total_samples', 0)
                    metric_count[0] += self._aggregate_metrics(detail.get('metrics', {}), aggregate_metrics)
            else:
                # Check deeper
                deeper = [d for d in subdir.iterdir()]
                deeper_benchmarks = [d for d in deeper if d.is_dir() and d.name.endswith('.jsonl')]
                
                if deeper_benchmarks:
                    for bench_dir in deeper_benchmarks:
                        bench_id = bench_dir.name.replace('.jsonl', '').replace('.JSONL', '')
                        detail = parse_benchmark(bench_dir, bench_id)
                        all_benchmarks.append(detail)
                        total_samples[0] += detail.get('total_samples', 0)
                        metric_count[0] += self._aggregate_metrics(detail.get('metrics', {}), aggregate_metrics)
                else:
                    # Handle case where files are directly in the nested folder
                    files = [f for f in deeper if f.is_file()]
                    result_files = [f for f in files if '_results.json' in f.name]
                    sample_files = [f for f in files if '_samples_' in f.name and f.name.endswith('.jsonl')]
                    
                    # Group by timestamp prefix
                    groups = {}
                    
                    for rf in result_files:
                        match = re.match(r'^(\d{8}_\d{6})_results\.json$', rf.name)
                        if match:
                            prefix = match.group(1)
                            if prefix not in groups:
                                groups[prefix] = {"result_file": None, "sample_files": []}
                            groups[prefix]["result_file"] = rf
                    
                    for sf in sample_files:
                        match = re.match(r'^(\d{8}_\d{6})_samples_(.+)\.jsonl$', sf.name)
                        if match:
                            prefix = match.group(1)
                            bench_id = match.group(2)
                            if prefix not in groups:
                                groups[prefix] = {"result_file": None, "sample_files": []}
                            groups[prefix]["sample_files"].append({"name": bench_id, "path": sf})
                    
                    # Process each group
                    for prefix, group in groups.items():
                        if group["sample_files"]:
                            for sample in group["sample_files"]:
                                result_path = group["result_file"]
                                sample_path = sample["path"]
                                bench_id = sample["name"]
                                
                                metrics = {}
                                if result_path:
                                    try:
                                        metrics = read_json_file(result_path)
                                    except Exception:
                                        pass
                                
                                samples, total = read_jsonl_file(sample_path, 100)
                                
                                raw_files = []
                                if result_path:
                                    raw_files.append({
                                        "filename": result_path.name,
                                        "absolute_path": str(result_path)
                                    })
                                raw_files.append({
                                    "filename": sample_path.name,
                                    "absolute_path": str(sample_path)
                                })
                                
                                all_benchmarks.append({
                                    "benchmark_id": bench_id,
                                    "metrics": metrics,
                                    "samples_preview": samples,
                                    "total_samples": total,
                                    "raw_files": raw_files
                                })
                                
                                total_samples[0] += total
                                metric_count[0] += self._aggregate_metrics(metrics, aggregate_metrics)
                        elif group["result_file"]:
                            result_path = group["result_file"]
                            try:
                                metrics = read_json_file(result_path)
                            except Exception:
                                metrics = {}
                            
                            bench_id = prefix
                            all_benchmarks.append({
                                "benchmark_id": bench_id,
                                "metrics": metrics,
                                "samples_preview": [],
                                "total_samples": 0,
                                "raw_files": [{
                                    "filename": result_path.name,
                                    "absolute_path": str(result_path)
                                }]
                            })
                            
                            metric_count[0] += self._aggregate_metrics(metrics, aggregate_metrics)
        
        except Exception as e:
            logger.warning("Failed to process subdirectory", subdir=str(subdir), error=str(e))
    
    def _aggregate_metrics(self, metrics: Dict[str, Any], aggregate_metrics: Dict) -> int:
        """Aggregate numeric metrics. Returns count of metrics added."""
        count = 0
        for k, v in metrics.items():
            if isinstance(v, (int, float)) and not (isinstance(v, float) and (v != v or v == float('inf'))):
                if k not in aggregate_metrics:
                    aggregate_metrics[k] = 0
                aggregate_metrics[k] += v
                count += 1
        return count
    
    def parse_external_model_by_id(self, model_id: str) -> Optional[Dict[str, Any]]:
        """
        Parse a specific external model by ID.
        
        Args:
            model_id: Model ID in format "external:folder_name"
        
        Returns:
            External model detail or None if not found
        """
        if not model_id.startswith('external:'):
            return None
        
        requested_folder_name = model_id[len('external:'):]
        
        # Resolve folder with compatibility for single vs double underscores
        candidate_names = list(set([
            requested_folder_name,
            requested_folder_name.replace('__', '_'),
            requested_folder_name.replace('_', '__'),
        ]))
        
        folder_name = requested_folder_name
        folder_path = self.results_root / folder_name
        exists = safe_stat(folder_path)
        
        if not exists or not folder_path.is_dir():
            for candidate in candidate_names:
                candidate_path = self.results_root / candidate
                st = safe_stat(candidate_path)
                if st and candidate_path.is_dir():
                    folder_name = candidate
                    folder_path = candidate_path
                    exists = st
                    break
            
            if not exists or not folder_path.is_dir():
                return None
        
        # Get summary from scanning
        summaries = self.scan_external_models()
        summary = next((s for s in summaries if s['id'] == f'external:{folder_name}'), None)
        
        if not summary:
            # Build minimal synthetic summary
            stats = safe_stat(folder_path)
            created_at = datetime.fromtimestamp(stats.st_mtime).isoformat() if stats else datetime.utcnow().isoformat()
            summary = {
                "id": f"external:{folder_name}",
                "name": folder_name.replace('_', ' ').strip(),
                "model_name": folder_name,
                "folder_path": str(folder_path),
                "created_at": created_at,
                "benchmark_count": 0,
                "total_samples": 0,
                "summary_metrics": {}
            }
        
        # Parse all benchmarks recursively (similar to scan logic)
        all_benchmarks = []
        try:
            subdirs = [d for d in folder_path.iterdir() if d.is_dir()]
            
            for subdir in subdirs:
                nested = [d for d in subdir.iterdir()]
                benchmark_dirs = [d for d in nested if d.is_dir() and d.name.endswith('.jsonl')]
                
                if benchmark_dirs:
                    for bench_dir in benchmark_dirs:
                        bench_id = bench_dir.name.replace('.jsonl', '').replace('.JSONL', '')
                        detail = parse_benchmark(bench_dir, bench_id)
                        all_benchmarks.append(detail)
                else:
                    deeper = [d for d in subdir.iterdir()]
                    deeper_benchmarks = [d for d in deeper if d.is_dir() and d.name.endswith('.jsonl')]
                    
                    if deeper_benchmarks:
                        for bench_dir in deeper_benchmarks:
                            bench_id = bench_dir.name.replace('.jsonl', '').replace('.JSONL', '')
                            detail = parse_benchmark(bench_dir, bench_id)
                            all_benchmarks.append(detail)
                    else:
                        # Handle files directly in nested folder
                        files = [f for f in deeper if f.is_file()]
                        result_files = [f for f in files if '_results.json' in f.name]
                        sample_files = [f for f in files if '_samples_' in f.name and f.name.endswith('.jsonl')]
                        
                        groups = {}
                        for rf in result_files:
                            match = re.match(r'^(\d{8}_\d{6})_results\.json$', rf.name)
                            if match:
                                prefix = match.group(1)
                                if prefix not in groups:
                                    groups[prefix] = {"result_file": None, "sample_files": []}
                                groups[prefix]["result_file"] = rf
                        
                        for sf in sample_files:
                            match = re.match(r'^(\d{8}_\d{6})_samples_(.+)\.jsonl$', sf.name)
                            if match:
                                prefix = match.group(1)
                                bench_id = match.group(2)
                                if prefix not in groups:
                                    groups[prefix] = {"result_file": None, "sample_files": []}
                                groups[prefix]["sample_files"].append({"name": bench_id, "path": sf})
                        
                        for prefix, group in groups.items():
                            if group["sample_files"]:
                                for sample in group["sample_files"]:
                                    result_path = group["result_file"]
                                    sample_path = sample["path"]
                                    bench_id = sample["name"]
                                    
                                    metrics = {}
                                    if result_path:
                                        try:
                                            metrics = read_json_file(result_path)
                                        except Exception:
                                            pass
                                    
                                    samples, total = read_jsonl_file(sample_path, 100)
                                    
                                    raw_files = []
                                    if result_path:
                                        raw_files.append({
                                            "filename": result_path.name,
                                            "absolute_path": str(result_path)
                                        })
                                    raw_files.append({
                                        "filename": sample_path.name,
                                        "absolute_path": str(sample_path)
                                    })
                                    
                                    all_benchmarks.append({
                                        "benchmark_id": bench_id,
                                        "metrics": metrics,
                                        "samples_preview": samples,
                                        "total_samples": total,
                                        "raw_files": raw_files
                                    })
                            elif group["result_file"]:
                                result_path = group["result_file"]
                                try:
                                    metrics = read_json_file(result_path)
                                except Exception:
                                    metrics = {}
                                
                                bench_id = prefix
                                all_benchmarks.append({
                                    "benchmark_id": bench_id,
                                    "metrics": metrics,
                                    "samples_preview": [],
                                    "total_samples": 0,
                                    "raw_files": [{
                                        "filename": result_path.name,
                                        "absolute_path": str(result_path)
                                    }]
                                })
            
            # Also check for direct .jsonl folders
            direct_benchmarks = [d for d in subdirs if d.name.endswith('.jsonl')]
            for bench_dir in direct_benchmarks:
                bench_id = bench_dir.name.replace('.jsonl', '').replace('.JSONL', '')
                detail = parse_benchmark(bench_dir, bench_id)
                all_benchmarks.append(detail)
        
        except Exception as e:
            logger.error("Failed to parse external model", model_id=model_id, error=str(e))
        
        return {**summary, "benchmarks": all_benchmarks}
    
    def ensure_processed_external_model(self, model_id: str) -> Optional[Dict[str, Any]]:
        """
        Ensure processed JSON files exist and return model detail.
        
        Args:
            model_id: Model ID in format "external:folder_name"
        
        Returns:
            External model detail with processed JSON file references
        """
        detail = self.parse_external_model_by_id(model_id)
        if not detail:
            return None
        
        ensure_dir(self.processed_root)
        
        # Create model directory under processed-json
        model_dir_name = detail['model_name']
        model_dir = self.processed_root / model_dir_name
        ensure_dir(model_dir)
        
        today = format_date_yyyy_mm_dd()
        
        # 1) Consolidated metrics file for all benchmarks
        metrics_out = model_dir / f"metrics_{today}.json"
        metrics_exists = safe_stat(metrics_out)
        
        if not metrics_exists:
            # Only write if file doesn't exist
            # Exclude time-related fields when aggregating
            time_fields = [
                'start_time', 'end_time', 'starttime', 'endtime',
                'created_at', 'updated_at', 'createdat', 'updatedat',
                'timestamp', 'time', 'duration', 'elapsed',
                'date', 'datetime', 'when'
            ]
            
            metrics_summary = {}
            consolidated = []
            
            for b in detail.get('benchmarks', []):
                # Aggregate metrics, excluding time fields
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
                        
                        if k not in metrics_summary:
                            metrics_summary[k] = {"total": 0, "count": 0}
                        metrics_summary[k]["total"] += v
                        metrics_summary[k]["count"] += 1
                
                consolidated.append({
                    "benchmark_id": b.get("benchmark_id"),
                    "metrics": b.get("metrics", {}),
                    "total_samples": b.get("total_samples", 0),
                    "files": [{"filename": f.get("filename"), "absolute_path": f.get("absolute_path")} 
                             for f in b.get("raw_files", [])],
                    "submissions": [f.get("filename") for f in b.get("raw_files", []) 
                                  if 'submissions/' in str(f.get("filename", ""))]
                })
            
            summary = {}
            for k, v in metrics_summary.items():
                if v["count"] > 0:
                    summary[k] = v["total"] / v["count"]
            
            metrics_payload = {
                "model": detail['model_name'],
                "created_at": detail['created_at'],
                "benchmarks": consolidated,
                "summary": summary
            }
            
            with open(metrics_out, 'w', encoding='utf-8') as f:
                json.dump(metrics_payload, f, indent=2)
        
        # 2) Full responses per task
        responses_index = []
        processed_benchmarks = []
        
        for b in detail.get('benchmarks', []):
            safe_id = re.sub(r'[^A-Za-z0-9_\-\.]', '_', b.get('benchmark_id', ''))
            resp_out = model_dir / f"{safe_id}_responses_{today}.json"
            responses_exists = safe_stat(resp_out)
            
            if not responses_exists:
                # Only write if file doesn't exist
                total_samples = b.get('total_samples', 0) or len(b.get('samples_preview', []))
                responses_payload = {
                    "model": detail['model_name'],
                    "created_at": detail['created_at'],
                    "benchmark_id": b.get('benchmark_id'),
                    "total_samples": total_samples,
                    "samples": b.get('samples_preview', [])
                }
                
                with open(resp_out, 'w', encoding='utf-8') as f:
                    json.dump(responses_payload, f, indent=2)
            
            # Build index entry
            total_samples = b.get('total_samples', 0) or len(b.get('samples_preview', []))
            if responses_exists:
                try:
                    existing_content = read_json_file(resp_out)
                    total_samples = existing_content.get('total_samples', total_samples)
                except Exception:
                    pass
            
            responses_index.append({
                "benchmark_id": b.get('benchmark_id'),
                "file": str(resp_out.relative_to(self.results_root)),
                "absolute_path": str(resp_out),
                "total_samples": total_samples
            })
            
            # Prepare UI-friendly benchmark list
            processed_benchmarks.append({
                "benchmark_id": b.get('benchmark_id'),
                "metrics": b.get('metrics', {}),
                "samples_preview": [],
                "total_samples": total_samples,
                "raw_files": [
                    {
                        "filename": str(metrics_out.relative_to(self.results_root)),
                        "absolute_path": str(metrics_out)
                    },
                    {
                        "filename": str(resp_out.relative_to(self.results_root)),
                        "absolute_path": str(resp_out)
                    }
                ]
            })
        
        return {
            **detail,
            "benchmarks": processed_benchmarks,
            "source_folder": str(model_dir),
            "responses_index": responses_index
        }


# Global instance
external_results_parser = ExternalResultsParser()

