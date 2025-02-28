import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

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

    // Get the Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active Meta connection found',
        details: connectionError
      })
    }

    // Test the connection by fetching basic user info
    const userResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${connection.access_token}`
    )
    
    const userData = await userResponse.json()
    
    if (userData.error) {
      return NextResponse.json({
        success: false,
        error: 'Meta API error',
        details: userData.error
      })
    }

    // Test fetching ad accounts
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_id&access_token=${connection.access_token}`
    )
    
    const accountsData = await accountsResponse.json()
    
    const hasAccounts = !accountsData.error && accountsData.data && accountsData.data.length > 0

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        created_at: connection.created_at,
        status: connection.status
      },
      user: userData,
      hasAdAccounts: hasAccounts,
      adAccounts: hasAccounts ? accountsData.data : [],
      message: hasAccounts 
        ? `Found ${accountsData.data.length} ad accounts` 
        : "Connection is working, but no ad accounts found"
    })
  } catch (error) {
    console.error('Error in diagnose endpoint:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
} 