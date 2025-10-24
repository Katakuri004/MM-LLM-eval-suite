-- Add modality_support column to models table
-- This column will store an array of supported modalities for each model

ALTER TABLE models ADD COLUMN IF NOT EXISTS modality_support TEXT[] DEFAULT ARRAY['text'];

-- Add comment to explain the column
COMMENT ON COLUMN models.modality_support IS 'Array of supported modalities: text, image, audio, video';

-- Update existing models with inferred modalities based on their names
-- This is a best-effort inference - the Python script will handle the detailed logic

-- Text-only models (default)
UPDATE models SET modality_support = ARRAY['text'] WHERE modality_support IS NULL;

-- Vision models (infer from name patterns)
UPDATE models SET modality_support = ARRAY['text', 'image'] 
WHERE (name ILIKE '%vision%' OR name ILIKE '%vl%' OR name ILIKE '%llava%' 
       OR name ILIKE '%qwen2%' OR name ILIKE '%phi%' OR name ILIKE '%cogvlm%' 
       OR name ILIKE '%intern%' OR name ILIKE '%blip%' OR name ILIKE '%flamingo%')
  AND modality_support = ARRAY['text'];

-- Audio models
UPDATE models SET modality_support = ARRAY['text', 'audio'] 
WHERE (name ILIKE '%whisper%' OR name ILIKE '%audio%' OR name ILIKE '%speech%')
  AND modality_support = ARRAY['text'];

-- Video models
UPDATE models SET modality_support = ARRAY['text', 'video'] 
WHERE (name ILIKE '%video%' OR name ILIKE '%vid%' OR name ILIKE '%vora%')
  AND modality_support = ARRAY['text'];

-- Omni models (support everything)
UPDATE models SET modality_support = ARRAY['text', 'image', 'audio', 'video'] 
WHERE (name ILIKE '%omni%')
  AND modality_support = ARRAY['text'];

-- Multimodal models (text + image)
UPDATE models SET modality_support = ARRAY['text', 'image'] 
WHERE (name ILIKE '%multimodal%' OR name ILIKE '%mm%')
  AND modality_support = ARRAY['text'];
