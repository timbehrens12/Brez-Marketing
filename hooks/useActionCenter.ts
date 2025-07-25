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

  const loadActionCenterCounts = useCallback(async () => {
    if (!user?.id) return

    try {
      const supabase = await getSupabaseClient()
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
            outreachItems++
            totalItems++
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
            outreachItems++
            urgentItems++
            totalItems++
          }

          // Responded leads
          const respondedLeads = leads.filter((cl: any) => cl.status === 'responded')
          if (respondedLeads.length > 0) {
            outreachItems++
            urgentItems++
            totalItems++
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
          leadGenItems++
          totalItems++
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
              reportItems++
              totalItems++
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
              reportItems++
              urgentItems++
              totalItems++
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
        aiRecommendations = recommendations.length
        totalItems++
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
  }, [user?.id])

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