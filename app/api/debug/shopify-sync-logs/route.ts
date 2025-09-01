import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

/**
 * DEBUG API: Get comprehensive Shopify sync logs and status
 * This endpoint provides detailed information about sync operations
 */
export async function GET(request: NextRequest) {
  const debugId = `debug_${Date.now()}`
  
  console.log(`🔍 [DEBUG-${debugId}] ===== SHOPIFY SYNC DEBUG REQUESTED =====`)
  
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    console.log(`🔍 [DEBUG-${debugId}] Brand ID: ${brandId || 'ALL'}`)
    console.log(`🔍 [DEBUG-${debugId}] User ID: ${userId}`)

    const supabase = createClient()

    // Get platform connections
    console.log(`💾 [DEBUG-${debugId}] Fetching platform connections...`)
    const connectionsQuery = supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'shopify')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (brandId) {
      connectionsQuery.eq('brand_id', brandId)
    }

    const { data: connections, error: connectionsError } = await connectionsQuery

    if (connectionsError) {
      console.error(`❌ [DEBUG-${debugId}] Error fetching connections:`, connectionsError)
    } else {
      console.log(`✅ [DEBUG-${debugId}] Found ${connections?.length || 0} Shopify connections`)
    }

    // Get ETL jobs
    console.log(`💾 [DEBUG-${debugId}] Fetching ETL jobs...`)
    const etlQuery = supabase
      .from('etl_job')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (brandId) {
      etlQuery.eq('brand_id', brandId)
    }

    const { data: etlJobs, error: etlError } = await etlQuery

    if (etlError) {
      console.error(`❌ [DEBUG-${debugId}] Error fetching ETL jobs:`, etlError)
    } else {
      console.log(`✅ [DEBUG-${debugId}] Found ${etlJobs?.length || 0} ETL jobs`)
    }

    // Get recent shopify_orders
    console.log(`💾 [DEBUG-${debugId}] Fetching recent orders...`)
    const ordersQuery = supabase
      .from('shopify_orders')
      .select('id, order_id, brand_id, name, total_price, created_at, synced_at')
      .order('synced_at', { ascending: false })
      .limit(10)

    if (brandId) {
      ordersQuery.eq('brand_id', brandId)
    }

    const { data: recentOrders, error: ordersError } = await ordersQuery

    if (ordersError) {
      console.error(`❌ [DEBUG-${debugId}] Error fetching orders:`, ordersError)
    } else {
      console.log(`✅ [DEBUG-${debugId}] Found ${recentOrders?.length || 0} recent orders`)
    }

    // Get recent shopify_customers
    console.log(`💾 [DEBUG-${debugId}] Fetching recent customers...`)
    const customersQuery = supabase
      .from('shopify_customers')
      .select('id, customer_id, brand_id, email, first_name, last_name, created_at, synced_at')
      .order('synced_at', { ascending: false })
      .limit(10)

    if (brandId) {
      customersQuery.eq('brand_id', brandId)
    }

    const { data: recentCustomers, error: customersError } = await customersQuery

    if (customersError) {
      console.error(`❌ [DEBUG-${debugId}] Error fetching customers:`, customersError)
    } else {
      console.log(`✅ [DEBUG-${debugId}] Found ${recentCustomers?.length || 0} recent customers`)
    }

    // Get recent shopify_products
    console.log(`💾 [DEBUG-${debugId}] Fetching recent products...`)
    const productsQuery = supabase
      .from('shopify_products')
      .select('id, product_id, brand_id, title, vendor, created_at, synced_at')
      .order('synced_at', { ascending: false })
      .limit(10)

    if (brandId) {
      productsQuery.eq('brand_id', brandId)
    }

    const { data: recentProducts, error: productsError } = await productsQuery

    if (productsError) {
      console.error(`❌ [DEBUG-${debugId}] Error fetching products:`, productsError)
    } else {
      console.log(`✅ [DEBUG-${debugId}] Found ${recentProducts?.length || 0} recent products`)
    }

    // Compile debug report
    const debugReport = {
      debug_id: debugId,
      timestamp: new Date().toISOString(),
      brand_id: brandId,
      user_id: userId,
      
      // Connection status
      connections: connections?.map(conn => ({
        id: conn.id,
        brand_id: conn.brand_id,
        shop: conn.shop,
        status: conn.status,
        sync_status: conn.sync_status,
        created_at: conn.created_at,
        updated_at: conn.updated_at,
        last_synced_at: conn.last_synced_at,
        metadata: conn.metadata
      })) || [],
      
      // ETL job status
      etl_jobs: etlJobs?.map(job => ({
        id: job.id,
        brand_id: job.brand_id,
        entity: job.entity,
        job_type: job.job_type,
        status: job.status,
        progress_pct: job.progress_pct,
        rows_written: job.rows_written,
        total_rows: job.total_rows,
        shopify_bulk_id: job.shopify_bulk_id,
        error_message: job.error_message,
        started_at: job.started_at,
        completed_at: job.completed_at,
        updated_at: job.updated_at
      })) || [],
      
      // Recent data samples
      recent_data: {
        orders: recentOrders?.map(order => ({
          id: order.id,
          order_id: order.order_id,
          brand_id: order.brand_id,
          name: order.name,
          total_price: order.total_price,
          created_at: order.created_at,
          synced_at: order.synced_at
        })) || [],
        
        customers: recentCustomers?.map(customer => ({
          id: customer.id,
          customer_id: customer.customer_id,
          brand_id: customer.brand_id,
          email: customer.email,
          name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
          created_at: customer.created_at,
          synced_at: customer.synced_at
        })) || [],
        
        products: recentProducts?.map(product => ({
          id: product.id,
          product_id: product.product_id,
          brand_id: product.brand_id,
          title: product.title,
          vendor: product.vendor,
          created_at: product.created_at,
          synced_at: product.synced_at
        })) || []
      },
      
      // Summary stats
      summary: {
        total_connections: connections?.length || 0,
        active_connections: connections?.filter(c => c.status === 'active').length || 0,
        syncing_connections: connections?.filter(c => c.sync_status === 'syncing').length || 0,
        total_etl_jobs: etlJobs?.length || 0,
        running_etl_jobs: etlJobs?.filter(j => j.status === 'running').length || 0,
        completed_etl_jobs: etlJobs?.filter(j => j.status === 'completed').length || 0,
        failed_etl_jobs: etlJobs?.filter(j => j.status === 'failed').length || 0,
        recent_orders_count: recentOrders?.length || 0,
        recent_customers_count: recentCustomers?.length || 0,
        recent_products_count: recentProducts?.length || 0
      }
    }

    console.log(`🎉 [DEBUG-${debugId}] Debug report compiled successfully`)
    console.log(`📊 [DEBUG-${debugId}] Summary:`, debugReport.summary)

    return NextResponse.json(debugReport)

  } catch (error) {
    console.error(`❌ [DEBUG-${debugId}] Error generating debug report:`, error)
    return NextResponse.json({
      error: 'Failed to generate debug report',
      debug_id: debugId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST: Trigger manual sync with full logging
 */
export async function POST(request: NextRequest) {
  const manualSyncId = `manual_${Date.now()}`
  
  console.log(`🚀 [MANUAL-SYNC-${manualSyncId}] ===== MANUAL SYNC TRIGGERED =====`)
  
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, connectionId, force = false } = await request.json()
    
    console.log(`📋 [MANUAL-SYNC-${manualSyncId}] Parameters:`)
    console.log(`📋 [MANUAL-SYNC-${manualSyncId}] - Brand ID: ${brandId || 'MISSING'}`)
    console.log(`📋 [MANUAL-SYNC-${manualSyncId}] - Connection ID: ${connectionId || 'MISSING'}`)
    console.log(`📋 [MANUAL-SYNC-${manualSyncId}] - Force: ${force}`)
    console.log(`📋 [MANUAL-SYNC-${manualSyncId}] - User ID: ${userId}`)

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get connection details
    console.log(`🔍 [MANUAL-SYNC-${manualSyncId}] Looking up connection...`)
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      console.error(`❌ [MANUAL-SYNC-${manualSyncId}] Connection not found:`, connectionError)
      return NextResponse.json({ error: 'Active Shopify connection not found' }, { status: 404 })
    }

    console.log(`✅ [MANUAL-SYNC-${manualSyncId}] Connection found:`)
    console.log(`📋 [MANUAL-SYNC-${manualSyncId}] - ID: ${connection.id}`)
    console.log(`📋 [MANUAL-SYNC-${manualSyncId}] - Shop: ${connection.shop}`)
    console.log(`📋 [MANUAL-SYNC-${manualSyncId}] - Current Sync Status: ${connection.sync_status}`)

    // Trigger sync via the connected API
    const connectedUrl = `/api/shopify/connected/${brandId}`
    console.log(`📡 [MANUAL-SYNC-${manualSyncId}] Triggering sync via: ${connectedUrl}`)
    
    const syncResponse = await fetch(new URL(connectedUrl, request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-call': 'true'
      },
      body: JSON.stringify({
        shop: connection.shop,
        accessToken: connection.access_token,
        connectionId: connection.id,
        manual_sync_id: manualSyncId
      })
    })

    console.log(`📡 [MANUAL-SYNC-${manualSyncId}] Sync response status: ${syncResponse.status}`)

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text()
      console.error(`❌ [MANUAL-SYNC-${manualSyncId}] Sync failed: ${errorText}`)
      return NextResponse.json({
        error: 'Failed to trigger sync',
        details: errorText
      }, { status: 500 })
    }

    const syncResult = await syncResponse.json()
    console.log(`✅ [MANUAL-SYNC-${manualSyncId}] Sync triggered successfully:`, syncResult)

    return NextResponse.json({
      success: true,
      message: 'Manual sync triggered successfully',
      manual_sync_id: manualSyncId,
      sync_result: syncResult,
      connection: {
        id: connection.id,
        shop: connection.shop,
        status: connection.status,
        sync_status: connection.sync_status
      }
    })

  } catch (error) {
    console.error(`❌ [MANUAL-SYNC-${manualSyncId}] Error:`, error)
    return NextResponse.json({
      error: 'Manual sync failed',
      manual_sync_id: manualSyncId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
