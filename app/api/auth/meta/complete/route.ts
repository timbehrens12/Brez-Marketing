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
      
      // NEW: Start SIMPLE working demographics sync + ensure sync status is created
      console.log(`[Meta Complete] 🚀 Starting SIMPLE demographics sync (using old working method)...`)
      
      try {
        // FIRST: Create/reset the sync status record to prevent 63% stuck issue
        await supabase
          .from('meta_demographics_sync_status')
          .upsert({
            brand_id: state,
            overall_status: 'in_progress',
            progress_percentage: 0,
            days_completed: 0,
            total_days_target: 365,
            current_date_range_start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            current_date_range_end: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
        
        console.log(`[Meta Complete] ✅ Demographics sync status initialized`)
        
        // Import the working Meta service (same as the old working sync)
        const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
        
        // Use 12-month range for complete historical coverage like other syncs
        const endDate = new Date()
        const startDate = new Date()
        startDate.setFullYear(startDate.getFullYear() - 1)
        
        console.log(`[Meta Complete] 📊 Syncing demographics for last 12 months: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
        
        // Call the real Meta service with timeout protection (increased for 12-month sync)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Demographics sync timeout after 5 minutes')), 300000)
        )
        
        const demographicsResult = await Promise.race([
          fetchMetaAdInsights(state, startDate, endDate, false),
          timeoutPromise
        ]) as any
        
        if (demographicsResult.success) {
          console.log(`[Meta Complete] ✅ SIMPLE demographics sync successful!`)
          console.log(`[Meta Complete] Demographics result:`, demographicsResult)
          
          // Update sync status to completed
          await supabase
            .from('meta_demographics_sync_status')
            .update({
              overall_status: 'completed',
              progress_percentage: 100,
              days_completed: 365,
              updated_at: new Date().toISOString()
            })
            .eq('brand_id', state)
            
        } else {
          console.error(`[Meta Complete] ❌ Simple demographics sync failed:`, demographicsResult.error)
          
          // Update sync status to failed
          await supabase
            .from('meta_demographics_sync_status')
            .update({
              overall_status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('brand_id', state)
        }
        
      } catch (demographicsError) {
        console.error('[Meta Complete] Simple demographics sync error:', demographicsError)
        
        // Update sync status to failed
        try {
          await supabase
            .from('meta_demographics_sync_status')
            .update({
              overall_status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('brand_id', state)
        } catch (statusError) {
          console.error('[Meta Complete] Failed to update sync status:', statusError)
        }
        
        // Don't fail the OAuth flow if demographics fails
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