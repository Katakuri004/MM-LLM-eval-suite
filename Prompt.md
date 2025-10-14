LMMS-Eval Dashboard Web App - Technical Documentation
1. Executive Overview
This document specifies a comprehensive web-based dashboard and GUI system for the lmms-eval benchmarking framework. The system enables users to orchestrate LMM (Large Multimodal Model) evaluations, monitor real-time progress, visualize results, and compare model performance across multiple benchmarks and modalities.
Core Goals:

Wrap the lmms-eval CLI with a modern web interface
Provide real-time monitoring and progress tracking
Store all evaluation results in a persistent database (Supabase)
Offer advanced analytics, comparisons, and failure-case exploration
Enable benchmark slicing by data characteristics (fairness & domain-specific analysis)


2. Technology Stack
Frontend

Framework: React 18+ with TypeScript
State Management: React Context API + custom hooks (or Redux Toolkit for scale)
Charting: Recharts or Plotly for rich visualizations
Tables: TanStack Table (React Table) for complex, sortable leaderboards
Real-time Updates: WebSocket connection or Server-Sent Events (SSE) for live metrics
UI Components: Shadcn/ui or Material-UI for consistent design
Build Tool: Vite or Next.js (recommended: Next.js for API routes + SSR if needed)

Backend (API Server)

Language: Python (FastAPI) or Node.js (Express/NestJS)
Recommendation: Python FastAPI to stay in the ML ecosystem; direct integration with lmms-eval
Process Manager: APScheduler or Celery for task queueing and scheduling
WebSocket: Starlette WebSocket or Socket.io for real-time updates

Database

Primary: Supabase (PostgreSQL with managed auth, realtime, edge functions)
Cache: Redis (optional, for high-frequency updates)
Object Storage: Supabase Storage or AWS S3 for artifacts (configs, logs, prediction files)

Benchmarking Backend

Framework: lmms-eval (GitHub: EvolvingLMMs-Lab/lmms-eval)
Execution: Docker containers or conda environments for isolation
GPU Scheduling: Custom queue system or Kubernetes for multi-GPU clusters

Monitoring & Logging

Logs: Structured logging to Supabase or ELK stack
Monitoring: Optional Prometheus + Grafana for infrastructure metrics


3. Architecture Overview
High-Level System Diagram
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Run     │ │ Live     │ │Leaderboard│ │ Model   │       │
│  │Launcher │ │ Queue    │ │ & Filter  │ │ Detail  │       │
│  └─────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Failure │ │Comparison│ │ Slices & │ │Dashboard│       │
│  │ Explorer│ │  View    │ │ Fairness │ │Home     │       │
│  └─────────┘ └──────────┘ └──────────┘ └──────────┘       │
└────────────────┬────────────────────────────────────────────┘
                 │ REST API + WebSocket
┌────────────────▼────────────────────────────────────────────┐
│              Backend API Server (FastAPI)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Auth &    │ │Run       │ │Results   │ │Model    │      │
│  │Config    │ │Mgmt      │ │Query     │ │Registry │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │WebSocket │ │Task      │ │File Mgmt │ │GPU      │      │
│  │Handler   │ │Queue     │ │& Artifacts│ │Scheduler│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                   ▲                                         │
│                   │ Subprocess/Container                    │
│                   ▼                                         │
│         ┌──────────────────────┐                          │
│         │  lmms-eval Runner    │                          │
│         │  (CLI Wrapper)       │                          │
│         └──────────────────────┘                          │
└─────────────────┬──────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬──────────────┐
    │             │             │              │
┌───▼──┐    ┌────▼──┐    ┌────▼───┐    ┌────▼───┐
│ Supa │    │Redis  │    │Object  │    │Compute │
│ base │    │Cache  │    │Storage │    │Engine  │
│(DB)  │    │       │    │(Logs)  │    │        │
└──────┘    └───────┘    └────────┘    └────────┘
Data Flow

Run Creation: User selects models, benchmarks, hyperparameters → creates run record in DB
Run Queuing: Run moves to task queue; backend assigns GPU and spawns lmms-eval subprocess
Progress Streaming: Background process writes metrics to DB; WebSocket pushes updates to frontend in real-time
Result Storage: Final results, logs, and artifacts stored in Supabase + object storage
Dashboard Queries: Frontend queries Supabase for display; caching layer reduces load


4. Database Schema (Supabase PostgreSQL)
Core Tables
models
Columns:
- id (UUID, PK)
- name (Text, Unique)
- family (Text, e.g., "LLaVA", "InstructBLIP")
- source (Text, e.g., "huggingface://llavav15-7b")
- dtype (Text, "float32", "float16", "bfloat16")
- num_parameters (BigInt)
- notes (Text)
- created_at (Timestamp)
- metadata (JSON, e.g., { "repo_url": "...", "license": "..." })

Indexes:
- (name), (family)
benchmarks
Columns:
- id (UUID, PK)
- name (Text, Unique, e.g., "COCO-Caption")
- modality (Text, e.g., "Vision", "Audio", "Video", "Text")
- category (Text, e.g., "VQA", "OCR", "ASR", "VideoQA")
- task_type (Text, e.g., "multiple_choice", "open_ended")
- primary_metrics (JSON Array, e.g., ["accuracy", "f1_score"])
- secondary_metrics (JSON Array)
- num_samples (Int)
- description (Text)
- created_at (Timestamp)

Indexes:
- (category), (modality)
runs
Columns:
- id (UUID, PK)
- name (Text, User-provided run name)
- model_id (UUID, FK → models)
- checkpoint_variant (Text, e.g., "checkpoint-1000", defaults to "latest")
- created_at (Timestamp)
- started_at (Timestamp, nullable)
- completed_at (Timestamp, nullable)
- status (Enum: "pending", "queued", "running", "completed", "failed", "cancelled")
- error_message (Text, nullable)
- total_tasks (Int, sum of all benchmark tasks)
- completed_tasks (Int)
- gpu_device_id (Text, e.g., "cuda:0", "cuda:1:2", nullable)
- process_id (Int, nullable)
- config (JSON, stores seed, temperature, num_shots, compute_profile)
- metadata (JSON)

Indexes:
- (model_id, status), (created_at DESC), (status)
run_benchmarks
Columns:
- id (UUID, PK)
- run_id (UUID, FK → runs)
- benchmark_id (UUID, FK → benchmarks)
- status (Enum: "pending", "running", "completed", "failed")
- started_at (Timestamp, nullable)
- completed_at (Timestamp, nullable)
- order (Int, execution order)

Composite Unique Index:
- (run_id, benchmark_id)

Indexes:
- (run_id), (benchmark_id)
run_metrics
Columns:
- id (UUID, PK)
- run_id (UUID, FK → runs)
- run_benchmark_id (UUID, FK → run_benchmarks)
- benchmark_id (UUID, FK → benchmarks)
- metric_name (Text, e.g., "accuracy", "CIDEr")
- metric_value (Float)
- slice_id (UUID, FK → slices, nullable)
- sample_count (Int)
- updated_at (Timestamp)

Composite Unique Index:
- (run_id, benchmark_id, metric_name, slice_id)

Indexes:
- (run_id), (benchmark_id, metric_name), (slice_id)
slices
Columns:
- id (UUID, PK)
- name (Text, e.g., "male_speakers", "chart_type_pie")
- slice_type (Enum: "audio_gender", "audio_language", "audio_snr", "audio_duration", "vision_ocr_required", "vision_resolution", "vision_chart_type", "video_length", "video_motion")
- slice_value (Text, e.g., "male", "english", "low_snr", "pie_chart")
- associated_benchmarks (UUID Array, FK → benchmarks)
- description (Text)

Indexes:
- (slice_type), (name)
run_samples
Columns:
- id (UUID, PK)
- run_benchmark_id (UUID, FK → run_benchmarks)
- benchmark_id (UUID, FK → benchmarks)
- sample_index (Int)
- input_data (JSON, e.g., { "image_path": "...", "question": "..." })
- ground_truth (JSON)
- prediction (JSON)
- metrics (JSON, per-sample metrics e.g., { "accuracy": 1, "em": 1 })
- error (Float, nullable, e.g., absolute error or negative log likelihood)
- confidence (Float, nullable)
- slice_assignments (UUID Array, FK → slices)
- created_at (Timestamp)

Indexes:
- (run_benchmark_id, benchmark_id), (sample_index)
artifacts
Columns:
- id (UUID, PK)
- run_id (UUID, FK → runs)
- artifact_type (Enum: "config", "log", "predictions", "error_analysis", "checkpoint_info")
- file_path (Text, path in Supabase Storage)
- file_size (BigInt)
- created_at (Timestamp)
- metadata (JSON)

Indexes:
- (run_id, artifact_type), (created_at)
model_checkpoints
Columns:
- id (UUID, PK)
- model_id (UUID, FK → models)
- checkpoint_variant (Text, e.g., "checkpoint-1000")
- checkpoint_index (Int, for trend visualization)
- source (Text, HF URI or local path)
- created_at (Timestamp)
- metadata (JSON)

Composite Unique Index:
- (model_id, checkpoint_variant)

Indexes:
- (model_id)
comparison_sessions
Columns:
- id (UUID, PK)
- user_id (UUID, FK → auth.users via Supabase Auth)
- name (Text, e.g., "LLaVA vs InstructBLIP")
- comparison_type (Enum: "intra_model_checkpoint", "inter_model_same_checkpoint", "best_of_n", "release_candidate")
- run_ids (UUID Array, FK → runs)
- benchmark_ids (UUID Array, FK → benchmarks, for filtering)
- slice_id (UUID, nullable, FK → slices)
- created_at (Timestamp)
- updated_at (Timestamp)

Indexes:
- (user_id, created_at)
run_logs (high-volume table, optional separate storage)
Columns:
- id (BigInt, PK)
- run_id (UUID, FK → runs)
- timestamp (Timestamp)
- level (Enum: "DEBUG", "INFO", "WARNING", "ERROR")
- message (Text)
- context (JSON, optional)

Indexes:
- (run_id, timestamp)
Supabase-Specific Features

Real-time Subscriptions: Enable on runs, run_metrics, run_samples for live updates
Row-Level Security (RLS): Lock down data per user or organization (if multi-tenant)
Edge Functions: Trigger computations on metric updates (e.g., rerank leaderboard on new run completion)
Storage Buckets:

logs/ for run logs
configs/ for benchmark configs
predictions/ for raw predictions
artifacts/ for miscellaneous files




5. API Specification
Base URL
http://localhost:8000/api/v1
Authentication

Use Supabase Auth (JWT tokens)
Frontend sends token in Authorization: Bearer <token> header

Core Endpoints
Run Management
POST /runs/create

Create a new evaluation run
Request:

json  {
    "name": "LLaVA-1.5-7B-VQA-Test",
    "model_id": "uuid",
    "benchmark_ids": ["uuid1", "uuid2"],
    "checkpoint_variant": "latest",
    "config": {
      "seed": 42,
      "shots": 0,
      "temperature": 0.0,
      "compute_profile": "4070-8GB"
    }
  }

Response: { "run_id": "uuid", "total_tasks": 10, "eta_seconds": 3600 }

GET /runs/{run_id}

Fetch full run details
Response:

json  {
    "id": "uuid",
    "name": "...",
    "model_id": "uuid",
    "status": "running",
    "started_at": "2025-01-15T10:00:00Z",
    "completed_at": null,
    "total_tasks": 10,
    "completed_tasks": 3,
    "progress_percent": 30,
    "items_per_second": 2.5,
    "eta_seconds": 2800,
    "metrics_snapshot": { "benchmark_1": { "accuracy": 0.85 } }
  }
GET /runs

List all runs with filtering
Query params: ?status=running&model_id=uuid&limit=20&offset=0
Response: { "runs": [...], "total": 50 }

POST /runs/{run_id}/cancel

Cancel a running evaluation
Response: { "status": "cancelled" }

Benchmarks
GET /benchmarks

List all benchmarks
Query params: ?category=VQA&modality=Vision
Response: { "benchmarks": [...] }

GET /benchmarks/{benchmark_id}

Fetch benchmark metadata
Response:

json  {
    "id": "uuid",
    "name": "COCO-Caption",
    "category": "Captioning",
    "modality": "Vision",
    "primary_metrics": ["CIDEr", "BLEU"],
    "num_samples": 5000,
    "description": "..."
  }
Models
GET /models

List all models
Response: { "models": [...] }

GET /models/{model_id}

Fetch model metadata and all associated runs
Response:

json  {
    "id": "uuid",
    "name": "LLaVA-1.5-7B",
    "family": "LLaVA",
    "source": "huggingface://llava-hf/llava-1.5-7b-hf",
    "dtype": "float16",
    "num_parameters": 7000000000,
    "checkpoints": [...],
    "runs": [...]
  }
Leaderboard
GET /leaderboard/{benchmark_id}

Fetch leaderboard for a specific benchmark
Query params: ?slice_id=uuid&checkpoint_mode=best|specific&sort_by=score
Response:

json  {
    "benchmark": "COCO-Caption",
    "entries": [
      {
        "rank": 1,
        "model_name": "LLaVA-1.5-13B",
        "checkpoint": "checkpoint-2000",
        "score": 0.95,
        "last_run": "2025-01-15T10:00:00Z",
        "run_id": "uuid"
      }
    ],
    "slice": "all"
  }
Metrics & Analytics
GET /runs/{run_id}/metrics

Stream or fetch all metrics for a run
Query params: ?benchmark_id=uuid&stream=true
Response (stream or direct): Real-time JSON or static snapshot

GET /runs/{run_id}/samples

Fetch per-sample data (for failure explorer)
Query params: ?benchmark_id=uuid&sort_by=error|confidence&limit=20
Response:

json  {
    "samples": [
      {
        "index": 0,
        "input": { "image_url": "...", "question": "..." },
        "ground_truth": "...",
        "prediction": "...",
        "error": 1.5,
        "confidence": 0.65,
        "slices": ["male_speaker", "low_snr"]
      }
    ]
  }
Comparisons
POST /comparisons

Create a comparison session
Request:

json  {
    "name": "LLaVA vs InstructBLIP",
    "type": "inter_model_same_checkpoint",
    "run_ids": ["uuid1", "uuid2"],
    "benchmark_ids": ["uuid3", "uuid4"],
    "slice_id": "uuid_or_null"
  }

Response: { "comparison_id": "uuid" }

GET /comparisons/{comparison_id}

Fetch comparison data
Response:

json  {
    "id": "uuid",
    "type": "inter_model_same_checkpoint",
    "runs": [...],
    "benchmarks": [...],
    "paired_diff_table": [
      {
        "benchmark": "VQA",
        "run1_score": 0.85,
        "run2_score": 0.82,
        "delta": 0.03
      }
    ],
    "best_of_heatmap": {
      "rows": ["VQA", "OCR", ...],
      "cols": ["checkpoint-1000", "checkpoint-2000", ...],
      "cells": [["run1", "run2", ...]]
    }
  }
Slices & Fairness
GET /slices

List all available slices
Response: { "slices": [...] }

GET /slices/{slice_id}/metrics

Fetch metrics for a specific slice across all runs
Response:

json  {
    "slice": "male_speakers",
    "metrics": [
      {
        "run_id": "uuid",
        "benchmark": "ASR",
        "metric_value": 0.88
      }
    ]
  }
WebSocket (Real-time Updates)
ws://localhost:8000/ws/runs/{run_id}

Subscribe to real-time updates for a run
Messages:

json  {
    "type": "progress",
    "data": {
      "completed_tasks": 5,
      "total_tasks": 10,
      "items_per_second": 2.5,
      "current_benchmark": "VQA"
    }
  }
json  {
    "type": "metric_update",
    "data": {
      "benchmark_id": "uuid",
      "metric_name": "accuracy",
      "metric_value": 0.87
    }
  }
json  {
    "type": "log_line",
    "data": {
      "timestamp": "2025-01-15T10:05:30Z",
      "level": "INFO",
      "message": "Starting benchmark VQA..."
    }
  }

6. Frontend Component Architecture
Page Structure
1. Run Launcher (/launcher)
Purpose: Create and configure new evaluation runs
Components:

ModelPicker: Dropdown/search to select model; auto-loads available checkpoints from model registry
BenchmarkTree: Hierarchical tree grouped by modality (Vision, Audio, Video, Text); checkboxes for multi-select
ConfigGrid: Input controls for seed, shots, temperature, compute_profile (GPU type/count)
DryRunPreview: Table showing N tasks, estimated duration, GPU memory requirements
LaunchButton: Submits run config to backend; redirects to Live Queue on success

State:

Selected model, benchmark IDs, config params
Dry-run preview data (computed on-demand)

Data Sources:

Supabase queries: models, benchmarks, model_checkpoints

2. Live Queue & Run Detail (/runs and /runs/{run_id})
Purpose: Monitor active and completed runs
Components:

RunQueueTable: Sortable, filterable table showing all runs with status chips, GPU badges
RunDetailPanel (side-by-side or modal):

Progress Card: Progress bar, % complete, items/s, ETA
LogConsole: Real-time scrolling log tail with level filtering (DEBUG/INFO/WARNING/ERROR)
MetricsCard: Live metric updates for each active benchmark (scrollable or tabbed)
ArtifactsList: Links to config YAML, full logs, predictions CSV
SampleCarousel: Preview first K samples with input, prediction, ground truth



Real-time Updates:

WebSocket subscription on /ws/runs/{run_id}
Frontend updates progress bar, metrics, logs on each message

State:

Selected run ID, log scroll position, expanded metrics, sample carousel index

Data Sources:

Supabase: runs, run_metrics (real-time), run_logs
WebSocket: live progress and metric deltas

3. Leaderboard (/leaderboard)
Purpose: Compare model performance across benchmarks
Components:

FilterBar:

Benchmark selector: dropdown (e.g., "VQA", "OCR", "ASR")
Slice selector: multi-select (e.g., "male_speakers", "chart_type_pie")
Checkpoint mode toggle: "best of model (across checkpoints)" vs "specific checkpoint index"
Sort options: score (desc), last run date, model name


LeaderboardTable:

Columns: Rank, Model, Best Checkpoint (or specific), Score, Last Run Date, Actions
Row highlighting for pinned models
Multi-metric columns when applicable (e.g., CIDEr + BLEU side-by-side)
Click row → Model Detail page


PinButton: Pin models for quick side-by-side comparison

State:

Selected benchmark, slices, checkpoint mode, sort order, pinned models

Data Sources:

Supabase: run_metrics (filtered by benchmark, slice), models, runs

4. Model Detail (/models/{model_id})
Purpose: Deep-dive into a single model's performance
Components:

Header:

Model name, family, source (HF URI)
Metadata: dtype, num_parameters, description, links


ScoresGrid: Heatmap of benchmarks (rows) × checkpoints (columns); cell shows best score; color gradient
TrendLines: Line chart showing metric value vs. checkpoint index (e.g., accuracy improvement over iterations)
ArtifactsSection: Links to configs, environment hashes, model weights
DataAssociatedSection: Tabs for per-run samples, per-benchmark error distributions

State:

Selected checkpoint for detail view, metric selection, error distribution sorting

Data Sources:

Supabase: models, runs, run_metrics, run_samples, artifacts

5. Failure-Case Explorer (/failures or tab in Run Detail)
Purpose: Diagnose and analyze failure modes
Components:

FilterBar:

Sort by: largest error, lowest confidence, mismatch type
Benchmark filter
Slice filter


SampleViewer:

Left pane: input media (image, audio snippet, video frame, or text) with zoom/play controls
Center pane: ground truth vs. prediction side-by-side
Right pane: per-example metrics, slices, confidence
Navigation: prev/next buttons or paginated list


ErrorBuckets: Optional grouped view (e.g., failures due to "OCR required", "low resolution", etc.)

State:

Current sample index, sort method, filters

Data Sources:

Supabase: run_samples (sorted/filtered)

6. Comparison Modes (/compare)
Purpose: Multi-model and multi-checkpoint analysis
Components:

ComparisonTypeSelector: Radio buttons for mode (intra-model cross-checkpoint, inter-model same-checkpoint, best-of-N heatmap, release candidate)
RunSelector: Multi-select to pick runs for comparison
VisualizationArea:

Intra-model (same dataset split): Paired per-example diff, BEESWARM plot, paired scatter of scores
Inter-model (same checkpoint): Two-color scheme (e.g., blue vs. red bars), BEESWARM plot
Best-of-N Heatmap: Rows = benchmarks, cols = checkpoints, cell highlights best-score holder; click to drill down
Release Candidate: Regression table (metric, baseline, candidate, delta, sigma units); blocking regressions highlighted in red


ExportButton: Export comparison as PDF or CSV

State:

Selected runs, visualization mode, selected benchmarks, regression threshold (σ)

Data Sources:

Supabase: runs, run_metrics, run_samples (for paired diffs)

7. Slices & Fairness Dashboard (/slices)
Purpose: Analyze fairness and domain-specific performance
Components:

GlobalSliceSelector: Dropdown or filter pills for all slices; applies across all pages (persists in URL/context)
SliceMetricsTable: All metrics recomputed for selected slice(s)
SliceComparison: Bar chart or heatmap showing metric deltas by slice
CoverageAnalysis: Pie/bar chart showing sample distribution across slices

State:

Selected slices (global state, used by all pages)

Data Sources:

Supabase: slices, run_metrics (pre-filtered by slice)

8. Dashboard Home (/)
Purpose: Overview and recent activity
Components:

WidgetGrid:

Recent runs card: Last 5 runs with status
Model ranking: Top 5 models by average score across all benchmarks
Leaderboard highlights: Top benchmark performers
Activity timeline: Recent completions
System status: GPU utilization, queue depth (if available)


QuickLinks: Buttons to launch, queue, leaderboards, comparisons

State:

Time range filter (e.g., last 7 days)

Data Sources:

Supabase: runs, run_metrics, aggregations

Shared Components

Header/Nav: Navigation bar with logo, links to all pages, user profile, global slice selector
SidePanel: Collapsible sidebar with pinned models, recent runs, favorites
DataTable: Reusable table with sorting, filtering, pagination (using TanStack Table)
MetricCard: Display metric value, unit, change indicator (↑/↓), sparkline
StatusBadge: Visual indicator for run status (pending, running, completed, failed)
LoadingSpinner: Animated loader for data fetching

State Management
Context API Structure:
AppContext
├── AuthContext (user, token)
├── RunsContext (active runs, cached run data)
├── SliceContext (global slice selection)
├── UIContext (theme, sidebar state, pinned models)
└── NotificationContext (toast messages, error alerts)
Data Fetching Strategy:

Use React Query (TanStack Query) for server state management
Queries cache API responses; invalidate on mutations
WebSocket updates merge into React Query cache for seamless real-time UX


7. Backend Implementation Details
FastAPI Application Structure
backend/
├── main.py                    # FastAPI app setup, middleware, routes
├── config.py                  # Environment vars, Supabase config
├── auth.py                    # JWT verification, Supabase Auth integration
├── database.py                # Supabase client, connection pooling
├── scheduler.py               # APScheduler for background tasks
├── websocket_manager.py       # WebSocket connection handling
├── runners/
│   ├── lmms_eval_runner.py   # Wrapper around lmms-eval CLI
│   ├── gpu_scheduler.py       # GPU allocation logic
│   └── process_monitor.py     # Process lifecycle, log streaming
├── services/
│   ├── run_service.py         # Run CRUD, business logic
│   ├── metric_service.py      # Metric aggregation, slicing logic
│   ├── model_service.py       # Model registry, checkpoint management
│   └── comparison_service.py  # Comparison computations
├── api/
│   ├── runs.py                # Run endpoints
│   ├── benchmarks.py          # Benchmark endpoints
│   ├── models.py              # Model endpoints
│   ├── leaderboard.py         # Leaderboard endpoints
│   ├── comparisons.py         # Comparison endpoints
│   └── slices.py              # Slice endpoints
├── tasks/
│   ├── run_executor.py        # Celery/APScheduler task: execute run
│   └── metric_aggregator.py   # Scheduled task: recompute aggregations
└── utils/
    ├── logging.py             # Structured logging
    └── file_handler.py        # Upload/download artifacts
Key Modules
runners/lmms_eval_runner.py
Responsibility: Interface between backend and lmms-eval CLI
pythonclass LMMSEvalRunner:
    def __init__(self, model_id, benchmarks, config):
        self.model_id = model_id
        self.benchmarks = benchmarks
        self.config = config
        self.process = None
        self.log_file = None

    def prepare_command(self) -> List[str]:
        """Build lmms-eval CLI command with args."""
        # Construct command like:
        # python -m lmms_eval --model llava --benchmark coco_caption --shots 0 ...
        pass

    def start(self) -> int:
        """Spawn subprocess, return PID."""
        # subprocess.Popen, capture stdout/stderr
        pass

    def stream_logs(self) -> Generator[str]:
        """Yield log lines in real-time."""
        # Read from process.stdout, yield to WebSocket
        pass

    def parse_metrics(self, output: str) -> Dict:
        """Parse lmms-eval output JSON, extract metrics."""
        pass

    def cleanup(self):
        """Terminate process, clean up resources."""
        pass
runners/gpu_scheduler.py
Responsibility: Allocate GPUs to runs based on compute profile
pythonclass GPUScheduler:
    def __init__(self, available_gpus: List[str]):
        # e.g., ["cuda:0", "cuda:1", "cuda:2:3"] (GPU 2 and 3)
        self.available_gpus = available_gpus
        self.allocations = {}  # run_id -> [gpu_ids]

    def allocate(self, run_id: str, compute_profile: str) -> List[str]:
        """
        Given compute profile (e.g., "4070-8GB", "2×A100"),
        return list of GPU IDs to use.
        """
        pass

    def deallocate(self, run_id: str):
        """Free up GPUs after run completion."""
        pass
services/metric_service.py
Responsibility: Aggregate metrics, apply slicing
pythonclass MetricService:
    def __init__(self, supabase_client):
        self.db = supabase_client

    def get_leaderboard(self, benchmark_id: str, slice_id: Optional[str]) -> List[Dict]:
        """
        Query run_metrics for a benchmark, optionally filtered by slice.
        Return sorted list of (model, score, run_id, checkpoint, last_run_date).
        """
        pass

    def compute_run_metrics(self, run_id: str) -> Dict:
        """
        Aggregate per-sample metrics into per-benchmark metrics.
        Cache in run_metrics table.
        """
        pass

    def compute_slice_metrics(self, run_id: str, slice_id: str) -> Dict:
        """
        Filter run_samples by slice, recompute metrics for subset.
        """
        pass

    def get_comparison_diff(self, run_id_1: str, run_id_2: str, dataset_split: str) -> List[Dict]:
        """
        For paired comparison (same dataset), compute per-sample diffs.
        Return list of (benchmark, metric, sample_index, pred1, pred2, diff).
        """
        pass
tasks/run_executor.py
Responsibility: Main orchestration task (APScheduler or Celery)
pythonasync def execute_run(run_id: str):
    """
    1. Fetch run config from DB
    2. Allocate GPU
    3. Spawn LMMSEvalRunner
    4. Stream logs and metrics to WebSocket + DB
    5. On completion, compute final metrics, mark run as done
    6. Handle errors, cleanup
    """
    db = get_supabase()
    run = db.get_run(run_id)
    
    gpu_scheduler = GPUScheduler(available_gpus)
    gpus = gpu_scheduler.allocate(run_id, run.config.compute_profile)
    
    runner = LMMSEvalRunner(run.model_id, run.benchmark_ids, run.config)
    runner.start()
    
    # Stream logs and metrics
    for log_line in runner.stream_logs():
        # Broadcast to WebSocket
        await websocket_manager.broadcast(run_id, {"type": "log_line", "data": log_line})
        # Save to DB
        db.insert_log_line(run_id, log_line)
    
    # Wait for completion
    runner.process.wait()
    
    # Parse final metrics
    metrics = runner.parse_metrics(runner.stdout)
    for benchmark_id, metric_data in metrics.items():
        db.insert_metrics(run_id, benchmark_id, metric_data)
    
    # Update run status
    db.update_run(run_id, status="completed")
    
    # Cleanup
    gpu_scheduler.deallocate(run_id)
    runner.cleanup()

8. Integration with lmms-eval
Assumptions about lmms-eval

CLI accepts arguments: --model, --benchmark, --shots, --seed, --temperature
Outputs JSON metrics to stdout or file
Supports streaming intermediate results

Wrapper Strategy

Model Loading: lmms-eval handles model instantiation from HF URI or local path
Benchmark Loading: lmms-eval loads benchmark from its registry
Evaluation Loop: lmms-eval runs samples, computes metrics
Output Parsing: Backend parses JSON output, inserts into Supabase
Logging: Backend captures stderr for real-time log stream

Example Command Invocation
bashpython -m lmms_eval \
  --model llava \
  --model_args "pretrained=liuhaotian/llava-v1.5-7b,conv_template=vicuna_v1" \
  --benchmark coco_caption \
  --tasks 100 \
  --shots 0 \
  --seed 42 \
  --output /tmp/results.json \
  --device cuda:0 \
  --batch_size 1

9. Real-time Updates & Streaming
WebSocket Architecture
Connection Lifecycle:

Frontend opens WS connection to /ws/runs/{run_id}
Backend subscribes to Supabase real-time updates on runs, run_metrics, run_logs
On any update, backend broadcasts to all connected WebSocket clients
On client disconnect, unsubscribe from Supabase

Message Types:

progress: Updated task count, ETA
metric_update: New metric value
log_line: New log entry
error: Run error or connection issue

Supabase Real-time Integration
Setup:

Enable real-time on specific tables: runs, run_metrics, run_logs
Configure row-level security to ensure users only see their own runs

Backend Listener:
pythondef listen_to_run_updates(run_id: str):
    """Subscribe to changes for a run."""
    supabase.on("runs", Event.UPDATE, lambda payload: broadcast_update(run_id, payload)).subscribe()
    supabase.on("run_metrics", Event.INSERT, lambda payload: broadcast_metric(run_id, payload)).subscribe()
Frontend Subscription
React Hook:
typescriptuseEffect(() => {
  const ws = new WebSocket(`ws://localhost:8000/ws/runs/${runId}`);
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "progress") {
      setProgress(msg.data);
    } else if (msg.type === "metric_update") {
      updateMetric(msg.data);
    }
    // ...
  };
  return () => ws.close();
}, [runId]);

10. Deployment Architecture
Docker Composition
yamlversion: '3.8'
services:
  frontend:
    image: lmms-eval-frontend:latest
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://backend:8000/api/v1
      REACT_APP_WS_URL: ws://backend:8000
    depends_on:
      - backend

  backend:
    image: lmms-eval-backend:latest
    ports:
      - "8000:8000"
    environment:
      SUPABASE_URL: $SUPABASE_URL
      SUPABASE_KEY: $SUPABASE_KEY
      REDIS_URL: redis://redis:6379
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # GPU access
      - ./logs:/app/logs
    depends_on:
      - redis
      - lmms-eval-runner

  redis:
    image: redis:latest
    ports:
      - "6379:6379"

  lmms-eval-runner:
    image: lmms-eval-runner:latest
    environment:
      CUDA_VISIBLE_DEVICES: 0,1,2,3  # Adjust for your GPUs
    volumes:
      - /data:/data  # Mount model cache, dataset directories
      - ./artifacts:/artifacts
    command: tail -f /dev/null  # Keep running for spawned processes
Kubernetes Deployment (Optional)
For production at scale:

Frontend: Kubernetes Deployment + Service + Ingress
Backend: Kubernetes Deployment + Service
Worker Pods: Kubernetes Job for each run executor (dynamic scaling)
Database: Supabase (managed service, no K8s config needed)
Cache: Redis StatefulSet

CI/CD Pipeline
GitHub Actions:

On push to main:

Run unit tests (backend, frontend)
Build Docker images
Push to registry (Docker Hub, ECR, etc.)
Deploy to staging environment


On tag (e.g., v1.0.0):

Deploy to production




11. Security Considerations

Authentication: Supabase Auth with JWT tokens; refresh tokens for long-lived sessions
Authorization: Row-level security (RLS) at database layer; API-layer checks for run ownership
API Rate Limiting: Use middleware to limit requests per user/IP
Data Validation: Validate all inputs (model_id, benchmark_ids, config params) before DB/subprocess use
Artifact Access: Sign URLs for Supabase Storage; time-limited access tokens
Logging: Do not log sensitive data (model weights, API keys); sanitize logs before display


12. Monitoring & Observability

Application Metrics:

Run success/failure rate
Average run duration
GPU utilization
API response times


Logs:

Centralize logs in Supabase or ELK stack
Tag logs by run_id, user, component


Alerting:

Alert on run failures (email or Slack)
Alert on high error rates in API


Dashboards:

System health dashboard (uptime, error rates, queue depth)
Usage analytics (runs per day, popular models)




13. Future Enhancements

Batch Run Scheduling: Queue multiple runs with different hyperparameter sweeps
Distributed Evaluation: Run benchmarks across multiple machines
Custom Benchmarks: User-uploaded benchmark configs
Model Fine-tuning Integration: Checkpoint adaptation based on failure analysis
Export & Publishing: Publish leaderboards to external platforms
Collaboration: Multi-user org workspaces with shared runs and comparisons
Cost Tracking: Monitor compute spend per run, model, or user
A/B Testing Framework: Structured experiment templates for model comparison


14. Development Roadmap
Phase 1 (MVP)

Sprint 1: Backend scaffolding, Supabase schema, lmms-eval runner wrapper
Sprint 2: Run creation, execution, and status tracking
Sprint 3: Frontend Run Launcher and Live Queue views
Sprint 4: Basic Leaderboard and Model Detail pages
Testing: Unit and integration tests for backend; snapshot tests for frontend

Phase 2 (Enhancement)

Failure explorer, comparison modes, slicing logic
WebSocket real-time updates
Advanced visualization components
Performance optimization (caching, query optimization)

Phase 3 (Production)

Security audit and hardening
Multi-tenant setup and billing integration
Deployment to production infrastructure
Documentation and user guides


15. Key Files to Create
Backend:

backend/main.py (FastAPI app)
backend/database.py (Supabase client)
backend/runners/lmms_eval_runner.py (lmms-eval wrapper)
backend/services/run_service.py, metric_service.py, etc.
backend/tasks/run_executor.py (main orchestration)
backend/api/runs.py, benchmarks.py, models.py, etc. (endpoint definitions)

Frontend:

frontend/pages/Launcher.tsx
frontend/pages/RunDetail.tsx
frontend/pages/Leaderboard.tsx
frontend/pages/ModelDetail.tsx
frontend/pages/FailureExplorer.tsx
frontend/pages/Comparison.tsx
frontend/contexts/RunContext.tsx, SliceContext.tsx, etc.
frontend/hooks/useRuns.ts, useMetrics.ts, etc.
frontend/components/RunQueueTable.tsx, MetricsCard.tsx, etc.

Database:

Supabase SQL migration files defining schema
RLS policies

DevOps:

Dockerfile (frontend and backend)
docker-compose.yml
k8s/ directory (if using Kubernetes)
.github/workflows/ci-cd.yml


Conclusion
This documentation provides a comprehensive blueprint for building a production-ready web dashboard and GUI for lmms-eval. The modular architecture supports iterative development, with clear separation between frontend, backend, and database layers. Integration with Supabase enables real-time collaboration and scalability, while the detailed API specification allows for straightforward implementation and testing.
Start with Phase 1 (MVP) to validate the core workflow, then incrementally add advanced features in subsequent phases.