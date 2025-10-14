# LMMS-Eval Dashboard API Documentation

## Overview

The LMMS-Eval Dashboard API provides comprehensive endpoints for managing evaluation runs, models, benchmarks, and analytics. This document describes all available endpoints, request/response formats, and authentication requirements.

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Run Management

#### Create Run
```http
POST /runs/create
```

**Request Body:**
```json
{
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
```

**Response:**
```json
{
  "run_id": "uuid",
  "total_tasks": 10,
  "estimated_duration_seconds": 3600
}
```

#### Get Run Details
```http
GET /runs/{run_id}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "LLaVA-1.5-7B-VQA-Test",
  "model_id": "uuid",
  "status": "running",
  "created_at": "2025-01-15T10:00:00Z",
  "started_at": "2025-01-15T10:00:00Z",
  "completed_at": null,
  "total_tasks": 10,
  "completed_tasks": 3,
  "progress_percent": 30.0,
  "error_message": null,
  "config": {
    "seed": 42,
    "shots": 0,
    "temperature": 0.0
  }
}
```

#### List Runs
```http
GET /runs?status=running&model_id=uuid&limit=20&offset=0
```

**Response:**
```json
{
  "runs": [...],
  "total": 50,
  "page": 1,
  "page_size": 20
}
```

#### Cancel Run
```http
POST /runs/{run_id}/cancel
```

**Response:**
```json
{
  "status": "cancelled",
  "run_id": "uuid"
}
```

#### Get Run Metrics
```http
GET /runs/{run_id}/metrics?benchmark_id=uuid
```

**Response:**
```json
{
  "run_id": "uuid",
  "metrics": [
    {
      "benchmark_id": "uuid",
      "metric_name": "accuracy",
      "metric_value": 0.85,
      "slice_id": null,
      "sample_count": 1000
    }
  ],
  "count": 1
}
```

### Model Management

#### List Models
```http
GET /models?family=LLaVA&limit=50&offset=0
```

**Response:**
```json
{
  "models": [
    {
      "id": "uuid",
      "name": "LLaVA-1.5-7B",
      "family": "LLaVA",
      "source": "huggingface://llava-hf/llava-1.5-7b-hf",
      "dtype": "float16",
      "num_parameters": 7000000000,
      "notes": "LLaVA 1.5 7B model",
      "created_at": "2025-01-15T10:00:00Z",
      "metadata": {}
    }
  ],
  "total": 10
}
```

#### Get Model Details
```http
GET /models/{model_id}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "LLaVA-1.5-7B",
  "family": "LLaVA",
  "source": "huggingface://llava-hf/llava-1.5-7b-hf",
  "dtype": "float16",
  "num_parameters": 7000000000,
  "notes": "LLaVA 1.5 7B model",
  "created_at": "2025-01-15T10:00:00Z",
  "metadata": {}
}
```

#### Get Model Checkpoints
```http
GET /models/{model_id}/checkpoints
```

**Response:**
```json
[
  {
    "id": "uuid",
    "model_id": "uuid",
    "checkpoint_variant": "checkpoint-1000",
    "checkpoint_index": 0,
    "source": "huggingface://llava-hf/llava-1.5-7b-hf",
    "created_at": "2025-01-15T10:00:00Z",
    "metadata": {}
  }
]
```

### Benchmark Management

#### List Benchmarks
```http
GET /benchmarks?category=VQA&modality=Vision&limit=50&offset=0
```

**Response:**
```json
{
  "benchmarks": [
    {
      "id": "uuid",
      "name": "VQA-v2",
      "modality": "Vision",
      "category": "VQA",
      "task_type": "multiple_choice",
      "primary_metrics": ["accuracy"],
      "secondary_metrics": ["f1_score"],
      "num_samples": 10000,
      "description": "Visual Question Answering benchmark"
    }
  ],
  "total": 5
}
```

#### Get Benchmark Details
```http
GET /benchmarks/{benchmark_id}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "VQA-v2",
  "modality": "Vision",
  "category": "VQA",
  "task_type": "multiple_choice",
  "primary_metrics": ["accuracy"],
  "secondary_metrics": ["f1_score"],
  "num_samples": 10000,
  "description": "Visual Question Answering benchmark"
}
```

### Leaderboard

#### Get Leaderboard
```http
GET /leaderboard/{benchmark_id}?slice_id=uuid&checkpoint_mode=best&sort_by=score&limit=50
```

**Response:**
```json
{
  "benchmark": "VQA-v2",
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
  "slice": "all",
  "total_entries": 25
}
```

### Comparisons

#### Create Comparison
```http
POST /comparisons
```

**Request Body:**
```json
{
  "name": "LLaVA vs InstructBLIP",
  "comparison_type": "inter_model_same_checkpoint",
  "run_ids": ["uuid1", "uuid2"],
  "benchmark_ids": ["uuid3", "uuid4"],
  "slice_id": "uuid_or_null"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "LLaVA vs InstructBLIP",
  "comparison_type": "inter_model_same_checkpoint",
  "run_ids": ["uuid1", "uuid2"],
  "benchmark_ids": ["uuid3", "uuid4"],
  "slice_id": "uuid_or_null",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

#### Get Comparison Details
```http
GET /comparisons/{comparison_id}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "LLaVA vs InstructBLIP",
  "comparison_type": "inter_model_same_checkpoint",
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
```

### Slices and Fairness

#### List Slices
```http
GET /slices?slice_type=audio_gender&limit=50&offset=0
```

**Response:**
```json
{
  "slices": [
    {
      "id": "uuid",
      "name": "male_speakers",
      "slice_type": "audio_gender",
      "slice_value": "male",
      "associated_benchmarks": ["uuid1", "uuid2"],
      "description": "Audio samples with male speakers"
    }
  ],
  "total": 10
}
```

#### Get Slice Metrics
```http
GET /slices/{slice_id}/metrics?benchmark_id=uuid&limit=50&offset=0
```

**Response:**
```json
{
  "slice": "male_speakers",
  "metrics": [
    {
      "run_id": "uuid",
      "benchmark_id": "uuid",
      "metric_name": "accuracy",
      "metric_value": 0.88,
      "sample_count": 500
    }
  ]
}
```

## WebSocket Endpoints

### Real-time Updates
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/runs/{run_id}');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'progress':
      // Update progress bar
      updateProgress(message.data);
      break;
    case 'metric_update':
      // Update metrics display
      updateMetrics(message.data);
      break;
    case 'log_line':
      // Add log line to console
      addLogLine(message.data);
      break;
    case 'error':
      // Handle error
      handleError(message.data);
      break;
  }
};
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "status_code": 400,
  "path": "/api/v1/runs/create"
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:
- 100 requests per minute per user
- 1000 requests per hour per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination:
- `limit`: Number of items per page (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

## Filtering and Sorting

Many endpoints support filtering and sorting:
- `status`: Filter by status
- `model_id`: Filter by model
- `benchmark_id`: Filter by benchmark
- `sort_by`: Sort field
- `order`: Sort order (asc/desc)

## Examples

### Creating a Run
```bash
curl -X POST http://localhost:8000/api/v1/runs/create \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Test Run",
    "model_id": "uuid",
    "benchmark_ids": ["uuid1", "uuid2"],
    "config": {
      "seed": 42,
      "shots": 0
    }
  }'
```

### Getting Run Status
```bash
curl -X GET http://localhost:8000/api/v1/runs/uuid \
  -H "Authorization: Bearer your-jwt-token"
```

### Subscribing to Real-time Updates
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/runs/uuid');

ws.onopen = () => {
  console.log('Connected to run updates');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received update:', message);
};
```
