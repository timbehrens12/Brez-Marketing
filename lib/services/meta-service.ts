import { createClient } from '@supabase/supabase-js'

export async function fetchMetaAdInsights(brandId: string, startDate: string, endDate: string) {
  try {
    console.log(`Starting Meta sync for brand ${brandId} from ${startDate} to ${endDate}`)
    
    // Get the access token from the database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Get the Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      console.error('No Meta connection found:', connectionError)
      return { error: 'No active Meta connection found' }
    }

    console.log(`Found Meta connection for brand ${brandId}`)

    // First, get the ad accounts
    console.log('Fetching ad accounts...')
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_id&access_token=${connection.access_token}`
    )
    
    const accountsData = await accountsResponse.json()
    console.log('Ad accounts response:', JSON.stringify(accountsData))
    
    if (accountsData.error) {
      console.error('Error fetching ad accounts:', accountsData.error)
      return { error: 'Failed to fetch ad accounts', details: accountsData.error }
    }

    if (!accountsData.data || accountsData.data.length === 0) {
      console.log('No ad accounts found for this user')
      return { 
        success: true, 
        message: 'Connection is working, but no ad accounts found',
        accounts: []
      }
    }

    console.log(`Found ${accountsData.data.length} ad accounts`)

    // For each ad account, get the insights
    const allInsights = []
    
    for (const account of accountsData.data || []) {
      // Fetch campaign insights
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${account.id}/insights?` +
        `fields=campaign_id,campaign_name,spend,impressions,clicks,reach,cpc,cpm,ctr` +
        `&time_range={"since":"${startDate}","until":"${endDate}"}` +
        `&level=campaign` +
        `&access_token=${connection.access_token}`
      )
      
      const insightsData = await insightsResponse.json()
      
      if (insightsData.error) {
        console.error(`Error fetching insights for account ${account.id}:`, insightsData.error)
        continue
      }
      
      // Add account info to each insight
      const enrichedInsights = (insightsData.data || []).map(insight => ({
        ...insight,
        account_id: account.id,
        account_name: account.name
      }))
      
      allInsights.push(...enrichedInsights)
    }

    // Store the insights in the database
    if (allInsights.length > 0) {
      const { error: insertError } = await supabase
        .from('meta_data_tracking')
        .upsert(
          allInsights.map(insight => ({
            brand_id: brandId,
            account_id: insight.account_id,
            account_name: insight.account_name,
            campaign_id: insight.campaign_id,
            campaign_name: insight.campaign_name,
            spend: parseFloat(insight.spend || 0),
            impressions: parseInt(insight.impressions || 0, 10),
            clicks: parseInt(insight.clicks || 0, 10),
            reach: parseInt(insight.reach || 0, 10),
            cpc: parseFloat(insight.cpc || 0),
            cpm: parseFloat(insight.cpm || 0),
            ctr: parseFloat(insight.ctr || 0),
            date_start: startDate,
            date_end: endDate,
            data_type: 'campaign',
            created_at: new Date().toISOString()
          }))
        )

      if (insertError) {
        console.error('Error storing insights:', insertError)
        return { error: 'Failed to store insights', details: insertError }
      }
    }

    return { success: true, insights: allInsights }
  } catch (error) {
    console.error('Error in fetchMetaAdInsights:', error)
    return { 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }
  }
}

/**
 * Fetch Meta Ads metrics from the API
 */
export async function fetchMetaMetrics(brandId: string) {
  try {
    const response = await fetch(`/api/metrics/meta?brandId=${brandId}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Meta metrics: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching Meta metrics:', error)
    throw error
  }
} 