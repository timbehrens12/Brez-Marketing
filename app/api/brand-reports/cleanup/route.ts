import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Optional parameters for targeted cleanup
    const { brandId, keepCount = 5, dryRun = false } = await request.json()
    
    console.log(`🗑️ Starting brand reports cleanup${dryRun ? ' (DRY RUN)' : ''}`)
    console.log(`📊 Configuration: keepCount=${keepCount}, brandId=${brandId || 'all'}`)
    
    let totalDeleted = 0
    let brandsProcessed = 0
    
    if (brandId) {
      // Clean up specific brand
      const result = await cleanupBrandReports(supabase, brandId, keepCount, dryRun)
      totalDeleted = result.deleted
      brandsProcessed = 1
    } else {
      // Clean up all brands
      const { data: brands, error: brandsError } = await supabase
        .from('brands')
        .select('id, name')
      
      if (brandsError) {
        console.error('❌ Error fetching brands:', brandsError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch brands' 
        }, { status: 500 })
      }
      
      // Process each brand
      for (const brand of brands || []) {
        try {
          const result = await cleanupBrandReports(supabase, brand.id, keepCount, dryRun)
          totalDeleted += result.deleted
          brandsProcessed++
          
          if (result.deleted > 0) {
            console.log(`🗑️ Brand ${brand.name}: ${result.deleted} reports ${dryRun ? 'would be ' : ''}deleted`)
          }
        } catch (error) {
          console.error(`❌ Error cleaning up brand ${brand.id}:`, error)
        }
      }
    }
    
    console.log(`✅ Cleanup complete: ${totalDeleted} reports ${dryRun ? 'would be ' : ''}deleted across ${brandsProcessed} brands`)
    
    return NextResponse.json({
      success: true,
      message: `Cleanup complete${dryRun ? ' (dry run)' : ''}`,
      reportsDeleted: totalDeleted,
      brandsProcessed,
      dryRun
    })
    
  } catch (error) {
    console.error('❌ Error in cleanup API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Helper function to clean up reports for a specific brand
async function cleanupBrandReports(
  supabase: any, 
  brandId: string, 
  keepCount: number, 
  dryRun: boolean
): Promise<{ deleted: number }> {
  
  // Get all users who have reports for this brand
  const { data: userReports, error: userError } = await supabase
    .from('ai_marketing_reports')
    .select('user_id')
    .eq('brand_id', brandId)
    .group('user_id')
  
  if (userError) {
    console.error(`❌ Error fetching users for brand ${brandId}:`, userError)
    return { deleted: 0 }
  }
  
  let totalDeleted = 0
  
  // Clean up reports for each user separately
  for (const userGroup of userReports || []) {
    const userId = userGroup.user_id
    
    // Get all reports for this brand/user combination
    const { data: allReports, error: reportsError } = await supabase
      .from('ai_marketing_reports')
      .select('id, created_at, report_type')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (reportsError) {
      console.error(`❌ Error fetching reports for brand ${brandId}, user ${userId}:`, reportsError)
      continue
    }
    
    if (allReports && allReports.length > keepCount) {
      // Identify reports to delete (beyond the keepCount threshold)
      const reportsToDelete = allReports.slice(keepCount)
      
      if (!dryRun && reportsToDelete.length > 0) {
        const idsToDelete = reportsToDelete.map(report => report.id)
        
        const { error: deleteError } = await supabase
          .from('ai_marketing_reports')
          .delete()
          .in('id', idsToDelete)
        
        if (deleteError) {
          console.error(`❌ Error deleting reports for brand ${brandId}, user ${userId}:`, deleteError)
        } else {
          totalDeleted += reportsToDelete.length
          console.log(`🗑️ Deleted ${reportsToDelete.length} old reports for brand ${brandId}, user ${userId}`)
        }
      } else {
        totalDeleted += reportsToDelete.length // Count for dry run
      }
    }
  }
  
  return { deleted: totalDeleted }
}

// GET endpoint for cleanup status/info
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    // Get report counts per brand
    let query = supabase
      .from('ai_marketing_reports')
      .select('brand_id, user_id, created_at')
      .order('created_at', { ascending: false })
    
    if (brandId) {
      query = query.eq('brand_id', brandId)
    }
    
    const { data: reports, error } = await query
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch report statistics' 
      }, { status: 500 })
    }
    
    // Group by brand and user to calculate cleanup potential
    type ReportItem = {brand_id: string, user_id: string, created_at: string}
    type BrandStats = {
      brandId: string
      userId: string
      totalReports: number
      oldestReport: string
      newestReport: string
    }
    
    const stats: Record<string, BrandStats> = {}
    const reportsList = (reports || []) as ReportItem[]
    
    for (const report of reportsList) {
      const key = `${report.brand_id}_${report.user_id}`
      if (!stats[key]) {
        stats[key] = {
          brandId: report.brand_id,
          userId: report.user_id,
          totalReports: 0,
          oldestReport: report.created_at,
          newestReport: report.created_at
        }
      }
      stats[key].totalReports++
      if (report.created_at < stats[key].oldestReport) {
        stats[key].oldestReport = report.created_at
      }
      if (report.created_at > stats[key].newestReport) {
        stats[key].newestReport = report.created_at
      }
    }
    
    // Calculate cleanup potential (reports beyond keepCount=5)
    const cleanupStats = Object.values(stats).map((stat) => ({
      ...stat,
      excessReports: Math.max(0, stat.totalReports - 5),
      needsCleanup: stat.totalReports > 5
    }))
    
    const totalExcess = cleanupStats.reduce((sum, stat) => sum + stat.excessReports, 0)
    const brandsNeedingCleanup = cleanupStats.filter((stat) => stat.needsCleanup).length
    
    return NextResponse.json({
      success: true,
      statistics: {
        totalReports: reports?.length || 0,
        totalExcessReports: totalExcess,
        brandsNeedingCleanup,
        breakdown: cleanupStats
      }
    })
    
  } catch (error) {
    console.error('❌ Error in cleanup status API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 