import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Tier = 'dtc_owner' | 'beginner' | 'growing' | 'scaling' | 'agency'
export type BillingInterval = 'week' | 'month'

/**
 * TEST ENDPOINT: Set user tier for testing
 * 
 * POST /api/test/set-tier
 * Body: { tier: 'beginner', billingInterval: 'week' }
 * 
 * This creates or updates a subscription for the current user for testing purposes.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { tier, billingInterval = 'month' } = body as { tier: Tier; billingInterval?: BillingInterval }

    if (!tier) {
      return NextResponse.json({ error: 'Tier is required' }, { status: 400 })
    }

    // Validate tier
    const validTiers: Tier[] = ['dtc_owner', 'beginner', 'growing', 'scaling', 'agency']
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    // Validate billing interval
    const validIntervals: BillingInterval[] = ['week', 'month']
    if (!validIntervals.includes(billingInterval)) {
      return NextResponse.json({ error: 'Invalid billing interval' }, { status: 400 })
    }

    // Get tier display name and pricing
    const tierNames: Record<Tier, string> = {
      dtc_owner: 'DTC Owner',
      beginner: 'Beginner',
      growing: 'Growing',
      scaling: 'Scaling',
      agency: 'Agency'
    }

    const tierPrices: Record<Tier, number> = {
      dtc_owner: 67,
      beginner: 97,
      growing: 397,
      scaling: 997,
      agency: 2997
    }

    const basePrice = tierPrices[tier]
    // Weekly pricing is 10% more expensive
    const price = billingInterval === 'week' ? Math.round(basePrice * 1.1) : basePrice

    // Check if user already has a subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    const now = new Date()
    const periodEnd = new Date(now)
    if (billingInterval === 'week') {
      periodEnd.setDate(periodEnd.getDate() + 7)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    if (existingSub) {
      // Update existing subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          tier,
          tier_display_name: tierNames[tier],
          billing_interval: billingInterval,
          amount: price,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', existingSub.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating subscription:', error)
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Updated subscription to ${tierNames[tier]} (${billingInterval === 'week' ? 'Weekly' : 'Monthly'})`,
        subscription: data
      })
    } else {
      // Create new subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          tier,
          tier_display_name: tierNames[tier],
          status: 'active',
          billing_interval: billingInterval,
          amount: price,
          currency: 'usd',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating subscription:', error)
        return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Created ${tierNames[tier]} subscription (${billingInterval === 'week' ? 'Weekly' : 'Monthly'})`,
        subscription: data
      })
    }
  } catch (error) {
    console.error('Error in set-tier endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/test/set-tier
 * Returns current user's subscription info
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          subscription: null,
          message: 'No active subscription found'
        })
      }
      console.error('Error getting subscription:', error)
      return NextResponse.json({ error: 'Failed to get subscription' }, { status: 500 })
    }

    // Get tier limits
    const { data: limits, error: limitsError } = await supabase.rpc('get_user_tier_limits', {
      p_user_id: userId
    })

    if (limitsError) {
      console.error('Error getting tier limits:', limitsError)
    }

    return NextResponse.json({
      subscription,
      limits: limits?.[0] || null
    })
  } catch (error) {
    console.error('Error in get subscription endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

