import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

interface SyncStats {
  orders: number;
  customers: number;
  products: number;
}

interface ShopifyConnection {
  id: string;
  shop: string;
  access_token: string;
  brand_id: string;
}

export async function POST(request: Request) {
  try {
    const { connectionId } = await request.json()

    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 })
    }

    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (connectionError || !connection) {
      console.error('Error fetching connection:', connectionError)
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    if (!connection.access_token || !connection.shop) {
      return NextResponse.json({ error: 'Invalid connection data' }, { status: 400 })
    }

    // Update sync status to in_progress
    await supabase
      .from('platform_connections')
      .update({ sync_status: 'in_progress', last_sync_started_at: new Date().toISOString() })
      .eq('id', connectionId)

    // Track sync stats
    const syncStats: SyncStats = {
      orders: 0,
      customers: 0,
      products: 0
    }

    try {
      // Sync orders, customers, and products
      await syncOrders(connection as ShopifyConnection, syncStats)
      await syncCustomers(connection as ShopifyConnection, syncStats)
      await syncProducts(connection as ShopifyConnection, syncStats)

      // Update sync status to completed
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'completed',
          last_sync_completed_at: new Date().toISOString(),
          sync_stats: syncStats
        })
        .eq('id', connectionId)

      return NextResponse.json({
        success: true,
        message: 'Sync completed successfully',
        stats: syncStats
      })
    } catch (syncError: any) {
      console.error('Error during sync:', syncError)

      // Update sync status to failed
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'failed',
          sync_error: syncError.message || 'Unknown error during sync'
        })
        .eq('id', connectionId)

      return NextResponse.json({
        error: 'Sync failed',
        message: syncError.message || 'Unknown error during sync'
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Error processing sync request:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}

// Function to sync orders from Shopify
async function syncOrders(connection: ShopifyConnection, syncStats: SyncStats) {
  console.log(`Starting order sync for shop: ${connection.shop}`)
  let hasNextPage = true
  let cursor: string | null = null
  let totalOrders = 0
  const batchSize = 50
  
  while (hasNextPage) {
    // Build cursor-based pagination query
    const query = `
      {
        orders(first: ${batchSize}${cursor ? `, after: "${cursor}"` : ''}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              name
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                id
              }
              lineItems(first: 50) {
                edges {
                  node {
                    id
                    name
                    quantity
                    product {
                      id
                    }
                    variant {
                      id
                      price
                    }
                  }
                }
              }
              shippingAddress {
                address1
                address2
                city
                province
                country
                zip
              }
              billingAddress {
                address1
                address2
                city
                province
                country
                zip
              }
              financialStatus
              fulfillmentStatus
              tags
              note
              discountCodes {
                code
                amount
                type
              }
              shippingLines(first: 10) {
                edges {
                  node {
                    title
                    price
                  }
                }
              }
            }
          }
        }
      }
    `

    // Make GraphQL request to Shopify
    const response = await fetch(`https://${connection.shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': connection.access_token
      },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
    }

    const orders = data.data.orders.edges.map((edge: any) => {
      const order = edge.node
      
      // Format line items
      const lineItems = order.lineItems.edges.map((lineItem: any) => {
        const item = lineItem.node
        return {
          id: item.id.split('/').pop(),
          name: item.name,
          quantity: item.quantity,
          product_id: item.product?.id?.split('/').pop(),
          variant_id: item.variant?.id?.split('/').pop(),
          price: item.variant?.price
        }
      })
      
      // Format shipping lines
      const shippingLines = order.shippingLines.edges.map((shippingLine: any) => {
        const line = shippingLine.node
        return {
          title: line.title,
          price: line.price
        }
      })
      
      return {
        id: parseInt(order.id.split('/').pop()),
        connection_id: connection.id,
        order_name: order.name,
        created_at: order.createdAt,
        created_at_timestamp: new Date(order.createdAt).getTime(),
        customer_id: order.customer?.id?.split('/').pop(),
        total_price: parseFloat(order.totalPriceSet.shopMoney.amount),
        currency: order.totalPriceSet.shopMoney.currencyCode,
        line_items: lineItems,
        shipping_address: order.shippingAddress,
        billing_address: order.billingAddress,
        financial_status: order.financialStatus,
        fulfillment_status: order.fulfillmentStatus,
        tags: order.tags,
        note: order.note,
        discount_codes: order.discountCodes,
        shipping_lines: shippingLines
      }
    })

    // Insert orders into database in batches
    if (orders.length > 0) {
      const { error } = await supabase
        .from('shopify_orders')
        .upsert(orders, { onConflict: 'id,connection_id' })
      
      if (error) {
        throw new Error(`Error inserting orders: ${error.message}`)
      }
      
      totalOrders += orders.length
      syncStats.orders += orders.length
      console.log(`Synced ${orders.length} orders (total: ${totalOrders})`)
    }

    // Update pagination cursor
    hasNextPage = data.data.orders.pageInfo.hasNextPage
    cursor = data.data.orders.pageInfo.endCursor
    
    // Respect Shopify API rate limits (2 requests per second)
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  console.log(`Completed order sync. Total orders: ${totalOrders}`)
}

// Function to sync customers from Shopify
async function syncCustomers(connection: ShopifyConnection, syncStats: SyncStats) {
  console.log(`Starting customer sync for shop: ${connection.shop}`)
  let hasNextPage = true
  let cursor: string | null = null
  let totalCustomers = 0
  const batchSize = 50
  
  while (hasNextPage) {
    // Build cursor-based pagination query
    const query = `
      {
        customers(first: ${batchSize}${cursor ? `, after: "${cursor}"` : ''}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              email
              firstName
              lastName
              ordersCount
              totalSpent
              createdAt
              updatedAt
              addresses {
                address1
                address2
                city
                province
                country
                zip
              }
              defaultAddress {
                address1
                address2
                city
                province
                country
                zip
              }
              tags
              note
            }
          }
        }
      }
    `

    // Make GraphQL request to Shopify
    const response = await fetch(`https://${connection.shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': connection.access_token
      },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
    }

    const customers = data.data.customers.edges.map((edge: any) => {
      const customer = edge.node
      return {
        id: parseInt(customer.id.split('/').pop()),
        connection_id: connection.id,
        email: customer.email,
        first_name: customer.firstName,
        last_name: customer.lastName,
        orders_count: customer.ordersCount,
        total_spent: parseFloat(customer.totalSpent || 0),
        created_at: customer.createdAt,
        updated_at: customer.updatedAt,
        addresses: customer.addresses,
        default_address: customer.defaultAddress,
        tags: customer.tags,
        note: customer.note
      }
    })

    // Insert customers into database in batches
    if (customers.length > 0) {
      const { error } = await supabase
        .from('shopify_customers')
        .upsert(customers, { onConflict: 'id,connection_id' })
      
      if (error) {
        throw new Error(`Error inserting customers: ${error.message}`)
      }
      
      totalCustomers += customers.length
      syncStats.customers += customers.length
      console.log(`Synced ${customers.length} customers (total: ${totalCustomers})`)
    }

    // Update pagination cursor
    hasNextPage = data.data.customers.pageInfo.hasNextPage
    cursor = data.data.customers.pageInfo.endCursor
    
    // Respect Shopify API rate limits
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  console.log(`Completed customer sync. Total customers: ${totalCustomers}`)
}

// Function to sync products from Shopify
async function syncProducts(connection: ShopifyConnection, syncStats: SyncStats) {
  console.log(`Starting product sync for shop: ${connection.shop}`)
  let hasNextPage = true
  let cursor: string | null = null
  let totalProducts = 0
  const batchSize = 50
  
  while (hasNextPage) {
    // Build cursor-based pagination query
    const query = `
      {
        products(first: ${batchSize}${cursor ? `, after: "${cursor}"` : ''}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              description
              vendor
              productType
              createdAt
              updatedAt
              publishedAt
              tags
              status
              variants(first: 20) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                    inventoryQuantity
                  }
                }
              }
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                  }
                }
              }
              options {
                id
                name
                values
              }
            }
          }
        }
      }
    `

    // Make GraphQL request to Shopify
    const response = await fetch(`https://${connection.shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': connection.access_token
      },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
    }

    const products = data.data.products.edges.map((edge: any) => {
      const product = edge.node
      
      // Format variants
      const variants = product.variants.edges.map((variant: any) => {
        const v = variant.node
        return {
          id: v.id.split('/').pop(),
          title: v.title,
          price: v.price,
          sku: v.sku,
          inventory_quantity: v.inventoryQuantity
        }
      })
      
      // Format images
      const images = product.images.edges.map((image: any) => {
        const img = image.node
        return {
          id: img.id.split('/').pop(),
          url: img.url,
          alt_text: img.altText
        }
      })
      
      return {
        id: parseInt(product.id.split('/').pop()),
        connection_id: connection.id,
        title: product.title,
        description: product.description,
        vendor: product.vendor,
        product_type: product.productType,
        created_at: product.createdAt,
        updated_at: product.updatedAt,
        published_at: product.publishedAt,
        tags: product.tags,
        status: product.status,
        variants: variants,
        images: images,
        options: product.options
      }
    })

    // Insert products into database in batches
    if (products.length > 0) {
      const { error } = await supabase
        .from('shopify_products')
        .upsert(products, { onConflict: 'id,connection_id' })
      
      if (error) {
        throw new Error(`Error inserting products: ${error.message}`)
      }
      
      totalProducts += products.length
      syncStats.products += products.length
      console.log(`Synced ${products.length} products (total: ${totalProducts})`)
    }

    // Update pagination cursor
    hasNextPage = data.data.products.pageInfo.hasNextPage
    cursor = data.data.products.pageInfo.endCursor
    
    // Respect Shopify API rate limits
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  console.log(`Completed product sync. Total products: ${totalProducts}`)
} 