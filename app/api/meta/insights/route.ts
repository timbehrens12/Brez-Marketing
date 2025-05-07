import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import axios from 'axios'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')

  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
  }

  try {
    // Get Meta access token from Supabase
    const { data: connection, error } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .single()

    if (error || !connection) {
      console.error('Error fetching Meta connection:', error)
      return NextResponse.json({ error: 'Meta connection not found' }, { status: 404 })
    }

    // Test API call to get ad accounts
    const accountsResponse = await axios.get('https://graph.facebook.com/v18.0/me/adaccounts', {
      params: {
        access_token: connection.access_token,
        fields: 'account_id,name,account_status,amount_spent,balance,currency'
      }
    })

    console.log('Meta Ads API Response:', accountsResponse.data)

    return NextResponse.json(accountsResponse.data)
  } catch (error) {
    console.error('Error fetching Meta ads data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Meta ads data' }, 
      { status: 500 }
    )
  }
} 