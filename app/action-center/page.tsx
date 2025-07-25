"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@clerk/nextjs'
import { getAuthenticatedSupabaseClient, getStandardSupabaseClient } from '@/lib/utils/unified-supabase'
import { 
  CheckSquare, 
  AlertTriangle, 
  Clock, 
  MessageSquare, 
  Star, 
  Send,
  ExternalLink,
  CheckCircle,
  Loader2,
  // New icons for tools
  Brain,
  Zap,
  Target,
  FileBarChart,
  Palette,
  BarChart3,
  Calendar,
  RefreshCw,
  Settings,
  TrendingUp,
  ChevronDown,
  Filter,
  Tag
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PlatformConnection } from '@/types/platformConnection'
import { useBrandContext } from '@/lib/context/BrandContext'

interface TodoItem {
  id: string
  type: 'responded' | 'hot_leads' | 'new_leads' | 'follow_up' | 'reports' | 'ai_recommendations'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  count: number
  action: string
  targetPage: string
}

interface TaskState {
  [key: string]: {
    status: 'pending' | 'snoozed' | 'completed' | 'dismissed'
    snoozeUntil?: Date
    completedAt?: Date
    dismissedAt?: Date
  }
}

interface Brand {
  id: string
  name: string
  niche?: string
  image_url?: string
  user_id: string
  shared_access?: any
  agency_info?: any
}

interface ReusableTool {
  id: string
  name: string
  description: string
  icon: any
  category: 'automation' | 'ai-powered' | 'analytics' | 'tools'
  status: 'available' | 'scheduled' | 'coming-soon' | 'unavailable'
  href: string
  features: string[]
  frequency?: string
  requiresPlatforms?: ('meta' | 'shopify')[]
  requiresData?: boolean
}

const BASE_REUSABLE_TOOLS: Omit<ReusableTool, 'status'>[] = [
  {
    id: 'campaign-optimizer',
    name: 'Campaign Optimizer',
    description: 'AI-powered campaign optimization and performance insights',
    icon: Target,
    category: 'ai-powered',
    href: '/dashboard',
    features: ['Performance Analysis', 'Budget Optimization', 'Ad Set Recommendations'],
    requiresPlatforms: ['meta'],
    requiresData: true
  },
  {
    id: 'lead-generator',
    name: 'Lead Generator',
    description: 'Find and qualify leads using real business data',
    icon: Zap,
    category: 'tools',
    href: '/lead-generator',
    features: ['Google Places Integration', 'Lead Scoring', 'Business Intelligence']
  },
  {
    id: 'outreach-tool',
    name: 'Outreach Tool',
    description: 'Manage lead outreach campaigns and follow-ups',
    icon: Send,
    category: 'tools',
    href: '/outreach-tool',
    features: ['Campaign Management', 'Lead Tracking', 'Response Management']
  },
  {
    id: 'marketing-assistant',
    name: 'Marketing Assistant',
    description: 'AI marketing insights and strategic recommendations',
    icon: Brain,
    category: 'ai-powered',
    href: '/marketing-assistant',
    features: ['Performance Analytics', 'Campaign Insights', 'AI Recommendations'],
    requiresPlatforms: ['meta'],
    requiresData: true
  },
  {
    id: 'brand-reports',
    name: 'Brand Reports',
    description: 'Automated daily and monthly performance reports',
    icon: FileBarChart,
    category: 'automation',
    href: '/brand-report',
    features: ['Daily Reports', 'Monthly Reports', 'AI-Generated Insights'],
    frequency: 'Daily/Monthly',
    requiresPlatforms: ['meta', 'shopify'],
    requiresData: true
  },
  {
    id: 'ai-consultant',
    name: 'AI Marketing Consultant',
    description: 'Chat with AI for personalized marketing advice',
    icon: MessageSquare,
    category: 'ai-powered',
    href: '/marketing-assistant',
    features: ['Personal Advice', 'Goal-Oriented', 'Industry-Specific'],
    requiresPlatforms: ['meta'],
    requiresData: true
  },
  {
    id: 'data-sync',
    name: 'Daily Data Sync',
    description: 'Automatic daily synchronization of all platform data',
    icon: RefreshCw,
    category: 'automation',
    href: '/settings',
    features: ['Meta Data Sync', 'Shopify Sync', 'Automated Updates'],
    frequency: 'Daily at 11:59 PM',
    requiresPlatforms: ['meta', 'shopify']
  },
  {
    id: 'analytics',
    name: 'Analytics Dashboard',
    description: 'Comprehensive performance analytics and metrics',
    icon: BarChart3,
    category: 'analytics',
    href: '/analytics',
    features: ['Campaign Performance', 'Spend Trends', 'ROI Analysis'],
    requiresPlatforms: ['meta', 'shopify'],
    requiresData: true
  },
  {
    id: 'ad-creative-studio',
    name: 'Ad Creative Studio',
    description: 'AI-powered ad creative generation and optimization',
    icon: Palette,
    category: 'ai-powered',
    href: '/ad-creative-studio',
    features: ['Creative Generation', 'A/B Testing', 'Performance Optimization']
  }
]

export default function ActionCenterPage() {
  const { userId, getToken } = useAuth()
  const router = useRouter()
  const { brands: contextBrands } = useBrandContext()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [taskStates, setTaskStates] = useState<TaskState>({})
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all')
  const [isLoadingConnections, setIsLoadingConnections] = useState(true)

  // Use brands from context
  const brands = contextBrands || []

  // Unified Supabase client function (same as outreach page)
  const getSupabaseClient = async () => {
    try {
      console.log('[Action Center] 🔗 Getting Supabase client...')
      const token = await getToken({ template: 'supabase' })
      if (token) {
        console.log('[Action Center] ✅ Using authenticated client')
        return getAuthenticatedSupabaseClient(token)
      } else {
        console.log('[Action Center] ⚠️ Using standard client (no token)')
        return getStandardSupabaseClient()
      }
    } catch (error) {
      console.error('[Action Center] ❌ Error getting Supabase client:', error)
      return getStandardSupabaseClient()
    }
  }

  // Load platform connections for brands from context
  const loadConnections = useCallback(async () => {
    if (!userId || brands.length === 0) return

    try {
      setIsLoadingConnections(true)
      const supabase = await getSupabaseClient()

      // Load platform connections for all brands from context
      const brandIds = brands.map((brand: any) => brand.id)
      console.log('[Action Center] Loading connections for brands:', brandIds)
      
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('platform_connections')
        .select('*')
        .in('brand_id', brandIds)
        .eq('status', 'active')

      if (connectionsError) {
        console.error('[Action Center] Error loading connections:', connectionsError)
      } else {
        console.log('[Action Center] Loaded connections:', connectionsData?.length || 0)
        setConnections(connectionsData as PlatformConnection[] || [])
      }
    } catch (error) {
      console.error('[Action Center] Error loading connections:', error)
    } finally {
      setIsLoadingConnections(false)
    }
  }, [userId, brands, getToken])

  // Get tool availability for a specific brand
  const getToolAvailability = (tool: Omit<ReusableTool, 'status'>, brandId?: string): ReusableTool => {
    // Coming soon tools are always coming soon
    if (tool.id === 'ad-creative-studio') {
      return { ...tool, status: 'coming-soon' }
    }

    // Tools that don't require platforms are always available
    if (!tool.requiresPlatforms || tool.requiresPlatforms.length === 0) {
      return { ...tool, status: 'available' }
    }

    // If no specific brand selected, check if ANY brand has the required platforms
    if (!brandId || brandId === 'all') {
      const hasAnyBrandWithPlatforms = brands.some((brand: any) => {
        const brandConnections = connections.filter(conn => conn.brand_id === brand.id)
        return tool.requiresPlatforms!.every(platform => 
          brandConnections.some(conn => conn.platform_type === platform)
        )
      })
      return { ...tool, status: hasAnyBrandWithPlatforms ? 'available' : 'unavailable' }
    }

    // Check specific brand
    const brandConnections = connections.filter(conn => conn.brand_id === brandId)
    const hasRequiredPlatforms = tool.requiresPlatforms.every(platform => 
      brandConnections.some(conn => conn.platform_type === platform)
    )

    // For scheduled tools (data sync), they're scheduled if platforms are connected
    if (tool.id === 'data-sync' && hasRequiredPlatforms) {
      return { ...tool, status: 'scheduled' }
    }

    return { ...tool, status: hasRequiredPlatforms ? 'available' : 'unavailable' }
  }

  // Get tools with availability status
  const getToolsWithAvailability = (): ReusableTool[] => {
    return BASE_REUSABLE_TOOLS.map(tool => getToolAvailability(tool, selectedBrandId))
  }

  const reusableTools = getToolsWithAvailability()

  // Get brand connections for display
  const getBrandConnections = (brandId: string) => {
    return connections.filter(conn => conn.brand_id === brandId)
  }

  // Render brand avatar
  const renderBrandAvatar = (brand: any, size: 'sm' | 'md' = 'sm') => {
    const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
    
    if (brand.image_url) {
      return (
        <img 
          src={brand.image_url} 
          alt={brand.name} 
          className={cn(sizeClasses, "rounded-full object-cover border border-[#444]")}
        />
      )
    }
    
    return (
      <div className={cn(
        sizeClasses,
        "flex items-center justify-center rounded-full bg-gradient-to-br from-gray-600 to-gray-700 text-white font-medium text-xs border border-[#444]"
      )}>
        {brand.name.charAt(0).toUpperCase()}
      </div>
    )
  }

  // Render platform connection icons
  const renderConnectionIcons = (brandId: string) => {
    const brandConnections = getBrandConnections(brandId)
    const uniqueConnections = brandConnections.filter((connection, index, arr) => 
      arr.findIndex(c => c.platform_type === connection.platform_type) === index
    )
    
    return (
      <div className="flex items-center gap-1">
        {uniqueConnections.map((connection) => (
          <div
            key={`${connection.platform_type}-${brandId}`}
            className="w-3 h-3 rounded-sm overflow-hidden border border-white/30 bg-white/10"
            title={`${connection.platform_type.charAt(0).toUpperCase() + connection.platform_type.slice(1)} connected`}
          >
            {connection.platform_type === 'shopify' && (
              <img 
                src="/shopify-icon.png" 
                alt="Shopify" 
                className="w-full h-full object-contain"
              />
            )}
            {connection.platform_type === 'meta' && (
              <img 
                src="/meta-icon.png" 
                alt="Meta" 
                className="w-full h-full object-contain"
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'automation': return <Calendar className="h-4 w-4" />
      case 'ai-powered': return <Brain className="h-4 w-4" />
      case 'analytics': return <TrendingUp className="h-4 w-4" />
      case 'tools': return <Settings className="h-4 w-4" />
      default: return <CheckSquare className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'automation': return 'bg-blue-900/20 border-blue-500/50 text-blue-300'
      case 'ai-powered': return 'bg-purple-900/20 border-purple-500/50 text-purple-300'
      case 'analytics': return 'bg-green-900/20 border-green-500/50 text-green-300'
      case 'tools': return 'bg-orange-900/20 border-orange-500/50 text-orange-300'
      default: return 'bg-gray-900/20 border-gray-500/50 text-gray-300'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge className="bg-green-600 text-white text-xs">Available</Badge>
      case 'scheduled': return <Badge className="bg-blue-600 text-white text-xs">Scheduled</Badge>
      case 'coming-soon': return <Badge variant="outline" className="text-xs">Coming Soon</Badge>
      case 'unavailable': return <Badge className="bg-red-600 text-white text-xs">Missing Platform</Badge>
      default: return <Badge variant="outline" className="text-xs">Unknown</Badge>
    }
  }

  const filteredTools = selectedCategory === 'all' 
    ? reusableTools 
    : reusableTools.filter(tool => tool.category === selectedCategory)

  const categories = [
    { id: 'all', name: 'All Tools', count: reusableTools.length },
    { id: 'automation', name: 'Automation', count: reusableTools.filter(t => t.category === 'automation').length },
    { id: 'ai-powered', name: 'AI-Powered', count: reusableTools.filter(t => t.category === 'ai-powered').length },
    { id: 'analytics', name: 'Analytics', count: reusableTools.filter(t => t.category === 'analytics').length },
    { id: 'tools', name: 'Tools', count: reusableTools.filter(t => t.category === 'tools').length }
  ]

  // Load task states from localStorage
  useEffect(() => {
    if (userId) {
      const saved = localStorage.getItem(`actionCenter_taskStates_${userId}`)
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
  }, [userId])

  // Load connections when brands are available
  useEffect(() => {
    if (userId && brands.length > 0) {
      loadConnections()
    }
  }, [userId, brands.length, loadConnections])

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

  // Generate todos from outreach data and other sources
  const generateTodos = useCallback(async () => {
    if (!userId) return

    try {
      const supabase = await getSupabaseClient() // Use the new local function
      const newTodos: TodoItem[] = []

      console.log('[Action Center] Loading outreach data for user:', userId)

      // Load campaign leads exactly like the outreach page does - as a flat array
      const { data: userCampaigns, error: campaignsError } = await supabase
        .from('outreach_campaigns')
        .select('id')
        .eq('user_id', userId)

      if (campaignsError) {
        console.error('[Action Center] Error loading campaigns:', campaignsError)
        return
      }

      if (!userCampaigns || userCampaigns.length === 0) {
        console.log('[Action Center] No campaigns found')
        setTodos([])
        return
      }

      const campaignIds = userCampaigns.map(c => c.id)

      // Get ALL campaign leads as a flat array (same as outreach page)
      const { data: campaignLeads, error } = await supabase
        .from('outreach_campaign_leads')
        .select(`
          *,
          lead:leads(*)
        `)
        .in('campaign_id', campaignIds)
        .order('added_at', { ascending: false })

      if (error) {
        console.error('[Action Center] Error loading campaign leads:', error)
        return
      }

      console.log('[Action Center] Found campaign leads:', campaignLeads?.length || 0)

      if (!campaignLeads || campaignLeads.length === 0) {
        console.log('[Action Center] No campaign leads found')
        setTodos([])
        return
      }

      // Use EXACT same logic as SimpleTodos component
      // Count leads by status
      const pendingLeads = campaignLeads.filter(cl => cl.status === 'pending')
      const contactedLeads = campaignLeads.filter(cl => cl.status === 'contacted')
      const respondedLeads = campaignLeads.filter(cl => cl.status === 'responded')
      const qualifiedLeads = campaignLeads.filter(cl => cl.status === 'qualified')
      
      console.log('[Action Center] Lead counts:', {
        pending: pendingLeads.length,
        contacted: contactedLeads.length,
        responded: respondedLeads.length,
        qualified: qualifiedLeads.length,
        total: campaignLeads.length
      })
      
      // Get leads contacted more than 3 days ago (need follow-up)
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      const needsFollowUp = contactedLeads.filter(cl => {
        if (!cl.last_contacted_at) return false
        return new Date(cl.last_contacted_at) < threeDaysAgo
      })
      
      // Get leads contacted more than 7 days ago (going cold)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const goingCold = contactedLeads.filter(cl => {
        if (!cl.last_contacted_at) return false
        return new Date(cl.last_contacted_at) < sevenDaysAgo
      })

      console.log('[Action Center] Follow-up counts:', {
        needsFollowUp: needsFollowUp.length,
        goingCold: goingCold.length
      })

      // Generate todos based on lead status (EXACT same logic as simple-todos.tsx)
      if (pendingLeads.length > 0) {
        newTodos.push({
          id: 'new_leads',
          type: 'new_leads',
          priority: 'high',
          title: `Start outreach for ${pendingLeads.length} new leads`,
          description: 'These leads are ready for initial outreach',
          count: pendingLeads.length,
          action: 'Start Outreach',
          targetPage: '/outreach-tool'
        })
      }

      if (respondedLeads.length > 0) {
        newTodos.push({
          id: 'responded',
          type: 'responded',
          priority: 'high',
          title: `${respondedLeads.length} leads responded - follow up now!`,
          description: 'These leads showed interest and need immediate attention',
          count: respondedLeads.length,
          action: 'View Responses',
          targetPage: '/outreach-tool'
        })
      }

      if (qualifiedLeads.length > 0) {
        newTodos.push({
          id: 'qualified',
          type: 'hot_leads',
          priority: 'high',
          title: `${qualifiedLeads.length} qualified leads ready for proposals`,
          description: 'These leads are qualified and ready for the next step',
          count: qualifiedLeads.length,
          action: 'Send Proposals',
          targetPage: '/outreach-tool'
        })
      }

      if (needsFollowUp.length > 0) {
        newTodos.push({
          id: 'follow_up',
          type: 'follow_up',
          priority: 'medium',
          title: `Follow up with ${needsFollowUp.length} leads (3+ days)`,
          description: 'These leads were contacted but haven\'t responded yet',
          count: needsFollowUp.length,
          action: 'Send Follow-up',
          targetPage: '/outreach-tool'
        })
      }

      if (goingCold.length > 0) {
        newTodos.push({
          id: 'going_cold',
          type: 'follow_up',
          priority: 'low',
          title: `${goingCold.length} leads going cold (7+ days)`,
          description: 'These leads need urgent follow-up or should be marked as rejected',
          count: goingCold.length,
          action: 'Urgent Follow-up',
          targetPage: '/outreach-tool'
        })
      }

      console.log('[Action Center] Generated todos:', newTodos.length)
      console.log('[Action Center] Todos:', newTodos)
      setTodos(newTodos)
    } catch (error) {
      console.error('[Action Center] Error generating todos:', error)
    }
  }, [userId, getToken])

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        await generateTodos()
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadData()
    }
  }, [userId, generateTodos])

  // Filter active todos (same logic as simple-todos)
  const activeTodos = todos.filter(todo => isTaskActive(todo.id))

  // Get icons and colors (same as simple-todos)
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500/50 bg-red-900/20'
      case 'medium': return 'border-yellow-500/50 bg-yellow-900/20'
      case 'low': return 'border-gray-500/50 bg-gray-900/20'
      default: return 'border-gray-500/50 bg-gray-900/20'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'new_leads': return <Send className="h-4 w-4 text-blue-400" />
      case 'responded': return <MessageSquare className="h-4 w-4 text-green-400" />
      case 'hot_leads': return <Star className="h-4 w-4 text-yellow-400" />
      case 'follow_up': return <Clock className="h-4 w-4 text-orange-400" />
      default: return <CheckSquare className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive" className="text-xs">High</Badge>
      case 'medium': return <Badge variant="secondary" className="text-xs bg-yellow-900 text-yellow-200">Medium</Badge>
      case 'low': return <Badge variant="outline" className="text-xs">Low</Badge>
      default: return <Badge variant="outline" className="text-xs">Normal</Badge>
    }
  }

  const selectedBrand = brands.find((brand: any) => brand.id === selectedBrandId)
  const availableToolsCount = filteredTools.filter(t => t.status === 'available').length

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
          <h1 className="text-3xl font-bold text-white">Action Center</h1>
          <p className="text-[#9ca3af] mt-2">Stay on top of your outreach and business priorities</p>
        </div>

        {/* Main Content - Grid Layout for Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          
          {/* Outreach Tasks Widget - Thin Column */}
          <div className="md:col-span-1">
            <Card className="bg-[#1a1a1a] border border-[#333] h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-blue-400" />
                    <CardTitle className="text-white text-lg">Outreach Tasks</CardTitle>
                  </div>
                  {activeTodos.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {activeTodos.length}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-[#9ca3af] text-sm">
                  Tasks that need your attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                ) : activeTodos.length > 0 ? (
                  activeTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className={cn(
                        "rounded-lg border p-3 transition-all hover:shadow-md",
                        getPriorityColor(todo.priority)
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getTypeIcon(todo.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5">
                              {todo.count}
                            </Badge>
                            {getPriorityBadge(todo.priority)}
                          </div>
                          <h4 className="font-medium text-white text-sm leading-tight mb-1">
                            {todo.title}
                          </h4>
                          <p className="text-[#9ca3af] text-xs leading-relaxed mb-3">
                            {todo.description}
                          </p>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                                onClick={() => setSelectedTodo(todo)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                {todo.action}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#1a1a1a] border border-[#333]">
                              <DialogHeader>
                                <DialogTitle className="text-white flex items-center gap-2">
                                  {getTypeIcon(todo.type)}
                                  {todo.title}
                                </DialogTitle>
                                <DialogDescription className="text-[#9ca3af]">
                                  {todo.description}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex flex-col gap-4 pt-4">
                                <Button
                                  onClick={() => {
                                    router.push(todo.targetPage)
                                  }}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Go to Outreach Tool
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <h3 className="font-medium text-white mb-1">All caught up!</h3>
                    <p className="text-[#9ca3af] text-sm">No outreach tasks need attention right now.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Reusable Tools Widget - Wide Column */}
          <div className="md:col-span-2 lg:col-span-3">
            <Card className="bg-[#1a1a1a] border border-[#333]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-green-400" />
                    <CardTitle className="text-white text-lg">Reusable Tools & Automation</CardTitle>
                  </div>
                  <Badge className="bg-green-600 text-white text-xs">
                    {availableToolsCount} Available
                  </Badge>
                </div>
                <CardDescription className="text-[#9ca3af] text-sm">
                  Marketing tools and automation features available for your brands
                </CardDescription>
                
                {/* Filters */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {/* Brand Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 text-xs bg-transparent border-[#333] text-[#9ca3af] hover:bg-[#333] hover:text-white",
                          isLoadingConnections && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={isLoadingConnections}
                      >
                        <Filter className="h-3 w-3 mr-1" />
                        {isLoadingConnections ? (
                          "Loading..."
                        ) : selectedBrandId === 'all' ? (
                          `All Brands (${brands.length})`
                        ) : (
                          <div className="flex items-center gap-1">
                            {selectedBrand && renderBrandAvatar(selectedBrand, 'sm')}
                            <span className="max-w-20 truncate">{selectedBrand?.name || 'Unknown'}</span>
                          </div>
                        )}
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#1a1a1a] border border-[#333]">
                      <DropdownMenuItem
                        onClick={() => setSelectedBrandId('all')}
                        className={cn(
                          "text-[#9ca3af] hover:bg-[#333] hover:text-white cursor-pointer",
                          selectedBrandId === 'all' && "bg-[#333] text-white"
                        )}
                      >
                        <Tag className="h-4 w-4 mr-2" />
                        All Brands ({brands.length})
                      </DropdownMenuItem>
                      {brands.map((brand: any) => (
                        <DropdownMenuItem
                          key={brand.id}
                          onClick={() => setSelectedBrandId(brand.id)}
                          className={cn(
                            "text-[#9ca3af] hover:bg-[#333] hover:text-white cursor-pointer",
                            selectedBrandId === brand.id && "bg-[#333] text-white"
                          )}
                        >
                          <div className="flex items-center gap-2 w-full">
                            {renderBrandAvatar(brand, 'sm')}
                            <span className="truncate flex-1">{brand.name}</span>
                            {renderConnectionIcons(brand.id)}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Category Filter */}
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        "h-8 text-xs",
                        selectedCategory === category.id 
                          ? "bg-blue-600 hover:bg-blue-700 text-white" 
                          : "bg-transparent border-[#333] text-[#9ca3af] hover:bg-[#333] hover:text-white"
                      )}
                    >
                      {getCategoryIcon(category.id)}
                      <span className="ml-1">{category.name}</span>
                      <Badge variant="secondary" className="ml-2 h-4 text-xs px-1">
                        {category.count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTools.map((tool) => {
                    const IconComponent = tool.icon
                    const isDisabled = tool.status === 'coming-soon' || tool.status === 'unavailable'
                    
                    return (
                      <div
                        key={tool.id}
                        className={cn(
                          "rounded-lg border p-4 transition-all hover:shadow-md",
                          getCategoryColor(tool.category),
                          isDisabled && "opacity-60"
                        )}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="mt-0.5">
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-white text-sm leading-tight">
                                {tool.name}
                              </h4>
                              {getStatusBadge(tool.status)}
                            </div>
                            {tool.frequency && (
                              <p className="text-xs text-blue-300 mb-1">
                                {tool.frequency}
                              </p>
                            )}
                            <p className="text-[#9ca3af] text-xs leading-relaxed mb-2">
                              {tool.description}
                            </p>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {tool.features.slice(0, 3).map((feature, index) => (
                                <Badge 
                                  key={index} 
                                  variant="outline" 
                                  className="text-xs px-2 py-0.5 text-[#9ca3af] border-[#333]"
                                >
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                            {tool.status === 'unavailable' && tool.requiresPlatforms && (
                              <p className="text-xs text-red-400 mb-2">
                                Requires: {tool.requiresPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => router.push(tool.href)}
                          disabled={isDisabled}
                          className={cn(
                            "w-full text-xs h-8",
                            isDisabled
                              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          )}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {tool.status === 'coming-soon' ? 'Coming Soon' : 
                           tool.status === 'unavailable' ? 'Connect Platform' :
                           tool.status === 'scheduled' ? 'View Settings' : 'Launch Tool'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 