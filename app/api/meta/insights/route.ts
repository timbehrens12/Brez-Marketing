import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

interface MetaConnection {
  access_token: string;
  account_id: string;
}

interface AccountData {
  campaigns: any[]
  adsets: any[]
  insights: any[]
  totalSpend: number
  totalReach: number
}

async function fetchMetaData(conn: MetaConnection) {
  try {
    // Using Facebook Marketing API
    const baseUrl = 'https://graph.facebook.com/v18.0';
    
    const [campaigns, adsets, insights] = await Promise.all([
      // Fetch campaigns
      fetch(`${baseUrl}/${conn.account_id}/campaigns?access_token=${conn.access_token}`)
        .then(res => res.json()),
      
      // Fetch ad sets
      fetch(`${baseUrl}/${conn.account_id}/adsets?access_token=${conn.access_token}`)
        .then(res => res.json()),
      
      // Fetch insights
      fetch(`${baseUrl}/${conn.account_id}/insights?access_token=${conn.access_token}&fields=spend,reach`)
        .then(res => res.json())
    ]);

    return {
      campaigns: campaigns.data || [],
      adsets: adsets.data || [],
      insights: insights.data || [],
      totalSpend: insights.data?.reduce((sum: number, insight: any) => 
        sum + (Number(insight.spend) || 0), 0) || 0,
      totalReach: insights.data?.reduce((sum: number, insight: any) => 
        sum + (Number(insight.reach) || 0), 0) || 0
    };
  } catch (error) {
    console.error('Meta API Error:', error);
    return {
      campaigns: [],
      adsets: [],
      insights: [],
      totalSpend: 0,
      totalReach: 0
    };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')

  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
  }

  try {
    // Get all Meta connections for this brand
    const { data: connections, error: connError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    if (connError) throw connError

    // Fetch data from all connected Meta accounts
    const allAccountData = await Promise.all(
      connections.map(async (conn: MetaConnection) => {
        // Your Meta API call logic here
        // Use conn.access_token and conn.account_id
        return fetchMetaData(conn)
      })
    )

    // Aggregate data from all accounts
    const aggregatedData = {
      campaigns: allAccountData.flatMap((data: AccountData) => data.campaigns),
      adsets: allAccountData.flatMap((data: AccountData) => data.adsets),
      insights: allAccountData.flatMap((data: AccountData) => data.insights),
      totalSpend: allAccountData.reduce((sum: number, data: AccountData) => sum + data.totalSpend, 0),
      totalReach: allAccountData.reduce((sum: number, data: AccountData) => sum + data.totalReach, 0)
    }

    return NextResponse.json(aggregatedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
} 