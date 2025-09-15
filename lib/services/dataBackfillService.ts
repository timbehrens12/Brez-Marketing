import { createClient } from '@supabase/supabase-js'
import { ShopifyBulkService } from './shopifyBulkService'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export class DataBackfillService {
  /**
   * Triggers automatic data backfill when a platform is first connected
   * For Shopify: Uses bulk operations for full historical import + immediate mini-sync
   */
  static async triggerInitialBackfill(
    brandId: string, 
    platformType: 'meta' | 'shopify', 
    accessToken: string,
    connectionId?: string,
    shop?: string
  ) {
    console.log(`[DataBackfill] Starting initial backfill for ${platformType} on brand ${brandId}`)
    
    try {
      // Mark the connection as syncing
      await supabaseAdmin
        .from('platform_connections')
        .update({ 
          sync_status: 'in_progress',
          last_synced_at: new Date().toISOString()
        })
        .eq('brand_id', brandId)
        .eq('platform_type', platformType)

      if (platformType === 'meta') {
        await this.backfillMetaData(brandId, accessToken)
        
        // Mark sync as completed for Meta (synchronous)
        await supabaseAdmin
          .from('platform_connections')
          .update({ 
            sync_status: 'completed',
            last_synced_at: new Date().toISOString()
          })
          .eq('brand_id', brandId)
          .eq('platform_type', platformType)
          
      } else if (platformType === 'shopify' && connectionId && shop) {
        // Use new bulk operations service for full historical import
        await ShopifyBulkService.startFullHistoricalImport(brandId, shop, accessToken, connectionId)
        
        // Note: Sync status will be updated to 'bulk_importing' by the bulk service
        // Final 'completed' status will be set when all bulk jobs finish
        
      } else if (platformType === 'shopify') {
        // Fallback to old method if connection details missing
        await this.backfillShopifyDataLegacy(brandId, accessToken)
        
        await supabaseAdmin
          .from('platform_connections')
          .update({ 
            sync_status: 'completed',
            last_synced_at: new Date().toISOString()
          })
          .eq('brand_id', brandId)
          .eq('platform_type', platformType)
      }

      console.log(`[DataBackfill] Initiated backfill for ${platformType} on brand ${brandId}`)
    } catch (error) {
      console.error(`[DataBackfill] Error during ${platformType} backfill:`, error)
      
      // Mark sync as failed
      await supabaseAdmin
        .from('platform_connections')
        .update({ 
          sync_status: 'failed',
          last_synced_at: new Date().toISOString()
        })
        .eq('brand_id', brandId)
        .eq('platform_type', platformType)
    }
  }

  /**
   * Backfill Meta Ads data for the last 90 days
   */
  private static async backfillMetaData(brandId: string, accessToken: string) {
    console.log(`[DataBackfill] Starting Meta data backfill for brand ${brandId}`)

    try {
      // Get account ID first
      const accountResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${accessToken}`)
      const accountData = await accountResponse.json()
      
      if (!accountData.data || accountData.data.length === 0) {
        console.log(`[DataBackfill] No ad accounts found for brand ${brandId}`)
        return
      }

      const adAccountId = accountData.data[0].id
      console.log(`[DataBackfill] Found ad account: ${adAccountId}`)

      // Calculate date range (last 90 days)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 90)
      
      const dateRange = {
        since: startDate.toISOString().split('T')[0],
        until: endDate.toISOString().split('T')[0]
      }

      // Fetch campaigns
      await this.fetchMetaCampaigns(brandId, adAccountId, accessToken, dateRange)
      
      // Fetch daily insights
      await this.fetchMetaDailyInsights(brandId, adAccountId, accessToken, dateRange)

    } catch (error) {
      console.error(`[DataBackfill] Meta backfill error:`, error)
      throw error
    }
  }

  /**
   * PUBLIC: Fetch Meta campaigns and store in database - FORCE REDEPLOY v6 FINAL
   */
  public static async fetchMetaCampaigns(brandId: string, adAccountId: string, accessToken: string, dateRange: any) {
    // Get connection_id from platform_connections
    const { data: connection } = await supabaseAdmin
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (!connection) {
      throw new Error('No active Meta connection found for campaign sync')
    }

    const connectionId = connection.id
    console.log(`[DataBackfill] Using connection_id: ${connectionId} for brand: ${brandId}`)
    const campaignsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?` + 
      `fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time&` +
      `access_token=${accessToken}&limit=100`

    const response = await fetch(campaignsUrl)
    const data = await response.json()

    if (data.data && data.data.length > 0) {
      console.log(`[DataBackfill] Found ${data.data.length} campaigns to sync`)

      for (const campaign of data.data) {
        // Get campaign insights - NO DATE RANGE (Meta API works this way)
        const insightsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/insights?` +
          `fields=spend,impressions,clicks,actions,action_values,ctr,cpm,cpp&` +
          `access_token=${accessToken}&limit=100`

        const insightsResponse = await fetch(insightsUrl)
        const insightsData = await insightsResponse.json()

        const insights = insightsData.data?.[0] || {}

        // DEBUG: Log the actual insights data structure
        console.log(`[DataBackfill] Raw insights data:`, JSON.stringify(insights, null, 2))
        console.log(`[DataBackfill] Insights keys:`, Object.keys(insights))

        // Extract metrics - Meta API returns aggregated data without date ranges
        const spend = parseFloat(insights.spend || '0')
        const impressions = parseInt(insights.impressions || '0')
        const clicks = parseInt(insights.clicks || '0')
        const ctr = parseFloat(insights.ctr || '0')
        const cpm = parseFloat(insights.cpm || '0')
        
        // Extract conversions
        const actions = insights.actions || []
        const purchases = actions.find((action: any) => action.action_type === 'purchase')?.value || '0'
        const revenue = insights.action_values?.find((val: any) => val.action_type === 'purchase')?.value || '0'

        // Store campaign data
        console.log(`[DataBackfill] Storing campaign: ${campaign.name} (${campaign.id})`)
        console.log(`[DataBackfill] Campaign data:`, {
          spend, impressions, clicks, purchases, revenue
        })

        const campaignData = {
          campaign_id: campaign.id,
          brand_id: brandId,
          connection_id: connectionId, // REQUIRED FIELD
          account_id: adAccountId,     // REQUIRED FIELD
          campaign_name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
          budget_type: campaign.daily_budget ? 'daily' : campaign.lifetime_budget ? 'lifetime' : 'unknown',
          spent: spend,
          impressions: impressions,
          clicks: clicks,
          conversions: parseInt(purchases),
          ctr: ctr,
          cpc: cpm, // Using cpm as cpc for now
          created_time: campaign.created_time ? new Date(campaign.created_time) : new Date(),
          updated_time: campaign.updated_time ? new Date(campaign.updated_time) : new Date(),
          last_sync_time: new Date()
        }

        const { data, error } = await supabaseAdmin
          .from('meta_campaigns')
          .upsert(campaignData, {
            onConflict: 'campaign_id,brand_id'
          })

        if (error) {
          console.error(`[DataBackfill] Error storing campaign ${campaign.id}:`, error)
        } else {
          console.log(`[DataBackfill] ✅ Successfully stored campaign: ${campaign.name}`)
        }
      }

      console.log(`[DataBackfill] Synced ${data.data.length} campaigns for brand ${brandId}`)
    }
  }

  /**
   * PUBLIC: Fetch Meta demographics and device performance data for historical analysis
   */
  public static async fetchMetaDemographicsAndDevice(brandId: string, adAccountId: string, accessToken: string, dateRange: any, connectionId?: string) {
    console.log(`[DataBackfill] 🚀 LIGHTWEIGHT demographics fetch for brand ${brandId} from ${dateRange.since} to ${dateRange.until}`)
    
    try {
      // Import supabase
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      // Use provided connectionId or look up active connection
      let connection
      if (connectionId) {
        console.log(`[DataBackfill] 📊 Using provided connectionId ${connectionId} for demographics backfill`)
        connection = { id: connectionId }
      } else {
        // Get platform connection (try active first, then any connection for this brand)
        let { data: activeConnection } = await supabase
          .from('platform_connections')
          .select('*')
          .eq('brand_id', brandId)
          .eq('platform', 'meta')
          .eq('status', 'connected')
          .single()
        
        // If no active connection, try to find any Meta connection for this brand (for historical jobs)
        if (!activeConnection) {
          const { data: anyConnection } = await supabase
            .from('platform_connections')
            .select('*')
            .eq('brand_id', brandId)
            .eq('platform', 'meta')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          if (anyConnection) {
            connection = anyConnection
            console.log(`[DataBackfill] 📊 Using historical connection ${connection.id} for demographics backfill`)
          } else {
            throw new Error('No Meta connection found for this brand')
          }
        } else {
          connection = activeConnection
        }
      }
      
      // Convert date range to proper format
      const startDate = new Date(dateRange.since).toISOString().split('T')[0]
      const endDate = new Date(dateRange.until).toISOString().split('T')[0]
      
      console.log(`[DataBackfill] 📊 Fetching demographics for account ${adAccountId} from ${startDate} to ${endDate}`)
      
            // EMERGENCY FIX: DISABLE demographics sync to prevent data explosion
            // The previous approach was creating 30k+ records which is completely unsustainable
            console.log(`[DataBackfill] ⚠️ DEMOGRAPHICS SYNC DISABLED due to data explosion issue`)
            console.log(`[DataBackfill] ⚠️ Previous sync created 30k+ records - this needs a complete rework`)
            console.log(`[DataBackfill] ⚠️ Skipping demographics sync to prevent database explosion`)
      
      return { 
        success: true, 
        count: 0,
        message: `Demographics sync disabled - prevented data explosion`
      }
      
    } catch (error) {
      console.error(`[DataBackfill] ❌ Lightweight demographics error:`, error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * PUBLIC: Fetch Meta daily insights for trend analysis
   */
  public static async fetchMetaDailyInsights(brandId: string, adAccountId: string, accessToken: string, dateRange: any) {
    // Get insights WITH date range and daily breakdown for historical sync
    let insightsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
      `fields=spend,impressions,clicks,actions,action_values,ctr,cpm,date_start,date_stop&` +
      `access_token=${accessToken}&limit=500`

    // Add date range and daily breakdown if dateRange spans more than 1 day
    if (dateRange && dateRange.since && dateRange.until) {
      const startDate = new Date(dateRange.since)
      const endDate = new Date(dateRange.until)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))
      
      if (daysDiff > 7) {
        // For historical sync spanning weeks/months, use daily breakdown
        insightsUrl += `&time_range={"since":"${dateRange.since}","until":"${dateRange.until}"}&time_increment=1`
        console.log(`[DataBackfill] Using DAILY breakdown for ${daysDiff} days range`)
      } else {
        // For short ranges, just use the date range without daily breakdown
        insightsUrl += `&time_range={"since":"${dateRange.since}","until":"${dateRange.until}"}`
        console.log(`[DataBackfill] Using standard range for ${daysDiff} days`)
      }
    } else {
      console.log(`[DataBackfill] No date range specified - using default recent data`)
    }

    console.log(`[DataBackfill] Calling ad account insights: ${insightsUrl}`)
    
    // HANDLE PAGINATION - fetch ALL pages of data
    let allInsights: any[] = []
    let nextUrl = insightsUrl
    let pageCount = 0
    
    while (nextUrl && pageCount < 10) { // Safety limit of 10 pages
      pageCount++
      console.log(`[DataBackfill] Fetching page ${pageCount}...`)
      
      const response = await fetch(nextUrl)
      const data = await response.json()

      console.log(`[DataBackfill] Page ${pageCount} response:`, {
        count: data.data?.length || 0,
        error: data.error?.message || null,
        hasNext: !!data.paging?.next,
        sample: data.data?.[0] || null
      })

      if (data.error) {
        console.error(`[DataBackfill] Error on page ${pageCount}:`, data.error)
        break
      }

      if (data.data && data.data.length > 0) {
        allInsights.push(...data.data)
        console.log(`[DataBackfill] Added ${data.data.length} insights from page ${pageCount}. Total: ${allInsights.length}`)
      }

      // Check for next page
      nextUrl = data.paging?.next || null
      if (!nextUrl) {
        console.log(`[DataBackfill] No more pages. Finished with ${pageCount} pages.`)
        break
      }
    }

    console.log(`[DataBackfill] 🔥 PAGINATION COMPLETE! Total insights fetched: ${allInsights.length} across ${pageCount} pages`)

    if (allInsights && allInsights.length > 0) {
      console.log(`[DataBackfill] Found ${allInsights.length} daily insights to sync for brand ${brandId}`)
      console.log(`[DataBackfill] Sample insight:`, JSON.stringify(allInsights[0], null, 2))
      console.log(`[DataBackfill] Sample insight keys:`, Object.keys(allInsights[0]))

      // BATCH INSERT: Process all records at once to avoid 15-second Vercel timeout
      console.log(`[DataBackfill] 🚀 BATCH PROCESSING ${allInsights.length} records to avoid timeout...`)
      
      // COMPREHENSIVE duplicate prevention - check for ANY existing data
      const dates = allInsights.map(insight => insight.date_start)
      const { data: existingData } = await supabaseAdmin
        .from('meta_ad_daily_insights')
        .select('date, ad_id')
        .eq('brand_id', brandId)
        .in('date', dates)
      
      const existingDateAdPairs = new Set(existingData?.map(d => `${d.date}:${d.ad_id}`) || [])
      const existingDates = new Set(existingData?.map(d => d.date) || [])
      
      console.log(`[DataBackfill] Found existing data for ${existingDates.size} dates (${existingDateAdPairs.size} date-ad pairs), preventing ALL duplicates...`)
      
      // If we're trying to insert account_level_data but real ad-level data exists, skip entirely
      const hasAccountLevelData = allInsights.some(insight => insight.date_start && existingDateAdPairs.has(`${insight.date_start}:120218263353030058`))
      if (hasAccountLevelData) {
        console.log(`[DataBackfill] ⚠️ Real ad-level data exists for these dates - skipping account-level insertion to prevent doubling`)
        return
      }
      
      const batchData = allInsights
        .filter(insight => !existingDates.has(insight.date_start)) // Skip dates with existing data
        .map((insight: any) => {
          const actions = insight.actions || []
          const purchases = actions.find((action: any) => action.action_type === 'purchase')?.value || '0'
          const spend = parseFloat(insight.spend || '0')

          return {
            brand_id: brandId,
            ad_id: 'account_level_data',  // REQUIRED FIELD - dummy value for account-level insights
            adset_id: 'account_level_data',  // REQUIRED FIELD - dummy value for account-level insights  
            date: insight.date_start,
            spent: spend,  // FIXED: Column name is 'spent' not 'spend'
            impressions: parseInt(insight.impressions || '0'),
            clicks: parseInt(insight.clicks || '0'),
            purchase_count: parseInt(purchases),  // FIXED: Column name is 'purchase_count'
            ctr: parseFloat(insight.ctr || '0'),
            created_at: new Date().toISOString()
          }
        })

      // Insert all records in one batch operation to avoid timeout
      if (batchData.length > 0) {
        const { data, error } = await supabaseAdmin
          .from('meta_ad_daily_insights')
          .upsert(batchData, {
            onConflict: 'ad_id,date'
          })

        if (error) {
          console.error(`[DataBackfill] ❌ Batch insert error:`, error)
          console.error(`[DataBackfill] ❌ Sample batch data:`, batchData.slice(0, 3))
        } else {
          console.log(`[DataBackfill] ✅ Successfully batch inserted ${batchData.length} daily insights for brand ${brandId}`)
        }
      } else {
        console.log(`[DataBackfill] ℹ️ No new records to insert (all dates have existing ad-level data)`)
      }

      console.log(`[DataBackfill] Synced ${allInsights.length} daily insights for brand ${brandId}`)
    }
  }

  /**
   * Legacy Shopify backfill method (90 days) - used as fallback
   */
  private static async backfillShopifyDataLegacy(brandId: string, accessToken: string) {
    console.log(`[DataBackfill] Starting Shopify data backfill for brand ${brandId}`)

    try {
      // Get shop domain from connection
      const { data: connection } = await supabaseAdmin
        .from('platform_connections')
        .select('shop, metadata')
        .eq('brand_id', brandId)
        .eq('platform_type', 'shopify')
        .single()

      if (!connection?.shop) {
        console.error(`[DataBackfill] No shop found for brand ${brandId}`)
        return
      }

      const shopDomain = connection.shop
      
      // Calculate date range (last 90 days)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 90)

      // Fetch orders
      await this.fetchShopifyOrders(brandId, shopDomain, accessToken, startDate, endDate)
      
      // Fetch products  
      await this.fetchShopifyProducts(brandId, shopDomain, accessToken)

    } catch (error) {
      console.error(`[DataBackfill] Shopify backfill error:`, error)
      throw error
    }
  }

  /**
   * Fetch Shopify orders and store in database
   */
  private static async fetchShopifyOrders(brandId: string, shopDomain: string, accessToken: string, startDate: Date, endDate: Date) {
    const ordersUrl = `https://${shopDomain}/admin/api/2023-10/orders.json?` +
      `status=any&created_at_min=${startDate.toISOString()}&created_at_max=${endDate.toISOString()}&limit=250`

    const response = await fetch(ordersUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    })

    const data = await response.json()

    if (data.orders && data.orders.length > 0) {
      console.log(`[DataBackfill] Found ${data.orders.length} orders to sync`)

      for (const order of data.orders) {
        await supabaseAdmin
          .from('shopify_orders')
          .upsert({
            order_id: order.id.toString(),
            brand_id: brandId,
            order_number: order.order_number,
            total_price: parseFloat(order.total_price || '0'),
            subtotal_price: parseFloat(order.subtotal_price || '0'),
            total_tax: parseFloat(order.total_tax || '0'),
            currency: order.currency,
            financial_status: order.financial_status,
            fulfillment_status: order.fulfillment_status,
            customer_email: order.customer?.email,
            customer_first_name: order.customer?.first_name,
            customer_last_name: order.customer?.last_name,
            line_items_count: order.line_items?.length || 0,
            created_at: order.created_at,
            updated_at: order.updated_at,
            processed_at: order.processed_at,
            last_synced_at: new Date().toISOString()
          }, {
            onConflict: 'order_id,brand_id'
          })
      }

      console.log(`[DataBackfill] Synced ${data.orders.length} orders for brand ${brandId}`)
    }
  }

  /**
   * Fetch Shopify products and store in database
   */
  private static async fetchShopifyProducts(brandId: string, shopDomain: string, accessToken: string) {
    const productsUrl = `https://${shopDomain}/admin/api/2023-10/products.json?limit=250`

    const response = await fetch(productsUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    })

    const data = await response.json()

    if (data.products && data.products.length > 0) {
      console.log(`[DataBackfill] Found ${data.products.length} products to sync`)

      for (const product of data.products) {
        await supabaseAdmin
          .from('shopify_products')
          .upsert({
            product_id: product.id.toString(),
            brand_id: brandId,
            title: product.title,
            handle: product.handle,
            product_type: product.product_type,
            vendor: product.vendor,
            status: product.status,
            created_at: product.created_at,
            updated_at: product.updated_at,
            published_at: product.published_at,
            last_synced_at: new Date().toISOString()
          }, {
            onConflict: 'product_id,brand_id'
          })
      }

      console.log(`[DataBackfill] Synced ${data.products.length} products for brand ${brandId}`)
    }
  }
}
