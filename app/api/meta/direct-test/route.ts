import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

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
    
    if (!allConnections || allConnections.length === 0) {
      return NextResponse.json({ 
        error: 'No connections found in database',
        brandId: brandId
      })
    }

    // Try to find the specific connection
    const metaConnection = allConnections.find(
      conn => conn.brand_id === brandId && conn.platform_type === 'meta' && conn.status === 'active'
    )

    if (!metaConnection) {
      return NextResponse.json({ 
        error: 'No active Meta connection found',
        brandId: brandId,
        allConnections: allConnections.map(c => ({
          id: c.id,
          brand_id: c.brand_id,
          platform_type: c.platform_type,
          status: c.status
        }))
      })
    }

    // Fetch basic account info from Meta
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name,accounts&access_token=${metaConnection.access_token}`
      )
      
      const data = await response.json()
      
      if (data.error) {
        return NextResponse.json({
          error: 'Meta API error',
          details: data.error,
          connection_id: metaConnection.id
        })
      }
      
      return NextResponse.json({ 
        success: true,
        meta_user_id: data.id,
        meta_user_name: data.name,
        accounts: data.accounts,
        connection_id: metaConnection.id
      })
    } catch (apiError: unknown) {
      return NextResponse.json({
        error: 'Meta API request failed',
        details: typeof apiError === 'object' && apiError !== null && 'message' in apiError 
          ? (apiError.message as string) 
          : 'Unknown error',
        connection_id: metaConnection.id
      })
    }

  } catch (error: unknown) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    })
  }
} 