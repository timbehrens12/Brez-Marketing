-- Fix ai_usage_tracking table user_id column type mismatch
-- The column should be TEXT to match Clerk user IDs, not UUID

-- Check if column exists and is UUID type, then alter it
DO $$
BEGIN
    -- Check if the column exists and is of UUID type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ai_usage_tracking' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Drop existing data if any (since UUID format won't work with text IDs)
        TRUNCATE TABLE public.ai_usage_tracking;
        
        -- Alter column type to TEXT
        ALTER TABLE public.ai_usage_tracking 
        ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
        
        RAISE NOTICE 'Fixed ai_usage_tracking.user_id column type from UUID to TEXT';
    ELSE
        RAISE NOTICE 'ai_usage_tracking.user_id column is already TEXT or does not exist';
    END IF;
END $$;

-- Ensure the column is TEXT and NOT NULL
ALTER TABLE public.ai_usage_tracking 
ALTER COLUMN user_id TYPE TEXT,
ALTER COLUMN user_id SET NOT NULL;

-- Recreate index if it was dropped
DROP INDEX IF EXISTS idx_ai_usage_user_id;
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON public.ai_usage_tracking(user_id);

-- Update RLS policies to ensure they work with TEXT user_id
DROP POLICY IF EXISTS "Users can view AI usage for their brands" ON public.ai_usage_tracking;
DROP POLICY IF EXISTS "Users can insert AI usage for their brands" ON public.ai_usage_tracking;  
DROP POLICY IF EXISTS "Users can update AI usage for their brands" ON public.ai_usage_tracking;

-- Recreate policies with proper TEXT handling
CREATE POLICY "Users can view AI usage for their brands" ON public.ai_usage_tracking
    FOR SELECT USING (
        user_id = auth.uid()::text OR
        brand_id IN (
            SELECT id FROM public.brands 
            WHERE user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert AI usage for their brands" ON public.ai_usage_tracking
    FOR INSERT WITH CHECK (
        user_id = auth.uid()::text OR
        brand_id IN (
            SELECT id FROM public.brands 
            WHERE user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can update AI usage for their brands" ON public.ai_usage_tracking
    FOR UPDATE USING (
        user_id = auth.uid()::text OR
        brand_id IN (
            SELECT id FROM public.brands 
            WHERE user_id::text = auth.uid()::text
        )
    );

-- Comment for clarity
COMMENT ON COLUMN public.ai_usage_tracking.user_id IS 'Clerk user ID as TEXT (e.g., user_2tHp6PPuKFIUImeafbZ8JeIAIVK)';