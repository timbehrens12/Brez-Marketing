import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { endOfDay, parseISO, format } from 'date-fns'

export async function GET(request: Request) {
  console.log('Shopify sales by region route hit')
  
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const limit = searchParams.get('limit') || '10' // Default to top 10 regions

  console.log('Request parameters:', { brandId, startDate, endDate, limit })

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
        return NextResponse.json({ 
          regions: [],
          message: 'No active Shopify connection found'
        })
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
      return NextResponse.json({ 
        regions: [],
        message: 'No active Shopify connection found'
      })
    }

    console.log('Found Shopify connection:', { 
      id: connection.id, 
      status: connection.status
    })

    // Build query for regional sales data
    let query = supabase
      .from('shopify_sales_by_region')
      .select('city, country, sum(total_price) as total_sales, count(*) as order_count')
      .eq('connection_id', connection.id.toString())
      .eq('brand_id', brandId.toString())
      .eq('user_id', connection.user_id.toString())
      .not('city', 'is', null) // Exclude orders without city data
      .group('city, country')
      .order('total_sales', { ascending: false })
      .limit(parseInt(limit))
    
    // Add date filters if provided
    if (startDate) {
      console.log('Filtering by start date:', startDate)
      query = query.gte('created_at', startDate)
    }
    
    if (endDate) {
      try {
        const parsedEndDate = parseISO(endDate);
        const adjustedEndDate = endOfDay(parsedEndDate);
        const formattedEndDate = format(adjustedEndDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
        
        console.log('Filtering by end date:', endDate);
        console.log('Adjusted end date to include full day:', formattedEndDate);
        
        query = query.lte('created_at', formattedEndDate);
      } catch (error) {
        console.error('Error adjusting end date:', error);
        query = query.lte('created_at', endDate);
      }
    }
    
    // Execute query
    const { data: regions, error: regionsError } = await query
    
    if (regionsError) {
      console.error('Error fetching sales by region data:', regionsError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: regionsError.message 
      }, { status: 500 })
    }
    
    console.log(`Found ${regions?.length || 0} regions with sales data`)
    
    // Format the response
    const formattedRegions = regions?.map((region: any) => ({
      city: region.city,
      country: region.country,
      totalSales: parseFloat(region.total_sales),
      orderCount: parseInt(region.order_count)
    })) || []
    
    return NextResponse.json({ 
      regions: formattedRegions,
      message: formattedRegions.length > 0 ? `Found ${formattedRegions.length} regions with sales data` : 'No regional sales data found'
    })
  } catch (error) {
    console.error('Unhandled error in sales by region route:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 