ALTER TABLE public.meta_adsets
ADD COLUMN IF NOT EXISTS adset_schedule JSONB,
ADD COLUMN IF NOT EXISTS attribution_spec JSONB,
ADD COLUMN IF NOT EXISTS creative_sequence JSONB,
ADD COLUMN IF NOT EXISTS frequency_control_specs JSONB,
ADD COLUMN IF NOT EXISTS destination_type TEXT,
ADD COLUMN IF NOT EXISTS promoted_object JSONB,
ADD COLUMN IF NOT EXISTS issues_info JSONB; 