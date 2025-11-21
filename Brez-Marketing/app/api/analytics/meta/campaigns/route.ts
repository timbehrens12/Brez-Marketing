import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'

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

    // First, get the Meta connection for this brand to use for direct API calls
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id, access_token')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()
    
    if (connectionError || !connection) {
      console.error('Error getting Meta connection:', connectionError)
      return NextResponse.json({ campaigns: [] })
    }

    // Get unique campaigns from meta_ad_insights
    const { data, error } = await supabase
      .from('meta_ad_insights')
      .select('campaign_id, campaign_name, spend, impressions, clicks, date, budget')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })
      
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch campaign data' }, { status: 500 })
    }
    
    // Process the data to aggregate by campaign and calculate totals
    const campaignMap = new Map();
    
    // Process the data
    data?.forEach(insight => {
      if (!insight.campaign_id || !insight.campaign_name) return;
      
      // Use campaign_id as the key
      const key = insight.campaign_id;
      
      if (!campaignMap.has(key)) {
        campaignMap.set(key, {
          campaign_id: insight.campaign_id,
          campaign_name: insight.campaign_name,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          roas: 0,
          ctr: 0,
          cpc: 0,
          budget: insight.budget || 0, // Use budget from insights if available
          status: 'ACTIVE', // Default status since we don't have this in the insights table
          last_updated: insight.date
        });
      }
      
      const campaign = campaignMap.get(key);
      
      // Sum up numeric metrics with better type handling
      campaign.spend += Number(insight.spend) || 0;
      campaign.impressions += Number(insight.impressions) || 0;
      campaign.clicks += Number(insight.clicks) || 0;
      
      // If this insight has a budget and the campaign doesn't yet, use it
      if (insight.budget && !campaign.budget) {
        campaign.budget = Number(insight.budget) || 0;
      }
      
      // Keep track of the most recent date
      if (new Date(insight.date) > new Date(campaign.last_updated)) {
        campaign.last_updated = insight.date;
      }
    });
    
    // Fetch the latest campaign data directly from Meta API to get current budgets
    let campaignBudgets = new Map();
    
    try {
      // First fetch ad accounts
      const accountsResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&access_token=${connection.access_token}`
      )
      
      const accountsData = await accountsResponse.json()
      
      // For each ad account, fetch campaign info including budgets
      if (accountsData.data && accountsData.data.length > 0) {
        for (const account of accountsData.data) {
          try {
            const campaignsResponse = await fetch(
              `https://graph.facebook.com/v18.0/${account.id}/campaigns?fields=id,name,daily_budget,lifetime_budget,effective_status&access_token=${connection.access_token}`
            )
            
            const campaignsData = await campaignsResponse.json()
            
            if (campaignsData.data && campaignsData.data.length > 0) {
              for (const campaign of campaignsData.data) {
                let totalBudget = 0
                
                // Add daily budget (converted from cents to dollars)
                if (campaign.daily_budget) {
                  const dailyBudget = parseFloat(campaign.daily_budget) / 100
                  totalBudget += dailyBudget
                }
                
                // Add lifetime budget (converted from cents to dollars) 
                if (campaign.lifetime_budget) {
                  const lifetimeBudget = parseFloat(campaign.lifetime_budget) / 100
                  totalBudget += lifetimeBudget
                }
                
                // Store budget and status for this campaign
                campaignBudgets.set(campaign.id, {
                  budget: totalBudget,
                  status: campaign.effective_status || 'UNKNOWN',
                  budgetType: campaign.daily_budget ? 'daily' : (campaign.lifetime_budget ? 'lifetime' : 'unknown')
                })
              }
            }
          } catch (error) {
            console.error(`Error fetching campaigns for account ${account.id}:`, error)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching budget data from Meta API:', error)
      // Continue with existing data if API fetch fails
    }
    
    // Convert the Map to an array and calculate derived metrics
    const campaigns = Array.from(campaignMap.values()).map(campaign => {
      // Update campaign with latest budget and status from Meta API if available
      if (campaignBudgets.has(campaign.campaign_id)) {
        const apiData = campaignBudgets.get(campaign.campaign_id)
        campaign.budget = apiData.budget || campaign.budget || 0
        campaign.status = apiData.status || campaign.status
        campaign.budgetType = apiData.budgetType || 'unknown'
      }
      
      // Calculate CTR and CPC if we have impressions and clicks
      if (campaign.impressions > 0) {
        campaign.ctr = ((campaign.clicks / campaign.impressions) * 100) || 0;
      }
      
      if (campaign.clicks > 0) {
        campaign.cpc = (campaign.spend / campaign.clicks) || 0;
      }
      
      // Ensure all numeric values are defined to prevent toFixed errors
      campaign.spend = campaign.spend || 0;
      campaign.impressions = campaign.impressions || 0;
      campaign.clicks = campaign.clicks || 0;
      campaign.conversions = campaign.conversions || 0;
      campaign.roas = campaign.roas || 0;
      campaign.ctr = campaign.ctr || 0;
      campaign.cpc = campaign.cpc || 0;
      campaign.budget = campaign.budget || 0;
      
      return campaign;
    });
    
    // Sort by spend (descending)
    campaigns.sort((a, b) => b.spend - a.spend);

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch (error) {
    console.error('Error in Meta campaigns endpoint:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch campaigns', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error',
      status: 500
    }, { status: 500 })
  }
} 