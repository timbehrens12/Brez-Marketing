import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a direct admin client that doesn't require authentication
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, shop, connectionId } = body
    
    console.log('Processing Shopify callback:', { 
      code: code?.substring(0, 5) + '...',
      shop, 
      connectionId
    })
    
    if (!code || !shop || !connectionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 })
    }
    
    // Exchange code for access token
    console.log('Exchanging code for access token')
    
    try {
      const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_CLIENT_ID,
          client_secret: process.env.SHOPIFY_CLIENT_SECRET,
          code,
        }),
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('Token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          body: errorText
        })
        return NextResponse.json({ 
          success: false, 
          error: 'Token exchange failed',
          details: errorText
        }, { status: 500 })
      }

      const tokenData = await tokenResponse.json()
      console.log('Got access token')
      
      // Update connection in database
      console.log('Updating connection in database')
      
      const { data: connection, error: updateError } = await supabaseAdmin
        .from('platform_connections')
        .update({
          status: 'active',
          shop,
          access_token: tokenData.access_token,
          metadata: {
            shop_url: `https://${shop}`
          }
        })
        .eq('id', connectionId)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update connection:', updateError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to update connection',
          details: updateError.message
        }, { status: 500 })
      }

      console.log('Connection updated successfully')
      
      // Trigger initial sync
      console.log('Triggering initial sync')
      
      try {
        // First, trigger a general Shopify sync
        const syncResponse = await fetch(new URL('/api/shopify/sync', request.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ connectionId })
        })

        if (!syncResponse.ok) {
          console.error('Failed to trigger initial sync')
          // Continue anyway, this is not critical
        } else {
          console.log('Initial sync triggered successfully')
        }
        
        // Now explicitly trigger inventory sync with forced refresh
        const inventoryResponse = await fetch(new URL('/api/shopify/inventory/sync', request.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            connectionId,
            forceRefresh: true 
          })
        })
        
        if (!inventoryResponse.ok) {
          console.error('Failed to trigger inventory sync')
          // Continue anyway, this is not critical
        } else {
          console.log('Inventory sync triggered successfully')
        }
      } catch (syncError) {
        console.error('Error triggering sync:', syncError)
        // Continue anyway, this is not critical
      }

      return NextResponse.json({ 
        success: true,
        message: 'Shopify connection successful',
        connectionId: connection.id
      })
      
    } catch (error) {
      console.error('Error processing callback:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Error processing callback',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Unhandled error in callback processing:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Unhandled error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 