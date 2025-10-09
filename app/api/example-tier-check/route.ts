/**
 * Example API Route: Tier-Based Access Control
 * 
 * This is an example showing how to implement tier checking in your API routes.
 * Copy this pattern to any feature that needs tier-based restrictions.
 * 
 * DELETE THIS FILE after you've implemented tier checking in your actual routes.
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import {
  checkFeatureAccess,
  getFeatureUsage,
  getUserTierLimits,
  canAddBrand,
  hasWhiteLabelAccess,
  getUpgradeRecommendation
} from '@/lib/subscription/tier-access'

/**
 * Example 1: Check AI Chat Access
 */
export async function POST(req: Request) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current usage for today
  const currentUsage = await getFeatureUsage(userId, 'ai_consultant_chat', 'daily')

  // Check if user can use this feature
  const { allowed, limit, remaining } = await checkFeatureAccess(
    userId,
    'ai_consultant_chat',
    currentUsage
  )

  if (!allowed) {
    return NextResponse.json({
      error: 'Daily limit reached',
      message: `You've used ${currentUsage} of ${limit} AI chats today`,
      upgrade_url: '/pricing',
      limit,
      remaining: 0
    }, { status: 403 })
  }

  // User has access - proceed with feature
  // ... your AI chat logic here ...

  return NextResponse.json({
    success: true,
    usage: {
      current: currentUsage + 1,
      limit,
      remaining: remaining - 1
    }
  })
}

/**
 * Example 2: Check Brand Creation Access
 */
export async function GET(req: Request) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user can add another brand
  const { allowed, limit, current } = await canAddBrand(userId)

  if (!allowed) {
    return NextResponse.json({
      error: 'Brand limit reached',
      message: `You've reached your limit of ${limit} brands`,
      current,
      limit,
      upgrade_url: '/pricing'
    }, { status: 403 })
  }

  return NextResponse.json({
    success: true,
    canAdd: true,
    current,
    limit,
    remaining: limit - current
  })
}

/**
 * Example 3: Get User's Tier Information
 */
export async function PUT(req: Request) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all tier information
  const [limits, hasWhiteLabel, recommendation] = await Promise.all([
    getUserTierLimits(userId),
    hasWhiteLabelAccess(userId),
    getUpgradeRecommendation(userId)
  ])

  return NextResponse.json({
    limits,
    features: {
      whiteLabel: hasWhiteLabel
    },
    recommendation
  })
}

/**
 * Example 4: Check Multiple Features at Once
 */
export async function PATCH(req: Request) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current usage for multiple features
  const [aiChatUsage, creativeUsage, leadGenUsage] = await Promise.all([
    getFeatureUsage(userId, 'ai_consultant_chat', 'daily'),
    getFeatureUsage(userId, 'creative_generation', 'monthly'),
    getFeatureUsage(userId, 'lead_gen_enrichment', 'monthly')
  ])

  // Check access for each feature
  const [aiChatAccess, creativeAccess, leadGenAccess] = await Promise.all([
    checkFeatureAccess(userId, 'ai_consultant_chat', aiChatUsage),
    checkFeatureAccess(userId, 'creative_generation', creativeUsage),
    checkFeatureAccess(userId, 'lead_gen_enrichment', leadGenUsage)
  ])

  return NextResponse.json({
    aiChat: {
      allowed: aiChatAccess.allowed,
      usage: aiChatUsage,
      limit: aiChatAccess.limit,
      remaining: aiChatAccess.remaining
    },
    creative: {
      allowed: creativeAccess.allowed,
      usage: creativeUsage,
      limit: creativeAccess.limit,
      remaining: creativeAccess.remaining
    },
    leadGen: {
      allowed: leadGenAccess.allowed,
      usage: leadGenUsage,
      limit: leadGenAccess.limit,
      remaining: leadGenAccess.remaining
    }
  })
}

/**
 * IMPLEMENTATION CHECKLIST
 * 
 * To add tier checking to your actual API routes:
 * 
 * 1. Import the tier-access utilities:
 *    import { checkFeatureAccess, getFeatureUsage } from '@/lib/subscription/tier-access'
 * 
 * 2. Get current usage BEFORE the feature logic:
 *    const currentUsage = await getFeatureUsage(userId, 'feature_type', 'daily' or 'monthly')
 * 
 * 3. Check if user has access:
 *    const { allowed, limit, remaining } = await checkFeatureAccess(userId, 'feature_type', currentUsage)
 * 
 * 4. Return 403 if not allowed:
 *    if (!allowed) {
 *      return NextResponse.json({ error: 'Limit reached', upgrade_url: '/pricing' }, { status: 403 })
 *    }
 * 
 * 5. Proceed with feature if allowed
 * 
 * 6. Update usage tracking (if not already done):
 *    await supabase.from('ai_usage_tracking').upsert({
 *      user_id: userId,
 *      feature_type: 'feature_type',
 *      usage_count: currentUsage + 1,
 *      daily_usage_count: currentUsage + 1,
 *      daily_usage_date: new Date().toISOString().split('T')[0]
 *    })
 * 
 * ROUTES THAT NEED TIER CHECKING:
 * - ✅ app/api/ai-consultant/route.ts (AI chat)
 * - ✅ app/api/creative/generate/route.ts (Creative generation)
 * - ✅ app/api/leads/generate/route.ts (Lead generation)
 * - ✅ app/api/outreach/generate/route.ts (Outreach messages)
 * - ✅ app/api/brands/route.ts (Brand creation)
 * - ✅ app/api/agency/team/invite/route.ts (Team member invites)
 * 
 * DELETE THIS FILE once you've implemented tier checking in your actual routes!
 */

