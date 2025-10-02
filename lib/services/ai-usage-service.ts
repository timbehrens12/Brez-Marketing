import { createClient } from '@/lib/supabase/server'
import { getCurrentLocalDateString, dateToLocalDateString } from '@/lib/utils/timezone'

export type AIFeatureType = 
  | 'campaign_recommendations' 
  | 'health_report' 
  | 'ai_consultant_chat'
  | 'marketing_analysis'
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
}

export interface AIFeatureLimits {
  dailyLimit?: number
  cooldownHours?: number
  requiresPreviousRecommendations?: boolean
}

// Define limits for each AI feature
const AI_FEATURE_LIMITS: Record<AIFeatureType, AIFeatureLimits> = {
  campaign_recommendations: {
    cooldownHours: 24, // 24-hour cooldown (weekly)
    requiresPreviousRecommendations: true
  },
  health_report: {
    dailyLimit: 3 // 3 health reports per day
  },
  ai_consultant_chat: {
    dailyLimit: 15 // 15 chat messages per day
  },
  marketing_analysis: {
    dailyLimit: 5 // 5 marketing analyses per day
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
    dailyLimit: 20 // 20 creative generations per day
  },
  lead_gen_enrichment: {
    dailyLimit: 100 // 100 lead enrichments per day
  },
  lead_gen_ecommerce: {
    dailyLimit: 50 // 50 ecommerce lead generations per day
  },
  outreach_messages: {
    dailyLimit: 100 // 100 outreach messages per day
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

      // Get existing usage record (per brand, shared between all users)
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
        return { 
          canUse: true, 
          remainingUses: limits.dailyLimit || 0 
        }
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
        const today = getCurrentLocalDateString()
        // Handle both string and Date types from database
        const usageDate = usage.daily_usage_date instanceof Date 
          ? usage.daily_usage_date.toISOString().split('T')[0]
          : usage.daily_usage_date.toString()
        
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
        
        const remaining = limits.dailyLimit - usage.daily_usage_count
        console.log(`[AI Usage] Daily limit check: ${usage.daily_usage_count}/${limits.dailyLimit}, remaining: ${remaining}`)
        console.log(`[AI Usage] Full usage object:`, usage)
        console.log(`[AI Usage] Returning:`, { canUse: true, remainingUses: remaining })
        return { 
          canUse: true, 
          remainingUses: remaining 
        }
      }

      return { 
        canUse: true, 
        remainingUses: limits.dailyLimit || 0 
      }

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
      const today = getCurrentLocalDateString() // Use local timezone instead of UTC

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

      // Update or insert usage tracking for daily limits
      const limits = AI_FEATURE_LIMITS[featureType]
      if (limits.dailyLimit) {
        const { data: existingUsage } = await this.supabase
          .from('ai_usage_tracking')
          .select('*')
          .eq('brand_id', brandId)
          .eq('feature_type', featureType)
          .single()

        if (existingUsage) {
          // Update existing record
          const existingDate = existingUsage.daily_usage_date instanceof Date 
            ? existingUsage.daily_usage_date.toISOString().split('T')[0]
            : existingUsage.daily_usage_date.toString()
          const isNewDay = existingDate !== today
          const newCount = isNewDay ? 1 : (existingUsage.daily_usage_count || 0) + 1

          console.log(`[AI Usage] Recording usage: existingDate=${existingDate}, today=${today}, isNewDay=${isNewDay}, newCount=${newCount}`)

          const { data: updateData, error: updateError } = await this.supabase
            .from('ai_usage_tracking')
            .update({
              daily_usage_count: newCount,
              daily_usage_date: today,
              last_used_at: now.toISOString(),
              last_used_by: userId
            })
            .eq('brand_id', brandId)
            .eq('feature_type', featureType)
            .select()

          if (updateError) {
            console.error('[AI Usage] Error updating usage tracking:', updateError)
            return false
          }
          
          console.log('[AI Usage] Successfully updated usage tracking:', updateData)
        } else {
          // Create new record (tracking per brand, shared between all users)
          console.log(`[AI Usage] Creating new usage record for brandId=${brandId}, feature=${featureType}, used by userId=${userId}`)
          await this.supabase
            .from('ai_usage_tracking')
            .insert({
              user_id: userId, // Store who created the record initially
              brand_id: brandId,
              feature_type: featureType,
              daily_usage_count: 1,
              daily_usage_date: today,
              last_used_at: now.toISOString(),
              last_used_by: userId
            })
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