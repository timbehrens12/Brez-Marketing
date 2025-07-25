import { createClient } from '@/lib/supabase/server'

export type AIFeatureType = 
  | 'campaign_recommendations' 
  | 'health_report' 
  | 'ai_consultant_chat'
  | 'marketing_analysis'
  | 'creative_analysis'

export interface AIUsageStatus {
  canUse: boolean
  remainingUses?: number
  cooldownUntil?: Date
  lastUsed?: Date
  reason?: string
}

export interface AIFeatureLimits {
  dailyLimit?: number
  cooldownHours?: number
  requiresPreviousRecommendations?: boolean
}

// Define limits for each AI feature
const AI_FEATURE_LIMITS: Record<AIFeatureType, AIFeatureLimits> = {
  campaign_recommendations: {
    cooldownHours: 24, // 24-hour cooldown
    requiresPreviousRecommendations: true
  },
  health_report: {
    dailyLimit: 3 // 3 health reports per day
  },
  ai_consultant_chat: {
    dailyLimit: 5 // 5 chat messages per day
  },
  marketing_analysis: {
    dailyLimit: 5 // 5 marketing analyses per day
  },
  creative_analysis: {
    dailyLimit: 10 // 10 creative analyses per day
  }
}

export class AIUsageService {
  private supabase = createClient()

  async checkUsageStatus(
    brandId: string, 
    userId: string, 
    featureType: AIFeatureType
  ): Promise<AIUsageStatus> {
    try {
      const limits = AI_FEATURE_LIMITS[featureType]
      const now = new Date()

      // Get existing usage record
      const { data: usage, error } = await this.supabase
        .from('ai_usage_tracking')
        .select('*')
        .eq('brand_id', brandId)
        .eq('feature_type', featureType)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking AI usage:', error)
        return { canUse: false, reason: 'Database error' }
      }

      // If no usage record exists, user can use the feature
      if (!usage) {
        return { canUse: true }
      }

      // Check cooldown for features that have it
      if (limits.cooldownHours) {
        const cooldownEnd = new Date(usage.last_used_at)
        cooldownEnd.setHours(cooldownEnd.getHours() + limits.cooldownHours)
        
        if (now < cooldownEnd) {
          return {
            canUse: false,
            cooldownUntil: cooldownEnd,
            lastUsed: new Date(usage.last_used_at),
            reason: `Feature is on cooldown. Available again in ${Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60))} hours.`
          }
        }
      }

      // Check daily limits for features that have them
      if (limits.dailyLimit) {
        const today = now.toISOString().split('T')[0]
        const usageDate = usage.daily_usage_date.toString()
        
        // Reset daily count if it's a new day
        if (usageDate !== today) {
          return { 
            canUse: true, 
            remainingUses: limits.dailyLimit - 1 
          }
        }
        
        // Check if daily limit exceeded
        if (usage.daily_usage_count >= limits.dailyLimit) {
          return {
            canUse: false,
            remainingUses: 0,
            reason: `Daily limit of ${limits.dailyLimit} uses reached. Resets tomorrow.`
          }
        }
        
        return { 
          canUse: true, 
          remainingUses: limits.dailyLimit - usage.daily_usage_count 
        }
      }

      return { canUse: true }

    } catch (error) {
      console.error('Error in checkUsageStatus:', error)
      return { canUse: false, reason: 'Service error' }
    }
  }

  async recordUsage(
    brandId: string,
    userId: string,
    featureType: AIFeatureType,
    metadata?: any
  ): Promise<boolean> {
    try {
      const now = new Date()

      // Try to insert into ai_usage_logs table (new structure)
      const { error } = await this.supabase
        .from('ai_usage_logs')
        .insert({
          brand_id: brandId,
          user_id: userId,
          endpoint: featureType,
          metadata: metadata || {},
          created_at: now.toISOString()
        })

      if (error) {
        // If table doesn't exist, log but don't fail
        if (error.code === '42P01') {
          console.log('[AI Usage] ai_usage_logs table not found, skipping usage recording')
          return true
        }
        console.error('Error recording AI usage:', error)
        return false
      }

      return true

    } catch (error) {
      console.error('Error in recordUsage:', error)
      return true // Don't fail the main functionality due to usage tracking issues
    }
  }

  async getPreviousRecommendations(
    brandId: string,
    featureType: AIFeatureType
  ): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('ai_usage_logs')
        .select('metadata, created_at')
        .eq('brand_id', brandId)
        .eq('endpoint', featureType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        // If table doesn't exist, return null gracefully
        if (error.code === '42P01') {
          console.log('[AI Usage] ai_usage_logs table not found, returning null for previous recommendations')
          return null
        }
        // If no data found, that's also okay
        if (error.code === 'PGRST116') {
          return null
        }
        console.error('Error getting previous recommendations:', error)
        return null
      }

      if (!data || !data.metadata) {
        return null
      }

      return {
        recommendations: data.metadata,
        lastUsed: new Date(data.created_at)
      }

    } catch (error) {
      console.error('Error getting previous recommendations:', error)
      return null
    }
  }

  async getUsageStats(brandId: string): Promise<Record<AIFeatureType, AIUsageStatus>> {
    try {
      const { data: usageRecords, error } = await this.supabase
        .from('ai_usage_tracking')
        .select('*')
        .eq('brand_id', brandId)

      if (error) {
        console.error('Error getting usage stats:', error)
        return {} as Record<AIFeatureType, AIUsageStatus>
      }

      const stats: Record<AIFeatureType, AIUsageStatus> = {
        campaign_recommendations: { canUse: true },
        health_report: { canUse: true },
        ai_consultant_chat: { canUse: true },
        marketing_analysis: { canUse: true },
        creative_analysis: { canUse: true }
      }

      // Get brand owner's user ID for checking usage
      const { data: brand, error: brandError } = await this.supabase
        .from('brands')
        .select('user_id')
        .eq('id', brandId)
        .single()

      if (brandError || !brand) {
        return stats
      }

      // Check status for each feature
      for (const featureType of Object.keys(stats) as AIFeatureType[]) {
        stats[featureType] = await this.checkUsageStatus(brandId, brand.user_id, featureType)
      }

      return stats

    } catch (error) {
      console.error('Error in getUsageStats:', error)
      return {} as Record<AIFeatureType, AIUsageStatus>
    }
  }

  async resetDailyLimits(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      await this.supabase
        .from('ai_usage_tracking')
        .update({
          daily_usage_count: 0,
          daily_usage_date: today
        })
        .neq('daily_usage_date', today)

    } catch (error) {
      console.error('Error resetting daily limits:', error)
    }
  }
}

export const aiUsageService = new AIUsageService() 