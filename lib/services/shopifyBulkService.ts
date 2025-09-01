import { createClient } from '@/lib/supabase/server'

const supabase = createClient()

export interface BulkJobStatus {
  id: string
  status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED'
  errorCode?: string
  url?: string
  partialDataUrl?: string
  createdAt: string
  completedAt?: string
}

export class ShopifyBulkService {
  /**
   * Start comprehensive historical data import for a newly connected store
   */
  static async startFullHistoricalImport(
    brandId: string, 
    shop: string, 
    accessToken: string,
    connectionId: string
  ) {
    console.log(`[Bulk Import] Starting full historical import for brand ${brandId}, shop ${shop}`)
    
    try {
      // 1. Immediate mini-sync for recent data (last 72 hours)
      await this.immediateRecentSync(brandId, shop, accessToken, connectionId)
      
      // 2. Start bulk operations for historical data
      const bulkJobs = await Promise.all([
        this.startBulkOrdersExport(shop, accessToken),
        this.startBulkCustomersExport(shop, accessToken),
        this.startBulkProductsExport(shop, accessToken)
      ])
      
      // 3. Track bulk jobs in database
      for (const job of bulkJobs) {
        await supabase
          .from('shopify_bulk_jobs')
          .insert({
            connection_id: connectionId,
            brand_id: brandId,
            job_id: job.id,
            job_type: job.type,
            status: 'RUNNING',
            created_at: new Date().toISOString()
          })
      }
      
      // 4. Update connection status
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'bulk_importing',
          metadata: {
            ...{}, // existing metadata
            bulk_jobs_started: bulkJobs.map(j => ({ id: j.id, type: j.type })),
            mini_sync_completed: true
          }
        })
        .eq('id', connectionId)
      
      console.log(`[Bulk Import] Started ${bulkJobs.length} bulk jobs for ${shop}`)
      return { success: true, jobs: bulkJobs }
      
    } catch (error) {
      console.error('[Bulk Import] Error starting full import:', error)
      throw error
    }
  }
  
  /**
   * Quick sync of recent data (last 72 hours) to populate dashboard immediately
   */
  static async immediateRecentSync(
    brandId: string,
    shop: string,
    accessToken: string,
    connectionId: string
  ) {
    console.log(`[Mini-sync] Starting immediate sync for brand ${brandId}, shop ${shop}`)
    
    try {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      
      // Fetch recent orders via REST API (faster for small datasets)
      const ordersUrl = `https://${shop}/admin/api/2024-01/orders.json?` +
        `status=any&created_at_min=${threeDaysAgo.toISOString()}&limit=250`
      
      console.log(`[Mini-sync] Fetching orders from: ${ordersUrl}`)
      
      const response = await fetch(ordersUrl, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      const orders = data.orders || []
      
      console.log(`[Mini-sync] Found ${orders.length} recent orders`)
      
      if (orders.length === 0) {
        console.log(`[Mini-sync] No recent orders found, sync complete`)
        return
      }
      
      // Store recent orders for immediate dashboard population
      const { data: connectionData, error: connectionError } = await supabase
        .from('platform_connections')
        .select('user_id')
        .eq('id', connectionId)
        .single()
      
      if (connectionError) {
        throw new Error(`Failed to get connection data: ${connectionError.message}`)
      }
      
      console.log(`[Mini-sync] Got connection data for user: ${connectionData?.user_id}`)
      
      // Prepare batch data for faster bulk insert
      const ordersData = orders.map(order => ({
        id: parseInt(order.id),
        brand_id: brandId,
        connection_id: connectionId,
        user_id: connectionData?.user_id,
        order_number: order.order_number,
        total_price: parseFloat(order.total_price || '0'),
        subtotal_price: parseFloat(order.subtotal_price || order.total_price || '0'),
        total_tax: parseFloat(order.total_tax || '0'),
        total_discounts: parseFloat(order.total_discounts || '0'),
        created_at: order.created_at,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        customer_email: order.email,
        customer_first_name: order.customer?.first_name,
        customer_last_name: order.customer?.last_name,
        currency: order.currency,
        customer_id: order.customer?.id ? parseInt(order.customer.id) : null,
        line_items: order.line_items || [],
        line_items_count: order.line_items?.length || 0,
        last_synced_at: new Date().toISOString()
      }))
      
      // Bulk upsert - much faster than individual operations
      const { error: bulkUpsertError } = await supabase
        .from('shopify_orders')
        .upsert(ordersData, { onConflict: 'id' })
      
      if (bulkUpsertError) {
        console.error(`[Mini-sync] Bulk upsert error:`, bulkUpsertError)
        throw bulkUpsertError
      }
      
      console.log(`[Mini-sync] Bulk stored ${orders.length} orders`)
      
      // Skip regional data and abandoned checkouts for speed - let historical sync handle these
      /*
      for (const order of orders) {
        try {
            console.error(`[Mini-sync] Order data that failed:`, JSON.stringify(orderData, null, 2))
            throw new Error(`Database upsert error: ${upsertError.message}`)
          }

          // Extract and store address data for regional analytics
          const shippingAddress = order.shipping_address || {}
          const billingAddress = order.billing_address || {}
          const customerDefaultAddress = order.customer?.default_address || {}
          
          // Use shipping address if available, otherwise try billing address, then customer default address
          const address = shippingAddress.city ? shippingAddress : 
                         billingAddress.city ? billingAddress : 
                         customerDefaultAddress.city ? customerDefaultAddress : null
          
          if (address && address.city) {
            console.log(`[Mini-sync] 📍 Found address for order ${order.id}: ${address.city}, ${address.country}`)
            
            const { error: regionError } = await supabase
              .from('shopify_sales_by_region')
              .upsert({
                connection_id: connectionId,
                brand_id: brandId,
                user_id: connectionData?.user_id,
                order_id: order.id.toString(),
                created_at: order.created_at,
                city: address.city,
                province: address.province,
                province_code: address.province_code,
                country: address.country,
                country_code: address.country_code,
                total_price: parseFloat(order.total_price || '0'),
                order_count: 1
              }, { onConflict: 'connection_id,order_id' })
            
            if (regionError) {
              console.error(`[Mini-sync] ⚠️ Error storing regional data for order ${order.id}:`, regionError)
            } else {
              console.log(`[Mini-sync] ✅ Stored regional data for order ${order.id}`)
            }
          } else {
            console.log(`[Mini-sync] ⚠️ No address found for order ${order.id}`)
          }
          
          successCount++
          console.log(`[Mini-sync] ✅ Stored order ${order.id} ($${order.total_price})`)
        } catch (orderError) {
          errorCount++
          console.error(`[Mini-sync] ❌ Error storing order ${order.id}:`, orderError)
        }
      }
      
      */
      
      // Update connection to mark mini-sync as completed BUT STILL SYNCING (queue jobs running)
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'syncing', // ✅ KEEP AS SYNCING - historical sync still running!
        last_synced_at: new Date().toISOString(),
        metadata: {
          mini_sync_completed: true,
          mini_sync_orders: orders.length,
          mini_sync_errors: 0,
          historical_sync_queued: true, // Indicate historical jobs are queued
          sync_stage: 'historical_import' // Current stage
        }
      })
      .eq('id', connectionId)
        
      console.log(`[Mini-sync] Updated connection status to syncing (queue jobs still running)`)
      
    } catch (error) {
      console.error(`[Mini-sync] FATAL ERROR in immediate sync:`, error)
      
      // Update connection to mark sync as failed
      await supabase
        .from('platform_connections')
        .update({ 
          sync_status: 'failed',
          metadata: {
            mini_sync_error: error instanceof Error ? error.message : String(error),
            mini_sync_completed: false
          }
        })
        .eq('id', connectionId)
        
      throw error // Re-throw so callback knows about the failure
    }
  }
  
  /**
   * Start bulk export of ALL orders (no date restrictions)
   */
  private static async startBulkOrdersExport(shop: string, accessToken: string) {
    const mutation = `
      mutation {
        bulkOperationRunQuery(
          query: """
            {
              orders {
                edges {
                  node {
                    id
                    name
                    email
                    createdAt
                    updatedAt
                    processedAt
                    totalPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    subtotalPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    totalTaxSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    displayFinancialStatus
                    displayFulfillmentStatus
                    customer {
                      id
                      email
                      firstName
                      lastName
                    }
                    lineItems {
                      edges {
                        node {
                          id
                          quantity
                          title
                          variantTitle
                          product {
                            id
                            title
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          """
        ) {
          bulkOperation {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `
    
    const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: mutation })
    })
    
    const data = await response.json()
    
    if (data.data?.bulkOperationRunQuery?.bulkOperation) {
      return {
        id: data.data.bulkOperationRunQuery.bulkOperation.id,
        type: 'orders',
        status: data.data.bulkOperationRunQuery.bulkOperation.status
      }
    }
    
    throw new Error(`Failed to start bulk orders export: ${JSON.stringify(data)}`)
  }
  
  /**
   * Start bulk export of ALL customers
   */
  private static async startBulkCustomersExport(shop: string, accessToken: string) {
    const mutation = `
      mutation {
        bulkOperationRunQuery(
          query: """
            {
              customers {
                edges {
                  node {
                    id
                    email
                    firstName
                    lastName
                    phone
                    createdAt
                    updatedAt
                    numberOfOrders
                    totalSpent
                    addresses {
                      id
                      address1
                      address2
                      city
                      province
                      country
                      zip
                    }
                  }
                }
              }
            }
          """
        ) {
          bulkOperation {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `
    
    const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: mutation })
    })
    
    const data = await response.json()
    
    if (data.data?.bulkOperationRunQuery?.bulkOperation) {
      return {
        id: data.data.bulkOperationRunQuery.bulkOperation.id,
        type: 'customers',
        status: data.data.bulkOperationRunQuery.bulkOperation.status
      }
    }
    
    throw new Error(`Failed to start bulk customers export: ${JSON.stringify(data)}`)
  }
  
  /**
   * Start bulk export of ALL products
   */
  private static async startBulkProductsExport(shop: string, accessToken: string) {
    const mutation = `
      mutation {
        bulkOperationRunQuery(
          query: """
            {
              products {
                edges {
                  node {
                    id
                    title
                    handle
                    description
                    productType
                    vendor
                    createdAt
                    updatedAt
                    status
                    totalInventory
                    variants {
                      edges {
                        node {
                          id
                          title
                          price
                          compareAtPrice
                          inventoryQuantity
                          sku
                        }
                      }
                    }
                  }
                }
              }
            }
          """
        ) {
          bulkOperation {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `
    
    const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: mutation })
    })
    
    const data = await response.json()
    
    if (data.data?.bulkOperationRunQuery?.bulkOperation) {
      return {
        id: data.data.bulkOperationRunQuery.bulkOperation.id,
        type: 'products',
        status: data.data.bulkOperationRunQuery.bulkOperation.status
      }
    }
    
    throw new Error(`Failed to start bulk products export: ${JSON.stringify(data)}`)
  }
  
  /**
   * Check status of a bulk operation
   */
  static async checkBulkJobStatus(shop: string, accessToken: string, jobId: string): Promise<BulkJobStatus> {
    const query = `
      query {
        node(id: "${jobId}") {
          ... on BulkOperation {
            id
            status
            errorCode
            url
            partialDataUrl
            createdAt
            completedAt
          }
        }
      }
    `
    
    const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    })
    
    const data = await response.json()
    return data.data?.node as BulkJobStatus
  }
  
  /**
   * Process completed bulk operation data
   */
  static async processBulkJobResults(
    jobId: string,
    jobType: string,
    brandId: string,
    connectionId: string,
    shop: string,
    accessToken: string
  ) {
    const jobStatus = await this.checkBulkJobStatus(shop, accessToken, jobId)
    
    if (jobStatus.status !== 'COMPLETED' || !jobStatus.url) {
      throw new Error(`Job ${jobId} not completed or no data URL available`)
    }
    
    // Download and process the JSONL data
    const dataResponse = await fetch(jobStatus.url)
    const dataText = await dataResponse.text()
    
    // Process line by line (JSONL format)
    const lines = dataText.trim().split('\n')
    console.log(`[Bulk Import] Processing ${lines.length} records for ${jobType}`)
    
    for (const line of lines) {
      if (!line.trim()) continue
      
      try {
        const record = JSON.parse(line)
        
        switch (jobType) {
          case 'orders':
            await this.processOrderRecord(record, brandId, connectionId)
            break
          case 'customers':
            await this.processCustomerRecord(record, brandId, connectionId)
            break
          case 'products':
            await this.processProductRecord(record, brandId, connectionId)
            break
        }
      } catch (error) {
        console.error(`[Bulk Import] Error processing ${jobType} record:`, error)
      }
    }
    
    // Update job status
    await supabase
      .from('shopify_bulk_jobs')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        records_processed: lines.length
      })
      .eq('job_id', jobId)
    
    console.log(`[Bulk Import] Completed processing ${jobType} bulk job: ${lines.length} records`)

    // Process analytics for compliance features after bulk import completes
    if (jobType === 'orders') {
      try {
        console.log(`[Bulk Import] Starting analytics processing for ${jobType} completion`)
        const { ShopifyAnalyticsService } = await import('./shopifyAnalyticsService')
        
        // Process analytics in background
        ShopifyAnalyticsService.processAllAnalytics(brandId, connectionId)
          .then(() => console.log(`[Bulk Import] Analytics processing completed for ${jobType}`))
          .catch(err => console.error(`[Bulk Import] Analytics processing failed for ${jobType}:`, err))
          
      } catch (analyticsError) {
        console.error(`[Bulk Import] Error starting analytics processing for ${jobType}:`, analyticsError)
      }
    }
  }
  
  private static async processOrderRecord(record: any, brandId: string, connectionId: string) {
    // Process order from bulk export
    await supabase
      .from('shopify_orders')
      .upsert({
        id: parseInt(record.id.split('/').pop()),
        brand_id: brandId,
        connection_id: connectionId,
        order_number: record.name,
        total_price: parseFloat(record.totalPriceSet?.shopMoney?.amount || '0'),
        subtotal_price: parseFloat(record.subtotalPriceSet?.shopMoney?.amount || '0'),
        total_tax: parseFloat(record.totalTaxSet?.shopMoney?.amount || '0'),
        currency: record.totalPriceSet?.shopMoney?.currencyCode,
        financial_status: record.displayFinancialStatus,
        fulfillment_status: record.displayFulfillmentStatus,
        customer_email: record.customer?.email || record.email,
        customer_first_name: record.customer?.firstName,
        customer_last_name: record.customer?.lastName,
        line_items_count: record.lineItems?.edges?.length || 0,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        processed_at: record.processedAt,
        last_synced_at: new Date().toISOString(),
        bulk_imported: true
      }, {
        onConflict: 'id'
      })
  }
  
  private static async processCustomerRecord(record: any, brandId: string, connectionId: string) {
    // Process customer from bulk export
    await supabase
      .from('shopify_customers')
      .upsert({
        customer_id: record.id.split('/').pop(),
        brand_id: brandId,
        connection_id: connectionId,
        email: record.email,
        first_name: record.firstName,
        last_name: record.lastName,
        phone: record.phone,
        orders_count: record.numberOfOrders,
        total_spent: parseFloat(record.totalSpent || '0'),
        currency: 'USD', // Default currency since totalSpent is just a number
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        last_synced_at: new Date().toISOString(),
        bulk_imported: true
      }, {
        onConflict: 'customer_id,brand_id'
      })
  }
  
  private static async processProductRecord(record: any, brandId: string, connectionId: string) {
    // Process product from bulk export
    await supabase
      .from('shopify_products')
      .upsert({
        product_id: record.id.split('/').pop(),
        brand_id: brandId,
        connection_id: connectionId,
        title: record.title,
        handle: record.handle,
        description: record.description,
        product_type: record.productType,
        vendor: record.vendor,
        status: record.status,
        total_inventory: record.totalInventory,
        variants_count: record.variants?.edges?.length || 0,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        last_synced_at: new Date().toISOString(),
        bulk_imported: true
      }, {
        onConflict: 'product_id,brand_id'
      })
  }

  /**
   * Sync abandoned checkouts and cart data from Shopify
   */
  static async syncAbandonedCheckouts(
    shop: string, 
    accessToken: string, 
    brandId: string, 
    connectionId: string, 
    userId: string
  ) {
    try {
      console.log(`[Abandoned Checkouts] Starting sync for shop ${shop}`)

      // Fetch abandoned checkouts from Shopify
      const abandonedUrl = `https://${shop}/admin/api/2024-01/checkouts.json?status=abandoned&limit=250`
      
      const response = await fetch(abandonedUrl, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Abandoned Checkouts] Shopify API error: ${response.status} - ${errorText}`)
        return
      }

      const data = await response.json()
      const abandonedCheckouts = data.checkouts || []

      console.log(`[Abandoned Checkouts] Found ${abandonedCheckouts.length} abandoned checkouts`)

      let storedCount = 0

      for (const checkout of abandonedCheckouts) {
        try {
          // Extract address data
          const shippingAddress = checkout.shipping_address || {}
          const billingAddress = checkout.billing_address || {}
          
          const address = shippingAddress.city ? shippingAddress : 
                         billingAddress.city ? billingAddress : null

          // Store abandoned checkout
          const { error: checkoutError } = await supabase
            .from('shopify_abandoned_checkouts')
            .upsert({
              checkout_id: checkout.token,
              brand_id: brandId,
              connection_id: connectionId,
              user_id: userId,
              email: checkout.email,
              customer_id: checkout.customer_id ? parseInt(checkout.customer_id) : null,
              total_price: parseFloat(checkout.total_price || '0'),
              subtotal_price: parseFloat(checkout.subtotal_price || '0'),
              total_tax: parseFloat(checkout.total_tax || '0'),
              currency: checkout.currency,
              line_items: checkout.line_items || [],
              line_items_count: checkout.line_items?.length || 0,
              abandoned_checkout_url: checkout.abandoned_checkout_url,
              created_at: checkout.created_at,
              updated_at: checkout.updated_at,
              completed_at: checkout.completed_at,
              city: address?.city,
              province: address?.province,
              country: address?.country,
              country_code: address?.country_code,
              last_synced_at: new Date().toISOString()
            }, { onConflict: 'checkout_id,brand_id' })

          if (checkoutError) {
            console.error(`[Abandoned Checkouts] Error storing checkout ${checkout.token}:`, checkoutError)
          } else {
            storedCount++
            console.log(`[Abandoned Checkouts] ✅ Stored abandoned checkout ${checkout.token} ($${checkout.total_price})`)
          }

        } catch (checkoutError) {
          console.error(`[Abandoned Checkouts] Error processing checkout ${checkout.token}:`, checkoutError)
        }
      }

      console.log(`[Abandoned Checkouts] Sync complete! Stored ${storedCount}/${abandonedCheckouts.length} checkouts`)

      // Also fetch regular checkouts (not abandoned)
      await this.syncActiveCheckouts(shop, accessToken, brandId, connectionId, userId)

    } catch (error) {
      console.error('[Abandoned Checkouts] Error in sync:', error)
    }
  }

  /**
   * Sync active checkouts from Shopify
   */
  static async syncActiveCheckouts(
    shop: string, 
    accessToken: string, 
    brandId: string, 
    connectionId: string, 
    userId: string
  ) {
    try {
      console.log(`[Active Checkouts] Starting sync for shop ${shop}`)

      // Fetch active checkouts from Shopify
      const checkoutsUrl = `https://${shop}/admin/api/2024-01/checkouts.json?limit=250`
      
      const response = await fetch(checkoutsUrl, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Active Checkouts] Shopify API error: ${response.status} - ${errorText}`)
        return
      }

      const data = await response.json()
      const checkouts = data.checkouts || []

      console.log(`[Active Checkouts] Found ${checkouts.length} active checkouts`)

      let storedCount = 0

      for (const checkout of checkouts) {
        try {
          // Extract address data
          const shippingAddress = checkout.shipping_address || {}
          const billingAddress = checkout.billing_address || {}
          
          const address = shippingAddress.city ? shippingAddress : 
                         billingAddress.city ? billingAddress : null

          // Store checkout
          const { error: checkoutError } = await supabase
            .from('shopify_checkouts')
            .upsert({
              checkout_id: checkout.token,
              brand_id: brandId,
              connection_id: connectionId,
              user_id: userId,
              email: checkout.email,
              customer_id: checkout.customer_id ? parseInt(checkout.customer_id) : null,
              total_price: parseFloat(checkout.total_price || '0'),
              subtotal_price: parseFloat(checkout.subtotal_price || '0'),
              total_tax: parseFloat(checkout.total_tax || '0'),
              currency: checkout.currency,
              line_items: checkout.line_items || [],
              line_items_count: checkout.line_items?.length || 0,
              checkout_url: checkout.web_url,
              created_at: checkout.created_at,
              updated_at: checkout.updated_at,
              completed_at: checkout.completed_at,
              city: address?.city,
              province: address?.province,
              country: address?.country,
              country_code: address?.country_code,
              last_synced_at: new Date().toISOString()
            }, { onConflict: 'checkout_id,brand_id' })

          if (checkoutError) {
            console.error(`[Active Checkouts] Error storing checkout ${checkout.token}:`, checkoutError)
          } else {
            storedCount++
            console.log(`[Active Checkouts] ✅ Stored checkout ${checkout.token} ($${checkout.total_price})`)
          }

        } catch (checkoutError) {
          console.error(`[Active Checkouts] Error processing checkout ${checkout.token}:`, checkoutError)
        }
      }

      console.log(`[Active Checkouts] Sync complete! Stored ${storedCount}/${checkouts.length} checkouts`)

    } catch (error) {
      console.error('[Active Checkouts] Error in sync:', error)
    }
  }
}
