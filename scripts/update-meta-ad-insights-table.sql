-- SQL script to add new columns to meta_ad_insights table for additional metrics

-- First check if the columns already exist and add them if they don't
DO $$
BEGIN
  -- Add budget column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_ad_insights' 
    AND column_name = 'budget'
  ) THEN
    ALTER TABLE public.meta_ad_insights 
    ADD COLUMN budget DECIMAL(10, 2) DEFAULT 0;
    
    RAISE NOTICE 'Added budget column to meta_ad_insights table';
  END IF;

  -- Add purchase_conversion_value column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_ad_insights' 
    AND column_name = 'purchase_conversion_value'
  ) THEN
    ALTER TABLE public.meta_ad_insights 
    ADD COLUMN purchase_conversion_value DECIMAL(10, 2) DEFAULT 0;
    
    RAISE NOTICE 'Added purchase_conversion_value column to meta_ad_insights table';
  END IF;

  -- Add results column (for ad results count)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_ad_insights' 
    AND column_name = 'results'
  ) THEN
    ALTER TABLE public.meta_ad_insights 
    ADD COLUMN results INTEGER DEFAULT 0;
    
    RAISE NOTICE 'Added results column to meta_ad_insights table';
  END IF;

  -- Add cost_per_result column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_ad_insights' 
    AND column_name = 'cost_per_result'
  ) THEN
    ALTER TABLE public.meta_ad_insights 
    ADD COLUMN cost_per_result DECIMAL(10, 2) DEFAULT 0;
    
    RAISE NOTICE 'Added cost_per_result column to meta_ad_insights table';
  END IF;

  -- Add cost_per_click column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_ad_insights' 
    AND column_name = 'cost_per_click'
  ) THEN
    ALTER TABLE public.meta_ad_insights 
    ADD COLUMN cost_per_click DECIMAL(10, 2) DEFAULT 0;
    
    RAISE NOTICE 'Added cost_per_click column to meta_ad_insights table';
  END IF;
  
  -- Add cost_per_link_click column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_ad_insights' 
    AND column_name = 'cost_per_link_click'
  ) THEN
    ALTER TABLE public.meta_ad_insights 
    ADD COLUMN cost_per_link_click DECIMAL(10, 2) DEFAULT 0;
    
    RAISE NOTICE 'Added cost_per_link_click column to meta_ad_insights table';
  END IF;
  
  -- Add click_through_rate column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_ad_insights' 
    AND column_name = 'click_through_rate'
  ) THEN
    ALTER TABLE public.meta_ad_insights 
    ADD COLUMN click_through_rate DECIMAL(10, 2) DEFAULT 0;
    
    RAISE NOTICE 'Added click_through_rate column to meta_ad_insights table';
  END IF;
  
  -- Add frequency column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_ad_insights' 
    AND column_name = 'frequency'
  ) THEN
    ALTER TABLE public.meta_ad_insights 
    ADD COLUMN frequency DECIMAL(10, 2) DEFAULT 0;
    
    RAISE NOTICE 'Added frequency column to meta_ad_insights table';
  END IF;
  
  -- Add reach column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_ad_insights' 
    AND column_name = 'reach'
  ) THEN
    ALTER TABLE public.meta_ad_insights 
    ADD COLUMN reach INTEGER DEFAULT 0;
    
    RAISE NOTICE 'Added reach column to meta_ad_insights table';
  END IF;
  
  -- Add link_clicks column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_ad_insights' 
    AND column_name = 'link_clicks'
  ) THEN
    ALTER TABLE public.meta_ad_insights 
    ADD COLUMN link_clicks INTEGER DEFAULT 0;
    
    RAISE NOTICE 'Added link_clicks column to meta_ad_insights table';
  END IF;
END
$$;

-- Add comments to the new columns for better documentation
COMMENT ON COLUMN meta_ad_insights.budget IS 'Daily campaign budget';
COMMENT ON COLUMN meta_ad_insights.purchase_conversion_value IS 'Total value of purchase conversions';
COMMENT ON COLUMN meta_ad_insights.results IS 'Number of ad results (objectives reached)';
COMMENT ON COLUMN meta_ad_insights.cost_per_result IS 'Average cost per result';
COMMENT ON COLUMN meta_ad_insights.cost_per_click IS 'Average cost per click (all clicks)';
COMMENT ON COLUMN meta_ad_insights.cost_per_link_click IS 'Average cost per link click';
COMMENT ON COLUMN meta_ad_insights.click_through_rate IS 'Click-through rate percentage';
COMMENT ON COLUMN meta_ad_insights.frequency IS 'Average number of times each person saw the ad';
COMMENT ON COLUMN meta_ad_insights.reach IS 'Number of unique people who saw the ad';
COMMENT ON COLUMN meta_ad_insights.link_clicks IS 'Number of clicks to links directing to specified destinations';

-- Check if the columns were added successfully
SELECT 
  column_name, data_type 
FROM 
  information_schema.columns 
WHERE 
  table_schema = 'public' 
  AND table_name = 'meta_ad_insights' 
  AND column_name IN (
    'budget', 
    'purchase_conversion_value',
    'results',
    'cost_per_result',
    'cost_per_click',
    'cost_per_link_click',
    'click_through_rate',
    'frequency',
    'reach',
    'link_clicks'
  )
ORDER BY ordinal_position; 