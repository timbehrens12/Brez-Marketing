import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    
    const brandId = searchParams.get('brandId')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '3')
    const excludeCurrent = searchParams.get('exclude_current') === 'true'
    
    if (!brandId || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brand ID and User ID are required' 
      }, { status: 400 })
    }

    // Build query to fetch historical reports
    let query = supabase
      .from('ai_marketing_reports')
      .select(`
        id,
        brand_id,
        user_id,
        report_type,
        raw_response,
        created_at,
        date_range_from,
        date_range_to
      `)
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // If excluding current day reports (for comparison context)
    if (excludeCurrent) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      query = query.lt('created_at', today.toISOString())
    }

    const { data: reports, error } = await query

    if (error) {
      console.error('❌ Error fetching historical reports:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch historical reports' 
      }, { status: 500 })
    }

    // Automatic cleanup: Delete old reports beyond comparison range
    try {
      // Get all reports for this brand/user to find ones to delete
      const { data: allReports, error: allReportsError } = await supabase
        .from('ai_marketing_reports')
        .select('id, created_at')
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!allReportsError && allReports && allReports.length > 5) {
        // Keep the 5 most recent reports (3 for comparison + 2 extra buffer)
        // Delete any reports beyond this range
        const reportsToDelete = allReports.slice(5)
        
        if (reportsToDelete.length > 0) {
          const idsToDelete = reportsToDelete.map(report => report.id)
          
          const { error: deleteError } = await supabase
            .from('ai_marketing_reports')
            .delete()
            .in('id', idsToDelete)
          
          if (deleteError) {
            console.error('❌ Error cleaning up old reports:', deleteError)
          } else {
            console.log(`🗑️ Cleaned up ${reportsToDelete.length} old reports for brand ${brandId}`)
          }
        }
      }
    } catch (cleanupError) {
      console.error('❌ Error during automatic cleanup:', cleanupError)
      // Don't fail the main request if cleanup fails
    }

    // Extract key insights and metrics from historical reports for comparison
    const processedReports = reports?.map(report => {
      const reportData = typeof report.raw_response === 'string' 
        ? JSON.parse(report.raw_response) 
        : report.raw_response

      return {
        id: report.id,
        reportType: report.report_type,
        createdAt: report.created_at,
        dateRangeStart: report.date_range_from,
        dateRangeEnd: report.date_range_to,
        // Extract key metrics and insights for comparison
        keyMetrics: extractKeyMetrics(reportData),
        summary: extractSummary(reportData),
        recommendations: extractRecommendations(reportData)
      }
    }) || []

    return NextResponse.json({
      success: true,
      reports: processedReports,
      count: processedReports.length
    })

  } catch (error) {
    console.error('❌ Error in historical reports API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Helper function to extract key metrics from report data
function extractKeyMetrics(reportData: any) {
  try {
    // Extract metrics from the platforms data
    const platforms = reportData?.platforms || {}
    const shopify = platforms.shopify || {}
    const meta = platforms.meta || {}
    
    return {
      revenue: shopify.totalSales || 0,
      orders: shopify.ordersCount || 0,
      adSpend: meta.totalSpend || 0,
      roas: meta.roas || 0,
      conversions: meta.conversions || 0,
      impressions: meta.impressions || 0,
      clicks: meta.clicks || 0,
      ctr: meta.ctr || 0,
      cpc: meta.cpc || 0
    }
  } catch (error) {
    console.error('Error extracting key metrics:', error)
    return {}
  }
}

// Helper function to extract summary from report data
function extractSummary(reportData: any) {
  try {
    // Try to extract a summary from the AI response
    const response = reportData?.ai_response || reportData?.analysis || ''
    
    // Look for summary sections in the response
    if (typeof response === 'string') {
      const summaryMatch = response.match(/## Summary\s*\n([\s\S]*?)(?=\n##|\n\*\*|$)/)
      if (summaryMatch) {
        return summaryMatch[1].trim()
      }
      
      // If no explicit summary, take the first paragraph
      const firstParagraph = response.split('\n\n')[0]
      return firstParagraph?.substring(0, 200) + (firstParagraph?.length > 200 ? '...' : '')
    }
    
    return ''
  } catch (error) {
    console.error('Error extracting summary:', error)
    return ''
  }
}

// Helper function to extract recommendations from report data
function extractRecommendations(reportData: any) {
  try {
    const response = reportData?.ai_response || reportData?.analysis || ''
    
    if (typeof response === 'string') {
      // Look for recommendations sections
      const recMatch = response.match(/## (?:Recommendations|Action Items|Next Steps)\s*\n([\s\S]*?)(?=\n##|\n\*\*|$)/)
      if (recMatch) {
        // Extract bullet points or numbered items
        const recommendations = recMatch[1]
          .split('\n')
          .filter(line => line.trim().match(/^[-*\d]/))
          .map(line => line.replace(/^[-*\d.\s]+/, '').trim())
          .filter(rec => rec.length > 0)
          .slice(0, 3) // Keep top 3 recommendations
        
        return recommendations
      }
    }
    
    return []
  } catch (error) {
    console.error('Error extracting recommendations:', error)
    return []
  }
} 