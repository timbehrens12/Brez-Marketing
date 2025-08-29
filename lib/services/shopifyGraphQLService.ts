import { createClient } from '@/lib/supabase/server'

export interface BulkOperationResult {
  id: string
  status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED'
  errorCode?: string
  url?: string
  partialDataUrl?: string
  createdAt: string
  completedAt?: string
}

export class ShopifyGraphQLService {
  /**
   * Check if a bulk operation is already running
   */
  static async checkExistingBulkOperation(
    shop: string,
    accessToken: string
  ): Promise<BulkOperationResult | null> {
    const existingOp = await this.getCurrentBulkOperation(shop, accessToken)
    return existingOp
  }

  /**
   * Start bulk orders export with line items
   */
    static async startBulkOrdersExport(
    shop: string,
    accessToken: string,
    sinceDate: string = '2010-01-01' // Go back 14+ years to get ALL historical data
  ): Promise<BulkOperationResult> {
    const mutation = `
      mutation {
        bulkOperationRunQuery(
          query: """
            {
              orders(first: 250, query: "created_at:>=${sinceDate}") {
                edges {
                  node {
                    id
                    name
                    email
                    createdAt
                    updatedAt
                    processedAt
                    currencyCode
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
                    totalDiscountsSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    displayFinancialStatus
                    displayFulfillmentStatus
                    tags
                    note
                    customer {
                      id
                      email
                      firstName
                      lastName
                    }
                    shippingAddress {
                      city
                      province
                      country
                      countryCodeV2
                    }
                    lineItems(first: 250) {
                      edges {
                        node {
                          id
                          name
                          title
                          quantity
                          originalTotalSet {
                            shopMoney {
                              amount
                              currencyCode
                            }
                          }
                          discountedTotalSet {
                            shopMoney {
                              amount
                              currencyCode
                            }
                          }
                          variant {
                            id
                            title
                            sku
                            product {
                              id
                              title
                              vendor
                              productType
                            }
                          }
                          vendor
                          requiresShipping
                          taxable
                          fulfillmentStatus
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
            createdAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `
    
    return this.executeBulkOperation(shop, accessToken, mutation)
  }

  /**
   * Start bulk customers export
   */
  static async startBulkCustomersExport(
    shop: string,
    accessToken: string,
    sinceDate: string = '2010-01-01' // Go back 14+ years to get ALL historical data
  ): Promise<BulkOperationResult> {
    const mutation = `
      mutation {
        bulkOperationRunQuery(
          query: """
            {
              customers(first: 250, query: "created_at:>=${sinceDate}") {
                edges {
                  node {
                    id
                    email
                    firstName
                    lastName
                    phone
                    acceptsMarketing
                    createdAt
                    updatedAt
                    ordersCount
                    totalSpentV2 {
                      amount
                      currencyCode
                    }
                    lastOrder {
                      id
                      name
                    }
                    emailMarketingConsent {
                      marketingState
                      marketingOptInLevel
                      consentUpdatedAt
                    }
                    smsMarketingConsent {
                      marketingState
                      marketingOptInLevel
                      consentUpdatedAt
                    }
                    tags
                    note
                    taxExempt
                    verifiedEmail
                    multipassIdentifier
                    addresses {
                      id
                      firstName
                      lastName
                      company
                      address1
                      address2
                      city
                      province
                      country
                      zip
                      phone
                      countryCodeV2
                      provinceCode
                    }
                    defaultAddress {
                      id
                      firstName
                      lastName
                      company
                      address1
                      address2
                      city
                      province
                      country
                      zip
                      phone
                      countryCodeV2
                      provinceCode
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
            createdAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `
    
    return this.executeBulkOperation(shop, accessToken, mutation)
  }

  /**
   * Start bulk products export
   */
  static async startBulkProductsExport(
    shop: string,
    accessToken: string,
    sinceDate: string = '2010-01-01' // Go back 14+ years to get ALL historical data
  ): Promise<BulkOperationResult> {
    const mutation = `
      mutation {
        bulkOperationRunQuery(
          query: """
            {
              products(first: 250, query: "created_at:>=${sinceDate}") {
                edges {
                  node {
                    id
                    title
                    bodyHtml
                    vendor
                    productType
                    handle
                    status
                    tags
                    createdAt
                    updatedAt
                    publishedAt
                    options {
                      id
                      name
                      values
                      position
                    }
                    variants(first: 100) {
                      edges {
                        node {
                          id
                          title
                          sku
                          position
                          inventoryQuantity
                          price
                          compareAtPrice
                          taxable
                          inventoryPolicy
                          createdAt
                          updatedAt
                        }
                      }
                    }
                    images(first: 50) {
                      edges {
                        node {
                          id
                          src
                          altText
                          width
                          height
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
            createdAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `
    
    return this.executeBulkOperation(shop, accessToken, mutation)
  }

  /**
   * Execute a bulk operation mutation
   */
  private static async executeBulkOperation(
    shop: string,
    accessToken: string,
    mutation: string
  ): Promise<BulkOperationResult> {
    const graphqlId = `graphql_${Date.now()}`
    
    console.log(`🔗 [GRAPHQL-${graphqlId}] ===== EXECUTING BULK OPERATION =====`)
    console.log(`🔗 [GRAPHQL-${graphqlId}] Shop: ${shop}`)
    console.log(`🔗 [GRAPHQL-${graphqlId}] Access Token: ${accessToken ? 'PRESENT' : 'MISSING'}`)
    console.log(`🔗 [GRAPHQL-${graphqlId}] Token Length: ${accessToken?.length || 0} chars`)
    console.log(`🔗 [GRAPHQL-${graphqlId}] Mutation Length: ${mutation.length} chars`)

    const requestUrl = `https://${shop}/admin/api/2024-01/graphql.json`
    console.log(`📡 [GRAPHQL-${graphqlId}] Making request to: ${requestUrl}`)

    const requestBody = JSON.stringify({ query: mutation })
    console.log(`📡 [GRAPHQL-${graphqlId}] Request body size: ${requestBody.length} chars`)

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: requestBody
    })

    console.log(`📡 [GRAPHQL-${graphqlId}] Response received - Status: ${response.status}`)
    console.log(`📡 [GRAPHQL-${graphqlId}] Response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [GRAPHQL-${graphqlId}] HTTP request failed:`)
      console.error(`❌ [GRAPHQL-${graphqlId}] Status: ${response.status}`)
      console.error(`❌ [GRAPHQL-${graphqlId}] Status Text: ${response.statusText}`)
      console.error(`❌ [GRAPHQL-${graphqlId}] Error Response:`, errorText)
      throw new Error(`GraphQL request failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`📄 [GRAPHQL-${graphqlId}] Response data received:`)
    console.log(`📄 [GRAPHQL-${graphqlId}] Response size: ${JSON.stringify(data).length} chars`)
    console.log(`📄 [GRAPHQL-${graphqlId}] Full response:`, JSON.stringify(data, null, 2))

    if (data.errors) {
      console.error(`❌ [GRAPHQL-${graphqlId}] GraphQL errors found:`, data.errors)
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
    }

    if (data.data?.bulkOperationRunQuery?.userErrors?.length > 0) {
      console.error(`❌ [GRAPHQL-${graphqlId}] Bulk operation user errors:`, data.data.bulkOperationRunQuery.userErrors)
      throw new Error(`Bulk operation errors: ${JSON.stringify(data.data.bulkOperationRunQuery.userErrors)}`)
    }

    const bulkOp = data.data?.bulkOperationRunQuery?.bulkOperation

    if (!bulkOp) {
      console.error(`❌ [GRAPHQL-${graphqlId}] No bulk operation returned in response:`)
      console.error(`❌ [GRAPHQL-${graphqlId}] Full data structure:`, JSON.stringify(data, null, 2))
      throw new Error('No bulk operation returned from GraphQL')
    }

    console.log(`✅ [GRAPHQL-${graphqlId}] Bulk operation created successfully:`)
    console.log(`📋 [GRAPHQL-${graphqlId}] - Operation ID: ${bulkOp.id}`)
    console.log(`📋 [GRAPHQL-${graphqlId}] - Status: ${bulkOp.status}`)
    console.log(`📋 [GRAPHQL-${graphqlId}] - Created At: ${bulkOp.createdAt}`)

    return {
      id: bulkOp.id,
      status: bulkOp.status,
      createdAt: bulkOp.createdAt
    }
  }

  /**
   * Get current bulk operation status
   */
  /**
   * Cancel any existing bulk operation to prevent conflicts
   */
  static async cancelCurrentBulkOperation(
    shop: string,
    accessToken: string
  ): Promise<boolean> {
    console.log('[GraphQL] Cancelling any existing bulk operation...')
    
    const currentOp = await this.getCurrentBulkOperation(shop, accessToken)
    
    if (!currentOp) {
      console.log('[GraphQL] No existing bulk operation to cancel')
      return true
    }
    
    if (currentOp.status === 'COMPLETED' || currentOp.status === 'FAILED' || currentOp.status === 'CANCELED') {
      console.log(`[GraphQL] Bulk operation ${currentOp.id} is already ${currentOp.status}`)
      return true
    }
    
    console.log(`[GraphQL] Cancelling bulk operation ${currentOp.id} (status: ${currentOp.status})`)
    
    const mutation = `
      mutation bulkOperationCancel($id: ID!) {
        bulkOperationCancel(id: $id) {
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
    
    try {
      const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: mutation,
          variables: { id: currentOp.id }
        })
      })
      
      const result = await response.json()
      
      if (result.errors) {
        console.error('[GraphQL] Error cancelling bulk operation:', result.errors)
        return false
      }
      
      if (result.data?.bulkOperationCancel?.userErrors?.length > 0) {
        console.error('[GraphQL] User errors cancelling bulk operation:', result.data.bulkOperationCancel.userErrors)
        return false
      }
      
      console.log(`[GraphQL] ✅ Bulk operation ${currentOp.id} cancelled successfully`)
      return true
      
    } catch (error) {
      console.error('[GraphQL] Failed to cancel bulk operation:', error)
      return false
    }
  }

  static async getCurrentBulkOperation(
    shop: string,
    accessToken: string
  ): Promise<BulkOperationResult | null> {
    const query = `
      query {
        currentBulkOperation {
          id
          status
          errorCode
          createdAt
          completedAt
          objectCount
          fileSize
          url
          partialDataUrl
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
    
    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
    }
    
    const bulkOp = data.data?.currentBulkOperation
    
    if (!bulkOp) {
      return null
    }
    
    return {
      id: bulkOp.id,
      status: bulkOp.status,
      errorCode: bulkOp.errorCode,
      url: bulkOp.url,
      partialDataUrl: bulkOp.partialDataUrl,
      createdAt: bulkOp.createdAt,
      completedAt: bulkOp.completedAt
    }
  }

  /**
   * Download and process bulk operation results
   */
  static async processBulkResults(
    downloadUrl: string,
    entity: 'orders' | 'customers' | 'products',
    brandId: string,
    connectionId: string
  ): Promise<{ ordersProcessed: number; lineItemsProcessed: number; customersProcessed: number; productsProcessed: number }> {
    const processId = `process_${entity}_${Date.now()}`
    
    console.log(`📥 [PROCESS-${processId}] ===== PROCESSING BULK RESULTS =====`)
    console.log(`📥 [PROCESS-${processId}] Entity: ${entity.toUpperCase()}`)
    console.log(`📥 [PROCESS-${processId}] Brand ID: ${brandId}`)
    console.log(`📥 [PROCESS-${processId}] Connection ID: ${connectionId}`)
    console.log(`📥 [PROCESS-${processId}] Download URL: ${downloadUrl}`)

    // Download the JSONL file
    console.log(`⬇️ [PROCESS-${processId}] Downloading JSONL file...`)
    const downloadStart = Date.now()
    const response = await fetch(downloadUrl)
    const downloadTime = Date.now() - downloadStart
    
    console.log(`📡 [PROCESS-${processId}] Download response status: ${response.status}`)
    console.log(`⏱️ [PROCESS-${processId}] Download time: ${downloadTime}ms`)
    
    if (!response.ok) {
      console.error(`❌ [PROCESS-${processId}] Failed to download bulk results:`)
      console.error(`❌ [PROCESS-${processId}] Status: ${response.status}`)
      console.error(`❌ [PROCESS-${processId}] Status Text: ${response.statusText}`)
      throw new Error(`Failed to download bulk results: ${response.status}`)
    }

    const jsonlData = await response.text()
    console.log(`📄 [PROCESS-${processId}] Downloaded ${jsonlData.length} characters of JSONL data`)

    const lines = jsonlData.trim().split('\n').filter(line => line.trim())
    console.log(`📊 [PROCESS-${processId}] Found ${lines.length} data lines to process`)

    if (lines.length === 0) {
      console.warn(`⚠️ [PROCESS-${processId}] WARNING: No data lines found in bulk operation results`)
      console.warn(`⚠️ [PROCESS-${processId}] Raw data sample: ${jsonlData.substring(0, 500)}...`)
    } else {
      // Show sample of first few lines for debugging
      console.log(`🔍 [PROCESS-${processId}] Sample data lines:`)
      lines.slice(0, 3).forEach((line, idx) => {
        console.log(`🔍 [PROCESS-${processId}] Line ${idx + 1}: ${line.substring(0, 200)}...`)
      })
    }
    
    let ordersProcessed = 0
    let lineItemsProcessed = 0
    let customersProcessed = 0
    let productsProcessed = 0
    
    console.log(`💾 [PROCESS-${processId}] Initializing database connection...`)
    const supabase = createClient()
    
    // Process in batches
    const BATCH_SIZE = 100
    const totalBatches = Math.ceil(lines.length / BATCH_SIZE)
    console.log(`📦 [PROCESS-${processId}] Processing ${lines.length} lines in ${totalBatches} batches of ${BATCH_SIZE}`)
    
    const processingStart = Date.now()
    
    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const batch = lines.slice(i, i + BATCH_SIZE)
      
      console.log(`📦 [PROCESS-${processId}] Processing batch ${batchNum}/${totalBatches} (${batch.length} items)...`)
      const batchStart = Date.now()
      
      try {
        if (entity === 'orders') {
          console.log(`📊 [PROCESS-${processId}] Processing orders batch ${batchNum}...`)
          const { orders, lineItems } = await this.processOrdersBatch(batch, brandId, connectionId, supabase, processId)
          ordersProcessed += orders
          lineItemsProcessed += lineItems
          console.log(`✅ [PROCESS-${processId}] Batch ${batchNum}: +${orders} orders, +${lineItems} line items`)
        } else if (entity === 'customers') {
          console.log(`👥 [PROCESS-${processId}] Processing customers batch ${batchNum}...`)
          const customers = await this.processCustomersBatch(batch, brandId, connectionId, supabase, processId)
          customersProcessed += customers
          console.log(`✅ [PROCESS-${processId}] Batch ${batchNum}: +${customers} customers`)
        } else if (entity === 'products') {
          console.log(`📦 [PROCESS-${processId}] Processing products batch ${batchNum}...`)
          const products = await this.processProductsBatch(batch, brandId, connectionId, supabase, processId)
          productsProcessed += products
          console.log(`✅ [PROCESS-${processId}] Batch ${batchNum}: +${products} products`)
        }
        
        const batchTime = Date.now() - batchStart
        console.log(`⏱️ [PROCESS-${processId}] Batch ${batchNum} completed in ${batchTime}ms`)
      } catch (batchError) {
        console.error(`❌ [PROCESS-${processId}] Batch ${batchNum} failed:`, batchError)
        throw batchError
      }
    }
    
    const totalProcessingTime = Date.now() - processingStart
    console.log(`🎉 [PROCESS-${processId}] ===== BULK PROCESSING COMPLETED =====`)
    console.log(`📊 [PROCESS-${processId}] Final counts:`)
    console.log(`📊 [PROCESS-${processId}] - Orders: ${ordersProcessed}`)
    console.log(`📊 [PROCESS-${processId}] - Line Items: ${lineItemsProcessed}`)
    console.log(`📊 [PROCESS-${processId}] - Customers: ${customersProcessed}`)
    console.log(`📊 [PROCESS-${processId}] - Products: ${productsProcessed}`)
    console.log(`⏱️ [PROCESS-${processId}] Total processing time: ${totalProcessingTime}ms`)
    
    return { ordersProcessed, lineItemsProcessed, customersProcessed, productsProcessed }
  }

  /**
   * Process orders batch and insert into staging tables
   */
  private static async processOrdersBatch(
    batch: string[],
    brandId: string,
    connectionId: string,
    supabase: any,
    processId?: string
  ): Promise<{ orders: number; lineItems: number }> {
    const orders: any[] = []
    const lineItems: any[] = []
    
    for (const line of batch) {
      try {
        const item = JSON.parse(line)
        
        if (item.__typename === 'Order') {
          // Transform order data
          const order = {
            order_id: item.id.replace('gid://shopify/Order/', ''),
            brand_id: brandId,
            connection_id: connectionId,
            name: item.name,
            order_number: item.name?.replace('#', ''),
            email: item.email,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
            processed_at: item.processedAt,
            currency: item.currencyCode || 'USD',
            total_price: parseFloat(item.totalPriceSet?.shopMoney?.amount || '0'),
            subtotal_price: parseFloat(item.subtotalPriceSet?.shopMoney?.amount || '0'),
            total_tax: parseFloat(item.totalTaxSet?.shopMoney?.amount || '0'),
            total_discounts: parseFloat(item.totalDiscountsSet?.shopMoney?.amount || '0'),
            financial_status: item.displayFinancialStatus,
            fulfillment_status: item.displayFulfillmentStatus,
            customer_id: item.customer?.id?.replace('gid://shopify/Customer/', ''),
            customer_email: item.customer?.email,
            customer_first_name: item.customer?.firstName,
            customer_last_name: item.customer?.lastName,
            tags: item.tags?.join(', '),
            note: item.note,
            shipping_city: item.shippingAddress?.city,
            shipping_province: item.shippingAddress?.province,
            shipping_country: item.shippingAddress?.country,
            shipping_country_code: item.shippingAddress?.countryCodeV2,
            synced_at: new Date().toISOString()
          }
          
          orders.push(order)
        } else if (item.__typename === 'LineItem') {
          // Transform line item data
          const lineItem = {
            order_id: item.__parentId?.replace('gid://shopify/Order/', ''),
            line_item_id: item.id.replace('gid://shopify/LineItem/', ''),
            brand_id: brandId,
            connection_id: connectionId,
            name: item.name,
            title: item.title,
            quantity: item.quantity || 0,
            price: parseFloat(item.originalTotalSet?.shopMoney?.amount || '0'),
            total_discount: parseFloat(item.originalTotalSet?.shopMoney?.amount || '0') - parseFloat(item.discountedTotalSet?.shopMoney?.amount || '0'),
            sku: item.variant?.sku,
            product_id: item.variant?.product?.id?.replace('gid://shopify/Product/', ''),
            variant_id: item.variant?.id?.replace('gid://shopify/ProductVariant/', ''),
            variant_title: item.variant?.title,
            vendor: item.vendor || item.variant?.product?.vendor,
            grams: item.grams,
            requires_shipping: item.requiresShipping,
            taxable: item.taxable,
            gift_card: item.giftCard,
            fulfillment_service: item.fulfillmentService,
            fulfillment_status: item.fulfillmentStatus,
            synced_at: new Date().toISOString()
          }
          
          lineItems.push(lineItem)
        }
      } catch (error) {
        console.error('[GraphQL] Error parsing line:', error, line.substring(0, 200))
      }
    }
    
    const logPrefix = processId ? `[PROCESS-${processId}]` : '[BATCH-ORDERS]'
    
    // Insert directly into production tables for immediate visibility
    if (orders.length > 0) {
      console.log(`💾 ${logPrefix} Inserting ${orders.length} orders into shopify_orders table...`)
      const insertStart = Date.now()
      
      const { error: ordersError } = await supabase
        .from('shopify_orders')
        .upsert(orders, { onConflict: 'id' })
      
      const insertTime = Date.now() - insertStart
      
      if (ordersError) {
        console.error(`❌ ${logPrefix} Error inserting orders:`, ordersError)
        console.error(`❌ ${logPrefix} Orders error details:`, JSON.stringify(ordersError, null, 2))
        console.error(`❌ ${logPrefix} Sample order data:`, JSON.stringify(orders[0], null, 2))
      } else {
        console.log(`✅ ${logPrefix} Successfully stored ${orders.length} orders in production table`)
        console.log(`⏱️ ${logPrefix} Orders insert time: ${insertTime}ms`)
      }
    } else {
      console.log(`⚠️ ${logPrefix} No orders to insert in this batch`)
    }
    
    if (lineItems.length > 0) {
      console.log(`💾 ${logPrefix} Inserting ${lineItems.length} line items into shopify_line_items table...`)
      const insertStart = Date.now()
      
      const { error: lineItemsError } = await supabase
        .from('shopify_line_items')
        .upsert(lineItems, { onConflict: 'order_id,line_item_id' })
      
      const insertTime = Date.now() - insertStart
      
      if (lineItemsError) {
        console.error(`❌ ${logPrefix} Error inserting line items:`, lineItemsError)
        console.error(`❌ ${logPrefix} Line items error details:`, JSON.stringify(lineItemsError, null, 2))
        console.error(`❌ ${logPrefix} Sample line item data:`, JSON.stringify(lineItems[0], null, 2))
      } else {
        console.log(`✅ ${logPrefix} Successfully stored ${lineItems.length} line items in production table`)
        console.log(`⏱️ ${logPrefix} Line items insert time: ${insertTime}ms`)
      }
    } else {
      console.log(`⚠️ ${logPrefix} No line items to insert in this batch`)
    }
    
    console.log(`📊 ${logPrefix} Batch summary: ${orders.length} orders, ${lineItems.length} line items`)
    return { orders: orders.length, lineItems: lineItems.length }
  }

  /**
   * Process customers batch
   */
  private static async processCustomersBatch(
    batch: string[],
    brandId: string,
    connectionId: string,
    supabase: any,
    processId?: string
  ): Promise<number> {
    const customers: any[] = []
    
    for (const line of batch) {
      try {
        const customer = JSON.parse(line)
        
        if (customer.__typename === 'Customer') {
          const customerData = {
            customer_id: customer.id.replace('gid://shopify/Customer/', ''),
            brand_id: brandId,
            connection_id: connectionId,
            email: customer.email,
            first_name: customer.firstName,
            last_name: customer.lastName,
            phone: customer.phone,
            accepts_marketing: customer.acceptsMarketing,
            created_at: customer.createdAt,
            updated_at: customer.updatedAt,
            orders_count: customer.ordersCount || 0,
            total_spent: parseFloat(customer.totalSpentV2?.amount || '0'),
            currency: customer.totalSpentV2?.currencyCode || 'USD',
            last_order_id: customer.lastOrder?.id?.replace('gid://shopify/Order/', ''),
            last_order_name: customer.lastOrder?.name,
            marketing_opt_in_level: customer.marketingOptInLevel,
            email_marketing_consent: customer.emailMarketingConsent?.marketingState,
            sms_marketing_consent: customer.smsMarketingConsent?.marketingState,
            tags: customer.tags?.join(', '),
            note: customer.note,
            tax_exempt: customer.taxExempt,
            verified_email: customer.verifiedEmail,
            multipass_identifier: customer.multipassIdentifier,
            addresses: customer.addresses ? JSON.stringify(customer.addresses) : null,
            default_address: customer.defaultAddress ? JSON.stringify(customer.defaultAddress) : null,
            synced_at: new Date().toISOString()
          }
          
          customers.push(customerData)
        }
      } catch (error) {
        console.error('[GraphQL] Error parsing customer line:', error)
      }
    }
    
    const logPrefix = processId ? `[PROCESS-${processId}]` : '[BATCH-CUSTOMERS]'
    
    if (customers.length > 0) {
      console.log(`💾 ${logPrefix} Inserting ${customers.length} customers into shopify_customers table...`)
      const insertStart = Date.now()
      
      const { error } = await supabase
        .from('shopify_customers')
        .upsert(customers, { onConflict: 'id' })
      
      const insertTime = Date.now() - insertStart
      
      if (error) {
        console.error(`❌ ${logPrefix} Error inserting customers:`, error)
        console.error(`❌ ${logPrefix} Customers error details:`, JSON.stringify(error, null, 2))
        console.error(`❌ ${logPrefix} Sample customer data:`, JSON.stringify(customers[0], null, 2))
      } else {
        console.log(`✅ ${logPrefix} Successfully stored ${customers.length} customers in production table`)
        console.log(`⏱️ ${logPrefix} Customers insert time: ${insertTime}ms`)
      }
    } else {
      console.log(`⚠️ ${logPrefix} No customers to insert in this batch`)
    }
    
    console.log(`📊 ${logPrefix} Customers batch summary: ${customers.length} customers processed`)
    return customers.length
  }

  /**
   * Process products batch
   */
  private static async processProductsBatch(
    batch: string[],
    brandId: string,
    connectionId: string,
    supabase: any,
    processId?: string
  ): Promise<number> {
    const products: any[] = []
    
    for (const line of batch) {
      try {
        const product = JSON.parse(line)
        
        if (product.__typename === 'Product') {
          const productData = {
            product_id: product.id.replace('gid://shopify/Product/', ''),
            brand_id: brandId,
            connection_id: connectionId,
            title: product.title,
            body_html: product.bodyHtml,
            vendor: product.vendor,
            product_type: product.productType,
            handle: product.handle,
            status: product.status,
            published_scope: product.publishedScope,
            tags: product.tags?.join(', '),
            options: product.options ? JSON.stringify(product.options) : null,
            variants: product.variants ? JSON.stringify(product.variants) : null,
            images: product.images ? JSON.stringify(product.images) : null,
            created_at: product.createdAt,
            updated_at: product.updatedAt,
            published_at: product.publishedAt,
            synced_at: new Date().toISOString()
          }
          
          products.push(productData)
        }
      } catch (error) {
        console.error('[GraphQL] Error parsing product line:', error)
      }
    }
    
    const logPrefix = processId ? `[PROCESS-${processId}]` : '[BATCH-PRODUCTS]'
    
    if (products.length > 0) {
      console.log(`💾 ${logPrefix} Inserting ${products.length} products into shopify_products table...`)
      const insertStart = Date.now()
      
      // Store directly in production table for immediate visibility
      const { error } = await supabase
        .from('shopify_products')
        .upsert(products, { onConflict: 'product_id' })
      
      const insertTime = Date.now() - insertStart
      
      if (error) {
        console.error(`❌ ${logPrefix} Error inserting products:`, error)
        console.error(`❌ ${logPrefix} Products error details:`, JSON.stringify(error, null, 2))
        console.error(`❌ ${logPrefix} Sample product data:`, JSON.stringify(products[0], null, 2))
      } else {
        console.log(`✅ ${logPrefix} Successfully stored ${products.length} products in production table`)
        console.log(`⏱️ ${logPrefix} Products insert time: ${insertTime}ms`)
      }
    } else {
      console.log(`⚠️ ${logPrefix} No products to insert in this batch`)
    }
    
    console.log(`📊 ${logPrefix} Products batch summary: ${products.length} products processed`)
    return products.length
  }

  /**
   * Promote staging data to production tables
   */
  static async promoteToProduction(
    entity: 'orders' | 'customers' | 'products',
    brandId: string
  ): Promise<void> {
    const supabase = createClient()
    
    console.log(`[GraphQL] Promoting ${entity} staging data to production for brand ${brandId}`)
    
    if (entity === 'orders') {
      // Promote orders
      await supabase.rpc('promote_orders_to_production', { brand_id_param: brandId })
      
      // Promote line items
      await supabase.rpc('promote_line_items_to_production', { brand_id_param: brandId })
    } else if (entity === 'customers') {
      await supabase.rpc('promote_customers_to_production', { brand_id_param: brandId })
    } else if (entity === 'products') {
      await supabase.rpc('promote_products_to_production', { brand_id_param: brandId })
    }
  }
}
