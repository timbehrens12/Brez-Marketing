"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { MetricCard } from "@/components/metrics/MetricCard"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Image from "next/image"
import PlatformCampaignWidget from "@/components/campaign-management/PlatformCampaignWidget"
import AIDailyReport from "@/components/campaign-management/AIDailyReport"
import AdCreativeBreakdown from "@/components/campaign-management/AdCreativeBreakdown"
import AIMarketingConsultant from "@/components/campaign-management/AIMarketingConsultant"
import PerformanceChart from "@/components/campaign-management/PerformanceChart"
import BlendedWidgetsTable from "@/components/campaign-management/BlendedWidgetsTable"
import { MetaConnectionStatus } from "@/components/MetaConnectionStatus"
import { Button } from "@/components/ui/button"
import { RefreshCw, Brain, Clock } from "lucide-react"

// Extend Window interface for global state management
declare global {
  interface Window {
    _metaTimeouts?: ReturnType<typeof setTimeout>[];
    _blockMetaApiCalls?: boolean; // To temporarily block API calls
    _disableAutoMetaFetch?: boolean; // To disable auto-fetching behaviour
    _activeFetchIds?: Set<number | string>; // To track active fetch operations
    _metaFetchLock?: boolean; // Global lock to prevent multiple simultaneous hard refreshes
    _lastManualRefresh?: number; // Timestamp of the last manual refresh
    _lastMetaRefresh?: number; // Timestamp of the last successful Meta refresh
    _dashboardInitialSetup?: boolean; // Flag to track dashboard initial setup phase
  }
}

// Initialize window properties if they don't exist
if (typeof window !== 'undefined') {
  window._activeFetchIds = window._activeFetchIds || new Set();
  window._metaFetchLock = window._metaFetchLock || false;
  window._lastManualRefresh = window._lastManualRefresh || 0;
  window._lastMetaRefresh = window._lastMetaRefresh || 0;
  window._dashboardInitialSetup = window._dashboardInitialSetup || false;
}

// Helper function to check if a fetch is in progress globally - COPIED FROM HOME PAGE
function isMetaFetchInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  // Check both the lock and active fetch IDs
  return window._metaFetchLock === true || (window._activeFetchIds?.size ?? 0) > 0;
}

// Helper function to acquire a fetch lock - COPIED FROM HOME PAGE
function acquireMetaFetchLock(fetchId: number | string): boolean {
  if (typeof window === 'undefined') return true; // Assume success server-side or if window is not defined

  // If a lock is already active by another fetch, don't allow a new one
  if (window._metaFetchLock === true && !window._activeFetchIds?.has(fetchId)) {
    console.log(`[MarketingAssistant] 🔒 Meta Fetch lock active by another process, rejecting new fetchId: ${fetchId}`);
    return false;
  }
  
  window._metaFetchLock = true; // Set the global lock
  window._activeFetchIds?.add(fetchId); // Register this fetchId
  
  console.log(`[MarketingAssistant] 🔐 Acquired Meta fetch lock for fetchId: ${fetchId}. Active fetches: ${window._activeFetchIds?.size}`);
  return true;
}

// Helper function to release a fetch lock - COPIED FROM HOME PAGE
function releaseMetaFetchLock(fetchId: number | string): void {
  if (typeof window === 'undefined') return;
  
  window._activeFetchIds?.delete(fetchId); // Remove this fetch ID
  
  // If no other active fetches, release the global lock
  if ((window._activeFetchIds?.size ?? 0) === 0) {
    window._metaFetchLock = false;
    console.log(`[MarketingAssistant] 🔓 Released Meta fetch lock (last fetchId: ${fetchId}). No active fetches.`);
  } else {
    console.log(`[MarketingAssistant] 🔒 Meta Lock maintained for ${window._activeFetchIds?.size} active fetches (ended: ${fetchId})`);
  }
}

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

export default function MarketingAssistantPage() {
  const { selectedBrandId } = useBrandContext()
  const { agencySettings } = useAgency()
  const pathname = usePathname()
  
  // Ensure page starts at top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  
  // Centralized loading state management
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [loadingPhase, setLoadingPhase] = useState<string>('Initializing Marketing Assistant')
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  // Remove old loading state
  // const [isLoadingPage, setIsLoadingPage] = useState(true)
  
  const [metaMetrics, setMetaMetrics] = useState<MetaMetrics>(defaultMetrics)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  })
  const [lastPageRefresh, setLastPageRefresh] = useState<Date | null>(null)
  const [isRefreshingAll, setIsRefreshingAll] = useState(false)
  const [refreshCooldown, setRefreshCooldown] = useState(false)

  // Pre-loaded data for widgets
  const [preloadedData, setPreloadedData] = useState({
    metaMetrics: defaultMetrics,
    dailyReport: null as any,
    campaigns: [] as any[],
    adCreatives: [] as any[],
    performanceData: [] as any[],
    aiConsultantReady: false
  })

  // Auto-update date range at midnight to match blended widgets behavior
  useEffect(() => {
    const updateDateRangeAtMidnight = () => {
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
      const timeUntilMidnight = midnight.getTime() - now.getTime()
      
      console.log('[MarketingAssistant] Setting up midnight timer:', {
        currentTime: now.toLocaleTimeString(),
        midnightTime: midnight.toLocaleTimeString(),
        millisecondsUntilMidnight: timeUntilMidnight,
        hoursUntilMidnight: (timeUntilMidnight / 1000 / 60 / 60).toFixed(2)
      })
      
      const timeoutId = setTimeout(() => {
        console.log('[MarketingAssistant] 🌙 MIDNIGHT REACHED - Resetting to today and forcing data refresh')
        const today = new Date()
        setDateRange({
          from: today,
          to: today
        })
        
        // Clear any cached data and force refresh
        hasInitialDataLoaded.current = false
        
        // Trigger full data reload for new day with today's date
        console.log('[MarketingAssistant] 🔄 Midnight transition: Forcing fresh data load for today')
        loadAllData()
        
        // Dispatch event to notify other widgets about new day transition
        window.dispatchEvent(new CustomEvent('newDayDetected', {
          detail: { 
            brandId: selectedBrandId, 
            source: 'marketing-assistant-midnight-reset',
            timestamp: Date.now()
          }
        }))
        
        // Set up next midnight update
        updateDateRangeAtMidnight()
      }, timeUntilMidnight)
      
      return () => clearTimeout(timeoutId)
    }
    
    // Set up the initial midnight update
    const cleanup = updateDateRangeAtMidnight()
    
    // Also check if we need to update on mount (in case user loads page right at midnight)
    const now = new Date()
    const currentDateString = now.toISOString().split('T')[0]
    const currentRangeString = dateRange?.from?.toISOString().split('T')[0]
    
    if (currentRangeString !== currentDateString) {
      console.log('[MarketingAssistant] Date range out of sync with current date - updating to today')
      setDateRange({
        from: now,
        to: now
      })
    }
    
    return cleanup
  }, [])



  // Refs for tracking state
  const hasFetchedMetaData = useRef(false)
  const lastFetchedDateRange = useRef<{ from?: Date; to?: Date }>({})
  const hasInitialDataLoaded = useRef(false)
  const isInitialLoadInProgress = useRef(false)

  // Helper function to calculate previous period date range - matches home page
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

  // Helper function to calculate percentage change - matches home page logic
  const calculatePercentChange = useCallback((current: number, previous: number): number | null => {
    if (previous === 0) {
      // Return null when there's no previous data to compare against
      return null; // This will display as "N/A" in the UI
    }
    if (current === previous) { // Handle cases where current and previous are the same
      return 0;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
  }, [])

  // Main sync function - database-based refresh like home page
  const syncMetaInsights = useCallback(async () => {
    if (!selectedBrandId || !dateRange?.from || !dateRange?.to) {
      console.error("[MarketingAssistant] Cannot sync data - missing brand ID or date range")
      return
    }
    
    const refreshId = `marketing-meta-sync-${Date.now()}`
    
    // Use the same locking mechanism for consistency
    if (isMetaFetchInProgress()) {
      console.log(`[MarketingAssistant] ⚠️ Meta sync skipped - fetch already in progress for refreshId: ${refreshId}`)
      toast.info("Meta data is already refreshing. Please wait.", { id: "meta-refresh-toast" })
      return
    }
    
    if (!acquireMetaFetchLock(refreshId)) {
      console.log(`[MarketingAssistant] ⛔ Failed to acquire global lock for Meta sync refreshId: ${refreshId}`)
      toast.error("Failed to initiate Meta data refresh. Please try again.", { id: "meta-refresh-toast" })
      return
    }
    
    console.log("[MarketingAssistant] Syncing Meta insights data through database...")
    
    // Set loading states
    setIsLoadingMetrics(true)
    setIsRefreshingData(true)
    
    toast.loading("Refreshing Meta data...", { id: "meta-refresh-toast", duration: 15000 })
    
    try {
      // Format dates in YYYY-MM-DD format using local timezone
      const startDate = dateToLocalDateString(dateRange.from)
      const endDate = dateToLocalDateString(dateRange.to)
      
      // Step 1: Sync fresh data from Meta API to database
      console.log(`[MarketingAssistant] 🚀 Step 1: Syncing Meta insights to database (refreshId: ${refreshId})`)
      const response = await fetch('/api/meta/insights/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Refresh-ID': refreshId
        },
        body: JSON.stringify({
          brandId: selectedBrandId,
          startDate,
          endDate,
          forceRefresh: true
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sync Meta insights')
      }
      
      const result = await response.json()
      
      if (result.success) {
        console.log(`[MarketingAssistant] ✅ Meta insights synced successfully - synced ${result.count || 0} records from Meta (refreshId: ${refreshId})`)
        
        // Step 2: Now fetch the refreshed data from database
        console.log(`[MarketingAssistant] 🚀 Step 2: Fetching refreshed Meta data (refreshId: ${refreshId})`)
        await fetchMetaDataFromDatabase(refreshId)
        
        toast.success("Meta data refreshed!", { id: "meta-refresh-toast" })
        window._lastMetaRefresh = Date.now() // Update timestamp of last successful refresh
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
          detail: { 
            brandId: selectedBrandId, 
            timestamp: Date.now(),
            forceRefresh: true,
            syncedRecords: result.count || 0,
            source: 'MarketingAssistantSync',
            refreshId
          }
        }))
        
        // Also dispatch completion event for global refresh button
        window.dispatchEvent(new CustomEvent('data-refresh-complete', {
          detail: {
            brandId: selectedBrandId,
            platform: 'meta',
            timestamp: Date.now(),
            source: 'MarketingAssistantSync'
          }
        }))
        
        console.log(`[MarketingAssistant] ✅ FULL Meta sync completed successfully (refreshId: ${refreshId})`)
      } else {
        throw new Error(result.error || 'Failed to sync Meta insights')
      }
    } catch (error) {
      console.error(`[MarketingAssistant] Error syncing Meta insights (refreshId: ${refreshId}):`, error)
      toast.error("Failed to sync Meta insights", {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000,
        id: "meta-refresh-toast"
      })
    } finally {
      // Clear loading states
      setIsLoadingMetrics(false)
      setIsRefreshingData(false)
      releaseMetaFetchLock(refreshId)
    }
  }, [selectedBrandId, dateRange])

  // Fetch Meta data from database after sync
  const fetchMetaDataFromDatabase = useCallback(async (refreshId?: string) => {
    if (!selectedBrandId || !dateRange?.from || !dateRange?.to) {
      console.log("[MarketingAssistant] Skipping Meta data fetch from database: Missing brandId or dateRange")
      return
    }

    try {
      console.log(`[MarketingAssistant] 🔄 Fetching Meta data from database (refreshId: ${refreshId || 'standalone'})`)

      // Current period params with proper timezone handling
      const params = new URLSearchParams({ brandId: selectedBrandId })
      if (dateRange.from) params.append('from', dateToLocalDateString(dateRange.from))
      if (dateRange.to) params.append('to', dateToLocalDateString(dateRange.to))
      
      // Apply cache busting to ensure fresh data from database
      params.append('bypass_cache', 'true')
      params.append('force_load', 'true')
      params.append('refresh', 'true')
      
      const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to)
      const prevParams = new URLSearchParams({ brandId: selectedBrandId })
      if (prevFrom) prevParams.append('from', prevFrom)
      if (prevTo) prevParams.append('to', prevTo)
      
      prevParams.append('bypass_cache', 'true')
      prevParams.append('force_load', 'true')
      prevParams.append('refresh', 'true')
      
      const currentResponse = await fetch(`/api/metrics/meta?${params.toString()}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Refresh-ID': refreshId || 'standalone'
        }
      })
      
      const prevResponse = await fetch(`/api/metrics/meta?${prevParams.toString()}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Refresh-ID': refreshId || 'standalone'
        }
      })
      
      if (!currentResponse.ok) {
        const errorData = await currentResponse.json().catch(() => ({ error: "Unknown error fetching current Meta data" }))
        console.error(`[MarketingAssistant] Failed to fetch current period Meta data from database: ${currentResponse.status}`, errorData)
        throw new Error(errorData.error || `Failed to fetch current period Meta data: ${currentResponse.status}`)
      }
      
      if (!prevResponse.ok) {
        const errorData = await prevResponse.json().catch(() => ({ error: "Unknown error fetching previous Meta data" }))
        console.error(`[MarketingAssistant] Failed to fetch previous period Meta data from database: ${prevResponse.status}`, errorData)
        throw new Error(errorData.error || `Failed to fetch previous period Meta data: ${prevResponse.status}`)
      }
      
      const currentData = await currentResponse.json()
      const previousData = await prevResponse.json()
      
      console.log(`[MarketingAssistant] Fetched Meta data from database for current period:`, {
        adSpend: currentData.adSpend,
        impressions: currentData.impressions,
        clicks: currentData.clicks,
        conversions: currentData.conversions,
        roas: currentData.roas
      })

      console.log(`[MarketingAssistant] Previous period data:`, {
        adSpend: previousData.adSpend,
        impressions: previousData.impressions,
        clicks: previousData.clicks,
        conversions: previousData.conversions,
        roas: previousData.roas
      })

      // Calculate growth values locally for better accuracy
      const adSpendGrowth = calculatePercentChange(currentData.adSpend || 0, previousData.adSpend || 0) ?? 0
      const impressionGrowth = calculatePercentChange(currentData.impressions || 0, previousData.impressions || 0) ?? 0
      const clickGrowth = calculatePercentChange(currentData.clicks || 0, previousData.clicks || 0) ?? 0
      const conversionGrowth = calculatePercentChange(currentData.conversions || 0, previousData.conversions || 0) ?? 0
      const roasGrowth = calculatePercentChange(currentData.roas || 0, previousData.roas || 0) ?? 0
      const ctrGrowth = calculatePercentChange(currentData.ctr || 0, previousData.ctr || 0) ?? 0
      const cpcGrowth = calculatePercentChange(currentData.cpc || 0, previousData.cpc || 0) ?? 0
      const cprGrowth = calculatePercentChange(currentData.costPerResult || 0, previousData.costPerResult || 0) ?? 0

      console.log(`[MarketingAssistant] Calculated growth values:`, {
        adSpendGrowth,
        impressionGrowth,
        clickGrowth,
        conversionGrowth,
        roasGrowth,
        ctrGrowth,
        cpcGrowth,
        cprGrowth
      })

      // Update metaMetrics state with database data
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
        adSpendGrowth: adSpendGrowth,
        impressionGrowth: impressionGrowth,
        clickGrowth: clickGrowth,
        conversionGrowth: conversionGrowth,
        roasGrowth: roasGrowth,
        ctrGrowth: ctrGrowth,
        cpcGrowth: cpcGrowth,
        cprGrowth: cprGrowth,
        previousAdSpend: previousData.adSpend || 0,
        previousImpressions: previousData.impressions || 0,
        previousClicks: previousData.clicks || 0,
        previousConversions: previousData.conversions || 0,
        previousRoas: previousData.roas || 0,
        previousCtr: previousData.ctr || 0,
        previousCpc: previousData.cpc || 0
      }
      
      setMetaMetrics(newMetrics)
      
      console.log(`[MarketingAssistant] ✅ Meta data updated from database (refreshId: ${refreshId || 'standalone'})`)
      
      return newMetrics // Return the data for use in centralized loading
    } catch (error) {
      console.error(`[MarketingAssistant] Error fetching Meta data from database:`, error)
      setMetaMetrics(defaultMetrics)
      return defaultMetrics
    }
  }, [selectedBrandId, dateRange, getPreviousPeriodDates, calculatePercentChange])

  // Centralized data loading coordinator - moved here after helper functions are declared
  const loadAllData = useCallback(async () => {
    if (!selectedBrandId || !dateRange?.from || !dateRange?.to) {
      console.log("[MarketingAssistant] Missing required data for loading")
      return
    }

    console.log('[MarketingAssistant] Starting centralized data loading...')
    setIsDataLoading(true)
    setLoadingProgress(0)

    try {
      // Phase 1: Loading Meta Data
      setLoadingPhase('Loading Meta advertising data...')
      setLoadingProgress(15)
      
      await new Promise(resolve => setTimeout(resolve, 800)) // Smooth UX
      
      // Load Meta metrics
      const metaData = await fetchMetaDataFromDatabase('centralized-load')
      
      setLoadingProgress(30)
      setLoadingPhase('Syncing latest performance data...')
      
      await new Promise(resolve => setTimeout(resolve, 600))
      
      // Sync fresh Meta data
      await syncMetaInsights()
      
      setLoadingProgress(50)
      setLoadingPhase('AI analyzing campaign performance...')
      
      await new Promise(resolve => setTimeout(resolve, 900))
      
      // Phase 2: Load AI Daily Report and Performance Data in parallel
      try {
        // Always use today's date for campaigns (like other widgets) to ensure fresh daily data
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        
        console.log(`[MarketingAssistant] Fetching campaigns for TODAY: ${todayStr} (ignoring dateRange to ensure fresh daily data)`)
        
        const [dailyReportResponse, campaignsResponse] = await Promise.all([
          fetch('/api/ai/daily-report', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              brandId: selectedBrandId,
              forceRegenerate: false
            }),
          }),
          fetch(`/api/meta/campaigns?brandId=${selectedBrandId}&limit=100&sortBy=spent&sortOrder=desc&from=${todayStr}&to=${todayStr}&forceRefresh=true&t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          })
        ])
        
        let reportData = null
        let campaignsData = []
        let performanceData = []
        
        if (dailyReportResponse.ok) {
          const data = await dailyReportResponse.json()
          if (data.success && data.report) {
            reportData = data.report
            // Extract performance data from daily report
            performanceData = data.report?.weeklyPerformance?.map((day: any) => ({
              day: day.day,
              date: day.date,
              meta: {
                spend: day.spend || 0,
                roas: day.roas || 0,
                impressions: day.impressions || 0,
                clicks: day.clicks || 0,
                conversions: day.conversions || 0
              },
              tiktok: { spend: 0, roas: 0, impressions: 0, clicks: 0, conversions: 0 },
              google: { spend: 0, roas: 0, impressions: 0, clicks: 0, conversions: 0 }
            })) || []
          }
        }
        
        if (campaignsResponse.ok) {
          const data = await campaignsResponse.json()
          if (data.campaigns && Array.isArray(data.campaigns)) {
            campaignsData = data.campaigns.map((campaign: any) => ({
              ...campaign, 
              platform: 'meta'
            }))
          }
        }
        
        // Now load ad creative data using the campaigns we just fetched
        let allAds: any[] = []
        if (campaignsData.length > 0) {
          setLoadingProgress(70)
          setLoadingPhase('Loading ad creative insights...')
          await new Promise(resolve => setTimeout(resolve, 700))
          
          console.log('[MarketingAssistant] Loading ad creatives for campaigns...')
          
          // Use the same logic as AdCreativeBreakdown component
          for (const campaign of campaignsData.slice(0, 5)) { // Limit to first 5 campaigns for performance
            try {
              const adSetsResponse = await fetch(`/api/meta/adsets?brandId=${selectedBrandId}&campaignId=${campaign.campaign_id}&t=${Date.now()}`, {
                method: 'GET',
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                }
              })
              
              if (!adSetsResponse.ok) continue
              
              const adSetsData = await adSetsResponse.json()
              if (!adSetsData.success || !adSetsData.adSets) continue
              
              for (const adSet of adSetsData.adSets.slice(0, 3)) { // Limit adsets per campaign
                try {
                  // Try current date first
                  let adsResponse = await fetch('/api/meta/ads/direct-fetch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      brandId: selectedBrandId,
                      adsetId: adSet.adset_id,
                      forceRefresh: false,
                      dateRange: {
                        from: dateToLocalDateString(dateRange.from),
                        to: dateToLocalDateString(dateRange.to)
                      }
                    })
                  })

                  let adsData = await adsResponse.json()
                  
                  // If no data for current date range, try yesterday (same logic as AdCreativeBreakdown)
                  if (!adsData.success || !adsData.ads || adsData.ads.length === 0) {
                    const yesterday = new Date(dateRange.to)
                    yesterday.setDate(yesterday.getDate() - 1)
                    
                    adsResponse = await fetch('/api/meta/ads/direct-fetch', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        brandId: selectedBrandId,
                        adsetId: adSet.adset_id,
                        forceRefresh: false,
                        dateRange: {
                          from: dateToLocalDateString(yesterday),
                          to: dateToLocalDateString(yesterday)
                        }
                      })
                    })
                    
                    adsData = await adsResponse.json()
                  }

                  if (adsData.success && adsData.ads && adsData.ads.length > 0) {
                    allAds.push(...adsData.ads)
                  }
                } catch (error) {
                  console.error('[MarketingAssistant] Error loading ads for adset:', adSet.adset_id, error)
                }
              }
            } catch (error) {
              console.error('[MarketingAssistant] Error loading adsets for campaign:', campaign.campaign_id, error)
            }
          }
          console.log('[MarketingAssistant] Loaded ad creatives:', allAds.length)
        }
        
        setPreloadedData(prev => ({
          ...prev,
          dailyReport: reportData,
          campaigns: campaignsData,
          performanceData: performanceData,
          adCreatives: allAds
        }))
      } catch (error) {
        console.error('[MarketingAssistant] Error loading AI reports and campaigns:', error)
      }
      
      setLoadingProgress(85)
      setLoadingPhase('Preparing AI marketing consultant...')
      
      await new Promise(resolve => setTimeout(resolve, 600))
      
      // Phase 4: Finalize all data
      setPreloadedData(prev => ({
        ...prev,
        metaMetrics: metaData || metaMetrics,
        aiConsultantReady: true
      }))
      
      setLoadingProgress(95)
      setLoadingPhase('Finalizing dashboard...')
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setLoadingProgress(100)
      setLoadingPhase('Ready!')
      
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // All data loaded - show the dashboard
      setIsDataLoading(false)
      hasInitialDataLoaded.current = true
      setLastPageRefresh(new Date())
      
      // Scroll to top when data is loaded to ensure proper positioning
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
      
      console.log('[MarketingAssistant] ✅ All data loaded successfully!')
      
    } catch (error) {
      console.error('[MarketingAssistant] Error during data loading:', error)
      // Still show the dashboard even if some data failed
      setIsDataLoading(false)
      toast.error('Some data failed to load, but dashboard is still available')
    }
  }, [selectedBrandId, dateRange, syncMetaInsights, fetchMetaDataFromDatabase, metaMetrics])

  // Debug function to test midnight reset manually - remove in production
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugMarketingAssistantMidnightReset = () => {
        console.log('[MarketingAssistant] DEBUG: Manually triggering midnight reset')
        
        // Clear date range and force to today
        const today = new Date()
        setDateRange({
          from: today,
          to: today
        })
        
        // Clear cached data
        hasInitialDataLoaded.current = false
        
        // Force full reload with today's date
        console.log('[MarketingAssistant] 🔄 Debug reset: Forcing fresh data load for today')
        loadAllData()
        
        // Dispatch new day event
        window.dispatchEvent(new CustomEvent('newDayDetected', {
          detail: { 
            brandId: selectedBrandId, 
            source: 'debug-marketing-assistant-midnight-reset',
            timestamp: Date.now()
          }
        }))
        
        console.log('[MarketingAssistant] DEBUG: Midnight reset simulation complete')
      }
    }
  }, [selectedBrandId, loadAllData])

  // Initial data load and refresh logic
  useEffect(() => {
    // Skip if we're still in the dashboard's initial setup phase
    if (typeof window !== 'undefined' && window._dashboardInitialSetup) {
      console.log("[MarketingAssistant] Skipping data load - dashboard still in initial setup phase")
      return
    }
    
    // Check if we've already done the initial load for this date range
    const dateRangeChanged = dateRange?.from !== lastFetchedDateRange.current.from || 
                           dateRange?.to !== lastFetchedDateRange.current.to
    
    if (selectedBrandId && dateRange?.from && dateRange?.to && (dateRangeChanged || !hasInitialDataLoaded.current)) {
      // Prevent duplicate initial loads
      if (isInitialLoadInProgress.current && !dateRangeChanged) {
        console.log("[MarketingAssistant] Initial load already in progress, skipping duplicate call")
        return
      }
      
      console.log("[MarketingAssistant] useEffect detected change in brandId or dateRange. Starting centralized data loading.")
      isInitialLoadInProgress.current = true
      
      // Update the last fetched date range
      lastFetchedDateRange.current = { from: dateRange.from, to: dateRange.to }
      
      // Start the centralized loading process
      loadAllData().finally(() => {
        // Clear the in-progress flag after completion
        setTimeout(() => {
          isInitialLoadInProgress.current = false
        }, 2000)
      })
    }
  }, [selectedBrandId, dateRange, loadAllData])

  // Refresh all widgets function - updated for centralized loading
  const refreshAllWidgets = useCallback(async () => {
    if (!selectedBrandId || isRefreshingAll || refreshCooldown) {
      if (refreshCooldown) {
        toast.error("Please wait before refreshing again", { 
          description: "You can refresh every 30 seconds" 
        })
      }
      return
    }

    setIsRefreshingAll(true)
    setRefreshCooldown(true)
    
    // Set cooldown timer
    setTimeout(() => {
      setRefreshCooldown(false)
    }, 30000) // 30 second cooldown

    toast.loading("Refreshing all widgets...", { id: "refresh-all-toast" })

    try {
      // Use centralized loading for refresh but don't show full loading screen
      setLoadingPhase('Refreshing Meta data...')
      
      // Trigger Meta sync first
      await syncMetaInsights()
      
      setLoadingPhase('Updating AI insights...')
      
      // Refresh AI Daily Report
      try {
        const response = await fetch('/api/ai/daily-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brandId: selectedBrandId,
            forceRegenerate: true
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          setPreloadedData(prev => ({
            ...prev,
            dailyReport: data.report
          }))
        }
      } catch (error) {
        console.error('[MarketingAssistant] Error refreshing daily report:', error)
      }
      
      // Dispatch event to refresh all widgets
      window.dispatchEvent(new CustomEvent('refresh-all-widgets', {
        detail: {
          brandId: selectedBrandId,
          timestamp: Date.now(),
          source: 'MarketingAssistantHeader',
          preloadedData: preloadedData
        }
      }))
      
      setLastPageRefresh(new Date())
      toast.success("All widgets refreshed!", { id: "refresh-all-toast" })
    } catch (error) {
      console.error('[MarketingAssistant] Error refreshing widgets:', error)
      toast.error("Failed to refresh some widgets", { id: "refresh-all-toast" })
    } finally {
      setIsRefreshingAll(false)
    }
  }, [selectedBrandId, isRefreshingAll, refreshCooldown, syncMetaInsights, preloadedData])

  // Listen for global refresh events - updated for centralized system
  useEffect(() => {
    const handleGlobalRefresh = (event: CustomEvent) => {
      console.log("[MarketingAssistant] Received global refresh event:", event.detail)
      if (event.detail?.brandId === selectedBrandId) {
        console.log("[MarketingAssistant] Global refresh event matches current brandId. Triggering refresh.")
        
        // For global refreshes, do a quick refresh without full loading screen
        if (!isRefreshingAll) {
          setLoadingPhase('Syncing latest data...')
          syncMetaInsights().then(() => {
            setLoadingPhase('Ready!')
          })
        }
      } else {
        console.log("[MarketingAssistant] Global refresh event not for this brand, skipping.")
      }
    }

    const handleNewDayDetected = (event: CustomEvent) => {
      console.log("[MarketingAssistant] 🌅 New day detected event received:", event.detail)
      if (event.detail?.brandId === selectedBrandId) {
        console.log("[MarketingAssistant] 📅 New day transition detected for current brand. Triggering full reload.")
        
        // For new day, trigger full reload
        hasInitialDataLoaded.current = false
        loadAllData()
      } else {
        console.log("[MarketingAssistant] New day event not for this brand, skipping.")
      }
    }

    const handleGlobalRefreshAll = (event: CustomEvent) => {
      console.log("[MarketingAssistant] Received global-refresh-all event:", event.detail)
      if (event.detail?.brandId === selectedBrandId && event.detail?.platforms?.meta) {
        console.log("[MarketingAssistant] Global refresh all - triggering refresh")
        if (!isRefreshingAll) {
          refreshAllWidgets()
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('metaDataRefreshed', handleGlobalRefresh as EventListener)
      window.addEventListener('force-meta-refresh', handleGlobalRefresh as EventListener)
      window.addEventListener('refresh-all-widgets', handleGlobalRefreshAll as EventListener)
      window.addEventListener('global-refresh-all', handleGlobalRefreshAll as EventListener)
      window.addEventListener('newDayDetected', handleNewDayDetected as EventListener)
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('metaDataRefreshed', handleGlobalRefresh as EventListener)
        window.removeEventListener('force-meta-refresh', handleGlobalRefresh as EventListener)
        window.removeEventListener('refresh-all-widgets', handleGlobalRefreshAll as EventListener)
        window.removeEventListener('global-refresh-all', handleGlobalRefreshAll as EventListener)
        window.removeEventListener('newDayDetected', handleNewDayDetected as EventListener)
      }
    }
  }, [selectedBrandId, syncMetaInsights, refreshAllWidgets, isRefreshingAll, loadAllData])

  // Show loading state with enhanced progress display
  if (isDataLoading) {
    return (
      <div className="w-full h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden">
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
              <span className="text-white font-bold text-lg">[bm]</span>
            </div>
          </div>
          
          {/* Loading title */}
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Loading Marketing Assistant
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
              <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 15 ? 'text-gray-300' : ''}`}>
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 30 ? 'bg-green-400' : loadingProgress >= 15 ? 'bg-white/60' : 'bg-white/20'}`}></div>
                <span>Loading Meta advertising data</span>
              </div>
              <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 30 ? 'text-gray-300' : ''}`}>
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 50 ? 'bg-green-400' : loadingProgress >= 30 ? 'bg-white/60' : 'bg-white/20'}`}></div>
                <span>Syncing latest performance data</span>
              </div>
              <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 50 ? 'text-gray-300' : ''}`}>
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 70 ? 'bg-green-400' : loadingProgress >= 50 ? 'bg-white/60' : 'bg-white/20'}`}></div>
                <span>AI analyzing campaign performance</span>
              </div>
              <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 70 ? 'text-gray-300' : ''}`}>
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 85 ? 'bg-green-400' : loadingProgress >= 70 ? 'bg-white/60' : 'bg-white/20'}`}></div>
                <span>Loading ad creative insights</span>
              </div>
              <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 85 ? 'text-gray-300' : ''}`}>
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 95 ? 'bg-green-400' : loadingProgress >= 85 ? 'bg-white/60' : 'bg-white/20'}`}></div>
                <span>Preparing AI marketing consultant</span>
              </div>
              <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 95 ? 'text-gray-300' : ''}`}>
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 100 ? 'bg-green-400' : loadingProgress >= 95 ? 'bg-white/60' : 'bg-white/20'}`}></div>
                <span>Finalizing dashboard</span>
              </div>
            </div>
          
          {/* Subtle loading tip */}
          <div className="mt-8 text-xs text-gray-500 italic">
            Loading all data behind the scenes for instant widget display...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 mb-12">
      {!selectedBrandId ? (
        <div className="text-center py-12 px-6">
          <p className="text-gray-400 text-lg">Please select a brand to view marketing metrics</p>
        </div>
      ) : (
        <>
          {/* Page Header - Full Width */}
          <div className="w-full bg-gradient-to-r from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] border-b border-[#222] py-6">
            <div className="px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                flex items-center justify-center border border-white/10">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">Marketing Assistant</h1>
                    <p className="text-gray-400 text-base">
                      {lastPageRefresh ? (
                        <>
                          Last refreshed: {lastPageRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </>
                      ) : (
                        'AI-powered marketing insights and recommendations'
                      )}
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={refreshAllWidgets}
                  disabled={isRefreshingAll || refreshCooldown}
                  variant="outline"
                  size="sm"
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a] 
                           hover:border-white/20 px-4 py-2 rounded-xl font-medium transition-all 
                           duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRefreshingAll ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : refreshCooldown ? (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Cooldown
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                      Refresh All
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Meta Connection Status Banner */}
          <MetaConnectionStatus 
            brandId={selectedBrandId} 
            className="px-6" 
          />

          {/* Main Content Grid - All widgets now show with preloaded data */}
          <div className="px-6 space-y-8">
            {/* Top Section - Blended Widgets and Advertising Report */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch min-h-[500px]">
              {/* Left: Blended Widgets Table - 50% width */}
              <div className="h-full">
                <BlendedWidgetsTable 
                  metaMetrics={metaMetrics}
                  // Remove loading props
                  // isLoadingMetrics={isLoadingMetrics}
                  // isRefreshingData={isRefreshingData}
                />
              </div>

              {/* Right: Advertising Report - 50% width */}
              <div className="h-full">
                <AIDailyReport preloadedReport={preloadedData.dailyReport} />
              </div>
            </div>

            {/* Middle Section - Campaign Management at 100% width */}
            <div className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-lg">
              <div className="p-6" style={{ minHeight: '600px', maxHeight: '800px', overflow: 'auto' }}>
                <PlatformCampaignWidget preloadedCampaigns={preloadedData.campaigns} />
              </div>
            </div>

            {/* Bottom Section - Ad Creative and AI Consultant */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch min-h-[400px]">
              {/* Left Column - Ad Creative and Performance Chart */}
              <div className="space-y-6 h-full">
                <AdCreativeBreakdown preloadedAds={preloadedData.adCreatives} />
                <PerformanceChart 
                  preloadedPerformanceData={preloadedData.performanceData}
                  // Remove loading prop
                  // loading={isLoadingMetrics || isRefreshingData} 
                />
              </div>

              {/* Right Column - AI Marketing Consultant */}
              <div className="h-full">
                <AIMarketingConsultant 
                  // Remove loading prop
                  // loading={isLoadingMetrics || isRefreshingData} 
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 