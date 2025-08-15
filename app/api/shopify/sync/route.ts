import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a direct admin client that doesn't require authentication
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { connectionId } = body
    
    console.log('Shopify sync route hit:', { connectionId })
    
    if (!connectionId) {
      console.error('Missing connectionId')
      return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 })
    }

    // Get connection details
    console.log('Fetching connection details')
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (connectionError || !connection) {
      console.error('Error fetching connection:', connectionError)
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    console.log('Found connection:', {
      id: connection.id,
      platform_type: connection.platform_type,
      status: connection.status,
      shop: connection.shop
    })

    // Validate connection data
    if (!connection.access_token || !connection.shop) {
      console.error('Invalid connection:', {
        has_token: !!connection.access_token,
        has_shop: !!connection.shop
      })
      return NextResponse.json({ 
        error: 'Invalid connection: missing access token or shop' 
      }, { status: 400 })
    }

    // Update sync status to in_progress
    console.log('Updating sync status to in_progress')
    await supabaseAdmin
      .from('platform_connections')
      .update({ sync_status: 'in_progress' })
      .eq('id', connectionId)

    // Start comprehensive sync process
    console.log('Starting comprehensive sync process')
    let totalOrders = 0
    let totalProducts = 0
    let totalCustomers = 0
    let totalDiscounts = 0
    let totalRefunds = 0
    let totalDraftOrders = 0

    // 1. SYNC ORDERS (Enhanced with more fields)
    let nextOrdersCursor = null
    do {
      try {
        // Enhanced orders with comprehensive fields
        let url = `https://${connection.shop}/admin/api/2023-04/orders.json?limit=250&status=any&fields=id,created_at,updated_at,processed_at,closed_at,total_price,subtotal_price,total_discounts,total_tax,currency,financial_status,fulfillment_status,customer,line_items,shipping_lines,discount_codes,tags,note,browser_ip,gateway,order_number`
        if (nextOrdersCursor) {
          url += `&page_info=${nextOrdersCursor}`
        }

        console.log('Fetching orders from Shopify:', { url: url.substring(0, 100) + '...' })
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': connection.access_token,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Shopify API error response:', errorText)
          throw new Error(`Shopify API error: ${response.statusText} - ${errorText}`)
        }

        // Get the next page cursor from the Link header
        const linkHeader = response.headers.get('Link')
        nextOrdersCursor = null
        if (linkHeader) {
          const match = linkHeader.match(/<[^>]*page_info=([^>&"]*)[^>]*>; rel="next"/)
          if (match) {
            nextOrdersCursor = match[1]
          }
        }

        const data = await response.json()
        const orders = data.orders

        if (!orders?.length) {
          console.log('No orders found in this batch')
          break
        }

        console.log(`Found ${orders.length} orders in this batch`)

        // Format orders for database with enhanced fields
        const formattedOrders = orders.map((order: any) => ({
          id: order.id.toString(),
          connection_id: connectionId,
          order_number: order.order_number,
          created_at: order.created_at,
          updated_at: order.updated_at,
          processed_at: order.processed_at,
          closed_at: order.closed_at,
          total_price: parseFloat(order.total_price || 0),
          subtotal_price: parseFloat(order.subtotal_price || 0),
          total_discounts: parseFloat(order.total_discounts || 0),
          total_tax: parseFloat(order.total_tax || 0),
          currency: order.currency,
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          customer_id: order.customer?.id?.toString(),
          customer_email: order.customer?.email,
          line_items: order.line_items,
          shipping_lines: order.shipping_lines,
          discount_codes: order.discount_codes,
          tags: order.tags,
          note: order.note,
          browser_ip: order.browser_ip,
          gateway: order.gateway
        }))

        // Batch insert orders
        console.log(`Inserting ${formattedOrders.length} orders into database`)
        const { error: insertError } = await supabaseAdmin
          .from('shopify_orders')
          .upsert(formattedOrders, {
            onConflict: 'id',
            ignoreDuplicates: true
          })

        if (insertError) {
          console.error('Error inserting orders:', insertError)
          throw insertError
        }

        totalOrders += orders.length
        console.log(`Total orders processed so far: ${totalOrders}`)

        // Respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error('Error during orders sync:', error)
        throw error
      }
    } while (nextOrdersCursor)

    console.log(`Orders sync completed. Total: ${totalOrders}`)

    // 2. SYNC PRODUCTS
    console.log('Starting products sync...')
    let nextProductsCursor = null
    do {
      try {
        let url = `https://${connection.shop}/admin/api/2023-04/products.json?limit=250&fields=id,title,description,vendor,product_type,created_at,updated_at,published_at,status,tags,variants,images,options`
        if (nextProductsCursor) {
          url += `&page_info=${nextProductsCursor}`
        }

        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': connection.access_token,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Products API error: ${response.statusText}`)
        }

        const linkHeader = response.headers.get('Link')
        nextProductsCursor = null
        if (linkHeader) {
          const match = linkHeader.match(/<[^>]*page_info=([^>&"]*)[^>]*>; rel="next"/)
          if (match) {
            nextProductsCursor = match[1]
          }
        }

        const data = await response.json()
        const products = data.products

        if (!products?.length) break

        // Format products for database
        const formattedProducts = products.map((product: any) => ({
          id: product.id.toString(),
          connection_id: connectionId,
          title: product.title,
          description: product.description,
          vendor: product.vendor,
          product_type: product.product_type,
          created_at: product.created_at,
          updated_at: product.updated_at,
          published_at: product.published_at,
          status: product.status,
          tags: product.tags,
          variants: product.variants,
          images: product.images,
          options: product.options
        }))

        await supabaseAdmin
          .from('shopify_products_enhanced')
          .upsert(formattedProducts, { onConflict: 'id', ignoreDuplicates: true })

        // Collect inventory item IDs for cost data sync
        const inventoryItemIds = []
        for (const product of products) {
          if (product.variants && Array.isArray(product.variants)) {
            for (const variant of product.variants) {
              if (variant.inventory_item_id) {
                inventoryItemIds.push(variant.inventory_item_id)
              }
            }
          }
        }

        // Sync inventory items for cost data (in batches to avoid URL length limits)
        if (inventoryItemIds.length > 0) {
          const batchSize = 50 // Shopify allows up to 250, but we'll be conservative
          for (let i = 0; i < inventoryItemIds.length; i += batchSize) {
            const batch = inventoryItemIds.slice(i, i + batchSize)
            try {
              const inventoryUrl = `https://${connection.shop}/admin/api/2023-04/inventory_items.json?ids=${batch.join(',')}&fields=id,cost,country_code_of_origin,harmonized_system_code,created_at,updated_at`
              
              const inventoryResponse = await fetch(inventoryUrl, {
                headers: {
                  'X-Shopify-Access-Token': connection.access_token,
                  'Content-Type': 'application/json'
                }
              })

              if (inventoryResponse.ok) {
                const inventoryData = await inventoryResponse.json()
                const inventoryItems = inventoryData.inventory_items || []

                if (inventoryItems.length > 0) {
                  const formattedInventoryItems = inventoryItems.map((item: any) => ({
                    inventory_item_id: item.id.toString(),
                    brand_id: connection.brand_id,
                    cost: item.cost ? parseFloat(item.cost) : null,
                    country_code_of_origin: item.country_code_of_origin,
                    harmonized_system_code: item.harmonized_system_code,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    synced_at: new Date().toISOString(),
                    requires_shipping: item.requires_shipping,
                    tracked: item.tracked,
                    province_code_of_origin: item.province_code_of_origin,
                    country_harmonized_system_codes: item.country_harmonized_system_codes
                  }))

                  await supabaseAdmin
                    .from('shopify_inventory_items')
                    .upsert(formattedInventoryItems, { onConflict: 'inventory_item_id', ignoreDuplicates: true })
                }
              }
              
              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, 300))
            } catch (error) {
              console.error('Error syncing inventory items batch:', error)
              // Continue with next batch even if one fails
            }
          }
        }

        totalProducts += products.length
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error('Error during products sync:', error)
        throw error
      }
    } while (nextProductsCursor)

    console.log(`Products sync completed. Total: ${totalProducts}`)
    console.log(`Inventory items cost data synced for product variants`)

    // 3. SYNC CUSTOMERS
    console.log('Starting customers sync...')
    let nextCustomersCursor = null
    do {
      try {
        let url = `https://${connection.shop}/admin/api/2023-04/customers.json?limit=250&fields=id,email,first_name,last_name,phone,addresses,orders_count,total_spent,currency,created_at,updated_at,accepts_marketing,state,tags,note,verified_email,last_order_id,last_order_name`
        if (nextCustomersCursor) {
          url += `&page_info=${nextCustomersCursor}`
        }

        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': connection.access_token,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Customers API error: ${response.statusText}`)
        }

        const linkHeader = response.headers.get('Link')
        nextCustomersCursor = null
        if (linkHeader) {
          const match = linkHeader.match(/<[^>]*page_info=([^>&"]*)[^>]*>; rel="next"/)
          if (match) {
            nextCustomersCursor = match[1]
          }
        }

        const data = await response.json()
        const customers = data.customers

        if (!customers?.length) break

        // Format customers for database
        const formattedCustomers = customers.map((customer: any) => ({
          customer_id: customer.id.toString(),
          connection_id: connectionId,
          email: customer.email,
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
          addresses: customer.addresses,
          orders_count: customer.orders_count || 0,
          total_spent: parseFloat(customer.total_spent || 0),
          currency: customer.currency,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
          accepts_marketing: customer.accepts_marketing,
          state: customer.state,
          tags: customer.tags,
          note: customer.note,
          verified_email: customer.verified_email,
          last_order_id: customer.last_order_id,
          last_order_name: customer.last_order_name
        }))

        await supabaseAdmin
          .from('shopify_customers')
          .upsert(formattedCustomers, { onConflict: 'customer_id,connection_id', ignoreDuplicates: true })

        totalCustomers += customers.length
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error('Error during customers sync:', error)
        throw error
      }
    } while (nextCustomersCursor)

    console.log(`Customers sync completed. Total: ${totalCustomers}`)

    // 4. SYNC DISCOUNTS
    console.log('Starting discounts sync...')
    try {
      const response = await fetch(`https://${connection.shop}/admin/api/2023-04/discount_codes.json`, {
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const discounts = data.discount_codes

        if (discounts?.length) {
          const formattedDiscounts = discounts.map((discount: any) => ({
            id: discount.id.toString(),
            connection_id: connectionId,
            code: discount.code,
            amount: parseFloat(discount.amount || 0),
            type: discount.type,
            usage_count: discount.usage_count || 0,
            usage_limit: discount.usage_limit,
            created_at: discount.created_at,
            updated_at: discount.updated_at,
            starts_at: discount.starts_at,
            ends_at: discount.ends_at
          }))

          await supabaseAdmin
            .from('shopify_discounts_enhanced')
            .upsert(formattedDiscounts, { onConflict: 'id', ignoreDuplicates: true })

          totalDiscounts += discounts.length
        }
      }
    } catch (error) {
      console.error('Error during discounts sync:', error)
      // Don't throw - discounts may not be available
    }

    console.log(`Discounts sync completed. Total: ${totalDiscounts}`)

    // 5. SYNC DRAFT ORDERS (for cart abandonment insights)
    console.log('Starting draft orders sync...')
    try {
      const response = await fetch(`https://${connection.shop}/admin/api/2023-04/draft_orders.json?limit=250&fields=id,created_at,updated_at,invoice_sent_at,invoice_url,line_items,total_price,customer,status`, {
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const draftOrders = data.draft_orders

        if (draftOrders?.length) {
          const formattedDraftOrders = draftOrders.map((draft: any) => ({
            id: draft.id.toString(),
            connection_id: connectionId,
            created_at: draft.created_at,
            updated_at: draft.updated_at,
            invoice_sent_at: draft.invoice_sent_at,
            invoice_url: draft.invoice_url,
            line_items: draft.line_items,
            total_price: parseFloat(draft.total_price || 0),
            customer_id: draft.customer?.id?.toString(),
            customer_email: draft.customer?.email,
            status: draft.status
          }))

          await supabaseAdmin
            .from('shopify_draft_orders_enhanced')
            .upsert(formattedDraftOrders, { onConflict: 'id', ignoreDuplicates: true })

          totalDraftOrders += draftOrders.length
        }
      }
    } catch (error) {
      console.error('Error during draft orders sync:', error)
      // Don't throw - draft orders may not be available
    }

    console.log(`Draft orders sync completed. Total: ${totalDraftOrders}`)

    // Update sync status to completed
    console.log('Sync completed, updating status')
    await supabaseAdmin
      .from('platform_connections')
      .update({ 
        sync_status: 'completed',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    console.log('Comprehensive sync process completed successfully')
    return NextResponse.json({ 
      success: true, 
      totalOrders,
      totalProducts,
      totalCustomers,
      totalDiscounts,
      totalDraftOrders
    })

  } catch (error) {
    console.error('Sync error:', error)
    
    // Update sync status to failed
    if (request.body) {
      try {
        const body = await request.json()
        if (body.connectionId) {
          console.log('Updating sync status to failed')
          await supabaseAdmin
            .from('platform_connections')
            .update({ sync_status: 'failed' })
            .eq('id', body.connectionId)
        }
      } catch (parseError) {
        console.error('Error parsing request body:', parseError)
      }
    }

    return NextResponse.json({ 
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 