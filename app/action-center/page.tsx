"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { UnifiedLoading, pageLoadingConfig } from '@/components/ui/unified-loading'
import { useAgency } from '@/contexts/AgencyContext'
import { GridOverlay } from '@/components/GridOverlay'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@clerk/nextjs'
import { getAuthenticatedSupabaseClient, getStandardSupabaseClient } from '@/lib/utils/unified-supabase'
import { toast } from 'react-hot-toast'
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

interface Brand {
  id: string
  name: string
  niche?: string
  image_url?: string
  user_id: string
  is_critical?: boolean
  shared_access?: any
  agency_info?: any
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
  dependencyType: 'user' | 'brand' | 'none' // New field to distinguish dependency types
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
    dependencyType: 'brand' // Depends on brand having Meta connection
  },
  {
    id: 'lead-generator',
    name: 'Lead Generator',
    description: 'Find and qualify leads using real business data',
    icon: Zap,
    category: 'tools',
    href: '/lead-generator',
    features: ['Google Places Integration', 'Lead Scoring', 'Business Intelligence'],
    dependencyType: 'user' // Depends on user having access/usage limits
  },
  {
    id: 'outreach-tool',
    name: 'Outreach Messages',
    description: 'Manage lead outreach campaigns and follow-ups',
    icon: Send,
    category: 'tools',
    href: '/outreach-tool',
    features: ['Email Campaigns', 'Lead Tracking', 'Response Management'],
    dependencyType: 'user' // Depends on user having leads/campaigns
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
    dependencyType: 'brand' // Depends on brand having Meta connection
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
    dependencyType: 'brand' // Depends on brand having Meta connection
  }
]

export default function ActionCenterPage() {
  const { userId, getToken } = useAuth()
  const router = useRouter()
  const { brands: contextBrands, setSelectedBrandId: setBrandContext } = useBrandContext()
  const brands = useMemo(() => contextBrands || [], [contextBrands])
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [loadingPhase, setLoadingPhase] = useState<string>('Initializing Action Center')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [taskStates, setTaskStates] = useState<TaskState>({})
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all')
  const [isLoadingConnections, setIsLoadingConnections] = useState(true)
  
  // Muted notifications state
  const [mutedNotifications, setMutedNotifications] = useState<{[key: string]: boolean}>({})
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all')

  // Brand health read state
  const [readBrandReports, setReadBrandReports] = useState<{[key: string]: boolean}>({})

  // User-dependent data for tool availability
  const [userLeadsCount, setUserLeadsCount] = useState(0)
  const [userCampaignsCount, setUserCampaignsCount] = useState(0)
  const [navigatingToolId, setNavigatingToolId] = useState<string | null>(null)
  const [userUsageData, setUserUsageData] = useState<any[]>([])
  const [isLoadingUserData, setIsLoadingUserData] = useState(false)
  
  // Reset navigating state on unmount to prevent stale state
  useEffect(() => {
    return () => {
      setNavigatingToolId(null)
    }
  }, [])

  // Refresh functionality with cooldown
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { agencySettings: agencyContext } = useAgency()
  const [agencySettingsState, setAgencySettingsState] = useState<{
    agency_name?: string
    agency_logo_url?: string | null
  } | null>(null)

  // Notification system removed

  // Use brands from context


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
      } else {
        setUserLeadsCount(leadsResponse.count || 0)
        console.log(`[Action Center] User has ${leadsResponse.count || 0} leads`)
      }

      // Handle campaigns count
      if (campaignsResponse.error) {
      } else {
        setUserCampaignsCount(campaignsResponse.count || 0)
        console.log(`[Action Center] User has ${campaignsResponse.count || 0} campaigns`)
      }

      // Handle usage data
      if (usageResponse.error) {
      } else {
        setUserUsageData(usageResponse.data || [])
        console.log('[Action Center] User usage data:', usageResponse.data)
      }

      // Handle agency settings
      if (agencyResponse.error) {
      } else {
        setAgencySettingsState(agencyResponse.data)
        console.log('[Action Center] Agency settings:', agencyResponse.data)
      }

    } catch (error) {
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
      } else {
        console.log('[Action Center] Loaded connections:', connectionsData?.length || 0)
        setConnections(connectionsData as PlatformConnection[] || [])
      }
    } catch (error) {
    } finally {
      setIsLoadingConnections(false)
    }
  }, [userId, brands, getSupabaseClient])

  // Get tool availability for a specific brand
  const getToolAvailability = (tool: Omit<ReusableTool, 'status'>, brandId?: string): ReusableTool => {
    console.log(`[Action Center] Checking availability for ${tool.name}:`, {
      toolId: tool.id,
      dependencyType: tool.dependencyType,
      selectedBrandId: brandId,
      userLeadsCount,
      userCampaignsCount,
      availableBrands: brands.length,
      connections: connections.length
    })

    // Coming soon tools are always coming soon
    if (tool.id === 'ad-creative-studio') {
      console.log(`[Action Center] ${tool.name}: Coming soon`)
      return { ...tool, status: 'coming-soon' }
    }

    // Handle different dependency types
    switch (tool.dependencyType) {
      case 'none':
        // No dependencies, always available (or coming soon as handled above)
        console.log(`[Action Center] ${tool.name}: Available (no dependencies)`)
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
          const WEEKLY_LIMIT = 50 // 50 generations per week
          const currentWeeklyUsage = userUsageData?.reduce((sum: number, record: any) => {
            const recordDate = new Date(record.date)
            if (recordDate >= startOfWeek && recordDate < startOfNextWeek) {
              return sum + (record.generation_count || 0)
            }
            return sum
          }, 0) || 0

          const hasGenerationsLeft = currentWeeklyUsage < WEEKLY_LIMIT
          console.log(`[Action Center] ${tool.name}: ${hasGenerationsLeft ? 'Available' : 'Unavailable'} (usage: ${currentWeeklyUsage}/${WEEKLY_LIMIT})`)
          return { 
            ...tool, 
            status: hasGenerationsLeft ? 'available' : 'unavailable'
          }
        }
        
        if (tool.id === 'outreach-tool') {
          // Outreach tool needs user to have leads to manage
          const hasLeads = userLeadsCount > 0 || userCampaignsCount > 0
          console.log(`[Action Center] ${tool.name}: ${hasLeads ? 'Available' : 'Unavailable'} (hasLeads: ${hasLeads})`)
          return { 
            ...tool, 
            status: hasLeads ? 'available' : 'unavailable'
          }
        }
        
        // Default for user-dependent tools
        console.log(`[Action Center] ${tool.name}: Available (default user-dependent)`)
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
            className="w-3 h-3 rounded-sm overflow-hidden border border-gray-500/40 bg-gray-600/15"
            title={`${connection.platform_type.charAt(0).toUpperCase() + connection.platform_type.slice(1)} connected`}
          >
            {connection.platform_type === 'shopify' && (
              <img 
                src="https://i.imgur.com/cnCcupx.png" 
                alt="Shopify" 
                className="w-full h-full object-contain"
              />
            )}
            {connection.platform_type === 'meta' && (
              <img 
                src="https://i.imgur.com/VAR7v4w.png" 
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
                tool.dependencyType === 'brand' && (!selectedBrandId || brands.length === 0) 
                  ? 'Connect Brand First' 
                  : 'Weekly Limit Reached'
              }
            </span>
          </div>
        </div>
      )
    }

    if (tool.dependencyType === 'brand') {
      // Brand-dependent tools - show brand profile pictures with green dots for available brands
      // Filter brands based on selectedBrandId
      const selectedBrand = brands.find((brand: any) => brand.id === selectedBrandId)
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
            {brandsToShow.slice(0, 3).map((brand: any) => {
              const isAvailable = availableBrands.some(b => b.id === brand.id)
              const brandInitials = brand.name?.charAt(0)?.toUpperCase() || 'B'
              
              return (
                <div key={brand.id} className="relative group">
                  {brand.image_url ? (
                    <div className={`w-6 h-6 rounded-full overflow-hidden border border-[#444] bg-[#2A2A2A] flex items-center justify-center flex-shrink-0 ${
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
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-[#1A1A1A]"></div>
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
  }, [userId, getSupabaseClient])



  // Load data - using refs to avoid dependency loops
  const loadingRef = useRef(false)

  // Filter active todos (same logic as simple-todos)
  const activeTodos = todos.filter(todo => isTaskActive(todo.id))

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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
          case 'high': return <Badge className="text-xs bg-red-600 text-white">High</Badge>
    case 'medium': return <Badge className="text-xs bg-orange-600 text-white">Medium</Badge>
    case 'low': return <Badge className="text-xs bg-gray-600 text-white">Low</Badge>
      default: return <Badge variant="outline" className="text-xs">Normal</Badge>
    }
  }

  const selectedBrand = brands.find((brand: any) => brand.id === selectedBrandId)
  const availableToolsCount = filteredTools.filter(t => t.status === 'available').length

  const getButtonText = (tool: ReusableTool) => {
    // If this tool is currently navigating, show stable "Open Tool" text to prevent flashing
    if (navigatingToolId === tool.id) {
      return 'Open Tool'
    }
    
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
  }

  // Load muted notifications from localStorage
  useEffect(() => {
    if (userId) {
      const saved = localStorage.getItem(`mutedNotifications_${userId}`)
      if (saved) {
        try {
          setMutedNotifications(JSON.parse(saved))
        } catch (error) {
          console.error('Error loading muted notifications:', error)
        }
      }
    }
  }, [userId])

  // Save muted notifications to localStorage
  useEffect(() => {
    if (userId && Object.keys(mutedNotifications).length > 0) {
      localStorage.setItem(`mutedNotifications_${userId}`, JSON.stringify(mutedNotifications))
    }
  }, [userId, mutedNotifications])

  // Load read brand reports from localStorage
  useEffect(() => {
    if (userId) {
      const saved = localStorage.getItem(`readBrandReports_${userId}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setReadBrandReports(parsed)
        } catch (error) {
          console.error('Error loading read brand reports:', error)
          setReadBrandReports({}) // Reset to empty if corrupted
        }
      } else {
        setReadBrandReports({}) // Explicitly set to empty object
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

  // Save read brand reports to localStorage
  useEffect(() => {
    if (userId && Object.keys(readBrandReports).length > 0) {
      localStorage.setItem(`readBrandReports_${userId}`, JSON.stringify(readBrandReports))
    }
  }, [userId, readBrandReports])

  // Functions for muting/unmuting notifications
  const toggleMuteNotification = (notificationKey: string) => {
    setMutedNotifications(prev => {
      const newMutedState = {
        ...prev,
        [notificationKey]: !prev[notificationKey]
      }
      
      // Save to localStorage immediately
      if (userId) {
        localStorage.setItem(`mutedNotifications_${userId}`, JSON.stringify(newMutedState))
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
    
    // Show feedback
    toast.success(`Marked ${unreadCount} reports as read`, { duration: 2000 })
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
      console.log('[Action Center] Manual refresh triggered')
      
      // Update last refresh time immediately
      setLastRefreshTime(refreshTime)
      if (userId) {
        localStorage.setItem(`lastRefreshTime_${userId}`, refreshTime.toISOString())
      }

      // Show toast notification
      toast.success('Refreshing AI reports and tool status...', { duration: 2000 })

      // Refresh all data
      await Promise.all([
        loadUserData(),
        loadConnections(),
        generateTodos(),
        loadBrandHealthData(true) // Force refresh
      ])

      // Refresh completed

      toast.success('Action Center refreshed successfully!', { duration: 3000 })
      console.log('[Action Center] Manual refresh completed')
      
    } catch (error) {
      console.error('[Action Center] Error during manual refresh:', error)
      toast.error('Failed to refresh. Please try again.', { duration: 3000 })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Brand Health data state
  const [brandHealthData, setBrandHealthData] = useState<any[]>([])
  const [isLoadingBrandHealth, setIsLoadingBrandHealth] = useState(false)

  // Load brand health data with correct tables and logic
  const loadBrandHealthData = useCallback(async (forceRefresh = false) => {
    if (!userId) return
    
    setIsLoadingBrandHealth(true)
    // console.log('[Brand Health] Starting data load...', forceRefresh ? '(FORCE REFRESH)' : '')
    
    try {
      const supabase = await getSupabaseClient()
      
      // Step 1: Get all brands with at least 1 ad platform connected
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name, niche, image_url, is_critical')
        .eq('user_id', userId)

      if (!brands?.length) {
        // console.log('[Brand Health] No brands found')
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
        // console.log('[Brand Health] No brands with ad platforms found')
        setBrandHealthData([])
        return
      }

      // console.log(`[Brand Health] Found ${brandsWithAdPlatforms.length} brands with ad platforms`)

      // Step 3: Check if it's too early (before 6 AM)
      const now = new Date()
      const currentHour = now.getHours()
      const isTooEarly = currentHour < 6

      // Step 4: Calculate date ranges (today from midnight, yesterday for comparison)
      const todayMidnight = new Date(now)
      todayMidnight.setHours(0, 0, 0, 0)
      
      const yesterdayMidnight = new Date(todayMidnight)
      yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1)
      
      // Use local dates instead of UTC to avoid timezone issues
      const todayDateStr = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0')
      
      const yesterdayDateStr = yesterdayMidnight.getFullYear() + '-' + 
        String(yesterdayMidnight.getMonth() + 1).padStart(2, '0') + '-' + 
        String(yesterdayMidnight.getDate()).padStart(2, '0')

      // console.log(`[Brand Health] Analyzing ${isTooEarly ? 'too early' : 'today'}: ${todayDateStr} vs yesterday: ${yesterdayDateStr}`)

      // Step 4.5: Trigger fresh data sync if force refresh is requested
      if (forceRefresh) {
        // console.log('[Brand Health] Force refresh triggered - syncing latest Meta data...')
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
              // console.log(`[Brand Health] ${brand.name} - Fresh sync completed`)
            } else {
              // console.warn(`[Brand Health] ${brand.name} - Sync failed:`, await syncResponse.text())
            }
          } catch (syncError) {
            // console.warn(`[Brand Health] ${brand.name} - Sync error:`, syncError)
          }
        }
        // Wait a moment for the sync to complete
        await new Promise(resolve => setTimeout(resolve, 2000))
        // console.log('[Brand Health] Force refresh sync completed, proceeding with data load...')
      }

      // Step 5: Process each brand
      const brandHealthPromises = brandsWithAdPlatforms.map(async (brand) => {
        // console.log(`[Brand Health] Processing ${brand.name}...`)

        // Get brand connections
        const brandConnections = allConnections?.filter(conn => conn.brand_id === brand.id) || []
        
        // Debug: Log what we're looking for
        // console.log(`[Brand Health] ${brand.name} - Looking for Meta data on dates:`, [todayDateStr, yesterdayDateStr])
        // console.log(`[Brand Health] ${brand.name} - Brand ID:`, brand.id)
        
        // Get Meta data from meta_campaign_daily_stats (the correct table)
        // Add cache-busting to ensure we get fresh data
        const { data: metaData, error: metaError } = await supabase
          .from('meta_campaign_daily_stats')
          .select('date, spend, impressions, clicks, conversions, reach, ctr, cpc, roas, created_at')
          .eq('brand_id', brand.id)
          .in('date', [todayDateStr, yesterdayDateStr])
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }) // Get the most recent records first

        // Debug: Log what we got back
        // console.log(`[Brand Health] ${brand.name} - Meta query result:`, { metaData, metaError })
        // console.log(`[Brand Health] ${brand.name} - Meta data count:`, metaData?.length || 0)

        // Debug: Check what Meta data exists for this brand (any date)
        const { data: allMetaData } = await supabase
          .from('meta_campaign_daily_stats')
          .select('date, spend, brand_id')
          .eq('brand_id', brand.id)
          .order('date', { ascending: false })
          .limit(5)
        
        // console.log(`[Brand Health] ${brand.name} - All Meta data (last 5 days):`, allMetaData)

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
            .gte('created_at', yesterdayMidnight.toISOString())
            .order('created_at', { ascending: false })
          shopifyData = orders
        }

        // Process Meta metrics with deduplication to prevent data doubling
        const rawMetaData = metaData || []
        
        // Deduplicate by date - keep only the most recent record per date
        const metaDataByDate = new Map()
        rawMetaData.forEach(record => {
          const existingRecord = metaDataByDate.get(record.date)
          if (!existingRecord || new Date(record.created_at) > new Date(existingRecord.created_at)) {
            metaDataByDate.set(record.date, record)
          }
        })
        
        const deduplicatedMeta = Array.from(metaDataByDate.values())
        
        // Debug: Log deduplication results
        // console.log(`[Brand Health] ${brand.name} - Raw Meta data:`, rawMetaData.length, 'records, deduplicated:', deduplicatedMeta.length)
        
        const todayMeta = deduplicatedMeta.filter(d => d.date === todayDateStr)
        const yesterdayMeta = deduplicatedMeta.filter(d => d.date === yesterdayDateStr)

        // Debug: Log filtered data for each day
        // console.log(`[Brand Health] ${brand.name} - Today Meta filtered (${todayDateStr}):`, todayMeta)
        // console.log(`[Brand Health] ${brand.name} - Yesterday Meta filtered (${yesterdayDateStr}):`, yesterdayMeta)

        const todaySpend = todayMeta.reduce((sum, d) => sum + (parseFloat(d.spend) || 0), 0)
        const todayConversions = todayMeta.reduce((sum, d) => sum + (parseInt(d.conversions) || 0), 0)
        const todayImpressions = todayMeta.reduce((sum, d) => sum + (parseInt(d.impressions) || 0), 0)
        const todayClicks = todayMeta.reduce((sum, d) => sum + (parseInt(d.clicks) || 0), 0)
        const todayROAS = todayMeta.length > 0 ? todayMeta.reduce((sum, d) => sum + (parseFloat(d.roas) || 0), 0) / todayMeta.length : 0

        const yesterdaySpend = yesterdayMeta.reduce((sum, d) => sum + (parseFloat(d.spend) || 0), 0)
        const yesterdayROAS = yesterdayMeta.length > 0 ? yesterdayMeta.reduce((sum, d) => sum + (parseFloat(d.roas) || 0), 0) / yesterdayMeta.length : 0

        // Debug: Log calculated spend values
        // console.log(`[Brand Health] ${brand.name} - Calculated todaySpend: $${todaySpend}, yesterdaySpend: $${yesterdaySpend}`)

        // Calculate changes
        const spendChange = yesterdaySpend > 0 ? ((todaySpend - yesterdaySpend) / yesterdaySpend) * 100 : 0
        const roasChange = yesterdayROAS > 0 ? ((todayROAS - yesterdayROAS) / yesterdayROAS) * 100 : 0

        // Process Shopify sales
        const todayOrders = shopifyData?.filter(order => 
          new Date(order.created_at) >= todayMidnight
        ) || []
        const yesterdayOrders = shopifyData?.filter(order => {
          const orderDate = new Date(order.created_at)
          return orderDate >= yesterdayMidnight && orderDate < todayMidnight
        }) || []

        const todaySales = todayOrders.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0)
        const yesterdaySales = yesterdayOrders.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0)
        const salesChange = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0

        // Determine status and generate alerts
        let status = 'healthy'
        let synopsis = ''
        const alerts = []

        if (isTooEarly) {
          status = 'info'
          synopsis = `${brand.name} analysis will be available after 6 AM when sufficient data is collected for today's performance.`
        } else {
          // Check for issues
          if (todayROAS < 1 && todaySpend > 0) {
            status = 'critical'
            alerts.push({ type: 'critical', message: `ROAS below 1.0 (${todayROAS.toFixed(2)})` })
          } else if (roasChange < -20 && todaySpend > 0) {
            status = 'warning'
            alerts.push({ type: 'warning', message: `ROAS dropped ${Math.abs(roasChange).toFixed(1)}%` })
          }

          if (salesChange < -30 && shopifyData?.length) {
            status = 'critical'
            alerts.push({ type: 'critical', message: `Sales dropped ${Math.abs(salesChange).toFixed(1)}%` })
          }

          // Generate AI synopsis instead of hardcoded text
          try {
            if (forceRefresh || todaySpend > 0 || todayMeta.length > 0) {
              const brandDataForAI = {
                name: brand.name,
                roas: todayROAS,
                roasChange: roasChange,
                spend: todaySpend,
                revenue: todaySales,
                salesChange: salesChange,
                conversions: todayConversions,
                impressions: todayImpressions,
                clicks: todayClicks,
                status: status,
                connections: brandConnections.map(c => c.platform_type),
                hasData: todayMeta.length > 0 || todayOrders.length > 0,
                spendChange: spendChange,
                // Enhanced Shopify details
                shopifyConnected: (shopifyConnections?.length || 0) > 0,
                shopifyOrders: todayOrders.length,
                shopifyOrdersYesterday: yesterdayOrders.length,
                avgOrderValue: todayOrders.length > 0 ? todaySales / todayOrders.length : 0,
                hasShopifyData: (shopifyData?.length || 0) > 0
              }

              // console.log(`[Brand Health] ${brand.name} - Generating AI synopsis...`)
              
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
                // console.log(`[Brand Health] ${brand.name} - AI synopsis generated successfully`)
              } else {
                throw new Error('AI synthesis failed')
              }
            } else {
              synopsis = `${brand.name} has no ad activity today yet. Campaigns may be scheduled to start later or need to be activated.`
            }
          } catch (error) {
            // console.warn(`[Brand Health] ${brand.name} - AI synopsis generation failed:`, error)
            // Fallback to simple factual statement
            if (todaySpend === 0 && todayMeta.length === 0) {
              synopsis = `${brand.name} has no ad activity today yet. Campaigns may be scheduled to start later or need to be activated.`
            } else {
              synopsis = `${brand.name} spent $${todaySpend.toFixed(2)} with ${todayROAS.toFixed(2)} ROAS since midnight. ${todayConversions} conversions from ${todayImpressions.toLocaleString()} impressions and ${todayClicks.toLocaleString()} clicks.`
              
              if (shopifyData?.length) {
                synopsis += ` Sales: $${todaySales.toFixed(2)} (${salesChange > 0 ? '+' : ''}${salesChange.toFixed(1)}% vs yesterday).`
              }
              
              if (roasChange !== 0) {
                synopsis += ` ROAS ${roasChange > 0 ? 'improved' : 'declined'} ${Math.abs(roasChange).toFixed(1)}% vs yesterday.`
              }
            }
          }
        }

        const hasData = todayMeta.length > 0 || todayOrders.length > 0

        // console.log(`[Brand Health] ${brand.name} - Status: ${status}, Spend: $${todaySpend}, ROAS: ${todayROAS.toFixed(2)}`)

        return {
          ...brand,
          connections: brandConnections,
          status,
          synopsis,
          alerts,
          hasData,
          isTooEarly,
          // Metrics
          spend: todaySpend,
          roas: todayROAS,
          roasChange,
          conversions: todayConversions,
          impressions: todayImpressions,
          clicks: todayClicks,
          sales: todaySales,
          salesChange,
          spendChange,
          lastActivity: metaData?.[0]?.date || shopifyData?.[0]?.created_at || null
        }
      })

      const results = await Promise.all(brandHealthPromises)
      // console.log(`[Brand Health] Processed ${results.length} brands`)
      
      setBrandHealthData(results)
    } catch (error) {
      console.error('[Brand Health] Error loading data:', error)
      setBrandHealthData([])
         } finally {
       setIsLoadingBrandHealth(false)
     }
   }, [userId, getSupabaseClient])

  // Main data loading coordinator with progressive loading
  const loadAllData = useCallback(async () => {
    if (!userId) {
      console.log("[Action Center] No user ID, stopping loading")
      setIsDataLoading(false)
      return
    }

    console.log('[Action Center] Starting progressive data loading...')
    setIsDataLoading(true)
    setLoadingProgress(0)

    // Set initial refresh time when page loads
    const initialLoadTime = new Date()
    setLastRefreshTime(initialLoadTime)
    if (userId) {
      localStorage.setItem(`lastRefreshTime_${userId}`, initialLoadTime.toISOString())
    }

    try {
      // Phase 1: Initialize connections and user data
      setLoadingPhase('Connecting to your accounts...')
      setLoadingProgress(10)
      await new Promise(resolve => setTimeout(resolve, 500))

      await Promise.all([
        loadUserData(),
        loadConnections()
      ])

      // Phase 2: Generate todos and check outreach data
      setLoadingPhase('Analyzing your outreach campaigns...')
      setLoadingProgress(30)
      await new Promise(resolve => setTimeout(resolve, 700))

      await generateTodos()

      // Phase 3: Load brand health data
      setLoadingPhase('Checking brand performance...')
      setLoadingProgress(50)
      await new Promise(resolve => setTimeout(resolve, 600))

      await loadBrandHealthData(true)

      // Phase 4: Calculate tool availability
      setLoadingPhase('Preparing marketing tools...')
      setLoadingProgress(70)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Tool availability is calculated automatically in useMemo, just wait a moment
      await new Promise(resolve => setTimeout(resolve, 300))

      // Phase 5: Trigger notification refresh
      setLoadingPhase('Updating notifications...')
      setLoadingProgress(85)
      await new Promise(resolve => setTimeout(resolve, 400))

      // Data loading completed

      // Phase 6: Finalize
      setLoadingPhase('Finalizing your dashboard...')
      setLoadingProgress(95)
      await new Promise(resolve => setTimeout(resolve, 300))

      setLoadingProgress(100)
      setLoadingPhase('Ready!')
      await new Promise(resolve => setTimeout(resolve, 200))

      setIsDataLoading(false)
      
      console.log('[Action Center] ✅ All data loaded successfully!')
      
    } catch (error) {
      console.error('[Action Center] Error during data loading:', error)
      setIsDataLoading(false)
    }
  }, [userId, brands.length, loadUserData, loadConnections, generateTodos, loadBrandHealthData])

  // Load data when component mounts
  useEffect(() => {
    const initializeData = async () => {
      if (loadingRef.current) return // Prevent concurrent loads
      
      loadingRef.current = true
      
      try {
        await loadAllData()
      } finally {
        loadingRef.current = false
      }
    }

    if (userId && !loadingRef.current) {
      initializeData()
    }
  }, [userId, loadAllData])

  // Refresh usage data when user comes back to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && userId) {
        console.log('[Action Center] Page became visible, refreshing usage data...')
        loadUserData() // Refresh usage stats
      }
    }

    const handleFocus = () => {
      if (userId) {
        console.log('[Action Center] Window focused, refreshing usage data...')
        loadUserData() // Refresh usage stats
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [userId, loadUserData])

  // Show progressive loading screen
  if (isDataLoading) {
    return (
      <div className="w-full min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center relative overflow-hidden py-8">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        <div className="relative z-10 text-center max-w-lg mx-auto px-6">
          {/* Main loading icon */}
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-white/60 animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
              {agencyContext?.agency_logo_url && (
                <img 
                  src={agencyContext.agency_logo_url} 
                  alt={`${agencyContext?.agency_name || 'Agency'} Logo`}
                  className="w-12 h-12 object-contain rounded"
                />
              )}
            </div>
          </div>
          
          {/* Loading title */}
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Action Center
          </h1>
          
          {/* Dynamic loading phase */}
          <p className="text-xl text-gray-300 mb-6 font-medium min-h-[28px]">
            {loadingPhase}
          </p>
          
          {/* Progress bar */}
          <div className="w-full max-w-md mx-auto mb-6">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Progress</span>
              <span>{loadingProgress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-white/60 to-white/80 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>
          
          {/* Loading phases checklist */}
          <div className="text-left space-y-2 text-sm text-gray-400">
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 10 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 30 ? 'bg-green-400' : loadingProgress >= 10 ? 'bg-white/60' : 'bg-white/20'}`}></div>
              <span>Connecting to your accounts</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 30 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 50 ? 'bg-green-400' : loadingProgress >= 30 ? 'bg-white/60' : 'bg-white/20'}`}></div>
              <span>Analyzing your outreach campaigns</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 50 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 70 ? 'bg-green-400' : loadingProgress >= 50 ? 'bg-white/60' : 'bg-white/20'}`}></div>
              <span>Checking brand performance</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 70 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 85 ? 'bg-green-400' : loadingProgress >= 70 ? 'bg-white/60' : 'bg-white/20'}`}></div>
              <span>Preparing marketing tools</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 85 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 95 ? 'bg-green-400' : loadingProgress >= 85 ? 'bg-white/60' : 'bg-white/20'}`}></div>
              <span>Updating notifications</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 95 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 100 ? 'bg-green-400' : loadingProgress >= 95 ? 'bg-white/60' : 'bg-white/20'}`}></div>
              <span>Finalizing your dashboard</span>
            </div>
          </div>
          
          {/* Subtle loading tip */}
          <div className="mt-8 text-xs text-gray-500 italic">
            Building your personalized action dashboard...
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] p-4 pb-6 animate-in fade-in duration-300 relative">
      <GridOverlay />
      <div className="max-w-[1400px] mx-auto space-y-6 relative z-10">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                            flex items-center justify-center border border-white/10">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Action Center</h1>
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
                <div className="text-xl font-bold text-white mb-1">
                  {activeTodos.filter(t => t.priority === 'high').length}
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      isRefreshing 
                        ? "bg-gray-600 animate-pulse" 
                        : "bg-gradient-to-r from-gray-400 to-gray-500"
                    )}
                    style={{ 
                      width: isRefreshing 
                        ? '60%' 
                        : `${activeTodos.length > 0 ? (activeTodos.filter(t => t.priority === 'high').length / activeTodos.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {activeTodos.length} total tasks
                </div>
              </div>
              <div className="text-right min-w-[120px]">
                <div className="text-sm text-gray-400">Useable AI Tools</div>
                <div className="text-xl font-bold text-white mb-1">
                  {availableToolsCount}
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      isRefreshing 
                        ? "bg-gray-600 animate-pulse" 
                        : "bg-gradient-to-r from-gray-400 to-gray-500"
                    )}
                    style={{ 
                      width: isRefreshing 
                        ? '75%' 
                        : `${reusableTools.length > 0 ? (availableToolsCount / reusableTools.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {reusableTools.length} total tools
                </div>
              </div>
              <div className="text-right min-w-[120px]">
                <div className="text-sm text-gray-400">Critical Brand Reports</div>
                <div className="text-xl font-bold text-white mb-1">
                  {brands.filter(brand => brand.is_critical).length}
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      isRefreshing 
                        ? "bg-gray-600 animate-pulse" 
                        : "bg-gradient-to-r from-red-500 to-red-600"
                    )}
                    style={{ 
                      width: isRefreshing 
                        ? '80%' 
                        : `${brands.length > 0 ? (brands.filter(brand => brand.is_critical).length / brands.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {brands.length} total brands
                </div>
              </div>
              {/* Refresh button */}
              <div className="text-right border-l border-[#333] pl-4">
                <div className="text-sm text-gray-400">
                  {lastRefreshTime ? `Last refresh: ${format(lastRefreshTime, 'h:mm a')}` : 'Never refreshed'}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleRefresh}
                      disabled={!canRefresh() || isRefreshing}
                      size="sm"
                      className={cn(
                        "h-8 text-xs mt-1",
                        canRefresh() && !isRefreshing
                          ? "bg-[#2A2A2A] hover:bg-[#333] text-white border border-[#444] hover:border-[#555]"
                          : "bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-600"
                      )}
                    >
                      {isRefreshing ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-1" />
                      )}
                      {isRefreshing ? 'Refreshing...' : canRefresh() ? 'Refresh' : getCooldownTime()}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {canRefresh() 
                        ? 'Refresh AI reports and tool status' 
                        : `Available in ${getCooldownTime()}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
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
            isRefreshing && "opacity-50 grayscale pointer-events-none"
          )}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-white text-lg">Brand Health Overview</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {isLoadingBrandHealth && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      <span className="text-xs text-gray-400">Loading...</span>
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
                      {/* Debug/Testing button to mark all as unread */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-gray-500 hover:text-white hover:bg-[#333] rounded-md px-2"
                        onClick={() => {
                          setReadBrandReports({})
                          if (userId) {
                            localStorage.setItem(`readBrandReports_${userId}`, JSON.stringify({}))
                          }
                          toast.success('All reports marked as unread', { duration: 2000 })
                        }}
                        title="Testing: Mark all as unread"
                      >
                        <RefreshCw className="w-3 h-3" />
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
              
              {/* Brand Filter */}
              {brandHealthData.length > 1 && (
                <div className="flex gap-3 pt-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs bg-transparent border-[#333] text-[#9ca3af] hover:bg-[#333] hover:text-white"
                      >
                        <Filter className="h-3 w-3 mr-1" />
                        {selectedBrandFilter === 'all' ? (
                          `All Brands (${brandHealthData.length})`
                        ) : (
                          brandHealthData.find(b => b.id === selectedBrandFilter)?.name || 'Unknown'
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
                        All Brands ({brandHealthData.length})
                      </DropdownMenuItem>
                      {brandHealthData.map((brand) => (
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
                            {/* Platform icons */}
                            <div className="flex items-center gap-1">
                              {brand.connections.map((conn: any, idx: number) => (
                                <div
                                  key={`${conn.platform_type}-${brand.id}`}
                                  className="w-3 h-3 rounded-sm overflow-hidden border border-gray-500/40 bg-gray-600/15"
                                  title={`${conn.platform_type.charAt(0).toUpperCase() + conn.platform_type.slice(1)} connected`}
                                >
                                  {conn.platform_type === 'meta' && (
                                    <img 
                                      src="https://i.imgur.com/VAR7v4w.png" 
                                      alt="Meta" 
                                      className="w-full h-full object-contain"
                                    />
                                  )}
                                  {conn.platform_type === 'shopify' && (
                                    <img 
                                      src="https://i.imgur.com/cnCcupx.png" 
                                      alt="Shopify" 
                                      className="w-full h-full object-contain"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {brandHealthData.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="font-medium text-white mb-2">No Brands with Ad Platforms</h3>
                  <p className="text-[#9ca3af] text-sm">Connect Meta, Google, or TikTok to brands to see performance insights.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brandHealthData
                    .filter(brand => selectedBrandFilter === 'all' || brand.id === selectedBrandFilter)
                    .map((brand) => (
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
                              setBrandContext(brand.id)
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

        {/* Main Content - Tall Grid Layout for Bottom Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          
          {/* Outreach Tasks Widget - 25% width, tall height */}
          <div className="md:col-span-1">
            <Card className={cn(
              "bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl h-[722px] flex flex-col transition-all duration-300",
              isRefreshing && "opacity-50 grayscale pointer-events-none"
            )}>
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-white text-lg">Outreach Tasks</CardTitle>
                  </div>
                  {activeTodos.length > 0 && (
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
                {activeTodos.length > 0 ? (
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
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                className="w-full bg-[#2A2A2A] hover:bg-[#333] text-white text-xs h-8"
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
                                  className="w-full bg-[#2A2A2A] hover:bg-[#333] text-white"
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

          {/* Reusable Tools Widget - 75% width, tall height */}
          <div className="md:col-span-3">
            <Card className={cn(
              "bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl h-[722px] flex flex-col transition-all duration-300",
              isRefreshing && "opacity-50 grayscale pointer-events-none"
            )}>
              <CardHeader className="pb-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-white text-lg">Reusable Tools & Automation</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
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
                <div className="space-y-4">
                  {/* First row - 3 tools */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filteredTools.slice(0, 3).map((tool) => {
                      const IconComponent = tool.icon
                      // NEVER disable "Open Tool" buttons - only disable "Coming Soon" tools
                      const isDisabled = tool.status === 'coming-soon'
                      
                      // Add visual indicator for maxed out tools without disabling them
                      const isMaxedOut = tool.status === 'unavailable' && (tool.dependencyType === 'user' || tool.dependencyType === 'brand')
                      
                      return (
                        <div
                          key={tool.id}
                          className={cn(
                            "rounded-lg border p-4 transition-all hover:shadow-md flex flex-col h-full",
                            getCategoryColor(tool.category),
                            isDisabled && "opacity-60",
                            // Remove red border for maxed out tools - only button should be red
                            false
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
                              setNavigatingToolId(tool.id)
                              router.push(tool.href)
                            }}
                            disabled={isDisabled}
                            className={cn(
                              "w-full text-xs h-8",
                              isDisabled
                                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                : isMaxedOut
                                  ? "bg-red-600/80 hover:bg-red-600 text-white" // Red button for maxed out tools
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
                  
                  {/* Second row - 2 tools centered */}
                  {filteredTools.length > 3 && (
                    <div className="flex justify-center">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                                              {filteredTools.slice(3).map((tool) => {
                          const IconComponent = tool.icon
                          // NEVER disable "Open Tool" buttons - only disable "Coming Soon" tools
                          const isDisabled = tool.status === 'coming-soon'
                          
                          // Add visual indicator for maxed out tools without disabling them
                          const isMaxedOut = tool.status === 'unavailable' && (tool.dependencyType === 'user' || tool.dependencyType === 'brand')
                          
                          return (
                            <div
                              key={tool.id}
                              className={cn(
                                "rounded-lg border p-4 transition-all hover:shadow-md flex flex-col h-full",
                                getCategoryColor(tool.category),
                                isDisabled && "opacity-60",
                                // Remove red border for maxed out tools - only button should be red
                            false
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
                              setNavigatingToolId(tool.id)
                              router.push(tool.href)
                            }}
                            disabled={isDisabled}
                            className={cn(
                              "w-full text-xs h-8 mt-auto",
                              isDisabled
                                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                : isMaxedOut
                                  ? "bg-red-600/80 hover:bg-red-600 text-white" // Red button for maxed out tools
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
} 