import { getUserTierLimits, getUserTier, type Tier } from '@/lib/subscription/tier-access'

export interface FeatureAccess {
  allowed: boolean
  reason?: string
  currentTier?: Tier
  recommendedTier?: Tier
  currentUsage?: number
  limit?: number
}

export interface WhiteLabelSettings {
  allowed: boolean
  forcePlatformBranding: boolean
  platformName: string
  platformLogo: string
}

/**
 * Tier Enforcement Service
 * Centralized service for checking tier-based feature access
 */
export class TierEnforcementService {
  
  /**
   * Check if user can access a specific feature
   */
  async canAccessFeature(userId: string, feature: string): Promise<FeatureAccess> {
    const tierLimits = await getUserTierLimits(userId)
    const currentTier = await getUserTier(userId)

    if (!tierLimits || !currentTier) {
      return {
        allowed: false,
        reason: 'No active subscription found',
        recommendedTier: 'beginner'
      }
    }

    switch (feature) {
      case 'lead_generation':
        if (tierLimits.lead_gen_monthly === 0) {
          return {
            allowed: false,
            reason: 'Lead Generation is not available on your current plan',
            currentTier,
            recommendedTier: 'beginner',
            limit: 0
          }
        }
        return { allowed: true, limit: tierLimits.lead_gen_monthly }

      case 'outreach_tool':
        if (tierLimits.outreach_messages_monthly === 0) {
          return {
            allowed: false,
            reason: 'Outreach CRM is not available on your current plan',
            currentTier,
            recommendedTier: 'beginner',
            limit: 0
          }
        }
        return { allowed: true, limit: tierLimits.outreach_messages_monthly }

      case 'white_label':
        if (!tierLimits.white_label) {
          return {
            allowed: false,
            reason: 'White-label branding is not available on your current plan',
            currentTier,
            recommendedTier: 'beginner'
          }
        }
        return { allowed: true }

      case 'team_members':
        if (!tierLimits.max_team_members || tierLimits.max_team_members === 0) {
          return {
            allowed: false,
            reason: 'Team member invitations are not available on your current plan',
            currentTier,
            recommendedTier: 'growing',
            limit: 0
          }
        }
        return { allowed: true, limit: tierLimits.max_team_members }

      case 'priority_support':
        return {
          allowed: tierLimits.priority_support,
          reason: tierLimits.priority_support ? undefined : 'Priority support is available on Growing plans and above'
        }

      case 'dedicated_account_manager':
        return {
          allowed: tierLimits.dedicated_account_manager,
          reason: tierLimits.dedicated_account_manager ? undefined : 'Dedicated account manager is available on Scaling plans and above'
        }

      default:
        return { allowed: true }
    }
  }

  /**
   * Get white label settings for user
   * Returns whether user can customize branding and what defaults to use
   */
  async getWhiteLabelSettings(userId: string): Promise<WhiteLabelSettings> {
    const tierLimits = await getUserTierLimits(userId)

    const platformDefaults = {
      platformName: 'Brez Marketing',
      platformLogo: 'https://i.imgur.com/j4AQPxj.png'
    }

    if (!tierLimits || !tierLimits.white_label) {
      return {
        allowed: false,
        forcePlatformBranding: true,
        ...platformDefaults
      }
    }

    return {
      allowed: true,
      forcePlatformBranding: false,
      ...platformDefaults
    }
  }

  /**
   * Get tier display information
   */
  getTierInfo(tier: Tier): { name: string; color: string; icon: string } {
    const tierInfo = {
      dtc_owner: { name: 'DTC Owner', color: '#6366f1', icon: '👤' },
      beginner: { name: 'Beginner', color: '#8b5cf6', icon: '⚡' },
      growing: { name: 'Growing', color: '#ec4899', icon: '📈' },
      scaling: { name: 'Scaling', color: '#f59e0b', icon: '🌐' },
      agency: { name: 'Agency', color: '#ef4444', icon: '🏢' }
    }
    return tierInfo[tier] || tierInfo.beginner
  }

  /**
   * Get upgrade path for a feature
   */
  getUpgradePath(currentTier: Tier, feature: string): Tier | null {
    const upgradePaths: Record<string, Tier> = {
      'lead_generation': 'beginner',
      'outreach_tool': 'beginner',
      'white_label': 'beginner',
      'team_members': 'growing',
      'priority_support': 'growing',
      'dedicated_account_manager': 'scaling'
    }

    const recommendedTier = upgradePaths[feature]
    if (!recommendedTier) return null

    // If already at or above recommended tier, suggest next tier
    const tierOrder: Tier[] = ['dtc_owner', 'beginner', 'growing', 'scaling', 'agency']
    const currentIndex = tierOrder.indexOf(currentTier)
    const recommendedIndex = tierOrder.indexOf(recommendedTier)

    if (currentIndex >= recommendedIndex) {
      // Already have access or at higher tier
      return null
    }

    return recommendedTier
  }

  /**
   * Get pricing for a tier
   */
  getTierPricing(tier: Tier, billingInterval: 'week' | 'month' = 'month'): { price: number; interval: string } {
    const monthlyPrices: Record<Tier, number> = {
      dtc_owner: 67,
      beginner: 97,
      growing: 397,
      scaling: 997,
      agency: 2997
    }

    const basePrice = monthlyPrices[tier]
    const price = billingInterval === 'week' ? Math.round(basePrice * 1.1 / 4) : basePrice

    return {
      price,
      interval: billingInterval === 'week' ? 'week' : 'month'
    }
  }
}

export const tierEnforcementService = new TierEnforcementService()

