"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  DollarSign,
  Target,
  Calendar,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Bell,
  Activity,
  ShoppingCart,
  BarChart3,
  Send,
  FileBarChart,
  Sparkles,
  ArrowRight,
  Palette
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ActionItem {
  id: string
  type: 'urgent' | 'opportunity' | 'insight' | 'task' | 'recommendation'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  href?: string
  count?: number
  dueDate?: Date
  brandId?: string
  brandName?: string
  data?: any
}

interface BrandStatus {
  brandId: string
  brandName: string
  status: 'critical' | 'warning' | 'healthy' | 'excellent'
  metrics: {
    roas?: number
    roasChange?: number
    cpm?: number
    cpmChange?: number
    sales?: number
    salesChange?: number
    newInsights?: number
  }
  lastUpdated: Date
  issues: string[]
  opportunities: string[]
}

export default function ActionCenterPage() {
  const { user } = useUser()
  const { selectedBrandId } = useBrandContext()
  const router = useRouter()
  
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [brandStatuses, setBrandStatuses] = useState<BrandStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Load action items from various sources
  const loadActionItems = useCallback(async () => {
    if (!user?.id) return

    try {
      const supabase = await getSupabaseClient()
      const items: ActionItem[] = []

      // 1. Outreach Action Items
      const { data: outreachCampaigns } = await supabase
        .from('outreach_campaigns')
        .select(`
          *,
          outreach_campaign_leads!inner(
            id,
            status,
            last_contacted_at,
            leads!inner(business_name)
          )
        `)
        .eq('user_id', user.id)

      if (outreachCampaigns) {
        for (const campaign of outreachCampaigns) {
          const leads = campaign.outreach_campaign_leads || []
          
          // Pending leads needing outreach
          const pendingLeads = leads.filter((cl: any) => cl.status === 'pending')
          if (pendingLeads.length > 0) {
            items.push({
              id: `outreach-pending-${campaign.id}`,
              type: 'task',
              priority: pendingLeads.length > 5 ? 'high' : 'medium',
              title: `${pendingLeads.length} leads awaiting outreach`,
              description: `Start outreach for ${pendingLeads.length} new leads in "${campaign.name}"`,
              action: 'Start Outreach',
              href: '/outreach-tool',
              count: pendingLeads.length
            })
          }

          // Follow-up required
          const threeDaysAgo = new Date()
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
          const needsFollowUp = leads.filter((cl: any) => 
            cl.status === 'contacted' && 
            cl.last_contacted_at && 
            new Date(cl.last_contacted_at) < threeDaysAgo
          )
          
          if (needsFollowUp.length > 0) {
            items.push({
              id: `outreach-followup-${campaign.id}`,
              type: 'urgent',
              priority: 'high',
              title: `${needsFollowUp.length} leads need follow-up`,
              description: `These leads haven't been contacted in 3+ days`,
              action: 'Send Follow-up',
              href: '/outreach-tool',
              count: needsFollowUp.length
            })
          }

          // Responded leads needing attention
          const respondedLeads = leads.filter((cl: any) => cl.status === 'responded')
          if (respondedLeads.length > 0) {
            items.push({
              id: `outreach-responded-${campaign.id}`,
              type: 'opportunity',
              priority: 'high',
              title: `${respondedLeads.length} leads responded`,
              description: `Hot leads are waiting for your response`,
              action: 'Respond Now',
              href: '/outreach-tool',
              count: respondedLeads.length
            })
          }
        }
      }

      // 2. Lead Generation Status
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
          items.push({
            id: 'lead-generation-available',
            type: 'opportunity',
            priority: 'medium',
            title: `${remaining} lead generation credits available`,
            description: `Generate new leads this week (resets Mondays)`,
            action: 'Generate Leads',
            href: '/lead-generator',
            count: remaining
          })
        } else {
          const now = new Date()
          const daysUntilMonday = (8 - now.getDay()) % 7 || 7
          const nextMonday = new Date(now)
          nextMonday.setDate(now.getDate() + daysUntilMonday)
          
          items.push({
            id: 'lead-generation-exhausted',
            type: 'insight',
            priority: 'low',
            title: 'Weekly lead generation limit reached',
            description: `Resets ${formatDistanceToNow(nextMonday, { addSuffix: true })}`,
            action: 'View Usage',
            href: '/lead-generator',
            dueDate: nextMonday
          })
        }
      }

      // 3. Brand Report Status
      const { data: brands } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', user.id)

      if (brands) {
        for (const brand of brands) {
          // Check if daily report is available
          const { data: todayReports } = await supabase
            .from('brand_reports')
            .select('*')
            .eq('brand_id', brand.id)
            .eq('report_date', format(new Date(), 'yyyy-MM-dd'))
            .eq('report_type', 'today')

          if (!todayReports?.length) {
            const now = new Date()
            const isAfter6AM = now.getHours() >= 6
            
            if (isAfter6AM) {
              items.push({
                id: `brand-report-${brand.id}`,
                type: 'task',
                priority: 'medium',
                title: `Daily report available for ${brand.brand_name}`,
                description: 'Generate today\'s performance report',
                action: 'Generate Report',
                href: '/brand-report',
                brandId: brand.id,
                brandName: brand.brand_name
              })
            }
          }

          // Check if monthly report is due (first day of month)
          const now = new Date()
          const isFirstOfMonth = now.getDate() === 1
          if (isFirstOfMonth) {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const { data: monthlyReports } = await supabase
              .from('brand_reports')
              .select('*')
              .eq('brand_id', brand.id)
              .eq('report_date', format(lastMonth, 'yyyy-MM-dd'))
              .eq('report_type', 'last-month')

            if (!monthlyReports?.length) {
              items.push({
                id: `brand-monthly-report-${brand.id}`,
                type: 'task',
                priority: 'high',
                title: `Monthly report due for ${brand.brand_name}`,
                description: 'Generate last month\'s performance report',
                action: 'Generate Monthly Report',
                href: '/brand-report',
                brandId: brand.id,
                brandName: brand.brand_name
              })
            }
          }
        }
      }

      // 4. AI Campaign Recommendations
      const { data: recommendations } = await supabase
        .from('ai_campaign_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (recommendations?.length) {
        items.push({
          id: 'ai-recommendations',
          type: 'recommendation',
          priority: 'medium',
          title: `${recommendations.length} AI recommendations ready`,
          description: 'Review and implement campaign optimizations',
          action: 'View Recommendations',
          href: '/marketing-assistant',
          count: recommendations.length
        })
      }

      setActionItems(items)
    } catch (error) {
      console.error('Error loading action items:', error)
    }
  }, [user?.id])

  // Load brand statuses with performance metrics
  const loadBrandStatuses = useCallback(async () => {
    if (!user?.id) return

    try {
      const supabase = await getSupabaseClient()
      const statuses: BrandStatus[] = []

      const { data: brands } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', user.id)

      if (brands) {
        for (const brand of brands) {
          // Get recent Meta campaign performance
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

          // Get Shopify orders for sales data
          const { data: shopifyOrders } = await supabase
            .from('shopify_orders')
            .select('*')
            .eq('brand_id', brand.id)
            .gte('created_at', lastWeek.toISOString())

          // Calculate metrics
          const recentMetaData = metaData?.slice(0, 2) || []
          const olderMetaData = metaData?.slice(2, 4) || []

          let roas = 0, roasChange = 0, cpm = 0, cpmChange = 0
          
          if (recentMetaData.length > 0) {
            const recentSpend = recentMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.spend) || 0), 0)
            const recentRevenue = recentMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.purchase_value) || 0), 0)
            const recentImpressions = recentMetaData.reduce((sum: number, d: any) => sum + (parseInt(d.impressions) || 0), 0)
            
            roas = recentSpend > 0 ? recentRevenue / recentSpend : 0
            cpm = recentImpressions > 0 ? (recentSpend / recentImpressions) * 1000 : 0

            if (olderMetaData.length > 0) {
              const olderSpend = olderMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.spend) || 0), 0)
              const olderRevenue = olderMetaData.reduce((sum: number, d: any) => sum + (parseFloat(d.purchase_value) || 0), 0)
              const olderImpressions = olderMetaData.reduce((sum: number, d: any) => sum + (parseInt(d.impressions) || 0), 0)
              
              const oldRoas = olderSpend > 0 ? olderRevenue / olderSpend : 0
              const oldCpm = olderImpressions > 0 ? (olderSpend / olderImpressions) * 1000 : 0
              
              roasChange = oldRoas > 0 ? ((roas - oldRoas) / oldRoas) * 100 : 0
              cpmChange = oldCpm > 0 ? ((cpm - oldCpm) / oldCpm) * 100 : 0
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

          // Determine status based on metrics
          const issues: string[] = []
          const opportunities: string[] = []
          let status: 'critical' | 'warning' | 'healthy' | 'excellent' = 'healthy'

          if (roas < 1) {
            issues.push('ROAS below breakeven')
            status = 'critical'
          } else if (roas < 2) {
            issues.push('Low ROAS performance')
            status = status === 'critical' ? 'critical' : 'warning'
          }

          if (roasChange < -20) {
            issues.push('ROAS declining significantly')
            status = 'critical'
          } else if (roasChange < -10) {
            issues.push('ROAS trending down')
            status = status === 'critical' ? 'critical' : 'warning'
          }

          if (cpmChange > 20) {
            issues.push('CPM costs increasing')
            status = status === 'critical' ? 'critical' : 'warning'
          }

          if (salesChange < -30) {
            issues.push('Sales down significantly')
            status = 'critical'
          } else if (salesChange < -15) {
            issues.push('Sales declining')
            status = status === 'critical' ? 'critical' : 'warning'
          }

          // Identify opportunities
          if (roasChange > 20) {
            opportunities.push('ROAS improving - scale campaigns')
          }
          if (cpmChange < -15) {
            opportunities.push('CPM decreasing - increase budgets')
          }
          if (salesChange > 25) {
            opportunities.push('Sales trending up - expand reach')
          }

          // Check if we should upgrade status to excellent
          if (roas > 4 && roasChange > 10 && salesChange > 20 && issues.length === 0) {
            status = 'excellent'
          }

          statuses.push({
            brandId: brand.id,
            brandName: brand.brand_name,
            status,
            metrics: {
              roas,
              roasChange,
              cpm,
              cpmChange,
              sales: recentSales,
              salesChange,
              newInsights: Math.floor(Math.random() * 3) // Placeholder for now
            },
            lastUpdated: new Date(),
            issues,
            opportunities
          })
        }
      }

      setBrandStatuses(statuses)
    } catch (error) {
      console.error('Error loading brand statuses:', error)
    }
  }, [user?.id])

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([loadActionItems(), loadBrandStatuses()])
      setIsLoading(false)
    }

    if (user?.id) {
      loadData()
    }
  }, [user?.id, loadActionItems, loadBrandStatuses, refreshKey])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-400 bg-red-900/20'
      case 'warning': return 'text-yellow-400 bg-yellow-900/20'
      case 'excellent': return 'text-green-400 bg-green-900/20'
      default: return 'text-blue-400 bg-blue-900/20'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-900/10'
      case 'medium': return 'border-yellow-500 bg-yellow-900/10'
      default: return 'border-blue-500 bg-blue-900/10'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <AlertTriangle className="h-4 w-4" />
      case 'opportunity': return <Star className="h-4 w-4" />
      case 'task': return <CheckCircle className="h-4 w-4" />
      case 'recommendation': return <Sparkles className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const urgentItems = actionItems.filter(item => item.priority === 'high')
  const totalActionItems = actionItems.length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-[#1A1A1A] rounded-lg w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-32 bg-[#1A1A1A] rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Action Center</h1>
            <p className="text-gray-400">
              {totalActionItems > 0 
                ? `${totalActionItems} items need your attention${urgentItems.length > 0 ? `, ${urgentItems.length} urgent` : ''}`
                : 'All caught up! No action items at this time.'
              }
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="bg-[#1A1A1A] border-[#333] text-white hover:bg-[#2A2A2A]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Action Items Grid */}
        {actionItems.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-white" />
              <h2 className="text-xl font-semibold text-white">Action Items</h2>
              <Badge variant="secondary" className="bg-[#2A2A2A] text-white">
                {totalActionItems}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {actionItems
                .sort((a, b) => {
                  const priorityOrder = { high: 3, medium: 2, low: 1 }
                  return priorityOrder[b.priority] - priorityOrder[a.priority]
                })
                .map((item) => (
                  <Card 
                    key={item.id} 
                    className={cn(
                      "bg-[#1A1A1A] border-l-4 hover:bg-[#2A2A2A] transition-colors cursor-pointer",
                      getPriorityColor(item.priority)
                    )}
                    onClick={() => item.href && router.push(item.href)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <Badge variant="outline" className="text-xs">
                            {item.priority}
                          </Badge>
                        </div>
                        {item.count && (
                          <Badge className="bg-[#333] text-white">
                            {item.count}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-white text-base leading-tight">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-gray-400 text-sm mb-3">
                        {item.description}
                      </CardDescription>
                      <div className="flex items-center justify-between">
                        <Button 
                          size="sm" 
                          className="bg-white text-black hover:bg-gray-200"
                        >
                          {item.action}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                        {item.dueDate && (
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(item.dueDate, { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Brand Status Overview */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-white" />
            <h2 className="text-xl font-semibold text-white">Brand Performance Overview</h2>
            <Badge variant="secondary" className="bg-[#2A2A2A] text-white">
              {brandStatuses.length}
            </Badge>
          </div>

          {brandStatuses.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {brandStatuses.map((brand) => (
                <Card key={brand.brandId} className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">{brand.brandName}</CardTitle>
                      <Badge className={cn("text-xs", getStatusColor(brand.status))}>
                        {brand.status.toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription className="text-gray-400">
                      Last updated {formatDistanceToNow(brand.lastUpdated, { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {brand.metrics.roas !== undefined && (
                        <div className="bg-[#2A2A2A] p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-400">ROAS</span>
                            <span className={cn(
                              "text-xs flex items-center gap-1",
                              brand.metrics.roasChange! > 0 ? "text-green-400" : "text-red-400"
                            )}>
                              {brand.metrics.roasChange! > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {Math.abs(brand.metrics.roasChange!).toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-lg font-semibold text-white">
                            {brand.metrics.roas.toFixed(2)}x
                          </div>
                        </div>
                      )}

                      {brand.metrics.cpm !== undefined && (
                        <div className="bg-[#2A2A2A] p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-400">CPM</span>
                            <span className={cn(
                              "text-xs flex items-center gap-1",
                              brand.metrics.cpmChange! < 0 ? "text-green-400" : "text-red-400"
                            )}>
                              {brand.metrics.cpmChange! < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                              {Math.abs(brand.metrics.cpmChange!).toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-lg font-semibold text-white">
                            ${brand.metrics.cpm.toFixed(2)}
                          </div>
                        </div>
                      )}

                      {brand.metrics.sales !== undefined && (
                        <div className="bg-[#2A2A2A] p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-400">Sales</span>
                            <span className={cn(
                              "text-xs flex items-center gap-1",
                              brand.metrics.salesChange! > 0 ? "text-green-400" : "text-red-400"
                            )}>
                              {brand.metrics.salesChange! > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {Math.abs(brand.metrics.salesChange!).toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-lg font-semibold text-white">
                            ${brand.metrics.sales.toFixed(0)}
                          </div>
                        </div>
                      )}

                      {brand.metrics.newInsights && brand.metrics.newInsights > 0 && (
                        <div className="bg-[#2A2A2A] p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-400">New Insights</span>
                          </div>
                          <div className="text-lg font-semibold text-blue-400">
                            {brand.metrics.newInsights}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Issues */}
                    {brand.issues.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-red-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Issues Detected
                        </h4>
                        {brand.issues.map((issue, idx) => (
                          <div key={idx} className="text-xs text-gray-300 bg-red-900/20 p-2 rounded">
                            {issue}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Opportunities */}
                    {brand.opportunities.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-green-400 flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Opportunities
                        </h4>
                        {brand.opportunities.map((opportunity, idx) => (
                          <div key={idx} className="text-xs text-gray-300 bg-green-900/20 p-2 rounded">
                            {opportunity}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-[#2A2A2A] border-[#444] text-white hover:bg-[#333]"
                        onClick={() => router.push(`/dashboard?brand=${brand.brandId}`)}
                      >
                        View Dashboard
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-[#2A2A2A] border-[#444] text-white hover:bg-[#333]"
                        onClick={() => router.push(`/brand-report?brand=${brand.brandId}`)}
                      >
                        Generate Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardContent className="py-8 text-center">
                <div className="text-gray-400 mb-4">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  No brand data available
                </div>
                <p className="text-gray-500 text-sm">
                  Connect your advertising platforms to see brand performance insights
                </p>
                <Button 
                  className="mt-4" 
                  variant="outline"
                  onClick={() => router.push('/settings')}
                >
                  Connect Platforms
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-white" />
            <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-24 bg-[#1A1A1A] border-[#333] text-white hover:bg-[#2A2A2A] flex flex-col gap-2"
              onClick={() => router.push('/lead-generator')}
            >
              <Users className="h-6 w-6" />
              <span className="text-sm">Generate Leads</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-24 bg-[#1A1A1A] border-[#333] text-white hover:bg-[#2A2A2A] flex flex-col gap-2"
              onClick={() => router.push('/outreach-tool')}
            >
              <Send className="h-6 w-6" />
              <span className="text-sm">Start Outreach</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-24 bg-[#1A1A1A] border-[#333] text-white hover:bg-[#2A2A2A] flex flex-col gap-2"
              onClick={() => router.push('/brand-report')}
            >
              <FileBarChart className="h-6 w-6" />
              <span className="text-sm">Brand Report</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-24 bg-[#1A1A1A] border-[#333] text-white hover:bg-[#2A2A2A] flex flex-col gap-2"
              onClick={() => router.push('/marketing-assistant')}
            >
              <Sparkles className="h-6 w-6" />
              <span className="text-sm">AI Assistant</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 