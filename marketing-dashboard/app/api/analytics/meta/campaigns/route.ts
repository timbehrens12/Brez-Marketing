import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    // Try to get data from the database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data, error } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('brand_id', brandId)

    if (error) {
      console.error('Database error:', error)
      // Return mock data for now
      return NextResponse.json({ 
        campaigns: generateMockCampaigns() 
      })
    }

    return NextResponse.json({ campaigns: data })
  } catch (error) {
    console.error('Error in Meta campaigns endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
}

function generateMockCampaigns() {
  return [
    {
      id: '1',
      campaign_name: 'Summer Sale 2023',
      status: 'ACTIVE',
      spend: 1250.75,
      impressions: 85000,
      clicks: 3200,
      ctr: 3.76,
      conversions: 128,
      cpa: 9.77,
      roas: 4.2,
      start_date: '2023-06-01',
      end_date: '2023-08-31'
    },
    {
      id: '2',
      campaign_name: 'New Product Launch',
      status: 'ACTIVE',
      spend: 2450.50,
      impressions: 120000,
      clicks: 5800,
      ctr: 4.83,
      conversions: 210,
      cpa: 11.67,
      roas: 3.8,
      start_date: '2023-09-15',
      end_date: null
    },
    {
      id: '3',
      campaign_name: 'Holiday Special',
      status: 'PAUSED',
      spend: 850.25,
      impressions: 45000,
      clicks: 1800,
      ctr: 4.00,
      conversions: 72,
      cpa: 11.81,
      roas: 3.5,
      start_date: '2023-11-01',
      end_date: '2023-12-31'
    },
    {
      id: '4',
      campaign_name: 'Retargeting Campaign',
      status: 'ACTIVE',
      spend: 750.00,
      impressions: 32000,
      clicks: 1600,
      ctr: 5.00,
      conversions: 96,
      cpa: 7.81,
      roas: 5.2,
      start_date: '2023-10-01',
      end_date: null
    },
    {
      id: '5',
      campaign_name: 'Brand Awareness',
      status: 'COMPLETED',
      spend: 1800.00,
      impressions: 150000,
      clicks: 4500,
      ctr: 3.00,
      conversions: 90,
      cpa: 20.00,
      roas: 2.1,
      start_date: '2023-05-01',
      end_date: '2023-07-31'
    }
  ]
} 