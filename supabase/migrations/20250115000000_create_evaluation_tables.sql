-- Create evaluation tables for the evaluation system
-- This migration adds support for running evaluations with lmms-eval

-- Evaluations table for tracking evaluation runs
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    config JSONB NOT NULL DEFAULT '{}',
    benchmark_ids TEXT[] NOT NULL DEFAULT '{}',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Evaluation results table for storing individual benchmark results
CREATE TABLE IF NOT EXISTS evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    benchmark_id UUID REFERENCES benchmarks(id),
    benchmark_name VARCHAR(255) NOT NULL,
    task_name VARCHAR(255) NOT NULL, -- lmms-eval task name
    metrics JSONB NOT NULL DEFAULT '{}',
    scores JSONB NOT NULL DEFAULT '{}',
    samples_count INTEGER NOT NULL DEFAULT 0,
    execution_time_seconds INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Evaluation progress table for real-time progress tracking
CREATE TABLE IF NOT EXISTS evaluation_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    current_benchmark VARCHAR(255),
    current_task VARCHAR(255),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    status_message TEXT,
    logs TEXT[] DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_evaluations_model_id ON evaluations(model_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON evaluations(status);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_evaluation_id ON evaluation_results(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_benchmark_name ON evaluation_results(benchmark_name);
CREATE INDEX IF NOT EXISTS idx_evaluation_progress_evaluation_id ON evaluation_progress(evaluation_id);

-- Update trigger for evaluations table
CREATE OR REPLACE FUNCTION update_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_evaluations_updated_at
    BEFORE UPDATE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_evaluations_updated_at();

-- Update trigger for evaluation_progress table
CREATE TRIGGER update_evaluation_progress_updated_at
    BEFORE UPDATE ON evaluation_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_evaluations_updated_at();

-- Enable Row Level Security (RLS) for evaluations
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for evaluations (allow all operations for now)
CREATE POLICY "Allow all operations on evaluations" ON evaluations
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on evaluation_results" ON evaluation_results
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on evaluation_progress" ON evaluation_progress
    FOR ALL USING (true);
