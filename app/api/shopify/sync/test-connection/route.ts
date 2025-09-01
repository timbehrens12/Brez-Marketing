import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { shop, brandId } = await request.json()

    if (!shop || !brandId) {
      return NextResponse.json({ error: 'Shop and brandId are required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'shopify')
      .eq('shop', shop)
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ 
        error: 'No Shopify connection found',
        details: {
          shop,
          brandId,
          userId,
          connectionError: connectionError?.message
        }
      }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Connection found successfully',
      connection: {
        id: connection.id,
        shop: connection.shop,
        brand_id: connection.brand_id,
        status: connection.status,
        platform_type: connection.platform_type
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json({ 
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
