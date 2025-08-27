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
   * Start bulk orders export with line items
   */
  static async startBulkOrdersExport(
    shop: string, 
    accessToken: string,
    sinceDate: string = '2000-01-01'
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
                          grams
                          requiresShipping
                          taxable
                          giftCard
                          fulfillmentService
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
    sinceDate: string = '2000-01-01'
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
                    marketingOptInLevel
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
    sinceDate: string = '2000-01-01'
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
                    publishedScope
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
                          weight
                          weightUnit
                          requiresShipping
                          taxable
                          inventoryManagement
                          inventoryPolicy
                          fulfillmentService
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
    const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: mutation })
    })
    
    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} - ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
    }
    
    if (data.data?.bulkOperationRunQuery?.userErrors?.length > 0) {
      throw new Error(`Bulk operation errors: ${JSON.stringify(data.data.bulkOperationRunQuery.userErrors)}`)
    }
    
    const bulkOp = data.data?.bulkOperationRunQuery?.bulkOperation
    
    if (!bulkOp) {
      throw new Error('No bulk operation returned from GraphQL')
    }
    
    return {
      id: bulkOp.id,
      status: bulkOp.status,
      createdAt: bulkOp.createdAt
    }
  }

  /**
   * Get current bulk operation status
   */
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
    console.log(`[GraphQL] Processing bulk results for ${entity} from ${downloadUrl}`)
    
    // Download the JSONL file
    const response = await fetch(downloadUrl)
    if (!response.ok) {
      throw new Error(`Failed to download bulk results: ${response.status}`)
    }
    
    const jsonlData = await response.text()
    const lines = jsonlData.trim().split('\n').filter(line => line.trim())
    
    console.log(`[GraphQL] Processing ${lines.length} lines of ${entity} data`)
    
    let ordersProcessed = 0
    let lineItemsProcessed = 0
    let customersProcessed = 0
    let productsProcessed = 0
    
    const supabase = createClient()
    
    // Process in batches
    const BATCH_SIZE = 100
    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, i + BATCH_SIZE)
      
      if (entity === 'orders') {
        const { orders, lineItems } = await this.processOrdersBatch(batch, brandId, connectionId, supabase)
        ordersProcessed += orders
        lineItemsProcessed += lineItems
      } else if (entity === 'customers') {
        const customers = await this.processCustomersBatch(batch, brandId, connectionId, supabase)
        customersProcessed += customers
      } else if (entity === 'products') {
        const products = await this.processProductsBatch(batch, brandId, connectionId, supabase)
        productsProcessed += products
      }
    }
    
    return { ordersProcessed, lineItemsProcessed, customersProcessed, productsProcessed }
  }

  /**
   * Process orders batch and insert into staging tables
   */
  private static async processOrdersBatch(
    batch: string[],
    brandId: string,
    connectionId: string,
    supabase: any
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
    
    // Insert into staging tables
    if (orders.length > 0) {
      const { error: ordersError } = await supabase
        .from('stage.shopify_orders')
        .upsert(orders, { onConflict: 'order_id' })
      
      if (ordersError) {
        console.error('[GraphQL] Error inserting orders:', ordersError)
      }
    }
    
    if (lineItems.length > 0) {
      const { error: lineItemsError } = await supabase
        .from('stage.shopify_line_items')
        .upsert(lineItems, { onConflict: 'order_id,line_item_id' })
      
      if (lineItemsError) {
        console.error('[GraphQL] Error inserting line items:', lineItemsError)
      }
    }
    
    return { orders: orders.length, lineItems: lineItems.length }
  }

  /**
   * Process customers batch
   */
  private static async processCustomersBatch(
    batch: string[],
    brandId: string,
    connectionId: string,
    supabase: any
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
            last_order_id: customer.lastOrder?.id?.replace('gid://shopify/Order/', ''),
            last_order_name: customer.lastOrder?.name,
            currency: customer.totalSpentV2?.currencyCode || 'USD',
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
    
    if (customers.length > 0) {
      const { error } = await supabase
        .from('stage.shopify_customers')
        .upsert(customers, { onConflict: 'customer_id' })
      
      if (error) {
        console.error('[GraphQL] Error inserting customers:', error)
      }
    }
    
    return customers.length
  }

  /**
   * Process products batch
   */
  private static async processProductsBatch(
    batch: string[],
    brandId: string,
    connectionId: string,
    supabase: any
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
    
    if (products.length > 0) {
      const { error } = await supabase
        .from('stage.shopify_products')
        .upsert(products, { onConflict: 'product_id' })
      
      if (error) {
        console.error('[GraphQL] Error inserting products:', error)
      }
    }
    
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
