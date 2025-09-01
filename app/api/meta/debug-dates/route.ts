import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const testDate = url.searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    
    // Debug date representations
    const today = new Date()
    
    const dateInfo = {
      requestDate: testDate,
      todayJS: today.toISOString(),
      todayISO: today.toISOString().split('T')[0],
      todayLocal: today.toLocaleDateString(),
    }
    
    // Check if there's any data from today
    const { data: todayData, error: todayError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('brand_id', brandId)
      .eq('date', testDate)
    
    if (todayError) {
      console.error('Error fetching data for today:', todayError)
    }
    
    // Get some sample dates from the database
    const { data: sampleDates, error: sampleError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('date')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })
      .limit(10)
    
    if (sampleError) {
      console.error('Error fetching sample dates:', sampleError)
    }
    
    // Try various date formats for matching
    const dateMatches = []
    if (sampleDates && sampleDates.length > 0) {
      // Test date in different formats
      const testFormats = [
        testDate,
        new Date(testDate).toISOString(),
        new Date(testDate).toISOString().split('T')[0],
        // Add more formats if needed
      ]
      
      for (const format of testFormats) {
        const { data: matchingData, error: matchError } = await supabase
          .from('meta_campaign_daily_stats')
          .select('date')
          .eq('brand_id', brandId)
          .eq('date', format)
          .limit(5)
        
        if (!matchError) {
          dateMatches.push({
            format,
            matches: matchingData?.length || 0,
            sampleMatches: matchingData
          })
        }
      }
    }
    
    return NextResponse.json({
      dateInfo,
      todayDataCount: todayData?.length || 0,
      todayDataSample: todayData?.slice(0, 3) || [],
      sampleDates: sampleDates?.map(d => d.date) || [],
      dateFormatMatches: dateMatches,
      message: "This endpoint helps debug date issues with the Meta campaign data"
    })
    
  } catch (error) {
    console.error('[Meta Debug Dates] Error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
} 