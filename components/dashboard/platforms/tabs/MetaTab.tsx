"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { 
  DollarSign, LineChart, MousePointerClick, TrendingUp, Loader2, 
  ArrowDownRight, ArrowUpRight, RefreshCw, ShoppingCart, Eye, 
  MousePointer, Target, SlidersHorizontal, Zap, ExternalLink, 
  PlusCircle, Layers, Wallet, ChevronDown, PiggyBank, 
  CircleDollarSign, Circle, Coins, Users, BarChart2,
  Sparkles, Image as ImageIcon, Activity, ArrowRight, 
  CalendarIcon, Check, ChevronsUpDown, Clock, Download, 
  FacebookIcon, MoreHorizontal, PenTool, SettingsIcon, 
  Terminal, User2, Wrench, CalendarRange, Percent, Info, 
  HelpCircle
} from "lucide-react"
import classNames from "classnames"
import { format } from "date-fns"
import { withErrorBoundary } from '@/components/ui/error-boundary'
import { isSameDay, isYesterday, subDays, startOfMonth, subMonths, endOfMonth } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Metrics } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  BrainCircuit, 
  AlertCircle,
  Settings,
} from "lucide-react"
import { MetricCard } from "@/components/metrics/MetricCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrencyCompact, formatNumberCompact, formatPercentage } from "@/lib/formatters"
import Image from "next/image"
import { AlertBox } from "@/components/ui/alert-box"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CampaignWidget } from "./CampaignWidget"
import { TotalBudgetMetricCard } from "../../../metrics/TotalBudgetMetricCard"
import MetaFixButton from "./meta-fix-button"
import { TotalAdSetReachCard } from '@/components/dashboard/platforms/metrics/TotalAdSetReachCard'
import { MetaSpecificDateSyncButton } from '@/components/dashboard/platforms/tabs/MetaSpecificDateSyncButton'

interface MetaTabProps {
  dateRange: DateRange | undefined
  metrics: any
  isLoading: boolean
  isRefreshingData?: boolean
  initialDataLoad?: boolean
  brandId: string
}

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

interface MetaMetrics {
  adSpend: number;
  adSpendGrowth: number;
  impressions: number;
  impressionGrowth: number;
  clicks: number;
  clickGrowth: number;
  conversions: number;
  conversionGrowth: number;
  ctr: number;
  ctrGrowth: number;
  cpc: number;
  costPerResult: number;
  cprGrowth: number;
  roas: number;
  roasGrowth: number;
  reach: number;
  reachGrowth: number;
  purchaseValue: number;
  purchaseValueGrowth: number;
  dailyData: DailyDataItem[];
  previousAdSpend: number;
  previousImpressions: number;
  previousClicks: number;
  previousConversions: number;
  previousCtr: number;
  previousCpc: number;
  previousCostPerResult: number;
  previousRoas: number;
  previousReach: number;
  previousPurchaseValue: number;
}

declare global {
  interface Window {
    _metaFetchLock?: boolean;
    _lastMetaRefresh?: number;
  }
}

if (typeof window !== 'undefined') {
  window._metaFetchLock = window._metaFetchLock || false;
  window._lastMetaRefresh = window._lastMetaRefresh || 0;
}

function isMetaFetchInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  return window._metaFetchLock === true;
}

function acquireMetaFetchLock(): boolean {
  if (typeof window === 'undefined') return true;
  if (window._metaFetchLock === true) {
    return false;
  }
  window._metaFetchLock = true;
  return true;
}

function releaseMetaFetchLock(): void {
  if (typeof window === 'undefined') return;
  window._metaFetchLock = false;
}

export function MetaTab({ brandId, dateRange }: MetaTabProps) {
  const [metricsData, setMetricsData] = useState<MetaMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadComplete = useRef<boolean>(false);

  const toLocalISODateString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getPreviousPeriodDates = useCallback((from: Date, to: Date): { prevFrom: string, prevTo: string } => {
    const fromNormalized = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const toNormalized = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    
    const isSingleDay = isSameDay(fromNormalized, toNormalized);
    if (isSingleDay) {
      const prevDay = new Date(fromNormalized);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = toLocalISODateString(prevDay);
      return { prevFrom: prevDayStr, prevTo: prevDayStr };
    }
    
    const diffTime = Math.abs(toNormalized.getTime() - fromNormalized.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const prevFromDate = new Date(fromNormalized);
    prevFromDate.setDate(fromNormalized.getDate() - diffDays);

    const prevToDate = new Date(toNormalized);
    prevToDate.setDate(toNormalized.getDate() - diffDays);

    return {
      prevFrom: toLocalISODateString(prevFromDate),
      prevTo: toLocalISODateString(prevToDate)
    };
  }, []);

  const fetchCampaigns = useCallback(async (isManualRefresh = false) => {
    if (!brandId) return [];
    let url = `/api/meta/campaigns?brandId=${brandId}`;
    if (dateRange?.from && dateRange?.to) {
      url += `&from=${toLocalISODateString(dateRange.from)}&to=${toLocalISODateString(dateRange.to)}`;
    }
    if (isManualRefresh) {
      url += `&forceRefresh=true`;
    }
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
      const data = await response.json();
      return data.campaigns || [];
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      return [];
    }
  }, [brandId, dateRange]);

  const fetchAllMetaData = useCallback(async (isManualRefresh = false) => {
    if (!brandId || !dateRange?.from || !dateRange?.to) return;
    if (isMetaFetchInProgress()) {
      if(isManualRefresh) toast.info("A refresh is already in progress.");
      return;
    }
    
    acquireMetaFetchLock();
    setIsLoading(true);
    setError(null);
    if (isManualRefresh) {
      toast.loading("Refreshing Meta data...", { id: "meta-refresh-toast" });
    }

    try {
      const { from, to } = dateRange;
      const { prevFrom, prevTo } = getPreviousPeriodDates(from, to);

      const buildParams = (startDate: string, endDate: string) => new URLSearchParams({ brandId, from: startDate, to: endDate, bypass_cache: isManualRefresh ? 'true' : 'false' });

      const [currentResponse, prevResponse, campaignsData] = await Promise.all([
        fetch(`/api/metrics/meta?${buildParams(toLocalISODateString(from), toLocalISODateString(to))}`, { cache: 'no-store' }),
        fetch(`/api/metrics/meta?${buildParams(prevFrom, prevTo)}`, { cache: 'no-store' }),
        fetchCampaigns(isManualRefresh)
      ]);

      if (!currentResponse.ok || !prevResponse.ok) {
        throw new Error('Failed to fetch metrics data.');
      }

      const currentData = await currentResponse.json();
      const previousData = await prevResponse.json();
      setCampaigns(campaignsData);

      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? Infinity : 0;
        return ((current - previous) / previous) * 100;
      };

      setMetricsData({
        adSpend: currentData.adSpend || 0,
        impressions: currentData.impressions || 0,
        clicks: currentData.clicks || 0,
        conversions: currentData.conversions || 0,
        ctr: currentData.ctr || 0,
        cpc: currentData.cpc || 0,
        costPerResult: currentData.costPerResult || 0,
        roas: currentData.roas || 0,
        reach: currentData.reach || 0,
        purchaseValue: currentData.purchaseValue || 0,
        previousAdSpend: previousData.adSpend || 0,
        previousImpressions: previousData.impressions || 0,
        previousClicks: previousData.clicks || 0,
        previousConversions: previousData.conversions || 0,
        previousCtr: previousData.ctr || 0,
        previousCpc: previousData.cpc || 0,
        previousCostPerResult: previousData.costPerResult || 0,
        previousRoas: previousData.roas || 0,
        previousReach: previousData.reach || 0,
        previousPurchaseValue: previousData.purchaseValue || 0,
        adSpendGrowth: calculateGrowth(currentData.adSpend, previousData.adSpend),
        impressionGrowth: calculateGrowth(currentData.impressions, previousData.impressions),
        clickGrowth: calculateGrowth(currentData.clicks, previousData.clicks),
        conversionGrowth: calculateGrowth(currentData.conversions, previousData.conversions),
        ctrGrowth: calculateGrowth(currentData.ctr, previousData.ctr),
        cprGrowth: calculateGrowth(currentData.costPerResult, previousData.costPerResult),
        roasGrowth: calculateGrowth(currentData.roas, previousData.roas),
        reachGrowth: calculateGrowth(currentData.reach, previousData.reach),
        purchaseValueGrowth: calculateGrowth(currentData.purchaseValue, previousData.purchaseValue),
        dailyData: currentData.dailyData || [],
      });
      
      if (isManualRefresh) {
        toast.success("Meta data refreshed!", { id: "meta-refresh-toast" });
        window._lastMetaRefresh = Date.now();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      if (isManualRefresh) {
        toast.error("Failed to refresh Meta data.", { id: "meta-refresh-toast" });
      }
    } finally {
      setIsLoading(false);
      releaseMetaFetchLock();
      initialLoadComplete.current = true;
    }
  }, [brandId, dateRange, getPreviousPeriodDates, fetchCampaigns]);

  useEffect(() => {
    fetchAllMetaData(false);
  }, [fetchAllMetaData]);

  const handleManualRefresh = async () => {
    if (!brandId) return;
    if (isMetaFetchInProgress()) {
      toast.info("A refresh is already in progress.");
      return;
    }
    
    acquireMetaFetchLock();
    setIsLoading(true);
    toast.loading("Syncing with Meta API...", { id: "meta-sync-toast" });

    try {
      const response = await fetch(`/api/meta/sync?brandId=${brandId}`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`API sync failed: ${response.statusText}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Sync failed.');
      }
      toast.success("Sync successful! Fetching updated data...", { id: "meta-sync-toast" });
      await fetchAllMetaData(true);
    } catch (err) {
      toast.error("Failed to sync with Meta API.", { description: (err as Error).message, id: "meta-sync-toast" });
      setIsLoading(false); // Stop loading on sync error
    } finally {
        releaseMetaFetchLock();
    }
  };

  if (!initialLoadComplete.current && isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-500/50 text-white p-4">
        <CardHeader>
          <CardTitle>Error Loading Meta Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button onClick={() => fetchAllMetaData(true)} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Meta Ads Overview</h2>
        <div className="flex items-center gap-2">
          <Button onClick={handleManualRefresh} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Key Metrics</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Ad Spend"
              value={metricsData?.adSpend ?? 0}
              change={metricsData?.adSpendGrowth ?? 0}
              previousValue={metricsData?.previousAdSpend ?? 0}
              prefix="$"
              loading={isLoading}
              valueFormat="currency"
              data={[]}
            />
            <MetricCard
              title="ROAS"
              value={metricsData?.roas ?? 0}
              change={metricsData?.roasGrowth ?? 0}
              previousValue={metricsData?.previousRoas ?? 0}
              suffix="x"
              loading={isLoading}
              data={[]}
            />
            <MetricCard
              title="Impressions"
              value={metricsData?.impressions ?? 0}
              change={metricsData?.impressionGrowth ?? 0}
              previousValue={metricsData?.previousImpressions ?? 0}
              loading={isLoading}
              data={[]}
            />
            <MetricCard
              title="Clicks"
              value={metricsData?.clicks ?? 0}
              change={metricsData?.clickGrowth ?? 0}
              previousValue={metricsData?.previousClicks ?? 0}
              loading={isLoading}
              data={[]}
            />
            <MetricCard
              title="Purchase Value"
              value={metricsData?.purchaseValue ?? 0}
              change={metricsData?.purchaseValueGrowth ?? 0}
              previousValue={metricsData?.previousPurchaseValue ?? 0}
              prefix="$"
              loading={isLoading}
              valueFormat="currency"
              data={[]}
            />
            <MetricCard
              title="Results (Conversions)"
              value={metricsData?.conversions ?? 0}
              change={metricsData?.conversionGrowth ?? 0}
              previousValue={metricsData?.previousConversions ?? 0}
              loading={isLoading}
              data={[]}
            />
            <MetricCard
              title="Cost Per Result"
              value={metricsData?.costPerResult ?? 0}
              change={metricsData?.cprGrowth ?? 0}
              previousValue={metricsData?.previousCostPerResult ?? 0}
              prefix="$"
              loading={isLoading}
              valueFormat="currency"
              data={[]}
            />
            <MetricCard
              title="Cost Per Click (CPC)"
              value={metricsData?.cpc ?? 0}
              change={0} // No CPC growth in this model yet
              previousValue={metricsData?.previousCpc ?? 0}
              prefix="$"
              loading={isLoading}
              valueFormat="currency"
              data={[]}
            />
            <MetricCard
              title="Click-Through Rate (CTR)"
              value={(metricsData?.ctr ?? 0)}
              change={metricsData?.ctrGrowth ?? 0}
              previousValue={metricsData?.previousCtr ?? 0}
              valueFormat="percentage"
              loading={isLoading}
              data={[]}
            />
             <TotalAdSetReachCard
                brandId={brandId} 
                dateRange={dateRange}
                unifiedLoading={isLoading}
             />
             <TotalBudgetMetricCard 
                brandId={brandId}
                unifiedLoading={isLoading}
             />
          </div>
        </TabsContent>
        <TabsContent value="campaigns" className="pt-4">
           <CampaignWidget
            brandId={brandId}
            campaigns={campaigns}
            isLoading={isLoading}
            isSyncing={isLoading}
            dateRange={dateRange}
            onRefresh={() => fetchAllMetaData(true)}
            onSync={handleManualRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default withErrorBoundary(MetaTab, {
  onError: (error) => {
    console.error("MetaTab error caught by boundary:", error)
  }
})
