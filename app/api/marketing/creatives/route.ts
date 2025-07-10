import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'

interface Creative {
  id: string
  name: string
  campaign: string
  platform: 'meta' | 'google' | 'tiktok'
  type: 'image' | 'video' | 'carousel' | 'text'
  thumbnail?: string
  headline?: string
  body?: string
  spend: number
  roas: number
  ctr: number
  conversions: number
  status: string
  cpc: number
  impressions: number
  clicks: number
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

    const creatives: Creative[] = []

    // Get Meta ads (creatives) with campaign info
    let metaQuery = supabase
      .from('meta_ads')
      .select(`
        ad_id,
        ad_name,
        campaign_id,
        status,
        headline,
        body,
        cta_type,
        image_url,
        video_id,
        spent,
        impressions,
        clicks,
        conversions,
        ctr,
        cpc,
        meta_campaigns!inner(campaign_name, campaign_id)
      `)
      .eq('brand_id', brandId)
      .neq('status', 'DELETED')
      .order('spent', { ascending: false })

    const { data: metaAds, error: metaError } = await metaQuery

    if (!metaError && metaAds) {
      for (const ad of metaAds) {
        // Determine creative type
        let creativeType: 'image' | 'video' | 'carousel' | 'text' = 'text'
        if (ad.video_id) {
          creativeType = 'video'
        } else if (ad.image_url) {
          creativeType = 'image'
        }
        // TODO: Detect carousel ads based on additional fields

        // Calculate ROAS (assuming revenue = spend * some multiplier from campaign data)
        const revenue = ad.spent * 2.5 // Simplified - should get actual revenue data
        const roas = ad.spent > 0 ? revenue / ad.spent : 0

        const creative: Creative = {
          id: ad.ad_id,
          name: ad.ad_name,
          campaign: (ad.meta_campaigns as any)?.[0]?.campaign_name || 'Unknown Campaign',
          platform: 'meta',
          type: creativeType,
          thumbnail: ad.image_url,
          headline: ad.headline,
          body: ad.body,
          spend: ad.spent || 0,
          roas: roas,
          ctr: ad.ctr || 0,
          conversions: ad.conversions || 0,
          status: ad.status,
          cpc: ad.cpc || 0,
          impressions: ad.impressions || 0,
          clicks: ad.clicks || 0
        }

        creatives.push(creative)
      }
    }

    // TODO: Add Google Ads creatives when implemented
    // TODO: Add TikTok Ads creatives when implemented

    // Sort by spend descending
    creatives.sort((a, b) => b.spend - a.spend)

    return NextResponse.json({ 
      success: true,
      data: creatives,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching creatives:', error)
    return NextResponse.json({ error: 'Failed to fetch creatives' }, { status: 500 })
  }
} 