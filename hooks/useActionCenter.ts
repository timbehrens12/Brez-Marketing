"use client"

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { getSupabaseClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface ActionCenterCounts {
  totalItems: number
  urgentItems: number
}

interface TaskState {
  status: 'pending' | 'snoozed' | 'completed' | 'dismissed'
  snoozeUntil?: Date
  completedAt?: Date
  dismissedAt?: Date
}

export function useActionCenter() {
  const { user } = useUser()
  const [counts, setCounts] = useState<ActionCenterCounts>({ totalItems: 0, urgentItems: 0 })

  // Get task states from localStorage (same logic as Action Center page)
  const getTaskStates = useCallback((): { [key: string]: TaskState } => {
    if (!user?.id) return {}
    try {
      const saved = localStorage.getItem(`actionCenter_taskStates_${user.id}`)
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
  }, [user?.id])

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
    if (!user?.id) return

    try {
      const supabase = await getSupabaseClient()
      const taskStates = getTaskStates()
      let totalItems = 0
      let urgentItems = 0

      // 1. Check outreach campaigns
      const { data: outreachCampaigns } = await supabase
        .from('outreach_campaigns')
        .select(`
          *,
          outreach_campaign_leads(
            id,
            status,
            last_contacted_at
          )
        `)
        .eq('user_id', user.id)

      if (outreachCampaigns) {
        for (const campaign of outreachCampaigns) {
          const leads = campaign.outreach_campaign_leads || []
          
          // Pending leads
          const pendingLeads = leads.filter((cl: any) => cl.status === 'pending')
          if (pendingLeads.length > 0) {
            const taskId = `outreach-pending-${campaign.id}`
            if (isTaskActive(taskId, taskStates)) {
              totalItems++
              if (pendingLeads.length > 5) urgentItems++
            }
          }

          // Follow-up needed
          const threeDaysAgo = new Date()
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
          const needsFollowUp = leads.filter((cl: any) => 
            cl.status === 'contacted' && 
            cl.last_contacted_at && 
            new Date(cl.last_contacted_at) < threeDaysAgo
          )
          
          if (needsFollowUp.length > 0) {
            const taskId = `outreach-followup-${campaign.id}`
            if (isTaskActive(taskId, taskStates)) {
              totalItems++
              urgentItems++ // Follow-ups are always urgent
            }
          }

          // Responded leads
          const respondedLeads = leads.filter((cl: any) => cl.status === 'responded')
          if (respondedLeads.length > 0) {
            const taskId = `outreach-responded-${campaign.id}`
            if (isTaskActive(taskId, taskStates)) {
              totalItems++
              urgentItems++ // Responses are urgent
            }
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
        .eq('user_id', user.id)
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lt('date', startOfNextWeek.toISOString().split('T')[0])

      if (usageData) {
        const WEEKLY_LIMIT = 5
        const currentWeeklyUsage = usageData.reduce((sum, record) => sum + (record.generation_count || 0), 0)
        const remaining = WEEKLY_LIMIT - currentWeeklyUsage
        
        if (remaining > 0) {
          const taskId = 'lead-generation-available'
          if (isTaskActive(taskId, taskStates)) {
            totalItems++
          }
        }
      }

      // 3. Brand reports
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name, user_id')
        .eq('user_id', user.id)

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
            
            if (isAfter6AM) {
              const taskId = `brand-report-${brand.id}`
              if (isTaskActive(taskId, taskStates)) {
                totalItems++
              }
            }
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

            if (!monthlyReports?.length) {
              const taskId = `brand-monthly-report-${brand.id}`
              if (isTaskActive(taskId, taskStates)) {
                totalItems++
                urgentItems++ // Monthly reports are high priority
              }
            }
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

          if (recommendations?.length) {
            const taskId = 'ai-recommendations'
            if (isTaskActive(taskId, taskStates)) {
              totalItems++
            }
          }
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
            .gte('date_start', format(lastWeek, 'yyyy-MM-dd'))
            .order('date_start', { ascending: false })

          const { data: shopifyOrders } = await supabase
            .from('shopify_orders')
            .select('*')
            .eq('brand_id', brand.id)
            .gte('created_at', lastWeek.toISOString())

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

      setCounts({ totalItems, urgentItems })

    } catch (error) {
      console.error('Error loading action center counts:', error)
    }
  }, [user?.id, getTaskStates, isTaskActive])

  // Load counts on mount and set up refresh interval
  useEffect(() => {
    if (user?.id) {
      loadActionCenterCounts()
      
      // Refresh every 2 minutes
      const interval = setInterval(loadActionCenterCounts, 2 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [user?.id, loadActionCenterCounts])

  // Listen for localStorage changes (when tasks are completed/snoozed from Action Center)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `actionCenter_taskStates_${user?.id}`) {
        loadActionCenterCounts()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [user?.id, loadActionCenterCounts])

  return {
    actionCenterCounts: counts,
    refreshCounts: loadActionCenterCounts
  }
} 