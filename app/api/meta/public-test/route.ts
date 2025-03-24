import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Completely public test endpoint
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get the brand ID from query params
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    console.log('PUBLIC TEST: Testing Meta connection for brand ID:', brandId)

    // Get the access token from the database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Log all platform connections for debugging
    const { data: allConnections } = await supabase
      .from('platform_connections')
      .select('*')
    
    console.log('All platform connections:', allConnections)

    if (!allConnections || allConnections.length === 0) {
      return NextResponse.json({ 
        error: 'No connections found in database',
        brandId: brandId
      }, { status: 404 })
    }

    // Try to find the specific connection
    const { data: connection, error: dbError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError,
        allConnections: allConnections
      }, { status: 500 })
    }

    if (!connection) {
      console.error('No connection found for brand ID:', brandId)
      return NextResponse.json({ 
        error: 'No active Meta connection found',
        brandId: brandId,
        allConnections: allConnections
      }, { status: 404 })
    }

    console.log('Found connection:', connection)

    // Fetch basic account info from Meta
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name,accounts&access_token=${connection.access_token}`
      )
      
      const data = await response.json()
      console.log('Meta API response:', data)
      
      if (data.error) {
        return NextResponse.json({
          error: 'Meta API error',
          details: data.error,
          connection_id: connection.id
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        success: true,
        meta_user_id: data.id,
        meta_user_name: data.name,
        accounts: data.accounts,
        connection_id: connection.id,
        connection_details: connection
      })
    } catch (apiError) {
      console.error('Meta API error:', apiError)
      return NextResponse.json({
        error: 'Meta API request failed',
        details: apiError.message,
        connection_id: connection.id
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
} 