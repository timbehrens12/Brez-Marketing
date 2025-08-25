import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

// Link a Shopify store to the current user account
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { shop, brandId } = await request.json()

    if (!shop) {
      return NextResponse.json({ error: 'Shop domain is required' }, { status: 400 })
    }

    console.log('[Shopify Link] Linking shop to user:', { shop, userId, brandId })

    const supabase = createClient()

    // Find the unlinked Shopify connection
    const { data: connection, error: findError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'shopify')
      .eq('shop', shop)
      .eq('status', 'connected')
      .single()

    if (findError || !connection) {
      console.error('[Shopify Link] Connection not found:', findError)
      return NextResponse.json({ 
        error: 'Shopify store not found or already linked' 
      }, { status: 404 })
    }

    // Link the connection to the user
    const { error: updateError } = await supabase
      .from('platform_connections')
      .update({
        user_id: userId,
        brand_id: brandId,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    if (updateError) {
      console.error('[Shopify Link] Error linking connection:', updateError)
      return NextResponse.json({ error: 'Failed to link store' }, { status: 500 })
    }

    console.log('[Shopify Link] Successfully linked shop to user')

    return NextResponse.json({ 
      success: true,
      connection: {
        ...connection,
        user_id: userId,
        brand_id: brandId
      }
    })

  } catch (error) {
    console.error('[Shopify Link] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to link store' 
    }, { status: 500 })
  }
}