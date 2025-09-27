"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { MetricCard } from "@/components/metrics/MetricCard"
import { GridOverlay } from "@/components/GridOverlay"
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
import PlatformCampaignWidget from "@/components/campaign-management/PlatformCampaignWidget"
import AIOptimizationDashboard from "@/components/campaign-management/AIOptimizationDashboard"
import AdCreativeBreakdown from "@/components/campaign-management/AdCreativeBreakdown"

import PerformanceChart from "@/components/campaign-management/PerformanceChart"
import BlendedWidgetsTable from "@/components/campaign-management/BlendedWidgetsTable"


import { MetaConnectionStatus } from "@/components/MetaConnectionStatus"
import { Button } from "@/components/ui/button"
import { RefreshCw, Brain, Clock, Check } from "lucide-react"

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
    // console.log(`[MarketingAssistant] 🔒 Meta Fetch lock active by another process, rejecting new fetchId: ${fetchId}`);
    return false;
  }
  
  window._metaFetchLock = true; // Set the global lock
  window._activeFetchIds?.add(fetchId); // Register this fetchId
  
  // console.log(`[MarketingAssistant] 🔐 Acquired Meta fetch lock for fetchId: ${fetchId}. Active fetches: ${window._activeFetchIds?.size}`);
  return true;
}

// Helper function to release a fetch lock - COPIED FROM HOME PAGE
function releaseMetaFetchLock(fetchId: number | string): void {
  if (typeof window === 'undefined') return;
  
  window._activeFetchIds?.delete(fetchId); // Remove this fetch ID
  
  // If no other active fetches, release the global lock
  if ((window._activeFetchIds?.size ?? 0) === 0) {
    window._metaFetchLock = false;
    // console.log(`[MarketingAssistant] 🔓 Released Meta fetch lock (last fetchId: ${fetchId}). No active fetches.`);
  } else {
    // console.log(`[MarketingAssistant] 🔒 Meta Lock maintained for ${window._activeFetchIds?.size} active fetches (ended: ${fetchId})`);
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

  // Data backfill hook for gap detection
  const { status: backfillStatus, checkForGaps, performBackfill } = useDataBackfill()

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
      
      // console.log('[MarketingAssistant] Setting up midnight timer:', {
        // currentTime: now.toLocaleTimeString(),
        // midnightTime: midnight.toLocaleTimeString(),
        // millisecondsUntilMidnight: timeUntilMidnight,
        // hoursUntilMidnight: (timeUntilMidnight / 1000 / 60 / 60).toFixed(2)
      // })
      
      const timeoutId = setTimeout(() => {
        // console.log('[MarketingAssistant] 🌙 MIDNIGHT REACHED - Resetting to today and forcing data refresh')
        const today = new Date()
        setDateRange({
          from: today,
          to: today
        })
        
        // Clear any cached data and force refresh
        hasInitialDataLoaded.current = false
        
        // Trigger full data reload for new day with today's date
        // console.log('[MarketingAssistant] 🔄 Midnight transition: Forcing fresh data load for today')
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
      // console.log('[MarketingAssistant] Date range out of sync with current date - updating to today')
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
  const lastFetchedBrandId = useRef<string | null>(null)
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
      return
    }
    
    const refreshId = `marketing-meta-sync-${Date.now()}`
    
    // Use the same locking mechanism for consistency
    if (isMetaFetchInProgress()) {
      // console.log(`[MarketingAssistant] ⚠️ Meta sync skipped - fetch already in progress for refreshId: ${refreshId}`)
      toast.info("Meta data is already refreshing. Please wait.", { id: "meta-refresh-toast" })
      return
    }
    
    if (!acquireMetaFetchLock(refreshId)) {
      // console.log(`[MarketingAssistant] ⛔ Failed to acquire global lock for Meta sync refreshId: ${refreshId}`)
      toast.error("Failed to initiate Meta data refresh. Please try again.", { id: "meta-refresh-toast" })
      return
    }
    
    // console.log("[MarketingAssistant] Syncing Meta insights data through database...")
    
    // Set loading states
    setIsLoadingMetrics(true)
    setIsRefreshingData(true)
    
    toast.loading("Refreshing Meta data...", { id: "meta-refresh-toast", duration: 15000 })
    
    try {
      // Format dates in YYYY-MM-DD format using local timezone
      const startDate = dateToLocalDateString(dateRange.from)
      const endDate = dateToLocalDateString(dateRange.to)
      
      // Step 1: Sync fresh data from Meta API to database
      // console.log(`[MarketingAssistant] 🚀 Step 1: Syncing Meta insights to database (refreshId: ${refreshId})`)
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
        // console.log(`[MarketingAssistant] ✅ Meta insights synced successfully - synced ${result.count || 0} records from Meta (refreshId: ${refreshId})`)
        
        // Step 2: Now fetch the refreshed data from database
        // console.log(`[MarketingAssistant] 🚀 Step 2: Fetching refreshed Meta data (refreshId: ${refreshId})`)
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
        
        // console.log(`[MarketingAssistant] ✅ FULL Meta sync completed successfully (refreshId: ${refreshId})`)
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
      // console.log("[MarketingAssistant] Skipping Meta data fetch from database: Missing brandId or dateRange")
      return
    }

    try {
      // console.log(`[MarketingAssistant] 🔄 Fetching Meta data from database (refreshId: ${refreshId || 'standalone'})`)

      // Current period params with proper timezone handling
      const params = new URLSearchParams({ brandId: selectedBrandId })
      if (dateRange.from) params.append('from', dateToLocalDateString(dateRange.from))
      if (dateRange.to) params.append('to', dateToLocalDateString(dateRange.to))
      
      // Apply cache busting to ensure fresh data from database
      params.append('bypass_cache', 'true')
      params.append('force_load', 'true')
      params.append('refresh', 'true')
      
      // 🔥 SMART CACHE BUSTING: If we're viewing yesterday's data or a date range that includes yesterday,
      // force refresh to ensure we get the complete day's data (not just what was cached at 6pm)
      const today = dateToLocalDateString(new Date())
      const yesterday = dateToLocalDateString(new Date(Date.now() - 24 * 60 * 60 * 1000))
      const currentFromStr = dateRange.from ? dateToLocalDateString(dateRange.from) : ''
      const currentToStr = dateRange.to ? dateToLocalDateString(dateRange.to) : ''
      const isViewingYesterday = currentFromStr === yesterday || currentToStr === yesterday || 
                                 (currentFromStr <= yesterday && currentToStr >= yesterday)
      
      if (isViewingYesterday) {
        params.append('force_refresh', 'true')
        params.append('reason', 'viewing-yesterday-data')
        // console.log(`[MarketingAssistant] 🔥 Forcing fresh data for yesterday (${yesterday}) to avoid stale cache`)
      }
      
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
      
      // console.log(`[MarketingAssistant] Fetched Meta data from database for current period:`, {
        // adSpend: currentData.adSpend,
        // impressions: currentData.impressions,
        // clicks: currentData.clicks,
        // conversions: currentData.conversions,
        // roas: currentData.roas
      // })

      // console.log(`[MarketingAssistant] Previous period data:`, {
        // adSpend: previousData.adSpend,
        // impressions: previousData.impressions,
        // clicks: previousData.clicks,
        // conversions: previousData.conversions,
        // roas: previousData.roas
      // })

      // Calculate growth values locally for better accuracy
      const adSpendGrowth = calculatePercentChange(currentData.adSpend || 0, previousData.adSpend || 0) ?? 0
      const impressionGrowth = calculatePercentChange(currentData.impressions || 0, previousData.impressions || 0) ?? 0
      const clickGrowth = calculatePercentChange(currentData.clicks || 0, previousData.clicks || 0) ?? 0
      const conversionGrowth = calculatePercentChange(currentData.conversions || 0, previousData.conversions || 0) ?? 0
      const roasGrowth = calculatePercentChange(currentData.roas || 0, previousData.roas || 0) ?? 0
      const ctrGrowth = calculatePercentChange(currentData.ctr || 0, previousData.ctr || 0) ?? 0
      const cpcGrowth = calculatePercentChange(currentData.cpc || 0, previousData.cpc || 0) ?? 0
      const cprGrowth = calculatePercentChange(currentData.costPerResult || 0, previousData.costPerResult || 0) ?? 0

      // console.log(`[MarketingAssistant] Calculated growth values:`, {
        // adSpendGrowth,
        // impressionGrowth,
        // clickGrowth,
        // conversionGrowth,
        // roasGrowth,
        // ctrGrowth,
        // cpcGrowth,
        // cprGrowth
      // })

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
      
      // console.log(`[MarketingAssistant] ✅ Meta data updated from database (refreshId: ${refreshId || 'standalone'})`)
      
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
      // console.log("[MarketingAssistant] Missing required data for loading")
      return
    }

    // Prevent multiple simultaneous loads
    if (isInitialLoadInProgress.current) {
      // console.log("[MarketingAssistant] Load already in progress, skipping duplicate loadAllData call")
      return
    }

    // console.log('[MarketingAssistant] Starting centralized data loading...')
    setIsDataLoading(true)
    setLoadingProgress(0)
    isInitialLoadInProgress.current = true

    try {
      // Phase 0: Check for data gaps and backfill if necessary
      setLoadingPhase('Checking for missing data...')
      setLoadingProgress(5)
      
      // console.log('[MarketingAssistant] Validating data coverage...')
      await checkForGaps(selectedBrandId)
      
      // 🔥 ENHANCED DATA REFRESH: Check for gaps AND stale historical data  
      setLoadingPhase('Checking for missing & stale data...')
      setLoadingProgress(8)
      
      try {
        // 🔥 FIX: Use server-side API endpoint instead of direct client-side import
        setLoadingPhase('Refreshing recent & historical data...')
        setLoadingProgress(12)
        
        const response = await fetch('/api/data/complete-refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brandId: selectedBrandId,
            lookbackDays: 60,
            mode: 'standard'
          })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const refreshResult = await response.json();
        
        if (refreshResult.success) {
          const messages = []
          if (refreshResult.recentDataRefreshed) messages.push('recent data')
          if (refreshResult.staleDataRefreshed > 0) messages.push(`${refreshResult.staleDataRefreshed} stale days`)
          if (refreshResult.totalGapsFilled > 0) messages.push(`${refreshResult.totalGapsFilled} missing days`)
          
          // console.log(`[MarketingAssistant] ✅ Complete refresh done: ${messages.join(', ')} updated`)
          
          // If we fixed stale data, show helpful feedback
          if (refreshResult.staleDataRefreshed > 0) {
            setLoadingPhase(`Fixed ${refreshResult.staleDataRefreshed} days of stale data...`)
            // console.log(`[MarketingAssistant] 🎯 Fixed ${refreshResult.staleDataRefreshed} days with stale data (like the Wednesday $0.43 → $0.90 issue)`)
            await new Promise(resolve => setTimeout(resolve, 1000)) // Let user see the message
          }
        } else {
          console.warn(`[MarketingAssistant] ⚠️ Complete data refresh had issues:`, refreshResult.error)
        }
      } catch (error) {
        console.warn('[MarketingAssistant] ⚠️ Error during enhanced data refresh:', error)
        
        // Fallback to old system
        // console.log('[MarketingAssistant] Falling back to standard gap detection...')
        await checkForGaps(selectedBrandId)
      if (backfillStatus.hasGaps && backfillStatus.totalMissingDays >= 1) {
        setLoadingPhase(`Backfilling ${backfillStatus.totalMissingDays} missing days...`)
        setLoadingProgress(10)
        // console.log(`[MarketingAssistant] Backfilling ${backfillStatus.totalMissingDays} missing days...`)
        await performBackfill(selectedBrandId)
        }
      }

      // Phase 1: Loading and Syncing Advertising Data
      setLoadingPhase('Loading advertising data...')
      setLoadingProgress(15)
      
      await new Promise(resolve => setTimeout(resolve, 800)) // Smooth UX
      
      setLoadingProgress(30)
      setLoadingPhase('Syncing latest performance data...')
      
      await new Promise(resolve => setTimeout(resolve, 600))
      
      // Sync fresh advertising data (this will fetch from database after syncing)
      await syncMetaInsights()
      
      // 🔥 FIX: Fetch the fresh metrics data that was just synced
      const freshMetaMetrics = await fetchMetaDataFromDatabase() || defaultMetrics
      // console.log('[MarketingAssistant] 🎯 Fresh meta metrics loaded:', freshMetaMetrics)
      
      setLoadingProgress(50)
      setLoadingPhase('AI analyzing campaign performance...')
      
      await new Promise(resolve => setTimeout(resolve, 900))
      
      // Phase 2: Load AI Daily Report and Performance Data in parallel
      try {
        // Always use today's date for campaigns (like other widgets) to ensure fresh daily data
        // Use local timezone instead of UTC to avoid date mismatch issues
        const today = new Date()
        const todayStr = dateToLocalDateString(today)
        
        // console.log(`[MarketingAssistant] Fetching campaigns for TODAY: ${todayStr} (using local timezone to match user's actual date)`)
        
        const [dailyReportResponse, campaignsResponse] = await Promise.all([
          fetch('/api/ai/daily-report', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              brandId: selectedBrandId,
              forceRegenerate: false,
              userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
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
          setLoadingPhase('Loading creative insights...')
          await new Promise(resolve => setTimeout(resolve, 700))
          
          // console.log('[MarketingAssistant] Loading ad creatives for campaigns...')
          
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
          // console.log('[MarketingAssistant] Loaded ad creatives:', allAds.length)
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
      
      // Phase 4: Finalize all data and update main metaMetrics state
      setPreloadedData(prev => ({
        ...prev,
        metaMetrics: freshMetaMetrics, // Use fresh data instead of stale state
        aiConsultantReady: true
      }))
      
      // 🔥 FIX: Update the main metaMetrics state with loaded data
      // This ensures BlendedWidgetsTable gets real data instead of defaultMetrics
      setMetaMetrics(freshMetaMetrics)
      // console.log('[MarketingAssistant] 🎯 Updated main metaMetrics state with fresh data:', freshMetaMetrics)
      
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
      
      // console.log('[MarketingAssistant] ✅ All data loaded successfully!')
      
    } catch (error) {
      console.error('[MarketingAssistant] Error during data loading:', error)
      // Still show the dashboard even if some data failed
      setIsDataLoading(false)
      toast.error('Some data failed to load, but dashboard is still available')
    } finally {
      // Always clear the in-progress flag
      isInitialLoadInProgress.current = false
    }
  }, [selectedBrandId, dateRange, syncMetaInsights, fetchMetaDataFromDatabase])

  // Debug function to test midnight reset manually - remove in production
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugMarketingAssistantMidnightReset = () => {
        // console.log('[MarketingAssistant] DEBUG: Manually triggering midnight reset')
        
        // Clear date range and force to today
        const today = new Date()
        setDateRange({
          from: today,
          to: today
        })
        
        // Clear cached data
        hasInitialDataLoaded.current = false
        
        // Force full reload with today's date
        // console.log('[MarketingAssistant] 🔄 Debug reset: Forcing fresh data load for today')
        loadAllData()
        
        // Dispatch new day event
        window.dispatchEvent(new CustomEvent('newDayDetected', {
          detail: { 
            brandId: selectedBrandId, 
            source: 'debug-marketing-assistant-midnight-reset',
            timestamp: Date.now()
          }
        }))
        
        // console.log('[MarketingAssistant] DEBUG: Midnight reset simulation complete')
      }
    }
  }, [selectedBrandId, loadAllData])

  // Initial data load and refresh logic
  useEffect(() => {
    // Skip if we're still in the dashboard's initial setup phase
    if (typeof window !== 'undefined' && window._dashboardInitialSetup) {
      // console.log("[MarketingAssistant] Skipping data load - dashboard still in initial setup phase")
      return
    }
    
    // If no brand is selected, stop loading and show no-brand-selected state
    if (!selectedBrandId) {
      // console.log("[MarketingAssistant] No brand selected, stopping loading state")
      setIsDataLoading(false)
      setLoadingProgress(0)
      setLoadingPhase('Please select a brand')
      return
    }
    
    // Check if we've already done the initial load for this date range or brand
    const dateRangeChanged = dateRange?.from !== lastFetchedDateRange.current.from || 
                           dateRange?.to !== lastFetchedDateRange.current.to
    const brandChanged = selectedBrandId !== lastFetchedBrandId.current
    const shouldLoad = dateRangeChanged || brandChanged || !hasInitialDataLoaded.current
    
    if (dateRange?.from && dateRange?.to && shouldLoad) {
      // 🔥 FIX: Reset loading flags when brand or date changes to allow fresh load
      if (dateRangeChanged || brandChanged) {
        // console.log("[MarketingAssistant] Brand/date changed, resetting loading flags", { brandChanged, dateRangeChanged })
        isInitialLoadInProgress.current = false
        hasInitialDataLoaded.current = false
      }
      
      // Prevent duplicate initial loads (but allow brand/date changes)
      if (isInitialLoadInProgress.current && !dateRangeChanged && !brandChanged) {
        // console.log("[MarketingAssistant] Initial load already in progress, skipping duplicate call")
        return
      }
      
      // console.log("[MarketingAssistant] useEffect detected change in brandId or dateRange. Starting centralized data loading.")
      
      // 🔥 FIX: Start loading state immediately when brand is selected
      setIsDataLoading(true)
      setLoadingProgress(0)
      setLoadingPhase('Initializing Marketing Assistant')
      
      // 🔥 FIX: Reset the flag right before calling loadAllData to prevent duplicate detection
      isInitialLoadInProgress.current = false
      
      // Update the last fetched date range and brand
      lastFetchedDateRange.current = { from: dateRange.from, to: dateRange.to }
      lastFetchedBrandId.current = selectedBrandId
      
      // Start the centralized loading process
      loadAllData()
    }
  }, [selectedBrandId, dateRange, loadAllData])

  // Refresh all widgets function - now uses centralized loading system
  const refreshAllWidgets = useCallback(async () => {
    if (!selectedBrandId || isRefreshingAll || refreshCooldown) {
      if (refreshCooldown) {
        toast.error("Please wait before refreshing again", { 
          description: "You can refresh every 30 seconds" 
        })
      }
      return
    }

    // console.log('[MarketingAssistant] 🔄 Refresh All triggered - using centralized loading system')

    setIsRefreshingAll(true)
    setRefreshCooldown(true)
    
    // Set cooldown timer
    setTimeout(() => {
      setRefreshCooldown(false)
    }, 30000) // 30 second cooldown

    toast.loading("Refreshing all data...", { id: "refresh-all-toast" })

    try {
      // Use the exact same centralized loading system as initial page load
      await loadAllData()
      
      setLastPageRefresh(new Date())
      toast.success("All data refreshed successfully!", { id: "refresh-all-toast" })
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('refresh-all-widgets', {
        detail: {
          brandId: selectedBrandId,
          timestamp: Date.now(),
          source: 'MarketingAssistantRefresh',
          success: true
        }
      }))
      
    } catch (error) {
      console.error('[MarketingAssistant] Error during refresh all:', error)
      toast.error("Failed to refresh data", { id: "refresh-all-toast" })
    } finally {
      setIsRefreshingAll(false)
      setIsDataLoading(false) // Ensure loading state is cleared
      setLoadingProgress(0)
      setLoadingPhase('')
    }
  }, [selectedBrandId, isRefreshingAll, refreshCooldown, loadAllData])

  // Listen for global refresh events - updated for centralized system
  useEffect(() => {
    const handleGlobalRefresh = (event: CustomEvent) => {
      // console.log("[MarketingAssistant] Received global refresh event:", event.detail)
      if (event.detail?.brandId === selectedBrandId) {
        // console.log("[MarketingAssistant] Global refresh event matches current brandId. Triggering refresh.")
        
        // For global refreshes, do a quick refresh without full loading screen
        if (!isRefreshingAll) {
          setLoadingPhase('Syncing latest data...')
          syncMetaInsights().then(() => {
            setLoadingPhase('Ready!')
          })
        }
      } else {
        // console.log("[MarketingAssistant] Global refresh event not for this brand, skipping.")
      }
    }

    const handleNewDayDetected = (event: CustomEvent) => {
      // console.log("[MarketingAssistant] 🌅 New day detected event received:", event.detail)
      if (event.detail?.brandId === selectedBrandId) {
        // console.log("[MarketingAssistant] 📅 New day transition detected for current brand. Triggering full reload.")
        
        // For new day, trigger full reload
        hasInitialDataLoaded.current = false
        loadAllData()
      } else {
        // console.log("[MarketingAssistant] New day event not for this brand, skipping.")
      }
    }

    const handleGlobalRefreshAll = (event: CustomEvent) => {
      // console.log("[MarketingAssistant] Received global-refresh-all event:", event.detail)
      
      // Marketing assistant should always respond to global refresh for the correct brand
      // since it's primarily Meta-focused
      if (event.detail?.brandId === selectedBrandId) {
        // console.log("[MarketingAssistant] Global refresh all - triggering comprehensive data reload")
        if (!isRefreshingAll) {
          refreshAllWidgets()
        } else {
          // console.log("[MarketingAssistant] Already refreshing, skipping duplicate refresh")
        }
      } else {
        // console.log("[MarketingAssistant] Global refresh event not for this brand, skipping.")
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

  // Show loading state with enhanced modern design
  if (isDataLoading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#0F0F0F] to-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden animate-in fade-in duration-500">
        {/* Enhanced animated background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.15),transparent_60%)] animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,42,42,0.08),transparent_60%)] animate-pulse delay-1000"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-white/8 to-transparent rounded-full blur-3xl animate-pulse delay-500"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-l from-[#FF2A2A]/8 to-transparent rounded-full blur-3xl animate-pulse delay-1500"></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }}></div>
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto px-8">
          {/* Enhanced loading icon */}
          <div className="w-24 h-24 mx-auto mb-10 relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10 backdrop-blur-sm"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-[#FF2A2A] border-r-transparent animate-spin"></div>
            <div className="absolute inset-0 rounded-full border-4 border-b-white/20 border-l-transparent animate-spin delay-300"></div>
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-2xl">
              {agencySettings.agency_logo_url && (
                <img
                  src={agencySettings.agency_logo_url}
                  alt={`${agencySettings.agency_name} Logo`}
                  className="w-14 h-14 object-contain rounded-lg shadow-lg"
                />
              )}
            </div>
          </div>

          {/* Enhanced title */}
          <div className="space-y-4 mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
              Marketing Assistant
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-[#FF2A2A] to-white/50 rounded-full mx-auto"></div>
          </div>

          {/* Dynamic loading phase with enhanced styling */}
          <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xl lg:text-2xl text-gray-200 mb-2 font-medium min-h-[32px] flex items-center justify-center">
              {loadingPhase}
            </p>
            <div className="text-sm text-gray-400">
              {loadingProgress < 25 && "Initializing your marketing intelligence..."}
              {loadingProgress >= 25 && loadingProgress < 50 && "Connecting to your advertising platforms..."}
              {loadingProgress >= 50 && loadingProgress < 75 && "Analyzing campaign performance data..."}
              {loadingProgress >= 75 && "Preparing AI-powered insights..."}
            </div>
          </div>

          {/* Enhanced progress bar */}
          <div className="w-full max-w-lg mx-auto mb-8">
            <div className="flex items-center justify-between text-sm text-gray-300 mb-3">
              <span className="font-medium">Loading Progress</span>
              <span className="font-bold text-[#FF2A2A]">{loadingProgress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden backdrop-blur-sm border border-white/20">
              <div
                className="h-full bg-gradient-to-r from-[#FF2A2A] via-[#FF2A2A]/80 to-white/60 rounded-full transition-all duration-700 ease-out shadow-lg"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Enhanced loading phases checklist */}
          <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <div className="text-left space-y-4 text-sm">
              <div className={`flex items-center gap-4 transition-all duration-300 ${loadingProgress >= 15 ? 'text-gray-200' : 'text-gray-500'}`}>
                <div className={`w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${loadingProgress >= 15 ? 'bg-[#FF2A2A] shadow-lg shadow-[#FF2A2A]/30' : 'bg-white/20'}`}>
                  {loadingProgress >= 15 && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="font-medium">Loading advertising data</span>
              </div>
              <div className={`flex items-center gap-4 transition-all duration-300 ${loadingProgress >= 30 ? 'text-gray-200' : 'text-gray-500'}`}>
                <div className={`w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${loadingProgress >= 30 ? 'bg-[#FF2A2A] shadow-lg shadow-[#FF2A2A]/30' : 'bg-white/20'}`}>
                  {loadingProgress >= 30 && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="font-medium">Syncing latest performance data</span>
              </div>
              <div className={`flex items-center gap-4 transition-all duration-300 ${loadingProgress >= 50 ? 'text-gray-200' : 'text-gray-500'}`}>
                <div className={`w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${loadingProgress >= 50 ? 'bg-[#FF2A2A] shadow-lg shadow-[#FF2A2A]/30' : 'bg-white/20'}`}>
                  {loadingProgress >= 50 && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="font-medium">AI analyzing campaign performance</span>
              </div>
              <div className={`flex items-center gap-4 transition-all duration-300 ${loadingProgress >= 70 ? 'text-gray-200' : 'text-gray-500'}`}>
                <div className={`w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${loadingProgress >= 70 ? 'bg-[#FF2A2A] shadow-lg shadow-[#FF2A2A]/30' : 'bg-white/20'}`}>
                  {loadingProgress >= 70 && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="font-medium">Loading creative insights</span>
              </div>
              <div className={`flex items-center gap-4 transition-all duration-300 ${loadingProgress >= 85 ? 'text-gray-200' : 'text-gray-500'}`}>
                <div className={`w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${loadingProgress >= 85 ? 'bg-[#FF2A2A] shadow-lg shadow-[#FF2A2A]/30' : 'bg-white/20'}`}>
                  {loadingProgress >= 85 && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="font-medium">Preparing AI marketing consultant</span>
              </div>
              <div className={`flex items-center gap-4 transition-all duration-300 ${loadingProgress >= 95 ? 'text-gray-200' : 'text-gray-500'}`}>
                <div className={`w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${loadingProgress >= 95 ? 'bg-[#FF2A2A] shadow-lg shadow-[#FF2A2A]/30' : 'bg-white/20'}`}>
                  {loadingProgress >= 95 && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="font-medium">Finalizing dashboard</span>
              </div>
            </div>
          </div>

          {/* Enhanced loading tip */}
          <div className="text-sm text-gray-400 italic bg-gradient-to-r from-transparent via-white/5 to-transparent backdrop-blur-sm border border-white/10 rounded-xl px-6 py-3">
            🔮 Building your personalized marketing intelligence dashboard...
          </div>
        </div>
      </div>
    )
  }

  // Show no brand selected state with modern design
  if (!selectedBrandId) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#0F0F0F] to-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)] animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,42,42,0.05),transparent_50%)] animate-pulse delay-1000"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-white/5 to-transparent rounded-full blur-3xl animate-pulse delay-500"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-l from-[#FF2A2A]/5 to-transparent rounded-full blur-3xl animate-pulse delay-1500"></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto px-8">
          {/* Enhanced logo section */}
          <div className="w-24 h-24 mx-auto mb-10 relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10 backdrop-blur-sm"></div>
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-2xl">
              {agencySettings.agency_logo_url && (
                <img
                  src={agencySettings.agency_logo_url}
                  alt={`${agencySettings.agency_name} Logo`}
                  className="w-14 h-14 object-contain rounded-lg shadow-lg"
                />
              )}
            </div>
          </div>

          {/* Enhanced title */}
          <div className="space-y-4 mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
              Marketing Assistant
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-[#FF2A2A] to-white/50 rounded-full mx-auto"></div>
          </div>

          {/* Status message with enhanced styling */}
          <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-gray-500/20 to-gray-600/30 rounded-2xl flex items-center justify-center border border-gray-500/30">
              <Brain className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-2xl lg:text-3xl text-gray-200 mb-4 font-medium">
              No brand selected
            </p>
            <p className="text-gray-400 text-lg leading-relaxed">
              Choose a brand from the sidebar to unlock AI-powered marketing insights, campaign recommendations, and comprehensive performance analytics.
            </p>
          </div>

          {/* Call-to-action */}
          <div className="bg-gradient-to-r from-[#FF2A2A]/10 via-white/5 to-[#FF2A2A]/10 backdrop-blur-sm border border-[#FF2A2A]/20 rounded-2xl p-6">
            <p className="text-gray-300 text-lg mb-4">
              🚀 Ready to supercharge your marketing performance?
            </p>
            <p className="text-gray-400 text-sm">
              Select a brand to access your personalized marketing intelligence dashboard
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 text-sm text-gray-500 italic">
            💡 Your AI marketing assistant is waiting to help optimize your campaigns
          </div>
        </div>
      </div>
    )
  }

  // Show regular dashboard when brand is selected
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#0F0F0F] to-[#0A0A0A] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)] animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,42,42,0.05),transparent_50%)] animate-pulse delay-1000"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-white/5 to-transparent rounded-full blur-3xl animate-pulse delay-500"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-l from-[#FF2A2A]/5 to-transparent rounded-full blur-3xl animate-pulse delay-1500"></div>

      <GridOverlay />
      <div className="relative z-10">
        {/* Meta Connection Status Banner - Enhanced with backdrop blur */}
        <div className="backdrop-blur-sm bg-black/10">
          <MetaConnectionStatus
            brandId={selectedBrandId}
            className="px-6 lg:px-12 xl:px-20 2xl:px-32 py-4"
          />
        </div>

        {/* Main Content Container - Modern spacing and flow */}
        <div className="px-6 lg:px-12 xl:px-20 2xl:px-32 space-y-8 lg:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Hero Section - Blended Performance Metrics with enhanced presentation */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl blur-xl"></div>
            <div className="relative bg-gradient-to-br from-white/5 via-white/2 to-transparent backdrop-blur-sm border border-white/10 rounded-3xl p-8 lg:p-12 shadow-2xl">
              <BlendedWidgetsTable
                metaMetrics={metaMetrics}
                layout="horizontal"
              />
            </div>
          </div>

          {/* Main Dashboard Grid - Enhanced responsive layout */}
          <div className="grid grid-cols-1 2xl:grid-cols-12 gap-6 lg:gap-8">

            {/* Left Column - Campaign Management & Creatives */}
            <div className="2xl:col-span-8 space-y-6 lg:space-y-8">

              {/* Campaign Management Section - Enhanced with better visual hierarchy */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF2A2A]/5 via-transparent to-white/2 rounded-3xl blur-xl"></div>
                <div className="relative bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl">
                  <PlatformCampaignWidget preloadedCampaigns={preloadedData.campaigns} />
                </div>
              </div>

              {/* Bottom Row - Creative Performance & Analytics */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">

                {/* Ad Creative Performance - Enhanced visual presentation */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-3xl blur-xl"></div>
                  <div className="relative bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl h-full">
                    <AdCreativeBreakdown preloadedAds={preloadedData.adCreatives} />
                  </div>
                </div>

                {/* Performance Analytics - Enhanced chart presentation */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5 rounded-3xl blur-xl"></div>
                  <div className="relative bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl h-full">
                    <PerformanceChart
                      preloadedPerformanceData={preloadedData.performanceData}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Right Column - AI Optimization & Insights */}
            <div className="2xl:col-span-4 space-y-6 lg:space-y-8">

              {/* AI Optimization Dashboard - Enhanced with premium styling */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-white/2 to-blue-500/5 rounded-3xl blur-xl"></div>
                <div className="relative bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl h-full min-h-[600px]">
                  <AIOptimizationDashboard preloadedData={preloadedData.optimizationData} />
                </div>
              </div>

            </div>

          </div>

          {/* Footer spacing */}
          <div className="h-12 lg:h-16"></div>

        </div>
      </div>
    </div>
  )
} 