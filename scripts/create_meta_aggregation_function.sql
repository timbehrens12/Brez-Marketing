-- PRODUCTION FIX: Database function to properly aggregate Meta data
-- This ensures all data flows correctly from ad insights to adset summaries

CREATE OR REPLACE FUNCTION aggregate_meta_data(target_brand_id UUID)
RETURNS void AS $$
BEGIN
  -- 1. Aggregate ad insights into adset daily insights
  INSERT INTO meta_adset_daily_insights (
    brand_id, 
    adset_id, 
    date, 
    spent, 
    impressions, 
    clicks, 
    conversions, 
    reach, 
    ctr, 
    cpc, 
    cost_per_conversion
  )
  SELECT 
    brand_id,
    adset_id,
    date,
    SUM(spend::numeric) as spent,
    SUM(impressions) as impressions,
    SUM(clicks) as clicks,
    SUM(COALESCE(conversions, 0)) as conversions,
    MAX(COALESCE(reach, 0)) as reach,  -- Reach is NOT additive - use MAX
    AVG(COALESCE(ctr, 0)) as ctr,
    AVG(COALESCE(cpc, 0)) as cpc,
    CASE WHEN SUM(COALESCE(conversions, 0)) > 0 THEN SUM(spend::numeric) / SUM(conversions) ELSE 0 END as cost_per_conversion
  FROM meta_ad_insights
  WHERE brand_id = target_brand_id
    AND adset_id IS NOT NULL
    AND date IS NOT NULL
  GROUP BY brand_id, adset_id, date
  ON CONFLICT (adset_id, date) DO UPDATE SET
    spent = EXCLUDED.spent,
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    conversions = EXCLUDED.conversions,
    reach = EXCLUDED.reach,
    ctr = EXCLUDED.ctr,
    cpc = EXCLUDED.cpc,
    cost_per_conversion = EXCLUDED.cost_per_conversion,
    updated_at = NOW();

  -- 2. Populate meta_adsets summary table
  INSERT INTO meta_adsets (
    brand_id,
    adset_id,
    adset_name,
    campaign_id,
    status,
    reach,
    impressions,
    clicks,
    spent
  )
  SELECT 
    daily.brand_id,
    daily.adset_id,
    COALESCE(insights.adset_name, 'Ad Set ' || daily.adset_id) as adset_name,
    COALESCE(insights.campaign_id, 'unknown') as campaign_id,
    'ACTIVE' as status,
    MAX(daily.reach) as reach,  -- Total reach = max reach across all days
    SUM(daily.impressions) as impressions,
    SUM(daily.clicks) as clicks,
    SUM(daily.spent) as spent
  FROM meta_adset_daily_insights daily
  LEFT JOIN (
    SELECT DISTINCT adset_id, adset_name, campaign_id
    FROM meta_ad_insights 
    WHERE brand_id = target_brand_id
  ) insights ON daily.adset_id = insights.adset_id
  WHERE daily.brand_id = target_brand_id
  GROUP BY daily.brand_id, daily.adset_id, insights.adset_name, insights.campaign_id
  ON CONFLICT (adset_id) DO UPDATE SET
    reach = EXCLUDED.reach,
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    spent = EXCLUDED.spent,
    updated_at = NOW();

  RAISE NOTICE 'Meta data aggregation completed for brand %', target_brand_id;
END;
$$ LANGUAGE plpgsql;
