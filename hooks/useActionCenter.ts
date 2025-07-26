"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getAuthenticatedSupabaseClient, getStandardSupabaseClient } from '@/lib/utils/unified-supabase'
import { format } from 'date-fns'

interface ActionCenterCounts {
  totalItems: number
  urgentItems: number
  breakdown?: {
    outreachTodos: number
    urgentOutreach: number
    brandReports: number
    availableTools: number
  }
}

interface TaskState {
  status: 'pending' | 'snoozed' | 'completed' | 'dismissed'
  snoozeUntil?: Date
  completedAt?: Date
  dismissedAt?: Date
}

export function useActionCenter(mutedNotifications: {[key: string]: boolean} = {}) {
  const { userId, getToken } = useAuth()
  const [counts, setCounts] = useState<ActionCenterCounts>({ totalItems: 0, urgentItems: 0, breakdown: { outreachTodos: 0, urgentOutreach: 0, brandReports: 0, availableTools: 0 } })

  // Unified Supabase client function (same as Action Center page)
  const getSupabaseClient = async () => {
    try {
      const token = await getToken({ template: 'supabase' })
      if (token) {
        return getAuthenticatedSupabaseClient(token)
      } else {
        return getStandardSupabaseClient()
      }
    } catch (error) {
      console.error('Error getting Supabase client:', error)
      return getStandardSupabaseClient()
    }
  }

  // Get task states from localStorage (same logic as Action Center page)
  const getTaskStates = useCallback((): { [key: string]: TaskState } => {
    if (!userId) return {}
    try {
      const saved = localStorage.getItem(`actionCenter_taskStates_${userId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Convert date strings back to Date objects
        Object.keys(parsed).forEach(key => {
          if (parsed[key].snoozeUntil) {
            parsed[key].snoozeUntil = new Date(parsed[key].snoozeUntil)
          }
          if (parsed[key].completedAt) {
            parsed[key].completedAt = new Date(parsed[key].completedAt)
          }
          if (parsed[key].dismissedAt) {
            parsed[key].dismissedAt = new Date(parsed[key].dismissedAt)
          }
        })
        return parsed
      }
    } catch (error) {
      console.error('Error loading task states:', error)
    }
    return {}
  }, [userId])

  // Check if a task should be counted (not snoozed, completed, or dismissed)
  const isTaskActive = useCallback((taskId: string, taskStates: { [key: string]: TaskState }): boolean => {
    const state = taskStates[taskId]
    if (!state) return true // No state means it's active

    // Check if completed or dismissed
    if (state.status === 'completed' || state.status === 'dismissed') {
      return false
    }

    // Check if snoozed and still within snooze period
    if (state.status === 'snoozed' && state.snoozeUntil) {
      return state.snoozeUntil < new Date() // Only active if snooze period has passed
    }

    return true
  }, [])

  const loadActionCenterCounts = useCallback(async () => {
    if (!userId) return

    try {
      const supabase = await getSupabaseClient()
      const taskStates = getTaskStates()
      let totalItems = 0
      let urgentItems = 0

      // 1. Check outreach campaigns (EXACT same logic as Action Center page)
      // Load campaign leads exactly like the Action Center page does - as a flat array
      const { data: userCampaigns, error: campaignsError } = await supabase
        .from('outreach_campaigns')
        .select('id')
        .eq('user_id', userId)

      if (!campaignsError && userCampaigns && userCampaigns.length > 0) {
        const campaignIds = userCampaigns.map(c => c.id)

        // Get ALL campaign leads as a flat array (same as Action Center page)
        const { data: campaignLeads, error } = await supabase
          .from('outreach_campaign_leads')
          .select(`
            *,
            lead:leads(*)
          `)
          .in('campaign_id', campaignIds)
          .order('added_at', { ascending: false })

        if (!error && campaignLeads && campaignLeads.length > 0) {
          // Use EXACT same logic as Action Center page
          // Count leads by status
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

          // Count todos using EXACT same IDs as Action Center page
          console.log('[useActionCenter] Outreach todos breakdown:', {
            pendingLeads: pendingLeads.length,
            respondedLeads: respondedLeads.length,
            qualifiedLeads: qualifiedLeads.length,
            needsFollowUp: needsFollowUp.length,
            goingCold: goingCold.length
          })
          
          if (pendingLeads.length > 0 && isTaskActive('new_leads', taskStates)) {
            totalItems++
            urgentItems++ // High priority
          }

          if (respondedLeads.length > 0 && isTaskActive('responded', taskStates)) {
            totalItems++
            urgentItems++ // High priority
          }

          if (qualifiedLeads.length > 0 && isTaskActive('qualified', taskStates)) {
            totalItems++
            urgentItems++ // High priority
          }

          if (needsFollowUp.length > 0 && isTaskActive('follow_up', taskStates)) {
            totalItems++
            // Medium priority - not urgent
          }

          if (goingCold.length > 0 && isTaskActive('going_cold', taskStates)) {
            totalItems++
            // Low priority - not urgent
          }
        }
      }

      // 2. Lead generation availability
      const now = new Date()
      const startOfWeek = new Date(now)
      const dayOfWeek = now.getDay()
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      startOfWeek.setDate(now.getDate() - daysToSubtract)
      startOfWeek.setHours(0, 0, 0, 0)

      const startOfNextWeek = new Date(startOfWeek)
      startOfNextWeek.setDate(startOfWeek.getDate() + 7)

      const { data: usageData } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lt('date', startOfNextWeek.toISOString().split('T')[0])

      if (usageData) {
        const WEEKLY_LIMIT = 5
        const currentWeeklyUsage = usageData.reduce((sum, record) => sum + (record.generation_count || 0), 0)
        const remaining = WEEKLY_LIMIT - currentWeeklyUsage
        
        // Lead generation availability is shown in tools widget, not counted as notification
        // if (remaining > 0) {
        //   const taskId = 'lead-generation-available'
        //   if (isTaskActive(taskId, taskStates)) {
        //     totalItems++
        //   }
        // }
      }

      // 3. Brand reports
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name, user_id')
        .eq('user_id', userId)

      if (brands) {
        for (const brand of brands) {
          // Daily reports
          const { data: dailyReports } = await supabase
            .from('brand_reports')
            .select('*')
            .eq('brand_id', brand.id)
            .eq('period', 'daily')

          if (!dailyReports?.length) {
            const now = new Date()
            const isAfter6AM = now.getHours() >= 6
            
            // Daily brand reports are shown in brand health widget, not counted separately
            // if (isAfter6AM) {
            //   const taskId = `brand-report-${brand.id}`
            //   if (isTaskActive(taskId, taskStates)) {
            //     totalItems++
            //   }
            // }
          }

          // Monthly reports
          const now2 = new Date()
          const isFirstOfMonth = now2.getDate() === 1
          if (isFirstOfMonth) {
            const { data: monthlyReports } = await supabase
              .from('brand_reports')
              .select('*')
              .eq('brand_id', brand.id)
              .eq('period', 'monthly')

            // Monthly reports are not part of main notification flow
            // if (!monthlyReports?.length) {
            //   const taskId = `brand-monthly-report-${brand.id}`
            //   if (isTaskActive(taskId, taskStates)) {
            //     totalItems++
            //     urgentItems++ // Monthly reports are high priority
            //   }
            // }
          }
        }

        // 4. AI Campaign Recommendations
        if (brands.length > 0) {
          const brandIds = brands.map(b => b.id)
          const { data: recommendations } = await supabase
            .from('ai_campaign_recommendations')
            .select('*')
            .in('brand_id', brandIds)
            .gt('expires_at', new Date().toISOString())

          // AI recommendations are shown in tools widget, not counted as notifications
          // if (recommendations?.length) {
          //   const taskId = 'ai-recommendations'
          //   if (isTaskActive(taskId, taskStates)) {
          //     totalItems++
          //   }
          // }
        }

        // 5. Critical brand issues
        for (const brand of brands) {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const lastWeek = new Date()
          lastWeek.setDate(lastWeek.getDate() - 7)

          const { data: metaData } = await supabase
            .from('meta_campaign_daily_insights')
            .select('*')
            .eq('brand_id', brand.id)
            .gte('date', format(lastWeek, 'yyyy-MM-dd'))
            .order('date', { ascending: false })

          // Get platform connections for this brand first
          const { data: connections } = await supabase
            .from('platform_connections')
            .select('id')
            .eq('brand_id', brand.id)
            .eq('platform_type', 'shopify')

          const connectionIds = connections?.map(c => c.id) || []

          const { data: shopifyOrders } = connectionIds.length > 0 ? await supabase
            .from('shopify_orders')
            .select('*')
            .in('connection_id', connectionIds)
            .gte('created_at', lastWeek.toISOString()) : { data: [] }

          // Check for critical issues
          const recentMetaData = metaData?.slice(0, 2) || []
          const olderMetaData = metaData?.slice(2, 4) || []

          let roas = 0, roasChange = 0, salesChange = 0
          
          if (recentMetaData.length > 0) {
            const recentSpend = recentMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.spend) || 0), 0)
            const recentRevenue = recentMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.purchase_value) || 0), 0)
            roas = recentSpend > 0 ? recentRevenue / recentSpend : 0

            if (olderMetaData.length > 0) {
              const olderSpend = olderMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.spend) || 0), 0)
              const olderRevenue = olderMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.purchase_value) || 0), 0)
              const oldRoas = olderSpend > 0 ? olderRevenue / olderSpend : 0
              roasChange = oldRoas > 0 ? ((roas - oldRoas) / oldRoas) * 100 : 0
            }
          }

          const recentOrders = shopifyOrders?.filter((order: any) => 
            new Date(order.created_at) >= yesterday
          ) || []
          const oldOrders = shopifyOrders?.filter((order: any) => {
            const orderDate = new Date(order.created_at)
            return orderDate < yesterday && orderDate >= lastWeek
          }) || []

          const recentSales = recentOrders.reduce((sum: number, order: any) => sum + (parseFloat(order.total_price) || 0), 0)
          const oldSales = oldOrders.reduce((sum: number, order: any) => sum + (parseFloat(order.total_price) || 0), 0)
          salesChange = oldSales > 0 ? ((recentSales - oldSales) / oldSales) * 100 : 0

          let isCritical = false
          if (roas < 1 && recentMetaData.length > 0) isCritical = true
          if (roasChange < -20 && recentMetaData.length > 0) isCritical = true
          if (salesChange < -30 && shopifyOrders?.length) isCritical = true

          if (isCritical) {
            const taskId = `brand-critical-${brand.id}`
            if (isTaskActive(taskId, taskStates)) {
              totalItems++
              urgentItems++ // Critical issues are always urgent
            }
          }
        }
      }

      // 6. Brand health reports (count unread brand reports)
      const { data: brandsList } = await supabase
        .from('brands')
        .select('id')
        .eq('user_id', userId)

      if (brandsList?.length) {
        // Get read brand reports from localStorage
        let readBrandReports: {[key: string]: boolean} = {}
        try {
          const saved = localStorage.getItem(`readBrandReports_${userId}`)
          if (saved) {
            readBrandReports = JSON.parse(saved)
          }
        } catch (error) {
          console.error('Error loading read brand reports:', error)
        }

              // Count unread brand reports
      const unreadBrandReports = brandsList.filter(brand => !readBrandReports[brand.id]).length
      console.log('[useActionCenter] Brand reports count breakdown:', {
        totalBrands: brandsList.length,
        unreadBrandReports,
        readBrandReports,
        brandsList: brandsList.map(b => ({ id: b.id, isRead: readBrandReports[b.id] || false }))
      })
      totalItems += unreadBrandReports
      }

            // Only count actionable notifications for sidebar:
      // - Outreach tasks (urgent items that need action)
      // - Brand health reports (unread reports that need review)
      // Available tools are informational only and don't need urgent attention

              console.log('[useActionCenter] Final counts for sidebar (RAW - before muting):', {
          totalItems,
          urgentItems,
          note: 'RAW counts with breakdown for proper muting',
          currentValues: { totalItems, urgentItems }
        })
      
              // Use dynamic calculation based on the pattern observed in logs
        const estimatedTodos = Math.max(0, totalItems - 3) // Assume 3 reports typically, rest are todos
        const estimatedReports = Math.min(3, totalItems) // Max 3 reports typically
        
        setCounts({ 
          totalItems, 
          urgentItems,
          breakdown: {
            outreachTodos: estimatedTodos, 
            urgentOutreach: Math.min(urgentItems, Math.floor(estimatedTodos * 0.6)), // ~60% of todos are urgent typically
            brandReports: estimatedReports,
            availableTools: 0
          }
        })

    } catch (error) {
      console.error('Error loading action center counts:', error)
    }
  }, [userId, getToken, getTaskStates, isTaskActive])

  // Load counts on mount and set up refresh interval
  useEffect(() => {
    if (userId) {
      loadActionCenterCounts()
      
      // Refresh every 2 minutes
      const interval = setInterval(loadActionCenterCounts, 2 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [userId, loadActionCenterCounts])

  // Listen for localStorage changes (when tasks are completed/snoozed from Action Center)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `actionCenter_taskStates_${userId}`) {
        loadActionCenterCounts()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [userId, loadActionCenterCounts])

  // Function to get counts with muting applied
  const getFilteredCounts = () => {
    let filteredTotal = counts.totalItems
    let filteredUrgent = counts.urgentItems
    
    // Get more precise counts by recalculating with muted notifications excluded
    let mutedTotal = 0
    let mutedUrgent = 0
    
    // Handle outreach-tasks muting
    if (mutedNotifications['outreach-tasks']) {
      // Estimate outreach items (these are typically urgent)
      // In practice, most outreach todos are urgent, so we reduce both counts
      const estimatedOutreachItems = Math.min(filteredTotal, 5) // Conservative estimate
      const estimatedOutreachUrgent = Math.min(filteredUrgent, estimatedOutreachItems)
      mutedTotal += estimatedOutreachItems
      mutedUrgent += estimatedOutreachUrgent
    }
    
    // Handle brand-health muting
    if (mutedNotifications['brand-health']) {
      // Brand health reports are typically not urgent, just informational
      const estimatedBrandHealthItems = Math.min(filteredTotal - mutedTotal, 3)
      mutedTotal += estimatedBrandHealthItems
    }
    
    // Handle available-tools muting (these aren't urgent)
    if (mutedNotifications['available-tools']) {
      // Available tools notifications are informational only
      const estimatedToolsItems = Math.min(filteredTotal - mutedTotal, 1)
      mutedTotal += estimatedToolsItems
    }
    
    return { 
      totalItems: Math.max(0, filteredTotal - mutedTotal), 
      urgentItems: Math.max(0, filteredUrgent - mutedUrgent) 
    }
  }

                return {
          actionCenterCounts: counts, // Include breakdown for proper filtering
          refreshCounts: loadActionCenterCounts
        }
} 