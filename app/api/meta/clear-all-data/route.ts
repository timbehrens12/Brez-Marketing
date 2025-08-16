import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Verify user owns the brand
    const { data: brand } = await supabaseAdmin
      .from('brands')
      .select('user_id')
      .eq('id', brandId)
      .single()

    if (!brand || brand.user_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log(`[ClearMetaData] Starting data cleanup for brand ${brandId}`)

    // List of all Meta-related tables to clear
    const metaTables = [
      'meta_campaigns',
      'meta_campaign_daily_stats', 
      'meta_campaign_daily_insights',
      'meta_adsets',
      'meta_adset_daily_insights',
      'meta_ads',
      'meta_ad_insights',
      'meta_device_performance',
      'meta_demographics',
      'platform_connections'
    ]

    const results = []

    // Clear data from each table
    for (const table of metaTables) {
      try {
        let query = supabaseAdmin.from(table)

        // For platform_connections, only delete Meta connections
        if (table === 'platform_connections') {
          query = query.delete().eq('brand_id', brandId).eq('platform_type', 'meta')
        } else {
          query = query.delete().eq('brand_id', brandId)
        }

        const { error, count } = await query

        if (error) {
          console.error(`[ClearMetaData] Error clearing ${table}:`, error)
          results.push({ table, success: false, error: error.message })
        } else {
          console.log(`[ClearMetaData] Cleared ${count || 0} records from ${table}`)
          results.push({ table, success: true, deletedCount: count || 0 })
        }
      } catch (err) {
        console.error(`[ClearMetaData] Exception clearing ${table}:`, err)
        results.push({ table, success: false, error: (err as Error).message })
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalTables = metaTables.length

    console.log(`[ClearMetaData] Completed cleanup: ${successCount}/${totalTables} tables cleared successfully`)

    return NextResponse.json({
      success: true,
      message: `Meta data cleared for brand ${brandId}`,
      results,
      summary: {
        tablesCleared: successCount,
        totalTables,
        brandId
      }
    })

  } catch (error) {
    console.error('[ClearMetaData] Error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
