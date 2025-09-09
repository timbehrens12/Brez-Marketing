"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Search,
  Settings,
  Info,
  X,
  CheckCircle,
  ArrowRight,
  Loader2,
  Users,
  Target,
  Brain,
  Sparkles,
  Eye,
  RefreshCw,
  Clock
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"



interface Campaign {
  campaign_id: string
  campaign_name: string
  status: string
  objective: string
  budget: number
  budget_type: string
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  roas: number
  account_name?: string
  last_refresh_date?: string
  platform?: string // Added to identify platform
  // Additional Meta fields from dashboard
  reach?: number
  frequency?: number
  cost_per_result?: number
  results?: number
  purchase_value?: number
  link_clicks?: number
  video_views?: number
  video_25_percent_views?: number
  video_50_percent_views?: number
  video_75_percent_views?: number
  video_100_percent_views?: number
  video_avg_watch_time?: number
  landing_page_views?: number
  leads?: number
  cost_per_lead?: number
  add_to_cart?: number
  cost_per_add_to_cart?: number
  initiate_checkout?: number
  cost_per_initiate_checkout?: number
  purchases?: number
  cost_per_purchase?: number
  outbound_clicks?: number
  cost_per_outbound_click?: number
  unique_clicks?: number
  unique_ctr?: number
  unique_link_clicks_ctr?: number
  actions?: any[]
  action_values?: any[]
  created_time?: string
  start_time?: string
  stop_time?: string
  recommendation?: {
    action: string
    reasoning: string
    impact: string
    confidence: number
    implementation: string
    generated_at?: string
    week_generated?: string
    analysis_period?: {
      from: string
      to: string
      days: number
      timezone: string
    }
    last_updated: string
    next_refresh: string
    status?: 'active' | 'completed' | 'ignored'
    historical_recommendations?: Array<{
      action: string
      reasoning: string
      confidence: number
      date: string
      status: 'active' | 'completed' | 'ignored'
    }>
    forecast?: string
    specific_actions?: {
      adsets_to_scale?: string[];
      adsets_to_optimize?: string[];
      adsets_to_pause?: string[];
      ads_to_pause?: string[];
    };
    data_summary?: {
      total_spend_analyzed: number
      total_impressions_analyzed: number
      total_clicks_analyzed: number
      total_conversions_analyzed: number
      average_daily_performance: {
        spend: number
        roas: number
        ctr: number
        cpc: number
      }
    }
  }
}

interface PlatformData {
  name: string
  logo: string
  isActive: boolean
  campaigns: Campaign[]
  // Remove isLoading completely
  // isLoading: boolean
  error?: string
}

interface PlatformCampaignWidgetProps {
  preloadedCampaigns?: any[]
}

export default function PlatformCampaignWidget({ preloadedCampaigns }: PlatformCampaignWidgetProps = {}) {
  const { selectedBrandId } = useBrandContext()
  const [platforms, setPlatforms] = useState<Record<string, PlatformData>>({
    meta: {
      name: "Meta",
      logo: "https://i.imgur.com/6hyyRrs.png",
      isActive: true,
      campaigns: preloadedCampaigns || []
      // Remove isLoading completely
    },
    tiktok: {
      name: "TikTok",
      logo: "https://i.imgur.com/AXHa9UT.png",
      isActive: false,
      campaigns: []
      // Remove isLoading completely
    },
    google: {
      name: "Google Ads",
      logo: "https://i.imgur.com/TavV4UJ.png",
      isActive: false,
      campaigns: []
      // Remove isLoading completely
    }
  })
  
  const [selectedTab, setSelectedTab] = useState("all")
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(() => {
    // Load saved preference from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('campaign-show-inactive')
      return saved ? JSON.parse(saved) : true
    }
    return true
  })
  const [sortBy, setSortBy] = useState('spent')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0)
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(!!preloadedCampaigns?.length)
  const [refreshTrigger, setRefreshTrigger] = useState(0) // Add refresh trigger state
  // Remove global refresh loading state
  // const [isRefreshing, setIsRefreshing] = useState(false) // Global refresh state
  
  // Local state for campaigns
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>(preloadedCampaigns || [])
  const [campaignsBeingChecked, setCampaignsBeingChecked] = useState<Set<string>>(new Set())
  const [campaignsGeneratingRecommendations, setCampaignsGeneratingRecommendations] = useState<Set<string>>(new Set())
  const [blockedCampaigns, setBlockedCampaigns] = useState<Map<string, { message?: string, nextRefreshDate?: string, daysUntilRefresh?: number }>>(new Map())
  const [recommendationDialogOpen, setRecommendationDialogOpen] = useState(false)
  const [selectedRecommendation, setSelectedRecommendation] = useState<Campaign | null>(null)

  // Use preloaded campaigns when they change - but allow for fresh data refreshes
  useEffect(() => {
    if (preloadedCampaigns && preloadedCampaigns.length > 0) {
      // Using preloaded campaigns data
      
      // Check if preloaded data is the same as current data
      const preloadedDataStr = JSON.stringify(preloadedCampaigns?.map(c => ({ id: c.campaign_id, spent: c.spent, status: c.status })))
      const currentDataStr = JSON.stringify(localCampaigns.map(c => ({ id: c.campaign_id, spent: c.spent, status: c.status })))
      
      if (preloadedDataStr === currentDataStr) {
        // Data hasn't changed, but still load recommendations if we haven't loaded them yet
        const hasRecommendations = localCampaigns.some(c => c.recommendation)
        if (!hasRecommendations) {
          loadSavedRecommendations(preloadedCampaigns)
        }
        return
      }

      // Data is different, update it
      setLocalCampaigns(preloadedCampaigns)
      setHasInitiallyLoaded(true)
      
      setPlatforms(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
          campaigns: preloadedCampaigns
        }
      }))
      
      // Load saved recommendations for the preloaded campaigns
      loadSavedRecommendations(preloadedCampaigns)
      
      // Check campaign statuses for preloaded data
      setTimeout(() => {
        checkCampaignStatuses(preloadedCampaigns, false, true)
      }, 1000)
    }
  }, [preloadedCampaigns, localCampaigns])

  // Save preference to localStorage whenever showInactive changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('campaign-show-inactive', JSON.stringify(showInactive))
    }
  }, [showInactive])

  // Function to check campaign statuses - conservative version to avoid rate limits
  const checkCampaignStatuses = useCallback((campaignsToCheck: Campaign[], forceRefresh = false, isInitialLoad = false): void => {
    if (!selectedBrandId || campaignsToCheck.length === 0) return

    // Rate limiting - prevent too frequent checks
    const now = Date.now()
    if (!forceRefresh && now - lastRefreshTime < 30000) {
      // console.log('[CampaignWidget] Rate limit: skipping status check (less than 30s since last)')
      return
    }
    
    const campaignIds = campaignsToCheck.map(c => c.campaign_id)
    setCampaignsBeingChecked(new Set(campaignIds))

    const params = new URLSearchParams({
      brandId: selectedBrandId,
      campaignIds: campaignIds.join(','),
      ...(forceRefresh && { force: 'true' })
    })

    fetch(`/api/meta/campaigns/status?${params}`)
      .then(async response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
            return response.json()
      })
      .then(data => {
        if (data.campaigns) {
          setLocalCampaigns(prev => {
            const updated = [...prev]
            
            data.campaigns.forEach((updatedCampaign: Campaign) => {
              const index = updated.findIndex(c => c.campaign_id === updatedCampaign.campaign_id)
              if (index !== -1) {
                updated[index] = { ...updated[index], ...updatedCampaign }
              }
            })
            
            return updated
          })
          
          setLastRefreshTime(now)
          }
        })
        .catch(error => {
        if (!isInitialLoad) {
          toast.error('Failed to refresh campaign statuses')
        }
      })
      .finally(() => {
        setCampaignsBeingChecked(new Set())
      })
  }, [selectedBrandId, lastRefreshTime])

  // Load saved recommendations for campaigns
  const loadSavedRecommendations = useCallback(async (campaigns: Campaign[]) => {
    if (!selectedBrandId || campaigns.length === 0) {
      return
    }

    // Add guard to prevent infinite loops
    if (isLoadingRecommendations.current) {
      // console.log('[CampaignWidget] Already loading recommendations, skipping duplicate call')
      return
    }

    isLoadingRecommendations.current = true

    try {
      const campaignIds = campaigns.map(c => c.campaign_id)
      const params = new URLSearchParams({
        brandId: selectedBrandId,
        campaignIds: campaignIds.join(',')
      })

      const response = await fetch(`/api/ai/campaign-recommendations?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.recommendations) {
          // console.log('[CampaignWidget] Loading saved recommendations:', data.recommendations)
          
          // Update campaigns with their saved recommendations
          const campaignsWithRecommendations = campaigns.map(campaign => {
            const recommendation = data.recommendations[campaign.campaign_id]
            if (recommendation) {
              // console.log(`[CampaignWidget] Found recommendation for ${campaign.campaign_id}:`, { 
                // action: recommendation.action, 
                // status: recommendation.status 
              // })
            }
            return recommendation ? { ...campaign, recommendation } : campaign
          })
          
          // Update local campaigns state with recommendations
          setLocalCampaigns(campaignsWithRecommendations)
          // console.log('[CampaignWidget] Updated campaigns with recommendations')
        }
      } else {
      }
    } catch (error) {
    } finally {
      isLoadingRecommendations.current = false
    }
  }, [selectedBrandId])

  // Add ref to track loading state
  const isLoadingRecommendations = useRef(false)

  // Generate AI recommendation for a campaign
  const generateRecommendation = useCallback(async (campaign: Campaign, forceRefresh: boolean = false) => {
    if (!selectedBrandId || campaignsGeneratingRecommendations.has(campaign.campaign_id)) return

    setCampaignsGeneratingRecommendations(prev => new Set([...prev, campaign.campaign_id]))

    try {
      const requestData = {
          brandId: selectedBrandId,
          campaignId: campaign.campaign_id,
        forceRefresh,
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          campaignData: {
            campaign_name: campaign.campaign_name,
            campaign_id: campaign.campaign_id,
            status: campaign.status,
            objective: campaign.objective,
            budget: campaign.budget,
            spent: campaign.spent,
            roas: campaign.roas,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            conversions: campaign.conversions,
            ctr: campaign.ctr,
            cpc: campaign.cpc
          }
      }
      
      // console.log('[CampaignWidget] Sending recommendation request:', requestData)
      
      const response = await fetch('/api/ai/campaign-recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const data = await response.json()
      // console.log('[CampaignWidget] API Response:', data)
      // console.log('[CampaignWidget] Recommendation structure:', data.recommendation)
      
      // Check if the response indicates the recommendation is blocked
      if (data.blocked) {
        // console.log('[CampaignWidget] Recommendation blocked:', data.message)
        
        // Store blocked campaign info
        setBlockedCampaigns(prev => new Map(prev.set(campaign.campaign_id, {
          message: data.message,
          nextRefreshDate: data.nextRefreshDate,
          daysUntilRefresh: data.daysUntilRefresh
        })))
        
        // Still update the campaign with the cached recommendation
        if (data.recommendation) {
          setLocalCampaigns(prev => prev.map(c => 
            c.campaign_id === campaign.campaign_id 
              ? { ...c, recommendation: data.recommendation }
              : c
          ))
        }
        
        // Show blocked message  
        const daysText = data.daysUntilRefresh === 1 ? '1 day' : `${data.daysUntilRefresh || 7} days`
        toast.info(`Weekly recommendation already used. Next available Monday (${daysText})`)
        return
      }

      // Clear any blocked status for this campaign since we got a fresh recommendation
      setBlockedCampaigns(prev => {
        const updated = new Map(prev)
        updated.delete(campaign.campaign_id)
        return updated
      })
      
      if (data.recommendation) {
        // Update the specific campaign with the recommendation
        setLocalCampaigns(prev => prev.map(c => 
          c.campaign_id === campaign.campaign_id 
            ? { ...c, recommendation: data.recommendation }
            : c
        ))
        
        toast.success('AI recommendation generated successfully!')
      }

    } catch (error) {
      toast.error('Failed to generate AI recommendation')
    } finally {
      setCampaignsGeneratingRecommendations(prev => {
        const updated = new Set(prev)
        updated.delete(campaign.campaign_id)
        return updated
      })
    }
  }, [selectedBrandId, campaignsGeneratingRecommendations])

  // Sync local campaigns with platform campaigns - allow refresh even with preloaded data
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!selectedBrandId) {
        // console.log('[CampaignWidget] No brand selected, skipping campaign fetch')
        return
      }

      // Only skip if we have preloaded campaigns AND haven't been triggered by a refresh
      if (preloadedCampaigns && preloadedCampaigns.length > 0 && !refreshTrigger) {
        // console.log('[CampaignWidget] Using preloaded campaigns, skipping fetch (refreshTrigger:', refreshTrigger, ')')
        return
      }

      // console.log('[CampaignWidget] Fetching campaigns for brand:', selectedBrandId, '(preloaded:', !!preloadedCampaigns?.length, 'refreshTrigger:', refreshTrigger, ')')
      
      // Remove loading state during fetch
      // setIsRefreshing(true)
      // setPlatforms(prev => ({
      //   ...prev,
      //   meta: { 
      //     ...prev.meta, 
      //     isLoading: true, 
      //     error: undefined
      //   }
      // }))

      try {
        // Get today's date for campaign data - ALWAYS use today for campaigns
      const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
      
        // console.log(`[CampaignWidget] Using date: ${todayStr} (always showing today's data)`)
      
      // Build URL with date range parameters to get today's performance data
      let url = `/api/meta/campaigns?brandId=${selectedBrandId}&limit=100&sortBy=spent&sortOrder=desc&from=${todayStr}&to=${todayStr}`
      
        // Add cache-busting parameters for fresh data
        url += `&forceRefresh=true&t=${Date.now()}`
      
      const response = await fetch(url, {
          cache: 'no-store',
          headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
          }
      })
      
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
        // console.log('[CampaignWidget] Raw campaign data received:', data)

        if (data.campaigns && Array.isArray(data.campaigns)) {
          // Add platform identifier to campaigns
          const campaignsWithPlatform = data.campaigns.map((campaign: Campaign) => ({
                  ...campaign, 
            platform: 'meta'
          }))
          
          setLocalCampaigns(campaignsWithPlatform)
          setHasInitiallyLoaded(true)

      setPlatforms(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
              campaigns: campaignsWithPlatform,
              // Remove loading state
              // isLoading: false,
              error: undefined
            }
          }))

          // Load saved recommendations for the campaigns
          loadSavedRecommendations(campaignsWithPlatform)

          // Only run initial status check if we have campaigns and it's been a while
          if (campaignsWithPlatform.length > 0) {
            setTimeout(() => {
              checkCampaignStatuses(campaignsWithPlatform, false, true)
        }, 1000)
      }
          
          // Remove loading state
          // setIsRefreshing(false)
        } else {
          setLocalCampaigns([])
        setPlatforms(prev => ({
          ...prev,
            // Remove loading state
            // meta: { ...prev.meta, campaigns: [], isLoading: false }
            meta: { ...prev.meta, campaigns: [] }
          }))
      }

    } catch (error) {
        
      setPlatforms(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
          // Remove loading state
          // isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }))
        
        setLocalCampaigns([])
    } finally {
      // Remove loading state
      // setIsRefreshing(false)
      
      // Reset refresh trigger to prevent infinite loops
      if (refreshTrigger > 0) {
        setRefreshTrigger(0)
      }
    }
    }

    fetchCampaigns()
  }, [selectedBrandId, checkCampaignStatuses, refreshTrigger, preloadedCampaigns])

  // Add midnight reset timer with debugging
  useEffect(() => {
    const updateAtMidnight = () => {
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
      const timeUntilMidnight = midnight.getTime() - now.getTime()
      
      // console.log('[CampaignWidget] Midnight timer set:', {
        // currentTime: now.toLocaleTimeString(),
        // midnightTime: midnight.toLocaleTimeString(),
        // millisecondsUntilMidnight: timeUntilMidnight,
        // hoursUntilMidnight: (timeUntilMidnight / 1000 / 60 / 60).toFixed(2)
      // })
      
      const timeoutId = setTimeout(() => {
        // console.log('[CampaignWidget] 🌙 MIDNIGHT REACHED - Resetting campaign data')
        
        // Clear local campaigns to force a fresh fetch
        setLocalCampaigns([])
      setPlatforms(prev => ({
        ...prev,
          meta: { ...prev.meta, campaigns: [] }
        }))
        
        // Use unified refresh mechanism instead of manual fetch
        // console.log('[CampaignWidget] Midnight reset - triggering unified refresh')
        setRefreshTrigger(prev => prev + 1)
        
        // Also dispatch event for other widgets
        window.dispatchEvent(new CustomEvent('metaDataRefreshed', {
          detail: { brandId: selectedBrandId, source: 'campaign-midnight-reset' }
        }))
        
        // Set up next midnight update
        updateAtMidnight()
      }, timeUntilMidnight)
      
      return () => clearTimeout(timeoutId)
    }
    
    // Set up the initial midnight update
    const cleanup = updateAtMidnight()
    
    return cleanup
  }, [selectedBrandId, setRefreshTrigger])

  // Listen for refresh events
  useEffect(() => {
    if (!selectedBrandId) return

    const handleRefreshEvent = (event: CustomEvent) => {
      const { brandId, source } = event.detail
      
      if (brandId === selectedBrandId && source !== 'PlatformCampaignWidget') {
        // console.log('[CampaignWidget] Refresh event received, triggering campaigns refresh...', { source })
        setRefreshTrigger(prev => prev + 1) // Trigger refresh
      }
    }

    window.addEventListener('refresh-all-widgets', handleRefreshEvent as EventListener)
    window.addEventListener('metaDataRefreshed', handleRefreshEvent as EventListener)
    window.addEventListener('global-refresh-all', handleRefreshEvent as EventListener)

    return () => {
      window.removeEventListener('refresh-all-widgets', handleRefreshEvent as EventListener)
      window.removeEventListener('metaDataRefreshed', handleRefreshEvent as EventListener)
      window.removeEventListener('global-refresh-all', handleRefreshEvent as EventListener)
    }
  }, [selectedBrandId])

  // Add debug function to test midnight reset manually
  useEffect(() => {
    // Expose debug function to window for testing
    if (typeof window !== 'undefined') {
      (window as any).debugCampaignMidnightReset = () => {
        // console.log('[CampaignWidget] DEBUG: Manually triggering midnight reset')
        
        // Clear campaigns
        setLocalCampaigns([])
        setPlatforms(prev => ({
          ...prev,
          meta: { ...prev.meta, campaigns: [] }
        }))
        
        // Trigger a fresh fetch
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('metaDataRefreshed', {
            detail: { brandId: selectedBrandId, source: 'debug-midnight-reset' }
          }))
        }, 100)
      }
    }
  }, [selectedBrandId])

  // Listen for refresh events
  useEffect(() => {
    const handleCampaignRefresh = async (event: CustomEvent) => {
      const { brandId, source } = event.detail || {}
      
      if (brandId === selectedBrandId && source !== 'CampaignWidget') {
        // console.log('[CampaignWidget] Refresh event received, triggering refresh...', { source, brandId })
        
        // For any refresh event that indicates new data is available, trigger a refresh
        if (source === 'midnight-reset' || 
            source === 'campaign-midnight-reset' || 
            source === 'debug-midnight-reset' ||
            source === 'marketing-assistant-midnight-reset' ||
            source === 'centralized-load' ||
            event.type === 'metaDataRefreshed' ||
            event.type === 'global-refresh-all' ||
            event.type === 'newDayDetected') {
          
          // console.log('[CampaignWidget] Data refresh event detected - forcing campaign data update')
          
          // Clear existing campaigns to show fresh data
          setLocalCampaigns([])
          setPlatforms(prev => ({
            ...prev,
            meta: { ...prev.meta, campaigns: [] }
          }))
          
          // Trigger refresh using the unified fetch mechanism
          setRefreshTrigger(prev => prev + 1)
          
        } else {
          // For other refresh events, just check statuses if we have campaigns
          if (localCampaigns.length > 0) {
            // console.log('[CampaignWidget] Status check only for source:', source)
            checkCampaignStatuses(localCampaigns, true)
          } else {
            // If no campaigns, also trigger a refresh
            // console.log('[CampaignWidget] No campaigns to check status for, triggering refresh')
            setRefreshTrigger(prev => prev + 1)
          }
        }
      }
    }

    const handleLegacyRefresh = () => {
      if (selectedBrandId && localCampaigns.length > 0) {
        // console.log('[CampaignWidget] Legacy refresh event received, checking campaign statuses')
        checkCampaignStatuses(localCampaigns, true)
      }
    }

    // Listen for the same refresh events as other widgets
    window.addEventListener('metaDataRefreshed', handleCampaignRefresh as unknown as EventListener)
    window.addEventListener('global-refresh-all', handleCampaignRefresh as unknown as EventListener)
    window.addEventListener('newDayDetected', handleCampaignRefresh as unknown as EventListener)
    window.addEventListener('force-meta-refresh', handleCampaignRefresh as unknown as EventListener)
    window.addEventListener('refreshCampaigns', handleLegacyRefresh) // Legacy support

    return () => {
      window.removeEventListener('metaDataRefreshed', handleCampaignRefresh as unknown as EventListener)
      window.removeEventListener('global-refresh-all', handleCampaignRefresh as unknown as EventListener)
      window.removeEventListener('newDayDetected', handleCampaignRefresh as unknown as EventListener)
      window.removeEventListener('force-meta-refresh', handleCampaignRefresh as unknown as EventListener)
      window.removeEventListener('refreshCampaigns', handleLegacyRefresh)
    }
  }, [selectedBrandId, localCampaigns, checkCampaignStatuses, setRefreshTrigger])

  // Helper function for currency formatting
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Helper function for percentage formatting
  const formatPercentage = (value: number) => {
    // CTR values from API are already percentages (e.g., 1.96 for 1.96%)
    // Don't multiply by 100
    return `${value.toFixed(2)}%`
  }

  // Helper function for number formatting
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  // Helper function to check if recommendation needs refresh
  const needsRecommendationRefresh = (campaign: Campaign) => {
    if (!campaign.recommendation?.next_refresh) return false
    return new Date() >= new Date(campaign.recommendation.next_refresh)
  }

  // Helper function to check if recommendation is blocked (recently generated)
  const isRecommendationBlocked = (campaign: Campaign) => {
    if (!campaign.recommendation?.generated_at && !campaign.recommendation?.last_updated) return false
    
    const generatedAt = new Date(campaign.recommendation.generated_at || campaign.recommendation.last_updated)
    const now = new Date()
    const hoursAgo = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60)
    
    // Check if generated within last 24 hours OR if it's from current week
    const isWithin24Hours = hoursAgo < 24
    
    // Check if from current week
    const currentWeek = getCurrentWeekIdentifier()
    const recommendationWeek = campaign.recommendation?.week_generated
    const isCurrentWeek = recommendationWeek === currentWeek
    
    return isWithin24Hours || isCurrentWeek
  }

  // Helper function to get current week identifier (same logic as backend)
  const getCurrentWeekIdentifier = () => {
    const now = new Date()
    const monday = new Date(now)
    const daysSinceMonday = (now.getDay() + 6) % 7
    monday.setDate(now.getDate() - daysSinceMonday)
    monday.setHours(0, 0, 0, 0)
    
    const year = monday.getFullYear()
    const month = String(monday.getMonth() + 1).padStart(2, '0')
    const day = String(monday.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  }

  // Helper function to calculate days until next Monday
  const getDaysUntilNextMonday = () => {
    const now = new Date()
    const nextMonday = new Date(now)
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7
    nextMonday.setDate(now.getDate() + daysUntilMonday)
    return daysUntilMonday
  }

  // Helper function to get all campaigns across platforms
  const getAllCampaigns = () => {
    return localCampaigns
  }

  // Filter and sort campaigns
  const getFilteredAndSortedCampaigns = (campaigns: Campaign[]) => {
    let filtered = [...campaigns]
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(campaign => 
        (campaign.campaign_name && campaign.campaign_name.toLowerCase().includes(query)) ||
        (campaign.campaign_id && campaign.campaign_id.toLowerCase().includes(query)) ||
        (campaign.account_name && campaign.account_name.toLowerCase().includes(query))
      )
    }
    
    // Filter by status
    if (!showInactive) {
      filtered = filtered.filter(campaign => campaign.status === 'ACTIVE')
    }
    
    // Sort campaigns
    return filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof Campaign] as number || 0
      const bValue = b[sortBy as keyof Campaign] as number || 0
      
      if (sortOrder === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
  }

  // Get platform data for a campaign
  const getPlatformData = (campaign: Campaign) => {
    const platformKey = campaign.platform || 'meta'
    return platforms[platformKey]
  }

  // Render rich campaign card instead of boring table row
  const renderCampaignCard = (campaign: Campaign) => {
    const platformData = getPlatformData(campaign)
    const isBeingChecked = campaignsBeingChecked.has(campaign.campaign_id)
    const isGeneratingRecommendation = campaignsGeneratingRecommendations.has(campaign.campaign_id)
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'ACTIVE':
          return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        case 'PAUSED':
          return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        default:
          return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      }
    }

    const getROASColor = (roas: number) => {
      if (roas >= 3) return 'text-emerald-400'
      if (roas >= 2) return 'text-amber-400'
      return 'text-red-400'
  }

  return (
      <div key={campaign.campaign_id} className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-xl border border-[#2a2a2a] 
                                                hover:border-[#3a3a3a] transition-all duration-300 group">
        {/* Compact Header */}
        <div className="p-3 border-b border-[#2a2a2a]">
      <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 bg-[#2a2a2a] rounded-lg flex items-center justify-center border border-[#3a3a3a] flex-shrink-0">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta" 
                  width={20} 
                  height={20} 
                  className="object-contain rounded"
                />
          </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-semibold text-base truncate">
                  {campaign.campaign_name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>{campaign.objective}</span>
                  <span>•</span>
                  <span>{campaign.budget_type}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isBeingChecked ? (
                <Badge className="px-3 py-1 bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] rounded-full text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-1.5 animate-pulse"></div>
                  Checking...
                </Badge>
              ) : (
                <Badge className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                  {campaign.status}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Compact Metrics Grid */}
        <div className="p-3">
          {/* Metrics Grid - First Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Spent</div>
              <div className="text-sm font-bold text-white">{formatCurrency(campaign.spent)}</div>
              <div className="text-xs text-gray-600">
                {campaign.budget > 0 ? `${((campaign.spent / campaign.budget) * 100).toFixed(0)}%` : '0%'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Impressions</div>
              <div className="text-sm font-bold text-white">{formatNumber(campaign.impressions)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Clicks</div>
              <div className="text-sm font-bold text-white">{formatNumber(campaign.clicks)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">CTR</div>
              <div className="text-sm font-bold text-white">{formatPercentage(campaign.ctr)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">CPC</div>
              <div className="text-sm font-bold text-white">{formatCurrency(campaign.cpc)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">ROAS</div>
              <div className={`text-sm font-bold ${getROASColor(campaign.roas)}`}>
                {campaign.roas?.toFixed(2) || '0.00'}x
              </div>
            </div>
          </div>
 
          {/* Metrics Grid - Second Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Budget</div>
              <div className="text-sm font-bold text-white">{formatCurrency(campaign.budget)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Reach</div>
              <div className="text-sm font-bold text-white">{formatNumber(campaign.reach || 0)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Frequency</div>
              <div className="text-sm font-bold text-white">{(campaign.frequency || 0).toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Leads</div>
              <div className="text-sm font-bold text-white">{formatNumber(campaign.leads || 0)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Cost/Lead</div>
              <div className="text-sm font-bold text-white">{formatCurrency(campaign.cost_per_lead || 0)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Purchase Value</div>
              <div className="text-sm font-bold text-white">{formatCurrency(campaign.purchase_value || 0)}</div>
            </div>
          </div>

          {/* AI Recommendation Section - Clean */}
          <div className="bg-[#1a1a1a]/50 rounded-lg p-3 border border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
          <div>
                  <div className="text-sm font-medium text-white">AI Recommendation</div>
                  <div className="text-xs text-gray-400">Weekly optimization insights</div>
          </div>
        </div>
              <div className="flex items-center gap-2">
                {campaign.recommendation ? (
                  <>
                    <span className="text-xs text-gray-400">
                      {Math.round((campaign.recommendation.confidence || 8.5) * 10)}% confidence
                    </span>
                    
                    {/* Completion Status Indicator */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${
                            campaign.recommendation?.status === 'completed'
                              ? 'bg-gray-600 border-gray-500 text-white'
                              : 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-500'
                          }`}>
                            {campaign.recommendation?.status === 'completed' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#222] border-[#444] max-w-xs z-50">
                          <p className="font-medium text-white">
                            {campaign.recommendation?.status === 'completed' 
                              ? 'Recommendation Completed' 
                              : 'Pending Implementation'}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            {campaign.recommendation?.status === 'completed'
                              ? 'You have marked this recommendation as implemented'
                              : 'Click Details to mark as complete when implemented'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
        <Button
                      onClick={() => {
                        setSelectedRecommendation(campaign)
                        setRecommendationDialogOpen(true)
                      }}
                      variant="outline"
          size="sm"
                      className="bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#3a3a3a] 
                               hover:text-white text-xs px-3 py-1 h-7"
                    >
                      Details
                    </Button>
                    
                    {/* Weekly Refresh Button - only available on Mondays and when not blocked */}
                    {(() => {
                      const now = new Date()
                      const isBlocked = isRecommendationBlocked(campaign)
                      const isGenerating = campaignsGeneratingRecommendations.has(campaign.campaign_id)
                      const daysUntilMonday = getDaysUntilNextMonday()
                      
                      // If blocked (recently generated), show blocked status regardless of day
                      if (isBlocked) {
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="text-xs text-gray-500 px-2 py-1 bg-[#2a2a2a] rounded border border-[#3a3a3a] flex items-center gap-1 whitespace-nowrap cursor-help">
                                  <Clock className="h-3 w-3" />
                                  {daysUntilMonday}d
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#222] border-[#444] max-w-xs z-50">
                                <p className="font-medium text-white">
                                  Weekly Recommendation Limit Reached
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                  You can only generate one AI recommendation per week. Next refresh available Monday ({daysUntilMonday === 1 ? '1 day' : `${daysUntilMonday} days`}).
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      }
                      
                      // If this week's refresh is available (Monday has passed and not used yet), show refresh button
                      const isMondayOrLater = now.getDay() >= 1 || now.getDay() === 0 // Monday through Sunday (0 = Sunday)
                      const isWeeklyRefreshAvailable = isMondayOrLater && !isBlocked
                      
                      if (isWeeklyRefreshAvailable) {
                        return (
                          <Button
                            onClick={() => generateRecommendation(campaign, true)}
          variant="outline"
                            size="sm"
                            disabled={isGenerating}
                            className="text-xs px-2 py-1 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 
                                       hover:bg-[#3a3a3a] hover:text-white transition-all duration-300 h-7"
                            title="Refresh weekly recommendation (Available from Monday onwards)"
                          >
                            {isGenerating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
          )}
        </Button>
                        )
                      } else {
                        // Calculate next Monday for display
                        const nextMonday = new Date(now)
                        const daysUntilMondayCalc = (8 - now.getDay()) % 7 || 7
                        nextMonday.setDate(now.getDate() + daysUntilMondayCalc)
                        nextMonday.setHours(0, 0, 0, 0)
                        
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="text-xs text-gray-500 px-2 py-1 bg-[#2a2a2a] rounded border border-[#3a3a3a] flex items-center gap-1 whitespace-nowrap">
                                  <Clock className="h-3 w-3" />
                                  Mon 12AM
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#222] border-[#444] max-w-xs z-50">
                                <p className="font-medium text-white">
                                  Refresh Not Available
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                  Next refresh available: {nextMonday.toLocaleDateString()} at 12:00 AM
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      }
                    })()}
                  </>
                ) : (
                  <Button
                    onClick={() => generateRecommendation(campaign)}
                    disabled={isGeneratingRecommendation}
                    variant="outline"
                    size="sm"
                    className="bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#3a3a3a] 
                             hover:text-white text-xs px-3 py-1 h-7 disabled:opacity-50"
                  >
                    {isGeneratingRecommendation ? (
                      "Generating..."
                    ) : (
                      "Generate"
                    )}
                  </Button>
                )}
              </div>
      </div>

            {campaign.recommendation && (
              <div className="mt-3 p-3 bg-[#0f0f0f] rounded-lg border border-[#2a2a2a]">
                <div className="text-sm text-gray-300">
                  <span className="text-white font-medium">{campaign.recommendation.action}</span>
                  {campaign.recommendation.reasoning && (
                    <span className="text-gray-400"> - {campaign.recommendation.reasoning.slice(0, 120).split('.')[0]}.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
                  }

  // Render platform content
  const renderPlatformContent = (platformKey: string) => {
    // Handle "all" platforms case
    if (platformKey === 'all') {
      const allCampaigns = getAllCampaigns()
      const filteredCampaigns = getFilteredAndSortedCampaigns(allCampaigns)

      if (filteredCampaigns.length === 0) {
        return (
          <div className="text-center py-16 mx-6 mb-6 bg-[#0f0f0f] rounded-2xl border border-[#1a1a1a]">
            <div className="w-20 h-20 mx-auto mb-6 bg-[#1a1a1a] rounded-2xl flex items-center justify-center 
                          border border-[#2a2a2a] shadow-lg">
              <Target className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">No Campaigns Found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchQuery ? 'Try adjusting your search criteria' : 'No campaigns available across all platforms'}
            </p>
          </div>
        )
      }

      return (
        <div className="space-y-2">
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3 px-4 pt-3 pb-0">
            <div className="flex-1">
      <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
                  placeholder="Search campaigns across all platforms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder-gray-500 
                           focus:border-white/20 focus:ring-white/20"
        />
      </div>
          </div>
            
            <div className="flex items-center gap-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a] hover:border-white/20 
                             px-5 py-3 rounded-xl font-medium transition-all duration-300 group"
                  >
                    <Settings className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                    Filters
                        </Button>
                      </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-[#1a1a1a] w-64 p-2 rounded-xl shadow-2xl">
                        <DropdownMenuItem 
                    onSelect={(e) => e.preventDefault()}
                    className="p-3 rounded-lg hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-white font-medium">Show Inactive Campaigns</span>
                      <Switch 
                        checked={showInactive} 
                        onCheckedChange={setShowInactive}
                        className="ml-2 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-[#2a2a2a]"
                      />
                    </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

          {/* Campaigns table */}
          <div className="px-4 pb-3">
            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-96">
              {filteredCampaigns.map(renderCampaignCard)}
                    </div>
                    </div>
                  </div>
      )
    }

    // Handle individual platform cases
    const platform = platforms[platformKey]
    
    // Add safety check for platform existence
    if (!platform) {
      return (
        <div className="text-center py-16 mx-6 mb-6 bg-[#0f0f0f] rounded-2xl border border-[#1a1a1a]">
          <div className="w-20 h-20 mx-auto mb-6 bg-[#1a1a1a] rounded-2xl flex items-center justify-center 
                        border border-[#2a2a2a] shadow-lg">
            <AlertCircle className="w-10 h-10 text-gray-500" />
                    </div>
          <h3 className="text-xl font-bold text-white mb-3">Platform Not Found</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">The requested platform could not be found</p>
                    </div>
      )
    }
    
    if (!platform.isActive) {
      return (
        <div className="text-center py-16 mx-6 mb-6 bg-[#0f0f0f] rounded-2xl border border-[#1a1a1a]">
          <div className="w-20 h-20 mx-auto mb-6 bg-[#1a1a1a] rounded-2xl flex items-center justify-center 
                        border border-[#2a2a2a] shadow-lg">
            <AlertCircle className="w-10 h-10 text-gray-500" />
                  </div>
          <h3 className="text-xl font-bold text-white mb-3">Platform Not Connected</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">Connect your {platform.name} account to view campaigns and performance metrics</p>
          <Button className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-xl font-semibold 
                           transition-all duration-300 shadow-lg">
            Connect {platform.name}
          </Button>
                </div>
      )
    }

    // Remove loading state check - always show campaigns or empty state
    // if (platform.isLoading) {
    //   return (
    //     <div className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-lg h-full flex flex-col">
    //       <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] p-6 border-b border-[#333]">
    //         <div className="flex items-center gap-4">
    //           <div className="w-14 h-14 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
    //                         flex items-center justify-center border border-white/10 shadow-lg">
    //             <img src={platform.logo} alt={platform.name} className="w-8 h-8" />
    //           </div>
    //           <div>
    //             <h3 className="text-2xl font-bold text-white">Campaign Management</h3>
    //             <p className="text-gray-400">Loading campaigns...</p>
    //           </div>
    //         </div>
    //       </div>
          
    //       <div className="flex-1 flex items-center justify-center p-6">
    //         <div className="text-center">
    //           <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 animate-pulse">
    //             <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
    //           </div>
    //           <p className="text-gray-400 text-lg font-medium">Loading campaign data...</p>
    //           <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
    //         </div>
    //       </div>
    //     </div>
    //   )
    // }

    const platformCampaigns = localCampaigns.filter(c => c.platform === platformKey)
    const filteredCampaigns = getFilteredAndSortedCampaigns(platformCampaigns)

    if (filteredCampaigns.length === 0) {
      return (
        <div className="text-center py-16 mx-6 mb-6 bg-[#0f0f0f] rounded-2xl border border-[#1a1a1a]">
          <div className="w-20 h-20 mx-auto mb-6 bg-[#1a1a1a] rounded-2xl flex items-center justify-center 
                        border border-[#2a2a2a] shadow-lg">
            <Target className="w-10 h-10 text-gray-500" />
                    </div>
          <h3 className="text-xl font-bold text-white mb-3">No Campaigns Found</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {searchQuery ? 'Try adjusting your search criteria' : 'No campaigns available for this platform'}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3 px-4 pt-3 pb-0">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder-gray-500 
                         focus:border-white/20 focus:ring-white/20"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                    <Button 
                  variant="outline" 
                      size="sm" 
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a] hover:border-white/20 
                           px-5 py-3 rounded-xl font-medium transition-all duration-300 group"
                    >
                  <Settings className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  Filters
                    </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-[#1a1a1a] w-64 p-2 rounded-xl shadow-2xl">
                <DropdownMenuItem 
                  onSelect={(e) => e.preventDefault()}
                  className="p-3 rounded-lg hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-white font-medium">Show Inactive Campaigns</span>
                    <Switch 
                      checked={showInactive} 
                      onCheckedChange={setShowInactive}
                      className="ml-2 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-[#2a2a2a]"
                    />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Campaigns table */}
        <div className="px-4 pb-3">
          <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-96">
            {filteredCampaigns.map(renderCampaignCard)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 relative">
      {/* Remove Loading Overlay - completely commented out */}
      {/* 
      {isRefreshing && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 animate-pulse">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
            <p className="text-gray-400 text-lg font-medium">Refreshing campaigns...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
          </div>
                  </div>
                )}
      */}
      
      {/* Compact Header */}
      <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-lg shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
                            flex items-center justify-center border border-white/10 shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-2xl font-bold tracking-tight">Campaign Management</CardTitle>
                <p className="text-gray-400 text-base font-medium">Optimize your advertising campaigns</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500 w-64"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">
                    <Settings className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#1a1a1a] border-[#2a2a2a] z-50">
                  <div className="p-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-inactive"
                        checked={showInactive}
                        onCheckedChange={setShowInactive}
                      />
                      <label htmlFor="show-inactive" className="text-sm text-white">
                        Show inactive campaigns
                      </label>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">

          {/* Compact Tabs */}
          <div className="p-4">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-1 h-10">
              <TabsTrigger 
                value="all" 
                className="flex items-center justify-center gap-2 data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white
                         text-gray-400 hover:text-white transition-all duration-300 rounded-lg h-full"
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    <Image 
                      src="https://i.imgur.com/6hyyRrs.png" 
                      alt="Meta" 
                      width={16} 
                      height={16} 
                      className="object-contain rounded-full border border-white/20"
                    />
                    <Image 
                      src="https://i.imgur.com/AXHa9UT.png" 
                      alt="TikTok" 
                      width={16} 
                      height={16} 
                      className="object-contain rounded-full border border-white/20 grayscale opacity-50"
                    />
                    <Image 
                      src="https://i.imgur.com/TavV4UJ.png" 
                      alt="Google" 
                      width={16} 
                      height={16} 
                      className="object-contain rounded-full border border-white/20 grayscale opacity-50"
                    />
                  </div>
                  <span className="font-medium">All Platforms</span>
                </div>
              </TabsTrigger>
              
              {Object.entries(platforms).map(([platformKey, platform]) => (
                <TabsTrigger 
                  key={platformKey}
                  value={platformKey}
                  className="flex items-center justify-center gap-2 data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white
                           text-gray-400 hover:text-white transition-all duration-300 rounded-lg h-full"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Image 
                        src={platform.logo} 
                        alt={platform.name} 
                        width={20} 
                        height={20} 
                        className={`object-contain rounded-lg ${!platform.isActive ? 'grayscale opacity-50' : ''}`}
                      />
                      {platform.isActive && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#1a1a1a]"></div>
        )}
      </div>
                    <span className="font-medium">{platform.name}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab Content */}
            <div className="mt-4">
              <TabsContent value="all">
                {renderPlatformContent('all')}
              </TabsContent>
              
              {Object.keys(platforms).map(platformKey => (
                <TabsContent key={platformKey} value={platformKey}>
                  {renderPlatformContent(platformKey)}
                </TabsContent>
              ))}
            </div>
          </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation Dialog */}
      <Dialog open={recommendationDialogOpen} onOpenChange={setRecommendationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] text-white overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl flex items-center justify-center border border-[#333]">
                <span className="text-white font-semibold">AI</span>
              </div>
              Campaign Optimization Recommendation
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-base space-y-2">
              <div>AI-powered insights for <strong className="text-white">{selectedRecommendation?.campaign_name}</strong></div>
              
              {/* Analysis Period & Timestamp Info */}
              {selectedRecommendation?.recommendation?.analysis_period && (
                <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#333] text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-500">Analysis Period:</span>
                      <div className="text-white font-medium">
                        {selectedRecommendation.recommendation.analysis_period.from} to {selectedRecommendation.recommendation.analysis_period.to}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {selectedRecommendation.recommendation.analysis_period.days} days of data 
                        ({selectedRecommendation.recommendation.analysis_period.timezone})
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Generated:</span>
                      <div className="text-white font-medium">
                        {selectedRecommendation.recommendation.generated_at ? 
                          new Date(selectedRecommendation.recommendation.generated_at).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZoneName: 'short'
                          }) : 'Unknown'
                        }
                      </div>
                      <div className="text-gray-400 text-xs">
                        Next refresh: {selectedRecommendation.recommendation.next_refresh ? 
                          new Date(selectedRecommendation.recommendation.next_refresh).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          }) : 'Monday 12AM'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-6">
            {/* Campaign Overview */}
            <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] rounded-2xl p-6 border border-[#333]">
              <h3 className="text-lg font-semibold text-white mb-4">Campaign Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl p-4 border border-[#333] text-center">
                  <div className="text-2xl font-bold text-white">{formatCurrency(selectedRecommendation?.spent || 0)}</div>
                  <div className="text-sm text-gray-400 mt-1">Spent</div>
                </div>
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl p-4 border border-[#333] text-center">
                  <div className="text-2xl font-bold text-white">{formatPercentage(selectedRecommendation?.ctr || 0)}</div>
                  <div className="text-sm text-gray-400 mt-1">CTR</div>
                </div>
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl p-4 border border-[#333] text-center">
                  <div className="text-2xl font-bold text-white">{formatCurrency(selectedRecommendation?.cpc || 0)}</div>
                  <div className="text-sm text-gray-400 mt-1">CPC</div>
                </div>
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl p-4 border border-[#333] text-center">
                  <div className="text-2xl font-bold text-white">
                    {selectedRecommendation?.roas && typeof selectedRecommendation.roas === 'number' 
                      ? selectedRecommendation.roas.toFixed(2) : '0.00'}x
                  </div>
                  <div className="text-sm text-gray-400 mt-1">ROAS</div>
                </div>
              </div>
            </div>

            {/* Main Recommendation */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl flex items-center justify-center border border-[#333]">
                  <span className="text-sm font-bold text-white">1</span>
                </div>
                <h3 className="text-lg font-semibold text-white">Recommended Action</h3>
              </div>
              
              <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] rounded-2xl p-6 border border-[#333]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-4 py-2 bg-gradient-to-r from-white/10 to-white/5 rounded-xl border border-white/20">
                    <span className="text-white font-semibold">
                      {selectedRecommendation?.recommendation?.action || 'No specific recommendation available'}
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg border border-green-500/30">
                    <span className="text-green-400 text-sm font-medium">
                      {Math.round((selectedRecommendation?.recommendation?.confidence || 8.5) * 10)}% Confidence
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-300 leading-relaxed mb-4">
                  {selectedRecommendation?.recommendation?.reasoning || 'Detailed reasoning not available'}
                </p>
                
                <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-[#333]">
                  <h4 className="text-sm font-semibold text-white mb-2">Expected Impact</h4>
                  <p className="text-gray-400 text-sm">
                    {selectedRecommendation?.recommendation?.impact || 'Impact analysis not available'}
                  </p>
                </div>
              </div>
              </div>

            {/* 7-Day Data Summary */}
            {selectedRecommendation?.recommendation?.data_summary && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl flex items-center justify-center border border-[#333]">
                    <span className="text-sm font-bold text-white">2</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">7-Day Analysis Data</h3>
                </div>
                
                <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] rounded-2xl p-6 border border-[#333]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl p-4 border border-[#333] text-center">
                      <div className="text-2xl font-bold text-white">
                        {formatCurrency(selectedRecommendation.recommendation.data_summary.total_spend_analyzed)}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Total Spend Analyzed</div>
                    </div>
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl p-4 border border-[#333] text-center">
                      <div className="text-2xl font-bold text-white">
                        {formatNumber(selectedRecommendation.recommendation.data_summary.total_impressions_analyzed)}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Total Impressions</div>
                    </div>
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl p-4 border border-[#333] text-center">
                      <div className="text-2xl font-bold text-white">
                        {formatNumber(selectedRecommendation.recommendation.data_summary.total_clicks_analyzed)}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Total Clicks</div>
                    </div>
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl p-4 border border-[#333] text-center">
                      <div className="text-2xl font-bold text-white">
                        {formatNumber(selectedRecommendation.recommendation.data_summary.total_conversions_analyzed)}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Total Conversions</div>
                    </div>
                  </div>
                  
                  <div className="border-t border-[#333] pt-4">
                    <h4 className="text-sm font-semibold text-white mb-3">7-Day Daily Averages</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">
                          {formatCurrency(selectedRecommendation.recommendation.data_summary.average_daily_performance.spend)}
                        </div>
                        <div className="text-xs text-gray-400">Daily Spend</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">
                          {formatPercentage(selectedRecommendation.recommendation.data_summary.average_daily_performance.ctr)}
                        </div>
                        <div className="text-xs text-gray-400">Daily CTR</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">
                          {formatCurrency(selectedRecommendation.recommendation.data_summary.average_daily_performance.cpc)}
                        </div>
                        <div className="text-xs text-gray-400">Daily CPC</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">
                          {selectedRecommendation.recommendation.data_summary.average_daily_performance.roas.toFixed(2)}x
                        </div>
                        <div className="text-xs text-gray-400">Daily ROAS</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Implementation Guide */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl flex items-center justify-center border border-[#333]">
                  <span className="text-sm font-bold text-white">3</span>
                </div>
                <h3 className="text-lg font-semibold text-white">Performance Analysis</h3>
              </div>
              
              <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] rounded-2xl p-6 border border-[#333]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-white">Why this recommendation?</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {selectedRecommendation?.recommendation?.reasoning || 'Based on campaign performance analysis, this optimization will help improve overall efficiency and ROI.'}
                </p>
              </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-white">Implementation Steps</h4>
                                         <div className="text-gray-400 text-sm leading-relaxed">
                       {selectedRecommendation?.recommendation?.implementation && 
                        typeof selectedRecommendation.recommendation.implementation === 'string' ? (
                         <div className="space-y-2">
                           {selectedRecommendation.recommendation.implementation.split('\n').map((step, index) => (
                             step.trim() && (
                               <div key={index} className="flex items-start gap-2">
                                 <div className="w-1.5 h-1.5 bg-white/60 rounded-full mt-2 flex-shrink-0"></div>
                                 <span>{step.trim()}</span>
                               </div>
                             )
                           ))}
                         </div>
                       ) : (
                         <div className="space-y-2">
                           <div className="flex items-start gap-2">
                             <div className="w-1.5 h-1.5 bg-white/60 rounded-full mt-2 flex-shrink-0"></div>
                             <span>Log into your Meta Ads Manager</span>
                           </div>
                           <div className="flex items-start gap-2">
                             <div className="w-1.5 h-1.5 bg-white/60 rounded-full mt-2 flex-shrink-0"></div>
                             <span>Navigate to the campaign</span>
                           </div>
                           <div className="flex items-start gap-2">
                             <div className="w-1.5 h-1.5 bg-white/60 rounded-full mt-2 flex-shrink-0"></div>
                             <span>Apply the recommended changes</span>
                           </div>
                           <div className="flex items-start gap-2">
                             <div className="w-1.5 h-1.5 bg-white/60 rounded-full mt-2 flex-shrink-0"></div>
                             <span>Monitor performance closely</span>
                           </div>
                         </div>
                       )}
                     </div>
                  </div>
                </div>
                </div>
              </div>

            {/* Specific Actions */}
            {selectedRecommendation?.recommendation?.specific_actions && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl flex items-center justify-center border border-[#333]">
                    <span className="text-sm font-bold text-white">4</span>
                </div>
                  <h3 className="text-lg font-semibold text-white">Specific Actions</h3>
                </div>
                
                <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] rounded-2xl p-6 border border-[#333]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedRecommendation.recommendation.specific_actions.adsets_to_scale && 
                     selectedRecommendation.recommendation.specific_actions.adsets_to_scale.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-green-400">AdSets to Scale</h4>
                        <div className="space-y-2">
                          {selectedRecommendation.recommendation.specific_actions.adsets_to_scale.map((adset, index) => (
                            <div key={index} className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg p-3 border border-green-500/30">
                              <span className="text-green-300 text-sm">{adset}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedRecommendation.recommendation.specific_actions.adsets_to_optimize && 
                     selectedRecommendation.recommendation.specific_actions.adsets_to_optimize.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-blue-400">AdSets to Optimize</h4>
                        <div className="space-y-2">
                          {selectedRecommendation.recommendation.specific_actions.adsets_to_optimize.map((adset, index) => (
                            <div key={index} className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-lg p-3 border border-blue-500/30">
                              <span className="text-blue-300 text-sm">{adset}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedRecommendation.recommendation.specific_actions.adsets_to_pause && 
                     selectedRecommendation.recommendation.specific_actions.adsets_to_pause.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-orange-400">AdSets to Pause</h4>
                        <div className="space-y-2">
                          {selectedRecommendation.recommendation.specific_actions.adsets_to_pause.map((adset, index) => (
                            <div key={index} className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 rounded-lg p-3 border border-orange-500/30">
                              <span className="text-orange-300 text-sm">{adset}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedRecommendation.recommendation.specific_actions.ads_to_pause && 
                     selectedRecommendation.recommendation.specific_actions.ads_to_pause.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-red-400">Ads to Pause</h4>
                        <div className="space-y-2">
                          {selectedRecommendation.recommendation.specific_actions.ads_to_pause.map((ad, index) => (
                            <div key={index} className="bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-lg p-3 border border-red-500/30">
                              <span className="text-red-300 text-sm">{ad}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#333] pt-6 mt-8">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400 space-y-1">
                <div>
                  <span className="font-medium">Generated:</span> {selectedRecommendation?.recommendation?.generated_at ? 
                    new Date(selectedRecommendation.recommendation.generated_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    }) : 
                    'Unknown'}
                </div>
                {selectedRecommendation?.recommendation?.analysis_period && (
                  <div>
                    <span className="font-medium">Based on:</span> {selectedRecommendation.recommendation.analysis_period.days} days of data 
                    ({selectedRecommendation.recommendation.analysis_period.from} to {selectedRecommendation.recommendation.analysis_period.to})
                  </div>
                )}
                {selectedRecommendation?.recommendation?.data_summary && (
                  <div>
                    <span className="font-medium">Data analyzed:</span> {formatCurrency(selectedRecommendation.recommendation.data_summary.total_spend_analyzed)} spend, 
                    {formatNumber(selectedRecommendation.recommendation.data_summary.total_impressions_analyzed)} impressions, 
                    {formatNumber(selectedRecommendation.recommendation.data_summary.total_conversions_analyzed)} conversions
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setRecommendationDialogOpen(false)}
                  className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-[#333] text-gray-300 hover:bg-gradient-to-br hover:from-[#2a2a2a] hover:to-[#333] hover:text-white"
                  >
                    Close
                  </Button>
                <Button
                  className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 ${
                    selectedRecommendation?.recommendation?.status === 'completed'
                      ? 'bg-gradient-to-r from-green-600/20 to-green-700/20 text-green-400 border border-green-500/30 cursor-not-allowed'
                      : 'bg-gradient-to-r from-white to-gray-100 text-black hover:from-gray-100 hover:to-gray-200'
                  }`}
                  disabled={selectedRecommendation?.recommendation?.status === 'completed'}
                                     onClick={async () => {
                     if (!selectedRecommendation || selectedRecommendation?.recommendation?.status === 'completed') {
                       return;
                     }

                     // Show confirmation dialog
                     const confirmed = window.confirm(
                       'Are you sure you have implemented this recommendation? This action cannot be undone and the recommendation will be marked as completed until the next refresh.'
                     );
                     
                     if (!confirmed) return;

                     try {
                       // Update local state immediately for better UX
                       setLocalCampaigns(prev => prev.map(c => 
                         c.campaign_id === selectedRecommendation.campaign_id && c.recommendation
                           ? { ...c, recommendation: { ...c.recommendation, status: 'completed' } }
                           : c
                       ));

                       // Call the API to mark as completed
                       const response = await fetch('/api/ai/campaign-recommendations', {
                         method: 'PATCH',
                         headers: {
                           'Content-Type': 'application/json',
                         },
                         body: JSON.stringify({
                           brandId: selectedBrandId,
                           campaignId: selectedRecommendation.campaign_id,
                           status: 'completed'
                         })
                       });

                       if (response.ok) {
                         toast.success('Recommendation marked as completed! Great job implementing the changes.');
                         
                         // Reload recommendations from database to ensure persistence
                         setTimeout(() => {
                           loadSavedRecommendations(localCampaigns);
                         }, 1000);
                       } else {
                         throw new Error('Failed to update recommendation status');
                       }

                       setRecommendationDialogOpen(false);
                     } catch (error) {
                       
                       // Revert local state on error
                       setLocalCampaigns(prev => prev.map(c => 
                         c.campaign_id === selectedRecommendation.campaign_id && c.recommendation
                           ? { ...c, recommendation: { ...c.recommendation, status: 'active' } }
                           : c
                       ));
                       
                       toast.error('Failed to mark recommendation as completed. Please try again.');
                     }
                   }}
                >
                  {selectedRecommendation?.recommendation?.status === 'completed' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Completed
                    </>
                  ) : (
                    "I've done it"
                  )}
                  </Button>
                </div>
              </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}