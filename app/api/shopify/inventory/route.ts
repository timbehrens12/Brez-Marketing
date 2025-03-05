import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { InventorySummary, ShopifyInventoryItem } from '@/types/shopify-inventory'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const brandId = searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    // Get connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .single()

    if (connectionError) {
      console.error('Error fetching connection:', connectionError)
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    // Fetch inventory data
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('shopify_inventory')
      .select('*')
      .eq('connection_id', connection.id)
      .order('product_title', { ascending: true })

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError)
      return NextResponse.json({ error: 'Failed to fetch inventory data' }, { status: 500 })
    }

    // Calculate inventory summary
    const summary: InventorySummary = {
      totalProducts: new Set(inventoryItems.map((item: ShopifyInventoryItem) => item.product_id)).size,
      totalInventory: inventoryItems.reduce((sum: number, item: ShopifyInventoryItem) => sum + item.inventory_quantity, 0),
      lowStockItems: inventoryItems.filter((item: ShopifyInventoryItem) => item.inventory_quantity > 0 && item.inventory_quantity <= 5).length,
      outOfStockItems: inventoryItems.filter((item: ShopifyInventoryItem) => item.inventory_quantity <= 0).length,
      averageInventoryLevel: inventoryItems.length > 0 
        ? inventoryItems.reduce((sum: number, item: ShopifyInventoryItem) => sum + item.inventory_quantity, 0) / inventoryItems.length 
        : 0
    }

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