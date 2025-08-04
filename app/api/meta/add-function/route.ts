import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

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

    // SQL for function
    const functionSQL = `
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
    
    GRANT EXECUTE ON FUNCTION get_adset_insights_by_date_range TO authenticated;
    GRANT EXECUTE ON FUNCTION get_adset_insights_by_date_range TO service_role;
    `;

    // Execute SQL directly 
    const { error } = await supabase.rpc('execute_sql', { 
      sql_query: functionSQL 
    });

    if (error) {
      console.error('Error creating function:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully created get_adset_insights_by_date_range function'
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Unexpected error', 
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 