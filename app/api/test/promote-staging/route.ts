import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Manually promote staging data to production
 * GET /api/test/promote-staging?brandId=1a30f34b-b048-4f80-b880-6c61bd12c720&entity=orders
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const entity = searchParams.get('entity') // 'orders', 'customers', 'products', or 'all'

    if (!brandId) {
      return NextResponse.json({ error: 'brandId parameter required' }, { status: 400 })
    }

    const supabase = createClient()
    const results = {
      timestamp: new Date().toISOString(),
      promotions: [] as any[]
    }

    const entities = entity === 'all' ? ['orders', 'customers', 'products'] : [entity]

    for (const ent of entities) {
      console.log(`[Promote Staging] Promoting ${ent} staging data for brand ${brandId}`)

      try {
        if (ent === 'orders') {
          // Check staging data first
          const { data: stagingOrders, error: stagingError } = await supabase
            .from('shopify_orders_staging')
            .select('id')
            .eq('brand_id', brandId)
            .limit(5)

          console.log(`[Promote Staging] Found ${stagingOrders?.length || 0} staging orders`)

          // Promote orders
          const { data: promoteResult, error: promoteError } = await supabase.rpc('promote_orders_to_production', {
            brand_id_param: brandId
          })

          // Promote line items
          const { data: lineItemsResult, error: lineItemsError } = await supabase.rpc('promote_line_items_to_production', {
            brand_id_param: brandId
          })

          results.promotions.push({
            entity: 'orders',
            staging_count: stagingOrders?.length || 0,
            orders_promoted: promoteResult,
            line_items_promoted: lineItemsResult,
            orders_error: promoteError?.message,
            line_items_error: lineItemsError?.message
          })

        } else if (ent === 'customers') {
          // Check staging data first
          const { data: stagingCustomers, error: stagingError } = await supabase
            .from('shopify_customers_staging')
            .select('id')
            .eq('brand_id', brandId)
            .limit(5)

          console.log(`[Promote Staging] Found ${stagingCustomers?.length || 0} staging customers`)

          // Promote customers
          const { data: promoteResult, error: promoteError } = await supabase.rpc('promote_customers_to_production', {
            brand_id_param: brandId
          })

          results.promotions.push({
            entity: 'customers',
            staging_count: stagingCustomers?.length || 0,
            customers_promoted: promoteResult,
            error: promoteError?.message
          })

        } else if (ent === 'products') {
          // Check staging data first
          const { data: stagingProducts, error: stagingError } = await supabase
            .from('shopify_products_staging')
            .select('id')
            .eq('brand_id', brandId)
            .limit(5)

          console.log(`[Promote Staging] Found ${stagingProducts?.length || 0} staging products`)

          // Promote products
          const { data: promoteResult, error: promoteError } = await supabase.rpc('promote_products_to_production', {
            brand_id_param: brandId
          })

          results.promotions.push({
            entity: 'products',
            staging_count: stagingProducts?.length || 0,
            products_promoted: promoteResult,
            error: promoteError?.message
          })
        }

      } catch (error) {
        console.error(`[Promote Staging] Error promoting ${ent}:`, error)
        results.promotions.push({
          entity: ent,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Check production data after promotion
    console.log('[Promote Staging] Checking production data after promotion...')

    const { data: productionOrders } = await supabase
      .from('shopify_orders')
      .select('id')
      .eq('brand_id', brandId)
      .limit(5)

    const { data: productionCustomers } = await supabase
      .from('shopify_customers')
      .select('id')
      .eq('brand_id', brandId)
      .limit(5)

    const { data: productionProducts } = await supabase
      .from('shopify_products')
      .select('id')
      .eq('brand_id', brandId)
      .limit(5)

    return NextResponse.json({
      success: true,
      message: '🔄 STAGING DATA PROMOTION TEST COMPLETED',
      promotion_results: results,
      production_data_after_promotion: {
        orders: productionOrders?.length || 0,
        customers: productionCustomers?.length || 0,
        products: productionProducts?.length || 0
      },
      summary: {
        entities_processed: results.promotions.length,
        successful_promotions: results.promotions.filter(p => !p.error && !p.orders_error && !p.line_items_error).length,
        failed_promotions: results.promotions.filter(p => p.error || p.orders_error || p.line_items_error).length
      },
      recommendations: [
        '✅ Check if production tables now have data',
        '✅ Verify the promotion functions are working',
        '✅ If still no data, the bulk operations may not be completing',
        '✅ Check server logs for any RPC function errors'
      ]
    })

  } catch (error) {
    console.error('[Promote Staging] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
