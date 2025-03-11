import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }
    
    // Get all Shopify connections for this brand
    const { data: connections, error } = await supabase
      .from('platform_connections')
      .select('id, shop, status, last_synced_at')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
    
    if (error) {
      console.error('Error fetching Shopify connections:', error)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }
    
    return NextResponse.json({ connections: connections || [] })
    
  } catch (error) {
    console.error('Error in Shopify connections endpoint:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch Shopify connections', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 