import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Extract brandId from the URL
    const searchParams = req.nextUrl.searchParams
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if Meta connection exists and is active
    const { data: connectionData, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_name', 'meta')
      .eq('is_active', true)
      .single()

    if (connectionError || !connectionData) {
      return NextResponse.json(
        {
          connection_exists: false,
          error: connectionError ? connectionError.message : 'No active Meta connection found',
        },
        { status: 404 }
      )
    }

    // Check if data exists in meta_ad_insights table
    const { count: insightsCount, error: insightsError } = await supabase
      .from('meta_ad_insights')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)

    if (insightsError) {
      return NextResponse.json(
        {
          connection_exists: true,
          connection_data: connectionData,
          data_exists: false,
          error: `Error checking meta_ad_insights table: ${insightsError.message}`,
        },
        { status: 500 }
      )
    }

    // Import Facebook API dynamically
    const bizSdk = await import('facebook-nodejs-business-sdk')
    const { FacebookAdsApi, AdAccount, Campaign } = bizSdk

    // Initialize the Facebook API with the access token
    FacebookAdsApi.init(connectionData.access_token)

    // Fetch ad accounts
    try {
      const accountsResult = await new Promise((resolve, reject) => {
        try {
          const account = new AdAccount('me')
          account
            .getAdAccounts(['id', 'name', 'account_status', 'business_name', 'currency', 'timezone_name', 'funding_source', 'capabilities', 'is_prepay_account'])
            .then((accounts: any[]) => {
              resolve(accounts)
            })
            .catch((error: any) => {
              reject(error)
            })
        } catch (error) {
          reject(error)
        }
      })

      // Check if accounts exist
      const accounts = accountsResult as any[]
      
      // Process accounts to check for test accounts
      const processedAccounts = accounts.map(account => {
        const isTestAccount = 
          account?.capabilities?.includes('DEPRECATED_CAPABILITY') || // One indicator of test accounts
          (account?.name && account.name.toLowerCase().includes('test')) || 
          (account?.business_name && account.business_name.toLowerCase().includes('test')) ||
          account?.is_prepay_account === true // Test accounts are often prepay
          
        return {
          id: account.id,
          name: account.name,
          business_name: account.business_name,
          account_status: account.account_status,
          currency: account.currency,
          timezone: account.timezone_name,
          is_test_account: isTestAccount,
        }
      })

      // If accounts exist, fetch campaigns from the first account
      let campaigns = []
      let campaignsError = null
      
      if (accounts && accounts.length > 0) {
        try {
          const account = new AdAccount(accounts[0].id)
          const campaignsResult = await account.getCampaigns([
            'id',
            'name',
            'status',
            'objective',
            'configured_status',
            'effective_status', 
            'created_time',
            'updated_time',
            'start_time',
            'stop_time',
            'daily_budget',
            'lifetime_budget'
          ])
          
          campaigns = campaignsResult.map((campaign: any) => ({
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            configured_status: campaign.configured_status,
            effective_status: campaign.effective_status,
            objective: campaign.objective,
            created_time: campaign.created_time,
            updated_time: campaign.updated_time,
            start_time: campaign.start_time,
            stop_time: campaign.stop_time,
            daily_budget: campaign.daily_budget,
            lifetime_budget: campaign.lifetime_budget,
            is_draft: campaign.effective_status === 'PAUSED' && 
                      !campaign.start_time && 
                      !campaign.stop_time
          }))
        } catch (error: any) {
          campaignsError = error.message || 'Error fetching campaigns'
        }
      }

      // Calculate the number of active campaigns (not paused or draft)
      const activeCampaigns = campaigns.filter(
        (campaign: any) => campaign.effective_status === 'ACTIVE'
      ).length
      
      // Calculate the number of draft campaigns
      const draftCampaigns = campaigns.filter(
        (campaign: any) => campaign.is_draft
      ).length

      // Return diagnostic information
      return NextResponse.json({
        connection_exists: true,
        connection_data: {
          id: connectionData.id,
          platform_name: connectionData.platform_name,
          created_at: connectionData.created_at,
          is_active: connectionData.is_active,
        },
        meta_ad_insights_exists: insightsCount !== null,
        meta_ad_insights_count: insightsCount || 0,
        accounts: processedAccounts,
        has_accounts: accounts && accounts.length > 0,
        account_count: accounts ? accounts.length : 0,
        has_test_accounts: processedAccounts.some(account => account.is_test_account),
        campaigns: campaigns,
        has_campaigns: campaigns && campaigns.length > 0,
        campaign_count: campaigns ? campaigns.length : 0,
        active_campaign_count: activeCampaigns,
        draft_campaign_count: draftCampaigns,
        campaigns_error: campaignsError,
        data_exists: insightsCount !== null && insightsCount > 0,
      })
    } catch (error: any) {
      return NextResponse.json(
        {
          connection_exists: true,
          connection_data: {
            id: connectionData.id,
            platform_name: connectionData.platform_name,
            created_at: connectionData.created_at,
            is_active: connectionData.is_active,
          },
          meta_ad_insights_exists: insightsCount !== null,
          meta_ad_insights_count: insightsCount || 0,
          accounts_error: error.message || 'Error fetching ad accounts',
          data_exists: insightsCount !== null && insightsCount > 0,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
} 