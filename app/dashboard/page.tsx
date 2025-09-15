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

import { DateRange } from "react-day-picker"
import { MetaContent } from "@/components/dashboard/platforms/MetaContent"
import { AgencyActionCenter } from "@/components/dashboard/AgencyActionCenter"
import { ShopifyContent } from "@/components/dashboard/platforms/ShopifyContent"
import { getSupabaseClient } from "@/lib/supabase/client"
import BrandSelector from "@/components/BrandSelector"
import { useBrandContext } from '@/lib/context/BrandContext'
import { defaultMetrics, type Metrics, type CustomerSegments } from '@/types/metrics'
import { PlatformConnection } from '@/types/platformConnection'
import { calculateMetrics } from "@/lib/metrics"
import { MetricCard } from "@/components/metrics/MetricCard"
import { ShopifyTab } from "@/components/dashboard/platforms/tabs/ShopifyTab"

import { transformToMetaMetrics } from '@/lib/transforms'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/DateRangePicker"
import { WidgetManager } from "@/components/dashboard/WidgetManager"
import { UnifiedDashboardHeader } from "@/components/dashboard/UnifiedDashboardHeader"
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

import { useDataRefresh } from '@/lib/hooks/useDataRefresh'
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { GridOverlay } from "@/components/GridOverlay"

// ✅ FIXED: Global fetch lock declarations to prevent data doubling
declare global {
  interface Window {
    _metaTimeouts?: ReturnType<typeof setTimeout>[];
    _blockMetaApiCalls?: boolean;
    _disableAutoMetaFetch?: boolean;
    _activeFetchIds?: Set<number | string>;
    _metaFetchLock?: boolean;
    _lastManualRefresh?: number;
    _lastMetaRefresh?: number;
    _currentDateRange?: DateRange;
  }
}

// Initialize global state for fetch coordination
if (typeof window !== 'undefined') {
  window._activeFetchIds = window._activeFetchIds || new Set();
  window._metaFetchLock = window._metaFetchLock || false;
  window._lastManualRefresh = window._lastManualRefresh || 0;
  window._lastMetaRefresh = window._lastMetaRefresh || 0;
}

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
import { useAgency } from "@/contexts/AgencyContext"
import { useDataBackfill, shouldSuggestBackfill } from "@/lib/hooks/useDataBackfill"


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

  
  // Log each hook call to identify which one causes the error
  // console.log('[Dashboard] Calling useAuth')
  const { userId, isLoaded } = useAuth()
  
  // console.log('[Dashboard] Calling useBrandContext')
  const { brands, selectedBrandId, setSelectedBrandId, isLoading: brandsLoading } = useBrandContext()
  

  
  // console.log('[Dashboard] Calling useAgency')
  const { agencySettings } = useAgency()
  
  // console.log('[Dashboard] Calling useDataBackfill')
  const { status: backfillStatus, checkForGaps, performBackfill, resetStatus } = useDataBackfill()
  
  // console.log('[Dashboard] useState calls starting')
  // Initialize date range - check for saved refresh dateRange first
  const [dateRange, setDateRange] = useState(() => {
    // ✅ FIXED: Check for persisted date range to maintain selection across refreshes
    if (typeof window !== 'undefined') {
      try {
        // Try new persistence key first
        const savedDateRangeStr = localStorage.getItem('dashboard_date_range');
        if (savedDateRangeStr) {
          const savedData = JSON.parse(savedDateRangeStr);
          // Only use if saved within last 24 hours to prevent stale data
          if (Date.now() - savedData.timestamp < 24 * 60 * 60 * 1000) {
            console.log('[Dashboard] 🔄 Restoring persisted date range:', savedData);
            const range = {
              from: new Date(savedData.from),
              to: new Date(savedData.to)
            };
            
            // ✅ FIXED: Also set the global date range variable on initialization
            if (typeof window !== 'undefined') {
              (window as any)._currentDateRange = range;
            }
            
            return range;
          }
        }
        
        // Fallback to old key for backwards compatibility
        const legacySavedDateRangeStr = localStorage.getItem('meta-refresh-daterange');
        if (legacySavedDateRangeStr) {
          const savedDateRange = JSON.parse(savedDateRangeStr);
          // Only use if it's recent (within last 10 seconds)
          if (savedDateRange.refreshTimestamp && Date.now() - savedDateRange.refreshTimestamp < 10000) {
            localStorage.removeItem('meta-refresh-daterange'); // Clean up
            const restoredRange = {
              from: startOfDay(new Date(savedDateRange.from)),
              to: endOfDay(new Date(savedDateRange.to))
            };
            console.log('[Dashboard] 🔄 RESTORED dateRange from Meta refresh:', restoredRange.from.toISOString().split('T')[0], 'to', restoredRange.to.toISOString().split('T')[0]);
            return restoredRange;
          }
        }
        
        // Clear any old saved ranges
        localStorage.removeItem('dashboard-date-range');
        localStorage.removeItem('meta-refresh-daterange');
      } catch (error) {
        // console.error('Error checking saved date range:', error)
      }
    }
    
    // ✅ FIXED: Default to TODAY using EXACT same logic as DateRangePicker preset
    const now = new Date()
    const initialRange = {
      from: startOfDay(now),
      to: endOfDay(now) // Use endOfDay() to exactly match DateRangePicker "Today" preset
    }
    console.log('[Dashboard] 🔍 Initial dateRange set to:', initialRange.from.toISOString().split('T')[0], 'to', initialRange.to.toISOString().split('T')[0]);
    
    // ✅ FIXED: Set global date range for default case
    if (typeof window !== 'undefined') {
      (window as any)._currentDateRange = initialRange;
    }
    
    return initialRange
  })
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null)
  const [metrics, setMetrics] = useState<Metrics>(defaultMetrics)
  const [isLoading, setIsLoading] = useState(true)
  const [initialDataLoad, setInitialDataLoad] = useState(true)
  const [isDateRangeLoading, setIsDateRangeLoading] = useState(false)
  const [activePlatforms, setPlatformStatus] = useState({
    shopify: false,
    meta: false
  })
  
  // Create a controlled setDateRange with cooldown and persistence to maintain selected range
  const handleDateRangeChange = useCallback((range: { from: Date; to: Date } | undefined) => {
    if (!range || isDateRangeLoading) {
      return // Prevent changes during loading
    }
    
    console.log('[Dashboard] 🔍 handleDateRangeChange called - changing dateRange to:', range.from.toISOString().split('T')[0], 'to', range.to.toISOString().split('T')[0]);
    
    setIsDateRangeLoading(true)
    setDateRange(range)
    
    // ✅ FIXED: Persist date range to maintain selection across refreshes
    try {
      localStorage.setItem('dashboard_date_range', JSON.stringify({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        timestamp: Date.now()
      }))
      
      // Also update global window variable for refresh button
      if (typeof window !== 'undefined') {
        (window as any)._currentDateRange = range
      }
    } catch (error) {
      console.log('[Dashboard] Could not persist date range:', error)
    }
    
    // Set a minimum cooldown period
    setTimeout(() => {
      setIsDateRangeLoading(false)
    }, 1500) // 1.5 second minimum cooldown
  }, [isDateRangeLoading])
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("agency")
  const [isEditMode, setIsEditMode] = useState(false)
  
  // ✅ FIXED: Keep global date range in sync with state
  useEffect(() => {
    if (dateRange && typeof window !== 'undefined') {
      (window as any)._currentDateRange = dateRange;
      console.log('[Dashboard] 📅 Updated global date range:', dateRange.from.toISOString().split('T')[0], 'to', dateRange.to.toISOString().split('T')[0]);
    }
  }, [dateRange])
  
  // Add a state to track if we're in the initial setup phase
  const [isInitialSetup, setIsInitialSetup] = useState(true)
  
  // Add action center loading state (like marketing assistant) - start true to prevent flash
  const [isActionCenterLoading, setIsActionCenterLoading] = useState(true)
  const [loadingPhase, setLoadingPhase] = useState<string>('Initializing Action Center')
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true)
  const [isAgencyWidgetsLoading, setIsAgencyWidgetsLoading] = useState(true)
  
  // Sidebar state management - tracks sidebar width for loading overlay positioning
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      // Try to get the pinned state for any user (we'll update it properly when userId is available)
      const keys = Object.keys(localStorage).filter(key => key.startsWith('sidebar-pinned-'))
      if (keys.length > 0) {
        try {
          const saved = localStorage.getItem(keys[0])
          return saved && JSON.parse(saved) ? 256 : 80
        } catch {
          return 80
        }
      }
    }
    return 80
  })
  
  // Effect to sync sidebar state with custom events from sidebar component
  useEffect(() => {
    const handleSidebarStateChange = (e: CustomEvent) => {
      setSidebarWidth(e.detail.width)
    }
    
    // Listen for custom sidebar state change events
    window.addEventListener('sidebarStateChange', handleSidebarStateChange as EventListener)
    
    return () => {
      window.removeEventListener('sidebarStateChange', handleSidebarStateChange as EventListener)
    }
  }, [])
  
  // Set loading overlay state - wait for both action center initialization AND widget loading
  useEffect(() => {
    const shouldShowOverlay = (isActionCenterLoading || isAgencyWidgetsLoading) && !hasInitiallyLoaded && activeTab === "agency"

    setShowLoadingOverlay(shouldShowOverlay)
  }, [isActionCenterLoading, isAgencyWidgetsLoading, hasInitiallyLoaded, activeTab])
  
  // Mark as initially loaded when both action center and widgets are done loading
  useEffect(() => {
    if (!isActionCenterLoading && !isAgencyWidgetsLoading && !hasInitiallyLoaded && activeTab === "agency") {
      setHasInitiallyLoaded(true)
    }
  }, [isActionCenterLoading, isAgencyWidgetsLoading, hasInitiallyLoaded, activeTab])
  
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

  // Reset backfill status when brand changes
  useEffect(() => {
    if (selectedBrandId) {
      resetStatus();
    }
  }, [selectedBrandId, resetStatus]);

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

  // Listen for action center loading events - only on initial load
  useEffect(() => {
    if (activeTab === "agency" && !hasInitiallyLoaded) {
      // Set loading immediately to prevent any flash - only on initial load
      setIsActionCenterLoading(true)
      setLoadingProgress(0)
      setLoadingPhase('Initializing Dashboard')
      
      // Prevent scrolling during loading
      document.body.style.overflow = 'hidden'
      
      // Evenly distributed loading over 16 seconds total
      const phases = [
        { progress: 10, phase: 'Connecting to workspace...', delay: 1600 },
        { progress: 20, phase: 'Loading workspace data...', delay: 3200 },
        { progress: 30, phase: 'Fetching brand configurations...', delay: 4800 },
        { progress: 40, phase: 'Generating action items...', delay: 6400 },
        { progress: 50, phase: 'Processing automation tools...', delay: 8000 },
        { progress: 60, phase: 'Analyzing brand performance...', delay: 9600 },
        { progress: 70, phase: 'Compiling reports...', delay: 11200 },
        { progress: 80, phase: 'Finalizing setup...', delay: 12800 },
        { progress: 90, phase: 'Preparing dashboard...', delay: 14400 },
        { progress: 95, phase: 'Almost ready...', delay: 16000 }
      ]
      
      phases.forEach(({ progress, phase, delay }) => {
        setTimeout(() => {
          setLoadingProgress(progress)
          setLoadingPhase(phase)
        }, delay)
      })
      
      // Listen for action center ready event - this should fire around 4-5 seconds
      const handleActionCenterLoaded = () => {
        // Complete the progress immediately when data is loaded
        setLoadingProgress(100)
        setLoadingPhase('Complete!')
        
        // Then hide the loading after a brief moment
        setTimeout(() => {
          setIsActionCenterLoading(false)
          setHasInitiallyLoaded(true) // Mark as initially loaded
          // Re-enable scrolling
          document.body.style.overflow = 'unset'
        }, 200)
      }
      
      window.addEventListener('action-center-loaded', handleActionCenterLoaded)
      
      return () => {
        window.removeEventListener('action-center-loaded', handleActionCenterLoaded)
        // Re-enable scrolling if component unmounts during loading
        document.body.style.overflow = 'unset'
      }
    } else if (activeTab === "agency" && hasInitiallyLoaded) {
      // If we've already loaded initially, just show normal loading without the full page overlay
      setIsActionCenterLoading(false)
      // Re-enable scrolling when switching to agency tab after initial load
      document.body.style.overflow = 'unset'
    } else {
      setIsActionCenterLoading(false)
      // Re-enable scrolling when switching away from agency tab
      document.body.style.overflow = 'unset'
    }
  }, [activeTab, hasInitiallyLoaded])

  // Initial load check - if we're already on agency tab, start loading
  useEffect(() => {
    if (activeTab === "agency" && !hasInitiallyLoaded) {
      setIsActionCenterLoading(true)
      setIsAgencyWidgetsLoading(true)  // Ensure widgets are marked as loading initially
    }
  }, [])



  // Load initial connections when component mounts - but only after initial setup
  useEffect(() => {
    if (isInitialSetup || !selectedBrandId) return;
    
    let cancelled = false

    async function loadConnections() {
      if (!selectedBrandId || cancelled) return

      try {
        // console.log('🔗 Loading platform connections for brand:', selectedBrandId)
        // Load connections for the selected brand regardless of who owns it
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
      // Only set initialDataLoad if we haven't started loading yet
      if (!cancelled && !initialLoadStarted.current) {
        initialLoadStarted.current = true;
        setInitialDataLoad(true)
      }

      try {
        // Fetch platform connections from Supabase for the selected brand
        const { data: connections, error } = await getSupabaseClient()
          .from('platform_connections')
          .select('*')
          .eq('brand_id', brandId)
          .eq('status', 'active')

        if (error) {
          return
        }

        if (cancelled) return;

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
            const shopifyConnection = connections?.find((c: any) => 
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

  // Force refresh counter to trigger widget re-renders without changing date range
  const [refreshCounter, setRefreshCounter] = useState(0)
  
  // Debug: Track dateRange changes & set global variable
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      console.log('[Dashboard] 🔍 dateRange changed to:', dateRange.from.toISOString().split('T')[0], 'to', dateRange.to.toISOString().split('T')[0]);
      
      // FINAL FIX: Set global variable for synchronous access
      if (typeof window !== 'undefined') {
        (window as any)._currentDateRange = {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        };
        console.log('[Dashboard] 🔍 Updated global _currentDateRange variable');
      }
    }
  }, [dateRange])

  // NUCLEAR FIX: Listen for dateRange requests from GlobalRefreshButton
  useEffect(() => {
    const handleDateRangeRequest = (event: any) => {
      console.log('[Dashboard] 🔍 Received dateRange request, responding with current dateRange:', dateRange ? `${dateRange.from.toISOString().split('T')[0]} to ${dateRange.to.toISOString().split('T')[0]}` : 'undefined');
      
      const responseDetail = {
        requestId: event.detail?.requestId,
        dateRange: dateRange ? {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        } : undefined
      };
      
      console.log('[Dashboard] 🔍 Dispatching daterange-response with detail:', responseDetail);
      
      window.dispatchEvent(new CustomEvent('daterange-response', {
        detail: responseDetail
      }));
      
      console.log('[Dashboard] 🔍 daterange-response event dispatched');
    };

    window.addEventListener('request-current-daterange', handleDateRangeRequest);
    
    return () => {
      window.removeEventListener('request-current-daterange', handleDateRangeRequest);
    };
  }, [dateRange])

  // 🔧 FIX: Listen for metaDataRefreshed events and refresh dashboard metrics
  useEffect(() => {
    const handleMetaDataRefreshed = async (event: any) => {
      if (event.detail?.brandId === selectedBrandId) {
        console.log('[Dashboard] 🔍 Received metaDataRefreshed event, refreshing dashboard metrics');
        console.log('[Dashboard] 🔍 Event dateRange:', event.detail?.dateRange);
        
        // CRITICAL FIX: Use the dateRange from the event, not the current state
        if (event.detail?.dateRange) {
          const eventDateRange = event.detail.dateRange;
          const startDateStr = eventDateRange.from.split('T')[0];
          const endDateStr = eventDateRange.to.split('T')[0];
          
          console.log('[Dashboard] 🔍 Using event dateRange for metrics refresh:', startDateStr, 'to', endDateStr);
          
          try {
            // Directly call the API with the correct dateRange
            const params = new URLSearchParams({
              brandId: selectedBrandId.toString(),
              from: startDateStr,
              to: endDateStr,
              initial_load: 'false',
              force_refresh: 'true',
              bypass_cache: 'true',
              t: new Date().getTime().toString()
            });
            
            const metaResponse = await fetch(`/api/metrics/meta?${params.toString()}`);
            
            if (!metaResponse.ok) {
              throw new Error(`Failed to fetch Meta metrics: ${metaResponse.status}`);
            }
            
            const metaData = await metaResponse.json();
            
            // Update metrics with the fresh data
            setMetrics(prev => ({
              ...prev,
              adSpend: metaData.adSpend ?? 0,
              adSpendGrowth: metaData.adSpendGrowth ?? 0,
              impressions: metaData.impressions ?? 0,
              impressionGrowth: metaData.impressionGrowth ?? 0,
              clicks: metaData.clicks ?? 0,
              clickGrowth: metaData.clickGrowth ?? 0,
              roas: metaData.roas ?? 0,
              roasGrowth: metaData.roasGrowth ?? 0,
              ctr: metaData.ctr ?? 0,
              ctrGrowth: metaData.ctrGrowth ?? 0,
              cpc: metaData.cpc ?? 0,
              cpcGrowth: metaData.cpcGrowth ?? 0,
              costPerResult: metaData.costPerResult ?? 0,
              results: metaData.results ?? 0,
              reach: metaData.reach ?? 0,
              dailyData: metaData.dailyData && metaData.dailyData.length > 0 ? metaData.dailyData : prev.dailyData,
            }));
            
            console.log('[Dashboard] ✅ Dashboard metrics refreshed with event dateRange data');
          } catch (error) {
            console.error('[Dashboard] ❌ Error refreshing dashboard metrics:', error);
          }
        } else {
          // Fallback to regular fetchMetaMetrics if no dateRange in event
          try {
            await fetchMetaMetrics(false, true);
            console.log('[Dashboard] ✅ Dashboard metrics refreshed (fallback)');
          } catch (error) {
            console.error('[Dashboard] ❌ Error refreshing dashboard metrics:', error);
          }
        }
      }
    };

    window.addEventListener('metaDataRefreshed', handleMetaDataRefreshed);
    
    return () => {
      window.removeEventListener('metaDataRefreshed', handleMetaDataRefreshed);
    };
  }, [selectedBrandId]) // 🔧 REMOVED fetchMetaMetrics dependency to prevent circular re-renders

  // Listen for forced date range refresh events (triggered by refresh button)
  useEffect(() => {
    const handleForceDateRefresh = (event: any) => {
      if (event.detail?.brandId === selectedBrandId) {
        
        // Instead of changing date range (which causes flickering), increment refresh counter
        // This forces widgets to re-render with the same date range but fresh data
        setRefreshCounter(prev => prev + 1)
        
        // Also dispatch a single consolidated refresh event
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('force-widget-refresh', {
            detail: { 
              brandId: selectedBrandId, 
              timestamp: Date.now(),
              refreshCounter: refreshCounter + 1,
              source: 'dashboard-force-refresh'
            }
          }))
        }, 50)
      }
    }

    window.addEventListener('force-date-range-refresh', handleForceDateRefresh)
    
    return () => {
      window.removeEventListener('force-date-range-refresh', handleForceDateRefresh)
    }
  }, [selectedBrandId, refreshCounter])

  // Load widget data when connections change
  useEffect(() => {
    // Skip during initial setup to prevent cascading renders
    if (isInitialSetup || !selectedBrandId || !connections.length) return

    let cancelled = false

    async function loadWidgetData() {
      if (!selectedBrandId || !connections.length || cancelled) return

      const shopifyConnection = connections?.find(c => 
        c.platform_type === 'shopify' && c.status === 'active'
      )
      
      if (shopifyConnection && !cancelled) {
        try {
          // console.log('Fetching Shopify data for connection:', shopifyConnection.id)
          const { data: orders, error: ordersError } = await getSupabaseClient()
            .from('shopify_orders')
            .select('*')
            .eq('connection_id', shopifyConnection.id)
            .eq('brand_id', selectedBrandId)
            .order('created_at', { ascending: false })

          if (ordersError) {
            // console.error('Error loading Shopify orders:', ordersError)
            return
          }

          if (cancelled) return

          // Process orders data
          const processedData = orders?.map((order: any) => ({
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

      // Skip Meta data loading here - MetaTab2 component handles its own data loading
      // This prevents data duplication and conflicts on first load
      const metaConnection = connections?.find((c: any) => 
        c.platform_type === 'meta' && c.status === 'active'
      ) as PlatformConnection | undefined

      if (metaConnection) {
        // Only set connection availability, don't load actual data
        startTransition(() => {
          setWidgetData(current => ({
            ...current,
            meta: { available: true }
          }))
        })
      } else {
        startTransition(() => {
          setWidgetData(current => ({
            ...current,
            meta: { available: false }
          }))
        })
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
      } else if (!initialDataLoad) {
        // For subsequent loads, set refreshing state
        setIsRefreshingData(true);
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
        // 🔥 ENHANCED DATA REFRESH: Check for gaps AND stale historical data
        if (selectedBrandId) {
          // console.log('[Dashboard] Starting comprehensive data validation and refresh...');
          
          try {
            // 🔥 FIX: Use server-side API endpoint instead of direct client-side import
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
              const messages = [];
              if (refreshResult.recentDataRefreshed) messages.push('recent data refreshed');
              if (refreshResult.staleDataRefreshed > 0) messages.push(`${refreshResult.staleDataRefreshed} stale days fixed`);
              if (refreshResult.totalGapsFilled > 0) messages.push(`${refreshResult.totalGapsFilled} missing days filled`);
              
              // console.log(`[Dashboard] ✅ Complete refresh done: ${messages.join(', ')}`);
              
              // If we fixed stale data, show a helpful message
              if (refreshResult.staleDataRefreshed > 0) {
                // console.log(`[Dashboard] 🎯 Fixed ${refreshResult.staleDataRefreshed} days with stale data (like the Wednesday $0.43 → $0.90 issue)`);
              }
            } else {
              // console.warn(`[Dashboard] ⚠️ Complete data refresh had issues:`, refreshResult.error);
            }
          } catch (error) {
            // console.warn('[Dashboard] ⚠️ Error during enhanced data refresh:', error);
            
            // Fallback to old system
            // console.log('[Dashboard] Falling back to standard gap detection...');
            await checkForGaps(selectedBrandId);
            if (backfillStatus.hasGaps && backfillStatus.totalMissingDays >= 1) {
              // console.log(`[Dashboard] Backfilling ${backfillStatus.totalMissingDays} missing days...`);
              await performBackfill(selectedBrandId);
            }
          }
        }
        
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
        
        // Note: We've already refreshed the last 72 hours of data above, so cache busting is less critical
        // But we'll still force fresh data for good measure
        params.set('force_refresh', 'true');
        params.set('bypass_cache', 'true');
        params.set('reason', 'always-fresh-after-recent-data-refresh');
        
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
          // FIX: Replace entire metrics object instead of merging to prevent duplication
          startTransition(() => {
            setMetrics({
              totalSales: data.totalSales ?? 0,
              salesGrowth: data.salesGrowth ?? 0,
              ordersPlaced: data.ordersPlaced ?? 0,
              ordersGrowth: data.ordersGrowth ?? 0,
              unitsSold: data.unitsSold ?? 0,
              unitsGrowth: data.unitsGrowth ?? 0,
              averageOrderValue: data.averageOrderValue ?? 0,
              aovGrowth: data.aovGrowth ?? 0,
              customerRetentionRate: data.customerRetentionRate ?? 0,
              retentionGrowth: data.retentionGrowth ?? 0,
              conversionRate: data.conversionRate ?? 0,
              conversionGrowth: data.conversionGrowth ?? 0,
              returnRate: data.returnRate ?? 0,
              returnGrowth: data.returnGrowth ?? 0,
              conversionRateGrowth: data.conversionRateGrowth ?? 0,
              ctr: data.ctr ?? 0,
              ctrGrowth: data.ctrGrowth ?? 0,
              clicks: data.clicks ?? 0,
              clickGrowth: data.clickGrowth ?? 0,
              impressions: data.impressions ?? 0,
              impressionGrowth: data.impressionGrowth ?? 0,
              adSpend: data.adSpend ?? 0,
              adSpendGrowth: data.adSpendGrowth ?? 0,
              roas: data.roas ?? 0,
              roasGrowth: data.roasGrowth ?? 0,
              conversions: data.conversions ?? 0,
              costPerResult: data.costPerResult ?? 0,
              cprGrowth: data.cprGrowth ?? 0,
              topProducts: data.topProducts ?? [],
              revenueByDay: data.revenueByDay ?? [],
              dailyData: data.dailyData ?? [],
              customerSegments: data.customerSegments ?? { newCustomers: 0, returningCustomers: 0 },
              salesData: data.salesData ?? [],
              ordersData: data.ordersData ?? [],
              aovData: data.aovData ?? [],
              unitsSoldData: data.unitsSoldData ?? []
            });
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
  }, [selectedBrandId, dateRange, isInitialSetup, activePlatforms.meta, activePlatforms.shopify, checkForGaps, performBackfill, backfillStatus]);

  // Update the fetchMetaMetrics function with fetch lock to prevent doubling
  const fetchMetaMetrics = useCallback(async (initialLoad: boolean = false, forceRefresh: boolean = true) => {
    // console.log(`[fetchMetaMetrics] Called - initialLoad: ${initialLoad}, forceRefresh: ${forceRefresh}`);
    
    if (!selectedBrandId) return;
    
    // ✅ FIXED: Use global fetch lock to prevent data doubling
    const fetchId = `dashboard-meta-${Date.now()}`;
    
    // 🔥🔥🔥 ALWAYS FORCE FRESH DATA - BYPASS FETCH LOCK WHEN FORCING REFRESH
    console.log(`🔥🔥🔥 [DASHBOARD] FORCING FRESH META DATA - forceRefresh=${forceRefresh}`);
    
    // Check if another fetch is already in progress (but bypass if forcing refresh)
    if (typeof window !== 'undefined' && window._metaFetchLock === true && !forceRefresh) {
      console.log('[Dashboard] 🔒 Meta fetch already in progress, skipping to prevent doubling');
      return;
    }
    
    // Acquire lock
    if (typeof window !== 'undefined') {
      window._metaFetchLock = true;
      window._activeFetchIds = window._activeFetchIds || new Set();
      window._activeFetchIds.add(fetchId);
    }
    
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
      // 🔥🔥🔥 FORCE FRESH DATA WITH MAXIMUM CACHE BUSTING
      const params = new URLSearchParams({
        brandId: selectedBrandId.toString(),
        from: startDateStr,
        to: endDateStr,
        initial_load: initialLoad.toString(),
        force_refresh: 'true', // Always force refresh
        bypass_cache: 'true',  // Always bypass cache
        force_fresh: 'true', // Force fresh data
        no_cache: 'true', // No cache allowed
        refresh: 'true', // Force refresh
        timestamp: Date.now().toString(), // Cache busting
        random: Math.random().toString(), // Extra cache busting
        t: new Date().getTime().toString() // Always add cache buster
      });
        
      console.log(`🔥🔥🔥 [DASHBOARD] Fetching FRESH Meta metrics with params:`, Object.fromEntries(params));
      
      const metaResponse = await fetch(`/api/metrics/meta?${params.toString()}`);
      
      if (!metaResponse.ok) {
        throw new Error(`Failed to fetch Meta metrics: ${metaResponse.status}`);
      }
      
      const metaData = await metaResponse.json();
      
      // Log the raw data received from the API to debug doubling
      // console.log('>>> [fetchMetaMetrics] Received Meta metrics:', {
      //   adSpend: metaData?.adSpend,
      //   adSpendGrowth: metaData?.adSpendGrowth,
      //   impressions: metaData?.impressions,
      //   impressionGrowth: metaData?.impressionGrowth,
      //   clicks: metaData?.clicks,
      //   clickGrowth: metaData?.clickGrowth,
      //   roas: metaData?.roas,
      //   roasGrowth: metaData?.roasGrowth
      // });
      
      // console.log('Received Meta metrics:', {
      //   adSpend: metaData.adSpend,
      //   roas: metaData.roas,
      //   impressions: metaData.impressions,
      //   clicks: metaData.clicks
      // });
      
      // FIX: Only update Meta-specific metrics to prevent duplication, preserve other metrics
      // console.log('>>> [fetchMetaMetrics] Previous metrics before update:', {
      //   adSpendGrowth: (prev: any) => prev.adSpendGrowth,
      //   impressionGrowth: (prev: any) => prev.impressionGrowth,
      //   roasGrowth: (prev: any) => prev.roasGrowth
      // });
      
      setMetrics(prev => {
        const newMetrics = {
          ...prev,
          // Only update Meta-specific metrics, don't duplicate Shopify data
          adSpend: metaData.adSpend ?? 0,
          adSpendGrowth: metaData.adSpendGrowth ?? 0,
          roas: metaData.roas ?? 0,
          roasGrowth: metaData.roasGrowth ?? 0,
          impressions: metaData.impressions ?? 0,
          impressionGrowth: metaData.impressionGrowth ?? 0,
          ctr: metaData.ctr ?? 0,
          ctrGrowth: metaData.ctrGrowth ?? 0,
          clicks: metaData.clicks ?? 0,
          clickGrowth: metaData.clickGrowth ?? 0,
          conversions: metaData.conversions ?? 0,
          conversionGrowth: metaData.conversionGrowth ?? 0,
          cpc: metaData.cpc ?? 0,
          costPerResult: metaData.costPerResult ?? 0,
          cprGrowth: metaData.cprGrowth ?? 0,
          // Add Reach update here
          reach: metaData.reach ?? 0,
          // For dailyData, only update if we have new Meta daily data, otherwise preserve existing
          dailyData: metaData.dailyData && metaData.dailyData.length > 0 ? metaData.dailyData : prev.dailyData,
        };
        
        // console.log('>>> [fetchMetaMetrics] New metrics being applied:', {
        //   adSpendGrowth: newMetrics.adSpendGrowth,
        //   impressionGrowth: newMetrics.impressionGrowth,
        //   roasGrowth: newMetrics.roasGrowth
        // });
        
        return newMetrics;
      });
      
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
    } finally {
      // ✅ FIXED: Always release lock to prevent blocking future fetches
      if (typeof window !== 'undefined') {
        window._metaFetchLock = false;
        window._activeFetchIds?.delete(fetchId);
      }
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
              
              // 🚨 REMOVED: Dashboard should NOT call campaigns directly
              // This was causing race conditions with MetaTab2's fetchCampaigns
              // MetaTab2 handles its own campaign fetching via event listeners
              
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
          
          const syncOrdersResponse = await fetch('/api/cron/shopify-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              brandId: selectedBrandId,
              force_refresh: true,
              full_sync: true
            })
          })
          
          if (!syncOrdersResponse.ok) {
            // console.error('Failed to sync orders data:', await syncOrdersResponse.text())
          } else {
            // Wait for the sync to complete
            await new Promise(resolve => setTimeout(resolve, 3000))
            
            // Also sync comparison period data
            try {
              const getPreviousPeriodDates = (from: Date, to: Date) => {
                const fromNormalized = new Date(from.getFullYear(), from.getMonth(), from.getDate());
                const toNormalized = new Date(to.getFullYear(), to.getMonth(), to.getDate());
                
                const currentRange = toNormalized.getTime() - fromNormalized.getTime();
                const daysInRange = Math.ceil(currentRange / (1000 * 60 * 60 * 24)) + 1;
                
                const prevFrom = new Date(fromNormalized);
                prevFrom.setDate(prevFrom.getDate() - daysInRange);
                
                const prevTo = new Date(toNormalized);
                prevTo.setDate(prevTo.getDate() - daysInRange);
                
                return {
                  prevFrom: format(prevFrom, 'yyyy-MM-dd'),
                  prevTo: format(prevTo, 'yyyy-MM-dd')
                };
              };
              
              const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to);
              
              await fetch('/api/cron/shopify-sync', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  brandId: selectedBrandId,
                  force_refresh: true,
                  dateFrom: prevFrom,
                  dateTo: prevTo,
                  comparison_sync: true
                })
              });
              
              // console.log(`[Dashboard] Shopify comparison period synced: ${prevFrom} to ${prevTo}`);
            } catch (compError) {
              // console.warn('Shopify comparison sync failed:', compError);
            }
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
        // FIX: Only update Shopify-specific metrics to prevent duplication, preserve Meta metrics
        setMetrics(prevMetrics => ({
          ...prevMetrics,
          // Only update Shopify-specific metrics
          totalSales: data.totalSales ?? 0,
          salesGrowth: data.salesGrowth ?? 0,
          ordersPlaced: data.ordersPlaced ?? 0,
          ordersGrowth: data.ordersGrowth ?? 0,
          unitsSold: data.unitsSold ?? 0,
          unitsGrowth: data.unitsGrowth ?? 0,
          averageOrderValue: data.averageOrderValue ?? 0,
          aovGrowth: data.aovGrowth ?? 0,
          customerRetentionRate: data.customerRetentionRate ?? 0,
          retentionGrowth: data.retentionGrowth ?? 0,
          conversionRate: data.conversionRate ?? 0,
          conversionGrowth: data.conversionGrowth ?? 0,
          returnRate: data.returnRate ?? 0,
          returnGrowth: data.returnGrowth ?? 0,
          conversionRateGrowth: data.conversionRateGrowth ?? 0,
          topProducts: data.topProducts ?? [],
          revenueByDay: data.revenueByDay ?? [],
          customerSegments: data.customerSegments ?? { newCustomers: 0, returningCustomers: 0 },
          salesData: data.salesData ?? [],
          ordersData: data.ordersData ?? [],
          aovData: data.aovData ?? [],
          unitsSoldData: data.unitsSoldData ?? [],
          // Preserve existing Meta metrics - don't overwrite with Shopify data
          // adSpend, roas, impressions, clicks, etc. are preserved from previous state
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
      
      // POTENTIAL FIX: Only call fetchMetaMetrics if Meta platform is NOT active
      // This prevents double-calling when Meta resync already processes the data
      // FIXED: Eliminate duplicate Meta data fetching after resync
      // Meta resync already ensures fresh data is in the database
      // MetaTab components will fetch this data independently via their own useEffect hooks
      // No need for dashboard to also fetch Meta metrics since it would be redundant
      // console.log('>>> [fetchAllData] Meta resync completed - MetaTab components will handle their own data fetching');
      
      // Dispatch event to let MetaTab components know fresh data is available
      window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
        detail: { 
          brandId: selectedBrandId, 
          timestamp: new Date().getTime(), 
          forceRefresh: true,
          source: 'dashboard-resync',
          dateRange: {
            from: fromDateStr,
            to: toDateStr
          }
        }
      }));
      
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
      // Reset date range cooldown when data loading completes
      setIsDateRangeLoading(false);
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
                  fetch('/api/meta/sync-demographics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      brandId: selectedBrandId
                    })
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      toast({
                        title: "Data Synced",
                        description: "Successfully synced recent Meta data",
                        variant: "default"
                      });
                      
                      // Force refresh dashboard
                      fetchAllData(true);
                    }
                  });
                }}
                className="bg-blue-600 text-white rounded px-3 py-1 text-sm"
              >
                Sync Recent Data
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
    shopify: connectionStoreConnections?.some((c: PlatformConnection) => c.platform_type === 'shopify') || false,
    meta: connectionStoreConnections?.some((c: PlatformConnection) => c.platform_type === 'meta') || false
  }

  const shopifyConnection = connections?.find(c => 
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
          
          // FIX: Update only Shopify metrics to prevent duplication
          if (!cancelled) {
            setMetrics(prevMetrics => ({
              ...prevMetrics,
              // Only update Shopify-specific metrics, preserve Meta metrics
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
              topProducts: data.topProducts ?? prevMetrics.topProducts,
              revenueByDay: data.revenueByDay ?? prevMetrics.revenueByDay,
              customerSegments: data.customerSegments ?? prevMetrics.customerSegments,
              salesData: data.salesData ?? prevMetrics.salesData,
              ordersData: data.ordersData ?? prevMetrics.ordersData,
              aovData: data.aovData ?? prevMetrics.aovData,
              unitsSoldData: data.unitsSoldData ?? prevMetrics.unitsSoldData,
              // Preserve Meta metrics - don't overwrite them
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
    window.addEventListener('force-metrics-refresh', handleShopifyRefresh);
    
    return () => {
      cancelled = true;
      window.removeEventListener('force-shopify-refresh', handleShopifyRefresh);
      window.removeEventListener('force-metrics-refresh', handleShopifyRefresh);
    };
  }, [selectedBrandId, dateRange, setMetrics]);

  // Auto-sync on dashboard load to get latest data
  useEffect(() => {
    let cancelled = false;
    
    const triggerAutoSync = async () => {
      if (cancelled || !selectedBrandId) return;
      
      // Find Shopify connection
      const shopifyConnection = connections?.find(c => 
        c.platform_type === 'shopify' && c.status === 'active' && c.brand_id === selectedBrandId
      );
      
      if (shopifyConnection) {

        
        try {
          // Trigger sync to get latest orders
          const response = await fetch('/api/shopify/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              shop: shopifyConnection.shop, 
              brandId: selectedBrandId,
              forceRefresh: true 
            })
          });
          
          if (response.ok) {

            // Trigger data refresh after sync
            window.dispatchEvent(new CustomEvent('force-shopify-refresh', {
              detail: { brandId: selectedBrandId, source: 'auto-sync', timestamp: Date.now() }
            }));
          }
        } catch (error) {

        }
      }
    };
    
    // Trigger auto-sync immediately to get latest data
    const timer = setTimeout(triggerAutoSync, 500);
    
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedBrandId, connections]);

  // Handle tab changes
  const handleTabChange = (tab: string) => {
    // console.log(`[Dashboard] Tab changed from ${activeTab} to ${tab} - triggering targeted refresh`);
    
    // Prevent tab change for disconnected platforms
    if (tab === 'meta' && !activePlatforms.meta) {
      // console.log(`[Dashboard] Blocked Meta tab change - platform not connected`)
      return
    }
    
    if (tab === 'shopify' && !activePlatforms.shopify) {
      // console.log(`[Dashboard] Blocked Shopify tab change - platform not connected`)
      return
    }
    
    // Prevent tab change for coming soon platforms
    if (tab === 'tiktok' || tab === 'google') {
      // console.log(`[Dashboard] Blocked ${tab} tab change - coming soon`)
      return
    }
    
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
      
    }
  };

  // Determine what to render based on auth state
  const renderContent = () => {
  // Skip loading state - removed per user request

  // If auth is loaded and user is not signed in, redirect to login page
  if (isLoaded && !userId) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return null // Removed loading state per user request
  }

    // Main dashboard content
  return (
    <>
      {/* Show action center loading overlay when agency tab is loading - covers main content area only, respects sidebar - only on initial load */}
      {activeTab === "agency" && showLoadingOverlay && (
        <div className="fixed top-0 bottom-0 right-0 bg-[#0A0A0A] z-40 transition-all duration-300 ease-in-out"
             style={{
               left: `${sidebarWidth}px`, // Dynamic positioning based on actual sidebar width
             }}>
          <div className="w-full h-full flex flex-col items-center justify-center">
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
                  {agencySettings.agency_logo_url && (
                    <img 
                      src={agencySettings.agency_logo_url} 
                      alt={`${agencySettings.agency_name} Logo`} 
                      className="w-12 h-12 object-contain rounded" 
                    />
                  )}
                </div>
              </div>
              
              {/* Loading title */}
              <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
                Dashboard
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
              
              {/* Loading phases checklist - synced to progression percentages */}
              <div className="text-left space-y-2 text-sm text-gray-400">
                <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 10 ? 'text-gray-300' : ''}`}>
                  <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 20 ? 'bg-green-400' : loadingProgress >= 10 ? 'bg-white/60' : 'bg-white/20'}`}></div>
                  <span>Loading workspace data</span>
                </div>
                <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 30 ? 'text-gray-300' : ''}`}>
                  <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 40 ? 'bg-green-400' : loadingProgress >= 30 ? 'bg-white/60' : 'bg-white/20'}`}></div>
                  <span>Generating action items</span>
                </div>
                <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 50 ? 'text-gray-300' : ''}`}>
                  <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 60 ? 'bg-green-400' : loadingProgress >= 50 ? 'bg-white/60' : 'bg-white/20'}`}></div>
                  <span>Analyzing brand performance</span>
                </div>
                <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 70 ? 'text-gray-300' : ''}`}>
                  <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 80 ? 'bg-green-400' : loadingProgress >= 70 ? 'bg-white/60' : 'bg-white/20'}`}></div>
                  <span>Processing automation tools</span>
                </div>
                <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 90 ? 'text-gray-300' : ''}`}>
                  <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 95 ? 'bg-green-400' : loadingProgress >= 90 ? 'bg-white/60' : 'bg-white/20'}`}></div>
                  <span>Preparing dashboard</span>
                </div>
              </div>
              
              {/* Subtle loading tip */}
              <div className="mt-8 text-xs text-gray-500 italic">
                Initializing your comprehensive agency management dashboard...
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Unified Modern Header - hide during loading overlay */}
      {!showLoadingOverlay && (
        <UnifiedDashboardHeader
          activeTab={activeTab}
          onTabChange={handleTabChange}
          dateRange={dateRange}
          setDateRange={handleDateRangeChange}
          selectedBrandId={selectedBrandId}
          activePlatforms={activePlatforms}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          agencyName={agencySettings?.agency_name}
          agencyLogo={agencySettings?.agency_logo_url}
          brandName={brands?.find(b => b.id === selectedBrandId)?.name}
          isDateRangeLoading={isDateRangeLoading}
          connections={connections}
        />
      )}

      {/* Main dashboard content - Responsive container for all tabs */}
              <div className="max-w-[1600px] mx-auto flex flex-col min-h-screen relative pt-2 sm:pt-4 px-2 sm:px-4 md:px-6 lg:px-8 animate-in fade-in duration-300">
        <GridOverlay />
        <div className="flex-grow pb-8 relative z-10">
          {/* Agency tab content - always render but hide during loading */}
          {activeTab === "agency" && (
            <div className={`${showLoadingOverlay ? 'invisible' : 'visible'}`}>
              <AgencyActionCenter 
                dateRange={dateRange} 
                onLoadingStateChange={setIsAgencyWidgetsLoading}
              />
            </div>
          )}
          
          {/* Other tabs - only render when not loading */}
          {!showLoadingOverlay && (
            <>
              {activeTab === "meta" && (
                <MetaContent 
                  brandId={selectedBrandId}
                  dateRange={dateRange}
                  connections={connections}
                  brands={brands}
                />
              )}
              
              {activeTab === "shopify" && (
                <ShopifyContent 
                  brandId={selectedBrandId}
                  dateRange={dateRange}
                  connections={connections}
                  metrics={metrics}
                  isLoading={isLoading}
                  brands={brands}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
    )
  }

  // Always return inside the error boundary
  return (
    <DashboardErrorBoundary>
      {renderContent()}
    </DashboardErrorBoundary>
  )
}
