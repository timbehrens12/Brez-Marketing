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
  Search
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

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
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

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
              title: `Start outreach for ${pendingLeads.length} new leads`,
              description: `${pendingLeads.length} leads in "${campaign.name}" are ready for outreach`,
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
              title: `Follow up with ${needsFollowUp.length} leads`,
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
              title: `Respond to ${respondedLeads.length} hot leads`,
              description: `Leads are waiting for your response`,
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
            title: `Generate new leads (${remaining} credits available)`,
            description: `Use your remaining weekly credits to find new prospects`,
            action: 'Generate Leads',
            href: '/lead-generator',
            count: remaining
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
                title: `Generate daily report for ${brand.brand_name}`,
                description: 'Daily performance report is ready to generate',
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
                title: `Generate monthly report for ${brand.brand_name}`,
                description: 'Monthly performance report is due',
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
          title: `Review ${recommendations.length} AI recommendations`,
          description: 'New campaign optimization suggestions available',
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

  // Load brand statuses for alerts
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

          // Check for critical issues and add to action items
          const issues: string[] = []
          let isCritical = false

          if (roas < 1) {
            issues.push('ROAS below breakeven')
            isCritical = true
          }

          if (roasChange < -20) {
            issues.push('ROAS down 20%+')
            isCritical = true
          }

          if (salesChange < -30) {
            issues.push('Sales down 30%+')
            isCritical = true
          }

          // Add critical brand issues as action items
          if (isCritical) {
            setActionItems(prev => [...prev, {
              id: `brand-critical-${brand.id}`,
              type: 'urgent',
              priority: 'high',
              title: `${brand.brand_name} needs immediate attention`,
              description: issues.join(', '),
              action: 'View Dashboard',
              href: `/dashboard?brand=${brand.id}`,
              brandId: brand.id,
              brandName: brand.brand_name
            }])
          }

          statuses.push({
            brandId: brand.id,
            brandName: brand.brand_name,
            status: isCritical ? 'critical' : 'healthy',
            metrics: { roas, roasChange, cpm, cpmChange, sales: recentSales, salesChange },
            lastUpdated: new Date(),
            issues,
            opportunities: []
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <Flame className="h-4 w-4 text-red-500" />
      case 'opportunity': return <Star className="h-4 w-4 text-yellow-500" />
      case 'task': return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'recommendation': return <Brain className="h-4 w-4 text-purple-500" />
      default: return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800'
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      default: return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  // Filter items
  const filteredItems = actionItems.filter(item => {
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesPriority && matchesSearch
  })

  const urgentItems = filteredItems.filter(item => item.priority === 'high')
  const totalActionItems = filteredItems.length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-[#1A1A1A] rounded w-64"></div>
            <div className="h-12 bg-[#1A1A1A] rounded"></div>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-[#1A1A1A] rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Action Center</h1>
            <p className="text-gray-400 mt-1">
              {totalActionItems > 0 
                ? `${totalActionItems} tasks • ${urgentItems.length} urgent`
                : 'All caught up! No tasks at this time.'
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

        {/* Filters */}
        {totalActionItems > 0 && (
          <div className="flex items-center gap-4 p-4 bg-[#1A1A1A] rounded-lg border border-[#333]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Filter:</span>
              <select 
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-[#2A2A2A] border border-[#444] rounded px-3 py-1 text-white text-sm"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#2A2A2A] border-[#444] text-white placeholder-gray-500"
              />
            </div>
          </div>
        )}

        {/* Task List */}
        {totalActionItems > 0 ? (
          <div className="space-y-3">
            {filteredItems
              .sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 }
                return priorityOrder[b.priority] - priorityOrder[a.priority]
              })
              .map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#333] rounded-lg cursor-pointer transition-all duration-200"
                  onClick={() => item.href && router.push(item.href)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {getTypeIcon(item.type)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-white font-medium group-hover:text-gray-100 transition-colors">
                          {item.title}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getPriorityColor(item.priority))}
                        >
                          {item.priority}
                        </Badge>
                        {item.count && (
                          <Badge className="bg-[#333] text-white text-xs">
                            {item.count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {item.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(item.dueDate, { addSuffix: true })}
                      </div>
                    )}
                    
                    <Button size="sm" className="bg-white text-black hover:bg-gray-200">
                      {item.action}
                    </Button>
                    
                    <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-gray-400 transition-colors" />
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mb-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">All caught up!</h3>
              <p className="text-gray-400">No action items at this time.</p>
            </div>
            
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button 
                variant="outline"
                className="bg-[#1A1A1A] border-[#333] text-white hover:bg-[#2A2A2A]"
                onClick={() => router.push('/lead-generator')}
              >
                <Users className="h-4 w-4 mr-2" />
                Generate Leads
              </Button>
              <Button 
                variant="outline"
                className="bg-[#1A1A1A] border-[#333] text-white hover:bg-[#2A2A2A]"
                onClick={() => router.push('/outreach-tool')}
              >
                <Send className="h-4 w-4 mr-2" />
                Start Outreach
              </Button>
              <Button 
                variant="outline"
                className="bg-[#1A1A1A] border-[#333] text-white hover:bg-[#2A2A2A]"
                onClick={() => router.push('/brand-report')}
              >
                <FileBarChart className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 