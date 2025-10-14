/**
 * API service layer for LMMS-Eval Dashboard
 * Handles all backend communication with proper error handling
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.detail || errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        error
      );
    }
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string; service: string; version: string; database: string; mode: string; features: any }>('/health');
  }

  // Models API
  async getModels(skip = 0, limit = 100) {
    return this.request<{ models: Model[]; total: number }>(`/models?skip=${skip}&limit=${limit}`);
  }

  async getModel(id: string) {
    return this.request<Model>(`/models/${id}`);
  }

  async createModel(modelData: CreateModelRequest) {
    return this.request<Model>('/models', {
      method: 'POST',
      body: JSON.stringify(modelData),
    });
  }

  // Benchmarks API
  async getBenchmarks(skip = 0, limit = 100) {
    return this.request<{ benchmarks: Benchmark[]; total: number }>(`/benchmarks?skip=${skip}&limit=${limit}`);
  }

  async getBenchmark(id: string) {
    return this.request<Benchmark>(`/benchmarks/${id}`);
  }

  async createBenchmark(benchmarkData: CreateBenchmarkRequest) {
    return this.request<Benchmark>('/benchmarks', {
      method: 'POST',
      body: JSON.stringify(benchmarkData),
    });
  }

  // Runs API (evaluations are called "runs" in the backend)
  async createRun(runData: CreateRunRequest) {
    return this.request<RunResponse>('/runs/create', {
      method: 'POST',
      body: JSON.stringify(runData),
    });
  }

  async getRuns(skip = 0, limit = 100) {
    return this.request<{ runs: Run[]; total: number }>(`/runs?skip=${skip}&limit=${limit}`);
  }

  async getRun(id: string) {
    return this.request<Run>(`/runs/${id}`);
  }

  async getRunStatus(id: string) {
    return this.request<RunStatus>(`/runs/${id}/status`);
  }

  async getRunResults(id: string) {
    return this.request<RunResults>(`/runs/${id}/results`);
  }

  async cancelRun(id: string) {
    return this.request<{ message: string }>(`/runs/${id}/cancel`, {
      method: 'POST',
    });
  }

  async getActiveRuns() {
    return this.request<{ active_runs: string[] }>('/runs/active');
  }

  // Statistics API
  async getOverviewStats() {
    return this.request<OverviewStats>('/stats/overview');
  }
}

// Type definitions
export interface Model {
  id: string;
  name: string;
  family: string;
  source: string;
  dtype: string;
  num_parameters: number;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Benchmark {
  id: string;
  name: string;
  modality: string;
  category: string;
  task_type: string;
  primary_metrics: string[];
  secondary_metrics: string[];
  num_samples: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: string;
  name: string;
  model_id: string;
  checkpoint_variant: string;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  config: Record<string, any>;
  metadata: Record<string, any>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: string;
  total_tasks: number;
  completed_tasks: number;
  gpu_device_id?: string;
  process_id?: number;
  created_at: string;
  created_by: string;
}

export interface RunStatus {
  run_id: string;
  status: string;
  is_active: boolean;
  progress: number;
  results: Record<string, any>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: string;
}

export interface RunResults {
  run_id: string;
  status: string;
  results: Record<string, any>;
  individual_results: Array<{
    id: string;
    run_id: string;
    metric_name: string;
    metric_value: number;
    metric_type: string;
    metadata: Record<string, any>;
  }>;
  logs?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: string;
}

export interface CreateModelRequest {
  name: string;
  family: string;
  source: string;
  dtype: string;
  num_parameters: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CreateBenchmarkRequest {
  name: string;
  modality: string;
  category: string;
  task_type: string;
  primary_metrics: string[];
  secondary_metrics: string[];
  num_samples: number;
  description?: string;
}

export interface CreateRunRequest {
  name: string;
  model_id: string;
  benchmark_ids: string[];
  checkpoint_variant?: string;
  config: Record<string, any>;
}

export interface RunResponse {
  run_id: string;
  total_tasks: number;
  estimated_duration_seconds: number;
}

export interface OverviewStats {
  total_models: number;
  total_benchmarks: number;
  total_runs: number;
  status_counts: Record<string, number>;
  active_runs: number;
}

// Create API client instance
export const apiClient = new ApiClient();

// ApiError is already exported as a class above
