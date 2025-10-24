-- Add task_name field to benchmarks table
-- This field stores the actual lmms-eval task name for proper mapping

-- Add the task_name column
ALTER TABLE benchmarks 
ADD COLUMN task_name VARCHAR(255);

-- Add an index for faster lookups
CREATE INDEX idx_benchmarks_task_name ON benchmarks(task_name);

-- Add a comment to document the field
COMMENT ON COLUMN benchmarks.task_name IS 'Actual lmms-eval task name for proper evaluation mapping';

-- Update existing benchmarks with their task names based on their current names
-- This is a best-effort mapping that can be refined later
UPDATE benchmarks 
SET task_name = LOWER(REPLACE(name, ' ', '_'))
WHERE task_name IS NULL;

-- For common benchmarks, set more accurate task names
UPDATE benchmarks 
SET task_name = 'arc'
WHERE LOWER(name) LIKE '%arc%' OR LOWER(name) LIKE '%ai2%';

UPDATE benchmarks 
SET task_name = 'gsm8k'
WHERE LOWER(name) LIKE '%gsm8k%' OR LOWER(name) LIKE '%gsm%';

UPDATE benchmarks 
SET task_name = 'hellaswag'
WHERE LOWER(name) LIKE '%hellaswag%' OR LOWER(name) LIKE '%hellas%';

UPDATE benchmarks 
SET task_name = 'mmlu'
WHERE LOWER(name) LIKE '%mmlu%';

-- Add a constraint to ensure task_name is not empty
ALTER TABLE benchmarks 
ADD CONSTRAINT chk_benchmarks_task_name_not_empty 
CHECK (task_name IS NOT NULL AND LENGTH(TRIM(task_name)) > 0);
