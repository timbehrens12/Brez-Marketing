"use client"

/**
 * Dashboard Page
 * 
 * Loading behavior:
 * 1. When a brand is first selected, initialDataLoad is set to true
 * 2. When initialDataLoad is true, a full-screen loading spinner is shown
 * 3. After data is loaded, initialDataLoad is set to false
 * 4. For subsequent refreshes, only the corner loading indicator is shown
 * 5. Manual refreshes using the refresh button always use the corner loading indicator
 */

import { useState, useEffect, useRef, useCallback, startTransition } from "react"
import { useAuth, SignIn } from "@clerk/nextjs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlatformTabs } from "@/components/dashboard/platforms/PlatformTabs"
import { DateRange } from "react-day-picker"
import { MetaContent } from "@/components/dashboard/platforms/MetaContent"
import { getSupabaseClient } from "@/lib/supabase/client"
import BrandSelector from "@/components/BrandSelector"
import { useBrandContext } from '@/lib/context/BrandContext'
import { defaultMetrics, type Metrics, type CustomerSegments } from '@/types/metrics'
import { PlatformConnection } from '@/types/platformConnection'
import { calculateMetrics } from "@/lib/metrics"
import { MetricCard } from "@/components/metrics/MetricCard"
import { ShopifyTab } from "@/components/dashboard/platforms/tabs/ShopifyTab"
import { MetaTab } from "@/components/dashboard/platforms/tabs/MetaTab"
import { transformToMetaMetrics } from '@/lib/transforms'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/DateRangePicker"
import { WidgetManager } from "@/components/dashboard/WidgetManager"
import { useMetrics } from "@/lib/contexts/MetricsContext"
import { addDays, startOfDay, endOfDay, format, isAfter, isBefore, parseISO, subDays } from "date-fns"
import { useBrandStore } from "@/stores/brandStore"
import { useConnectionStore } from "@/stores/connectionStore"

// Removed useSupabase import since we're using the singleton client
import { Info, LayoutGrid, Loader2, BarChart3, Settings } from "lucide-react"
import { GlobalRefreshButton } from "@/components/dashboard/GlobalRefreshButton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { GreetingWidget } from "@/components/dashboard/GreetingWidget"
import { AINotification } from "@/components/dashboard/AINotification"
import { useNotifications } from "@/contexts/NotificationContext"
import { useDataRefresh } from '@/lib/hooks/useDataRefresh'
import { UnifiedLoading } from "@/components/ui/unified-loading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatters"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import useSWR from 'swr'
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { DashboardErrorBoundary } from "@/components/ErrorBoundary"

interface WidgetData {
  shopify?: any;
  meta?: any;
}

const initialMetrics: Metrics = {
  totalSales: 0,
  ordersPlaced: 0,
  averageOrderValue: 0,
  unitsSold: 0,
  revenueByDay: [],
  topProducts: [],
  salesGrowth: 0,
  ordersGrowth: 0,
  unitsGrowth: 0,
  aovGrowth: 0,
  conversionRate: 0,
  conversionRateGrowth: 0,
  customerSegments: {
    newCustomers: 0,
    returningCustomers: 0
  },
  customerRetentionRate: 0,
  retentionGrowth: 0,
  returnRate: 0,
  returnGrowth: 0,
  dailyData: [],
  adSpend: 0,
  adSpendGrowth: 0,
  roas: 0,
  roasGrowth: 0,
  impressions: 0,
  impressionGrowth: 0,
  ctr: 0,
  ctrGrowth: 0,
  clicks: 0,
  clickGrowth: 0,
  conversions: 0,
  conversionGrowth: 0,
  costPerResult: 0,
  cprGrowth: 0
}

// Add global variable to completely disable automatic Meta API calls
// This will be part of the window object
const DISABLE_AUTO_META_FETCH = false;

// Add global type for window._blockMetaApiCalls
declare global {
  interface Window {
    _blockMetaApiCalls?: boolean;
    _disableAutoMetaFetch?: boolean;
    _initialLoadTimeoutId?: NodeJS.Timeout;
    _metaTabSwitchInProgress?: boolean;
    _metaFetchLock?: boolean;
    _activeFetchIds?: Set<number | string>;
    _dashboardInitialSetup?: boolean;
  }
}

// Add this function at the top of your file, outside the component
function formatDate(date: Date | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Add a constant for maximum loading time
const MAX_LOADING_TIME = 30000; // 30 seconds maximum loading time

export default function DashboardPage() {
  // console.log('[Dashboard] Component render started')
  
  // Log each hook call to identify which one causes the error
  // console.log('[Dashboard] Calling useAuth')
  const { userId, isLoaded } = useAuth()
  
  // console.log('[Dashboard] Calling useBrandContext')
  const { brands, selectedBrandId, setSelectedBrandId, isLoading: brandsLoading } = useBrandContext()
  
  // console.log('[Dashboard] Calling useNotifications')
  const { addNotification } = useNotifications()
  
  // console.log('[Dashboard] useState calls starting')
  const [dateRange, setDateRange] = useState({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  })
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null)
  const [metrics, setMetrics] = useState<Metrics>(defaultMetrics)
  const [isLoading, setIsLoading] = useState(true)
  const [initialDataLoad, setInitialDataLoad] = useState(true)
  const [activePlatforms, setPlatformStatus] = useState({
    shopify: false,
    meta: false
  })
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("site")
  const [isEditMode, setIsEditMode] = useState(false)
  
  // Add a state to track if we're in the initial setup phase
  const [isInitialSetup, setIsInitialSetup] = useState(true)
  
  // console.log('[Dashboard] Calling useMetrics')
  const { metrics: contextMetrics, isLoading: contextIsLoading, fetchMetrics } = useMetrics()
  
  // console.log('[Dashboard] Calling usePathname')
  const pathname = usePathname()

  // console.log('[Dashboard] Calling useBrandStore')
  const { selectedBrandId: brandStoreSelectedBrandId } = useBrandStore()
  
  // console.log('[Dashboard] Calling useConnectionStore')
  const { connections: connectionStoreConnections } = useConnectionStore()
  
  // console.log('[Dashboard] All hooks initialized successfully')

  // Remove useSupabase hook since we're using the singleton client

  // Add a new state for data refresh that's separate from initial loading
  const [isRefreshingData, setIsRefreshingData] = useState(false);

  // Add a ref to track if we're still mounted
  const isMounted = useRef(true);

  // Track the number of auto-refresh cycles so we can do a full resync periodically
  const autoRefreshCountRef = useRef(0);
  
  // Track the last pathname to identify page navigation
  const lastPathRef = useRef(pathname);
  
  // Last time we did a hard refresh to avoid too frequent refreshes
  const lastHardRefreshRef = useRef(Date.now());

  // Flag to track initial page load
  const initialLoadFlag = useRef(true);

  // Add a flag to prevent multiple initial loads
  const initialLoadStarted = useRef(false);

  // Set the global flag on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window._disableAutoMetaFetch = DISABLE_AUTO_META_FETCH;
      window._dashboardInitialSetup = true;
    }
    
    // Add a small delay to ensure all contexts are properly initialized
    const initTimer = setTimeout(() => {
      if (initialLoadFlag.current && selectedBrandId) {
        // console.log('[Dashboard] Initial load delayed initialization complete');
        initialLoadFlag.current = false;
      }
      
      // Clear the initial setup flag after a delay
      if (typeof window !== 'undefined') {
        window._dashboardInitialSetup = false;
      }
      setIsInitialSetup(false);
    }, 1000);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(initTimer);
      if (typeof window !== 'undefined') {
        window._disableAutoMetaFetch = false;
        window._dashboardInitialSetup = false;
      }
    };
  }, [selectedBrandId]);

  // Load initial connections when component mounts - but only after initial setup
  useEffect(() => {
    if (isInitialSetup || !selectedBrandId) return;
    
    let cancelled = false

    async function loadConnections() {
      if (!selectedBrandId || cancelled) return

      try {
        // console.log('🔗 Loading platform connections for brand:', selectedBrandId)
        const { data: connections, error } = await getSupabaseClient()
          .from('platform_connections')
          .select('*')
          .eq('brand_id', selectedBrandId)
          .eq('status', 'active')

        if (error) throw error

        if (!cancelled) {
          // console.log('✅ Platform connections loaded:', connections)
          
          // Batch state updates using startTransition for non-urgent updates
          startTransition(() => {
            setConnections(connections as unknown as PlatformConnection[] || [])
            
            // Update active platforms
            setPlatformStatus({
              shopify: connections?.some((c: any) => c.platform_type === 'shopify') || false,
              meta: connections?.some((c: any) => c.platform_type === 'meta') || false
            })
          })
        }

      } catch (error) {
        if (!cancelled) {
          // console.error('❌ Error loading connections:', error)
        }
      }
    }

    loadConnections()

    return () => {
      cancelled = true
    }
  }, [selectedBrandId, isInitialSetup])

  useEffect(() => {
    let cancelled = false;
    
    const handleBrandSelected = async (event: CustomEvent) => {
      if (cancelled || isInitialSetup) return;
      
      const brandId = event.detail.brandId
      // console.log('🎯 Selected brand:', brandId)
      
      // Only set initialDataLoad if we haven't started loading yet
      if (!cancelled && !initialLoadStarted.current) {
        initialLoadStarted.current = true;
        setInitialDataLoad(true)
      }

      try {
        // console.log('🔍 Fetching platform connections...')
        // Fetch platform connections from Supabase
        const { data: connections, error } = await getSupabaseClient()
          .from('platform_connections')
          .select('*')
          .eq('brand_id', brandId)

        if (error) {
          // console.error('❌ Error fetching connections:', error)
          return
        }

        if (cancelled) return;

        // console.log('✅ Platform connections fetched:', connections)

        // Update platforms state based on connections from database
        const hasShopify = connections.some((c: any) => 
          c.platform_type === 'shopify' && c.status === 'active'
        )
        const hasMeta = connections.some((c: any) => 
          c.platform_type === 'meta' && c.status === 'active'
        )

        if (!cancelled) {
          // Batch all state updates together
          startTransition(() => {
            setPlatformStatus({
              shopify: hasShopify,
              meta: hasMeta
            })

            // If Shopify is connected, set the store
            const shopifyConnection = connections.find((c: any) => 
              c.platform_type === 'shopify' && c.status === 'active'
            ) as PlatformConnection | undefined

            if (hasShopify && shopifyConnection?.shop) {
              setSelectedStore(shopifyConnection.shop)
            }
          })
        }
      } catch (error) {
        if (!cancelled) {
          // console.error('❌ Error in handleBrandSelected:', error);
          // Set a fallback state to prevent infinite loading
          setInitialDataLoad(false);
          initialLoadStarted.current = false;
        }
      }
    }

    // console.log('🎧 Adding brandSelected event listener')
    window.addEventListener('brandSelected', handleBrandSelected as unknown as EventListener)
    
    return () => {
      cancelled = true;
      // console.log('🎧 Removing brandSelected event listener')
      window.removeEventListener('brandSelected', handleBrandSelected as unknown as EventListener)
    }
  }, [setSelectedStore, isInitialSetup])

  // NEW DAY DETECTION LOGIC - Handle overnight tab scenario
  useEffect(() => {
    let cancelled = false;
    let dayCheckInterval: NodeJS.Timeout | null = null;
    let refreshTimeout: NodeJS.Timeout | null = null;
    
    // Function to detect if we've crossed into a new day
    const checkForNewDay = () => {
      if (cancelled) return;
      
      const now = new Date();
      const currentDateStr = format(now, 'yyyy-MM-dd');
      
      // Get the last known date from localStorage
      const lastKnownDateKey = `lastKnownDate_${selectedBrandId}`;
      const lastKnownDate = localStorage.getItem(lastKnownDateKey);
      
      // If this is the first time visiting or we have no stored date, just store current date
      if (!lastKnownDate) {
        localStorage.setItem(lastKnownDateKey, currentDateStr);
        return;
      }
      
      // If we've crossed into a new day
      if (lastKnownDate !== currentDateStr) {
        // console.log(`[Dashboard] 🌅 NEW DAY DETECTED! Last known: ${lastKnownDate}, Current: ${currentDateStr}`);
        
        // Update the stored date
        localStorage.setItem(lastKnownDateKey, currentDateStr);
        
        // Check if the current date range is showing yesterday's date
        if (dateRange?.from && dateRange?.to) {
          const selectedFromStr = format(dateRange.from, 'yyyy-MM-dd');
          const selectedToStr = format(dateRange.to, 'yyyy-MM-dd');
          
          // If we're viewing yesterday's data and it's now a new day, we need to handle this
          if (selectedFromStr === lastKnownDate && selectedToStr === lastKnownDate) {
            // console.log(`[Dashboard] 📅 Tab was left on yesterday (${lastKnownDate}), now it's ${currentDateStr}`);
            // console.log(`[Dashboard] 🔄 Performing new day transition with proper data backfill`);
            
            // Dispatch a custom event to notify all components about the new day transition
            window.dispatchEvent(new CustomEvent('newDayDetected', { 
              detail: { 
                previousDate: lastKnownDate,
                currentDate: currentDateStr,
                brandId: selectedBrandId,
                wasViewingPreviousDay: true,
                timestamp: Date.now()
              }
            }));
            
            // Clear any cached Meta data to force fresh sync
            if (window._metaTimeouts) {
              window._metaTimeouts.forEach(timeout => clearTimeout(timeout));
              window._metaTimeouts = [];
            }
            
            // Reset Meta API flags to ensure fresh data fetch
            window._blockMetaApiCalls = false;
            window._disableAutoMetaFetch = false;
            
            // Force a complete data refresh for both yesterday and today
            // console.log(`[Dashboard] 💪 Forcing complete data refresh for date transition`);
            if (!cancelled) {
              setIsRefreshingData(true);
              
              // Trigger refresh with special flag for new day handling
              refreshTimeout = setTimeout(() => {
                if (!cancelled) {
                  fetchAllData(true); // Force full Meta resync
                }
              }, 500);
            }
          }
        }
      }
    };
    
    // Check immediately on mount
    if (selectedBrandId && !cancelled) {
      checkForNewDay();
    }
    
    // Set up an interval to check every minute for day changes
    dayCheckInterval = setInterval(() => {
      if (!cancelled) {
        checkForNewDay();
      }
    }, 60000); // Check every minute
    
    // Also check when the page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedBrandId && !cancelled) {
        checkForNewDay();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      cancelled = true;
      if (dayCheckInterval) {
        clearInterval(dayCheckInterval);
      }
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedBrandId, dateRange]); // Re-run when brand or date range changes

  // Load widget data when connections change
  useEffect(() => {
    // Skip during initial setup to prevent cascading renders
    if (isInitialSetup || !selectedBrandId || !connections.length) return

    let cancelled = false

    async function loadWidgetData() {
      if (!selectedBrandId || !connections.length || cancelled) return

      const shopifyConnection = connections.find(c => 
        c.platform_type === 'shopify' && c.status === 'active'
      )
      
      if (shopifyConnection && !cancelled) {
        try {
          // console.log('Fetching Shopify data for connection:', shopifyConnection.id)
          const { data: orders, error: ordersError } = await getSupabaseClient()
            .from('shopify_orders')
            .select('*')
            .eq('connection_id', shopifyConnection.id)
            .order('created_at', { ascending: false })

          if (ordersError) {
            // console.error('Error loading Shopify orders:', ordersError)
            return
          }

          if (cancelled) return

          // Process orders data
          const processedData = orders?.map(order => ({
            id: order.id,
            created_at: order.created_at,
            total_price: typeof order.total_price === 'string' ? parseFloat(order.total_price) : (order.total_price || 0),
            customer_id: order.customer_id,
            line_items: order.line_items
          })) || []

          // Use startTransition for non-urgent update
          startTransition(() => {
            setWidgetData(current => ({
              ...current,
              shopify: processedData
            }))
          })
        } catch (error) {
          if (!cancelled) {
            // console.error('Error loading Shopify data:', error)
          }
        }
      }

      const metaConnection = connections.find((c: any) => 
        c.platform_type === 'meta' && c.status === 'active'
      ) as PlatformConnection | undefined

      if (metaConnection) {
        try {
          // Load Meta data from the new meta_ad_insights table
          const { data: metaData, error } = await getSupabaseClient()
            .from('meta_ad_insights')
            .select('*')
            .eq('connection_id', metaConnection.id)
            .limit(10) // Get a few recent entries
            .order('date', { ascending: false })
          
          if (error) {
            // console.error('Error querying meta_ad_insights:', error)
            // Fallback to empty data
            startTransition(() => {
              setWidgetData(current => ({
                ...current,
                meta: { available: false }
              }))
            })
          } else {
            // Update widget data using startTransition
            startTransition(() => {
              setWidgetData(current => ({
                ...current,
                meta: metaData && metaData.length > 0 ? 
                  { available: true, insights: metaData } : 
                  { available: false }
              }))
            })
          }
        } catch (error) {
          // console.error('Error loading Meta data:', error)
          // Fallback to empty data
          startTransition(() => {
            setWidgetData(current => ({
              ...current,
              meta: { available: false }
            }))
          })
        }
      }
    }

    loadWidgetData()

    return () => {
      cancelled = true
    }
  }, [selectedBrandId, connections, isInitialSetup])

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Single coordinated data loading effect - handles all data fetching to prevent multiple refreshes
  useEffect(() => {
    // Skip during initial setup
    if (isInitialSetup) return;
    
    if (!selectedBrandId || !dateRange?.from || !dateRange?.to) {
      setMetrics(defaultMetrics)
      return
    }
    
    // Format dates immediately to avoid timezone issues later
    const fromDateStr = format(dateRange.from, 'yyyy-MM-dd');
    const toDateStr = format(dateRange.to, 'yyyy-MM-dd');
    // console.log(`[Dashboard Unified Data Loading] Triggered with formatted dates: ${fromDateStr} to ${toDateStr}`);

    let cancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const loadMetrics = async () => {
      if (!selectedBrandId || cancelled) return;
      
      // Only set loading on true initial load, not during setup phase
      if (initialDataLoad && !window._dashboardInitialSetup) {
        setIsLoading(true);
      }
      
      // Set up a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (isMounted.current && !cancelled) {
          // console.error('Loading timeout reached');
          setIsLoading(false);
          setInitialDataLoad(false);
          initialLoadStarted.current = false;
          toast({
            title: "Loading timeout",
            description: "The dashboard is taking longer than expected to load. Please try refreshing.",
            variant: "destructive"
          });
        }
      }, MAX_LOADING_TIME);
      
      try {
        // Use URLSearchParams for consistency with other API calls
        const params = new URLSearchParams({
          brandId: selectedBrandId,
          from: fromDateStr,
          to: toDateStr,
          // Add cache busting and other parameters
          t: Date.now().toString(),
          force: 'true',
          bypass_cache: 'true'
        });
        
        // console.log(`[Dashboard] Loading metrics with params:`, Object.fromEntries(params));
        
        const response = await fetch(`/api/metrics?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Create a fully initialized and type-safe metrics object
        const safeMetrics = {
          // Basic revenue metrics
          totalSales: typeof data.totalSales === 'number' ? data.totalSales : 0,
          salesGrowth: typeof data.salesGrowth === 'number' ? data.salesGrowth : 0,
          averageOrderValue: typeof data.averageOrderValue === 'number' ? data.averageOrderValue : 0,
          aovGrowth: typeof data.aovGrowth === 'number' ? data.aovGrowth : 0,
          
          // Order metrics
          ordersPlaced: typeof data.ordersPlaced === 'number' ? data.ordersPlaced : 0,
          ordersGrowth: typeof data.ordersGrowth === 'number' ? data.ordersGrowth : 0,
          unitsSold: typeof data.unitsSold === 'number' ? data.unitsSold : 0,
          unitsGrowth: typeof data.unitsGrowth === 'number' ? data.unitsGrowth : 0,
          
          // Conversion metrics
          conversionRate: typeof data.conversionRate === 'number' ? data.conversionRate : 0,
          conversionGrowth: typeof data.conversionGrowth === 'number' ? data.conversionGrowth : 0,
          
          // Ad metrics
          adSpend: typeof data.adSpend === 'number' ? data.adSpend : 0,
          adSpendGrowth: typeof data.adSpendGrowth === 'number' ? data.adSpendGrowth : 0,
          roas: typeof data.roas === 'number' ? data.roas : 0,
          roasGrowth: typeof data.roasGrowth === 'number' ? data.roasGrowth : 0,
          impressions: typeof data.impressions === 'number' ? data.impressions : 0,
          impressionGrowth: typeof data.impressionGrowth === 'number' ? data.impressionGrowth : 0,
          clicks: typeof data.clicks === 'number' ? data.clicks : 0,
          clickGrowth: typeof data.clickGrowth === 'number' ? data.clickGrowth : 0,
          
          // Customer metrics
          customerRetentionRate: typeof data.customerRetentionRate === 'number' ? data.customerRetentionRate : 0,
          retentionGrowth: typeof data.retentionGrowth === 'number' ? data.retentionGrowth : 0,
          
          // Arrays and objects (with type checking)
          topProducts: Array.isArray(data.topProducts) ? data.topProducts : [],
          dailyData: Array.isArray(data.dailyData) ? data.dailyData : [],
          salesData: Array.isArray(data.salesData) ? data.salesData : [],
          revenueByDay: Array.isArray(data.revenueByDay) ? data.revenueByDay : [],
          customerSegments: data.customerSegments && typeof data.customerSegments === 'object' ? data.customerSegments : {}
        };
        
        if (isMounted.current && !cancelled) {
          // Batch the metrics update with other state changes
          startTransition(() => {
            setMetrics(prevMetrics => ({
              ...prevMetrics,
              totalSales: data.totalSales ?? prevMetrics.totalSales,
              salesGrowth: data.salesGrowth ?? prevMetrics.salesGrowth,
              ordersPlaced: data.ordersPlaced ?? prevMetrics.ordersPlaced,
              ordersGrowth: data.ordersGrowth ?? prevMetrics.ordersGrowth,
              unitsSold: data.unitsSold ?? prevMetrics.unitsSold,
              unitsGrowth: data.unitsGrowth ?? prevMetrics.unitsGrowth,
              averageOrderValue: data.averageOrderValue ?? prevMetrics.averageOrderValue,
              aovGrowth: data.aovGrowth ?? prevMetrics.aovGrowth,
              customerRetentionRate: data.customerRetentionRate ?? prevMetrics.customerRetentionRate,
              retentionGrowth: data.retentionGrowth ?? prevMetrics.retentionGrowth,
              conversionRate: data.conversionRate ?? prevMetrics.conversionRate,
              conversionGrowth: data.conversionGrowth ?? prevMetrics.conversionGrowth,
              returnRate: data.returnRate ?? prevMetrics.returnRate,
              returnGrowth: data.returnGrowth ?? prevMetrics.returnGrowth,
              conversionRateGrowth: data.conversionRateGrowth ?? prevMetrics.conversionRateGrowth,
              ctr: data.ctr ?? prevMetrics.ctr,
              ctrGrowth: data.ctrGrowth ?? prevMetrics.ctrGrowth,
              clicks: data.clicks ?? prevMetrics.clicks,
              clickGrowth: data.clickGrowth ?? prevMetrics.clickGrowth,
              impressions: data.impressions ?? prevMetrics.impressions,
              impressionGrowth: data.impressionGrowth ?? prevMetrics.impressionGrowth,
              adSpend: data.adSpend ?? prevMetrics.adSpend,
              adSpendGrowth: data.adSpendGrowth ?? prevMetrics.adSpendGrowth,
              conversions: data.conversions ?? prevMetrics.conversions,
              costPerResult: data.costPerResult ?? prevMetrics.costPerResult,
              cprGrowth: data.cprGrowth ?? prevMetrics.cprGrowth,
              topProducts: data.topProducts ?? prevMetrics.topProducts,
              revenueByDay: data.revenueByDay ?? prevMetrics.revenueByDay,
              dailyData: data.dailyData ?? prevMetrics.dailyData,
              customerSegments: data.customerSegments ?? prevMetrics.customerSegments,
              salesData: data.salesData ?? prevMetrics.salesData,
              ordersData: data.ordersData ?? prevMetrics.ordersData,
              aovData: data.aovData ?? prevMetrics.aovData,
              unitsSoldData: data.unitsSoldData ?? prevMetrics.unitsSoldData
            }));
          });
        }
        
      } catch (error) {
        // console.error('Error loading metrics:', error);
        if (isMounted.current && !cancelled) {
          // Initialize with empty metrics to prevent undefined errors
          setMetrics(defaultMetrics);
          toast({
            title: "Error loading data",
            description: "There was an error loading the dashboard data. Please try refreshing.",
            variant: "destructive"
          });
        }
      } finally {
        if (isMounted.current && !cancelled) {
          setIsLoading(false);
          setInitialDataLoad(false);
          initialLoadStarted.current = false;
          
          // Run gap detection after initial data load is complete (non-blocking)
          setTimeout(() => {
            if (!cancelled && activePlatforms.meta) {
              detectMetaDataGaps();
            }
          }, 2000); // Small delay to ensure all data is loaded
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    // Add a small delay before loading metrics to ensure setup is complete
    const delayTimer = setTimeout(() => {
      if (!cancelled) {
        loadMetrics();
      }
    }, isInitialSetup ? 0 : 100);

    // Return cleanup function
    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      clearTimeout(delayTimer);
    };
  }, [selectedBrandId, dateRange, isInitialSetup, activePlatforms.meta]);

  // Update the fetchMetaMetrics function to remove blockers and always force refresh
  const fetchMetaMetrics = useCallback(async (initialLoad: boolean = false, forceRefresh: boolean = true) => {
    // console.log(`fetchMetaMetrics called - initialLoad: ${initialLoad}, forceRefresh: ${forceRefresh}`);
    
    // Remove the blocking condition - we always want to fetch fresh Meta data
    if (!selectedBrandId) return;
    
    try {
      let startDateStr, endDateStr;
      if (dateRange?.from && dateRange?.to) {
        // Use format() here as well
        startDateStr = format(dateRange.from, 'yyyy-MM-dd');
        endDateStr = format(dateRange.to, 'yyyy-MM-dd');
      } else {
        // Default date calculation remains the same
        const now = new Date();
        const thirtyDaysAgo = subDays(now, 30); // Use subDays for consistency
        startDateStr = format(thirtyDaysAgo, 'yyyy-MM-dd');
        endDateStr = format(now, 'yyyy-MM-dd');
      }
      
      // Use consistent format with URLSearchParams
      const params = new URLSearchParams({
        brandId: selectedBrandId.toString(),
        from: startDateStr,
        to: endDateStr,
        initial_load: initialLoad.toString(),
        force_refresh: 'true', // Always force refresh
        bypass_cache: 'true',  // Always bypass cache
        t: new Date().getTime().toString() // Always add cache buster
      });
        
      // console.log(`Fetching Meta metrics with params:`, Object.fromEntries(params));
      
      const metaResponse = await fetch(`/api/metrics/meta?${params.toString()}`);
      
      if (!metaResponse.ok) {
        throw new Error(`Failed to fetch Meta metrics: ${metaResponse.status}`);
      }
      
      const metaData = await metaResponse.json();
      
      // Log the raw CPC received from the API
      // console.log('>>> [fetchMetaMetrics] Received Meta metrics raw data:', metaData);
      // console.log(`>>> [fetchMetaMetrics] CPC from API: ${metaData?.cpc}`); 
      // --- Log Reach from API ---
      // console.log(`>>> [fetchMetaMetrics] Reach from API: ${metaData?.reach}`); 
      // --- End Log ---
      
      // console.log('Received Meta metrics:', {
      //   adSpend: metaData.adSpend,
      //   roas: metaData.roas,
      //   impressions: metaData.impressions,
      //   clicks: metaData.clicks
      // });
      
      // Update state regardless of received values to ensure we display most recent data
      setMetrics(prev => ({
        ...prev,
        adSpend: metaData.adSpend ?? prev.adSpend ?? 0,
        adSpendGrowth: metaData.adSpendGrowth ?? prev.adSpendGrowth ?? 0,
        roas: metaData.roas ?? prev.roas ?? 0,
        roasGrowth: metaData.roasGrowth ?? prev.roasGrowth ?? 0,
        impressions: metaData.impressions ?? prev.impressions ?? 0,
        impressionGrowth: metaData.impressionGrowth ?? prev.impressionGrowth ?? 0,
        ctr: metaData.ctr ?? prev.ctr ?? 0,
        ctrGrowth: metaData.ctrGrowth ?? prev.ctrGrowth ?? 0,
        clicks: metaData.clicks ?? prev.clicks ?? 0,
        clickGrowth: metaData.clickGrowth ?? prev.clickGrowth ?? 0,
        conversions: metaData.conversions ?? prev.conversions ?? 0,
        conversionGrowth: metaData.conversionGrowth ?? prev.conversionGrowth ?? 0,
        cpc: metaData.cpc ?? prev.cpc ?? 0,
        costPerResult: metaData.costPerResult ?? prev.costPerResult ?? 0,
        cprGrowth: metaData.cprGrowth ?? prev.cprGrowth ?? 0,
        dailyData: metaData.dailyData ?? prev.dailyData ?? [],
        // Add Reach update here
        reach: metaData.reach ?? prev.reach ?? 0,
      }));
      
      // Dispatch a custom event to notify MetaTab components about the refresh
      window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
        detail: { 
          brandId: selectedBrandId, 
          timestamp: new Date().getTime(), 
          forceRefresh: true,
          dateRange: {
            from: startDateStr,
            to: endDateStr
          }
        }
      }));
      
      return metaData;
    } catch (error) {
      // console.error('Error fetching Meta metrics:', error);
      return null;
    }
  }, [selectedBrandId, dateRange, setMetrics])

  // Update fetchAllData to always perform a forced sync of Meta data
  const fetchAllData = useCallback(async (forceFullMetaResync = false) => {
    if (!selectedBrandId) return
    
    // Use isRefreshingData for refreshes, but set isLoading for initial load
    if (initialDataLoad) {
      setIsLoading(true);
      // Make sure we're not also setting isRefreshingData
      setIsRefreshingData(false);
    } else {
      setIsRefreshingData(true);
      // Make sure we're not also setting isLoading
      setIsLoading(false);
    }

    try {
      // ** Use format() for dates to avoid timezone issues **
      const fromDateStr = format(dateRange.from, 'yyyy-MM-dd');
      const toDateStr = format(dateRange.to, 'yyyy-MM-dd');
      // console.log(`[fetchAllData] Using formatted dates: ${fromDateStr} to ${toDateStr}`); 

      // Always perform a full Meta resync on every fetch to ensure data accuracy
      if (activePlatforms.meta) {
        try {
          // console.log('[Dashboard] Performing complete Meta data resync');
          
          // Show toast to inform user that a full resync is happening
          if (!initialDataLoad) {
            toast({
              title: "Syncing Meta Data",
              description: "Performing a full resync from Meta Ads API...",
              variant: "default"
            });
          }
          
          // Increase days to sync to ensure historical data is complete
          // This helps prevent gaps in data like the one mentioned
          const days = 90; // Increase from 30 to 90 days to ensure complete historical data
          
          try {
            const resyncResponse = await fetch('/api/meta/resync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                brandId: selectedBrandId, 
                days,
                refresh_cache: true, // Always refresh the cache
                force_refresh: true  // Always force refresh
              })
            });
            
            if (!resyncResponse.ok) {
              const errorData = await resyncResponse.json();
              // console.error('Failed to perform full Meta resync:', errorData);
              
              if (!initialDataLoad) {
                toast({
                  title: "Meta Sync Issue",
                  description: "There was a problem refreshing Meta data. Trying standard refresh...",
                  variant: "destructive"
                });
              }
            } else {
              const resyncData = await resyncResponse.json();
              // console.log(`Meta resync completed successfully. Found ${resyncData.count || 0} records.`);
              
              if (!initialDataLoad && resyncData.count > 0) {
                toast({
                  title: "Meta Data Refreshed",
                  description: `Successfully pulled ${resyncData.count} records from Meta Ads API.`,
                  variant: "default"
                });
              }
              
              // Also fetch the campaigns directly to ensure we have the latest data
              try {
                const campaignsResponse = await fetch(`/api/meta/campaigns?brandId=${selectedBrandId}&refresh=true&t=${Date.now()}`);
                if (campaignsResponse.ok) {
                  // console.log("Campaigns refreshed successfully");
                }
              } catch (campaignError) {
                // console.error("Error refreshing campaigns:", campaignError);
              }
              
              // Dispatch a custom event to notify Meta components about the resync
              window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
                detail: { brandId: selectedBrandId, timestamp: Date.now(), forceRefresh: true }
              }));
            }
          } catch (resyncError) {
            // console.error('Error during Meta resync:', resyncError);
          }
          
          // Wait a moment for the resync to complete
          await new Promise(resolve => setTimeout(resolve, 3000)); // Increase timeout to ensure sync completes
        } catch (error) {
          // console.error('Error fetching Meta metrics during refresh:', error);
        }
      }

      // Fetch Shopify data
      if (activePlatforms.shopify && shopifyConnection) {
        // First, sync Shopify orders to ensure we have the latest data
        try {
          // Show toast only if not in initial data load
          if (!initialDataLoad) {
            toast({
              title: "Syncing Shopify Data",
              description: "Pulling fresh order data from Shopify...",
              variant: "default"
            });
          }
          
          const syncOrdersResponse = await fetch('/api/shopify/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ connectionId: shopifyConnection.id })
          })
          
          if (!syncOrdersResponse.ok) {
            // console.error('Failed to sync orders data:', await syncOrdersResponse.text())
          } else {
            // Wait for the sync to complete
            await new Promise(resolve => setTimeout(resolve, 5000))
          }
        } catch (error) {
          // console.error('Error syncing orders data:', error)
        }
        
        // Now fetch the metrics with the updated data
        // Add a cache-busting parameter to ensure we get fresh data
        const cacheBuster = `t=${new Date().getTime()}`
        const params = new URLSearchParams({
          brandId: selectedBrandId.toString(),
          from: fromDateStr,
          to: toDateStr,
          [cacheBuster]: '',
          force: 'true',
          bypass_cache: 'true',
          nocache: 'true'
        });
        
        // console.log(`[fetchAllData] Fetching Shopify metrics with params:`, Object.fromEntries(params));
        
        const response = await fetch(`/api/metrics?${params.toString()}`)
        
        if (!response.ok) throw new Error('Failed to fetch Shopify metrics')
        const data = await response.json()
        setMetrics(prevMetrics => ({
          ...prevMetrics,
          totalSales: data.totalSales ?? prevMetrics.totalSales,
          salesGrowth: data.salesGrowth ?? prevMetrics.salesGrowth,
          ordersPlaced: data.ordersPlaced ?? prevMetrics.ordersPlaced,
          ordersGrowth: data.ordersGrowth ?? prevMetrics.ordersGrowth,
          unitsSold: data.unitsSold ?? prevMetrics.unitsSold,
          unitsGrowth: data.unitsGrowth ?? prevMetrics.unitsGrowth,
          averageOrderValue: data.averageOrderValue ?? prevMetrics.averageOrderValue,
          aovGrowth: data.aovGrowth ?? prevMetrics.aovGrowth,
          customerRetentionRate: data.customerRetentionRate ?? prevMetrics.customerRetentionRate,
          retentionGrowth: data.retentionGrowth ?? prevMetrics.retentionGrowth,
          conversionRate: data.conversionRate ?? prevMetrics.conversionRate,
          conversionGrowth: data.conversionGrowth ?? prevMetrics.conversionGrowth,
          returnRate: data.returnRate ?? prevMetrics.returnRate,
          returnGrowth: data.returnGrowth ?? prevMetrics.returnGrowth,
          conversionRateGrowth: data.conversionRateGrowth ?? prevMetrics.conversionRateGrowth,
          ctr: data.ctr ?? prevMetrics.ctr,
          ctrGrowth: data.ctrGrowth ?? prevMetrics.ctrGrowth,
          clicks: data.clicks ?? prevMetrics.clicks,
          clickGrowth: data.clickGrowth ?? prevMetrics.clickGrowth,
          impressions: data.impressions ?? prevMetrics.impressions,
          impressionGrowth: data.impressionGrowth ?? prevMetrics.impressionGrowth,
          adSpend: data.adSpend ?? prevMetrics.adSpend,
          adSpendGrowth: data.adSpendGrowth ?? prevMetrics.adSpendGrowth,
          roas: data.roas ?? prevMetrics.roas,
          roasGrowth: data.roasGrowth ?? prevMetrics.roasGrowth,
          conversions: data.conversions ?? prevMetrics.conversions,
          costPerResult: data.costPerResult ?? prevMetrics.costPerResult,
          cprGrowth: data.cprGrowth ?? prevMetrics.cprGrowth,
          topProducts: data.topProducts ?? prevMetrics.topProducts,
          revenueByDay: data.revenueByDay ?? prevMetrics.revenueByDay,
          dailyData: data.dailyData ?? prevMetrics.dailyData,
          customerSegments: data.customerSegments ?? prevMetrics.customerSegments,
          salesData: data.salesData ?? prevMetrics.salesData,
          ordersData: data.ordersData ?? prevMetrics.ordersData,
          aovData: data.aovData ?? prevMetrics.aovData,
          unitsSoldData: data.unitsSoldData ?? prevMetrics.unitsSoldData
        }))
        
        // Dispatch event to notify components of fresh data

        
        // Sync inventory data from Shopify
        try {
          const syncResponse = await fetch('/api/shopify/inventory/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ connectionId: shopifyConnection.id })
          })
          
          if (!syncResponse.ok) {
            // console.error('Failed to sync inventory data:', await syncResponse.text())
          } else {
            // Wait a moment for the sync to complete
            await new Promise(resolve => setTimeout(resolve, 3000))
            
            // Force a refresh of the inventory data by dispatching a custom event
            window.dispatchEvent(new CustomEvent('refreshInventory', { 
              detail: { brandId: selectedBrandId }
            }))
          }
        } catch (error) {
          // console.error('Error syncing inventory data:', error)
        }
      }
      
      // Now call the normal fetchMetaMetrics function with force refresh
      await fetchMetaMetrics(true, true);
      
    } catch (error) {
      // console.error('Error refreshing data:', error)
    } finally {
      // Always set initialDataLoad to false after the first load completes, regardless of success or failure
      if (initialDataLoad) {
        setInitialDataLoad(false);
        setIsLoading(false);
      } else {
        setIsRefreshingData(false);
      }
    }
  }, [selectedBrandId, initialDataLoad, dateRange, activePlatforms, connections, setIsLoading, setIsRefreshingData, setInitialDataLoad, setMetrics, toast])

  // Add a function to detect data gaps
  const detectMetaDataGaps = useCallback(async () => {
    if (!selectedBrandId || !activePlatforms.meta) return;
    
    try {
      // Get today and yesterday's date
      const today = new Date();
      const yesterday = subDays(today, 1);
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');
      
      // Check if we have data for yesterday
      const response = await fetch(`/api/meta/data-check?brandId=${selectedBrandId}&date=${yesterdayStr}`);
      
      if (!response.ok) {
        // console.error(`[Dashboard] Failed to check Meta data gaps: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      
      // If we have less than expected data volume for yesterday, show a notification
      if (data.hasGap) {
        toast({
          title: "Data Gap Detected",
          description: (
            <div className="flex flex-col gap-2">
              <p>Missing or incomplete Meta data for {yesterdayStr}.</p>
              <button 
                onClick={() => {
                  fetch('/api/meta/backfill', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      brandId: selectedBrandId,
                      dateFrom: yesterdayStr,
                      dateTo: yesterdayStr
                    })
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      toast({
                        title: "Data Fixed",
                        description: `Successfully backfilled ${data.count} records for ${yesterdayStr}`,
                        variant: "default"
                      });
                      
                      // Force refresh dashboard
                      fetchAllData(true);
                    }
                  });
                }}
                className="bg-blue-600 text-white rounded px-3 py-1 text-sm"
              >
                Fix Data Now
              </button>
            </div>
          ),
          variant: "destructive",
          duration: 10000
        });
      }
    } catch (error) {
      // console.error("[Dashboard] Error checking for Meta data gaps:", error);
    }
  }, [selectedBrandId, activePlatforms.meta]);
  
  // Set up periodic data refresh
  useEffect(() => {
    // Don't do initial fetch here - the main loadMetrics useEffect handles all data loading
    
    // Clean up interval on unmount
    return () => {
      //clearInterval(interval);
    };
  }, [selectedBrandId]);

  // Note: Removed redundant fetchAllData and gap detection useEffects to prevent triple refresh
  // All data loading is now handled by the main loadMetrics useEffect above

  // After removing useEffect for Meta metrics, add back the platform connection references
  const platforms = {
    shopify: connectionStoreConnections.some((c: PlatformConnection) => c.platform_type === 'shopify'),
    meta: connectionStoreConnections.some((c: PlatformConnection) => c.platform_type === 'meta')
  }

  const shopifyConnection = connections.find(c => 
    c.platform_type === 'shopify' && c.status === 'active' && c.brand_id === selectedBrandId
  )

  // Add a listener for the force-shopify-refresh event
  useEffect(() => {
    let cancelled = false;
    
    const handleShopifyRefresh = (event: any) => {
      if (cancelled) return;
      
      // console.log('[Dashboard] Received force-shopify-refresh event, refreshing Shopify data');
      
      // Only proceed if we have a selected brand
      if (!selectedBrandId || cancelled) return;
      
      // Set loading state just for Shopify data
      if (!cancelled) {
        setIsRefreshingData(true);
      }
      
      // Call the API directly to refresh Shopify metrics
      const fetchShopifyMetrics = async () => {
        if (cancelled) return;
        try {
          const params = new URLSearchParams({
            brandId: selectedBrandId,
            platform: 'shopify', // Explicitly specify Shopify platform
            force: 'true', // Always force refresh
            bypass_cache: 'true', // Always bypass cache for explicit refreshes
            nocache: 'true' // Redundant but ensuring all cache flags are covered
          });
          
          // Handle different date formats consistently - use string or Date object
          let fromDate, toDate;
          
          if (event.detail?.dateRange?.from) {
            // Check if it's already a formatted string (yyyy-MM-dd)
            if (typeof event.detail.dateRange.from === 'string' && 
                /^\d{4}-\d{2}-\d{2}$/.test(event.detail.dateRange.from)) {
              fromDate = event.detail.dateRange.from;
            } else {
              // It's a Date object or some other format, ensure it's formatted correctly
              fromDate = format(new Date(event.detail.dateRange.from), 'yyyy-MM-dd');
            }
          } else if (dateRange?.from) {
            fromDate = format(dateRange.from, 'yyyy-MM-dd');
          } else {
            // Fallback to 30 days ago
            fromDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
          }
          
          if (event.detail?.dateRange?.to) {
            // Check if it's already a formatted string (yyyy-MM-dd)
            if (typeof event.detail.dateRange.to === 'string' && 
                /^\d{4}-\d{2}-\d{2}$/.test(event.detail.dateRange.to)) {
              toDate = event.detail.dateRange.to;
            } else {
              // It's a Date object or some other format, ensure it's formatted correctly
              toDate = format(new Date(event.detail.dateRange.to), 'yyyy-MM-dd');
            }
          } else if (dateRange?.to) {
            toDate = format(dateRange.to, 'yyyy-MM-dd');
          } else {
            // Fallback to today
            toDate = format(new Date(), 'yyyy-MM-dd');
          }
          
          // Now add the properly formatted dates to params
          params.append('from', fromDate);
          params.append('to', toDate);
          
          // Log what dates we're actually using
          // console.log(`[Dashboard] Fetching Shopify metrics with date range: ${fromDate} to ${toDate}`);
          
          // Add cache buster for refresh
          params.append('t', new Date().getTime().toString());

          // console.log('[Dashboard] Explicitly refreshing Shopify metrics with params:', Object.fromEntries(params));
          
          const response = await fetch(`/api/metrics?${params.toString()}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch Shopify metrics: ${response.status}`);
          }
          
          const data = await response.json();
          // console.log('[Dashboard] Refreshed Shopify metrics:', data);
          
          // Update metrics state to show the refreshed data
          if (!cancelled) {
            setMetrics(prevMetrics => ({
              ...prevMetrics,
              ...data
            }));
          }

        } catch (error) {
          if (!cancelled) {
            // console.error('[Dashboard] Error refreshing Shopify metrics:', error);
          }
        } finally {
          if (!cancelled) {
            setIsRefreshingData(false);
          }
        }
      };
      
      fetchShopifyMetrics();
    };
    
    window.addEventListener('force-shopify-refresh', handleShopifyRefresh);
    
    return () => {
      cancelled = true;
      window.removeEventListener('force-shopify-refresh', handleShopifyRefresh);
    };
  }, [selectedBrandId, dateRange, setMetrics]);

  // Handle tab changes
  const handleTabChange = (tab: string) => {
    // console.log(`[Dashboard] Tab changed from ${activeTab} to ${tab} - triggering targeted refresh`);
    
    setActiveTab(tab);
    
    // Set coordination flags when switching to Meta tab
    if (tab === 'meta') {
      // Set flag to indicate tab switch is in progress
      window._metaTabSwitchInProgress = true;
      // console.log(`[Dashboard] Set _metaTabSwitchInProgress = true for Meta tab switch`);
      
      // Clear existing fetch locks to allow new refresh
      window._metaFetchLock = false;
      window._activeFetchIds?.clear();
      // console.log(`[Dashboard] Cleared fetch locks for Meta tab switch`);
    }
    
    // Dispatch targeted event for the specific tab
    if (tab === 'meta') {
      // Dispatch the targeted Meta tab activation event
      window.dispatchEvent(new CustomEvent('meta-tab-activated', {
        detail: { brandId: selectedBrandId, timestamp: Date.now() }
      }));
      // console.log(`[Dashboard] Dispatched meta-tab-activated event`);
      
      // Clear the tab switch flag after a delay to allow the event to be processed
      setTimeout(() => {
        window._metaTabSwitchInProgress = false;
        // console.log(`[Dashboard] Cleared _metaTabSwitchInProgress flag after Meta tab activation`);
      }, 2000); // Wait 2 seconds for the sync to complete
      
    } else if (tab === 'shopify') {
      // Dispatch event for Shopify tab
      window.dispatchEvent(new CustomEvent('shopify-tab-activated', {
        detail: { brandId: selectedBrandId, timestamp: Date.now() }
      }));
      // console.log(`[Dashboard] Dispatched shopify-tab-activated event`);
      
    } else if (tab === 'site') {
      // Dispatch event for Site tab
      window.dispatchEvent(new CustomEvent('site-tab-activated', {
        detail: { brandId: selectedBrandId, timestamp: Date.now() }
      }));
      // console.log(`[Dashboard] Dispatched site-tab-activated event`);
      
    }
  };

  // Determine what to render based on auth state
  const renderContent = () => {
  // Show loading state while auth is loading or brands are loading
  if (!isLoaded || (isLoaded && userId && brandsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <img 
            src="https://i.imgur.com/PZCtbwG.png" 
            alt="Brez Logo" 
            className="h-16 w-auto object-contain mx-auto mb-6" 
          />
                  <UnifiedLoading
          size="lg"
          variant="fullscreen"
          page="dashboard"
        />
        </div>
      </div>
    )
  }

  // If auth is loaded and user is not signed in, redirect to sign-in page
  if (isLoaded && !userId) {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in'
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
              <img 
            src="https://i.imgur.com/PZCtbwG.png" 
                alt="Brez Logo" 
            className="h-16 w-auto object-contain mx-auto mb-6" 
              />
          <p className="text-gray-400 mb-6">Redirecting to sign in...</p>
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    )
  }

    // Main dashboard content
  return (
      <div className="max-w-[1600px] mx-auto flex flex-col min-h-screen">
        {/* Remove p-8 temporarily for diagnosis */}
        <div className="flex items-center justify-between mb-6 px-8 pt-8">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
            {selectedBrandId && (activePlatforms.meta || activePlatforms.shopify) && (
              <GlobalRefreshButton 
                brandId={selectedBrandId} 
                activePlatforms={activePlatforms}
                currentTab={activeTab}
              />
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Only show edit button on home tab */}
            {activeTab === "site" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      className={cn(
                        "text-gray-400 h-10 px-4 border-[#333] bg-[#1A1A1A] hover:bg-[#222] hover:text-white transition-all",
                        isEditMode && "bg-[#222] text-white border-[#444] shadow-lg"
                      )}
                      onClick={() => setIsEditMode(!isEditMode)}
                    >
                      <LayoutGrid className="h-5 w-5 mr-2" />
                      {isEditMode ? "Done Editing" : "Edit Layout"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-[#222] border border-[#444] text-white text-xs">
                    <p>{isEditMode ? "Exit Edit Mode" : "Customize Dashboard"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <DateRangePicker
              dateRange={dateRange}
              setDateRange={setDateRange}
            />
          </div>
        </div>
        {/* WidgetManager and other content will take up remaining space */}
        <div className="flex-grow px-8 pb-8">
          <WidgetManager 
            dateRange={dateRange} 
            brandId={selectedBrandId}
            metrics={metrics}
            isLoading={isLoading}
            isRefreshingData={isRefreshingData}
            initialDataLoad={initialDataLoad}
            platformStatus={activePlatforms}
            existingConnections={connections}
            brands={brands}
            isEditMode={isEditMode}
            handleTabChange={handleTabChange}
          >
            {isEditMode && (
              <div className="bg-[#222] border border-[#444] rounded-md p-3 mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <LayoutGrid className="h-5 w-5 text-white mr-2" />
                  <span className="text-white font-medium">Edit Mode Active</span>
                </div>
                <p className="text-gray-400 text-sm">Drag widgets to reposition or click the "×" to remove them</p>
              </div>
            )}
            <div className="mt-3">
              {/* Removed widgets will be managed by the HomeTab component */}
            </div>
          </WidgetManager>
        </div>
      </div>
    )
  }

  // Always return inside the error boundary
  return (
    <DashboardErrorBoundary>
      {renderContent()}
    </DashboardErrorBoundary>
  )
}
