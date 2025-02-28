import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Generate mock data
    const campaigns = [
      'Summer Sale 2023',
      'New Product Launch',
      'Holiday Special',
      'Brand Awareness',
      'Retargeting Campaign'
    ]
    
    const mockData = campaigns.map(campaign => {
      const spend = Math.random() * 1000
      const impressions = Math.floor(Math.random() * 100000)
      const clicks = Math.floor(Math.random() * 5000)
      const reach = Math.floor(Math.random() * 50000)
      
      return {
        brand_id: brandId,
        account_id: 'act_498473601902770',
        account_name: 'Brez Marketing Ad Account',
        campaign_id: `camp_${Math.random().toString(36).substring(2, 10)}`,
        campaign_name: campaign,
        spend: spend.toFixed(2),
        impressions: impressions,
        clicks: clicks,
        reach: reach,
        cpc: (spend / clicks).toFixed(2),
        cpm: ((spend / impressions) * 1000).toFixed(2),
        ctr: ((clicks / impressions) * 100).toFixed(2),
        date_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date_end: new Date().toISOString().split('T')[0],
        data_type: 'campaign',
        created_at: new Date().toISOString()
      }
    })

    // Insert mock data
    const { error: insertError } = await supabase
      .from('meta_data_tracking')
      .upsert(mockData)

    if (insertError) {
      console.error('Error inserting mock data:', insertError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to insert mock data',
        details: insertError
      })
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${mockData.length} mock campaigns`,
      data: mockData
    })
  } catch (error) {
    console.error('Error generating mock data:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
} 