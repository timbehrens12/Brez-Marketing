import { FC, useEffect, useState, useRef, useCallback } from 'react'
import { Users } from 'lucide-react'
import { MetricCard } from '@/components/metrics/MetricCard'
import { DateRange } from 'react-day-picker'
import { isSameDay, subDays, format } from 'date-fns'

interface TotalAdSetReachCardProps {
  brandId: string
  dateRange?: DateRange
  isManuallyRefreshing?: boolean
  campaigns?: any[]
}

// Helper function to get previous period dates (simplified from MetaTab)
const getPreviousPeriodDates = (from: Date, to: Date): { prevFrom: string, prevTo: string } => {
  const fromDate = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toDate = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const daysInRange = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const prevFrom = new Date(fromDate);
  prevFrom.setDate(prevFrom.getDate() - daysInRange);
  
  const prevTo = new Date(toDate);
  prevTo.setDate(prevTo.getDate() - daysInRange);
  
  const toLocalISODateString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  return {
    prevFrom: toLocalISODateString(prevFrom),
    prevTo: toLocalISODateString(prevTo)
  };
}

// Helper function to get previous period label (simplified)
const getPreviousPeriodLabel = (dateRange?: DateRange): string => {
  if (!dateRange || !dateRange.from || !dateRange.to) return "Previous period";

  const fromDate = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
  const toDate = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate());
  const daysInRange = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const prevFromDate = new Date(fromDate);
  prevFromDate.setDate(prevFromDate.getDate() - daysInRange);
  const prevToDate = new Date(toDate);
  prevToDate.setDate(prevToDate.getDate() - daysInRange);
  
  const formatDate = (date: Date): string => format(date, "MMM d");

  if (isSameDay(fromDate, toDate)) {
    return `Previous day (${formatDate(prevFromDate)})`;
  }
  
  return `Previous ${daysInRange} days (${formatDate(prevFromDate)} - ${formatDate(prevToDate)})`;
};

export const TotalAdSetReachCard: FC<TotalAdSetReachCardProps> = ({ 
  brandId, 
  dateRange,
  isManuallyRefreshing = false,
  campaigns = []
}) => {
  const [totalReach, setTotalReach] = useState<number>(0)
  const [previousReach, setPreviousReach] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Ref to track if component is mounted
  const mountedRef = useRef(false)
  // Ref to cancel ongoing fetch if dependencies change
  const fetchControllerRef = useRef<AbortController | null>(null);

  // Function to fetch reach data directly from the specialized API
  const fetchReachDirectly = useCallback(async (signal: AbortSignal) => {
    if (!dateRange?.from || !dateRange?.to || !brandId) {
      console.log("[TotalAdSetReachCard] Cannot fetch reach: Missing date range or brand ID")
      setIsLoading(false); // Ensure loading stops if we can't fetch
      return
    }

    setIsLoading(true)
    let currentReach = 0;
    let prevReach = 0;
    let fetchError = false;

    try {
      const fromDateStr = dateRange.from.toISOString().split('T')[0];
      const toDateStr = dateRange.to.toISOString().split('T')[0];
      const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to);

      console.log(`[TotalAdSetReachCard] Fetching Reach: Current (${fromDateStr}-${toDateStr}), Previous (${prevFrom}-${prevTo})`);

      // --- Fetch Current Period --- 
      const currentParams = new URLSearchParams({
        brandId,
        metric: 'reach',
        from: fromDateStr,
        to: toDateStr
      });
      const currentResponse = await fetch(`/api/metrics/meta/single/reach?${currentParams.toString()}`, { signal });
      
      // --- Fetch Previous Period --- 
      const prevParams = new URLSearchParams({
        brandId,
        metric: 'reach',
        from: prevFrom,
        to: prevTo
      });
      const prevResponse = await fetch(`/api/metrics/meta/single/reach?${prevParams.toString()}`, { signal });
      
      // --- Process Results --- 
      if (!currentResponse.ok) {
        console.error(`[TotalAdSetReachCard] Error fetching current period reach: ${currentResponse.status}`);
        fetchError = true;
      } else {
        const currentData = await currentResponse.json();
        currentReach = currentData.value || 0;
        console.log(`[TotalAdSetReachCard] Current reach: ${currentReach}`);
          }
          
      if (!prevResponse.ok) {
        console.error(`[TotalAdSetReachCard] Error fetching previous period reach: ${prevResponse.status}`);
        // Don't mark as total fetchError if only previous fails, but log it.
      } else {
        const prevData = await prevResponse.json();
        prevReach = prevData.value || 0;
        console.log(`[TotalAdSetReachCard] Previous reach: ${prevReach}`);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[TotalAdSetReachCard] Fetch aborted');
        return; // Don't update state or set error if aborted
      }
      console.error("[TotalAdSetReachCard] Error fetching reach data:", error);
      fetchError = true;
    } finally {
      if (mountedRef.current && !signal.aborted) {
         // Only update state if the fetch wasn't aborted and component still mounted
        setTotalReach(currentReach); // Update even if previous fetch failed
        setPreviousReach(prevReach); 
        setLastUpdated(new Date());
        setIsLoading(false);
        if (fetchError) {
          // Optionally set an error state here if needed
        }
      }
    }
  }, [brandId, dateRange]); // Dependencies for the fetch function

  // Effect for component mount/unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Abort any ongoing fetch when unmounting
      fetchControllerRef.current?.abort(); 
    };
  }, []);

  // Effect for handling dependency changes and triggering fetches
  useEffect(() => {
    // Abort previous fetch if it's still running
    fetchControllerRef.current?.abort();
    
    if (brandId && dateRange?.from && dateRange?.to) {
      // Create a new AbortController for the new fetch
      const controller = new AbortController();
      fetchControllerRef.current = controller;
      
      // Call the fetch function
      fetchReachDirectly(controller.signal);
    } else {
      // If dependencies are missing, reset state
      setTotalReach(0);
      setPreviousReach(0);
      setIsLoading(false); // Not loading if we can't fetch
    }

    // Cleanup function for this effect run (aborts fetch if deps change again quickly)
    return () => {
      // Abort the controller stored in the ref, not the local variable
      fetchControllerRef.current?.abort(); 
    };
  }, [brandId, dateRange, fetchReachDirectly]); // Keep original dependencies for now

  return (
    <MetricCard
      title={
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-purple-400" />
          <span className="ml-0.5">Reach</span>
        </div>
      }
      value={totalReach}
      previousValue={previousReach}
      data={[]}
      loading={isLoading}
      valueFormat="number"
      hideGraph={true}
      showPreviousPeriod={true}
      previousValueFormat="number"
      previousPeriodLabel={getPreviousPeriodLabel(dateRange)}
      infoTooltip="The estimated number of unique people who saw your ads at least once during the selected period."
    />
  )
} 