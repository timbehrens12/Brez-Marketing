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
    let fromDate = url.searchParams.get('from')
    let toDate = url.searchParams.get('to')
    const preset = url.searchParams.get('preset')
    const enforceSingleDay = url.searchParams.get('enforce_single_day') === 'true'
    
    // Log the initial raw request
    console.log(`META ANALYTICS API - Raw request: ${request.url}`);
    console.log(`Initial parameters: from=${fromDate}, to=${toDate}, preset=${preset}, enforceSingleDay=${enforceSingleDay}`);
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Special detection for yesterday preset
    const isYesterdayPreset = preset === 'yesterday'
    const hasYesterdayInUrl = isYesterdayPreset || request.url.includes('yesterday');
    
    // CRITICAL: For yesterday, we ALWAYS force the exact same date for both from and to
    if (hasYesterdayInUrl || enforceSingleDay) {
      // For yesterday preset, ALWAYS calculate yesterday's date exactly
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const exactYesterdayStr = format(yesterday, 'yyyy-MM-dd');
      
      console.log(`YESTERDAY OVERRIDE: Forcing exact date ${exactYesterdayStr} for both from and to parameters`);
      
      // Hard override both dates to be exactly the same
      fromDate = exactYesterdayStr;
      toDate = exactYesterdayStr;
      
      // Execute query with exact date match for yesterday
      const { data, error } = await supabase
        .from('meta_ad_insights')
        .select('*')
        .eq('brand_id', brandId)
        .eq('date', exactYesterdayStr) // Use EXACT date equality for yesterday
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to fetch Meta analytics data' }, { status: 500 });
      }
      
      console.log(`YESTERDAY QUERY: Retrieved ${data?.length || 0} Meta records for ${exactYesterdayStr} only`);
      
      return NextResponse.json({ 
        data,
        _debug: {
          requestedDateRange: { 
            fromDate: exactYesterdayStr,
            toDate: exactYesterdayStr,
            preset: 'yesterday_forced',
            dateType: 'exact_single_day'
          },
          recordsCount: data?.length || 0
        }
      });
    }
    
    // Handle normal date range queries (non-yesterday)
    let formattedFromDate: string | null = null;
    let formattedToDate: string | null = null;
    
    // Format the from date if provided
    if (fromDate) {
      try {
        const parsedFromDate = new Date(fromDate);
        formattedFromDate = format(parsedFromDate, 'yyyy-MM-dd');
      } catch (e) {
        console.error(`Invalid from date format: ${fromDate}`, e);
      }
    }
    
    // Format the to date if provided
    if (toDate) {
      try {
        const parsedToDate = new Date(toDate);
        formattedToDate = format(parsedToDate, 'yyyy-MM-dd');
      } catch (e) {
        console.error(`Invalid to date format: ${toDate}`, e);
      }
    }
    
    // Special handling for single day selections (when from=to)
    if (formattedFromDate && formattedToDate && formattedFromDate === formattedToDate) {
      console.log(`SINGLE DAY SELECTION: Using exact date match for ${formattedFromDate}`);
      
      // Use exact date equality for single day selections
      const { data, error } = await supabase
        .from('meta_ad_insights')
        .select('*')
        .eq('brand_id', brandId)
        .eq('date', formattedFromDate) // Exact date match
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to fetch Meta analytics data' }, { status: 500 });
      }
      
      console.log(`SINGLE DAY QUERY: Retrieved ${data?.length || 0} Meta records for ${formattedFromDate} only`);
      
      return NextResponse.json({ 
        data,
        _debug: {
          requestedDateRange: { 
            fromDate: formattedFromDate,
            toDate: formattedFromDate,
            preset: preset,
            dateType: 'exact_single_day'
          },
          recordsCount: data?.length || 0
        }
      });
    }
    
    // Standard date range query (multi-day)
    let query = supabase
      .from('meta_ad_insights')
      .select('*')
      .eq('brand_id', brandId);
    
    // Add date filtering for range queries
    if (formattedFromDate) {
      query = query.gte('date', formattedFromDate);
      console.log(`DATE RANGE: From date >= ${formattedFromDate}`);
    }
    
    if (formattedToDate) {
      query = query.lte('date', formattedToDate);
      console.log(`DATE RANGE: To date <= ${formattedToDate}`);
    }
    
    // Execute the multi-day query
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch Meta analytics data' }, { status: 500 });
    }
    
    console.log(`DATE RANGE QUERY: Retrieved ${data?.length || 0} Meta records from ${formattedFromDate} to ${formattedToDate}`);
    
    return NextResponse.json({ 
      data,
      _debug: {
        requestedDateRange: { 
          fromDate: formattedFromDate || fromDate, 
          toDate: formattedToDate || toDate,
          preset: preset,
          dateType: 'date_range'
        },
        recordsCount: data?.length || 0
      }
    });
  } catch (error) {
    console.error('Error in Meta analytics endpoint:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 });
  }
} 