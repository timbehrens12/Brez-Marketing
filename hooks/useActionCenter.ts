import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { getSupabaseClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface ActionCenterCounts {
  totalItems: number
  urgentItems: number
  outreachItems: number
  leadGenItems: number
  reportItems: number
  aiRecommendations: number
}

interface TaskState {
  [key: string]: {
    status: 'pending' | 'snoozed' | 'completed' | 'dismissed'
    snoozeUntil?: Date
    completedAt?: Date
    dismissedAt?: Date
  }
}

export function useActionCenter() {
  const { user } = useUser()
  const [counts, setCounts] = useState<ActionCenterCounts>({
    totalItems: 0,
    urgentItems: 0,
    outreachItems: 0,
    leadGenItems: 0,
    reportItems: 0,
    aiRecommendations: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  // Load task states from localStorage
  const getTaskStates = useCallback((): TaskState => {
    if (!user?.id) return {}
    
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
    return {}
  }, [user?.id])

  const loadActionCenterCounts = useCallback(async () => {
    if (!user?.id) return

    try {
      const supabase = await getSupabaseClient()
      const taskStates = getTaskStates()
      
      // Helper function to check if a task is active (not snoozed, completed, or dismissed)
      const isTaskActive = (taskId: string): boolean => {
        const state = taskStates[taskId]
        if (!state) return true // Default to active if no state saved
        
        // Check if snoozed task should be reactivated
        if (state.status === 'snoozed' && state.snoozeUntil && state.snoozeUntil < new Date()) {
          return true
        }
        
        return state.status === 'pending'
      }

      let totalItems = 0
      let urgentItems = 0
      let outreachItems = 0
      let leadGenItems = 0
      let reportItems = 0
      let aiRecommendations = 0

      // 1. Count Outreach Items
      const { data: outreachCampaigns } = await supabase
        .from('outreach_campaigns')
        .select(`
          id,
          outreach_campaign_leads!inner(
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
            if (isTaskActive(taskId)) {
              outreachItems++
              totalItems++
            }
          }

          // Follow-up needed (3+ days)
          const threeDaysAgo = new Date()
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
          const needsFollowUp = leads.filter((cl: any) => 
            cl.status === 'contacted' && 
            cl.last_contacted_at && 
            new Date(cl.last_contacted_at) < threeDaysAgo
          )
          
          if (needsFollowUp.length > 0) {
            const taskId = `outreach-followup-${campaign.id}`
            if (isTaskActive(taskId)) {
              outreachItems++
              urgentItems++
              totalItems++
            }
          }

          // Responded leads
          const respondedLeads = leads.filter((cl: any) => cl.status === 'responded')
          if (respondedLeads.length > 0) {
            const taskId = `outreach-responded-${campaign.id}`
            if (isTaskActive(taskId)) {
              outreachItems++
              urgentItems++
              totalItems++
            }
          }
        }
      }

      // 2. Count Lead Generation Items
      const { data: usageData } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (usageData?.[0]) {
        const usage = usageData[0]
        const remaining = usage.weekly_limit - usage.weekly_used
        
        if (remaining > 0) {
          const taskId = 'lead-generation-available'
          if (isTaskActive(taskId)) {
            leadGenItems++
            totalItems++
          }
        }
      }

      // 3. Count Brand Report Items
      const { data: brands } = await supabase
        .from('brands')
        .select('id, brand_name')
        .eq('user_id', user.id)

      if (brands) {
        for (const brand of brands) {
          // Check daily reports
          const { data: todayReports } = await supabase
            .from('brand_reports')
            .select('id')
            .eq('brand_id', brand.id)
            .eq('report_date', format(new Date(), 'yyyy-MM-dd'))
            .eq('report_type', 'today')

          if (!todayReports?.length) {
            const now = new Date()
            const isAfter6AM = now.getHours() >= 6
            
            if (isAfter6AM) {
              const taskId = `brand-report-${brand.id}`
              if (isTaskActive(taskId)) {
                reportItems++
                totalItems++
              }
            }
          }

          // Check monthly reports (first day of month)
          const now = new Date()
          const isFirstOfMonth = now.getDate() === 1
          if (isFirstOfMonth) {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const { data: monthlyReports } = await supabase
              .from('brand_reports')
              .select('id')
              .eq('brand_id', brand.id)
              .eq('report_date', format(lastMonth, 'yyyy-MM-dd'))
              .eq('report_type', 'last-month')

            if (!monthlyReports?.length) {
              const taskId = `brand-monthly-report-${brand.id}`
              if (isTaskActive(taskId)) {
                reportItems++
                urgentItems++
                totalItems++
              }
            }
          }
        }
      }

      // 4. Count AI Recommendations
      const { data: recommendations } = await supabase
        .from('ai_campaign_recommendations')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')

      if (recommendations?.length) {
        const taskId = 'ai-recommendations'
        if (isTaskActive(taskId)) {
          aiRecommendations = recommendations.length
          totalItems++
        }
      }

      // 5. Count Critical Brand Issues
      if (brands) {
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

          if (roas < 1 && recentMetaData.length > 0) {
            isCritical = true
          }

          if (roasChange < -20 && recentMetaData.length > 0) {
            isCritical = true
          }

          if (salesChange < -30 && shopifyOrders?.length) {
            isCritical = true
          }

          if (isCritical) {
            const taskId = `brand-critical-${brand.id}`
            if (isTaskActive(taskId)) {
              urgentItems++
              totalItems++
            }
          }
        }
      }

      setCounts({
        totalItems,
        urgentItems,
        outreachItems,
        leadGenItems,
        reportItems,
        aiRecommendations
      })
    } catch (error) {
      console.error('Error loading action center counts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, getTaskStates])

  useEffect(() => {
    if (user?.id) {
      loadActionCenterCounts()
      
      // Refresh counts every 2 minutes
      const interval = setInterval(loadActionCenterCounts, 2 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [user?.id, loadActionCenterCounts])

  return {
    counts,
    isLoading,
    refresh: loadActionCenterCounts
  }
} 