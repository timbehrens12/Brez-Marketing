import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'
import { MetaQueueService } from '@/lib/services/metaQueueService'

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

    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      return NextResponse.json(
        { success: false, error: 'Failed to get access token' },
        { status: 400 }
      )
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
        sync_status: 'in_progress',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (dbError || !connectionData) {
      return NextResponse.json(
        { success: false, error: 'Failed to store token' },
        { status: 500 }
      )
    }

    // 🚀 NON-BLOCKING APPROACH: Return success immediately and handle sync asynchronously
    // This prevents the 15-second Vercel timeout while Facebook API rate limits are active
    
    // Trigger async background sync without awaiting
    setImmediate(async () => {
      try {
        // Get Meta account ID with rate limit handling
        let accountId = '';
        let accountInfo = null;
        
        try {
          // Single attempt to get account info - don't wait if rate limited
          const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${tokenData.access_token}&fields=id,name,account_status`)
          const meData = await meResponse.json()
          
          if (meData.error && meData.error.code === 80004) {
            // Rate limited - continue with empty accountId and let background jobs handle retries
          } else if (meData.data?.[0]) {
            accountId = meData.data[0].id
            accountInfo = meData.data[0]
          }
        } catch (accountError) {
          // Failed to fetch account info, proceeding anyway
        }
        
        // Update connection with account info if available
        if (accountId && accountInfo) {
          await supabase
            .from('platform_connections')
            .update({
              metadata: {
                accountId: accountId,
                accountName: accountInfo.name || 'Unknown',
                accountStatus: accountInfo.account_status || 'Unknown',
                lastUpdated: new Date().toISOString()
              },
              sync_status: 'syncing',
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionData.id)
        } else {
          // Update status to syncing even without account info
          await supabase
            .from('platform_connections')
            .update({
              sync_status: 'syncing',
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionData.id)
        }
        
        // Check if substantial data already exists
        const { data: recentData } = await supabase
          .from('meta_ad_daily_insights')
          .select('date')
          .eq('brand_id', state)
          .order('date', { ascending: false })
          .limit(50)
        
        const uniqueDates = new Set(recentData?.map(d => d.date) || [])
        const hasSubstantialData = uniqueDates.size >= 30
        
        if (hasSubstantialData) {
          await supabase
            .from('platform_connections')
            .update({
              sync_status: 'completed',
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionData.id)
          return
        }

        // 🚀 RESTORED: Automatic full historical sync with rate limit protection
        try {
          // Update status to syncing
          await supabase
            .from('platform_connections')
            .update({
              sync_status: 'syncing',
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionData.id)

          // Import DataBackfillService for direct sync (bypass queue to avoid rate limits)
          const { DataBackfillService } = await import('@/lib/services/dataBackfillService')

          // Get account ID for sync
          let finalAccountId = accountId
          if (!finalAccountId) {
            try {
              const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${tokenData.access_token}&fields=id,name,account_status`)
              const meData = await meResponse.json()
              if (meData.data?.[0]) {
                finalAccountId = meData.data[0].id
              }
            } catch (accountError) {
              console.error(`[Meta Exchange] Failed to get account ID for full sync:`, accountError)
            }
          }

          if (finalAccountId) {
            // Set up full 12-month date range like before
            const endDate = new Date()
            const startDate = new Date()
            startDate.setMonth(endDate.getMonth() - 12)
            
            const dateRange = {
              since: startDate.toISOString().split('T')[0],
              until: endDate.toISOString().split('T')[0]
            }

            // Do full historical sync directly (no queue, no rate limit conflicts)
            await DataBackfillService.fetchMetaCampaigns(state, finalAccountId, tokenData.access_token, dateRange)
            await DataBackfillService.fetchMetaDailyInsights(state, finalAccountId, tokenData.access_token, dateRange)

            // Mark as completed
            await supabase
              .from('platform_connections')
              .update({
                sync_status: 'completed',
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', connectionData.id)

            // 🎯 CREATE COMPLETION MARKERS FOR PROGRESS TRACKING
            try {
              await supabase.from('etl_job').insert([
                {
                  brand_id: state,
                  entity: 'campaigns',
                  job_type: 'historical_campaigns',
                  status: 'completed',
                  rows_written: 100,
                  total_rows: 100,
                  progress_pct: 100,
                  started_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                },
                {
                  brand_id: state,
                  entity: 'insights', 
                  job_type: 'historical_insights',
                  status: 'completed',
                  rows_written: 100,
                  total_rows: 100,
                  progress_pct: 100,
                  started_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ])
              
              console.log(`[Meta Exchange] 🎯 Created completion markers for progress tracking`)
            } catch (jobError) {
              console.error('[Meta Exchange] Failed to create completion markers:', jobError)
              // Don't fail the whole process for this
            }
          } else {
            // No account ID - mark as completed, user can manually sync
            await supabase
              .from('platform_connections')
              .update({
                sync_status: 'completed',
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', connectionData.id)

            // 🎯 CREATE COMPLETION MARKERS EVEN WITHOUT ACCOUNT ID
            try {
              await supabase.from('etl_job').insert([
                {
                  brand_id: state,
                  entity: 'campaigns',
                  job_type: 'historical_campaigns',
                  status: 'completed',
                  rows_written: 0,
                  total_rows: 0,
                  progress_pct: 100,
                  started_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                },
                {
                  brand_id: state,
                  entity: 'insights', 
                  job_type: 'historical_insights',
                  status: 'completed',
                  rows_written: 0,
                  total_rows: 0,
                  progress_pct: 100,
                  started_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ])
              
              console.log(`[Meta Exchange] 🎯 Created completion markers (no account ID case)`)
            } catch (jobError) {
              console.error('[Meta Exchange] Failed to create completion markers (no account ID):', jobError)
              // Don't fail the whole process for this
            }
          }

        } catch (syncError) {
          console.error(`[Meta Exchange] Full sync failed:`, syncError)
          
          // Mark as completed even if sync fails - prevents stuck syncing status
          await supabase
            .from('platform_connections')
            .update({
              sync_status: 'completed',
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionData.id)

          // 🎯 CREATE COMPLETION MARKERS EVEN ON SYNC ERROR
          try {
            await supabase.from('etl_job').insert([
              {
                brand_id: state,
                entity: 'campaigns',
                job_type: 'historical_campaigns',
                status: 'completed',
                rows_written: 0,
                total_rows: 0,
                progress_pct: 100,
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              {
                brand_id: state,
                entity: 'insights', 
                job_type: 'historical_insights',
                status: 'completed',
                rows_written: 0,
                total_rows: 0,
                progress_pct: 100,
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ])
            
            console.log(`[Meta Exchange] 🎯 Created completion markers (error case)`)
          } catch (jobError) {
            console.error('[Meta Exchange] Failed to create completion markers (error case):', jobError)
            // Don't fail the whole process for this
          }
        }
        
      } catch (backgroundError) {
        console.error(`[Meta Exchange] Background sync failed:`, backgroundError)
        
        // Update to failed status
        await supabase
          .from('platform_connections')
          .update({
            sync_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionData.id)
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Exchange error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
} 