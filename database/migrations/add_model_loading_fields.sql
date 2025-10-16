-- Migration: Add model loading fields to support multiple loading methods
-- Date: 2025-10-15
-- Description: Extends the models table to support HuggingFace, local, API, and vLLM model loading

-- Add new columns to models table
ALTER TABLE models ADD COLUMN IF NOT EXISTS loading_method TEXT DEFAULT 'huggingface';
ALTER TABLE models ADD COLUMN IF NOT EXISTS model_path TEXT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS api_endpoint TEXT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS api_credentials JSONB DEFAULT '{}'::jsonb;
ALTER TABLE models ADD COLUMN IF NOT EXISTS modality_support TEXT[] DEFAULT '{}';
ALTER TABLE models ADD COLUMN IF NOT EXISTS hardware_requirements JSONB DEFAULT '{}'::jsonb;
ALTER TABLE models ADD COLUMN IF NOT EXISTS cache_path TEXT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending';
ALTER TABLE models ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE models ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add constraints for loading_method
ALTER TABLE models ADD CONSTRAINT check_loading_method 
    CHECK (loading_method IN ('huggingface', 'local', 'api', 'vllm', 'batch'));

-- Add constraints for validation_status
ALTER TABLE models ADD CONSTRAINT check_validation_status 
    CHECK (validation_status IN ('pending', 'valid', 'invalid', 'validating'));

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_models_loading_method ON models(loading_method);
CREATE INDEX IF NOT EXISTS idx_models_validation_status ON models(validation_status);
CREATE INDEX IF NOT EXISTS idx_models_modality_support ON models USING GIN(modality_support);
CREATE INDEX IF NOT EXISTS idx_models_last_validated_at ON models(last_validated_at);

-- Create model_variants table for checkpoints and fine-tuned variants
CREATE TABLE IF NOT EXISTS model_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    variant_path TEXT,
    variant_type TEXT DEFAULT 'checkpoint' CHECK (variant_type IN ('checkpoint', 'fine_tuned', 'quantized', 'pruned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performance_delta JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(model_id, variant_name)
);

-- Create indexes for model_variants
CREATE INDEX IF NOT EXISTS idx_model_variants_model_id ON model_variants(model_id);
CREATE INDEX IF NOT EXISTS idx_model_variants_variant_type ON model_variants(variant_type);
CREATE INDEX IF NOT EXISTS idx_model_variants_created_at ON model_variants(created_at);

-- Create model_uploads table for tracking file uploads
CREATE TABLE IF NOT EXISTS model_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    upload_type TEXT NOT NULL CHECK (upload_type IN ('weights', 'config', 'tokenizer', 'other')),
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    upload_status TEXT DEFAULT 'uploading' CHECK (upload_status IN ('uploading', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for model_uploads
CREATE INDEX IF NOT EXISTS idx_model_uploads_model_id ON model_uploads(model_id);
CREATE INDEX IF NOT EXISTS idx_model_uploads_upload_status ON model_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_model_uploads_created_at ON model_uploads(created_at);

-- Create model_validation_logs table for tracking validation attempts
CREATE TABLE IF NOT EXISTS model_validation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    validation_type TEXT NOT NULL CHECK (validation_type IN ('accessibility', 'inference', 'completeness', 'performance')),
    status TEXT NOT NULL CHECK (status IN ('started', 'success', 'failed', 'timeout')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    validation_details JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for model_validation_logs
CREATE INDEX IF NOT EXISTS idx_model_validation_logs_model_id ON model_validation_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_model_validation_logs_status ON model_validation_logs(status);
CREATE INDEX IF NOT EXISTS idx_model_validation_logs_started_at ON model_validation_logs(started_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to models table
DROP TRIGGER IF EXISTS update_models_updated_at ON models;
CREATE TRIGGER update_models_updated_at
    BEFORE UPDATE ON models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to model_variants table
DROP TRIGGER IF EXISTS update_model_variants_updated_at ON model_variants;
CREATE TRIGGER update_model_variants_updated_at
    BEFORE UPDATE ON model_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO models (name, family, source, dtype, num_parameters, loading_method, modality_support, hardware_requirements, validation_status) VALUES
('Qwen2-VL-7B-Instruct', 'Qwen2-VL', 'huggingface://Qwen/Qwen2-VL-7B-Instruct', 'float16', 7000000000, 'huggingface', ARRAY['text', 'image'], '{"min_gpu_memory": "16GB", "recommended_gpus": 1}', 'valid'),
('LLaVA-1.5-7B', 'LLaVA', 'huggingface://llava-hf/llava-1.5-7b-hf', 'float16', 7000000000, 'huggingface', ARRAY['text', 'image'], '{"min_gpu_memory": "16GB", "recommended_gpus": 1}', 'valid'),
('GPT-4V', 'OpenAI', 'api://openai/gpt-4-vision-preview', 'unknown', 0, 'api', ARRAY['text', 'image'], '{"api_based": true}', 'valid'),
('Custom-Omni-Model', 'Custom', 'local:///models/omni-model', 'float16', 13000000000, 'local', ARRAY['text', 'image', 'video', 'audio'], '{"min_gpu_memory": "32GB", "recommended_gpus": 2}', 'pending')
ON CONFLICT (name) DO NOTHING;

-- Add comments for documentation
COMMENT ON COLUMN models.loading_method IS 'Method used to load the model: huggingface, local, api, vllm, batch';
COMMENT ON COLUMN models.model_path IS 'Path to model files (local filesystem or HuggingFace repo)';
COMMENT ON COLUMN models.api_endpoint IS 'API endpoint URL for API-based or vLLM models';
COMMENT ON COLUMN models.api_credentials IS 'Encrypted API credentials for external services';
COMMENT ON COLUMN models.modality_support IS 'Array of supported modalities: text, image, video, audio';
COMMENT ON COLUMN models.hardware_requirements IS 'JSON object with GPU memory, compute requirements';
COMMENT ON COLUMN models.cache_path IS 'Local cache path for downloaded models';
COMMENT ON COLUMN models.validation_status IS 'Current validation status of the model';
COMMENT ON COLUMN models.last_validated_at IS 'Timestamp of last validation attempt';

COMMENT ON TABLE model_variants IS 'Stores different variants/checkpoints of models';
COMMENT ON TABLE model_uploads IS 'Tracks file uploads for models';
COMMENT ON TABLE model_validation_logs IS 'Logs validation attempts and results';
