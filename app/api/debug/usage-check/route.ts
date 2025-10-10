import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check ai_feature_usage table
    const { data: featureUsage, error: featureError } = await supabase
      .from('ai_feature_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('feature_type', 'ai_consultant')
      .order('created_at', { ascending: false })
      .limit(20)

    if (featureError) {
      console.error('Error fetching feature usage:', featureError)
    }

    // Check ai_usage_tracking table
    const { data: usageTracking, error: trackingError } = await supabase
      .from('ai_usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('feature_name', 'ai_consultant')
      .order('updated_at', { ascending: false })
      .limit(10)

    if (trackingError) {
      console.error('Error fetching usage tracking:', trackingError)
    }

    // Get tier limits
    const { data: tierData, error: tierError } = await supabase.rpc('get_user_tier_limits', {
      p_user_id: userId
    })

    return NextResponse.json({
      userId,
      featureUsage: featureUsage || [],
      usageTracking: usageTracking || [],
      tierLimits: tierData?.[0] || null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug usage check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

