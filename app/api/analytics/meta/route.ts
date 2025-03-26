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
    const preset = url.searchParams.get('preset')
    
    // Check for yesterday preset explicitly
    const isYesterdayPreset = preset === 'yesterday'
    const isTodayPreset = preset === 'today'
    
    // Log the requested date range for debugging
    console.log(`Meta Analytics - Request date range: from=${fromDate}, to=${toDate}, brandId=${brandId}, preset=${preset}`)
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Handle date range with more precision for exact queries
    let formattedFromDate: string | null = null
    let formattedToDate: string | null = null
    
    // Special handling for yesterday preset
    if (isYesterdayPreset) {
      console.log('YESTERDAY PRESET DETECTED - ENFORCING STRICT SINGLE DAY QUERY')
      
      // Use exactly yesterday's date for both from and to
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      formattedFromDate = format(yesterday, 'yyyy-MM-dd')
      formattedToDate = formattedFromDate  // Same day - critical for single day accuracy
      
      console.log(`Using strict yesterday-only query: from=${formattedFromDate}, to=${formattedToDate}`)
    }
    // Special handling for today preset
    else if (isTodayPreset) {
      console.log('TODAY PRESET DETECTED - ENFORCING STRICT SINGLE DAY QUERY')
      
      // Use exactly today's date for both from and to
      const today = new Date()
      formattedFromDate = format(today, 'yyyy-MM-dd')
      formattedToDate = formattedFromDate  // Same day - critical for single day accuracy
      
      console.log(`Using strict today-only query: from=${formattedFromDate}, to=${formattedToDate}`)
    }
    // Normal handling for explicit date parameters
    else if (fromDate && toDate) {
      try {
        const parsedFromDate = new Date(fromDate)
        formattedFromDate = format(parsedFromDate, 'yyyy-MM-dd')
        
        const parsedToDate = new Date(toDate)
        formattedToDate = format(parsedToDate, 'yyyy-MM-dd')
        
        // Check if this is a single-day query (from and to are the same)
        if (formattedFromDate === formattedToDate) {
          console.log(`Single day query detected: ${formattedFromDate}`)
        }
        
      } catch (e) {
        console.error(`Invalid date format: ${fromDate} or ${toDate}`, e)
      }
    }
    // Handle only from date specified
    else if (fromDate) {
      try {
        const parsedFromDate = new Date(fromDate)
        formattedFromDate = format(parsedFromDate, 'yyyy-MM-dd')
      } catch (e) {
        console.error(`Invalid from date format: ${fromDate}`, e)
      }
    }
    // Handle only to date specified
    else if (toDate) {
      try {
        const parsedToDate = new Date(toDate)
        formattedToDate = format(parsedToDate, 'yyyy-MM-dd')
      } catch (e) {
        console.error(`Invalid to date format: ${toDate}`, e)
      }
    }

    // Build the query
    let query = supabase
      .from('meta_ad_insights')
      .select('*')
      .eq('brand_id', brandId)
    
    // Add date filtering if provided
    if (formattedFromDate) {
      query = query.gte('date', formattedFromDate)
      console.log(`Filtering from date: ${formattedFromDate}`)
    }
    
    if (formattedToDate) {
      query = query.lte('date', formattedToDate)
      console.log(`Filtering to date: ${formattedToDate}`)
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
        requestedDateRange: { 
          fromDate: formattedFromDate || fromDate, 
          toDate: formattedToDate || toDate,
          preset: preset
        },
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