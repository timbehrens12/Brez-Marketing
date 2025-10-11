import { createClient } from '@/lib/supabase/server'
import { getCurrentLocalDateString, dateToLocalDateString } from '@/lib/utils/timezone'
import { getUserTierLimits, type Tier } from '@/lib/subscription/tier-access'

export type AIFeatureType = 
  | 'campaign_recommendations' 
  | 'health_report' 
  | 'ai_consultant_chat'
  | 'marketing_analysis'        // Marketing Assistant Recommendations
  | 'brand_report'               // Brand Report Generation
  | 'creative_analysis'
  | 'brand_analysis'           // Brand Health Synopsis
  | 'task_generation'           // Task Generator
  | 'campaign_analysis'         // Campaign Analysis
  | 'smart_response'            // Smart Response
  | 'enhanced_campaign_analysis' // Enhanced Campaign Analysis  
  | 'creative_generation'       // Creative Generation
  | 'lead_gen_enrichment'       // Lead Gen Enrichment
  | 'lead_gen_ecommerce'        // E-commerce Lead Gen
  | 'outreach_messages'         // Outreach Message Generator

export interface AIUsageStatus {
  canUse: boolean
  remainingUses?: number
  cooldownUntil?: Date
  lastUsed?: Date
  reason?: string
  tier?: Tier
}

export interface AIFeatureLimits {
  dailyLimit?: number
  weeklyLimit?: number
  monthlyLimit?: number
  cooldownHours?: number
  requiresPreviousRecommendations?: boolean
}

// Define BASE limits for each AI feature (features not tied to tier limits)
// Tier-specific limits (creative_generation, lead_gen, outreach, ai_consultant_chat) are fetched from database
const BASE_AI_FEATURE_LIMITS: Record<AIFeatureType, AIFeatureLimits> = {
  campaign_recommendations: {
    weeklyLimit: 1, // Weekly campaign optimization (as shown in pricing)
    cooldownHours: 24,
    requiresPreviousRecommendations: true
  },
  health_report: {
    dailyLimit: 3 // 3 health reports per day
  },
  ai_consultant_chat: {
    dailyLimit: 10 // Default (overridden by tier)
  },
  marketing_analysis: {
    weeklyLimit: 1 // 1 weekly marketing assistant analysis (Weekly as shown in pricing)
  },
  brand_report: {
    dailyLimit: 1, // 1 daily report
    monthlyLimit: 1 // 1 monthly report per month
  },
  creative_analysis: {
    dailyLimit: 10 // 10 creative analyses per day
  },
  brand_analysis: {
    dailyLimit: 50 // 50 brand synopses per day (high limit for frequent refreshes)
  },
  task_generation: {
    dailyLimit: 20 // 20 task generations per day
  },
  campaign_analysis: {
    dailyLimit: 30 // 30 campaign analyses per day
  },
  smart_response: {
    dailyLimit: 50 // 50 smart responses per day
  },
  enhanced_campaign_analysis: {
    dailyLimit: 30 // 30 enhanced analyses per day
  },
  creative_generation: {
    monthlyLimit: 25 // Default (overridden by tier)
  },
  lead_gen_enrichment: {
    monthlyLimit: 100 // Default (overridden by tier)
  },
  lead_gen_ecommerce: {
    monthlyLimit: 100 // Default (overridden by tier)
  },
  outreach_messages: {
    monthlyLimit: 250 // Default (overridden by tier)
  }
}

export class AIUsageService {
  private supabase = createClient()

  /**
   * Get tier-based limits for a user
   * Merges base limits with tier-specific limits from database
   */
  private async getTierBasedLimits(userId: string, featureType: AIFeatureType): Promise<AIFeatureLimits> {
    const baseLimits = BASE_AI_FEATURE_LIMITS[featureType]
    
    // Get user's tier limits from database
    const tierLimits = await getUserTierLimits(userId)
    if (!tierLimits) {
      console.warn(`[AI Usage] No tier limits found for user ${userId}, using base limits`)
      return baseLimits
    }

    // Get user's billing interval to determine reset schedule
    const { data: subscription } = await this.supabase
      .from('subscriptions')
      .select('billing_interval')
      .eq('user_id', userId)
      .single()
    
    const billingInterval = subscription?.billing_interval || 'month'
    const isWeekly = billingInterval === 'week'

    // Override base limits with tier-specific limits
    const limits = { ...baseLimits }
    
    switch (featureType) {
      case 'ai_consultant_chat':
        // AI Chatbot always uses daily limit (doesn't vary by billing interval)
        limits.dailyLimit = tierLimits.ai_chats_daily
        break
      case 'creative_generation':
        // Creative Gen resets weekly for weekly plans, monthly for monthly plans
        if (isWeekly) {
          limits.weeklyLimit = tierLimits.creative_gen_monthly
        } else {
          limits.monthlyLimit = tierLimits.creative_gen_monthly
        }
        break
      case 'lead_gen_enrichment':
      case 'lead_gen_ecommerce':
        // Lead Gen resets weekly for weekly plans, monthly for monthly plans
        if (isWeekly) {
          limits.weeklyLimit = tierLimits.lead_gen_monthly
        } else {
          limits.monthlyLimit = tierLimits.lead_gen_monthly
        }
        break
      case 'outreach_messages':
        // Outreach resets weekly for weekly plans, monthly for monthly plans
        if (isWeekly) {
          limits.weeklyLimit = tierLimits.outreach_messages_monthly
        } else {
          limits.monthlyLimit = tierLimits.outreach_messages_monthly
        }
        break
    }

    console.log(`[AI Usage] Tier-based limits for ${featureType} (billing: ${billingInterval}):`, limits)
    return limits
  }

  async checkUsageStatus(
    brandId: string, 
    userId: string, 
    featureType: AIFeatureType
  ): Promise<AIUsageStatus> {
    try {
      // Get tier-based limits for this user
      const limits = await this.getTierBasedLimits(userId, featureType)
      const now = new Date()

      // Calculate week and month boundaries
      const today = getCurrentLocalDateString()
      const currentWeekStart = this.getWeekStart(now) // Monday
      const currentMonthStart = this.getMonthStart(now) // 1st of month

      // Get usage from ai_feature_usage table (tracks all usage)
      const { data: allUsage, error: usageError } = await this.supabase
        .from('ai_feature_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('feature_type', featureType)
        .order('created_at', { ascending: false })

      if (usageError) {
        console.error('Error checking AI usage:', usageError)
        return { canUse: false, reason: 'Database error' }
      }

      // Calculate usage counts for different periods
      const dailyUsage = allUsage?.filter(u => {
        const usageDate = new Date(u.created_at).toISOString().split('T')[0]
        return usageDate === today
      }).length || 0

      const weeklyUsage = allUsage?.filter(u => {
        const usageDate = new Date(u.created_at)
        return usageDate >= currentWeekStart
      }).length || 0

      const monthlyUsage = allUsage?.filter(u => {
        const usageDate = new Date(u.created_at)
        return usageDate >= currentMonthStart
      }).length || 0

      console.log(`[AI Usage] ${featureType} - Daily: ${dailyUsage}, Weekly: ${weeklyUsage}, Monthly: ${monthlyUsage}`)

      // Check cooldown for features that have it (e.g., campaign_recommendations)
      if (limits.cooldownHours && allUsage && allUsage.length > 0) {
        const lastUsage = allUsage[0]
        const cooldownEnd = new Date(lastUsage.created_at)
        cooldownEnd.setHours(cooldownEnd.getHours() + limits.cooldownHours)
        
        if (now < cooldownEnd) {
          return {
            canUse: false,
            cooldownUntil: cooldownEnd,
            lastUsed: new Date(lastUsage.created_at),
            reason: `Feature is on cooldown. Available again in ${Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60))} hours.`
          }
        }
      }

      // Check monthly limit first (if exists)
      if (limits.monthlyLimit && monthlyUsage >= limits.monthlyLimit) {
        return {
          canUse: false,
          remainingUses: 0,
          reason: `Monthly limit of ${limits.monthlyLimit} uses reached. Resets on the 1st of next month.`
        }
      }

      // Check weekly limit (if exists)
      if (limits.weeklyLimit && weeklyUsage >= limits.weeklyLimit) {
        const daysUntilMonday = (8 - now.getDay()) % 7 || 7
        return {
          canUse: false,
          remainingUses: 0,
          reason: `Weekly limit of ${limits.weeklyLimit} uses reached. Resets Monday (in ${daysUntilMonday} days).`
        }
      }

      // Check daily limit (if exists)
      if (limits.dailyLimit && dailyUsage >= limits.dailyLimit) {
        return {
          canUse: false,
          remainingUses: 0,
          reason: `Daily limit of ${limits.dailyLimit} uses reached. Resets tomorrow.`
        }
      }

      // Calculate remaining uses based on the most restrictive limit
      let remainingUses = 999 // Default high number
      
      if (limits.dailyLimit) {
        remainingUses = Math.min(remainingUses, limits.dailyLimit - dailyUsage)
      }
      if (limits.weeklyLimit) {
        remainingUses = Math.min(remainingUses, limits.weeklyLimit - weeklyUsage)
      }
      if (limits.monthlyLimit) {
        remainingUses = Math.min(remainingUses, limits.monthlyLimit - monthlyUsage)
      }

      console.log(`[AI Usage] ${featureType} - Remaining uses: ${remainingUses}`)
      
      return { 
        canUse: true, 
        remainingUses: Math.max(0, remainingUses)
      }

    } catch (error) {
      console.error('Error in checkUsageStatus:', error)
      return { canUse: false, reason: 'Service error' }
    }
  }

  // Helper: Get start of current week (Monday)
  private getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  // Helper: Get start of current month
  private getMonthStart(date: Date): Date {
    const d = new Date(date)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  }

  async logUsage(params: {
    userId: string
    brandId?: string | null
    endpoint: string
    metadata?: any
  }): Promise<boolean> {
    try {
      const now = new Date()

      // Insert into ai_usage_logs table
      const { error: logError } = await this.supabase
        .from('ai_usage_logs')
        .insert({
          brand_id: params.brandId || null,
          user_id: params.userId,
          endpoint: params.endpoint,
          metadata: params.metadata || {},
          created_at: now.toISOString()
        })

      if (logError) {
        console.error('Error logging AI usage:', logError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in logUsage:', error)
      return true // Don't fail the main functionality
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
      const today = getCurrentLocalDateString() // Use local timezone instead of UTC

      // Insert into ai_feature_usage table (used by checkUsageStatus)
      // Note: This table only has user_id, feature_type, created_at (no brand_id)
      const { error: featureUsageError } = await this.supabase
        .from('ai_feature_usage')
        .insert({
          user_id: userId,
          feature_type: featureType,
          created_at: now.toISOString()
        })

      if (featureUsageError) {
        console.error('[AI Usage] Error recording to ai_feature_usage:', featureUsageError)
      } else {
        console.log(`✅ [AI Usage] Recorded usage for ${featureType} in ai_feature_usage table`)
      }

      // Try to insert into ai_usage_logs table (new structure)
      const { error: logError } = await this.supabase
        .from('ai_usage_logs')
        .insert({
          brand_id: brandId,
          user_id: userId,
          endpoint: featureType,
          metadata: metadata || {},
          created_at: now.toISOString()
        })

      if (logError && logError.code !== '42P01') {
        console.error('Error recording AI usage:', logError)
      }

      // Update or insert usage tracking for daily/monthly/weekly limits
      const limits = await this.getTierBasedLimits(userId, featureType)
      const currentMonth = now.toISOString().slice(0, 7) + '-01' // First day of month: YYYY-MM-01
      
      if (limits.dailyLimit || limits.weeklyLimit || limits.monthlyLimit) {
        const { data: existingUsage } = await this.supabase
          .from('ai_usage_tracking')
          .select('*')
          .eq('user_id', userId)
          .eq('feature_type', featureType)
          .single()

        if (existingUsage) {
          // Update existing record
          const existingDate = existingUsage.daily_usage_date instanceof Date 
            ? existingUsage.daily_usage_date.toISOString().split('T')[0]
            : existingUsage.daily_usage_date?.toString() || ''
          const existingMonth = existingUsage.monthly_usage_month || ''
          const isNewDay = existingDate !== today
          const isNewMonth = existingMonth !== currentMonth
          
          // For lead generation, count actual leads generated (from metadata.leadsEnriched)
          // For other features, increment by 1
          const incrementAmount = metadata?.leadsEnriched || 1
          
          const newDailyCount = isNewDay ? incrementAmount : (existingUsage.daily_usage_count || 0) + incrementAmount
          const newMonthlyCount = isNewMonth ? incrementAmount : (existingUsage.monthly_usage_count || 0) + incrementAmount

          console.log(`[AI Usage] Recording usage for ${featureType}: isNewDay=${isNewDay}, isNewMonth=${isNewMonth}, incrementAmount=${incrementAmount}, newMonthlyCount=${newMonthlyCount}`)

          const { data: updateData, error: updateError } = await this.supabase
            .from('ai_usage_tracking')
            .update({
              daily_usage_count: newDailyCount,
              daily_usage_date: today,
              monthly_usage_count: newMonthlyCount,
              monthly_usage_month: currentMonth,
              last_used_at: now.toISOString(),
              last_used_by: userId
            })
            .eq('user_id', userId)
            .eq('feature_type', featureType)
            .select()

          if (updateError) {
            console.error('[AI Usage] Error updating usage tracking:', updateError)
            return false
          }
          
          console.log('[AI Usage] Successfully updated usage tracking:', updateData)
        } else {
          // Create new record (tracking per user)
          // For lead generation, count actual leads generated (from metadata.leadsEnriched)
          // For other features, start with 1
          const initialCount = metadata?.leadsEnriched || 1
          
          console.log(`[AI Usage] Creating new usage record for userId=${userId}, feature=${featureType}, initialCount=${initialCount}`)
          const { error: insertError } = await this.supabase
            .from('ai_usage_tracking')
            .insert({
              user_id: userId,
              brand_id: brandId,
              feature_type: featureType,
              daily_usage_count: initialCount,
              daily_usage_date: today,
              monthly_usage_count: initialCount,
              monthly_usage_month: currentMonth,
              last_used_at: now.toISOString(),
              last_used_by: userId
            })
          
          if (insertError) {
            console.error('[AI Usage] Error inserting usage tracking:', insertError)
            return false
          }
          
          console.log('[AI Usage] Successfully created usage tracking record')
        }
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
        creative_analysis: { canUse: true },
        brand_analysis: { canUse: true },
        task_generation: { canUse: true },
        campaign_analysis: { canUse: true },
        smart_response: { canUse: true },
        enhanced_campaign_analysis: { canUse: true },
        creative_generation: { canUse: true },
        lead_gen_enrichment: { canUse: true },
        lead_gen_ecommerce: { canUse: true },
        outreach_messages: { canUse: true }
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
      const today = getCurrentLocalDateString() // Use local timezone instead of UTC
      
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