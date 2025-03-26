import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const fromDate = url.searchParams.get('from')
    const toDate = url.searchParams.get('to')
    
    // Log the requested date range for debugging
    console.log(`Meta Analytics - Request date range: from=${fromDate}, to=${toDate}, brandId=${brandId}`)
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Build the query
    let query = supabase
      .from('meta_ad_insights')
      .select('*')
      .eq('brand_id', brandId)
    
    // Add date filtering if provided
    if (fromDate) {
      // Ensure correct date format
      try {
        const parsedFromDate = new Date(fromDate)
        const formattedFromDate = format(parsedFromDate, 'yyyy-MM-dd')
        query = query.gte('date', formattedFromDate)
        console.log(`Filtering from date: ${formattedFromDate}`)
      } catch (e) {
        console.error(`Invalid from date format: ${fromDate}`, e)
      }
    }
    
    if (toDate) {
      try {
        const parsedToDate = new Date(toDate)
        const formattedToDate = format(parsedToDate, 'yyyy-MM-dd')
        query = query.lte('date', formattedToDate)
        console.log(`Filtering to date: ${formattedToDate}`)
      } catch (e) {
        console.error(`Invalid to date format: ${toDate}`, e)
      }
    }
    
    // Execute the query
    const { data, error } = await query.order('date', { ascending: false })
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch Meta analytics data' }, { status: 500 })
    }

    // Log the retrieved records count for debugging
    console.log(`Retrieved ${data?.length || 0} Meta analytics records`)
    
    return NextResponse.json({ 
      data,
      _debug: {
        requestedDateRange: { fromDate, toDate },
        recordsCount: data?.length || 0
      }
    })
  } catch (error) {
    console.error('Error in Meta analytics endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
} 