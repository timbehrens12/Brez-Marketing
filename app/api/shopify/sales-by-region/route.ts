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
    
    // First, let's check if the table exists and has data
    const { data: tableInfo, error: tableError } = await supabase
      .from('shopify_sales_by_region')
      .select('count(*)', { count: 'exact' })
      .eq('brand_id', brandId)
    
    console.log('Table info:', tableInfo, 'Error:', tableError)
    
    // Now query the actual data
    let query = supabase
      .from('shopify_sales_by_region')
      .select('*')
      .eq('brand_id', brandId)
    
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
    const { data: regionsData, error: regionsError } = await query
    
    if (regionsError) {
      console.error('Error fetching sales by region data:', regionsError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: regionsError.message 
      }, { status: 500 })
    }
    
    let regions = regionsData || []
    console.log(`Found ${regions.length || 0} regions with sales data:`, regions)
    
    // If we have no data, try to get placeholder data
    if (regions.length === 0) {
      console.log('No data found, checking for placeholder data')
      
      // Try to get placeholder data without date filters
      const { data: placeholderRegions, error: placeholderError } = await supabase
        .from('shopify_sales_by_region')
        .select('*')
        .eq('brand_id', brandId)
        .ilike('order_id', 'placeholder%')
      
      if (placeholderError) {
        console.error('Error fetching placeholder data:', placeholderError)
      } else if (placeholderRegions && placeholderRegions.length > 0) {
        console.log(`Found ${placeholderRegions.length} placeholder regions:`, placeholderRegions)
        regions = placeholderRegions
      }
    }
    
    // If we still have no data, return empty result
    if (regions.length === 0) {
      console.log('No data found, returning empty result')
      return NextResponse.json({ 
        regions: [],
        message: 'No regional sales data found'
      })
    }
    
    // Aggregate the data by city and country
    const regionMap = new Map()
    
    regions.forEach((region: any) => {
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