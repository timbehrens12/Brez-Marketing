import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MetaQueueService } from '@/lib/services/metaQueueService'

export async function POST(request: NextRequest) {
  try {
    const { access_token, state, userId } = await request.json()

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
        access_token: access_token,
        status: 'active',
        user_id: userId,
        sync_status: 'in_progress'
      })
      .select('id')
      .single()

    if (dbError || !connectionData) {
      throw dbError || new Error('No connection data returned')
    }

    // Get Meta account ID and trigger backfill + demographics sync automatically
    try {
      console.log(`[Meta Complete] Fetching account data with access token...`)
      const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${access_token}&fields=id,name,account_status`)
      const meData = await meResponse.json()
      
      console.log(`[Meta Complete] Meta API Response:`, meData)
      
      if (meData.error) {
        console.error(`[Meta Complete] Meta API Error:`, meData.error)
        throw new Error(`Meta API Error: ${meData.error.message}`)
      }
      
      const accountId = meData.data?.[0]?.id || ''
      const accountName = meData.data?.[0]?.name || 'Unknown Account'
      
      console.log(`[Meta Complete] Account ID: ${accountId}, Name: ${accountName}`)
      
      if (!accountId) {
        console.error(`[Meta Complete] No account ID found in response:`, meData)
        throw new Error('No Meta ad account found')
      }
      
      // Update connection with account metadata
      const metadataUpdate = {
        metadata: {
          ad_account_id: accountId,
          account_name: accountName,
          account_status: meData.data?.[0]?.account_status || 'unknown'
        }
      }
      
      console.log(`[Meta Complete] Updating metadata:`, metadataUpdate)
      
      const { error: metadataError } = await supabase
        .from('platform_connections')
        .update(metadataUpdate)
        .eq('id', connectionData.id)
      
      if (metadataError) {
        console.error(`[Meta Complete] Metadata update error:`, metadataError)
        throw metadataError
      }
      
      console.log(`[Meta Complete] ✅ Metadata updated successfully for connection ${connectionData.id}`)
      
      // Set connection to syncing status
      await supabase
        .from('platform_connections')
        .update({ 
          sync_status: 'in_progress',
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', connectionData.id)

      // Queue historical backfill (existing campaigns/ads data)
      await MetaQueueService.queueCompleteHistoricalSync(
        state,
        connectionData.id,
        access_token,
        accountId
      )
      
      // NEW: Start comprehensive demographics sync
      const { default: MetaDemographicsService } = await import('@/lib/services/metaDemographicsService')
      const demographicsService = new MetaDemographicsService()
      const demographicsResult = await demographicsService.startComprehensiveSync(state)
      
      if (demographicsResult.success) {
        console.log(`[Meta Complete] Started unified sync: campaigns + demographics (${demographicsResult.jobsCreated} jobs)`)
      } else {
        console.error(`[Meta Complete] Demographics sync failed: ${demographicsResult.message}`)
      }
      
      console.log(`[Meta Complete] Queued historical backfill for brand ${state}`)
    } catch (error) {
      console.error('[Meta Complete] Backfill queue failed:', error)
      // Don't fail the response, just log the error
    }

    return NextResponse.json({ success: true, redirect: '/settings?tab=brand-management&success=true&backfill=started' })
  } catch (error) {
    console.error('Complete error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 