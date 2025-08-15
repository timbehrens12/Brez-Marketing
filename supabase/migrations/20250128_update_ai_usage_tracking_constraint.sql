-- Update AI usage tracking to be per-user instead of per-brand
-- This ensures users have 15 uses per day total across all brands, not per brand

-- Drop the existing unique constraint
ALTER TABLE public.ai_usage_tracking 
DROP CONSTRAINT IF EXISTS ai_usage_brand_feature_unique;

-- Add new unique constraint on user_id and feature_type instead of brand_id and feature_type
ALTER TABLE public.ai_usage_tracking 
ADD CONSTRAINT ai_usage_user_feature_unique UNIQUE (user_id, feature_type);

-- Update the comment to reflect the change
COMMENT ON TABLE public.ai_usage_tracking IS 'Tracks AI feature usage, cooldowns, and daily limits per user and feature type (not per brand)';
COMMENT ON COLUMN public.ai_usage_tracking.brand_id IS 'References the brand for context/logging but not used for usage constraints';

-- Update RLS policies to allow users to see/manage their own usage records regardless of brand
DROP POLICY IF EXISTS "Users can view AI usage for their brands" ON public.ai_usage_tracking;
DROP POLICY IF EXISTS "Users can insert AI usage for their brands" ON public.ai_usage_tracking;
DROP POLICY IF EXISTS "Users can update AI usage for their brands" ON public.ai_usage_tracking;

-- New policies based on user_id instead of brand ownership
CREATE POLICY "Users can view their own AI usage" ON public.ai_usage_tracking
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own AI usage" ON public.ai_usage_tracking
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own AI usage" ON public.ai_usage_tracking
    FOR UPDATE USING (user_id = auth.uid()::text);
