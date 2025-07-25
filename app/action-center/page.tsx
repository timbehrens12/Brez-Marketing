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
  Users, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle,
  RefreshCw,
  Activity,
  BarChart3,
  Send,
  FileBarChart,
  Brain,
  Plus,
  ExternalLink,
  DollarSign,
  ShoppingCart,
  Target,
  Zap,
  Timer,
  Flame
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format, subDays, subHours } from 'date-fns'
import { cn } from '@/lib/utils'

interface OutreachTask {
  id: string
  type: 'pending' | 'followup' | 'responded' | 'qualified'
  title: string
  description: string
  count: number
  campaignName: string
  href: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  lastUpdated: Date
}

interface BrandAlert {
  id: string
  brandId: string
  brandName: string
  type: 'critical' | 'warning' | 'opportunity'
  title: string
  description: string
  metrics: {
    current: number
    previous: number
    change: number
    unit: string
  }
  action: string
  href: string
}

interface PerformanceMetric {
  name: string
  current: number
  previous: number
  change: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  status: 'good' | 'warning' | 'critical'
}

export default function ActionCenterPage() {
  const { user } = useUser()
  const { selectedBrandId, brands } = useBrandContext()
  const router = useRouter()
  
  const [outreachTasks, setOutreachTasks] = useState<OutreachTask[]>([])
  const [brandAlerts, setBrandAlerts] = useState<BrandAlert[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Load real data from databases
  const loadData = useCallback(async () => {
    if (!user?.id) return

    try {
      const supabase = await getSupabaseClient()

      // 1. Load Real Outreach Tasks
      const { data: campaigns } = await supabase
        .from('outreach_campaigns')
        .select(`
          *,
          outreach_campaign_leads(
            id,
            status,
            last_contacted_at,
            leads(business_name)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')

      const tasks: OutreachTask[] = []
      
      if (campaigns && campaigns.length > 0) {
        for (const campaign of campaigns) {
          const leads = campaign.outreach_campaign_leads || []
          
          // Pending leads (never contacted)
          const pendingLeads = leads.filter((cl: any) => cl.status === 'pending')
          if (pendingLeads.length > 0) {
            tasks.push({
              id: `pending-${campaign.id}`,
              type: 'pending',
              title: `${pendingLeads.length} leads awaiting first contact`,
              description: `Start outreach in "${campaign.name}" campaign`,
              count: pendingLeads.length,
              campaignName: campaign.name,
              href: '/outreach-tool',
              urgency: pendingLeads.length > 10 ? 'high' : pendingLeads.length > 5 ? 'medium' : 'low',
              lastUpdated: new Date(campaign.updated_at)
            })
          }

          // Follow-up needed (contacted but no recent activity)
          const threeDaysAgo = subDays(new Date(), 3)
          const needsFollowUp = leads.filter((cl: any) => 
            cl.status === 'contacted' && 
            cl.last_contacted_at && 
            new Date(cl.last_contacted_at) < threeDaysAgo
          )
          
          if (needsFollowUp.length > 0) {
            tasks.push({
              id: `followup-${campaign.id}`,
              type: 'followup',
              title: `${needsFollowUp.length} leads need follow-up`,
              description: `No contact in 3+ days - "${campaign.name}"`,
              count: needsFollowUp.length,
              campaignName: campaign.name,
              href: '/outreach-tool',
              urgency: 'medium',
              lastUpdated: new Date(Math.max(...needsFollowUp.map((l: any) => new Date(l.last_contacted_at).getTime())))
            })
          }

          // Hot responses (leads that responded)
          const respondedLeads = leads.filter((cl: any) => cl.status === 'responded')
          if (respondedLeads.length > 0) {
            tasks.push({
              id: `responded-${campaign.id}`,
              type: 'responded',
              title: `${respondedLeads.length} leads responded!`,
              description: `Hot leads waiting for your reply - "${campaign.name}"`,
              count: respondedLeads.length,
              campaignName: campaign.name,
              href: '/outreach-tool',
              urgency: 'critical',
              lastUpdated: new Date()
            })
          }

          // Qualified leads (ready for proposals/contracts)
          const qualifiedLeads = leads.filter((cl: any) => cl.status === 'qualified')
          if (qualifiedLeads.length > 0) {
            tasks.push({
              id: `qualified-${campaign.id}`,
              type: 'qualified',
              title: `${qualifiedLeads.length} qualified leads ready`,
              description: `Send proposals/contracts - "${campaign.name}"`,
              count: qualifiedLeads.length,
              campaignName: campaign.name,
              href: '/outreach-tool',
              urgency: 'high',
              lastUpdated: new Date()
            })
          }
        }
      }

      setOutreachTasks(tasks)

      // 2. Load Brand Performance Alerts
      const alerts: BrandAlert[] = []
      const metrics: PerformanceMetric[] = []

      if (selectedBrandId) {
        const today = new Date()
        const yesterday = subDays(today, 1)
        const weekAgo = subDays(today, 7)

        // Get recent performance data
        const [shopifyResponse, metaResponse] = await Promise.all([
          fetch(`/api/metrics?brandId=${selectedBrandId}&from=${format(weekAgo, 'yyyy-MM-dd')}&to=${format(today, 'yyyy-MM-dd')}`),
          fetch(`/api/metrics/meta?brandId=${selectedBrandId}&from=${format(weekAgo, 'yyyy-MM-dd')}&to=${format(today, 'yyyy-MM-dd')}`)
        ])

        if (shopifyResponse.ok && metaResponse.ok) {
          const shopifyData = await shopifyResponse.json()
          const metaData = await metaResponse.json()

          // Calculate current vs previous periods
          const currentRevenue = shopifyData.total_revenue || 0
          const currentOrders = shopifyData.total_orders || 0
          const currentSpend = metaData.total_spend || 0
          const currentRoas = currentSpend > 0 ? currentRevenue / currentSpend : 0

          // Get previous week data for comparison
          const twoWeeksAgo = subDays(today, 14)
          const [prevShopifyResponse, prevMetaResponse] = await Promise.all([
            fetch(`/api/metrics?brandId=${selectedBrandId}&from=${format(twoWeeksAgo, 'yyyy-MM-dd')}&to=${format(weekAgo, 'yyyy-MM-dd')}`),
            fetch(`/api/metrics/meta?brandId=${selectedBrandId}&from=${format(twoWeeksAgo, 'yyyy-MM-dd')}&to=${format(weekAgo, 'yyyy-MM-dd')}`)
          ])

          if (prevShopifyResponse.ok && prevMetaResponse.ok) {
            const prevShopifyData = await prevShopifyResponse.json()
            const prevMetaData = await prevMetaResponse.json()

            const prevRevenue = prevShopifyData.total_revenue || 0
            const prevOrders = prevShopifyData.total_orders || 0
            const prevSpend = prevMetaData.total_spend || 0
            const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0

            // Calculate changes
            const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0
            const ordersChange = prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders) * 100 : 0
            const roasChange = prevRoas > 0 ? ((currentRoas - prevRoas) / prevRoas) * 100 : 0

            const brandName = brands.find(b => b.id === selectedBrandId)?.name || 'Brand'

            // Create performance metrics
            metrics.push(
              {
                name: 'Revenue',
                current: currentRevenue,
                previous: prevRevenue,
                change: revenueChange,
                unit: '$',
                trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'stable',
                status: revenueChange < -20 ? 'critical' : revenueChange < -10 ? 'warning' : 'good'
              },
              {
                name: 'Orders',
                current: currentOrders,
                previous: prevOrders,
                change: ordersChange,
                unit: '',
                trend: ordersChange > 0 ? 'up' : ordersChange < 0 ? 'down' : 'stable',
                status: ordersChange < -25 ? 'critical' : ordersChange < -15 ? 'warning' : 'good'
              },
              {
                name: 'ROAS',
                current: currentRoas,
                previous: prevRoas,
                change: roasChange,
                unit: 'x',
                trend: roasChange > 0 ? 'up' : roasChange < 0 ? 'down' : 'stable',
                status: currentRoas < 1 ? 'critical' : currentRoas < 2 ? 'warning' : 'good'
              }
            )

            // Generate alerts based on performance
            if (revenueChange < -20 || currentRoas < 1) {
              alerts.push({
                id: `revenue-alert-${selectedBrandId}`,
                brandId: selectedBrandId,
                brandName,
                type: 'critical',
                title: revenueChange < -20 ? 'Revenue Down 20%+' : 'ROAS Below Breakeven',
                description: revenueChange < -20 ? 
                  `Revenue dropped ${Math.abs(revenueChange).toFixed(1)}% vs last week` :
                  `Current ROAS: ${currentRoas.toFixed(2)}x - losing money on ads`,
                metrics: {
                  current: revenueChange < -20 ? currentRevenue : currentRoas,
                  previous: revenueChange < -20 ? prevRevenue : prevRoas,
                  change: revenueChange < -20 ? revenueChange : roasChange,
                  unit: revenueChange < -20 ? '$' : 'x'
                },
                action: 'Review campaigns immediately',
                href: '/marketing-assistant'
              })
            } else if (revenueChange < -10 || currentRoas < 2) {
              alerts.push({
                id: `performance-warning-${selectedBrandId}`,
                brandId: selectedBrandId,
                brandName,
                type: 'warning',
                title: revenueChange < -10 ? 'Revenue Declining' : 'Low ROAS',
                description: revenueChange < -10 ? 
                  `Revenue down ${Math.abs(revenueChange).toFixed(1)}% vs last week` :
                  `ROAS at ${currentRoas.toFixed(2)}x - room for improvement`,
                metrics: {
                  current: revenueChange < -10 ? currentRevenue : currentRoas,
                  previous: revenueChange < -10 ? prevRevenue : prevRoas,
                  change: revenueChange < -10 ? revenueChange : roasChange,
                  unit: revenueChange < -10 ? '$' : 'x'
                },
                action: 'Optimize campaigns',
                href: '/marketing-assistant'
              })
            } else if (revenueChange > 20 || currentRoas > 4) {
              alerts.push({
                id: `opportunity-${selectedBrandId}`,
                brandId: selectedBrandId,
                brandName,
                type: 'opportunity',
                title: 'Strong Performance',
                description: revenueChange > 20 ? 
                  `Revenue up ${revenueChange.toFixed(1)}% - consider scaling` :
                  `ROAS at ${currentRoas.toFixed(2)}x - increase ad spend`,
                metrics: {
                  current: revenueChange > 20 ? currentRevenue : currentRoas,
                  previous: revenueChange > 20 ? prevRevenue : prevRoas,
                  change: revenueChange > 20 ? revenueChange : roasChange,
                  unit: revenueChange > 20 ? '$' : 'x'
                },
                action: 'Scale campaigns',
                href: '/marketing-assistant'
              })
            }
          }
        }
      }

      setBrandAlerts(alerts)
      setPerformanceMetrics(metrics)

    } catch (error) {
      console.error('Error loading action center data:', error)
    }
  }, [user?.id, selectedBrandId, brands])

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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'border-red-500 bg-red-950/50'
      case 'high': return 'border-orange-500 bg-orange-950/50'
      case 'medium': return 'border-yellow-500 bg-yellow-950/50'
      default: return 'border-blue-500 bg-blue-950/50'
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-500 bg-red-950/30'
      case 'warning': return 'border-orange-500 bg-orange-950/30'
      case 'opportunity': return 'border-green-500 bg-green-950/30'
      default: return 'border-gray-500 bg-gray-950/30'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-800 rounded-xl border border-gray-700"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-64 bg-gray-800 rounded-xl border border-gray-700"></div>
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
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Action Center</h1>
              <p className="text-gray-300">
                Your command center for outreach, alerts, and performance monitoring
              </p>
              {selectedBrandId ? (
                <div className="mt-3">
                  <Badge className="bg-blue-600 text-white">
                    {brands.find(b => b.id === selectedBrandId)?.name || 'Selected Brand'}
                  </Badge>
                </div>
              ) : (
                <div className="mt-3">
                  <Badge variant="outline" className="border-gray-500 text-gray-400">
                    No brand selected
                  </Badge>
                </div>
              )}
            </div>
            <Button
              onClick={handleRefresh}
              className="bg-white hover:bg-gray-100 text-black font-medium"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Outreach Tasks */}
          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <Send className="h-5 w-5" />
                  Outreach Queue ({outreachTasks.length})
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Active outreach tasks requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {outreachTasks.length > 0 ? (
                  outreachTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer hover:bg-gray-800/50 transition-all",
                        getUrgencyColor(task.urgency)
                      )}
                      onClick={() => router.push(task.href)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-gray-800 border border-gray-600">
                            {task.type === 'responded' ? (
                              <MessageSquare className="h-4 w-4 text-green-400" />
                            ) : task.type === 'qualified' ? (
                              <Target className="h-4 w-4 text-purple-400" />
                            ) : task.type === 'followup' ? (
                              <Clock className="h-4 w-4 text-orange-400" />
                            ) : (
                              <Send className="h-4 w-4 text-blue-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{task.title}</h4>
                            <p className="text-sm text-gray-300 mt-1">{task.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  task.urgency === 'critical' ? "border-red-500 text-red-400" :
                                  task.urgency === 'high' ? "border-orange-500 text-orange-400" :
                                  task.urgency === 'medium' ? "border-yellow-500 text-yellow-400" :
                                  "border-blue-500 text-blue-400"
                                )}
                              >
                                {task.urgency.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                Updated {formatDistanceToNow(task.lastUpdated, { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gray-700 text-white">
                            {task.count}
                          </Badge>
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No Active Outreach</h3>
                    <p className="text-gray-500 mb-4">
                      Create campaigns and add leads to start outreach
                    </p>
                    <Button
                      onClick={() => router.push('/lead-generator')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Leads
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Alerts & Metrics */}
          <div className="space-y-6">
            {/* Brand Alerts */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <AlertTriangle className="h-5 w-5" />
                  Performance Alerts ({brandAlerts.length})
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Critical brand performance issues and opportunities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {brandAlerts.length > 0 ? (
                  brandAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer hover:bg-gray-800/50 transition-all",
                        getAlertColor(alert.type)
                      )}
                      onClick={() => router.push(alert.href)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-gray-800 border border-gray-600">
                            {alert.type === 'critical' ? (
                              <AlertTriangle className="h-4 w-4 text-red-400" />
                            ) : alert.type === 'warning' ? (
                              <TrendingDown className="h-4 w-4 text-orange-400" />
                            ) : (
                              <TrendingUp className="h-4 w-4 text-green-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{alert.title}</h4>
                            <p className="text-sm text-gray-300 mt-1">{alert.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  alert.type === 'critical' ? "border-red-500 text-red-400" :
                                  alert.type === 'warning' ? "border-orange-500 text-orange-400" :
                                  "border-green-500 text-green-400"
                                )}
                              >
                                {alert.action}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {alert.brandName}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            {alert.metrics.unit === '$' ? '$' : ''}{alert.metrics.current.toFixed(alert.metrics.unit === '$' ? 0 : 2)}{alert.metrics.unit === 'x' ? 'x' : ''}
                          </div>
                          <div className={cn(
                            "text-sm font-medium",
                            alert.metrics.change > 0 ? "text-green-400" : "text-red-400"
                          )}>
                            {alert.metrics.change > 0 ? '+' : ''}{alert.metrics.change.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : selectedBrandId ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">All Good!</h3>
                    <p className="text-gray-500">
                      No performance alerts for your selected brand
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">Select a Brand</h3>
                    <p className="text-gray-500">
                      Choose a brand to monitor performance alerts
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Common tasks and tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => router.push('/lead-generator')}
                    variant="outline"
                    className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 h-20 flex-col gap-2"
                  >
                    <Users className="h-5 w-5" />
                    <span className="text-sm">Generate Leads</span>
                  </Button>
                  <Button
                    onClick={() => router.push('/brand-report')}
                    variant="outline"
                    className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 h-20 flex-col gap-2"
                  >
                    <FileBarChart className="h-5 w-5" />
                    <span className="text-sm">Brand Report</span>
                  </Button>
                  <Button
                    onClick={() => router.push('/marketing-assistant')}
                    variant="outline"
                    className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 h-20 flex-col gap-2"
                  >
                    <Brain className="h-5 w-5" />
                    <span className="text-sm">AI Assistant</span>
                  </Button>
                  <Button
                    onClick={() => router.push('/outreach-tool')}
                    variant="outline"
                    className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 h-20 flex-col gap-2"
                  >
                    <Send className="h-5 w-5" />
                    <span className="text-sm">Outreach Tool</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Performance Overview */}
        {performanceMetrics.length > 0 && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <BarChart3 className="h-5 w-5" />
                Performance Overview - Last 7 Days
              </CardTitle>
              <CardDescription className="text-gray-400">
                Key metrics vs previous period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {performanceMetrics.map((metric) => (
                  <div key={metric.name} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-300">{metric.name}</h4>
                      <div className={cn(
                        "p-1 rounded",
                        metric.status === 'critical' ? "bg-red-950 text-red-400" :
                        metric.status === 'warning' ? "bg-orange-950 text-orange-400" :
                        "bg-green-950 text-green-400"
                      )}>
                        {metric.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : metric.trend === 'down' ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <Activity className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                      {metric.unit === '$' ? '$' : ''}{metric.current.toFixed(metric.unit === '$' ? 0 : 2)}{metric.unit === 'x' ? 'x' : ''}
                    </div>
                    <div className={cn(
                      "text-sm font-medium",
                      metric.change > 0 ? "text-green-400" : metric.change < 0 ? "text-red-400" : "text-gray-400"
                    )}>
                      {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}% vs last week
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 