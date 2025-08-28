import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Comprehensive diagnostic for Shopify bulk operations
 * GET /api/test/bulk-operations-diagnostic?brandId=1a30f34b-b048-4f80-b880-6c61bd12c720
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'brandId parameter required' }, { status: 400 })
    }

    const supabase = createClient()
    const diagnostics = {
      timestamp: new Date().toISOString(),
      sections: [] as any[]
    }

    // Section 1: Connection Status
    console.log('[Diagnostics] Checking connection status...')
    const { data: connections, error: connError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .order('created_at', { ascending: false })

    diagnostics.sections.push({
      section: 'connection_status',
      connections_found: connections?.length || 0,
      active_connections: connections?.filter(c => c.status === 'active').length || 0,
      connections: connections?.map(c => ({
        id: c.id,
        status: c.status,
        sync_status: c.sync_status,
        has_token: !!c.access_token,
        created_at: c.created_at,
        updated_at: c.updated_at
      }))
    })

    // Section 2: ETL Jobs Status
    console.log('[Diagnostics] Checking ETL jobs...')
    const { data: etlJobs, error: etlError } = await supabase
      .from('etl_job')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(20)

    const recentJobs = etlJobs?.filter(j =>
      new Date(j.created_at) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    ) || []

    diagnostics.sections.push({
      section: 'etl_jobs',
      total_jobs: etlJobs?.length || 0,
      recent_jobs: recentJobs.length,
      jobs_by_status: {
        running: recentJobs.filter(j => j.status === 'running').length,
        completed: recentJobs.filter(j => j.status === 'completed').length,
        failed: recentJobs.filter(j => j.status === 'failed').length,
        queued: recentJobs.filter(j => j.status === 'queued').length
      },
      jobs_by_type: {
        recent_sync: recentJobs.filter(j => j.job_type === 'recent_sync').length,
        bulk_orders: recentJobs.filter(j => j.job_type === 'bulk_orders').length,
        bulk_customers: recentJobs.filter(j => j.job_type === 'bulk_customers').length,
        bulk_products: recentJobs.filter(j => j.job_type === 'bulk_products').length
      },
      bulk_operations_with_ids: recentJobs
        .filter(j => j.shopify_bulk_id)
        .map(j => ({
          type: j.job_type,
          bulk_id: j.shopify_bulk_id,
          status: j.status,
          rows_written: j.rows_written
        }))
    })

    // Section 3: Production Data Check
    console.log('[Diagnostics] Checking production data...')
    const { data: ordersData, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('id, created_at')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: customersData, error: customersError } = await supabase
      .from('shopify_customers')
      .select('id, created_at')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: productsData, error: productsError } = await supabase
      .from('shopify_products')
      .select('id, created_at')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(5)

    diagnostics.sections.push({
      section: 'production_data',
      orders: {
        count: ordersData?.length || 0,
        latest: ordersData?.[0]?.created_at,
        error: ordersError?.message
      },
      customers: {
        count: customersData?.length || 0,
        latest: customersData?.[0]?.created_at,
        error: customersError?.message
      },
      products: {
        count: productsData?.length || 0,
        latest: productsData?.[0]?.created_at,
        error: productsError?.message
      }
    })

    // Section 4: Staging Data Check
    console.log('[Diagnostics] Checking staging data...')
    const { data: stagingOrders, error: stagingOrdersError } = await supabase
      .from('shopify_orders_staging')
      .select('id, created_at')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: stagingCustomers, error: stagingCustomersError } = await supabase
      .from('shopify_customers_staging')
      .select('id, created_at')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: stagingProducts, error: stagingProductsError } = await supabase
      .from('shopify_products_staging')
      .select('id, created_at')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(5)

    diagnostics.sections.push({
      section: 'staging_data',
      orders_staging: {
        count: stagingOrders?.length || 0,
        latest: stagingOrders?.[0]?.created_at,
        error: stagingOrdersError?.message
      },
      customers_staging: {
        count: stagingCustomers?.length || 0,
        latest: stagingCustomers?.[0]?.created_at,
        error: stagingCustomersError?.message
      },
      products_staging: {
        count: stagingProducts?.length || 0,
        latest: stagingProducts?.[0]?.created_at,
        error: stagingProductsError?.message
      }
    })

    // Section 5: Analysis and Recommendations
    const analysis = {
      has_active_connection: connections?.some(c => c.status === 'active') || false,
      has_running_jobs: recentJobs.some(j => j.status === 'running'),
      has_bulk_operations: recentJobs.some(j => j.shopify_bulk_id),
      has_production_data: (ordersData?.length || 0) + (customersData?.length || 0) + (productsData?.length || 0) > 0,
      has_staging_data: (stagingOrders?.length || 0) + (stagingCustomers?.length || 0) + (stagingProducts?.length || 0) > 0,
      completed_jobs: recentJobs.filter(j => j.status === 'completed').length,
      failed_jobs: recentJobs.filter(j => j.status === 'failed').length
    }

    diagnostics.sections.push({
      section: 'analysis',
      ...analysis,
      issues: [],
      recommendations: []
    })

    // Identify issues
    if (!analysis.has_active_connection) {
      diagnostics.sections[4].issues.push('❌ No active Shopify connection found')
      diagnostics.sections[4].recommendations.push('✅ Reconnect your Shopify store')
    }

    if (!analysis.has_running_jobs && !analysis.has_bulk_operations) {
      diagnostics.sections[4].issues.push('❌ No active bulk operations or running jobs')
      diagnostics.sections[4].recommendations.push('✅ Try reconnecting to restart the sync')
    }

    if (analysis.has_staging_data && !analysis.has_production_data) {
      diagnostics.sections[4].issues.push('⚠️ Data in staging but not in production')
      diagnostics.sections[4].recommendations.push('🔧 Check promoteToProduction functions')
    }

    if (analysis.failed_jobs > 0) {
      diagnostics.sections[4].issues.push(`❌ ${analysis.failed_jobs} jobs have failed`)
      diagnostics.sections[4].recommendations.push('🔍 Check server logs for failure details')
    }

    if (analysis.has_production_data && analysis.has_bulk_operations) {
      diagnostics.sections[4].issues.push('✅ System appears to be working correctly')
      diagnostics.sections[4].recommendations.push('📊 Monitor sync progress in status endpoint')
    }

    return NextResponse.json({
      success: true,
      message: '🔍 COMPREHENSIVE SHOPIFY BULK OPERATIONS DIAGNOSTIC',
      diagnostic_report: diagnostics,
      quick_status: {
        system_health: analysis.has_active_connection && (analysis.has_running_jobs || analysis.has_production_data) ? 'HEALTHY' : 'NEEDS_ATTENTION',
        data_flow: analysis.has_staging_data ? (analysis.has_production_data ? 'WORKING' : 'STALLED') : 'NO_DATA',
        sync_progress: analysis.has_bulk_operations ? 'ACTIVE' : 'IDLE',
        issues_count: diagnostics.sections[4].issues.filter(i => i.includes('❌') || i.includes('⚠️')).length
      },
      troubleshooting_steps: [
        '1. Check if bulk operations are completing (look for COMPLETED status)',
        '2. Verify staging data exists but production data is missing',
        '3. Check if promoteToProduction functions are working',
        '4. Monitor ETL job completion and row counts',
        '5. Look for any failed jobs or error messages'
      ]
    })

  } catch (error) {
    console.error('[Bulk Operations Diagnostic] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
