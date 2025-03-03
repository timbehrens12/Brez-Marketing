import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { code, state } = await request.json()
    
    if (!code || !state) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Exchange code for token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    tokenUrl.searchParams.append('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.append('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.append('code', code)
    tokenUrl.searchParams.append('redirect_uri', 'https://www.brezmarketingdashboard.com/settings/meta-callback')

    console.log('Exchanging code for token with URL:', tokenUrl.toString())
    
    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      console.error('Token exchange failed:', tokenData)
      return NextResponse.json(
        { success: false, error: 'Failed to get access token' },
        { status: 400 }
      )
    }

    console.log('Got access token, storing in database')

    // Store in database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // First check if there's a pending connection
    const { data: pendingConnections } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', state)
      .eq('platform_type', 'meta')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    if (pendingConnections && pendingConnections.length > 0) {
      // Update the pending connection
      const { error: updateError } = await supabase
        .from('platform_connections')
        .update({
          access_token: tokenData.access_token,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', pendingConnections[0].id)

      if (updateError) {
        console.error('Error updating connection:', updateError)
        return NextResponse.json(
          { success: false, error: 'Failed to update connection' },
          { status: 500 }
        )
      }
    } else {
      // Create a new connection if no pending one exists
      const { error: insertError } = await supabase
        .from('platform_connections')
        .upsert({
          brand_id: state,
          platform_type: 'meta',
          access_token: tokenData.access_token,
          status: 'active',
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Error creating connection:', insertError)
        return NextResponse.json(
          { success: false, error: 'Failed to store token' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Exchange error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
} 