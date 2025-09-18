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

    // FIXED: Use separate insert/update to preserve existing metadata
    let connectionData;
    const { data: existingConnection } = await supabase
      .from('platform_connections')
      .select('id, metadata')
      .eq('brand_id', state)
      .eq('platform_type', 'meta')
      .single()

    if (existingConnection) {
      // Update existing connection, preserving metadata
      const { data: updatedConnection, error: updateError } = await supabase
        .from('platform_connections')
        .update({
          access_token: access_token,
          status: 'active',
          user_id: userId,
          sync_status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConnection.id)
        .select('id')
        .single()
      
      if (updateError) throw updateError
      connectionData = updatedConnection
    } else {
      // Create new connection
      const { data: newConnection, error: insertError } = await supabase
        .from('platform_connections')
        .insert({
          brand_id: state,
          platform_type: 'meta',
          access_token: access_token,
          status: 'active',
          user_id: userId,
          sync_status: 'in_progress'
        })
        .select('id')
        .single()
      
      if (insertError) throw insertError
      connectionData = newConnection
    }

    if (!connectionData) {
      throw new Error('No connection data returned')
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
        console.log(`[Meta Complete] Creating demographics sync status for account ${accountId}...`)
        
        // Remove any existing sync status first
        await supabase
          .from('meta_demographics_sync_status')
          .delete()
          .eq('brand_id', state)
        
        // Create new sync status record with all required fields
        const { error: syncStatusError } = await supabase
          .from('meta_demographics_sync_status')
          .insert({
            brand_id: state,
            connection_id: connectionData.id,
            account_id: accountId.replace('act_', ''), // Remove act_ prefix
            overall_status: 'in_progress',
            days_completed: 0,
            total_days_target: 365,
            current_phase: 'historical',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (syncStatusError) {
          console.error(`[Meta Complete] Failed to create sync status:`, syncStatusError)
          throw syncStatusError
        }
        
        console.log(`[Meta Complete] ✅ Demographics sync status initialized for account ${accountId}`)
        
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
              days_completed: 365,
              completed_at: new Date().toISOString(),
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
              last_error_message: demographicsResult.error || 'Demographics sync failed',
              last_error_at: new Date().toISOString(),
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
              last_error_message: demographicsError.message || 'Demographics sync exception',
              last_error_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('brand_id', state)
        } catch (statusError) {
          console.error('[Meta Complete] Failed to update sync status:', statusError)
        }
        
        // Don't fail the OAuth flow if demographics fails
      }
      
      console.log(`[Meta Complete] Queued historical backfill for brand ${state}`)
      
      // FINAL STEP: Mark the connection sync as fully completed
      await supabase
        .from('platform_connections')
        .update({ 
          sync_status: 'completed',
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', connectionData.id)
        
    } catch (error) {
      console.error('[Meta Complete] Backfill queue failed:', error)
      // Re-throw the error to ensure the client knows the process failed
      throw new Error(`Failed to queue backfill jobs: ${error.message}`)
    }

    return NextResponse.json({ success: true, redirect: '/settings?tab=brand-management&success=true&backfill=started' })
  } catch (error) {
    console.error('Complete error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 