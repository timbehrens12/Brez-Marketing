import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Get Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'No active Meta connection found' }, { status: 404 })
    }

    // Get ad accounts to find associated pixels
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,pixels&access_token=${connection.access_token}`
    )

    if (!accountsResponse.ok) {
      const error = await accountsResponse.json()
      return NextResponse.json({ error: 'Failed to fetch ad accounts', details: error }, { status: 500 })
    }

    const accountsData = await accountsResponse.json()

    if (!accountsData.data || accountsData.data.length === 0) {
      return NextResponse.json({
        hasPixel: false,
        message: 'No ad accounts found',
        pixels: []
      })
    }

    // Collect all pixels from all ad accounts
    const allPixels = []
    let hasActivePixel = false

    for (const account of accountsData.data) {
      // Get pixels for this ad account
      const pixelsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${account.id}/pixels?fields=id,name,pixel_domain,creation_time,last_fired_time,is_created_by_business&access_token=${connection.access_token}`
      )

      if (pixelsResponse.ok) {
        const pixelsData = await pixelsResponse.json()
        
        if (pixelsData.data && pixelsData.data.length > 0) {
          for (const pixel of pixelsData.data) {
            allPixels.push({
              id: pixel.id,
              name: pixel.name,
              domain: pixel.pixel_domain,
              accountId: account.id,
              accountName: account.name,
              creationTime: pixel.creation_time,
              lastFiredTime: pixel.last_fired_time,
              isCreatedByBusiness: pixel.is_created_by_business,
              isActive: !!pixel.last_fired_time // Has fired recently means it's active
            })

            // Check if pixel has fired recently (within last 30 days)
            if (pixel.last_fired_time) {
              const lastFired = new Date(pixel.last_fired_time)
              const thirtyDaysAgo = new Date()
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
              
              if (lastFired > thirtyDaysAgo) {
                hasActivePixel = true
              }
            }
          }
        }
      }
    }

    // Additional check: Look for conversion events in recent campaigns
    let hasConversionTracking = false
    
    try {
      // Check recent ad insights for conversion events
      const campaignsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${accountsData.data[0].id}/campaigns?fields=id&limit=5&access_token=${connection.access_token}`
      )

      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json()
        
        if (campaignsData.data && campaignsData.data.length > 0) {
          const campaignId = campaignsData.data[0].id
          
          // Check insights for conversion actions
          const insightsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${campaignId}/insights?fields=actions&access_token=${connection.access_token}&time_range[since]=2024-01-01`
          )

          if (insightsResponse.ok) {
            const insightsData = await insightsResponse.json()
            
            if (insightsData.data && insightsData.data.length > 0) {
              const actions = insightsData.data[0].actions || []
              
              // Look for conversion events
              hasConversionTracking = actions.some((action: any) => 
                action.action_type === 'purchase' || 
                action.action_type === 'offsite_conversion.fb_pixel_purchase' ||
                action.action_type === 'lead' ||
                action.action_type === 'complete_registration'
              )
            }
          }
        }
      }
    } catch (error) {
      console.log('Could not check conversion tracking:', error)
    }

    return NextResponse.json({
      hasPixel: allPixels.length > 0,
      hasActivePixel,
      hasConversionTracking,
      pixelCount: allPixels.length,
      pixels: allPixels,
      recommendation: getPixelRecommendation(allPixels.length > 0, hasActivePixel, hasConversionTracking)
    })

  } catch (error) {
    console.error('Meta pixel check error:', error)
    return NextResponse.json({ error: 'Failed to check pixel status' }, { status: 500 })
  }
}

function getPixelRecommendation(hasPixel: boolean, hasActivePixel: boolean, hasConversionTracking: boolean) {
  if (!hasPixel) {
    return {
      status: 'missing',
      message: 'No Meta Pixel found',
      action: 'Ensure this Meta account has a pixel connected to enable conversion tracking',
      color: 'red'
    }
  }
  
  if (!hasActivePixel) {
    return {
      status: 'inactive',
      message: 'Pixel found but not active',
      action: 'Verify pixel is properly installed on your website',
      color: 'yellow'
    }
  }
  
  if (!hasConversionTracking) {
    return {
      status: 'no_conversions',
      message: 'Pixel active but no conversion events detected',
      action: 'Set up conversion tracking events (purchase, lead, etc.)',
      color: 'yellow'
    }
  }
  
  return {
    status: 'good',
    message: 'Pixel is properly configured with conversion tracking',
    action: 'Conversion tracking is working properly',
    color: 'green'
  }
} 