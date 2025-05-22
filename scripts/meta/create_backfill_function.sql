-- Create a function that can be called from the API to backfill data
CREATE OR REPLACE FUNCTION backfill_meta_daily_insights()
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting backfill for meta_ad_daily_insights table...';

  -- STEP 1: Backfill meta_ad_daily_insights
  WITH source_data AS (
    SELECT 
      brand_id,
      ad_id,
      adset_id,
      date,
      spend AS spent,
      impressions,
      clicks,
      -- Extract conversions from actions
      COALESCE((
        SELECT SUM(CAST(value AS INTEGER))
        FROM jsonb_array_elements(actions) AS action,
             jsonb_to_record(action) AS x(action_type text, value text)
        WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase'
      ), 0) AS conversions,
      -- Calculate CTR
      CASE 
        WHEN impressions > 0 THEN (clicks::DECIMAL / impressions) 
        ELSE 0 
      END AS ctr,
      -- Calculate CPC
      CASE 
        WHEN clicks > 0 THEN (spend::DECIMAL / clicks) 
        ELSE 0 
      END AS cpc,
      -- Calculate cost per conversion
      CASE 
        WHEN (
          SELECT SUM(CAST(value AS INTEGER))
          FROM jsonb_array_elements(actions) AS action,
               jsonb_to_record(action) AS x(action_type text, value text)
          WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase'
        ) > 0 THEN 
          spend::DECIMAL / (
            SELECT SUM(CAST(value AS INTEGER))
            FROM jsonb_array_elements(actions) AS action,
                 jsonb_to_record(action) AS x(action_type text, value text)
            WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase'
          )
        ELSE 0 
      END AS cost_per_conversion,
      reach
    FROM meta_ad_insights
    WHERE ad_id IS NOT NULL AND date IS NOT NULL
  ),
  inserted AS (
    INSERT INTO meta_ad_daily_insights (
      brand_id, ad_id, adset_id, date, 
      spent, impressions, clicks, conversions, 
      ctr, cpc, cost_per_conversion, reach
    )
    SELECT
      brand_id, ad_id, adset_id, date,
      spent, impressions, clicks, conversions,
      ctr, cpc, cost_per_conversion, reach
    FROM source_data
    WHERE NOT EXISTS (
      SELECT 1 FROM meta_ad_daily_insights 
      WHERE meta_ad_daily_insights.ad_id = source_data.ad_id 
        AND meta_ad_daily_insights.date = source_data.date
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM inserted;
  
  RAISE NOTICE 'Inserted % records into meta_ad_daily_insights', v_count;

  -- STEP 2: Backfill meta_adset_daily_insights
  RAISE NOTICE 'Starting backfill for meta_adset_daily_insights table...';
  
  WITH source_data AS (
    SELECT 
      brand_id,
      adset_id,
      date,
      SUM(spend) AS spent,
      SUM(impressions) AS impressions,
      SUM(clicks) AS clicks,
      -- Sum conversions from all ads in this adset
      SUM(COALESCE((
        SELECT SUM(CAST(value AS INTEGER))
        FROM jsonb_array_elements(actions) AS action,
             jsonb_to_record(action) AS x(action_type text, value text)
        WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase'
      ), 0)) AS conversions,
      -- Calculate CTR
      CASE 
        WHEN SUM(impressions) > 0 THEN (SUM(clicks)::DECIMAL / SUM(impressions)) 
        ELSE 0 
      END AS ctr,
      -- Calculate CPC
      CASE 
        WHEN SUM(clicks) > 0 THEN (SUM(spend)::DECIMAL / SUM(clicks)) 
        ELSE 0 
      END AS cpc,
      -- Calculate cost per conversion
      CASE 
        WHEN SUM(COALESCE((
          SELECT SUM(CAST(value AS INTEGER))
          FROM jsonb_array_elements(actions) AS action,
               jsonb_to_record(action) AS x(action_type text, value text)
          WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase'
        ), 0)) > 0 THEN 
          SUM(spend)::DECIMAL / SUM(COALESCE((
            SELECT SUM(CAST(value AS INTEGER))
            FROM jsonb_array_elements(actions) AS action,
                 jsonb_to_record(action) AS x(action_type text, value text)
            WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase'
          ), 0))
        ELSE 0 
      END AS cost_per_conversion,
      SUM(reach) AS reach
    FROM meta_ad_insights
    WHERE adset_id IS NOT NULL AND date IS NOT NULL
    GROUP BY brand_id, adset_id, date
  ),
  inserted AS (
    INSERT INTO meta_adset_daily_insights (
      brand_id, adset_id, date, 
      spent, impressions, clicks, conversions, 
      ctr, cpc, cost_per_conversion, reach
    )
    SELECT
      brand_id, adset_id, date,
      spent, impressions, clicks, conversions,
      ctr, cpc, cost_per_conversion, reach
    FROM source_data
    WHERE NOT EXISTS (
      SELECT 1 FROM meta_adset_daily_insights 
      WHERE meta_adset_daily_insights.adset_id = source_data.adset_id 
        AND meta_adset_daily_insights.date = source_data.date
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM inserted;
  
  RAISE NOTICE 'Inserted % records into meta_adset_daily_insights', v_count;

  -- STEP 3: Backfill meta_campaign_daily_insights
  RAISE NOTICE 'Starting backfill for meta_campaign_daily_insights table...';
  
  WITH source_data AS (
    SELECT 
      brand_id,
      campaign_id,
      date,
      SUM(spend) AS spent,
      SUM(impressions) AS impressions,
      SUM(clicks) AS clicks,
      -- Sum conversions from all ads in this campaign
      SUM(COALESCE((
        SELECT SUM(CAST(value AS INTEGER))
        FROM jsonb_array_elements(actions) AS action,
             jsonb_to_record(action) AS x(action_type text, value text)
        WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase'
      ), 0)) AS conversions,
      -- Calculate CTR
      CASE 
        WHEN SUM(impressions) > 0 THEN (SUM(clicks)::DECIMAL / SUM(impressions)) 
        ELSE 0 
      END AS ctr,
      -- Calculate CPC
      CASE 
        WHEN SUM(clicks) > 0 THEN (SUM(spend)::DECIMAL / SUM(clicks)) 
        ELSE 0 
      END AS cpc,
      -- Calculate cost per conversion
      CASE 
        WHEN SUM(COALESCE((
          SELECT SUM(CAST(value AS INTEGER))
          FROM jsonb_array_elements(actions) AS action,
               jsonb_to_record(action) AS x(action_type text, value text)
          WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase'
        ), 0)) > 0 THEN 
          SUM(spend)::DECIMAL / SUM(COALESCE((
            SELECT SUM(CAST(value AS INTEGER))
            FROM jsonb_array_elements(actions) AS action,
                 jsonb_to_record(action) AS x(action_type text, value text)
            WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase'
          ), 0))
        ELSE 0 
      END AS cost_per_conversion,
      SUM(reach) AS reach
    FROM meta_ad_insights
    WHERE campaign_id IS NOT NULL AND date IS NOT NULL
    GROUP BY brand_id, campaign_id, date
  ),
  inserted AS (
    INSERT INTO meta_campaign_daily_insights (
      brand_id, campaign_id, date, 
      spent, impressions, clicks, conversions, 
      ctr, cpc, cost_per_conversion, reach
    )
    SELECT
      brand_id, campaign_id, date,
      spent, impressions, clicks, conversions,
      ctr, cpc, cost_per_conversion, reach
    FROM source_data
    WHERE NOT EXISTS (
      SELECT 1 FROM meta_campaign_daily_insights 
      WHERE meta_campaign_daily_insights.campaign_id = source_data.campaign_id 
        AND meta_campaign_daily_insights.date = source_data.date
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM inserted;
  
  RAISE NOTICE 'Inserted % records into meta_campaign_daily_insights', v_count;
  
  RAISE NOTICE 'Backfill completed successfully!';
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error during backfill: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to call this function
GRANT EXECUTE ON FUNCTION backfill_meta_daily_insights() TO service_role;
GRANT EXECUTE ON FUNCTION backfill_meta_daily_insights() TO authenticated; 