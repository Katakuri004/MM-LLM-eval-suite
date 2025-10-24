-- Enhance evaluation schema for comprehensive results storage
-- This migration adds support for detailed metrics, per-sample results, and enhanced metadata

-- Add more detailed metrics storage to evaluation_results
ALTER TABLE evaluation_results ADD COLUMN all_metrics JSONB;
ALTER TABLE evaluation_results ADD COLUMN per_sample_results JSONB;
ALTER TABLE evaluation_results ADD COLUMN model_responses TEXT[];
ALTER TABLE evaluation_results ADD COLUMN error_analysis JSONB;
ALTER TABLE evaluation_results ADD COLUMN performance_score FLOAT;
ALTER TABLE evaluation_results ADD COLUMN primary_metrics JSONB;

-- Add evaluation metadata columns
ALTER TABLE evaluations ADD COLUMN total_samples INTEGER;
ALTER TABLE evaluations ADD COLUMN successful_samples INTEGER;
ALTER TABLE evaluations ADD COLUMN failed_samples INTEGER;
ALTER TABLE evaluations ADD COLUMN avg_inference_time_ms FLOAT;
ALTER TABLE evaluations ADD COLUMN peak_memory_usage_mb FLOAT;
ALTER TABLE evaluations ADD COLUMN peak_cpu_usage_percent FLOAT;
ALTER TABLE evaluations ADD COLUMN evaluation_metadata JSONB;

-- Add indexes for efficient querying
CREATE INDEX idx_evaluation_results_all_metrics ON evaluation_results USING GIN (all_metrics);
CREATE INDEX idx_evaluation_results_performance_score ON evaluation_results(performance_score);
CREATE INDEX idx_evaluation_results_primary_metrics ON evaluation_results USING GIN (primary_metrics);

-- Add indexes for evaluation metadata
CREATE INDEX idx_evaluations_total_samples ON evaluations(total_samples);
CREATE INDEX idx_evaluations_successful_samples ON evaluations(successful_samples);
CREATE INDEX idx_evaluations_avg_inference_time ON evaluations(avg_inference_time_ms);
CREATE INDEX idx_evaluations_evaluation_metadata ON evaluations USING GIN (evaluation_metadata);

-- Add comments explaining the new columns
COMMENT ON COLUMN evaluation_results.all_metrics IS 'All metrics extracted from lmms-eval output (JSON format)';
COMMENT ON COLUMN evaluation_results.per_sample_results IS 'Per-sample predictions and results (JSON format)';
COMMENT ON COLUMN evaluation_results.model_responses IS 'Array of model responses for each sample';
COMMENT ON COLUMN evaluation_results.error_analysis IS 'Error analysis and debugging information (JSON format)';
COMMENT ON COLUMN evaluation_results.performance_score IS 'Overall performance score (0-1) calculated from primary metrics';
COMMENT ON COLUMN evaluation_results.primary_metrics IS 'Key performance metrics (accuracy, F1, BLEU, etc.)';

COMMENT ON COLUMN evaluations.total_samples IS 'Total number of samples processed';
COMMENT ON COLUMN evaluations.successful_samples IS 'Number of successfully processed samples';
COMMENT ON COLUMN evaluations.failed_samples IS 'Number of failed samples';
COMMENT ON COLUMN evaluations.avg_inference_time_ms IS 'Average inference time per sample in milliseconds';
COMMENT ON COLUMN evaluations.peak_memory_usage_mb IS 'Peak memory usage during evaluation in MB';
COMMENT ON COLUMN evaluations.peak_cpu_usage_percent IS 'Peak CPU usage during evaluation as percentage';
COMMENT ON COLUMN evaluations.evaluation_metadata IS 'Additional evaluation metadata (JSON format)';

-- Create a view for easy access to comprehensive results
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

-- Create a view for performance analytics
CREATE OR REPLACE VIEW evaluation_performance_analytics AS
SELECT 
    e.id as evaluation_id,
    e.name as evaluation_name,
    e.status,
    e.total_samples,
    e.successful_samples,
    e.failed_samples,
    e.avg_inference_time_ms,
    e.peak_memory_usage_mb,
    e.peak_cpu_usage_percent,
    e.duration_seconds,
    COUNT(er.id) as benchmark_count,
    AVG(er.performance_score) as avg_performance_score,
    MAX(er.performance_score) as max_performance_score,
    MIN(er.performance_score) as min_performance_score,
    AVG(er.execution_time_seconds) as avg_benchmark_time,
    SUM(er.samples_count) as total_processed_samples
FROM evaluations e
LEFT JOIN evaluation_results er ON e.id = er.evaluation_id
WHERE e.status IN ('completed', 'completed_partial', 'failed_partial')
GROUP BY e.id, e.name, e.status, e.total_samples, e.successful_samples, 
         e.failed_samples, e.avg_inference_time_ms, e.peak_memory_usage_mb, 
         e.peak_cpu_usage_percent, e.duration_seconds;
