import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { connectionId } = body

    console.log('Shopify inventory sync route hit:', { connectionId })

    if (!connectionId) {
      console.error('Missing connectionId')
      return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 })
    }

    // Get connection details
    console.log('Fetching connection details')
    const supabase = createClient()
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('status', 'active')
      .maybeSingle()

    if (connectionError || !connection) {
      console.error('Error fetching connection:', connectionError)
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    console.log('Found connection:', {
      id: connection.id,
      platform_type: connection.platform_type,
      status: connection.status,
      shop: connection.shop,
      brand_id: connection.brand_id
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

    // Start sync process
    console.log('Starting inventory sync process')
    let totalProducts = 0
    let nextCursor = null

    do {
      try {
        // Build the URL with cursor-based pagination
        let url = `https://${connection.shop}/admin/api/2023-04/products.json?limit=250&fields=id,title,variants`
        if (nextCursor) {
          url += `&page_info=${nextCursor}`
        }

        // Mask token for logging
        const maskedToken = connection.access_token ? `${connection.access_token.substring(0, 4)}...${connection.access_token.substring(connection.access_token.length - 4)}` : 'NONE';
        console.log(`[SYNC] Attempting to fetch Shopify products. Shop: ${connection.shop}, Token (Masked): ${maskedToken}, URL: ${url.substring(0, 100)}...`);
        
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': connection.access_token,
            'Content-Type': 'application/json'
          }
        })
        
        // Log response status immediately
        console.log(`[SYNC] Shopify API response status: ${response.status}`);

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

        // Format inventory items for database
        const inventoryItems = []
        
        for (const product of products) {
          console.log(`Processing product: ${product.id} - ${product.title}`)
          if (product.variants && product.variants.length > 0) {
            for (const variant of product.variants) {
              console.log(`  Variant: ${variant.id} - ${variant.title}, Inventory: ${variant.inventory_quantity}`)
              inventoryItems.push({
                brand_id: connection.brand_id,
                connection_id: connectionId,
                product_id: product.id.toString(),
                variant_id: variant.id.toString(),
                inventory_item_id: variant.inventory_item_id?.toString() || '',
                sku: variant.sku || '',
                product_title: product.title,
                variant_title: variant.title,
                inventory_quantity: variant.inventory_quantity || 0,
                last_updated: new Date().toISOString()
              })
            }
          } else {
            console.log(`  No variants found for product: ${product.id}`)
          }
        }

        // Batch insert inventory items
        if (inventoryItems.length > 0) {
          console.log(`Inserting ${inventoryItems.length} inventory items into database`)
          
          // First, let's try to clear existing inventory for this connection to avoid conflicts
          const { error: deleteError } = await supabase
            .from('shopify_inventory')
            .delete()
            .eq('connection_id', connectionId.toString())
          
          if (deleteError) {
            console.error('Error deleting existing inventory items:', deleteError)
            // Continue anyway, as this is not a critical error
          }
          
          // Ensure all inventory items have string connection_id
          const processedItems = inventoryItems.map(item => ({
            ...item,
            connection_id: item.connection_id.toString(),
            brand_id: item.brand_id.toString()
          }))
          
          // Now insert the new inventory items
          const { error: insertError } = await supabase
            .from('shopify_inventory')
            .insert(processedItems)

          if (insertError) {
            console.error('Error inserting inventory items:', insertError)
            throw insertError
          } else {
            console.log(`Successfully inserted ${inventoryItems.length} inventory items`)
          }
        } else {
          console.log('No inventory items to insert')
        }

        totalProducts += products.length
        console.log(`Total products processed so far: ${totalProducts}`)

        // Respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error('Error during inventory sync:', error)
        // Log the specific error that occurred during the fetch/processing loop
        console.error(`[SYNC] Error occurred during fetch loop: ${error instanceof Error ? error.message : 'Unknown error'}`); 
        throw error
      }
    } while (nextCursor)

    // Update sync status to completed
    console.log('Inventory sync completed, updating status')
    await supabase
      .from('platform_connections')
      .update({ 
        sync_status: 'completed',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    console.log('Inventory sync process completed successfully')
    return NextResponse.json({ success: true, totalProducts })

  } catch (error) {
    console.error('Inventory sync error:', error)

    // Try to update sync status to failed if we have a connectionId
    try {
      const body = await request.json().catch(() => ({}))
      if (body.connectionId) {
        console.log('Updating sync status to failed')
        const supabase = createClient()
        await supabase
          .from('platform_connections')
          .update({ sync_status: 'failed' })
          .eq('id', body.connectionId)
      }
    } catch (updateError) {
      console.error('Error updating sync status:', updateError)
    }

    return NextResponse.json({
      error: 'Inventory sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 