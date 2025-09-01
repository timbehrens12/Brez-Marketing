import { NextResponse } from 'next/server'
import { withSecureAuth } from '@/lib/security/auth-helpers'
import { createClient } from '@supabase/supabase-js'

// Admin client with service role for force operations
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function POST(request: Request) {
  return withSecureAuth(
    request as any,
    async ({ userId, supabase, request }) => {
      const { brandId, platformType } = await request.json()

      try {
        console.log('Force disconnecting platform:', { brandId, platformType, userId })
        
        // Get all connections for this brand/platform
        const { data: connections, error: connectionQueryError } = await supabase
          .from('platform_connections')
          .select('id')
          .eq('brand_id', brandId)
          .eq('platform_type', platformType)

        if (connectionQueryError) {
          console.error('Error finding connections:', connectionQueryError)
          return NextResponse.json(
            { error: 'Error querying connections' },
            { status: 500 }
          )
        }

        if (!connections || connections.length === 0) {
          console.log('No connections found for:', { brandId, platformType })
          return NextResponse.json({ success: true, message: 'No connections to disconnect' })
        }

        console.log(`Force deleting ${connections.length} connections and all related data`)

        // STEP 1: Clear all queue jobs for these connections FIRST
        console.log('🧹 Clearing orphaned queue jobs for these connections...')
        try {
          const connectionIds = connections.map(c => c.id)
          const cleanupResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/test/queue-cleanup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionIds })
          })
          
          if (cleanupResponse.ok) {
            const cleanupResult = await cleanupResponse.json()
            console.log('✅ Queue cleanup completed:', cleanupResult)
          } else {
            console.warn('⚠️ Queue cleanup failed, continuing with disconnect...')
          }
        } catch (cleanupError) {
          console.warn('⚠️ Queue cleanup error:', cleanupError)
        }

        // Use admin client for force operations to bypass RLS
        const adminSupabase = createAdminClient()

        // For Shopify, delete related data in parallel for speed
        if (platformType === 'shopify') {
          console.log(`Force deleting ALL Shopify data for brand ${brandId}`)
          
          try {
            // Get ALL connection IDs for this brand/platform (including historical ones)
            const { data: allConnections } = await adminSupabase
              .from('platform_connections')
              .select('id')
              .eq('brand_id', brandId)
              .eq('platform_type', platformType)
            
            const allConnectionIds = allConnections?.map(c => c.id) || []
            console.log(`🗑️ Found ${allConnectionIds.length} total connections for this brand:`, allConnectionIds)
            
            // Delete ALL tables with foreign key constraints to platform_connections
            const tablesToDelete = [
              'shopify_orders', 'shopify_customers', 'shopify_sales_by_region',
              'shopify_abandoned_checkouts', 'shopify_analytics_events', 'shopify_bulk_jobs',
              'shopify_clv_analytics', 'shopify_customer_segments', 'shopify_shipping_analytics',
              'shopify_repeat_customers', 'shopify_customer_journey', 'shopify_content_performance',
              'shopify_email_performance', 'shopify_search_analytics', 'shopify_cart_analytics',
              'shopify_customer_management', 'shopify_payment_settings', 'shopify_shipping_zones',
              'shopify_shop_configuration', 'shopify_tax_settings', 'shopify_inventory'
            ]
            
            console.log(`🗑️ Will delete from ${tablesToDelete.length} tables for ALL connection IDs`)
            
            // Delete in batches to avoid overwhelming the database
            const batchSize = 5
            for (let i = 0; i < tablesToDelete.length; i += batchSize) {
              const batch = tablesToDelete.slice(i, i + batchSize)
              await Promise.all(
                batch.map(async table => {
                  try {
                    const { data, error, count } = await adminSupabase
                      .from(table)
                      .delete()
                      .in('connection_id', allConnectionIds)
                      .select('*', { count: 'exact' })
                    
                    if (error) {
                      console.log(`⚠️ Failed to delete ${table}:`, error.message)
                    } else {
                      console.log(`✅ Deleted ${count || 0} rows from ${table}`)
                    }
                  } catch (err) {
                    console.log(`⚠️ Exception deleting ${table}:`, err)
                  }
                })
              )
            }
            
            // Also delete products by brand_id (different foreign key structure)
            try {
              const { data, error, count } = await adminSupabase
                .from('shopify_products')
                .delete()
                .eq('brand_id', brandId)
                .select('*', { count: 'exact' })
              
              if (error) {
                console.log(`⚠️ Failed to delete shopify_products:`, error.message)
              } else {
                console.log(`✅ Deleted ${count || 0} rows from shopify_products (by brand_id)`)
              }
            } catch (err) {
              console.log(`⚠️ Exception deleting shopify_products:`, err)
            }
            
            console.log(`✅ Standard cleanup completed - force delete should resolve FK constraints`)
            
            console.log(`✅ Completed Shopify data deletion`)
          } catch (error) {
            console.log(`⚠️ Some deletions failed, continuing...`, error)
          }
        }

        // Finally, force delete the connections using admin client
        const { error: connectionError } = await adminSupabase
          .from('platform_connections')
          .delete()
          .eq('brand_id', brandId)
          .eq('platform_type', platformType)

        if (connectionError) {
          console.error('Error force deleting connections:', connectionError)
          return NextResponse.json(
            { error: 'Failed to force delete connection: ' + connectionError.message },
            { status: 500 }
          )
        }

        console.log('✅ Force disconnect completed successfully')
        return NextResponse.json({ 
          success: true, 
          message: `${platformType} connection force deleted successfully` 
        })

      } catch (error) {
        console.error('Error in force disconnect:', error)
        return NextResponse.json(
          { error: 'Failed to force disconnect: ' + (error instanceof Error ? error.message : String(error)) },
          { status: 500 }
        )
      }
    },
    {
      requireBrandAccess: false,
      rateLimitTier: 'medium',
      endpoint: 'disconnect-platform-force'
    }
  )
}