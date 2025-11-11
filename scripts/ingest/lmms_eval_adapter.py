#!/usr/bin/env python3
"""
Adapter to normalize lmms-eval per-sample outputs into a superset schema JSONL.

This script scans a given directory for lmms-eval sample files and emits
normalized records with stable keys, dataset lineage, asset refs, predictions,
and per-sample metrics.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from typing import Any, Dict, Iterable, Tuple
import hashlib


def derive_sample_key(sample: Dict[str, Any], benchmark_id: str) -> str:
	sample_uid = sample.get("sample_uid") or sample.get("uid") or sample.get("id")
	sample_idx = sample.get("sample_idx") if isinstance(sample.get("sample_idx"), int) else sample.get("index")
	if sample_uid is not None:
		return str(sample_uid)
	if sample_idx is not None:
		return str(sample_idx)
	hsrc = json.dumps({"b": benchmark_id, "i": sample_idx, "u": sample_uid}, sort_keys=True).encode("utf-8")
	return hashlib.sha256(hsrc).hexdigest()[:16]


def infer_modality(sample: Dict[str, Any]) -> str:
	assets = sample.get("asset_refs") or {}
	if assets.get("image_path"):
		return "image"
	if assets.get("video_path"):
		return "video"
	if assets.get("audio_path"):
		return "audio"
	return "text"


def normalize_sample(sample: Dict[str, Any], benchmark_id: str) -> Dict[str, Any]:
	out = dict(sample)
	out["benchmark_id"] = benchmark_id
	out["sample_key"] = derive_sample_key(out, benchmark_id)
	if not out.get("modality"):
		out["modality"] = infer_modality(out)
	return out


def iter_input_files(root: Path) -> Iterable[Tuple[str, Path]]:
	for p in root.rglob("*.jsonl"):
		name = p.name
		if "_samples_" in name:
			# attempt to pick up benchmark id from suffix
			yield (name, p)


def main():
	parser = argparse.ArgumentParser()
	parser.add_argument("--in-dir", type=str, required=True, help="Directory containing lmms-eval outputs")
	parser.add_argument("--out-dir", type=str, required=True, help="Directory to write normalized responses")
	args = parser.parse_args()

	in_dir = Path(args.in_dir)
	out_dir = Path(args.out_dir)
	out_dir.mkdir(parents=True, exist_ok=True)

	for name, path in iter_input_files(in_dir):
		try:
			# Infer benchmark id from filename after _samples_
			bench_id = name.split("_samples_", 1)[-1].rsplit(".", 1)[0]
			samples = []
			total = 0
			with path.open("r", encoding="utf-8") as f:
				for line in f:
					line = line.strip()
					if not line:
						continue
					try:
						raw = json.loads(line)
					except Exception:
						continue
					total += 1
					samples.append(normalize_sample(raw, bench_id))
			payload = {
				"benchmark_id": bench_id,
				"total_samples": total,
				"samples": samples,
			}
			out_path = out_dir / (name.replace("_samples_", "_responses_").rsplit(".", 1)[0] + ".json")
			with out_path.open("w", encoding="utf-8") as wf:
				json.dump(payload, wf, ensure_ascii=False)
			print(f"Wrote {out_path} ({total} samples)")
		except Exception as e:
			print(f"Failed to process {path}: {e}")


if __name__ == "__main__":
	main()


