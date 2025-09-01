import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron or authorized source
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Unauthorized cron request attempt')
    return new Response('Unauthorized', { status: 401 })
  }

  console.log('🕐 Starting daily automated sync...')
  
  try {
    const supabase = createClient()
    
    // Get all active brands with connections
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select(`
        id,
        name,
        user_id,
        platform_connections (
          id,
          platform_type,
          status,
          shop
        )
      `)
      .not('platform_connections', 'is', null)

    if (brandsError) {
      console.error('Error fetching brands:', brandsError)
      return Response.json({ success: false, error: 'Failed to fetch brands' }, { status: 500 })
    }

    if (!brands?.length) {
      console.log('No brands with connections found')
      return Response.json({ success: true, message: 'No active brands found' })
    }

    console.log(`Found ${brands.length} brands to sync`)
    const results = []
    let totalSynced = 0
    
    for (const brand of brands) {
      const activeConnections = brand.platform_connections?.filter((c: any) => c.status === 'active') || []
      
      if (activeConnections.length === 0) {
        console.log(`Skipping brand ${brand.name} - no active connections`)
        continue
      }

      console.log(`🔄 Syncing brand: ${brand.name}`)
      
      try {
        const brandResult: any = { brand: brand.name, connections: [] }
        
        // Sync Meta data if connected
        const metaConnection = activeConnections.find((c: any) => c.platform_type === 'meta')
        if (metaConnection) {
          console.log(`  📊 Syncing Meta data for ${brand.name}`)
          
          try {
            const metaResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/meta/sync`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'Brez-Daily-Sync'
              },
              body: JSON.stringify({ 
                brandId: brand.id,
                days: 7, // Sync last 7 days to ensure no gaps
                automated: true,
                force_refresh: true
              })
            })
            
            if (metaResponse.ok) {
              const metaData = await metaResponse.json()
              brandResult.connections.push({
                type: 'meta',
                status: 'success',
                records: metaData.count || 0
              })
              console.log(`  ✅ Meta sync completed: ${metaData.count || 0} records`)
              
              // 🔥 CACHE INVALIDATION: Clear cache for this brand to ensure fresh data
              console.log(`  🧹 Invalidating cache for brand ${brand.name}`)
              try {
                await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cache/invalidate`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'Brez-Daily-Sync'
                  },
                  body: JSON.stringify({ 
                    brandId: brand.id,
                    type: 'meta',
                    reason: 'daily-sync-completed'
                  })
                })
                console.log(`  ✅ Cache invalidation completed for brand ${brand.name}`)
              } catch (cacheError) {
                console.error(`  ⚠️ Cache invalidation failed for brand ${brand.name}:`, cacheError)
                // Don't fail the sync if cache invalidation fails
              }
              
            } else {
              const errorText = await metaResponse.text()
              console.error(`  ❌ Meta sync failed: ${metaResponse.status} - ${errorText}`)
              brandResult.connections.push({
                type: 'meta',
                status: 'failed',
                error: `HTTP ${metaResponse.status}`
              })
            }
          } catch (metaError) {
            console.error(`  ❌ Meta sync error for ${brand.name}:`, metaError)
            brandResult.connections.push({
              type: 'meta',
              status: 'error',
              error: metaError instanceof Error ? metaError.message : 'Unknown error'
            })
          }
        }

        // Sync Shopify data if connected
        const shopifyConnection = activeConnections.find((c: any) => c.platform_type === 'shopify')
        if (shopifyConnection) {
          console.log(`  🛍️ Syncing Shopify data for ${brand.name}`)
          
          try {
            // Sync orders
            const shopifyOrdersResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/sync`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'Brez-Daily-Sync'
              },
              body: JSON.stringify({ 
                connectionId: shopifyConnection.id,
                automated: true
              })
            })
            
            let shopifyOrdersResult = 'unknown'
            if (shopifyOrdersResponse.ok) {
              const shopifyOrdersData = await shopifyOrdersResponse.json()
              shopifyOrdersResult = shopifyOrdersData.message || 'synced'
              console.log(`  ✅ Shopify orders sync completed`)
            } else {
              console.error(`  ❌ Shopify orders sync failed: ${shopifyOrdersResponse.status}`)
            }

            // Sync inventory
            const shopifyInventoryResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/inventory/sync`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'Brez-Daily-Sync'
              },
              body: JSON.stringify({ 
                connectionId: shopifyConnection.id,
                automated: true
              })
            })
            
            let shopifyInventoryResult = 'unknown'
            if (shopifyInventoryResponse.ok) {
              const shopifyInventoryData = await shopifyInventoryResponse.json()
              shopifyInventoryResult = shopifyInventoryData.message || 'synced'
              console.log(`  ✅ Shopify inventory sync completed`)
            } else {
              console.error(`  ❌ Shopify inventory sync failed: ${shopifyInventoryResponse.status}`)
            }
            
            brandResult.connections.push({
              type: 'shopify',
              status: 'success',
              orders: shopifyOrdersResult,
              inventory: shopifyInventoryResult
            })
            
          } catch (shopifyError) {
            console.error(`  ❌ Shopify sync error for ${brand.name}:`, shopifyError)
            brandResult.connections.push({
              type: 'shopify',
              status: 'error',
              error: shopifyError instanceof Error ? shopifyError.message : 'Unknown error'
            })
          }
        }

        results.push(brandResult)
        totalSynced++

        // Small delay between brands to avoid rate limits
        if (totalSynced < brands.length) {
          console.log(`  ⏳ Waiting 3 seconds before next brand...`)
          await new Promise(resolve => setTimeout(resolve, 3000))
        }
        
      } catch (error) {
        console.error(`❌ Error syncing brand ${brand.name}:`, error)
        results.push({ 
          brand: brand.name, 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`🎉 Daily sync completed. Processed ${totalSynced} brands.`)

    // Log summary to Supabase for monitoring
    try {
      await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'daily_automated',
          brands_processed: totalSynced,
          results: results,
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log sync results:', logError)
    }

    return Response.json({ 
      success: true, 
      message: `Daily sync completed successfully`,
      brands_processed: totalSynced,
      timestamp: new Date().toISOString(),
      results 
    })
    
  } catch (error) {
    console.error('❌ Daily sync error:', error)
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Allow manual triggers for testing
export async function POST(request: NextRequest) {
  return GET(request)
} 