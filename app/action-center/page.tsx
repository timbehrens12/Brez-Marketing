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
  TrendingUp as TrendUp
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
        const period = item.id.includes('monthly') ? 'monthly' : 'daily'
        
        const { data: reports } = await supabase
          .from('brand_reports')
          .select('*')
          .eq('brand_id', item.brandId)
          .eq('period', period)

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
        const WEEKLY_LIMIT = 5 // Weekly generation limit
        const currentWeeklyUsage = usageData.reduce((sum, record) => sum + (record.generation_count || 0), 0)
        const remaining = WEEKLY_LIMIT - currentWeeklyUsage
        
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
        .select('id, name, user_id')
        .eq('user_id', user.id)

      if (brands) {
        for (const brand of brands) {
          // Check for daily reports using 'daily' period
          const { data: dailyReports } = await supabase
            .from('brand_reports')
            .select('*')
            .eq('brand_id', brand.id)
            .eq('period', 'daily')

          if (!dailyReports?.length) {
            const now = new Date()
            const isAfter6AM = now.getHours() >= 6
            
            if (isAfter6AM) {
              items.push({
                id: `brand-report-${brand.id}`,
                type: 'task',
                priority: 'medium',
                title: `Generate daily report for ${brand.name}`,
                description: 'Daily performance report is ready to generate',
                action: 'Generate Report',
                href: '/brand-report',
                brandId: brand.id,
                brandName: brand.name
              })
            }
          }

          // Check for monthly reports using 'monthly' period
          const now = new Date()
          const isFirstOfMonth = now.getDate() === 1
          if (isFirstOfMonth) {
            const { data: monthlyReports } = await supabase
              .from('brand_reports')
              .select('*')
              .eq('brand_id', brand.id)
              .eq('period', 'monthly')

            if (!monthlyReports?.length) {
              items.push({
                id: `brand-monthly-report-${brand.id}`,
                type: 'task',
                priority: 'high',
                title: `Generate monthly report for ${brand.name}`,
                description: 'Monthly performance report is due',
                action: 'Generate Monthly Report',
                href: '/brand-report',
                brandId: brand.id,
                brandName: brand.name
              })
            }
          }
        }
      }

      // 4. AI Campaign Recommendations - Query through brands that user owns
      if (brands && brands.length > 0) {
        const brandIds = brands.map(b => b.id)
        const { data: recommendations } = await supabase
          .from('ai_campaign_recommendations')
          .select('*')
          .in('brand_id', brandIds)
          .gt('expires_at', new Date().toISOString())
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
              title: `${brand.name} needs immediate attention`,
              description: issues.join(', '),
              action: 'View Dashboard',
              href: `/dashboard?brand=${brand.id}`,
              brandId: brand.id,
              brandName: brand.name
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
      case 'urgent': return <Flame className="h-5 w-5 text-red-500" />
      case 'opportunity': return <Star className="h-5 w-5 text-amber-500" />
      case 'task': return <CheckCircle className="h-5 w-5 text-blue-500" />
      case 'recommendation': return <Brain className="h-5 w-5 text-purple-500" />
      default: return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getTypeGradient = (type: string) => {
    switch (type) {
      case 'urgent': return 'from-red-600/20 via-red-500/10 to-red-600/5 border-l-red-500'
      case 'opportunity': return 'from-amber-600/20 via-amber-500/10 to-amber-600/5 border-l-amber-500'
      case 'task': return 'from-blue-600/20 via-blue-500/10 to-blue-600/5 border-l-blue-500'
      case 'recommendation': return 'from-purple-600/20 via-purple-500/10 to-purple-600/5 border-l-purple-500'
      default: return 'from-gray-600/20 via-gray-500/10 to-gray-600/5 border-l-gray-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 border-red-300 text-red-800'
      case 'medium': return 'bg-amber-100 border-amber-300 text-amber-800'
      default: return 'bg-blue-100 border-blue-300 text-blue-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-400'
      case 'snoozed': return 'text-amber-400'
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
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#0A0A0A] p-6">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-16 bg-gradient-to-r from-[#2A2A2A] to-[#1A1A1A] rounded-2xl"></div>
            <div className="h-20 bg-gradient-to-r from-[#2A2A2A] to-[#1A1A1A] rounded-2xl"></div>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-24 bg-gradient-to-r from-[#2A2A2A] to-[#1A1A1A] rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#0A0A0A] p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Modern Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/90 via-purple-900/20 to-slate-900/90 border border-slate-800/50 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          <div className="relative p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border border-indigo-400/20">
                    <Activity className="h-8 w-8 text-indigo-400" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                      Action Center
                    </h1>
                    <p className="text-slate-400 text-lg mt-1">
                      {activeItems.length > 0 
                        ? `${activeItems.length} active tasks • ${totalActionItems} total`
                        : 'All caught up! No active tasks.'
                      }
                    </p>
                  </div>
                </div>
                
                {/* Status Pills */}
                {totalActionItems > 0 && (
                  <div className="flex items-center gap-3">
                    {activeItems.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 backdrop-blur-sm">
                        <Target className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-300 text-sm font-medium">{activeItems.length} Active</span>
                      </div>
                    )}
                    {groupedItems.urgent.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 backdrop-blur-sm">
                        <Flame className="h-4 w-4 text-red-400" />
                        <span className="text-red-300 text-sm font-medium">{groupedItems.urgent.length} Urgent</span>
                      </div>
                    )}
                    {groupedItems.high.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/30 backdrop-blur-sm">
                        <AlertTriangle className="h-4 w-4 text-orange-400" />
                        <span className="text-orange-300 text-sm font-medium">{groupedItems.high.length} High</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  onClick={clearAllCompleted}
                  variant="outline"
                  size="sm"
                  className="bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50 hover:text-white backdrop-blur-sm"
                  disabled={!filteredItems.some(item => item.status === 'completed')}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Clear Completed
                </Button>
                <Button
                  onClick={handleRefresh}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 backdrop-blur-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <Card className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800/50">
                    <Filter className="h-4 w-4 text-slate-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-300">Status:</span>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-800/80 border border-slate-600/50 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 backdrop-blur-sm"
                  >
                    <option value="active">Active Only</option>
                    <option value="all">All Tasks</option>
                    <option value="snoozed">Snoozed</option>
                    <option value="completed">Completed</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-300">Priority:</span>
                  <select 
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="bg-slate-800/80 border border-slate-600/50 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 backdrop-blur-sm"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 rounded-lg bg-slate-800/50">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-800/80 border-slate-600/50 text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 backdrop-blur-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Groups */}
        {totalActionItems > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([priority, items]) => {
              if (items.length === 0) return null
              
              const isExpanded = expandedSections[priority]
              const priorityLabel = priority === 'urgent' ? 'Urgent' : priority.charAt(0).toUpperCase() + priority.slice(1)
              const priorityColors = {
                urgent: 'text-red-400 bg-gradient-to-r from-red-600/20 to-red-500/10',
                high: 'text-orange-400 bg-gradient-to-r from-orange-600/20 to-orange-500/10',
                medium: 'text-amber-400 bg-gradient-to-r from-amber-600/20 to-amber-500/10',
                low: 'text-blue-400 bg-gradient-to-r from-blue-600/20 to-blue-500/10'
              }

              return (
                <div key={priority} className="space-y-4">
                  <Card className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-slate-700/50 backdrop-blur-xl overflow-hidden">
                    <CardHeader className="pb-4">
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-4 h-auto text-left hover:bg-slate-800/30 rounded-xl"
                        onClick={() => setExpandedSections(prev => ({ ...prev, [priority]: !isExpanded }))}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("px-4 py-2 rounded-full border backdrop-blur-sm", priorityColors[priority as keyof typeof priorityColors])}>
                            <span className="font-semibold text-sm">
                              {priorityLabel} ({items.length})
                            </span>
                          </div>
                          {priority === 'urgent' && <Flame className="h-5 w-5 text-red-400" />}
                          {priority === 'high' && <AlertTriangle className="h-5 w-5 text-orange-400" />}
                          {priority === 'medium' && <Timer className="h-5 w-5 text-amber-400" />}
                          {priority === 'low' && <Dot className="h-5 w-5 text-blue-400" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-slate-800/50 border-slate-600/50 text-slate-300">
                            {items.filter(item => item.status === 'pending' || !item.status).length} active
                          </Badge>
                          {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                        </div>
                      </Button>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {items.map((item) => (
                            <Card
                              key={item.id}
                              className={cn(
                                "group relative overflow-hidden border-l-4 bg-gradient-to-r backdrop-blur-sm transition-all duration-300 hover:scale-[1.01]",
                                getTypeGradient(item.type),
                                item.status === 'completed' && "opacity-60",
                                item.status === 'dismissed' && "opacity-40"
                              )}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              
                              <CardContent className="p-6 relative">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {getTypeIcon(item.type)}
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h3 className={cn(
                                          "font-semibold text-lg leading-tight cursor-pointer transition-colors",
                                          getStatusColor(item.status || 'pending'),
                                          item.status === 'completed' && "line-through"
                                        )}
                                        onClick={() => item.href && router.push(item.href)}
                                        >
                                          {item.title}
                                        </h3>
                                        
                                        <Badge 
                                          variant="outline" 
                                          className={cn("text-xs font-medium", getPriorityColor(item.priority))}
                                        >
                                          {item.priority}
                                        </Badge>
                                        
                                        {item.status === 'snoozed' && item.snoozeUntil && (
                                          <Badge className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 text-amber-300 text-xs border border-amber-500/30">
                                            <ClockSnooze className="h-3 w-3 mr-1" />
                                            {formatDistanceToNow(item.snoozeUntil, { addSuffix: true })}
                                          </Badge>
                                        )}
                                        
                                        {item.status === 'completed' && (
                                          <Badge className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 text-emerald-300 text-xs border border-emerald-500/30">
                                            <Check className="h-3 w-3 mr-1" />
                                            Completed
                                          </Badge>
                                        )}
                                        
                                        {item.count && (
                                          <Badge className="bg-gradient-to-r from-slate-700 to-slate-800 text-white text-xs border border-slate-600">
                                            {item.count}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-slate-400 leading-relaxed">
                                        {item.description}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 ml-4">
                                    {item.dueDate && (
                                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
                                        <Clock className="h-3 w-3" />
                                        {formatDistanceToNow(item.dueDate, { addSuffix: true })}
                                      </div>
                                    )}
                                    
                                    {(item.status === 'pending' || !item.status) && (
                                      <>
                                        <Button 
                                          size="sm" 
                                          className="bg-gradient-to-r from-white to-gray-100 text-black hover:from-gray-100 hover:to-gray-200 shadow-lg"
                                          onClick={() => item.href && router.push(item.href)}
                                        >
                                          {item.action}
                                          <ArrowRight className="h-3 w-3 ml-2" />
                                        </Button>
                                        
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800/50">
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent className="bg-slate-800/95 border-slate-700/50 backdrop-blur-xl">
                                            <DropdownMenuItem onClick={() => markCompleted(item.id)} className="text-slate-300 hover:bg-slate-700/50 hover:text-white">
                                              <Check className="h-4 w-4 mr-2" />
                                              Mark Complete
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-slate-700/50" />
                                            <DropdownMenuItem onClick={() => snoozeTask(item.id, 'hour')} className="text-slate-300 hover:bg-slate-700/50 hover:text-white">
                                              <ClockSnooze className="h-4 w-4 mr-2" />
                                              Snooze 1 hour
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => snoozeTask(item.id, '4hours')} className="text-slate-300 hover:bg-slate-700/50 hover:text-white">
                                              <ClockSnooze className="h-4 w-4 mr-2" />
                                              Snooze 4 hours
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => snoozeTask(item.id, 'tomorrow')} className="text-slate-300 hover:bg-slate-700/50 hover:text-white">
                                              <ClockSnooze className="h-4 w-4 mr-2" />
                                              Snooze until tomorrow
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => snoozeTask(item.id, 'week')} className="text-slate-300 hover:bg-slate-700/50 hover:text-white">
                                              <ClockSnooze className="h-4 w-4 mr-2" />
                                              Snooze 1 week
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-slate-700/50" />
                                            <DropdownMenuItem onClick={() => dismissTask(item.id)} className="text-red-400 hover:bg-red-900/30 hover:text-red-300">
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
                                        className="bg-slate-800/50 border-slate-600/50 text-white hover:bg-slate-700/50"
                                        onClick={() => reactivateTask(item.id)}
                                      >
                                        Reactivate
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>
              )
            })}
          </div>
        ) : (
          <Card className="bg-gradient-to-br from-emerald-900/20 via-green-800/10 to-emerald-900/20 border-emerald-800/30 backdrop-blur-xl">
            <CardContent className="py-16 text-center">
              <div className="space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-green-600/20 blur-3xl rounded-full"></div>
                  <CheckCircle className="relative h-20 w-20 text-emerald-400 mx-auto" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">All caught up!</h3>
                  <p className="text-slate-400 text-lg">No action items at this time. Great work!</p>
                </div>
                
                <div className="flex items-center justify-center gap-4 mt-12">
                  <Button 
                    variant="outline"
                    className="bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50 backdrop-blur-sm"
                    onClick={() => router.push('/lead-generator')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Generate Leads
                  </Button>
                  <Button 
                    variant="outline"
                    className="bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50 backdrop-blur-sm"
                    onClick={() => router.push('/outreach-tool')}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Start Outreach
                  </Button>
                  <Button 
                    variant="outline"
                    className="bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50 backdrop-blur-sm"
                    onClick={() => router.push('/brand-report')}
                  >
                    <FileBarChart className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 