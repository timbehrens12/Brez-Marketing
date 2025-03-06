import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    console.log('Received Web Pixel event:', data)
    
    // Validate the request
    if (!data.event || !data.shop || !data.timestamp) {
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 })
    }
    
    // Get connection ID for this shop
    const { data: connections, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id, brand_id')
      .eq('shop', data.shop)
      .eq('status', 'active')
    
    if (connectionError) {
      console.error('Error fetching connection:', connectionError)
      return NextResponse.json({ 
        error: 'Error fetching connection', 
        details: connectionError.message 
      }, { status: 500 })
    }
    
    if (!connections || connections.length === 0) {
      console.error('No connection found for shop:', data.shop)
      return NextResponse.json({ 
        error: 'No connection found', 
        details: 'No active connection found for this shop' 
      }, { status: 404 })
    }
    
    const connection = connections[0]
    
    // Process the event based on its type
    switch (data.event) {
      case 'page_viewed':
        await processPageView(data, connection)
        break
      case 'product_viewed':
        await processProductView(data, connection)
        break
      case 'checkout_started':
        await processCheckoutStarted(data, connection)
        break
      // Add more event types as needed
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing Web Pixel event:', error)
    return NextResponse.json({ 
      error: 'Failed to process event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Process page view events
async function processPageView(data: any, connection: any) {
  const date = new Date(data.timestamp).toISOString().split('T')[0]
  
  // Check if we already have a record for this date
  const { data: existingRecord, error: fetchError } = await supabase
    .from('shopify_sessions')
    .select('*')
    .eq('connection_id', connection.id.toString())
    .eq('date', date)
    .single()
  
  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
    console.error('Error fetching existing session record:', fetchError)
    throw fetchError
  }
  
  if (existingRecord) {
    // Update existing record
    const { error: updateError } = await supabase
      .from('shopify_sessions')
      .update({
        session_count: existingRecord.session_count + 1,
        // We don't increment unique_visitors here because we need to check if this is a new visitor
        // This would require storing visitor IDs or using cookies
        last_updated: new Date().toISOString()
      })
      .eq('id', existingRecord.id)
    
    if (updateError) {
      console.error('Error updating session record:', updateError)
      throw updateError
    }
  } else {
    // Create new record
    const { error: insertError } = await supabase
      .from('shopify_sessions')
      .insert({
        connection_id: connection.id.toString(),
        brand_id: connection.brand_id.toString(),
        date,
        session_count: 1,
        unique_visitors: 1, // Assume first visitor is unique
        bounce_rate: 0, // Will be calculated later
        avg_session_duration: 0 // Will be calculated later
      })
    
    if (insertError) {
      console.error('Error inserting session record:', insertError)
      throw insertError
    }
  }
}

// Process product view events
async function processProductView(data: any, connection: any) {
  // Implement product view tracking
  console.log('Processing product view:', data)
}

// Process checkout started events
async function processCheckoutStarted(data: any, connection: any) {
  // Implement checkout tracking
  console.log('Processing checkout started:', data)
}

// GET endpoint to check if the pixel is installed
export async function GET(request: Request) {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Shopify Web Pixel endpoint is active'
  })
} 