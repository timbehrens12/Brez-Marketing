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
  Palette,
  Play,
  Eye,
  Timer,
  Flame,
  AlertCircle,
  TrendingUp as TrendUp,
  Brain,
  Megaphone
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
          let isCritical = false
          let isWarning = false

          if (roas < 1) {
            issues.push('ROAS below breakeven')
            isCritical = true
          } else if (roas < 2) {
            issues.push('Low ROAS performance')
            isWarning = true
          }

          if (roasChange < -20) {
            issues.push('ROAS declining significantly')
            isCritical = true
          } else if (roasChange < -10) {
            issues.push('ROAS trending down')
            isWarning = true
          }

          if (cpmChange > 20) {
            issues.push('CPM costs increasing')
            isWarning = true
          }

          if (salesChange < -30) {
            issues.push('Sales down significantly')
            isCritical = true
          } else if (salesChange < -15) {
            issues.push('Sales declining')
            isWarning = true
          }

          // Determine final status
          let status: 'critical' | 'warning' | 'healthy' | 'excellent' = 'healthy'
          if (isCritical) {
            status = 'critical'
          } else if (isWarning) {
            status = 'warning'
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

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'critical': 
        return 'bg-gradient-to-br from-red-900/40 via-red-800/30 to-red-900/20 border-red-500/30'
      case 'warning': 
        return 'bg-gradient-to-br from-amber-900/40 via-amber-800/30 to-orange-900/20 border-amber-500/30'
      case 'excellent': 
        return 'bg-gradient-to-br from-emerald-900/40 via-green-800/30 to-emerald-900/20 border-emerald-500/30'
      default: 
        return 'bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-blue-900/20 border-blue-500/30'
    }
  }

  const getPriorityGradient = (priority: string) => {
    switch (priority) {
      case 'high': 
        return 'bg-gradient-to-br from-red-900/20 via-red-800/10 to-red-900/5 border-l-red-500'
      case 'medium': 
        return 'bg-gradient-to-br from-amber-900/20 via-amber-800/10 to-amber-900/5 border-l-amber-500'
      default: 
        return 'bg-gradient-to-br from-blue-900/20 via-blue-800/10 to-blue-900/5 border-l-blue-500'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <Flame className="h-5 w-5 text-red-400" />
      case 'opportunity': return <Star className="h-5 w-5 text-amber-400" />
      case 'task': return <CheckCircle className="h-5 w-5 text-blue-400" />
      case 'recommendation': return <Brain className="h-5 w-5 text-purple-400" />
      default: return <Bell className="h-5 w-5 text-gray-400" />
    }
  }

  const urgentItems = actionItems.filter(item => item.priority === 'high')
  const totalActionItems = actionItems.length
  const criticalBrands = brandStatuses.filter(b => b.status === 'critical').length
  const warningBrands = brandStatuses.filter(b => b.status === 'warning').length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#0A0A0A] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gradient-to-r from-[#2A2A2A] to-[#1A1A1A] rounded-xl w-96"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-48 bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-pink-900/30 border border-indigo-500/20 p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/30">
                  <Activity className="h-8 w-8 text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                    Action Center
                  </h1>
                  <p className="text-gray-400 text-lg">
                    {totalActionItems > 0 
                      ? `${totalActionItems} items need attention${urgentItems.length > 0 ? ` • ${urgentItems.length} urgent` : ''}`
                      : 'All systems operational'
                    }
                  </p>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="flex items-center gap-6">
                {criticalBrands > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/30 border border-red-500/30">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-red-300 text-sm font-medium">{criticalBrands} Critical</span>
                  </div>
                )}
                {warningBrands > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-900/30 border border-amber-500/30">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <span className="text-amber-300 text-sm font-medium">{warningBrands} Warning</span>
                  </div>
                )}
                {brandStatuses.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900/30 border border-blue-500/30">
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                    <span className="text-blue-300 text-sm font-medium">{brandStatuses.length} Brands</span>
                  </div>
                )}
              </div>
            </div>
            
            <Button
              onClick={handleRefresh}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 border-0 text-white shadow-lg shadow-indigo-500/25 transition-all duration-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/30">
                <Timer className="h-5 w-5 text-amber-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white">Priority Actions</h2>
              <Badge className="bg-gradient-to-r from-amber-600 to-orange-600 text-white border-0">
                {totalActionItems}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {actionItems
                .sort((a, b) => {
                  const priorityOrder = { high: 3, medium: 2, low: 1 }
                  return priorityOrder[b.priority] - priorityOrder[a.priority]
                })
                .map((item) => (
                  <Card 
                    key={item.id} 
                    className={cn(
                      "relative overflow-hidden border-l-4 hover:scale-[1.02] transition-all duration-300 cursor-pointer group",
                      getPriorityGradient(item.priority),
                      "backdrop-blur-sm"
                    )}
                    onClick={() => item.href && router.push(item.href)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <CardHeader className="pb-3 relative">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(item.type)}
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs border-0",
                              item.priority === 'high' && "bg-red-500/20 text-red-300",
                              item.priority === 'medium' && "bg-amber-500/20 text-amber-300",
                              item.priority === 'low' && "bg-blue-500/20 text-blue-300"
                            )}
                          >
                            {item.priority}
                          </Badge>
                        </div>
                        {item.count && (
                          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-gray-700 to-gray-800 border border-gray-600">
                            <span className="text-white font-semibold text-sm">{item.count}</span>
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-white text-lg leading-tight group-hover:text-gray-100 transition-colors">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="pt-0 relative">
                      <CardDescription className="text-gray-400 text-sm mb-4 leading-relaxed">
                        {item.description}
                      </CardDescription>
                      
                      <div className="flex items-center justify-between">
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-white to-gray-100 text-black hover:from-gray-100 hover:to-gray-200 border-0 shadow-lg transition-all duration-300"
                        >
                          {item.action}
                          <ArrowRight className="h-3 w-3 ml-2" />
                        </Button>
                        {item.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(item.dueDate, { addSuffix: true })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Brand Performance Grid */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-400/30">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white">Brand Performance</h2>
            <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
              {brandStatuses.length}
            </Badge>
          </div>

          {brandStatuses.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {brandStatuses.map((brand) => (
                <Card key={brand.brandId} className={cn(
                  "relative overflow-hidden border backdrop-blur-sm hover:scale-[1.01] transition-all duration-300",
                  getStatusGradient(brand.status)
                )}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl"></div>
                  
                  <CardHeader className="relative">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-xl">{brand.brandName}</CardTitle>
                      <Badge className={cn(
                        "text-xs font-semibold border-0",
                        brand.status === 'critical' && "bg-red-500 text-white",
                        brand.status === 'warning' && "bg-amber-500 text-black",
                        brand.status === 'excellent' && "bg-emerald-500 text-white",
                        brand.status === 'healthy' && "bg-blue-500 text-white"
                      )}>
                        {brand.status.toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription className="text-gray-400">
                      Last updated {formatDistanceToNow(brand.lastUpdated, { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6 relative">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      {brand.metrics.roas !== undefined && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/50 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400 font-medium">ROAS</span>
                            <div className={cn(
                              "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                              brand.metrics.roasChange! > 0 
                                ? "bg-emerald-500/20 text-emerald-400" 
                                : "bg-red-500/20 text-red-400"
                            )}>
                              {brand.metrics.roasChange! > 0 ? <TrendUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {Math.abs(brand.metrics.roasChange!).toFixed(1)}%
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-white">
                            {brand.metrics.roas.toFixed(2)}x
                          </div>
                        </div>
                      )}

                      {brand.metrics.cpm !== undefined && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/50 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400 font-medium">CPM</span>
                            <div className={cn(
                              "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                              brand.metrics.cpmChange! < 0 
                                ? "bg-emerald-500/20 text-emerald-400" 
                                : "bg-red-500/20 text-red-400"
                            )}>
                              {brand.metrics.cpmChange! < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendUp className="h-3 w-3" />}
                              {Math.abs(brand.metrics.cpmChange!).toFixed(1)}%
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-white">
                            ${brand.metrics.cpm.toFixed(2)}
                          </div>
                        </div>
                      )}

                      {brand.metrics.sales !== undefined && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/50 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400 font-medium">Sales</span>
                            <div className={cn(
                              "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                              brand.metrics.salesChange! > 0 
                                ? "bg-emerald-500/20 text-emerald-400" 
                                : "bg-red-500/20 text-red-400"
                            )}>
                              {brand.metrics.salesChange! > 0 ? <TrendUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {Math.abs(brand.metrics.salesChange!).toFixed(1)}%
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-white">
                            ${brand.metrics.sales.toFixed(0)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Issues & Opportunities */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {brand.issues.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-red-300 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Issues ({brand.issues.length})
                          </h4>
                          <div className="space-y-2">
                            {brand.issues.slice(0, 2).map((issue, idx) => (
                              <div key={idx} className="text-xs text-gray-300 bg-red-900/30 p-3 rounded-lg border border-red-800/30">
                                {issue}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {brand.opportunities.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Opportunities ({brand.opportunities.length})
                          </h4>
                          <div className="space-y-2">
                            {brand.opportunities.slice(0, 2).map((opportunity, idx) => (
                              <div key={idx} className="text-xs text-gray-300 bg-emerald-900/30 p-3 rounded-lg border border-emerald-800/30">
                                {opportunity}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Button 
                        size="sm" 
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard?brand=${brand.brandId}`)
                        }}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 bg-gradient-to-r from-gray-800/50 to-gray-900/30 border-gray-600/50 text-white hover:bg-gray-700/50"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/brand-report?brand=${brand.brandId}`)
                        }}
                      >
                        <FileBarChart className="h-4 w-4 mr-2" />
                        Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <div className="space-y-4">
                  <div className="p-4 rounded-full bg-gradient-to-br from-gray-700/50 to-gray-800/30 w-20 h-20 mx-auto flex items-center justify-center">
                    <BarChart3 className="h-10 w-10 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">No brands connected</h3>
                    <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                      Connect your advertising platforms to see comprehensive brand performance insights and get actionable recommendations.
                    </p>
                    <Button 
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-lg"
                      onClick={() => router.push('/settings')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect Platforms
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
              <Zap className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Generate Leads', href: '/lead-generator', gradient: 'from-emerald-600 to-teal-600' },
              { icon: Send, label: 'Start Outreach', href: '/outreach-tool', gradient: 'from-blue-600 to-indigo-600' },
              { icon: FileBarChart, label: 'Brand Report', href: '/brand-report', gradient: 'from-amber-600 to-orange-600' },
              { icon: Brain, label: 'AI Assistant', href: '/marketing-assistant', gradient: 'from-purple-600 to-pink-600' }
            ].map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                className={cn(
                  "h-24 bg-gradient-to-br border-0 text-white hover:scale-105 transition-all duration-300 shadow-lg",
                  `from-gray-900/50 to-gray-800/30 hover:bg-gradient-to-r hover:${action.gradient}`,
                  "flex flex-col gap-3 backdrop-blur-sm"
                )}
                onClick={() => router.push(action.href)}
              >
                <action.icon className="h-6 w-6" />
                <span className="text-sm font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 