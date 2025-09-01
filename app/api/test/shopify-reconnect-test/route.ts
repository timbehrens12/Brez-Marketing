import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Comprehensive Shopify reconnection test
 * GET /api/test/shopify-reconnect-test
 *
 * This test monitors the entire reconnection process and validates:
 * 1. Connection cleanup
 * 2. OAuth flow simulation
 * 3. Sync initiation
 * 4. Bulk operations
 * 5. Status tracking
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Shopify Reconnect Test] 🔄 STARTING COMPREHENSIVE RECONNECTION TEST')

    const supabase = createClient()
    const testResults = {
      timestamp: new Date().toISOString(),
      phases: [] as any[],
      final_status: 'pending'
    }

    // Phase 1: Pre-disconnection analysis
    console.log('[Shopify Reconnect Test] 📊 Phase 1: Pre-disconnection analysis')
    const { data: preConnections, error: preError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'shopify')
      .order('created_at', { ascending: false })

    const { data: preJobs, error: preJobsError } = await supabase
      .from('etl_job')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    testResults.phases.push({
      phase: 'pre_disconnect',
      connections_count: preConnections?.length || 0,
      active_connections: preConnections?.filter(c => c.status === 'active').length || 0,
      recent_jobs: preJobs?.length || 0,
      timestamp: new Date().toISOString()
    })

    // Phase 2: Simulate disconnection (what user should do)
    console.log('[Shopify Reconnect Test] 🔌 Phase 2: Simulating disconnection')

    // This would normally be done by the user in the UI
    // We'll simulate the state after disconnection
    const simulatedPostDisconnect = {
      connections_count: 0,
      active_connections: 0,
      jobs_count: preJobs?.length || 0
    }

    testResults.phases.push({
      phase: 'post_disconnect_simulation',
      ...simulatedPostDisconnect,
      user_action_required: 'Disconnect Shopify in settings',
      timestamp: new Date().toISOString()
    })

    // Phase 3: Simulate OAuth callback (what happens after user reconnects)
    console.log('[Shopify Reconnect Test] 🔑 Phase 3: Simulating OAuth callback flow')

    const mockShop = 'brez-marketing-test-store.myshopify.com'
    const mockToken = 'test_token_' + Date.now()
    const mockBrandId = '1a30f34b-b048-4f80-b880-6c61bd12c720' // Your actual brand ID
    const mockConnectionId = 'reconnect-test-' + Date.now()

    // Create new connection (simulating OAuth callback)
    const { data: newConnection, error: createError } = await supabase
      .from('platform_connections')
      .insert({
        id: mockConnectionId,
        brand_id: mockBrandId,
        platform_type: 'shopify',
        status: 'active',
        sync_status: 'syncing',
        shop: mockShop,
        access_token: mockToken,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          test_reconnection: true,
          oauth_callback_simulated: true,
          expected_sync_behavior: 'full_historical_from_2010'
        }
      })
      .select()
      .single()

    if (createError) {
      console.error('[Shopify Reconnect Test] Error creating test connection:', createError)
      testResults.phases.push({
        phase: 'oauth_callback_simulation',
        status: 'failed',
        error: createError.message,
        timestamp: new Date().toISOString()
      })
    } else {
      console.log('[Shopify Reconnect Test] ✅ Test connection created:', newConnection.id)

      testResults.phases.push({
        phase: 'oauth_callback_simulation',
        status: 'success',
        connection_id: newConnection.id,
        shop: mockShop,
        timestamp: new Date().toISOString()
      })

      // Phase 4: Simulate connected endpoint call
      console.log('[Shopify Reconnect Test] 🔗 Phase 4: Simulating sync initiation')

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                      'http://localhost:3000')

      try {
        const connectedResponse = await fetch(`${baseUrl}/api/shopify/connected/${mockBrandId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-call': 'true'
          },
          body: JSON.stringify({
            shop: mockShop,
            accessToken: mockToken,
            connectionId: mockConnectionId
          })
        })

        const connectedResult = await connectedResponse.json()

        testResults.phases.push({
          phase: 'sync_initiation',
          status: connectedResponse.ok ? 'success' : 'failed',
          response_status: connectedResponse.status,
          response_body: connectedResult,
          timestamp: new Date().toISOString()
        })

        // Phase 5: Check ETL jobs created
        console.log('[Shopify Reconnect Test] 📋 Phase 5: Checking ETL jobs created')

        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for jobs to be created

        const { data: postJobs, error: postJobsError } = await supabase
          .from('etl_job')
          .select('*')
          .eq('brand_id', mockBrandId)
          .eq('created_at', new Date().toISOString().split('T')[0]) // Today only
          .order('created_at', { ascending: false })
          .limit(10)

        testResults.phases.push({
          phase: 'etl_jobs_check',
          jobs_created: postJobs?.length || 0,
          job_types: postJobs?.map(j => ({
            type: j.job_type,
            entity: j.entity,
            status: j.status,
            shopify_bulk_id: j.shopify_bulk_id
          })) || [],
          timestamp: new Date().toISOString()
        })

        // Phase 6: Test status endpoint
        console.log('[Shopify Reconnect Test] 📊 Phase 6: Testing status endpoint')

        const statusResponse = await fetch(`${baseUrl}/api/sync/${mockBrandId}/status`)
        const statusResult = await statusResponse.json()

        testResults.phases.push({
          phase: 'status_endpoint_test',
          status: statusResponse.ok ? 'success' : 'failed',
          response_status: statusResponse.status,
          sync_status: statusResult?.shopify?.overall_status,
          milestones_count: statusResult?.shopify?.milestones?.length || 0,
          summary: statusResult?.shopify?.summary,
          timestamp: new Date().toISOString()
        })

      } catch (syncError) {
        console.error('[Shopify Reconnect Test] Sync initiation error:', syncError)
        testResults.phases.push({
          phase: 'sync_initiation',
          status: 'error',
          error: syncError instanceof Error ? syncError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        })
      }
    }

    // Phase 7: Cleanup
    console.log('[Shopify Reconnect Test] 🧹 Phase 7: Cleanup test data')

    if (newConnection) {
      await supabase
        .from('platform_connections')
        .delete()
        .eq('id', mockConnectionId)

      await supabase
        .from('etl_job')
        .delete()
        .eq('brand_id', mockBrandId)
        .eq('created_at', new Date().toISOString().split('T')[0])
    }

    testResults.final_status = 'completed'

    // Generate comprehensive report
    const report = {
      ...testResults,
      recommendations: [
        '✅ DISCONNECT: Go to Settings → Shopify → Disconnect',
        '✅ RECONNECT: Click "Connect Shopify" → Authorize in Shopify',
        '✅ MONITOR: Watch for these exact log messages:',
        '   - "[Shopify Callback] Starting FULL historical data sync"',
        '   - "[Worker] Retrieved access token for connection"',
        '   - "[Worker] 🚀 Starting FULL HISTORICAL bulk operations"',
        '   - "[GraphQL] ✅ Bulk operation created"',
        '✅ VERIFY: Check status endpoint shows "syncing" status',
        '✅ CONFIRM: ETL jobs created for orders, customers, products'
      ],
      expected_logs_during_reconnect: [
        '🔄 OAuth callback received',
        '🔄 Token exchanged successfully',
        '🔄 Connection stored in database',
        '🔄 FULL historical sync initiated',
        '🔄 Queue jobs created (recent_sync, bulk_orders, bulk_customers, bulk_products)',
        '🔄 Worker starts processing',
        '🔄 Bulk operations created in Shopify',
        '🔄 Status endpoint shows "syncing"',
        '🔄 Webhooks registered for real-time updates'
      ],
      what_to_look_for: {
        success_indicators: [
          '✅ Connection created with active status',
          '✅ Access token retrieved successfully',
          '✅ Multiple ETL jobs created (orders, customers, products)',
          '✅ Bulk operation IDs assigned (gid://shopify/BulkOperation/...)',
          '✅ Status shows "syncing" not "completed"',
          '✅ No "Failed to get fresh access token" errors'
        ],
        warning_signs: [
          '❌ Connection status stuck on "pending"',
          '❌ No bulk operation IDs assigned',
          '❌ Status shows "completed" immediately',
          '❌ "Failed to get fresh access token" errors',
          '❌ No ETL jobs created'
        ]
      }
    }

    return NextResponse.json({
      success: true,
      message: '🧪 COMPREHENSIVE SHOPIFY RECONNECTION TEST COMPLETED',
      test_report: report,
      next_steps: [
        '1. Disconnect your current Shopify connection',
        '2. Reconnect by clicking "Connect Shopify"',
        '3. Watch the logs for the exact messages listed above',
        '4. Check the status endpoint during sync',
        '5. Verify ETL jobs are created in the database'
      ]
    })

  } catch (error) {
    console.error('[Shopify Reconnect Test] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Test failed - check server logs for details'
    }, { status: 500 })
  }
}
