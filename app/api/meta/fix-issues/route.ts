import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

// SQL script to create or update the get_adset_insights_by_date_range function
const createAdsetInsightsFunctionSQL = `
-- Create or replace function to get ad set insights by date range
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
`;

// SQL script to add the last_budget_refresh column
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
    
    -- Add comment for documentation
    COMMENT ON COLUMN public.meta_campaigns.last_budget_refresh IS 'Timestamp of when the campaign budget was last refreshed from Meta API';
    
    RAISE NOTICE 'Added last_budget_refresh column to meta_campaigns table';
  ELSE
    RAISE NOTICE 'last_budget_refresh column already exists in meta_campaigns table';
  END IF;
END $$;
`;

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Track fixed issues
    const fixes = [];

    // Fix 1: Add the last_budget_refresh column
    console.log('Adding last_budget_refresh column to meta_campaigns table...');
    try {
      // Using generic rpc to execute SQL
      const { error: columnError } = await supabase.rpc(
        'pgpsql', 
        { query: addLastBudgetRefreshColumnSQL }
      );
      
      if (columnError) {
        console.error('Error adding last_budget_refresh column:', columnError);
        fixes.push({
          operation: 'add_last_budget_refresh_column',
          success: false,
          error: columnError.message
        });
      } else {
        fixes.push({
          operation: 'add_last_budget_refresh_column',
          success: true
        });
      }
    } catch (err) {
      console.error('Exception adding last_budget_refresh column:', err);
      fixes.push({
        operation: 'add_last_budget_refresh_column',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    // Fix 2: Create the get_adset_insights_by_date_range function
    console.log('Creating get_adset_insights_by_date_range function...');
    try {
      // Using generic rpc to execute SQL
      const { error: functionError } = await supabase.rpc(
        'pgpsql', 
        { query: createAdsetInsightsFunctionSQL }
      );
      
      if (functionError) {
        console.error('Error creating get_adset_insights_by_date_range function:', functionError);
        fixes.push({
          operation: 'create_adset_insights_function',
          success: false,
          error: functionError.message
        });
      } else {
        fixes.push({
          operation: 'create_adset_insights_function',
          success: true
        });
      }
    } catch (err) {
      console.error('Exception creating get_adset_insights_by_date_range function:', err);
      fixes.push({
        operation: 'create_adset_insights_function',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    // Return results of fixes
    return NextResponse.json({
      success: fixes.every(fix => fix.success),
      fixes,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Unexpected error in fix-issues endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Unexpected error', 
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 