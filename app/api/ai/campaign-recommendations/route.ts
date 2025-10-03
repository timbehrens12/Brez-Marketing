import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { aiUsageService } from '@/lib/services/ai-usage-service'
import crypto from 'crypto'
import { validateRequest, campaignRecommendationRequestSchema, checkRateLimit, addSecurityHeaders, sanitizeAIInput } from '@/lib/utils/validation'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Helper function to get next Monday 12am
function getNextMondayMidnight(): Date {
  const now = new Date()
  const nextMonday = new Date(now)
  
  // Calculate days until next Monday (1 = Monday)
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  nextMonday.setHours(0, 0, 0, 0)
  
  return nextMonday
}

// Helper function to get the current week identifier (Monday to Sunday)
// Uses server timezone for consistency - this ensures the same week identifier
// regardless of user's timezone, preventing timezone-based bypasses
function getCurrentWeekIdentifier(userTimezone?: string): string {
  // Always use server time for week calculations to prevent timezone manipulation
  // This ensures consistent week boundaries across all users
  const now = new Date()
  const monday = new Date(now)
  
  // Calculate days since Monday (0 = Sunday, 1 = Monday, etc.)
  // In JavaScript: Sunday = 0, Monday = 1, ..., Saturday = 6
  const daysSinceMonday = (now.getDay() + 6) % 7
  monday.setDate(now.getDate() - daysSinceMonday)
  monday.setHours(0, 0, 0, 0)
  
  // Return week identifier as YYYY-MM-DD format of the Monday
  const year = monday.getFullYear()
  const month = String(monday.getMonth() + 1).padStart(2, '0')
  const day = String(monday.getDate()).padStart(2, '0')
  
  const weekId = `${year}-${month}-${day}`
  
  // Log for debugging timezone issues
  console.log('[Week Identifier]', {
    currentTime: now.toISOString(),
    mondayOfWeek: monday.toISOString(),
    weekIdentifier: weekId,
    dayOfWeek: now.getDay(),
    daysSinceMonday,
    userTimezone: userTimezone || 'server-default'
  })
  
  return weekId
}

// Helper function to calculate data hash
function calculateCampaignDataHash(campaignData: any): string {
  const keyDataPoints = {
    budget: campaignData.budget,
    spent: campaignData.spent,
    roas: campaignData.roas,
    impressions: campaignData.impressions,
    clicks: campaignData.clicks,
    conversions: campaignData.conversions,
    ctr: campaignData.ctr,
    cpc: campaignData.cpc,
    status: campaignData.status,
    objective: campaignData.objective
  }
  
  return crypto.createHash('md5').update(JSON.stringify(keyDataPoints)).digest('hex')
}

// PATCH handler to mark recommendations as completed
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { brandId, campaignId, status } = await request.json()
    
    if (!brandId || !campaignId || !status) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    console.log('[Campaign Recommendations PATCH] Updating status:', { brandId, campaignId, status })

    // Initialize Supabase client
    const supabase = createClient()

    // Get the current recommendation from the cache table
    const { data: existingRecommendation, error: fetchError } = await supabase
      .from('ai_campaign_recommendations')
      .select('*')
      .eq('brand_id', brandId)
      .eq('campaign_id', campaignId)
      .single()

    if (fetchError || !existingRecommendation) {
      console.error('Error fetching existing recommendation:', fetchError)
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
    }

    // Update the recommendation status in the cached recommendation
    const updatedRecommendation = {
      ...existingRecommendation.recommendation,
      status: status,
      status_updated_at: new Date().toISOString()
    }

    // Update the recommendation status in the cache table
    const { error: updateError } = await supabase
      .from('ai_campaign_recommendations')
      .update({
        recommendation: updatedRecommendation,
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('campaign_id', campaignId)

    if (updateError) {
      console.error('Error updating recommendation status:', updateError)
      return NextResponse.json({ error: 'Failed to update recommendation status' }, { status: 500 })
    }

    console.log('[Campaign Recommendations PATCH] Status updated successfully:', { brandId, campaignId, status })

    return NextResponse.json({
      success: true,
      message: 'Recommendation status updated successfully',
      recommendation: updatedRecommendation
    })

  } catch (error) {
    console.error('Error updating recommendation status:', error)
    return NextResponse.json({ 
      error: 'Failed to update recommendation status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Configure timeout for Vercel
export const maxDuration = 60 // 60 seconds for Pro accounts
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Add request timeout to prevent hanging
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 50000) // 50 second timeout
  
  try {
    // CAMPAIGN RECOMMENDATIONS WITH WEEKLY BLOCKING
    // This endpoint generates AI-powered campaign optimization recommendations that:
    // 1. Can only be generated ONCE per week (Monday to Sunday)
    // 2. Are automatically blocked from regeneration until the following Monday
    // 3. Track the week they were generated using a week identifier (YYYY-MM-DD of Monday)
    // 4. Provide clear messaging about when next refresh is available
    
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { brandId, campaignId, campaignData, forceRefresh = false, userTimezone } = await request.json()
    
    // IMMEDIATE BLOCKING CHECK - Check for any recent generation first
    const supabaseEarly = createClient()
    const currentWeekEarly = getCurrentWeekIdentifier(userTimezone)
    
    console.log('🚨 [EARLY BLOCKING CHECK] Starting immediate block check:', {
      brandId,
      campaignId,
      currentWeek: currentWeekEarly,
      forceRefresh,
      timestamp: new Date().toISOString()
    })
    
    try {
      const { data: earlyCheck, error: earlyError } = await supabaseEarly
        .from('ai_campaign_recommendations')
        .select('*')
        .eq('brand_id', brandId)
        .eq('campaign_id', campaignId)
        .single()

      if (earlyCheck && !earlyError) {
        const generatedAt = new Date(earlyCheck.generated_at || earlyCheck.created_at)
        const now = new Date()
        const hoursAgo = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60)
        const recommendationWeek = earlyCheck.recommendation?.week_generated
        
        console.log('🚨 [EARLY BLOCKING CHECK] Found existing recommendation:', {
          generatedAt: generatedAt.toISOString(),
          hoursAgo: hoursAgo.toFixed(2),
          recommendationWeek,
          currentWeek: currentWeekEarly,
          willBlock: hoursAgo < 24 || recommendationWeek === currentWeekEarly
        })
        
        // Block if generated within 24 hours OR from current week
        if (hoursAgo < 24 || recommendationWeek === currentWeekEarly) {
          const nextMonday = getNextMondayMidnight()
          const daysUntilMonday = Math.ceil((nextMonday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          
          console.log('🚨 [EARLY BLOCKING CHECK] BLOCKING REQUEST - Recent generation detected')
          
          return NextResponse.json({
            recommendation: earlyCheck.recommendation,
            cached: true,
            blocked: true,
            generatedAt: earlyCheck.generated_at,
            expiresAt: earlyCheck.expires_at,
            refreshAvailable: false,
            weekGenerated: recommendationWeek,
            currentWeek: currentWeekEarly,
            nextRefreshDate: nextMonday.toISOString(),
            daysUntilRefresh: daysUntilMonday,
            hoursAgo: hoursAgo.toFixed(2),
            message: `❌ BLOCKED: Recommendation was generated ${hoursAgo.toFixed(1)} hours ago. Weekly limit reached for ${currentWeekEarly}. Next refresh available Monday (${daysUntilMonday} days).`
          })
        }
      } else {
        console.log('🚨 [EARLY BLOCKING CHECK] No existing recommendation found, proceeding')
      }
    } catch (earlyCheckError) {
      console.log('🚨 [EARLY BLOCKING CHECK] Error in early check:', earlyCheckError)
    }
    
    if (!brandId || !campaignId || !campaignData) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    console.log('[AI Campaign Recommendations] Request received:', {
      brandId,
      campaignId,
      campaignName: campaignData.campaign_name,
      forceRefresh,
      currentWeek: getCurrentWeekIdentifier(userTimezone),
      requestTime: new Date().toISOString()
    })

    // Initialize Supabase client
    const supabase = createClient()
    
    // Calculate current data hash and week identifier
    const currentDataHash = calculateCampaignDataHash(campaignData)
    const currentWeek = getCurrentWeekIdentifier(userTimezone)
    
    // Check for existing valid recommendation
    // Note: Even with forceRefresh=true, we still check for weekly blocking
    // forceRefresh only bypasses data staleness, not the weekly generation limit
    {
      const { data: existingRecommendation, error: fetchError } = await supabase
        .from('ai_campaign_recommendations')
        .select('*')
        .eq('brand_id', brandId)
        .eq('campaign_id', campaignId)
        .single()

      console.log('[AI Campaign Recommendations] Database query result:', {
        hasData: !!existingRecommendation,
        error: fetchError?.message || null,
        errorCode: fetchError?.code || null,
        brandId,
        campaignId
      })

      if (existingRecommendation && !fetchError) {
        // WEEKLY BLOCKING LOGIC: Recommendations can only be generated once per week (Monday to Sunday)
        // Check if the recommendation is from the current week
        const recommendationWeek = existingRecommendation.recommendation?.week_generated || existingRecommendation.recommendation?.generated_week
        const isCurrentWeek = recommendationWeek === currentWeek
        
        console.log('[AI Campaign Recommendations] DETAILED Week check:', {
          existingRecommendation: !!existingRecommendation,
          fetchError: !!fetchError,
          recommendationWeek,
          currentWeek,
          isCurrentWeek,
          generatedAt: existingRecommendation.generated_at,
          fullRecommendationObject: existingRecommendation.recommendation,
          weekGeneratedField: existingRecommendation.recommendation?.week_generated,
          generatedWeekField: existingRecommendation.recommendation?.generated_week,
          hasRecommendationObject: !!existingRecommendation.recommendation
        })
        
        // Additional fallback checks to ensure blocking works even if week_generated field is missing
        let shouldBlock = isCurrentWeek
        
        // Fallback 1: Check if generated today (Monday)
        if (!recommendationWeek && existingRecommendation.generated_at) {
          const generatedDate = new Date(existingRecommendation.generated_at)
          const today = new Date()
          const isSameDay = generatedDate.toDateString() === today.toDateString()
          const isMonday = today.getDay() === 1
          
          if (isSameDay && isMonday) {
            shouldBlock = true
            console.log('[AI Campaign Recommendations] FALLBACK BLOCK 1: Generated today (Monday), blocking regeneration')
          }
        }
        
        // Fallback 2: Check if generated within the current week (Monday to Sunday)
        if (!shouldBlock && existingRecommendation.generated_at) {
          const generatedDate = new Date(existingRecommendation.generated_at)
          const now = new Date()
          
          // Calculate the Monday of the current week
          const mondayOfCurrentWeek = new Date(now)
          const daysSinceMonday = (now.getDay() + 6) % 7
          mondayOfCurrentWeek.setDate(now.getDate() - daysSinceMonday)
          mondayOfCurrentWeek.setHours(0, 0, 0, 0)
          
          // Check if generated date is after the Monday of current week
          if (generatedDate >= mondayOfCurrentWeek) {
            shouldBlock = true
            console.log('[AI Campaign Recommendations] FALLBACK BLOCK 2: Generated within current week, blocking regeneration', {
              generatedDate: generatedDate.toISOString(),
              mondayOfCurrentWeek: mondayOfCurrentWeek.toISOString(),
              currentDay: now.getDay()
            })
          }
        }
        
        // Ultimate fallback: Block any regeneration on the same day (regardless of weekday)
        if (!shouldBlock && existingRecommendation.generated_at) {
          const generatedDate = new Date(existingRecommendation.generated_at)
          const today = new Date()
          const hoursSinceGeneration = (today.getTime() - generatedDate.getTime()) / (1000 * 60 * 60)
          
          // Block if generated within last 24 hours
          if (hoursSinceGeneration < 24) {
            shouldBlock = true
            console.log('[AI Campaign Recommendations] ULTIMATE FALLBACK BLOCK: Generated within last 24 hours, blocking regeneration', {
              generatedDate: generatedDate.toISOString(),
              hoursSinceGeneration: hoursSinceGeneration.toFixed(2)
            })
          }
        }
        
        // If it's from the current week, prevent regeneration regardless of expires_at
        // This ensures recommendations can only be refreshed on Mondays for the new week
        if (shouldBlock) {
          console.log(`[AI Campaign Recommendations] BLOCKED: Recommendation from current week (${currentWeek}) or generated today, preventing regeneration until next Monday`)
          
          // Calculate next Monday for the message
          const nextMonday = getNextMondayMidnight()
          const daysUntilNextMonday = Math.ceil((nextMonday.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          
          return NextResponse.json({
            recommendation: existingRecommendation.recommendation,
            cached: true,
            generatedAt: existingRecommendation.generated_at,
            expiresAt: existingRecommendation.expires_at,
            dataHash: existingRecommendation.data_hash,
            refreshAvailable: false,
            weekGenerated: recommendationWeek,
            currentWeek: currentWeek,
            nextRefreshDate: nextMonday.toISOString(),
            daysUntilRefresh: daysUntilNextMonday,
            message: `Campaign recommendations for week ${currentWeek} have already been generated. Next refresh available on Monday (${daysUntilNextMonday} day${daysUntilNextMonday !== 1 ? 's' : ''} from now).`
          })
        }
        
        // For backward compatibility, also check the traditional expires_at
        // but only if forceRefresh is false AND it's not from current week
        if (!forceRefresh && new Date(existingRecommendation.expires_at) > new Date()) {
          console.log('[AI Campaign Recommendations] Found valid cached recommendation (expires_at check)')
          return NextResponse.json({
            recommendation: existingRecommendation.recommendation,
            cached: true,
            generatedAt: existingRecommendation.generated_at,
            expiresAt: existingRecommendation.expires_at,
            dataHash: existingRecommendation.data_hash,
            refreshAvailable: false
          })
        }
      } else {
        // If no existing recommendation found, log this for debugging
        console.log('[AI Campaign Recommendations] No existing recommendation found:', {
          fetchError: fetchError?.message || null,
          errorCode: fetchError?.code || null,
          brandId,
          campaignId,
          willProceedWithGeneration: true
        })
      }
    }

    // Get previous recommendations to track effectiveness
    const previousRecommendations = await aiUsageService.getPreviousRecommendations(
      brandId, 
      'campaign_recommendations'
    )

    // Fetch brand information (niche/industry)
    const { data: brandInfo } = await supabase
      .from('brands')
      .select('name, niche')
      .eq('id', brandId)
      .single()

    // Fetch additional campaign data from database
    const { data: campaign, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('brand_id', brandId)
      .single()

    if (campaignError || !campaign) {
      console.error('Error fetching campaign:', campaignError)
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Fetch ad sets for this campaign
    const { data: adSets, error: adSetsError } = await supabase
      .from('meta_adsets')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('brand_id', brandId)

    if (adSetsError) {
      console.error('Error fetching ad sets:', adSetsError)
    }

    // Fetch ads for this campaign
    const { data: ads, error: adsError } = await supabase
      .from('meta_ads')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('brand_id', brandId)

    if (adsError) {
      console.error('Error fetching ads:', adsError)
    }

    // Fetch 7-day historical data for campaign, adsets, and ads with timezone awareness
    const historicalData = await fetchCampaignHistoricalData(supabase, campaignId, brandId, userTimezone)
    const adSetHistoricalData = await fetchAdSetHistoricalData(supabase, campaignId, brandId)
    const adHistoricalData = await fetchAdHistoricalData(supabase, campaignId, brandId)
    
    // Fetch demographics data for audience insights in optimization
    const demographicsData = await fetchDemographicsData(supabase, brandId)
    
    // Calculate key metrics and benchmarks with historical context
    const metrics = calculateCampaignMetrics(campaignData, adSets || [], ads || [], historicalData)
    
    // Check if previous recommendations were marked as done
    let completedPreviousRecs = null
    if (previousRecommendations?.recommendations?.recommendation) {
      const { data: completedActions } = await supabase
        .from('optimization_action_log')
        .select('*')
        .eq('brand_id', brandId)
        .eq('campaign_id', campaignId)
        .eq('status', 'completed_manually')
        .gte('applied_at', new Date(previousRecommendations.lastUsed).toISOString())
        .order('applied_at', { ascending: false })
      
      if (completedActions && completedActions.length > 0) {
        completedPreviousRecs = {
          ...previousRecommendations,
          completedActions
        }
      }
    }

    // Generate AI recommendation with comprehensive analysis including previous recommendations tracking
    const recommendation = await generateAIRecommendation(
      campaign, 
      metrics, 
      adSets || [], 
      ads || [], 
      historicalData,
      adSetHistoricalData,
      adHistoricalData,
      completedPreviousRecs || previousRecommendations,
      demographicsData,
      brandInfo
    )

    // Record usage and store current recommendations for future comparison
    await aiUsageService.recordUsage(
      brandId,
      userId,
      'campaign_recommendations',
      {
        campaignId,
        campaignName: campaign.campaign_name,
        recommendation,
        metrics,
        timestamp: new Date().toISOString(),
        currentPerformance: {
          roas: campaignData.roas || 0,
          ctr: campaignData.ctr || 0,
          cpc: campaignData.cpc || 0,
          spent: campaignData.spent || 0,
          conversions: campaignData.conversions || 0
        }
      }
    )

    // Calculate next Monday 12am refresh time
    const nextMondayRefresh = getNextMondayMidnight()
    
    console.log('[Campaign Recommendations] Generation successful:', {
      weekGenerated: currentWeek,
      nextRefresh: nextMondayRefresh.toISOString(),
      daysFromNow: Math.ceil((nextMondayRefresh.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      blockingActive: true
    })

    // Get historical recommendations (last 2-3) for progress tracking
    const getHistoricalRecommendations = () => {
      if (!previousRecommendations?.recommendations?.recommendation) {
        return []
      }

      // Convert previous recommendation to historical format
      const previous = previousRecommendations.recommendations.recommendation
      return [{
        action: previous.action || 'Unknown',
        reasoning: previous.reasoning || 'No details available',
        confidence: previous.confidence || 0,
        date: previousRecommendations.lastUsed.toISOString(),
        status: 'completed' as const // Assume previous recommendations are completed
      }]
    }

    // Save recommendation to cache table with enhanced period and timestamp info
    console.log('[AI Campaign Recommendations] About to save/upsert recommendation:', {
      brandId,
      campaignId,
      currentWeek,
      operation: 'upsert'
    })
    
    // Create the recommendation object to save
    const recommendationToSave = {
      brand_id: brandId,
      campaign_id: campaignId,
      campaign_name: campaignData.campaign_name,
      platform: 'meta', // Assuming Meta for now
      recommendation: {
        ...recommendation,
        generated_at: new Date().toISOString(),
        week_generated: currentWeek,
        analysis_period: {
          from: historicalData.period.from,
          to: historicalData.period.to,
          days: historicalData.period.days,
          timezone: userTimezone || 'server-local'
        },
        last_updated: new Date().toISOString(),
        next_refresh: nextMondayRefresh.toISOString(),
        status: 'active',
        historical_recommendations: getHistoricalRecommendations(),
        data_summary: {
          total_spend_analyzed: historicalData.last7Days.reduce((sum, day) => sum + day.spend, 0),
          total_impressions_analyzed: historicalData.last7Days.reduce((sum, day) => sum + day.impressions, 0),
          total_clicks_analyzed: historicalData.last7Days.reduce((sum, day) => sum + day.clicks, 0),
          total_conversions_analyzed: historicalData.last7Days.reduce((sum, day) => sum + day.conversions, 0),
          average_daily_performance: {
            spend: historicalData.averages.spend,
            roas: historicalData.averages.roas,
            ctr: historicalData.averages.ctr,
            cpc: historicalData.averages.cpc
          }
        }
      },
      data_hash: currentDataHash,
      expires_at: nextMondayRefresh.toISOString(),
      updated_at: new Date().toISOString()
    }

    // Use upsert with onConflict to ensure proper handling
    const { error: saveError } = await supabase
      .from('ai_campaign_recommendations')
      .upsert(recommendationToSave, {
        onConflict: 'brand_id,campaign_id'
      })

    if (saveError) {
      console.error('[Campaign Recommendations] Failed to save recommendation:', saveError)
    } else {
      console.log('[Campaign Recommendations] Successfully saved recommendation with week_generated:', currentWeek)
    }

    return NextResponse.json({
      success: true,
      recommendation: {
        ...recommendation,
        generated_at: new Date().toISOString(),
        week_generated: currentWeek,
        analysis_period: {
          from: historicalData.period.from,
          to: historicalData.period.to,
          days: historicalData.period.days,
          timezone: userTimezone || 'server-local'
        },
        last_updated: new Date().toISOString(),
        next_refresh: nextMondayRefresh.toISOString(),
        status: 'active',
        historical_recommendations: getHistoricalRecommendations(),
        data_summary: {
          total_spend_analyzed: historicalData.last7Days.reduce((sum, day) => sum + day.spend, 0),
          total_impressions_analyzed: historicalData.last7Days.reduce((sum, day) => sum + day.impressions, 0),
          total_clicks_analyzed: historicalData.last7Days.reduce((sum, day) => sum + day.clicks, 0),
          total_conversions_analyzed: historicalData.last7Days.reduce((sum, day) => sum + day.conversions, 0),
          average_daily_performance: {
            spend: historicalData.averages.spend,
            roas: historicalData.averages.roas,
            ctr: historicalData.averages.ctr,
            cpc: historicalData.averages.cpc
          }
        }
      },
      metrics,
      previousRecommendations: previousRecommendations ? {
        lastUsed: previousRecommendations.lastUsed,
        effectiveness: calculateRecommendationEffectiveness(
          previousRecommendations.recommendations,
          campaignData
        )
      } : null,
      cached: false,
      dataHash: currentDataHash,
      refreshAvailable: false,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating campaign recommendation:', error)
    
    // If it's a timeout error, provide more specific message
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json({ 
        error: 'Request timeout',
        message: 'The recommendation generation took too long. Please try again.',
        details: 'The system is experiencing high load. Try again in a few moments.',
        userFriendly: true
      }, { status: 504 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate recommendation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}

// GET handler to fetch saved recommendations
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const campaignIds = searchParams.get('campaignIds')?.split(',').filter(Boolean)

    if (!brandId || !campaignIds || campaignIds.length === 0) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient()

    // Fetch saved recommendations for the given campaigns
    const { data: recommendations, error } = await supabase
      .from('ai_campaign_recommendations')
      .select('campaign_id, recommendation')
      .eq('brand_id', brandId)
      .in('campaign_id', campaignIds)

    if (error) {
      console.error('[Campaign Recommendations API] Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Convert to object format for easy lookup
    const recommendationsMap: Record<string, any> = {}
    if (recommendations) {
      recommendations.forEach(rec => {
        recommendationsMap[rec.campaign_id] = rec.recommendation
      })
    }

    return NextResponse.json({
      success: true,
      recommendations: recommendationsMap,
      count: recommendations?.length || 0
    })

  } catch (error) {
    console.error('[Campaign Recommendations API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Calculate how effective previous recommendations were
function calculateRecommendationEffectiveness(
  previousRec: any,
  currentPerformance: any
): string {
  if (!previousRec?.currentPerformance) {
    return 'No previous data to compare'
  }

  const prev = previousRec.currentPerformance
  const current = currentPerformance

  const roasChange = ((current.roas || 0) - (prev.roas || 0)) / (prev.roas || 1) * 100
  const ctrChange = ((current.ctr || 0) - (prev.ctr || 0)) / (prev.ctr || 1) * 100
  const cpcChange = ((current.cpc || 0) - (prev.cpc || 0)) / (prev.cpc || 1) * 100

  if (roasChange > 10 && ctrChange > 5) {
    return `Significant improvement: ROAS +${roasChange.toFixed(1)}%, CTR +${ctrChange.toFixed(1)}%`
  } else if (roasChange > 5) {
    return `Moderate improvement: ROAS +${roasChange.toFixed(1)}%`
  } else if (roasChange < -10) {
    return `Performance declined: ROAS ${roasChange.toFixed(1)}%`
  } else {
    return `Stable performance: ROAS ${roasChange.toFixed(1)}%`
  }
}

interface CampaignMetrics {
  performanceGrade: string
  budgetUtilization: number
  costEfficiency: string
  audienceReach: string
  conversionRate: number
  benchmarkComparison: {
    ctr: string
    cpc: string
    roas: string
  }
  keyIssues: string[]
  strengths: string[]
  trends: {
    spendTrend: string
    ctrTrend: string
    roasTrend: string
    weekOverWeekChange: number
  }
  consistency: {
    isStable: boolean
    volatilityScore: number
  }
}

interface DailyPerformance {
  date: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  roas: number
}

interface HistoricalData {
  last7Days: DailyPerformance[]
  previous7Days: DailyPerformance[]
  averages: {
    spend: number
    ctr: number
    cpc: number
    roas: number
    impressions: number
    clicks: number
    conversions: number
  }
  trends: {
    spendTrend: number // percentage change over 7 days
    performanceTrend: number // overall performance trend
  }
}

interface AdSetPerformance {
  adset_id: string
  adset_name: string
  status: string
  budget: number
  spent: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  conversions: number
  roas: number
  historical: {
    trend: string
    averageCtr: number
    averageCpc: number
    averageRoas: number
    weekOverWeekChange: number
  }
}

interface AdPerformance {
  ad_id: string
  ad_name: string
  adset_id: string
  status: string
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  conversions: number
  roas: number
  historical: {
    trend: string
    averageCtr: number
    averageCpc: number
    averageRoas: number
    weekOverWeekChange: number
  }
}

async function fetchCampaignHistoricalData(supabase: any, campaignId: string, brandId: string, userTimezone?: string): Promise<HistoricalData & { period: { from: string, to: string, days: number } }> {
  // Use local timezone for consistent date calculations
  const now = new Date()
  
  // Helper function to get date string in user's timezone
  const getLocalDateString = (date: Date): string => {
    if (userTimezone) {
      try {
        const userTime = new Date(date.toLocaleString("en-US", { timeZone: userTimezone }))
        const year = userTime.getFullYear()
        const month = String(userTime.getMonth() + 1).padStart(2, '0')
        const day = String(userTime.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } catch (error) {
        console.warn('[Campaign Recommendations] Invalid timezone, falling back to server local time:', userTimezone)
      }
    }
    
    // Fallback to server's local timezone (not UTC)
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
  
  // Get date strings for the analysis period
  const todayStr = getLocalDateString(today)
  const sevenDaysAgoStr = getLocalDateString(sevenDaysAgo)
  
  console.log(`[Campaign Recommendations] Analyzing 7-day period: ${sevenDaysAgoStr} to ${todayStr} (timezone: ${userTimezone || 'server local'})`)

  // Fetch last 7 days
  const { data: last7Days } = await supabase
    .from('meta_campaign_daily_stats')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .lt('date', today.toISOString().split('T')[0])
    .order('date', { ascending: false })

  // Fetch previous 7 days (for comparison)
  const { data: previous7Days } = await supabase
    .from('meta_campaign_daily_stats')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)
    .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
    .lt('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  const processedLast7Days: DailyPerformance[] = (last7Days || []).map((day: any) => ({
    date: day.date,
    spend: Number(day.spend) || 0,
    impressions: Number(day.impressions) || 0,
    clicks: Number(day.clicks) || 0,
    conversions: Number(day.conversions) || 0,
    ctr: Number(day.ctr) || 0,
    cpc: Number(day.cpc) || 0,
    roas: Number(day.roas) || 0
  }))

  const processedPrevious7Days: DailyPerformance[] = (previous7Days || []).map((day: any) => ({
    date: day.date,
    spend: Number(day.spend) || 0,
    impressions: Number(day.impressions) || 0,
    clicks: Number(day.clicks) || 0,
    conversions: Number(day.conversions) || 0,
    ctr: Number(day.ctr) || 0,
    cpc: Number(day.cpc) || 0,
    roas: Number(day.roas) || 0
  }))

  // Calculate averages for last 7 days
  const averages = processedLast7Days.length > 0 ? {
    spend: processedLast7Days.reduce((sum, day) => sum + day.spend, 0) / processedLast7Days.length,
    ctr: processedLast7Days.reduce((sum, day) => sum + day.ctr, 0) / processedLast7Days.length,
    cpc: processedLast7Days.reduce((sum, day) => sum + day.cpc, 0) / processedLast7Days.length,
    roas: processedLast7Days.reduce((sum, day) => sum + day.roas, 0) / processedLast7Days.length,
    impressions: processedLast7Days.reduce((sum, day) => sum + day.impressions, 0) / processedLast7Days.length,
    clicks: processedLast7Days.reduce((sum, day) => sum + day.clicks, 0) / processedLast7Days.length,
    conversions: processedLast7Days.reduce((sum, day) => sum + day.conversions, 0) / processedLast7Days.length
  } : {
    spend: 0, ctr: 0, cpc: 0, roas: 0, impressions: 0, clicks: 0, conversions: 0
  }

  // Calculate trends
  const lastWeekSpend = processedLast7Days.reduce((sum, day) => sum + day.spend, 0)
  const prevWeekSpend = processedPrevious7Days.reduce((sum, day) => sum + day.spend, 0)
  const spendTrend = prevWeekSpend > 0 ? ((lastWeekSpend - prevWeekSpend) / prevWeekSpend) * 100 : 0

  const lastWeekPerf = processedLast7Days.reduce((sum, day) => sum + day.roas, 0) / Math.max(processedLast7Days.length, 1)
  const prevWeekPerf = processedPrevious7Days.reduce((sum, day) => sum + day.roas, 0) / Math.max(processedPrevious7Days.length, 1)
  const performanceTrend = prevWeekPerf > 0 ? ((lastWeekPerf - prevWeekPerf) / prevWeekPerf) * 100 : 0

  return {
    last7Days: processedLast7Days,
    previous7Days: processedPrevious7Days,
    averages,
    trends: {
      spendTrend,
      performanceTrend
    },
    period: {
      from: sevenDaysAgoStr,
      to: todayStr,
      days: 7
    }
  }
}

async function fetchAdSetHistoricalData(supabase: any, campaignId: string, brandId: string): Promise<AdSetPerformance[]> {
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Get current adset data
  const { data: adSets } = await supabase
    .from('meta_adsets')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)

  if (!adSets || adSets.length === 0) {
    return []
  }

  const adSetPerformances: AdSetPerformance[] = []

  for (const adSet of adSets) {
    // Fetch 7-day historical data for this adset
    const { data: last7Days } = await supabase
      .from('meta_adset_daily_stats')
      .select('*')
      .eq('adset_id', adSet.adset_id)
      .eq('brand_id', brandId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .lt('date', today.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Fetch previous 7 days for comparison
    const { data: previous7Days } = await supabase
      .from('meta_adset_daily_stats')
      .select('*')
      .eq('adset_id', adSet.adset_id)
      .eq('brand_id', brandId)
      .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
      .lt('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Calculate averages and trends
    const recentData = last7Days || []
    const previousData = previous7Days || []

    const averageCtr = recentData.length > 0 ? 
      recentData.reduce((sum: number, day: any) => sum + (Number(day.ctr) || 0), 0) / recentData.length : 0
    const averageCpc = recentData.length > 0 ?
      recentData.reduce((sum: number, day: any) => sum + (Number(day.cpc) || 0), 0) / recentData.length : 0
    const averageRoas = recentData.length > 0 ?
      recentData.reduce((sum: number, day: any) => sum + (Number(day.roas) || 0), 0) / recentData.length : 0

    const previousAverageRoas = previousData.length > 0 ?
      previousData.reduce((sum: number, day: any) => sum + (Number(day.roas) || 0), 0) / previousData.length : 0

    const weekOverWeekChange = previousAverageRoas > 0 ? 
      ((averageRoas - previousAverageRoas) / previousAverageRoas) * 100 : 0

    let trend = 'stable'
    if (weekOverWeekChange > 10) trend = 'improving'
    else if (weekOverWeekChange < -10) trend = 'declining'

    adSetPerformances.push({
      adset_id: adSet.adset_id,
      adset_name: adSet.adset_name,
      status: adSet.status,
      budget: Number(adSet.budget) || 0,
      spent: Number(adSet.spent) || 0,
      impressions: Number(adSet.impressions) || 0,
      clicks: Number(adSet.clicks) || 0,
      ctr: Number(adSet.ctr) || 0,
      cpc: Number(adSet.cpc) || 0,
      conversions: Number(adSet.conversions) || 0,
      roas: Number(adSet.roas) || 0,
      historical: {
        trend,
        averageCtr,
        averageCpc,
        averageRoas,
        weekOverWeekChange
      }
    })
  }

  return adSetPerformances
}

async function fetchAdHistoricalData(supabase: any, campaignId: string, brandId: string): Promise<AdPerformance[]> {
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Get current ad data
  const { data: ads } = await supabase
    .from('meta_ads')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)

  if (!ads || ads.length === 0) {
    return []
  }

  const adPerformances: AdPerformance[] = []

  for (const ad of ads) {
    // Fetch 7-day historical data for this ad
    const { data: last7Days } = await supabase
      .from('meta_ad_daily_stats')
      .select('*')
      .eq('ad_id', ad.ad_id)
      .eq('brand_id', brandId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .lt('date', today.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Fetch previous 7 days for comparison
    const { data: previous7Days } = await supabase
      .from('meta_ad_daily_stats')
      .select('*')
      .eq('ad_id', ad.ad_id)
      .eq('brand_id', brandId)
      .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
      .lt('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Calculate averages and trends
    const recentData = last7Days || []
    const previousData = previous7Days || []

    const averageCtr = recentData.length > 0 ? 
      recentData.reduce((sum: number, day: any) => sum + (Number(day.ctr) || 0), 0) / recentData.length : 0
    const averageCpc = recentData.length > 0 ?
      recentData.reduce((sum: number, day: any) => sum + (Number(day.cpc) || 0), 0) / recentData.length : 0
    const averageRoas = recentData.length > 0 ?
      recentData.reduce((sum: number, day: any) => sum + (Number(day.roas) || 0), 0) / recentData.length : 0

    const previousAverageRoas = previousData.length > 0 ?
      previousData.reduce((sum: number, day: any) => sum + (Number(day.roas) || 0), 0) / previousData.length : 0

    const weekOverWeekChange = previousAverageRoas > 0 ? 
      ((averageRoas - previousAverageRoas) / previousAverageRoas) * 100 : 0

    let trend = 'stable'
    if (weekOverWeekChange > 15) trend = 'improving'
    else if (weekOverWeekChange < -15) trend = 'declining'

    adPerformances.push({
      ad_id: ad.ad_id,
      ad_name: ad.ad_name,
      adset_id: ad.adset_id,
      status: ad.status,
      impressions: Number(ad.impressions) || 0,
      clicks: Number(ad.clicks) || 0,
      ctr: Number(ad.ctr) || 0,
      cpc: Number(ad.cpc) || 0,
      conversions: Number(ad.conversions) || 0,
      roas: Number(ad.roas) || 0,
      historical: {
        trend,
        averageCtr,
        averageCpc,
        averageRoas,
        weekOverWeekChange
      }
    })
  }

  return adPerformances
}

async function fetchDemographicsData(supabase: any, brandId: string) {
  try {
    // Get Meta connection for this brand
    const { data: metaConnection } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (!metaConnection) {
      return null
    }

    // Fetch recent demographic data (last 30 days for campaign optimization context)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    const { data: demographics } = await supabase
      .from('meta_demographics')
      .select('*')
      .eq('connection_id', metaConnection.id)
      .gte('date_range_start', thirtyDaysAgo)
      .lte('date_range_end', today)
      .order('impressions', { ascending: false })
      .limit(20)

    const { data: deviceData } = await supabase
      .from('meta_device_performance')
      .select('*')
      .eq('connection_id', metaConnection.id)
      .gte('date_range_start', thirtyDaysAgo)
      .lte('date_range_end', today)
      .order('impressions', { ascending: false })
      .limit(10)

    if (!demographics?.length && !deviceData?.length) {
      return null
    }

    return {
      age: demographics?.filter((d: any) => d.breakdown_type === 'age') || [],
      gender: demographics?.filter((d: any) => d.breakdown_type === 'gender') || [],
      devices: deviceData?.filter((d: any) => d.breakdown_type === 'device') || [],
      placements: deviceData?.filter((d: any) => d.breakdown_type === 'placement') || []
    }
  } catch (error) {
    console.error('Error fetching demographics data for campaign optimization:', error)
    return null
  }
}

function calculateCampaignMetrics(campaign: any, adSets: any[], ads: any[], historicalData: HistoricalData): CampaignMetrics {
  const { spent, budget, impressions, clicks, conversions, ctr, cpc, roas } = campaign
  
  // Calculate budget utilization
  const budgetUtilization = budget > 0 ? (spent / budget) * 100 : 0
  
  // Calculate conversion rate
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0
  
  // Benchmark thresholds (industry standards)
  const benchmarks = {
    ctr: { good: 2.0, average: 1.0, poor: 0.5 },
    cpc: { good: 1.0, average: 2.0, poor: 4.0 },
    roas: { good: 4.0, average: 2.0, poor: 1.0 }
  }

  // Performance grading
  let performanceScore = 0
  if (ctr >= benchmarks.ctr.good) performanceScore += 3
  else if (ctr >= benchmarks.ctr.average) performanceScore += 2
  else performanceScore += 1

  if (cpc <= benchmarks.cpc.good) performanceScore += 3
  else if (cpc <= benchmarks.cpc.average) performanceScore += 2
  else performanceScore += 1

  if (roas >= benchmarks.roas.good) performanceScore += 3
  else if (roas >= benchmarks.roas.average) performanceScore += 2
  else performanceScore += 1

  const performanceGrade = performanceScore >= 8 ? 'Excellent' : 
                          performanceScore >= 6 ? 'Good' : 
                          performanceScore >= 4 ? 'Average' : 'Poor'

  // Cost efficiency assessment
  const costEfficiency = cpc <= benchmarks.cpc.good ? 'Efficient' :
                        cpc <= benchmarks.cpc.average ? 'Moderate' : 'Inefficient'

  // Audience reach assessment
  const audienceReach = impressions > 100000 ? 'Excellent' :
                       impressions > 50000 ? 'Good' :
                       impressions > 10000 ? 'Average' : 'Limited'

  // Identify key issues
  const keyIssues = []
  if (ctr < benchmarks.ctr.average) keyIssues.push('Low click-through rate')
  if (cpc > benchmarks.cpc.average) keyIssues.push('High cost per click')
  if (roas < benchmarks.roas.average) keyIssues.push('Low return on ad spend')
  if (budgetUtilization < 50) keyIssues.push('Under-utilizing budget')
  if (budgetUtilization > 90) keyIssues.push('Budget nearly exhausted')
  if (conversions < 10) keyIssues.push('Low conversion volume')

  // Identify strengths
  const strengths = []
  if (ctr >= benchmarks.ctr.good) strengths.push('Strong engagement rate')
  if (cpc <= benchmarks.cpc.good) strengths.push('Cost-effective clicks')
  if (roas >= benchmarks.roas.good) strengths.push('High return on investment')
  if (impressions > 100000) strengths.push('Excellent reach')
  if (conversionRate > 5) strengths.push('High conversion rate')

  // Calculate trends based on historical data
  const calculateTrend = (current: number, historical: number) => {
    if (historical === 0) return 'stable'
    const change = ((current - historical) / historical) * 100
    if (change > 10) return 'improving'
    if (change < -10) return 'declining'
    return 'stable'
  }

  const spendTrend = calculateTrend(spent, historicalData.averages.spend * 7)
  const ctrTrend = calculateTrend(ctr, historicalData.averages.ctr)
  const roasTrend = calculateTrend(roas, historicalData.averages.roas)

  // Calculate performance consistency (volatility)
  const roasValues = historicalData.last7Days.map(day => day.roas).filter(val => val > 0)
  const avgRoas = roasValues.reduce((sum, val) => sum + val, 0) / Math.max(roasValues.length, 1)
  const variance = roasValues.reduce((sum, val) => sum + Math.pow(val - avgRoas, 2), 0) / Math.max(roasValues.length, 1)
  const volatilityScore = Math.sqrt(variance) / Math.max(avgRoas, 1) * 100
  const isStable = volatilityScore < 25 // Less than 25% coefficient of variation is considered stable

  return {
    performanceGrade,
    budgetUtilization,
    costEfficiency,
    audienceReach,
    conversionRate,
    benchmarkComparison: {
      ctr: ctr >= benchmarks.ctr.good ? 'Above Average' : 
           ctr >= benchmarks.ctr.average ? 'Average' : 'Below Average',
      cpc: cpc <= benchmarks.cpc.good ? 'Excellent' : 
           cpc <= benchmarks.cpc.average ? 'Average' : 'Poor',
      roas: roas >= benchmarks.roas.good ? 'Excellent' : 
            roas >= benchmarks.roas.average ? 'Average' : 'Poor'
    },
    keyIssues,
    strengths,
    trends: {
      spendTrend,
      ctrTrend,
      roasTrend,
      weekOverWeekChange: historicalData.trends.performanceTrend
    },
    consistency: {
      isStable,
      volatilityScore
    }
  }
}

async function generateAIRecommendation(campaign: any, metrics: CampaignMetrics, adSets: any[], ads: any[], historicalData: HistoricalData, adSetHistoricalData: AdSetPerformance[], adHistoricalData: AdPerformance[], previousRecommendations: any, demographicsData: any, brandInfo: any) {
  // Format adset analysis
  const adSetAnalysis = adSetHistoricalData.map(adSet => 
    `AdSet: ${adSet.adset_name} (${adSet.status})
    - Budget: $${adSet.budget}, Spent: $${adSet.spent} (${adSet.budget > 0 ? ((adSet.spent / adSet.budget) * 100).toFixed(1) : 0}% utilization)
    - CTR: ${adSet.ctr?.toFixed(2) || 0}% (7-day avg: ${adSet.historical.averageCtr.toFixed(2)}%)
    - CPC: $${adSet.cpc?.toFixed(2) || 0} (7-day avg: $${adSet.historical.averageCpc.toFixed(2)})
    - ROAS: ${adSet.roas?.toFixed(2) || 0}x (7-day avg: ${adSet.historical.averageRoas.toFixed(2)}x)
    - Trend: ${adSet.historical.trend} (${adSet.historical.weekOverWeekChange > 0 ? '+' : ''}${adSet.historical.weekOverWeekChange.toFixed(1)}% WoW)
    - Impressions: ${adSet.impressions?.toLocaleString() || 0}, Clicks: ${adSet.clicks?.toLocaleString() || 0}, Conversions: ${adSet.conversions || 0}`
  ).join('\n\n')

  // Format ad analysis
  const adAnalysis = adHistoricalData.map(ad => 
    `Ad: ${ad.ad_name} (${ad.status}) - AdSet: ${ad.adset_id}
    - CTR: ${ad.ctr?.toFixed(2) || 0}% (7-day avg: ${ad.historical.averageCtr.toFixed(2)}%)
    - CPC: $${ad.cpc?.toFixed(2) || 0} (7-day avg: $${ad.historical.averageCpc.toFixed(2)})
    - ROAS: ${ad.roas?.toFixed(2) || 0}x (7-day avg: ${ad.historical.averageRoas.toFixed(2)}x)
    - Trend: ${ad.historical.trend} (${ad.historical.weekOverWeekChange > 0 ? '+' : ''}${ad.historical.weekOverWeekChange.toFixed(1)}% WoW)
    - Impressions: ${ad.impressions?.toLocaleString() || 0}, Clicks: ${ad.clicks?.toLocaleString() || 0}, Conversions: ${ad.conversions || 0}`
  ).join('\n\n')

  // Identify top performing and underperforming assets
  const topAdSets = adSetHistoricalData.filter(as => as.historical.trend === 'improving' && as.roas > 2.0)
  const underperformingAdSets = adSetHistoricalData.filter(as => as.historical.trend === 'declining' || as.roas < 1.0)
  const topAds = adHistoricalData.filter(ad => ad.historical.trend === 'improving' && ad.roas > 2.0)
  const underperformingAds = adHistoricalData.filter(ad => ad.historical.trend === 'declining' || ad.roas < 1.0)

  // Include previous recommendations context ONLY if they were marked as done
  const previousRecContext = (previousRecommendations?.completedActions && previousRecommendations.completedActions.length > 0) ? `
PREVIOUS RECOMMENDATION ANALYSIS (from ${previousRecommendations.lastUsed.toLocaleDateString()}):
- Previous Action: ${previousRecommendations.recommendations.recommendation?.action || 'Unknown'}
- Previous Reasoning: ${previousRecommendations.recommendations.recommendation?.reasoning || 'No details'}
- User Marked as COMPLETED: ${previousRecommendations.completedActions.map((a: any) => a.action_details?.description || 'Action completed').join(', ')}
- Completed On: ${new Date(previousRecommendations.completedActions[0].applied_at).toLocaleDateString()}
- Effectiveness Since Completion: ${calculateRecommendationEffectiveness(previousRecommendations.recommendations, campaign)}
- Time Since Completion: ${Math.round((new Date().getTime() - new Date(previousRecommendations.completedActions[0].applied_at).getTime()) / (1000 * 60 * 60))} hours

CRITICAL INSTRUCTION: The user IMPLEMENTED the previous recommendation. Compare current performance with previous metrics and evaluate if the recommendation worked. Adjust strategy based on actual results.
` : previousRecommendations ? `
PREVIOUS RECOMMENDATION (NOT IMPLEMENTED - from ${previousRecommendations.lastUsed.toLocaleDateString()}):
- Previous Action Suggested: ${previousRecommendations.recommendations.recommendation?.action || 'Unknown'}
- Previous Reasoning: ${previousRecommendations.recommendations.recommendation?.reasoning || 'No details'}
- Status: User DID NOT mark this as done (not implemented)

CRITICAL INSTRUCTION: The previous recommendation was NOT implemented by the user. DO NOT evaluate its effectiveness. Provide fresh recommendations based solely on current data. You may reference the previous suggestion as context but do not assume it was applied.
` : `
FIRST-TIME ANALYSIS: This is the first recommendation for this campaign.
`

  const prompt = `
You are an expert Meta advertising strategist specializing in ${brandInfo?.niche || 'e-commerce'} brands. Analyze the following campaign data focusing EXCLUSIVELY on 7-day historical performance data. Base your recommendations ONLY on the 7-day analysis period provided below. Reference specific metrics from the 7-day data in your reasoning. CRITICALLY evaluate the effectiveness of any previous recommendations. Provide a specific, actionable recommendation that considers granular performance at the adset and ad level.

${previousRecContext}

BRAND CONTEXT:
Brand: ${brandInfo?.name || 'Unknown'}
Industry/Niche: ${brandInfo?.niche || 'General E-commerce'}
IMPORTANT: Tailor your recommendations specifically for this industry. Consider industry-specific benchmarks, customer behavior, and best practices for ${brandInfo?.niche || 'e-commerce'} advertising.

CAMPAIGN OVERVIEW:
Campaign: ${campaign.campaign_name}
Campaign Objective: ${campaign.objective} (${campaign.objective === 'OUTCOME_SALES' ? 'Sales/Conversions' : campaign.objective === 'OUTCOME_LEADS' ? 'Lead Generation' : campaign.objective === 'OUTCOME_TRAFFIC' ? 'Traffic' : campaign.objective === 'OUTCOME_AWARENESS' ? 'Brand Awareness' : campaign.objective})
Status: ${campaign.status}
Budget: $${campaign.budget} (${campaign.budget_type})
Total Spent (Campaign Lifetime): $${campaign.spent}
Budget Utilization: ${metrics.budgetUtilization.toFixed(1)}%

CRITICAL: Your recommendations MUST align with the campaign objective (${campaign.objective}). For sales campaigns, focus on ROAS and conversions. For lead gen, focus on cost per lead and lead quality. For awareness, focus on reach and CPM.

7-DAY PERFORMANCE ANALYSIS (Last 7 Days):
- Total Impressions: ${historicalData.last7Days.reduce((sum, day) => sum + day.impressions, 0).toLocaleString() || 0}
- Total Clicks: ${historicalData.last7Days.reduce((sum, day) => sum + day.clicks, 0).toLocaleString() || 0}
- Average Daily CTR: ${historicalData.averages.ctr.toFixed(2)}%
- Average Daily CPC: $${historicalData.averages.cpc.toFixed(2)}
- Total Conversions: ${historicalData.last7Days.reduce((sum, day) => sum + day.conversions, 0)}
- Average Daily ROAS: ${historicalData.averages.roas.toFixed(2)}x
- Total Spend: $${historicalData.last7Days.reduce((sum, day) => sum + day.spend, 0).toFixed(2)}

7-DAY PERFORMANCE TRENDS:
- Spend Trend: ${metrics.trends.spendTrend} (${historicalData.trends.spendTrend > 0 ? '+' : ''}${historicalData.trends.spendTrend.toFixed(1)}% vs previous week)
- CTR Trend: ${metrics.trends.ctrTrend}
- ROAS Trend: ${metrics.trends.roasTrend}
- Performance Consistency: ${metrics.consistency.isStable ? 'Stable' : 'Volatile'} (${metrics.consistency.volatilityScore.toFixed(1)}% volatility)
- Week-over-Week Performance Change: ${historicalData.trends.performanceTrend > 0 ? '+' : ''}${historicalData.trends.performanceTrend.toFixed(1)}%

DETAILED ADSET ANALYSIS (${adSetHistoricalData.length} adsets):
${adSetAnalysis}

DETAILED AD ANALYSIS (${adHistoricalData.length} ads):
${adAnalysis}

PERFORMANCE HIGHLIGHTS:
Top Performing AdSets (${topAdSets.length}): ${topAdSets.map(as => as.adset_name).join(', ') || 'None'}
Underperforming AdSets (${underperformingAdSets.length}): ${underperformingAdSets.map(as => as.adset_name).join(', ') || 'None'}
Top Performing Ads (${topAds.length}): ${topAds.map(ad => ad.ad_name).join(', ') || 'None'}
Underperforming Ads (${underperformingAds.length}): ${underperformingAds.map(ad => ad.ad_name).join(', ') || 'None'}

CAMPAIGN ASSESSMENT:
- Grade: ${metrics.performanceGrade}
- Cost Efficiency: ${metrics.costEfficiency}
- Audience Reach: ${metrics.audienceReach}
- Key Issues: ${metrics.keyIssues.join(', ') || 'None'}
- Strengths: ${metrics.strengths.join(', ') || 'None'}

AUDIENCE DEMOGRAPHICS ANALYSIS (Last 30 Days):
${demographicsData ? `
Age Demographics:
${demographicsData.age.slice(0, 5).map((segment: any) => 
  `- ${segment.breakdown_value}: ${parseInt(segment.impressions).toLocaleString()} impressions, ${parseFloat(segment.ctr).toFixed(2)}% CTR, ${parseFloat(segment.roas || 0).toFixed(2)}x ROAS`
).join('\n') || 'No age data available'}

Gender Demographics:
${demographicsData.gender.map((segment: any) => 
  `- ${segment.breakdown_value}: ${parseInt(segment.impressions).toLocaleString()} impressions, ${parseFloat(segment.ctr).toFixed(2)}% CTR, ${parseFloat(segment.roas || 0).toFixed(2)}x ROAS`
).join('\n') || 'No gender data available'}

Device Performance:
${demographicsData.devices.map((device: any) => 
  `- ${device.breakdown_value}: ${parseInt(device.impressions).toLocaleString()} impressions, ${parseFloat(device.ctr).toFixed(2)}% CTR, ${parseFloat(device.roas || 0).toFixed(2)}x ROAS`
).join('\n') || 'No device data available'}

AUDIENCE INSIGHTS FOR OPTIMIZATION:
- Identify top-performing demographic segments for scaling
- Spot underperforming segments that may need creative refreshes or exclusion
- Device-specific performance differences for budget allocation
- Gender/age targeting opportunities based on ROAS performance
` : 'No demographics data available - consider audience research for targeting optimization'}

CRITICAL ANALYSIS REQUIREMENTS:
1. NEVER recommend "leave as is" for campaigns with ROAS < 2.0 or zero conversions with meaningful spend (>$10)
2. Campaigns with 0x ROAS and any spend >$5 should be paused immediately
3. Campaigns with <1.5x ROAS and >$15 spend need urgent optimization or pausing
4. Campaigns with declining trends over 3+ days need immediate action
5. Always provide specific, actionable recommendations rather than "leave as is"
6. Examine individual adset and ad performance trends, not just campaign-level metrics
7. Identify which specific adsets/ads are driving campaign performance (positive or negative)
8. Consider budget allocation across adsets and their relative performance
9. Analyze creative fatigue at the ad level (declining trends in high-impression ads)
10. Evaluate targeting effectiveness at the adset level
11. Provide specific recommendations for individual adsets and ads, not just campaign-level actions
12. Use audience demographics to identify optimization opportunities (high-performing age/gender segments to scale, underperforming segments to exclude)
13. Consider device performance differences when recommending budget allocation or bid adjustments
14. Suggest targeting refinements based on demographic performance patterns

Provide a comprehensive recommendation in the following JSON format:
{
  "action": "One of: increase budget, reduce budget, increase cpc, reduce cpc, optimize targeting, pause campaign, restructure adsets, pause underperforming ads, scale top performers, refresh creative, expand audience, narrow targeting",
  "reasoning": "Detailed explanation based on adset and ad analysis, including specific performance patterns observed",
  "impact": "Expected outcome considering individual adset/ad performance changes",
  "confidence": "Confidence level from 1-10 (based on data quality and performance patterns)",
  "implementation": "Step-by-step guide including specific adset/ad actions (e.g., 'Pause AdSet X', 'Increase budget for AdSet Y by 50%', 'Test new creative for underperforming Ad Z')",
  "forecast": "Predicted performance changes based on observed adset/ad trends and proposed changes",
  "specific_actions": {
    "adsets_to_scale": ["List of adset names to increase budget/bids"],
    "adsets_to_optimize": ["List of adset names needing targeting/bid optimization"],
    "adsets_to_pause": ["List of adset names to pause"],
    "ads_to_pause": ["List of ad names to pause due to fatigue/poor performance"],
    "ads_to_duplicate": ["List of top-performing ad names to duplicate and test"]
  }
}

Focus on the most impactful actions that address specific adset and ad performance patterns, not just general campaign-level adjustments.
`

  try {
    // Add timeout to OpenAI call to prevent hanging
    const openaiPromise = openai.chat.completions.create({
      model: 'gpt-5-mini', // GPT-5 Mini - strategic campaign recommendations
      messages: [
        {
          role: 'system',
          content: 'You are an expert Meta advertising strategist focused on providing actionable, data-driven recommendations. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 1000
      // Note: GPT-5 models only support temperature=1 (default)
    })

    // Add 15-second timeout to OpenAI API call
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API timeout - using fallback recommendation')), 15000)
    })

    const response = await Promise.race([openaiPromise, timeoutPromise]) as any

    const content = response.choices[0].message.content || '{}'
    let cleanedContent = content
    
    // Remove markdown code blocks if present
    if (content.includes('```json')) {
      cleanedContent = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '')
    } else if (content.includes('```')) {
      cleanedContent = content.replace(/```\s*/g, '').replace(/```\s*$/g, '')
    }

    const recommendation = JSON.parse(cleanedContent)
    
    // Validate the recommendation structure
    if (!recommendation.action || !recommendation.reasoning) {
      throw new Error('Invalid recommendation format')
    }

    return recommendation

  } catch (error) {
    console.error('Error generating AI recommendation:', error)
    
    // Fallback to rule-based recommendation if AI fails
    return generateRuleBasedRecommendation(campaign, metrics, historicalData)
  }
}

function generateRuleBasedRecommendation(campaign: any, metrics: CampaignMetrics, historicalData: HistoricalData) {
  const { 
    spent, budget, ctr, cpc, roas, conversions, impressions, clicks, 
    objective, campaign_name, status, budget_type 
  } = campaign
  
  const { 
    budgetUtilization, performanceGrade, trends, consistency, 
    keyIssues, strengths, benchmarkComparison 
  } = metrics

  // Analyze objective-specific performance
  const objectiveAnalysis = analyzeObjectivePerformance(campaign, metrics, historicalData)
  
  // Detect performance anomalies
  const anomalies = detectPerformanceAnomalies(campaign, metrics, historicalData)
  
  // Generate forecasts based on current trends
  const forecast = generatePerformanceForecast(campaign, metrics, historicalData)
  
  // Determine primary recommendation based on objective and performance
  const recommendation = determinePrimaryRecommendation(campaign, metrics, historicalData, objectiveAnalysis, anomalies, forecast)
  
  return recommendation
}

function analyzeObjectivePerformance(campaign: any, metrics: CampaignMetrics, historicalData: HistoricalData) {
  const { objective, spent, conversions, roas, ctr, cpc, impressions, clicks } = campaign
  
  switch (objective?.toLowerCase()) {
    case 'outcome_sales':
    case 'conversions':
      return {
        primary_metric: 'ROAS',
        target_roas: 3.0,
        current_performance: roas,
        conversion_rate: conversions > 0 ? (conversions / clicks) * 100 : 0,
        cost_per_conversion: conversions > 0 ? spent / conversions : spent,
        efficiency_score: roas >= 3.0 ? 'excellent' : roas >= 2.0 ? 'good' : roas >= 1.0 ? 'poor' : 'critical',
        benchmark_comparison: roas >= 2.5 ? 'above_average' : roas >= 1.5 ? 'average' : 'below_average'
      }
    
    case 'outcome_traffic':
    case 'link_clicks':
      return {
        primary_metric: 'CPC',
        target_cpc: 2.0,
        current_performance: cpc,
        click_rate: clicks > 0 ? (clicks / impressions) * 100 : 0,
        cost_per_click: cpc,
        efficiency_score: cpc <= 2.0 ? 'excellent' : cpc <= 4.0 ? 'good' : cpc <= 6.0 ? 'poor' : 'critical',
        benchmark_comparison: cpc <= 2.5 ? 'above_average' : cpc <= 4.5 ? 'average' : 'below_average'
      }
    
    case 'outcome_awareness':
    case 'reach':
      return {
        primary_metric: 'CPM',
        target_cpm: 15.0,
        current_performance: spent / (impressions / 1000),
        reach_efficiency: impressions / spent,
        cost_per_impression: spent / impressions,
        efficiency_score: (spent / (impressions / 1000)) <= 15.0 ? 'excellent' : (spent / (impressions / 1000)) <= 25.0 ? 'good' : 'poor',
        benchmark_comparison: (spent / (impressions / 1000)) <= 18.0 ? 'above_average' : 'below_average'
      }
    
    case 'outcome_engagement':
    case 'post_engagement':
      return {
        primary_metric: 'CTR',
        target_ctr: 2.0,
        current_performance: ctr,
        engagement_rate: ctr,
        cost_per_engagement: cpc,
        efficiency_score: ctr >= 2.0 ? 'excellent' : ctr >= 1.0 ? 'good' : ctr >= 0.5 ? 'poor' : 'critical',
        benchmark_comparison: ctr >= 1.8 ? 'above_average' : ctr >= 1.0 ? 'average' : 'below_average'
      }
    
    default:
      return {
        primary_metric: 'ROAS',
        target_roas: 2.0,
        current_performance: roas,
        efficiency_score: roas >= 2.0 ? 'good' : roas >= 1.0 ? 'poor' : 'critical',
        benchmark_comparison: roas >= 1.8 ? 'above_average' : 'below_average'
      }
  }
}

function detectPerformanceAnomalies(campaign: any, metrics: CampaignMetrics, historicalData: HistoricalData) {
  const anomalies = []
  const { spent, conversions, roas, ctr, cpc, impressions, clicks } = campaign
  
  // Check for spending anomalies
  if (metrics.budgetUtilization > 95 && roas < 1.5) {
    anomalies.push({
      type: 'budget_overrun',
      severity: 'high',
      description: `Spent ${metrics.budgetUtilization.toFixed(1)}% of budget with ${roas.toFixed(2)}x ROAS`,
      impact: `$${(spent - (spent * roas)).toFixed(2)} net loss`
    })
  }
  
  // Check for conversion anomalies
  if (conversions === 0 && spent > 20) {
    anomalies.push({
      type: 'zero_conversions',
      severity: 'critical',
      description: `No conversions despite $${spent.toFixed(2)} spend and ${clicks} clicks`,
      impact: `100% budget waste, ${((conversions / clicks) * 100).toFixed(2)}% conversion rate`
    })
  }
  
  // Check for CTR anomalies
  if (ctr < 0.5 && impressions > 10000) {
    anomalies.push({
      type: 'low_engagement',
      severity: 'medium',
      description: `CTR of ${ctr.toFixed(2)}% from ${impressions.toLocaleString()} impressions`,
      impact: `Poor ad relevance, high impression waste`
    })
  }
  
  // Check for CPC anomalies
  if (cpc > 8.0 && conversions > 0) {
    anomalies.push({
      type: 'high_cpc',
      severity: 'medium',
      description: `CPC of $${cpc.toFixed(2)} with ${conversions} conversions`,
      impact: `Cost per conversion: $${(spent / conversions).toFixed(2)}`
    })
  }
  
     // Check for trend anomalies
   if (metrics.trends.roasTrend === 'declining' && historicalData.trends.performanceTrend < -20) {
     anomalies.push({
       type: 'performance_decline',
       severity: 'high',
       description: `ROAS declined ${Math.abs(historicalData.trends.performanceTrend).toFixed(1)}% over 7 days`,
       impact: `Projected additional loss: $${(spent * 0.2).toFixed(2)} weekly`
     })
   }
  
  return anomalies
}

function generatePerformanceForecast(campaign: any, metrics: CampaignMetrics, historicalData: HistoricalData) {
  const { spent, conversions, roas, ctr, cpc, budget } = campaign
  const { budgetUtilization, trends } = metrics
  
  // Calculate weekly projections
  const weeklySpend = spent * 7
  const weeklyConversions = conversions * 7
  const weeklyRevenue = weeklySpend * roas
  
  // Trend-based forecasting
  const trendMultiplier = trends.roasTrend === 'improving' ? 1.1 : 
                         trends.roasTrend === 'declining' ? 0.9 : 1.0
  
  const projectedWeeklyROAS = roas * trendMultiplier
  const projectedWeeklyRevenue = weeklySpend * projectedWeeklyROAS
  const projectedWeeklyProfit = projectedWeeklyRevenue - weeklySpend
  
  // Budget utilization forecast
  const remainingBudget = budget - spent
  const projectedDaysRemaining = remainingBudget / (spent || 1)
  
  return {
    weekly_spend: weeklySpend,
    weekly_conversions: weeklyConversions,
    weekly_revenue: weeklyRevenue,
    projected_weekly_roas: projectedWeeklyROAS,
    projected_weekly_revenue: projectedWeeklyRevenue,
    projected_weekly_profit: projectedWeeklyProfit,
    budget_runway_days: projectedDaysRemaining,
    trend_direction: trends.roasTrend,
    performance_outlook: projectedWeeklyROAS >= 2.0 ? 'positive' : projectedWeeklyROAS >= 1.0 ? 'neutral' : 'negative'
  }
}

function determinePrimaryRecommendation(campaign: any, metrics: CampaignMetrics, historicalData: HistoricalData, objectiveAnalysis: any, anomalies: any[], forecast: any) {
  const { spent, conversions, roas, ctr, cpc, impressions, clicks, objective, campaign_name, budget } = campaign
  
  // Handle critical anomalies first - ALWAYS actionable
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical')
  if (criticalAnomalies.length > 0) {
    const anomaly = criticalAnomalies[0]
    return {
      action: 'pause campaign',
      reasoning: `CRITICAL ISSUE: ${anomaly.description}. Campaign "${campaign_name}" with ${objective} objective is experiencing ${anomaly.impact}. Current performance: ${conversions} conversions, ${roas.toFixed(2)}x ROAS, $${cpc.toFixed(2)} CPC from $${spent.toFixed(2)} spend.`,
      impact: `Immediate action required to prevent further losses. Current trajectory: ${forecast.performance_outlook} with ${forecast.budget_runway_days.toFixed(1)} days of budget remaining.`,
      confidence: 10,
      implementation: `1. Pause campaign immediately in Meta Ads Manager\n2. Audit conversion tracking and pixel implementation\n3. Review landing page experience and offer alignment\n4. Analyze audience targeting for relevance\n5. Reactivate only after fixing root cause`,
      forecast: `Pausing now prevents estimated $${(forecast.weekly_spend * 0.5).toFixed(2)} in additional losses this week. Fix implementation could improve ROAS to 2.0x+ target.`
    }
  }
  
  // Handle high-severity anomalies - ALWAYS actionable  
  const highAnomalies = anomalies.filter(a => a.severity === 'high')
  if (highAnomalies.length > 0) {
    const anomaly = highAnomalies[0]
    
    if (anomaly.type === 'budget_overrun') {
      return {
        action: 'reduce budget',
        reasoning: `BUDGET OVERRUN: Campaign "${campaign_name}" (${objective}) spent ${metrics.budgetUtilization.toFixed(1)}% of budget generating ${roas.toFixed(2)}x ROAS. Analysis shows ${anomaly.impact} with ${conversions} conversions from ${clicks} clicks (${((conversions/clicks)*100).toFixed(2)}% conversion rate).`,
        impact: `Reduce spend to achieve target 3.0x ROAS. Current trajectory shows ${forecast.projected_weekly_profit >= 0 ? 'profit' : 'loss'} of $${Math.abs(forecast.projected_weekly_profit).toFixed(2)}/week.`,
        confidence: 9,
        implementation: `1. Reduce daily budget by 40% to $${(campaign.budget * 0.6).toFixed(2)}\n2. Pause adsets with ROAS < 1.5x immediately\n3. Reallocate remaining budget to top-performing adsets\n4. Set bid cap at $${(cpc * 0.7).toFixed(2)} to control costs\n5. Monitor performance every 12 hours`,
        forecast: `Budget reduction could improve ROAS to ${(roas * 1.4).toFixed(2)}x, saving $${(forecast.weekly_spend * 0.4).toFixed(2)} weekly while maintaining conversions.`
      }
    }
    
    if (anomaly.type === 'performance_decline') {
      return {
        action: 'refresh creative',
        reasoning: `PERFORMANCE DECLINE: Campaign "${campaign_name}" (${objective}) shows ${Math.abs(historicalData.trends.performanceTrend).toFixed(1)}% decline over 7 days. Current ${roas.toFixed(2)}x ROAS trending toward ${forecast.projected_weekly_roas.toFixed(2)}x. CTR dropped to ${ctr.toFixed(2)}% from ${impressions.toLocaleString()} impressions.`,
        impact: `Reverse declining trend before reaching break-even. Current trajectory: ${forecast.performance_outlook} outlook with ${forecast.budget_runway_days.toFixed(1)} days budget remaining.`,
        confidence: 8,
        implementation: `1. Create 3 new ad variations with fresh creative immediately\n2. Pause all ads with CTR < 1.0%\n3. Test new headlines and call-to-action copy\n4. Launch dynamic product ads if not already running\n5. Monitor CTR improvements hourly for 48 hours`,
        forecast: `Creative refresh could reverse decline, improving ROAS to ${(objectiveAnalysis.target_roas).toFixed(2)}x and generating $${(forecast.weekly_spend * 0.4).toFixed(2)} additional weekly revenue.`
      }
    }
  }
  
  // Specific performance-based recommendations - NO generic fallbacks
  
  // Zero or very low ROAS - PAUSE immediately
  if (roas < 0.8 && spent > 10) {
    return {
      action: 'pause campaign',
      reasoning: `LOSING MONEY: Campaign "${campaign_name}" has ${roas.toFixed(2)}x ROAS with $${spent.toFixed(2)} spent. You're losing $${(spent - (spent * roas)).toFixed(2)} on every dollar spent. This is unsustainable.`,
      impact: `Stop losses immediately. You're currently losing money on every sale/conversion.`,
      confidence: 10,
      implementation: `1. PAUSE campaign immediately\n2. Check conversion tracking is working\n3. Review landing page conversion rate\n4. Analyze audience quality\n5. Fix issues before reactivating`,
      forecast: `Pausing prevents $${(spent * 0.3).toFixed(2)} additional losses this week. Fix could achieve 2.0x+ ROAS.`
    }
  }
  
  // Low ROAS but profitable - OPTIMIZE
  if (roas >= 0.8 && roas < 1.8 && spent > 15) {
    return {
      action: 'optimize targeting',
      reasoning: `UNDERPERFORMING: Campaign "${campaign_name}" has ${roas.toFixed(2)}x ROAS with ${conversions} conversions from ${clicks} clicks. Cost per conversion is $${(spent/conversions).toFixed(2)}. Targeting needs refinement.`,
      impact: `Improve targeting to reach 2.5x+ ROAS and reduce cost per conversion to $${((spent/conversions) * 0.7).toFixed(2)}.`,
      confidence: 9,
      implementation: `1. Narrow audience by 50% to core demographics\n2. Exclude broad interest categories\n3. Add lookalike audiences based on converters\n4. Increase minimum age to 25+\n5. Test detailed targeting options`,
      forecast: `Better targeting could improve ROAS to 2.2x+, generating $${(forecast.weekly_spend * 0.3).toFixed(2)} additional weekly profit.`
    }
  }
  
  // Excellent performance - SCALE  
  if (roas >= objectiveAnalysis.target_roas && metrics.budgetUtilization < 80) {
    return {
      action: 'increase budget',
      reasoning: `SCALING OPPORTUNITY: Campaign "${campaign_name}" performing excellently with ${roas.toFixed(2)}x ROAS vs ${objectiveAnalysis.target_roas}x target. Generated ${conversions} conversions at $${(spent/conversions).toFixed(2)} cost. Only using ${metrics.budgetUtilization.toFixed(1)}% of budget.`,
      impact: `Scale budget to capture more high-performing traffic. Projected weekly revenue: $${forecast.projected_weekly_revenue.toFixed(2)} with $${forecast.projected_weekly_profit.toFixed(2)} profit.`,
      confidence: 9,
      implementation: `1. Increase daily budget by 60% to $${(campaign.budget * 1.6).toFixed(2)}\n2. Duplicate top-performing adsets\n3. Expand to lookalike audiences (1-3%)\n4. Monitor CPC - pause scaling if exceeds $${(cpc * 1.2).toFixed(2)}\n5. Scale further if ROAS stays above ${(objectiveAnalysis.target_roas * 0.9).toFixed(2)}x`,
      forecast: `Scaling could generate additional ${Math.round(conversions * 0.6)} conversions weekly, increasing revenue by $${(forecast.weekly_revenue * 0.6).toFixed(2)}.`
    }
  }
  
  // High CPC - REDUCE COSTS
  if (cpc > 5.0 && conversions > 0) {
    return {
      action: 'reduce cpc',
      reasoning: `HIGH COSTS: Campaign "${campaign_name}" has $${cpc.toFixed(2)} CPC with ${conversions} conversions. Each conversion costs $${(spent/conversions).toFixed(2)}. This is above industry benchmarks.`,
      impact: `Reduce cost per conversion from $${(spent/conversions).toFixed(2)} to target $${((spent/conversions) * 0.7).toFixed(2)} through bid optimization.`,
      confidence: 8,
      implementation: `1. Reduce bid cap to $${(cpc * 0.7).toFixed(2)}\n2. Switch to "Lowest Cost" bidding strategy\n3. Exclude expensive placements (Stories, Reels if poor performance)\n4. Test automatic placements\n5. Monitor conversion volume for 48 hours`,
      forecast: `CPC reduction could save $${(spent * 0.25).toFixed(2)} weekly while maintaining ${Math.round(conversions * 0.8)} conversions.`
    }
  }
  
  // Low CTR - CREATIVE ISSUE
  if (ctr < 0.8 && impressions > 25000) {
    return {
      action: 'refresh creative',
      reasoning: `POOR ENGAGEMENT: Campaign "${campaign_name}" has ${ctr.toFixed(2)}% CTR from ${impressions.toLocaleString()} impressions. Only ${clicks} people clicked. Creative is not resonating with audience.`,
      impact: `Improve CTR from ${ctr.toFixed(2)}% to 2.0%+ through better creative, potentially doubling click volume.`,
      confidence: 8,
      implementation: `1. Create 5 new ad variations with different images/videos\n2. Test emotional vs logical messaging\n3. Add strong call-to-action buttons\n4. Pause ads with CTR < 0.5%\n5. A/B test headlines and descriptions`,
      forecast: `Creative refresh could double CTR, reducing CPC to $${(cpc * 0.5).toFixed(2)} and generating ${Math.round(clicks * 0.8)} additional clicks weekly.`
    }
  }
  
  // Good performance but room for improvement - OPTIMIZE
  if (conversions > 0 && roas >= 1.8 && roas < objectiveAnalysis.target_roas) {
    return {
      action: 'optimize bidding',
      reasoning: `OPTIMIZATION OPPORTUNITY: Campaign "${campaign_name}" generates ${conversions} conversions at ${roas.toFixed(2)}x ROAS. Performance is good but below ${objectiveAnalysis.target_roas}x target. Room for bidding improvements.`,
      impact: `Improve efficiency from ${roas.toFixed(2)}x to ${objectiveAnalysis.target_roas}x+ ROAS through better bidding strategy.`,
      confidence: 7,
      implementation: `1. Switch to "Maximize Conversions" bidding strategy\n2. Set up conversion value optimization\n3. Test different bid strategies for 5 days each\n4. Implement automated bid rules\n5. Monitor cost per conversion closely`,
      forecast: `Bidding optimization could improve ROAS by 25-35%, increasing weekly profit by $${(forecast.weekly_spend * 0.25).toFixed(2)}.`
    }
  }
  
  // Fallback - but still actionable based on primary metric
  if (conversions === 0 && clicks > 10) {
    return {
      action: 'fix conversion tracking',
      reasoning: `CONVERSION TRACKING ISSUE: Campaign "${campaign_name}" has ${clicks} clicks but zero conversions. This suggests conversion tracking problems or landing page issues.`,
      impact: `Fix tracking to properly measure campaign performance and optimize for actual conversions.`,
      confidence: 9,
      implementation: `1. Check Facebook Pixel implementation\n2. Test conversion events in Events Manager\n3. Review landing page load time and mobile experience\n4. Verify purchase/lead forms are working\n5. Test conversion flow manually`,
      forecast: `Fixing tracking could reveal actual conversion rate, potentially showing 1-3% conversion rate from current traffic.`
    }
  }
  
  // Last resort - still specific and actionable
  return {
    action: 'pause campaign', 
    reasoning: `POOR PERFORMANCE: Campaign "${campaign_name}" shows insufficient performance with ${conversions} conversions, ${roas.toFixed(2)}x ROAS, and $${spent.toFixed(2)} spent. Current metrics don't justify continued spend.`,
    impact: `Stop budget waste and redesign campaign strategy from scratch.`,
    confidence: 7,
    implementation: `1. Pause campaign immediately\n2. Analyze competitor ads for inspiration\n3. Research target audience pain points\n4. Create new campaign with fresh strategy\n5. Test with small budget before scaling`,
    forecast: `Pausing prevents additional losses. New campaign could achieve 2.0x+ ROAS with proper setup.`
  }
} 