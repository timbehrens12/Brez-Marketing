import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Test endpoint to simulate first-time Shopify connection
 * GET /api/test/first-connection
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[First Connection Test] Starting first-time connection simulation...')

    const supabase = createClient()

    // 1. Check if we have any existing connections
    const { data: existingConnections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'shopify')
      .order('created_at', { ascending: false })
      .limit(5)

    if (connectionsError) {
      console.error('[First Connection Test] Error fetching connections:', connectionsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // 2. Simulate OAuth callback data
    const mockShop = 'test-shop.myshopify.com'
    const mockAccessToken = 'mock_access_token_' + Date.now()
    const mockBrandId = 'test-brand-' + Date.now()
    const mockConnectionId = 'test-connection-' + Date.now()

    // 3. Create a mock connection (simulating what settings flow would do)
    const { data: newConnection, error: createError } = await supabase
      .from('platform_connections')
      .insert({
        id: mockConnectionId,
        brand_id: mockBrandId,
        platform_type: 'shopify',
        status: 'pending',
        sync_status: 'pending',
        shop: null,
        access_token: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('[First Connection Test] Error creating connection:', createError)
      return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 })
    }

    console.log('[First Connection Test] Created mock connection:', newConnection.id)

    // 4. Simulate OAuth callback - update connection with token
    const { error: updateError } = await supabase
      .from('platform_connections')
      .update({
        shop: mockShop,
        access_token: mockAccessToken,
        status: 'active',
        sync_status: 'pending',
        updated_at: new Date().toISOString(),
        metadata: {
          shop_name: 'Test Shop',
          connected_at: new Date().toISOString(),
          first_connection_test: true
        }
      })
      .eq('id', mockConnectionId)

    if (updateError) {
      console.error('[First Connection Test] Error updating connection:', updateError)
      return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
    }

    // 5. Simulate calling the connected endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000')

    console.log('[First Connection Test] Calling connected endpoint...')

    const connectedResponse = await fetch(`${baseUrl}/api/shopify/connected/${mockBrandId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-call': 'true'
      },
      body: JSON.stringify({
        shop: mockShop,
        accessToken: mockAccessToken,
        connectionId: mockConnectionId
      })
    })

    let connectedResult
    try {
      connectedResult = await connectedResponse.json()
    } catch (e) {
      connectedResult = { error: 'Failed to parse response' }
    }

    // 6. Check if ETL jobs were created
    const { data: etlJobs, error: jobsError } = await supabase
      .from('etl_job')
      .select('*')
      .eq('brand_id', mockBrandId)
      .order('created_at', { ascending: false })
      .limit(10)

    // 7. Clean up test data
    await supabase
      .from('platform_connections')
      .delete()
      .eq('id', mockConnectionId)

    await supabase
      .from('etl_job')
      .delete()
      .eq('brand_id', mockBrandId)

    return NextResponse.json({
      success: true,
      message: 'First-time connection test completed',
      test_results: {
        existing_connections_count: existingConnections?.length || 0,
        mock_connection_created: !!newConnection,
        connection_updated: !updateError,
        connected_endpoint_called: connectedResponse.status,
        connected_response: connectedResult,
        etl_jobs_created: etlJobs?.length || 0,
        jobs_error: jobsError?.message,
        base_url_used: baseUrl
      }
    })

  } catch (error) {
    console.error('[First Connection Test] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
}
