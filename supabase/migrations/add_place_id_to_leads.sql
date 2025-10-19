-- Add place_id column to leads table to store Google Places ID
-- This allows us to link leads to their Google Business Profile

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS place_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_place_id ON leads(place_id);

-- Add comment
COMMENT ON COLUMN leads.place_id IS 'Google Places API place_id for linking to Google Business Profile';

