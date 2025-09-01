-- Create ai_usage_tracking table to manage cooldowns and usage limits for all AI features
CREATE TABLE IF NOT EXISTS public.ai_usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    feature_type TEXT NOT NULL CHECK (feature_type IN (
        'campaign_recommendations', 
        'health_report', 
        'ai_consultant_chat',
        'marketing_analysis',
        'creative_analysis'
    )),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 1,
    daily_usage_count INTEGER DEFAULT 1,
    daily_usage_date DATE DEFAULT CURRENT_DATE,
    cooldown_until TIMESTAMP WITH TIME ZONE,
    previous_recommendations JSONB,
    tracking_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT ai_usage_brand_feature_unique UNIQUE (brand_id, feature_type),
    
    -- Foreign key to brands table
    CONSTRAINT ai_usage_brand_id_fkey 
        FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_brand_id ON public.ai_usage_tracking(brand_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON public.ai_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature_type ON public.ai_usage_tracking(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_last_used ON public.ai_usage_tracking(last_used_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_cooldown ON public.ai_usage_tracking(cooldown_until);
CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_date ON public.ai_usage_tracking(daily_usage_date);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Reset daily count if date changed
    IF NEW.daily_usage_date != CURRENT_DATE THEN
        NEW.daily_usage_date = CURRENT_DATE;
        NEW.daily_usage_count = 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_usage_updated_at
    BEFORE UPDATE ON public.ai_usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_usage_updated_at();

-- Add RLS policies
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see usage for their brands
CREATE POLICY "Users can view AI usage for their brands" ON public.ai_usage_tracking
    FOR SELECT USING (
        brand_id IN (
            SELECT id FROM public.brands 
            WHERE user_id::text = auth.uid()::text
        )
    );

-- Policy to allow users to insert AI usage for their brands
CREATE POLICY "Users can insert AI usage for their brands" ON public.ai_usage_tracking
    FOR INSERT WITH CHECK (
        brand_id IN (
            SELECT id FROM public.brands 
            WHERE user_id::text = auth.uid()::text
        )
    );

-- Policy to allow users to update AI usage for their brands
CREATE POLICY "Users can update AI usage for their brands" ON public.ai_usage_tracking
    FOR UPDATE USING (
        brand_id IN (
            SELECT id FROM public.brands 
            WHERE user_id::text = auth.uid()::text
        )
    );

-- Add service role policies for automated processes
CREATE POLICY "Service role can manage AI usage" ON public.ai_usage_tracking
    FOR ALL USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE public.ai_usage_tracking IS 'Tracks AI feature usage, cooldowns, and daily limits per brand and feature type';
COMMENT ON COLUMN public.ai_usage_tracking.brand_id IS 'References the brand for which AI features are being used';
COMMENT ON COLUMN public.ai_usage_tracking.user_id IS 'References the user who owns the brand';
COMMENT ON COLUMN public.ai_usage_tracking.feature_type IS 'Type of AI feature (campaign_recommendations, health_report, ai_consultant_chat, etc.)';
COMMENT ON COLUMN public.ai_usage_tracking.last_used_at IS 'When the AI feature was last used';
COMMENT ON COLUMN public.ai_usage_tracking.usage_count IS 'Total usage count for this feature';
COMMENT ON COLUMN public.ai_usage_tracking.daily_usage_count IS 'Daily usage count for this feature';
COMMENT ON COLUMN public.ai_usage_tracking.daily_usage_date IS 'Date for tracking daily usage';
COMMENT ON COLUMN public.ai_usage_tracking.cooldown_until IS 'When the cooldown period ends for this feature';
COMMENT ON COLUMN public.ai_usage_tracking.previous_recommendations IS 'JSON containing previous recommendations to track effectiveness';
COMMENT ON COLUMN public.ai_usage_tracking.tracking_data IS 'JSON containing additional tracking data specific to each feature'; 