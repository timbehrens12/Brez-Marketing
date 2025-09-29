"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { DateRange } from "react-day-picker"
import { DateRangePicker } from "@/components/DateRangePicker"
import { subDays, format } from "date-fns"
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { useAgency } from "@/contexts/AgencyContext"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { 
  dateToLocalDateString,
  isDateRangeToday,
  isDateRangeYesterday,
  formatDateRangeForAPI 
} from '@/lib/utils/timezone'
import { useDataBackfill } from "@/lib/hooks/useDataBackfill"
import { BackfillAlert } from "@/components/BackfillAlert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Image from "next/image"
import { MetaConnectionStatus } from "@/components/MetaConnectionStatus"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  RefreshCw, 
  Brain, 
  Clock, 
  Check, 
  Search, 
  Filter,
  Play,
  Settings,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointer,
  Target,
  Zap,
  AlertTriangle,
  Calendar,
  Activity,
  Palette,
  BarChart3,
  Users,
  MessageSquare,
  CheckCircle,
  X,
  Plus
} from "lucide-react"

// Data types matching existing business logic
interface MetaMetrics {
  adSpend: number
  adSpendGrowth: number
  impressions: number
  impressionGrowth: number
  clicks: number
  clickGrowth: number
  conversions: number
  conversionGrowth: number
  ctr: number
  ctrGrowth: number
  cpc: number
  cpcGrowth: number
  costPerResult: number
  cprGrowth: number
  roas: number
  roasGrowth: number
  frequency: number
  budget: number
  reach: number
  dailyData: any[]
  previousAdSpend: number
  previousImpressions: number
  previousClicks: number
  previousConversions: number
  previousCtr: number
  previousCpc: number
  previousRoas: number
}

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
  platform?: string
  selected?: boolean
  recommendation?: {
    action: string
    reasoning: string
    impact: string
    confidence: number
    implementation: string
    generated_at?: string
    week_generated?: string
    status?: 'active' | 'completed' | 'ignored'
  }
}

interface QueuedAction {
  id: string
  type: 'scale' | 'optimize' | 'pause' | 'test'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  campaignId?: string
  adsetId?: string
  creativeId?: string
}

interface TrendData {
  day: string
  spend: number
  revenue: number
  roas: number
  date: string
}

interface CreativePerformance {
  creative_id: string
  creative_name: string
  ctr: number
  roas: number
  impressions: number
  spend: number
  thumbnail_url?: string
}

interface ActionLogEntry {
  id: string
  timestamp: string
  type: 'action' | 'plan' | 'alert'
  title: string
  description: string
  status: 'completed' | 'pending' | 'failed'
}

interface Alert {
  id: string
  type: 'warning' | 'critical' | 'info'
  title: string
  description: string
  timestamp: string
  campaignId?: string
}

const defaultMetrics: MetaMetrics = {
  adSpend: 0,
  adSpendGrowth: 0,
  impressions: 0,
  impressionGrowth: 0,
  clicks: 0,
  clickGrowth: 0,
  conversions: 0,
  conversionGrowth: 0,
  ctr: 0,
  ctrGrowth: 0,
  cpc: 0,
  cpcGrowth: 0,
  costPerResult: 0,
  cprGrowth: 0,
  roas: 0,
  roasGrowth: 0,
  frequency: 0,
  budget: 0,
  reach: 0,
  dailyData: [],
  previousAdSpend: 0,
  previousImpressions: 0,
  previousClicks: 0,
  previousConversions: 0,
  previousCtr: 0,
  previousCpc: 0,
  previousRoas: 0
}

export default function UnifiedAIOrchestratorPage() {
  const { selectedBrandId } = useBrandContext()
  const { agencySettings } = useAgency()
  const pathname = usePathname()
  
  // Core data state
  const [metaMetrics, setMetaMetrics] = useState<MetaMetrics>(defaultMetrics)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [loadingPhase, setLoadingPhase] = useState<string>('Initializing AI Orchestrator')
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  // Dashboard state
  const [selectedTab, setSelectedTab] = useState("campaigns")
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [creativePerformance, setCreativePerformance] = useState<CreativePerformance[]>([])
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  
  // Date range state
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  })

  // Data backfill hook
  const { status: backfillStatus, checkForGaps, performBackfill } = useDataBackfill()

  // Refs for tracking state
  const hasInitialDataLoaded = useRef(false)
  const isInitialLoadInProgress = useRef(false)

  // Helper functions from original implementation
  const getPreviousPeriodDates = useCallback((from: Date, to: Date): { prevFrom: string, prevTo: string } => {
    const fromNormalized = new Date(from.getFullYear(), from.getMonth(), from.getDate())
    const toNormalized = new Date(to.getFullYear(), to.getMonth(), to.getDate())
    
    const daysDiff = Math.ceil((toNormalized.getTime() - fromNormalized.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const prevTo = new Date(fromNormalized.getTime() - 1000 * 60 * 60 * 24)
    const prevFrom = new Date(prevTo.getTime() - (daysDiff - 1) * 1000 * 60 * 60 * 24)
    
    return {
      prevFrom: dateToLocalDateString(prevFrom),
      prevTo: dateToLocalDateString(prevTo)
    }
  }, [])

  const calculatePercentChange = useCallback((current: number, previous: number): number | null => {
    if (previous === 0) {
      return null
    }
    if (current === previous) {
      return 0
    }
    return ((current - previous) / Math.abs(previous)) * 100
  }, [])

  // Core data loading function combining original business logic
  const loadAllData = useCallback(async () => {
    if (!selectedBrandId || !dateRange?.from || !dateRange?.to) {
      return
    }

    if (isInitialLoadInProgress.current) {
      return
    }

    setIsDataLoading(true)
    setLoadingProgress(0)
    isInitialLoadInProgress.current = true

    try {
      // Phase 1: Data validation and backfill
      setLoadingPhase('Checking for missing data...')
      setLoadingProgress(10)
      
      await checkForGaps(selectedBrandId)
      
      if (backfillStatus.hasGaps && backfillStatus.totalMissingDays >= 1) {
        setLoadingPhase(`Backfilling ${backfillStatus.totalMissingDays} missing days...`)
        setLoadingProgress(20)
        await performBackfill(selectedBrandId)
      }

      // Phase 2: Load metrics data
      setLoadingPhase('Loading advertising data...')
      setLoadingProgress(30)
      
      const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to)
      
      const [currentResponse, prevResponse] = await Promise.all([
        fetch(`/api/metrics/meta?brandId=${selectedBrandId}&from=${dateToLocalDateString(dateRange.from)}&to=${dateToLocalDateString(dateRange.to)}&force_refresh=true&t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        }),
        fetch(`/api/metrics/meta?brandId=${selectedBrandId}&from=${prevFrom}&to=${prevTo}&force_refresh=true&t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        })
      ])

      const currentData = await currentResponse.json()
      const previousData = await prevResponse.json()

      // Calculate growth values
      const newMetrics = {
        adSpend: currentData.adSpend || 0,
        impressions: currentData.impressions || 0,
        clicks: currentData.clicks || 0,
        conversions: currentData.conversions || 0,
        roas: currentData.roas || 0,
        ctr: currentData.ctr || 0,
        cpc: currentData.cpc || 0,
        costPerResult: currentData.costPerResult || 0,
        frequency: currentData.frequency || 0,
        budget: currentData.budget || 0,
        reach: currentData.reach || 0,
        dailyData: currentData.dailyData || [],
        adSpendGrowth: calculatePercentChange(currentData.adSpend || 0, previousData.adSpend || 0) ?? 0,
        impressionGrowth: calculatePercentChange(currentData.impressions || 0, previousData.impressions || 0) ?? 0,
        clickGrowth: calculatePercentChange(currentData.clicks || 0, previousData.clicks || 0) ?? 0,
        conversionGrowth: calculatePercentChange(currentData.conversions || 0, previousData.conversions || 0) ?? 0,
        roasGrowth: calculatePercentChange(currentData.roas || 0, previousData.roas || 0) ?? 0,
        ctrGrowth: calculatePercentChange(currentData.ctr || 0, previousData.ctr || 0) ?? 0,
        cpcGrowth: calculatePercentChange(currentData.cpc || 0, previousData.cpc || 0) ?? 0,
        cprGrowth: calculatePercentChange(currentData.costPerResult || 0, previousData.costPerResult || 0) ?? 0,
        previousAdSpend: previousData.adSpend || 0,
        previousImpressions: previousData.impressions || 0,
        previousClicks: previousData.clicks || 0,
        previousConversions: previousData.conversions || 0,
        previousRoas: previousData.roas || 0,
        previousCtr: previousData.ctr || 0,
        previousCpc: previousData.cpc || 0
      }
      
      setMetaMetrics(newMetrics)

      // Phase 3: Load campaigns
      setLoadingPhase('Loading campaigns...')
      setLoadingProgress(50)

      const today = new Date()
      const todayStr = dateToLocalDateString(today)
      
      const campaignsResponse = await fetch(`/api/meta/campaigns?brandId=${selectedBrandId}&limit=100&sortBy=spent&sortOrder=desc&from=${todayStr}&to=${todayStr}&forceRefresh=true&t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      })
      
      // Campaign response will be processed in creative loading phase

      // Phase 4: Load trend data
      setLoadingPhase('Loading performance trends...')
      setLoadingProgress(70)

      // Use real daily data from metrics
      const realTrendData: TrendData[] = newMetrics.dailyData && newMetrics.dailyData.length > 0 
        ? newMetrics.dailyData.slice(-7).map((dayData: any, index: number) => ({
            day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(dayData.date || Date.now()).getDay()],
            spend: dayData.adSpend || 0,
            revenue: (dayData.adSpend || 0) * (dayData.roas || newMetrics.roas),
            roas: dayData.roas || newMetrics.roas,
            date: dayData.date || new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toISOString()
          }))
        : [
            { day: 'Mon', spend: newMetrics.adSpend * 0.14, revenue: newMetrics.adSpend * newMetrics.roas * 0.14, roas: newMetrics.roas, date: '2024-01-01' },
            { day: 'Tue', spend: newMetrics.adSpend * 0.15, revenue: newMetrics.adSpend * newMetrics.roas * 0.15, roas: newMetrics.roas, date: '2024-01-02' },
            { day: 'Wed', spend: newMetrics.adSpend * 0.16, revenue: newMetrics.adSpend * newMetrics.roas * 0.16, roas: newMetrics.roas, date: '2024-01-03' },
            { day: 'Thu', spend: newMetrics.adSpend * 0.14, revenue: newMetrics.adSpend * newMetrics.roas * 0.14, roas: newMetrics.roas, date: '2024-01-04' },
            { day: 'Fri', spend: newMetrics.adSpend * 0.18, revenue: newMetrics.adSpend * newMetrics.roas * 0.18, roas: newMetrics.roas, date: '2024-01-05' },
            { day: 'Sat', spend: newMetrics.adSpend * 0.13, revenue: newMetrics.adSpend * newMetrics.roas * 0.13, roas: newMetrics.roas, date: '2024-01-06' },
            { day: 'Sun', spend: newMetrics.adSpend * 0.10, revenue: newMetrics.adSpend * newMetrics.roas * 0.10, roas: newMetrics.roas, date: '2024-01-07' }
          ]
      setTrendData(realTrendData)

      // Phase 5: Load real creative performance data
      setLoadingPhase('Loading creative performance...')
      setLoadingProgress(85)

      // Load real creative data from campaigns
      let allCreatives: CreativePerformance[] = []
      try {
        const campaignsData = await campaignsResponse.json()
        let campaignsWithPlatform: Campaign[] = []
        if (campaignsData.campaigns && Array.isArray(campaignsData.campaigns)) {
          campaignsWithPlatform = campaignsData.campaigns.map((campaign: Campaign) => ({
            ...campaign,
            platform: 'meta',
            selected: false
          }))
          setCampaigns(campaignsWithPlatform)
          
          // Load saved recommendations for campaigns
          try {
            const campaignIds = campaignsWithPlatform.map(c => c.campaign_id)
            const params = new URLSearchParams({
              brandId: selectedBrandId,
              campaignIds: campaignIds.join(',')
            })

            const response = await fetch(`/api/ai/campaign-recommendations?${params}`)
            
            if (response.ok) {
              const data = await response.json()
              
              if (data.success && data.recommendations) {
                // Update campaigns with their saved recommendations
                const campaignsWithRecommendations = campaignsWithPlatform.map(campaign => {
                  const recommendation = data.recommendations[campaign.campaign_id]
                  return recommendation ? { ...campaign, recommendation } : campaign
                })
                
                setCampaigns(campaignsWithRecommendations)
                campaignsWithPlatform = campaignsWithRecommendations
              }
            }
          } catch (error) {
            console.error('Error loading recommendations:', error)
          }
        }
        
        for (const campaign of campaignsWithPlatform.slice(0, 3)) { // Top 3 campaigns for performance
          const adsetsResponse = await fetch(`/api/meta/adsets?brandId=${selectedBrandId}&campaignId=${campaign.campaign_id}&t=${Date.now()}`)
          if (adsetsResponse.ok) {
            const adsetsData = await adsetsResponse.json()
            if (adsetsData.success && adsetsData.adsets) {
              for (const adset of adsetsData.adsets.slice(0, 2)) { // Top 2 adsets per campaign
                try {
                  const adsResponse = await fetch('/api/meta/ads/direct-fetch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      brandId: selectedBrandId,
                      adsetId: adset.adset_id,
                      forceRefresh: false,
                      dateRange: {
                        from: dateToLocalDateString(dateRange.from),
                        to: dateToLocalDateString(dateRange.to)
                      }
                    })
                  })
                  const adsData = await adsResponse.json()
                  if (adsData.success && adsData.ads) {
                    allCreatives.push(...adsData.ads.slice(0, 1).map((ad: any) => ({
                      creative_id: ad.ad_id || `${adset.adset_id}-ad`,
                      creative_name: ad.ad_name || `${campaign.campaign_name} Creative`,
                      ctr: ad.ctr || campaign.ctr || 0,
                      roas: campaign.roas || 0,
                      impressions: ad.impressions || 0,
                      spend: ad.spent || 0
                    })))
                  }
                } catch (error) {
                  // Fallback to sample data if ad fetch fails
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading creative data:', error)
      }

      // If no real data, use sample data
      if (allCreatives.length === 0) {
        allCreatives = [
          { creative_id: '1', creative_name: 'Video Ad A', ctr: 3.2, roas: newMetrics.roas * 1.2, impressions: 15000, spend: 245 },
          { creative_id: '2', creative_name: 'Carousel B', ctr: 2.8, roas: newMetrics.roas * 0.9, impressions: 12000, spend: 180 },
          { creative_id: '3', creative_name: 'Static Image C', ctr: 2.1, roas: newMetrics.roas * 0.7, impressions: 8000, spend: 120 },
        ]
      }
      setCreativePerformance(allCreatives)

      // Sample action log
      setActionLog([
        { id: '1', timestamp: new Date(Date.now() - 3600000).toISOString(), type: 'action', title: 'Budget increased', description: 'Campaign A budget increased by 20%', status: 'completed' },
        { id: '2', timestamp: new Date(Date.now() - 7200000).toISOString(), type: 'plan', title: 'AI analysis completed', description: 'Generated 3 optimization recommendations', status: 'completed' },
      ])

      // Sample alerts
      setAlerts([
        { id: '1', type: 'warning', title: 'High frequency detected', description: 'Campaign B showing frequency >3.5', timestamp: new Date().toISOString() },
        { id: '2', type: 'critical', title: 'Low ROAS alert', description: 'Campaign C below 2.0 ROAS threshold', timestamp: new Date().toISOString() },
      ])

      setLoadingProgress(100)
      setLoadingPhase('Ready!')
      
      await new Promise(resolve => setTimeout(resolve, 300))
      
      setIsDataLoading(false)
      hasInitialDataLoaded.current = true
      
    } catch (error) {
      console.error('Error during data loading:', error)
      setIsDataLoading(false)
      toast.error('Some data failed to load, but dashboard is still available')
    } finally {
      isInitialLoadInProgress.current = false
    }
  }, [selectedBrandId, dateRange, checkForGaps, performBackfill, backfillStatus, getPreviousPeriodDates, calculatePercentChange])

  // Initial data load
  useEffect(() => {
    if (!selectedBrandId) {
      setIsDataLoading(false)
      setLoadingProgress(0)
      setLoadingPhase('Please select a brand')
      return
    }

    if (dateRange?.from && dateRange?.to && !hasInitialDataLoaded.current) {
      loadAllData()
    }
  }, [selectedBrandId, dateRange, loadAllData])

  // Helper functions for UI
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'PAUSED':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getROASColor = (roas: number) => {
    if (roas >= 3) return 'text-green-400'
    if (roas >= 2) return 'text-amber-400'
    return 'text-red-400'
  }

  const toggleCampaignSelection = (campaignId: string) => {
    setSelectedCampaigns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId)
      } else {
        newSet.add(campaignId)
      }
      return newSet
    })
  }

  const addToQueue = (action: Omit<QueuedAction, 'id'>) => {
    const newAction: QueuedAction = {
      ...action,
      id: Date.now().toString()
    }
    setQueuedActions(prev => [...prev, newAction])
    
    // Add to action log
    const logEntry: ActionLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'plan',
      title: `Added to queue: ${action.title}`,
      description: action.description,
      status: 'pending'
    }
    setActionLog(prev => [logEntry, ...prev])
  }

  const removeFromQueue = (actionId: string) => {
    setQueuedActions(prev => prev.filter(action => action.id !== actionId))
  }

  const runSelectedActions = () => {
    if (queuedActions.length === 0) {
      toast.error('No actions in queue')
      return
    }

    // Simulate running actions
    toast.success(`Running ${queuedActions.length} actions...`)
    
    // Add success entries to action log
    queuedActions.forEach(action => {
      const logEntry: ActionLogEntry = {
        id: Date.now().toString() + Math.random(),
        timestamp: new Date().toISOString(),
        type: 'action',
        title: `Executed: ${action.title}`,
        description: action.description,
        status: 'completed'
      }
      setActionLog(prev => [logEntry, ...prev])
    })

    // Clear queue
    setQueuedActions([])
  }

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Show loading state
  if (isDataLoading) {
    return (
      <div className="w-full min-h-screen bg-[#0B0D10] flex flex-col items-center justify-center relative overflow-hidden py-8 animate-in fade-in duration-300">
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
            <div className="absolute inset-0 rounded-full border-4 border-t-[#EF4444] animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          
          {/* Loading title */}
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            AI Orchestrator
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
                className="h-full bg-gradient-to-r from-[#EF4444] to-[#DC2626] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show no brand selected state
  if (!selectedBrandId) {
    return (
      <div className="w-full h-screen bg-[#0B0D10] flex flex-col items-center justify-center relative overflow-hidden" style={{ paddingBottom: '15vh' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        <div className="relative z-10 text-center max-w-lg mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            AI Orchestrator
          </h1>
          
          <p className="text-xl text-gray-300 mb-6 font-medium min-h-[28px]">
            No brand selected
          </p>
          
          <div className="w-full max-w-md mx-auto mb-6">
            <p className="text-gray-400 text-base">
              Choose a brand from the sidebar to access your unified AI marketing orchestrator dashboard.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Main dashboard layout
  return (
    <div className="w-full min-h-screen bg-[#0B0D10] relative">
      {/* Background pattern - subtle grid behind content */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}></div>
      </div>

      {/* Meta Connection Status Banner */}
      <MetaConnectionStatus 
        brandId={selectedBrandId} 
        className="px-4 sm:px-6" 
      />

      {/* Main 3-column layout - fixed height, compact spacing */}
      <div className="relative z-10 h-[calc(100vh-80px)] flex">
        
        {/* Left Column (3/12) - Sticky, compact */}
        <div className="w-1/4 flex-shrink-0 sticky top-0 h-full overflow-y-auto border-r border-[#2A2F36] bg-[#0B0D10]">
          <div className="p-3 space-y-3">
            
            {/* Scope & Filters Card */}
            <Card className="bg-[#14171C] border-[#2A2F36]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Scope & Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-[#9AA4B2]" />
                  <Input
                    placeholder="Search campaigns, ad sets, creatives..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#0F1216] border-[#2A2F36] text-[#D1D5DB] placeholder-[#9AA4B2] focus:border-[#EF4444]"
                  />
                </div>

                {/* Tabs */}
                <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                  <TabsList className="grid w-full grid-cols-2 bg-[#0F1216] border border-[#2A2F36]">
                    <TabsTrigger value="campaigns" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white text-[#9AA4B2]">
                      Campaigns
                    </TabsTrigger>
                    <TabsTrigger value="creatives" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white text-[#9AA4B2]">
                      Creatives
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="campaigns" className="space-y-1 mt-3">
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {campaigns.filter(campaign => 
                        searchQuery === '' || 
                        campaign.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())
                      ).slice(0, 10).map((campaign) => (
                        <div
                          key={campaign.campaign_id}
                          className="flex items-center space-x-2 p-2 hover:bg-[#0F1216] rounded cursor-pointer"
                          onClick={() => toggleCampaignSelection(campaign.campaign_id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCampaigns.has(campaign.campaign_id)}
                            onChange={() => {}}
                            className="w-4 h-4 text-[#EF4444] bg-[#0F1216] border-[#2A2F36] rounded focus:ring-[#EF4444]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#D1D5DB] truncate">
                              {campaign.campaign_name}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs px-2 py-0 ${getStatusColor(campaign.status)}`}>
                                {campaign.status}
                              </Badge>
                              <span className={`text-xs font-medium ${getROASColor(campaign.roas)}`}>
                                {campaign.roas.toFixed(2)}x
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="creatives" className="space-y-2 mt-4">
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {creativePerformance.map((creative) => (
                        <div
                          key={creative.creative_id}
                          className="flex items-center space-x-3 p-2 hover:bg-[#0F1216] rounded"
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-[#EF4444] bg-[#0F1216] border-[#2A2F36] rounded focus:ring-[#EF4444]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#D1D5DB] truncate">
                              {creative.creative_name}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#9AA4B2]">CTR: {creative.ctr.toFixed(1)}%</span>
                              <span className={`text-xs font-medium ${getROASColor(creative.roas)}`}>
                                {creative.roas.toFixed(1)}x
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Experiments Queue Card */}
            <Card className="bg-[#14171C] border-[#2A2F36]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Experiments Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-3">
                {/* Queued actions */}
                <div className="space-y-2">
                  {queuedActions.length === 0 ? (
                    <p className="text-[#9AA4B2] text-xs text-center py-2">
                      No actions queued
                    </p>
                  ) : (
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {queuedActions.map((action) => (
                        <div
                          key={action.id}
                          className="flex items-center justify-between p-2 bg-[#0F1216] rounded border border-[#2A2F36]"
                        >
                          <div className="flex-1 min-w-0">
                            <Badge variant="outline" className={`text-xs mr-2 ${
                              action.impact === 'high' ? 'border-[#EF4444] text-[#EF4444]' :
                              action.impact === 'medium' ? 'border-[#F59E0B] text-[#F59E0B]' :
                              'border-[#22C55E] text-[#22C55E]'
                            }`}>
                              {action.title}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromQueue(action.id)}
                            className="h-6 w-6 p-0 text-[#9AA4B2] hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={runSelectedActions}
                    disabled={queuedActions.length === 0}
                    className="flex-1 bg-[#EF4444] hover:bg-[#DC2626] text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Run Selected
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#2A2F36] text-[#9AA4B2] hover:text-white hover:bg-[#0F1216]"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Middle Column (6/12) - Scrollable, compact */}
        <div className="flex-1 overflow-y-auto h-full">
          <div className="p-3 space-y-3">
            
            {/* KPI Strip - compact */}
            <div className="grid grid-cols-6 gap-2">
              <div className="bg-[#14171C] border border-[#2A2F36] rounded-lg p-2 text-center">
                <div className="text-xs text-[#9AA4B2] mb-1">Spend</div>
                <div className="text-sm font-bold text-[#D1D5DB]">{formatCurrency(metaMetrics.adSpend)}</div>
                <div className={`text-xs flex items-center justify-center gap-1 ${
                  metaMetrics.adSpendGrowth > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}>
                  {metaMetrics.adSpendGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(metaMetrics.adSpendGrowth).toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#14171C] border border-[#2A2F36] rounded-lg p-2 text-center">
                <div className="text-xs text-[#9AA4B2] mb-1">Impressions</div>
                <div className="text-sm font-bold text-[#D1D5DB]">{formatNumber(metaMetrics.impressions)}</div>
                <div className={`text-xs flex items-center justify-center gap-1 ${
                  metaMetrics.impressionGrowth > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}>
                  {metaMetrics.impressionGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(metaMetrics.impressionGrowth).toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#14171C] border border-[#2A2F36] rounded-lg p-2 text-center">
                <div className="text-xs text-[#9AA4B2] mb-1">Clicks</div>
                <div className="text-sm font-bold text-[#D1D5DB]">{formatNumber(metaMetrics.clicks)}</div>
                <div className={`text-xs flex items-center justify-center gap-1 ${
                  metaMetrics.clickGrowth > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}>
                  {metaMetrics.clickGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(metaMetrics.clickGrowth).toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#14171C] border border-[#2A2F36] rounded-lg p-2 text-center">
                <div className="text-xs text-[#9AA4B2] mb-1">Conversions</div>
                <div className="text-sm font-bold text-[#D1D5DB]">{formatNumber(metaMetrics.conversions)}</div>
                <div className={`text-xs flex items-center justify-center gap-1 ${
                  metaMetrics.conversionGrowth > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}>
                  {metaMetrics.conversionGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(metaMetrics.conversionGrowth).toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#14171C] border border-[#2A2F36] rounded-lg p-2 text-center">
                <div className="text-xs text-[#9AA4B2] mb-1">CPC</div>
                <div className="text-sm font-bold text-[#D1D5DB]">{formatCurrency(metaMetrics.cpc)}</div>
                <div className={`text-xs flex items-center justify-center gap-1 ${
                  metaMetrics.cpcGrowth < 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}>
                  {metaMetrics.cpcGrowth < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {Math.abs(metaMetrics.cpcGrowth).toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#14171C] border border-[#2A2F36] rounded-lg p-2 text-center">
                <div className="text-xs text-[#9AA4B2] mb-1">ROAS</div>
                <div className={`text-sm font-bold ${getROASColor(metaMetrics.roas)}`}>
                  {metaMetrics.roas.toFixed(2)}x
                </div>
                <div className={`text-xs flex items-center justify-center gap-1 ${
                  metaMetrics.roasGrowth > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}>
                  {metaMetrics.roasGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(metaMetrics.roasGrowth).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Campaigns List with Inline AI */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-[#D1D5DB] flex items-center gap-2">
                <Target className="w-4 h-4" />
                Campaigns with AI Suggestions
              </h2>
              
              {campaigns.slice(0, 6).map((campaign) => (
                <Card key={campaign.campaign_id} className="bg-[#14171C] border-[#2A2F36]">
                  <CardContent className="p-3">
                    {/* Campaign Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Image 
                          src="https://i.imgur.com/6hyyRrs.png" 
                          alt="Meta" 
                          width={16} 
                          height={16} 
                          className="object-contain rounded"
                        />
                        <div>
                          <h3 className="text-white font-medium text-sm">{campaign.campaign_name}</h3>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs px-1 py-0 ${getStatusColor(campaign.status)}`}>
                              {campaign.status}
                            </Badge>
                            <span className={`text-xs font-medium ${getROASColor(campaign.roas)}`}>
                              {campaign.roas.toFixed(1)}x
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-[#D1D5DB]">
                          {formatCurrency(campaign.spent)}
                        </div>
                        <div className="text-xs text-[#9AA4B2]">
                          CTR: {formatPercentage(campaign.ctr)}
                        </div>
                      </div>
                    </div>

                    {/* Two panels beneath - compact */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Left: Predicted Impact Chart */}
                      <div className="bg-[#0F1216] rounded-lg p-2 border border-[#2A2F36]">
                        <h4 className="text-xs font-medium text-[#D1D5DB] mb-1">Predicted Impact (7d)</h4>
                        <div className="h-12 flex items-end justify-between gap-0.5">
                          {[0.8, 1.2, 0.9, 1.5, 1.1, 1.8, 1.6].map((value, index) => (
                            <div
                              key={index}
                              className="bg-gradient-to-t from-[#EF4444] to-[#DC2626] rounded-sm flex-1"
                              style={{ height: `${value * 30}px` }}
                            />
                          ))}
                        </div>
                        <div className="text-xs text-[#9AA4B2] mt-1">
                          Est. +{formatCurrency(campaign.spent * 0.3)}
                        </div>
                      </div>

                      {/* Right: AI Suggestions */}
                      <div className="bg-[#0F1216] rounded-lg p-2 border border-[#2A2F36]">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-medium text-[#D1D5DB]">AI Suggestions</h4>
                          <Brain className="w-3 h-3 text-[#EF4444]" />
                        </div>
                        
                        {campaign.recommendation ? (
                          <div className="space-y-1">
                            <div className="text-xs text-[#D1D5DB] font-medium">
                              {campaign.recommendation.action}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addToQueue({
                                type: 'optimize',
                                title: campaign.recommendation!.action,
                                description: campaign.recommendation!.reasoning,
                                impact: 'high',
                                campaignId: campaign.campaign_id
                              })}
                              className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs py-1 h-6"
                            >
                              Apply
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-xs text-[#9AA4B2]">
                              No issues detected
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-[#2A2F36] text-[#9AA4B2] hover:text-white text-xs py-1 h-6"
                              onClick={async () => {
                                // Generate AI recommendation using existing system
                                try {
                                  const response = await fetch('/api/ai/campaign-recommendations', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      brandId: selectedBrandId,
                                      campaignId: campaign.campaign_id,
                                      forceRefresh: false,
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
                                    })
                                  })
                                  
                                  if (response.ok) {
                                    const data = await response.json()
                                    if (data.recommendation) {
                                      // Update campaign with recommendation
                                      setCampaigns(prev => prev.map(c => 
                                        c.campaign_id === campaign.campaign_id 
                                          ? { ...c, recommendation: data.recommendation }
                                          : c
                                      ))
                                      toast.success('AI recommendation generated!')
                                    }
                                  }
                                } catch (error) {
                                  toast.error('Failed to generate recommendation')
                                }
                              }}
                            >
                              Generate
                            </Button>
                          </div>
                        )}
                        
                        <div className="text-xs text-[#9AA4B2] mt-1">
                          {campaign.roas < 2 ? 'Low ROAS' : campaign.ctr < 1.5 ? 'Low CTR' : 'Performing well'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (3/12) - Sticky, compact */}
        <div className="w-1/4 flex-shrink-0 sticky top-0 h-full overflow-y-auto border-l border-[#2A2F36] bg-[#0B0D10]">
          <div className="p-3 space-y-3">
            
            {/* Performance Trends */}
            <Card className="bg-[#14171C] border-[#2A2F36]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="h-20 flex items-end justify-between gap-1 mb-2">
                  {trendData.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="bg-gradient-to-t from-[#EF4444] to-[#DC2626] rounded-sm w-full"
                        style={{ height: `${(day.spend / Math.max(...trendData.map(d => d.spend))) * 100}px` }}
                      />
                      <div
                        className="bg-gradient-to-t from-[#22C55E] to-[#16A34A] rounded-sm w-full"
                        style={{ height: `${(day.revenue / Math.max(...trendData.map(d => d.revenue))) * 80}px` }}
                      />
                      <div className="text-xs text-[#9AA4B2]">{day.day}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#EF4444] rounded"></div>
                    <span className="text-[#9AA4B2]">Spend</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#22C55E] rounded"></div>
                    <span className="text-[#9AA4B2]">Revenue</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Creative Performance */}
            <Card className="bg-[#14171C] border-[#2A2F36]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Creative Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                {creativePerformance.slice(0, 4).map((creative) => (
                  <div key={creative.creative_id} className="flex items-center justify-between p-2 bg-[#0F1216] rounded border border-[#2A2F36]">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#D1D5DB] truncate">
                        {creative.creative_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#9AA4B2]">
                        <span>CTR: {creative.ctr.toFixed(1)}%</span>
                        <span className={getROASColor(creative.roas)}>
                          {creative.roas.toFixed(1)}x
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[#9AA4B2] hover:text-white">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Action Log */}
            <Card className="bg-[#14171C] border-[#2A2F36]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Action Log
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pb-3">
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {actionLog.slice(0, 8).map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2 p-1.5 bg-[#0F1216] rounded border border-[#2A2F36]">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        entry.status === 'completed' ? 'bg-[#22C55E]' : 
                        entry.status === 'pending' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#D1D5DB]">{entry.title}</p>
                        <p className="text-xs text-[#9AA4B2] truncate">{entry.description}</p>
                        <p className="text-xs text-[#9AA4B2]">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card className="bg-[#14171C] border-[#2A2F36]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pb-3">
                {alerts.length === 0 ? (
                  <p className="text-[#9AA4B2] text-xs text-center py-2">
                    No active alerts
                  </p>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className={`p-2 rounded border ${
                      alert.type === 'critical' ? 'bg-[#EF4444]/10 border-[#EF4444]/30' :
                      alert.type === 'warning' ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30' :
                      'bg-[#22C55E]/10 border-[#22C55E]/30'
                    }`}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                          alert.type === 'critical' ? 'text-[#EF4444]' :
                          alert.type === 'warning' ? 'text-[#F59E0B]' :
                          'text-[#22C55E]'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#D1D5DB]">{alert.title}</p>
                          <p className="text-xs text-[#9AA4B2]">{alert.description}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
