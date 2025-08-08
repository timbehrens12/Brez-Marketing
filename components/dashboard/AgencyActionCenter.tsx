"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@clerk/nextjs'
import { getAuthenticatedSupabaseClient, getStandardSupabaseClient } from '@/lib/utils/unified-supabase'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { 
  CheckSquare, 
  Clock, 
  MessageSquare, 
  Star, 
  Send,
  ExternalLink,
  CheckCircle,
  Loader2,
  Check,
  RefreshCw,
  BarChart3,
  Volume,
  VolumeX,
  BellOff,
  Slash,
  ChevronDown,
  Filter,
  Tag,
  User,
  Calendar,
  TrendingUp,
  // New icons for tools
  Brain,
  Zap,
  Target,
  FileBarChart,
  Palette,
  Settings,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
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
import { useSimpleNotifications } from '@/hooks/useSimpleNotifications'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useAgency } from '@/contexts/AgencyContext'

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

interface TaskState {
  [key: string]: {
    status: 'pending' | 'snoozed' | 'completed' | 'dismissed'
    snoozeUntil?: Date
    completedAt?: Date
    dismissedAt?: Date
  }
}

interface ReusableTool {
  id: string
  name: string
  description: string
  icon: any
  category: 'automation' | 'ai-powered' | 'analytics' | 'tools'
  status: 'available' | 'coming-soon' | 'unavailable'
  href: string
  features: string[]
  frequency?: string
  requiresPlatforms?: ('meta' | 'shopify')[]
  requiresData?: boolean
  dependencyType: 'user' | 'brand' | 'none'
}

const BASE_REUSABLE_TOOLS: Omit<ReusableTool, 'status'>[] = [
  {
    id: 'campaign-optimizer',
    name: 'Campaign Optimizer',
    description: 'AI-powered campaign optimization and performance insights',
    icon: Target,
    category: 'ai-powered',
    href: '/marketing-assistant',
    features: ['Performance Analysis', 'Budget Optimization', 'Ad Set Recommendations'],
    requiresPlatforms: ['meta'],
    requiresData: true,
    dependencyType: 'brand',
    frequency: '3 per brand'
  },
  {
    id: 'lead-generator',
    name: 'Lead Generator',
    description: 'Find and qualify leads using real business data',
    icon: Zap,
    category: 'tools',
    href: '/lead-generator',
    features: ['Google Places Integration', 'Lead Scoring', 'Business Intelligence'],
    dependencyType: 'user',
    frequency: '1 per week'
  },
  {
    id: 'outreach-tool',
    name: 'Outreach Tool',
    description: 'Manage lead outreach campaigns and follow-ups',
    icon: Send,
    category: 'tools',
    href: '/outreach-tool',
    features: ['Campaign Management', 'Lead Tracking', 'Response Management'],
    dependencyType: 'user'
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
    requiresData: true,
    dependencyType: 'brand'
  },
  {
    id: 'brand-reports',
    name: 'Brand Reports',
    description: 'Generate comprehensive performance reports',
    icon: FileBarChart,
    category: 'analytics',
    href: '/brand-report',
    features: ['Performance Reports', 'AI-Generated Insights', 'Export Options'],
    requiresPlatforms: ['meta'],
    requiresData: true,
    dependencyType: 'brand',
    frequency: 'Daily & Monthly'
  },
  {
    id: 'ad-creative-studio',
    name: 'Ad Creative Studio',
    description: 'AI-powered creative generation for ad campaigns',
    icon: Palette,
    category: 'ai-powered',
    href: '/ad-creative-studio',
    features: ['AI Image Generation', 'Background Replacement', 'Template Library'],
    requiresPlatforms: [],
    requiresData: false,
    dependencyType: 'brand',
    frequency: '10 per week'
  }
]

interface AgencyActionCenterProps {
  dateRange?: {
    from: Date
    to: Date
  }
  onLoadingStateChange?: (isLoading: boolean) => void
}

export function AgencyActionCenter({ dateRange, onLoadingStateChange }: AgencyActionCenterProps) {
  const { userId, getToken } = useAuth()
  const router = useRouter()
  const { brands: contextBrands } = useBrandContext()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [taskStates, setTaskStates] = useState<TaskState>({})
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isLoadingConnections, setIsLoadingConnections] = useState(true)
  
  // Muted notifications state
  const [mutedNotifications, setMutedNotifications] = useState<{[key: string]: boolean}>({})
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all')

  // Brand health read state
  const [readBrandReports, setReadBrandReports] = useState<{[key: string]: boolean}>({})

  // User-dependent data for tool availability
  const [userLeadsCount, setUserLeadsCount] = useState(0)
  const [userCampaignsCount, setUserCampaignsCount] = useState(0)
  const [userUsageData, setUserUsageData] = useState<any[]>([])
  const [isLoadingUserData, setIsLoadingUserData] = useState(true)
  
  // Tool usage tracking
  const [toolUsageData, setToolUsageData] = useState<{
    campaignOptimizer: { [brandId: string]: number }
    brandReports: { [brandId: string]: { daily?: string, monthly?: string } }
    creativeStudio: { [brandId: string]: { count: number, weekStart: string } }
  }>({
    campaignOptimizer: {},
    brandReports: {},
    creativeStudio: {}
  })

  // Refresh functionality with cooldown
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { agencySettings: agencyContext } = useAgency()
  const [agencySettingsState, setAgencySettingsState] = useState<{
    agency_name?: string
    agency_logo_url?: string | null
  } | null>(null)

  // Add action center hook to trigger notification refresh when page loads
  const { refresh, actionCenterCounts, lastUpdated } = useSimpleNotifications()
  
  // Get direct notification store actions for real-time updates
  const { markBrandHealthRead, decrementTodo } = useNotificationStore()
  
  // Simple logging when notification counts change (no forced re-renders)
  useEffect(() => {
    if (actionCenterCounts && actionCenterCounts.totalItems > 0) {
      console.log('[Agency Center] 📱 Notification counts loaded:', actionCenterCounts.totalItems)
    }
  }, [actionCenterCounts.totalItems]) // Only trigger when the actual count changes

  // Brand Health data state
  const [brandHealthData, setBrandHealthData] = useState<any[]>([])
  const [isLoadingBrandHealth, setIsLoadingBrandHealth] = useState(true)
  
  // Track overall loading state and notify parent
  useEffect(() => {
    const isOverallLoading = isLoadingConnections || isLoadingUserData || isLoadingBrandHealth || isRefreshing
    onLoadingStateChange?.(isOverallLoading)
  }, [isLoadingConnections, isLoadingUserData, isLoadingBrandHealth, isRefreshing, onLoadingStateChange])

  // Loading ref
  const loadingRef = useRef(false)
  const initialLoadRef = useRef(false)
  const connectionsLoadedRef = useRef(false)
  const brandHealthLoadingRef = useRef(false)
  const userDataLoadingRef = useRef(false)
  const todosLoadingRef = useRef(false)
  
  // Add widget loading states (main loading moved to dashboard level)
  const [isWidgetLoading, setIsWidgetLoading] = useState({
    brandHealth: true,
    reusableTools: true,
    quickActions: true
  })

  // Use brands from context
  const brands = contextBrands || []

  // Stable Supabase client function
  const getSupabaseClient = useCallback(async () => {
    try {
      const token = await getToken({ template: 'supabase' })
      if (token) {
        return getAuthenticatedSupabaseClient(token)
      } else {
        return getStandardSupabaseClient()
      }
    } catch (error) {
      console.error('[Agency Center] Error getting client:', error)
      return getStandardSupabaseClient()
    }
  }, [getToken])

  // Generate todos from outreach data and other sources (exactly like action center)
  const generateTodos = useCallback(async () => {
    if (!userId) return

    // Prevent duplicate loading
    if (todosLoadingRef.current) {
      console.log('[Todos] Already loading, skipping duplicate call')
      return
    }
    todosLoadingRef.current = true

    try {
      const supabase = await getSupabaseClient()
      const newTodos: TodoItem[] = []

      // Load campaign leads exactly like the outreach page does - as a flat array
      const { data: userCampaigns, error: campaignsError } = await supabase
        .from('outreach_campaigns')
        .select('id')
        .eq('user_id', userId)

      if (campaignsError) {
        console.error('[Agency Center] Error loading campaigns:', campaignsError)
        return
      }

      if (!userCampaigns || userCampaigns.length === 0) {
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
        console.error('[Agency Center] Error loading campaign leads:', error)
        return
      }

      if (!campaignLeads || campaignLeads.length === 0) {
        setTodos([])
        return
      }

      // Use EXACT same logic as SimpleTodos component
      // Count leads by status
      const pendingLeads = campaignLeads.filter(cl => cl.status === 'pending')
      const contactedLeads = campaignLeads.filter(cl => cl.status === 'contacted')
      const respondedLeads = campaignLeads.filter(cl => cl.status === 'responded')
      const qualifiedLeads = campaignLeads.filter(cl => cl.status === 'qualified')
      
      console.log('[Agency Center] Lead counts:', {
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

      console.log('[Agency Center] Follow-up counts:', {
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

      console.log('[Agency Center] Generated todos:', newTodos.length)
      console.log('[Agency Center] Todos:', newTodos)
      setTodos(newTodos)
    } catch (error) {
      console.error('[Agency Center] Error generating todos:', error)
    } finally {
      todosLoadingRef.current = false // Reset loading guard
    }
  }, [userId, getSupabaseClient])

  // Load platform connections for brands from context - stable version
  const loadConnections = useCallback(async () => {
    if (!userId || brands.length === 0) return
    
    // Prevent duplicate loading
    if (loadingRef.current) return
    loadingRef.current = true

    try {
      setIsLoadingConnections(true)
      const supabase = await getSupabaseClient()

      // Load platform connections for all brands from context
      const brandIds = brands.map((brand: any) => brand.id)
      console.log('[Agency Center] Loading connections for brands:', brandIds)
      
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('platform_connections')
        .select('*')
        .in('brand_id', brandIds)
        .eq('status', 'active')

      if (connectionsError) {
        console.error('[Agency Center] Error loading connections:', connectionsError)
      } else {
        console.log('[Agency Center] Loaded connections:', connectionsData?.length || 0)
        setConnections(connectionsData as PlatformConnection[] || [])
      }
    } catch (error) {
      console.error('[Agency Center] Error loading connections:', error)
    } finally {
      setIsLoadingConnections(false)
      loadingRef.current = false // Reset loading guard
    }
  }, [userId, brands, getSupabaseClient])

  // Load user data for tool availability
  const loadUserData = useCallback(async () => {
    if (!userId) return
    
    // Prevent duplicate loading
    if (userDataLoadingRef.current) {
      console.log('[UserData] Already loading, skipping duplicate call')
      return
    }
    userDataLoadingRef.current = true
    
    setIsLoadingUserData(true)
    
    try {
      const supabase = await getSupabaseClient()
      
      const [leadsResponse, campaignsResponse, usageResponse] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('outreach_campaigns').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('user_usage').select('*').eq('user_id', userId)
      ])

      // Fetch outreach usage via API to bypass RLS
      let outreachResponse
      try {
        console.log(`[Agency Center] DEBUG: Fetching outreach usage via API for userId: "${userId}"`)
        
        const response = await fetch('/api/outreach/usage', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const usageData = await response.json()
          console.log(`[Agency Center] DEBUG: Outreach API successful:`, usageData)
          
          // Extract daily count from the API response
          const dailyUsedCount = usageData.usage?.daily?.used || 0
          console.log(`[Agency Center] DEBUG: Daily outreach count from API: ${dailyUsedCount}`)
          
          // Create a fake data array to match existing logic expectations
          outreachResponse = {
            data: dailyUsedCount > 0 ? Array(dailyUsedCount).fill({ generated_at: new Date().toISOString() }) : [],
            error: null
          }
        } else {
          console.error(`[Agency Center] DEBUG: Outreach API failed with status:`, response.status)
          outreachResponse = { error: new Error(`API failed: ${response.status}`), data: null }
        }
      } catch (error) {
        console.error(`[Agency Center] DEBUG: Outreach API error:`, error)
        outreachResponse = { error, data: null }
      }

      if (!leadsResponse.error) {
        setUserLeadsCount(leadsResponse.count || 0)
      }

      if (!campaignsResponse.error) {
        setUserCampaignsCount(campaignsResponse.count || 0)
      }

      if (!usageResponse.error) {
        setUserUsageData(usageResponse.data || [])
      }

      // Process outreach usage data and add to userUsageData
      if (!outreachResponse.error && outreachResponse.data) {
        console.log(`[Agency Center] DEBUG: Raw outreach data:`, outreachResponse.data)
        
        // Group outreach messages by date and count them
        const outreachByDate = outreachResponse.data.reduce((acc: any, message: any) => {
          const date = new Date(message.generated_at).toISOString().split('T')[0]
          acc[date] = (acc[date] || 0) + 1
          return acc
        }, {})

        console.log(`[Agency Center] DEBUG: Outreach by date:`, outreachByDate)

        // Convert to format compatible with userUsageData
        const outreachUsageData = Object.entries(outreachByDate).map(([date, count]) => ({
          date,
          outreach_messages: count,
          user_id: userId
        }))

        console.log(`[Agency Center] DEBUG: Processed outreach usage data:`, outreachUsageData)

        // Merge with existing usage data
        setUserUsageData(prev => {
          const merged = [...(prev || []), ...outreachUsageData]
          console.log(`[Agency Center] DEBUG: Final merged userUsageData:`, merged)
          return merged
        })
      } else {
        console.log(`[Agency Center] DEBUG: Outreach response error or no data:`, outreachResponse.error, outreachResponse.data)
      }

    } catch (error) {
      console.error('[Agency Center] Error loading user data:', error)
    } finally {
      setIsLoadingUserData(false)
      userDataLoadingRef.current = false // Reset loading guard
    }
  }, [userId, getSupabaseClient])

  // Load tool usage data for all brands
  useEffect(() => {
    const loadToolUsageData = async () => {
      if (!userId || brands.length === 0) return

      try {
        const supabase = await getSupabaseClient()
        const newToolUsageData = {
          campaignOptimizer: {} as { [brandId: string]: number },
          brandReports: {} as { [brandId: string]: { daily?: string, monthly?: string } },
          creativeStudio: {} as { [brandId: string]: { count: number, weekStart: string } }
        }

        // Load AI usage tracking for campaign optimizer - USER BASED, not per brand
        let totalCampaignOptimizerUsage = 0
        try {
          // Try to get ALL campaign recommendations for this user across all brands
          const { data: aiUsageData } = await supabase
            .from('ai_usage_tracking')
            .select('usage_count, brand_id')
            .in('brand_id', brands.map(b => b.id))
            .eq('feature_type', 'campaign_recommendations')

          if (aiUsageData) {
            totalCampaignOptimizerUsage = aiUsageData.reduce((sum, record) => sum + (record.usage_count || 0), 0)
            console.log(`[Agency Center] Campaign Optimizer - TOTAL USER USAGE: ${totalCampaignOptimizerUsage}/3 used (user-based limit)`)
          }
        } catch (error) {
          console.log(`[Agency Center] Campaign Optimizer - RLS blocked, setting to 0`)
          totalCampaignOptimizerUsage = 0
        }

        // Set the SAME count for all brands (user-based limit)
        for (const brand of brands) {
          newToolUsageData.campaignOptimizer[brand.id] = totalCampaignOptimizerUsage
        }

        // Load brand report generation data from localStorage
        const today = format(new Date(), 'yyyy-MM-dd')
        const currentMonth = format(new Date(), 'yyyy-MM')
        
        brands.forEach(brand => {
          const dailyKey = `lastManualGeneration_${brand.id}`
          const monthlyKey = `lastMonthlyGeneration_${brand.id}`
          
          const dailyGenerated = localStorage.getItem(dailyKey)
          const monthlyGenerated = localStorage.getItem(monthlyKey)
          
          newToolUsageData.brandReports[brand.id] = {
            daily: dailyGenerated || undefined,
            monthly: monthlyGenerated || undefined
          }
        })

        // Load creative studio usage via API to bypass RLS
        const now = new Date()
        const startOfWeek = new Date(now)
        const dayOfWeek = now.getDay()
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        startOfWeek.setDate(now.getDate() - daysToSubtract)
        startOfWeek.setHours(0, 0, 0, 0)
        
        // Query ALL creative generations for the USER (across all brands) this week
        let totalWeeklyCreativeCount = 0
        try {
          // Get all generations for all brands for this user
          for (const brand of brands) {
            const response = await fetch(`/api/creative-generations?brandId=${brand.id}&userId=${userId}&limit=100`)
            if (response.ok) {
              const responseData = await response.json()
              console.log(`[Agency Center] DEBUG: Creative Studio API response for ${brand.name}:`, JSON.stringify(responseData, null, 2))
              
              const { creatives: generations } = responseData  // API returns "creatives", not "generations"
              
              // Filter for completed generations this week
              const weeklyGenerations = generations?.filter((gen: any) => {
                const genDate = new Date(gen.created_at)
                const isThisWeek = genDate >= startOfWeek
                const isCompleted = gen.status === 'completed'
                return isThisWeek && isCompleted
              }) || []
              
              totalWeeklyCreativeCount += weeklyGenerations.length
              console.log(`[Agency Center] Creative Studio - Brand ${brand.name}: ${weeklyGenerations.length} completed this week (total generations: ${generations?.length || 0})`)
            } else {
              const errorText = await response.text()
              console.error(`[Agency Center] Creative Studio API failed for brand ${brand.name}:`, response.status, errorText)
            }
          }
          
          // Set the SAME count for all brands (user-based limit, not per-brand)
          for (const brand of brands) {
            newToolUsageData.creativeStudio[brand.id] = {
              count: totalWeeklyCreativeCount,
              weekStart: startOfWeek.toISOString()
            }
          }
          
          console.log(`[Agency Center] Creative Studio - TOTAL USER USAGE: ${totalWeeklyCreativeCount}/10 used this week (user-based limit)`)
        } catch (error) {
          console.error(`[Agency Center] Creative Studio error:`, error)
          // Set 0 for all brands if error
          for (const brand of brands) {
            newToolUsageData.creativeStudio[brand.id] = {
              count: 0,
              weekStart: startOfWeek.toISOString()
            }
          }
        }

        setToolUsageData(newToolUsageData)
      } catch (error) {
        console.error('Error loading tool usage data:', error)
      }
    }

    loadToolUsageData()
  }, [userId, brands, getSupabaseClient])

  // Filter active todos
  const isTaskActive = (taskId: string) => {
    const state = taskStates[taskId]
    if (!state) return true
    if (state.status === 'snoozed' && state.snoozeUntil && state.snoozeUntil < new Date()) {
      return true
    }
    return state.status === 'pending'
  }

  const activeTodos = todos.filter(todo => isTaskActive(todo.id))

  // Task state update functions (same as Action Center page)
  const updateTaskState = useCallback((taskId: string, newState: { status: 'pending' | 'snoozed' | 'completed' | 'dismissed', snoozeUntil?: Date }) => {
    setTaskStates(prevStates => ({
      ...prevStates,
      [taskId]: {
        ...prevStates[taskId],
        ...newState,
        ...(newState.status === 'completed' && { completedAt: new Date() }),
        ...(newState.status === 'dismissed' && { dismissedAt: new Date() })
      }
    }))
  }, [])

  const markTaskComplete = useCallback((taskId: string) => {
    updateTaskState(taskId, { status: 'completed' })
    
    // Update notification store immediately for real-time UI updates
    decrementTodo()
    console.log('[Agency Center] 📱 Task marked as complete, notification count decreased:', taskId)
  }, [updateTaskState, decrementTodo])

  const markTaskDismissed = useCallback((taskId: string) => {
    updateTaskState(taskId, { status: 'dismissed' })
    console.log('[Agency Center] Task dismissed:', taskId)
  }, [updateTaskState])

  const snoozeTask = useCallback((taskId: string, hours: number = 24) => {
    const snoozeUntil = new Date()
    snoozeUntil.setHours(snoozeUntil.getHours() + hours)
    updateTaskState(taskId, { status: 'snoozed', snoozeUntil })
    console.log('[Agency Center] Task snoozed until:', taskId, snoozeUntil)
  }, [updateTaskState])

  // Get icons and colors for todos
  const getPriorityColor = (priority: string) => {
    return 'border-[#333] bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] shadow-lg'
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
      case 'high': return <Badge className="text-xs bg-red-600 text-white">High</Badge>
      case 'medium': return <Badge className="text-xs bg-orange-600 text-white">Medium</Badge>
      case 'low': return <Badge className="text-xs bg-gray-600 text-white">Low</Badge>
      default: return <Badge variant="outline" className="text-xs">Normal</Badge>
    }
  }

  // Helper function to render connection icons
  const renderConnectionIcons = (brandId: string) => {
    const brandConnections = connections.filter(conn => conn.brand_id === brandId)
    const hasConnections = brandConnections.length > 0
    
    if (!hasConnections) return null
    
    return (
      <div className="flex items-center gap-1">
        {brandConnections.map((conn, index) => {
          if (conn.platform_type === 'meta') {
            return (
              <div key={index} className="w-3 h-3 rounded-sm overflow-hidden border border-gray-500/40 bg-gray-600/15">
                <img 
                  src="https://i.imgur.com/VAR7v4w.png" 
                  alt="Meta" 
                  className="w-full h-full object-contain"
                />
              </div>
            )
          }
          if (conn.platform_type === 'shopify') {
            return (
              <div key={index} className="w-3 h-3 rounded-sm overflow-hidden border border-gray-500/40 bg-gray-600/15">
                <img 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify" 
                  className="w-full h-full object-contain"
                />
              </div>
            )
          }
          return null
        })}
      </div>
    )
  }



  // Tool availability logic with actual usage tracking
  const getToolAvailability = (tool: Omit<ReusableTool, 'status'>, brandId?: string): ReusableTool => {
    // Handle different dependency types
    switch (tool.dependencyType) {
      case 'none':
        // No dependencies, always available
        return { ...tool, status: 'available' }

      case 'user':
        // User-dependent tools - check user data regardless of selected brand
        if (tool.id === 'lead-generator') {
          // Lead generator has weekly usage limits
          const now = new Date()
          const startOfWeek = new Date(now)
          const dayOfWeek = now.getDay()
          const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          startOfWeek.setDate(now.getDate() - daysToSubtract)
          startOfWeek.setHours(0, 0, 0, 0)

          const startOfNextWeek = new Date(startOfWeek)
          startOfNextWeek.setDate(startOfWeek.getDate() + 7)

          // Check weekly usage from user data we already loaded
          const WEEKLY_LIMIT = 1 // 1 generation per week
          const currentWeeklyUsage = userUsageData?.reduce((sum: number, record: any) => {
            const recordDate = new Date(record.date)
            if (recordDate >= startOfWeek && recordDate < startOfNextWeek) {
              return sum + (record.generation_count || 0)
            }
            return sum
          }, 0) || 0

          const hasGenerationsLeft = currentWeeklyUsage < WEEKLY_LIMIT
          console.log(`[Agency Center] ${tool.name}: ${hasGenerationsLeft ? 'Available' : 'Unavailable'} (usage: ${currentWeeklyUsage}/${WEEKLY_LIMIT})`)
          return { 
            ...tool, 
            status: hasGenerationsLeft ? 'available' : 'unavailable'
          }
        }
        
        if (tool.id === 'outreach-tool') {
          // Outreach tool needs user to have leads AND be under daily limit (25/day)
          const hasLeads = userLeadsCount > 0 || userCampaignsCount > 0
          
          if (!hasLeads) {
            console.log(`[Agency Center] ${tool.name}: Unavailable (No leads to manage)`)
            return { ...tool, status: 'unavailable' }
          }
          
          // Check daily outreach message usage (25 per day limit)
          const today = new Date()
          const startOfToday = new Date(today)
          startOfToday.setHours(0, 0, 0, 0)
          
          // Count today's outreach messages from toolUsageData (will be loaded from database)
          const dailyOutreachCount = userUsageData?.reduce((sum: number, record: any) => {
            const recordDate = new Date(record.date)
            if (recordDate >= startOfToday) {
              return sum + (record.outreach_messages || 0)
            }
            return sum
          }, 0) || 0
          
          // DEBUG: Log all userUsageData to see what we have
          console.log(`[Agency Center] DEBUG userUsageData:`, userUsageData)
          console.log(`[Agency Center] DEBUG today's outreach records:`, userUsageData?.filter(record => {
            const recordDate = new Date(record.date)
            return recordDate >= startOfToday && record.outreach_messages
          }))
          
          const DAILY_LIMIT = 25
          const hasUsageLeft = dailyOutreachCount < DAILY_LIMIT
          console.log(`[Agency Center] ${tool.name}: ${hasUsageLeft ? 'Available' : 'Unavailable'} (usage: ${dailyOutreachCount}/${DAILY_LIMIT})`)
          return { 
            ...tool, 
            status: hasUsageLeft ? 'available' : 'unavailable'
          }
        }
        
        // Default for user-dependent tools
        return { ...tool, status: 'available' }

      case 'brand':
        // Brand-dependent tools - check actual usage and platform requirements
        
        // Campaign Optimizer - check AI usage tracking
        if (tool.id === 'campaign-optimizer') {
          if (!brandId || brandId === 'all') {
            // Check if ANY brand has available uses
            const hasAnyAvailable = brands.some((brand: any) => {
              const brandConnections = connections.filter(conn => conn.brand_id === brand.id)
              const hasMetaConnection = brandConnections.some(conn => conn.platform_type === 'meta')
              if (!hasMetaConnection) return false
              
              const usageCount = toolUsageData.campaignOptimizer[brand.id] || 0
              return usageCount < 3 // 3 uses per brand
            })
            return { ...tool, status: hasAnyAvailable ? 'available' : 'unavailable' }
          } else {
            // Check specific brand
            const brandConnections = connections.filter(conn => conn.brand_id === brandId)
            const hasMetaConnection = brandConnections.some(conn => conn.platform_type === 'meta')
            if (!hasMetaConnection) return { ...tool, status: 'unavailable' }
            
            const usageCount = toolUsageData.campaignOptimizer[brandId] || 0
            return { ...tool, status: usageCount < 3 ? 'available' : 'unavailable' }
          }
        }
        
        // Brand Reports - check localStorage for generation dates
        if (tool.id === 'brand-reports') {
          if (!brandId || brandId === 'all') {
            // Check if ANY brand has available reports
            const today = format(new Date(), 'yyyy-MM-dd')
            const currentMonth = format(new Date(), 'yyyy-MM')
            
            const hasAnyAvailable = brands.some((brand: any) => {
              const brandConnections = connections.filter(conn => conn.brand_id === brand.id)
              const hasMetaConnection = brandConnections.some(conn => conn.platform_type === 'meta')
              if (!hasMetaConnection) return false
              
              const brandReports = toolUsageData.brandReports[brand.id] || {}
              const dailyAvailable = brandReports.daily !== today
              const monthlyAvailable = brandReports.monthly !== currentMonth
              
              // DEBUG: Log the brand report status
              console.log(`[Agency Center] Brand Reports DEBUG - Brand ${brand.name}:`)
              console.log(`  Daily stored: "${brandReports.daily}" vs today: "${today}" = available: ${dailyAvailable}`)
              console.log(`  Monthly stored: "${brandReports.monthly}" vs month: "${currentMonth}" = available: ${monthlyAvailable}`)
              console.log(`  Final result: ${dailyAvailable || monthlyAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`)
              
              return dailyAvailable || monthlyAvailable
            })
            return { ...tool, status: hasAnyAvailable ? 'available' : 'unavailable' }
          } else {
            // Check specific brand
            const brandConnections = connections.filter(conn => conn.brand_id === brandId)
            const hasMetaConnection = brandConnections.some(conn => conn.platform_type === 'meta')
            if (!hasMetaConnection) return { ...tool, status: 'unavailable' }
            
            const today = format(new Date(), 'yyyy-MM-dd')
            const currentMonth = format(new Date(), 'yyyy-MM')
            const brandReports = toolUsageData.brandReports[brandId] || {}
            const dailyAvailable = brandReports.daily !== today
            const monthlyAvailable = brandReports.monthly !== currentMonth
            
            // DEBUG: Log specific brand report status
            console.log(`[Agency Center] Brand Reports - Specific Brand:`, {
              brandId,
              dailyStored: brandReports.daily,
              monthlyStored: brandReports.monthly,
              today,
              currentMonth,
              dailyAvailable,
              monthlyAvailable,
              finalStatus: (dailyAvailable || monthlyAvailable) ? 'available' : 'unavailable'
            })
            
            return { ...tool, status: (dailyAvailable || monthlyAvailable) ? 'available' : 'unavailable' }
          }
        }
        
        // Creative Studio - check weekly usage
        if (tool.id === 'ad-creative-studio') {
          if (!brandId || brandId === 'all') {
            // Check if ANY brand has available uses
            const hasAnyAvailable = brands.some((brand: any) => {
              const creativeData = toolUsageData.creativeStudio[brand.id] || { count: 0 }
              return creativeData.count < 10 // 10 per week
            })
            return { ...tool, status: hasAnyAvailable ? 'available' : 'unavailable' }
          } else {
            // Check specific brand
            const creativeData = toolUsageData.creativeStudio[brandId] || { count: 0 }
            return { ...tool, status: creativeData.count < 10 ? 'available' : 'unavailable' }
          }
        }
        
        // Marketing Assistant - always available if Meta connected
        if (tool.id === 'marketing-assistant') {
          if (!tool.requiresPlatforms || tool.requiresPlatforms.length === 0) {
            return { ...tool, status: 'available' }
          }

          if (!brandId || brandId === 'all') {
            const hasAnyBrandWithPlatforms = brands.some((brand: any) => {
              const brandConnections = connections.filter(conn => conn.brand_id === brand.id)
              return tool.requiresPlatforms!.every(platform => 
                brandConnections.some(conn => conn.platform_type === platform)
              )
            })
            return { ...tool, status: hasAnyBrandWithPlatforms ? 'available' : 'unavailable' }
          }

          const brandConnections = connections.filter(conn => conn.brand_id === brandId)
          const hasRequiredPlatforms = tool.requiresPlatforms.every(platform => 
            brandConnections.some(conn => conn.platform_type === platform)
          )

          return { ...tool, status: hasRequiredPlatforms ? 'available' : 'unavailable' }
        }
        
        // Default brand-dependent tools
        return { ...tool, status: 'unavailable' }

      default:
        return { ...tool, status: 'unavailable' }
    }
  }

  // Memoize tools with availability status to prevent recalculation on every render
  // Calculate tools but prevent recalculation during brand switches
  const reusableTools = useMemo((): ReusableTool[] => {
    // Don't calculate availability if still loading critical data
    if (isLoadingConnections || isLoadingUserData) {
      return BASE_REUSABLE_TOOLS.map(tool => ({ ...tool, status: 'unavailable' as const }))
    }

    // For agency-level tools, always check availability across all brands, not per-brand
    return BASE_REUSABLE_TOOLS.map(tool => getToolAvailability(tool, 'all'))
  }, [isLoadingConnections, isLoadingUserData, userLeadsCount, userCampaignsCount, userUsageData, connections, brands, toolUsageData])

  // Helper functions for categories and status (exactly like action center)
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
      case 'automation': return 'bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] text-gray-300 shadow-lg'
      case 'ai-powered': return 'bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] text-gray-300 shadow-lg'
      case 'analytics': return 'bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] text-gray-300 shadow-lg'
      case 'tools': return 'bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] text-gray-300 shadow-lg'
      default: return 'bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] text-gray-300 shadow-lg'
    }
  }

  const getStatusBadge = (tool: ReusableTool) => {
    if (tool.dependencyType === 'user') {
      // User-dependent tools - show agency logo with status
      return (
        <div className="flex items-center gap-2">
          <div className="relative">
            {agencyContext?.agency_logo_url ? (
              <div className="w-5 h-5 rounded-full overflow-hidden border border-[#444] bg-[#2A2A2A] flex items-center justify-center">
                <img 
                  src={agencyContext?.agency_logo_url} 
                  alt="Agency Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-[#4A5568] flex items-center justify-center border border-[#444]">
                <User className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            {tool.status === 'available' && (
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gray-400 rounded-full border border-[#1A1A1A]"></div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">User Dependent</span>
            <span className={`text-xs font-medium ${tool.status === 'available' ? 'text-green-400' : 'text-red-400'}`}>
              {tool.status === 'available' ? 'Available' : 
               tool.id === 'lead-generator' ? 'Weekly Limit Reached' :
               tool.id === 'outreach-tool' ? 'Daily Limit Reached' : 'Unavailable'}
            </span>
          </div>
        </div>
      )
    }

    if (tool.dependencyType === 'brand') {
      // Brand-dependent tools - show brand profile pictures with green dots for available brands
      // Filter brands based on selectedBrandId
      const selectedBrand = brands?.find((brand: any) => brand.id === selectedBrandId)
      const brandsToShow = selectedBrandId === 'all' ? brands : (selectedBrand ? [selectedBrand] : [])

      const availableBrands = brandsToShow.filter((brand: any) => {
        if (!tool.requiresPlatforms || tool.requiresPlatforms.length === 0) return true
        
        const brandConnections = connections.filter(conn => conn.brand_id === brand.id)
        return tool.requiresPlatforms.every(platform => 
          brandConnections.some(conn => conn.platform_type === platform)
        )
      })

      return (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {availableBrands.slice(0, 3).map((brand: any) => {
              const brandInitials = brand.name?.charAt(0)?.toUpperCase() || 'B'
              
              return (
                <div key={brand.id} className="relative group">
                  {brand.image_url ? (
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-[#444] bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                      <img 
                        src={brand.image_url} 
                        alt={brand.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold border border-[#444] flex-shrink-0 bg-[#4A5568] text-white">
                      {brandInitials}
                    </div>
                  )}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1A1A1A]"></div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#1A1A1A] text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-[#333]">
                    {brand.name}: Available
                  </div>
                </div>
              )
            })}
            {availableBrands.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[9px] font-semibold border border-[#444] text-white flex-shrink-0">
                +{availableBrands.length - 3}
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
              <CheckCircle className="w-2.5 h-2.5 text-white" />
            </div>
            {tool.status === 'available' && (
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gray-400 rounded-full border border-[#1A1A1A]"></div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">Always Available</span>
            <span className={`text-xs font-medium ${tool.status === 'coming-soon' ? 'text-blue-400' : 'text-green-400'}`}>
              {tool.status === 'coming-soon' ? 'Coming Soon' : 'Available'}
            </span>
          </div>
        </div>
      )
    }

    // Fallback
    return <Badge variant="outline">Unknown</Badge>
  }

  const filteredTools = selectedCategory === 'all' 
    ? reusableTools 
    : reusableTools.filter(tool => tool.category === selectedCategory)

  const categories = [
    { id: 'all', name: 'All Tools', count: reusableTools.length },

    { id: 'ai-powered', name: 'AI-Powered', count: reusableTools.filter(t => t.category === 'ai-powered').length },
    { id: 'analytics', name: 'Analytics', count: reusableTools.filter(t => t.category === 'analytics').length },
    { id: 'tools', name: 'Tools', count: reusableTools.filter(t => t.category === 'tools').length }
  ]

  const selectedBrand = brands?.find((brand: any) => brand.id === selectedBrandId)
  
  // Absolutely static count that NEVER EVER changes
  const [staticAvailableCount, setStaticAvailableCount] = useState(4) // Set to expected value
  const hasSetStaticCount = useRef(false)
  
  // Set the static count ONCE after component is fully loaded
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasSetStaticCount.current) {
        try {
          // Calculate the count directly using current values
          const currentConnections = connections
          const currentBrands = brands
          
          if (currentConnections.length > 0) {
            const availableTools = BASE_REUSABLE_TOOLS.map(tool => getToolAvailability(tool, 'all'))
            const count = availableTools.filter(t => t.status === 'available').length
            setStaticAvailableCount(count)
          }
        } catch (error) {
          console.log('Using fallback count due to error:', error)
          setStaticAvailableCount(4) // Fallback
        }
        hasSetStaticCount.current = true
      }
    }, 2000) // Wait 2 seconds for everything to load
    
    return () => clearTimeout(timeout)
  }, []) // No dependencies - only runs once
  
  const availableToolsCount = staticAvailableCount

  const getButtonText = (tool: ReusableTool) => {
    switch (tool.status) {
      case 'available':
        return 'Open Tool'
      case 'coming-soon':
        return 'Coming Soon'
      case 'unavailable':
        // Show specific action based on tool type
        if (tool.id === 'lead-generator') {
          return 'Weekly Limit Reached'
        }
        if (tool.id === 'outreach-tool') {
          return 'Generate Leads First'
        }
        if (tool.dependencyType === 'brand' && tool.requiresPlatforms) {
          return 'Connect Platform'
        }
        return 'Unavailable'
      default:
        return 'Unknown'
    }
  }

  // Functions for muting/unmuting notifications
  const toggleMuteNotification = (notificationKey: string) => {
    setMutedNotifications(prev => {
      const isMuting = !prev[notificationKey] // Will be true if we're muting (was false before)
      
      const newMutedState = {
        ...prev,
        [notificationKey]: isMuting
      }
      
      // Save to localStorage immediately
      if (userId) {
        localStorage.setItem(`mutedNotifications_${userId}`, JSON.stringify(newMutedState))
      }
      
      // Update notification counts in real-time based on muting/unmuting
      if (isMuting) {
        // When muting, we need to decrease the appropriate counter
        if (notificationKey.includes('brand_health')) {
          markBrandHealthRead()
          console.log('[Agency Center] 📱 Brand health notification muted')
        } else if (notificationKey.includes('todo') || notificationKey.includes('outreach')) {
          decrementTodo()
          console.log('[Agency Center] 📱 Todo notification muted')
        }
      } else {
        // When unmuting, refresh to recalculate true counts
        refresh()
        console.log('[Agency Center] 📱 Notification unmuted, refreshing counts')
      }
      
      return newMutedState
    })
  }

  // Functions for marking brand health reports as read
  const markBrandAsRead = (brandId: string) => {
    setReadBrandReports(prev => {
      const newReadState = {
        ...prev,
        [brandId]: true
      }
      
      // Save to localStorage immediately
      if (userId) {
        localStorage.setItem(`readBrandReports_${userId}`, JSON.stringify(newReadState))
      }
      
      return newReadState
    })
    
    // Update notification store immediately for real-time UI updates
    markBrandHealthRead()
    console.log('[Agency Center] 📱 Brand health notification count decreased')
    
    // Show feedback
    toast.success('Report marked as read', { duration: 2000 })
  }

  const markAllBrandsAsRead = () => {
    const unreadCount = brandHealthData.filter(brand => !readBrandReports[brand.id]).length
    
    if (unreadCount === 0) {
      toast('All reports are already marked as read', { duration: 2000 })
      return
    }
    
    const allReadState: {[key: string]: boolean} = {}
    brandHealthData.forEach(brand => {
      allReadState[brand.id] = true
    })
    
    setReadBrandReports(allReadState)
    
    // Save to localStorage immediately
    if (userId) {
      localStorage.setItem(`readBrandReports_${userId}`, JSON.stringify(allReadState))
    }

    // Update notification store for each unread report
    for (let i = 0; i < unreadCount; i++) {
      markBrandHealthRead()
    }
    console.log('[Agency Center] 📱 All brand health notifications cleared')
    
    // Show feedback
    toast.success(`Marked ${unreadCount} reports as read`, { duration: 2000 })
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

  // Check if refresh is available (2 minute cooldown)
  const canRefresh = () => {
    if (!lastRefreshTime) return true
    const twoMinutesAgo = new Date()
    twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2)
    return lastRefreshTime < twoMinutesAgo
  }

  // Get remaining cooldown time
  const getCooldownTime = () => {
    if (!lastRefreshTime || canRefresh()) return null
    const twoMinutesLater = new Date(lastRefreshTime)
    twoMinutesLater.setMinutes(twoMinutesLater.getMinutes() + 2)
    const remaining = twoMinutesLater.getTime() - Date.now()
    const seconds = Math.ceil(remaining / 1000)
    
    // Return seconds if less than 60, otherwise minutes
    if (seconds < 60) {
      return `${seconds}s`
    } else {
      const minutes = Math.ceil(seconds / 60)
      return `${minutes}m`
    }
  }

  // Handle refresh button click
  const handleRefresh = async () => {
    if (!canRefresh() || isRefreshing) return

    setIsRefreshing(true)
    const refreshTime = new Date()

    try {
      console.log('[Agency Center] Manual refresh triggered')
      
      // Update last refresh time immediately
      setLastRefreshTime(refreshTime)
      if (userId) {
        localStorage.setItem(`lastRefreshTime_${userId}`, refreshTime.toISOString())
      }

      // Show toast notification
      toast.success('Refreshing agency center...', { duration: 2000 })

      // Refresh all data
      await Promise.all([
        loadUserData(),
        generateTodos(),
        loadBrandHealthData(true) // Force refresh with real data sync
      ])

      // Trigger notification refresh
      console.log('[Agency Center] Manual refresh completed, triggering notification refresh')
      if (refresh) {
        refresh() // Use refresh for immediate updates
      }

      toast.success('Agency center refreshed successfully!', { duration: 3000 })
      console.log('[Agency Center] Manual refresh completed')
      
    } catch (error) {
      console.error('[Agency Center] Error during manual refresh:', error)
      toast.error('Failed to refresh. Please try again.', { duration: 3000 })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Function to handle when tools are used (mark as used and update notifications)
  const handleToolUsed = useCallback((toolId: string) => {
    console.log('[Agency Center] Tool used:', toolId)
    
    // Mark tool availability notification as completed
    const taskId = `tool-available-${toolId}`
    markTaskComplete(taskId)
    
    // For lead generator, update usage data in real-time
    if (toolId === 'lead-generator') {
      const now = new Date()
      const newUsageRecord = {
        date: now.toISOString().split('T')[0],
        generation_count: 1,
        user_id: userId
      }
      
      setUserUsageData(prev => {
        const existingRecord = prev.find(record => record.date === newUsageRecord.date)
        if (existingRecord) {
          return prev.map(record => 
            record.date === newUsageRecord.date 
              ? { ...record, generation_count: (record.generation_count || 0) + 1 }
              : record
          )
        } else {
          return [...prev, newUsageRecord]
        }
      })
    }
    
    // Update notification store immediately when tools are used
    decrementTodo() // Assuming tool usage reduces todo count
    console.log('[Agency Center] 📱 Tool usage notification count decreased')
  }, [markTaskComplete, userId, decrementTodo])

  // Load brand health data with real data and AI synopsis (exactly like action center)
  const loadBrandHealthData = useCallback(async (forceRefresh = false) => {
    if (!userId) return
    
    // Robust loading guard to prevent any duplicate calls
    if (brandHealthLoadingRef.current) {
      console.log('[Brand Health] Already loading, skipping duplicate call')
      return
    }
    brandHealthLoadingRef.current = true
    
    setIsLoadingBrandHealth(true)
    console.log('[Brand Health] Starting data load...', forceRefresh ? '(FORCE REFRESH)' : '')
    
    try {
      const supabase = await getSupabaseClient()
      
      // Step 1: Get all brands with at least 1 ad platform connected
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name, niche, image_url')
        .eq('user_id', userId)

      if (!brands?.length) {
        console.log('[Brand Health] No brands found')
        setBrandHealthData([])
        return
      }

      // Step 2: Get platform connections (ad platforms + shopify for full context)
      const { data: allConnections } = await supabase
        .from('platform_connections')
        .select('id, brand_id, platform_type, status')
        .in('brand_id', brands.map(b => b.id))
        .eq('status', 'active')
        .in('platform_type', ['meta', 'google', 'tiktok', 'shopify']) // Include Shopify for logos/context

      // Filter brands to only those with ad platforms connected (but include shopify data)
      const brandsWithAdPlatforms = brands.filter(brand => 
        allConnections?.some(conn => 
          conn.brand_id === brand.id && 
          ['meta', 'google', 'tiktok'].includes(conn.platform_type)
        )
      )

      if (!brandsWithAdPlatforms.length) {
        console.log('[Brand Health] No brands with ad platforms found')
        setBrandHealthData([])
        return
      }

      console.log(`[Brand Health] Found ${brandsWithAdPlatforms.length} brands with ad platforms`)

      // Step 3: Calculate date ranges (use provided dateRange or default to today)
      const now = new Date()
      const currentHour = now.getHours()
      const isTooEarly = currentHour < 6

      let fromDate: Date
      let toDate: Date
      
      if (dateRange?.from && dateRange?.to) {
        // Use the provided date range
        fromDate = new Date(dateRange.from)
        toDate = new Date(dateRange.to)
      } else {
        // Default to today
        fromDate = new Date(now)
        fromDate.setHours(0, 0, 0, 0)
        toDate = new Date(now)
        toDate.setHours(23, 59, 59, 999)
      }
      
      // Format dates for queries
      const fromDateStr = fromDate.getFullYear() + '-' + 
        String(fromDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(fromDate.getDate()).padStart(2, '0')
      
      const toDateStr = toDate.getFullYear() + '-' + 
        String(toDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(toDate.getDate()).padStart(2, '0')

      console.log(`[Brand Health] Analyzing date range: ${fromDateStr} to ${toDateStr}`)

      // Step 4.5: Trigger fresh data sync if force refresh is requested
      if (forceRefresh) {
        console.log('[Brand Health] Force refresh triggered - syncing latest Meta data...')
        for (const brand of brandsWithAdPlatforms) {
          try {
            // Trigger fresh sync for today's data for each brand
            const syncResponse = await fetch('/api/meta/backfill', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                brandId: brand.id,
                dateFrom: fromDateStr,
                dateTo: toDateStr
              })
            })
            if (syncResponse.ok) {
              console.log(`[Brand Health] ${brand.name} - Fresh sync completed`)
            } else {
              console.warn(`[Brand Health] ${brand.name} - Sync failed:`, await syncResponse.text())
            }
          } catch (syncError) {
            console.warn(`[Brand Health] ${brand.name} - Sync error:`, syncError)
          }
        }
        // Wait a moment for the sync to complete
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log('[Brand Health] Force refresh sync completed, proceeding with data load...')
      }

      // Step 5: Process each brand
      const brandHealthPromises = brandsWithAdPlatforms.map(async (brand) => {
        console.log(`[Brand Health] Processing ${brand.name}...`)

        // Get brand connections
        const brandConnections = allConnections?.filter(conn => conn.brand_id === brand.id) || []
        
        // Debug: Log what we're looking for
        console.log(`[Brand Health] ${brand.name} - Looking for Meta data in range:`, { from: fromDateStr, to: toDateStr })
        console.log(`[Brand Health] ${brand.name} - Brand ID:`, brand.id)
        
        // Get Meta data from meta_campaign_daily_stats (the correct table)
        // Add cache-busting to ensure we get fresh data
        const { data: metaData, error: metaError } = await supabase
          .from('meta_campaign_daily_stats')
          .select('date, spend, impressions, clicks, conversions, reach, ctr, cpc, roas, created_at')
          .eq('brand_id', brand.id)
          .gte('date', fromDateStr)
          .lte('date', toDateStr)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }) // Get the most recent records first

        // Debug: Log what we got back
        console.log(`[Brand Health] ${brand.name} - Meta query result:`, { metaData, metaError })
        console.log(`[Brand Health] ${brand.name} - Meta data count:`, metaData?.length || 0)

        // Get Shopify data if connected (need to check for Shopify connections separately)
        const { data: shopifyConnections } = await supabase
          .from('platform_connections')
          .select('id')
          .eq('brand_id', brand.id)
          .eq('platform_type', 'shopify')
          .eq('status', 'active')
        
        let shopifyData = null
        if (shopifyConnections?.length) {
          const connectionIds = shopifyConnections.map(c => c.id)
          const { data: orders } = await supabase
            .from('shopify_orders')
            .select('total_price, created_at')
            .in('connection_id', connectionIds)
            .gte('created_at', fromDate.toISOString())
            .lte('created_at', toDate.toISOString())
            .order('created_at', { ascending: false })
          shopifyData = orders
        }

        // Process Meta metrics for the entire date range
        const rawMetaData = metaData || []
        
        // Debug: Log raw data count
        console.log(`[Brand Health] ${brand.name} - Raw Meta data for range:`, rawMetaData.length, 'records')
        
        // Deduplicate by date - keep only the most recent record per date to prevent doubling
        const metaDataByDate = new Map()
        rawMetaData.forEach(record => {
          const existingRecord = metaDataByDate.get(record.date)
          if (!existingRecord || new Date(record.created_at) > new Date(existingRecord.created_at)) {
            metaDataByDate.set(record.date, record)
          }
        })
        
        const totalMeta = Array.from(metaDataByDate.values())
        
        // Debug: Log deduplicated data
        console.log(`[Brand Health] ${brand.name} - Deduplicated Meta data:`, totalMeta.length, 'records (was', rawMetaData.length, ')')

        const totalSpend = totalMeta.reduce((sum, d) => sum + (parseFloat(d.spend) || 0), 0)
        const totalConversions = totalMeta.reduce((sum, d) => sum + (parseInt(d.conversions) || 0), 0)
        const totalImpressions = totalMeta.reduce((sum, d) => sum + (parseInt(d.impressions) || 0), 0)
        const totalClicks = totalMeta.reduce((sum, d) => sum + (parseInt(d.clicks) || 0), 0)
        const avgROAS = totalMeta.length > 0 ? totalMeta.reduce((sum, d) => sum + (parseFloat(d.roas) || 0), 0) / totalMeta.length : 0

        // For comparison, get the most recent day's data vs the rest
        const sortedMeta = [...totalMeta].sort((a, b) => b.date.localeCompare(a.date))
        const latestDayData = sortedMeta.length > 0 ? sortedMeta.filter(d => d.date === sortedMeta[0].date) : []
        const previousData = sortedMeta.length > 1 ? sortedMeta.filter(d => d.date !== sortedMeta[0].date) : []
        
        const latestDaySpend = latestDayData.reduce((sum, d) => sum + (parseFloat(d.spend) || 0), 0)
        const previousSpend = previousData.reduce((sum, d) => sum + (parseFloat(d.spend) || 0), 0)
        const latestDayROAS = latestDayData.length > 0 ? latestDayData.reduce((sum, d) => sum + (parseFloat(d.roas) || 0), 0) / latestDayData.length : 0
        const previousROAS = previousData.length > 0 ? previousData.reduce((sum, d) => sum + (parseFloat(d.roas) || 0), 0) / previousData.length : 0

        // Debug: Log calculated spend values
        console.log(`[Brand Health] ${brand.name} - Total spend: $${totalSpend}, Latest day: $${latestDaySpend}`)

        // Calculate changes
        const spendChange = previousSpend > 0 ? ((latestDaySpend - previousSpend) / previousSpend) * 100 : 0
        const roasChange = previousROAS > 0 ? ((latestDayROAS - previousROAS) / previousROAS) * 100 : 0

        // Process Shopify sales for the date range
        const totalOrders = shopifyData || []
        const totalSales = totalOrders.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0)
        
        // For comparison, get the most recent day vs the rest
        let latestDaySales = 0
        let previousDaysSales = 0
        let salesChange = 0
        
        if (totalOrders.length > 0) {
          // Sort orders by date and find the latest day
          const sortedOrders = [...totalOrders].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          
          const latestOrderDate = new Date(sortedOrders[0].created_at)
          latestOrderDate.setHours(0, 0, 0, 0)
          
          const latestDayOrders = sortedOrders.filter(order => {
            const orderDate = new Date(order.created_at)
            orderDate.setHours(0, 0, 0, 0)
            return orderDate.getTime() === latestOrderDate.getTime()
          })
          
          const previousOrders = sortedOrders.filter(order => {
            const orderDate = new Date(order.created_at)
            orderDate.setHours(0, 0, 0, 0)
            return orderDate.getTime() < latestOrderDate.getTime()
          })
          
          latestDaySales = latestDayOrders.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0)
          previousDaysSales = previousOrders.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0)
          salesChange = previousDaysSales > 0 ? ((latestDaySales - previousDaysSales) / previousDaysSales) * 100 : 0
        }

        // Determine status and generate alerts
        let status = 'healthy'
        let synopsis = ''
        const alerts = []

        if (isTooEarly) {
          status = 'info'
          synopsis = `${brand.name} analysis will be available after 6 AM when sufficient data is collected for today's performance.`
        } else {
          // Check for issues
          if (avgROAS < 1 && totalSpend > 0) {
            status = 'critical'
            alerts.push({ type: 'critical', message: `ROAS below 1.0 (${avgROAS.toFixed(2)})` })
          } else if (roasChange < -20 && totalSpend > 0) {
            status = 'warning'
            alerts.push({ type: 'warning', message: `ROAS dropped ${Math.abs(roasChange).toFixed(1)}%` })
          }

          if (salesChange < -30 && shopifyData?.length) {
            status = 'critical'
            alerts.push({ type: 'critical', message: `Sales dropped ${Math.abs(salesChange).toFixed(1)}%` })
          }

          // Generate AI synopsis instead of hardcoded text
          try {
            if (forceRefresh || totalSpend > 0 || totalMeta.length > 0) {
              const brandDataForAI = {
                name: brand.name,
                roas: avgROAS,
                roasChange: roasChange,
                spend: totalSpend,
                revenue: totalSales,
                salesChange: salesChange,
                conversions: totalConversions,
                impressions: totalImpressions,
                clicks: totalClicks,
                status: status,
                connections: brandConnections.map(c => c.platform_type),
                hasData: totalMeta.length > 0 || totalOrders.length > 0,
                spendChange: spendChange,
                // Enhanced Shopify details
                shopifyConnected: (shopifyConnections?.length || 0) > 0,
                shopifyOrders: totalOrders.length,
                shopifyOrdersYesterday: 0, // Not applicable for date range
                avgOrderValue: totalOrders.length > 0 ? totalSales / totalOrders.length : 0,
                hasShopifyData: (shopifyData?.length || 0) > 0
              }

              console.log(`[Brand Health] ${brand.name} - Generating AI synopsis...`)
              
              const aiResponse = await fetch('/api/ai/generate-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'brand_synopsis',
                  data: brandDataForAI
                })
              })

              if (aiResponse.ok) {
                const aiResult = await aiResponse.json()
                synopsis = aiResult.analysis || `${brand.name} performance data is being analyzed.`
                console.log(`[Brand Health] ${brand.name} - AI synopsis generated successfully`)
              } else {
                throw new Error('AI synthesis failed')
              }
            } else {
              synopsis = `${brand.name} has no ad activity today yet. Campaigns may be scheduled to start later or need to be activated.`
            }
          } catch (error) {
            console.warn(`[Brand Health] ${brand.name} - AI synopsis generation failed:`, error)
            // Fallback to simple factual statement
            if (totalSpend === 0 && totalMeta.length === 0) {
              synopsis = `${brand.name} has no ad activity today yet. Campaigns may be scheduled to start later or need to be activated.`
            } else {
              synopsis = `${brand.name} spent $${totalSpend.toFixed(2)} with ${avgROAS.toFixed(2)} ROAS for the selected period. ${totalConversions} conversions from ${totalImpressions.toLocaleString()} impressions and ${totalClicks.toLocaleString()} clicks.`
              
              if (shopifyData?.length) {
                synopsis += ` Sales: $${totalSales.toFixed(2)} (${salesChange > 0 ? '+' : ''}${salesChange.toFixed(1)}% latest day vs previous).`
              }
              
              if (roasChange !== 0) {
                synopsis += ` ROAS ${roasChange > 0 ? 'improved' : 'declined'} ${Math.abs(roasChange).toFixed(1)}% vs yesterday.`
              }
            }
          }
        }

        const hasData = totalMeta.length > 0 || totalOrders.length > 0

        console.log(`[Brand Health] ${brand.name} - Status: ${status}, Spend: $${totalSpend}, ROAS: ${avgROAS.toFixed(2)}`)

        return {
          ...brand,
          connections: brandConnections,
          status,
          synopsis,
          alerts,
          hasData,
          isTooEarly,
          // Metrics
          spend: totalSpend,
          roas: avgROAS,
          roasChange,
          conversions: totalConversions,
          impressions: totalImpressions,
          clicks: totalClicks,
          sales: totalSales,
          salesChange,
          spendChange,
          lastActivity: metaData?.[0]?.date || shopifyData?.[0]?.created_at || null
        }
      })

      const results = await Promise.all(brandHealthPromises)
      console.log(`[Brand Health] Processed ${results.length} brands`)
      setBrandHealthData(results)
      
    } catch (error) {
      console.error('[Brand Health] Error loading data:', error)
      setBrandHealthData([])
    } finally {
      setIsLoadingBrandHealth(false)
      brandHealthLoadingRef.current = false // Reset loading guard
    }
  }, [userId, getSupabaseClient, dateRange])

  // Load localStorage data
  useEffect(() => {
    if (userId) {
      // Load task states from localStorage (same logic as Action Center page)
      const savedTaskStates = localStorage.getItem(`actionCenter_taskStates_${userId}`)
      if (savedTaskStates) {
        try {
          const parsed = JSON.parse(savedTaskStates)
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
        } catch (error) {
          console.error('Error loading task states:', error)
        }
      }

      // Load muted notifications
      const savedMuted = localStorage.getItem(`mutedNotifications_${userId}`)
      if (savedMuted) {
        try {
          setMutedNotifications(JSON.parse(savedMuted))
        } catch (error) {
          console.error('Error loading muted notifications:', error)
        }
      }

      // Load read brand reports
      const savedRead = localStorage.getItem(`readBrandReports_${userId}`)
      if (savedRead) {
        try {
          setReadBrandReports(JSON.parse(savedRead))
        } catch (error) {
          console.error('Error loading read brand reports:', error)
          setReadBrandReports({})
        }
      }

      // Load last refresh time
      const lastRefresh = localStorage.getItem(`lastRefreshTime_${userId}`)
      if (lastRefresh) {
        try {
          setLastRefreshTime(new Date(lastRefresh))
        } catch (error) {
          console.error('Error loading last refresh time:', error)
        }
      }
    }
  }, [userId])

  // Save task states to localStorage when they change and trigger notification refresh
  useEffect(() => {
    if (userId && Object.keys(taskStates).length > 0) {
      localStorage.setItem(`actionCenter_taskStates_${userId}`, JSON.stringify(taskStates))
      
      // Use a simple throttling approach with localStorage to prevent excessive refreshes
      const lastRefreshKey = `lastTaskStateRefresh_${userId}`
      const lastRefresh = localStorage.getItem(lastRefreshKey)
      const now = Date.now()
      const shouldRefresh = !lastRefresh || now - parseInt(lastRefresh) > 2000 // 2 second throttle
      
      if (shouldRefresh) {
        localStorage.setItem(lastRefreshKey, now.toString())
        
        // Trigger notification refresh when task states change
        if (refresh) {
          refresh() // Use refresh for immediate updates
        }
      }
    }
  }, [userId, taskStates]) // Remove refreshCounts to prevent infinite loops

  // Load connections when brands are available
  useEffect(() => {
    if (userId && brands.length > 0) {
      loadConnections()
    }
  }, [userId, brands.length, loadConnections])

  // Listen for tool usage events and localStorage changes
  useEffect(() => {
    // Listen for tool navigation events
    const handleToolClick = (event: any) => {
      const toolId = event.detail?.toolId
      if (toolId) {
        handleToolUsed(toolId)
      }
    }

    // Listen for manual notification refresh events
    const handleForceRefresh = () => {
      console.log('[Agency Center] Force refresh event received')
      if (refresh) {
        refresh() // Use refresh for immediate updates
      }
    }

    // Listen for localStorage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `actionCenter_taskStates_${userId}` || 
          e.key === `readBrandReports_${userId}` || 
          e.key === `mutedNotifications_${userId}`) {
        console.log('[Agency Center] Storage change detected, refreshing notifications')
        if (refresh) {
          refresh() // Use refresh for immediate updates
        }
      }
    }

    // Listen for global refresh from dashboard button
    const handleGlobalRefresh = async (event: any) => {
      // Set widget loading states
      setIsWidgetLoading({
        brandHealth: true,
        reusableTools: true,
        quickActions: true
      })

        try {
          // Refresh all action center data - but don't reload brand health if already loaded to prevent duplication
          await Promise.all([
            loadUserData(),
            generateTodos(),
            // Only reload brand health if this is a manual refresh, not initial load
            brandHealthData.length === 0 ? loadBrandHealthData(true) : Promise.resolve()
          ])

          // Trigger notification refresh
          if (refresh) {
            refresh() // Use refresh for immediate updates
          }
        } catch (error) {
          console.error('[Agency Center] Error during global refresh:', error)
        } finally {
          // Reset widget loading states
          setTimeout(() => {
            setIsWidgetLoading({
              brandHealth: false,
              reusableTools: false,
              quickActions: false
            })
          }, 300)
        }
    }

    window.addEventListener('toolUsed', handleToolClick)
    window.addEventListener('forceNotificationRefresh', handleForceRefresh)
    window.addEventListener('global-refresh-all', handleGlobalRefresh)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('toolUsed', handleToolClick)
      window.removeEventListener('forceNotificationRefresh', handleForceRefresh)
      window.removeEventListener('global-refresh-all', handleGlobalRefresh)
      window.removeEventListener('storage', handleStorageChange)
    }
      }, [userId, handleToolUsed, refresh, loadUserData, generateTodos, loadBrandHealthData])

  // Load data on mount - inform parent when ready
  useEffect(() => {
    if (userId && !initialLoadRef.current) {
      initialLoadRef.current = true
      const loadInitialData = async () => {
        try {
          // Load all data - only load brand health if not already loaded
          await Promise.all([
            loadUserData(),
            generateTodos(),
            brandHealthData.length === 0 ? loadBrandHealthData(true) : Promise.resolve()
          ])
          
          // Reset widget loading states
          setIsWidgetLoading({
            brandHealth: false,
            reusableTools: false,
            quickActions: false
          })
          
          // Wait a tick to ensure all loading states have been updated
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Explicitly ensure the loading state callback reflects completion
          // This should trigger the useEffect that calls onLoadingStateChange
          setIsLoadingConnections(false)
          setIsLoadingUserData(false) 
          setIsLoadingBrandHealth(false)
          setIsRefreshing(false)
          
          // Wait another tick for the loading state callback to fire
          await new Promise(resolve => setTimeout(resolve, 50))
          
          // Notify parent that action center is ready
          window.dispatchEvent(new CustomEvent('action-center-loaded'))
        } catch (error) {
          console.error('[AgencyActionCenter] Error during initial load:', error)
          
          // Reset refs on error so it can retry
          initialLoadRef.current = false
          brandHealthLoadingRef.current = false
          userDataLoadingRef.current = false
          todosLoadingRef.current = false
          
          // Clean up loading states even on error
          setIsLoadingConnections(false)
          setIsLoadingUserData(false) 
          setIsLoadingBrandHealth(false)
          setIsRefreshing(false)
          
          // Reset widget loading states
          setIsWidgetLoading({
            brandHealth: false,
            reusableTools: false,
            quickActions: false
          })
          
          // Wait for loading state callback to fire
          await new Promise(resolve => setTimeout(resolve, 50))
          
          // Even on error, notify parent to prevent infinite loading
          window.dispatchEvent(new CustomEvent('action-center-loaded'))
        }
      }
      
      loadInitialData()
    } else {
      // If no user, notify parent immediately
      window.dispatchEvent(new CustomEvent('action-center-loaded'))
    }
  }, [userId, generateTodos, loadUserData, loadBrandHealthData])



  return (
    <TooltipProvider>
    <div className="min-h-screen p-4 pb-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                            flex items-center justify-center border border-white/10">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Agency Management Center</h1>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-gray-300">
                    {new Date().getHours() < 12 
                      ? "Good morning" 
                      : new Date().getHours() < 17 
                        ? "Good afternoon" 
                        : "Good evening"}! Here's everything happening with your brands.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Quick stats with more detail */}
              <div className="text-right min-w-[120px]">
                <div className="text-sm text-gray-400">Outreach Priorities</div>
                <div className={cn(
                  "text-xl font-bold mb-1 transition-all duration-300",
                  isWidgetLoading.quickActions ? "text-gray-600" : "text-white"
                )}>
                  {isWidgetLoading.quickActions ? "--" : activeTodos.filter(t => t.priority === 'high').length}
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      (isRefreshing || isWidgetLoading.quickActions)
                        ? "bg-gray-600 animate-pulse" 
                        : "bg-gradient-to-r from-gray-400 to-gray-500"
                    )}
                    style={{ 
                      width: (isRefreshing || isWidgetLoading.quickActions)
                        ? '60%' 
                        : `${activeTodos.length > 0 ? (activeTodos.filter(t => t.priority === 'high').length / activeTodos.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className={cn(
                  "text-xs mt-0.5 transition-all duration-300",
                  isWidgetLoading.quickActions ? "text-gray-600" : "text-gray-500"
                )}>
                  {isWidgetLoading.quickActions ? "-- total tasks" : `${activeTodos.length} total tasks`}
                </div>
              </div>
              <div className="text-right min-w-[120px]">
                <div className="text-sm text-gray-400">Useable AI Tools</div>
                <div className={cn(
                  "text-xl font-bold mb-1 transition-all duration-300",
                  isWidgetLoading.reusableTools ? "text-gray-600" : "text-white"
                )}>
                  {isWidgetLoading.reusableTools ? "--" : availableToolsCount}
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      (isRefreshing || isWidgetLoading.reusableTools)
                        ? "bg-gray-600 animate-pulse" 
                        : "bg-gradient-to-r from-gray-400 to-gray-500"
                    )}
                    style={{ 
                      width: (isRefreshing || isWidgetLoading.reusableTools)
                        ? '75%' 
                        : `${reusableTools.length > 0 ? (availableToolsCount / reusableTools.length) * 100 : reusableTools.length === 0 ? '75%' : 0}%` 
                    }}
                  ></div>
                </div>
                <div className={cn(
                  "text-xs mt-0.5 transition-all duration-300",
                  isWidgetLoading.reusableTools ? "text-gray-600" : "text-gray-500"
                )}>
                  {isWidgetLoading.reusableTools ? "-- total tools" : `${reusableTools.length} total tools`}
                </div>
              </div>
              <div className="text-right min-w-[120px]">
                <div className="text-sm text-gray-400">Brands with Reports</div>
                <div className={cn(
                  "text-xl font-bold mb-1 transition-all duration-300",
                  isWidgetLoading.brandHealth ? "text-gray-600" : "text-white"
                )}>
                  {isWidgetLoading.brandHealth ? "--" : brandHealthData.length}
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      (isRefreshing || isWidgetLoading.brandHealth)
                        ? "bg-gray-600 animate-pulse" 
                        : "bg-gradient-to-r from-gray-400 to-gray-500"
                    )}
                    style={{ 
                      width: (isRefreshing || isWidgetLoading.brandHealth)
                        ? '80%' 
                        : `${brands.length > 0 ? (brandHealthData.length / brands.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className={cn(
                  "text-xs mt-0.5 transition-all duration-300",
                  isWidgetLoading.brandHealth ? "text-gray-600" : "text-gray-500"
                )}>
                  {isWidgetLoading.brandHealth ? "-- total brands" : `${brands.length} total brands`}
                </div>
              </div>
              {/* Removed refresh button - now handled by dashboard global refresh */}
              {/* Current time */}
              <div className="text-right border-l border-[#333] pl-4">
                <div className="text-sm text-gray-400">Current Time</div>
                <div className="text-lg font-medium text-white">
                  {format(new Date(), 'h:mm a')}
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Health Overview Widget */}
        <div>
          <Card className={cn(
            "bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl transition-all duration-300",
            (isRefreshing || isWidgetLoading.brandHealth) && "opacity-50 grayscale pointer-events-none"
          )}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-white text-lg">Brand Health Overview</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {(isLoadingBrandHealth || isWidgetLoading.brandHealth) && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      <span className="text-xs text-gray-400">Loading health data...</span>
                    </div>
                  )}
                  {!isLoadingBrandHealth && brandHealthData.length > 0 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-gray-400 hover:text-white hover:bg-[#333] rounded-md px-2"
                        onClick={markAllBrandsAsRead}
                      >
                        {!mutedNotifications['brand-health'] ? (
                          <div className="flex items-center gap-2">
                            <span>{brandHealthData.length} Overviews</span>
                            {brandHealthData.filter(brand => !readBrandReports[brand.id]).length > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                                <span className="text-xs text-blue-400">
                                  {brandHealthData.filter(brand => !readBrandReports[brand.id]).length} new
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Slash className="w-3 h-3" />
                            <span className="line-through opacity-60">{brandHealthData.length} Overviews</span>
                          </div>
                        )}
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-[#333] rounded-md"
                            onClick={() => toggleMuteNotification('brand-health')}
                          >
                            {mutedNotifications['brand-health'] ? (
                              <BellOff className="w-4 h-4" />
                            ) : (
                              <Volume className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{mutedNotifications['brand-health'] ? 'Unmute brand health notifications' : 'Mute brand health notifications'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
              </div>
              <CardDescription className="text-[#9ca3af] text-sm">
                Today's performance from midnight to now • Only brands with ad platforms
                <span className="text-xs text-gray-500 block mt-1">
                  Real-time updates • Analysis available after 6 AM
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBrandHealth || isWidgetLoading.brandHealth ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="font-medium text-white mb-2">Loading Brand Health Data</h3>
                  <p className="text-[#9ca3af] text-sm">Analyzing performance across all connected platforms...</p>
                </div>
              ) : brandHealthData.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="font-medium text-white mb-2">No Brands with Ad Platforms</h3>
                  <p className="text-[#9ca3af] text-sm">Connect Meta, Google, or TikTok to brands to see performance insights.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brandHealthData.map((brand) => (
                    <div
                      key={brand.id}
                      className="rounded-lg border border-[#333] bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] p-4 transition-all hover:shadow-md"
                    >
                      {/* Brand Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {renderBrandAvatar(brand, 'md')}
                          <div className="flex flex-col items-start min-w-0 flex-1">
                            <div className="flex items-center gap-2 w-full">
                              <h4 className="font-medium text-white text-sm truncate">{brand.name}</h4>
                              {/* Platform icons */}
                              <div className="flex items-center gap-1">
                                {brand.connections.map((conn: any, idx: number) => (
                                  <div
                                    key={`${conn.platform_type}-${brand.id}`}
                                    className="w-4 h-4 rounded-sm overflow-hidden border border-gray-500/40 bg-gray-600/15"
                                    title={`${conn.platform_type.charAt(0).toUpperCase() + conn.platform_type.slice(1)} connected`}
                                  >
                                    {conn.platform_type === 'meta' && (
                                      <img 
                                        src="/meta-icon.png" 
                                        alt="Meta" 
                                        className="w-full h-full object-contain"
                                      />
                                    )}
                                    {conn.platform_type === 'shopify' && (
                                      <img 
                                        src="/shopify-icon.png" 
                                        alt="Shopify" 
                                        className="w-full h-full object-contain"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            {brand.niche && (
                              <span className="text-xs text-gray-400 truncate max-w-full">{brand.niche}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Unread indicator */}
                          {!readBrandReports[brand.id] && (
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" title="New report available"></div>
                          )}
                          <span className={cn(
                            "text-xs font-medium px-2 py-1 rounded-full",
                            brand.status === 'critical' && "bg-red-900/50 text-red-400 border border-red-700/50",
                            brand.status === 'warning' && "bg-orange-900/50 text-orange-400 border border-orange-700/50",
                            brand.status === 'info' && "bg-blue-900/50 text-blue-400 border border-blue-700/50",
                            brand.status === 'healthy' && "bg-green-900/50 text-green-400 border border-green-700/50"
                          )}>
                            {brand.status === 'critical' && "Critical"}
                            {brand.status === 'warning' && "Warning"}
                            {brand.status === 'info' && "Too Early"}
                            {brand.status === 'healthy' && "Healthy"}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-[#333] rounded-md"
                                onClick={() => {
                                  if (readBrandReports[brand.id]) {
                                    // Unmark as read
                                    setReadBrandReports(prev => {
                                      const newState = { ...prev }
                                      delete newState[brand.id]
                                      if (userId) {
                                        localStorage.setItem(`readBrandReports_${userId}`, JSON.stringify(newState))
                                      }
                                      return newState
                                    })
                                    toast.success('Report marked as unread', { duration: 2000 })
                                  } else {
                                    // Mark as read
                                    markBrandAsRead(brand.id)
                                  }
                                }}
                              >
                                {readBrandReports[brand.id] ? (
                                  <RefreshCw className="w-3 h-3" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{readBrandReports[brand.id] ? 'Mark as unread' : 'Mark as read'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Synopsis */}
                      <div className="mb-3 p-3 bg-[#2A2A2A]/50 rounded-lg border border-[#333]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500 font-medium">
                            Today's Synopsis ({brand.isTooEarly ? 'Available after 6 AM' : `Since midnight`})
                          </span>
                          <Brain className="w-3 h-3 text-gray-500" />
                        </div>
                        <p className="text-xs text-[#9ca3af] leading-relaxed">
                          {brand.synopsis}
                        </p>
                      </div>

                      {/* Key Metrics */}
                      {!brand.isTooEarly && brand.hasData && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="text-center">
                            <p className="text-xs text-[#9ca3af]">ROAS Today</p>
                            <p className={cn(
                              "text-sm font-medium",
                              brand.roas >= 2 ? "text-green-400" : brand.roas >= 1 ? "text-yellow-400" : "text-red-400"
                            )}>
                              {brand.roas.toFixed(2)}
                            </p>
                            {brand.roasChange !== 0 && (
                              <p className={cn(
                                "text-xs",
                                brand.roasChange > 0 ? "text-green-400" : "text-red-400"
                              )}>
                                {brand.roasChange > 0 ? '+' : ''}{brand.roasChange.toFixed(1)}%
                              </p>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-[#9ca3af]">Spend Today</p>
                            <p className="text-sm font-medium text-white">
                              ${brand.spend.toFixed(2)}
                            </p>
                            <p className="text-xs text-[#9ca3af]">
                              {brand.conversions} conv
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Alerts */}
                      {brand.alerts.length > 0 && (
                        <div className="space-y-1 mb-3">
                          {brand.alerts.slice(0, 2).map((alert: any, idx: number) => (
                            <div key={idx} className={cn(
                              "text-xs p-2 rounded border-l-2",
                              alert.type === 'critical' && "bg-red-950/30 border-red-500 text-red-300",
                              alert.type === 'warning' && "bg-orange-950/30 border-orange-500 text-orange-300",
                              alert.type === 'info' && "bg-blue-950/30 border-blue-500 text-blue-300"
                            )}>
                              {alert.message}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Marketing Assistant CTA */}
                      <div className="pt-2 border-t border-[#333]">
                        <Button
                          onClick={() => {
                            router.push('/marketing-assistant')
                          }}
                          size="sm"
                          className="w-full bg-[#2A2A2A] hover:bg-[#333] text-white text-xs h-7 transition-all duration-200 border border-[#444] hover:border-[#555]"
                        >
                          <Brain className="w-3 h-3 mr-1" />
                          Open Marketing Assistant
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          
          {/* Outreach Tasks Widget */}
          <div className="md:col-span-1">
            <Card className={cn(
              "bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl h-[722px] flex flex-col transition-all duration-300",
              isWidgetLoading.quickActions && "opacity-50 grayscale pointer-events-none"
            )}>
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-white text-lg">Outreach Tasks</CardTitle>
                  </div>
                  {isWidgetLoading.quickActions ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      <span className="text-xs text-gray-400">Loading tasks...</span>
                    </div>
                  ) : activeTodos.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#2A2A2A] text-white text-xs">
                        {!mutedNotifications['outreach-tasks'] ? (
                          `${activeTodos.length} to-do's`
                        ) : (
                          <div className="flex items-center gap-1">
                            <Slash className="w-3 h-3" />
                            <span className="line-through opacity-60">{activeTodos.length} to-do's</span>
                          </div>
                        )}
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-[#333] rounded-md"
                            onClick={() => toggleMuteNotification('outreach-tasks')}
                          >
                            {mutedNotifications['outreach-tasks'] ? (
                              <BellOff className="w-4 h-4" />
                            ) : (
                              <Volume className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{mutedNotifications['outreach-tasks'] ? 'Unmute notifications' : 'Mute notifications'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
                <CardDescription className="text-[#9ca3af] text-sm">
                  Tasks that need your attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 overflow-y-auto">
                {isWidgetLoading.quickActions ? (
                  <div className="text-center py-12">
                    <CheckSquare className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="font-medium text-white mb-2">Loading Outreach Tasks</h3>
                    <p className="text-[#9ca3af] text-sm">Analyzing pending tasks and priorities...</p>
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
                            <Badge className="bg-[#2A2A2A] text-white text-xs px-2 py-0.5">
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
                          <Button 
                            size="sm" 
                            className="w-full bg-[#2A2A2A] hover:bg-[#333] text-white text-xs h-8"
                            onClick={() => router.push(todo.targetPage)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {todo.action}
                          </Button>
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

          {/* Reusable Tools Widget */}
          <div className="md:col-span-3">
            <Card className={cn(
              "bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl h-[722px] flex flex-col transition-all duration-300",
              isWidgetLoading.reusableTools && "opacity-50 grayscale pointer-events-none"
            )}>
              <CardHeader className="pb-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-white text-lg">Reusable Tools & Automation</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {isWidgetLoading.reusableTools ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        <span className="text-xs text-gray-400">Loading tools...</span>
                      </div>
                    ) : (
                      <Badge className="bg-[#2A2A2A] text-white text-xs">
                        {!mutedNotifications['available-tools'] ? (
                          `${availableToolsCount} Available`
                        ) : (
                          <div className="flex items-center gap-1">
                            <Slash className="w-3 h-3" />
                            <span className="line-through opacity-60">{availableToolsCount} Available</span>
                          </div>
                        )}
                      </Badge>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-[#333] rounded-md"
                          onClick={() => toggleMuteNotification('available-tools')}
                        >
                          {mutedNotifications['available-tools'] ? (
                            <BellOff className="w-4 h-4" />
                          ) : (
                            <Volume className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{mutedNotifications['available-tools'] ? 'Unmute notifications' : 'Mute notifications'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
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
                        className="h-8 text-xs bg-transparent border-[#333] text-[#9ca3af] hover:bg-[#333] hover:text-white"
                      >
                        <Filter className="h-3 w-3 mr-1" />
                        {selectedBrandId === 'all' ? (
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
                          selectedBrandId === 'all' && "bg-[#2A2A2A] text-white"
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
                            selectedBrandId === brand.id && "bg-[#2A2A2A] text-white"
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
                          ? "bg-[#2A2A2A] hover:bg-[#333] text-white" 
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
              <CardContent className="flex-1 overflow-y-auto">
                {isWidgetLoading.reusableTools ? (
                  <div className="text-center py-12">
                    <Settings className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="font-medium text-white mb-2">Loading Reusable Tools</h3>
                    <p className="text-[#9ca3af] text-sm">Preparing automation tools and features...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 3x2 grid for all tools */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {filteredTools.map((tool) => {
                        const IconComponent = tool.icon
                        const isDisabled = tool.status === 'coming-soon' || tool.status === 'unavailable'
                        
                        return (
                          <div
                            key={tool.id}
                            className={cn(
                              "rounded-lg border p-4 transition-all hover:shadow-md flex flex-col h-full",
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
                                  {getStatusBadge(tool)}
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
                            <div className="flex-grow"></div>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (!isDisabled) {
                                  // Dispatch tool usage event for notification system
                                  window.dispatchEvent(new CustomEvent('toolUsed', { 
                                    detail: { toolId: tool.id, toolName: tool.name }
                                  }))
                                  console.log('[Agency Center] Tool button clicked:', tool.id)
                                  
                                  // Navigate to tool
                                  router.push(tool.href)
                                }
                              }}
                              disabled={isDisabled}
                              className={cn(
                                "w-full text-xs h-8 mt-auto",
                                isDisabled
                                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                  : "bg-[#2A2A2A] hover:bg-[#333] text-white"
                              )}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {getButtonText(tool)}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
}