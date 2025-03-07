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

    // Build query parameters
    let queryParams: any = {
      connection_id: connection.id.toString(),
      brand_id: brandId.toString(),
      limit: parseInt(limit)
    }
    
    // Add date filters if provided
    let dateFilter = ''
    if (startDate) {
      queryParams.start_date = startDate
      dateFilter += ' AND created_at >= :start_date'
    }
    
    if (endDate) {
      try {
        const parsedEndDate = parseISO(endDate)
        const adjustedEndDate = endOfDay(parsedEndDate)
        queryParams.end_date = format(adjustedEndDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
        dateFilter += ' AND created_at <= :end_date'
      } catch (error) {
        console.error('Error adjusting end date:', error)
        queryParams.end_date = endDate
        dateFilter += ' AND created_at <= :end_date'
      }
    }
    
    // Use a raw SQL query with GROUP BY
    const query = `
      SELECT 
        city, 
        country, 
        SUM(total_price) as total_sales, 
        COUNT(*) as order_count
      FROM 
        shopify_sales_by_region
      WHERE 
        connection_id = :connection_id 
        AND brand_id = :brand_id
        AND city IS NOT NULL
        ${dateFilter}
      GROUP BY 
        city, country
      ORDER BY 
        total_sales DESC
      LIMIT :limit
    `
    
    // Execute query
    const { data: regions, error: regionsError } = await supabase
      .from('shopify_sales_by_region')
      .select('city, country, total_price, order_count')
      .eq('connection_id', connection.id.toString())
      .eq('brand_id', brandId.toString())
      .not('city', 'is', null)
      .order('total_price', { ascending: false })
      .limit(parseInt(limit))
    
    if (regionsError) {
      console.error('Error fetching sales by region data:', regionsError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: regionsError.message 
      }, { status: 500 })
    }
    
    // If we can't use group by, we'll aggregate the data in JavaScript
    const regionMap = new Map()
    
    regions?.forEach((region: any) => {
      const key = `${region.city}|${region.country}`
      if (!regionMap.has(key)) {
        regionMap.set(key, {
          city: region.city,
          country: region.country,
          totalSales: 0,
          orderCount: 0
        })
      }
      
      const entry = regionMap.get(key)
      entry.totalSales += parseFloat(region.total_price)
      entry.orderCount += region.order_count || 1
    })
    
    // Convert map to array and sort by totalSales
    const formattedRegions = Array.from(regionMap.values())
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, parseInt(limit))
    
    console.log(`Found ${formattedRegions.length} regions with sales data`)
    
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