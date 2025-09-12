import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId') || '5352d021-6ea8-4ef0-a63c-973978c89464' // Default to Test 2

    const supabase = createClient()

    // Check today's data in meta_ad_daily_insights
    const { data: dailyData, error: dailyError } = await supabase
      .from('meta_ad_daily_insights')
      .select('date, ad_id, adset_id, spent')
      .eq('brand_id', brandId)
      .gte('date', '2025-09-12')
      .order('date', { ascending: false })

    if (dailyError) {
      console.error('Error fetching daily data:', dailyError)
      return NextResponse.json({ error: dailyError.message }, { status: 500 })
    }

    // Calculate totals
    const totalSpend = dailyData?.reduce((sum, record) => sum + parseFloat(record.spent || '0'), 0) || 0
    const recordCount = dailyData?.length || 0
    const uniqueDates = [...new Set(dailyData?.map(d => d.date) || [])]

    // Check for duplicates
    const duplicatesCheck = dailyData?.reduce((acc, record) => {
      const key = `${record.date}`
      if (!acc[key]) acc[key] = []
      acc[key].push({
        ad_id: record.ad_id,
        spent: record.spent
      })
      return acc
    }, {} as any)

    const hasDuplicates = Object.values(duplicatesCheck || {}).some((records: any) => records.length > 1)

    return NextResponse.json({
      success: true,
      brandId,
      summary: {
        totalRecords: recordCount,
        totalSpend: totalSpend.toFixed(2),
        uniqueDates: uniqueDates.length,
        hasDuplicates,
        dateRange: uniqueDates.length > 0 ? `${uniqueDates[uniqueDates.length - 1]} to ${uniqueDates[0]}` : 'No data'
      },
      details: dailyData,
      duplicatesAnalysis: duplicatesCheck
    })

  } catch (error) {
    console.error('Error in check-current-data:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
