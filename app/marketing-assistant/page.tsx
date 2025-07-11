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

// Meta logo SVG component
const MetaLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M22.085 8.5C22.085 12.64 18.725 16 14.585 16C13.905 16 13.255 15.89 12.645 15.69C12.035 15.49 11.475 15.21 10.975 14.86C10.475 14.51 10.035 14.1 9.665 13.64C9.295 13.18 8.995 12.68 8.775 12.15C8.555 11.62 8.415 11.06 8.365 10.48C8.315 9.9 8.355 9.32 8.485 8.76C8.615 8.2 8.835 7.67 9.135 7.18C9.435 6.69 9.815 6.25 10.265 5.87C10.715 5.49 11.225 5.18 11.775 4.95C12.325 4.72 12.915 4.57 13.515 4.51C14.115 4.45 14.715 4.48 15.305 4.6C15.895 4.72 16.465 4.93 16.995 5.22C17.525 5.51 18.005 5.88 18.425 6.31C18.845 6.74 19.195 7.23 19.465 7.76C19.735 8.29 19.925 8.85 20.025 9.43C20.125 10.01 20.135 10.6 20.055 11.18C19.975 11.76 19.805 12.32 19.555 12.84C19.305 13.36 18.975 13.83 18.575 14.24C18.175 14.65 17.715 14.99 17.205 15.25C16.695 15.51 16.145 15.69 15.575 15.78C15.005 15.87 14.425 15.87 13.855 15.78C13.285 15.69 12.735 15.51 12.225 15.25C11.715 14.99 11.255 14.65 10.855 14.24C10.455 13.83 10.125 13.36 9.875 12.84C9.625 12.32 9.455 11.76 9.375 11.18C9.295 10.6 9.305 10.01 9.405 9.43C9.505 8.85 9.695 8.29 9.965 7.76C10.235 7.23 10.585 6.74 11.005 6.31C11.425 5.88 11.905 5.51 12.435 5.22C12.965 4.93 13.535 4.72 14.125 4.6C14.715 4.48 15.315 4.45 15.915 4.51C16.515 4.57 17.105 4.72 17.655 4.95C18.205 5.18 18.715 5.49 19.165 5.87C19.615 6.25 19.995 6.69 20.295 7.18C20.595 7.67 20.815 8.2 20.945 8.76C21.075 9.32 21.115 9.9 21.065 10.48C21.015 11.06 20.875 11.62 20.655 12.15C20.435 12.68 20.135 13.18 19.765 13.64C19.395 14.1 18.955 14.51 18.455 14.86C17.955 15.21 17.395 15.49 16.785 15.69C16.175 15.89 15.525 16 14.845 16C10.705 16 7.345 12.64 7.345 8.5C7.345 4.36 10.705 1 14.845 1C18.985 1 22.345 4.36 22.345 8.5H22.085Z" fill="#0866FF"/>
    <path d="M9.165 8.5C9.165 11.537 11.627 14 14.665 14C17.703 14 20.165 11.537 20.165 8.5C20.165 5.462 17.703 3 14.665 3C11.627 3 9.165 5.462 9.165 8.5Z" fill="url(#paint0_linear_meta)"/>
    <defs>
      <linearGradient id="paint0_linear_meta" x1="9.165" y1="8.5" x2="20.165" y2="8.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0866FF"/>
        <stop offset="1" stopColor="#0866FF"/>
      </linearGradient>
    </defs>
  </svg>
)

// TikTok logo SVG component  
const TikTokLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" fill="#FF0050"/>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" fill="#25F4EE"/>
  </svg>
)

// Google Ads logo SVG component
const GoogleAdsLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="#4285F4"/>
    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="#34A853"/>
    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="#FBBC05"/>
    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="#EA4335"/>
    <circle cx="12" cy="12" r="3" fill="#FFF"/>
    <path d="M12 10.5C12.83 10.5 13.5 11.17 13.5 12C13.5 12.83 12.83 13.5 12 13.5C11.17 13.5 10.5 12.83 10.5 12C10.5 11.17 11.17 10.5 12 10.5Z" fill="#4285F4"/>
  </svg>
)

// Platform logos component
const PlatformLogos = () => {
  return (
    <div className="flex items-center justify-center space-x-1.5 my-2">
      {/* Meta logo - active */}
      <div className="w-4 h-4 flex items-center justify-center">
        <MetaLogo className="w-4 h-4" />
      </div>
      {/* TikTok logo - grayed out */}
      <div className="w-4 h-4 flex items-center justify-center opacity-30 grayscale">
        <TikTokLogo className="w-4 h-4" />
      </div>
      {/* Google Ads logo - grayed out */}
      <div className="w-4 h-4 flex items-center justify-center opacity-30 grayscale">
        <GoogleAdsLogo className="w-4 h-4" />
      </div>
    </div>
  )
}

// Custom title component that includes platform logos
const MetricTitleWithLogos = ({ title }: { title: string }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="text-sm font-medium text-gray-200 text-center mb-1">
        {title}
      </div>
      <PlatformLogos />
    </div>
  )
}

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
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [metaMetrics, setMetaMetrics] = useState<MetaMetrics>(defaultMetrics)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date()
  })

  // Refs for tracking state
  const hasFetchedMetaData = useRef(false)
  const lastFetchedDateRange = useRef<{ from?: Date; to?: Date }>({})
  const hasInitialDataLoaded = useRef(false)
  const isInitialLoadInProgress = useRef(false)

  // Page loading simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Helper function to calculate previous period date range - matches home page
  const getPreviousPeriodDates = useCallback((from: Date, to: Date): { prevFrom: string, prevTo: string } => {
    const fromNormalized = new Date(from.getFullYear(), from.getMonth(), from.getDate())
    const toNormalized = new Date(to.getFullYear(), to.getMonth(), to.getDate())
    
    const daysDiff = Math.ceil((toNormalized.getTime() - fromNormalized.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const prevTo = new Date(fromNormalized.getTime() - 1000 * 60 * 60 * 24)
    const prevFrom = new Date(prevTo.getTime() - (daysDiff - 1) * 1000 * 60 * 60 * 24)
    
    return {
      prevFrom: prevFrom.toISOString().split('T')[0],
      prevTo: prevTo.toISOString().split('T')[0]
    }
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
      // Format dates in YYYY-MM-DD format
      const startDate = dateRange.from.toISOString().split('T')[0]
      const endDate = dateRange.to.toISOString().split('T')[0]
      
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

      // Current period params
      const params = new URLSearchParams({ brandId: selectedBrandId })
      if (dateRange.from) params.append('from', dateRange.from.toISOString().split('T')[0])
      if (dateRange.to) params.append('to', dateRange.to.toISOString().split('T')[0])
      
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

      // Update metaMetrics state with database data
      setMetaMetrics({
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
        adSpendGrowth: currentData.adSpendGrowth || 0,
        impressionGrowth: currentData.impressionGrowth || 0,
        clickGrowth: currentData.clickGrowth || 0,
        conversionGrowth: currentData.conversionGrowth || 0,
        roasGrowth: currentData.roasGrowth || 0,
        ctrGrowth: currentData.ctrGrowth || 0,
        cpcGrowth: currentData.cpcGrowth || 0,
        cprGrowth: currentData.cprGrowth || 0,
        previousAdSpend: previousData.adSpend || 0,
        previousImpressions: previousData.impressions || 0,
        previousClicks: previousData.clicks || 0,
        previousConversions: previousData.conversions || 0,
        previousRoas: previousData.roas || 0,
        previousCtr: previousData.ctr || 0,
        previousCpc: previousData.cpc || 0
      })
      
      console.log(`[MarketingAssistant] ✅ Meta data updated from database (refreshId: ${refreshId || 'standalone'})`)
    } catch (error) {
      console.error(`[MarketingAssistant] Error fetching Meta data from database:`, error)
      setMetaMetrics(defaultMetrics)
    }
  }, [selectedBrandId, dateRange, getPreviousPeriodDates])

  // Initial data load and refresh logic
  useEffect(() => {
    // Skip if we're still in the dashboard's initial setup phase
    if (typeof window !== 'undefined' && window._dashboardInitialSetup) {
      console.log("[MarketingAssistant] Skipping data fetch - dashboard still in initial setup phase")
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
      
      console.log("[MarketingAssistant] useEffect detected change in brandId or dateRange. Fetching Meta data.")
      isInitialLoadInProgress.current = true
      
      // Update the last fetched date range
      lastFetchedDateRange.current = { from: dateRange.from, to: dateRange.to }
      
      // Trigger database-based sync
      syncMetaInsights()
      
      // Mark initial load as complete
      hasInitialDataLoaded.current = true
      
      // Clear the in-progress flag after a delay
      setTimeout(() => {
        isInitialLoadInProgress.current = false
      }, 2000)
    }
  }, [selectedBrandId, dateRange, syncMetaInsights])

  // Listen for global refresh events
  useEffect(() => {
    const handleGlobalRefresh = (event: CustomEvent) => {
      console.log("[MarketingAssistant] Received global refresh event:", event.detail)
      if (event.detail?.brandId === selectedBrandId) {
        console.log("[MarketingAssistant] Global refresh event matches current brandId. Triggering Meta database sync.")
        toast.info("Syncing with recent Meta updates...", { id: "meta-global-refresh-toast" })
        syncMetaInsights()
      } else {
        console.log("[MarketingAssistant] Global refresh event not for this brand, skipping.")
      }
    }

    const handleNewDayDetected = (event: CustomEvent) => {
      console.log("[MarketingAssistant] 🌅 New day detected event received:", event.detail)
      if (event.detail?.brandId === selectedBrandId) {
        console.log("[MarketingAssistant] 📅 New day transition detected for current brand. Triggering comprehensive Meta sync.")
        toast.info("New day detected! Refreshing all Meta data...", { 
          id: "meta-new-day-refresh",
          duration: 8000 
        })
        syncMetaInsights()
      } else {
        console.log("[MarketingAssistant] New day event not for this brand, skipping.")
      }
    }

    const handleGlobalRefreshAll = (event: CustomEvent) => {
      console.log("[MarketingAssistant] Received global-refresh-all event:", event.detail)
      if (event.detail?.brandId === selectedBrandId && event.detail?.platforms?.meta) {
        console.log("[MarketingAssistant] Global refresh all - triggering Meta widgets refresh")
        syncMetaInsights()
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
  }, [selectedBrandId, syncMetaInsights])

  // Show loading state
  if (isLoadingPage) {
    const loadingConfig = getPageLoadingConfig(pathname)
    
    return (
      <UnifiedLoading
        variant="page"
        size="lg"
        message="Loading Marketing Assistant"
        subMessage="Preparing your marketing insights"
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Marketing Assistant</h1>
          <p className="text-gray-400 mt-1">Monitor your Meta advertising performance</p>
        </div>
        <DateRangePicker 
          dateRange={{
            from: dateRange?.from || subDays(new Date(), 7),
            to: dateRange?.to || new Date()
          }} 
          setDateRange={(range) => setDateRange(range)}
        />
      </div>

      {!selectedBrandId ? (
        <div className="text-center py-12 px-6">
          <p className="text-gray-400 text-lg">Please select a brand to view marketing metrics</p>
        </div>
      ) : (
        <>
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 px-6">
            {/* Total Spend */}
            <MetricCard 
              title={<MetricTitleWithLogos title="Total Spend" />}
              value={metaMetrics.adSpend}
              change={metaMetrics.adSpendGrowth}
              previousValue={metaMetrics.previousAdSpend}
              prefix="$"
              valueFormat="currency"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="currency"
              previousValueDecimals={2}
              previousValuePrefix="$"
              infoTooltip="Total amount spent on advertising across all platforms"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics || isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total ROAS */}
            <MetricCard 
              title={<MetricTitleWithLogos title="Total ROAS" />}
              value={metaMetrics.roas}
              change={metaMetrics.roasGrowth}
              previousValue={metaMetrics.previousRoas}
              suffix="x"
              valueFormat="number"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="number"
              previousValueDecimals={2}
              previousValueSuffix="x"
              infoTooltip="Return on ad spend across all platforms (revenue / ad spend)"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics || isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total Revenue */}
            <MetricCard 
              title={<MetricTitleWithLogos title="Total Revenue" />}
              value={metaMetrics.roas * metaMetrics.adSpend}
              change={metaMetrics.roasGrowth} // Using ROAS growth as proxy for revenue growth
              previousValue={metaMetrics.previousRoas * metaMetrics.previousAdSpend}
              prefix="$"
              valueFormat="currency"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="currency"
              previousValueDecimals={2}
              previousValuePrefix="$"
              infoTooltip="Total revenue generated from advertising across all platforms"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics || isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total Conversions */}
            <MetricCard 
              title={<MetricTitleWithLogos title="Total Conversions" />}
              value={metaMetrics.conversions}
              change={metaMetrics.conversionGrowth}
              previousValue={metaMetrics.previousConversions}
              hideGraph={true}
              valueFormat="number"
              decimals={0}
              showPreviousPeriod={true}
              previousValueFormat="number"
              previousValueDecimals={0}
              infoTooltip="Total number of conversions from advertising across all platforms"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics || isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total Impressions */}
            <MetricCard 
              title={<MetricTitleWithLogos title="Total Impressions" />}
              value={metaMetrics.impressions}
              change={metaMetrics.impressionGrowth}
              previousValue={metaMetrics.previousImpressions}
              hideGraph={true}
              valueFormat="number"
              decimals={0}
              showPreviousPeriod={true}
              previousValueFormat="number"
              previousValueDecimals={0}
              infoTooltip="Total number of times your ads were viewed across all platforms"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics || isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total Clicks */}
            <MetricCard 
              title={<MetricTitleWithLogos title="Total Clicks" />}
              value={metaMetrics.clicks}
              change={metaMetrics.clickGrowth}
              previousValue={metaMetrics.previousClicks}
              hideGraph={true}
              valueFormat="number"
              decimals={0}
              showPreviousPeriod={true}
              previousValueFormat="number"
              previousValueDecimals={0}
              infoTooltip="Total number of clicks on your ads across all platforms"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics || isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total CTR */}
            <MetricCard 
              title={<MetricTitleWithLogos title="Total CTR" />}
              value={metaMetrics.ctr / 100} // Convert percentage to decimal for proper formatting
              change={metaMetrics.ctrGrowth}
              previousValue={metaMetrics.previousCtr / 100}
              valueFormat="percentage"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="percentage"
              previousValueDecimals={2}
              infoTooltip="Click-through rate across all platforms (clicks ÷ impressions)"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics || isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total CPC */}
            <MetricCard 
              title={<MetricTitleWithLogos title="Total CPC" />}
              value={metaMetrics.cpc}
              change={metaMetrics.cpcGrowth}
              previousValue={metaMetrics.previousCpc}
              prefix="$"
              valueFormat="currency"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="currency"
              previousValueDecimals={2}
              previousValuePrefix="$"
              infoTooltip="Average cost per click across all platforms (spend ÷ clicks)"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics || isRefreshingData}
              className="min-h-[120px]"
            />
          </div>

          {/* Placeholder for future marketing assistant features */}
          <div className="mt-8 mx-6 p-8 bg-[#111] border border-[#333] rounded-lg text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Marketing Assistant Features</h2>
            <p className="text-gray-400">Additional marketing insights and AI-powered recommendations will be available here soon.</p>
          </div>
        </>
      )}
    </div>
  )
} 