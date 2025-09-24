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

    console.log(`[Meta Exchange Simple] Starting auth exchange for brand ${state}`)

    // Exchange code for token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    tokenUrl.searchParams.append('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.append('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.append('code', code)
    tokenUrl.searchParams.append('redirect_uri', 'https://www.brezmarketingdashboard.com/settings/meta-callback')

    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      return NextResponse.json(
        { success: false, error: 'Failed to get access token' },
        { status: 400 }
      )
    }

    console.log(`[Meta Exchange Simple] ✅ Got access token`)

    // Get account ID
    let accountId = ''
    try {
      const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${tokenData.access_token}&fields=id,name,account_status`)
      const meData = await meResponse.json()
      if (meData.data?.[0]) {
        accountId = meData.data[0].id
        console.log(`[Meta Exchange Simple] ✅ Got account ID: ${accountId}`)
      }
    } catch (accountError) {
      console.warn(`[Meta Exchange Simple] Failed to get account ID:`, accountError)
    }

    // Store in database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: connectionData, error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        brand_id: state,
        platform_type: 'meta',
        access_token: tokenData.access_token,
        status: 'active',
        user_id: userId,
        sync_status: 'completed', // Mark as completed immediately to prevent stuck UI
        metadata: accountId ? { ad_account_id: accountId } : {},
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (dbError || !connectionData) {
      console.error(`[Meta Exchange Simple] Database error:`, dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to store connection' },
        { status: 500 }
      )
    }

    console.log(`[Meta Exchange Simple] ✅ Stored connection with ID: ${connectionData.id}`)

    // 🚀 TRIGGER BACKGROUND SYNC: Call the full 12-month sync endpoint
    const triggerBackgroundSync = async () => {
      try {
        console.log(`[Meta Exchange Simple] Triggering SMART gap-filling sync (much faster than 73 background jobs!)`)
        
        // Make internal call to the SMART gap-filling sync (much faster!)
        const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'}/api/meta/smart-historical-sync`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`
          },
          body: JSON.stringify({ brandId: state })
        })

        const syncResult = await syncResponse.json()
        
        if (syncResult.success) {
          console.log(`[Meta Exchange Simple] ✅ Background sync completed successfully`)
          console.log(`[Meta Exchange Simple] Sync stats:`, syncResult.result)
        } else {
          console.error(`[Meta Exchange Simple] ❌ Background sync failed:`, syncResult.error)
        }
      } catch (syncError) {
        console.error(`[Meta Exchange Simple] ❌ Background sync call failed:`, syncError)
      }
    }

    // Trigger background sync without awaiting
    triggerBackgroundSync().catch(error => {
      console.error('[Meta Exchange Simple] Background sync trigger failed:', error)
    })

    console.log(`[Meta Exchange Simple] ✅ Auth exchange completed, background sync triggered`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Meta Exchange Simple] Exchange error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}