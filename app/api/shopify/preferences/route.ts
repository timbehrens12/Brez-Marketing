import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { shop, preferences } = await request.json()

    if (!shop || !preferences) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    console.log('[Shopify Preferences] Saving preferences for shop:', shop)

    const supabase = createClient()

    // Update or create preferences for this shop
    const { data: existingConnection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'shopify')
      .eq('shop', shop)
      .single()

    if (existingConnection) {
      // Update existing connection with preferences
      const { error } = await supabase
        .from('platform_connections')
        .update({
          preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConnection.id)

      if (error) {
        console.error('[Shopify Preferences] Error updating preferences:', error)
        return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
      }
    } else {
      // No connection found - this shouldn't happen if app is properly installed
      return NextResponse.json({ error: 'Shop connection not found' }, { status: 404 })
    }

    console.log('[Shopify Preferences] Successfully saved preferences for shop:', shop)

    return NextResponse.json({ 
      message: 'Preferences saved successfully',
      preferences 
    })

  } catch (error) {
    console.error('[Shopify Preferences] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to save preferences' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json({ error: 'Shop parameter is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get preferences for this shop
    const { data: connection, error } = await supabase
      .from('platform_connections')
      .select('preferences')
      .eq('platform', 'shopify')
      .eq('shop_domain', shop)
      .single()

    if (error) {
      console.error('[Shopify Preferences] Error fetching preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    return NextResponse.json({ 
      preferences: connection?.preferences || {
        enableAnalytics: true,
        enableAIInsights: true,
        enableWeeklyReports: false,
        enableNotifications: true
      }
    })

  } catch (error) {
    console.error('[Shopify Preferences] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch preferences' 
    }, { status: 500 })
  }
}
