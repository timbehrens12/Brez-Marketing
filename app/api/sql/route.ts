import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'

// Function to create a server-side Supabase client with admin privileges
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// SQL fixes to apply
const getAdsetInsightsByDateRangeSQL = `
-- Function to get ad set insights by date range
CREATE OR REPLACE FUNCTION get_adset_insights_by_date_range(
  brand_uuid UUID, 
  p_from_date DATE, 
  p_to_date DATE
) 
RETURNS TABLE (
  adset_id TEXT,
  adset_name TEXT,
  campaign_id TEXT,
  status TEXT,
  budget DECIMAL,
  budget_type TEXT,
  spent DECIMAL,
  impressions INTEGER,
  clicks INTEGER,
  conversions INTEGER,
  ctr DECIMAL,
  cpc DECIMAL,
  cost_per_conversion DECIMAL,
  daily_insights JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.adset_id,
    a.adset_name,
    a.campaign_id,
    a.status,
    a.budget,
    a.budget_type,
    COALESCE(SUM(i.spent), 0) as spent,
    COALESCE(SUM(i.impressions), 0) as impressions,
    COALESCE(SUM(i.clicks), 0) as clicks,
    COALESCE(SUM(i.conversions), 0) as conversions,
    CASE 
      WHEN COALESCE(SUM(i.impressions), 0) > 0 THEN 
        COALESCE(SUM(i.clicks), 0)::DECIMAL / COALESCE(SUM(i.impressions), 0) 
      ELSE 0 
    END as ctr,
    CASE 
      WHEN COALESCE(SUM(i.clicks), 0) > 0 THEN 
        COALESCE(SUM(i.spent), 0) / COALESCE(SUM(i.clicks), 0) 
      ELSE 0 
    END as cpc,
    CASE 
      WHEN COALESCE(SUM(i.conversions), 0) > 0 THEN 
        COALESCE(SUM(i.spent), 0) / COALESCE(SUM(i.conversions), 0) 
      ELSE 0 
    END as cost_per_conversion,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', daily.date,
          'spent', daily.spent,
          'impressions', daily.impressions,
          'clicks', daily.clicks,
          'conversions', daily.conversions,
          'ctr', daily.ctr,
          'cpc', daily.cpc,
          'cost_per_conversion', daily.cost_per_conversion
        )
      ), '[]'::jsonb)
      FROM (
        SELECT 
          i.date,
          i.spent,
          i.impressions,
          i.clicks,
          i.conversions,
          i.ctr,
          i.cpc,
          i.cost_per_conversion
        FROM public.meta_adset_daily_insights i
        WHERE i.adset_id = a.adset_id
        AND i.date BETWEEN p_from_date AND p_to_date
        ORDER BY i.date DESC
      ) as daily
    ) as daily_insights
  FROM public.meta_adsets a
  LEFT JOIN public.meta_adset_daily_insights i 
    ON a.adset_id = i.adset_id 
    AND i.date BETWEEN p_from_date AND p_to_date
  WHERE a.brand_id = brand_uuid
  GROUP BY 
    a.adset_id, 
    a.adset_name, 
    a.campaign_id, 
    a.status, 
    a.budget, 
    a.budget_type;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION get_adset_insights_by_date_range TO authenticated;
GRANT EXECUTE ON FUNCTION get_adset_insights_by_date_range TO service_role;
`

const addLastBudgetRefreshColumnSQL = `
-- Add last_budget_refresh column to meta_campaigns table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meta_campaigns'
    AND column_name = 'last_budget_refresh'
  ) THEN
    ALTER TABLE public.meta_campaigns 
    ADD COLUMN last_budget_refresh TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    
    COMMENT ON COLUMN public.meta_campaigns.last_budget_refresh IS 'Timestamp of when the campaign budget was last refreshed from Meta API';
  END IF;
END $$;
`

const addLastRefreshDateColumnSQL = `
-- Add last_refresh_date column to meta_campaign_daily_insights table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meta_campaign_daily_insights'
    AND column_name = 'last_refresh_date'
  ) THEN
    ALTER TABLE public.meta_campaign_daily_insights 
    ADD COLUMN last_refresh_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    
    COMMENT ON COLUMN public.meta_campaign_daily_insights.last_refresh_date IS 'Timestamp of when the campaign insights were last refreshed from Meta API';
  END IF;
END $$;
`

export async function GET(request: NextRequest) {
  // 🔒 SECURITY: Block in production
  if (process.env.NODE_ENV === 'production') {
    console.warn('🚨 SECURITY: SQL endpoint blocked in production')
    return NextResponse.json(
      { error: 'SQL endpoint not available in production' }, 
      { status: 403 }
    )
  }

  // 🔒 SECURITY: Require authentication even in development
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 🔒 SECURITY: Rate limiting for SQL operations
  const { rateLimiter } = await import('@/lib/rate-limiter')
  const rateLimitResult = await rateLimiter.limit(
    `sql-operations:${userId}`,
    { interval: 300, limit: 3 } // Only 3 SQL operations per 5 minutes
  )
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded for SQL operations',
        retryAfter: rateLimitResult.retryAfter
      }, 
      { status: 429 }
    )
  }

  console.log(`🔒 SECURE: SQL operations accessed by authenticated user: ${userId}`)

  try {
    const supabase = createAdminClient()
    const results = []
    
    // Run SQL to add last_budget_refresh column
    console.log('Adding last_budget_refresh column to meta_campaigns table...')
    const { data: columnData, error: columnError } = await supabase.rpc('exec_sql', { sql: addLastBudgetRefreshColumnSQL })
    
    if (columnError) {
      console.error('Error adding last_budget_refresh column:', columnError)
      results.push({ operation: 'add_last_budget_refresh_column', success: false, error: columnError.message })
    } else {
      console.log('Successfully added last_budget_refresh column')
      results.push({ operation: 'add_last_budget_refresh_column', success: true })
    }
    
    // Run SQL to create get_adset_insights_by_date_range function
    console.log('Creating get_adset_insights_by_date_range function...')
    const { data: functionData, error: functionError } = await supabase.rpc('exec_sql', { sql: getAdsetInsightsByDateRangeSQL })
    
    if (functionError) {
      console.error('Error creating get_adset_insights_by_date_range function:', functionError)
      results.push({ operation: 'create_adset_insights_function', success: false, error: functionError.message })
    } else {
      console.log('Successfully created get_adset_insights_by_date_range function')
      results.push({ operation: 'create_adset_insights_function', success: true })
    }
    
    // Run SQL to add last_refresh_date column to meta_campaign_daily_insights
    console.log('Adding last_refresh_date column to meta_campaign_daily_insights table...')
    const { data: refreshDateData, error: refreshDateError } = await supabase.rpc('exec_sql', { sql: addLastRefreshDateColumnSQL })
    
    if (refreshDateError) {
      console.error('Error adding last_refresh_date column:', refreshDateError)
      results.push({ operation: 'add_last_refresh_date_column', success: false, error: refreshDateError.message })
    } else {
      console.log('Successfully added last_refresh_date column')
      results.push({ operation: 'add_last_refresh_date_column', success: true })
    }

    return NextResponse.json({ 
      success: true, 
      results,
      message: 'SQL fixes applied. Campaign status updates should now be working correctly.'
    })
  } catch (error) {
    console.error('Error applying SQL fixes:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error applying SQL fixes',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 