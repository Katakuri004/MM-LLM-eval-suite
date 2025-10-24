-- Comprehensive migration to add all missing columns for evaluation system
-- This migration combines all the necessary schema changes

-- 1. Add checkpoint tracking columns
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS checkpoint_data JSONB;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS last_checkpoint_at TIMESTAMP;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS resume_count INTEGER DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS retry_status VARCHAR(50);
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS retry_errors JSONB;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS retry_completed_at TIMESTAMP;

-- 2. Add partial results tracking columns
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT FALSE;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS completed_benchmarks_count INTEGER DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS total_benchmarks_count INTEGER;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS last_partial_save_at TIMESTAMP;

-- 3. Add enhanced evaluation schema columns
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS total_samples INTEGER;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS successful_samples INTEGER;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS failed_samples INTEGER;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS avg_inference_time_ms FLOAT;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS peak_memory_usage_mb FLOAT;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS peak_cpu_usage_percent FLOAT;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS evaluation_metadata JSONB;

-- 4. Add enhanced results columns
ALTER TABLE evaluation_results ADD COLUMN IF NOT EXISTS all_metrics JSONB;
ALTER TABLE evaluation_results ADD COLUMN IF NOT EXISTS per_sample_results JSONB;
ALTER TABLE evaluation_results ADD COLUMN IF NOT EXISTS model_responses TEXT[];
ALTER TABLE evaluation_results ADD COLUMN IF NOT EXISTS error_analysis JSONB;
ALTER TABLE evaluation_results ADD COLUMN IF NOT EXISTS performance_score FLOAT;
ALTER TABLE evaluation_results ADD COLUMN IF NOT EXISTS primary_metrics JSONB;
ALTER TABLE evaluation_results ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT FALSE;

-- 5. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_evaluations_checkpoint_data ON evaluations USING GIN (checkpoint_data);
CREATE INDEX IF NOT EXISTS idx_evaluations_last_checkpoint ON evaluations(last_checkpoint_at);
CREATE INDEX IF NOT EXISTS idx_evaluations_resume_count ON evaluations(resume_count);
CREATE INDEX IF NOT EXISTS idx_evaluations_retry_count ON evaluations(retry_count);
CREATE INDEX IF NOT EXISTS idx_evaluations_retry_status ON evaluations(retry_status);
CREATE INDEX IF NOT EXISTS idx_evaluations_is_partial ON evaluations(is_partial);
CREATE INDEX IF NOT EXISTS idx_evaluations_completed_count ON evaluations(completed_benchmarks_count, total_benchmarks_count);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_all_metrics ON evaluation_results USING GIN (all_metrics);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_performance_score ON evaluation_results(performance_score);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_primary_metrics ON evaluation_results USING GIN (primary_metrics);
CREATE INDEX IF NOT EXISTS idx_evaluations_total_samples ON evaluations(total_samples);
CREATE INDEX IF NOT EXISTS idx_evaluations_successful_samples ON evaluations(successful_samples);
CREATE INDEX IF NOT EXISTS idx_evaluations_avg_inference_time ON evaluations(avg_inference_time_ms);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluation_metadata ON evaluations USING GIN (evaluation_metadata);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_is_partial ON evaluation_results(is_partial);

-- 6. Add comments explaining the new columns
COMMENT ON COLUMN evaluations.checkpoint_data IS 'Checkpoint data for resuming interrupted evaluations (JSON format)';
COMMENT ON COLUMN evaluations.last_checkpoint_at IS 'Timestamp of the last checkpoint save';
COMMENT ON COLUMN evaluations.resume_count IS 'Number of times this evaluation has been resumed from checkpoint';
COMMENT ON COLUMN evaluations.retry_count IS 'Number of retry attempts for this evaluation';
COMMENT ON COLUMN evaluations.retry_status IS 'Current retry status (pending, retrying, success, failed, circuit_open)';
COMMENT ON COLUMN evaluations.retry_errors IS 'List of errors encountered during retry attempts (JSON format)';
COMMENT ON COLUMN evaluations.retry_completed_at IS 'Timestamp when retry process completed';
COMMENT ON COLUMN evaluations.is_partial IS 'Indicates if the evaluation has partial results (not all benchmarks completed)';
COMMENT ON COLUMN evaluations.completed_benchmarks_count IS 'Number of benchmarks that have been completed';
COMMENT ON COLUMN evaluations.total_benchmarks_count IS 'Total number of benchmarks in the evaluation';
COMMENT ON COLUMN evaluations.last_partial_save_at IS 'Timestamp of the last partial result save';
COMMENT ON COLUMN evaluations.total_samples IS 'Total number of samples processed';
COMMENT ON COLUMN evaluations.successful_samples IS 'Number of successfully processed samples';
COMMENT ON COLUMN evaluations.failed_samples IS 'Number of failed samples';
COMMENT ON COLUMN evaluations.avg_inference_time_ms IS 'Average inference time per sample in milliseconds';
COMMENT ON COLUMN evaluations.peak_memory_usage_mb IS 'Peak memory usage during evaluation in MB';
COMMENT ON COLUMN evaluations.peak_cpu_usage_percent IS 'Peak CPU usage during evaluation as percentage';
COMMENT ON COLUMN evaluations.evaluation_metadata IS 'Additional evaluation metadata (JSON format)';

COMMENT ON COLUMN evaluation_results.all_metrics IS 'All metrics extracted from lmms-eval output (JSON format)';
COMMENT ON COLUMN evaluation_results.per_sample_results IS 'Per-sample predictions and results (JSON format)';
COMMENT ON COLUMN evaluation_results.model_responses IS 'Array of model responses for each sample';
COMMENT ON COLUMN evaluation_results.error_analysis IS 'Error analysis and debugging information (JSON format)';
COMMENT ON COLUMN evaluation_results.performance_score IS 'Overall performance score (0-1) calculated from primary metrics';
COMMENT ON COLUMN evaluation_results.primary_metrics IS 'Key performance metrics (accuracy, F1, BLEU, etc.)';
COMMENT ON COLUMN evaluation_results.is_partial IS 'Indicates if this result was saved as a partial result';

-- 7. Create views for checkpoint and retry management
CREATE OR REPLACE VIEW evaluation_checkpoints AS
SELECT 
    e.id as evaluation_id,
    e.name as evaluation_name,
    e.status,
    e.checkpoint_data,
    e.last_checkpoint_at,
    e.resume_count,
    e.retry_count,
    e.retry_status,
    e.retry_errors,
    e.retry_completed_at,
    e.created_at,
    e.updated_at,
    CASE 
        WHEN e.checkpoint_data IS NOT NULL 
        AND e.last_checkpoint_at > NOW() - INTERVAL '24 hours'
        AND e.status IN ('running', 'failed', 'failed_partial')
        THEN true 
        ELSE false 
    END as can_resume,
    CASE 
        WHEN e.checkpoint_data IS NOT NULL 
        THEN jsonb_array_length(e.checkpoint_data->'completed_benchmarks')
        ELSE 0 
    END as completed_benchmarks_count,
    CASE 
        WHEN e.checkpoint_data IS NOT NULL 
        THEN jsonb_array_length(e.checkpoint_data->'benchmark_ids')
        ELSE 0 
    END as total_benchmarks_count,
    CASE 
        WHEN e.checkpoint_data IS NOT NULL 
        THEN (e.checkpoint_data->>'progress_percentage')::float
        ELSE 0 
    END as progress_percentage
FROM evaluations e
WHERE e.checkpoint_data IS NOT NULL;

CREATE OR REPLACE VIEW evaluation_retries AS
SELECT 
    e.id as evaluation_id,
    e.name as evaluation_name,
    e.status,
    e.retry_count,
    e.retry_status,
    e.retry_errors,
    e.retry_completed_at,
    e.created_at,
    e.updated_at,
    CASE 
        WHEN e.retry_status = 'circuit_open' 
        THEN false
        WHEN e.retry_count >= 3 
        THEN false
        WHEN e.status IN ('failed', 'failed_partial')
        AND e.retry_status IS NULL
        THEN true
        ELSE false
    END as can_retry,
    CASE 
        WHEN e.retry_errors IS NOT NULL 
        THEN jsonb_array_length(e.retry_errors)
        ELSE 0 
    END as error_count
FROM evaluations e
WHERE e.retry_count > 0 OR e.retry_status IS NOT NULL;

-- 8. Create comprehensive results view
CREATE OR REPLACE VIEW comprehensive_evaluation_results AS
SELECT 
    e.id as evaluation_id,
    e.name as evaluation_name,
    e.status,
    e.is_partial,
    e.completed_benchmarks_count,
    e.total_benchmarks_count,
    e.total_samples,
    e.successful_samples,
    e.failed_samples,
    e.avg_inference_time_ms,
    e.peak_memory_usage_mb,
    e.peak_cpu_usage_percent,
    e.created_at,
    e.completed_at,
    e.duration_seconds,
    er.benchmark_id,
    er.benchmark_name,
    er.task_name,
    er.metrics,
    er.scores,
    er.all_metrics,
    er.performance_score,
    er.primary_metrics,
    er.samples_count,
    er.execution_time_seconds,
    er.is_partial as result_is_partial
FROM evaluations e
LEFT JOIN evaluation_results er ON e.id = er.evaluation_id
WHERE e.status IN ('completed', 'completed_partial', 'failed_partial');
