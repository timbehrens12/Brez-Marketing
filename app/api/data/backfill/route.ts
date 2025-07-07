import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/utils/unified-supabase'
import { auth } from '@clerk/nextjs/server'

interface DataGap {
  start_date: string
  end_date: string
  days_missing: number
  gap_type: 'meta' | 'shopify' | 'both'
}

interface BackfillResult {
  success: boolean
  gaps_found: DataGap[]
  gaps_filled: DataGap[]
  errors: string[]
  total_records_created: number
}

// Helper function to get date range
function getDateRange(startDate: Date, endDate: Date): string[] {
  const dates = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}

// Helper function to detect gaps in data
async function detectDataGaps(supabase: any, userId: string): Promise<DataGap[]> {
  const gaps: DataGap[] = []
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30) // Check last 30 days
  
  console.log('🔍 Checking for data gaps from', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0])
  
  // Get all dates that should have data
  const expectedDates = getDateRange(startDate, endDate)
  
  // Check Meta data gaps
  const { data: metaDates, error: metaError } = await supabase
    .from('meta_ad_insights')
    .select('date_start')
    .eq('user_id', userId)
    .gte('date_start', startDate.toISOString().split('T')[0])
    .lte('date_start', endDate.toISOString().split('T')[0])
  
  if (metaError) {
    console.error('Error fetching meta dates:', metaError)
    throw new Error('Failed to fetch meta data dates')
  }
  
  const existingMetaDates = new Set(metaDates?.map((d: any) => d.date_start) || [])
  const missingMetaDates = expectedDates.filter(date => !existingMetaDates.has(date))
  
  console.log('📅 Expected dates:', expectedDates.length)
  console.log('📊 Existing meta dates:', existingMetaDates.size)
  console.log('❌ Missing meta dates:', missingMetaDates.length)
  
  // Check Shopify data gaps
  const { data: shopifyDates, error: shopifyError } = await supabase
    .from('shopify_orders')
    .select('DISTINCT DATE(created_at) as order_date')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
  
  if (shopifyError) {
    console.error('Error fetching shopify dates:', shopifyError)
    throw new Error('Failed to fetch shopify data dates')
  }
  
  const existingShopifyDates = new Set(shopifyDates?.map((d: any) => d.order_date) || [])
  const missingShopifyDates = expectedDates.filter(date => !existingShopifyDates.has(date))
  
  console.log('🛒 Existing shopify dates:', existingShopifyDates.size)
  console.log('❌ Missing shopify dates:', missingShopifyDates.length)
  
  // Group consecutive missing dates into gaps
  function groupConsecutiveDates(dates: string[]): DataGap[] {
    if (dates.length === 0) return []
    
    const gaps: DataGap[] = []
    let gapStart = dates[0]
    let gapEnd = dates[0]
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1])
      const currentDate = new Date(dates[i])
      const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        // Consecutive dates, extend current gap
        gapEnd = dates[i]
      } else {
        // Non-consecutive, finalize current gap and start new one
        if (gapStart === gapEnd) {
          gaps.push({
            start_date: gapStart,
            end_date: gapEnd,
            days_missing: 1,
            gap_type: 'meta'
          })
        } else {
          const daysDiff = Math.floor((new Date(gapEnd).getTime() - new Date(gapStart).getTime()) / (1000 * 60 * 60 * 24)) + 1
          gaps.push({
            start_date: gapStart,
            end_date: gapEnd,
            days_missing: daysDiff,
            gap_type: 'meta'
          })
        }
        gapStart = dates[i]
        gapEnd = dates[i]
      }
    }
    
    // Add final gap
    if (gapStart === gapEnd) {
      gaps.push({
        start_date: gapStart,
        end_date: gapEnd,
        days_missing: 1,
        gap_type: 'meta'
      })
    } else {
      const daysDiff = Math.floor((new Date(gapEnd).getTime() - new Date(gapStart).getTime()) / (1000 * 60 * 60 * 24)) + 1
      gaps.push({
        start_date: gapStart,
        end_date: gapEnd,
        days_missing: daysDiff,
        gap_type: 'meta'
      })
    }
    
    return gaps
  }
  
  // Create gaps for Meta data
  const metaGaps = groupConsecutiveDates(missingMetaDates.sort())
  gaps.push(...metaGaps)
  
  // Create gaps for Shopify data (only if we have significant gaps)
  const shopifyGaps = groupConsecutiveDates(missingShopifyDates.sort())
  gaps.push(...shopifyGaps.map(gap => ({ ...gap, gap_type: 'shopify' as const })))
  
  // Only return gaps that are 2+ days (significant gaps)
  const significantGaps = gaps.filter(gap => gap.days_missing >= 2)
  
  console.log('🔍 Found', significantGaps.length, 'significant gaps (2+ days)')
  significantGaps.forEach(gap => {
    console.log(`  📅 ${gap.gap_type.toUpperCase()} gap: ${gap.start_date} to ${gap.end_date} (${gap.days_missing} days)`)
  })
  
  return significantGaps
}

// Helper function to backfill Meta data
async function backfillMetaData(supabase: any, userId: string, startDate: string, endDate: string): Promise<number> {
  console.log('🔄 Backfilling Meta data for', startDate, 'to', endDate)
  
  // Get user's Meta access token
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('meta_access_token, meta_ad_account_id')
    .eq('id', userId)
    .single()
  
  if (userError || !userData?.meta_access_token) {
    console.log('❌ No Meta access token found for user')
    return 0
  }
  
  try {
    // Call Meta API to get historical data
    const metaResponse = await fetch('/api/meta/backfill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        startDate,
        endDate,
        accessToken: userData.meta_access_token,
        adAccountId: userData.meta_ad_account_id
      })
    })
    
    if (!metaResponse.ok) {
      console.error('Meta backfill API error:', await metaResponse.text())
      return 0
    }
    
    const result = await metaResponse.json()
    console.log('✅ Meta backfill completed:', result.records_created, 'records')
    return result.records_created || 0
  } catch (error) {
    console.error('Error backfilling Meta data:', error)
    return 0
  }
}

// Helper function to backfill Shopify data
async function backfillShopifyData(supabase: any, userId: string, startDate: string, endDate: string): Promise<number> {
  console.log('🔄 Backfilling Shopify data for', startDate, 'to', endDate)
  
  // Get user's Shopify credentials
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('shopify_store_url, shopify_access_token')
    .eq('id', userId)
    .single()
  
  if (userError || !userData?.shopify_access_token) {
    console.log('❌ No Shopify access token found for user')
    return 0
  }
  
  try {
    // Call Shopify API to get historical data
    const shopifyResponse = await fetch('/api/shopify/backfill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        startDate,
        endDate,
        storeUrl: userData.shopify_store_url,
        accessToken: userData.shopify_access_token
      })
    })
    
    if (!shopifyResponse.ok) {
      console.error('Shopify backfill API error:', await shopifyResponse.text())
      return 0
    }
    
    const result = await shopifyResponse.json()
    console.log('✅ Shopify backfill completed:', result.records_created, 'records')
    return result.records_created || 0
  } catch (error) {
    console.error('Error backfilling Shopify data:', error)
    return 0
  }
}

// GET endpoint - Check for gaps without backfilling
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = await getAuthenticatedSupabaseClient()
    const gaps = await detectDataGaps(supabase, userId)
    
    return NextResponse.json({
      success: true,
      gaps_found: gaps,
      has_gaps: gaps.length > 0,
      total_days_missing: gaps.reduce((sum, gap) => sum + gap.days_missing, 0)
    })
  } catch (error) {
    console.error('Error checking data gaps:', error)
    return NextResponse.json(
      { error: 'Failed to check data gaps' },
      { status: 500 }
    )
  }
}

// POST endpoint - Perform backfill
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = await getAuthenticatedSupabaseClient()
    
    // Check for rate limiting
    const { data: existingLog, error: logError } = await supabase
      .from('backfill_logs')
      .select('created_at')
      .eq('user_id', userId)
      .eq('status', 'success')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (existingLog && existingLog.length > 0) {
      return NextResponse.json(
        { error: 'Backfill already performed in the last hour' },
        { status: 429 }
      )
    }
    
    console.log('🚀 Starting backfill process for user:', userId)
    
    // Detect gaps
    const gaps = await detectDataGaps(supabase, userId)
    
    if (gaps.length === 0) {
      console.log('✅ No gaps found, nothing to backfill')
      return NextResponse.json({
        success: true,
        gaps_found: [],
        gaps_filled: [],
        total_records_created: 0,
        message: 'No data gaps found'
      })
    }
    
    console.log('📊 Found', gaps.length, 'gaps to backfill')
    
    const result: BackfillResult = {
      success: true,
      gaps_found: gaps,
      gaps_filled: [],
      errors: [],
      total_records_created: 0
    }
    
    // Process each gap
    for (const gap of gaps) {
      console.log(`🔄 Processing ${gap.gap_type} gap: ${gap.start_date} to ${gap.end_date}`)
      
      try {
        let recordsCreated = 0
        
        if (gap.gap_type === 'meta') {
          recordsCreated = await backfillMetaData(supabase, userId, gap.start_date, gap.end_date)
        } else if (gap.gap_type === 'shopify') {
          recordsCreated = await backfillShopifyData(supabase, userId, gap.start_date, gap.end_date)
        }
        
        if (recordsCreated > 0) {
          result.gaps_filled.push(gap)
          result.total_records_created += recordsCreated
          console.log(`✅ Successfully filled ${gap.gap_type} gap: ${recordsCreated} records`)
        } else {
          result.errors.push(`Failed to fill ${gap.gap_type} gap: ${gap.start_date} to ${gap.end_date}`)
          console.log(`❌ Failed to fill ${gap.gap_type} gap`)
        }
      } catch (error) {
        const errorMessage = `Error filling ${gap.gap_type} gap: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMessage)
        console.error(`❌ ${errorMessage}`)
      }
    }
    
    // Log the backfill operation
    await supabase.from('backfill_logs').insert({
      user_id: userId,
      gaps_found: gaps.length,
      gaps_filled: result.gaps_filled.length,
      records_created: result.total_records_created,
      errors: result.errors,
      status: result.gaps_filled.length > 0 ? 'success' : 'failed',
      created_at: new Date().toISOString()
    })
    
    console.log('📝 Backfill operation completed:', {
      gaps_found: gaps.length,
      gaps_filled: result.gaps_filled.length,
      records_created: result.total_records_created,
      errors: result.errors.length
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error during backfill:', error)
    return NextResponse.json(
      { error: 'Failed to perform backfill' },
      { status: 500 }
    )
  }
} 