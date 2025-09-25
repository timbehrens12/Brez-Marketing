import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

/**
 * REALITY CHECK: What's actually in the Meta tables right now?
 * No bullshit, just raw data counts and samples
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId') || '1a30f34b-b048-4f80-b880-6c61bd12c720'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log(`[META TABLES REALITY] 🔍 Checking what's ACTUALLY in the database for brand ${brandId}`)

    // Check ALL Meta tables
    const tables = [
      'meta_demographics',
      'meta_device_performance', 
      'meta_ad_insights',
      'meta_adset_daily_insights',
      'meta_campaigns',
      'meta_adsets',
      'platform_connections'
    ]

    const results = {}

    for (const table of tables) {
      try {
        console.log(`[META REALITY] Checking ${table}...`)
        
        // Get total count
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('brand_id', brandId)

        // Get sample records with dates
        let sampleQuery = supabase
          .from(table)
          .select('*')
          .eq('brand_id', brandId)
          .limit(5)

        // Add date ordering based on table structure
        if (['meta_demographics', 'meta_device_performance'].includes(table)) {
          sampleQuery = sampleQuery.order('date_range_start', { ascending: false })
        } else if (['meta_ad_insights', 'meta_adset_daily_insights'].includes(table)) {
          sampleQuery = sampleQuery.order('date_start', { ascending: false })
        } else {
          sampleQuery = sampleQuery.order('created_at', { ascending: false })
        }

        const { data: samples } = await sampleQuery

        // Extract unique dates
        let uniqueDates = []
        if (samples && samples.length > 0) {
          if (['meta_demographics', 'meta_device_performance'].includes(table)) {
            uniqueDates = [...new Set(samples.map(s => s.date_range_start))].slice(0, 10)
          } else if (['meta_ad_insights', 'meta_adset_daily_insights'].includes(table)) {
            uniqueDates = [...new Set(samples.map(s => s.date_start))].slice(0, 10)
          }
        }

        results[table] = {
          total_records: count || 0,
          unique_dates: uniqueDates,
          sample_records: samples?.slice(0, 2) || [],
          table_structure: samples && samples.length > 0 ? Object.keys(samples[0]) : []
        }

        console.log(`[META REALITY] ${table}: ${count || 0} records, dates: ${uniqueDates.join(', ')}`)

      } catch (error) {
        console.error(`[META REALITY] Error checking ${table}:`, error)
        results[table] = {
          error: error.message,
          total_records: 0,
          unique_dates: [],
          sample_records: []
        }
      }
    }

    // Special check for platform connections
    const { data: connections } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    console.log(`[META REALITY] 🔗 Meta connections: ${connections?.length || 0}`)
    if (connections && connections.length > 0) {
      console.log(`[META REALITY] Connection status:`, connections[0].status)
      console.log(`[META REALITY] Connection metadata:`, connections[0].metadata)
    }

    const summary = {
      brand_id: brandId,
      timestamp: new Date().toISOString(),
      meta_connection_active: connections?.some(c => c.status === 'active') || false,
      total_meta_records: Object.values(results).reduce((sum, table: any) => sum + (table.total_records || 0), 0),
      tables: results,
      meta_connections: connections
    }

    console.log(`[META REALITY] 🎯 SUMMARY: ${summary.total_meta_records} total Meta records, connection active: ${summary.meta_connection_active}`)

    return NextResponse.json(summary)

  } catch (error) {
    console.error('Error checking Meta tables reality:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
