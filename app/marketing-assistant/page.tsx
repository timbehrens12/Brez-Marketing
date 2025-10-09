"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import Image from 'next/image'
import { useAuth } from '@clerk/nextjs'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAgency } from '@/contexts/AgencyContext'
import { useSidebar } from "@/context/SidebarContext"

// Components
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import BrandSelector from '@/components/BrandSelector'
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { GridOverlay } from "@/components/GridOverlay"

// Icons
import { 
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Settings,
  RefreshCw,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Users,
  Sparkles,
  Globe,
  Brain,
  Info,
  X,
  Clock,
  TrendingDown,
  Wand2,
  Activity,
  Award,
  Gauge
} from 'lucide-react'

interface KPIMetrics {
  spend: number
  impressions: number
  clicks: number
  conversions: number
  cpa: number
  cpc: number
  roas: number
  revenue: number
  ctr: number
  costPerConversion: number
}

interface ActionKPIs {
  activeCampaigns: number
  totalCampaigns: number
  budgetUtilization: number // percentage of daily budget spent
  topPerformer: {
    name: string
  roas: number
    spend: number
  } | null
  needsAttention: number // count of underperforming campaigns
}

interface OptimizationCard {
  id: string
  type: 'budget' | 'audience' | 'creative' | 'bid' | 'frequency'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  rootCause: string
  actions: Array<{
    id: string
    type: string
    label: string
    impact: {
  revenue: number
  roas: number
      confidence: number
    }
    estimatedTimeToStabilize: string
  }>
  currentValue: string
  recommendedValue: string
  projectedImpact: {
  revenue: number
  roas: number
    confidence: number
  }
}

interface BudgetAllocation {
  id: string
  campaignName: string
  currentBudget: number
  suggestedBudget: number
  currentRoas: number
  projectedRoas: number
  confidence: number
  risk: 'low' | 'medium' | 'high'
}

interface AudienceExpansion {
  id: string
  type: 'lookalike' | 'interest' | 'geographic' | 'demographic'
  title: string
  description: string
  currentReach: number
  projectedReach: number
  estimatedCpa: number
  confidence: number
}

interface AlertItem {
  id: string
  type: 'warning' | 'error' | 'info'
  title: string
  description: string
  timestamp: Date
  acknowledged: boolean
  platform?: 'meta' | 'google' | 'tiktok' | 'all' // Platform this alert is for
}

export default function MarketingAssistantPage() {
  const { userId } = useAuth()
  const { selectedBrandId } = useBrandContext()
  const { agencySettings } = useAgency()
  const { isExpanded: isSidebarExpanded } = useSidebar()
  
  // State
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [loadingPhase, setLoadingPhase] = useState<string>('Initializing Marketing Assistant')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null)
  const [actionKPIs, setActionKPIs] = useState<ActionKPIs | null>(null)
  const [optimizationCards, setOptimizationCards] = useState<OptimizationCard[]>([])
  const [quickInsights, setQuickInsights] = useState<any[]>([])
  const [trends, setTrends] = useState<any>(null)
  const [weeklyProgress, setWeeklyProgress] = useState<any>(null)
  const [optimizationTimeline, setOptimizationTimeline] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showDetailedTimeline, setShowDetailedTimeline] = useState(false)
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null)
  const [timelineScrollOffset, setTimelineScrollOffset] = useState(0)
  const [initialDataLoad, setInitialDataLoad] = useState(true)
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const [simulationData, setSimulationData] = useState<any>(null)
  const [showSimulation, setShowSimulation] = useState(false)
  const [explanationData, setExplanationData] = useState<any>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState(['meta', 'google', 'tiktok'])
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable')
  const [recommendationsViewed, setRecommendationsViewed] = useState(false)
  const [timeUntilRefresh, setTimeUntilRefresh] = useState('')
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set())
  const [dateRangeText, setDateRangeText] = useState<string>('')
  const [nextUpdateText, setNextUpdateText] = useState<string>('')
  const [hasAdPlatforms, setHasAdPlatforms] = useState<boolean>(false)
  const [isCheckingPlatforms, setIsCheckingPlatforms] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filter data based on selected platforms (client-side filtering for display only)
  const filteredOptimizations = optimizationCards.filter(card => 
    selectedPlatforms.includes('meta') // All recommendations are from meta_campaigns for now
  )
  // Note: Performance trends filter by platform in their rendering logic already

  // Check if brand has advertising platforms connected (by checking for campaigns)
  useEffect(() => {
    const checkPlatformConnections = async () => {
      if (!selectedBrandId) {
        setIsCheckingPlatforms(false)
        setHasAdPlatforms(false)
        setIsLoadingPage(false)
        setLoading(false)
        return
      }

      setIsCheckingPlatforms(true)
      setIsLoadingPage(true)
      setLoading(true)

      try {
        // Check if brand has Meta, Google, or TikTok connection (even if inactive)
        // We check for connection history, not active status, because they might have
        // disconnected today but still have data from last week to analyze
        const response = await fetch(`/api/platform-connections?brandId=${selectedBrandId}`)

        if (response.ok) {
          const data = await response.json()
          // Check if brand has Meta, Google, or TikTok connection (regardless of status)
          const hasAdPlatform = data.connections?.some((conn: any) => 
            ['meta', 'google', 'tiktok'].includes(conn.platform_type)
          )
          setHasAdPlatforms(hasAdPlatform)
          
          // If brand has platforms, trigger data load
          if (hasAdPlatform) {
            await loadDashboardData()
          } else {
            // No platforms - stop loading
            setIsLoadingPage(false)
            setLoading(false)
          }
        } else {
          // API error - assume no platforms
          setHasAdPlatforms(false)
          setIsLoadingPage(false)
          setLoading(false)
        }
      } catch (error) {
        // On error, assume no platforms to be safe
        setHasAdPlatforms(false)
        setIsLoadingPage(false)
        setLoading(false)
      } finally {
        setIsCheckingPlatforms(false)
      }
    }

    checkPlatformConnections()
  }, [selectedBrandId])

  // Calculate Sunday-to-Sunday date range (last complete week)
  const getSundayToSundayDates = () => {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days back to last Sunday (end of last week)
    const daysBackToSunday = dayOfWeek === 0 ? 0 : dayOfWeek
    
    // Get last Sunday (end of last week)
    const lastSunday = new Date(now)
    lastSunday.setDate(now.getDate() - daysBackToSunday)
    lastSunday.setHours(23, 59, 59, 999)
    
    // Get the Sunday before that (start of last week)
    const previousSunday = new Date(lastSunday)
    previousSunday.setDate(lastSunday.getDate() - 7)
    previousSunday.setHours(0, 0, 0, 0)
    
    return { previousSunday, lastSunday }
  }
  
  // Calculate time until next Monday 12am (when new analysis becomes available)
  const getNextMondayMidnight = () => {
    const now = new Date()
    const nextMonday = new Date(now)
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7))
    nextMonday.setHours(0, 0, 0, 0)
    return nextMonday
  }

  const updateCountdown = () => {
    const now = new Date()
    const nextMonday = getNextMondayMidnight()
    const diff = nextMonday.getTime() - now.getTime()
    
    // Update date range text and next update text
    const { previousSunday, lastSunday } = getSundayToSundayDates()
    const formatDate = (date: Date) => {
      const month = date.toLocaleDateString('en-US', { month: 'short' })
      const day = date.getDate()
      return `${month} ${day}`
    }
    setDateRangeText(`${formatDate(previousSunday)} - ${formatDate(lastSunday)}`)
    setNextUpdateText(`Next Update: ${formatDate(nextMonday)}`)
    
    // Check if it's a new week (Monday) - reset the viewed state
    // Compare current week to last refresh week
      if (selectedBrandId) {
      const lastRefreshDate = localStorage.getItem(`lastRefreshDate_${selectedBrandId}`)
      const currentWeekStart = lastSunday.toISOString().split('T')[0]
      
      // If no last refresh or it was from a previous week, enable refresh
      if (!lastRefreshDate || lastRefreshDate < currentWeekStart) {
        localStorage.removeItem(`recommendationsViewed_${selectedBrandId}`)
      setRecommendationsViewed(false)
      }
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    setTimeUntilRefresh(`${days}d ${hours}h ${minutes}m`)
  }

  // Load viewed state and completed items from localStorage
  useEffect(() => {
    if (!selectedBrandId) return
    const viewed = localStorage.getItem(`recommendationsViewed_${selectedBrandId}`)
    if (viewed === 'true') {
      setRecommendationsViewed(true)
    } else {
      setRecommendationsViewed(false)
    }
    
    const completed = localStorage.getItem(`completedItems_${selectedBrandId}`)
    if (completed) {
      try {
        const completedArray = JSON.parse(completed)
        setCompletedItems(new Set(completedArray))
      } catch (e) {
        setCompletedItems(new Set())
      }
    } else {
      setCompletedItems(new Set())
    }
  }, [selectedBrandId])

  // Countdown timer
  useEffect(() => {
    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  // Note: Data loading is now handled in the platform check useEffect above
  // This ensures we check for platforms first, then load data only if platforms exist

  // Reload data when platform filter changes (for viewing, not regenerating recommendations)
  useEffect(() => {
    if (selectedBrandId && !initialDataLoad && optimizationCards.length > 0 && kpiMetrics) {
      // Only reload KPIs and trends when filter changes AND widgets were already loaded
      // This ensures we don't auto-load on page refresh
      loadKPIMetrics()
      loadTrends()
    }
  }, [selectedPlatforms])

  const loadDashboardData = async (forceRefresh = false) => {
    if (!selectedBrandId) return
    
      // If force refresh, clear ALL state first and show unified loading
      if (forceRefresh) {
        setIsRefreshingData(true)
        setLoading(true)
        setOptimizationCards([])
        setQuickInsights([])
        setWeeklyProgress(null)
        setKpiMetrics(null)
        setTrends(null)
      } else {
        // For initial load, use the page loading state
        setLoading(true)
      }
      
      // Initialize loading progress
      setLoadingProgress(0)
      setLoadingPhase('Initializing Marketing Assistant')
    
    try {
      // Phase 1: Connect to campaigns (10%)
      setLoadingProgress(10)
      setLoadingPhase('Connecting to your campaigns')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // FIRST: Ensure data exists for the analysis period (check for gaps and trigger sync if needed)
      const { previousSunday, lastSunday } = getSundayToSundayDates()
      const startDate = previousSunday.toISOString().split('T')[0]
      const endDate = lastSunday.toISOString().split('T')[0]
      
      console.log(`[Marketing Assistant] Ensuring data exists from ${startDate} to ${endDate}`)
      
      try {
        const ensureDataResponse = await fetch('/api/marketing-assistant/ensure-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId: selectedBrandId,
            startDate,
            endDate,
            platform: 'meta'
          })
        })
        
        if (ensureDataResponse.ok) {
          const ensureDataResult = await ensureDataResponse.json()
          console.log('[Marketing Assistant] Data sync result:', ensureDataResult)
          
          // If sync was triggered, wait for it to complete
          // Meta API sync takes time, especially for multiple days
          if (ensureDataResult.syncTriggered) {
            const days = ensureDataResult.dateRange?.days || 7
            const waitTime = Math.min(days * 1000, 10000) // 1 second per day, max 10 seconds
            console.log(`[Marketing Assistant] Fresh data synced from Meta API (${ensureDataResult.recordCount || 0} records), waiting ${waitTime}ms...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        }
      } catch (syncError) {
        console.error('[Marketing Assistant] Error checking/syncing data:', syncError)
        // Continue anyway - we'll work with whatever data exists
      }
      
      // Phase 2: Analyze performance (30%)
      setLoadingProgress(30)
      setLoadingPhase('Analyzing campaign performance')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Now load recommendations with ensured data
      // Pass forceRefresh to tell API to generate new recommendations if clicked "Update Recommendations"
      const loadedRecommendations = await loadOptimizationRecommendations(forceRefresh)
      
      // Phase 3: Generate recommendations (50%)
      setLoadingProgress(50)
      setLoadingPhase('Generating AI recommendations')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Load widgets based on context:
      // - On button click: Load ALL widgets
      // - On page refresh with viewed recommendations: Load ALL widgets (persist the analysis)
      // - On page refresh without viewed recommendations: Load ONLY timeline for week tracking
      if (forceRefresh) {
        // Phase 4: Prepare insights (70%)
        setLoadingProgress(70)
        setLoadingPhase('Preparing insights dashboard')
        
        // Load all widgets when button is clicked - force regenerate insights
        await Promise.all([
          loadKPIMetrics(),
          loadQuickInsights(true), // Force generate new insights
          loadTrends(),
          loadWeeklyProgress(),
          loadOptimizationTimeline()
        ])
        
        // Phase 5: Calculate trends (85%)
        setLoadingProgress(85)
        setLoadingPhase('Calculating performance trends')
        await new Promise(resolve => setTimeout(resolve, 300))
      } else if (loadedRecommendations && loadedRecommendations.length > 0) {
        // Check if user has already run analysis this week
        const hasRunAnalysis = selectedBrandId && localStorage.getItem(`recommendationsViewed_${selectedBrandId}`) === 'true'
        
        if (hasRunAnalysis) {
          // Phase 4: Prepare insights (70%)
          setLoadingProgress(70)
          setLoadingPhase('Preparing insights dashboard')
          
          // User already ran analysis - load all widgets with cached data
      await Promise.all([
            loadKPIMetrics(),
            loadQuickInsights(false), // Use cached insights
            loadTrends(),
            loadWeeklyProgress(),
            loadOptimizationTimeline()
          ])
          
          // Phase 5: Calculate trends (85%)
          setLoadingProgress(85)
          setLoadingPhase('Calculating performance trends')
          await new Promise(resolve => setTimeout(resolve, 300))
        } else {
          // User hasn't run analysis yet - only load timeline for week tracking
          setLoadingProgress(70)
          await loadOptimizationTimeline()
        }
      }
      
      // Phase 6: Finalize (95%)
      setLoadingProgress(95)
      setLoadingPhase('Finalizing your dashboard')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Complete (100%)
      setLoadingProgress(100)
    } catch (error) {
    } finally {
      // Always clear loading states when done
      setInitialDataLoad(false)
      setLoading(false)
      setIsLoadingPage(false)
      setIsRefreshingData(false)
    }
  }

  const loadKPIMetrics = async () => {
    if (!selectedBrandId) return

    try {
      // Backend always uses last 7 days - pass platform and status filters
      const response = await fetch(`/api/marketing-assistant/metrics?brandId=${selectedBrandId}&platforms=${selectedPlatforms.join(',')}`)
            
            if (response.ok) {
              const data = await response.json()
        setKpiMetrics(data.metrics)
      }
    } catch (error) {
    }
  }

  const loadActionKPIs = async () => {
    if (!selectedBrandId) return

    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/marketing-assistant/action-kpis?brandId=${selectedBrandId}&platforms=${selectedPlatforms.join(',')}&_t=${timestamp}`, {
        cache: 'no-store'
      })
      
            
            if (response.ok) {
              const data = await response.json()
        setActionKPIs(data.actionKPIs)
      } else {
        const errorText = await response.text()
            }
          } catch (error) {
    }
  }

  const loadOptimizationRecommendations = async (forceGenerate = false) => {
    if (!selectedBrandId) return []

    try {
      const timestamp = Date.now()
      // Backend always uses last 7 days - pass platform and status filters
      // Only pass forceGenerate=true when user explicitly clicks "Update Recommendations"
      const forceParam = forceGenerate ? '&forceGenerate=true' : ''
      const response = await fetch(`/api/marketing-assistant/recommendations?brandId=${selectedBrandId}&platforms=${selectedPlatforms.join(',')}&_t=${timestamp}${forceParam}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const recommendations = data.recommendations || []
        setOptimizationCards(recommendations)
        return recommendations
      } else {
        setOptimizationCards([])
        return []
                  }
                } catch (error) {
      setOptimizationCards([])
      return []
    }
  }

  const loadOptimizationTimeline = async () => {
    if (!selectedBrandId) return
    
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/marketing-assistant/optimization-timeline?brandId=${selectedBrandId}&_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
            if (response.ok) {
              const data = await response.json()
        console.log(`[Marketing Assistant] Loaded optimization timeline:`, data.timeline)
        setOptimizationTimeline(data.timeline || null)
      } else {
        setOptimizationTimeline(null)
        }
      } catch (error) {
      console.error('[Marketing Assistant] Error loading optimization timeline:', error)
      setOptimizationTimeline(null)
    }
  }

  const loadWeeklyProgress = async () => {
    if (!selectedBrandId) return
    
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/marketing-assistant/weekly-progress?brandId=${selectedBrandId}&_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        console.log(`[Marketing Assistant] Loaded weekly progress:`, data.progress)
        setWeeklyProgress(data.progress || null)
      } else {
        setWeeklyProgress(null)
        }
      } catch (error) {
      console.error('[Marketing Assistant] Error loading weekly progress:', error)
      setWeeklyProgress(null)
    }
  }

  const loadQuickInsights = async (forceGenerate = false) => {
    if (!selectedBrandId) return

    try {
      const timestamp = Date.now()
      const forceParam = forceGenerate ? '&forceGenerate=true' : ''
      const response = await fetch(`/api/marketing-assistant/quick-insights?brandId=${selectedBrandId}&platforms=${selectedPlatforms.join(',')}&_t=${timestamp}${forceParam}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[Marketing Assistant] Loaded ${data.insights?.length || 0} quick insights`)
        setQuickInsights(data.insights || [])
      } else {
        setQuickInsights([])
        }
      } catch (error) {
      console.error('[Marketing Assistant] Error loading quick insights:', error)
      setQuickInsights([])
    }
  }



  const handleMarkAsDone = async (cardId: string, actionId: string) => {
    try {
      const itemId = `opt-${cardId}`
      const newCompleted = new Set(completedItems).add(itemId)
      setCompletedItems(newCompleted)
      if (selectedBrandId) {
        const storageKey = `completedItems_${selectedBrandId}`
        const storageValue = JSON.stringify([...newCompleted])
        localStorage.setItem(storageKey, storageValue)
      }
      
      const card = optimizationCards.find(c => c.id === cardId)
      if (!card) return

      // Track performance impact
      try {
        const response = await fetch('/api/marketing-assistant/recommendation-performance', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recommendationId: cardId,
            brandId: selectedBrandId,
            campaignId: card.campaignId
          })
        })
        if (response.ok) {
          const result = await response.json()
        }
      } catch (err) {
      }

      // Log the action as manually completed
      const response = await fetch('/api/marketing-assistant/recommendations', {
                    method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
                    body: JSON.stringify({
          action: 'mark_done',
          campaignId: card.id,
          actionId,
                      brandId: selectedBrandId,
          status: 'completed_manually'
        })
      })

      if (response.ok) {
        // Reload weekly progress AND optimization timeline to reflect the new completion
        await Promise.all([
          loadWeeklyProgress(),
          loadOptimizationTimeline()
        ])
        console.log('[Marketing Assistant] ✅ Marked as done and reloaded progress')
                  }
    } catch (error) {
      console.error('[Marketing Assistant] Error marking as done:', error)
    }
  }

  const handleExplainRecommendation = async (cardId: string) => {
    try {
      const card = optimizationCards.find(c => c.id === cardId)
      if (!card) return

      const response = await fetch('/api/marketing-assistant/explain', {
                    method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
                    body: JSON.stringify({
          type: 'recommendation',
          data: card,
          brandId: selectedBrandId
        })
      })

      if (response.ok) {
        const explanation = await response.json()
        setExplanationData(explanation)
        setShowExplanation(true)
        }
      } catch (error) {
    }
  }


  const handleSimulateAction = async (cardId: string, actionId: string) => {
    try {
      const card = optimizationCards.find(c => c.id === cardId)
      if (!card) {
      return
    }


      const response = await fetch('/api/marketing-assistant/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'simulate_action',
          campaignId: card.id,
          actionId,
          brandId: selectedBrandId
        })
      })

      
      if (response.ok) {
        const result = await response.json()
        
        setSimulationData({
          card,
          action: card.actions.find(a => a.id === actionId),
          simulation: result.simulation
        })
        setShowSimulation(true)
      } else {
        const errorText = await response.text()
      }
    } catch (error) {
    }
  }



  const loadTrends = async () => {
    if (!selectedBrandId) return

    try {
      // Backend always uses last 7 days - pass platform and status filters
      const response = await fetch(`/api/marketing-assistant/trends?brandId=${selectedBrandId}&days=7&platforms=${selectedPlatforms.join(',')}`)
      
      if (response.ok) {
        const data = await response.json()
        setTrends(data.trends)
      } else {
        setTrends(null)
      }
    } catch (error) {
      setTrends(null)
    }
  }

  if (isLoadingPage || loading || isRefreshingData) {
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
            <div className="absolute inset-0 rounded-full border-4 border-t-[#FF2A2A] animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
              {agencySettings?.agency_logo_url && (
                <img 
                  src={agencySettings.agency_logo_url} 
                  alt={`${agencySettings?.agency_name || 'Agency'} Logo`} 
                  className="w-12 h-12 object-contain rounded" 
                />
              )}
            </div>
          </div>
          
          {/* Loading title */}
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Marketing Assistant
          </h1>
          
          {/* Dynamic loading phase */}
          <p className="text-xl text-gray-300 mb-6 font-medium min-h-[28px]">
            {isRefreshingData ? 'Updating Analysis' : loadingPhase}
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
              <div className={`w-4 h-4 rounded-full transition-colors duration-300 flex items-center justify-center ${loadingProgress >= 30 ? 'bg-[#FF2A2A]' : loadingProgress >= 10 ? 'bg-white/60' : 'bg-white/20'}`}></div>
              <span>Connecting to your campaigns</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 30 ? 'text-gray-300' : ''}`}>
              <div className={`w-4 h-4 rounded-full transition-colors duration-300 flex items-center justify-center ${loadingProgress >= 50 ? 'bg-[#FF2A2A]' : loadingProgress >= 30 ? 'bg-white/60' : 'bg-white/20'}`}></div>
              <span>Analyzing campaign performance</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 50 ? 'text-gray-300' : ''}`}>
              <div className={`w-4 h-4 rounded-full transition-colors duration-300 flex items-center justify-center ${loadingProgress >= 70 ? 'bg-[#FF2A2A]' : loadingProgress >= 50 ? 'bg-white/60' : 'bg-white/20'}`}></div>
              <span>Generating AI recommendations</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 70 ? 'text-gray-300' : ''}`}>
              <div className={`w-4 h-4 rounded-full transition-colors duration-300 flex items-center justify-center ${loadingProgress >= 85 ? 'bg-[#FF2A2A]' : loadingProgress >= 70 ? 'bg-white/60' : 'bg-white/20'}`}></div>
              <span>Preparing insights dashboard</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 85 ? 'text-gray-300' : ''}`}>
              <div className={`w-4 h-4 rounded-full transition-colors duration-300 flex items-center justify-center ${loadingProgress >= 95 ? 'bg-[#FF2A2A]' : loadingProgress >= 85 ? 'bg-white/60' : 'bg-white/20'}`}></div>
              <span>Calculating performance trends</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 95 ? 'text-gray-300' : ''}`}>
              <div className={`w-4 h-4 rounded-full transition-colors duration-300 flex items-center justify-center ${loadingProgress >= 100 ? 'bg-[#FF2A2A]' : loadingProgress >= 95 ? 'bg-white/60' : 'bg-white/20'}`}></div>
              <span>Finalizing your dashboard</span>
            </div>
          </div>
          
          {/* Subtle loading tip */}
          <div className="mt-8 text-xs text-gray-500 italic">
            Building your AI-powered marketing insights...
          </div>
        </div>
      </div>
    )
  }

  // Show message if no brand is selected
  if (!selectedBrandId) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4">
        <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-white/5 to-white/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Brain className="w-8 h-8 text-gray-400" />
        </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Brand Selected</h2>
            <p className="text-gray-400">Please select a brand from the sidebar to access the Marketing Assistant</p>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Show message if brand has no advertising platforms connected
  if (!isCheckingPlatforms && !hasAdPlatforms) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4">
        <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF2A2A]/20 to-[#FF2A2A]/5 rounded-xl flex items-center justify-center mx-auto mb-4 border border-[#FF2A2A]/30">
              <AlertTriangle className="w-8 h-8 text-[#FF2A2A]" />
        </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Advertising Platforms Connected</h2>
            <p className="text-gray-400 mb-4">
              The Marketing Assistant requires at least one advertising platform (Meta, Google, or TikTok) to be connected to this brand.
            </p>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <Button
              onClick={() => window.location.href = '/settings'}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              Go to Settings
            </Button>
            <Button
              onClick={() => window.location.href = '/lead-generator'}
              className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
            >
              <Target className="w-4 h-4 mr-2" />
              No Brands Yet? Find Clients to Manage
            </Button>
            <p className="text-xs text-gray-500">
              Connect Meta, Google, or TikTok to unlock AI-powered campaign optimization
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

    return (
    <div className="min-h-screen bg-[#0B0B0B] relative">
      
      {/* Grid overlay background */}
      <GridOverlay />
       
      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-radial from-[#FF2A2A]/10 to-transparent blur-3xl opacity-20 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-radial from-[#10b981]/10 to-transparent blur-3xl opacity-20 animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}></div>
       
       {/* Loading overlay for data refreshes */}
       {isRefreshingData && (
         <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
           <div className="bg-[#111] border border-[#333] rounded-lg p-6 text-center">
             <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-white mx-auto mb-3"></div>
             <p className="text-white text-sm">Refreshing data...</p>
            </div>
          </div>
       )}
      
      <div className="w-full px-2 sm:px-4 lg:px-6 py-6 overflow-x-hidden">
        
        {/* PREMIUM HEADER SECTION */}
        <div className="mb-6 space-y-4 max-w-[1920px] mx-auto animate-in fade-in slide-in-from-top-4 duration-700">
          
          {/* Main Title Bar with Quick Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight">
                AI Marketing Assistant
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">Intelligent campaign optimization powered by machine learning</p>
          </div>
            
            {/* Update Button */}
            <div className="hidden lg:flex items-center gap-3">
                  <Button
                    onClick={async () => {
                      setIsRefreshingData(true)
                      
                      // Clear ALL localStorage for this brand
                      if (selectedBrandId) {
                        localStorage.removeItem(`recommendationsViewed_${selectedBrandId}`)
                        localStorage.removeItem(`completedItems_${selectedBrandId}`)
                      }
                      
                      // Delete AI recommendations from database
                      await fetch(`/api/marketing-assistant/recommendations?brandId=${selectedBrandId}&secret=reset-ai-recs`, {
                        method: 'DELETE'
                      })
                      
                      // Clear local state including alerts AND save to localStorage
                      setRecommendationsViewed(true) // Mark as viewed so countdown shows
                      if (selectedBrandId) {
                        localStorage.setItem(`recommendationsViewed_${selectedBrandId}`, 'true')
                    // Save the refresh date (last Sunday) so we know when to enable refresh again
                    const { lastSunday } = getSundayToSundayDates()
                    localStorage.setItem(`lastRefreshDate_${selectedBrandId}`, lastSunday.toISOString().split('T')[0])
                      }
                      setCompletedItems(new Set())
                      
                      // Reload ALL widgets with FORCE REFRESH
                      await loadDashboardData(true)
                      
                      setIsRefreshingData(false)
                    }}
                    disabled={isRefreshingData || recommendationsViewed}
                className="relative overflow-hidden bg-gradient-to-r from-[#FF2A2A] to-[#FF5A5A] text-black font-bold px-6 py-5 rounded-xl hover:shadow-lg hover:shadow-[#FF2A2A]/50 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingData ? 'animate-spin' : ''}`} />
                {isRefreshingData ? 'Updating...' : recommendationsViewed ? `Next: ${timeUntilRefresh}` : `Run Week ${(optimizationTimeline?.weeks?.length || 0) + 1} Analysis`}
                  </Button>
      </div>
                </div>

          {/* Performance Window & Platform Filters Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Performance Window */}
            <div className="flex-1 bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#FF2A2A]/20 to-[#FF5A5A]/10 rounded-lg flex items-center justify-center border border-[#FF2A2A]/30">
                      <Calendar className="w-4 h-4 text-[#FF2A2A]" />
                </div>
                    <span className="text-sm text-gray-400 font-medium">Performance Window</span>
        </div>
                  <Badge className="bg-[#FF2A2A]/20 text-[#FF2A2A] border-[#FF2A2A]/30 text-xs font-semibold">Mon-Mon</Badge>
                  <span className="text-white font-bold text-sm">{dateRangeText || 'Loading...'}</span>
      </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {nextUpdateText || 'Loading...'}
                      </div>
                            </div>
                          </div>

            {/* Platform Filter Chips */}
            <div className="flex items-center gap-2 bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setSelectedPlatforms(['meta', 'google', 'tiktok'])}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                    selectedPlatforms.length === 3
                      ? 'bg-[#FF2A2A]/20 text-[#FF2A2A] border border-[#FF2A2A]/30'
                      : 'bg-white/5 text-gray-400 border border-[#333] hover:bg-white/10'
                  }`}
                >
                  All Platforms
                </button>
                <button
                  onClick={() => setSelectedPlatforms(['meta'])}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                    selectedPlatforms.length === 1 && selectedPlatforms[0] === 'meta'
                      ? 'bg-[#FF2A2A]/20 text-[#FF2A2A] border border-[#FF2A2A]/30'
                      : 'bg-white/5 text-gray-400 border border-[#333] hover:bg-white/10'
                  }`}
                >
                  Meta
                </button>
                <button
                  onClick={() => setSelectedPlatforms(['google'])}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                    selectedPlatforms.length === 1 && selectedPlatforms[0] === 'google'
                      ? 'bg-[#FF2A2A]/20 text-[#FF2A2A] border border-[#FF2A2A]/30'
                      : 'bg-white/5 text-gray-400 border border-[#333] hover:bg-white/10'
                  }`}
                >
                  Google
                </button>
                <button
                  onClick={() => setSelectedPlatforms(['tiktok'])}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                    selectedPlatforms.length === 1 && selectedPlatforms[0] === 'tiktok'
                      ? 'bg-[#FF2A2A]/20 text-[#FF2A2A] border border-[#FF2A2A]/30'
                      : 'bg-white/5 text-gray-400 border border-[#333] hover:bg-white/10'
                  }`}
                >
                  TikTok
                </button>
                            </div>
                          </div>
                          </div>
                        </div>
        
         {/* MAIN GRID LAYOUT - Fixed Height Container */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 lg:gap-4 max-w-[1920px] mx-auto h-[calc(100vh-200px)]">
            
             {/* Left Rail - Fixed Height Column */}
            <div className="col-span-1 xl:col-span-3 flex flex-col gap-2.5 min-w-0 h-full">
            
            {/* Quick Actions Card - Compact */}
            <Card className="bg-gradient-to-br from-[#111]/80 to-[#0A0A0A]/80 border border-[#333] backdrop-blur-sm flex-shrink-0">
              <CardContent className="p-3 space-y-2.5">
                {/* Mobile Update Button */}
                          <Button 
                  onClick={async () => {
                    setIsRefreshingData(true)
                    
                    if (selectedBrandId) {
                      localStorage.removeItem(`recommendationsViewed_${selectedBrandId}`)
                      localStorage.removeItem(`completedItems_${selectedBrandId}`)
                    }
                    
                    await fetch(`/api/marketing-assistant/recommendations?brandId=${selectedBrandId}&secret=reset-ai-recs`, {
                      method: 'DELETE'
                    })
                    
                    setRecommendationsViewed(true)
                    if (selectedBrandId) {
                      localStorage.setItem(`recommendationsViewed_${selectedBrandId}`, 'true')
                      const { lastSunday } = getSundayToSundayDates()
                      localStorage.setItem(`lastRefreshDate_${selectedBrandId}`, lastSunday.toISOString().split('T')[0])
                    }
                    setCompletedItems(new Set())
                    
                    await loadDashboardData(true)
                    
                    setIsRefreshingData(false)
                  }}
                  disabled={isRefreshingData || recommendationsViewed}
                  className="w-full text-xs h-9 bg-gradient-to-r from-[#FF2A2A] to-[#FF5A5A] hover:shadow-lg hover:shadow-[#FF2A2A]/50 text-black border-0 font-bold lg:hidden transition-all duration-300"
                >
                  <RefreshCw className={`h-3 w-3 mr-1.5 ${isRefreshingData ? 'animate-spin' : ''}`} />
                  {isRefreshingData ? 'Updating...' : recommendationsViewed ? `Next: ${timeUntilRefresh}` : `Run Week ${(optimizationTimeline?.weeks?.length || 0) + 1} Analysis`}
                          </Button>
                
                {/* How It Works Button */}
                            <Button 
                  variant="outline"
                              size="sm" 
                  onClick={() => setShowHowItWorks(true)}
                  className="w-full text-xs h-8 bg-white/5 hover:bg-white/10 text-white border-[#333] transition-all duration-200"
                            >
                  <Info className="h-3 w-3 mr-1.5" />
                  How It Works
                            </Button>
              </CardContent>
            </Card>

             {/* Optimization Progress - Premium Radial Gauge */}
             <Card className="relative bg-gradient-to-br from-[#111]/80 to-[#0A0A0A]/80 border border-[#333] backdrop-blur-sm flex-1 flex flex-col overflow-hidden">
              
              <CardHeader className="relative border-b border-[#333]/60 pb-3 flex-shrink-0">
                <div>
                  <h3 className="text-base font-bold text-white">Optimization Progress</h3>
                  <p className="text-xs text-gray-500">Live implementation tracking</p>
      </div>
              </CardHeader>
              
              <CardContent className="relative px-2.5 pt-2.5 pb-2.5 overflow-y-auto flex-1">
                {loading && !weeklyProgress && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-white mx-auto mb-2"></div>
                    <p className="text-sm">Loading progress...</p>
                      </div>
                    )}
                
                {(() => {
                  // Always show progress - use default 0 values if no data yet
                  const progress = weeklyProgress || {
                    completionPercentage: 0,
                    completedCount: 0,
                    totalRecommendations: 0,
                    roasImprovement: 0,
                    categories: {},
                    topApplied: []
                  }
                  
                  return !loading && (
                  <>
                    {/* Circular Radial Progress Gauge - Compact */}
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-32 h-32 mb-3">
                        {/* SVG Circle Progress */}
                        <svg className="w-full h-full transform -rotate-90">
                          {/* Background circle */}
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="url(#progressBg)"
                            strokeWidth="8"
                            fill="none"
                            opacity="0.15"
                          />
                          {/* Progress circle */}
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="url(#progressGradient)"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray="351.86"
                            strokeDashoffset={351.86 - (351.86 * progress.completionPercentage) / 100}
                            className="transition-all duration-1000 ease-out"
                            style={{ filter: 'drop-shadow(0 0 6px rgba(255, 42, 42, 0.5))' }}
                          />
                          <defs>
                            <linearGradient id="progressBg" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#FF2A2A" stopOpacity="0.1" />
                              <stop offset="100%" stopColor="#FF5A5A" stopOpacity="0.1" />
                            </linearGradient>
                            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#FF2A2A" />
                              <stop offset="50%" stopColor="#FF5A5A" />
                              <stop offset="100%" stopColor="#FF7A7A" />
                            </linearGradient>
                          </defs>
                        </svg>
                        
                        {/* Center content - Compact */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-3xl font-black bg-gradient-to-br from-[#FF2A2A] via-white to-[#FF5A5A] bg-clip-text text-transparent mb-0.5">
                            {progress.completionPercentage}%
                          </div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Complete</div>
                          <div className="text-xs text-white font-bold mt-1">
                            {progress.completedCount}/{progress.totalRecommendations} Applied
                        </div>
                            </div>
                        
                        {/* Outer glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FF2A2A]/20 to-transparent rounded-full blur-2xl -z-10"></div>
                          </div>
                      
                      {/* Stats Grid - Compact */}
                      <div className="w-full space-y-1">
                        {progress.roasImprovement !== undefined && progress.roasImprovement !== 0 && (
                          <div className="flex items-center justify-between p-2 bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20 rounded-lg">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">ROAS Gain</span>
                            <span className={`text-xs font-bold ${progress.roasImprovement > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {progress.roasImprovement > 0 ? '+' : ''}{progress.roasImprovement.toFixed(0)}%
                            </span>
                    </div>
                    )}
                        
                        {progress.totalRecommendations > progress.completedCount && (
                          <div className="flex items-center justify-between p-2 bg-gradient-to-r from-[#FF2A2A]/10 to-transparent border border-[#FF2A2A]/20 rounded-lg">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Pending</span>
                            <span className="text-xs font-medium text-[#FF2A2A]">{progress.totalRecommendations - progress.completedCount}</span>
                            </div>
                    )}
                            </div>
                            </div>

                    {/* Category Breakdown */}
                    {progress.categories && Object.values(progress.categories).some((count: any) => count > 0) && (
                      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#0f0f0f] border border-[#333] rounded-lg p-3">
                        <h4 className="text-white font-medium text-xs mb-2 uppercase tracking-wide">By Category</h4>
                        <div className="space-y-1">
                          {Object.entries(progress.categories).filter(([_, count]: [string, any]) => count > 0).map(([category, count]: [string, any]) => {
                            const completed = Math.floor(count * (progress.completionPercentage / 100))
                            return (
                              <div key={category} className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">{category}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-12 bg-[#0f0f0f] rounded-full h-1 border border-[#333]">
                                    <div 
                                      className="bg-gradient-to-r from-[#FF2A2A] to-[#FF5A5A] h-full rounded-full"
                                      style={{ width: `${count > 0 ? (completed / count) * 100 : 0}%` }}
                                    ></div>
                        </div>
                                  <span className="text-white text-xs font-medium w-7 text-right">{completed}/{count}</span>
                          </div>
                          </div>
                            )
                          })}
                        </div>
                            </div>
                    )}

                    {/* Current Goals - Show goals from Week 1 timeline */}
                    {(() => {
                      const timeline = optimizationTimeline || { weeks: [], stats: { totalOptimizations: 0, avgRoas: 0 } }
                      const week1Goals = timeline.weeks.length > 0 ? timeline.weeks[0].goals : []
                      
                      return week1Goals && week1Goals.length > 0 && (
                        <div className="bg-gradient-to-r from-[#1A1A1A] to-[#0f0f0f] border border-[#333] rounded-lg p-2">
                          <h4 className="text-white font-semibold text-xs mb-1.5 uppercase tracking-wide">Current Goals</h4>
                          <div className="space-y-1">
                             {week1Goals.map((goal: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-[#FF2A2A] rounded-full mt-1 flex-shrink-0"></div>
                                <p className="text-gray-300 text-xs leading-snug">{goal.title}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Performance Tracking - Redesigned with bigger text */}
                    {(() => {
                      const timeline = optimizationTimeline || { weeks: [], stats: { totalOptimizations: 0, avgRoas: 0 } }
                      // Determine which week is "current" based on whether recommendations exist
                      const hasRecommendations = optimizationCards && optimizationCards.length > 0
                      const currentWeekNum = hasRecommendations ? 1 : 0 // 0 means no week is current yet
                      const nextAvailableWeek = hasRecommendations ? 2 : 1 // If no recommendations, Week 1 is available
                      
                      // Show only first 3 weeks for space
                      const weeksToShow = 3
                      const displayWeeks = Array.from({ length: weeksToShow }, (_, i) => {
                        const weekNum = i + 1
                        if (i < timeline.weeks.length) {
                          return { 
                            ...timeline.weeks[i], 
                            weekNum,
                            isCurrent: weekNum === currentWeekNum,
                            isActive: true,
                            isAvailable: false
                          }
                        } else {
                          return { 
                            weekNum,
                            optimizationsApplied: 0,
                            roas: 0,
                            isCurrent: false,
                            isActive: false,
                            isAvailable: weekNum === nextAvailableWeek
                          }
                        }
                      })
                      
                      return (
                    <div className="bg-gradient-to-r from-[#1A1A1A] to-[#0f0f0f] border border-[#333] rounded-lg p-2 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-semibold text-xs uppercase tracking-wide">Performance Tracking</h4>
                          <button
                            onClick={() => setShowDetailedTimeline(true)}
                            className="text-gray-400 hover:text-[#FF2A2A] transition-colors"
                            title="View detailed timeline"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                            </div>
                        <span className="text-xs text-[#FF2A2A] font-bold">
                          {currentWeekNum > 0 ? `Week ${currentWeekNum}` : 'Not Started'}
                        </span>
                            </div>
                      
                      {/* Week Cards - Bigger and more readable */}
                      <div className="space-y-1">
                        {displayWeeks.map((week: any) => {
                          const hasOptimizations = week.optimizationsApplied > 0
                          const isImproving = week.roasChange > 0
                          
                          return (
                            <div key={week.weekNum} className={`relative p-1.5 rounded-lg border ${
                              week.isCurrent 
                                ? 'bg-[#FF2A2A]/10 border-[#FF2A2A]/50' 
                                : week.isActive
                                ? 'bg-[#0A0A0A]/80 border-[#333]'
                                : 'bg-[#0A0A0A]/30 border-[#222] border-dashed'
                            }`}>
                              {/* Week Label */}
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold ${
                                    week.isCurrent ? 'text-[#FF2A2A]' : week.isActive ? 'text-white' : 'text-gray-700'
                                  }`}>
                                    Week {week.weekNum}
                                  </span>
                                  {week.isCurrent && (
                                    <span className="px-1.5 py-0.5 bg-[#FF2A2A] text-white text-[9px] font-bold rounded uppercase">Current</span>
                                  )}
                                </div>
                                {week.isActive && week.roas > 0 && (
                                  <span className={`text-xs font-bold ${
                                    isImproving ? 'text-emerald-400' : week.roasChange < 0 ? 'text-red-400' : 'text-gray-400'
                                  }`}>
                                    {week.roas.toFixed(2)}x ROAS
                                  </span>
                                )}
                              </div>
                              
                              {/* Stats */}
                              {week.isActive ? (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    {hasOptimizations ? (
                                      <>
                                        <div className="w-2 h-2 bg-[#FF2A2A] rounded-full"></div>
                                        <span className="text-xs text-white font-medium">{week.optimizationsApplied} applied</span>
                                      </>
                                    ) : (
                                      <>
                                        <div className="w-2 h-2 bg-gray-700 rounded-full"></div>
                                        <span className="text-xs text-gray-500">No optimizations yet</span>
                                      </>
                          )}
                          </div>
                                  {week.roasChange !== 0 && (
                                    <span className={`text-xs font-bold ${isImproving ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {isImproving ? '+' : ''}{week.roasChange}%
                                    </span>
                                  )}
                        </div>
                              ) : week.isAvailable ? (
                                <span className="text-xs text-emerald-400 font-medium">Available Now</span>
                              ) : (
                                <span className="text-xs text-gray-600">Upcoming</span>
                              )}
                    </div>
                          )
                        })}
                          </div>
                      
                      {/* Summary Stats */}
                      {timeline.weeks.length > 0 && (
                        <div className="flex items-center justify-between text-xs pt-1.5 mt-1.5 border-t border-[#333]">
                          <div className="text-gray-400">
                            <span className="text-white font-bold">{timeline.stats.totalOptimizations}</span> total
                          </div>
                        <div className="text-gray-400">
                          {timeline.stats.avgRoas > 0 && (
                            <>Avg: <span className="text-white font-bold">{timeline.stats.avgRoas.toFixed(2)}x</span></>
                          )}
                          </div>
                        </div>
                      )}
                          </div>
                      )
                    })()}

                  </>
                  )
                })()}
              </CardContent>
            </Card>
                </div>

            {/* Middle Column - Main Work Area - Scrollable */}
           <div className="col-span-1 xl:col-span-6 flex flex-col gap-4 min-w-0 h-full overflow-y-auto pr-1 rounded-b-xl border-b border-[#333] pb-4">
            
            {/* AI Optimization Feed - Completely Redesigned */}
            <Card className="bg-gradient-to-br from-[#111]/80 to-[#0A0A0A]/80 border border-[#333] backdrop-blur-sm flex-shrink-0">
              <CardHeader className="border-b border-[#333]/60 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      AI Optimization Feed
                    </h2>
                    <p className="text-xs text-gray-500">Intelligent recommendations ranked by impact</p>
                          </div>
                  {filteredOptimizations.length > 0 && (
                    <Badge className="bg-white/10 text-white border-white/20 px-3 py-1">
                      {filteredOptimizations.length} Active
                    </Badge>
                  )}
                        </div>
              </CardHeader>
              
              <CardContent className="p-3">
                <div className="space-y-3">
                  {filteredOptimizations.map(card => {
                    const effortLevel = card.priority === 'high' ? 3 : card.priority === 'medium' ? 2 : 1
                    const confidencePercentage = card.projectedImpact?.confidence || 85
                    
                    return (
                    <div key={card.id} className="group relative bg-gradient-to-br from-[#1a1a1a]/60 to-[#0f0f0f]/60 border border-[#333]/60 rounded-xl p-4 transition-all duration-300">
                      
                      {/* Top Row: Priority + Confidence + Effort */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="relative w-10 h-10">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="20" cy="20" r="16" stroke="#333" strokeWidth="2.5" fill="none" />
                              <circle 
                                cx="20" 
                                cy="20" 
                                r="16" 
                                stroke="url(#confidenceGrad)" 
                                strokeWidth="2.5" 
                                fill="none" 
                                strokeLinecap="round"
                                strokeDasharray="100.5"
                                strokeDashoffset={100.5 - (100.5 * confidencePercentage) / 100}
                                className="transition-all duration-700"
                              />
                              <defs>
                                <linearGradient id="confidenceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#FF2A2A" />
                                  <stop offset="100%" stopColor="#FF5A5A" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                              {confidencePercentage}
                              </div>
                            </div>
                          
                          <div>
                            <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Success Rate</div>
                            <Badge className="bg-[#FF2A2A]/20 text-[#FF2A2A] border-[#FF2A2A]/30 text-xs font-bold">
                              {card.priority.toUpperCase()}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {[1,2,3].map((i) => (
                                <div key={i} className={`w-1 h-1 rounded-full ${i <= effortLevel ? 'bg-amber-400' : 'bg-gray-700'}`}></div>
                              ))}
                              <span className="text-xs text-gray-500 ml-1">{effortLevel === 1 ? 'Quick' : effortLevel === 2 ? 'Moderate' : 'Complex'}</span>
                          </div>
                        </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Est. Impact</div>
                          <div className="text-lg font-black text-[#10b981]">+{Math.round((card.projectedImpact?.roas || 0) * 100) / 100}x ROAS</div>
                        </div>
                </div>

                      {/* Title & Description with Platform Icon */}
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                          <Image 
                            src={card.platform === 'meta' ? '/meta-icon.png' : card.platform === 'google' ? 'https://i.imgur.com/TavV4UJ.png' : 'https://i.imgur.com/AXHa9UT.png'} 
                            alt={card.platform} 
                            width={20} 
                            height={20}
                            className="rounded"
                          />
                          </div>
                        <h3 className="text-base font-bold text-white flex-1">{card.title}</h3>
                          </div>
                      <p className="text-sm text-gray-400 leading-relaxed mb-3">{card.description}</p>
                      
                      {/* Metrics Comparison - Horizontal Layout */}
                      <div className="flex items-center gap-2 p-2.5 bg-black/30 rounded-lg mb-3">
                        <div className="flex-1 text-center">
                          <div className="text-xs text-gray-500 mb-0.5">Current</div>
                          <div className="text-sm font-bold text-white">{card.currentValue}</div>
                          </div>
                        <ArrowUpRight className="w-4 h-4 text-[#FF2A2A] flex-shrink-0" />
                        <div className="flex-1 text-center">
                          <div className="text-xs text-gray-500 mb-0.5">Target</div>
                          <div className="text-sm font-bold text-[#10b981]">{card.recommendedValue}</div>
                          </div>
                        </div>

                        {/* Actions */}
                      <div className="flex gap-2">
                        {completedItems.has(`opt-${card.id}`) ? (
                          <div className="flex-1 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center justify-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-medium text-green-400">Applied</span>
                          </div>
                        ) : (
                          <>
                  <Button
                            size="sm" 
                              variant="ghost"
                            onClick={() => handleExplainRecommendation(card.id)}
                              className="flex-1 h-9 text-xs hover:bg-white/5"
                          >
                              <Info className="w-3.5 h-3.5 mr-1.5" />
                              Details
                  </Button>
                          <Button
                            size="sm"
                              onClick={() => handleMarkAsDone(card.id, card.actions[0]?.id)}
                              className="flex-1 h-9 bg-gradient-to-r from-[#FF2A2A] to-[#FF5A5A] hover:shadow-lg hover:shadow-[#FF2A2A]/30 text-white font-bold text-xs"
                          >
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                              Confirm
                          </Button>
                          </>
                  )}
                </div>
          </div>
                  )})}
                  
                  {filteredOptimizations.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[600px] text-gray-400">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#FF2A2A]/20 to-[#FF5A5A]/10 rounded-2xl flex items-center justify-center mb-4">
                        <Brain className="w-8 h-8 text-[#FF2A2A]" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">No Recommendations Found</h3>
                      <p className="text-sm text-center max-w-sm">No data available to analyze. Click "Update Analysis" to generate AI-powered recommendations based on your campaign performance.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
                </div>

            {/* Right Rail - Insights Column - Scrollable */}
           <div className="col-span-1 xl:col-span-3 flex flex-col gap-4 min-w-0 h-full overflow-y-auto pr-1 rounded-b-xl border-b border-[#333] pb-4">
            
            {/* Performance Trends - Completely Redesigned */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-[#111]/80 to-[#0A0A0A]/80 border border-[#333] backdrop-blur-sm flex-shrink-0">
              
              <CardHeader className="relative border-b border-[#333]/60 pb-3 flex-shrink-0">
                <div>
                  <h3 className="text-base font-bold text-white">Performance Trends</h3>
                  <p className="text-xs text-gray-500">7-day comparison</p>
                </div>
              </CardHeader>
              
              <CardContent className="relative p-3">
                {trends ? (
                  <div className="space-y-3">
                    {/* Spend Metric - Redesigned */}
                    <div className="relative p-2.5 bg-gradient-to-br from-[#0A0A0A] to-[#111] border border-[#333] rounded-xl overflow-hidden group transition-all">
                      {/* Dynamic corner accent based on direction */}
                      <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full ${trends.spend.direction === 'up' ? 'bg-gradient-to-br from-red-500/10 to-transparent' : 'bg-gradient-to-br from-emerald-500/10 to-transparent'}`}></div>
                      <div className="relative">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ad Spend</span>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${trends.spend.direction === 'up' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                            {trends.spend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span className="text-xs font-bold">{trends.spend.change > 0 ? '+' : ''}{trends.spend.change}%</span>
              </div>
                </div>
                        <div className="flex items-center gap-2 mb-2">
                           {selectedPlatforms.includes('meta') && (
                            <TooltipProvider>
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <div className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 transition-colors cursor-help">
                                    <Image src="/meta-icon.png" alt="Meta" width={16} height={16} className="rounded" />
                               </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-[#0a0a0a] border-[#555] z-[9999]" sideOffset={5}>
                                 <div className="text-white font-medium">Meta: ${trends.spend.current.toLocaleString()}</div>
                                 <div className="text-gray-400">100% of total</div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                           )}
                               </div>
                        <div className="text-2xl font-black text-white">${trends.spend.current.toLocaleString()}</div>
                        <div className="text-xs text-gray-600 mt-0.5">vs ${trends.spend.previous.toLocaleString()} last period</div>
                               </div>
                             </div>

                    {/* ROAS Metric - Redesigned */}
                    <div className="relative p-2.5 bg-gradient-to-br from-[#0A0A0A] to-[#111] border border-[#333] rounded-xl overflow-hidden group transition-all">
                      {/* Dynamic corner accent based on direction */}
                      <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full ${trends.roas.direction === 'up' ? 'bg-gradient-to-br from-emerald-500/10 to-transparent' : 'bg-gradient-to-br from-red-500/10 to-transparent'}`}></div>
                      <div className="relative">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">ROAS</span>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${trends.roas.direction === 'up' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {trends.roas.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span className="text-xs font-bold">{trends.roas.change > 0 ? '+' : ''}{trends.roas.change}%</span>
                               </div>
                               </div>
                        <div className="flex items-center gap-2 mb-2">
                           {selectedPlatforms.includes('meta') && (
                            <TooltipProvider>
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <div className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 transition-colors cursor-help">
                                    <Image src="/meta-icon.png" alt="Meta" width={16} height={16} className="rounded" />
                               </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-[#0a0a0a] border-[#555] z-[9999]" sideOffset={5}>
                                  <div className="text-white font-medium">Meta: {trends.roas.current.toFixed(2)}x</div>
                                 <div className="text-gray-400">100% of total</div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                           )}
                               </div>
                        <div className="text-2xl font-black text-white">{trends.roas.current.toFixed(2)}x</div>
                        <div className="text-xs text-gray-600 mt-0.5">vs {trends.roas.previous.toFixed(2)}x last period</div>
                               </div>
                             </div>

                    {/* Conversions Metric - Redesigned */}
                    {trends.conversions && (
                    <div className="relative p-2.5 bg-gradient-to-br from-[#0A0A0A] to-[#111] border border-[#333] rounded-xl overflow-hidden group transition-all">
                      {/* Dynamic corner accent based on direction */}
                      <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full ${trends.conversions.direction === 'up' ? 'bg-gradient-to-br from-emerald-500/10 to-transparent' : 'bg-gradient-to-br from-red-500/10 to-transparent'}`}></div>
                      <div className="relative">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conversions</span>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${trends.conversions.direction === 'up' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {trends.conversions.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span className="text-xs font-bold">{trends.conversions.change > 0 ? '+' : ''}{trends.conversions.change}%</span>
                               </div>
                               </div>
                        <div className="flex items-center gap-2 mb-2">
                           {selectedPlatforms.includes('meta') && (
                            <TooltipProvider>
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <div className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 transition-colors cursor-help">
                                    <Image src="/meta-icon.png" alt="Meta" width={16} height={16} className="rounded" />
                </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-[#0a0a0a] border-[#555] z-[9999]" sideOffset={5}>
                                  <div className="text-white font-medium">Meta: {trends.conversions.current.toLocaleString()}</div>
                                 <div className="text-gray-400">100% of total</div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                           )}
              </div>
                        <div className="text-2xl font-black text-white">{trends.conversions.current.toLocaleString()}</div>
                        <div className="text-xs text-gray-600 mt-0.5">vs {trends.conversions.previous.toLocaleString()} last period</div>
                </div>
              </div>
                           )}
                </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#FF2A2A]/20 to-[#FF5A5A]/10 rounded-xl flex items-center justify-center mb-3">
                      <BarChart3 className="w-6 h-6 text-[#FF2A2A]" />
              </div>
                    <p className="text-sm font-medium text-white">No Data Found</p>
                    <p className="text-xs mt-1 text-gray-500">No performance data available to analyze</p>
                </div>
                           )}
              </CardContent>
            </Card>

            {/* Quick Insights - Completely Redesigned */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-[#111]/80 to-[#0A0A0A]/80 border border-[#333] backdrop-blur-sm flex-shrink-0">
              
              <CardHeader className="relative border-b border-[#333]/60 pb-3 flex-shrink-0">
                        <div>
                  <h3 className="text-base font-bold text-white">Quick Insights</h3>
                  <p className="text-xs text-gray-500">AI-powered analysis</p>
                      </div>
              </CardHeader>
              
              <CardContent className="relative p-3">
                {quickInsights.length > 0 ? (
                <div className="space-y-3">
                    {quickInsights.map((insight, index) => (
                      <div key={index} className="relative p-2.5 bg-gradient-to-br from-[#0A0A0A] to-[#111] border border-[#333] rounded-xl overflow-hidden group transition-all">
                        <div className="relative">
                          {/* Platform & Metric Badge */}
                      <div className="flex items-start justify-between mb-2">
                            <div className="w-5 h-5 flex-shrink-0">
                        <Image 
                                src={insight.platform === 'meta' ? '/meta-icon.png' : insight.platform === 'google' ? 'https://i.imgur.com/TavV4UJ.png' : 'https://i.imgur.com/AXHa9UT.png'} 
                                alt={insight.platform || 'meta'} 
                                width={20} 
                                height={20}
                                  className="rounded"
                                />
                            </div>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-bold px-2 py-1">
                              {insight.metric}
                            </Badge>
                            </div>

                          {/* Label & Value */}
                        <div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{insight.label}</div>
                            <div className="text-xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">{insight.value}</div>
                          </div>
                        </div>
                    </div>
                  ))}
                    </div>
                              ) : (
                  <div className="flex flex-col items-center justify-center min-h-[200px] text-gray-400">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#FF2A2A]/20 to-[#FF5A5A]/10 rounded-xl flex items-center justify-center mb-3">
                      <Sparkles className="w-6 h-6 text-[#FF2A2A]" />
                </div>
                    <p className="text-sm font-medium text-white">No Insights Found</p>
                    <p className="text-xs mt-1 text-gray-500">No data available to generate AI insights</p>
                    </div>
                  )}
              </CardContent>
            </Card>

           </div>
         </div>
                        </div>
                        
       {/* Simulation Modal */}
       {showSimulation && simulationData && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-[#111] border border-[#333] rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-6">
                        <div>
                 <h3 className="text-xl font-bold text-white">Simulation Results</h3>
                 <p className="text-gray-400">{simulationData.card.title}</p>
                          </div>
                            <Button
                              variant="outline"
                              size="sm"
                 onClick={() => setShowSimulation(false)}
                 className="border-[#333] text-gray-300"
               >
                 Close
                            </Button>
                        </div>

             <div className="space-y-6">
               {/* Action Details */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-2">Proposed Action</h4>
                 <p className="text-gray-300 text-sm">{simulationData.action?.label}</p>
                      </div>

               {/* Projected Impact */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-3">7-Day Projection</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-gray-400 text-xs">Expected Revenue Increase</p>
                     <p className="text-[#FF2A2A] text-lg font-bold">+${simulationData.simulation?.projectedImpact?.revenue?.toLocaleString() || 0}</p>
                        </div>
                   <div>
                     <p className="text-gray-400 text-xs">Projected ROAS</p>
                     <p className="text-white text-lg font-bold">{simulationData.simulation?.projectedImpact?.roas?.toFixed(2) || 0}x</p>
                        </div>
                   <div>
                     <p className="text-gray-400 text-xs">Confidence Level</p>
                     <p className="text-gray-400 text-lg font-bold">{simulationData.simulation?.projectedImpact?.confidence || 0}%</p>
                    </div>
                   <div>
                     <p className="text-gray-400 text-xs">Time to Stabilize</p>
                     <p className="text-white text-lg font-bold">{simulationData.simulation?.timeline || 'Unknown'}</p>
            </div>
                      </div>
                    </div>

               {/* Risks & Safeguards */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-3">Risks & Safeguards</h4>
                 <div className="space-y-3">
                   <div>
                     <p className="text-gray-400 text-xs mb-1">Potential Risks</p>
                     <ul className="text-gray-300 text-sm space-y-1">
                       {simulationData.simulation?.risks?.map((risk: string, index: number) => (
                         <li key={index} className="flex items-start gap-2">
                           <span className="text-yellow-400 mt-1">⚠</span>
                           {risk}
                         </li>
                       ))}
                     </ul>
                        </div>
                   <div>
                     <p className="text-gray-400 text-xs mb-1">Safeguards in Place</p>
                     <ul className="text-gray-300 text-sm space-y-1">
                       {simulationData.simulation?.safeguards?.map((safeguard: string, index: number) => (
                         <li key={index} className="flex items-start gap-2">
                           <span className="text-[#FF2A2A] mt-1">✓</span>
                           {safeguard}
                         </li>
                       ))}
                     </ul>
                </div>
                        </div>
                      </div>

               {/* Action Buttons */}
               <div className="flex gap-3">
                 <Button 
                   className="bg-green-600 hover:bg-green-700 flex-1"
                   onClick={() => {
                     handleMarkAsDone(simulationData.card.id, simulationData.action.id)
                     setShowSimulation(false)
                   }}
                 >
                   Mark as Completed
                 </Button>
                 <Button 
                   variant="outline" 
                   className="border-[#333] text-gray-300"
                   onClick={() => setShowSimulation(false)}
                 >
                   Close
                            </Button>
                        </div>
                      </div>
                    </div>
                          </div>
                        )}
                        
       {/* AI Explanation Modal */}
       {showExplanation && explanationData && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-[#111] border border-[#333] rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                               flex items-center justify-center border border-white/10">
                   <Brain className="w-5 h-5 text-white" />
                        </div>
                 <div>
                   <h3 className="text-xl font-bold text-white">AI Analysis</h3>
                   <p className="text-gray-400">In-depth recommendation explanation</p>
                      </div>
                            </div>
                            <Button
                 variant="outline" 
                              size="sm"
                 onClick={() => setShowExplanation(false)}
                 className="border-[#333] text-gray-300"
               >
                 Close
                            </Button>
                          </div>

             <div className="space-y-6">
               {/* Why This Matters */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                   <Target className="w-4 h-4" />
                   Why This Recommendation Matters
                 </h4>
                 <p className="text-gray-300 text-sm leading-relaxed">{explanationData.reasoning}</p>
                            </div>

               {/* Data Analysis */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                   <BarChart3 className="w-4 h-4" />
                   Data-Driven Insights
                 </h4>
                 <div className="space-y-2">
                   {explanationData.insights?.map((insight: string, index: number) => (
                     <div key={index} className="flex items-start gap-2">
                       <span className="text-blue-400 mt-1">•</span>
                       <p className="text-gray-300 text-sm">{insight}</p>
                    </div>
              ))}
            </div>
               </div>

               {/* Expected Outcomes */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                   <TrendingUp className="w-4 h-4" />
                   Expected Outcomes
                 </h4>
                 <div className="grid grid-cols-2 gap-4">
                   {explanationData.outcomes?.map((outcome: any, index: number) => (
                     <div key={index} className="text-center">
                       <p className="text-gray-400 text-xs">{outcome.label}</p>
                       <p className={`text-lg font-bold ${outcome.positive ? 'text-[#FF2A2A]' : 'text-[#FF2A2A]'}`}>
                         {outcome.value}
                       </p>
                        </div>
                   ))}
          </div>
        </div>

               {/* Implementation Steps */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                   <CheckCircle className="w-4 h-4" />
                   How to Implement
                 </h4>
                 <div className="space-y-2">
                   {explanationData.steps?.map((step: string, index: number) => (
                     <div key={index} className="flex items-start gap-2">
                       <span className="text-[#FF2A2A] text-sm font-bold mt-1">{index + 1}.</span>
                       <p className="text-gray-300 text-sm">{step}</p>
                    </div>
                  ))}
                </div>
                  </div>
                  </div>

             {/* Close Button */}
             <div className="flex justify-end pt-6">
               <Button 
                 className="bg-[#FF2A2A] hover:bg-[#FF2A2A]/80 text-black"
                 onClick={() => setShowExplanation(false)}
               >
                 Got It
                            </Button>
                </div>
           </div>
                          </div>
                        )}
                        
      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#333] rounded-lg p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">How the Marketing Assistant Works</h3>
                <p className="text-gray-400">Understanding the 7-day recommendation cycle</p>
                        </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHowItWorks(false)}
                className="border-[#333] text-gray-300 hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </Button>
                      </div>

            <div className="space-y-6">
              {/* Overview */}
              <div className="bg-[#1A1A1A] p-5 rounded-lg border border-[#333]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-white" />
                    </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">AI-Powered Weekly Optimization</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      The Marketing Assistant analyzes your campaigns every 7 days, generating intelligent recommendations based on actual performance data. 
                      It then tracks the effectiveness of those recommendations and learns from the results.
                    </p>
            </div>
          </div>
        </div>

              {/* The Cycle */}
              <div className="bg-[#1A1A1A] p-5 rounded-lg border border-[#333]">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  The 7-Day Cycle
                </h4>
                <div className="space-y-4">
                  {/* Week 1 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">1</span>
                    </div>
                      <div className="w-0.5 h-full bg-[#333] mt-2"></div>
                </div>
                    <div className="pb-6">
                      <h5 className="text-white font-medium mb-1">Monday: Fresh Analysis & New Recommendations</h5>
                      <p className="text-gray-400 text-sm mb-2">
                        Every Monday at 12 AM, the system analyzes a <strong className="text-white">Sunday-to-Sunday weekly window</strong> (last Sunday to this Sunday):
                      </p>
                      <ul className="space-y-1 text-sm text-gray-400 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Full week of spend, impressions, clicks, conversions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>ROAS performance, CPA trends, CTR changes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Validates if last week's recommendations worked</span>
                        </li>
                      </ul>
                      <div className="mt-3 p-3 bg-[#0f0f0f] rounded border border-[#444]">
                        <p className="text-xs text-gray-300">
                          <strong className="text-white">Result:</strong> Generates new prioritized recommendations based on the full week's data. 
                          Old recommendations expire and are replaced with fresh insights.
                        </p>
                  </div>
                  </div>
                </div>

                  {/* Tuesday-Sunday */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">2</span>
                    </div>
                      <div className="w-0.5 h-full bg-[#333] mt-2"></div>
                </div>
                    <div className="pb-6">
                      <h5 className="text-white font-medium mb-1">Tuesday-Sunday: Review & Apply Changes</h5>
                      <p className="text-gray-400 text-sm mb-2">
                        You review the recommendations and apply changes throughout the week:
                      </p>
                      <ul className="space-y-1 text-sm text-gray-400 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Review AI suggestions for budget, audience, and creative</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Apply changes to your campaigns as you see fit</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Monitor performance with real-time alerts</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Same recommendations stay locked until next Monday</span>
                        </li>
                      </ul>
                      <div className="mt-3 p-3 bg-[#0f0f0f] rounded border border-[#444]">
                        <p className="text-xs text-gray-300">
                          <strong className="text-white">Why weekly?</strong> Changes need time to stabilize. Algorithms need to learn. 
                          Testing changes mid-week would contaminate the data and give false signals.
                        </p>
                  </div>
                  </div>
                </div>

                  {/* Next Monday */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">3</span>
          </div>
        </div>
                    <div>
                      <h5 className="text-white font-medium mb-1">Next Monday: Validation & New Cycle</h5>
                      <p className="text-gray-400 text-sm mb-2">
                        When Monday rolls around again, the system analyzes the <strong className="text-white">new Sunday-to-Sunday window</strong>:
                      </p>
                      <ul className="space-y-1 text-sm text-gray-400 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span><strong>Validates last week's recommendations:</strong> Did they work?</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Compares <strong>actual ROAS/spend/conversions</strong> to predictions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span><strong>Expires old recommendations</strong> and generates fresh ones</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Adapts strategy based on what worked vs. what didn't</span>
                        </li>
                      </ul>
                      <div className="mt-3 p-3 bg-[#0f0f0f] rounded border border-[#444]">
                        <p className="text-xs text-gray-300">
                          <strong className="text-white">Continuous Learning:</strong> If ROAS improved as predicted ✓, similar recommendations 
                          get higher confidence next week. If not ✗, the system adjusts its approach. The cycle repeats every Monday with 
                          fresh insights based on the most recent full week of data.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* How the AI Learns */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] p-5 rounded-lg border border-emerald-500/30">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-emerald-400" />
                  How the AI Learns from Your Results
                </h4>
                <p className="text-gray-300 text-sm mb-4">
                  The system doesn't just generate recommendations—it tracks their outcomes and adapts its strategy based on what actually works for YOUR campaigns. 
                  Recommendations are tailored to your brand's industry/niche and each campaign's specific objective (sales, leads, traffic, or awareness).
                </p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 text-xs font-bold">1</span>
                      </div>
                    <div>
                      <h5 className="text-white font-medium text-sm mb-1">Baseline Capture</h5>
                      <p className="text-gray-400 text-xs">
                        When a recommendation is created, the system captures your campaign's current performance (spend, ROAS, CTR, conversions) as a baseline.
                      </p>
                    </div>
                </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 text-xs font-bold">2</span>
                    </div>
                    <div>
                      <h5 className="text-white font-medium text-sm mb-1">Action Tracking</h5>
                      <p className="text-gray-400 text-xs mb-2">
                        When you mark a recommendation as done, the system logs the action and waits 7 days to measure the impact.
                      </p>
                      <div className="p-2 bg-red-500/10 rounded border border-red-500/30 mt-2">
                        <p className="text-xs text-red-200">
                          <strong className="text-red-100">⚠️ IMPORTANT:</strong> The AI only evaluates recommendations you marked as "Done". 
                          If you don't mark a recommendation as done, the AI will NOT consider it when analyzing next week's performance. 
                          This ensures the AI only learns from changes you actually implemented.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 text-xs font-bold">3</span>
                    </div>
                    <div>
                      <h5 className="text-white font-medium text-sm mb-1">Impact Analysis</h5>
                      <p className="text-gray-400 text-xs">
                        After 7 days, it compares the new performance to the baseline: Did ROAS improve? Did CTR increase? Did revenue grow?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 text-xs font-bold">4</span>
                    </div>
                    <div>
                      <h5 className="text-white font-medium text-sm mb-1">Strategy Adaptation</h5>
                      <p className="text-gray-400 text-xs">
                        Future recommendations are weighted based on historical success. If budget scaling worked 5 times but creative refresh failed 3 times, 
                        you'll see more budget recommendations and fewer creative ones—or the creative recommendations will be adjusted.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-emerald-500/10 rounded border border-emerald-500/30">
                  <p className="text-xs text-emerald-200">
                    <strong className="text-emerald-100">Example:</strong> If "increase budget to $50/day" resulted in +35% revenue with stable ROAS, 
                    the system will confidently suggest similar scaling next time. If "creative refresh" didn't improve CTR, it will adjust the threshold 
                    or recommend different creative strategies.
                  </p>
                </div>
              </div>

              {/* Key Benefits */}
              <div className="bg-[#1A1A1A] p-5 rounded-lg border border-[#333]">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gray-400" />
                  Key Benefits
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#0f0f0f] rounded border border-[#444]">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                      <h5 className="text-white font-medium text-sm">No Recommendation Fatigue</h5>
                    </div>
                    <p className="text-gray-400 text-xs">
                      You won't see the same suggestion over and over. Once generated, it stays until resolved.
                    </p>
                        </div>
                  <div className="p-3 bg-[#0f0f0f] rounded border border-[#444]">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <h5 className="text-white font-medium text-sm">Data-Driven Decisions</h5>
                      </div>
                    <p className="text-gray-400 text-xs">
                      All recommendations based on real performance data, not guesses or hunches.
                    </p>
                    </div>
                  <div className="p-3 bg-[#0f0f0f] rounded border border-[#444]">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-4 h-4 text-gray-400" />
                      <h5 className="text-white font-medium text-sm">Continuous Learning</h5>
          </div>
                    <p className="text-gray-400 text-xs">
                      System learns from what worked and what didn't, improving recommendations over time.
                    </p>
        </div>
                  <div className="p-3 bg-[#0f0f0f] rounded border border-[#444]">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-gray-400" />
                      <h5 className="text-white font-medium text-sm">Consistent Cadence</h5>
      </div>
                    <p className="text-gray-400 text-xs">
                      Weekly rhythm keeps you on track without overwhelming you with constant changes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Example Timeline */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] p-5 rounded-lg border border-[#333]">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  Example Timeline
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3 p-2 bg-[#0f0f0f] rounded">
                    <span className="text-gray-500 font-mono text-xs">Sept 29</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-300">System analyzes Sept 22-28 data, generates recommendations</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-[#0f0f0f] rounded">
                    <span className="text-gray-500 font-mono text-xs">Sept 30</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-300">You review and apply: "Increase Budget by 20% for Campaign A"</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-[#0f0f0f] rounded">
                    <span className="text-gray-500 font-mono text-xs">Oct 1-6</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-emerald-400">Testing period - letting campaign stabilize</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-[#0f0f0f] rounded">
                    <span className="text-gray-500 font-mono text-xs">Oct 7</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-white">System checks: ROAS improved 2.1x → 2.8x ✓ Success!</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-[#0f0f0f] rounded">
                    <span className="text-gray-500 font-mono text-xs">Oct 7</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-300">Generates NEW recommendations based on Oct 1-6 performance</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-6 border-t border-[#333] mt-6">
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => setShowHowItWorks(false)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Got It!
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Timeline Modal */}
      {showDetailedTimeline && (
        <div className={`fixed inset-y-0 right-0 ${isSidebarExpanded ? 'left-64' : 'left-20'} bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 transition-all duration-300 ease-in-out`}>
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] rounded-xl border border-[#333] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-[#333] flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Performance Timeline</h2>
                <p className="text-gray-400 text-sm">Review your optimization journey week by week</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailedTimeline(false)
                  setSelectedWeekIndex(null)
                  setTimelineScrollOffset(0)
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const timeline = optimizationTimeline || { weeks: [], stats: { totalOptimizations: 0, avgRoas: 0 } }
                
                // Calculate weeks with optimizations
                const weeksWithOptimizations = timeline.weeks.filter((week: any) => week.optimizationsApplied > 0).length
                
                // Auto-select current week (index 0) if nothing is selected
                const effectiveSelectedIndex = selectedWeekIndex !== null ? selectedWeekIndex : 0
                const selectedWeek = timeline.weeks.length > 0 ? timeline.weeks[effectiveSelectedIndex] : null
                
                if (timeline.weeks.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-[#FF2A2A]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[#FF2A2A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-2">No Data Found</h3>
                      <p className="text-gray-400">No optimization data available to display</p>
                    </div>
                  )
                }

                return (
                  <div className="flex flex-col h-full">
                    {/* Ultra-Compact Timeline Bar at Top */}
                    <div className="bg-[#0f0f0f] border border-[#333] rounded-lg p-3 mb-3 flex-shrink-0">
                      <div className="flex items-center justify-between mb-2">
                        {/* Summary Stats - Inline & Compact */}
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="text-gray-400 text-[9px] uppercase tracking-wide">Weeks Active</div>
                            <div className="text-white text-base font-bold">{weeksWithOptimizations}</div>
                          </div>
                          <div className="h-6 w-px bg-[#333]"></div>
                          <div>
                            <div className="text-gray-400 text-[9px] uppercase tracking-wide">Optimizations</div>
                            <div className="text-[#FF2A2A] text-base font-bold">{timeline.stats.totalOptimizations}</div>
                          </div>
                          <div className="h-6 w-px bg-[#333]"></div>
                          <div>
                            <div className="text-gray-400 text-[9px] uppercase tracking-wide">Avg ROAS</div>
                            <div className="text-emerald-400 text-base font-bold">
                              {timeline.stats.avgRoas > 0 ? `${timeline.stats.avgRoas.toFixed(2)}x` : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Ultra-Compact Timeline Bar with Scroll Controls */}
                      <div className="relative">
                        {/* Left Scroll Button */}
                        {timelineScrollOffset > 0 && (
                          <button
                            onClick={() => setTimelineScrollOffset(Math.max(0, timelineScrollOffset - 8))}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-[#1A1A1A] border border-[#FF2A2A]/50 rounded-full p-1 hover:bg-[#FF2A2A]/20 transition-colors shadow-lg"
                          >
                            <svg className="w-3 h-3 text-[#FF2A2A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                        )}
                        
                        {/* Right Scroll Button */}
                        {timelineScrollOffset + 8 < timeline.weeks.length && (
                          <button
                            onClick={() => setTimelineScrollOffset(Math.min(timeline.weeks.length - 8, timelineScrollOffset + 8))}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-[#1A1A1A] border border-[#FF2A2A]/50 rounded-full p-1 hover:bg-[#FF2A2A]/20 transition-colors shadow-lg"
                          >
                            <svg className="w-3 h-3 text-[#FF2A2A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                        
                        <div className="relative py-4 px-8">
                          {/* Horizontal Line - Thinner */}
                          <div className="absolute top-1/2 left-8 right-8 h-px bg-gradient-to-r from-[#333] to-[#444] transform -translate-y-1/2 z-0"></div>
                          
                          {/* Week Markers */}
                          <div className="relative flex justify-between items-center">
                            {timeline.weeks.slice(timelineScrollOffset, timelineScrollOffset + 8).map((week: any, displayIndex: number) => {
                              const index = timelineScrollOffset + displayIndex
                            const weekNum = index + 1
                            const hasOptimizations = week.optimizationsApplied > 0
                            const hasData = week.spend > 0 || week.impressions > 0 || hasOptimizations || week.goals?.length > 0
                            const isCurrentWeek = weekNum === 1
                            const isSelected = effectiveSelectedIndex === index
                            const isClickable = hasData
                        
                            return (
                              <div key={weekNum} className="flex flex-col items-center group">
                                {/* Marker Dot - Even Smaller */}
                                <button
                                  onClick={() => isClickable && setSelectedWeekIndex(index)}
                                  disabled={!isClickable}
                                  title={isClickable ? `Week ${weekNum}` : 'No data yet'}
                                  className={`w-3 h-3 rounded-full border-2 transition-all ${
                                    isClickable ? 'hover:scale-150 hover:shadow-lg hover:shadow-[#FF2A2A]/50 cursor-pointer' : 'cursor-not-allowed opacity-40'
                                  } ${
                                    isSelected
                                      ? 'bg-[#FF2A2A] border-[#FF2A2A] ring-2 ring-[#FF2A2A]/30 scale-125'
                                      : isCurrentWeek
                                      ? 'bg-[#FF2A2A] border-[#1A1A1A]'
                                      : hasOptimizations
                                      ? 'bg-[#FF2A2A]/50 border-[#1A1A1A]'
                                      : 'bg-[#444] border-[#1A1A1A]'
                                  } relative z-10 mb-2`}
                                >
                                  {hasOptimizations && (
                                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full border border-[#1A1A1A]"></div>
                                  )}
                                </button>
                                
                                {/* Week Label - Minimal */}
                                <div className="mt-0.5 text-center">
                                  <div className={`text-[9px] font-bold ${
                                    isSelected || isCurrentWeek ? 'text-[#FF2A2A]' : 'text-gray-400'
                                  }`}>
                                    W{weekNum}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        </div>
                      </div>
                    </div>

                    {/* Selected Week Details - Always Show, Flex-grow */}
                    {selectedWeek && (
                      <div className="bg-[#0f0f0f] border border-[#FF2A2A]/50 rounded-lg overflow-hidden flex flex-col flex-1">
                        {/* Header - Compact */}
                        <div className="bg-gradient-to-r from-[#FF2A2A]/10 to-transparent p-3 border-b border-[#FF2A2A]/30 flex items-center gap-3 flex-shrink-0">
                          <span className="w-7 h-7 bg-[#FF2A2A] rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                            W{effectiveSelectedIndex + 1}
                          </span>
                          <div>
                            <h3 className="text-white font-bold text-lg leading-tight">Week {effectiveSelectedIndex + 1} Breakdown</h3>
                            <p className="text-gray-400 text-xs">{selectedWeek.week}</p>
                          </div>
                        </div>
                        
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto">

                          {/* Performance Metrics - Single Row */}
                          <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#333]">
                            <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wide">📊 Performance Metrics</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                              {(() => {
                                // Get previous week for comparison
                                const previousWeek = effectiveSelectedIndex < timeline.weeks.length - 1 ? timeline.weeks[effectiveSelectedIndex + 1] : null
                                
                                // Calculate changes
                                const calculateChange = (current: number, previous: number) => {
                                  if (!previous || previous === 0) return null
                                  const change = ((current - previous) / previous) * 100
                                  return change
                                }
                                
                                const spendChange = previousWeek ? calculateChange(selectedWeek.spend || 0, previousWeek.spend || 0) : null
                                const revenueChange = previousWeek ? calculateChange(selectedWeek.revenue || 0, previousWeek.revenue || 0) : null
                                const roasChange = previousWeek ? calculateChange(selectedWeek.roas || 0, previousWeek.roas || 0) : null
                                const ctrChange = previousWeek ? calculateChange(selectedWeek.ctr || 0, previousWeek.ctr || 0) : null
                                const impressionsChange = previousWeek ? calculateChange(selectedWeek.impressions || 0, previousWeek.impressions || 0) : null
                                const clicksChange = previousWeek ? calculateChange(selectedWeek.clicks || 0, previousWeek.clicks || 0) : null
                                
                                const ChangeIndicator = ({ change }: { change: number | null }) => {
                                  if (change === null) return null
                                  const isPositive = change > 0
                                  const isNegative = change < 0
                                  
                                  return (
                                    <div className={`text-[9px] font-semibold mt-0.5 flex items-center justify-center gap-0.5 ${
                                      isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-gray-500'
                                    }`}>
                                      {isPositive ? '↑' : isNegative ? '↓' : '→'} {Math.abs(change).toFixed(1)}%
                                    </div>
                                  )
                                }
                                
                                return (
                                  <>
                                    <div className="text-center">
                                      <div className="text-gray-400 text-[10px] uppercase mb-1">Spend</div>
                                      <div className="text-white font-bold">${selectedWeek.spend?.toFixed(2) || '0.00'}</div>
                                      <ChangeIndicator change={spendChange} />
                                    </div>
                                    <div className="text-center">
                                      <div className="text-gray-400 text-[10px] uppercase mb-1">Revenue</div>
                                      <div className="text-emerald-400 font-bold">${selectedWeek.revenue?.toFixed(2) || '0.00'}</div>
                                      <ChangeIndicator change={revenueChange} />
                                    </div>
                                    <div className="text-center">
                                      <div className="text-gray-400 text-[10px] uppercase mb-1">ROAS</div>
                                      <div className="text-[#FF2A2A] font-bold">{selectedWeek.roas?.toFixed(2) || '0.00'}x</div>
                                      <ChangeIndicator change={roasChange} />
                                    </div>
                                    <div className="text-center">
                                      <div className="text-gray-400 text-[10px] uppercase mb-1">CTR</div>
                                      <div className="text-white font-bold">{selectedWeek.ctr?.toFixed(2) || '0.00'}%</div>
                                      <ChangeIndicator change={ctrChange} />
                                    </div>
                                    <div className="text-center">
                                      <div className="text-gray-400 text-[10px] uppercase mb-1">Impressions</div>
                                      <div className="text-white font-bold text-sm">{selectedWeek.impressions?.toLocaleString() || '0'}</div>
                                      <ChangeIndicator change={impressionsChange} />
                                    </div>
                                    <div className="text-center">
                                      <div className="text-gray-400 text-[10px] uppercase mb-1">Clicks</div>
                                      <div className="text-white font-bold text-sm">{selectedWeek.clicks?.toLocaleString() || '0'}</div>
                                      <ChangeIndicator change={clicksChange} />
                                    </div>
                                  </>
                                )
                              })()}
                            </div>
                          </div>

                          {/* Goals for This Week */}
                          <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#333]">
                            <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wide">🎯 Goals Set ({selectedWeek.goals?.length || 0})</h4>
                            {selectedWeek.goals && selectedWeek.goals.length > 0 ? (
                              <div className="space-y-2">
                                {selectedWeek.goals.map((goal: any, goalIndex: number) => (
                                  <div key={goalIndex} className="flex items-start gap-2 p-2 bg-[#1A1A1A] rounded">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF2A2A]/20 text-[#FF2A2A] flex-shrink-0 uppercase mt-0.5">
                                      {goal.type}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white font-medium text-sm">{goal.title}</p>
                                      <p className="text-gray-400 text-xs mt-0.5">{goal.description}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm text-center py-4">No goals set yet</p>
                            )}
                          </div>

                          {/* Optimizations Applied */}
                          <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#333]">
                            <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wide">✅ Optimizations Applied ({selectedWeek.optimizationsApplied})</h4>
                            {selectedWeek.optimizationsApplied > 0 ? (
                              <div className="space-y-2">
                                {selectedWeek.actions?.map((action: any, actionIndex: number) => (
                                  <div key={actionIndex} className="flex items-start gap-2 p-2 bg-[#1A1A1A] rounded">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 uppercase mt-0.5 ${
                                      action.category === 'budget'
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : action.category === 'targeting'
                                        ? 'bg-purple-500/20 text-purple-400'
                                        : action.category === 'creative'
                                        ? 'bg-pink-500/20 text-pink-400'
                                        : 'bg-gray-500/20 text-gray-400'
                                    }`}>
                                      {action.category}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white font-medium text-sm">{action.title}</p>
                                      <p className="text-gray-400 text-xs mt-0.5">{action.description}</p>
                                    </div>
                                  </div>
                                )) || (
                                  <p className="text-gray-400 text-sm text-center py-4">
                                    {selectedWeek.optimizationsApplied} optimization{selectedWeek.optimizationsApplied !== 1 ? 's' : ''} applied
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm text-center py-4">No optimizations applied yet</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#333] flex justify-end">
              <Button
                onClick={() => {
                  setShowDetailedTimeline(false)
                  setSelectedWeekIndex(null)
                }}
                className="bg-[#FF2A2A] hover:bg-[#FF2A2A]/90 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
