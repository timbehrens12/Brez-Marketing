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
      const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${access_token}&fields=id,name,account_status`)
      const meData = await meResponse.json()
      const accountId = meData.data?.[0]?.id || ''
      
      // Update connection with account metadata
      await supabase
        .from('platform_connections')
        .update({
          metadata: {
            ad_account_id: accountId,
            account_name: meData.data?.[0]?.name || 'Unknown Account'
          }
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
        console.log(`[Meta Complete] Started demographics sync: ${demographicsResult.jobsCreated} jobs created`)
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