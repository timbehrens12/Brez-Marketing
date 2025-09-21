/**
 * Meta Campaign Sync Validator
 * 
 * Prevents stale data issues by automatically detecting and handling:
 * - Deleted campaigns in Meta but still in database
 * - New campaigns in Meta not yet in database  
 * - Budget mismatches between Meta and database
 * 
 * This is the long-term solution to prevent $0 budget issues in production.
 */

import { createClient } from '@supabase/supabase-js'
import { withMetaRateLimit } from './meta-rate-limiter'

interface ValidationResult {
  needsSync: boolean
  staleCampaigns: string[]
  newCampaigns: string[]
  budgetMismatches: string[]
  errors: string[]
}

interface CampaignValidation {
  campaignId: string
  existsInMeta: boolean
  existsInDb: boolean
  metaBudget: number | null
  dbBudget: number | null
  budgetMatch: boolean
}

export class MetaSyncValidator {
  private supabase: any
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }

  /**
   * Main validation function - checks if database campaigns are in sync with Meta
   */
  async validateCampaignSync(brandId: string, accessToken: string, accountId: string): Promise<ValidationResult> {
    console.log(`[MetaSyncValidator] Starting validation for brand ${brandId}`)
    
    const result: ValidationResult = {
      needsSync: false,
      staleCampaigns: [],
      newCampaigns: [],
      budgetMismatches: [],
      errors: []
    }

    try {
      // 1. Get campaigns from database
      const { data: dbCampaigns, error: dbError } = await this.supabase
        .from('meta_campaigns')
        .select('campaign_id, campaign_name, budget, budget_type, status')
        .eq('brand_id', brandId)
      
      if (dbError) {
        result.errors.push(`Database error: ${dbError.message}`)
        return result
      }

      // 2. Get current campaigns from Meta API  
      const metaCampaigns = await this.fetchCurrentMetaCampaigns(accessToken, accountId)
      if (!metaCampaigns) {
        result.errors.push('Failed to fetch campaigns from Meta API')
        return result
      }

      // 3. Cross-validate campaigns
      const validations = await this.validateCampaigns(dbCampaigns || [], metaCampaigns, accessToken)
      
      // 4. Identify issues
      for (const validation of validations) {
        if (!validation.existsInMeta && validation.existsInDb) {
          result.staleCampaigns.push(validation.campaignId)
          result.needsSync = true
        }
        
        if (validation.existsInMeta && !validation.existsInDb) {
          result.newCampaigns.push(validation.campaignId)
          result.needsSync = true
        }
        
        if (!validation.budgetMatch && validation.existsInMeta && validation.existsInDb) {
          result.budgetMismatches.push(validation.campaignId)
          result.needsSync = true
        }
      }

      console.log(`[MetaSyncValidator] Validation complete - needsSync: ${result.needsSync}`)
      return result

    } catch (error) {
      console.error('[MetaSyncValidator] Validation error:', error)
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Fetch current active campaigns from Meta API
   */
  private async fetchCurrentMetaCampaigns(accessToken: string, accountId: string): Promise<any[] | null> {
    try {
      const response = await withMetaRateLimit(
        accountId,
        async () => {
          const url = `https://graph.facebook.com/v18.0/act_${accountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget&access_token=${accessToken}`
          const res = await fetch(url)
          
          if (!res.ok) {
            const errorData = await res.json()
            throw errorData
          }
          
          return await res.json()
        },
        1, // High priority
        'sync-validator-campaigns',
        10000 // 10 second timeout
      )

      return response.data || []
    } catch (error) {
      console.error('[MetaSyncValidator] Error fetching Meta campaigns:', error)
      return null
    }
  }

  /**
   * Cross-validate each campaign between database and Meta
   */
  private async validateCampaigns(dbCampaigns: any[], metaCampaigns: any[], accessToken: string): Promise<CampaignValidation[]> {
    const validations: CampaignValidation[] = []
    
    // Create maps for easy lookup
    const dbCampaignMap = new Map(dbCampaigns.map(c => [c.campaign_id, c]))
    const metaCampaignMap = new Map(metaCampaigns.map(c => [c.id, c]))
    
    // Get all unique campaign IDs from both sources
    const allCampaignIds = new Set([
      ...dbCampaigns.map(c => c.campaign_id),
      ...metaCampaigns.map(c => c.id)
    ])

    for (const campaignId of allCampaignIds) {
      const dbCampaign = dbCampaignMap.get(campaignId)
      const metaCampaign = metaCampaignMap.get(campaignId)
      
      let metaBudget = null
      if (metaCampaign) {
        // Extract budget from Meta campaign
        if (metaCampaign.daily_budget) {
          metaBudget = parseFloat(metaCampaign.daily_budget) / 100 // Convert cents to dollars
        } else if (metaCampaign.lifetime_budget) {
          metaBudget = parseFloat(metaCampaign.lifetime_budget) / 100
        }
      }
      
      const dbBudget = dbCampaign ? parseFloat(dbCampaign.budget || '0') : null
      
      const validation: CampaignValidation = {
        campaignId,
        existsInMeta: !!metaCampaign,
        existsInDb: !!dbCampaign,
        metaBudget,
        dbBudget,
        budgetMatch: this.budgetsMatch(metaBudget, dbBudget)
      }
      
      validations.push(validation)
    }

    return validations
  }

  /**
   * Check if budgets match (with tolerance for rounding)
   */
  private budgetsMatch(metaBudget: number | null, dbBudget: number | null): boolean {
    if (metaBudget === null && dbBudget === null) return true
    if (metaBudget === null || dbBudget === null) return false
    
    // Allow for small rounding differences
    const tolerance = 0.01
    return Math.abs(metaBudget - dbBudget) <= tolerance
  }

  /**
   * Auto-fix stale data by marking campaigns as deleted and recalculating budgets
   */
  async autoFixStaleData(brandId: string, validationResult: ValidationResult): Promise<boolean> {
    try {
      console.log(`[MetaSyncValidator] Auto-fixing stale data for brand ${brandId}`)
      
      // 1. Mark stale campaigns as deleted in database
      if (validationResult.staleCampaigns.length > 0) {
        const { error: updateError } = await this.supabase
          .from('meta_campaigns')
          .update({ 
            status: 'DELETED',
            budget: 0,
            budget_type: 'unknown',
            adset_budget_total: 0,
            updated_at: new Date().toISOString()
          })
          .eq('brand_id', brandId)
          .in('campaign_id', validationResult.staleCampaigns)
        
        if (updateError) {
          console.error('[MetaSyncValidator] Error marking stale campaigns:', updateError)
          return false
        }
        
        console.log(`[MetaSyncValidator] Marked ${validationResult.staleCampaigns.length} stale campaigns as deleted`)
      }

      // 2. Mark related ad sets as deleted too
      if (validationResult.staleCampaigns.length > 0) {
        const { error: adsetError } = await this.supabase
          .from('meta_adsets')
          .update({
            status: 'DELETED',
            budget: 0,
            budget_type: 'unknown',
            updated_at: new Date().toISOString()
          })
          .eq('brand_id', brandId)
          .in('campaign_id', validationResult.staleCampaigns)
        
        if (adsetError) {
          console.error('[MetaSyncValidator] Error marking stale ad sets:', adsetError)
        } else {
          console.log(`[MetaSyncValidator] Marked ad sets for stale campaigns as deleted`)
        }
      }

      // 3. Recalculate adset_budget_total for remaining active campaigns
      await this.recalculateAdSetBudgetTotals(brandId)

      console.log('[MetaSyncValidator] Auto-fix completed successfully')
      return true

    } catch (error) {
      console.error('[MetaSyncValidator] Auto-fix error:', error)
      return false
    }
  }

  /**
   * Recalculate adset_budget_total for all active campaigns
   */
  private async recalculateAdSetBudgetTotals(brandId: string): Promise<void> {
    try {
      console.log(`[MetaSyncValidator] Recalculating ad set budget totals for brand ${brandId}`)
      
      // Get all active campaigns
      const { data: campaigns, error: campaignsError } = await this.supabase
        .from('meta_campaigns')
        .select('id, campaign_id, campaign_name')
        .eq('brand_id', brandId)
        .eq('status', 'ACTIVE')
      
      if (campaignsError || !campaigns) {
        console.error('[MetaSyncValidator] Error fetching campaigns for budget recalculation:', campaignsError)
        return
      }

      // For each campaign, calculate total budget from active ad sets
      for (const campaign of campaigns) {
        const { data: adSets, error: adSetsError } = await this.supabase
          .from('meta_adsets')
          .select('budget, budget_type')
          .eq('brand_id', brandId)
          .eq('campaign_id', campaign.campaign_id)
          .eq('status', 'ACTIVE')
        
        if (adSetsError) {
          console.error(`[MetaSyncValidator] Error fetching ad sets for campaign ${campaign.campaign_id}:`, adSetsError)
          continue
        }

        // Calculate total budget from active ad sets
        const totalBudget = (adSets || []).reduce((sum, adSet) => {
          return sum + (parseFloat(adSet.budget || '0'))
        }, 0)

        // Determine budget type (prefer daily if any ad set uses daily)
        const budgetType = (adSets || []).some(adSet => adSet.budget_type === 'daily') ? 'daily' : 'lifetime'

        // Update campaign with calculated totals
        const { error: updateError } = await this.supabase
          .from('meta_campaigns')
          .update({
            adset_budget_total: totalBudget,
            budget: totalBudget,
            budget_type: budgetType,
            budget_source: 'adsets',
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign.id)
        
        if (updateError) {
          console.error(`[MetaSyncValidator] Error updating budget for campaign ${campaign.campaign_id}:`, updateError)
        } else {
          console.log(`[MetaSyncValidator] Updated campaign ${campaign.campaign_id} budget to $${totalBudget} (${budgetType})`)
        }
      }

    } catch (error) {
      console.error('[MetaSyncValidator] Error in recalculateAdSetBudgetTotals:', error)
    }
  }

  /**
   * Check if a sync is needed and handle it automatically
   */
  async checkAndAutoSync(brandId: string): Promise<{ success: boolean, message: string, syncTriggered: boolean }> {
    try {
      // Get Meta connection
      const { data: connection, error: connectionError } = await this.supabase
        .from('platform_connections')
        .select('access_token, metadata')
        .eq('brand_id', brandId)
        .eq('platform_type', 'meta')
        .eq('status', 'active')
        .single()
      
      if (connectionError || !connection?.access_token) {
        return {
          success: false,
          message: 'No active Meta connection found',
          syncTriggered: false
        }
      }

      const accountId = connection.metadata?.account_id || connection.metadata?.ad_account_id
      if (!accountId) {
        return {
          success: false,
          message: 'No account ID found in connection metadata',
          syncTriggered: false
        }
      }

      // Run validation
      const validation = await this.validateCampaignSync(brandId, connection.access_token, accountId.replace('act_', ''))
      
      if (!validation.needsSync) {
        return {
          success: true,
          message: 'No sync needed - data is current',
          syncTriggered: false
        }
      }

      // Auto-fix stale data
      const fixSuccess = await this.autoFixStaleData(brandId, validation)
      
      return {
        success: fixSuccess,
        message: fixSuccess 
          ? `Auto-sync completed: ${validation.staleCampaigns.length} stale campaigns cleaned up`
          : 'Auto-sync failed',
        syncTriggered: true
      }

    } catch (error) {
      console.error('[MetaSyncValidator] checkAndAutoSync error:', error)
      return {
        success: false,
        message: `Auto-sync error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        syncTriggered: false
      }
    }
  }
}

export const metaSyncValidator = new MetaSyncValidator()
