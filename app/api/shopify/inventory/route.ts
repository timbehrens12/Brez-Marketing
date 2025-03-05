import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { InventorySummary, ShopifyInventoryItem } from '@/types/shopify-inventory'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const brandId = searchParams.get('brandId')
    const refresh = searchParams.get('refresh') === 'true'
    
    console.log(`Inventory API called with brandId: ${brandId}, refresh: ${refresh}`)
    
    if (!brandId) {
      console.error('Missing brandId parameter')
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    // Get connection for this brand
    console.log(`Fetching Shopify connection for brandId: ${brandId}`)
    const { data: connections, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id, access_token, shop')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .order('created_at', { ascending: false }) // Get the most recent connection
      .limit(1) // Just get the first one instead of using .single()

    if (connectionError) {
      console.error('Error fetching connection:', connectionError)
      return NextResponse.json({ 
        error: 'Error fetching connection', 
        details: connectionError.message 
      }, { status: 500 })
    }

    // Check if any connections were found
    if (!connections || connections.length === 0) {
      console.error('No Shopify connection found for this brand')
      return NextResponse.json({ 
        error: 'No Shopify connection found', 
        details: 'Please connect your Shopify store first' 
      }, { status: 404 })
    }

    const connection = connections[0]
    console.log(`Found connection with id: ${connection.id}`)

    // If refresh is true, trigger a sync before fetching data
    if (refresh && connection.access_token && connection.shop) {
      console.log('Refresh parameter is true, triggering inventory sync')
      try {
        // Call the inventory sync endpoint
        const syncResponse = await fetch(new URL('/api/shopify/inventory/sync', request.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ connectionId: connection.id })
        })
        
        if (!syncResponse.ok) {
          console.error('Error syncing inventory:', await syncResponse.text())
          // Continue anyway to return the current data
        } else {
          console.log('Inventory sync initiated successfully')
          // Wait a moment for the sync to complete
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (syncError) {
        console.error('Error triggering inventory sync:', syncError)
        // Continue anyway to return the current data
      }
    }

    // Fetch inventory data
    console.log(`Fetching inventory data for connection: ${connection.id}`)
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('shopify_inventory')
      .select('*')
      .eq('connection_id', connection.id.toString())
      .order('product_title', { ascending: true })

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError)
      return NextResponse.json({ 
        error: 'Failed to fetch inventory data', 
        details: inventoryError.message 
      }, { status: 500 })
    }

    console.log(`Found ${inventoryItems?.length || 0} inventory items`)

    // If no inventory items found, return empty summary
    if (!inventoryItems || inventoryItems.length === 0) {
      console.log('No inventory items found, returning empty summary')
      return NextResponse.json({
        items: [],
        summary: {
          totalProducts: 0,
          totalInventory: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          averageInventoryLevel: 0
        }
      })
    }

    // Calculate inventory summary
    console.log('Calculating inventory summary')
    const summary: InventorySummary = {
      totalProducts: new Set(inventoryItems.map((item: ShopifyInventoryItem) => item.product_id)).size,
      totalInventory: inventoryItems.reduce((sum: number, item: ShopifyInventoryItem) => sum + item.inventory_quantity, 0),
      lowStockItems: inventoryItems.filter((item: ShopifyInventoryItem) => item.inventory_quantity > 0 && item.inventory_quantity <= 5).length,
      outOfStockItems: inventoryItems.filter((item: ShopifyInventoryItem) => item.inventory_quantity <= 0).length,
      averageInventoryLevel: inventoryItems.length > 0 
        ? inventoryItems.reduce((sum: number, item: ShopifyInventoryItem) => sum + item.inventory_quantity, 0) / inventoryItems.length 
        : 0
    }

    console.log('Inventory summary calculated:', summary)

    return NextResponse.json({
      items: inventoryItems,
      summary
    })
  } catch (error) {
    console.error('Error fetching inventory data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch inventory data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 