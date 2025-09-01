-- CREATE TRIGGERS TO AUTOMATICALLY SYNC DATA TO DAILY TABLES
-- This script creates database triggers that will automatically 
-- populate the daily insights tables whenever data is added to meta_ad_insights

-- First, create a function to update ad daily insights
CREATE OR REPLACE FUNCTION sync_meta_ad_daily_insights()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update the corresponding record in meta_ad_daily_insights
  INSERT INTO public.meta_ad_daily_insights (
    brand_id, 
    ad_id,
    adset_id,
    date,
    spent,
    impressions,
    clicks,
    conversions,
    ctr,
    cpc,
    cost_per_conversion,
    reach
  ) VALUES (
    NEW.brand_id,
    NEW.ad_id,
    NEW.adset_id,
    NEW.date,
    NEW.spend,
    NEW.impressions,
    NEW.clicks,
    -- Extract conversions from actions
    COALESCE((
      SELECT SUM(CAST(value AS INTEGER))
      FROM jsonb_array_elements(NEW.actions) AS action,
           jsonb_to_record(action) AS x(action_type text, value text)
      WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase'
    ), 0),
    -- Calculate CTR
    CASE 
      WHEN NEW.impressions > 0 THEN (NEW.clicks::DECIMAL / NEW.impressions) 
      ELSE 0 
    END,
    -- Calculate CPC
    CASE 
      WHEN NEW.clicks > 0 THEN (NEW.spend::DECIMAL / NEW.clicks) 
      ELSE 0 
    END,
    -- Calculate cost per conversion
    CASE 
      WHEN (
        SELECT SUM(CAST(value AS INTEGER))
        FROM jsonb_array_elements(NEW.actions) AS action,
             jsonb_to_record(action) AS x(action_type text, value text)
        WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase'
      ) > 0 THEN 
        NEW.spend::DECIMAL / (
          SELECT SUM(CAST(value AS INTEGER))
          FROM jsonb_array_elements(NEW.actions) AS action,
               jsonb_to_record(action) AS x(action_type text, value text)
          WHERE x.action_type = 'purchase' OR x.action_type = 'offsite_conversion.fb_pixel_purchase'
        )
      ELSE 0 
    END,
    NEW.reach
  )
  ON CONFLICT (ad_id, date) DO UPDATE SET
    spent = EXCLUDED.spent,
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    conversions = EXCLUDED.conversions,
    ctr = EXCLUDED.ctr,
    cpc = EXCLUDED.cpc,
    cost_per_conversion = EXCLUDED.cost_per_conversion,
    reach = EXCLUDED.reach,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for ad insights
DROP TRIGGER IF EXISTS tr_sync_meta_ad_daily_insights ON public.meta_ad_insights;
CREATE TRIGGER tr_sync_meta_ad_daily_insights
AFTER INSERT OR UPDATE ON public.meta_ad_insights
FOR EACH ROW
WHEN (NEW.ad_id IS NOT NULL)
EXECUTE FUNCTION sync_meta_ad_daily_insights();

-- Also create a job to sync adset and campaign insights
CREATE OR REPLACE FUNCTION sync_higher_level_insights()
RETURNS void AS $$
BEGIN
  -- ADSET LEVEL - Aggregate data from meta_ad_daily_insights
  WITH adset_aggregates AS (
    SELECT 
      brand_id,
      adset_id,
      date,
      SUM(spent) AS spent,
      SUM(impressions) AS impressions,
      SUM(clicks) AS clicks,
      SUM(conversions) AS conversions,
      CASE 
        WHEN SUM(impressions) > 0 THEN SUM(clicks)::DECIMAL / SUM(impressions) 
        ELSE 0 
      END AS ctr,
      CASE 
        WHEN SUM(clicks) > 0 THEN SUM(spent)::DECIMAL / SUM(clicks) 
        ELSE 0 
      END AS cpc,
      CASE 
        WHEN SUM(conversions) > 0 THEN SUM(spent)::DECIMAL / SUM(conversions) 
        ELSE 0 
      END AS cost_per_conversion,
      SUM(reach) AS reach
    FROM meta_ad_daily_insights
    WHERE DATE >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY brand_id, adset_id, date
  )
  INSERT INTO meta_adset_daily_insights (
    brand_id, adset_id, date, spent, impressions, clicks, conversions, 
    ctr, cpc, cost_per_conversion, reach
  )
  SELECT 
    brand_id, adset_id, date, spent, impressions, clicks, conversions,
    ctr, cpc, cost_per_conversion, reach
  FROM adset_aggregates
  ON CONFLICT (adset_id, date) DO UPDATE SET
    spent = EXCLUDED.spent,
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    conversions = EXCLUDED.conversions,
    ctr = EXCLUDED.ctr,
    cpc = EXCLUDED.cpc,
    cost_per_conversion = EXCLUDED.cost_per_conversion,
    reach = EXCLUDED.reach,
    updated_at = NOW();

  -- CAMPAIGN LEVEL - Aggregate data from meta_ad_insights directly
  WITH campaign_data AS (
    SELECT
      ads.brand_id,
      ads.campaign_id,
      ads.date,
      SUM(ads.spent) AS spent,
      SUM(ads.impressions) AS impressions,
      SUM(ads.clicks) AS clicks, 
      SUM(ads.conversions) AS conversions,
      CASE 
        WHEN SUM(ads.impressions) > 0 THEN SUM(ads.clicks)::DECIMAL / SUM(ads.impressions) 
        ELSE 0 
      END AS ctr,
      CASE 
        WHEN SUM(ads.clicks) > 0 THEN SUM(ads.spent)::DECIMAL / SUM(ads.clicks) 
        ELSE 0 
      END AS cpc,
      CASE 
        WHEN SUM(ads.conversions) > 0 THEN SUM(ads.spent)::DECIMAL / SUM(ads.conversions) 
        ELSE 0 
      END AS cost_per_conversion,
      SUM(ads.reach) AS reach
    FROM meta_ad_daily_insights ads
    JOIN meta_ads a ON ads.ad_id = a.ad_id
    WHERE ads.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY ads.brand_id, ads.date, a.campaign_id
  )
  INSERT INTO meta_campaign_daily_insights (
    brand_id, campaign_id, date, spent, impressions, clicks, conversions,
    ctr, cpc, cost_per_conversion, reach
  )
  SELECT 
    brand_id, campaign_id, date, spent, impressions, clicks, conversions,
    ctr, cpc, cost_per_conversion, reach
  FROM campaign_data
  ON CONFLICT (campaign_id, date) DO UPDATE SET
    spent = EXCLUDED.spent,
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    conversions = EXCLUDED.conversions, 
    ctr = EXCLUDED.ctr,
    cpc = EXCLUDED.cpc,
    cost_per_conversion = EXCLUDED.cost_per_conversion,
    reach = EXCLUDED.reach,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a function to automatically run the higher level sync after ad syncs
CREATE OR REPLACE FUNCTION trigger_higher_level_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Collect insertions/updates for a while before running the sync
  -- This improves performance by not running for every single row
  IF (SELECT COUNT(*) FROM pg_stat_activity WHERE query LIKE '%sync_higher_level_insights%') = 0 THEN
    PERFORM pg_advisory_lock(42);  -- Get an advisory lock to prevent multiple executions
    PERFORM sync_higher_level_insights();
    PERFORM pg_advisory_unlock(42);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run the higher level sync after a batch of ad syncs
DROP TRIGGER IF EXISTS tr_trigger_higher_level_sync ON public.meta_ad_daily_insights;
CREATE TRIGGER tr_trigger_higher_level_sync
AFTER INSERT OR UPDATE ON public.meta_ad_daily_insights
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_higher_level_sync();

-- Create a scheduled job to run the higher level sync
DO $$
BEGIN
  -- Only add the job if it doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc WHERE proname = 'sync_higher_level_insights_job') THEN
    -- Define a wrapper function for the job
    CREATE OR REPLACE FUNCTION sync_higher_level_insights_job()
    RETURNS void AS $$
    BEGIN
      PERFORM sync_higher_level_insights();
    END;
    $$ LANGUAGE plpgsql;
    
    -- Schedule the job to run every hour
    SELECT cron.schedule('1 * * * *', 'SELECT sync_higher_level_insights_job()');
  END IF;
END
$$; 