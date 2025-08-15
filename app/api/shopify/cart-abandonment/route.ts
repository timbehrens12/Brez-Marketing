import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!connectionId || !from || !to) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const supabase = createClient()

    // Verify user has access to this connection's brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('brand_id')
      .eq('id', connectionId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    // Check if user owns the brand or has shared access
    const { data: brand } = await supabase
      .from('brands')
      .select('user_id')
      .eq('id', connection.brand_id)
      .single()

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const isOwner = brand.user_id === userId
    let hasAccess = isOwner

    if (!isOwner) {
      const { data: accessCheck } = await supabase
        .from('brand_access')
        .select('role')
        .eq('brand_id', connection.brand_id)
        .eq('user_id', userId)
        .is('revoked_at', null)
        .single()

      hasAccess = !!accessCheck
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch draft orders (cart abandonment data)
    const { data: draftOrders, error } = await supabase
      .from('shopify_draft_orders_enhanced')
      .select('*')
      .eq('connection_id', connectionId)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching draft orders:', error)
      return NextResponse.json({ error: 'Failed to fetch cart abandonment data' }, { status: 500 })
    }

    // Calculate metrics
    const totalDrafts = draftOrders?.length || 0
    const abandonedCarts = draftOrders?.filter(draft => draft.status !== 'completed') || []
    const abandonmentRate = totalDrafts > 0 ? (abandonedCarts.length / totalDrafts) * 100 : 0
    
    const totalValue = draftOrders?.reduce((sum, draft) => sum + parseFloat(draft.total_price || '0'), 0) || 0
    const averageCartValue = totalDrafts > 0 ? totalValue / totalDrafts : 0
    const potentialRevenue = abandonedCarts.reduce((sum, draft) => sum + parseFloat(draft.total_price || '0'), 0)

    // Analyze most abandoned products
    const productMap = new Map()
    abandonedCarts.forEach(draft => {
      if (draft.line_items && Array.isArray(draft.line_items)) {
        draft.line_items.forEach((item: any) => {
          const title = item.title || 'Unknown Product'
          const quantity = parseInt(item.quantity) || 0
          const price = parseFloat(item.price) || 0
          
          if (!productMap.has(title)) {
            productMap.set(title, { title, quantity: 0, value: 0 })
          }
          
          const product = productMap.get(title)
          product.quantity += quantity
          product.value += price * quantity
        })
      }
    })

    const topAbandonedProducts = Array.from(productMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    return NextResponse.json({
      totalDrafts,
      abandonedCarts: abandonedCarts.length,
      abandonmentRate,
      averageCartValue,
      potentialRevenue,
      topAbandonedProducts
    })

  } catch (error) {
    console.error('Cart abandonment API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
