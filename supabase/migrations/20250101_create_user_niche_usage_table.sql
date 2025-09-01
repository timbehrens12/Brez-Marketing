-- Create user_niche_usage table for tracking niche-specific cooldowns
CREATE TABLE IF NOT EXISTS user_niche_usage (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    niche_id TEXT NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    leads_generated INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT user_niche_usage_user_niche_unique UNIQUE (user_id, niche_id),
    
    -- Foreign key to lead_niches table
    CONSTRAINT user_niche_usage_niche_id_fkey 
        FOREIGN KEY (niche_id) REFERENCES lead_niches(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_niche_usage_user_id ON user_niche_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_niche_usage_niche_id ON user_niche_usage(niche_id);
CREATE INDEX IF NOT EXISTS idx_user_niche_usage_last_used ON user_niche_usage(last_used_at);
CREATE INDEX IF NOT EXISTS idx_user_niche_usage_user_last_used ON user_niche_usage(user_id, last_used_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_niche_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_niche_usage_updated_at
    BEFORE UPDATE ON user_niche_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_user_niche_usage_updated_at();

-- Add RLS policies
ALTER TABLE user_niche_usage ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own niche usage
CREATE POLICY "Users can view their own niche usage" ON user_niche_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own niche usage
CREATE POLICY "Users can insert their own niche usage" ON user_niche_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own niche usage
CREATE POLICY "Users can update their own niche usage" ON user_niche_usage
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own niche usage
CREATE POLICY "Users can delete their own niche usage" ON user_niche_usage
    FOR DELETE USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE user_niche_usage IS 'Tracks niche-specific usage and cooldowns for each user to prevent spam of the same niches';
COMMENT ON COLUMN user_niche_usage.user_id IS 'References the user who used the niche';
COMMENT ON COLUMN user_niche_usage.niche_id IS 'References the niche that was used';
COMMENT ON COLUMN user_niche_usage.last_used_at IS 'When the niche was last used for lead generation';
COMMENT ON COLUMN user_niche_usage.leads_generated IS 'Number of leads generated for this niche in the last usage'; 