-- Add checkpoint tracking to evaluations table
-- This migration adds support for checkpoint save/resume functionality

-- Add columns to evaluations table for checkpoint tracking
ALTER TABLE evaluations ADD COLUMN checkpoint_data JSONB;
ALTER TABLE evaluations ADD COLUMN last_checkpoint_at TIMESTAMP;
ALTER TABLE evaluations ADD COLUMN resume_count INTEGER DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN retry_status VARCHAR(50);
ALTER TABLE evaluations ADD COLUMN retry_errors JSONB;
ALTER TABLE evaluations ADD COLUMN retry_completed_at TIMESTAMP;

-- Add indexes for efficient querying of checkpoints and retries
CREATE INDEX idx_evaluations_checkpoint_data ON evaluations USING GIN (checkpoint_data);
CREATE INDEX idx_evaluations_last_checkpoint ON evaluations(last_checkpoint_at);
CREATE INDEX idx_evaluations_resume_count ON evaluations(resume_count);
CREATE INDEX idx_evaluations_retry_count ON evaluations(retry_count);
CREATE INDEX idx_evaluations_retry_status ON evaluations(retry_status);

-- Add comments explaining the new columns
COMMENT ON COLUMN evaluations.checkpoint_data IS 'Checkpoint data for resuming interrupted evaluations (JSON format)';
COMMENT ON COLUMN evaluations.last_checkpoint_at IS 'Timestamp of the last checkpoint save';
COMMENT ON COLUMN evaluations.resume_count IS 'Number of times this evaluation has been resumed from checkpoint';
COMMENT ON COLUMN evaluations.retry_count IS 'Number of retry attempts for this evaluation';
COMMENT ON COLUMN evaluations.retry_status IS 'Current retry status (pending, retrying, success, failed, circuit_open)';
COMMENT ON COLUMN evaluations.retry_errors IS 'List of errors encountered during retry attempts (JSON format)';
COMMENT ON COLUMN evaluations.retry_completed_at IS 'Timestamp when retry process completed';

-- Create a view for checkpoint management
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

-- Create a view for retry management
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
