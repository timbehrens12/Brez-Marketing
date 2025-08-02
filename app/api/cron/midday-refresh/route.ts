import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron or authorized source
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Unauthorized midday refresh attempt')
    return new Response('Unauthorized', { status: 401 })
  }

  console.log('🕐 Starting midday refresh (lighter sync for current day)...')
  
  try {
    const supabase = createClient()
    
    // Get all active brands with Meta connections (focus on Meta since it updates throughout the day)
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select(`
        id,
        name,
        user_id,
        platform_connections (
          id,
          platform_type,
          status
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

    console.log(`Found ${brands.length} brands for midday refresh`)
    const results = []
    let totalRefreshed = 0
    
    for (const brand of brands) {
      const metaConnection = brand.platform_connections?.find((c: any) => 
        c.platform_type === 'meta' && c.status === 'active'
      )
      
      if (!metaConnection) {
        console.log(`Skipping brand ${brand.name} - no active Meta connection`)
        continue
      }

      console.log(`🔄 Midday refresh for brand: ${brand.name}`)
      
      try {
        const brandResult: any = { brand: brand.name, connections: [] }
        
        // Light refresh: only sync today's data (1 day) to update current metrics
        console.log(`  📊 Light Meta refresh for ${brand.name} (today only)`)
        
        const metaResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/meta/sync`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'Brez-Midday-Refresh'
          },
          body: JSON.stringify({ 
            brandId: brand.id,
            days: 1, // Only sync today - lighter than full sync
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
          console.log(`  ✅ Midday Meta refresh completed: ${metaData.count || 0} records`)
          totalRefreshed++
          
          // Clear cache for this brand to ensure fresh data on next dashboard load
          console.log(`  🧹 Invalidating cache for brand ${brand.name}`)
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cache/invalidate`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'Brez-Midday-Refresh'
              },
              body: JSON.stringify({ 
                brandId: brand.id,
                type: 'meta',
                reason: 'midday-refresh-completed'
              })
            })
            console.log(`  ✅ Cache invalidation completed for brand ${brand.name}`)
          } catch (cacheError) {
            console.error(`  ⚠️ Cache invalidation failed for brand ${brand.name}:`, cacheError)
          }
          
        } else {
          const errorText = await metaResponse.text()
          console.error(`  ❌ Midday Meta refresh failed: ${metaResponse.status} - ${errorText}`)
          brandResult.connections.push({
            type: 'meta',
            status: 'failed',
            error: `HTTP ${metaResponse.status}`
          })
        }
        
        results.push(brandResult)
        
      } catch (error) {
        console.error(`❌ Error in midday refresh for brand ${brand.name}:`, error)
        results.push({
          brand: brand.name,
          connections: [{
            type: 'meta',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          }]
        })
      }
    }

    console.log(`🎉 Midday refresh completed! Refreshed ${totalRefreshed} brands`)
    
    return Response.json({
      success: true,
      message: `Midday refresh completed for ${totalRefreshed} brands`,
      refreshedBrands: totalRefreshed,
      results
    })

  } catch (error) {
    console.error('❌ Error in midday refresh:', error)
    return Response.json({
      success: false,
      error: 'Midday refresh failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 