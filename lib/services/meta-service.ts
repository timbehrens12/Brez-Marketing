import { createClient } from '@supabase/supabase-js'

/**
 * Fetches Meta ad insights for a specific brand within a date range
 */
export async function fetchMetaAdInsights(
  brandId: string, 
  startDate: Date, 
  endDate: Date,
  dryRun: boolean = false
) {
  console.log(`[Meta] Initiating sync for brand ${brandId} from ${startDate.toISOString()} to ${endDate.toISOString()}${dryRun ? ' (dry run)' : ''}`)
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Find the Meta connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      console.error(`[Meta] Error finding Meta connection for brand ${brandId}:`, connectionError)
      return { 
        success: false, 
        error: 'No active Meta connection found' 
      }
    }

    // Fetch ad accounts
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&access_token=${connection.access_token}`
    )
    
    const accountsData = await accountsResponse.json()
    
    if (accountsData.error) {
      console.error(`[Meta] Error fetching ad accounts:`, accountsData.error)
      return { 
        success: false, 
        error: 'Failed to fetch Meta ad accounts',
        details: accountsData.error
      }
    }

    if (!accountsData.data || accountsData.data.length === 0) {
      console.log(`[Meta] No ad accounts found for brand ${brandId}`)
      return { 
        success: false, 
        error: 'No Meta ad accounts found for this connection' 
      }
    }

    console.log(`[Meta] Found ${accountsData.data.length} ad accounts`)
    
    // Format dates for the API
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    let allInsights = []
    
    // For each ad account, fetch insights
    for (const account of accountsData.data) {
      console.log(`[Meta] Fetching insights for account ${account.name} (${account.id})`)
      
      try {
        const insightsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${account.id}/insights?fields=account_id,account_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,actions,action_values&time_range={"since":"${startDateStr}","until":"${endDateStr}"}&level=ad&access_token=${connection.access_token}`
        )
        
        const insightsData = await insightsResponse.json()
        
        if (insightsData.error) {
          console.error(`[Meta] Error fetching insights for account ${account.id}:`, insightsData.error)
          continue
        }
        
        if (insightsData.data && insightsData.data.length > 0) {
          allInsights.push(...insightsData.data)
        }
      } catch (error) {
        console.error(`[Meta] Error fetching insights for account ${account.id}:`, error)
      }
    }

    console.log(`[Meta] Fetched a total of ${allInsights.length} insights across all accounts`)
    
    if (allInsights.length === 0) {
      return { 
        success: true, 
        message: 'No insights data available for the specified period',
        insights: []
      }
    }

    // Only store data if not in dry run mode
    if (!dryRun) {
      // Process and store insights data in meta_ad_insights
      // First clear existing data for this date range to avoid duplicates
      const { error: deleteError } = await supabase
        .from('meta_ad_insights')
        .delete()
        .eq('brand_id', brandId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
      
      if (deleteError) {
        console.error(`[Meta] Error clearing existing insights:`, deleteError)
      }
  
      // Prepare and store the enriched insights
      const enrichedInsights = allInsights.map((insight: any) => ({
        brand_id: brandId,
        connection_id: connection.id,
        account_id: insight.account_id,
        account_name: insight.account_name,
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name,
        adset_id: insight.adset_id,
        adset_name: insight.adset_name,
        ad_id: insight.ad_id,
        ad_name: insight.ad_name,
        impressions: parseInt(insight.impressions || '0'),
        clicks: parseInt(insight.clicks || '0'),
        spend: parseFloat(insight.spend || '0'),
        date: startDateStr, // Using the start date for simplicity
        actions: insight.actions || [],
        action_values: insight.action_values || []
      }))
      
      const { error: insertError } = await supabase
        .from('meta_ad_insights')
        .upsert(enrichedInsights)
      
      if (insertError) {
        console.error(`[Meta] Error storing insights:`, insertError)
        return { 
          success: false, 
          error: 'Failed to store Meta insights',
          details: insertError
        }
      }
    }
    
    return { 
      success: true, 
      message: dryRun ? 'Meta insights fetched successfully (dry run)' : 'Meta insights synced successfully',
      count: allInsights.length,
      insights: dryRun ? allInsights : undefined
    }
    
  } catch (error) {
    console.error(`[Meta] Error in fetchMetaAdInsights:`, error)
    return { 
      success: false, 
      error: 'Failed to fetch Meta ad insights',
      details: error instanceof Error ? error.message : 'Unknown error'
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