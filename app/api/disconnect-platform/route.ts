import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { brandId, platformType } = await request.json()

  try {
    console.log('Disconnecting platform:', { brandId, platformType })
    
    // First, check if the connection exists
    const { data: connection, error: connectionQueryError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', platformType)
      .single()

    if (connectionQueryError) {
      console.error('Error finding connection:', connectionQueryError)
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    console.log('Found connection:', connection)

    // For Shopify, we need to handle orders first
    if (platformType === 'shopify') {
      // Check for possible related tables and delete data from them
      const possibleTables = [
        'shopify_orders',
        'shopify_products',
        'shopify_customers',
        'shopify_metrics',
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

    // Now try to delete the connection
    const { error: connectionError } = await supabase
      .from('platform_connections')
      .delete()
      .eq('brand_id', brandId)
      .eq('platform_type', platformType)

    if (connectionError) {
      console.error('Error deleting connection:', connectionError)
      
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