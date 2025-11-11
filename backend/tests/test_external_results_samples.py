import types
import pytest
from fastapi.testclient import TestClient

from backend.main_complete import app  # type: ignore

client = TestClient(app)


class DummyParser:
	def ensure_processed_external_model(self, model_id: str):
		return {
			"model_name": "dummy",
			"created_at": "2025-01-01T00:00:00Z",
			"benchmarks": [
				{
					"benchmark_id": "bench_1",
					"samples_preview": [
						{
							"sample_idx": 0,
							"dataset_name": "google/fleurs",
							"asset_refs": {"audio_path": "results/audio/a.wav"},
							"gold": {"transcript": "hello"},
							"prediction": {"text": "hello"},
							"per_sample_metrics": {"wer": 0.0},
						},
						{
							"sample_uid": "uid-1",
							"dataset_name": "coco_captions",
							"asset_refs": {"image_path": "results/images/i.jpg"},
							"gold": {"caption": "a cat"},
							"prediction": {"text": "a cat"},
						},
					],
					"raw_files": [],
					"metrics": {},
					"total_samples": 2,
				}
			],
		}


@pytest.fixture(autouse=True)
def patch_parser(monkeypatch):
	# Patch the external_results_parser used by the router
	from backend.services import external_results_parser as real_module  # type: ignore
	monkeypatch.setattr(real_module, "external_results_parser", DummyParser())
	yield


def test_list_samples_returns_keys_and_modalities():
	model_id = "external:dummy_model"
	r = client.get(f"/api/v1/external-results/{model_id}/samples?limit=10&offset=0")
	assert r.status_code == 200, r.text
	data = r.json()
	assert "samples" in data
	assert data["total"] == 2
	keys = []
	for s in data["samples"]:
		assert "sample_key" in s
		assert s.get("modality") in ("audio", "image", "video", "text", None)
		keys.append(s["sample_key"])

	# Fetch detail for first sample
	detail = client.get(f"/api/v1/external-results/{model_id}/samples/{keys[0]}")
	assert detail.status_code == 200, detail.text
	sample = detail.json()["sample"]
	assert sample["sample_key"] == keys[0]
	assert "benchmark_id" in sample


