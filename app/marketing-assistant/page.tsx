"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAuth } from '@clerk/nextjs'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAgency } from '@/contexts/AgencyContext'

// Components
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import BrandSelector from '@/components/BrandSelector'
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"

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
  
  // State
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null)
  const [actionKPIs, setActionKPIs] = useState<ActionKPIs | null>(null)
  const [optimizationCards, setOptimizationCards] = useState<OptimizationCard[]>([])
  const [quickInsights, setQuickInsights] = useState<any[]>([])
  const [trends, setTrends] = useState<any>(null)
  const [weeklyProgress, setWeeklyProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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

  // Calculate Monday-to-Monday date range
  const getMondayToMondayDates = () => {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate this week's Monday (or today if it's Monday)
    const thisMonday = new Date(now)
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    thisMonday.setDate(now.getDate() - daysFromMonday)
    thisMonday.setHours(0, 0, 0, 0)
    
    // Calculate last Monday (7 days before this Monday)
    const lastMonday = new Date(thisMonday)
    lastMonday.setDate(thisMonday.getDate() - 7)
    
    return { lastMonday, thisMonday }
  }
  
  // Calculate time until next Monday 12am
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
    const { lastMonday, thisMonday } = getMondayToMondayDates()
    const formatDate = (date: Date) => {
      const month = date.toLocaleDateString('en-US', { month: 'short' })
      const day = date.getDate()
      return `${month} ${day}`
    }
    setDateRangeText(`${formatDate(lastMonday)} - ${formatDate(thisMonday)}`)
    setNextUpdateText(`Next Update: ${formatDate(nextMonday)}`)
    
    // Check if it's a new week (Monday) - reset the viewed state
    // Compare current week to last refresh week
    if (selectedBrandId) {
      const lastRefreshDate = localStorage.getItem(`lastRefreshDate_${selectedBrandId}`)
      const currentWeekStart = thisMonday.toISOString().split('T')[0]
      
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
    if (selectedBrandId && !initialDataLoad && optimizationCards.length > 0) {
      // Only reload widgets if we already have recommendations loaded
      loadKPIMetrics()
      loadTrends()
      loadQuickInsights()
      loadWeeklyProgress()
    }
  }, [selectedPlatforms])

  const loadDashboardData = async (forceRefresh = false) => {
    if (!selectedBrandId) return
    
      // If force refresh, clear ALL state first
      if (forceRefresh) {
        setOptimizationCards([])
        setQuickInsights([])
        setWeeklyProgress(null)
        setKpiMetrics(null)
        setTrends(null)
      }
    
    // Always set loading for data fetch
    setLoading(true)
    setIsRefreshingData(false)
    
    try {
      // First load recommendations
      // Pass forceRefresh to tell API to generate new recommendations if clicked "Update Recommendations"
      const loadedRecommendations = await loadOptimizationRecommendations(forceRefresh)
      
      // After loading recommendations, check if we should load widgets
      // Load widgets if: 1) force refresh (button clicked) OR 2) recommendations exist (returning user)
      const shouldLoadWidgets = forceRefresh || (loadedRecommendations && loadedRecommendations.length > 0)
      
      if (shouldLoadWidgets) {
        // Load all widgets when button is clicked OR when recommendations already exist
        await Promise.all([
          loadKPIMetrics(),
          loadQuickInsights(),
          loadTrends(),
          loadWeeklyProgress()
        ])
      }
      // Otherwise leave widgets blank until user clicks "Update Recommendations" button
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

  const loadQuickInsights = async () => {
    if (!selectedBrandId) return

    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/marketing-assistant/quick-insights?brandId=${selectedBrandId}&platforms=${selectedPlatforms.join(',')}&_t=${timestamp}`, {
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
        // Reload weekly progress to reflect the new completion
        await loadWeeklyProgress()
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

  if (isLoadingPage || loading) {
    return (
      <div className="w-full min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden py-8 animate-in fade-in duration-300">
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
            Preparing AI insights
          </p>
          
          {/* Subtle loading tip */}
          <div className="mt-8 text-xs text-gray-500 italic">
            Analyzing your campaigns and generating recommendations...
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
    <div className="min-h-screen bg-[#0B0B0B] relative" 
         style={{
           backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
             <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
               <defs>
                 <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                   <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.05"/>
                 </pattern>
               </defs>
               <rect width="100%" height="100%" fill="url(#grid)" />
             </svg>
           `)}")`,
           backgroundRepeat: 'repeat',
           backgroundSize: '40px 40px',
           backgroundAttachment: 'fixed'
         }}>
       
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
          
          {/* Main Title Bar with Icon & Quick Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Premium Icon with Glow */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF2A2A] to-[#FF5A5A] rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                <div className="relative w-14 h-14 bg-gradient-to-br from-[#FF2A2A]/20 to-[#FF5A5A]/10 rounded-2xl flex items-center justify-center border border-[#FF2A2A]/30 group-hover:border-[#FF2A2A]/50 transition-all duration-300">
                  <Brain className="w-7 h-7 text-[#FF2A2A] group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              
              {/* Title */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight">
                  AI Marketing Assistant
                </h1>
                <p className="text-sm text-gray-500 font-medium mt-0.5">Intelligent campaign optimization powered by machine learning</p>
              </div>
            </div>
            
            {/* Quick KPIs - Floating Pills (Hidden on mobile, shown on larger screens) */}
            <div className="hidden lg:flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="group relative px-4 py-2.5 bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-full hover:border-[#FF2A2A]/50 transition-all duration-300 cursor-help">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#FF2A2A]/0 to-[#FF2A2A]/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-[#FF2A2A]" />
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Spend</div>
                          <div className="text-sm font-bold text-white">${trends?.spend?.current?.toFixed(2) || '0.00'}</div>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#111] border-[#333]">
                    <p className="text-xs text-gray-400">Total ad spend (last 7 days)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="group relative px-4 py-2.5 bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-full hover:border-[#10b981]/50 transition-all duration-300 cursor-help">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#10b981]/0 to-[#10b981]/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#10b981]" />
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">ROAS</div>
                          <div className="text-sm font-bold text-white">{trends?.roas?.current?.toFixed(2) || '0.00'}x</div>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#111] border-[#333]">
                    <p className="text-xs text-gray-400">Return on ad spend</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Update Button */}
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
                    // Save the refresh date (this Monday) so we know when to enable refresh again
                    const { thisMonday } = getMondayToMondayDates()
                    localStorage.setItem(`lastRefreshDate_${selectedBrandId}`, thisMonday.toISOString().split('T')[0])
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
                {isRefreshingData ? 'Updating...' : recommendationsViewed ? `Next: ${timeUntilRefresh}` : 'Update Analysis'}
              </Button>
            </div>
          </div>
          
          {/* Performance Window & Platform Filters Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Performance Window */}
            <div className="flex-1 bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-xl p-4 group hover:border-[#333]/60 transition-all duration-300">
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
            <div className="flex items-center gap-2 bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 group hover:border-[#333]/60 transition-all duration-300">
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
        
        {/* MAIN GRID LAYOUT */}
         <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 lg:gap-4 max-w-[1920px] mx-auto">
           
            {/* Left Rail */}
           <div className="col-span-1 xl:col-span-3 flex flex-col gap-4 min-w-0">
            
            {/* Quick Actions Card - Compact */}
            <Card className="bg-gradient-to-br from-[#111]/80 to-[#0A0A0A]/80 border border-[#333] backdrop-blur-sm flex-shrink-0">
              <CardContent className="p-4 space-y-3">
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
                      const { thisMonday } = getMondayToMondayDates()
                      localStorage.setItem(`lastRefreshDate_${selectedBrandId}`, thisMonday.toISOString().split('T')[0])
                    }
                    setCompletedItems(new Set())
                    
                    await loadDashboardData(true)
                    
                    setIsRefreshingData(false)
                  }}
                  disabled={isRefreshingData || recommendationsViewed}
                  className="w-full text-xs h-9 bg-gradient-to-r from-[#FF2A2A] to-[#FF5A5A] hover:shadow-lg hover:shadow-[#FF2A2A]/50 text-black border-0 font-bold lg:hidden transition-all duration-300"
                >
                  <RefreshCw className={`h-3 w-3 mr-1.5 ${isRefreshingData ? 'animate-spin' : ''}`} />
                  {isRefreshingData ? 'Updating...' : recommendationsViewed ? `Next: ${timeUntilRefresh}` : 'Update Analysis'}
                </Button>
                
                {/* How It Works Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHowItWorks(true)}
                  className="w-full text-xs h-8 bg-white/5 hover:bg-white/10 text-white border-[#333] hover:border-[#444] transition-all duration-200"
                >
                  <Info className="h-3 w-3 mr-1.5" />
                  How It Works
                </Button>
              </CardContent>
            </Card>

            {/* Optimization Progress - Premium Radial Gauge */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1a]/90 via-[#111]/90 to-[#0A0A0A]/90 border border-[#FF2A2A]/30 backdrop-blur-sm flex flex-col flex-1 min-h-[491px] max-h-[491px]">
              {/* Subtle animated glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF2A2A]/5 to-transparent opacity-50 animate-pulse"></div>
              
              <CardHeader className="relative border-b border-[#FF2A2A]/20 pb-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FF2A2A] to-[#FF5A5A] rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div className="relative w-10 h-10 bg-gradient-to-br from-[#FF2A2A]/30 to-[#FF5A5A]/20 rounded-xl flex items-center justify-center border border-[#FF2A2A]/40">
                      <Gauge className="w-5 h-5 text-[#FF2A2A]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Optimization Progress</h3>
                    <p className="text-xs text-gray-500">Live implementation tracking</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="relative p-4 flex-1 min-h-0 flex flex-col">
                {loading && !weeklyProgress && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-white mx-auto mb-2"></div>
                    <p className="text-sm">Loading progress...</p>
                  </div>
                )}
                
                {weeklyProgress && (
                  <>
                    {/* Circular Radial Progress Gauge */}
                    <div className="flex flex-col items-center justify-center flex-1">
                      <div className="relative w-48 h-48 mb-4">
                        {/* SVG Circle Progress */}
                        <svg className="w-full h-full transform -rotate-90">
                          {/* Background circle */}
                          <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="url(#progressBg)"
                            strokeWidth="10"
                            fill="none"
                            opacity="0.15"
                          />
                          {/* Progress circle */}
                          <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="url(#progressGradient)"
                            strokeWidth="10"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray="552.92"
                            strokeDashoffset={552.92 - (552.92 * weeklyProgress.completionPercentage) / 100}
                            className="transition-all duration-1000 ease-out"
                            style={{ filter: 'drop-shadow(0 0 8px rgba(255, 42, 42, 0.5))' }}
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
                        
                        {/* Center content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-5xl font-black bg-gradient-to-br from-[#FF2A2A] via-white to-[#FF5A5A] bg-clip-text text-transparent mb-1">
                            {weeklyProgress.completionPercentage}%
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider">Complete</div>
                          <div className="text-sm text-white font-bold mt-2">
                            {weeklyProgress.completedCount}/{weeklyProgress.totalRecommendations} Applied
                          </div>
                        </div>
                        
                        {/* Outer glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FF2A2A]/20 to-transparent rounded-full blur-2xl -z-10"></div>
                      </div>
                      
                      {/* Stats Grid */}
                      <div className="w-full space-y-2">
                        {weeklyProgress.roasImprovement !== undefined && weeklyProgress.roasImprovement !== 0 && (
                          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20 rounded-lg group hover:border-green-500/40 transition-all">
                            <span className="text-xs text-gray-400 uppercase tracking-wide">ROAS Improvement</span>
                            <span className={`text-sm font-bold ${weeklyProgress.roasImprovement > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {weeklyProgress.roasImprovement > 0 ? '+' : ''}{weeklyProgress.roasImprovement.toFixed(0)}%
                            </span>
                          </div>
                        )}
                        
                        {weeklyProgress.totalRecommendations > weeklyProgress.completedCount && (
                          <button className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-[#FF2A2A]/10 to-transparent border border-[#FF2A2A]/20 rounded-lg group hover:border-[#FF2A2A]/40 transition-all">
                            <span className="text-xs text-gray-400 uppercase tracking-wide">Next Action</span>
                            <div className="flex items-center gap-1 text-[#FF2A2A]">
                              <span className="text-xs font-medium">{weeklyProgress.totalRecommendations - weeklyProgress.completedCount} pending</span>
                              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Category Breakdown */}
                    {weeklyProgress.categories && Object.values(weeklyProgress.categories).some((count: any) => count > 0) && (
                      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#0f0f0f] border border-[#333] rounded-lg p-3">
                        <h4 className="text-white font-medium text-xs mb-2 uppercase tracking-wide">By Category</h4>
                        <div className="space-y-1.5">
                          {Object.entries(weeklyProgress.categories).filter(([_, count]: [string, any]) => count > 0).map(([category, count]: [string, any]) => {
                            const completed = Math.floor(count * (weeklyProgress.completionPercentage / 100))
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

                    {/* Top Applied Actions - Only show if there are completed items */}
                    {weeklyProgress.completedCount > 0 && weeklyProgress.topApplied && weeklyProgress.topApplied.length > 0 && (
                      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#0f0f0f] border border-[#333] rounded-lg p-3">
                        <h4 className="text-white font-medium text-xs mb-2 uppercase tracking-wide">Top Applied</h4>
                        <div className="space-y-1.5">
                          {weeklyProgress.topApplied.slice(0, 2).map((action: any, index: number) => (
                            <div key={index} className="flex items-center gap-1.5">
                              <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs truncate">{action.title}</p>
                              </div>
                              <span className="text-green-400 text-xs font-medium flex-shrink-0">{action.impact}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next Up Prompt */}
                    {weeklyProgress.totalRecommendations > weeklyProgress.completedCount && (
                      <div className="bg-gradient-to-r from-[#FF2A2A]/10 to-[#FF5A5A]/10 border border-[#FF2A2A]/20 rounded-lg p-2.5">
                        <p className="text-[#FF5A5A] text-xs">
                          Next up: apply {weeklyProgress.totalRecommendations - weeklyProgress.completedCount} more to unlock <span className="font-bold">+{Math.round((weeklyProgress.totalRecommendations - weeklyProgress.completedCount) * 5)}%</span> ROAS
                        </p>
                      </div>
                    )}
                  </>
                )}

                {!loading && !weeklyProgress && (
                  <div className="text-center py-8 text-gray-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No optimizations run yet</p>
                    <p className="text-xs mt-1 opacity-70">Click "Update Recommendations" to start tracking</p>
                  </div>
                )}
              </CardContent>
            </Card>
                </div>

            {/* Middle Column - Main Work Area */}
           <div className="col-span-1 xl:col-span-6 flex flex-col gap-4 min-w-0">
            
            {/* AI Optimization Feed - Premium Design */}
            <Card className="bg-gradient-to-br from-[#111]/80 to-[#0A0A0A]/80 border border-[#333] backdrop-blur-sm flex flex-col flex-1 min-h-[891px] max-h-[891px]">
              <CardHeader className="border-b border-[#333]/60 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#FF2A2A] to-[#FF5A5A] rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
                      <div className="relative w-12 h-12 bg-gradient-to-br from-[#FF2A2A]/20 to-[#FF5A5A]/10 rounded-xl flex items-center justify-center border border-[#FF2A2A]/30">
                        <Sparkles className="w-6 h-6 text-[#FF2A2A]" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        AI Optimization Feed
                      </h2>
                      <p className="text-xs text-gray-500">Intelligent recommendations ranked by impact</p>
                    </div>
                  </div>
                  {filteredOptimizations.length > 0 && (
                    <Badge className="bg-white/10 text-white border-white/20 px-3 py-1">
                      {filteredOptimizations.length} Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="p-4 flex-1 overflow-y-auto min-h-0">
                <div className="space-y-4">
                  {filteredOptimizations.map(card => {
                    // Calculate effort level (you can enhance this logic based on card data)
                    const effortLevel = card.priority === 'high' ? 2 : card.priority === 'medium' ? 1 : 1
                    const confidencePercentage = card.projectedImpact?.confidence || 85
                    
                    return (
                    <div key={card.id} className="group relative">
                      {/* Hover glow effect */}
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FF2A2A]/0 to-[#FF2A2A]/50 rounded-xl opacity-0 group-hover:opacity-20 blur transition-all duration-500"></div>
                      
                      <Card className="relative bg-gradient-to-br from-[#1a1a1a] via-[#111] to-[#0A0A0A] border border-[#333] group-hover:border-[#FF2A2A]/50 transition-all duration-300">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              {/* Confidence Ring */}
                              <div className="relative w-12 h-12 flex-shrink-0">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="24" cy="24" r="20" stroke="#333" strokeWidth="3" fill="none" />
                                  <circle 
                                    cx="24" 
                                    cy="24" 
                                    r="20" 
                                    stroke="#FF2A2A" 
                                    strokeWidth="3" 
                                    fill="none" 
                                    strokeLinecap="round"
                                    strokeDasharray="125.6"
                                    strokeDashoffset={125.6 - (125.6 * confidencePercentage) / 100}
                                    className="transition-all duration-700"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Zap className="w-5 h-5 text-[#FF2A2A]" />
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge className="bg-[#FF2A2A]/20 text-[#FF2A2A] border-[#FF2A2A]/30 text-xs uppercase font-bold">
                                    {card.priority}
                                  </Badge>
                                  <Badge className="bg-white/10 text-white border-white/20 text-xs">
                                    {confidencePercentage}% Confidence
                                  </Badge>
                                </div>
                                <h3 className="text-base font-bold text-white mb-1">{card.title}</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">{card.description}</p>
                              </div>
                            </div>
                            
                            {/* Effort Indicator */}
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1">
                                {[1,2,3].map((i) => (
                                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= effortLevel ? 'bg-[#10b981]' : 'bg-gray-700'}`}></div>
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">{effortLevel <= 1 ? 'Low' : effortLevel === 2 ? 'Medium' : 'High'} Effort</span>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-3">
                          {/* Root Cause */}
                          <div className="p-3 bg-[#0A0A0A]/50 border border-[#333] rounded-lg">
                            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Root Cause</div>
                            <p className="text-sm text-gray-300">{card.rootCause}</p>
                          </div>
                          
                          {/* Metrics */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-[#0F0F0F] border border-[#333] rounded-lg p-2 text-center">
                              <p className="text-xs text-gray-500">Current</p>
                              <p className="text-sm font-bold text-white">{card.currentValue}</p>
                            </div>
                            <div className="flex items-center justify-center">
                              <ArrowUpRight className="w-4 h-4 text-[#FF2A2A]" />
                            </div>
                            <div className="bg-[#0F0F0F] border border-[#333] rounded-lg p-2 text-center">
                              <p className="text-xs text-gray-500">Target</p>
                              <p className="text-sm font-bold text-white">{card.recommendedValue}</p>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            {completedItems.has(`opt-${card.id}`) ? (
                              <div className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <div className="text-sm text-gray-400">
                                  <div>Completed</div>
                                  <div className="text-xs">{timeUntilRefresh}</div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleExplainRecommendation(card.id)}
                                  className="flex-1 border-[#333] hover:border-[#444] text-white text-xs"
                                >
                                  <Info className="w-3 h-3 mr-1.5" />
                                  Explain
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkAsDone(card.id, card.actions[0]?.id)}
                                  className="flex-1 bg-gradient-to-r from-[#FF2A2A] to-[#FF5A5A] hover:shadow-lg hover:shadow-[#FF2A2A]/50 text-black font-bold text-xs transition-all"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1.5" />
                                  Mark Done
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )})}
                  
                  {filteredOptimizations.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No AI analysis run yet</h3>
                      <p className="text-sm">Click "Update Recommendations" above to generate your first AI-powered optimization insights.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
                </div>

            {/* Right Rail */}
           <div className="col-span-1 xl:col-span-3 flex flex-col gap-4 min-w-0">
            
            {/* Trends */}
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] flex flex-col flex-1" style={{ minHeight: '437.5px', maxHeight: '437.5px' }}>
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                flex items-center justify-center border border-white/10">
                    <BarChart3 className="w-5 h-5 text-white" />
                </div>
                  <div className="min-w-0 overflow-hidden">
                    <h3 className="text-base lg:text-lg font-bold text-white truncate">Performance Trends</h3>
                    <p className="text-gray-400 text-xs lg:text-sm truncate">7-day overview</p>
              </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-1 overflow-y-auto min-h-0">
                <div className="space-y-4">
                  {trends && (
                    <>
                     <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                       <div className="flex items-center gap-3 min-w-0 flex-1">
                         {/* Platform icons on the left */}
                         <div className="flex gap-1.5 flex-shrink-0">
                           {selectedPlatforms.includes('meta') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors">
                                 <Image src="/meta-icon.png" alt="Meta" width={18} height={18} className="rounded" />
                               </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">Meta: ${trends.spend.current.toLocaleString()}</div>
                                 <div className="text-gray-400">100% of total</div>
                               </div>
                             </div>
                           )}
                           {selectedPlatforms.includes('google') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors opacity-40">
                                 <img src="https://i.imgur.com/TavV4UJ.png" alt="Google" width={18} height={18} className="rounded" />
                               </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">Google: $0</div>
                                 <div className="text-gray-400">No data</div>
                               </div>
                             </div>
                           )}
                           {selectedPlatforms.includes('tiktok') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors opacity-40">
                                 <img src="https://i.imgur.com/AXHa9UT.png" alt="TikTok" width={18} height={18} className="rounded" />
                               </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">TikTok: $0</div>
                                 <div className="text-gray-400">No data</div>
                               </div>
                             </div>
                           )}
                         </div>
                         <div className="min-w-0">
                           <p className="text-gray-400 text-sm mb-0.5">Spend</p>
                           <p className="text-white font-semibold text-base">${trends.spend.current.toLocaleString()}</p>
                         </div>
                       </div>
                       <div 
                         className={`flex items-center gap-1 cursor-help relative group ${trends.spend.direction === 'up' ? 'text-[#10B981]' : 'text-[#FF2A2A]'}`}
                         title={`Previous: $${trends.spend.previous.toLocaleString()} → Current: $${trends.spend.current.toLocaleString()}`}
                       >
                         {trends.spend.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                         <span className="text-sm font-medium">{trends.spend.change > 0 ? '+' : ''}{trends.spend.change}%</span>
                         <div className="absolute bottom-full mb-2 right-0 hidden group-hover:block bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-xs text-gray-300 whitespace-nowrap z-10 shadow-lg">
                           <div className="text-gray-400 mb-1">Comparing:</div>
                           <div>Previous: <span className="text-white font-medium">${trends.spend.previous.toLocaleString()}</span></div>
                           <div>Current: <span className="text-white font-medium">${trends.spend.current.toLocaleString()}</span></div>
                </div>
          </div>
        </div>

                     <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                       <div className="flex items-center gap-3 min-w-0 flex-1">
                         {/* Platform icons on the left */}
                         <div className="flex gap-1.5 flex-shrink-0">
                           {selectedPlatforms.includes('meta') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors">
                                 <Image src="/meta-icon.png" alt="Meta" width={18} height={18} className="rounded" />
                               </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">Meta: ${trends.revenue.current.toLocaleString()}</div>
                                 <div className="text-gray-400">100% of total</div>
                               </div>
                             </div>
                           )}
                           {selectedPlatforms.includes('google') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors opacity-40">
                                 <img src="https://i.imgur.com/TavV4UJ.png" alt="Google" width={18} height={18} className="rounded" />
                               </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">Google: $0</div>
                                 <div className="text-gray-400">No data</div>
                               </div>
                             </div>
                           )}
                           {selectedPlatforms.includes('tiktok') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors opacity-40">
                                 <img src="https://i.imgur.com/AXHa9UT.png" alt="TikTok" width={18} height={18} className="rounded" />
                               </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">TikTok: $0</div>
                                 <div className="text-gray-400">No data</div>
                               </div>
                             </div>
                           )}
                         </div>
                         <div className="min-w-0">
                           <p className="text-gray-400 text-sm mb-0.5">Revenue</p>
                           <p className="text-white font-semibold text-base">${trends.revenue.current.toLocaleString()}</p>
                         </div>
                       </div>
                       <div 
                         className={`flex items-center gap-1 cursor-help relative group ${trends.revenue.direction === 'up' ? 'text-[#10B981]' : 'text-[#FF2A2A]'}`}
                         title={`Previous: $${trends.revenue.previous.toLocaleString()} → Current: $${trends.revenue.current.toLocaleString()}`}
                       >
                         {trends.revenue.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                         <span className="text-sm font-medium">{trends.revenue.change > 0 ? '+' : ''}{trends.revenue.change}%</span>
                         <div className="absolute bottom-full mb-2 right-0 hidden group-hover:block bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-xs text-gray-300 whitespace-nowrap z-10 shadow-lg">
                           <div className="text-gray-400 mb-1">Comparing:</div>
                           <div>Previous: <span className="text-white font-medium">${trends.revenue.previous.toLocaleString()}</span></div>
                           <div>Current: <span className="text-white font-medium">${trends.revenue.current.toLocaleString()}</span></div>
                </div>
          </div>
        </div>

                     <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                       <div className="flex items-center gap-3 min-w-0 flex-1">
                         {/* Platform icons on the left */}
                         <div className="flex gap-1.5 flex-shrink-0">
                           {selectedPlatforms.includes('meta') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors">
                                 <Image src="/meta-icon.png" alt="Meta" width={18} height={18} className="rounded" />
                </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">Meta: {trends.roas.current.toFixed(2)}x</div>
                                 <div className="text-gray-400">100% of total</div>
              </div>
                </div>
                           )}
                           {selectedPlatforms.includes('google') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors opacity-40">
                                 <img src="https://i.imgur.com/TavV4UJ.png" alt="Google" width={18} height={18} className="rounded" />
              </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">Google: 0.00x</div>
                                 <div className="text-gray-400">No data</div>
                </div>
              </div>
                           )}
                           {selectedPlatforms.includes('tiktok') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors opacity-40">
                                 <img src="https://i.imgur.com/AXHa9UT.png" alt="TikTok" width={18} height={18} className="rounded" />
                </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">TikTok: 0.00x</div>
                                 <div className="text-gray-400">No data</div>
              </div>
                </div>
                           )}
              </div>
                         <div className="min-w-0">
                           <p className="text-gray-400 text-sm mb-0.5">ROAS</p>
                           <p className="text-white font-semibold text-base">{trends.roas.current.toFixed(2)}x</p>
                </div>
                </div>
                       <div 
                         className={`flex items-center gap-1 cursor-help relative group ${trends.roas.direction === 'up' ? 'text-[#10B981]' : 'text-[#FF2A2A]'}`}
                         title={`Previous: ${trends.roas.previous.toFixed(2)}x → Current: ${trends.roas.current.toFixed(2)}x`}
                       >
                         {trends.roas.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                         <span className="text-sm font-medium">{trends.roas.change > 0 ? '+' : ''}{trends.roas.change}%</span>
                         <div className="absolute bottom-full mb-2 right-0 hidden group-hover:block bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-xs text-gray-300 whitespace-nowrap z-10 shadow-lg">
                           <div className="text-gray-400 mb-1">Comparing:</div>
                           <div>Previous: <span className="text-white font-medium">{trends.roas.previous.toFixed(2)}x</span></div>
                           <div>Current: <span className="text-white font-medium">{trends.roas.current.toFixed(2)}x</span></div>
              </div>
                </div>
                </div>
                    </>
                  )}
                  {!trends && (
                    <div className="text-center py-8 text-gray-400">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No analysis run yet</p>
                      <p className="text-xs mt-1 opacity-70">Click "Update Recommendations" to see trends</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Insights */}
            <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#111] to-[#0A0A0A] border border-[#10b981]/20 flex flex-col flex-1 shadow-lg shadow-[#10b981]/5" style={{ minHeight: '437.5px', maxHeight: '437.5px' }}>
              <CardHeader className="bg-gradient-to-r from-[#10b981]/10 via-[#10b981]/5 to-transparent border-b border-[#10b981]/20 rounded-t-lg flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#10b981]/20 to-[#34d399]/10 rounded-xl 
                                flex items-center justify-center border border-[#10b981]/30 shadow-lg shadow-[#10b981]/20">
                    <Sparkles className="w-5 h-5 text-[#34d399]" />
                        </div>
                  <div className="min-w-0 overflow-hidden">
                    <h3 className="text-base lg:text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent truncate">Quick Insights</h3>
                    <p className="text-gray-400 text-xs lg:text-sm truncate">AI-powered performance highlights</p>
                        </div>
                      </div>
              </CardHeader>
              <CardContent className="p-4 flex-1 overflow-y-auto min-h-0">
                <div className="space-y-3">
                  {quickInsights.map((insight, index) => (
                    <div key={index} className="relative p-4 bg-gradient-to-r from-[#1A1A1A] via-[#1a1a1a] to-[#0f0f0f] border border-[#10b981]/20 rounded-lg hover:border-[#10b981]/40 transition-all duration-300 group overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#10b981]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#10b981]/10 to-[#34d399]/5 rounded-lg flex items-center justify-center border border-[#10b981]/20">
                            <span className="text-2xl">{insight.icon}</span>
                          </div>
                          <div>
                            <h4 className="text-white font-semibold text-sm">{insight.label}</h4>
                            <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[160px]">{insight.value}</p>
                          </div>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-[#10b981]/20 to-[#34d399]/10 border border-[#10b981]/30 text-xs font-bold text-[#34d399]">
                          {insight.metric}
                        </div>
                      </div>
                    </div>
                  ))}
                  {quickInsights.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No AI analysis run yet</p>
                      <p className="text-xs mt-1 opacity-70">Click "Update Recommendations" to generate insights</p>
                    </div>
                  )}
                </div>
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
                        Every Monday at 12 AM, the system analyzes a <strong className="text-white">Monday-to-Monday weekly window</strong> (last Monday to this Monday):
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
                        When Monday rolls around again, the system analyzes the <strong className="text-white">new Monday-to-Monday window</strong>:
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
    </div>
  )
}
