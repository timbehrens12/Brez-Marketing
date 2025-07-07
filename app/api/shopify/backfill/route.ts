import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/utils/unified-supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, startDate, endDate, storeUrl, accessToken } = await request.json()
    
    if (!userId || !startDate || !endDate || !storeUrl || !accessToken) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    console.log('🔄 Starting Shopify backfill for', startDate, 'to', endDate)
    
    const supabase = await getAuthenticatedSupabaseClient()
    
    // Fetch historical orders from Shopify API
    const shopifyUrl = `https://${storeUrl}/admin/api/2023-10/orders.json`
    const params = new URLSearchParams({
      created_at_min: `${startDate}T00:00:00Z`,
      created_at_max: `${endDate}T23:59:59Z`,
      status: 'any',
      limit: '250'
    })
    
    const response = await fetch(`${shopifyUrl}?${params}`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('Shopify API error:', await response.text())
      return NextResponse.json({ error: 'Failed to fetch from Shopify API' }, { status: 500 })
    }
    
    const data = await response.json()
    
    if (!data.orders || data.orders.length === 0) {
      console.log('No Shopify orders found for the specified date range')
      return NextResponse.json({ success: true, records_created: 0 })
    }
    
    // Process and insert orders into Supabase
    const recordsToInsert = data.orders.map((order: any) => ({
      user_id: userId,
      shopify_order_id: order.id.toString(),
      order_number: order.order_number,
      total_price: parseFloat(order.total_price) || 0,
      subtotal_price: parseFloat(order.subtotal_price) || 0,
      total_tax: parseFloat(order.total_tax) || 0,
      total_discounts: parseFloat(order.total_discounts) || 0,
      currency: order.currency,
      financial_status: order.financial_status,
      fulfillment_status: order.fulfillment_status,
      customer_id: order.customer?.id?.toString() || null,
      customer_email: order.customer?.email || null,
      line_items: order.line_items || [],
      shipping_address: order.shipping_address || null,
      billing_address: order.billing_address || null,
      created_at: order.created_at,
      updated_at: order.updated_at,
      processed_at: order.processed_at,
      cancelled_at: order.cancelled_at,
      tags: order.tags || '',
      source_name: order.source_name || '',
      gateway: order.gateway || '',
      test: order.test || false,
      synced_at: new Date().toISOString()
    }))
    
    // Insert records using upsert to avoid duplicates
    const { data: insertedData, error: insertError } = await supabase
      .from('shopify_orders')
      .upsert(recordsToInsert, {
        onConflict: 'user_id,shopify_order_id',
        ignoreDuplicates: false
      })
    
    if (insertError) {
      console.error('Error inserting Shopify data:', insertError)
      return NextResponse.json({ error: 'Failed to insert data' }, { status: 500 })
    }
    
    console.log('✅ Shopify backfill completed:', recordsToInsert.length, 'records')
    
    return NextResponse.json({
      success: true,
      records_created: recordsToInsert.length,
      date_range: { start: startDate, end: endDate }
    })
    
  } catch (error) {
    console.error('Error in Shopify backfill:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 