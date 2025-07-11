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
              title="Total Spend"
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
              loading={isLoadingMetrics}
              refreshing={isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total ROAS */}
            <MetricCard 
              title="Total ROAS"
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
              loading={isLoadingMetrics}
              refreshing={isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total Revenue */}
            <MetricCard 
              title="Total Revenue"
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
              loading={isLoadingMetrics}
              refreshing={isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total Conversions */}
            <MetricCard 
              title="Total Conversions"
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
              loading={isLoadingMetrics}
              refreshing={isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total Impressions */}
            <MetricCard 
              title="Total Impressions"
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
              loading={isLoadingMetrics}
              refreshing={isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total Clicks */}
            <MetricCard 
              title="Total Clicks"
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
              loading={isLoadingMetrics}
              refreshing={isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total CTR */}
            <MetricCard 
              title="Total CTR"
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
              loading={isLoadingMetrics}
              refreshing={isRefreshingData}
              className="min-h-[120px]"
            />

            {/* Total CPC */}
            <MetricCard 
              title="Total CPC"
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
              loading={isLoadingMetrics}
              refreshing={isRefreshingData}
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