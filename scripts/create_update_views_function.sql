-- Create a function to update views from reach for a specific brand
CREATE OR REPLACE FUNCTION public.update_meta_views_from_reach(brand_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update views values based on reach for the specified brand
  UPDATE public.meta_ad_insights 
  SET views = reach 
  WHERE brand_id = brand_id_param
    AND (views IS NULL OR views = 0) 
    AND reach IS NOT NULL 
    AND reach > 0;
  
  -- Get count of updated records
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log the result
  RAISE NOTICE 'Updated views data for brand %: % records updated', brand_id_param, updated_count;
END;
$$; 