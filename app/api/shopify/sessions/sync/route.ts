import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { addDays, format, subDays } from 'date-fns'

export async function POST(request: Request) {
  try {
    const { connectionId } = await request.json()
    
    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 })
    }
    
    console.log(`Syncing sessions data for connection: ${connectionId}`)
    
    // Get connection details - ensure connectionId is properly handled
    try {
      // First, validate that connectionId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(connectionId)) {
        console.error('Invalid UUID format for connectionId:', connectionId)
        return NextResponse.json({ 
          error: 'Invalid connection ID format', 
          details: 'Connection ID must be a valid UUID'
        }, { status: 400 })
      }
      
      const { data: connection, error: connectionError } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('id', connectionId)
        .single()
      
      if (connectionError || !connection) {
        console.error('Error fetching connection:', connectionError)
        return NextResponse.json({ 
          error: 'Connection not found', 
          details: connectionError?.message 
        }, { status: 404 })
      }
      
      // Calculate date range (last 30 days)
      const endDate = new Date()
      const startDate = subDays(endDate, 30)
      
      console.log(`Fetching sessions data from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`)
      
      // In a real implementation, you would fetch this data from Shopify Analytics API
      // For now, we'll generate some sample data for demonstration
      const sessionData = []
      let currentDate = startDate
      
      while (currentDate <= endDate) {
        // In a real implementation, this would be actual data from Shopify
        // For now, we'll just generate random data for demonstration
        const sessionCount = Math.floor(Math.random() * 500) + 100
        const uniqueVisitors = Math.floor(sessionCount * (0.7 + Math.random() * 0.2))
        const bounceRate = 30 + Math.random() * 20
        const avgSessionDuration = Math.floor(Math.random() * 180) + 60
        
        sessionData.push({
          connection_id: connection.id, // Use the UUID from the connection object
          brand_id: connection.brand_id,
          date: format(currentDate, 'yyyy-MM-dd'),
          session_count: sessionCount,
          unique_visitors: uniqueVisitors,
          bounce_rate: bounceRate,
          avg_session_duration: avgSessionDuration
        })
        
        currentDate = addDays(currentDate, 1)
      }
      
      console.log(`Generated ${sessionData.length} session records`)
      
      // In a real implementation, you would upsert the data to avoid duplicates
      // For now, we'll delete existing data for this date range and insert new data
      const { error: deleteError } = await supabase
        .from('shopify_sessions')
        .delete()
        .eq('connection_id', connection.id) // Use the UUID from the connection object
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
      
      if (deleteError) {
        console.error('Error deleting existing sessions data:', deleteError)
        return NextResponse.json({ 
          error: 'Failed to delete existing sessions data', 
          details: deleteError.message 
        }, { status: 500 })
      }
      
      // Insert new data
      const { error: insertError } = await supabase
        .from('shopify_sessions')
        .insert(sessionData)
      
      if (insertError) {
        console.error('Error inserting sessions data:', insertError)
        return NextResponse.json({ 
          error: 'Failed to insert sessions data', 
          details: insertError.message 
        }, { status: 500 })
      }
      
      console.log('Sessions data synced successfully')
      
      return NextResponse.json({ 
        success: true, 
        message: 'Sessions data synced successfully',
        count: sessionData.length
      })
    } catch (error) {
      console.error('Error in database operations:', error)
      return NextResponse.json({ 
        error: 'Database operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error syncing sessions data:', error)
    return NextResponse.json({ 
      error: 'Failed to sync sessions data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 