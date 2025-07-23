-- Create table for storing AI campaign recommendations
CREATE TABLE IF NOT EXISTS public.ai_campaign_recommendations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_id text NOT NULL,
    campaign_id text NOT NULL,
    campaign_name text NOT NULL,
    platform text NOT NULL DEFAULT 'meta',
    recommendation jsonb NOT NULL,
    data_hash text,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure one recommendation per campaign
    UNIQUE(brand_id, campaign_id)
);

-- Create indexes for performance
CREATE INDEX idx_ai_campaign_recommendations_brand_id ON public.ai_campaign_recommendations(brand_id);
CREATE INDEX idx_ai_campaign_recommendations_campaign_id ON public.ai_campaign_recommendations(campaign_id);
CREATE INDEX idx_ai_campaign_recommendations_expires_at ON public.ai_campaign_recommendations(expires_at);

-- Add RLS policies
ALTER TABLE public.ai_campaign_recommendations ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_campaign_recommendations_updated_at 
    BEFORE UPDATE ON public.ai_campaign_recommendations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 