import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Create service role client for bypassing RLS
const getServiceClient = () => {
  return createClient()
}

// GET - Load reports (single by snapshot time or all for a day)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const brandId = searchParams.get('brandId')
    const userId = searchParams.get('userId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const periodName = searchParams.get('periodName')
    const snapshotTime = searchParams.get('snapshotTime') // Optional - if provided, get specific snapshot
    const getAllSnapshots = searchParams.get('getAllSnapshots') === 'true' // Get all snapshots for the day
    const includeSharedBrands = searchParams.get('includeSharedBrands') === 'true' // Include reports from shared brand users

    if (!brandId || !userId || !fromDate || !toDate || !periodName) {
      return NextResponse.json(
        { error: 'Missing required parameters' }, 
        { status: 400 }
      )
    }

    console.log(`Loading reports for brand ${brandId}, user ${userId}, period ${periodName}${snapshotTime ? `, snapshot: ${snapshotTime}` : ''}, includeSharedBrands: ${includeSharedBrands}`)
    
    const serviceClient = getServiceClient()
    
    // Build query - if including shared brands, get reports from all users with access to this brand
    let query = serviceClient
      .from('ai_marketing_reports')
      .select('*')
      .eq('brand_id', brandId)
      .eq('date_range_from', fromDate)
      .eq('date_range_to', toDate)
      .eq('period_name', periodName)

    // If not including shared brands, filter by user_id as before
    if (!includeSharedBrands) {
      query = query.eq('user_id', userId)
    }

    // If specific snapshot time requested, filter by it
    if (snapshotTime) {
      query = query.eq('snapshot_time', snapshotTime)
    }

    // Order by creation time, newest first
    query = query.order('created_at', { ascending: false })

    // If not getting all snapshots and no specific snapshot time, limit to 1
    if (!getAllSnapshots && !snapshotTime) {
      query = query.limit(1)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error loading reports:', error)
      return NextResponse.json(
        { error: 'Failed to load reports' }, 
        { status: 500 }
      )
    }
    
    if (getAllSnapshots) {
      // Return all snapshots for the day
      const reports = data?.map(report => ({
        content: report.formatted_report || report.html_report,
        createdAt: report.created_at,
        snapshotTime: report.snapshot_time,
        data: report
      })) || []
      
      return NextResponse.json({
        success: true,
        reports,
        count: reports.length
      })
    } else if (data && data.length > 0) {
      // Return single report (latest or specific snapshot)
      const report = data[0]
      const reportContent = report.formatted_report || report.html_report
      
      if (reportContent) {
        return NextResponse.json({
          success: true,
          report: {
            content: reportContent,
            createdAt: report.created_at,
            snapshotTime: report.snapshot_time,
            data: report
          }
        })
      }
    }
    
    return NextResponse.json({
      success: false,
      message: 'No reports found'
    })
    
  } catch (error) {
    console.error('Exception loading reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// POST - Save new report with snapshot time
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brandId, userId, fromDate, toDate, periodName, reportContent, rawResponse, snapshotTime } = body

    if (!brandId || !userId || !fromDate || !toDate || !periodName || !reportContent) {
      return NextResponse.json(
        { error: 'Missing required parameters' }, 
        { status: 400 }
      )
    }

    console.log(`Saving report for brand ${brandId}, user ${userId}, period ${periodName}, snapshot: ${snapshotTime}`)
    
    const serviceClient = getServiceClient()
    
    // Check if a report already exists for this exact snapshot time (or null for manual refreshes)
    let existingQuery = serviceClient
      .from('ai_marketing_reports')
      .select('id')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .eq('date_range_from', fromDate)
      .eq('date_range_to', toDate)
      .eq('period_name', periodName)
    
    // Handle null snapshot time (manual refresh) vs specific snapshot time
    if (snapshotTime === null) {
      existingQuery = existingQuery.is('snapshot_time', null)
    } else {
      existingQuery = existingQuery.eq('snapshot_time', snapshotTime)
    }
    
    const { data: existingData } = await existingQuery.limit(1)

    if (existingData && existingData.length > 0) {
      // Update existing report
      const { error: updateError } = await serviceClient
        .from('ai_marketing_reports')
        .update({
          raw_response: rawResponse || reportContent,
          formatted_report: reportContent,
          html_report: reportContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData[0].id)

      if (updateError) {
        console.error('Error updating report:', updateError)
        return NextResponse.json(
          { error: 'Failed to update report' }, 
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Report updated successfully',
        action: 'updated'
      })
    } else {
      // Insert new report
      const { data, error } = await serviceClient
        .from('ai_marketing_reports')
        .insert({
          brand_id: brandId,
          user_id: userId,
          date_range_from: fromDate,
          date_range_to: toDate,
          period_name: periodName,
          snapshot_time: snapshotTime,
          raw_response: rawResponse || reportContent,
          formatted_report: reportContent,
          html_report: reportContent,
        })
      
      if (error) {
        console.error('Error saving report:', error)
        return NextResponse.json(
          { error: 'Failed to save report' }, 
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: 'Report saved successfully',
        action: 'created'
      })
    }
    
  } catch (error) {
    console.error('Exception saving report:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 