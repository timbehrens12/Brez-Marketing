import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get brandId from query parameters
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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
        error: 'No active Meta connection found',
        details: connectionError
      }, { status: 404 })
    }
    
    // Check if we already have data in the meta_ad_insights table
    const { data: existingData, error: existingDataError } = await supabase
      .from('meta_ad_insights')
      .select('id')
      .eq('brand_id', brandId)
      .limit(1)
    
    // Fetch ad accounts to verify the connection
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_id,account_status&access_token=${connection.access_token}`
    )
    
    const accountsData = await accountsResponse.json()
    
    if (accountsData.error) {
      return NextResponse.json({ 
        error: 'Error fetching Meta ad accounts',
        details: accountsData.error,
        connection_exists: !!connection,
        connection_id: connection.id,
        connection_status: connection.status
      }, { status: 500 })
    }
    
    // If accounts exist, try to fetch a campaign from the first account
    let campaignData = null
    
    if (accountsData.data && accountsData.data.length > 0) {
      const account = accountsData.data[0]
      
      const campaignsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${account.id}/campaigns?fields=id,name,status,objective,created_time&access_token=${connection.access_token}`
      )
      
      campaignData = await campaignsResponse.json()
    }
    
    // Return all diagnostic information
    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        status: connection.status,
        platform_type: connection.platform_type,
        created_at: connection.created_at
      },
      existing_data: {
        has_data: existingData && existingData.length > 0,
        count: existingData ? existingData.length : 0
      },
      accounts: accountsData,
      campaigns: campaignData,
      message: "Diagnostic information retrieved successfully"
    })
    
  } catch (error) {
    console.error('Error in Meta diagnostics endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error' 
    }, { status: 500 })
  }
} 