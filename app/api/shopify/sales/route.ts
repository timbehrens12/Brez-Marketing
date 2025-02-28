import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  console.log('Shopify sales route hit')
  
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  console.log('Request parameters:', { brandId, startDate, endDate })

  if (!brandId) {
    console.error('Missing brandId parameter')
    return NextResponse.json({ error: 'Missing brandId' }, { status: 400 })
  }

  try {
    // Get Shopify connection for this brand
    console.log('Fetching Shopify connection for brand:', brandId)
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'shopify')
      .eq('brand_id', brandId)
      .eq('status', 'active')
      .single()

    if (connectionError) {
      if (connectionError.code === 'PGRST116') {
        // No connection found (not an error)
        console.log('No active Shopify connection found for brand:', brandId)
        return NextResponse.json({ sales: [] })
      }
      
      // Other database error
      console.error('Error fetching Shopify connection:', connectionError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: connectionError.message 
      }, { status: 500 })
    }

    if (!connection) {
      console.log('No active Shopify connection found for brand:', brandId)
      return NextResponse.json({ sales: [] })
    }

    console.log('Found Shopify connection:', { 
      id: connection.id, 
      shop: connection.shop,
      status: connection.status
    })

    // Build query for sales data
    let query = supabase
      .from('shopify_data')
      .select('*')
      .eq('connection_id', connection.id)
      
    // Add date filters if provided
    if (startDate) {
      console.log('Filtering by start date:', startDate)
      query = query.gte('created_at', startDate)
    }
    
    if (endDate) {
      console.log('Filtering by end date:', endDate)
      query = query.lte('created_at', endDate)
    }
    
    // Execute query
    console.log('Fetching Shopify sales data')
    const { data: sales, error: salesError } = await query.order('created_at', { ascending: false })

    if (salesError) {
      console.error('Error fetching Shopify sales data:', salesError)
      return NextResponse.json({ 
        error: 'Failed to fetch sales data', 
        details: salesError.message 
      }, { status: 500 })
    }

    console.log(`Found ${sales?.length || 0} Shopify sales records`)
    return NextResponse.json({ sales: sales || [] })
    
  } catch (error) {
    console.error('Unhandled error fetching Shopify sales:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch sales',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 