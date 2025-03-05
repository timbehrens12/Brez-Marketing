import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { InventorySummary, ShopifyInventoryItem } from '@/types/shopify-inventory'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const brandId = searchParams.get('brandId')
    
    console.log(`Inventory API called with brandId: ${brandId}`)
    
    if (!brandId) {
      console.error('Missing brandId parameter')
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    // Get connection for this brand
    console.log(`Fetching Shopify connection for brandId: ${brandId}`)
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .single()

    if (connectionError) {
      console.error('Error fetching connection:', connectionError)
      return NextResponse.json({ 
        error: 'Connection not found', 
        details: connectionError.message 
      }, { status: 404 })
    }

    console.log(`Found connection with id: ${connection.id}`)

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