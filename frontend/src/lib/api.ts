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
    return this.request<{ status: string; service: string; version: string }>('/health');
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

  // Evaluations API
  async createEvaluation(evaluationData: CreateEvaluationRequest) {
    return this.request<EvaluationResponse>('/evaluations', {
      method: 'POST',
      body: JSON.stringify(evaluationData),
    });
  }

  async getEvaluations(skip = 0, limit = 100) {
    return this.request<{ evaluations: Evaluation[]; total: number }>(`/evaluations?skip=${skip}&limit=${limit}`);
  }

  async getEvaluation(id: string) {
    return this.request<Evaluation>(`/evaluations/${id}`);
  }

  async getEvaluationStatus(id: string) {
    return this.request<EvaluationStatus>(`/evaluations/${id}/status`);
  }

  async getEvaluationResults(id: string) {
    return this.request<EvaluationResults>(`/evaluations/${id}/results`);
  }

  async cancelEvaluation(id: string) {
    return this.request<{ message: string }>(`/evaluations/${id}`, {
      method: 'DELETE',
    });
  }

  async getActiveEvaluations() {
    return this.request<{ active_runs: string[] }>('/evaluations/active');
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

export interface Evaluation {
  id: string;
  name: string;
  model_id: string;
  checkpoint_variant: string;
  benchmark_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  config: Record<string, any>;
  results: Record<string, any>;
  logs?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationStatus {
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

export interface EvaluationResults {
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

export interface CreateEvaluationRequest {
  model_id: string;
  benchmark_ids: string[];
  config: Record<string, any>;
  run_name?: string;
}

export interface EvaluationResponse {
  run_id: string;
  status: string;
  message: string;
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
