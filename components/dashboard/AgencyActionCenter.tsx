"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator'
import { SyncingBrandsDisplay } from './SyncingBrandsDisplay'
import { useAuth } from '@clerk/nextjs'
import { getAuthenticatedSupabaseClient, getStandardSupabaseClient } from '@/lib/utils/unified-supabase'
import { createClient } from '@supabase/supabase-js'
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
  ShoppingBag,
  DollarSign,
  ChevronDown,
  Filter,
  Tag,
  User,
  Calendar,
  TrendingUp,
  // New icons for tools
  Zap,
  Settings,
  FileText,
  Target,
  Paintbrush,
  ArrowUpDown,
  // Sidebar-matching icons
  Users,
  FileBarChart,
  Palette,
  BrainCircuit,
  MessageCircle,
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
  category: 'automation' | 'analytics' | 'tools'
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
    id: 'lead-generator',
    name: 'Lead Generator',
    description: 'Find and qualify leads using real business data',
    icon: Users,
    category: 'tools',
    href: '/lead-generator',
    features: ['Google Places Integration', 'Lead Scoring', 'Business Intelligence'],
    dependencyType: 'user',
    frequency: '1 per week'
  },
  {
    id: 'outreach-tool',
    name: 'Outreach Messages',
    description: 'Manage lead outreach campaigns and follow-ups',
    icon: Send,
    category: 'tools',
    href: '/outreach-tool',
    features: ['Email Campaigns', 'Lead Tracking', 'Response Management'],
    dependencyType: 'user',
    frequency: '25 per day'
  },
  {
    id: 'ai-consultant',
    name: 'AI Chatbot',
    description: 'Get personalized marketing advice and strategy recommendations',
    icon: MessageCircle,
    category: 'automation',
    href: '/ai-marketing-consultant',
    features: ['Strategic Insights', 'Marketing Analysis', '24/7 Availability'],
    dependencyType: 'user',
    frequency: '15 per day'
  },
  {
    id: 'brand-reports',
    name: 'Brand Reports',
    description: 'Generate AI-powered daily and monthly performance reports',
    icon: FileBarChart,
    category: 'analytics',
    href: '/brand-report',
    features: ['Daily Reports', 'Monthly Reports', 'Performance Insights'],
    dependencyType: 'brand',
    requiresPlatforms: ['meta', 'shopify']
  },
  {
    id: 'creative-studio',
    name: 'Creative Studio',
    description: 'Create high-converting ad creatives with AI-powered generation and custom templates',
    icon: Palette,
    category: 'automation',
    href: '/ad-creative-studio',
    features: ['Auto Creative Generation', 'Custom Templates', 'Copy Creative Style'],
    dependencyType: 'user',
    frequency: '10 per week'
  },
  {
    id: 'campaign-optimization',
    name: 'Marketing Assistant',
    description: 'Weekly AI recommendations and performance tracking',
    icon: BrainCircuit,
    category: 'analytics',
    href: '/marketing-assistant',
    features: ['Performance Analysis', 'Scaling Recommendations', 'Budget Optimization'],
    dependencyType: 'brand',
    requiresPlatforms: ['meta']
  }
]

interface AgencyActionCenterProps {
  dateRange?: {
    from: Date
    to: Date
  }
  onLoadingStateChange?: (isLoading: boolean) => void
}

// Helper functions for category styling
const getCategoryIcon = (category: ReusableTool['category']) => {
  switch (category) {
    case 'automation':
      return Zap
    case 'analytics':
      return TrendingUp
    case 'tools':
      return Settings
    default:
      return Settings
  }
}

const getCategoryColor = (category: ReusableTool['category']) => {
  switch (category) {
    case 'automation':
      return 'border-[#333] bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] shadow-lg'
    case 'analytics':
      return 'border-[#333] bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] shadow-lg'
    case 'tools':
      return 'border-[#333] bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] shadow-lg'
    default:
      return 'border-[#333] bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] shadow-lg'
  }
}

export function AgencyActionCenter({ dateRange, onLoadingStateChange }: AgencyActionCenterProps) {
  const { userId, getToken } = useAuth()
  const router = useRouter()
  const { brands: contextBrands } = useBrandContext()
  const brands = useMemo(() => contextBrands || [], [contextBrands])
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [taskStates, setTaskStates] = useState<TaskState>({})
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  // Agency Center always uses 'all' - never depends on selected brand
  const selectedBrandId = 'all'
  
  // Brand selection working correctly now
  const [isLoadingConnections, setIsLoadingConnections] = useState(true)
  const [navigatingToolId, setNavigatingToolId] = useState<string | null>(null)
  
  // Reset navigating state on unmount to prevent stale state
  useEffect(() => {
    return () => {
      setNavigatingToolId(null)
    }
  }, [])

  const [selectedBrandFilter, setSelectedBrandFilterState] = useState<string>('all')
  
  const setSelectedBrandFilter = useCallback((value: string) => {
    setSelectedBrandFilterState(value)
  }, [selectedBrandFilter])

  // Brand report availability tracking
  const [brandReportAvailability, setBrandReportAvailability] = useState<{
    [brandId: string]: {
      dailyAvailable: boolean
      monthlyAvailable: boolean
      hasRequiredPlatforms: boolean
    }
  }>({})

  // Campaign optimization tracking
  const [campaignOptimizationAvailability, setCampaignOptimizationAvailability] = useState<{
    [brandId: string]: {
      optimizationAvailable: boolean
      lastOptimizationDate: string | null
      hasRequiredPlatforms: boolean
      optimizedCampaignsCount: number
      totalCampaignsCount: number
    }
  }>({})

  // User-dependent data for tool availability
  const [userLeadsCount, setUserLeadsCount] = useState(0)
  const [userCampaignsCount, setUserCampaignsCount] = useState(0)
  const [userUsageData, setUserUsageData] = useState<any[]>([])


  const [isLoadingUserData, setIsLoadingUserData] = useState(true)
  
  // Tool usage tracking - track lead generator, outreach tool, AI consultant, and creative studio
  const [toolUsageData, setToolUsageData] = useState<{
    leadGenerator: { [userId: string]: number }
    outreachTool: { [userId: string]: number }
    aiConsultant: { [userId: string]: number }
    creativeStudio: { [userId: string]: number }
  }>({
    leadGenerator: {},
    outreachTool: {},
    aiConsultant: {},
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



  // Brand Health data state
  const [brandHealthData, setBrandHealthData] = useState<any[]>([])
  const [isLoadingBrandHealth, setIsLoadingBrandHealth] = useState(true)
  const [brandHealthSort, setBrandHealthSort] = useState<'critical' | 'roas-low' | 'spend-high' | 'alphabetical'>('critical')
  
  // Track overall loading state and notify parent
  useEffect(() => {
    const isOverallLoading = isLoadingConnections || isLoadingUserData || isLoadingBrandHealth || isRefreshing
    console.log('[AgencyActionCenter] Loading states:', {
      isLoadingConnections,
      isLoadingUserData,
      isLoadingBrandHealth,
      isRefreshing,
      isOverallLoading
    })
    onLoadingStateChange?.(isOverallLoading)
  }, [isLoadingConnections, isLoadingUserData, isLoadingBrandHealth, isRefreshing, onLoadingStateChange])

  // Loading ref
  const loadingRef = useRef(false)
  const initialLoadRef = useRef(false)
  const connectionsLoadedRef = useRef(false)
  const brandHealthLoadingRef = useRef(false)
  const userDataLoadingRef = useRef(false)
  const todosLoadingRef = useRef(false)
  // ===== RATE LIMITING PROTECTION =====
  // Protection to prevent simultaneous tool usage data loading
  const toolUsageLoadingRef = useRef(false)
  
  // Add widget loading states (main loading moved to dashboard level)
  const [isWidgetLoading, setIsWidgetLoading] = useState({
    brandHealth: true,
    reusableTools: true,
    quickActions: true
  })

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

      return getStandardSupabaseClient()
    }
  }, [getToken])

  // Generate todos from outreach data and other sources (exactly like action center)
  const generateTodos = useCallback(async () => {
    if (!userId) return

    // Prevent duplicate loading
    if (todosLoadingRef.current) {
      // Already loading, skip duplicate call
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
          targetPage: '/lead-generator'
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
          targetPage: '/lead-generator'
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
          targetPage: '/lead-generator'
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
          targetPage: '/lead-generator'
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
          targetPage: '/lead-generator'
        })
      }


      setTodos(newTodos)
    } catch (error) {

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

      
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('platform_connections')
        .select('*')
        .in('brand_id', brandIds)
        .eq('status', 'active')

      if (connectionsError) {

      } else {

        setConnections(connectionsData as PlatformConnection[] || [])
      }
    } catch (error) {

    } finally {
      setIsLoadingConnections(false)
      loadingRef.current = false // Reset loading guard
    }
  }, [userId, brands, getSupabaseClient])



  // Load user data for tool availability
  const loadUserData = useCallback(async () => {
    if (!userId) return

    // Additional validation - ensure userId is properly formatted
    if (typeof userId !== 'string' || !userId.startsWith('user_')) {
      return
    }

    // Prevent duplicate loading
    if (userDataLoadingRef.current) {
      // Already loading, skip duplicate call
      return
    }
    userDataLoadingRef.current = true

    setIsLoadingUserData(true)

    try {
      const supabase = await getSupabaseClient()

      // Use direct queries for counts - these work fine
      const [leadsResponse, campaignsResponse, usageResponse] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('outreach_campaigns').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('user_usage').select('*').eq('user_id', userId)
      ])

      // Get outreach message usage via API to avoid client-side Supabase query issues
      let outreachResponse: { data: any[], error: any } = { data: [], error: null }
      try {
        const outreachApiResponse = await fetch('/api/outreach/usage')
        if (outreachApiResponse.ok) {
          const outreachApiData = await outreachApiResponse.json()
          // Convert API response to match Supabase query structure
          outreachResponse = { 
            data: outreachApiData.usage?.dailyCount ? Array(outreachApiData.usage.dailyCount).fill({ generated_at: new Date().toISOString() }) : [], 
            error: null 
          }
        } else {
          outreachResponse = { data: [], error: { message: 'API call failed' } }
        }
      } catch (error) {
        outreachResponse = { data: [], error: error as any }
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

        
        // Group outreach messages by date and count them
        const outreachByDate = outreachResponse.data.reduce((acc: any, message: any) => {
          const date = new Date(message.generated_at).toISOString().split('T')[0]
          acc[date] = (acc[date] || 0) + 1
          return acc
        }, {})



        // Convert to format compatible with userUsageData
        const outreachUsageData = Object.entries(outreachByDate).map(([date, count]) => ({
          date,
          outreach_messages: count,
          user_id: userId
        }))



        // Merge with existing usage data
        setUserUsageData(prev => {
          const merged = [...(prev || []), ...outreachUsageData]

          return merged
        })
      } else {

      }

    } catch (error) {

    } finally {
      setIsLoadingUserData(false)
      userDataLoadingRef.current = false // Reset loading guard
    }
  }, [userId, getSupabaseClient])

  // Load tool usage data for lead generator
  useEffect(() => {
    const loadToolUsageData = async () => {
      if (!userId) return

      // Prevent multiple simultaneous calls
      if (toolUsageLoadingRef.current) {
        return
      }

      toolUsageLoadingRef.current = true

      try {
        const supabase = await getSupabaseClient()
        const newToolUsageData = {
          leadGenerator: {} as { [userId: string]: number },
          outreachTool: {} as { [userId: string]: number },
          aiConsultant: {} as { [userId: string]: number },
          creativeStudio: {} as { [userId: string]: number }
        }

        // Load Lead Generator usage - use same logic as lead generator page
        const now = new Date()
        const localNow = new Date()
        const localDate = [
          localNow.getFullYear(),
          ('0' + (localNow.getMonth() + 1)).slice(-2),
          ('0' + localNow.getDate()).slice(-2)
        ].join('-')
        
        // Calculate start of current week (Monday at 12:00 AM) using local timezone
        const currentDate = new Date(localNow.setHours(0, 0, 0, 0))
        const dayOfWeek = currentDate.getDay()
        const startOfWeek = new Date(currentDate)
        
        // Calculate days to subtract to get to Monday
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        startOfWeek.setDate(currentDate.getDate() - daysToSubtract)
        startOfWeek.setHours(0, 0, 0, 0)
        
        // Next reset is next Monday at 12:00 AM
        const startOfNextWeek = new Date(startOfWeek)
        startOfNextWeek.setDate(startOfWeek.getDate() + 7)
        startOfNextWeek.setHours(0, 0, 0, 0)
        
        // Get this week's usage using the same table as lead generator page
        const { data: usageData } = await supabase
          .from('user_usage')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startOfWeek.toISOString().split('T')[0])
          .lt('date', startOfNextWeek.toISOString().split('T')[0])
        
        // Sum up generation count for the week
        const weeklyUsageCount = usageData?.reduce((sum, record) => sum + (record.generation_count || 0), 0) || 0
        

        
        // Store usage count for this user (weekly limit of 1)
        newToolUsageData.leadGenerator[userId] = weeklyUsageCount

        // Load Outreach Tool usage - use same API as outreach tool page
        try {
          const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
          const response = await fetch('/api/outreach/usage', {
            headers: {
              'x-user-timezone': userTimezone
            }
          })
          if (response.ok) {
            const data = await response.json()
            const dailyUsageCount = data.usage?.daily?.used || 0
            console.log(`[Dashboard] Outreach Tool usage: ${dailyUsageCount}, timezone: ${userTimezone}`)
            
            // Store usage count for this user (daily limit of 25)
            newToolUsageData.outreachTool[userId] = dailyUsageCount
          } else {
            newToolUsageData.outreachTool[userId] = 0
          }
        } catch (error) {
          newToolUsageData.outreachTool[userId] = 0
        }

        // AI Consultant Usage - get from centralized AI usage tracking
        // Note: We need a brandId to check AI usage, but consultant is user-level
        // For now, keep existing API-based logic until we refactor to have a user-level tracking endpoint
        try {
          const response = await fetch('/api/ai/marketing-consultant', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              checkUsageOnly: true
            }),
          })

          if (response.ok) {
            const data = await response.json()
            // Calculate used from remaining: if remainingUses = 4, then used = 11 (15-4)
            const remainingUses = data.remainingUses || 0
            const dailyUsageCount = Math.max(0, 15 - remainingUses) // Ensure never negative
            newToolUsageData.aiConsultant[userId] = dailyUsageCount
          } else if (response.status === 429) {
            // User is maxed out - set to 15 used
            newToolUsageData.aiConsultant[userId] = 15
          } else {
            newToolUsageData.aiConsultant[userId] = 0
          }
        } catch (error) {
          console.error('Error fetching AI consultant usage:', error)
          newToolUsageData.aiConsultant[userId] = 0
        }

        // Creative Studio Usage - fetch from API for consistency
        try {
          const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
          const creativeUsageResponse = await fetch('/api/creative-usage', {
            headers: {
              'x-user-timezone': userTimezone
            }
          })
          if (creativeUsageResponse.ok) {
            const usageData = await creativeUsageResponse.json()
            const weeklyUsageCount = usageData.usage?.current || 0
            console.log(`[Dashboard] Creative Studio usage: ${weeklyUsageCount}, timezone: ${userTimezone}`)
            // Store usage count for this user (weekly limit of 25)
            newToolUsageData.creativeStudio[userId] = weeklyUsageCount
          } else {
            newToolUsageData.creativeStudio[userId] = 0
          }
        } catch (error) {
          console.error('Error fetching creative studio usage:', error)
          newToolUsageData.creativeStudio[userId] = 0
        }
        
        setToolUsageData(newToolUsageData)
      } catch (error) {
      } finally {
        toolUsageLoadingRef.current = false
      }
    }

    loadToolUsageData()
    if (brands && connections) {
      loadBrandReportAvailability()
    }

    // Set up periodic refresh every 30 seconds to keep usage data fresh
    const refreshInterval = setInterval(() => {
      if (!document.hidden && userId) {
        // Only refresh if user hasn't reached AI consultant limit (15/15)
        const currentAiUsage = toolUsageData.aiConsultant[userId] || 0
        if (currentAiUsage < 15) {
          loadToolUsageData()
        } else {
        }
      }
    }, 15000) // 15 seconds - faster refresh for better usage sync (updated to prevent 429 errors - redeploy attempt)

    // Listen for focus events to refresh when user returns to dashboard
    const handleFocus = () => {
      if (userId) {
        // Only refresh if user hasn't reached AI consultant limit (15/15)
        const currentAiUsage = toolUsageData.aiConsultant[userId] || 0
        if (currentAiUsage < 15) {
          loadToolUsageData()
        } else {
        }
      }
    }

    // Listen for visibility change to refresh when user returns
    const handleVisibilityChange = () => {
      if (!document.hidden && userId) {
        // Only refresh if user hasn't reached AI consultant limit (15/15)
        const currentAiUsage = toolUsageData.aiConsultant[userId] || 0
        if (currentAiUsage < 15) {
          loadToolUsageData()
        } else {
        }
      }
    }

    // Listen for creative studio usage updates
    const handleCreativeStudioUpdate = () => {
      if (userId) {
        // Only refresh if user hasn't reached AI consultant limit (15/15)
        const currentAiUsage = toolUsageData.aiConsultant[userId] || 0
        if (currentAiUsage < 15) {
          loadToolUsageData()
        } else {
        }
      }
    }


    // Listen for localStorage changes (for creative studio usage resets)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'ad-creative-usage' && userId) {
        // Only refresh if user hasn't reached AI consultant limit (15/15)
        const currentAiUsage = toolUsageData.aiConsultant[userId] || 0
        if (currentAiUsage < 15) {
          loadToolUsageData()
        } else {
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('creative-studio-usage-updated', handleCreativeStudioUpdate)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('creative-studio-usage-updated', handleCreativeStudioUpdate)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(refreshInterval)
    }
  }, [userId, getSupabaseClient])

  // Load brand report availability
  const loadBrandReportAvailability = useCallback(async () => {
    if (!userId || !brands) return

    try {
      const supabase = await getSupabaseClient()
      const newAvailability: typeof brandReportAvailability = {}
      


      for (const brand of brands) {
        // Check if brand has required platforms
        const brandConnections = connections.filter(conn => conn.brand_id === brand.id)
        const hasRequiredPlatforms = ['meta', 'shopify'].some(platform => 
          brandConnections.some(conn => conn.platform_type === platform)
        )

        if (!hasRequiredPlatforms) {
          newAvailability[brand.id] = {
            dailyAvailable: false,
            monthlyAvailable: false,
            hasRequiredPlatforms: false
          }
          continue
        }

        // Check daily report availability using same logic as brand report page
        // Use LOCAL date, not UTC, to match user's timezone
        const now = new Date()
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        const brandSpecificDailyKey = `lastManualGeneration_${brand.id}`
        const brandLastDailyGeneration = localStorage.getItem(brandSpecificDailyKey)
        
        // Also check database reports for today (same as brand report page)
        try {
          const params = new URLSearchParams({
            brandId: brand.id,
            userId: userId,
            fromDate: today,
            toDate: today,
            periodName: 'today',
            getAllSnapshots: 'true',
            includeSharedBrands: 'true'
          })
          
          const response = await fetch(`/api/brand-reports?${params.toString()}`)
          let databaseDailyReports = []
          
          if (response.ok) {
            const result = await response.json()
            databaseDailyReports = result.reports || []
          }
          
          const hasUsedDailyToday = brandLastDailyGeneration === today || 
                                   databaseDailyReports.some((report: any) => {
                                     const snapshotTime = report.data?.snapshot_time || report.snapshotTime
                                     const isManual = snapshotTime === "manual" || snapshotTime === null
                                     // Check if report was created today in LOCAL time
                                     const reportDate = new Date(report.createdAt)
                                     const reportLocalDate = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(reportDate.getDate()).padStart(2, '0')}`
                                     console.log(`[Brand Report Check] ${brand.name}: snapshotTime=${snapshotTime}, isManual=${isManual}, reportLocalDate=${reportLocalDate}, today=${today}, match=${isManual && reportLocalDate === today}`)
                                     return isManual && reportLocalDate === today
                                   })
          
          console.log(`[Brand Report Availability] ${brand.name}: hasUsedDailyToday=${hasUsedDailyToday}, localStorage=${brandLastDailyGeneration}, dbReports=${databaseDailyReports.length}`)

          // Check monthly report availability - resets at midnight on the 1st of each month (LOCAL TIME)
          // Use local date, not UTC
          const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` // YYYY-MM format in local time
          const brandSpecificMonthlyKey = `lastMonthlyGeneration_${brand.id}`
          const brandLastMonthlyGeneration = localStorage.getItem(brandSpecificMonthlyKey)
          
          // Only allow monthly report on or after the 1st of a new month
          const hasUsedMonthlyThisMonth = brandLastMonthlyGeneration === currentMonthKey
          
          console.log(`[Brand Report Availability] ${brand.name}:`, {
            currentMonth: currentMonthKey,
            lastGenerated: brandLastMonthlyGeneration,
            hasUsedMonthly: hasUsedMonthlyThisMonth,
            monthlyAvailable: hasRequiredPlatforms && !hasUsedMonthlyThisMonth
          })

          // Check time restrictions for daily reports (after 6:30 AM)
          const currentHour = new Date().getHours()
          const currentMinutes = new Date().getMinutes()
          const isAfter630AM = currentHour > 6 || (currentHour === 6 && currentMinutes >= 30)

          newAvailability[brand.id] = {
            dailyAvailable: hasRequiredPlatforms && isAfter630AM && !hasUsedDailyToday,
            monthlyAvailable: hasRequiredPlatforms && !hasUsedMonthlyThisMonth,
            hasRequiredPlatforms
          }
        } catch (error) {

          // Fallback to unavailable if error
          newAvailability[brand.id] = {
            dailyAvailable: false,
            monthlyAvailable: false,
            hasRequiredPlatforms
          }
        }
      }

      setBrandReportAvailability(newAvailability)
    } catch (error) {

    }
  }, [userId, brands, connections, getSupabaseClient])

  // Load campaign optimization availability
  const loadCampaignOptimizationAvailability = useCallback(async (freshConnections?: any[], freshBrands?: any[]) => {
    // Use fresh data if provided, otherwise fall back to state
    const brandsToUse = freshBrands || brands
    const connectionsToUse = freshConnections || connections
    
    if (!userId || !brandsToUse) return



    try {
      // Use service client to bypass RLS for shared brand access
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const newAvailability: typeof campaignOptimizationAvailability = {}

      for (const brand of brandsToUse) {

        
        // Check if brand has required platforms (Meta for campaign optimization)
        const brandConnections = connectionsToUse.filter(conn => conn.brand_id === brand.id)
        const hasRequiredPlatforms = brandConnections.some(conn => conn.platform_type === 'meta')



        if (!hasRequiredPlatforms) {

          newAvailability[brand.id] = {
            optimizationAvailable: false,
            lastOptimizationDate: null,
            hasRequiredPlatforms: false,
            optimizedCampaignsCount: 0,
            totalCampaignsCount: 0
          }
          continue
        }


        
        // Check campaign optimization availability from ai_campaign_recommendations table
        // This uses a weekly cooldown system that resets every Monday at midnight
        try {

        // Get all campaigns for this brand to check if any have active recommendations
        // Use authenticated client for meta_campaigns due to RLS policy

        // Skip meta_campaigns query for now and use the anonymous supabase client for ai_campaign_recommendations directly

        
        // Check directly for any recommendations for this brand
        const { data: allRecommendations, error: allRecsError } = await supabase
          .from('ai_campaign_recommendations')
          .select('campaign_id, created_at, updated_at')
          .eq('brand_id', brand.id)
        

        
        if (allRecsError) {

          // Default to available if we can't check
          newAvailability[brand.id] = {
            optimizationAvailable: hasRequiredPlatforms,
            lastOptimizationDate: null,
            hasRequiredPlatforms,
            optimizedCampaignsCount: 0,
            totalCampaignsCount: 0
          }
          continue
        }
        
        if (!allRecommendations || allRecommendations.length === 0) {

          newAvailability[brand.id] = {
            optimizationAvailable: hasRequiredPlatforms,
            lastOptimizationDate: null,
            hasRequiredPlatforms,
            optimizedCampaignsCount: 0,
            totalCampaignsCount: 0
          }
          continue
        }
        
        // Get unique campaign IDs from recommendations
        const metaCampaigns = allRecommendations.map(rec => ({ campaign_id: rec.campaign_id }))
        const campaignIds = [...new Set(allRecommendations.map(rec => rec.campaign_id))]
        


          // We already checked for empty recommendations above, so we have data here


          // Calculate start of this week (Monday midnight UTC)
          // Use a more reliable approach to avoid timezone issues
          const now = new Date()

          
          // Use UTC methods throughout to avoid timezone confusion
          const currentUTCDay = now.getUTCDay() // 0=Sunday, 1=Monday, 2=Tuesday, etc.

          
          // Calculate days since Monday (0=Monday, 1=Tuesday, etc.)
          const daysSinceMonday = (currentUTCDay + 6) % 7 // Convert Sunday=0 to Monday=0

          
          // Calculate Monday of this week
          const startOfThisWeek = new Date(now)
          startOfThisWeek.setUTCDate(now.getUTCDate() - daysSinceMonday)
          startOfThisWeek.setUTCHours(0, 0, 0, 0)
          


          // Check for any recommendations created OR updated this week for any campaign of this brand

          
          // Filter existing recommendations for this week
          const createdThisWeek = allRecommendations.filter(rec => 
            new Date(rec.created_at) >= startOfThisWeek
          )


          const updatedThisWeek = allRecommendations.filter(rec => 
            new Date(rec.updated_at) >= startOfThisWeek
          )


          // Combine results and remove duplicates
          const allWeeklyRecommendations = [
            ...(createdThisWeek || []),
            ...(updatedThisWeek || [])
          ]
          const uniqueRecommendations = allWeeklyRecommendations.filter((rec, index, arr) => 
            arr.findIndex(r => r.campaign_id === rec.campaign_id) === index
          )
          const weeklyRecommendations = uniqueRecommendations

          // Calculate how many individual campaigns were optimized this week
          const optimizedCampaignIds = weeklyRecommendations.map(rec => rec.campaign_id)
          const optimizedCampaignsCount = optimizedCampaignIds.length
          const totalCampaignsCount = campaignIds.length
          
          // Check if user has viewed recommendations THIS week (not from a previous week)
          const storageKey = `recommendationsViewed_${brand.id}`
          const lastRefreshDate = localStorage.getItem(`lastRefreshDate_${brand.id}`)
          const currentWeekStart = startOfWeek.toISOString().split('T')[0]
          
          // Only count as "viewed" if it was viewed this week
          const hasViewedRecommendationsRaw = localStorage.getItem(storageKey) === 'true'
          const hasViewedRecommendations = hasViewedRecommendationsRaw && lastRefreshDate && lastRefreshDate >= currentWeekStart
          
          const hasUsedThisWeek = optimizedCampaignsCount > 0
          // Weekly limit: if ANY optimization happened this week OR user has viewed recommendations THIS WEEK, no more optimizations available until next Monday
          const optimizationAvailable = hasRequiredPlatforms && !hasUsedThisWeek && !hasViewedRecommendations

          // Get detailed campaign optimization stats for display
          let lastOptimizationDate = null
          
          if (hasUsedThisWeek) {
            const mostRecent = weeklyRecommendations.reduce((latest, rec) => {
              // Get the latest date between created_at and updated_at for each record
              const recLatest = new Date(rec.updated_at) > new Date(rec.created_at) ? rec.updated_at : rec.created_at
              const latestDate = new Date(latest.updated_at) > new Date(latest.created_at) ? latest.updated_at : latest.created_at
              return new Date(recLatest) > new Date(latestDate) ? rec : latest
            })
            const finalDate = new Date(mostRecent.updated_at) > new Date(mostRecent.created_at) ? mostRecent.updated_at : mostRecent.created_at
            lastOptimizationDate = new Date(finalDate).toISOString().split('T')[0]
          }



          newAvailability[brand.id] = {
            optimizationAvailable,
            lastOptimizationDate,
            hasRequiredPlatforms,
            optimizedCampaignsCount,
            totalCampaignsCount
          }
        } catch (error) {

          // If error, assume optimization is available if platform requirements are met
          newAvailability[brand.id] = {
            optimizationAvailable: hasRequiredPlatforms,
            lastOptimizationDate: null,
            hasRequiredPlatforms,
            optimizedCampaignsCount: 0,
            totalCampaignsCount: 0
          }
        }
      }

      setCampaignOptimizationAvailability(newAvailability)
      return newAvailability // Return the data for immediate use

    } catch (error) {
      return {} // Return empty object on error
    }
  }, [userId, brands, connections, getSupabaseClient])

  // Load brand report availability when brands or connections change
  useEffect(() => {
    if (brands && connections && userId) {

      loadBrandReportAvailability()
      loadCampaignOptimizationAvailability()
    }
  }, [brands, connections, userId, loadBrandReportAvailability, loadCampaignOptimizationAvailability])

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
    

  }, [updateTaskState])

  const markTaskDismissed = useCallback((taskId: string) => {
    updateTaskState(taskId, { status: 'dismissed' })

  }, [updateTaskState])

  const snoozeTask = useCallback((taskId: string, hours: number = 24) => {
    const snoozeUntil = new Date()
    snoozeUntil.setHours(snoozeUntil.getHours() + hours)
    updateTaskState(taskId, { status: 'snoozed', snoozeUntil })

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
      case 'high': return <Badge className="text-xs bg-[#FF2A2A] text-white">High</Badge>
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

          return { 
            ...tool, 
            status: hasGenerationsLeft ? 'available' : 'unavailable'
          }
        }

        if (tool.id === 'outreach-tool') {
          // Outreach tool has daily usage limits
          const dailyUsage = toolUsageData.outreachTool[userId || ''] || 0
          const DAILY_LIMIT = 25 // 25 messages per day
          
          const hasUsageLeft = dailyUsage < DAILY_LIMIT

          return { 
            ...tool, 
            status: hasUsageLeft ? 'available' : 'unavailable'
          }
        }

        if (tool.id === 'ai-consultant') {
          // AI consultant has daily usage limits
          const dailyUsage = toolUsageData.aiConsultant[userId || ''] || 0
          const DAILY_LIMIT = 15 // 15 chats per day
          
          const hasUsageLeft = dailyUsage < DAILY_LIMIT

          return { 
            ...tool, 
            status: hasUsageLeft ? 'available' : 'unavailable'
          }
        }

        if (tool.id === 'creative-studio') {
          // Creative Studio has weekly usage limits
          const weeklyUsage = toolUsageData.creativeStudio[userId || ''] || 0
          const WEEKLY_LIMIT = 25 // 25 generations per week
          
          const hasUsageLeft = weeklyUsage < WEEKLY_LIMIT

          return { 
            ...tool, 
            status: hasUsageLeft ? 'available' : 'unavailable'
          }
        }

        // Default for user-dependent tools
        return { ...tool, status: 'available' }

      case 'brand':
        // Brand-dependent tools - check actual usage and platform requirements
        if (tool.id === 'brand-reports') {
          // Check if any brand has the required platforms and is available
          const selectedBrand = brands?.find((brand: any) => brand.id === selectedBrandId)
          const brandsToCheck = selectedBrandId === 'all' ? brands : (selectedBrand ? [selectedBrand] : [])
          
          const hasAvailableBrands = brandsToCheck?.some((brand: any) => {
            const availability = brandReportAvailability[brand.id]
            return availability?.hasRequiredPlatforms && (availability?.dailyAvailable || availability?.monthlyAvailable)
          })
          
          return { 
            ...tool, 
            status: hasAvailableBrands ? 'available' : 'unavailable'
          }
        }
        
        if (tool.id === 'campaign-optimization') {
          // Check if any brand has the required platforms and is available
          const selectedBrand = brands?.find((brand: any) => brand.id === selectedBrandId)
          const brandsToCheck = selectedBrandId === 'all' ? brands : (selectedBrand ? [selectedBrand] : [])
          
          // Only show as available if at least one brand has optimization available
          const hasAvailableBrands = brandsToCheck?.some((brand: any) => {
            const availability = campaignOptimizationAvailability[brand.id]
            return availability?.hasRequiredPlatforms && availability?.optimizationAvailable
          })
          

          
          return { 
            ...tool, 
            status: hasAvailableBrands ? 'available' : 'unavailable'
          }
        }
        
        // Default brand-dependent tools
        return { ...tool, status: 'unavailable' }

      default:
        return { ...tool, status: 'unavailable' }
    }
  }

  // Store stable previous tools to prevent flashing
  const [lastValidTools, setLastValidTools] = useState<ReusableTool[]>([])
  
  // Memoize tools with availability status - AGENCY CENTER SHOULD BE BRAND-INDEPENDENT
  const reusableTools = useMemo((): ReusableTool[] => {

    
    // If we have connections but loading state just flipped, use stable previous tools
    if ((isLoadingConnections || isLoadingUserData) && connections?.length > 0 && lastValidTools.length > 0) {

      return lastValidTools
    }
    
    // Don't calculate availability if still loading critical data
    if (isLoadingConnections || isLoadingUserData) {

      return BASE_REUSABLE_TOOLS.map(tool => ({ ...tool, status: 'unavailable' as const }))
    }

    // Agency center uses 'all' for brand-dependent tools - never depends on selectedBrandId
    const tools = BASE_REUSABLE_TOOLS.map(tool => getToolAvailability(tool, 'all'))
    

    
    // Update last valid tools for future use during loading states
    const availableCount = tools.filter(t => t.status === 'available').length
    if (availableCount > 0) {
      setLastValidTools(tools)
    }
    
    return tools
  }, [isLoadingConnections, isLoadingUserData, userLeadsCount, userCampaignsCount, userUsageData, connections, toolUsageData, brandReportAvailability, campaignOptimizationAvailability, selectedBrandFilter, brands])


  // Helper function to get time until reset
  const getTimeUntilReset = (resetType: 'daily' | 'weekly' | 'monthly') => {
    const now = new Date()
    let resetDate = new Date()
    
    if (resetType === 'daily') {
      // Reset at midnight
      resetDate.setDate(now.getDate() + 1)
      resetDate.setHours(0, 0, 0, 0)
    } else if (resetType === 'weekly') {
      // Reset on Monday at midnight
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7
      resetDate.setDate(now.getDate() + daysUntilMonday)
      resetDate.setHours(0, 0, 0, 0)
    } else if (resetType === 'monthly') {
      // Reset on 1st of next month
      resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)
    }
    
    const diff = resetDate.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  const getStatusBadge = (tool: ReusableTool) => {
    if (tool.dependencyType === 'user') {
      // Determine reset type based on tool
      const getResetInfo = () => {
        if (tool.id === 'lead-generator') return { type: 'weekly' as const, resetDay: 'Monday' }
        if (tool.id === 'outreach-tool') return { type: 'daily' as const, resetDay: 'Tomorrow' }
        if (tool.id === 'ai-consultant') return { type: 'daily' as const, resetDay: 'Tomorrow' }
        if (tool.id === 'creative-studio') return { type: 'weekly' as const, resetDay: 'Monday' }
        return { type: 'daily' as const, resetDay: 'Tomorrow' }
      }
      
      const resetInfo = getResetInfo()
      const timeUntilReset = getTimeUntilReset(resetInfo.type)
      
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
            <span className="text-xs text-gray-400">Agency Dependent</span>
            <span className={`text-xs font-medium ${(() => {
                if (tool.id === 'lead-generator') {
                  const used = toolUsageData.leadGenerator[userId || ''] || 0
                  const limit = 1
                  return used >= limit ? 'text-[#FF2A2A]' : 'text-green-400'
                }
                if (tool.id === 'outreach-tool') {
                  const used = toolUsageData.outreachTool[userId || ''] || 0
                  const limit = 25
                  return used >= limit ? 'text-[#FF2A2A]' : 'text-green-400'
                }
                if (tool.id === 'ai-consultant') {
                  const used = toolUsageData.aiConsultant[userId || ''] || 0
                  const limit = 15
                  return used >= limit ? 'text-[#FF2A2A]' : 'text-green-400'
                }
                                  if (tool.id === 'creative-studio') {
                    const used = toolUsageData.creativeStudio[userId || ''] || 0
                    const limit = 50
                    return used >= limit ? 'text-[#FF2A2A]' : 'text-green-400'
                  }
                return tool.status === 'available' ? 'text-green-400' : 'text-[#FF2A2A]'
              })()}`}>
              {(() => {
                if (tool.id === 'lead-generator') {
                  const used = toolUsageData.leadGenerator[userId || ''] || 0
                  const limit = 1
                  return `${used}/${limit} used this week`
                }
                if (tool.id === 'outreach-tool') {
                  const used = toolUsageData.outreachTool[userId || ''] || 0
                  const limit = 25
                  return `${used}/${limit} used today`
                }
                if (tool.id === 'ai-consultant') {
                  const used = toolUsageData.aiConsultant[userId || ''] || 0
                  const limit = 15
                  return `${used}/${limit} used today`
                }
                                  if (tool.id === 'creative-studio') {
                    const used = toolUsageData.creativeStudio[userId || ''] || 0
                    const limit = 25
                    return `${used}/${limit} used this week`
                  }
                return tool.status === 'available' ? 'Available' : 'Unavailable'
              })()}
            </span>
            <span className="text-[10px] text-gray-500 mt-0.5">
              Resets {resetInfo.resetDay} • {timeUntilReset}
            </span>
          </div>
        </div>
      )
    }

    if (tool.dependencyType === 'brand') {
      // Handle brand reports tool specially
      if (tool.id === 'brand-reports') {
        // Filter brands based on selectedBrandId
        const selectedBrand = brands?.find((brand: any) => brand.id === selectedBrandId)
        const brandsToShow = selectedBrandId === 'all' ? brands : (selectedBrand ? [selectedBrand] : [])

        // Only show brands that have platform connections (required for reports)
        const brandsWithReports = brandsToShow.filter((brand: any) => {
          const availability = brandReportAvailability[brand.id]
          return availability?.hasRequiredPlatforms
        })

        // Calculate usage numbers for all brands - handle early hours (12am-6am) as unavailable, not used
        const now = new Date()
        const currentHour = now.getHours()
        const isEarlyHours = currentHour >= 0 && currentHour < 6
        
        const dailyUsed = brandsWithReports.reduce((count: number, brand: any) => {
          const availability = brandReportAvailability[brand.id]
          // If it's early hours (12am-6am), don't count as "used" - count as "unavailable"
          if (isEarlyHours && !availability?.dailyAvailable) {
            return count // Don't increment - it's unavailable, not used
          }
          return count + (availability?.dailyAvailable ? 0 : 1)
        }, 0)
        
        const monthlyUsed = brandsWithReports.reduce((count: number, brand: any) => {
          const availability = brandReportAvailability[brand.id]
          return count + (availability?.monthlyAvailable ? 0 : 1)
        }, 0)
        
        const dailyTotal = brandsWithReports.length
        const monthlyTotal = brandsWithReports.length

        return (
          <div className="flex flex-col gap-2 w-full">
            {/* Usage stats */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Daily Reports</span>
                <span className={`text-xs font-medium ${dailyUsed < dailyTotal ? 'text-green-400' : 'text-[#FF2A2A]'}`}>
                  {isEarlyHours && dailyUsed === 0 ? `${dailyTotal}/${dailyTotal} unavailable` : `${dailyUsed}/${dailyTotal} used`}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs text-gray-400">Monthly Reports</span>
                <span className={`text-xs font-medium ${monthlyUsed < monthlyTotal ? 'text-green-400' : 'text-[#FF2A2A]'}`}>
                  {monthlyUsed}/{monthlyTotal} used
                </span>
              </div>
            </div>
            
            {/* Brand profile pictures in a separate row */}
            <div className="flex items-center gap-1 flex-wrap">
              {brandsWithReports.map((brand: any) => {
                const brandInitials = brand.name?.charAt(0)?.toUpperCase() || 'B'
                const availability = brandReportAvailability[brand.id]
                const hasAnyAvailable = availability?.dailyAvailable || availability?.monthlyAvailable
                
                return (
                  <div key={brand.id} className="relative group">
                    {brand.image_url ? (
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-[#444] bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                        <img 
                          src={brand.image_url} 
                          alt={brand.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold border border-[#444] flex-shrink-0 bg-[#4A5568] text-white">
                        {brandInitials}
                      </div>
                    )}
                    {hasAnyAvailable && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-[#1A1A1A]"></div>
                    )}
                    {/* Custom tooltip for brand reports - fixed positioning to prevent clipping */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#1A1A1A] text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[9999] border border-[#333] shadow-2xl pointer-events-none">
                      <div className="font-medium mb-1">{brand.name}</div>
                      <div className="flex flex-col gap-1">
                        <div className={`text-[10px] ${availability?.dailyAvailable ? 'text-green-400' : 'text-[#FF2A2A]'}`}>
                          Daily: {availability?.dailyAvailable ? 'Available' : (isEarlyHours ? 'Too early (6am)' : 'Used')} • Resets Tomorrow
                        </div>
                        <div className={`text-[10px] ${availability?.monthlyAvailable ? 'text-green-400' : 'text-[#FF2A2A]'}`}>
                          Monthly: {availability?.monthlyAvailable ? 'Available' : 'Used'} • Resets {(() => {
                            const now = new Date()
                            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
                            const diff = nextMonth.getTime() - now.getTime()
                            const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
                            return `in ${days}d`
                          })()}
                        </div>
                      </div>
                      {/* Arrow pointing down */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                        <div className="border-4 border-transparent border-t-[#333]"></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      }

      // Handle campaign optimization tool specially
      if (tool.id === 'campaign-optimization') {
        // Filter brands based on selectedBrandId
        const selectedBrand = brands?.find((brand: any) => brand.id === selectedBrandId)
        const brandsToShow = selectedBrandId === 'all' ? brands : (selectedBrand ? [selectedBrand] : [])

        // Only show brands that have Meta connections (required for campaign optimization)
        const brandsWithCampaigns = brandsToShow.filter((brand: any) => {
          const availability = campaignOptimizationAvailability[brand.id]
          return availability?.hasRequiredPlatforms
        })

        // Calculate usage numbers for all brands (weekly usage system)
        const optimizationsUsed = brandsWithCampaigns.reduce((count: number, brand: any) => {
          const availability = campaignOptimizationAvailability[brand.id];
          return count + (availability && !availability.optimizationAvailable ? 1 : 0);
        }, 0);
        const optimizationsTotal = brandsWithCampaigns.length;

        return (
          <div className="flex flex-col gap-2 w-full">
            {/* Usage stats */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Marketing Assistant</span>
                <span className={`text-xs font-medium ${optimizationsUsed < optimizationsTotal ? 'text-green-400' : 'text-[#FF2A2A]'}`}>
                  {optimizationsUsed}/{optimizationsTotal} used this week
                </span>
              </div>
            </div>
            
            {/* Brand profile pictures in a separate row */}
            <div className="flex items-center gap-1 flex-wrap">
              {brandsWithCampaigns.map((brand: any) => {
                const brandInitials = brand.name?.charAt(0)?.toUpperCase() || 'B'
                const availability = campaignOptimizationAvailability[brand.id]
                const optimizationAvailable = availability?.optimizationAvailable
                
                return (
                  <div key={brand.id} className="relative group">
                    {brand.image_url ? (
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-[#444] bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                        <img 
                          src={brand.image_url} 
                          alt={brand.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold border border-[#444] flex-shrink-0 bg-[#4A5568] text-white">
                        {brandInitials}
                      </div>
                    )}
                    {optimizationAvailable && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-[#1A1A1A]"></div>
                    )}
                    {/* Custom tooltip for campaign optimization */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#1A1A1A] text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[9999] border border-[#333] shadow-2xl pointer-events-none">
                      <div className="font-medium mb-1">{brand.name}</div>
                      <div className="flex flex-col gap-1">
                        <div className={`text-[10px] ${optimizationAvailable ? 'text-green-400' : 'text-[#FF2A2A]'}`}>
                          Status: {optimizationAvailable ? 'Ready for Review' : 'Used'} • Resets {(() => {
                            const now = new Date()
                            const dayOfWeek = now.getDay()
                            const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) // If Sunday, 1 day. Otherwise, days until next Monday
                            const nextMonday = new Date(now)
                            nextMonday.setDate(now.getDate() + daysUntilMonday)
                            nextMonday.setHours(0, 0, 0, 0)
                            const diff = nextMonday.getTime() - now.getTime()
                            const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
                            return days <= 1 ? 'Tomorrow' : `in ${days}d`
                          })()}
                        </div>
                        {availability?.lastOptimizationDate && (
                          <div className="text-[10px] text-gray-400">
                            Last used: {availability.lastOptimizationDate}
                          </div>
                        )}
                      </div>
                      {/* Arrow pointing down */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                        <div className="border-4 border-transparent border-t-[#333]"></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      }

      // Generic brand-dependent tools - show brand profile pictures with green dots for available brands
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
                  {/* Tooltip - fixed positioning */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#1A1A1A] text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[9999] border border-[#333] shadow-2xl pointer-events-none">
                    <div className="font-medium">{brand.name}</div>
                    <div className="text-[10px] text-green-400 mt-0.5">Available for this tool</div>
                    {/* Arrow pointing down */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                      <div className="border-4 border-transparent border-t-[#333]"></div>
                    </div>
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
            <span className={`text-xs font-medium ${availableBrands.length > 0 ? 'text-green-400' : 'text-[#FF2A2A]'}`}>
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

  const filteredTools = (() => {
    let tools = reusableTools;
    
    // Filter by brand if a specific brand is selected
    if (selectedBrandFilter !== 'all') {
      tools = tools.filter(tool => {
        // User-dependent tools are always available regardless of brand
        if (tool.dependencyType === 'user') return true;
        
        // Brand-dependent tools need to check if the selected brand has the required platforms
        if (tool.dependencyType === 'brand') {
          const selectedBrand = brands.find(b => b.id === selectedBrandFilter);
          if (!selectedBrand) return false;
          
          // Check if the tool has required platforms
          if (tool.requiresPlatforms) {
            const brandConnections = connections.filter(c => c.brand_id === selectedBrandFilter);
            const availablePlatforms = brandConnections.map(c => c.platform_type);
            return tool.requiresPlatforms.some(platform => availablePlatforms.includes(platform));
          }
          
          return true; // No platform requirements
        }
        
        return true;
      });
    }
    
    // Sort by dependency type: user (agency-dependent) first, then brand-dependent
    return tools.sort((a, b) => {
      const order = { 'user': 0, 'brand': 1, 'none': 2 }
      return order[a.dependencyType] - order[b.dependencyType]
    });
  })()


  const selectedBrand = brands?.find((brand: any) => brand.id === selectedBrandFilter)
  
  // Prevent flashing by using stable previous value during brief loading states
  const [lastValidToolsCount, setLastValidToolsCount] = useState(0)
  
  // Dynamic count based on actual tool availability 
  const availableToolsCount = useMemo(() => {

    
    // If we have connections but loading state just flipped, use stable previous value
    if ((isLoadingConnections || isLoadingUserData) && connections?.length > 0 && lastValidToolsCount > 0) {

      return lastValidToolsCount // Use last known good value during brief loading
    }
    
    if (isLoadingConnections || isLoadingUserData || !connections) {

      return 0 // Return 0 while loading
    }
    
    try {
      // Agency center uses 'all' for tools count - brand-independent
      const availableTools = BASE_REUSABLE_TOOLS.map(tool => getToolAvailability(tool, 'all'))
      const count = availableTools.filter(t => t.status === 'available').length
      


      // Update last valid count for future use during loading states
      if (count > 0) {
        setLastValidToolsCount(count)
      }

      return count
    } catch (error) {

      return 0 // Return 0 on error
    }
  }, [isLoadingConnections, isLoadingUserData, connections, userLeadsCount, userCampaignsCount, userUsageData, toolUsageData, selectedBrandFilter])

  const getButtonText = (tool: ReusableTool) => {
    // If this tool is currently navigating, show stable "Open Tool" text to prevent flashing
    if (navigatingToolId === tool.id) {
      return 'Open Tool'
    }
    
    const buttonText = (() => {
      switch (tool.status) {
        case 'available':
          return 'Open Tool'
        case 'coming-soon':
          return 'Coming Soon'
        case 'unavailable':
          // Show different messages based on dependency type and reason
          if (tool.dependencyType === 'user') {
            // User-dependent tools show Weekly Limit Reached when maxed out
            return 'Weekly Limit Reached'
          }
          if (tool.dependencyType === 'brand') {
            // Brand-dependent tools: check if it's because no brands are connected
            if (!selectedBrandId || brands.length === 0) {
              return 'Connect Brand First'
            }
            // If brands exist but tool is unavailable, it's likely a usage limit
            return 'Weekly Limit Reached'
          }
          return 'Unavailable'
        default:
          return 'Unknown'
      }
    })()
    
    // Log button text changes that might indicate flashing issues
    if (buttonText === 'Weekly Limit Reached' || buttonText === 'Connect Brand First') {

    }
    
    return buttonText
  }



  // Sort brand health data
  const sortedBrandHealthData = useMemo(() => {
    const sorted = [...brandHealthData]
    
    switch (brandHealthSort) {
      case 'critical':
        return sorted.sort((a, b) => {
          const statusOrder = { 'critical': 0, 'warning': 1, 'info': 2, 'healthy': 3 }
          return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
        })
      case 'roas-low':
        return sorted.sort((a, b) => {
          const roasA = a.enhancedROAS || a.roas || 0
          const roasB = b.enhancedROAS || b.roas || 0
          return roasA - roasB
        })
      case 'spend-high':
        return sorted.sort((a, b) => {
          const spendA = a.adSpend || a.spend || 0
          const spendB = b.adSpend || b.spend || 0
          return spendB - spendA
        })
      case 'alphabetical':
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      default:
        return sorted
    }
  }, [brandHealthData, brandHealthSort])


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
      // Manual refresh triggered
      
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

      // Manual refresh completed

      toast.success('Agency center refreshed successfully!', { duration: 3000 })
      // Manual refresh completed
      
    } catch (error) {

      toast.error('Failed to refresh. Please try again.', { duration: 3000 })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Function to handle when tools are used (mark as used and update notifications)
  const handleToolUsed = useCallback((toolId: string) => {
    // Tool used
    
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
    
    // Tool used successfully
  }, [markTaskComplete, userId])

  // Load brand health data with real data and AI synopsis (exactly like action center)


  const loadBrandHealthData = useCallback(async (forceRefresh = false) => {
    if (!userId) return
    
    // Robust loading guard to prevent any duplicate calls
    if (brandHealthLoadingRef.current) {
      return
    }
    brandHealthLoadingRef.current = true
    
    setIsLoadingBrandHealth(true)
    
    try {
      const supabase = await getSupabaseClient()
      
      // Step 1: Get all brands (owned + shared) with at least 1 ad platform connected
      // First get owned brands
      const { data: ownedBrands } = await supabase
        .from('brands')
        .select('id, name, niche, image_url, is_critical')
        .eq('user_id', userId)

      // Then get shared brands through brand_access
      const { data: sharedAccess } = await supabase
        .from('brand_access')
        .select('brand_id')
        .eq('user_id', userId)
        .is('revoked_at', null)

      let sharedBrands: any[] = []
      if (sharedAccess && sharedAccess.length > 0) {
        const sharedBrandIds = sharedAccess.map(access => access.brand_id)
        const { data: sharedBrandDetails } = await supabase
          .from('brands')
          .select('id, name, niche, image_url, is_critical')
          .in('id', sharedBrandIds)
        
        sharedBrands = sharedBrandDetails || []
      }

      // Combine owned and shared brands
      const brands = [...(ownedBrands || []), ...sharedBrands]

      if (!brands?.length) {
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
      
      // Load campaign optimization availability with fresh data AFTER we have them
      const freshCampaignOptAvailability = await loadCampaignOptimizationAvailability(allConnections || [], brands)
      console.log('[Brand Health] Campaign optimization availability loaded (with fresh data):', freshCampaignOptAvailability)

      // Filter brands to only those with ad platforms connected (but include shopify data)
      const brandsWithAdPlatforms = brands.filter(brand => 
        allConnections?.some(conn => 
          conn.brand_id === brand.id && 
          ['meta', 'google', 'tiktok'].includes(conn.platform_type)
        )
      )

      if (!brandsWithAdPlatforms.length) {
        setBrandHealthData([])
        return
      }


      // Step 3: Calculate date ranges (use provided dateRange or default to today)
      const now = new Date()
      const currentHour = now.getHours()
      const isTooEarly = currentHour < 6

      let fromDate: Date
      let toDate: Date
      
      // Brand Health Overview ALWAYS shows today's data only - ignore dateRange picker
      fromDate = new Date(now)
      fromDate.setHours(0, 0, 0, 0)
      toDate = new Date(now)
      toDate.setHours(23, 59, 59, 999)

      // Format dates for queries - use local timezone to avoid UTC conversion issues
      const fromDateStr = fromDate.getFullYear() + '-' +
        String(fromDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(fromDate.getDate()).padStart(2, '0')

      const toDateStr = toDate.getFullYear() + '-' +
        String(toDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(toDate.getDate()).padStart(2, '0')

      // Create ISO strings for the local date range (start of day to end of day in local time)
      // These will be converted to UTC for proper database querying since Shopify stores UTC timestamps
      const localFromDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0, 0)
      const localToDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999)


      // Step 4.5: Trigger fresh data sync if force refresh is requested
      if (forceRefresh) {
        for (const brand of brandsWithAdPlatforms) {
          try {
            // Trigger fresh sync for recent data for each brand
            const syncResponse = await fetch('/api/meta/sync-demographics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                brandId: brand.id
              })
            })
            if (syncResponse.ok) {
            } else {

            }
          } catch (syncError) {

          }
        }
        // Wait a moment for the sync to complete
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Step 5: Process each brand
      const brandHealthPromises = brandsWithAdPlatforms.map(async (brand) => {

        // Get brand connections
        const brandConnections = allConnections?.filter(conn => conn.brand_id === brand.id) || []
        
        // Debug: Log what we're looking for
        
        // Get Meta data from meta_campaign_daily_stats (the correct table)
        // Add cache-busting to ensure we get fresh data
        // Use a more inclusive date range to account for timezone differences
        const adjustedFromDate = new Date(localFromDate)
        adjustedFromDate.setDate(adjustedFromDate.getDate() - 1) // Include previous day
        const adjustedToDate = new Date(localToDate)
        adjustedToDate.setDate(adjustedToDate.getDate() + 1) // Include next day

        const adjustedFromDateStr = adjustedFromDate.getFullYear() + '-' +
          String(adjustedFromDate.getMonth() + 1).padStart(2, '0') + '-' +
          String(adjustedFromDate.getDate()).padStart(2, '0')
        const adjustedToDateStr = adjustedToDate.getFullYear() + '-' +
          String(adjustedToDate.getMonth() + 1).padStart(2, '0') + '-' +
          String(adjustedToDate.getDate()).padStart(2, '0')
          
        const { data: metaData, error: metaError } = await supabase
          .from('meta_campaign_daily_stats')
          .select('date, spend, impressions, clicks, conversions, reach, ctr, cpc, roas, created_at')
          .eq('brand_id', brand.id)
          .gte('date', adjustedFromDateStr)
          .lte('date', adjustedToDateStr)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }) // Get the most recent records first

        // Debug: Log what we got back

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

          
          // Use timezone-aware filtering like the main API
          const { data: allOrders } = await supabase
            .from('shopify_orders')
            .select('total_price, created_at, order_number')
            .in('connection_id', connectionIds)
            .order('created_at', { ascending: false })
          
          // Filter by user's timezone date (same logic as main API)
          const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

          
          const orders = allOrders?.filter(order => {
            if (!order.created_at) return false;
            const orderDate = new Date(order.created_at);
            const userTimezoneDate = orderDate.toLocaleDateString('en-CA', { 
              timeZone: userTimezone 
            }); // YYYY-MM-DD format
            const isIncluded = userTimezoneDate >= fromDateStr && userTimezoneDate <= toDateStr;

            return isIncluded;
          }) || [];
          

          if (orders?.length) {
            const total = orders.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0);

          }
          
          shopifyData = orders
        }

        // Process Meta metrics for the entire date range
        const rawMetaData = metaData || []
        
        // Filter back to the original date range (to exclude the extra days we added for timezone safety)
        const filteredMetaData = rawMetaData.filter((row: any) => {
          const rowDate = row.date
          return rowDate >= fromDateStr && rowDate <= toDateStr
        })
        
        // Debug: Log raw data count
        
        // Deduplicate by date - keep only the most recent record per date to prevent doubling
        const metaDataByDate = new Map()
        filteredMetaData.forEach(record => {
          const existingRecord = metaDataByDate.get(record.date)
          if (!existingRecord || new Date(record.created_at) > new Date(existingRecord.created_at)) {
            metaDataByDate.set(record.date, record)
          }
        })
        
        const totalMeta = Array.from(metaDataByDate.values())
        
        // Debug: Log deduplicated data

        // Validate that we only use today's data and ensure all metrics are real numbers
        // Use the same date format as the query to avoid timezone issues
        const todayStr = fromDateStr // This is already today's date in the correct format
        const todayData = totalMeta.filter(d => d.date === todayStr)
        
        const totalSpend = todayData.reduce((sum, d) => {
          const spend = parseFloat(d.spend) || 0
          return sum + (spend >= 0 ? spend : 0) // Only positive values
        }, 0)
        
        const totalConversions = todayData.reduce((sum, d) => {
          const conversions = parseInt(d.conversions) || 0
          return sum + (conversions >= 0 ? conversions : 0) // Only positive values
        }, 0)
        
        const totalImpressions = todayData.reduce((sum, d) => {
          const impressions = parseInt(d.impressions) || 0
          return sum + (impressions >= 0 ? impressions : 0) // Only positive values
        }, 0)
        
        const totalClicks = todayData.reduce((sum, d) => {
          const clicks = parseInt(d.clicks) || 0
          return sum + (clicks >= 0 ? clicks : 0) // Only positive values
        }, 0)
        
        const avgROAS = todayData.length > 0 ? todayData.reduce((sum, d) => {
          const roas = parseFloat(d.roas) || 0
          return sum + (roas >= 0 ? roas : 0) // Only positive values
        }, 0) / todayData.length : 0

        // For comparison, get the most recent day's data vs the rest
        const sortedMeta = [...totalMeta].sort((a, b) => b.date.localeCompare(a.date))
        const latestDayData = sortedMeta.length > 0 ? sortedMeta.filter(d => d.date === sortedMeta[0].date) : []
        const previousData = sortedMeta.length > 1 ? sortedMeta.filter(d => d.date !== sortedMeta[0].date) : []
        
        const latestDaySpend = latestDayData.reduce((sum, d) => sum + (parseFloat(d.spend) || 0), 0)
        const previousSpend = previousData.reduce((sum, d) => sum + (parseFloat(d.spend) || 0), 0)
        const latestDayROAS = latestDayData.length > 0 ? latestDayData.reduce((sum, d) => sum + (parseFloat(d.roas) || 0), 0) / latestDayData.length : 0
        const previousROAS = previousData.length > 0 ? previousData.reduce((sum, d) => sum + (parseFloat(d.roas) || 0), 0) / previousData.length : 0

        // Debug: Log calculated spend values (removed for production)

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
          } else if (totalSpend === 0 && totalMeta.length === 0 && totalSales > 0) {
            // Shopify-only brand with sales but no ads running
            status = 'info'
          }

          if (salesChange < -30 && shopifyData?.length) {
            status = 'critical'
            alerts.push({ type: 'critical', message: `Sales dropped ${Math.abs(salesChange).toFixed(1)}%` })
          }

          // Generate AI synopsis instead of hardcoded text
          try {
            console.log(`[Brand Health] ${brand.name} - Synopsis check:`, {
              forceRefresh,
              totalSpend,
              totalMetaLength: totalMeta.length,
              totalSales,
              totalOrdersLength: totalOrders.length,
              willCallAI: forceRefresh || totalSpend > 0 || totalMeta.length > 0 || totalSales > 0 || totalOrders.length > 0
            });
            
            if (forceRefresh || totalSpend > 0 || totalMeta.length > 0 || totalSales > 0 || totalOrders.length > 0) {
              console.log(`[Brand Health] ${brand.name} - Calling AI synopsis API...`);
              // Check Marketing Assistant availability from fresh data
              const marketingAssistantAvailable = freshCampaignOptAvailability?.[brand.id]?.optimizationAvailable || false;
              console.log(`[Brand Health] ${brand.name} - Marketing Assistant available:`, marketingAssistantAvailable, freshCampaignOptAvailability?.[brand.id]);
              
              const brandDataForAI = {
                id: brand.id, // Required for AI usage tracking
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
                hasShopifyData: (shopifyData?.length || 0) > 0,
                // Marketing Assistant availability
                marketingAssistantAvailable: marketingAssistantAvailable
              }

              
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
              } else {
                throw new Error('AI synthesis failed')
              }
            } else {
              synopsis = `${brand.name} has no ad activity today yet. Campaigns may be scheduled to start later or need to be activated.`
            }
          } catch (error) {
            console.error(`[Brand Health] ${brand.name} - AI synopsis generation failed:`, error)
            // Use simple overview without AI
            const marketingAssistantAvailable = freshCampaignOptAvailability?.[brand.id]?.optimizationAvailable || false;
            
            synopsis = `Shopify sales are $${totalSales.toFixed(2)} from ${totalOrders.length} orders today. Meta ad spend: $${totalSpend.toFixed(2)} with ${avgROAS.toFixed(2)}x ROAS, ${totalConversions} conversions from ${totalImpressions.toLocaleString()} impressions and ${totalClicks.toLocaleString()} clicks.`
            
            if (marketingAssistantAvailable) {
              synopsis += ` Campaign Optimizer is available - run it for personalized optimization recommendations.`
            }
          }
        }

        const hasData = todayData.length > 0 || totalOrders.length > 0


        // Fetch enhanced metrics for this brand
        let enhancedMetrics = {
          shopifySales: totalSales,
          adRevenue: avgROAS * totalSpend,
          adSpend: totalSpend,
          roas: avgROAS,
          conversions: totalConversions
        }

        try {
          const metricsResponse = await fetch(`/api/metrics/brand-aggregate?brandId=${brand.id}`)
          if (metricsResponse.ok) {
            const metricsData = await metricsResponse.json()
            enhancedMetrics = {
              shopifySales: totalSales, // Always use fresh calculated sales data, not cached API data
              adRevenue: metricsData.adRevenue || (avgROAS * totalSpend),
              adSpend: metricsData.adSpend || totalSpend,
              roas: metricsData.roas || avgROAS,
              conversions: metricsData.conversions || totalConversions
            }
          }
        } catch (error) {

        }

        const brandResult = {
          ...brand,
          connections: brandConnections,
          status,
          synopsis,
          alerts,
          hasData,
          isTooEarly,
          // Original metrics (kept for backwards compatibility)
          spend: totalSpend,
          roas: avgROAS,
          roasChange,
          conversions: totalConversions,
          impressions: totalImpressions,
          clicks: totalClicks,
          sales: totalSales,
          salesChange,
          spendChange,
          lastActivity: metaData?.[0]?.date || shopifyData?.[0]?.created_at || null,
          // Enhanced metrics
          shopifySales: enhancedMetrics.shopifySales,
          adRevenue: enhancedMetrics.adRevenue,
          adSpend: enhancedMetrics.adSpend,
          enhancedROAS: enhancedMetrics.roas,
          enhancedConversions: enhancedMetrics.conversions
        }
        
        return brandResult
      })

      const results = await Promise.all(brandHealthPromises)
      setBrandHealthData(results)
      
    } catch (error) {
      console.error('[Brand Health] Error loading data:', error)
      setBrandHealthData([])
    } finally {
      setIsLoadingBrandHealth(false)
      brandHealthLoadingRef.current = false // Reset loading guard
    }
  }, [userId, getSupabaseClient, dateRange, loadCampaignOptimizationAvailability, campaignOptimizationAvailability])

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

        }
      }




      // Load last refresh time
      const lastRefresh = localStorage.getItem(`lastRefreshTime_${userId}`)
      if (lastRefresh) {
        try {
          setLastRefreshTime(new Date(lastRefresh))
        } catch (error) {

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
        
        // Task states changed
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

    // Listen for manual refresh events
    const handleForceRefresh = () => {

    }

    // Listen for localStorage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `actionCenter_taskStates_${userId}`) {

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
          // Refresh all action center data including brand health for latest sales data
          await Promise.all([
            loadUserData(),
            generateTodos(),
            // Always refresh brand health during manual refresh to get latest data
            loadBrandHealthData(true)
          ])

          // Trigger notification refresh
          // Refresh completed
        } catch (error) {

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
      }, [userId, handleToolUsed, loadUserData, generateTodos, loadBrandHealthData])

  // Load data on mount - inform parent when ready
  useEffect(() => {
    if (userId && !initialLoadRef.current) {
      initialLoadRef.current = true
      const loadInitialData = async () => {
        try {
          // Load all data - always refresh brand health to ensure current sales data
          await Promise.all([
            loadUserData(),
            generateTodos(),
            loadBrandHealthData(true) // Always force refresh to get latest Shopify sales data
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
                <h1 className="text-2xl font-bold text-black bg-[#FF2A2A] px-2 py-1 rounded-md inline-block">Agency Management Center</h1>
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
                <div className="text-sm text-gray-400">Critical Brand Reports</div>
                <div className={cn(
                  "text-xl font-bold mb-1 transition-all duration-300",
                  isWidgetLoading.brandHealth ? "text-gray-600" : "text-white"
                )}>
                  {isWidgetLoading.brandHealth ? "--" : brands.filter(brand => brand.is_critical).length}
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      (isRefreshing || isWidgetLoading.brandHealth)
                        ? "bg-gray-600 animate-pulse" 
                        : "bg-gradient-to-r from-red-500 to-red-600"
                    )}
                    style={{ 
                      width: (isRefreshing || isWidgetLoading.brandHealth)
                        ? '80%' 
                        : `${brands.length > 0 ? (brands.filter(brand => brand.is_critical).length / brands.length) * 100 : 0}%` 
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
            "bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl transition-all duration-300 h-[500px] flex flex-col",
            (isRefreshing || isWidgetLoading.brandHealth) && "opacity-50 grayscale pointer-events-none"
          )}>
            <CardHeader className="pb-4 flex-shrink-0">
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-gray-400 hover:text-white hover:bg-[#333] rounded-md px-2"
                          >
                            <ArrowUpDown className="h-3 w-3 mr-1" />
                            {brandHealthSort === 'critical' && 'Critical First'}
                            {brandHealthSort === 'roas-low' && 'Low ROAS First'}
                            {brandHealthSort === 'spend-high' && 'High Spend First'}
                            {brandHealthSort === 'alphabetical' && 'A-Z'}
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a1a] border border-[#333]">
                          <DropdownMenuItem
                            onClick={() => setBrandHealthSort('critical')}
                            className={cn(
                              "text-[#9ca3af] hover:bg-[#333] hover:text-white cursor-pointer",
                              brandHealthSort === 'critical' && "bg-[#2A2A2A] text-white"
                            )}
                          >
                            Critical First
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setBrandHealthSort('roas-low')}
                            className={cn(
                              "text-[#9ca3af] hover:bg-[#333] hover:text-white cursor-pointer",
                              brandHealthSort === 'roas-low' && "bg-[#2A2A2A] text-white"
                            )}
                          >
                            Low ROAS First
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setBrandHealthSort('spend-high')}
                            className={cn(
                              "text-[#9ca3af] hover:bg-[#333] hover:text-white cursor-pointer",
                              brandHealthSort === 'spend-high' && "bg-[#2A2A2A] text-white"
                            )}
                          >
                            High Spend First
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setBrandHealthSort('alphabetical')}
                            className={cn(
                              "text-[#9ca3af] hover:bg-[#333] hover:text-white cursor-pointer",
                              brandHealthSort === 'alphabetical' && "bg-[#2A2A2A] text-white"
                            )}
                          >
                            Alphabetical
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <div className="h-6 text-xs text-gray-400 rounded-md px-2 flex items-center">
                        <span>{brandHealthData.length} Reports</span>
                      </div>

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
            <CardContent className="flex-1 overflow-y-auto">
              {isLoadingBrandHealth || isWidgetLoading.brandHealth ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="font-medium text-white mb-2">Loading Brand Health Data</h3>
                  <p className="text-[#9ca3af] text-sm">Analyzing performance across all connected platforms...</p>
                </div>
              ) : brandHealthData.length === 0 ? (
                <div className="text-center py-12">
                  <SyncingBrandsDisplay brands={brands || []} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedBrandHealthData.map((brand) => (
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
                        </div>
                      </div>

                      {/* Synopsis */}
                      <div className="mb-3 p-3 bg-[#2A2A2A]/50 rounded-lg border border-[#333]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500 font-medium">
                            {(() => {
                              if (brand.isTooEarly) {
                                return 'Today\'s Synopsis (Available after 6 AM)'
                              }
                              
                              // Brand Health Overview ALWAYS shows today's data only
                              return 'Today\'s Synopsis (Since midnight)'
                            })()}
                          </span>
                          <Settings className="w-3 h-3 text-gray-500" />
                        </div>
                        <p className="text-xs text-[#9ca3af] leading-relaxed">
                          {brand.synopsis}
                        </p>
                        
                        {/* Show sync status for brands with no data */}
                        {!brand.hasData && (
                          <div className="mt-3">
                            <SyncStatusIndicator brandId={brand.id} />
                          </div>
                        )}
                      </div>

                      {/* Enhanced Key Metrics */}
                      {!brand.isTooEarly && brand.hasData && (
                        <TooltipProvider>
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            {/* Total Shopify Sales */}
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <div className="w-3 h-3 flex items-center justify-center">
                                  <img 
                                    src="/shopify-icon.png" 
                                    alt="Shopify" 
                                    className="w-3 h-3 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      const nextSibling = e.currentTarget.nextElementSibling as HTMLElement
                                      if (nextSibling) {
                                        nextSibling.style.display = 'block'
                                      }
                                    }}
                                  />
                                  <ShoppingBag className="w-3 h-3 text-green-400 hidden" />
                                </div>
                              </div>
                              <p className="text-xs text-[#9ca3af] mb-1">Sales</p>
                              <p className="text-sm font-medium text-white">
                                ${brand.shopifySales?.toFixed(2) || brand.sales?.toFixed(2) || '0.00'}
                              </p>
                            </div>

                            {/* Ad Revenue */}
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="text-center cursor-help">
                                  <DollarSign className="w-3 h-3 text-gray-400 mx-auto mb-1" />
                                                                     <p className="text-xs text-[#9ca3af] mb-1">Ad Revenue</p>
                                  <p className="text-sm font-medium text-white">
                                    ${brand.adRevenue?.toFixed(2) || ((brand.roas || 0) * (brand.spend || 0)).toFixed(2)}
                                  </p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#1a1a1a] border-[#333] text-white">
                                <div className="text-xs">
                                  <div className="font-medium mb-1">Ad Revenue:</div>
                                  <div className="flex items-center gap-2">
                                    <img src="/meta-icon.png" alt="Meta" className="w-3 h-3" />
                                    <span>Meta: ${brand.adRevenue?.toFixed(2) || ((brand.roas || 0) * (brand.spend || 0)).toFixed(2)}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>

                            {/* Ad Spend */}
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="text-center cursor-help">
                                  <TrendingUp className="w-3 h-3 text-gray-400 mx-auto mb-1" />
                                  <p className="text-xs text-[#9ca3af] mb-1">Spend</p>
                                  <p className="text-sm font-medium text-white">
                                    ${brand.adSpend?.toFixed(2) || brand.spend?.toFixed(2) || '0.00'}
                                  </p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#1a1a1a] border-[#333] text-white">
                                <div className="text-xs">
                                  <div className="font-medium mb-1">Ad Spend:</div>
                                  <div className="flex items-center gap-2">
                                    <img src="/meta-icon.png" alt="Meta" className="w-3 h-3" />
                                    <span>Meta: ${brand.adSpend?.toFixed(2) || brand.spend?.toFixed(2) || '0.00'}</span>
                                  </div>
                                  <div className="text-[#9ca3af] mt-1">
                                    {brand.enhancedConversions || brand.conversions} conversions
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>

                            {/* ROAS */}
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="text-center cursor-help">
                                  <BarChart3 className="w-3 h-3 text-gray-400 mx-auto mb-1" />
                                  <p className="text-xs text-[#9ca3af] mb-1">ROAS</p>
                                  <p className="text-sm font-medium text-white">
                                    {(brand.enhancedROAS || brand.roas)?.toFixed(2) || '0.00'}x
                                  </p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#1a1a1a] border-[#333] text-white">
                                <div className="text-xs">
                                  <div className="font-medium mb-1">ROAS:</div>
                                  <div className="flex items-center gap-2">
                                    <img src="/meta-icon.png" alt="Meta" className="w-3 h-3" />
                                    <span>Meta: {(brand.enhancedROAS || brand.roas)?.toFixed(2) || '0.00'}x</span>
                                  </div>
                                  {brand.roasChange !== 0 && (
                                    <div className={cn(
                                      "mt-1",
                                      brand.roasChange > 0 ? "text-green-400" : "text-red-400"
                                    )}>
                                      {brand.roasChange > 0 ? '+' : ''}{brand.roasChange.toFixed(1)}% vs yesterday
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Outreach Tasks Widget */}
          <div className="lg:col-span-1">
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
                        {activeTodos.length}
                      </Badge>
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
                        "rounded-lg border p-3 transition-all hover:shadow-md min-w-0",
                        getPriorityColor(todo.priority)
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 flex-shrink-0">
                          {getTypeIcon(todo.type)}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className="bg-[#2A2A2A] text-white text-xs px-2 py-0.5 flex-shrink-0">
                              {todo.count}
                            </Badge>
                            {getPriorityBadge(todo.priority)}
                          </div>
                          <h4 className="font-medium text-white text-sm leading-tight mb-1 break-words">
                            {todo.title}
                          </h4>
                          <p className="text-[#9ca3af] text-xs leading-relaxed mb-3 break-words">
                            {todo.description}
                          </p>
                          <Button 
                            size="sm" 
                            className="w-full bg-[#2A2A2A] hover:bg-[#333] text-white text-xs min-h-[2rem] h-auto py-1.5 whitespace-normal break-words"
                            onClick={() => router.push(todo.targetPage)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="break-words">{todo.action}</span>
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
          <div className="lg:col-span-3">
            <Card className={cn(
              "bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl h-[722px] flex flex-col overflow-visible transition-all duration-300",
              isWidgetLoading.reusableTools && "opacity-50 grayscale pointer-events-none"
            )}>
              <CardHeader className="pb-2 flex-shrink-0 relative z-10">
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
                        {`${availableToolsCount} Available`}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-[#9ca3af] text-sm">
                  Marketing tools and automation features available for your brands
                </CardDescription>
                
                {/* Filters */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {/* Brand Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs bg-transparent border-[#333] text-[#9ca3af] hover:bg-[#333] hover:text-white"
                      >
                        <Filter className="h-3 w-3 mr-1" />
                        {selectedBrandFilter === 'all' ? (
                          `All Brands (${reusableTools.filter(t => t.status === 'available').length})`
                        ) : (
                          <div className="flex items-center gap-1">
                            {selectedBrand && renderBrandAvatar(selectedBrand, 'sm')}
                            <span className="max-w-16 truncate">{selectedBrand?.name || 'Unknown'}</span>
                            <span className="text-xs text-gray-500">({filteredTools.length})</span>
                          </div>
                        )}
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#1a1a1a] border border-[#333]">
                      <DropdownMenuItem
                        onClick={() => setSelectedBrandFilter('all')}
                        className={cn(
                          "text-[#9ca3af] hover:bg-[#333] hover:text-white cursor-pointer",
                          selectedBrandFilter === 'all' && "bg-[#2A2A2A] text-white"
                        )}
                      >
                        <Tag className="h-4 w-4 mr-2" />
                        All Brands ({reusableTools.filter(t => t.status === 'available').length})
                      </DropdownMenuItem>
                      {brands.map((brand: any) => {
                        // Calculate available tools for this specific brand
                        const brandTools = reusableTools.filter(tool => {
                          if (tool.status !== 'available') return false;
                          
                          // User-dependent tools are always available regardless of brand
                          if (tool.dependencyType === 'user') return true;
                          
                          // Brand-dependent tools need to check if this brand has the required platforms
                          if (tool.dependencyType === 'brand') {
                            // Check if the tool has required platforms
                            if (tool.requiresPlatforms) {
                              const brandConnections = connections.filter(c => c.brand_id === brand.id);
                              const availablePlatforms = brandConnections.map(c => c.platform_type);
                              return tool.requiresPlatforms.some(platform => availablePlatforms.includes(platform));
                            }
                            
                            return true; // No platform requirements
                          }
                          
                          return true;
                        });
                        
                        return (
                          <DropdownMenuItem
                            key={brand.id}
                            onClick={() => setSelectedBrandFilter(brand.id)}
                            className={cn(
                              "text-[#9ca3af] hover:bg-[#333] hover:text-white cursor-pointer",
                              selectedBrandFilter === brand.id && "bg-[#2A2A2A] text-white"
                            )}
                          >
                            <div className="flex items-center gap-2 w-full">
                              {renderBrandAvatar(brand, 'sm')}
                              <span className="truncate flex-1">{brand.name}</span>
                              <span className="text-xs text-gray-500">({brandTools.length})</span>
                              {renderConnectionIcons(brand.id)}
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                </div>
              </CardHeader>
              <CardContent className="flex-1 relative overflow-hidden">
                {isWidgetLoading.reusableTools ? (
                  <div className="text-center py-12">
                    <Settings className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="font-medium text-white mb-2">Loading Reusable Tools</h3>
                    <p className="text-[#9ca3af] text-sm">Preparing automation tools and features...</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {/* Responsive grid for all tools */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
                      {filteredTools.map((tool) => {
                        const IconComponent = tool.icon
                        // NEVER disable "Open Tool" buttons - only disable "Coming Soon" tools
                        const isDisabled = tool.status === 'coming-soon'
                        
                        // Add visual indicator for maxed out tools without disabling them
                        const isMaxedOut = tool.status === 'unavailable' && (tool.dependencyType === 'user' || tool.dependencyType === 'brand')
                        
                        return (
                          <div
                            key={tool.id}
                            className={cn(
                              "rounded-lg border p-3 transition-all hover:shadow-md flex flex-col h-full min-w-0 overflow-visible relative",
                              getCategoryColor(tool.category),
                              isDisabled && "opacity-60",
                              // Remove red border for maxed out tools - only button should be red
                              false
                            )}
                          >
                            <div className="flex items-start gap-3 mb-2 min-w-0">
                              <div className="mt-0.5 flex-shrink-0">
                                <IconComponent className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap overflow-visible">
                                  <h4 className="font-medium text-white text-sm leading-tight break-words">
                                    {tool.name}
                                  </h4>
                                  {getStatusBadge(tool)}
                                </div>

                                <p className="text-[#9ca3af] text-xs leading-relaxed mb-2 break-words">
                                  {tool.description}
                                </p>
                                <div className="flex flex-wrap gap-1 mb-2">
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

                              </div>
                            </div>
                            <div className="flex-grow"></div>
                            <Button
                              size="sm"
                              onClick={() => {
                                // Set navigating state to prevent button text flashing
                                setNavigatingToolId(tool.id)
                                
                                // Dispatch tool usage event for notification system
                                window.dispatchEvent(new CustomEvent('toolUsed', { 
                                  detail: { toolId: tool.id, toolName: tool.name }
                                }))

                                // For Campaign Optimization, mark as viewed in localStorage
                                if (tool.id === 'campaign-optimization' && selectedBrandId && selectedBrandId !== 'all') {
                                  const storageKey = `recommendationsViewed_${selectedBrandId}`
                                  localStorage.setItem(storageKey, 'true')
                                  // Reload campaign optimization availability after marking as viewed
                                  setTimeout(() => {
                                    loadCampaignOptimizationAvailability()
                                  }, 100)
                                }
                                
                                // Navigate to tool - always allow navigation
                                router.push(tool.href)
                              }}
                              disabled={isDisabled}
                              className={cn(
                                "w-full text-xs h-7 mt-auto",
                                isDisabled
                                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                  : isMaxedOut
                                      ? getButtonText(tool) === 'Connect Brand First'
                                        ? "bg-gray-700/80 hover:bg-gray-700 text-white border border-gray-600" // Gray button for "Connect Brand First"
                                       : "bg-[#FF2A2A]/80 hover:bg-[#FF2A2A] text-white" // Red button for "Weekly Limit Reached"
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