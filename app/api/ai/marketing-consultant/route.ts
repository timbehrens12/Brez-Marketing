import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { aiUsageService } from '@/lib/services/ai-usage-service'
import { getCurrentLocalDateString } from '@/lib/utils/timezone'

// Smart date range parsing from natural language and conversation history
function parseeDateRangeFromPrompt(prompt: string, conversationHistory: any[] = []): { from?: string, to?: string, days?: number } | null {
  const lowerPrompt = prompt.toLowerCase()
  // Use Eastern Time to get the correct "today" for US-based businesses
  const today = new Date()
  const easternTime = new Date(today.toLocaleString("en-US", {timeZone: "America/New_York"}))
  const currentYear = easternTime.getFullYear()
  
  // Specific day counts
  const dayPatterns = [
    { pattern: /(?:last|past)\s*(\d+)\s*days?/, multiplier: 1 },
    { pattern: /(?:last|past)\s*(\d+)\s*weeks?/, multiplier: 7 },
    { pattern: /(?:last|past)\s*(\d+)\s*months?/, multiplier: 30 },
    { pattern: /(?:last|past)\s*(\d+)\s*years?/, multiplier: 365 }
  ]
  
  for (const { pattern, multiplier } of dayPatterns) {
    const match = lowerPrompt.match(pattern)
    if (match) {
      const number = parseInt(match[1])
      return { days: number * multiplier }
    }
  }
  
  // Common time periods
  const commonPeriods: { [key: string]: number } = {
    'today': 0, // Special case - will be handled below
    'yesterday': 1,
    'last week': 7,
    'past week': 7,
    'last 2 weeks': 14,
    'past 2 weeks': 14,
    'last month': 30,
    'past month': 30,
    'last quarter': 90,
    'past quarter': 90,
    'last 6 months': 180,
    'past 6 months': 180,
    'last year': 365,
    'past year': 365,
    'last 2 years': 730,
    'past 2 years': 730,
    // Additional common patterns
    'this week': 7,
    'this month': 30,
    'this quarter': 90,
    'this year': 365
  }
  
  for (const [phrase, days] of Object.entries(commonPeriods)) {
    if (lowerPrompt.includes(phrase)) {
      // Handle "today" specifically with exact date range
      if (phrase === 'today') {
        const todayStr = easternTime.toISOString().split('T')[0]
        const yesterdayStr = new Date(easternTime.getTime() - 24*60*60*1000).toISOString().split('T')[0]
        console.log(`[AI Marketing Consultant] Parsing "today" query - todayStr: ${todayStr}, yesterdayStr: ${yesterdayStr}`)
        
        // For "today" queries, primarily focus on today but include yesterday as fallback
        // Check if it's early in the day (before 6 AM) and include yesterday for better data
        const currentHour = easternTime.getHours()
        const isEarlyMorning = currentHour < 6
        
        console.log(`[AI Marketing Consultant] Current Eastern Time: ${easternTime.toISOString()}, Hour: ${currentHour}, isEarlyMorning: ${isEarlyMorning}`)
        
        const result = {
          from: isEarlyMorning ? yesterdayStr : todayStr,
          to: todayStr
        }
        
        console.log(`[AI Marketing Consultant] Final date range for "today": ${JSON.stringify(result)}`)
        
        return result
      }
      
      // Handle "yesterday" specifically with exact date range  
      if (phrase === 'yesterday') {
        const yesterdayStr = new Date(easternTime.getTime() - 24*60*60*1000).toISOString().split('T')[0]
        console.log(`[AI Marketing Consultant] Parsing "yesterday" query - yesterdayStr: ${yesterdayStr}`)
        
        const result = {
          from: yesterdayStr,
          to: yesterdayStr
        }
        
        console.log(`[AI Marketing Consultant] Final date range for "yesterday": ${JSON.stringify(result)}`)
        
        return result
      }
      return { days }
    }
  }
  
  // Seasonal/holiday periods (approximate dates)
  
  // Christmas season
  if (lowerPrompt.includes('christmas') || lowerPrompt.includes('holiday season')) {
    if (lowerPrompt.includes('last christmas')) {
      return {
        from: `${currentYear - 1}-12-01`,
        to: `${currentYear - 1}-12-31`
      }
    }
    return {
      from: `${currentYear}-12-01`,
      to: `${currentYear}-12-31`
    }
  }
  
  // Black Friday / Cyber Monday
  if (lowerPrompt.includes('black friday') || lowerPrompt.includes('cyber monday')) {
    const targetYear = lowerPrompt.includes('last') ? currentYear - 1 : currentYear
    return {
      from: `${targetYear}-11-20`,
      to: `${targetYear}-11-30`
    }
  }
  
  // Quarterly analysis
  if (lowerPrompt.includes('q1') || lowerPrompt.includes('first quarter')) {
    const targetYear = lowerPrompt.includes('last') || lowerPrompt.includes(String(currentYear - 1)) ? currentYear - 1 : currentYear
    return {
      from: `${targetYear}-01-01`,
      to: `${targetYear}-03-31`
    }
  }
  
  if (lowerPrompt.includes('q2') || lowerPrompt.includes('second quarter')) {
    const targetYear = lowerPrompt.includes('last') || lowerPrompt.includes(String(currentYear - 1)) ? currentYear - 1 : currentYear
    return {
      from: `${targetYear}-04-01`,
      to: `${targetYear}-06-30`
    }
  }
  
  if (lowerPrompt.includes('q3') || lowerPrompt.includes('third quarter')) {
    const targetYear = lowerPrompt.includes('last') || lowerPrompt.includes(String(currentYear - 1)) ? currentYear - 1 : currentYear
    return {
      from: `${targetYear}-07-01`,
      to: `${targetYear}-09-30`
    }
  }
  
  if (lowerPrompt.includes('q4') || lowerPrompt.includes('fourth quarter')) {
    const targetYear = lowerPrompt.includes('last') || lowerPrompt.includes(String(currentYear - 1)) ? currentYear - 1 : currentYear
    return {
      from: `${targetYear}-10-01`,
      to: `${targetYear}-12-31`
    }
  }
  
  // Specific years
  const yearMatch = lowerPrompt.match(/(?:year\s+)?(\d{4})/)
  if (yearMatch) {
    const year = parseInt(yearMatch[1])
    if (year >= 2020 && year <= currentYear + 1) {
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`
      }
    }
  }

  // Check conversation history for date context (if no explicit date found in current prompt)
  if (conversationHistory && conversationHistory.length > 0) {
    console.log(`[AI Marketing] Checking conversation history for date context...`)

    // Look through recent conversation history for date mentions
    for (let i = conversationHistory.length - 1; i >= 0 && i >= conversationHistory.length - 5; i--) {
      const message = conversationHistory[i]
      if (message.role === 'user') {
        // Parse the historical message directly (avoid recursion)
        const lowerHistoryPrompt = message.content.toLowerCase()

        // Check for common date patterns in history
        if (lowerHistoryPrompt.includes('today')) {
          const today = new Date()
          const easternTime = new Date(today.toLocaleString("en-US", {timeZone: "America/New_York"}))
          const todayStr = easternTime.toISOString().split('T')[0]
          console.log(`[AI Marketing] Found 'today' context from conversation history: ${todayStr}`)
          return {
            from: todayStr,
            to: todayStr
          }
        }

        if (lowerHistoryPrompt.includes('yesterday')) {
          const today = new Date()
          const easternTime = new Date(today.toLocaleString("en-US", {timeZone: "America/New_York"}))
          const yesterday = new Date(easternTime.getTime() - 24*60*60*1000)
          const yesterdayStr = yesterday.toISOString().split('T')[0]
          console.log(`[AI Marketing] Found 'yesterday' context from conversation history: ${yesterdayStr}`)
          return {
            from: yesterdayStr,
            to: yesterdayStr
          }
        }

        // Check for other common patterns
        for (const [phrase, days] of Object.entries({
          'last week': 7,
          'past week': 7,
          'last month': 30,
          'past month': 30,
          'last quarter': 90,
          'past quarter': 90,
          'last year': 365,
          'past year': 365
        })) {
          if (lowerHistoryPrompt.includes(phrase)) {
            console.log(`[AI Marketing] Found '${phrase}' context from conversation history`)
            return { days }
          }
        }
      }
    }

    // Look for AI responses that mention specific dates
    for (let i = conversationHistory.length - 1; i >= 0 && i >= conversationHistory.length - 5; i--) {
      const message = conversationHistory[i]
      if (message.role === 'assistant') {
        const content = message.content.toLowerCase()

        // Look for date mentions in AI responses like "For today (2025-08-29)"
        const dateMatch = content.match(/for (today|yesterday) \((\d{4}-\d{2}-\d{2})\)/)
        if (dateMatch) {
          const dateType = dateMatch[1]
          const dateStr = dateMatch[2]

          if (dateType === 'today') {
            console.log(`[AI Marketing] Found 'today' context from conversation history: ${dateStr}`)
            return {
              from: dateStr,
              to: dateStr
            }
          } else if (dateType === 'yesterday') {
            console.log(`[AI Marketing] Found 'yesterday' context from conversation history: ${dateStr}`)
            return {
              from: dateStr,
              to: dateStr
            }
          }
        }
      }
    }
  }
  
  return null
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Unified usage tracking - all usage now recorded in ai_feature_usage table
async function checkCombinedUsage(userId: string, featureType: string, supabase: any) {
  try {
    const today = getCurrentLocalDateString()
    const dailyLimit = 15 // Same limit for both modes
    
    // Get local timezone offset and convert to proper UTC times for database query
    const now = new Date()
    const timezoneOffset = now.getTimezoneOffset() * 60000 // Convert to milliseconds
    
    // Create start of day in local time, then convert to UTC
    const startOfDayLocal = new Date(`${today}T00:00:00`)
    const startOfDayUTC = new Date(startOfDayLocal.getTime() - timezoneOffset)
    
    // Create end of day in local time, then convert to UTC  
    const endOfDayLocal = new Date(`${today}T23:59:59.999`)
    const endOfDayUTC = new Date(endOfDayLocal.getTime() - timezoneOffset)
    
    // Get today's usage from ai_feature_usage table (now handles both agency and brand modes)
    const { data: usageData, error: usageError } = await supabase
      .from('ai_feature_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('feature_type', featureType)
      .gte('created_at', startOfDayUTC.toISOString())
      .lt('created_at', endOfDayUTC.toISOString())
    
    if (usageError) {
      console.error('Error checking unified usage:', usageError)
      return { canUse: false, reason: 'Database error' }
    }
    
    const totalUsageCount = usageData?.length || 0
    const remaining = dailyLimit - totalUsageCount
    
    if (totalUsageCount >= dailyLimit) {
      return {
        canUse: false,
        remainingUses: 0,
        reason: `Daily limit of ${dailyLimit} uses reached. Resets tomorrow.`
      }
    }
    
    return {
      canUse: true,
      remainingUses: remaining
    }
  } catch (error) {
    console.error('Error in checkCombinedUsage:', error)
    return { canUse: false, reason: 'Service error' }
  }
}

async function recordAgencyModeUsage(userId: string, featureType: string, metadata: any, supabase: any) {
  try {
    console.log(`[Usage Recording] Attempting to record usage for user ${userId}, feature ${featureType}, mode: ${metadata.mode}`)
    
    const { data, error } = await supabase
      .from('ai_feature_usage')
      .insert({
        user_id: userId,
        feature_type: featureType,
        usage_count: 1,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      })
      .select()
    
    if (error) {
      console.error('[Usage Recording] ❌ Database error:', error)
      throw error
    }

    console.log(`[Usage Recording] ✅ Successfully recorded usage:`, data)
    return true
  } catch (error) {
    console.error('[Usage Recording] ❌ Error in recordAgencyModeUsage:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Debug logging to identify source of calls
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const referer = request.headers.get('referer') || 'unknown'
    console.log('[API Debug] Marketing Consultant called:', {
      userId: userId.substring(0, 8) + '...',
      userAgent: userAgent.substring(0, 50),
      referer: referer,
      timestamp: new Date().toISOString()
    })

      const { brandId, prompt, marketingGoal, userContext, checkUsageOnly = false, conversationHistory = [], dateRange } = await request.json()
    
    if (!checkUsageOnly && !prompt) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }
    
    // Brand ID is required for actual queries, but not for usage checks
    if (!checkUsageOnly && !brandId) {
      return NextResponse.json({ error: 'Brand ID is required for queries' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient()
    
    // Check AI usage status and daily limits (combined across agency + brand modes)
    const usageStatus = await checkCombinedUsage(userId, 'ai_consultant_chat', supabase)

    if (!usageStatus.canUse) {
      return NextResponse.json({ 
        error: 'Daily chat limit reached',
        reason: usageStatus.reason,
        remainingUses: usageStatus.remainingUses || 0
      }, { status: 429 })
    }

    // If this is just a usage check, return the status without processing
    if (checkUsageOnly) {
      return NextResponse.json({
        canUse: usageStatus.canUse,
        remainingUses: usageStatus.remainingUses || 0
      })
    }

    // Smart date range detection from user prompt and conversation history
    let effectiveDateRange = dateRange // No default limit - allow access to all historical data
    if (prompt && !checkUsageOnly) {
      const parsedDateRange = parseeDateRangeFromPrompt(prompt, conversationHistory)
      if (parsedDateRange) {
        effectiveDateRange = parsedDateRange
        console.log(`[AI Marketing] Detected date range from prompt:`, parsedDateRange)
      } else if (!effectiveDateRange) {
        // Only default to 90 days if no date context is found
        effectiveDateRange = { days: 90 }
        console.log(`[AI Marketing] No date context found, defaulting to 90 days`)
      }
    }

    // Check if user owns this brand or has shared access
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (brandError || !brandData) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
      }

      // Check if user owns the brand or has shared access
      const isOwner = brandData.user_id === userId
      let hasAccess = isOwner

      if (!isOwner) {
        // Check if user has shared access to this brand
        const { data: accessCheck } = await supabase
          .from('brand_access')
          .select('role')
          .eq('brand_id', brandId)
          .eq('user_id', userId)
          .is('revoked_at', null)
          .single()

        hasAccess = !!accessCheck
      }

      if (!hasAccess) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
      }
      
    const brand = brandData
    const analysisData = await gatherComprehensiveMarketingData(supabase, brandId, effectiveDateRange)
    
    // Generate personalized AI response
    console.log(`[AI Marketing] About to generate response for brand ${brandId}...`)
    console.log(`[AI Marketing] Brand details:`, {
      brandId,
      brandName: brand?.name || 'Unknown',
      userId
    })
    console.log(`[AI Marketing] Data freshness check - analysis data:`, {
      totalSpend: analysisData.analysis?.totalSpend,
      averageROAS: analysisData.analysis?.averageROAS,
      dataTimestamp: new Date().toISOString(),
      dateRange: analysisData.dateRange,
      shopifyData: {
        hasData: !!analysisData.shopifyData,
        totalOrders: analysisData.shopifyData?.metrics?.totalOrders,
        totalRevenue: analysisData.shopifyData?.metrics?.totalRevenue,
        customersCount: analysisData.shopifyData?.customers?.length,
        ordersCount: analysisData.shopifyData?.orders?.length
      }
    })

    // Validate data for hallucinations before sending to AI
    const validationErrors = []
    if (analysisData.analysis?.averageROAS > 50) {
      console.warn(`[AI Marketing] POTENTIAL HALLUCINATION DETECTED: Unrealistic ROAS of ${analysisData.analysis.averageROAS}x`)
      validationErrors.push(`High ROAS detected: ${analysisData.analysis.averageROAS}x (unrealistic for advertising)`)
    }
    if (analysisData.analysis?.totalSpend < 0) {
      console.warn(`[AI Marketing] INVALID DATA: Negative spend amount: $${analysisData.analysis.totalSpend}`)
      validationErrors.push(`Invalid negative spend: $${analysisData.analysis.totalSpend}`)
    }
    if (analysisData.analysis?.totalSpend === 0 && analysisData.analysis?.totalRevenue > 0) {
      console.warn(`[AI Marketing] POTENTIAL DATA ISSUE: Zero spend but positive revenue of $${analysisData.analysis.totalRevenue}`)
      validationErrors.push(`Data attribution issue: Zero ad spend but $${analysisData.analysis.totalRevenue} revenue`)
    }

    // Note: We no longer validate for "broken attribution" - show whatever Meta API returns
    // If Meta shows 0 ROAS, that's the real data and should be reported as such

    if (validationErrors.length > 0) {
      console.error(`[AI Marketing] Data validation failed:`, validationErrors)

      // Provide specific guidance based on the type of validation error
      let userGuidance = 'Please check your Meta pixel setup or contact support if this persists.'
      if (validationErrors.some(err => err.includes('Zero ad spend'))) {
        userGuidance = 'This appears to be an attribution issue. Your ads may not be properly connected to your sales data. Please verify your Meta pixel and conversion tracking setup.'
      } else if (validationErrors.some(err => err.includes('High ROAS detected'))) {
        userGuidance = 'The calculated ROAS appears unrealistically high, which usually indicates attribution problems. Not all revenue necessarily comes from your ads. Consider reviewing your conversion tracking setup.'
      }

      return NextResponse.json({
        error: 'Data validation error detected.',
        details: validationErrors,
        guidance: userGuidance,
        timestamp: new Date().toISOString()
      }, { status: 422 })
    }

    const response = await generatePersonalizedResponse(prompt, analysisData, marketingGoal, userContext, brand, 'brand', conversationHistory)
    console.log(`[AI Marketing] Response generated successfully, now recording usage...`)

    // Record chat usage - now using unified tracking for brand mode
    console.log(`[AI Marketing] Recording usage for userId ${userId}, mode: brand, feature: ai_consultant_chat...`)
    
    // Always record in ai_feature_usage table for unified tracking
    await recordAgencyModeUsage(userId, 'ai_consultant_chat', {
      prompt: prompt.substring(0, 100), // Store first 100 chars for tracking
      marketingGoal,
      mode: 'brand',
      brandId: brandId || null, // Include brandId for context
      brandNiche: brand?.niche || 'brand-specific',
      timestamp: new Date().toISOString()
    }, supabase)
    console.log(`[AI Marketing] Usage recorded successfully!`)

    // Get updated usage status to return remaining uses
    console.log(`[AI Marketing] Checking updated usage status for user ${userId}...`)
    const updatedStatus = await checkCombinedUsage(userId, 'ai_consultant_chat', supabase)
    console.log(`[AI Marketing] Updated usage status:`, updatedStatus)

    return NextResponse.json({
      success: true,
      response,
      remainingUses: updatedStatus.remainingUses ?? 14, // Default to 14 if undefined
      timestamp: new Date().toISOString(),
      debug: {
        updatedStatus,
        brandId,
        userId
      }
    })

  } catch (error) {
    console.error('Error in marketing consultant:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze data and generate response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function gatherComprehensiveMarketingData(supabase: any, brandId: string, customDateRange?: { from?: string, to?: string, days?: number }) {
  const today = new Date()
  const easternTime = new Date(today.toLocaleString("en-US", {timeZone: "America/New_York"}))
  const todayStr = easternTime.toISOString().split('T')[0]
  
  // Use custom date range if provided, otherwise default to 90 days
  let fromDate: string
  let toDate: string
  let days: number
  
  if (customDateRange) {
    if (customDateRange.from && customDateRange.to) {
      // Use specific date range
      fromDate = customDateRange.from
      toDate = customDateRange.to
      days = Math.ceil((new Date(customDateRange.to).getTime() - new Date(customDateRange.from).getTime()) / (24 * 60 * 60 * 1000))
      console.log(`[AI Marketing Consultant] Using specific date range from prompt: ${fromDate} to ${toDate} (${days} days)`)
    } else if (customDateRange.days) {
      // Use days count
      days = customDateRange.days
      const startDate = new Date(easternTime.getTime() - days * 24 * 60 * 60 * 1000)
      fromDate = startDate.toISOString().split('T')[0]
      toDate = todayStr
    } else {
      // No specific date range provided - access all historical data
      console.log(`[AI Marketing Consultant] No date range specified - accessing all historical data`)
      // Set a very old date for fromDate to get all data
      fromDate = '2020-01-01' // Start from when Meta ads were available
      toDate = todayStr
      days = Math.ceil((new Date(todayStr).getTime() - new Date(fromDate).getTime()) / (24 * 60 * 60 * 1000))
    }
  } else {
    // No custom date range provided - access all historical data
    console.log(`[AI Marketing Consultant] No custom date range provided - accessing all historical data`)
    fromDate = '2020-01-01' // Start from when Meta ads were available
    toDate = todayStr
    days = Math.ceil((new Date(todayStr).getTime() - new Date(fromDate).getTime()) / (24 * 60 * 60 * 1000))
  }

  try {
    console.log(`[AI Marketing Consultant] Fetching ${days}-day campaign data for brand ${brandId} (${fromDate} to ${todayStr})...`)
    
    // Fetch campaign data from the database using the same logic as the metrics API
    const { data: campaigns } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('brand_id', brandId)
      .order('spent', { ascending: false })

    // Fetch daily stats for trend analysis using dynamic date range
    const { data: dailyStats } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', customDateRange?.to || todayStr)
      .order('date', { ascending: false })

    console.log(`[AI Marketing Consultant] Fetched data for brand ${brandId}:`, {
      campaignCount: campaigns?.length || 0,
      dailyStatsCount: dailyStats?.length || 0,
      dateRange: `${fromDate} to ${customDateRange?.to || todayStr}`
    })

    // Ensure campaigns is an array
    const campaignArray = campaigns || []
    const dailyStatsArray = dailyStats || []

    // Fetch Shopify data for comprehensive analysis
    console.log(`[AI Marketing Consultant] About to call gatherShopifyData with:`, {
      brandId,
      fromDate,
      toDate,
      customDateRange,
      todayStr
    })
    const shopifyData = await gatherShopifyData(supabase, brandId, fromDate, toDate)

    // Fetch Meta demographic and device data for audience insights
    const metaInsightsData = await gatherMetaInsights(supabase, brandId, fromDate, toDate)

    // Fetch available optimizations and reports for the brand
    const brandOptimizations = await gatherBrandOptimizations(supabase, brandId)
    const availableReports = await gatherAvailableReports(supabase, brandId)

    // Calculate aggregated metrics using the same logic as the dashboard
    const analysis = analyzeCampaignData(campaignArray, [], [], dailyStatsArray, shopifyData)

    console.log(`[AI Marketing Consultant] Calculated ${days}-day analysis:`, {
      totalSpend: analysis.totalSpend,
      totalRevenue: analysis.totalRevenue,
      averageROAS: analysis.averageROAS,
      activecampaigns: analysis.activecampaigns,
      topPerformersCount: analysis.topPerformers?.length || 0,
      underPerformersCount: analysis.underPerformers?.length || 0,
      dateRange: `${fromDate} to ${customDateRange?.to || todayStr}`
    })

    // Calculate recent performance data for current status questions (last 7 days)
    const recentDays = 7
    const recentStats = dailyStatsArray.slice(0, recentDays)
    const recentSpend = recentStats.reduce((sum: number, d: any) => sum + (d.spend || 0), 0)
    const recentRevenue = recentStats.reduce((sum: number, d: any) => sum + (d.purchase_value || 0), 0)
    const recentROAS = recentSpend > 0 ? recentRevenue / recentSpend : 0
    const recentImpressions = recentStats.reduce((sum: number, d: any) => sum + (d.impressions || 0), 0)
    const recentClicks = recentStats.reduce((sum: number, d: any) => sum + (d.clicks || 0), 0)

    console.log(`[AI Marketing Consultant] RECENT PERFORMANCE (Last 7 days):`, {
      recentSpend: `$${recentSpend.toFixed(2)}`,
      recentRevenue: `$${recentRevenue.toFixed(2)}`,
      recentROAS: `${recentROAS.toFixed(2)}x`,
      recentImpressions: recentImpressions.toLocaleString(),
      recentClicks,
      note: 'This is the ACTUAL Meta API data for recent performance'
    })

    return {
      campaigns: campaignArray,
      adSets: [], // Not needed for AI analysis
      ads: [], // Not needed for AI analysis  
      dailyStats: dailyStatsArray,
      shopifyData,
      metaInsightsData,
      brandOptimizations,
      availableReports,
      analysis,
      dateRange: {
        from: fromDate,
        to: customDateRange?.to || todayStr,
        days: fromDate === (customDateRange?.to || todayStr) ? 0 : days  // 0 days for same-day queries
      },
      // Add recent performance data for current status questions
      recentPerformance: {
        recentSpend,
        recentRevenue,
        recentROAS,
        recentImpressions,
        recentClicks
      }
    }

  } catch (error) {
    console.error('Error gathering marketing data:', error)
    return {
      campaigns: [],
      adSets: [],
      ads: [],
      dailyStats: [],
      shopifyData: {
        customers: [],
        orders: [],
        products: [],
        metrics: {},
        conversionFunnel: {}
      },
      analysis: {
        totalSpend: 0,
        totalRevenue: 0,
        averageROAS: 0,
        totalImpressions: 0,
        totalClicks: 0,
        averageCTR: 0,
        averageCPC: 0,
        activecampaigns: 0,
        trends: { improving: [], declining: [] },
        topPerformers: [],
        underPerformers: []
      },
      dateRange: {
        from: fromDate,
        to: customDateRange?.to || todayStr,
        days: days
      }
    }
  }
}

async function gatherShopifyData(supabase: any, brandId: string, fromDate: string, toDate: string) {
  try {
    console.log(`[AI Marketing Consultant] Fetching enhanced Shopify data for brand ${brandId} (${fromDate} to ${toDate})...`)

    // Get platform connection for this brand
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active')
      .single()

    if (!connection) {
      console.log(`[AI Marketing Consultant] No Shopify connection found for brand ${brandId}`)
      return { 
        customers: [], 
        orders: [], 
        products: [], 
        discounts: [], 
        draftOrders: [], 
        metrics: {}, 
        conversionFunnel: {} 
      }
    }
    
    console.log(`[AI Marketing Consultant] Found Shopify connection for brand ${brandId}, connection ID: ${connection.id}`)

    const connectionId = connection.id

    // Fetch ALL customers data (NO date filtering for customer analytics to match widget behavior)
    const { data: customers } = await supabase
      .from('shopify_customers')
      .select('*')
      .eq('connection_id', connectionId)
      .order('total_spent', { ascending: false })

    // Fetch orders data with optional date filtering
    let ordersQuery = supabase
      .from('shopify_orders')
      .select('*')
      .eq('connection_id', connectionId)  // Use connection_id to match customers query
      .order('created_at', { ascending: false })

    // Apply date filtering if specific dates are provided
    if (fromDate && toDate) {
      console.log(`[AI Marketing Consultant] Applying date filter: ${fromDate} to ${toDate}`)
      // Use UTC boundaries for better compatibility across timezones
      const fromDateTime = `${fromDate}T00:00:00Z` // Start of day UTC
      const toDate_obj = new Date(toDate)
      toDate_obj.setDate(toDate_obj.getDate() + 1)
      const nextDay = toDate_obj.toISOString().split('T')[0]
      const toDateTime = `${nextDay}T00:00:00Z` // Start of next day UTC (covers entire target day)

      console.log(`[AI Marketing Consultant] Date filter boundaries: ${fromDateTime} to ${toDateTime}`)
      
      ordersQuery = ordersQuery
        .gte('created_at', fromDateTime)
        .lt('created_at', toDateTime) // Use lt instead of lte for exclusive upper bound
    }

    const { data: orders } = await ordersQuery
    
    console.log(`[AI Marketing Consultant] Shopify data query result (date range: ${fromDate || 'ALL'} to ${toDate || 'ALL'}):`, {
      connectionId,
      brandId,
      ordersCount: orders?.length || 0,
      customersCount: customers?.length || 0,
      firstOrderDate: orders?.[0]?.created_at,
      lastOrderDate: orders?.[orders?.length - 1]?.created_at,
      totalRevenue: orders?.reduce((sum: number, order: any) => sum + (parseFloat(order.total_price) || 0), 0) || 0,
      // Show some recent orders for debugging
      recentOrderDates: orders?.slice(0, 5).map((o: any) => o.created_at),
      // Debug customer data
      customerSample: customers?.slice(0, 3).map((c: any) => ({
        id: c.id,
        email: c.email,
        orders_count: c.orders_count,
        total_spent: c.total_spent
      }))
    })
    
    // Calculate repeat customers directly from orders (like widget does)
    const customerOrderCounts = new Map()
    const customerSpending = new Map()
    const customerFirstOrder = new Map()
    const customerLastOrder = new Map()
    
    orders?.forEach((order: any) => {
      const customerId = order.customer_id || order.customer_email || `order_${order.id}`
      const orderValue = parseFloat(order.total_price) || 0
      const orderDate = order.created_at
      
      if (customerId) {
        // Count orders
        customerOrderCounts.set(customerId, (customerOrderCounts.get(customerId) || 0) + 1)
        
        // Track spending
        customerSpending.set(customerId, (customerSpending.get(customerId) || 0) + orderValue)
        
        // Track order dates
        if (!customerFirstOrder.has(customerId) || orderDate < customerFirstOrder.get(customerId)) {
          customerFirstOrder.set(customerId, orderDate)
        }
        if (!customerLastOrder.has(customerId) || orderDate > customerLastOrder.get(customerId)) {
          customerLastOrder.set(customerId, orderDate)
        }
      }
    })
    
    // Create top customers analysis (for AI responses about "who are our top customers")
    const topCustomersBySpending = Array.from(customerSpending.entries())
      .map(([customerId, totalSpent]) => {
        const customer = customers?.find(c => c.customer_id?.toString() === customerId?.toString() || c.email === customerId)
        return {
          customerId,
          totalSpent,
          orderCount: customerOrderCounts.get(customerId) || 0,
          customerName: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'Unknown',
          customerEmail: customer?.email || (typeof customerId === 'string' && customerId.includes('@') ? customerId : 'Unknown'),
          firstOrderDate: customerFirstOrder.get(customerId),
          lastOrderDate: customerLastOrder.get(customerId),
          avgOrderValue: (customerOrderCounts.get(customerId) || 0) > 0 ? totalSpent / (customerOrderCounts.get(customerId) || 1) : 0
        }
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 20) // Top 20 customers
    
    const uniqueCustomersFromOrders = customerOrderCounts.size
    const repeatCustomersFromOrders = Array.from(customerOrderCounts.values()).filter(count => count > 1).length
    const repeatRateFromOrders = uniqueCustomersFromOrders > 0 ? (repeatCustomersFromOrders / uniqueCustomersFromOrders) * 100 : 0
    
    console.log(`[AI Marketing Consultant] Direct calculation from orders:`, {
      uniqueCustomersFromOrders,
      repeatCustomersFromOrders,
      repeatRateFromOrders: repeatRateFromOrders.toFixed(1) + '%',
      customerOrderCountsSample: Array.from(customerOrderCounts.entries()).slice(0, 5)
    })

    // Fetch products data for product performance analysis
    const { data: products } = await supabase
      .from('shopify_products_enhanced')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })

    // Fetch discount performance data
    const { data: discounts } = await supabase
      .from('shopify_discounts_enhanced')
      .select('*')
      .eq('connection_id', connectionId)
      .order('usage_count', { ascending: false })

    // Fetch regional sales data for geographic insights with optional date filtering
    let regionalSalesQuery = supabase
      .from('shopify_sales_by_region')
      .select('*')
      .eq('connection_id', connectionId)
      .order('total_sales', { ascending: false })

    // Apply same date filtering to regional sales
    if (fromDate && toDate) {
      const fromDateTime = `${fromDate}T08:00:00Z`
      const toDate_obj = new Date(toDate)
      toDate_obj.setDate(toDate_obj.getDate() + 1)
      const nextDay = toDate_obj.toISOString().split('T')[0]
      const toDateTime = `${nextDay}T07:59:59Z`
      
      regionalSalesQuery = regionalSalesQuery
        .gte('created_at', fromDateTime)
        .lte('created_at', toDateTime)
    }

    const { data: regionalSales } = await regionalSalesQuery
    
    // Fetch draft orders for cart abandonment analysis
    let draftOrdersQuery = supabase
      .from('shopify_draft_orders_enhanced')
      .select('*')
      .eq('connection_id', connectionId)
    
    // Apply proper date filtering for draft orders - extract date part for comparison
    if (fromDate === toDate) {
      // Single day query - use date extraction to avoid timezone issues
      draftOrdersQuery = draftOrdersQuery
        .gte('created_at', `${fromDate}T00:00:00`)
        .lt('created_at', `${new Date(new Date(toDate).getTime() + 24*60*60*1000).toISOString().split('T')[0]}T00:00:00`)
    } else {
      // Multi-day range query
      draftOrdersQuery = draftOrdersQuery
        .gte('created_at', `${fromDate}T00:00:00`)
        .lt('created_at', `${new Date(new Date(toDate).getTime() + 24*60*60*1000).toISOString().split('T')[0]}T00:00:00`)
    }
    
    const { data: draftOrders } = await draftOrdersQuery
      .order('total_price', { ascending: false })

    // Calculate key metrics for SMS/Email recommendations
    const totalCustomers = customers?.length || 0
    const totalOrders = orders?.length || 0
    const totalRevenue = orders?.reduce((sum: number, order: any) => sum + (parseFloat(order.total_price) || 0), 0) || 0
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Calculate conversion funnel metrics
    const uniqueCustomers = new Set(orders?.map((order: any) => order.customer_id)).size
    const customerConversionRate = totalCustomers > 0 ? (uniqueCustomers / totalCustomers) * 100 : 0

    // Analyze cart abandonment potential (customers who haven't ordered)
    const customersWithOrders = new Set(orders?.map((order: any) => order.customer_id))
    const customersWithoutOrders = customers?.filter((customer: any) => !customersWithOrders.has(customer.id)) || []
    const cartAbandonmentRate = totalCustomers > 0 ? (customersWithoutOrders.length / totalCustomers) * 100 : 0

    // Use the direct calculations from above instead of recalculating
    const repeatPurchaseRate = uniqueCustomersFromOrders > 0 ? (repeatCustomersFromOrders / uniqueCustomersFromOrders) * 100 : 0

    const conversionFunnel = {
      totalCustomers,
      uniqueCustomers,
      customerConversionRate,
      cartAbandonmentRate,
      repeatPurchaseRate,
      customersWithoutOrders: customersWithoutOrders.length
    }

    // Enhanced metrics for AI recommendations
    const totalDiscounts = orders?.reduce((sum: number, order: any) => sum + (parseFloat(order.total_discounts) || 0), 0) || 0
    const returningCustomers = customers?.filter((c: any) => (c.orders_count || 0) > 1).length || 0
    const highValueCustomers = customers?.filter((c: any) => (parseFloat(c.total_spent) || 0) > averageOrderValue * 2).length || 0
    const totalProducts = products?.length || 0
    const activeProducts = products?.filter((p: any) => p.status === 'active').length || 0
    const totalDraftOrders = draftOrders?.length || 0
    const abandonedCarts = draftOrders?.filter((draft: any) => draft.status !== 'completed').length || 0
    const abandonmentRate = totalDraftOrders > 0 ? (abandonedCarts / totalDraftOrders) * 100 : 0
    const activeDiscounts = discounts?.filter((d: any) => {
      const now = new Date()
      const startDate = d.starts_at ? new Date(d.starts_at) : null
      const endDate = d.ends_at ? new Date(d.ends_at) : null
      return (!startDate || startDate <= now) && (!endDate || endDate >= now)
    }).length || 0

    // Fetch inventory items for margin calculation
    const { data: inventoryItems } = await supabase
      .from('shopify_inventory_items')
      .select('*')
      .eq('connection_id', connectionId)
    
    // Fetch current inventory levels for stock alerts
    const { data: inventoryLevels } = await supabase
      .from('shopify_inventory')
      .select('*')
      .eq('connection_id', connectionId)

    // Fetch new enhanced analytics data directly from database
    console.log(`[AI Marketing Consultant] Fetching enhanced analytics for brand ${brandId}...`)
    
    // Fetch abandoned cart analysis directly
    let abandonedCartData = null
    try {
      const { data: abandonedCheckouts } = await supabase
        .from('shopify_abandoned_checkouts')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })

      if (abandonedCheckouts && abandonedCheckouts.length > 0) {
        // Calculate basic abandoned cart metrics
        const totalAbandoned = abandonedCheckouts.length
        const totalValue = abandonedCheckouts.reduce((sum: number, checkout: any) => 
          sum + (parseFloat(checkout.total_price) || 0), 0)
        const averageValue = totalAbandoned > 0 ? totalValue / totalAbandoned : 0
        
        abandonedCartData = {
          overview: {
            totalAbandoned,
            totalValue,
            averageValue,
            recoveryRate: 0 // Would need to calculate based on completed checkouts
          },
          recentAbandoned: abandonedCheckouts.slice(0, 5)
        }
      }
    } catch (error) {
      console.log(`[AI Marketing Consultant] Could not fetch abandoned cart data:`, error)
    }

    // Fetch customer segmentation data directly (NO date filtering - same as widget)
    let customerSegmentData = null
    try {
      const { data: customers } = await supabase
        .from('shopify_customers')
        .select('*')
        .eq('connection_id', connectionId)
        // NO date filtering - we want ALL customers for segmentation

      if (customers && customers.length > 0) {
        // Calculate basic segmentation
        const totalCustomers = customers.length
        const highValue = customers.filter((c: any) => (parseFloat(c.total_spent) || 0) > 500).length
        const medium = customers.filter((c: any) => {
          const spent = parseFloat(c.total_spent) || 0
          return spent >= 100 && spent <= 500
        }).length
        const low = totalCustomers - highValue - medium

        customerSegmentData = {
          overview: {
            totalCustomers,
            segments: {
              high: { count: highValue, percentage: (highValue / totalCustomers) * 100 },
              medium: { count: medium, percentage: (medium / totalCustomers) * 100 },
              low: { count: low, percentage: (low / totalCustomers) * 100 }
            }
          }
        }
        
        console.log(`[AI Marketing Consultant] Customer segmentation:`, {
          totalCustomers,
          highValue,
          medium,
          low
        })
      }
    } catch (error) {
      console.log(`[AI Marketing Consultant] Could not fetch customer segment data:`, error)
    }

    // Note: Repeat customer analysis will be calculated in the main gatherShopifyData function
    // using the orders data fetched by brand_id above
    
    // Identify low stock and out of stock items
    const lowStockItems = inventoryLevels?.filter((item: any) => 
      (item.inventory_quantity || 0) > 0 && (item.inventory_quantity || 0) <= 5
    ) || []
    
    const outOfStockItems = inventoryLevels?.filter((item: any) => 
      (item.inventory_quantity || 0) <= 0
    ) || []
    
    // Items needing urgent replenishment (significantly negative inventory)
    const needsReplenishment = inventoryLevels?.filter((item: any) => 
      (item.inventory_quantity || 0) < -10
    ) || []
    
    // Calculate inventory metrics
    const totalInventoryValue = inventoryLevels?.reduce((sum: number, item: any) => {
      const quantity = item.inventory_quantity || 0
      const price = parseFloat(item.price) || 0
      return sum + (quantity * price)
    }, 0) || 0

    // Initialize marginAnalysis
    let marginAnalysis = {
      totalCost: 0,
      totalProfit: 0,
      averageMargin: 0,
      ordersWithMarginData: 0,
      marginDataCoverage: 0
    }

    // Calculate profit margins for orders
    let totalCost = 0
    let totalProfit = 0
    let ordersWithMarginData = 0

    if (inventoryItems?.length > 0) {
      const inventoryCostMap = new Map()
      inventoryItems.forEach((item: any) => {
        inventoryCostMap.set(item.inventory_item_id, parseFloat(item.cost) || 0)
      })

      orders?.forEach((order: any) => {
        if (order.line_items && Array.isArray(order.line_items)) {
          let orderHasCostData = false
          order.line_items.forEach((lineItem: any) => {
            const inventoryItemId = lineItem.variant?.inventory_item_id
            const unitCost = inventoryCostMap.get(inventoryItemId?.toString()) || 0
            const quantity = parseInt(lineItem.quantity) || 0
            const linePrice = parseFloat(lineItem.price) || 0
            
            if (unitCost > 0) {
              const lineCost = unitCost * quantity
              const lineRevenue = linePrice * quantity
              const lineProfit = lineRevenue - lineCost
              
              totalCost += lineCost
              totalProfit += lineProfit
              orderHasCostData = true
            }
          })
          
          if (orderHasCostData) {
            ordersWithMarginData++
          }
        }
      })
    }

    const averageMargin = totalRevenue > 0 && totalCost > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
    
    // Update marginAnalysis with calculated values
    marginAnalysis = {
      totalCost,
      totalProfit,
      averageMargin,
      ordersWithMarginData,
      marginDataCoverage: totalOrders > 0 ? (ordersWithMarginData / totalOrders) * 100 : 0
    }

    // Create enhanced metrics object after all calculations
    const enhancedMetrics = {
      totalRevenue,
      totalDiscounts,
      averageOrderValue,
      totalOrders,
      totalCustomers,
      returningCustomers,
      highValueCustomers,
      totalProducts,
      activeProducts,
      totalDraftOrders,
      abandonedCarts,
      abandonmentRate,
      activeDiscounts,
      conversionFunnel,
      marginAnalysis
    }

    console.log(`[AI Marketing Consultant] Enhanced Shopify data summary:`, {
      customersCount: totalCustomers,
      ordersCount: totalOrders,
      productsCount: totalProducts,
      totalRevenue: totalRevenue.toFixed(2),
      conversionRate: customerConversionRate.toFixed(2),
      cartAbandonmentRate: cartAbandonmentRate.toFixed(2),
      discountsActive: activeDiscounts,
      averageMargin: averageMargin.toFixed(2),
      marginDataCoverage: marginAnalysis.marginDataCoverage.toFixed(2)
    })

    return {
      customers: customers || [],
      orders: orders || [],
      products: products || [],
      discounts: discounts || [],
      draftOrders: draftOrders || [],
      regionalSales: regionalSales || [],
      inventoryAlerts: {
        lowStockItems,
        outOfStockItems,
        needsReplenishment,
        totalProducts: inventoryLevels?.length || 0,
        urgentReplenishment: needsReplenishment.length,
        totalInventoryValue
      },
      metrics: enhancedMetrics,
      conversionFunnel,
      // New enhanced analytics data
      abandonedCartAnalysis: abandonedCartData,
      customerSegmentation: customerSegmentData,
      // Direct calculations from orders (matching widget logic)
      directCalculations: {
        uniqueCustomersFromOrders,
        repeatCustomersFromOrders,
        repeatRateFromOrders
      },
      // Top customers analysis for AI responses
      topCustomers: topCustomersBySpending
    }

  } catch (error) {
    console.error('Error gathering Shopify data:', error)
    return {
      customers: [],
      orders: [],
      products: [],
      discounts: [],
      draftOrders: [],
      regionalSales: [],
      inventoryAlerts: {
        lowStockItems: [],
        outOfStockItems: [],
        needsReplenishment: [],
        totalProducts: 0,
        urgentReplenishment: 0,
        totalInventoryValue: 0
      },
      metrics: {
        totalRevenue: 0,
        totalDiscounts: 0,
        averageOrderValue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        returningCustomers: 0,
        highValueCustomers: 0,
        totalProducts: 0,
        activeProducts: 0,
        totalDraftOrders: 0,
        abandonedCarts: 0,
        abandonmentRate: 0,
        activeDiscounts: 0,
        conversionFunnel: {
          totalCustomers: 0,
          uniqueCustomers: 0,
          customerConversionRate: 0,
          cartAbandonmentRate: 0,
          repeatPurchaseRate: 0,
          customersWithoutOrders: 0
        },
        marginAnalysis: {
          totalCost: 0,
          totalProfit: 0,
          averageMargin: 0,
          ordersWithMarginData: 0,
          marginDataCoverage: 0
        }
      },
      conversionFunnel: {
        totalCustomers: 0,
        uniqueCustomers: 0,
        customerConversionRate: 0,
        cartAbandonmentRate: 0,
        repeatPurchaseRate: 0,
        customersWithoutOrders: 0
      },
      // New enhanced analytics data
      abandonedCartAnalysis: null,
      customerSegmentation: null,
      // Direct calculations from orders (matching widget logic)
      directCalculations: {
        uniqueCustomersFromOrders: 0,
        repeatCustomersFromOrders: 0,
        repeatRateFromOrders: 0
      },
      topCustomers: []
    }
  }
}

async function gatherMetaInsights(supabase: any, brandId: string, fromDate: string, toDate: string) {
  try {
    console.log(`[AI Marketing Consultant] Fetching Meta demographic and device insights for brand ${brandId} (${fromDate} to ${toDate})...`)

    // Get Meta platform connection for this brand
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (!connection) {
      console.log('No Meta connection found for brand')
      return { 
        demographics: { age: [], gender: [], ageGender: [] },
        devicePerformance: { device: [], placement: [], platform: [] },
        insights: {}
      }
    }

    const connectionId = connection.id

    // Fetch demographic data
    const { data: ageData } = await supabase
      .from('meta_demographics')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', 'age')
      .gte('date_range_start', fromDate)
      .lte('date_range_end', toDate)

    const { data: genderData } = await supabase
      .from('meta_demographics')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', 'gender')
      .gte('date_range_start', fromDate)
      .lte('date_range_end', toDate)

    const { data: ageGenderData } = await supabase
      .from('meta_demographics')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', 'age_gender')
      .gte('date_range_start', fromDate)
      .lte('date_range_end', toDate)

    // Fetch device performance data
    const { data: deviceData } = await supabase
      .from('meta_device_performance')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', 'device')
      .gte('date_range_start', fromDate)
      .lte('date_range_end', toDate)

    const { data: placementData } = await supabase
      .from('meta_device_performance')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', 'placement')
      .gte('date_range_start', fromDate)
      .lte('date_range_end', toDate)

    const { data: platformData } = await supabase
      .from('meta_device_performance')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', 'platform')
      .gte('date_range_start', fromDate)
      .lte('date_range_end', toDate)

    // Aggregate demographic insights
    const demographics = {
      age: ageData || [],
      gender: genderData || [],
      ageGender: ageGenderData || []
    }

    // Aggregate device performance insights
    const devicePerformance = {
      device: deviceData || [],
      placement: placementData || [],
      platform: platformData || []
    }

    // Calculate insights for AI analysis
    const insights = {
      topAgeGroups: demographics.age
        .sort((a: any, b: any) => b.impressions - a.impressions)
        .slice(0, 3)
        .map((item: any) => ({ age: item.breakdown_value, impressions: item.impressions, spend: item.spend })),
      
      genderDistribution: demographics.gender
        .map((item: any) => ({ gender: item.breakdown_value, impressions: item.impressions, spend: item.spend, ctr: item.ctr })),
      
      topDevices: devicePerformance.device
        .sort((a: any, b: any) => b.impressions - a.impressions)
        .slice(0, 3)
        .map((item: any) => ({ device: item.breakdown_value, impressions: item.impressions, ctr: item.ctr })),
      
      bestPlacements: devicePerformance.placement
        .sort((a: any, b: any) => b.ctr - a.ctr)
        .slice(0, 3)
        .map((item: any) => ({ placement: item.breakdown_value, ctr: item.ctr, spend: item.spend })),
      
      platformBreakdown: devicePerformance.platform
        .map((item: any) => ({ platform: item.breakdown_value, impressions: item.impressions, spend: item.spend, ctr: item.ctr }))
    }

    console.log(`[AI Marketing Consultant] Meta insights gathered:`, {
      ageGroups: demographics.age.length,
      genderData: demographics.gender.length,
      deviceTypes: devicePerformance.device.length,
      placements: devicePerformance.placement.length,
      platforms: devicePerformance.platform.length
    })

    return {
      demographics,
      devicePerformance,
      insights
    }

  } catch (error) {
    console.error('Error gathering Meta insights data:', error)
    return { 
      demographics: { age: [], gender: [], ageGender: [] },
      devicePerformance: { device: [], placement: [], platform: [] },
      insights: {}
    }
  }
}

function analyzeCampaignData(campaigns: any[], adSets: any[], ads: any[], dailyStats: any[], shopifyData?: any) {
  // Calculate totals from 30-day daily stats instead of cumulative campaign data
  const totalSpend = dailyStats.reduce((sum, d) => sum + (d.spend || 0), 0)
  const metaRevenue = dailyStats.reduce((sum, d) => sum + (d.purchase_value || 0), 0) // Use correct column name
  const shopifyRevenue = shopifyData?.metrics?.totalRevenue || 0
  // Keep Meta and Shopify revenue separate for accurate ROAS calculation
  const totalRevenue = metaRevenue + shopifyRevenue  // For total business metrics
  const metaOnlyRevenue = metaRevenue // For Meta-specific ROAS
  const totalImpressions = dailyStats.reduce((sum, d) => sum + (d.impressions || 0), 0)
  const totalClicks = dailyStats.reduce((sum, d) => sum + (d.clicks || 0), 0)
  
  // Calculate averages - use Meta revenue for Meta ROAS (show whatever Meta API returns)
  const averageROAS = totalSpend > 0 ? metaOnlyRevenue / totalSpend : 0
  
  // Check for unrealistic attribution (high ROAS with low spend might indicate attribution issues)
  const attributionWarning = averageROAS > 20 && totalSpend < 100 ? 
    'Note: High ROAS on low spend may indicate attribution discrepancies between Meta and actual sales tracking.' : null
  const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const averageCPC = totalClicks > 0 ? totalSpend / totalClicks : 0
  
  console.log(`[AI Marketing Consultant] REAL META DATA:`, {
    metaRevenue: `$${metaRevenue.toFixed(2)} (from Meta API purchase_value)`,
    totalSpend: `$${totalSpend.toFixed(2)} (from Meta API spend)`,
    calculatedROAS: `${averageROAS.toFixed(2)}x (real Meta attribution)`,
    note: 'This shows the actual Meta API data - no mixing with Shopify'
  })

      // Debug: Log individual daily stats to see purchase_value data
  console.log(`[AI Marketing Consultant] Meta daily stats breakdown:`, dailyStats.map(d => ({
    date: d.date,
    spend: d.spend,
    purchase_value: d.purchase_value,
    impressions: d.impressions
  })))
  
  // Active campaigns
  const activecampaigns = campaigns.filter(c => c.status === 'ACTIVE').length
  
  // Additional debug: Show what the AI will see
  console.log(`[AI Marketing Consultant] FINAL VALUES FOR AI:`, {
    totalSpend: totalSpend.toFixed(2),
    averageROAS: averageROAS.toFixed(2),
    totalImpressions: totalImpressions.toLocaleString(),
    averageCTR: averageCTR.toFixed(2),
    activecampaigns,
    metaRevenue: metaRevenue.toFixed(2),
    shopifyRevenue: shopifyRevenue.toFixed(2)
  })
  
  // Performance analysis - aggregate daily stats by campaign for 30-day period
  const campaignPerformance = new Map()
  dailyStats.forEach(stat => {
    const campaignId = stat.campaign_id
    if (!campaignPerformance.has(campaignId)) {
      campaignPerformance.set(campaignId, {
        campaign_id: campaignId,
        campaign_name: stat.campaign_name,
        spend: 0,
        revenue: 0,
        impressions: 0,
        clicks: 0,
        status: 'ACTIVE'
      })
    }
    const perf = campaignPerformance.get(campaignId)
    perf.spend += stat.spend || 0
    perf.revenue += stat.purchase_value || 0  // Use correct column name
    perf.impressions += stat.impressions || 0
    perf.clicks += stat.clicks || 0
  })
  
  // Convert to array and calculate ROAS for 30-day period
  const activeCampaigns = Array.from(campaignPerformance.values())
    .filter(c => c.spend > 0)
    .map(c => ({ ...c, roas: c.spend > 0 ? c.revenue / c.spend : 0 }))
  
  // Sort by ROAS for performance categorization
  const sortedByROAS = activeCampaigns.sort((a, b) => (b.roas || 0) - (a.roas || 0))
  const topPerformers = sortedByROAS.slice(0, Math.ceil(sortedByROAS.length * 0.3))
  const underPerformers = sortedByROAS.slice(-Math.ceil(sortedByROAS.length * 0.3))
  
  // Trend analysis from daily stats
  const trends = analyzeTrends(dailyStats)
  
  // Ad Set Analysis
  const activeAdSets = adSets.filter(as => as.status === 'ACTIVE' && as.spent > 0)
  const topAdSets = activeAdSets.sort((a, b) => (b.roas || 0) - (a.roas || 0)).slice(0, 5)
  
  // Creative Analysis
  const activeAds = ads.filter(ad => ad.status === 'ACTIVE' && ad.spent > 0)
  const topAds = activeAds.sort((a, b) => (b.roas || 0) - (a.roas || 0)).slice(0, 10)
  
  // Budget Distribution Analysis - using 30-day data
  const campaignSpendDistribution = activeCampaigns.map(c => ({
    campaign: c.campaign_name,
    spend: c.spend,
    roas: c.roas,
    percentage: totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0
  }))

  // Audience Performance (from ad sets)
  const audiencePerformance = activeAdSets.map(as => ({
    name: as.adset_name,
    targeting: as.targeting_expansion || 'Standard',
    roas: as.roas || 0,
    spend: as.spent || 0,
    ctr: as.ctr || 0
  }))

  return {
    totalSpend,
    totalRevenue,
    metaOnlyRevenue, // Meta-specific revenue for accurate ROAS
    averageROAS,
    totalImpressions,
    totalClicks,
    averageCTR,
    averageCPC,
    activecampaigns: activecampaigns,
    trends,
    topPerformers,
    underPerformers,
    topAdSets,
    topAds,
    campaignSpendDistribution,
    audiencePerformance,
    attributionWarning, // Warning about potentially unrealistic attribution
    // Additional insights
    costPerConversion: totalRevenue > 0 ? totalSpend / (totalRevenue / 50) : 0,
    impressionShare: totalImpressions,
    conversionRate: totalClicks > 0 ? ((totalRevenue / 50) / totalClicks) * 100 : 0
  }
}

function analyzeTrends(dailyStats: any[]) {
  if (dailyStats.length < 7) {
    return { improving: [], declining: [], stable: [] }
  }

  // Sort by date (most recent first)
  const sortedStats = dailyStats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  // Compare last 7 days vs previous 7 days
  const recent7Days = sortedStats.slice(0, 7)
  const previous7Days = sortedStats.slice(7, 14)
  
  const recentAvgROAS = recent7Days.reduce((sum, s) => sum + (s.roas || 0), 0) / recent7Days.length
  const previousAvgROAS = previous7Days.length > 0 ? previous7Days.reduce((sum, s) => sum + (s.roas || 0), 0) / previous7Days.length : recentAvgROAS
  
  const recentAvgCTR = recent7Days.reduce((sum, s) => sum + (s.ctr || 0), 0) / recent7Days.length
  const previousAvgCTR = previous7Days.length > 0 ? previous7Days.reduce((sum, s) => sum + (s.ctr || 0), 0) / previous7Days.length : recentAvgCTR
  
  const recentAvgSpend = recent7Days.reduce((sum, s) => sum + (s.spend || 0), 0) / recent7Days.length
  const previousAvgSpend = previous7Days.length > 0 ? previous7Days.reduce((sum, s) => sum + (s.spend || 0), 0) / previous7Days.length : recentAvgSpend

  const trends = {
    improving: [] as string[],
    declining: [] as string[],
    stable: [] as string[]
  }

  // ROAS trend
  const roasChange = previousAvgROAS > 0 ? ((recentAvgROAS - previousAvgROAS) / previousAvgROAS) * 100 : 0
  if (roasChange > 10) trends.improving.push(`ROAS improved by ${roasChange.toFixed(1)}%`)
  else if (roasChange < -10) trends.declining.push(`ROAS declined by ${Math.abs(roasChange).toFixed(1)}%`)
  else trends.stable.push(`ROAS stable at ${recentAvgROAS.toFixed(1)}x`)

  // CTR trend
  const ctrChange = previousAvgCTR > 0 ? ((recentAvgCTR - previousAvgCTR) / previousAvgCTR) * 100 : 0
  if (ctrChange > 15) trends.improving.push(`CTR improved by ${ctrChange.toFixed(1)}%`)
  else if (ctrChange < -15) trends.declining.push(`CTR declined by ${Math.abs(ctrChange).toFixed(1)}%`)

  // Spend trend
  const spendChange = previousAvgSpend > 0 ? ((recentAvgSpend - previousAvgSpend) / previousAvgSpend) * 100 : 0
  if (Math.abs(spendChange) > 20) {
    const direction = spendChange > 0 ? 'increased' : 'decreased'
    trends.stable.push(`Spend ${direction} by ${Math.abs(spendChange).toFixed(1)}%`)
  }

  return trends
}

// Content filtering function
function containsInappropriateContent(prompt: string): boolean {
  const inappropriatePatterns = [
    /(?:hack|illegal|fraud|scam|spam|phishing)/i,
    /(?:violence|harm|abuse|threat)/i,
    /(?:nsfw|sexual|explicit|inappropriate)/i,
    /(?:personal.*info|private.*data|credit.*card|ssn|social.*security)/i,
    /(?:bypass|circumvent|violate|break.*rules)/i,
    /(?:are you chatgpt|are you openai|what model are you|who made you|what ai are you)/i
  ]
  
  return inappropriatePatterns.some(pattern => pattern.test(prompt))
}

async function generatePersonalizedResponse(prompt: string, analysisData: any, marketingGoal: string, userContext: any, brand: any, mode: string = 'brand', conversationHistory: any[] = []) {
  
  // Filter inappropriate content
  if (containsInappropriateContent(prompt)) {
    const userName = userContext?.name || 'there'
    return `Hi ${userName}! I'm your marketing consultant assistant, and I'm designed to help with campaign optimization, performance analysis, and marketing strategies. I can't assist with that particular request, but I'd be happy to help you with any marketing-related questions about your campaigns, audience targeting, budget optimization, or growth strategies!`
  }
  const { analysis, campaigns, adSets, ads, dateRange } = analysisData
  const userName = userContext?.name || 'there'
  const brandName = brand?.name || 'your brand'
  const brandNiche = brand?.niche || null

  // Define goal-specific contexts
  const goalContexts = {
    'general': 'Focus on overall performance optimization, ROI improvement, and general best practices',
    'holiday': 'Prioritize seasonal campaign strategies, increased budget allocation for peak periods, urgency-driven creatives, and holiday-specific audience targeting. Consider inventory management and higher competition during peak seasons',
    'lead-gen': 'Emphasize lead quality over immediate conversions, optimize for cost per lead, focus on top-of-funnel metrics, and recommend lead nurturing strategies. Prioritize broad reach and interest-based targeting',
    'product-launch': 'Focus on brand awareness, product education, early adopter targeting, and building initial momentum. Recommend awareness campaigns before conversion campaigns and progressive budget scaling',
    'brand-awareness': 'Prioritize reach, impressions, and brand recall metrics over immediate conversions. Focus on video content, broad targeting, and frequency management to build brand recognition',
    'retention': 'Focus on retargeting existing customers, lookalike audiences from high-value customers, and lifetime value optimization. Emphasize customer segments and cross-sell/upsell opportunities'
  }

  const goalContext = goalContexts[marketingGoal as keyof typeof goalContexts] || goalContexts.general

  // Create niche-specific context if brand niche is available
  const nicheContext = brandNiche ? `

BRAND NICHE CONTEXT: This is a ${brandNiche} business. Tailor all recommendations specifically for the ${brandNiche} industry, including:
- Industry-specific audience targeting strategies
- Relevant seasonal trends and opportunities for ${brandNiche} businesses
- Common pain points and objections specific to ${brandNiche} customers
- Competitive landscape considerations for the ${brandNiche} market
- Budget allocation strategies that work best for ${brandNiche} businesses
- Creative messaging that resonates with ${brandNiche} target audiences
- Performance benchmarks typical for ${brandNiche} advertising campaigns

When providing recommendations, always consider how they apply specifically to a ${brandNiche} business and mention industry-specific insights where relevant.` : `

BRAND CONTEXT: Provide general marketing recommendations while acknowledging that industry-specific insights could be more valuable with brand niche information.`

  const systemPrompt =
    `SAFETY AND IDENTITY PARAMETERS:
- You are Brez Marketing's AI Marketing Assistant, specifically designed for marketing consultation
- You are NOT ChatGPT, OpenAI, or any other AI model - you are a specialized marketing consultant
- You ONLY provide marketing, advertising, and business growth advice
- You CANNOT and WILL NOT assist with: illegal activities, harmful content, personal information requests, non-marketing topics, bypassing any systems, or anything outside of marketing consultation
- If asked about your identity, explain you are Brez Marketing's specialized AI assistant for marketing optimization
- If asked inappropriate questions, politely redirect to marketing topics
- You must decline any requests that are not related to marketing, advertising, campaigns, business growth, or brand optimization

CRITICAL DATA ACCURACY REQUIREMENTS:
- NEVER HALLUCINATE OR MAKE UP DATA - only use the real numbers provided in the context below
- NEVER INVENT ROAS, spend amounts, or performance metrics that aren't in the actual data provided
- If you don't have data for a specific metric, say "I don't have that data available for this time period"
- Always use the EXACT numbers from the context - do not round, estimate, modify, or invent numbers
- When discussing ROAS: ONLY use the averageROAS value shown in the context - report the exact Meta API data, whether it's 0.00x or 100.00x
- When discussing spend: ONLY use the totalSpend value shown in the context
- DO NOT calculate or estimate ROAS yourself - use the pre-calculated averageROAS from the data
- If averageROAS is 0.00, say "The ROAS is currently 0.00x" - do not invent or estimate a different value like "10.99x"
- IMPORTANT: The averageROAS shown is calculated as Meta ad spend divided by Meta-attributed revenue ONLY
- NEVER mix Meta ad spend with total Shopify revenue for ROAS calculations
- NEVER say things like "solid performance" or "good ROAS" when the actual ROAS is 0.00
- Be transparent about data attribution: Meta spend + Shopify revenue does not automatically mean all revenue came from ads
- CRITICAL: Only discuss "Meta ROAS" or "Facebook ROAS" when referring to platform-specific attribution
- When attribution warnings are present in the data, acknowledge them and explain that high ROAS on low spend may indicate attribution discrepancies
- TRANSPARENCY: If you see very high ROAS (>20x) with low spend (<$100), mention that this might indicate attribution issues between Meta's tracking and actual sales sources

You are an expert marketing consultant providing personalized advice to ${userName} for ${brandName}. ${nicheContext}

DATA ACCESS: You have access to campaign and sales data from ${analysisData.dateRange?.from || 'N/A'} to ${analysisData.dateRange?.to || 'N/A'}. 

IMPORTANT: The Shopify sales data shown in the context below is for the EXACT date range requested (${analysisData.dateRange?.from} to ${analysisData.dateRange?.to}). When users ask about specific days like "today" or "yesterday", you have that exact data available.

You can analyze ANY time period the user requests naturally. If they ask about spending, performance, or metrics WITHOUT specifying a timeframe (like "how much have I spent on ads?"), ask them to clarify the time period they want to analyze (e.g., "For what time period? Last month, last quarter, this year?"). If they mention a specific time period, I'll automatically pull that data.



NAVIGATION & CALL-TO-ACTION GUIDANCE:
- If users ask how to add/connect brands, direct them to the Lead Generation page (/lead-generator) or Settings page (/settings)
- If users ask about generating reports, mention the Brand Report feature (/brand-report) where they can create and send automated reports
- If users ask about creative assets, mention the Ad Creative Studio (/ad-creative-studio)
- If users ask about campaign optimization, mention the Campaign Management page (/campaign-management)
- If users ask about analytics, mention the Analytics dashboard (/analytics)
- If users ask about action center or tasks, mention the Action Center (/action-center)
- If users need help with Meta/Shopify connections, mention the Settings page (/settings)
- Always provide clickable page links when suggesting navigation
- If users don't have any brands connected, proactively suggest they visit /lead-generator to get started

BRAND OPTIMIZATION & REPORTING ACCESS:
- You have access to available campaign optimizations that can be suggested to users
- You can suggest generating monthly/quarterly reports using the Brand Report feature
- You can recommend sending automated reports to brand owners or stakeholders
- If you see optimization opportunities, suggest specific actions users can take
- Always mention available reports or optimizations when relevant to user questions
- You can generate and send reports automatically when users request them
- When users ask for reports, offer to generate them immediately using current data

MARKETING GOAL FOCUS: ${goalContext}

Your communication style:
- Only greet the user by name (${userName}) at the START of conversations, NOT in follow-up responses
- If this is a continuation of an existing conversation, jump straight into answering their question
- Be conversational and friendly, not formal - like a knowledgeable colleague having a chat
- Write in plain text without markdown formatting (no *, **, #, -, etc.)
- Use simple bullet points with • when listing items
- Respond contextually: if they're saying thanks, being polite, or expressing agreement, respond naturally and conversationally
- When they ask for analysis or marketing advice, provide detailed insights
- For simple responses like "thanks", "I'll do that", "sounds good" - respond with encouragement and offer further help
- Provide specific, actionable recommendations tailored to their marketing goal${brandNiche ? ` and ${brandNiche} industry` : ''}
- Use data to support your advice but filter recommendations through their goal lens${brandNiche ? ` and industry context` : ''}
- Keep responses natural - comprehensive for analysis requests (500-700 words), brief for casual chat
- Never end with formal closers like "Best regards", "Sincerely", etc.
- End naturally or with a simple encouragement
- Do not use asterisks, dashes, or other markdown symbols
- IMPORTANT: Do not start every response with "Hey [name]!" - only greet at conversation start

${conversationHistory.length > 0 ? `
CONVERSATION CONTEXT:
Previous messages:
${conversationHistory.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Respond appropriately to their current message considering this conversation flow.` : 'This is the start of your conversation.'}

Current Context:
- Brand: ${brandName}${brandNiche ? ` (${brandNiche} business)` : ''}
- Analysis Period: ${dateRange?.from === dateRange?.to ? 'SINGLE DAY' : `${dateRange?.days || 'multiple'} days`} (${dateRange?.from || 'N/A'} to ${dateRange?.to || 'N/A'})

=== EXACT VALUES TO USE (DO NOT MODIFY OR ESTIMATE) ===
- Total Ad Spend: $${(analysis.totalSpend || 0).toFixed(2)}
- Average ROAS: ${(analysis.averageROAS || 0).toFixed(2)}x ← USE THIS EXACT VALUE ONLY${analysis.attributionWarning ? ` (${analysis.attributionWarning})` : ''}
- Total Impressions: ${(analysis.totalImpressions || 0).toLocaleString()}
- Average CTR: ${(analysis.averageCTR || 0).toFixed(2)}%
- Total Campaigns: ${campaigns.length}
- Active Campaigns: ${analysis.activecampaigns || 0}

=== RECENT PERFORMANCE (LAST 7 DAYS) - USE FOR CURRENT STATUS ===
- Recent Ad Spend: $${(analysisData.recentPerformance?.recentSpend || 0).toFixed(2)}
- Recent Meta Revenue: $${(analysisData.recentPerformance?.recentRevenue || 0).toFixed(2)}
- Recent ROAS: ${(analysisData.recentPerformance?.recentROAS || 0).toFixed(2)}x ← USE THIS FOR "HOW IS MY CAMPAIGN GOING" QUESTIONS
- Recent Impressions: ${(analysisData.recentPerformance?.recentImpressions || 0).toLocaleString()}
- Recent Clicks: ${(analysisData.recentPerformance?.recentClicks || 0)}

=== AVAILABLE OPTIMIZATIONS & REPORTS ===
${analysisData.brandOptimizations?.length > 0 ? `Campaign Optimizations Available:
${analysisData.brandOptimizations.map((opt: any, i: number) => `${i+1}. ${opt.campaign_name}: ${opt.recommendation?.title || 'Optimization available'}`).join('\n')}` : 'No campaign optimizations currently available'}

${analysisData.availableReports?.length > 0 ? `Reports Available:
${analysisData.availableReports.map((report: any, i: number) => `${i+1}. ${report.period} report for ${report.brand_name || brandName} (${report.date_range_start} to ${report.date_range_end})`).join('\n')}` : 'No reports currently available'}

SHOPIFY DATA AVAILABLE: ${analysisData.shopifyData?.orders?.length > 0 ? `YES - ${analysisData.shopifyData.orders.length} orders, $${analysisData.shopifyData.metrics?.totalRevenue?.toFixed(2) || '0.00'} revenue for the requested period` : 'NO SALES DATA for this period'}
${analysisData.dateRange?.from === analysisData.dateRange?.to && analysisData.shopifyData?.orders?.length > 0 ? `- SHOPIFY SALES FOR ${analysisData.dateRange.from}: $${(analysisData.shopifyData?.metrics?.totalRevenue || 0).toFixed(2)} from ${analysisData.shopifyData?.orders?.length || 0} orders` : ''}

${analysisData.shopifyData?.orders?.length === 0 && analysisData.shopifyData ? 'NOTE: Shopify connection exists but no orders found for this date range. This could be due to timezone differences or no sales activity.' : ''}


















Filter all recommendations through their marketing goal${brandNiche ? ` and ${brandNiche} industry context` : ''}. Provide specific campaign names, numbers, and actionable next steps based on this real data while keeping their objective${brandNiche ? ` and industry` : ''} as the primary focus. When discussing SMS/email marketing, reference the specific Shopify metrics to make recommendations data-driven and personalized.`

  try {
    // Validate and sanitize system prompt
    if (!systemPrompt || systemPrompt.length === 0) {
      console.error('[AI Marketing] System prompt is empty!')
      throw new Error('System prompt is empty')
    }

    if (systemPrompt.length > 25000) {
      console.error('[AI Marketing] System prompt too long:', systemPrompt.length)
      throw new Error(`System prompt too long (${systemPrompt.length} characters). Maximum allowed: 25000`)
    }

    // Check for undefined values in system prompt
    if (systemPrompt.includes('undefined') || systemPrompt.includes('null')) {
      console.error('[AI Marketing] System prompt contains undefined/null values!')
      console.error('[AI Marketing] System prompt preview:', systemPrompt.substring(0, 500))
      throw new Error('System prompt contains undefined values')
    }

    // Additional safety checks
    if (systemPrompt.includes('NaN')) {
      console.error('[AI Marketing] System prompt contains NaN values!')
      throw new Error('System prompt contains invalid numeric values')
    }

    // Debug the system prompt before sending to OpenAI
    console.log('[AI Marketing] System prompt length:', systemPrompt.length)
    console.log('[AI Marketing] User prompt:', prompt.substring(0, 200) + '...')

    // Add timeout wrapper to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API request timed out after 25 seconds')), 25000)
    })

    const openaiPromise = openai.chat.completions.create({
      model: 'gpt-4o-mini', // GPT-4o-mini - fast and reliable for chat
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 1200,
      temperature: 0.7
    })

    const response = await Promise.race([openaiPromise, timeoutPromise])

    const aiResponse = response.choices[0].message.content || `Hi ${userName}! I'd be happy to help analyze your ${brandName}${brandNiche ? ` ${brandNiche} business` : ''} performance, but I'm having trouble generating a response right now. Please try again in a moment.`

    console.log('[AI Marketing] OpenAI response generated successfully, length:', aiResponse.length)
    
    // Final safety check on the AI response
    if (containsInappropriateContent(aiResponse)) {
      return `Hi ${userName}! I'm your marketing consultant assistant focused on helping with campaign optimization and marketing strategies. Let me help you with a marketing-related question instead - I can analyze your performance data, suggest optimization strategies, or help with campaign planning!`
    }
    
    return aiResponse

  } catch (error) {
    console.error('Error generating AI response:', error)
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    })

    // Check if it's an OpenAI API error
    if (error.status === 400) {
      console.error('OpenAI API 400 error - likely system prompt issue')
    }

    // Check if it's a timeout error
    if (error.message && error.message.includes('timed out')) {
      console.error('OpenAI API timeout - request took too long')
      throw new Error('AI response generation timed out. Please try again.')
    }

    throw new Error(`Failed to generate AI response: ${error.message || 'Unknown error'}`)
  }
}



async function gatherAgencyWideData(supabase: any, userId: string, customDateRange?: { from?: string, to?: string, days?: number }) {
  try {
    // Get all user brands (owned + shared)
    const { data: ownedBrands } = await supabase
      .from('brands')
      .select('*')
      .eq('user_id', userId)
    
    // Get shared brands through brand_access
    const { data: sharedAccess } = await supabase
      .from('brand_access')
      .select('brand_id')
      .eq('user_id', userId)
      .is('revoked_at', null)

    let sharedBrands: any[] = []
    if (sharedAccess && sharedAccess.length > 0) {
      const sharedBrandIds = sharedAccess.map((access: any) => access.brand_id)
      const { data: sharedBrandDetails } = await supabase
        .from('brands')
        .select('*')
        .in('id', sharedBrandIds)
      
      sharedBrands = sharedBrandDetails || []
    }

    // Combine owned and shared brands
    const brands = [...(ownedBrands || []), ...sharedBrands]
    
    if (!brands || brands.length === 0) {
      return { 
        campaigns: [], 
        brands: [],
        analysis: { totalSpend: 0, averageROAS: 0 },
        dateRange: { from: 'N/A', to: 'N/A', days: 90 }
      }
    }

    let allCampaigns: any[] = []
    let totalSpend = 0
    let totalRevenue = 0
    let totalImpressions = 0
    let totalClicks = 0
    let brandPerformance: any[] = []

    // Aggregate Shopify data across all brands
    let aggregatedShopifyData = {
      customers: [],
      orders: [],
      products: [],
      discounts: [],
      draftOrders: [],
      regionalSales: [],
      inventoryAlerts: {
        lowStockItems: [],
        outOfStockItems: [],
        needsReplenishment: [],
        totalProducts: 0,
        urgentReplenishment: 0,
        totalInventoryValue: 0
      },
      metrics: {
        totalRevenue: 0,
        totalDiscounts: 0,
        averageOrderValue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        returningCustomers: 0,
        highValueCustomers: 0,
        totalProducts: 0,
        activeProducts: 0,
        totalDraftOrders: 0,
        abandonedCarts: 0,
        abandonmentRate: 0,
        activeDiscounts: 0,
        conversionFunnel: {
          totalCustomers: 0,
          uniqueCustomers: 0,
          customerConversionRate: 0,
          cartAbandonmentRate: 0,
          repeatPurchaseRate: 0,
          customersWithoutOrders: 0
        },
        marginAnalysis: {
          totalCost: 0,
          totalProfit: 0,
          averageMargin: 0,
          ordersWithMarginData: 0,
          marginDataCoverage: 0
        }
      },
      conversionFunnel: {
        totalCustomers: 0,
        uniqueCustomers: 0,
        customerConversionRate: 0,
        cartAbandonmentRate: 0,
        repeatPurchaseRate: 0,
        customersWithoutOrders: 0
      },
      abandonedCartAnalysis: null,
      customerSegmentation: null,
      directCalculations: {
        uniqueCustomersFromOrders: 0,
        repeatCustomersFromOrders: 0,
        repeatRateFromOrders: 0
      },
      topCustomers: []
    }
    
    // Fetch agency-wide optimizations and reports
    const agencyOptimizationsAndReports = await gatherAgencyOptimizationsAndReports(supabase, userId)
    
    // Aggregate data across all brands
    console.log(`[AI Marketing Consultant] Agency mode: Processing ${brands.length} brands with date range:`, customDateRange)
    
    for (const brand of brands) {
      try {
        console.log(`[AI Marketing Consultant] Fetching data for brand: ${brand.name} (${brand.id})`)
        const brandData = await gatherComprehensiveMarketingData(supabase, brand.id, customDateRange)
        
        console.log(`[AI Marketing Consultant] Brand ${brand.name} data:`, {
          totalSpend: brandData.analysis.totalSpend,
          metaRevenue: brandData.analysis.metaOnlyRevenue || 0, // Use Meta-only revenue
          shopifyRevenue: (brandData.shopifyData?.metrics as any)?.totalRevenue || 0,
          combinedRevenue: (brandData.analysis.totalRevenue || 0), // This is already Meta + Shopify
          campaignCount: brandData.campaigns?.length || 0,
          dailyStatsCount: brandData.dailyStats?.length || 0
        })
        
        // Add brand name to campaigns for identification
        const campaignsWithBrand = brandData.campaigns.map((campaign: any) => ({
          ...campaign,
          brand_name: brand.name,
          brand_id: brand.id
        }))
        
        allCampaigns = [...allCampaigns, ...campaignsWithBrand]
        
        totalSpend += brandData.analysis.totalSpend || 0
        // Use Meta-only revenue for agency ROAS calculation
        const brandMetaRevenue = brandData.analysis.metaOnlyRevenue || 0
        totalRevenue += brandMetaRevenue  // Only Meta revenue for ROAS
        const brandShopifyRevenue = (brandData.shopifyData?.metrics as any)?.totalRevenue || 0
        totalImpressions += brandData.analysis.totalImpressions || 0
        totalClicks += brandData.analysis.totalClicks || 0

        // Aggregate Shopify data from this brand
        if (brandData.shopifyData) {
          console.log(`[AI Marketing Consultant] Aggregating Shopify data for brand ${brand.name}:`, {
            orders: brandData.shopifyData.orders?.length || 0,
            revenue: brandShopifyRevenue,
            customers: brandData.shopifyData.customers?.length || 0
          })

          // Aggregate customers, orders, products
          aggregatedShopifyData.customers = [...aggregatedShopifyData.customers, ...(brandData.shopifyData.customers || [])]
          aggregatedShopifyData.orders = [...aggregatedShopifyData.orders, ...(brandData.shopifyData.orders || [])]
          aggregatedShopifyData.products = [...aggregatedShopifyData.products, ...(brandData.shopifyData.products || [])]
          aggregatedShopifyData.discounts = [...aggregatedShopifyData.discounts, ...(brandData.shopifyData.discounts || [])]
          aggregatedShopifyData.draftOrders = [...aggregatedShopifyData.draftOrders, ...(brandData.shopifyData.draftOrders || [])]
          aggregatedShopifyData.regionalSales = [...aggregatedShopifyData.regionalSales, ...(brandData.shopifyData.regionalSales || [])]

          // Aggregate metrics
          if (brandData.shopifyData.metrics) {
            aggregatedShopifyData.metrics.totalRevenue += brandShopifyRevenue
            aggregatedShopifyData.metrics.totalDiscounts += (brandData.shopifyData.metrics as any)?.totalDiscounts || 0
            aggregatedShopifyData.metrics.totalOrders += (brandData.shopifyData.metrics as any)?.totalOrders || 0
            aggregatedShopifyData.metrics.totalCustomers += (brandData.shopifyData.metrics as any)?.totalCustomers || 0
            aggregatedShopifyData.metrics.returningCustomers += (brandData.shopifyData.metrics as any)?.returningCustomers || 0
            aggregatedShopifyData.metrics.highValueCustomers += (brandData.shopifyData.metrics as any)?.highValueCustomers || 0
            aggregatedShopifyData.metrics.totalProducts += (brandData.shopifyData.metrics as any)?.totalProducts || 0
            aggregatedShopifyData.metrics.activeProducts += (brandData.shopifyData.metrics as any)?.activeProducts || 0
            aggregatedShopifyData.metrics.totalDraftOrders += (brandData.shopifyData.metrics as any)?.totalDraftOrders || 0
            aggregatedShopifyData.metrics.abandonedCarts += (brandData.shopifyData.metrics as any)?.abandonedCarts || 0
            aggregatedShopifyData.metrics.activeDiscounts += (brandData.shopifyData.metrics as any)?.activeDiscounts || 0

            // Aggregate margin analysis
            if ((brandData.shopifyData.metrics as any)?.marginAnalysis) {
              aggregatedShopifyData.metrics.marginAnalysis.totalCost += (brandData.shopifyData.metrics as any).marginAnalysis.totalCost || 0
              aggregatedShopifyData.metrics.marginAnalysis.totalProfit += (brandData.shopifyData.metrics as any).marginAnalysis.totalProfit || 0
              aggregatedShopifyData.metrics.marginAnalysis.ordersWithMarginData += (brandData.shopifyData.metrics as any).marginAnalysis.ordersWithMarginData || 0
            }
          }

          // Aggregate conversion funnel
          if (brandData.shopifyData.conversionFunnel) {
            aggregatedShopifyData.conversionFunnel.totalCustomers += brandData.shopifyData.conversionFunnel.totalCustomers || 0
            aggregatedShopifyData.conversionFunnel.uniqueCustomers += brandData.shopifyData.conversionFunnel.uniqueCustomers || 0
            aggregatedShopifyData.conversionFunnel.customersWithoutOrders += brandData.shopifyData.conversionFunnel.customersWithoutOrders || 0
          }

          // Aggregate inventory alerts
          if (brandData.shopifyData.inventoryAlerts) {
            aggregatedShopifyData.inventoryAlerts.lowStockItems = [...aggregatedShopifyData.inventoryAlerts.lowStockItems, ...(brandData.shopifyData.inventoryAlerts.lowStockItems || [])]
            aggregatedShopifyData.inventoryAlerts.outOfStockItems = [...aggregatedShopifyData.inventoryAlerts.outOfStockItems, ...(brandData.shopifyData.inventoryAlerts.outOfStockItems || [])]
            aggregatedShopifyData.inventoryAlerts.needsReplenishment = [...aggregatedShopifyData.inventoryAlerts.needsReplenishment, ...(brandData.shopifyData.inventoryAlerts.needsReplenishment || [])]
            aggregatedShopifyData.inventoryAlerts.totalProducts += brandData.shopifyData.inventoryAlerts.totalProducts || 0
            aggregatedShopifyData.inventoryAlerts.urgentReplenishment += brandData.shopifyData.inventoryAlerts.urgentReplenishment || 0
            aggregatedShopifyData.inventoryAlerts.totalInventoryValue += brandData.shopifyData.inventoryAlerts.totalInventoryValue || 0
          }
        }
        
        // Track individual brand performance
        brandPerformance.push({
          brand_name: brand.name,
          brand_id: brand.id,
          spend: brandData.analysis.totalSpend || 0,
          revenue: brandMetaRevenue, // Use Meta-only revenue for ROAS
          metaRevenue: brandMetaRevenue, // Correct Meta revenue
          shopifyRevenue: brandShopifyRevenue, // Separate Shopify revenue
          totalRevenue: brandMetaRevenue + brandShopifyRevenue, // Combined for business metrics
          roas: (brandData.analysis.totalSpend > 0) ? (brandMetaRevenue / brandData.analysis.totalSpend) : 0,
          activeCampaigns: brandData.analysis.activecampaigns || 0,
          topPerformers: brandData.analysis.topPerformers || [],
          underPerformers: brandData.analysis.underPerformers || []
        })
      } catch (error) {
        console.error(`[AI Marketing Consultant] Error gathering data for brand ${brand.name} (${brand.id}):`, error)
        // Still add the brand to performance tracking even if data fetch failed
        brandPerformance.push({
          brand_name: brand.name,
          brand_id: brand.id,
          spend: 0,
          revenue: 0,
          roas: 0,
          activeCampaigns: 0,
          topPerformers: [],
          underPerformers: []
        })
      }
    }
    
    console.log(`[AI Marketing Consultant] Agency aggregation complete:`, {
      totalSpend,
      totalRevenue,
      brandCount: brands.length,
      processedBrands: brandPerformance.length
    })

    // Calculate agency-wide metrics
    const averageROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const averageCPC = totalClicks > 0 ? totalSpend / totalClicks : 0

    // Finalize aggregated Shopify metrics
    if (aggregatedShopifyData.metrics.totalOrders > 0) {
      aggregatedShopifyData.metrics.averageOrderValue = aggregatedShopifyData.metrics.totalRevenue / aggregatedShopifyData.metrics.totalOrders
    }

    if (aggregatedShopifyData.metrics.totalCustomers > 0) {
      aggregatedShopifyData.conversionFunnel.customerConversionRate = (aggregatedShopifyData.conversionFunnel.uniqueCustomers / aggregatedShopifyData.metrics.totalCustomers) * 100
      aggregatedShopifyData.conversionFunnel.cartAbandonmentRate = (aggregatedShopifyData.conversionFunnel.customersWithoutOrders / aggregatedShopifyData.metrics.totalCustomers) * 100
      aggregatedShopifyData.conversionFunnel.repeatPurchaseRate = (aggregatedShopifyData.directCalculations.repeatCustomersFromOrders / aggregatedShopifyData.directCalculations.uniqueCustomersFromOrders) * 100
    }

    if (aggregatedShopifyData.metrics.totalDraftOrders > 0) {
      aggregatedShopifyData.metrics.abandonmentRate = (aggregatedShopifyData.metrics.abandonedCarts / aggregatedShopifyData.metrics.totalDraftOrders) * 100
    }

    // Calculate margin analysis
    if (aggregatedShopifyData.metrics.marginAnalysis.ordersWithMarginData > 0) {
      aggregatedShopifyData.metrics.marginAnalysis.averageMargin = (aggregatedShopifyData.metrics.marginAnalysis.totalProfit / aggregatedShopifyData.metrics.totalRevenue) * 100
      aggregatedShopifyData.metrics.marginAnalysis.marginDataCoverage = (aggregatedShopifyData.metrics.marginAnalysis.ordersWithMarginData / aggregatedShopifyData.metrics.totalOrders) * 100
    }

    // Sort brands by performance
    const topPerformingBrands = brandPerformance
      .filter(b => b.spend > 0)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 3)
    
    const underPerformingBrands = brandPerformance
      .filter(b => b.spend > 0)
      .sort((a, b) => a.roas - b.roas)
      .slice(0, 3)

    const result = {
      campaigns: allCampaigns,
      brands,
      brandPerformance,
      shopifyData: aggregatedShopifyData,
      brandOptimizations: agencyOptimizationsAndReports.optimizations,
      availableReports: agencyOptimizationsAndReports.reports,
      analysis: {
        totalSpend,
        totalRevenue,
        averageROAS,
        totalImpressions,
        totalClicks,
        averageCTR,
        averageCPC,
        brandCount: brands.length,
        activeCampaigns: allCampaigns.filter(c => c.effective_status === 'ACTIVE').length,
        topPerformingBrands,
        underPerformingBrands
      },
      dateRange: customDateRange || { from: 'N/A', to: 'N/A', days: 30 }
    }
    
    console.log(`[AI Marketing Consultant] Final agency aggregation result:`, {
      totalSpend: result.analysis.totalSpend,
      totalRevenue: result.analysis.totalRevenue,
      brandCount: result.analysis.brandCount,
      campaignCount: result.campaigns.length,
      aggregatedShopify: {
        totalOrders: result.shopifyData?.metrics?.totalOrders || 0,
        totalRevenue: result.shopifyData?.metrics?.totalRevenue || 0,
        totalCustomers: result.shopifyData?.metrics?.totalCustomers || 0
      }
    })
    
    return result
  } catch (error) {
    console.error('[AI Marketing Consultant] CRITICAL ERROR in gatherAgencyWideData:', error)
    console.error('[AI Marketing Consultant] Stack trace:', (error as Error).stack)
    return { 
      campaigns: [], 
      brands: [],
      analysis: { totalSpend: 0, averageROAS: 0 },
      dateRange: { from: 'N/A', to: 'N/A', days: 30 }
    }
  }
}

// Function to gather available campaign optimizations for a brand
async function gatherBrandOptimizations(supabase: any, brandId: string) {
  try {
    console.log(`[AI Marketing Consultant] Fetching optimizations for brand ${brandId}...`)

    const { data: optimizations, error } = await supabase
      .from('ai_campaign_recommendations')
      .select('*')
      .eq('brand_id', brandId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.log(`[AI Marketing Consultant] Error fetching optimizations:`, error)
      return []
    }

    console.log(`[AI Marketing Consultant] Found ${optimizations?.length || 0} optimizations for brand ${brandId}`)
    return optimizations || []
  } catch (error) {
    console.error('[AI Marketing Consultant] Error gathering brand optimizations:', error)
    return []
  }
}

// Function to gather available reports for a brand
async function gatherAvailableReports(supabase: any, brandId: string) {
  try {
    console.log(`[AI Marketing Consultant] Fetching available reports for brand ${brandId}...`)

    const { data: reports, error } = await supabase
      .from('brand_reports')
      .select('*')
      .eq('brand_id', brandId)
      .order('last_updated', { ascending: false })

    if (error) {
      console.log(`[AI Marketing Consultant] Error fetching reports:`, error)
      return []
    }

    console.log(`[AI Marketing Consultant] Found ${reports?.length || 0} reports for brand ${brandId}`)
    return reports || []
  } catch (error) {
    console.error('[AI Marketing Consultant] Error gathering available reports:', error)
    return []
  }
}

// Function to gather agency-wide optimizations and reports
async function gatherAgencyOptimizationsAndReports(supabase: any, userId: string) {
  try {
    console.log(`[AI Marketing Consultant] Fetching agency-wide optimizations and reports for user ${userId}...`)

    // Get all user brands
    const { data: ownedBrands } = await supabase
      .from('brands')
      .select('id, name')
      .eq('user_id', userId)

    const { data: sharedAccess } = await supabase
      .from('brand_access')
      .select('brand_id')
      .eq('user_id', userId)
      .is('revoked_at', null)

    let sharedBrands: any[] = []
    if (sharedAccess && sharedAccess.length > 0) {
      const sharedBrandIds = sharedAccess.map((access: any) => access.brand_id)
      const { data: sharedBrandDetails } = await supabase
        .from('brands')
        .select('id, name')
        .in('id', sharedBrandIds)
      sharedBrands = sharedBrandDetails || []
    }

    const allBrands = [...(ownedBrands || []), ...sharedBrands]
    const brandIds = allBrands.map(b => b.id)

    if (brandIds.length === 0) {
      return { optimizations: [], reports: [] }
    }

    // Fetch optimizations for all brands
    const { data: optimizations, error: optError } = await supabase
      .from('ai_campaign_recommendations')
      .select('*')
      .in('brand_id', brandIds)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    // Fetch reports for all brands
    const { data: reports, error: reportError } = await supabase
      .from('brand_reports')
      .select('*')
      .in('brand_id', brandIds)
      .order('last_updated', { ascending: false })

    if (optError) console.log(`[AI Marketing Consultant] Error fetching agency optimizations:`, optError)
    if (reportError) console.log(`[AI Marketing Consultant] Error fetching agency reports:`, reportError)

    // Add brand names to the results
    const brandMap = new Map(allBrands.map(b => [b.id, b.name]))

    const optimizationsWithNames = (optimizations || []).map(opt => ({
      ...opt,
      brand_name: brandMap.get(opt.brand_id) || 'Unknown Brand'
    }))

    const reportsWithNames = (reports || []).map(report => ({
      ...report,
      brand_name: brandMap.get(report.brand_id) || 'Unknown Brand'
    }))

    console.log(`[AI Marketing Consultant] Found ${optimizationsWithNames.length} optimizations and ${reportsWithNames.length} reports across ${brandIds.length} brands`)

    return {
      optimizations: optimizationsWithNames,
      reports: reportsWithNames
    }
  } catch (error) {
    console.error('[AI Marketing Consultant] Error gathering agency optimizations and reports:', error)
    return { optimizations: [], reports: [] }
  }
}

// Function to generate and send a brand report
async function generateAndSendBrandReport(supabase: any, brandId: string, brandName: string, userId: string, period: 'daily' | 'monthly' = 'monthly') {
  try {
    console.log(`[AI Marketing Consultant] Generating ${period} report for brand ${brandName} (${brandId})...`)

    // Get current date and calculate date range
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    let dateRangeStart: Date
    let dateRangeEnd: Date

    if (period === 'monthly') {
      // First day of current month
      dateRangeStart = new Date(currentYear, currentMonth, 1)
      // Last day of current month
      dateRangeEnd = new Date(currentYear, currentMonth + 1, 0)
    } else {
      // Today
      dateRangeStart = new Date(today)
      dateRangeEnd = new Date(today)
    }

    // Gather data for the report
    const reportData = await gatherComprehensiveMarketingData(
      supabase,
      brandId,
      {
        from: dateRangeStart.toISOString().split('T')[0],
        to: dateRangeEnd.toISOString().split('T')[0]
      }
    )

    // Generate report content
    const reportContent = generateReportContent(brandName, period, reportData, dateRangeStart, dateRangeEnd)

    // Save report to database
    const { data: savedReport, error: saveError } = await supabase
      .from('brand_reports')
      .upsert({
        brand_id: brandId,
        period,
        report_content: reportContent,
        date_range_start: dateRangeStart.toISOString().split('T')[0],
        date_range_end: dateRangeEnd.toISOString().split('T')[0],
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'brand_id,period'
      })
      .select()
      .single()

    if (saveError) {
      console.error('[AI Marketing Consultant] Error saving report:', saveError)
      return { success: false, message: 'Failed to save report' }
    }

    // TODO: Send report to stakeholders (email integration would go here)

    console.log(`[AI Marketing Consultant] Successfully generated and saved ${period} report for ${brandName}`)
    return {
      success: true,
      message: `Generated ${period} report for ${brandName} (${dateRangeStart.toLocaleDateString()} - ${dateRangeEnd.toLocaleDateString()})`,
      reportId: savedReport.id
    }
  } catch (error) {
    console.error('[AI Marketing Consultant] Error generating report:', error)
    return { success: false, message: 'Failed to generate report' }
  }
}

// Helper function to generate report content
function generateReportContent(brandName: string, period: string, data: any, startDate: Date, endDate: Date) {
  const analysis = data.analysis || {}
  const shopifyData = data.shopifyData || {}

  return `
# ${brandName} - ${period.charAt(0).toUpperCase() + period.slice(1)} Marketing Report
**Report Period:** ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
**Generated:** ${new Date().toLocaleString()}

## 📊 Campaign Performance Summary
- **Total Spend:** $${(analysis.totalSpend || 0).toFixed(2)}
- **Average ROAS:** ${(analysis.averageROAS || 0).toFixed(2)}x
- **Total Impressions:** ${(analysis.totalImpressions || 0).toLocaleString()}
- **Average CTR:** ${(analysis.averageCTR || 0).toFixed(2)}%
- **Active Campaigns:** ${analysis.activecampaigns || 0}

## 💰 Sales Performance
- **Total Revenue:** $${(shopifyData.metrics?.totalRevenue || 0).toFixed(2)}
- **Total Orders:** ${shopifyData.metrics?.totalOrders || 0}
- **Average Order Value:** $${(shopifyData.metrics?.averageOrderValue || 0).toFixed(2)}
- **Total Customers:** ${shopifyData.metrics?.totalCustomers || 0}

## 📈 Key Insights
${analysis.topPerformers?.length > 0 ? `### Top Performing Campaigns:
${analysis.topPerformers.slice(0, 3).map((c: any, i: number) =>
  `${i+1}. ${c.campaign_name} - ${c.roas?.toFixed(1)}x ROAS, $${c.spend?.toFixed(0)} spent`
).join('\n')}` : ''}

${analysis.underPerformers?.length > 0 ? `### Underperforming Campaigns:
${analysis.underPerformers.slice(0, 3).map((c: any, i: number) =>
  `${i+1}. ${c.campaign_name} - ${c.roas?.toFixed(1)}x ROAS, $${c.spend?.toFixed(0)} spent`
).join('\n')}` : ''}

## 🎯 Recommendations
Based on the current performance data, here are suggested next steps:
1. ${analysis.averageROAS > 2 ? 'Continue optimizing high-performing campaigns' : 'Review and optimize underperforming campaigns'}
2. ${shopifyData.metrics?.totalRevenue > 0 ? 'Consider increasing ad spend on successful campaigns' : 'Focus on improving conversion rates'}
3. Monitor customer acquisition costs and lifetime value

---
*This report was automatically generated by Brez Marketing AI*
  `.trim()
} 