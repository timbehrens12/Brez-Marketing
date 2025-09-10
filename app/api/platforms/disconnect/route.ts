import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { brandId, platformType } = await request.json()

  try {
    console.log('Disconnecting platform:', { brandId, platformType })
    
    // First, check if the connection exists - but don't use .single() since there might be multiple
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
      console.error('No connections found for:', { brandId, platformType })
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    console.log(`Found ${connections.length} connections to disconnect`)

    // For each connection, handle related data
    for (const connection of connections) {
      console.log('Processing connection:', connection.id)
      
      // For Shopify, we need to handle related data first
      if (platformType === 'shopify') {
        // Check for possible related tables and delete data from them
        const possibleTables = [
          'shopify_orders',
          'shopify_products',
          'shopify_customers',
          'shopify_metrics',
          'shopify_inventory',
          'shopify_data'
        ]

        for (const table of possibleTables) {
          try {
            // Check if the table exists
            const { count, error: countError } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true })
              .eq('connection_id', connection.id)

            if (countError) {
              // Table probably doesn't exist, skip it
              console.log(`Table ${table} doesn't exist or has no connection_id column`)
              continue
            }

            if (count && count > 0) {
              console.log(`Deleting ${count} records from ${table}`)
              const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .eq('connection_id', connection.id)

              if (deleteError) {
                console.error(`Error deleting from ${table}:`, deleteError)
              }
            }
          } catch (error) {
            console.error(`Error handling table ${table}:`, error)
          }
        }
      }

      // For Meta, we need to handle related data first
      if (platformType === 'meta') {
        // Get brand_id for Meta data cleanup
        const { data: connectionData } = await supabase
          .from('platform_connections')
          .select('brand_id')
          .eq('id', connection.id)
          .single()

        if (connectionData?.brand_id) {
          console.log(`Cleaning up Meta data for brand ${connectionData.brand_id}`)
          
          // Delete all Meta-related data for this brand
          const metaTables = [
            'meta_campaigns',
            'meta_campaign_daily_stats', 
            'meta_ad_insights',
            'meta_demographics',
            'meta_device_performance',
            'meta_sync_history'
          ]

          for (const table of metaTables) {
            try {
              const { count, error: countError } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .eq('brand_id', connectionData.brand_id)

              if (countError) {
                console.log(`Table ${table} doesn't exist or has no brand_id column`)
                continue
              }

              if (count && count > 0) {
                console.log(`Deleting ${count} Meta records from ${table}`)
                const { error: deleteError } = await supabase
                  .from(table)
                  .delete()
                  .eq('brand_id', connectionData.brand_id)

                if (deleteError) {
                  console.error(`Error deleting Meta data from ${table}:`, deleteError)
                } else {
                  console.log(`✅ Successfully deleted ${count} records from ${table}`)
                }
              }
            } catch (error) {
              console.error(`Error handling Meta table ${table}:`, error)
            }
          }

          // Also clean up any ETL jobs for this brand
          try {
            const { count: etlCount, error: etlCountError } = await supabase
              .from('etl_job')
              .select('*', { count: 'exact', head: true })
              .eq('brand_id', connectionData.brand_id)
              .like('job_type', 'meta_%')

            if (!etlCountError && etlCount && etlCount > 0) {
              console.log(`Deleting ${etlCount} Meta ETL jobs`)
              const { error: etlDeleteError } = await supabase
                .from('etl_job')
                .delete()
                .eq('brand_id', connectionData.brand_id)
                .like('job_type', 'meta_%')

              if (etlDeleteError) {
                console.error('Error deleting Meta ETL jobs:', etlDeleteError)
              } else {
                console.log(`✅ Successfully deleted ${etlCount} Meta ETL jobs`)
              }
            }
          } catch (error) {
            console.error('Error handling Meta ETL jobs:', error)
          }
        }
      }
    }

    // Now delete all matching connections
    const { error: connectionError } = await supabase
      .from('platform_connections')
      .delete()
      .eq('brand_id', brandId)
      .eq('platform_type', platformType)

    if (connectionError) {
      console.error('Error deleting connections:', connectionError)
      
      // Check if it's a foreign key constraint error
      if (connectionError.message && connectionError.message.includes('foreign key constraint')) {
        return NextResponse.json(
          { 
            error: 'Foreign key constraint error. Please delete related data first.',
            details: connectionError.message
          },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to delete connection: ' + connectionError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting platform:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect platform: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}