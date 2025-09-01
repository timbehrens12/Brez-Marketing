-- Function to calculate and update adset_budget_total for all campaigns in a brand
CREATE OR REPLACE FUNCTION update_campaign_adset_budget_totals(brand_uuid UUID) 
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  start_time TIMESTAMP := clock_timestamp();
  end_time TIMESTAMP;
  duration_ms BIGINT;
  updated_rows INTEGER := 0;
  campaign_count INTEGER := 0;
BEGIN
  -- Get count of campaigns for this brand
  SELECT COUNT(*) INTO campaign_count
  FROM public.meta_campaigns
  WHERE brand_id = brand_uuid;
  
  -- Update adset_budget_total for each campaign based on the sum of its ad sets' budgets
  UPDATE public.meta_campaigns c
  SET 
    adset_budget_total = adset_budgets.total_budget,
    updated_at = NOW()
  FROM (
    SELECT 
      campaign_id,
      SUM(budget) as total_budget
    FROM public.meta_adsets
    WHERE brand_id = brand_uuid
    GROUP BY campaign_id
  ) adset_budgets
  WHERE c.campaign_id = adset_budgets.campaign_id
  AND c.brand_id = brand_uuid;
  
  -- Get number of updated rows
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  -- Calculate duration
  end_time := clock_timestamp();
  duration_ms := extract(epoch from (end_time - start_time)) * 1000;
  
  -- Return summary message
  RETURN format(
    'Updated adset_budget_total for %s campaigns out of %s total in brand. (Completed in %s ms)',
    updated_rows,
    campaign_count,
    duration_ms
  );
END;
$$;

-- Grant execute permissions to functions
GRANT EXECUTE ON FUNCTION update_campaign_adset_budget_totals TO authenticated;
GRANT EXECUTE ON FUNCTION update_campaign_adset_budget_totals TO service_role;

-- Success message for manual execution
DO $$
BEGIN
  RAISE NOTICE 'Successfully created update_campaign_adset_budget_totals function.';
END
$$; 