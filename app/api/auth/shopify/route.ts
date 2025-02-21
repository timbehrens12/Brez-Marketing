import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')
  const code = searchParams.get('code')
  const brandId = searchParams.get('state') // Pass brandId as state

  if (!shop || !code || !brandId) {
    return NextResponse.redirect('/settings?error=missing_params')
  }

  try {
    // Save the connection
    const { data, error } = await supabase
      .from('platform_connections')
      .insert({
        brand_id: brandId,
        platform_type: 'shopify',
        store_url: shop,
        access_token: code // Note: In production, you'd want to exchange this for a permanent token
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.redirect('/settings?success=shopify_connected')
  } catch (error) {
    console.error('Shopify connection error:', error)
    return NextResponse.redirect('/settings?error=connection_failed')
  }
} 