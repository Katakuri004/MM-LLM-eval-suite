-- Add partial results tracking to evaluations and evaluation_results tables
-- This migration adds support for partial results storage and tracking

-- Add columns to evaluations table for partial results tracking
ALTER TABLE evaluations ADD COLUMN is_partial BOOLEAN DEFAULT FALSE;
ALTER TABLE evaluations ADD COLUMN completed_benchmarks_count INTEGER DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN total_benchmarks_count INTEGER;
ALTER TABLE evaluations ADD COLUMN last_partial_save_at TIMESTAMP;

-- Add columns to evaluation_results table for partial results
ALTER TABLE evaluation_results ADD COLUMN is_partial BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of partial results
CREATE INDEX idx_evaluations_is_partial ON evaluations(is_partial);
CREATE INDEX idx_evaluation_results_is_partial ON evaluation_results(is_partial);

-- Add index for querying by completion status
CREATE INDEX idx_evaluations_completed_count ON evaluations(completed_benchmarks_count, total_benchmarks_count);

-- Add comment explaining the new columns
COMMENT ON COLUMN evaluations.is_partial IS 'Indicates if the evaluation has partial results (not all benchmarks completed)';
COMMENT ON COLUMN evaluations.completed_benchmarks_count IS 'Number of benchmarks that have been completed';
COMMENT ON COLUMN evaluations.total_benchmarks_count IS 'Total number of benchmarks in the evaluation';
COMMENT ON COLUMN evaluations.last_partial_save_at IS 'Timestamp of the last partial result save';
COMMENT ON COLUMN evaluation_results.is_partial IS 'Indicates if this result was saved as a partial result';
