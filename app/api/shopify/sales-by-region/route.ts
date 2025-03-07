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
    // Directly query the shopify_sales_by_region table
    console.log('Fetching sales by region data for brand:', brandId)
    
    let query = supabase
      .from('shopify_sales_by_region')
      .select('city, country, total_price, order_count')
      .eq('brand_id', brandId)
      .not('city', 'is', null)
      .order('total_price', { ascending: false })
      .limit(parseInt(limit))
    
    // Add date filters if provided
    if (startDate) {
      console.log('Filtering by start date:', startDate)
      query = query.gte('created_at', startDate)
    }
    
    if (endDate) {
      try {
        const parsedEndDate = parseISO(endDate)
        const adjustedEndDate = endOfDay(parsedEndDate)
        const formattedEndDate = format(adjustedEndDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
        
        console.log('Filtering by end date:', endDate)
        console.log('Adjusted end date to include full day:', formattedEndDate)
        
        query = query.lte('created_at', formattedEndDate)
      } catch (error) {
        console.error('Error adjusting end date:', error)
        query = query.lte('created_at', endDate)
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
    
    console.log(`Found ${regions?.length || 0} regions with sales data:`, regions)
    
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
    
    console.log(`Formatted ${formattedRegions.length} regions with sales data:`, formattedRegions)
    
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