-- Remove project_id column from prompts (projects feature removed)
ALTER TABLE public.prompts DROP COLUMN IF EXISTS project_id;
