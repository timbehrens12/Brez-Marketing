import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get Meta connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'No active Meta connection found' }, { status: 404 })
    }

    console.log(`[Clear Fake Data] Clearing all fake/test demographic data for brand ${brandId}`)

    // Clear all demographic data with test account or fake-looking data
    const { error: demoError } = await supabase
      .from('meta_demographics')
      .delete()
      .eq('connection_id', connection.id)
      .in('account_id', ['test_account', 'Test Account'])

    if (demoError) {
      console.error('Error clearing fake demographic data:', demoError)
    } else {
      console.log('Cleared fake demographic data')
    }

    // Clear all device performance data with test account
    const { error: deviceError } = await supabase
      .from('meta_device_performance')
      .delete()
      .eq('connection_id', connection.id)
      .in('account_id', ['test_account', 'Test Account'])

    if (deviceError) {
      console.error('Error clearing fake device data:', deviceError)
    } else {
      console.log('Cleared fake device performance data')
    }

    // Also clear any data that looks suspiciously fake (exact same values)
    // Clear demographics with obvious test patterns
    const { error: demoPatternError } = await supabase
      .from('meta_demographics')
      .delete()
      .eq('connection_id', connection.id)
      .eq('cpm', 55.56) // This was a specific fake value used

    if (demoPatternError) {
      console.error('Error clearing patterned demographic data:', demoPatternError)
    }

    // Clear device data with obvious test patterns  
    const { error: devicePatternError } = await supabase
      .from('meta_device_performance')
      .delete()
      .eq('connection_id', connection.id)
      .eq('cpm', 50.00) // This was a specific fake value used

    if (devicePatternError) {
      console.error('Error clearing patterned device data:', devicePatternError)
    }

    return NextResponse.json({
      success: true,
      message: 'Fake demographic and device data cleared successfully',
      connectionId: connection.id
    })

  } catch (error) {
    console.error('Error clearing fake data:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
