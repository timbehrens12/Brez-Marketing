/**
 * Tier Access Control Utilities
 * 
 * Helper functions for checking subscription tier limits and access control.
 * Use these throughout your app to enforce tier-based restrictions.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side checks
)

export type Tier = 'dtc_owner' | 'beginner' | 'growing' | 'scaling' | 'agency'

export type FeatureType = 
  | 'ai_consultant_chat'
  | 'creative_generation'
  | 'lead_gen_enrichment'
  | 'lead_gen_ecommerce'
  | 'outreach_messages'
  | 'brand_analysis'
  | 'smart_response'
  | 'campaign_recommendations'

export interface TierLimits {
  tier: Tier
  max_brands: number
  max_team_members: number | null
  lead_gen_monthly: number
  outreach_messages_monthly: number
  ai_chats_daily: number
  creative_gen_monthly: number
  white_label: boolean
  custom_branding: boolean
  priority_support: boolean
  dedicated_account_manager: boolean
  features: string[]
}

export interface SubscriptionInfo {
  tier: Tier
  tier_display_name: string
  status: string
  current_period_start: string
  current_period_end: string
  amount: number
  currency: string
}

/**
 * Get user's current subscription tier
 */
export async function getUserTier(userId: string): Promise<Tier | null> {
  const { data, error } = await supabase.rpc('get_user_tier', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error getting user tier:', error)
    return null
  }

  return data as Tier | null
}

/**
 * Get user's subscription information
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionInfo | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('tier, tier_display_name, status, current_period_start, current_period_end, amount, currency')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error getting user subscription:', error)
    return null
  }

  return data as SubscriptionInfo
}

/**
 * Get tier limits for a user
 */
export async function getUserTierLimits(userId: string): Promise<TierLimits | null> {
  const { data, error } = await supabase.rpc('get_user_tier_limits', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error getting user tier limits:', error)
    return null
  }

  return data?.[0] as TierLimits | null
}

/**
 * Check if user can use a feature based on their current usage
 */
export async function checkFeatureAccess(
  userId: string,
  featureType: FeatureType,
  currentUsage: number
): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  const { data, error } = await supabase.rpc('check_tier_limit', {
    p_user_id: userId,
    p_feature_type: featureType,
    p_usage_count: currentUsage
  })

  if (error) {
    console.error('Error checking feature access:', error)
    return { allowed: false, limit: 0, remaining: 0 }
  }

  // Get the actual limit
  const limits = await getUserTierLimits(userId)
  if (!limits) {
    return { allowed: false, limit: 0, remaining: 0 }
  }

  let limit = 0
  switch (featureType) {
    case 'ai_consultant_chat':
      limit = limits.ai_chats_daily
      break
    case 'creative_generation':
      limit = limits.creative_gen_monthly
      break
    case 'lead_gen_enrichment':
    case 'lead_gen_ecommerce':
      limit = limits.lead_gen_monthly
      break
    case 'outreach_messages':
      limit = limits.outreach_messages_monthly
      break
    default:
      limit = 0 // Unlimited
  }

  return {
    allowed: data as boolean,
    limit,
    remaining: Math.max(0, limit - currentUsage)
  }
}

/**
 * Check if user can add another brand
 */
export async function canAddBrand(userId: string): Promise<{ allowed: boolean; limit: number; current: number }> {
  const limits = await getUserTierLimits(userId)
  if (!limits) {
    return { allowed: false, limit: 0, current: 0 }
  }

  const { count, error } = await supabase
    .from('brands')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    console.error('Error counting brands:', error)
    return { allowed: false, limit: limits.max_brands, current: 0 }
  }

  const currentBrands = count || 0
  const allowed = currentBrands < limits.max_brands

  return {
    allowed,
    limit: limits.max_brands,
    current: currentBrands
  }
}

/**
 * Check if user can add another team member
 */
export async function canAddTeamMember(userId: string): Promise<{ allowed: boolean; limit: number | null; current: number }> {
  const limits = await getUserTierLimits(userId)
  if (!limits) {
    return { allowed: false, limit: null, current: 0 }
  }

  // If max_team_members is null, unlimited
  if (limits.max_team_members === null) {
    return { allowed: true, limit: null, current: 0 }
  }

  const { count, error } = await supabase
    .from('agency_team_members')
    .select('*', { count: 'exact', head: true })
    .eq('agency_owner_id', userId)
    .eq('status', 'active')

  if (error) {
    console.error('Error counting team members:', error)
    return { allowed: false, limit: limits.max_team_members, current: 0 }
  }

  const currentMembers = count || 0
  const allowed = currentMembers < limits.max_team_members

  return {
    allowed,
    limit: limits.max_team_members,
    current: currentMembers
  }
}

/**
 * Get current usage for a feature
 */
export async function getFeatureUsage(
  userId: string,
  featureType: FeatureType,
  period: 'daily' | 'monthly' = 'daily'
): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const dateField = period === 'daily' ? 'daily_usage_date' : 'created_at'
  const dateValue = period === 'daily' ? today : firstOfMonth

  const { data, error } = await supabase
    .from('ai_usage_tracking')
    .select('usage_count, daily_usage_count')
    .eq('user_id', userId)
    .eq('feature_type', featureType)
    .gte(dateField, dateValue)

  if (error) {
    console.error('Error getting feature usage:', error)
    return 0
  }

  if (period === 'daily') {
    return data?.[0]?.daily_usage_count || 0
  } else {
    return data?.reduce((sum, item) => sum + (item.usage_count || 0), 0) || 0
  }
}

/**
 * Check if user has access to white-label features
 */
export async function hasWhiteLabelAccess(userId: string): Promise<boolean> {
  const limits = await getUserTierLimits(userId)
  return limits?.white_label || false
}

/**
 * Check if user has priority support
 */
export async function hasPrioritySupport(userId: string): Promise<boolean> {
  const limits = await getUserTierLimits(userId)
  return limits?.priority_support || false
}

/**
 * Check if user has dedicated account manager
 */
export async function hasDedicatedAccountManager(userId: string): Promise<boolean> {
  const limits = await getUserTierLimits(userId)
  return limits?.dedicated_account_manager || false
}

/**
 * Get upgrade recommendation based on usage
 */
export async function getUpgradeRecommendation(userId: string): Promise<{
  shouldUpgrade: boolean
  reason: string
  currentTier: Tier | null
  recommendedTier: Tier | null
}> {
  const tier = await getUserTier(userId)
  const limits = await getUserTierLimits(userId)

  if (!tier || !limits) {
    return {
      shouldUpgrade: false,
      reason: 'No active subscription',
      currentTier: null,
      recommendedTier: null
    }
  }

  // Check brand usage
  const { current: currentBrands, limit: brandLimit } = await canAddBrand(userId)
  if (currentBrands >= brandLimit * 0.8) {
    const nextTier = getNextTier(tier)
    return {
      shouldUpgrade: true,
      reason: `You're using ${currentBrands} of ${brandLimit} brands (${Math.round(currentBrands / brandLimit * 100)}%)`,
      currentTier: tier,
      recommendedTier: nextTier
    }
  }

  // Check AI chat usage
  const aiChatUsage = await getFeatureUsage(userId, 'ai_consultant_chat', 'daily')
  if (aiChatUsage >= limits.ai_chats_daily * 0.8) {
    const nextTier = getNextTier(tier)
    return {
      shouldUpgrade: true,
      reason: `You're using ${aiChatUsage} of ${limits.ai_chats_daily} AI chats today (${Math.round(aiChatUsage / limits.ai_chats_daily * 100)}%)`,
      currentTier: tier,
      recommendedTier: nextTier
    }
  }

  // Check lead generation usage
  const leadGenUsage = await getFeatureUsage(userId, 'lead_gen_enrichment', 'monthly')
  if (leadGenUsage >= limits.lead_gen_monthly * 0.8) {
    const nextTier = getNextTier(tier)
    return {
      shouldUpgrade: true,
      reason: `You're using ${leadGenUsage} of ${limits.lead_gen_monthly} leads this month (${Math.round(leadGenUsage / limits.lead_gen_monthly * 100)}%)`,
      currentTier: tier,
      recommendedTier: nextTier
    }
  }

  return {
    shouldUpgrade: false,
    reason: 'Usage is within limits',
    currentTier: tier,
    recommendedTier: null
  }
}

/**
 * Get next tier in upgrade path
 */
function getNextTier(currentTier: Tier): Tier | null {
  const tierOrder: Tier[] = ['dtc_owner', 'beginner', 'growing', 'scaling', 'agency']
  const currentIndex = tierOrder.indexOf(currentTier)
  
  if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
    return null // Already at highest tier
  }
  
  return tierOrder[currentIndex + 1]
}

/**
 * Format tier name for display
 */
export function formatTierName(tier: Tier): string {
  const names: Record<Tier, string> = {
    dtc_owner: 'DTC Owner',
    beginner: 'Beginner',
    growing: 'Growing',
    scaling: 'Scaling',
    agency: 'Agency'
  }
  return names[tier]
}

/**
 * Get tier color for UI
 */
export function getTierColor(tier: Tier): string {
  const colors: Record<Tier, string> = {
    dtc_owner: '#6366f1', // Indigo
    beginner: '#8b5cf6', // Purple
    growing: '#ec4899', // Pink
    scaling: '#f59e0b', // Amber
    agency: '#ef4444'  // Red (brand color)
  }
  return colors[tier]
}

