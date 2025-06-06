"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { DateRange } from 'react-day-picker'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"
import Image from "next/image"
import { toast } from 'sonner'
import { MetricCard } from "@/components/metrics/MetricCard"
import { isSameDay, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { TotalBudgetMetricCard } from '@/components/metrics/TotalBudgetMetricCard'
import { TotalAdSetReachCard } from '@/components/dashboard/platforms/metrics/TotalAdSetReachCard'
import { CampaignWidget } from '@/components/dashboard/platforms/tabs/CampaignWidget'
import { PlatformConnection } from '@/types/platformConnection'

// Define interfaces
interface DailyDataItem {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  roas: number;
  value?: number;
  [key: string]: string | number | undefined;
}

interface MetaMetricsState {
  adSpend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  adSpendGrowth: number | null;
  impressionGrowth: number | null;
  clickGrowth: number | null;
  conversionGrowth: number | null;
  roasGrowth: number | null;
  previousAdSpend: number;
  previousImpressions: number;
  previousClicks: number;
  previousConversions: number;
  previousRoas: number;
  ctr: number;
  previousCtr: number;
  ctrGrowth: number | null;
  cpc: number;
  previousCpc: number;
  cpcGrowth: number | null;
  costPerResult: number;
  cprGrowth: number | null;
  results: number;
  previousResults: number;
  purchaseValue: number;
  previousPurchaseValue: number;
}

// Initialize the fetch prevention system
declare global {
  interface Window {
    _metaTimeouts?: ReturnType<typeof setTimeout>[];
    _blockMetaApiCalls?: boolean;
    _disableAutoMetaFetch?: boolean;
    _activeFetchIds?: Set<number | string>;
    _metaFetchLock?: boolean;
    _lastManualRefresh?: number;
    _lastMetaRefresh?: number;
  }
}

if (typeof window !== 'undefined') {
  window._activeFetchIds = window._activeFetchIds || new Set();
  window._metaFetchLock = window._metaFetchLock || false;
  window._lastManualRefresh = window._lastManualRefresh || 0;
  window._lastMetaRefresh = window._lastMetaRefresh || 0;
}

// Helper functions for fetch lock management
function isMetaFetchInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  return window._metaFetchLock === true || (window._activeFetchIds?.size ?? 0) > 0;
}

function acquireMetaFetchLock(fetchId: number | string): boolean {
  if (typeof window === 'undefined') return true;
  
  if (window._metaFetchLock === true && !window._activeFetchIds?.has(fetchId)) {
    console.log(`[MetaTab2] 🔒 Meta Fetch lock active by another process, rejecting new fetchId: ${fetchId}`);
    return false;
  }
  
  window._metaFetchLock = true;
  window._activeFetchIds?.add(fetchId);
  
  console.log(`[MetaTab2] 🔐 Acquired Meta fetch lock for fetchId: ${fetchId}. Active fetches: ${window._activeFetchIds?.size}`);
  return true;
}

function releaseMetaFetchLock(fetchId: number | string): void {
  if (typeof window === 'undefined') return;
  
  window._activeFetchIds?.delete(fetchId);
  
  if ((window._activeFetchIds?.size ?? 0) === 0) {
    window._metaFetchLock = false;
    console.log(`[MetaTab2] 🔓 Released Meta fetch lock (last fetchId: ${fetchId}). No active fetches.`);
  } else {
    console.log(`[MetaTab2] 🔒 Meta Lock maintained for ${window._activeFetchIds?.size} active fetches (ended: ${fetchId})`);
  }
}

interface MetaTab2Props {
  brandId: string
  brandName: string
  dateRange: DateRange
  connections: PlatformConnection[]
}

export function MetaTab2({
  brandId,
  brandName,
  dateRange,
  connections
}: MetaTab2Props) {
  // Get Meta connection
  const metaConnection = connections.find(c => c.platform_type === 'meta' && c.status === 'active');
  
  // Unified loading state for all Meta widgets
  const [isLoadingAllMetaWidgets, setIsLoadingAllMetaWidgets] = useState(!!metaConnection);
  
  // State for Meta metrics
  const [metaMetrics, setMetaMetrics] = useState<MetaMetricsState>({
    adSpend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    roas: 0,
    adSpendGrowth: 0,
    impressionGrowth: 0,
    clickGrowth: 0,
    conversionGrowth: 0,
    roasGrowth: 0,
    previousAdSpend: 0,
    previousImpressions: 0,
    previousClicks: 0,
    previousConversions: 0,
    previousRoas: 0,
    ctr: 0,
    previousCtr: 0,
    ctrGrowth: 0,
    cpc: 0,
    previousCpc: 0,
    cpcGrowth: 0,
    costPerResult: 0,
    cprGrowth: 0,
    results: 0,
    previousResults: 0,
    purchaseValue: 0,
    previousPurchaseValue: 0
  });
  
  // State for campaign data
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [isSyncingCampaigns, setIsSyncingCampaigns] = useState(false);
  
  // State for daily data
  const [metaDaily, setMetaDaily] = useState<DailyDataItem[]>([]);
  
  // Refs
  const hasFetchedMetaData = useRef(false);
  const lastFetchedCampaignDates = useRef({from: '', to: ''});
  
  // Helper function to convert Date to ISO date string
  const toLocalISODateString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Calculate previous period dates (copied from HomeTab)
  const getPreviousPeriodDates = (from: Date, to: Date): { prevFrom: string, prevTo: string } => {
    const fromNormalized = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const toNormalized = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    
    console.log(`[MetaTab2] Calculating previous dates for range: ${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`);
    
    // Single day comparison
    const isSingleDay = isSameDay(fromNormalized, toNormalized);
    if (isSingleDay) {
      const prevDay = new Date(fromNormalized);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = toLocalISODateString(prevDay);
      
      console.log(`[MetaTab2] Single day detected, comparing to previous day: ${prevDayStr}`);
      
      return {
        prevFrom: prevDayStr,
        prevTo: prevDayStr
      };
    }
    
    // Check for preset patterns
    const rangeDays = Math.round((toNormalized.getTime() - fromNormalized.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    // Last 7 days preset
    const isLast7Days = rangeDays === 7 && isSameDay(toNormalized, yesterday);
    if (isLast7Days) {
      const prevFrom = new Date(fromNormalized);
      prevFrom.setDate(prevFrom.getDate() - 7);
      
      const prevTo = new Date(toNormalized);
      prevTo.setDate(prevTo.getDate() - 7);
      
      return {
        prevFrom: toLocalISODateString(prevFrom),
        prevTo: toLocalISODateString(prevTo)
      };
    }
    
    // Last 30 days preset
    const isLast30Days = rangeDays === 30 && isSameDay(toNormalized, yesterday);
    if (isLast30Days) {
      const prevFrom = new Date(fromNormalized);
      prevFrom.setDate(prevFrom.getDate() - 30);
      
      const prevTo = new Date(toNormalized);
      prevTo.setDate(prevTo.getDate() - 30);
      
      return {
        prevFrom: toLocalISODateString(prevFrom),
        prevTo: toLocalISODateString(prevTo)
      };
    }
    
    // This month preset
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    if (isSameDay(fromNormalized, startOfCurrentMonth)) {
      const daysInCurrentPeriod = Math.round((toNormalized.getTime() - fromNormalized.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const prevMonthStart = startOfMonth(subMonths(now, 1));
      const prevMonthEnd = new Date(prevMonthStart);
      prevMonthEnd.setDate(prevMonthStart.getDate() + daysInCurrentPeriod - 1);
      
      return {
        prevFrom: toLocalISODateString(prevMonthStart),
        prevTo: toLocalISODateString(prevMonthEnd)
      };
    }
    
    // Default: equivalent previous period
    const currentRange = toNormalized.getTime() - fromNormalized.getTime();
    const daysInRange = Math.ceil(currentRange / (1000 * 60 * 60 * 24)) + 1;
    
    const prevFrom = new Date(fromNormalized);
    prevFrom.setDate(prevFrom.getDate() - daysInRange);
    
    const prevTo = new Date(toNormalized);
    prevTo.setDate(prevTo.getDate() - daysInRange);
    
    return {
      prevFrom: toLocalISODateString(prevFrom),
      prevTo: toLocalISODateString(prevTo)
    };
  };

  // Calculate percentage change
  const calculatePercentChange = (current: number, previous: number): number | null => {
    if (previous === 0) {
      return null;
    }
    if (current === previous) {
      return 0;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  // Fetch Meta data from database after sync
  const fetchMetaDataFromDatabase = useCallback(async (refreshId?: string) => {
    if (!brandId || !dateRange?.from || !dateRange?.to || !metaConnection) {
      console.log("[MetaTab2] Skipping Meta data fetch from database: Missing brandId, dateRange, or Meta connection.");
      return;
    }

    try {
      console.log(`[MetaTab2] 🔄 Fetching Meta data from database (refreshId: ${refreshId || 'standalone'})`);

      // Current period params
      const params = new URLSearchParams({ brandId: brandId });
      if (dateRange.from) params.append('from', dateRange.from.toISOString().split('T')[0]);
      if (dateRange.to) params.append('to', dateRange.to.toISOString().split('T')[0]);
      
      // Apply cache busting to ensure fresh data from database
      params.append('bypass_cache', 'true');
      params.append('force_load', 'true');
      params.append('refresh', 'true');
      
      const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to);
      const prevParams = new URLSearchParams({ brandId: brandId });
      if (prevFrom) prevParams.append('from', prevFrom);
      if (prevTo) prevParams.append('to', prevTo);
      
      prevParams.append('bypass_cache', 'true');
      prevParams.append('force_load', 'true');
      prevParams.append('refresh', 'true');
      
      const currentResponse = await fetch(`/api/metrics/meta?${params.toString()}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Refresh-ID': refreshId || 'standalone'
        }
      });
      
      const prevResponse = await fetch(`/api/metrics/meta?${prevParams.toString()}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Refresh-ID': refreshId || 'standalone'
        }
      });
      
      if (!currentResponse.ok) {
        const errorData = await currentResponse.json().catch(() => ({ error: "Unknown error fetching current Meta data" }));
        console.error(`[MetaTab2] Failed to fetch current period Meta data from database: ${currentResponse.status}`, errorData);
        throw new Error(errorData.error || `Failed to fetch current period Meta data: ${currentResponse.status}`);
      }
      
      if (!prevResponse.ok) {
        const errorData = await prevResponse.json().catch(() => ({ error: "Unknown error fetching previous Meta data" }));
        console.error(`[MetaTab2] Failed to fetch previous period Meta data from database: ${prevResponse.status}`, errorData);
        throw new Error(errorData.error || `Failed to fetch previous period Meta data: ${prevResponse.status}`);
      }
      
      const currentData = await currentResponse.json();
      const previousData = await prevResponse.json();
      
      console.log(`[MetaTab2] Fetched Meta data from database for current period:`, {
        adSpend: currentData.adSpend,
        impressions: currentData.impressions,
        clicks: currentData.clicks,
        conversions: currentData.conversions,
        roas: currentData.roas,
        dailyData: Array.isArray(currentData.dailyData) ? currentData.dailyData.length : 0
      });

      // Update metaMetrics state with database data
      setMetaMetrics(prev => {
        const newMetrics = {
          ...prev,
          adSpend: currentData.adSpend || 0,
          impressions: currentData.impressions || 0,
          clicks: currentData.clicks || 0,
          conversions: currentData.conversions || 0,
          roas: currentData.roas || 0,
          ctr: currentData.ctr || 0,
          cpc: currentData.cpc || 0,
          costPerResult: currentData.costPerResult || 0,
          results: currentData.results || 0,
          purchaseValue: currentData.purchaseValue || 0,

          previousAdSpend: previousData.adSpend || 0,
          previousImpressions: previousData.impressions || 0,
          previousClicks: previousData.clicks || 0,
          previousConversions: previousData.conversions || 0,
          previousRoas: previousData.roas || 0,
          previousCtr: previousData.ctr || 0,
          previousCpc: previousData.cpc || 0,
          previousResults: previousData.results || 0,
          previousPurchaseValue: previousData.purchaseValue || 0,

          adSpendGrowth: calculatePercentChange(currentData.adSpend, previousData.adSpend),
          impressionGrowth: calculatePercentChange(currentData.impressions, previousData.impressions),
          clickGrowth: calculatePercentChange(currentData.clicks, previousData.clicks),
          conversionGrowth: calculatePercentChange(currentData.conversions, previousData.conversions),
          roasGrowth: calculatePercentChange(currentData.roas, previousData.roas),
          ctrGrowth: calculatePercentChange(currentData.ctr, previousData.ctr),
          cpcGrowth: calculatePercentChange(currentData.cpc, previousData.cpc),
          cprGrowth: calculatePercentChange(currentData.costPerResult, previousData.costPerResult),
        };
        
        console.log(`[MetaTab2] ✅ Updated metaMetrics state from database`);
        return newMetrics;
      });
      
      setMetaDaily(currentData.dailyData || []);
      hasFetchedMetaData.current = true;
      
    } catch (error) {
      console.error(`[MetaTab2] Error fetching Meta data from database:`, error);
    }
  }, [brandId, dateRange, metaConnection]);

  // Fetch campaign data
  const fetchCampaigns = useCallback(async (forceRefresh = false, skipLoadingState = false) => {
    if (!brandId || !metaConnection) {
      console.log('[MetaTab2] Cannot fetch campaigns without brandId or Meta connection');
      if (!skipLoadingState) {
        setIsLoadingCampaigns(false);
      }
      return;
    }
    
    if ((forceRefresh || campaigns.length === 0) && !skipLoadingState) { 
      setIsLoadingCampaigns(true);
    }
    
    try {
      let url = `/api/meta/campaigns?brandId=${brandId}`;
      
      let localFromDate: string | undefined;
      let localToDate: string | undefined;

      if (dateRange?.from && dateRange?.to) {
        localFromDate = dateRange.from.toISOString().split('T')[0];
        localToDate = dateRange.to.toISOString().split('T')[0];
        url += `&from=${localFromDate}&to=${localToDate}`;
        
        const isDifferentDateRange = 
          lastFetchedCampaignDates.current.from !== localFromDate || 
          lastFetchedCampaignDates.current.to !== localToDate;
        
        if (!forceRefresh && !isDifferentDateRange && campaigns.length > 0) {
          console.log('[MetaTab2] Skipping campaign fetch: dates unchanged, not forcing, and campaigns exist.');
          if (!skipLoadingState) {
            setIsLoadingCampaigns(false);
          }
          return;
        }
        lastFetchedCampaignDates.current = {from: localFromDate, to: localToDate};
      }
      
      if (forceRefresh || (localFromDate && localToDate)) {
        url += `${url.includes('?') ? '&' : '?'}forceRefresh=true&t=${Date.now()}`;
      }
      
      console.log(`[MetaTab2] Fetching Meta campaigns: ${url}`);
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText} (status: ${response.status})`);
      }
      
      const data = await response.json();
      setCampaigns(data.campaigns || []);
      console.log(`[MetaTab2] Loaded ${data.campaigns?.length || 0} Meta campaigns`);
      
    } catch (error) {
      console.error('[MetaTab2] Error fetching campaigns:', error);
    } finally {
      if (!skipLoadingState) {
        setIsLoadingCampaigns(false);
      }
    }
  }, [brandId, metaConnection, dateRange, campaigns.length]);

  // Sync Meta insights (main refresh function)
  const syncMetaInsights = async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to) {
      console.error("[MetaTab2] Cannot sync data - missing brand ID or date range");
      return;
    }
    
    const refreshId = `meta-tab2-sync-${Date.now()}`;
    
    if (isMetaFetchInProgress()) {
      console.log(`[MetaTab2] ⚠️ Meta sync skipped - fetch already in progress for refreshId: ${refreshId}`);
      toast.info("Meta data is already refreshing. Please wait.", { id: "meta-refresh-toast" });
      return;
    }
    
    if (!acquireMetaFetchLock(refreshId)) {
      console.log(`[MetaTab2] ⛔ Failed to acquire global lock for Meta sync refreshId: ${refreshId}`);
      toast.error("Failed to initiate Meta data refresh. Please try again.", { id: "meta-refresh-toast" });
      return;
    }
    
    console.log("[MetaTab2] Syncing Meta insights data through database...");
    
    // Set ALL Meta widget loading states to true for consistent loading
    setIsLoadingAllMetaWidgets(true);
    setIsLoadingCampaigns(true);
    
    toast.loading("Refreshing Meta data...", { id: "meta-refresh-toast", duration: 15000 });
    
    try {
      // Format dates in YYYY-MM-DD format
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      
      // Step 1: Sync fresh data from Meta API to database
      console.log(`[MetaTab2] 🚀 Step 1: Syncing Meta insights to database (refreshId: ${refreshId})`);
      const response = await fetch('/api/meta/insights/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Refresh-ID': refreshId
        },
        body: JSON.stringify({
          brandId,
          startDate,
          endDate,
          forceRefresh: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync Meta insights');
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`[MetaTab2] ✅ Meta insights synced successfully - synced ${result.count || 0} records from Meta`);
        
        // Step 2: Fetch refreshed data from database AND campaigns in parallel
        console.log(`[MetaTab2] 🚀 Step 2: Fetching all refreshed Meta data`);
        
        await Promise.all([
          fetchMetaDataFromDatabase(refreshId),
          fetchCampaigns(true, true)
        ]);
        
        toast.success("Meta data refreshed!", { id: "meta-refresh-toast" });
        window._lastMetaRefresh = Date.now();
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
          detail: { 
            brandId, 
            timestamp: Date.now(),
            forceRefresh: true,
            syncedRecords: result.count || 0,
            source: 'MetaTab2Sync',
            refreshId
          }
        }));
        
        console.log(`[MetaTab2] ✅ FULL Meta sync completed successfully`);
      } else {
        throw new Error(result.error || 'Failed to sync Meta insights');
      }
    } catch (error) {
      console.error(`[MetaTab2] Error syncing Meta insights:`, error);
      toast.error("Failed to sync Meta insights", {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000,
        id: "meta-refresh-toast"
      });
    } finally {
      // Clear ALL Meta widget loading states at the same time for consistent loading
      setIsLoadingAllMetaWidgets(false);
      setIsLoadingCampaigns(false);
      releaseMetaFetchLock(refreshId);
    }
  };

  // Sync campaigns
  const syncCampaigns = useCallback(async () => {
    if (!brandId || !metaConnection) {
      console.log('[MetaTab2] Cannot sync campaigns without brandId or Meta connection');
      return;
    }
    
    setIsSyncingCampaigns(true);
    toast.loading("Syncing Meta campaigns...", { id: "meta-campaigns-sync" });
    
    try {
      const response = await fetch(`/api/meta/campaigns/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          forceRefresh: true
        }),
      });
      
      if (response.ok) {
        toast.success("Meta campaigns synced", { id: "meta-campaigns-sync" });
        fetchCampaigns(true);
      } else {
        toast.error("Failed to sync Meta campaigns", { id: "meta-campaigns-sync" });
      }
    } catch (error) {
      console.error('[MetaTab2] Error syncing Meta campaigns:', error);
      toast.error("Error syncing Meta campaigns", { id: "meta-campaigns-sync" });
    } finally {
      setIsSyncingCampaigns(false);
    }
  }, [brandId, metaConnection, fetchCampaigns]);

  // Effect to handle Meta connection changes and set unified loading state
  useEffect(() => {
    if (metaConnection && brandId && dateRange?.from && dateRange?.to) {
      setIsLoadingAllMetaWidgets(true);
      console.log("[MetaTab2] Meta connection detected, setting unified loading state to true");
    } else if (!metaConnection) {
      setIsLoadingAllMetaWidgets(false);
      console.log("[MetaTab2] Meta connection lost, clearing unified loading state");
    }
  }, [metaConnection, brandId, dateRange?.from, dateRange?.to]);

  // Initial data load and refresh logic
  useEffect(() => {
    if (brandId && dateRange?.from && dateRange?.to && metaConnection) {
      console.log("[MetaTab2] Triggering initial data sync on mount or when dependencies change");
      syncMetaInsights();
    } else {
      console.log("[MetaTab2] Skipping data fetch: Missing brandId, dateRange, or Meta connection");
      setIsLoadingAllMetaWidgets(false);
      setIsLoadingCampaigns(false);
    }
  }, [brandId, dateRange, metaConnection]);

  // Listen for global refresh events
  useEffect(() => {
    const handleGlobalRefresh = (event: CustomEvent) => {
      console.log("[MetaTab2] Received global refresh event:", event.detail);
      if (event.detail?.brandId === brandId && metaConnection) {
        console.log("[MetaTab2] Global refresh event matches current brandId. Triggering Meta database sync.");
        toast.info("Syncing with recent Meta updates...", { id: "meta-global-refresh-toast" });
        syncMetaInsights();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('metaDataRefreshed', handleGlobalRefresh as EventListener);
      window.addEventListener('force-meta-refresh', handleGlobalRefresh as EventListener);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('metaDataRefreshed', handleGlobalRefresh as EventListener);
        window.removeEventListener('force-meta-refresh', handleGlobalRefresh as EventListener);
      }
    };
  }, [brandId, metaConnection]);

  // Calculate purchase value from ROAS and spend
  const purchaseValue = metaMetrics.roas * metaMetrics.adSpend;
  const previousPurchaseValue = metaMetrics.previousRoas * metaMetrics.previousAdSpend;
  const purchaseValueGrowth = calculatePercentChange(purchaseValue, previousPurchaseValue);

  if (!metaConnection) {
    return (
      <Card className="bg-[#111] border-[#333] text-center py-10">
        <CardContent className="flex flex-col items-center">
          <Image 
            src="https://i.imgur.com/6hyyRrs.png"
            alt="Meta"
            width={48}
            height={48}
            className="mb-4 opacity-50"
          />
          <h3 className="text-xl font-medium text-white mb-2">Meta Ads Not Connected</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Connect your Meta Ads account to view performance metrics and manage campaigns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Image 
            src="https://i.imgur.com/6hyyRrs.png"
            alt="Meta Ads"
            width={24}
            height={24}
            className="mr-2"
          />
          <h2 className="text-xl font-medium text-white">Meta Ads Overview</h2>
        </div>
        
        <Button
          onClick={syncMetaInsights}
          disabled={isLoadingAllMetaWidgets}
          variant="outline"
          size="sm"
          className="bg-[#111] border-[#333] hover:bg-[#222] text-white"
        >
          {isLoadingAllMetaWidgets ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </>
          )}
        </Button>
      </div>

      {/* Main metrics grid - First row of 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Ad Spend */}
        <MetricCard 
          title="Ad Spend"
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
          infoTooltip="Total amount spent on Meta ads"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={[]}
          loading={isLoadingAllMetaWidgets}
        />

        {/* Impressions */}
        <MetricCard 
          title="Impressions"
          value={metaMetrics.impressions}
          change={metaMetrics.impressionGrowth}
          previousValue={metaMetrics.previousImpressions}
          hideGraph={true}
          valueFormat="number"
          decimals={0}
          showPreviousPeriod={true}
          previousValueFormat="number"
          previousValueDecimals={0}
          infoTooltip="Total number of times your ads were viewed"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={[]}
          loading={isLoadingAllMetaWidgets}
        />

        {/* Clicks */}
        <MetricCard 
          title="Clicks"
          value={metaMetrics.clicks}
          change={metaMetrics.clickGrowth}
          previousValue={metaMetrics.previousClicks}
          hideGraph={true}
          valueFormat="number"
          decimals={0}
          showPreviousPeriod={true}
          previousValueFormat="number"
          previousValueDecimals={0}
          infoTooltip="Total number of clicks on your ads"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={[]}
          loading={isLoadingAllMetaWidgets}
        />

        {/* Conversions */}
        <MetricCard 
          title="Conversions"
          value={metaMetrics.conversions}
          change={metaMetrics.conversionGrowth}
          previousValue={metaMetrics.previousConversions}
          hideGraph={true}
          valueFormat="number"
          decimals={0}
          showPreviousPeriod={true}
          previousValueFormat="number"
          previousValueDecimals={0}
          infoTooltip="Total number of conversions from your ads"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={[]}
          loading={isLoadingAllMetaWidgets}
        />
      </div>

      {/* Second row of 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* ROAS */}
        <MetricCard 
          title="ROAS"
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
          infoTooltip="Return on ad spend (revenue / ad spend)"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={[]}
          loading={isLoadingAllMetaWidgets}
        />

        {/* CTR */}
        <MetricCard 
          title="CTR"
          value={metaMetrics.ctr / 100}
          change={metaMetrics.ctrGrowth}
          previousValue={metaMetrics.previousCtr / 100}
          valueFormat="percentage"
          decimals={2}
          hideGraph={true}
          showPreviousPeriod={true}
          previousValueFormat="percentage"
          previousValueDecimals={2}
          infoTooltip="Click-through rate (clicks ÷ impressions)"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={[]}
          loading={isLoadingAllMetaWidgets}
        />

        {/* CPC */}
        <MetricCard 
          title="Cost Per Click"
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
          infoTooltip="Average cost per click (spend ÷ clicks)"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={[]}
          loading={isLoadingAllMetaWidgets}
        />

        {/* Cost Per Result */}
        <MetricCard 
          title="Cost Per Result"
          value={metaMetrics.costPerResult || 0}
          change={metaMetrics.cprGrowth || 0}
          prefix="$"
          valueFormat="currency"
          decimals={2}
          hideGraph={true}
          showPreviousPeriod={true}
          previousValueFormat="currency"
          previousValueDecimals={2}
          previousValuePrefix="$"
          previousValue={0}
          infoTooltip="Average cost per result"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={[]}
          loading={isLoadingAllMetaWidgets}
        />
      </div>

      {/* Third row of 4 - Results, Purchase Value, and special widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Results */}
        <MetricCard 
          title="Results"
          value={metaMetrics.conversions}
          change={metaMetrics.conversionGrowth}
          valueFormat="number"
          hideGraph={true}
          showPreviousPeriod={true}
          previousValue={metaMetrics.previousConversions}
          previousValueFormat="number"
          infoTooltip="Total number of results from your ads"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={[]}
          loading={isLoadingAllMetaWidgets}
        />

        {/* Purchase Value */}
        <MetricCard 
          title="Purchase Value"
          value={purchaseValue}
          change={purchaseValueGrowth}
          prefix="$"
          valueFormat="currency"
          hideGraph={true}
          showPreviousPeriod={true}
          previousValue={previousPurchaseValue}
          previousValueFormat="currency"
          previousValuePrefix="$"
          infoTooltip="Total purchase value from your ads (calculated from ROAS × Ad Spend)"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={[]}
          loading={isLoadingAllMetaWidgets}
        />

        {/* Total Budget */}
        <TotalBudgetMetricCard 
          brandId={brandId}
          isManuallyRefreshing={false}
          disableAutoFetch={isLoadingAllMetaWidgets}
          unifiedLoading={isLoadingAllMetaWidgets}
        />

        {/* Total Reach */}
        <TotalAdSetReachCard 
          brandId={brandId} 
          dateRange={dateRange.from && dateRange.to ? dateRange : undefined}
          isManuallyRefreshing={false}
          disableAutoFetch={isLoadingAllMetaWidgets}
          unifiedLoading={isLoadingAllMetaWidgets}
        />
      </div>



      {/* Campaign Performance Widget */}
      <CampaignWidget 
        brandId={brandId}
        campaigns={campaigns}
        isLoading={isLoadingAllMetaWidgets}
        isSyncing={isSyncingCampaigns}
        dateRange={dateRange}
        onRefresh={() => fetchCampaigns(true)}
        onSync={syncCampaigns}
      />
    </div>
  );
}
