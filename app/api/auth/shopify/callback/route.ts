import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  console.log('Callback route hit!') // Debug log
  
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')
  const code = searchParams.get('code')
  const state = searchParams.get('state') // This is our brandId

  console.log('Received params:', { shop, code, state }) // Debug log

  if (!shop || !code || !state) {
    console.error('Missing required params:', { shop, code, state })
    return NextResponse.redirect('/settings?error=missing_params')
  }

  try {
    // Save the connection to Supabase
    const { data, error } = await supabase
      .from('platform_connections')
      .insert([{
        brand_id: state,
        platform_type: 'shopify',
        store_url: shop,
        access_token: code,
        connected_at: new Date().toISOString()
      }])
      .select()
      .single()

    console.log('Supabase insert result:', { data, error }) // Debug log

    if (error) throw error

    // Redirect back to settings with success
    return NextResponse.redirect('/settings?success=true')
  } catch (error) {
    console.error('Error saving Shopify connection:', error)
    return NextResponse.redirect('/settings?error=connection_failed')
  }
} 