import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log(`[DEBUG] Checking data for brand ${brandId}`)

    // Check what campaigns exist
    const { data: campaigns, error: campaignsError } = await supabase
      .from('meta_campaigns')
      .select('campaign_id, campaign_name, status, spent, roas')
      .eq('brand_id', brandId)

    console.log(`[DEBUG] Campaigns query result:`, { campaigns, error: campaignsError })

    // Check what daily stats exist
    const { data: dailyStats, error: statsError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('campaign_id, date, spend, roas, impressions, clicks')
      .eq('brand_id', brandId)
      .limit(10)

    console.log(`[DEBUG] Daily stats query result:`, { dailyStats, error: statsError })

    // Check recent date range
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const { data: recentStats, error: recentError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('campaign_id, date, spend, roas')
      .eq('brand_id', brandId)
      .gte('date', weekAgo.toISOString().split('T')[0])
      .lte('date', today.toISOString().split('T')[0])

    console.log(`[DEBUG] Recent stats (last 7 days):`, { recentStats, error: recentError })

    return NextResponse.json({
      success: true,
      debug: {
        brandId,
        campaigns: {
          count: campaigns?.length || 0,
          data: campaigns,
          error: campaignsError
        },
        dailyStats: {
          count: dailyStats?.length || 0,
          data: dailyStats,
          error: statsError
        },
        recentStats: {
          count: recentStats?.length || 0,
          data: recentStats,
          error: recentError,
          dateRange: {
            from: weekAgo.toISOString().split('T')[0],
            to: today.toISOString().split('T')[0]
          }
        }
      }
    })

  } catch (error) {
    console.error('[DEBUG] Error:', error)
    return NextResponse.json({ error: 'Debug failed', details: error }, { status: 500 })
  }
}
