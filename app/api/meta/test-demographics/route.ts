import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the Meta connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', '1a30f34b-b048-4f80-b880-6c61bd12c720')
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'No Meta connection found' }, { status: 404 })
    }

    const accessToken = connection.access_token
    const adAccountId = connection.metadata.ad_account_id

    console.log(`[Test Demographics] Testing with account: ${adAccountId}`)

    // Test basic account access
    const accountTest = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}?fields=name,account_id&access_token=${accessToken}`)
    const accountData = await accountTest.json()
    
    console.log('Account test:', accountData)

    // Test age breakdown
    const ageUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?fields=impressions,clicks,spend,reach,cpm,cpc,ctr,age&breakdowns=age&level=account&date_preset=last_30d&access_token=${accessToken}`
    
    console.log('Testing age breakdown URL:', ageUrl)
    
    const ageResponse = await fetch(ageUrl)
    const ageData = await ageResponse.json()
    
    console.log('Age breakdown response:', ageData)

    // Test gender breakdown
    const genderUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?fields=impressions,clicks,spend,reach,cpm,cpc,ctr,gender&breakdowns=gender&level=account&date_preset=last_30d&access_token=${accessToken}`
    
    const genderResponse = await fetch(genderUrl)
    const genderData = await genderResponse.json()
    
    console.log('Gender breakdown response:', genderData)

    // Test device breakdown
    const deviceUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?fields=impressions,clicks,spend,reach,cpm,cpc,ctr,impression_device&breakdowns=impression_device&level=account&date_preset=last_30d&access_token=${accessToken}`
    
    const deviceResponse = await fetch(deviceUrl)
    const deviceData = await deviceResponse.json()
    
    console.log('Device breakdown response:', deviceData)

    return NextResponse.json({
      success: true,
      tests: {
        account: accountData,
        age: ageData,
        gender: genderData,
        device: deviceData
      },
      connection: {
        id: connection.id,
        ad_account_id: adAccountId,
        hasAccessToken: !!accessToken
      }
    })

  } catch (error) {
    console.error('Error testing demographics:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
