-- refresh_campaign_budgets.sql
-- Creates a function to refresh campaign budgets from the API

-- Create function to refresh campaign budgets for a specific brand
CREATE OR REPLACE FUNCTION refresh_campaign_budgets(brand_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  affected_rows INTEGER;
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  duration_ms INTEGER;
BEGIN
  -- Record start time
  start_time := clock_timestamp();
  
  -- Update campaign budgets by hitting the API endpoint
  -- This is just a placeholder - the actual refresh is done by the API
  UPDATE public.meta_campaigns
  SET last_budget_refresh = NOW()
  WHERE brand_id = brand_uuid;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Record end time and calculate duration
  end_time := clock_timestamp();
  duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  
  -- Return summary
  RETURN format('Refreshed budget data for %s campaigns in %s ms', 
                affected_rows::TEXT, 
                duration_ms::TEXT);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_campaign_budgets(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_campaign_budgets(UUID) TO service_role;

-- Display success notification
DO $$
BEGIN
  RAISE NOTICE 'Refresh campaign budgets function created successfully.';
END $$; 