-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION public.check_column_exists(
  table_name_param TEXT,
  column_name_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = table_name_param
    AND column_name = column_name_param
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$;

-- Function to count records with non-zero views for a brand
CREATE OR REPLACE FUNCTION public.count_non_zero_views(
  brand_id_param UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.meta_ad_insights
  WHERE brand_id = brand_id_param
  AND views > 0;
  
  RETURN record_count;
END;
$$; 