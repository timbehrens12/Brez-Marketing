-- Add missing calculated columns to meta_ad_insights table
ALTER TABLE public.meta_ad_insights 
ADD COLUMN IF NOT EXISTS purchase_conversion_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS results INT4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_result NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_click NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_through_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create a function to calculate and update the values
CREATE OR REPLACE FUNCTION update_meta_calculated_metrics()
RETURNS TRIGGER AS $$
DECLARE
  purchase_value NUMERIC := 0;
  result_count INT := 0;
BEGIN
  -- Extract purchase conversion value from action_values JSON
  SELECT COALESCE(SUM(CAST(x.value AS NUMERIC)), 0) INTO purchase_value
  FROM jsonb_array_elements(NEW.action_values) AS action_value,
       jsonb_to_record(action_value) AS x(action_type text, value text)
  WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase';
  
  -- Count purchases (results)
  SELECT COALESCE(SUM(CAST(x.value AS NUMERIC)), 0) INTO result_count
  FROM jsonb_array_elements(NEW.actions) AS action,
       jsonb_to_record(action) AS x(action_type text, value text)
  WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase';
  
  -- Update purchase conversion value
  NEW.purchase_conversion_value := purchase_value;
  
  -- Update results
  NEW.results := result_count;
  
  -- Calculate cost per result if there are results
  IF result_count > 0 AND NEW.spend > 0 THEN
    NEW.cost_per_result := NEW.spend / result_count;
  ELSE
    NEW.cost_per_result := 0;
  END IF;
  
  -- Calculate cost per click if there are clicks
  IF NEW.clicks > 0 AND NEW.spend > 0 THEN
    NEW.cost_per_click := NEW.spend / NEW.clicks;
  ELSE
    NEW.cost_per_click := 0;
  END IF;
  
  -- Calculate click through rate if there are impressions
  IF NEW.impressions > 0 AND NEW.clicks > 0 THEN
    NEW.click_through_rate := (NEW.clicks::NUMERIC / NEW.impressions::NUMERIC) * 100;
  ELSE
    NEW.click_through_rate := 0;
  END IF;
  
  -- Update the timestamp
  NEW.updated_at := CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS calculate_meta_metrics ON public.meta_ad_insights;

-- Create trigger to auto-calculate metrics on insert or update
CREATE TRIGGER calculate_meta_metrics
BEFORE INSERT OR UPDATE OF impressions, clicks, spend, actions, action_values
ON public.meta_ad_insights
FOR EACH ROW
EXECUTE FUNCTION update_meta_calculated_metrics();

-- Update all existing records to calculate the metrics
-- We'll use a small modification to each record to trigger the update function
UPDATE public.meta_ad_insights SET 
  impressions = impressions
WHERE id > 0;

-- Notify of completion
DO $$
BEGIN
  RAISE NOTICE 'Meta calculated columns added and populated.';
END
$$; 