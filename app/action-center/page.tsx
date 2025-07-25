"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@clerk/nextjs'
import { useBrandContext } from '@/lib/context/BrandContext'
import { getSupabaseClient } from '@/lib/supabase/client'
import { 
  AlertTriangle, 
  Clock, 
  MessageSquare, 
  Star, 
  Zap, 
  Users, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle,
  RefreshCw,
  Bell,
  Activity,
  BarChart3,
  Send,
  FileBarChart,
  Sparkles,
  ArrowRight,
  Flame,
  AlertCircle,
  Brain,
  ChevronRight,
  Plus,
  Filter,
  Search,
  MoreVertical,
  X,
  Clock as ClockSnooze,
  Check,
  Archive,
  Eye,
  EyeOff,
  Calendar,
  ChevronDown,
  ChevronUp,
  Dot,
  Timer,
  Target,
  TrendingUp as TrendUp,
  DollarSign,
  ShoppingCart,
  MousePointer,
  ExternalLink,
  Megaphone
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format, addHours, addDays, addWeeks } from 'date-fns'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

interface OutreachItem {
  id: string
  type: 'pending' | 'followup' | 'responded'
  title: string
  description: string
  count: number
  campaignName: string
  href: string
}

interface ReportReminder {
  id: string
  brandId: string
  brandName: string
  type: 'daily' | 'monthly'
  title: string
  description: string
  href: string
}

interface BrandStatus {
  id: string
  brandId: string
  brandName: string
  status: 'critical' | 'warning' | 'good' | 'excellent'
  issues: string[]
  metrics: {
    roas: number
    roasChange: number
    sales: number
    salesChange: number
    cpm: number
    cpmChange: number
    conversions: number
    conversionsChange: number
  }
  lastUpdated: Date
}

interface LeadGenStatus {
  available: boolean
  remaining: number
  weeklyUsed: number
  weeklyLimit: number
  resetsAt: Date
}

interface TaskState {
  [key: string]: {
    status: 'pending' | 'snoozed' | 'completed' | 'dismissed'
    snoozeUntil?: Date
    completedAt?: Date
    dismissedAt?: Date
  }
}

export default function ActionCenterPage() {
  const { user } = useUser()
  const { selectedBrandId } = useBrandContext()
  const router = useRouter()
  
  const [outreachItems, setOutreachItems] = useState<OutreachItem[]>([])
  const [reportReminders, setReportReminders] = useState<ReportReminder[]>([])
  const [brandStatuses, setBrandStatuses] = useState<BrandStatus[]>([])
  const [leadGenStatus, setLeadGenStatus] = useState<LeadGenStatus | null>(null)
  const [aiRecommendations, setAiRecommendations] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [taskStates, setTaskStates] = useState<TaskState>({})

  // Load task states from localStorage
  useEffect(() => {
    if (user?.id) {
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
        setTaskStates(parsed)
      }
    }
  }, [user?.id])

  // Save task states to localStorage
  const saveTaskStates = useCallback((newStates: TaskState) => {
    if (user?.id) {
      localStorage.setItem(`actionCenter_taskStates_${user.id}`, JSON.stringify(newStates))
      setTaskStates(newStates)
    }
  }, [user?.id])

  // Load all data
  const loadData = useCallback(async () => {
    if (!user?.id) return

    try {
      const supabase = await getSupabaseClient()

      // 1. Load Outreach Items
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

      const outreach: OutreachItem[] = []
      if (outreachCampaigns) {
        for (const campaign of outreachCampaigns) {
          const leads = campaign.outreach_campaign_leads || []
          
          const pendingLeads = leads.filter((cl: any) => cl.status === 'pending')
          if (pendingLeads.length > 0) {
            outreach.push({
              id: `outreach-pending-${campaign.id}`,
              type: 'pending',
              title: `${pendingLeads.length} leads ready for outreach`,
              description: `Start contacting new leads in ${campaign.name}`,
              count: pendingLeads.length,
              campaignName: campaign.name,
              href: '/outreach-tool'
            })
          }

          const threeDaysAgo = new Date()
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
          const needsFollowUp = leads.filter((cl: any) => 
            cl.status === 'contacted' && 
            cl.last_contacted_at && 
            new Date(cl.last_contacted_at) < threeDaysAgo
          )
          
          if (needsFollowUp.length > 0) {
            outreach.push({
              id: `outreach-followup-${campaign.id}`,
              type: 'followup',
              title: `${needsFollowUp.length} leads need follow-up`,
              description: `Haven't been contacted in 3+ days`,
              count: needsFollowUp.length,
              campaignName: campaign.name,
              href: '/outreach-tool'
            })
          }

          const respondedLeads = leads.filter((cl: any) => cl.status === 'responded')
          if (respondedLeads.length > 0) {
            outreach.push({
              id: `outreach-responded-${campaign.id}`,
              type: 'responded',
              title: `${respondedLeads.length} hot leads responded`,
              description: `Leads are waiting for your response`,
              count: respondedLeads.length,
              campaignName: campaign.name,
              href: '/outreach-tool'
            })
          }
        }
      }
      setOutreachItems(outreach)

      // 2. Load Lead Generation Status
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

      const WEEKLY_LIMIT = 5
      const currentWeeklyUsage = usageData?.reduce((sum, record) => sum + (record.generation_count || 0), 0) || 0
      const remaining = WEEKLY_LIMIT - currentWeeklyUsage

      setLeadGenStatus({
        available: remaining > 0,
        remaining,
        weeklyUsed: currentWeeklyUsage,
        weeklyLimit: WEEKLY_LIMIT,
        resetsAt: startOfNextWeek
      })

      // 3. Load Brand Data and Statuses
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name, user_id')
        .eq('user_id', user.id)

      const reports: ReportReminder[] = []
      const statuses: BrandStatus[] = []

      if (brands) {
        for (const brand of brands) {
          // Check for missing reports
          const { data: dailyReports } = await supabase
            .from('brand_reports')
            .select('*')
            .eq('brand_id', brand.id)
            .eq('period', 'daily')

          if (!dailyReports?.length && now.getHours() >= 6) {
            reports.push({
              id: `brand-report-${brand.id}`,
              brandId: brand.id,
              brandName: brand.name,
              type: 'daily',
              title: `Daily report for ${brand.name}`,
              description: 'Generate today\'s performance report',
              href: '/brand-report'
            })
          }

          if (now.getDate() === 1) {
            const { data: monthlyReports } = await supabase
              .from('brand_reports')
              .select('*')
              .eq('brand_id', brand.id)
              .eq('period', 'monthly')

            if (!monthlyReports?.length) {
              reports.push({
                id: `brand-monthly-report-${brand.id}`,
                brandId: brand.id,
                brandName: brand.name,
                type: 'monthly',
                title: `Monthly report for ${brand.name}`,
                description: 'Generate last month\'s performance report',
                href: '/brand-report'
              })
            }
          }

          // Get brand performance data
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

          // Calculate metrics
          const recentMetaData = metaData?.slice(0, 3) || []
          const olderMetaData = metaData?.slice(3, 6) || []

          let roas = 0, roasChange = 0, cpm = 0, cpmChange = 0, conversions = 0, conversionsChange = 0
          
          if (recentMetaData.length > 0) {
            const recentSpend = recentMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.spend) || 0), 0)
            const recentRevenue = recentMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.purchase_value) || 0), 0)
            const recentImpressions = recentMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.impressions) || 0), 0)
            const recentConversions = recentMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.purchases) || 0), 0)
            
            roas = recentSpend > 0 ? recentRevenue / recentSpend : 0
            cpm = recentImpressions > 0 ? (recentSpend / recentImpressions) * 1000 : 0
            conversions = recentConversions

            if (olderMetaData.length > 0) {
              const olderSpend = olderMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.spend) || 0), 0)
              const olderRevenue = olderMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.purchase_value) || 0), 0)
              const olderImpressions = olderMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.impressions) || 0), 0)
              const olderConversions = olderMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.purchases) || 0), 0)
              
              const oldRoas = olderSpend > 0 ? olderRevenue / olderSpend : 0
              const oldCpm = olderImpressions > 0 ? (olderSpend / olderImpressions) * 1000 : 0
              
              roasChange = oldRoas > 0 ? ((roas - oldRoas) / oldRoas) * 100 : 0
              cpmChange = oldCpm > 0 ? ((cpm - oldCpm) / oldCpm) * 100 : 0
              conversionsChange = olderConversions > 0 ? ((conversions - olderConversions) / olderConversions) * 100 : 0
            }
          }

          // Calculate sales metrics
          const recentOrders = shopifyOrders?.filter((order: any) => 
            new Date(order.created_at) >= yesterday
          ) || []
          const oldOrders = shopifyOrders?.filter((order: any) => {
            const orderDate = new Date(order.created_at)
            return orderDate < yesterday && orderDate >= lastWeek
          }) || []

          const recentSales = recentOrders.reduce((sum: number, order: any) => sum + (parseFloat(order.total_price) || 0), 0)
          const oldSales = oldOrders.reduce((sum: number, order: any) => sum + (parseFloat(order.total_price) || 0), 0)
          const salesChange = oldSales > 0 ? ((recentSales - oldSales) / oldSales) * 100 : 0

          // Determine status and issues
          const issues: string[] = []
          let isCritical = false
          let isWarning = false

          if (roas < 1 && recentMetaData.length > 0) {
            issues.push(`ROAS below breakeven (${roas.toFixed(2)})`)
            isCritical = true
          } else if (roas < 2 && recentMetaData.length > 0) {
            issues.push(`Low ROAS (${roas.toFixed(2)})`)
            isWarning = true
          }

          if (roasChange < -20) {
            issues.push(`ROAS dropped ${Math.abs(roasChange).toFixed(1)}%`)
            isCritical = true
          } else if (roasChange < -10) {
            issues.push(`ROAS down ${Math.abs(roasChange).toFixed(1)}%`)
            isWarning = true
          }

          if (salesChange < -30) {
            issues.push(`Sales dropped ${Math.abs(salesChange).toFixed(1)}%`)
            isCritical = true
          } else if (salesChange < -15) {
            issues.push(`Sales down ${Math.abs(salesChange).toFixed(1)}%`)
            isWarning = true
          }

          if (cpmChange > 50) {
            issues.push(`CPM increased ${cpmChange.toFixed(1)}%`)
            isWarning = true
          }

          if (conversionsChange < -40) {
            issues.push(`Conversions dropped ${Math.abs(conversionsChange).toFixed(1)}%`)
            isCritical = true
          }

          // Determine final status based on flags
          let status: 'critical' | 'warning' | 'good' | 'excellent' = 'good'
          if (isCritical) {
            status = 'critical'
          } else if (isWarning) {
            status = 'warning'
          }

          // Positive indicators
          if (issues.length === 0) {
            if (roas > 4 && roasChange > 10) {
              status = 'excellent'
              issues.push(`Excellent performance: ROAS ${roas.toFixed(2)} (+${roasChange.toFixed(1)}%)`)
            } else if (roas > 2.5 && salesChange > 10) {
              status = 'excellent'
              issues.push(`Strong growth: Sales up ${salesChange.toFixed(1)}%`)
            } else if (roas > 2) {
              issues.push(`Healthy ROAS: ${roas.toFixed(2)}`)
            }
          }

          if (issues.length === 0) {
            issues.push('All metrics stable')
          }

          statuses.push({
            id: brand.id,
            brandId: brand.id,
            brandName: brand.name,
            status,
            issues,
            metrics: {
              roas,
              roasChange,
              sales: recentSales,
              salesChange,
              cpm,
              cpmChange,
              conversions,
              conversionsChange
            },
            lastUpdated: new Date()
          })
        }

        // 4. AI Recommendations
        if (brands.length > 0) {
          const brandIds = brands.map(b => b.id)
          const { data: recommendations } = await supabase
            .from('ai_campaign_recommendations')
            .select('*')
            .in('brand_id', brandIds)
            .gt('expires_at', new Date().toISOString())

          setAiRecommendations(recommendations?.length || 0)
        }
      }

      setReportReminders(reports)
      setBrandStatuses(statuses)

    } catch (error) {
      console.error('Error loading data:', error)
    }
  }, [user?.id])

  useEffect(() => {
    const loadDataWithLoading = async () => {
      setIsLoading(true)
      await loadData()
      setIsLoading(false)
    }

    if (user?.id) {
      loadDataWithLoading()
    }
  }, [user?.id, loadData, refreshKey])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Task actions
  const snoozeTask = (taskId: string, duration: 'hour' | '4hours' | 'tomorrow' | 'week') => {
    const now = new Date()
    let snoozeUntil: Date

    switch (duration) {
      case 'hour':
        snoozeUntil = addHours(now, 1)
        break
      case '4hours':
        snoozeUntil = addHours(now, 4)
        break
      case 'tomorrow':
        snoozeUntil = addDays(now, 1)
        break
      case 'week':
        snoozeUntil = addWeeks(now, 1)
        break
    }

    const newStates = {
      ...taskStates,
      [taskId]: {
        ...taskStates[taskId],
        status: 'snoozed' as const,
        snoozeUntil
      }
    }
    saveTaskStates(newStates)
  }

  const dismissTask = (taskId: string) => {
    const newStates = {
      ...taskStates,
      [taskId]: {
        ...taskStates[taskId],
        status: 'dismissed' as const,
        dismissedAt: new Date()
      }
    }
    saveTaskStates(newStates)
  }

  const markCompleted = (taskId: string) => {
    const newStates = {
      ...taskStates,
      [taskId]: {
        ...taskStates[taskId],
        status: 'completed' as const,
        completedAt: new Date()
      }
    }
    saveTaskStates(newStates)
  }

  const getTaskState = (taskId: string) => {
    const state = taskStates[taskId]
    if (!state) return { status: 'pending' }
    
    // Check if snoozed task should be reactivated
    if (state.status === 'snoozed' && state.snoozeUntil && state.snoozeUntil < new Date()) {
      return { status: 'pending' }
    }
    
    return state
  }

  const isTaskActive = (taskId: string) => {
    const state = getTaskState(taskId)
    return state.status === 'pending'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'border-red-200 bg-red-50'
      case 'warning': return 'border-orange-200 bg-orange-50'
      case 'excellent': return 'border-green-200 bg-green-50'
      default: return 'border-gray-200 bg-white'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-orange-600" />
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getOutreachTypeColor = (type: string) => {
    switch (type) {
      case 'responded': return 'border-green-200 bg-green-50'
      case 'followup': return 'border-orange-200 bg-orange-50'
      default: return 'border-blue-200 bg-blue-50'
    }
  }

  const getOutreachTypeIcon = (type: string) => {
    switch (type) {
      case 'responded': return <MessageSquare className="h-4 w-4 text-green-600" />
      case 'followup': return <Clock className="h-4 w-4 text-orange-600" />
      default: return <Send className="h-4 w-4 text-blue-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-white rounded-xl border border-gray-200"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-48 bg-white rounded-xl border border-gray-200"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Action Center</h1>
              <p className="text-gray-600">
                Monitor your brands, manage outreach, and stay on top of key metrics
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Brand Status Monitoring */}
          <div className="space-y-6">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <Activity className="h-5 w-5" />
                  Brand Performance ({brandStatuses.length})
                </CardTitle>
                <CardDescription>
                  Real-time status of all connected brands
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {brandStatuses.length > 0 ? (
                  brandStatuses.map((brand) => (
                    <div
                      key={brand.id}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow",
                        getStatusColor(brand.status)
                      )}
                      onClick={() => router.push(`/dashboard?brand=${brand.brandId}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(brand.status)}
                          <div>
                            <h4 className="font-semibold text-gray-900">{brand.brandName}</h4>
                            <p className="text-sm text-gray-600 capitalize">{brand.status} status</p>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </div>
                      
                      <div className="space-y-2">
                        {brand.issues.map((issue, idx) => (
                          <p key={idx} className="text-sm text-gray-700">• {issue}</p>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500">ROAS</p>
                          <p className="font-semibold text-gray-900">
                            {brand.metrics.roas.toFixed(2)}
                            <span className={cn("ml-1 text-xs", 
                              brand.metrics.roasChange > 0 ? "text-green-600" : 
                              brand.metrics.roasChange < 0 ? "text-red-600" : "text-gray-500"
                            )}>
                              {brand.metrics.roasChange > 0 ? '+' : ''}{brand.metrics.roasChange.toFixed(1)}%
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Sales</p>
                          <p className="font-semibold text-gray-900">
                            ${brand.metrics.sales.toFixed(0)}
                            <span className={cn("ml-1 text-xs", 
                              brand.metrics.salesChange > 0 ? "text-green-600" : 
                              brand.metrics.salesChange < 0 ? "text-red-600" : "text-gray-500"
                            )}>
                              {brand.metrics.salesChange > 0 ? '+' : ''}{brand.metrics.salesChange.toFixed(1)}%
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>No brands connected yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Outreach & Lead Management */}
          <div className="space-y-6">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <Send className="h-5 w-5" />
                  Outreach Actions ({outreachItems.filter(item => isTaskActive(item.id)).length})
                </CardTitle>
                <CardDescription>
                  Pending outreach tasks and lead responses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {outreachItems.filter(item => isTaskActive(item.id)).length > 0 ? (
                  outreachItems.filter(item => isTaskActive(item.id)).map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow",
                        getOutreachTypeColor(item.type)
                      )}
                      onClick={() => router.push(item.href)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getOutreachTypeIcon(item.type)}
                          <div>
                            <h4 className="font-semibold text-gray-900">{item.title}</h4>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            <p className="text-xs text-gray-500 mt-1">Campaign: {item.campaignName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gray-100 text-gray-900">
                            {item.count}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-white border border-gray-200">
                              <DropdownMenuItem onClick={() => markCompleted(item.id)} className="text-gray-700 hover:bg-gray-50">
                                <Check className="h-4 w-4 mr-2" />
                                Mark Complete
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-200" />
                              <DropdownMenuItem onClick={() => snoozeTask(item.id, 'hour')} className="text-gray-700 hover:bg-gray-50">
                                <ClockSnooze className="h-4 w-4 mr-2" />
                                Snooze 1 hour
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => snoozeTask(item.id, 'tomorrow')} className="text-gray-700 hover:bg-gray-50">
                                <ClockSnooze className="h-4 w-4 mr-2" />
                                Snooze until tomorrow
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-200" />
                              <DropdownMenuItem onClick={() => dismissTask(item.id)} className="text-red-600 hover:bg-red-50">
                                <X className="h-4 w-4 mr-2" />
                                Dismiss
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Send className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>No pending outreach tasks</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead Generation */}
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <Users className="h-5 w-5" />
                  Lead Generation
                </CardTitle>
                <CardDescription>
                  Weekly lead generation status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leadGenStatus ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {leadGenStatus.remaining} credits remaining
                        </p>
                        <p className="text-sm text-gray-600">
                          {leadGenStatus.weeklyUsed} of {leadGenStatus.weeklyLimit} used this week
                        </p>
                      </div>
                      {leadGenStatus.available && (
                        <Button
                          onClick={() => router.push('/lead-generator')}
                          className="bg-gray-900 hover:bg-gray-800 text-white"
                        >
                          Generate Leads
                        </Button>
                      )}
                    </div>
                    
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gray-400 transition-all duration-300"
                        style={{ width: `${(leadGenStatus.weeklyUsed / leadGenStatus.weeklyLimit) * 100}%` }}
                      />
                    </div>
                    
                    {!leadGenStatus.available && (
                      <p className="text-sm text-gray-500">
                        Resets {formatDistanceToNow(leadGenStatus.resetsAt, { addSuffix: true })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>Loading lead generation status...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Report Reminders & AI Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Report Reminders */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-gray-900">
                <FileBarChart className="h-5 w-5" />
                Report Reminders ({reportReminders.filter(item => isTaskActive(item.id)).length})
              </CardTitle>
              <CardDescription>
                Pending brand reports to generate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reportReminders.filter(item => isTaskActive(item.id)).length > 0 ? (
                reportReminders.filter(item => isTaskActive(item.id)).map((report) => (
                  <div
                    key={report.id}
                    className="p-4 rounded-lg border border-gray-200 bg-gray-50 hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => router.push(report.href)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileBarChart className="h-4 w-4 text-gray-600" />
                        <div>
                          <h4 className="font-semibold text-gray-900">{report.title}</h4>
                          <p className="text-sm text-gray-600">{report.description}</p>
                          <Badge className="mt-1 bg-gray-200 text-gray-700 text-xs">
                            {report.type}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white border border-gray-200">
                          <DropdownMenuItem onClick={() => markCompleted(report.id)} className="text-gray-700 hover:bg-gray-50">
                            <Check className="h-4 w-4 mr-2" />
                            Mark Complete
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-200" />
                          <DropdownMenuItem onClick={() => snoozeTask(report.id, 'tomorrow')} className="text-gray-700 hover:bg-gray-50">
                            <ClockSnooze className="h-4 w-4 mr-2" />
                            Snooze until tomorrow
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => dismissTask(report.id)} className="text-red-600 hover:bg-red-50">
                            <X className="h-4 w-4 mr-2" />
                            Dismiss
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileBarChart className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>All reports up to date</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-gray-900">
                <Brain className="h-5 w-5" />
                AI Recommendations ({aiRecommendations})
              </CardTitle>
              <CardDescription>
                AI-powered campaign optimization suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiRecommendations > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-purple-200 bg-purple-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {aiRecommendations} new recommendations available
                          </h4>
                          <p className="text-sm text-gray-600">
                            AI analysis has found optimization opportunities
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => router.push('/marketing-assistant')}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        View All
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>No new recommendations</p>
                  <Button
                    onClick={() => router.push('/marketing-assistant')}
                    variant="outline"
                    className="mt-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Request Analysis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 