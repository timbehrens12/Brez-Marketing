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
  ChevronUp
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format, addHours, addDays, addWeeks, isBefore } from 'date-fns'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

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
  status?: 'pending' | 'snoozed' | 'completed' | 'dismissed'
  snoozeUntil?: Date
  completedAt?: Date
  dismissedAt?: Date
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
  
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [taskStates, setTaskStates] = useState<TaskState>({})
  const [showCompleted, setShowCompleted] = useState(false)
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    urgent: true,
    high: true,
    medium: true,
    low: false
  })

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

  // Check if a task is completed by checking if the action was actually done
  const checkTaskCompletion = useCallback(async (item: ActionItem): Promise<boolean> => {
    if (!user?.id) return false

    try {
      const supabase = await getSupabaseClient()

      // Check brand reports
      if (item.id.includes('brand-report') && item.brandId) {
        const { data: reports } = await supabase
          .from('brand_reports')
          .select('*')
          .eq('brand_id', item.brandId)
          .eq('report_date', format(new Date(), 'yyyy-MM-dd'))
          .eq('report_type', item.id.includes('monthly') ? 'last-month' : 'today')

        return Boolean(reports && reports.length > 0)
      }

      // Check if outreach campaigns have been updated
      if (item.id.includes('outreach-') && item.href === '/outreach-tool') {
        // This would require more complex checking - for now just return false
        return false
      }

      return false
    } catch (error) {
      console.error('Error checking task completion:', error)
      return false
    }
  }, [user?.id])

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

      // 5. Check for critical brand issues
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

          const issues: string[] = []
          let isCritical = false

          if (roas < 1 && recentMetaData.length > 0) {
            issues.push('ROAS below breakeven')
            isCritical = true
          }

          if (roasChange < -20 && recentMetaData.length > 0) {
            issues.push('ROAS down 20%+')
            isCritical = true
          }

          if (salesChange < -30 && shopifyOrders?.length) {
            issues.push('Sales down 30%+')
            isCritical = true
          }

          if (isCritical) {
            items.push({
              id: `brand-critical-${brand.id}`,
              type: 'urgent',
              priority: 'high',
              title: `${brand.brand_name} needs immediate attention`,
              description: issues.join(', '),
              action: 'View Dashboard',
              href: `/dashboard?brand=${brand.id}`,
              brandId: brand.id,
              brandName: brand.brand_name
            })
          }
        }
      }

      // Apply task states and check for auto-completion
      const itemsWithStates = await Promise.all(items.map(async (item) => {
        const state = taskStates[item.id] || { status: 'pending' }
        
        // Check if snoozed tasks should be reactivated
        if (state.status === 'snoozed' && state.snoozeUntil && state.snoozeUntil < new Date()) {
          state.status = 'pending'
          state.snoozeUntil = undefined
        }

        // Auto-complete tasks if they're actually done
        if (state.status === 'pending') {
          const isCompleted = await checkTaskCompletion(item)
          if (isCompleted) {
            state.status = 'completed'
            state.completedAt = new Date()
          }
        }

        return {
          ...item,
          status: state.status,
          snoozeUntil: state.snoozeUntil,
          completedAt: state.completedAt,
          dismissedAt: state.dismissedAt
        }
      }))

      setActionItems(itemsWithStates)

      // Update task states if any auto-completions happened
      const updatedStates = { ...taskStates }
      let hasUpdates = false
      itemsWithStates.forEach(item => {
        if (item.status !== (taskStates[item.id]?.status || 'pending')) {
          updatedStates[item.id] = {
            status: item.status!,
            snoozeUntil: item.snoozeUntil,
            completedAt: item.completedAt,
            dismissedAt: item.dismissedAt
          }
          hasUpdates = true
        }
      })

      if (hasUpdates) {
        saveTaskStates(updatedStates)
      }

    } catch (error) {
      console.error('Error loading action items:', error)
    }
  }, [user?.id, taskStates, checkTaskCompletion, saveTaskStates])

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await loadActionItems()
      setIsLoading(false)
    }

    if (user?.id) {
      loadData()
    }
  }, [user?.id, loadActionItems, refreshKey])

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

  const reactivateTask = (taskId: string) => {
    const newStates = {
      ...taskStates,
      [taskId]: {
        ...taskStates[taskId],
        status: 'pending' as const,
        snoozeUntil: undefined,
        completedAt: undefined,
        dismissedAt: undefined
      }
    }
    saveTaskStates(newStates)
  }

  const clearAllCompleted = () => {
    const newStates = { ...taskStates }
    Object.keys(newStates).forEach(taskId => {
      if (newStates[taskId].status === 'completed') {
        delete newStates[taskId]
      }
    })
    saveTaskStates(newStates)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400'
      case 'snoozed': return 'text-orange-400'
      case 'dismissed': return 'text-gray-500'
      default: return 'text-white'
    }
  }

  // Filter items
  const filteredItems = actionItems.filter(item => {
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && (item.status === 'pending' || !item.status)) ||
      (filterStatus === 'snoozed' && item.status === 'snoozed') ||
      (filterStatus === 'completed' && item.status === 'completed') ||
      (filterStatus === 'dismissed' && item.status === 'dismissed')
    
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesPriority && matchesStatus && matchesSearch
  })

  // Group items by priority
  const groupedItems = {
    urgent: filteredItems.filter(item => item.type === 'urgent'),
    high: filteredItems.filter(item => item.priority === 'high' && item.type !== 'urgent'),
    medium: filteredItems.filter(item => item.priority === 'medium'),
    low: filteredItems.filter(item => item.priority === 'low')
  }

  const activeItems = filteredItems.filter(item => item.status === 'pending' || !item.status)
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
              {activeItems.length > 0 
                ? `${activeItems.length} active tasks • ${totalActionItems} total`
                : 'All caught up! No active tasks.'
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={clearAllCompleted}
              variant="outline"
              size="sm"
              className="bg-[#1A1A1A] border-[#333] text-gray-400 hover:bg-[#2A2A2A] hover:text-white"
              disabled={!filteredItems.some(item => item.status === 'completed')}
            >
              <Archive className="h-4 w-4 mr-2" />
              Clear Completed
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="bg-[#1A1A1A] border-[#333] text-white hover:bg-[#2A2A2A]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 p-4 bg-[#1A1A1A] rounded-lg border border-[#333]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Status:</span>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#2A2A2A] border border-[#444] rounded px-3 py-1 text-white text-sm"
              >
                <option value="active">Active Only</option>
                <option value="all">All Tasks</option>
                <option value="snoozed">Snoozed</option>
                <option value="completed">Completed</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Priority:</span>
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

        {/* Task Groups */}
        {totalActionItems > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([priority, items]) => {
              if (items.length === 0) return null
              
              const isExpanded = expandedSections[priority]
              const priorityLabel = priority === 'urgent' ? 'Urgent' : priority.charAt(0).toUpperCase() + priority.slice(1)
              const priorityColor = priority === 'urgent' ? 'text-red-400' : 
                                  priority === 'high' ? 'text-orange-400' : 
                                  priority === 'medium' ? 'text-yellow-400' : 'text-blue-400'

              return (
                <div key={priority} className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto text-left hover:bg-[#1A1A1A]"
                    onClick={() => setExpandedSections(prev => ({ ...prev, [priority]: !isExpanded }))}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn("font-semibold", priorityColor)}>
                        {priorityLabel} ({items.length})
                      </span>
                      {priority === 'urgent' && <Flame className="h-4 w-4 text-red-400" />}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>

                  {isExpanded && (
                    <div className="space-y-2 ml-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "group flex items-center justify-between p-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#333] rounded-lg transition-all duration-200",
                            item.status === 'completed' && "opacity-60",
                            item.status === 'dismissed' && "opacity-40"
                          )}
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {getTypeIcon(item.type)}
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className={cn(
                                  "font-medium transition-colors cursor-pointer",
                                  getStatusColor(item.status || 'pending'),
                                  item.status === 'completed' && "line-through"
                                )}
                                onClick={() => item.href && router.push(item.href)}
                                >
                                  {item.title}
                                </h3>
                                
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getPriorityColor(item.priority))}
                                >
                                  {item.priority}
                                </Badge>
                                
                                                                 {item.status === 'snoozed' && item.snoozeUntil && (
                                   <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                                     <ClockSnooze className="h-3 w-3 mr-1" />
                                     {formatDistanceToNow(item.snoozeUntil, { addSuffix: true })}
                                   </Badge>
                                 )}
                                
                                {item.status === 'completed' && (
                                  <Badge className="bg-green-500/20 text-green-400 text-xs">
                                    <Check className="h-3 w-3 mr-1" />
                                    Completed
                                  </Badge>
                                )}
                                
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
                            
                            {(item.status === 'pending' || !item.status) && (
                              <>
                                <Button 
                                  size="sm" 
                                  className="bg-white text-black hover:bg-gray-200"
                                  onClick={() => item.href && router.push(item.href)}
                                >
                                  {item.action}
                                </Button>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-[#2A2A2A] border-[#444]">
                                    <DropdownMenuItem onClick={() => markCompleted(item.id)}>
                                      <Check className="h-4 w-4 mr-2" />
                                      Mark Complete
                                    </DropdownMenuItem>
                                                                         <DropdownMenuSeparator />
                                     <DropdownMenuItem onClick={() => snoozeTask(item.id, 'hour')}>
                                       <ClockSnooze className="h-4 w-4 mr-2" />
                                       Snooze 1 hour
                                     </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => snoozeTask(item.id, '4hours')}>
                                       <ClockSnooze className="h-4 w-4 mr-2" />
                                       Snooze 4 hours
                                     </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => snoozeTask(item.id, 'tomorrow')}>
                                       <ClockSnooze className="h-4 w-4 mr-2" />
                                       Snooze until tomorrow
                                     </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => snoozeTask(item.id, 'week')}>
                                       <ClockSnooze className="h-4 w-4 mr-2" />
                                       Snooze 1 week
                                     </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => dismissTask(item.id)} className="text-red-400">
                                      <X className="h-4 w-4 mr-2" />
                                      Dismiss
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                            
                            {(item.status === 'snoozed' || item.status === 'completed' || item.status === 'dismissed') && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="bg-[#1A1A1A] border-[#333] text-white hover:bg-[#2A2A2A]"
                                onClick={() => reactivateTask(item.id)}
                              >
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
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