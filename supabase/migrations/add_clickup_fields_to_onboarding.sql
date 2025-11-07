-- Add ClickUp integration fields to onboarding_submissions table
ALTER TABLE onboarding_submissions
ADD COLUMN IF NOT EXISTS clickup_task_id TEXT,
ADD COLUMN IF NOT EXISTS clickup_task_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_clickup_task_id ON onboarding_submissions(clickup_task_id);

-- Add comment
COMMENT ON COLUMN onboarding_submissions.clickup_task_id IS 'ClickUp task ID for operator workflow';
COMMENT ON COLUMN onboarding_submissions.clickup_task_url IS 'Direct URL to ClickUp task';

