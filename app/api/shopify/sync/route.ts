import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

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
    const { data: connection, error: connectionError } = await supabase
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
    await supabase
      .from('platform_connections')
      .update({ sync_status: 'in_progress' })
      .eq('id', connectionId)

    // Start sync process for orders
    console.log('Starting sync process for orders')
    let totalOrders = 0
    let nextCursor = null

    do {
      try {
        // Build the URL with cursor-based pagination
        // We're fetching orders with their line items to calculate metrics like total sales, order count, etc.
        let url = `https://${connection.shop}/admin/api/2024-01/orders.json?limit=250&status=any&fields=id,created_at,total_price,customer,line_items`
        if (nextCursor) {
          url += `&page_info=${nextCursor}`
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
        nextCursor = null
        if (linkHeader) {
          const match = linkHeader.match(/<[^>]*page_info=([^>&"]*)[^>]*>; rel="next"/)
          if (match) {
            nextCursor = match[1]
          }
        }

        const data = await response.json()
        const orders = data.orders

        if (!orders?.length) {
          console.log('No orders found in this batch')
          break
        }

        console.log(`Found ${orders.length} orders in this batch`)

        // Format orders for database
        const formattedOrders = orders.map((order: any) => ({
          id: order.id.toString(),
          connection_id: connectionId,
          created_at: order.created_at,
          total_price: order.total_price,
          customer_id: order.customer?.id?.toString(),
          line_items: order.line_items
        }))

        // Batch insert orders
        console.log(`Inserting ${formattedOrders.length} orders into database`)
        const { error: insertError } = await supabase
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
        console.error('Error during sync:', error)
        throw error
      }
    } while (nextCursor)

    // Check if shopify_products table exists, create it if not
    console.log('Checking if shopify_products table exists')
    try {
      // Try to query the table to see if it exists
      const { error } = await supabase
        .from('shopify_products')
        .select('id')
        .limit(1)
      
      // If there's an error, the table might not exist
      if (error && error.message.includes('relation "shopify_products" does not exist')) {
        console.log('Creating shopify_products table')
        
        // Create the table using SQL
        const { error: createError } = await supabase.rpc('create_shopify_products_table')
        
        if (createError) {
          console.error('Error creating shopify_products table:', createError)
          // Continue with sync process even if table creation fails
        } else {
          console.log('shopify_products table created successfully')
        }
      } else {
        console.log('shopify_products table already exists')
      }
    } catch (error) {
      console.error('Error checking/creating shopify_products table:', error)
      // Continue with sync process even if table check fails
    }

    // Fetch products to get additional data
    console.log('Starting sync process for products')
    let totalProducts = 0
    nextCursor = null

    do {
      try {
        // Build the URL with cursor-based pagination for products
        // We're fetching products to get inventory levels and other product data
        let url = `https://${connection.shop}/admin/api/2024-01/products.json?limit=250&fields=id,title,vendor,product_type,created_at,updated_at,variants,images`
        if (nextCursor) {
          url += `&page_info=${nextCursor}`
        }

        console.log('Fetching products from Shopify:', { url: url.substring(0, 100) + '...' })
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
        nextCursor = null
        if (linkHeader) {
          const match = linkHeader.match(/<[^>]*page_info=([^>&"]*)[^>]*>; rel="next"/)
          if (match) {
            nextCursor = match[1]
          }
        }

        const data = await response.json()
        const products = data.products

        if (!products?.length) {
          console.log('No products found in this batch')
          break
        }

        console.log(`Found ${products.length} products in this batch`)

        // Format products for database
        const formattedProducts = products.map((product: any) => ({
          id: product.id.toString(),
          connection_id: connectionId,
          title: product.title,
          vendor: product.vendor,
          product_type: product.product_type,
          created_at: product.created_at,
          updated_at: product.updated_at,
          variants: product.variants,
          images: product.images
        }))

        // Batch insert products
        console.log(`Inserting ${formattedProducts.length} products into database`)
        const { error: insertError } = await supabase
          .from('shopify_products')
          .upsert(formattedProducts, {
            onConflict: 'id',
            ignoreDuplicates: true
          })

        if (insertError) {
          console.error('Error inserting products:', insertError)
          throw insertError
        }

        totalProducts += products.length
        console.log(`Total products processed so far: ${totalProducts}`)

        // Respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error('Error during product sync:', error)
        // Continue with other operations even if product sync fails
        console.log('Continuing with other operations...')
        break
      }
    } while (nextCursor)

    // Update sync status to completed
    console.log('Sync completed, updating status')
    await supabase
      .from('platform_connections')
      .update({ 
        sync_status: 'completed',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    console.log('Sync process completed successfully')
    return NextResponse.json({ 
      success: true, 
      totalOrders,
      totalProducts
    })

  } catch (error) {
    console.error('Sync error:', error)
    
    // Update sync status to failed
    if (request.body) {
      try {
        const body = await request.json()
        if (body.connectionId) {
          console.log('Updating sync status to failed')
          await supabase
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