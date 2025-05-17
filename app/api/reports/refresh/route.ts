import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This endpoint will be called by the Vercel Cron Job
export async function POST(request: Request) {
  try {
    // Check for secret token to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || authHeader !== `Bearer ${process.env.REPORT_REFRESH_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('Refresh reports job triggered')
    
    // Get the current date to determine if it's the 1st of the month
    const now = new Date()
    const isFirstOfMonth = now.getDate() === 1
    
    // Initialize Supabase client with admin privileges
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    
    // Get all active brands
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('status', 'active')
    
    if (brandsError) {
      console.error('Error fetching brands:', brandsError)
      return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
    }
    
    // Process each brand
    const results = await Promise.allSettled(
      brands.map(async (brand) => {
        try {
          // Always refresh daily reports
          await refreshReport(brand.id, brand.name, 'daily')
          
          // Only refresh monthly reports on the 1st of the month
          if (isFirstOfMonth) {
            await refreshReport(brand.id, brand.name, 'monthly')
          }
          
          return { brandId: brand.id, success: true }
        } catch (error) {
          console.error(`Error refreshing report for brand ${brand.id}:`, error)
          return { brandId: brand.id, success: false, error }
        }
      })
    )
    
    // Count successes and failures
    const succeeded = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
    const failed = results.filter(r => r.status === 'rejected' || !(r.value as any).success).length
    
    console.log(`Report refresh complete: ${succeeded} succeeded, ${failed} failed`)
    
    return NextResponse.json({ 
      success: true, 
      processed: brands.length,
      succeeded,
      failed,
      isFirstOfMonth,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Unhandled error in report refresh job:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to refresh a report for a specific brand and period
async function refreshReport(brandId: string, brandName: string, period: 'daily' | 'monthly') {
  console.log(`Refreshing ${period} report for brand: ${brandId} (${brandName})`)
  
  // Make a call to the generate-report API
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/generate-report`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REPORT_REFRESH_SECRET}`
    },
    body: JSON.stringify({
      brandId,
      period,
      isScheduledRefresh: true,  // Flag to indicate this is an automated refresh
    }),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to refresh ${period} report for brand ${brandId}: ${response.status} ${errorText}`)
  }
  
  // Store the result in a reports table in Supabase for client retrieval
  const reportData = await response.json()
  
  // Create/update entry in supabase reports table
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  
  const { error } = await supabase
    .from('brand_reports')
    .upsert({
      brand_id: brandId,  // This will be implicitly converted to UUID by Supabase
      period: period,
      report_content: reportData.report || '',  // Ensure not null
      date_range_start: reportData.dateRange?.start || new Date().toISOString().split('T')[0],
      date_range_end: reportData.dateRange?.end || new Date().toISOString().split('T')[0],
      last_updated: new Date().toISOString(),
    }, { 
      onConflict: 'brand_id,period',
      // Explicitly tell Supabase to cast text values to the appropriate types
      returning: 'minimal' 
    })
  
  if (error) {
    console.error(`Error storing report for brand ${brandId}:`, error)
    throw error
  }
  
  console.log(`Successfully refreshed ${period} report for brand: ${brandId}`)
  return reportData
} 