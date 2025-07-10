import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'

interface BlendedMetrics {
  spend: number
  revenue: number
  roas: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cpl: number
  platforms: {
    meta?: {
      spend: number
      revenue: number
      roas: number
      conversions: number
      impressions: number
      clicks: number
    }
    google?: {
      spend: number
      revenue: number
      roas: number
      conversions: number
      impressions: number
      clicks: number
    }
    tiktok?: {
      spend: number
      revenue: number
      roas: number
      conversions: number
      impressions: number
      clicks: number
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    const supabase = createClient()

    // Verify user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('user_id', userId)
      .single()

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 403 })
    }

    const metrics: BlendedMetrics = {
      spend: 0,
      revenue: 0,
      roas: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      cpl: 0,
      platforms: {}
    }

    // Get Meta (Facebook/Instagram) metrics
    let metaQuery = supabase
      .from('meta_campaigns')
      .select('spent, impressions, clicks, conversions, roas')
      .eq('brand_id', brandId)
      .neq('status', 'DELETED')

    // Apply date filters if provided
    if (dateFrom) {
      metaQuery = metaQuery.gte('start_date', dateFrom)
    }
    if (dateTo) {
      metaQuery = metaQuery.lte('start_date', dateTo)
    }

    const { data: metaCampaigns, error: metaError } = await metaQuery

    if (!metaError && metaCampaigns && metaCampaigns.length > 0) {
      const metaMetrics = metaCampaigns.reduce((acc, campaign) => ({
        spend: acc.spend + (campaign.spent || 0),
        impressions: acc.impressions + (campaign.impressions || 0),
        clicks: acc.clicks + (campaign.clicks || 0),
        conversions: acc.conversions + (campaign.conversions || 0),
        revenue: acc.revenue + ((campaign.spent || 0) * (campaign.roas || 0))
      }), {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0
      })

      // Calculate Meta-specific metrics
      const metaRoas = metaMetrics.spend > 0 ? metaMetrics.revenue / metaMetrics.spend : 0

      metrics.platforms.meta = {
        spend: metaMetrics.spend,
        revenue: metaMetrics.revenue,
        roas: metaRoas,
        conversions: metaMetrics.conversions,
        impressions: metaMetrics.impressions,
        clicks: metaMetrics.clicks
      }

      // Add to totals
      metrics.spend += metaMetrics.spend
      metrics.revenue += metaMetrics.revenue
      metrics.impressions += metaMetrics.impressions
      metrics.clicks += metaMetrics.clicks
      metrics.conversions += metaMetrics.conversions
    }

    // TODO: Add Google Ads metrics when implemented
    // TODO: Add TikTok Ads metrics when implemented

    // Calculate blended metrics
    if (metrics.spend > 0) {
      metrics.roas = metrics.revenue / metrics.spend
      metrics.cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0
      metrics.cpl = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
    }

    if (metrics.impressions > 0) {
      metrics.ctr = (metrics.clicks / metrics.impressions) * 100
    }

    // Round metrics for display
    metrics.spend = Math.round(metrics.spend * 100) / 100
    metrics.revenue = Math.round(metrics.revenue * 100) / 100
    metrics.roas = Math.round(metrics.roas * 100) / 100
    metrics.ctr = Math.round(metrics.ctr * 100) / 100
    metrics.cpc = Math.round(metrics.cpc * 100) / 100
    metrics.cpl = Math.round(metrics.cpl * 100) / 100

    return NextResponse.json({ 
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching blended metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
} 