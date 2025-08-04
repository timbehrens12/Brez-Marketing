"use client"

import { getStandardSupabaseClient } from '@/lib/utils/unified-supabase'
import { useNotificationStore } from '@/stores/useNotificationStore'

// Simple throttling to prevent excessive calls
let lastCalculationTime = 0
const THROTTLE_DELAY = 2000 // 2 seconds minimum between calculations (more responsive)

/**
 * Simple, reliable notification count calculation with retry logic
 * No complex caching, no race conditions, just direct calculation
 */
export async function calculateNotificationCounts(userId: string, retryCount = 0, forceRefresh = false): Promise<void> {
  if (!userId) return
  
  // Throttle calls unless it's a forced refresh
  const now = Date.now()
  const timeSinceLastCall = now - lastCalculationTime
  
  if (!forceRefresh && timeSinceLastCall < THROTTLE_DELAY) {
    console.log(`[NotificationCounts] ⏱️ Throttling call - last calculation ${Math.round(timeSinceLastCall / 1000)}s ago`)
    return
  }
  
  if (forceRefresh) {
    console.log(`[NotificationCounts] 💥 Force refresh - bypassing throttle`)
  }
  
  lastCalculationTime = now
  const maxRetries = 3
  console.log(`[NotificationCounts] 🔄 Calculating notification counts... (attempt ${retryCount + 1}/${maxRetries + 1})`)
  
  try {
    useNotificationStore.getState().setLoading(true)
    
    // Calculate dynamic counts based on actual data with timeout
    const [todoCount, brandHealthCount] = await Promise.allSettled([
      Promise.race([
        calculateRealTodoCount(userId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Todo count timeout')), 10000))
      ]),
      Promise.race([
        calculateRealBrandHealthCount(userId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Brand health timeout')), 10000))
      ])
    ])
    
    const finalTodoCount = todoCount.status === 'fulfilled' ? (typeof todoCount.value === 'number' ? todoCount.value : 0) : 0
    const finalBrandHealthCount = brandHealthCount.status === 'fulfilled' ? (typeof brandHealthCount.value === 'number' ? brandHealthCount.value : 0) : 0
    const toolsCount = 4 // Keep static for now
    
    // Update store with new counts
    useNotificationStore.getState().updateCounts({
      todoCount: finalTodoCount,
      brandHealthCount: finalBrandHealthCount,
      toolsCount
    })
    
    console.log(`[NotificationCounts] ✅ Counts updated: Todo=${finalTodoCount}, BrandHealth=${finalBrandHealthCount}, Tools=${toolsCount}, Total=${finalTodoCount + finalBrandHealthCount + toolsCount}`)
    
    // Log any partial failures
    if (todoCount.status === 'rejected') {
      console.warn('[NotificationCounts] ⚠️ Todo count failed:', todoCount.reason)
    }
    if (brandHealthCount.status === 'rejected') {
      console.warn('[NotificationCounts] ⚠️ Brand health count failed:', brandHealthCount.reason)
    }
    
  } catch (error) {
    console.error(`[NotificationCounts] ❌ Error calculating counts (attempt ${retryCount + 1}):`, error)
    
    // Retry logic with exponential backoff
    if (retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
      console.log(`[NotificationCounts] 🔄 Retrying in ${delay}ms...`)
      setTimeout(() => {
        calculateNotificationCounts(userId, retryCount + 1, forceRefresh)
      }, delay)
      return
    }
    
    // Final fallback after all retries failed
    console.error('[NotificationCounts] ❌ All retries failed, using fallback values')
    console.error('[NotificationCounts] 🆔 User ID:', userId)
    console.error('[NotificationCounts] 🌐 Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A')
    useNotificationStore.getState().updateCounts({
      todoCount: 0, // More conservative fallback
      brandHealthCount: 0,
      toolsCount: 4
    })
  } finally {
    // Only set loading to false if this is not a retry
    if (retryCount === 0 || retryCount >= maxRetries) {
      useNotificationStore.getState().setLoading(false)
    }
  }
}

async function calculateRealTodoCount(userId: string): Promise<number> {
  try {
    console.log('[NotificationCounts] 📊 Calculating real todo count...')
    const supabase = getStandardSupabaseClient()
    
    // Get user's campaigns first (EXACT same logic as Agency Center)
    const { data: userCampaigns, error: campaignsError } = await supabase
      .from('outreach_campaigns')
      .select('id')
      .eq('user_id', userId)

    if (campaignsError) {
      console.warn('[NotificationCounts] Error loading campaigns:', campaignsError)
      return 0
    }

    if (!userCampaigns || userCampaigns.length === 0) {
      console.log('[NotificationCounts] No campaigns found')
      return 0
    }

    const campaignIds = userCampaigns.map(c => c.id)

    // Get ALL campaign leads (EXACT same logic as Agency Center)
    const { data: campaignLeads, error } = await supabase
      .from('outreach_campaign_leads')
      .select(`
        *,
        lead:leads(*)
      `)
      .in('campaign_id', campaignIds)
      .order('added_at', { ascending: false })

    if (error) {
      console.warn('[NotificationCounts] Error loading campaign leads:', error)
      return 0
    }

    if (!campaignLeads || campaignLeads.length === 0) {
      console.log('[NotificationCounts] No campaign leads found')
      return 0
    }

    // Count leads by status (EXACT same logic as Agency Center)
    const pendingLeads = campaignLeads.filter(cl => cl.status === 'pending')
    const contactedLeads = campaignLeads.filter(cl => cl.status === 'contacted')
    const respondedLeads = campaignLeads.filter(cl => cl.status === 'responded')
    const qualifiedLeads = campaignLeads.filter(cl => cl.status === 'qualified')
    
    // Get leads contacted more than 3 days ago (need follow-up)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const needsFollowUp = contactedLeads.filter(cl => {
      if (!cl.last_contacted_at) return false
      return new Date(cl.last_contacted_at) < threeDaysAgo
    })
    
    // Get leads contacted more than 7 days ago (going cold)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const goingCold = contactedLeads.filter(cl => {
      if (!cl.last_contacted_at) return false
      return new Date(cl.last_contacted_at) < sevenDaysAgo
    })

    // Calculate total todos (EXACT same logic as Agency Center)
    let totalTodos = 0
    if (pendingLeads.length > 0) totalTodos++ // New leads todo
    if (respondedLeads.length > 0) totalTodos++ // Responded leads todo
    if (qualifiedLeads.length > 0) totalTodos++ // Qualified leads todo
    if (needsFollowUp.length > 0) totalTodos++ // Follow-up todo
    if (goingCold.length > 0) totalTodos++ // Going cold todo

    console.log(`[NotificationCounts] Campaign lead breakdown:`, {
      pending: pendingLeads.length,
      contacted: contactedLeads.length,
      responded: respondedLeads.length,
      qualified: qualifiedLeads.length,
      needsFollowUp: needsFollowUp.length,
      goingCold: goingCold.length,
      totalTodos
    })
    
    console.log(`[NotificationCounts] ✅ Calculated todo count: ${totalTodos}`)
    return totalTodos
    
  } catch (error) {
    console.error('[NotificationCounts] Error calculating real todo count:', error)
    return 0
  }
}

async function calculateRealBrandHealthCount(userId: string): Promise<number> {
  try {
    console.log('[NotificationCounts] 🏥 Calculating real brand health count...')
    const supabase = getStandardSupabaseClient()
    
    // Get user's brands first, then fetch connections separately
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('user_id', userId)
    
    if (brandsError) {
      console.warn('[NotificationCounts] Error fetching brands:', brandsError)
      return 0
    }
    
    // More robust checking for brands array
    if (!brands || !Array.isArray(brands) || brands.length === 0) {
      console.log('[NotificationCounts] No brands found or invalid data:', brands)
      return 0
    }
    
    // Additional safety check before accessing length
    const brandsArray = Array.isArray(brands) ? brands : []
    
    // Fetch platform connections for all brands
    const brandIds = brandsArray.map(b => b.id).filter(Boolean)
    if (brandIds.length === 0) {
      console.log('[NotificationCounts] No valid brand IDs found')
      return 0
    }
    
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('brand_id, platform_type')
      .in('brand_id', brandIds)
      .eq('status', 'active')
    
    if (connectionsError) {
      console.warn('[NotificationCounts] Error fetching platform connections:', connectionsError)
      // Continue without connections data
    }
    
    // Add connections to brands
    const connectionsArray = Array.isArray(connections) ? connections : []
    const brandsWithConnections = brandsArray.map(brand => ({
      ...brand,
      platform_connections: connectionsArray.filter(conn => conn.brand_id === brand.id)
    }))
    
    // Count brands with ad platforms (that need health monitoring)
    const brandsWithAdPlatforms = brandsWithConnections.filter(brand => {
      // Handle case where brand itself might be null/undefined
      if (!brand || typeof brand !== 'object') {
        return false
      }
      
      // Handle case where platform_connections might be null, undefined, or not an array
      if (!brand.platform_connections || !Array.isArray(brand.platform_connections)) {
        return false
      }
      
      return brand.platform_connections.some((conn: any) => {
        // Handle case where conn or conn.platform_type might be null
        if (!conn || !conn.platform_type) {
          return false
        }
        return ['meta', 'google', 'tiktok'].includes(conn.platform_type.toLowerCase())
      })
    })
    
    // Safely access length with additional checks
    const platformBrandsCount = Array.isArray(brandsWithAdPlatforms) ? brandsWithAdPlatforms.length : 0
    console.log(`[NotificationCounts] Found ${platformBrandsCount} brands with ad platforms:`, 
      brandsWithAdPlatforms.map(b => ({ 
        id: b?.id || 'unknown', 
        name: b?.name || 'unknown', 
        connections: (Array.isArray(b?.platform_connections) ? b.platform_connections.length : 0)
      })))
    
    // Check localStorage for read status (same logic as dashboard)
    const readReports = JSON.parse(localStorage.getItem(`readBrandReports_${userId}`) || '{}')
    
    // Safely filter and count unread reports
    const filteredBrands = Array.isArray(brandsWithAdPlatforms) ? brandsWithAdPlatforms.filter(brand => {
      // Additional safety check for brand object and id
      if (!brand || !brand.id) {
        return false
      }
      return !readReports[brand.id]
    }) : []
    
    const unreadCount = filteredBrands.length || 0
    
    console.log(`[NotificationCounts] ✅ Calculated brand health count: ${unreadCount}`)
    return unreadCount
    
  } catch (error) {
    console.error('[NotificationCounts] Error calculating real brand health count:', error)
    return 0
  }
}

async function calculateTodoCount(supabase: any, userId: string): Promise<number> {
  try {
    // Count active outreach campaigns
    const { data: campaigns, error } = await supabase
      .from('outreach_campaigns')
      .select('id, status')
      .eq('user_id', userId)
      .eq('status', 'active')
    
    if (error) {
      console.error('[NotificationCounts] Error fetching campaigns:', error)
      return 0
    }
    
    // Add null check for campaigns array
    if (!campaigns || !Array.isArray(campaigns)) {
      console.log('[NotificationCounts] No campaigns data or invalid format')
      return 0
    }
    
    // Additional safety check before accessing length
    const campaignsArray = Array.isArray(campaigns) ? campaigns : []
    return campaignsArray.length || 0
  } catch (error) {
    console.error('[NotificationCounts] Error calculating todo count:', error)
    return 0
  }
}

async function calculateBrandHealthCount(supabase: any, userId: string): Promise<number> {
  try {
    // Count unread brand reports
    const { data: reports, error } = await supabase
      .from('brand_health_data')
      .select('brand_id')
      .eq('user_id', userId)
      .gt('performance_score', 0) // Only count brands with actual data
    
    if (error) {
      console.error('[NotificationCounts] Error fetching brand health:', error)
      return 0
    }
    
    // Add null check for reports array
    if (!reports || !Array.isArray(reports)) {
      console.log('[NotificationCounts] No brand health data or invalid format')
      return 0
    }
    
    // Additional safety check before accessing array methods
    const reportsArray = Array.isArray(reports) ? reports : []
    
    // Check localStorage for read status
    const readReports = JSON.parse(localStorage.getItem(`readBrandReports_${userId}`) || '{}')
    
    // Safely filter reports with additional safety checks
    const unreadReports = reportsArray.filter(report => {
      // Additional safety check for report object and brand_id
      if (!report || !report.brand_id) {
        return false
      }
      return !readReports[report.brand_id]
    })
    
    const unreadCount = Array.isArray(unreadReports) ? unreadReports.length : 0
    
    return unreadCount
  } catch (error) {
    console.error('[NotificationCounts] Error calculating brand health count:', error)
    return 0
  }
}

/**
 * Refresh notification counts - simple wrapper for easy calling
 */
export function refreshNotificationCounts(userId: string, forceRefresh = false) {
  calculateNotificationCounts(userId, 0, forceRefresh)
}

/**
 * Debug function to manually check notification counts
 * Call this from console: window.debugNotifications()
 */
export function debugNotificationCounts(userId?: string) {
  if (typeof window === 'undefined') return
  
  // @ts-ignore - adding to window for debugging
  window.debugNotifications = async (customUserId?: string) => {
    const targetUserId = customUserId || userId
    if (!targetUserId) {
      console.log('❌ No user ID provided')
      return
    }
    
    console.log('🐛 Debug: Starting notification count check...')
    console.log('🆔 User ID:', targetUserId)
    
    try {
      // Force refresh to bypass throttling
      await calculateNotificationCounts(targetUserId, 0, true)
      
      // Get current state
      const state = useNotificationStore.getState()
      console.log('📊 Current notification state:', {
        todoCount: state.todoCount,
        brandHealthCount: state.brandHealthCount,
        toolsCount: state.toolsCount,
        totalCount: state.totalCount,
        isLoading: state.isLoading,
        lastUpdated: state.lastUpdated
      })
    } catch (error) {
      console.error('❌ Debug error:', error)
    }
  }
  
  console.log('🐛 Debug function available: window.debugNotifications()')
}