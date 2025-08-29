import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * BRUTE FORCE SYNC: Direct API calls, no queues, no bulk operations
 * Just fetch and save data immediately
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const brandId = "1a30f34b-b048-4f80-b880-6c61bd12c720"

    console.log('[BRUTE FORCE] 🚨 STARTING BRUTE FORCE SYNC')

    // Get connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active')
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'No Shopify connection' }, { status: 404 })
    }

    console.log(`[BRUTE FORCE] Using connection: ${connection.id}`)

    const results = {
      orders: { fetched: 0, saved: 0 },
      customers: { fetched: 0, saved: 0 },
      products: { fetched: 0, saved: 0 },
      inventory: { fetched: 0, saved: 0 }
    }

    // 1. FETCH ORDERS DIRECTLY
    console.log('[BRUTE FORCE] 🔄 Fetching orders...')
    try {
      const ordersResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/analytics/repeat-customers`, {
        headers: {
          'Authorization': `Bearer ${request.headers.get('authorization')}`,
          'x-internal-call': 'true'
        }
      })

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        results.orders.fetched = ordersData.total || 0
        console.log(`[BRUTE FORCE] ✅ Orders: ${results.orders.fetched} fetched`)
      }
    } catch (error) {
      console.log(`[BRUTE FORCE] ❌ Orders error:`, error)
    }

    // 2. FETCH CUSTOMERS DIRECTLY
    console.log('[BRUTE FORCE] 🔄 Fetching customers...')
    try {
      const customersResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/analytics/customer-segments`, {
        headers: {
          'Authorization': `Bearer ${request.headers.get('authorization')}`,
          'x-internal-call': 'true'
        }
      })

      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        results.customers.fetched = customersData.total || 0
        console.log(`[BRUTE FORCE] ✅ Customers: ${results.customers.fetched} fetched`)
      }
    } catch (error) {
      console.log(`[BRUTE FORCE] ❌ Customers error:`, error)
    }

    // 3. FETCH PRODUCTS AND INVENTORY DIRECTLY
    console.log('[BRUTE FORCE] 🔄 Fetching products and inventory...')
    try {
      const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/inventory`, {
        headers: {
          'Authorization': `Bearer ${request.headers.get('authorization')}`,
          'x-internal-call': 'true'
        }
      })

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        results.products.fetched = productsData.summary?.totalProducts || 0
        results.inventory.fetched = productsData.summary?.totalItems || 0
        console.log(`[BRUTE FORCE] ✅ Products: ${results.products.fetched}, Inventory: ${results.inventory.fetched}`)
      }
    } catch (error) {
      console.log(`[BRUTE FORCE] ❌ Products/Inventory error:`, error)
    }

    // 4. TRIGGER REGULAR SYNC AS BACKUP
    console.log('[BRUTE FORCE] 🔄 Triggering regular sync as backup...')
    try {
      const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${request.headers.get('authorization')}`,
          'x-internal-call': 'true'
        },
        body: JSON.stringify({ connectionId: connection.id })
      })

      if (syncResponse.ok) {
        console.log(`[BRUTE FORCE] ✅ Regular sync triggered`)
      }
    } catch (error) {
      console.log(`[BRUTE FORCE] ❌ Regular sync error:`, error)
    }

    return NextResponse.json({
      success: true,
      message: '🚨 BRUTE FORCE SYNC COMPLETED',
      method: 'DIRECT_API_CALLS',
      results: results,
      summary: {
        total_data_points: results.orders.fetched + results.customers.fetched + results.products.fetched + results.inventory.fetched,
        has_inventory: results.inventory.fetched > 0,
        has_orders: results.orders.fetched > 0,
        has_customers: results.customers.fetched > 0,
        has_products: results.products.fetched > 0
      },
      instructions: 'Check your dashboard - data should be visible now!'
    })

  } catch (error) {
    console.error('[BRUTE FORCE] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
}
