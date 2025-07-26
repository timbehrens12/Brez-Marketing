"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { UnifiedLoading, pageLoadingConfig } from '@/components/ui/unified-loading'
import { useAgency } from '@/contexts/AgencyContext'
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
  Check,
  CheckCircle,
  Loader2,
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
  Tag,
  User,
  Volume,
  VolumeX,
  BellOff,
  Slash
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PlatformConnection } from '@/types/platformConnection'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useActionCenter } from '@/hooks/useActionCenter'

interface TodoItem {
  id: string
  type: 'responded' | 'hot_leads' | 'new_leads' | 'follow_up' | 'reports' | 'ai_recommendations'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  count: number
  action: string
  targetPage: string
  actionItems?: string[]
}

interface ReusableTool {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  targetPage: string
  dependencyType: 'user' | 'brand' | 'none'
  requiresPlatforms?: string[]
  status: 'available' | 'unavailable' | 'coming-soon'
}

const BASE_REUSABLE_TOOLS: Omit<ReusableTool, 'status'>[] = [
  {
    id: 'campaign-optimizer',
    name: 'Campaign Optimizer',
    description: 'AI-powered campaign optimization and budget recommendations',
    icon: TrendingUp,
    targetPage: '/analytics',
    dependencyType: 'brand',
    requiresPlatforms: ['meta']
  },
  {
    id: 'lead-generator',
    name: 'Lead Generator',
    description: 'Generate high-quality leads with AI-powered prospecting',
    icon: Target,
    targetPage: '/lead-generator',
    dependencyType: 'user'
  },
  {
    id: 'outreach-tool',
    name: 'Outreach Tool',
    description: 'Manage and automate your lead outreach campaigns',
    icon: Send,
    targetPage: '/outreach-tool',
    dependencyType: 'user'
  },
  {
    id: 'marketing-assistant',
    name: 'Marketing Assistant',
    description: 'AI-powered marketing insights and recommendations',
    icon: Brain,
    targetPage: '/marketing-assistant',
    dependencyType: 'brand',
    requiresPlatforms: ['meta']
  },
  {
    id: 'brand-reports',
    name: 'Brand Reports',
    description: 'Comprehensive performance reports and analytics',
    icon: FileBarChart,
    targetPage: '/brand-report',
    dependencyType: 'brand',
    requiresPlatforms: ['meta', 'shopify']
  },
  {
    id: 'ad-creative-studio',
    name: 'Ad Creative Studio',
    description: 'AI-powered ad creative generation and testing',
    icon: Palette,
    targetPage: '/ad-creative-studio',
    dependencyType: 'none'
  }
]

interface TaskState {
  snoozed: boolean
  snoozeUntil?: Date
  completed: boolean
  completedAt?: Date
  dismissed: boolean
  dismissedAt?: Date
}

export default function ActionCenterPage() {
  const { userId, getToken } = useAuth()
  const router = useRouter()
  const { brands: contextBrands, loading: brandsLoading } = useBrandContext()
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [taskStates, setTaskStates] = useState<{ [key: string]: TaskState }>({})
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [mutedNotifications, setMutedNotifications] = useState<{[key: string]: boolean}>({})
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all')
  const [readBrandReports, setReadBrandReports] = useState<{[key: string]: boolean}>({})
  const [brandSynopsisCache, setBrandSynopsisCache] = useState<{[key: string]: string}>({})

  // User-dependent data for tool availability
  const [userLeadsCount, setUserLeadsCount] = useState(0)
  const [userCampaignsCount, setUserCampaignsCount] = useState(0)
  const [userUsageData, setUserUsageData] = useState<any[]>([])
  const [isLoadingUserData, setIsLoadingUserData] = useState(false)
  const { agencySettings: agencyContext } = useAgency()
  const [agencySettingsState, setAgencySettingsState] = useState<{
    agency_name?: string
    agency_logo_url?: string | null
  } | null>(null)

  // Add action center hook to trigger notification refresh when page loads
  const { refreshCounts } = useActionCenter()

  // Use brands from context
  const brands = contextBrands || []

  // Platform connections state
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [isLoadingConnections, setIsLoadingConnections] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all')

  // Stable Supabase client function - memoize with minimal dependencies
  const getSupabaseClient = useCallback(async () => {
    try {
      const token = await getToken({ template: 'supabase' })
      console.log('[Action Center] 🔗 Getting Supabase client...')

      if (token) {
        console.log('[Action Center] ✅ Using authenticated client')
        return getAuthenticatedSupabaseClient(token)
      } else {
        console.log('[Action Center] ⚠️ No token, using standard client')
        return getStandardSupabaseClient()
      }
    } catch (error) {
      console.error('[Action Center] ❌ Error getting client:', error)
      return getStandardSupabaseClient()
    }
  }, [getToken])

  // Load user-dependent data for tool availability - stable version
  const loadUserData = useCallback(async () => {
    if (!userId) return
    
    setIsLoadingUserData(true)
    console.log('[Action Center] Loading user data for availability checks...')
    
    try {
      const supabase = await getSupabaseClient()
      
      // Load user data in parallel
      const [leadsResponse, campaignsResponse, usageResponse, agencyResponse] = await Promise.all([
        // Get user's leads count
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Get user's campaigns count  
        supabase
          .from('outreach_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Get user's usage data
        supabase
          .from('user_usage')
          .select('*')
          .eq('user_id', userId),
        
        // Get agency settings
        supabase
          .from('agency_settings')
          .select('agency_name, agency_logo_url')
          .eq('user_id', userId)
          .single()
      ])

      // Handle leads count
      if (leadsResponse.error) {
        console.error('[Action Center] Error loading leads:', leadsResponse.error)
      } else {
        setUserLeadsCount(leadsResponse.count || 0)
        console.log(`[Action Center] User has ${leadsResponse.count || 0} leads`)
      }

      // Handle campaigns count
      if (campaignsResponse.error) {
        console.error('[Action Center] Error loading campaigns:', campaignsResponse.error)
      } else {
        setUserCampaignsCount(campaignsResponse.count || 0)
        console.log(`[Action Center] User has ${campaignsResponse.count || 0} campaigns`)
      }

      // Handle usage data
      if (usageResponse.error) {
        console.error('[Action Center] Error loading usage:', usageResponse.error)
      } else {
        setUserUsageData(usageResponse.data || [])
        console.log('[Action Center] User usage data:', usageResponse.data)
      }

      // Handle agency settings
      if (agencyResponse.error) {
        console.error('[Action Center] Error loading agency settings:', agencyResponse.error)
      } else {
        setAgencySettingsState(agencyResponse.data)
        console.log('[Action Center] Agency settings:', agencyResponse.data)
      }

    } catch (error) {
      console.error('[Action Center] Error loading user data:', error)
    } finally {
      setIsLoadingUserData(false)
    }
  }, [userId, getSupabaseClient])

  // Load platform connections for brands from context - stable version
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
  }, [userId, brands, getSupabaseClient])

  // Get tool availability for a specific brand
  const getToolAvailability = (tool: Omit<ReusableTool, 'status'>, brandId: string): ReusableTool => {
    console.log(`[Action Center] Checking availability for ${tool.name}:`, {
      toolId: tool.id,
      dependencyType: tool.dependencyType,
      selectedBrandId: brandId,
      userLeadsCount,
      userCampaignsCount,
      userUsageData: userUsageData.length,
      connectionsLength: connections.length
    })

    switch (tool.dependencyType) {
      case 'user':
        // User-dependent tools
        if (tool.id === 'lead-generator') {
          // Check weekly usage limit
          const WEEKLY_LIMIT = 5
          const currentWeeklyUsage = userUsageData.reduce((sum, record) => sum + (record.generation_count || 0), 0)
          const isAvailable = currentWeeklyUsage < WEEKLY_LIMIT
          console.log(`[Action Center] Lead Generator: ${isAvailable ? 'Available' : 'Unavailable'} (usage: ${currentWeeklyUsage}/${WEEKLY_LIMIT})`)
          return { ...tool, status: isAvailable ? 'available' : 'unavailable' }
        }
        
        if (tool.id === 'outreach-tool') {
          const hasLeads = userLeadsCount > 0
          console.log(`[Action Center] Outreach Tool: ${hasLeads ? 'Available' : 'Unavailable'} (hasLeads: ${hasLeads})`)
          return { ...tool, status: hasLeads ? 'available' : 'unavailable' }
        }

        return { ...tool, status: 'available' }

      case 'brand':
        // Brand-dependent tools - check platform connections for the brand
        if (!tool.requiresPlatforms || tool.requiresPlatforms.length === 0) {
          console.log(`[Action Center] ${tool.name}: Available (no platform requirements)`)
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
          console.log(`[Action Center] ${tool.name}: ${hasAnyBrandWithPlatforms ? 'Available' : 'Unavailable'} (any brand has platforms)`)
          return { ...tool, status: hasAnyBrandWithPlatforms ? 'available' : 'unavailable' }
        }

        // Check specific brand
        const brandConnections = connections.filter(conn => conn.brand_id === brandId)
        const hasRequiredPlatforms = tool.requiresPlatforms.every(platform => 
          brandConnections.some(conn => conn.platform_type === platform)
        )

        console.log(`[Action Center] ${tool.name}: ${hasRequiredPlatforms ? 'Available' : 'Unavailable'} (specific brand has platforms)`, {
          brandConnections: brandConnections.length,
          requiredPlatforms: tool.requiresPlatforms,
          hasRequiredPlatforms
        })

        return { ...tool, status: hasRequiredPlatforms ? 'available' : 'unavailable' }

      case 'none':
        // Tools with no dependencies
        if (tool.id === 'ad-creative-studio') {
          console.log(`[Action Center] ${tool.name}: Coming soon`)
          return { ...tool, status: 'coming-soon' }
        }
        return { ...tool, status: 'available' }

      default:
        console.log(`[Action Center] ${tool.name}: Unavailable (unknown dependency type)`)
        return { ...tool, status: 'unavailable' }
    }
  }

  // Memoize tools with availability status to prevent recalculation on every render
  const reusableTools = useMemo((): ReusableTool[] => {
    // Don't calculate availability if still loading critical data
    if (isLoadingConnections || isLoadingUserData) {
      console.log('[Action Center] Still loading data, showing all tools as unavailable temporarily')
      return BASE_REUSABLE_TOOLS.map(tool => ({ ...tool, status: 'unavailable' as const }))
    }

    console.log('[Action Center] All data loaded, calculating real availability...')
    return BASE_REUSABLE_TOOLS.map(tool => getToolAvailability(tool, selectedBrandId))
  }, [isLoadingConnections, isLoadingUserData, selectedBrandId, userLeadsCount, userCampaignsCount, userUsageData, connections, brands])

  // Get brand connections for display
  const getBrandConnections = (brandId: string) => {
    return connections.filter(conn => conn.brand_id === brandId)
  }

  // Load task states from localStorage
  const loadTaskStates = useCallback(() => {
    if (!userId) return
    try {
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
    } catch (error) {
      console.error('Error loading task states:', error)
    }
  }, [userId])

  // Save task states to localStorage
  const saveTaskStates = useCallback((states: { [key: string]: TaskState }) => {
    if (!userId) return
    try {
      localStorage.setItem(`actionCenter_taskStates_${userId}`, JSON.stringify(states))
      setTaskStates(states)
    } catch (error) {
      console.error('Error saving task states:', error)
    }
  }, [userId])

  // Check if a task is active (not completed, dismissed, or snoozed)
  const isTaskActive = useCallback((taskId: string): boolean => {
    const state = taskStates[taskId]
    if (!state) return true

    // Check if completed
    if (state.completed) return false

    // Check if dismissed
    if (state.dismissed) return false

    // Check if snoozed
    if (state.snoozed && state.snoozeUntil && new Date() < state.snoozeUntil) return false

    return true
  }, [taskStates])

  // Generate todos from outreach data
  const generateTodos = useCallback(async () => {
    if (!userId) return

    try {
      const supabase = await getSupabaseClient()
      console.log('[Action Center] Loading outreach data for user:', userId)

      // Get campaigns for this user
      const { data: campaigns, error: campaignsError } = await supabase
        .from('outreach_campaigns')
        .select('*')
        .eq('user_id', userId)

      if (campaignsError) {
        console.error('[Action Center] Error loading campaigns:', campaignsError)
        return
      }

      // Get leads for all campaigns
      const campaignIds = campaigns?.map(c => c.id) || []
      if (campaignIds.length === 0) {
        setTodos([])
        return
      }

      const { data: leads, error: leadsError } = await supabase
        .from('outreach_campaign_leads')
        .select('*')
        .in('campaign_id', campaignIds)

      if (leadsError) {
        console.error('[Action Center] Error loading leads:', leadsError)
        return
      }

      console.log('[Action Center] Found campaign leads:', leads?.length || 0)

      // Categorize leads
      const pendingLeads = leads?.filter(l => l.status === 'pending') || []
      const contactedLeads = leads?.filter(l => l.status === 'contacted') || []
      const respondedLeads = leads?.filter(l => l.status === 'responded') || []
      const qualifiedLeads = leads?.filter(l => l.status === 'qualified') || []

      console.log('[Action Center] Lead counts:', {
        pending: pendingLeads.length,
        contacted: contactedLeads.length,
        responded: respondedLeads.length,
        qualified: qualifiedLeads.length,
        total: leads?.length || 0
      })

      // Get leads that need follow-up (contacted > 3 days ago)
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      
      const needsFollowUp = contactedLeads.filter(cl => {
        if (!cl.last_contacted_at) return false
        return new Date(cl.last_contacted_at) < threeDaysAgo
      })
      
      // Get leads going cold (contacted > 7 days ago)
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

      // Generate todos
      const newTodos: TodoItem[] = []

      if (pendingLeads.length > 0) {
        newTodos.push({
          id: 'new_leads',
          type: 'new_leads',
          priority: 'high',
          title: 'Contact New Leads',
          description: `You have ${pendingLeads.length} new leads waiting for initial contact`,
          count: pendingLeads.length,
          action: 'Start Outreach',
          targetPage: '/outreach-tool',
          actionItems: pendingLeads.slice(0, 3).map(lead => `${lead.company_name || 'Lead'} - ${lead.contact_email}`)
        })
      }

      if (respondedLeads.length > 0) {
        newTodos.push({
          id: 'responded',
          type: 'responded',
          priority: 'high',
          title: 'Follow Up on Responses',
          description: `${respondedLeads.length} leads have responded and need follow-up`,
          count: respondedLeads.length,
          action: 'Review Responses',
          targetPage: '/outreach-tool',
          actionItems: respondedLeads.slice(0, 3).map(lead => `${lead.company_name || 'Lead'} responded`)
        })
      }

      if (qualifiedLeads.length > 0) {
        newTodos.push({
          id: 'qualified',
          type: 'hot_leads',
          priority: 'high',
          title: 'Close Qualified Leads',
          description: `${qualifiedLeads.length} qualified leads ready for closing`,
          count: qualifiedLeads.length,
          action: 'Close Deals',
          targetPage: '/outreach-tool',
          actionItems: qualifiedLeads.slice(0, 3).map(lead => `${lead.company_name || 'Lead'} - Qualified`)
        })
      }

      if (needsFollowUp.length > 0) {
        newTodos.push({
          id: 'follow_up',
          type: 'follow_up',
          priority: 'medium',
          title: 'Follow Up Needed',
          description: `${needsFollowUp.length} leads need follow-up (contacted 3+ days ago)`,
          count: needsFollowUp.length,
          action: 'Send Follow-up',
          targetPage: '/outreach-tool',
          actionItems: needsFollowUp.slice(0, 3).map(lead => `${lead.company_name || 'Lead'} - Follow up needed`)
        })
      }

      if (goingCold.length > 0) {
        newTodos.push({
          id: 'going_cold',
          type: 'follow_up',
          priority: 'high',
          title: 'Leads Going Cold',
          description: `${goingCold.length} leads haven't been contacted in 7+ days`,
          count: goingCold.length,
          action: 'Re-engage',
          targetPage: '/outreach-tool',
          actionItems: goingCold.slice(0, 3).map(lead => `${lead.company_name || 'Lead'} - Going cold`)
        })
      }

      console.log('[Action Center] Generated todos:', newTodos.length)
      console.log('[Action Center] Todos:', newTodos)
      setTodos(newTodos)

    } catch (error) {
      console.error('[Action Center] Error generating todos:', error)
    }
  }, [userId, getSupabaseClient])

  // Load data - using refs to avoid dependency loops
  const loadingRef = useRef(false)
  
  useEffect(() => {
    const loadData = async () => {
      if (loadingRef.current) return // Prevent concurrent loads
      
      loadingRef.current = true
      setIsDataLoading(true)
      
      try {
        // Load ALL data in parallel and wait for everything to complete
        await Promise.all([
          generateTodos(),
          loadUserData(),
          loadConnections()
        ])
        
        // Trigger notification refresh after data is loaded to update sidebar immediately
        if (refreshCounts) {
          refreshCounts()
        }
        
      } finally {
        // Only set loading to false after ALL data is loaded
        setIsDataLoading(false)
        loadingRef.current = false
      }
    }

    if (userId && !loadingRef.current) {
      loadData()
    }
  }, [userId, brands.length, refreshCounts]) // Include refreshCounts in dependencies

  // Filter active todos (same logic as simple-todos)
  const activeTodos = todos.filter(todo => isTaskActive(todo.id))

  // Load task states on mount
  useEffect(() => {
    loadTaskStates()
  }, [loadTaskStates])

  // Get icons and colors (same as simple-todos)
  const getPriorityColor = (priority: string) => {
    switch (priority) {
          case 'high': return 'border-[#333] bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] shadow-lg'
    case 'medium': return 'border-[#333] bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] shadow-lg'
    case 'low': return 'border-[#333] bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] shadow-lg'
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

  // Task actions (same as simple-todos)
  const completeTask = (taskId: string) => {
    const newStates = {
      ...taskStates,
      [taskId]: {
        ...taskStates[taskId],
        completed: true,
        completedAt: new Date(),
        snoozed: false,
        dismissed: false
      }
    }
    saveTaskStates(newStates)
  }

  const snoozeTask = (taskId: string, duration: 'hour' | 'day' | 'week') => {
    const snoozeUntil = new Date()
    switch (duration) {
      case 'hour':
        snoozeUntil.setHours(snoozeUntil.getHours() + 1)
        break
      case 'day':
        snoozeUntil.setDate(snoozeUntil.getDate() + 1)
        break
      case 'week':
        snoozeUntil.setDate(snoozeUntil.getDate() + 7)
        break
    }

    const newStates = {
      ...taskStates,
      [taskId]: {
        ...taskStates[taskId],
        snoozed: true,
        snoozeUntil,
        completed: false,
        dismissed: false
      }
    }
    saveTaskStates(newStates)
  }

  const dismissTask = (taskId: string) => {
    const newStates = {
      ...taskStates,
      [taskId]: {
        ...taskStates[taskId],
        dismissed: true,
        dismissedAt: new Date(),
        snoozed: false,
        completed: false
      }
    }
    saveTaskStates(newStates)
  }

  // Handle tool click
  const handleToolClick = (tool: ReusableTool) => {
    if (tool.status === 'available') {
      router.push(tool.targetPage)
    }
  }

  const getStatusBadge = (status: ReusableTool['status']) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">Available</Badge>
      case 'unavailable':
        return <Badge variant="destructive">Unavailable</Badge>
      case 'coming-soon':
        return <Badge variant="secondary">Coming Soon</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const renderBrandIcons = (tool: ReusableTool) => {
    if (tool.dependencyType === 'user') {
      // User-dependent tools - show user icon
      return (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#4A5568] flex items-center justify-center border border-[#444]">
            <User className="h-3 w-3 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">User Dependent</span>
            <span className="text-xs font-medium text-blue-400">Personal Tool</span>
          </div>
        </div>
      )
    }

    if (tool.dependencyType === 'brand' && tool.requiresPlatforms) {
      // Brand-dependent tools - show brand avatars for available brands
      const brandsToShow = brands.slice(0, 4) // Limit to 4 brands for display
      const availableBrands = brandsToShow.filter((brand: any) => {
        const brandConnections = connections.filter(conn => conn.brand_id === brand.id)
        return tool.requiresPlatforms!.every(platform => 
          brandConnections.some(conn => conn.platform_type === platform)
        )
      })

      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-1">
            {brandsToShow.map((brand: any) => {
              const isAvailable = availableBrands.some(ab => ab.id === brand.id)
              const brandInitials = brand.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
              
              return (
                <div key={brand.id} className="relative group">
                  {brand.image_url ? (
                    <div className={`w-6 h-6 rounded-full border-2 border-[#1A1A1A] overflow-hidden flex-shrink-0 ${
                      isAvailable ? 'opacity-100' : 'opacity-50 grayscale'
                    }`}>
                      <img 
                        src={brand.image_url} 
                        alt={brand.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold border border-[#444] flex-shrink-0 ${
                      isAvailable ? 'bg-[#4A5568] text-white' : 'bg-gray-400 text-white'
                    }`}>
                      {brandInitials}
                    </div>
                  )}
                  {isAvailable && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1A1A1A]"></div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#1A1A1A] text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-[#333]">
                    {brand.name}: {isAvailable ? 'Available' : 'Missing Platform'}
                  </div>
                </div>
              )
            })}
            {brandsToShow.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[9px] font-semibold border border-[#444] text-white flex-shrink-0">
                +{brandsToShow.length - 3}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">Brand Dependent</span>
            <span className={`text-xs font-medium ${availableBrands.length > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {availableBrands.length > 0 ? `${availableBrands.length} Available` : 'Missing Platforms'}
            </span>
          </div>
        </div>
      )
    }

    if (tool.dependencyType === 'none') {
      // No dependencies - show generic icon
      return (
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-5 h-5 rounded-full bg-[#4A5568] flex items-center justify-center border border-[#444]">
              <tool.icon className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">No Dependencies</span>
            <span className="text-xs font-medium text-gray-300">Universal Access</span>
          </div>
        </div>
      )
    }

    return null
  }

  if (isDataLoading) {
    return (
      <UnifiedLoading 
        isLoading={true} 
        config={pageLoadingConfig}
        loadingText="Loading Action Center..."
      />
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333]">
              <Zap className="h-8 w-8 text-blue-400" />
            </div>
            Action Center
          </h1>
          <p className="text-gray-400">Your personalized dashboard for marketing tasks and tools</p>
        </div>

        {/* Action Items (Todos) */}
        {activeTodos.length > 0 && (
          <Card className="mb-6 border-[#333] bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] shadow-lg">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Action Items ({activeTodos.length})
              </CardTitle>
              <CardDescription className="text-gray-400">
                Tasks requiring your immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all hover:shadow-md",
                      getPriorityColor(todo.priority)
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getTypeIcon(todo.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-white">{todo.title}</h3>
                            <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                              {todo.count}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{todo.description}</p>
                          
                          {todo.actionItems && todo.actionItems.length > 0 && (
                            <div className="space-y-1">
                              {todo.actionItems.map((item, index) => (
                                <div key={index} className="text-xs text-gray-500 flex items-center gap-1">
                                  <div className="w-1 h-1 bg-gray-500 rounded-full" />
                                  {item}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => router.push(todo.targetPage)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {todo.action}
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => completeTask(todo.id)}>
                              <Check className="h-4 w-4 mr-2" />
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => snoozeTask(todo.id, 'hour')}>
                              <Clock className="h-4 w-4 mr-2" />
                              Snooze 1 Hour
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => snoozeTask(todo.id, 'day')}>
                              <Clock className="h-4 w-4 mr-2" />
                              Snooze 1 Day
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => dismissTask(todo.id)}>
                              <Slash className="h-4 w-4 mr-2" />
                              Dismiss
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reusable Tools Grid */}
        <Card className="border-[#333] bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] shadow-lg">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Available Tools
            </CardTitle>
            <CardDescription className="text-gray-400">
              Marketing tools and features available to you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reusableTools.map((tool) => (
                <div
                  key={tool.id}
                  onClick={() => handleToolClick(tool)}
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    "border-[#333] bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]",
                    tool.status === 'available' 
                      ? "hover:shadow-lg hover:border-blue-500/50 cursor-pointer" 
                      : "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <tool.icon className={cn(
                      "h-6 w-6",
                      tool.status === 'available' ? "text-blue-400" : "text-gray-500"
                    )} />
                    {getStatusBadge(tool.status)}
                  </div>
                  
                  <h3 className="font-medium text-white mb-2">{tool.name}</h3>
                  <p className="text-sm text-gray-400 mb-3">{tool.description}</p>
                  
                  {/* Brand/User Dependencies */}
                  {renderBrandIcons(tool)}
                  
                  {tool.status === 'available' && (
                    <div className="mt-3 pt-3 border-t border-[#333]">
                      <div className="flex items-center gap-1 text-xs text-blue-400">
                        <ExternalLink className="h-3 w-3" />
                        Click to open
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 