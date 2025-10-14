-- LMMS-Eval Dashboard Database Schema
-- This file contains the complete database schema for the LMMS-Eval Dashboard

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Models table
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    family TEXT NOT NULL,
    source TEXT NOT NULL,
    dtype TEXT NOT NULL,
    num_parameters BIGINT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for models
CREATE INDEX idx_models_name ON models(name);
CREATE INDEX idx_models_family ON models(family);
CREATE INDEX idx_models_created_at ON models(created_at);

-- Benchmarks table
CREATE TABLE benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    modality TEXT NOT NULL,
    category TEXT NOT NULL,
    task_type TEXT NOT NULL,
    primary_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
    secondary_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
    num_samples INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for benchmarks
CREATE INDEX idx_benchmarks_category ON benchmarks(category);
CREATE INDEX idx_benchmarks_modality ON benchmarks(modality);
CREATE INDEX idx_benchmarks_created_at ON benchmarks(created_at);

-- Runs table
CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    checkpoint_variant TEXT DEFAULT 'latest',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    total_tasks INTEGER NOT NULL DEFAULT 0,
    completed_tasks INTEGER NOT NULL DEFAULT 0,
    gpu_device_id TEXT,
    process_id INTEGER,
    config JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL
);

-- Indexes for runs
CREATE INDEX idx_runs_model_id_status ON runs(model_id, status);
CREATE INDEX idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_created_by ON runs(created_by);

-- Run benchmarks table
CREATE TABLE run_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    benchmark_id UUID NOT NULL REFERENCES benchmarks(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    order_index INTEGER NOT NULL DEFAULT 0,
    UNIQUE(run_id, benchmark_id)
);

-- Indexes for run_benchmarks
CREATE INDEX idx_run_benchmarks_run_id ON run_benchmarks(run_id);
CREATE INDEX idx_run_benchmarks_benchmark_id ON run_benchmarks(benchmark_id);

-- Run metrics table
CREATE TABLE run_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    run_benchmark_id UUID NOT NULL REFERENCES run_benchmarks(id) ON DELETE CASCADE,
    benchmark_id UUID NOT NULL REFERENCES benchmarks(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    slice_id UUID REFERENCES slices(id) ON DELETE SET NULL,
    sample_count INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(run_id, benchmark_id, metric_name, slice_id)
);

-- Indexes for run_metrics
CREATE INDEX idx_run_metrics_run_id ON run_metrics(run_id);
CREATE INDEX idx_run_metrics_benchmark_id_metric_name ON run_metrics(benchmark_id, metric_name);
CREATE INDEX idx_run_metrics_slice_id ON run_metrics(slice_id);
CREATE INDEX idx_run_metrics_updated_at ON run_metrics(updated_at);

-- Slices table
CREATE TABLE slices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slice_type TEXT NOT NULL,
    slice_value TEXT NOT NULL,
    associated_benchmarks UUID[] DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for slices
CREATE INDEX idx_slices_slice_type ON slices(slice_type);
CREATE INDEX idx_slices_name ON slices(name);

-- Run samples table
CREATE TABLE run_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_benchmark_id UUID NOT NULL REFERENCES run_benchmarks(id) ON DELETE CASCADE,
    benchmark_id UUID NOT NULL REFERENCES benchmarks(id) ON DELETE CASCADE,
    sample_index INTEGER NOT NULL,
    input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ground_truth JSONB NOT NULL DEFAULT '{}'::jsonb,
    prediction JSONB NOT NULL DEFAULT '{}'::jsonb,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    error DOUBLE PRECISION,
    confidence DOUBLE PRECISION,
    slice_assignments UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for run_samples
CREATE INDEX idx_run_samples_run_benchmark_id_benchmark_id ON run_samples(run_benchmark_id, benchmark_id);
CREATE INDEX idx_run_samples_sample_index ON run_samples(sample_index);

-- Artifacts table
CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL CHECK (artifact_type IN ('config', 'log', 'predictions', 'error_analysis', 'checkpoint_info')),
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for artifacts
CREATE INDEX idx_artifacts_run_id_artifact_type ON artifacts(run_id, artifact_type);
CREATE INDEX idx_artifacts_created_at ON artifacts(created_at);

-- Model checkpoints table
CREATE TABLE model_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    checkpoint_variant TEXT NOT NULL,
    checkpoint_index INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(model_id, checkpoint_variant)
);

-- Indexes for model_checkpoints
CREATE INDEX idx_model_checkpoints_model_id ON model_checkpoints(model_id);

-- Comparison sessions table
CREATE TABLE comparison_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    comparison_type TEXT NOT NULL CHECK (comparison_type IN ('intra_model_checkpoint', 'inter_model_same_checkpoint', 'best_of_n', 'release_candidate')),
    run_ids UUID[] NOT NULL DEFAULT '{}',
    benchmark_ids UUID[] NOT NULL DEFAULT '{}',
    slice_id UUID REFERENCES slices(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for comparison_sessions
CREATE INDEX idx_comparison_sessions_user_id_created_at ON comparison_sessions(user_id, created_at);

-- Run logs table (high-volume table)
CREATE TABLE run_logs (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    level TEXT NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR')),
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb
);

-- Indexes for run_logs
CREATE INDEX idx_run_logs_run_id_timestamp ON run_logs(run_id, timestamp);
CREATE INDEX idx_run_logs_timestamp ON run_logs(timestamp);
CREATE INDEX idx_run_logs_level ON run_logs(level);

-- Row Level Security (RLS) policies
-- Enable RLS on tables that need user-based access control
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for runs table
CREATE POLICY runs_user_access ON runs
    FOR ALL TO authenticated
    USING (created_by = auth.uid());

-- RLS policies for comparison_sessions table
CREATE POLICY comparison_sessions_user_access ON comparison_sessions
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Functions for common operations
CREATE OR REPLACE FUNCTION get_run_progress(run_id_param UUID)
RETURNS TABLE (
    run_id UUID,
    total_tasks INTEGER,
    completed_tasks INTEGER,
    progress_percent NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.total_tasks,
        r.completed_tasks,
        CASE 
            WHEN r.total_tasks > 0 THEN (r.completed_tasks::NUMERIC / r.total_tasks::NUMERIC) * 100
            ELSE 0
        END as progress_percent
    FROM runs r
    WHERE r.id = run_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get leaderboard data
CREATE OR REPLACE FUNCTION get_leaderboard(
    benchmark_id_param UUID,
    slice_id_param UUID DEFAULT NULL,
    limit_param INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank BIGINT,
    model_name TEXT,
    checkpoint_variant TEXT,
    score DOUBLE PRECISION,
    last_run TIMESTAMP WITH TIME ZONE,
    run_id UUID
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_metrics AS (
        SELECT 
            m.name as model_name,
            r.checkpoint_variant,
            rm.metric_value as score,
            r.created_at as last_run,
            r.id as run_id,
            ROW_NUMBER() OVER (
                PARTITION BY m.id, r.checkpoint_variant 
                ORDER BY rm.metric_value DESC
            ) as rn
        FROM run_metrics rm
        JOIN runs r ON rm.run_id = r.id
        JOIN models m ON r.model_id = m.id
        WHERE rm.benchmark_id = benchmark_id_param
        AND (slice_id_param IS NULL OR rm.slice_id = slice_id_param)
        AND rm.metric_name = 'accuracy'  -- Use primary metric
    )
    SELECT 
        ROW_NUMBER() OVER (ORDER BY score DESC) as rank,
        model_name,
        checkpoint_variant,
        score,
        last_run,
        run_id
    FROM ranked_metrics
    WHERE rn = 1
    ORDER BY score DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to update run progress
CREATE OR REPLACE FUNCTION update_run_progress(run_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE runs 
    SET completed_tasks = (
        SELECT COUNT(*) 
        FROM run_benchmarks 
        WHERE run_id = run_id_param 
        AND status = 'completed'
    )
    WHERE id = run_id_param;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION trigger_update_run_progress()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_run_progress(NEW.run_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_run_progress_trigger
    AFTER UPDATE ON run_benchmarks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_run_progress();

-- Function to clean up old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM run_logs 
    WHERE timestamp < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Views for common queries
CREATE VIEW run_summary AS
SELECT 
    r.id,
    r.name,
    r.status,
    r.created_at,
    r.started_at,
    r.completed_at,
    r.total_tasks,
    r.completed_tasks,
    CASE 
        WHEN r.total_tasks > 0 THEN (r.completed_tasks::NUMERIC / r.total_tasks::NUMERIC) * 100
        ELSE 0
    END as progress_percent,
    m.name as model_name,
    m.family as model_family
FROM runs r
JOIN models m ON r.model_id = m.id;

CREATE VIEW benchmark_summary AS
SELECT 
    b.id,
    b.name,
    b.modality,
    b.category,
    b.num_samples,
    COUNT(DISTINCT r.id) as run_count,
    COUNT(DISTINCT rm.run_id) as completed_run_count
FROM benchmarks b
LEFT JOIN run_benchmarks rb ON b.id = rb.benchmark_id
LEFT JOIN runs r ON rb.run_id = r.id
LEFT JOIN run_metrics rm ON rb.id = rm.run_benchmark_id
GROUP BY b.id, b.name, b.modality, b.category, b.num_samples;

-- Insert some sample data
INSERT INTO models (name, family, source, dtype, num_parameters, notes) VALUES
('LLaVA-1.5-7B', 'LLaVA', 'huggingface://llava-hf/llava-1.5-7b-hf', 'float16', 7000000000, 'LLaVA 1.5 7B model'),
('LLaVA-1.5-13B', 'LLaVA', 'huggingface://llava-hf/llava-1.5-13b-hf', 'float16', 13000000000, 'LLaVA 1.5 13B model'),
('InstructBLIP-7B', 'InstructBLIP', 'huggingface://Salesforce/instructblip-vicuna-7b', 'float16', 7000000000, 'InstructBLIP 7B model');

INSERT INTO benchmarks (name, modality, category, task_type, primary_metrics, secondary_metrics, num_samples, description) VALUES
('COCO-Caption', 'Vision', 'Captioning', 'open_ended', '["CIDEr", "BLEU"]', '["ROUGE", "METEOR"]', 5000, 'COCO image captioning benchmark'),
('VQA-v2', 'Vision', 'VQA', 'multiple_choice', '["accuracy"]', '["f1_score"]', 10000, 'Visual Question Answering benchmark'),
('TextVQA', 'Vision', 'VQA', 'open_ended', '["accuracy"]', '["f1_score"]', 3000, 'Text-based VQA benchmark');

INSERT INTO slices (name, slice_type, slice_value, associated_benchmarks, description) VALUES
('male_speakers', 'audio_gender', 'male', '{}', 'Audio samples with male speakers'),
('female_speakers', 'audio_gender', 'female', '{}', 'Audio samples with female speakers'),
('low_resolution', 'vision_resolution', 'low', '{}', 'Low resolution images'),
('high_resolution', 'vision_resolution', 'high', '{}', 'High resolution images');
