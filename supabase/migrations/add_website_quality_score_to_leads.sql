-- Add website_quality_score column to leads table
-- This stores the AI-assessed quality score (0-100) for website lead generation potential
-- Lower scores indicate poor websites (missing contact forms, outdated design, etc.)

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS website_quality_score INTEGER;

-- Add check constraint to ensure score is between 0 and 100
ALTER TABLE leads
ADD CONSTRAINT website_quality_score_range CHECK (website_quality_score >= 0 AND website_quality_score <= 100);

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_leads_website_quality_score ON leads(website_quality_score);

-- Add comment
COMMENT ON COLUMN leads.website_quality_score IS 'AI-assessed website quality score (0-100) for lead generation potential. Scores below 50 indicate poor quality websites that are good candidates for rebuilding.';

