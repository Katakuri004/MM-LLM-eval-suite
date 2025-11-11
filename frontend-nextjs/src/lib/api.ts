/**
 * API service layer for LMMS-Eval Dashboard
 * Handles all backend communication with proper error handling
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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

  // Normalize potentially double-encoded external IDs from the router
  private normalizeExternalId(id: string): string {
    let s = id
    // decode repeatedly until stable (max 10 times to survive extreme double-encodes)
    for (let i = 0; i < 10; i++) {
      try {
        const d = decodeURIComponent(s)
        if (d === s) break
        s = d
      } catch {
        break
      }
    }
    // remove duplicate external: prefixes
    while (s.startsWith('external:external:')) {
      s = s.slice('external:'.length)
    }
    if (!s.startsWith('external:')) {
      s = `external:${s}`
    }
    return encodeURIComponent(s)
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    // Prevent accidental backend calls for local evaluation ids
    if (endpoint.startsWith('/evaluations/') && endpoint.includes('local:')) {
      throw new ApiError('Local evaluations are not available from backend API', 404);
    }
    
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
        // Normalize message: FastAPI may return detail as string or object
        const detail = (errorData && errorData.detail) as any;
        const normalizedMessage =
          typeof detail === 'string'
            ? detail
            : (detail && (detail.message || detail.error)) ||
              errorData.message ||
              `HTTP ${response.status}`;
        throw new ApiError(normalizedMessage, response.status, errorData);
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
  async getModels(params: { skip?: number; limit?: number; q?: string; family?: string; sort?: string; lean?: boolean } = {}) {
    const { skip = 0, limit = 25, q, family, sort, lean = true } = params;
    const query = new URLSearchParams();
    query.set('skip', String(skip));
    query.set('limit', String(limit));
    if (q) query.set('q', q);
    if (family) query.set('family', family);
    if (sort) query.set('sort', sort);
    if (lean !== undefined) query.set('lean', String(lean));
    return this.request<{ models: Model[]; total: number; skip: number; limit: number }>(`/models?${query.toString()}`);
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

  // Model registration methods
  async registerHuggingFaceModel(config: { model_path: string; auto_detect: boolean }): Promise<any> {
    return this.request('/models/register/huggingface', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async registerLocalModel(config: { model_dir: string; model_name?: string }): Promise<any> {
    return this.request('/models/register/local', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async registerAPIModel(config: { provider: string; model_name: string; api_key: string; endpoint?: string }): Promise<any> {
    return this.request('/models/register/api', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async registerVLLMModel(config: { endpoint_url: string; model_name: string; auth_token?: string }): Promise<any> {
    return this.request('/models/register/vllm', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async registerBatchModels(modelsData: any[]): Promise<any> {
    return this.request('/models/register/batch', {
      method: 'POST',
      body: JSON.stringify({ models_data: modelsData }),
    });
  }

  async detectModelConfig(modelSource: string): Promise<any> {
    // Prefer the alternate endpoint that is confirmed to work; fallback to the original
    try {
      return await this.request(`/models/detect2?model_source=${encodeURIComponent(modelSource)}`, {
        method: 'GET',
      });
    } catch (err) {
      const is404 = err instanceof ApiError && err.status === 404;
      if (!is404) throw err;
      // Fallback to the primary path if alternate is unavailable
      return this.request(`/models/detect?model_source=${encodeURIComponent(modelSource)}`, {
        method: 'GET',
      });
    }
  }

  async validateModel(modelId: string): Promise<any> {
    return this.request(`/models/validate/${modelId}`, {
      method: 'GET',
    });
  }

  async uploadModelFiles(
    files: File[],
    modelData: {
      model_name: string;
      model_family: string;
      model_dtype: string;
      num_parameters: number;
      notes?: string;
      selected_benchmarks?: string[];
    }
  ) {
    const formData = new FormData();
    
    // Add files
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Add model data
    formData.append('model_name', modelData.model_name);
    formData.append('model_family', modelData.model_family);
    formData.append('model_dtype', modelData.model_dtype);
    formData.append('num_parameters', modelData.num_parameters.toString());
    
    if (modelData.notes) {
      formData.append('notes', modelData.notes);
    }
    
    if (modelData.selected_benchmarks) {
      formData.append('selected_benchmarks', JSON.stringify(modelData.selected_benchmarks));
    }

    const response = await fetch(`${this.baseUrl}/models/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }

    return await response.json();
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

  // Model compatibility API
  async getModelCompatibleBenchmarks(modelId: string): Promise<{
    model_id: string;
    model_name: string;
    model_modalities: string[];
    compatible_benchmark_ids: string[];
    incompatible_benchmarks: Array<{id: string; name: string; reason: string}>;
    total_compatible: number;
    total_incompatible: number;
  }> {
    return this.request(`/models/${modelId}/compatible-benchmarks`);
  }

  // Evaluations API (new evaluation system)
  async createEvaluation(data: {
    model_id: string;
    benchmark_ids: string[];
    config: Record<string, any>;
    name?: string;
  }) {
    return this.request<{
      evaluation_id: string;
      status: string;
      message: string;
    }>(`/evaluations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEvaluations(skip = 0, limit = 100, model_id?: string) {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    if (model_id) params.append('model_id', model_id);
    
    return this.request<{ evaluations: any[]; total: number }>(`/evaluations?${params}`);
  }

  async getEvaluation(id: string) {
    if (id && id.startsWith('local:')) {
      throw new ApiError('Local evaluations are not available from backend API', 404)
    }
    return this.request<any>(`/evaluations/${id}`);
  }

  async getEvaluationResults(id: string) {
    if (id && id.startsWith('local:')) {
      throw new ApiError('Local evaluations are not available from backend API', 404)
    }
    return this.request<{ evaluation: any; results: any[]; total_results: number }>(`/evaluations/${id}/results`);
  }

  // External Results Methods
  async getExternalResults() {
    return this.request<{ models: any[]; total: number }>('/external-results');
  }

  async getExternalModel(id: string) {
    const encoded = this.normalizeExternalId(id)
    return this.request<any>(`/external-results/${encoded}`);
  }

  async getExternalModelResults(id: string) {
    const encoded = this.normalizeExternalId(id)
    return this.request<{ model: any; results: any[]; total_results: number }>(`/external-results/${encoded}/results`);
  }

  async getExternalModelSamples(id: string, benchmarkId?: string, limit = 100, offset = 0, opts?: { modality?: string; correctness?: 'correct' | 'incorrect'; search?: string }) {
    const encoded = this.normalizeExternalId(id)
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() })
    if (benchmarkId) params.append('benchmark_id', benchmarkId)
    if (opts?.modality) params.append('modality', opts.modality)
    if (opts?.correctness) params.append('correctness', opts.correctness)
    if (opts?.search) params.append('search', opts.search)
    return this.request<{ model_id: string; benchmark_id?: string; samples: any[]; total: number; limit: number; offset: number; counts?: any }>(`/external-results/${encoded}/samples?${params}`);
  }

  async getExternalModelSampleDetail(id: string, sampleKey: string) {
    const encoded = this.normalizeExternalId(id)
    const sample = encodeURIComponent(sampleKey)
    return this.request<{ model_id: string; benchmark_id?: string; sample: any }>(`/external-results/${encoded}/samples/${sample}`);
  }

  async getExternalModelSamplesSummary(id: string) {
    const encoded = this.normalizeExternalId(id)
    return this.request<{ model_id: string; benchmarks: string[]; total: number; modality_counts: Record<string, number> }>(`/external-results/${encoded}/samples/summary`);
  }

  async getBenchmarkPreview(id: string, benchmarkId: string, limit = 2) {
    const encoded = this.normalizeExternalId(id)
    const bench = encodeURIComponent(benchmarkId)
    const params = new URLSearchParams({ limit: String(limit) })
    return this.request<{ model_id: string; benchmark_id: string; samples: any[]; limit: number }>(`/external-results/${encoded}/benchmarks/${bench}/preview?${params}`)
  }

  async getBenchmarkStats(id: string, benchmarkId: string) {
    const encoded = this.normalizeExternalId(id)
    const bench = encodeURIComponent(benchmarkId)
    return this.request<{ model_id: string; benchmark_id: string; total_samples: number; metrics: any; modality_counts: Record<string, number> }>(`/external-results/${encoded}/benchmarks/${bench}/stats`)
  }

  async cancelEvaluation(id: string) {
    if (id && id.startsWith('local:')) {
      throw new ApiError('Cannot cancel local evaluation', 400)
    }
    return this.request<{ message: string }>(`/evaluations/${id}`, {
      method: 'DELETE',
    });
  }

  async exportEvaluation(
    id: string,
    options: { format: 'json' | 'csv' | 'pdf'; include_samples?: boolean; include_metadata?: boolean }
  ): Promise<any> {
    const params = new URLSearchParams({
      format: options.format,
      include_samples: String(!!options.include_samples),
      include_metadata: String(!!options.include_metadata),
    });
    return this.request(`/evaluations/${id}/export?${params.toString()}`, { method: 'GET' });
  }

  async exportComparison(
    payload: { model_ids: string[]; benchmark_ids?: string[]; format: 'json' | 'csv' | 'pdf'; include_timeline?: boolean }
  ): Promise<any> {
    return this.request('/export/comparison', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getActiveEvaluations() {
    return this.request<{ active_evaluations: any[]; count: number }>('/evaluations/active');
  }

  // Mock evaluations (local results integration via Next.js API routes)
  async getMockEvaluations(): Promise<{ evaluations: any[]; total: number }> {
    const res = await fetch('/api/mock-evaluations', { cache: 'no-store' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data?.error || `HTTP ${res.status}`, res.status, data);
    }
    return res.json();
  }

  async getMockEvaluation(id: string): Promise<any> {
    const encoded = encodeURIComponent(id);
    const res = await fetch(`/api/mock-evaluations/${encoded}`, { cache: 'no-store' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data?.error || `HTTP ${res.status}`, res.status, data);
    }
    return res.json();
  }

  // Legacy Runs API (for backward compatibility)
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

  // ============================================================================
  // TASK MANAGEMENT METHODS
  // ============================================================================

  async getAvailableTasks(): Promise<{ tasks: string[]; count: number }> {
    return this.request<{ tasks: string[]; count: number }>('/tasks/available');
  }

  async refreshTaskCache(): Promise<{ message: string; tasks: string[]; count: number }> {
    return this.request<{ message: string; tasks: string[]; count: number }>('/tasks/refresh', {
      method: 'POST',
    });
  }

  async getCompatibleTasksForModel(modelId: string): Promise<{ model_id: string; compatible_tasks: string[]; count: number }> {
    return this.request<{ model_id: string; compatible_tasks: string[]; count: number }>(`/tasks/compatible/${modelId}`);
  }

  async validateTasks(taskNames: string[]): Promise<{
    validation_results: Record<string, boolean>;
    valid_tasks: string[];
    invalid_tasks: string[];
    valid_count: number;
    invalid_count: number;
  }> {
    return this.request<{
      validation_results: Record<string, boolean>;
      valid_tasks: string[];
      invalid_tasks: string[];
      valid_count: number;
      invalid_count: number;
    }>('/tasks/validate', {
      method: 'POST',
      body: JSON.stringify({ task_names: taskNames }),
    });
  }

  // ============================================================================
  // DEPENDENCY MANAGEMENT METHODS
  // ============================================================================

  async checkModelDependencies(modelId: string): Promise<{
    model_id: string;
    model_name: string;
    display_name: string;
    required_dependencies: string[];
    missing_dependencies: string[];
    all_installed: boolean;
    install_command: string | null;
    total_required: number;
    total_missing: number;
  }> {
    return this.request<{
      model_id: string;
      model_name: string;
      display_name: string;
      required_dependencies: string[];
      missing_dependencies: string[];
      all_installed: boolean;
      install_command: string | null;
      total_required: number;
      total_missing: number;
    }>(`/models/${modelId}/dependencies`);
  }

  async checkAllDependencies(): Promise<{
    dependency_status: Array<{
      model_id: string;
      model_name: string;
      display_name: string;
      missing_dependencies: string[];
      all_installed: boolean;
      install_command: string | null;
      error?: string;
    }>;
    total_models: number;
    models_with_missing_deps: number;
  }> {
    return this.request<{
      dependency_status: Array<{
        model_id: string;
        model_name: string;
        display_name: string;
        missing_dependencies: string[];
        all_installed: boolean;
        install_command: string | null;
        error?: string;
      }>;
      total_models: number;
      models_with_missing_deps: number;
    }>('/dependencies/check');
  }

  async refreshDependencyCache(): Promise<{
    message: string;
    timestamp: string;
  }> {
    return this.request<{
      message: string;
      timestamp: string;
    }>('/dependencies/refresh', {
      method: 'POST',
    });
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
