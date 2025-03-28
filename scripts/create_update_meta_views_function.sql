-- Function to update views from reach for a specific brand
CREATE OR REPLACE FUNCTION public.update_meta_views(brand_id_param UUID)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  update_count INT;
BEGIN
  -- Update views from reach
  UPDATE public.meta_ad_insights 
  SET views = reach 
  WHERE brand_id = brand_id_param
    AND (views IS NULL OR views = 0) 
    AND reach IS NOT NULL 
    AND reach > 0;
    
  -- Get count of updated rows
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  -- Return the count of updated records
  RETURN update_count;
END;
$$; 