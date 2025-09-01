import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check connections for the brand
    const { data: connections, error } = await supabase
      .from('platform_connections')
      .select('id, shop, status, sync_status, created_at, access_token')
      .eq('brand_id', '1a30f34b-b048-4f80-b880-6c61bd12c720')
      .eq('platform_type', 'shopify')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check ETL jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('etl_job')
      .select('*')
      .eq('brand_id', '1a30f34b-b048-4f80-b880-6c61bd12c720')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      connections: connections?.map(c => ({
        id: c.id,
        shop: c.shop,
        status: c.status,
        sync_status: c.sync_status,
        created_at: c.created_at,
        has_token: !!c.access_token,
        token_length: c.access_token?.length || 0
      })),
      etl_jobs: jobs,
      jobs_error: jobsError?.message
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
