"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { 
  format, 
  parseISO, 
  subDays, 
  isSameDay, 
  subYears, 
  addYears, 
  addHours, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  eachMonthOfInterval,
  getHours,
  setHours,
  startOfDay,
  isSameMonth,
  isSameWeek,
  getDay
} from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

type TimeFrame = 'weekly' | 'monthly' | 'yearly'

interface RevenueByDayProps {
  data?: Array<{
    date: string;
    revenue: number;
    isTimezoneShifted?: boolean;
    forceShowOnFirst?: boolean;
    id?: string;
  }>;
  brandId: string;
  isRefreshing?: boolean;
}

// Define types for our display items
interface BaseDisplayItem {
  date: string;
  displayDate: string;
  revenue: number;
  count: number;
}

interface WeeklyOrMonthlyDisplayItem extends BaseDisplayItem {
  isToday: boolean;
}

interface YearlyDisplayItem extends BaseDisplayItem {
  isCurrentMonth: boolean;
}

type DisplayItem = WeeklyOrMonthlyDisplayItem | YearlyDisplayItem;

export function RevenueByDay({ data: initialData, brandId, isRefreshing = false }: RevenueByDayProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('monthly');
  const [salesData, setSalesData] = useState<Array<{
    date: string; 
    revenue: number; 
    id?: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Track component subscription status to prevent state updates after unmount
  const isSubscribedRef = useRef(true);
  
  // Set up subscription tracking
  useEffect(() => {
    isSubscribedRef.current = true;
    return () => {
      isSubscribedRef.current = false;
    };
  }, []);

  // Fetch data directly from Supabase
  const fetchSalesData = async () => {
    if (!isSubscribedRef.current) return;
    setIsLoading(true);
    
    try {
      console.log('Revenue Calendar: Fetching sales data for brand:', brandId);
      
      // Get Shopify connection for this brand
      const { data: connection, error: connectionError } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('platform_type', 'shopify')
        .eq('brand_id', brandId)
        .eq('status', 'active')
        .single();
      
      if (connectionError) {
        console.error('Error fetching connection:', connectionError);
        setError('Could not find Shopify connection');
        setIsLoading(false);
        return;
      }
      
      if (!connection) {
        setError('No active Shopify connection found');
        setIsLoading(false);
        return;
      }
      
      // Fetch all orders for this connection
      const { data: orders, error: ordersError } = await supabase
        .from('shopify_orders')
        .select('*')
        .eq('connection_id', connection.id);
      
      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        setError('Error loading sales data');
        setIsLoading(false);
        return;
      }
      
      if (!orders || orders.length === 0) {
        console.log('No sales data available');
        setSalesData([]);
        setError(null);
        setLastUpdated(new Date());
        setIsLoading(false);
        return;
      }
      
      // Process the orders into sales data
      const processedData = orders.map((order: { created_at: string; total_price: string; id: string }) => {
        // Apply timezone adjustment to ensure dates are displayed correctly
        let orderDate = parseISO(order.created_at);
        
        // Check if the date needs timezone adjustment
        // This handles cases where the date might be shifted due to timezone differences
        const needsAdjustment = orderDate.getHours() === 0 && 
                                orderDate.getMinutes() === 0 && 
                                orderDate.getSeconds() === 0;
        
        if (needsAdjustment) {
          // Add hours to adjust for timezone if needed
          orderDate = addHours(orderDate, 12);
        }
        
        return {
          date: format(orderDate, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
          revenue: parseFloat(order.total_price || '0'),
          id: order.id,
          isTimezoneShifted: needsAdjustment
        };
      });
      
      console.log('Processed sales data:', processedData);
      setSalesData(processedData);
      setError(null);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error in fetchSalesData:', error);
      setError('Error loading sales data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch data on mount and set up refresh interval
  useEffect(() => {
    if (!brandId) return;
    
    fetchSalesData();
    
    // Set up interval for background refresh
    const intervalId = setInterval(() => {
      if (isSubscribedRef.current) {
        fetchSalesData();
      }
    }, 300000); // Refresh every 5 minutes
    
    return () => {
      clearInterval(intervalId);
      isSubscribedRef.current = false;
    };
  }, [brandId]);
  
  // Handle timeframe change
  const handleTimeFrameChange = (value: TimeFrame) => {
    console.log('Changing timeframe to:', value);
    setTimeFrame(value);
  };
  
  // Ensure today and yesterday are included in the data
  const ensureTodayAndYesterday = (data: Array<{date: string; revenue: number; id?: string; isTimezoneShifted?: boolean}>) => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    
    const todayFormatted = format(today, 'yyyy-MM-dd');
    const yesterdayFormatted = format(yesterday, 'yyyy-MM-dd');
    
    // Check if today and yesterday are in the data
    const hasTodaySale = data.some(sale => {
      if (!sale || !sale.date) return false;
      try {
        const saleDate = parseISO(sale.date);
        return format(saleDate, 'yyyy-MM-dd') === todayFormatted;
      } catch (error) {
        return false;
      }
    });
    
    const hasYesterdaySale = data.some(sale => {
      if (!sale || !sale.date) return false;
      try {
        const saleDate = parseISO(sale.date);
        return format(saleDate, 'yyyy-MM-dd') === yesterdayFormatted;
      } catch (error) {
        return false;
      }
    });
    
    // Create a copy of the data
    const enhancedData = [...data];
    
    // Add today if not present
    if (!hasTodaySale) {
      enhancedData.push({
        date: format(today, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
        revenue: 0,
        id: `generated-today-${Date.now()}`,
        isTimezoneShifted: false
      });
    }
    
    // Add yesterday if not present
    if (!hasYesterdaySale) {
      enhancedData.push({
        date: format(yesterday, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
        revenue: 0,
        id: `generated-yesterday-${Date.now()}`,
        isTimezoneShifted: false
      });
    }
    
    return enhancedData;
  };
  
  // Apply the today/yesterday enhancement to the sales data
  const enhancedSalesData = ensureTodayAndYesterday(salesData);
  
  // Group sales data by time frame
  const groupedSalesData = enhancedSalesData.reduce((acc, sale) => {
    try {
      if (!sale || !sale.date) return acc;
      
      const saleDate = parseISO(sale.date);
      let key = '';
      
      // Group by different time frames
      if (timeFrame === 'weekly') {
        // Group by day for weekly view
        key = format(saleDate, 'yyyy-MM-dd');
      } else if (timeFrame === 'monthly') {
        // Group by day for monthly view
        key = format(saleDate, 'yyyy-MM-dd');
      } else if (timeFrame === 'yearly') {
        // Group by month for yearly view
        key = format(saleDate, 'yyyy-MM');
      }
      
      if (!acc[key]) {
        acc[key] = {
          date: key,
          revenue: 0,
          count: 0
        };
      }
      
      acc[key].revenue += sale.revenue;
      acc[key].count += 1;
    } catch (error) {
      console.error('Error processing sale date:', sale.date, error);
    }
    
    return acc;
  }, {} as Record<string, { date: string; revenue: number; count: number }>);
  
  // Generate display data based on time frame
  const generateDisplayData = (): DisplayItem[] => {
    const today = new Date();
    
    if (timeFrame === 'weekly') {
      // For weekly view, show days of current week (Monday-Sunday)
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Start on Monday
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      return daysOfWeek.map(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const existingData = groupedSalesData[dayKey];
        
        return {
          date: dayKey,
          displayDate: format(day, 'EEE'), // Mon, Tue, etc.
          revenue: existingData ? existingData.revenue : 0,
          count: existingData ? existingData.count : 0,
          isToday: isSameDay(day, today)
        } as WeeklyOrMonthlyDisplayItem;
      });
    } else if (timeFrame === 'monthly') {
      // For monthly view, show days of current month (1-31)
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const daysOfMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      return daysOfMonth.map(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const existingData = groupedSalesData[dayKey];
        
        return {
          date: dayKey,
          displayDate: format(day, 'd'), // 1, 2, etc.
          revenue: existingData ? existingData.revenue : 0,
          count: existingData ? existingData.count : 0,
          isToday: isSameDay(day, today)
        } as WeeklyOrMonthlyDisplayItem;
      });
    } else if (timeFrame === 'yearly') {
      // For yearly view, show all months of the current year (Jan-Dec)
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      return months.map((month, index) => {
        const monthDate = new Date(today.getFullYear(), index, 1);
        const monthKey = format(monthDate, 'yyyy-MM');
        const existingData = groupedSalesData[monthKey];
        
        return {
          date: monthKey,
          displayDate: month,
          revenue: existingData ? existingData.revenue : 0,
          count: existingData ? existingData.count : 0,
          isCurrentMonth: index === today.getMonth()
        } as YearlyDisplayItem;
      });
    }
    
    return [];
  };
  
  const displayData = generateDisplayData();
  
  // Get the maximum revenue for scaling
  const maxRevenue = Math.max(...displayData.map(item => item.revenue), 1);
  
  // Calculate total revenue
  const totalRevenue = displayData.reduce((sum, item) => sum + item.revenue, 0);
  
  // Check if there's any revenue data
  const hasRevenueData = totalRevenue > 0;
  
  // Format the display label based on time frame
  const formatDisplayLabel = (item: any): string => {
    return item.displayDate || '';
  };
  
  // Get the current month and year for the title
  const currentDate = new Date();
  const getTitle = () => {
    if (timeFrame === 'weekly') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else if (timeFrame === 'monthly') {
      return format(currentDate, 'MMMM yyyy');
    } else {
      return format(currentDate, 'yyyy');
    }
  };
  
  // Render different layouts based on timeFrame
  const renderCalendarContent = () => {
    if (timeFrame === 'weekly') {
      // Weekly view - 7 days in a row
      return (
        <div className="grid grid-cols-7 gap-2 h-full">
          {displayData.map((item, index) => (
            <div 
              key={index}
              className={cn(
                "flex flex-col rounded-md overflow-hidden border h-full",
                (item as WeeklyOrMonthlyDisplayItem).isToday 
                  ? "bg-[#1a1a1a] border-gray-500 shadow-md" 
                  : "bg-[#1e1e1e] border-gray-500 hover:border-gray-400 transition-colors"
              )}
            >
              <div className={cn(
                "text-center py-1 text-xs font-medium",
                (item as WeeklyOrMonthlyDisplayItem).isToday ? "bg-gray-500 text-white" : "bg-gray-500 text-white"
              )}>
                {item.displayDate}
              </div>
              
              <div className="flex-1 flex flex-col justify-end p-1">
                <div className="relative h-16 w-full flex flex-col justify-end">
                  {item.revenue > 0 && (
                    <div 
                      style={{ height: `${Math.max(5, Math.min(100, (item.revenue / maxRevenue) * 100))}%` }}
                      className="w-full rounded-t bg-gray-500"
                    ></div>
                  )}
                </div>
                
                <div className="text-center text-xs font-medium text-emerald-500">
                  {renderRevenueValue(item.revenue)}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    } else if (timeFrame === 'monthly') {
      // Monthly view - Calendar grid
      const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const firstDayOfMonth = startOfMonth(currentDate);
      const startDayOfWeek = getDay(firstDayOfMonth);
      
      // Create array for empty cells before the first day of the month
      const emptyCells = Array.from({ length: startDayOfWeek }, (_, i) => ({ isEmpty: true, index: i }));
      
      return (
        <div className="h-full flex flex-col">
          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {daysOfWeek.map((day, index) => (
              <div key={index} className="text-center text-xs font-medium text-white py-0.5 bg-gray-500 rounded-sm">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-0.5 flex-1">
            {/* Empty cells for days before the first of the month */}
            {emptyCells.map(({ index }) => (
              <div key={`empty-${index}`} className="bg-transparent"></div>
            ))}
            
            {/* Actual days of the month */}
            {displayData.map((item, index) => {
              const day = parseInt(item.displayDate);
              const isToday = (item as WeeklyOrMonthlyDisplayItem).isToday;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col rounded-sm overflow-hidden border",
                    isToday 
                      ? "bg-[#1a1a1a] border-gray-500 shadow-md" 
                      : "bg-[#1e1e1e] border-gray-500 hover:border-gray-400 transition-colors"
                  )}
                >
                  <div className={cn(
                    "text-center py-0.5 text-xs font-medium",
                    isToday ? "bg-gray-500 text-white" : "bg-gray-500 text-white"
                  )}>
                    {day}
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center p-0.5">
                    <div className="text-center text-sm font-medium text-emerald-500">
                      {renderRevenueValue(item.revenue)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    } else {
      // Yearly view - 12 months in a grid
      return (
        <div className="grid grid-cols-4 gap-3 h-full">
          {displayData.map((item, index) => (
            <div 
              key={index}
              className={cn(
                "flex flex-col rounded-md overflow-hidden border h-full",
                (item as YearlyDisplayItem).isCurrentMonth 
                  ? "bg-[#1a1a1a] border-gray-500 shadow-md" 
                  : "bg-[#1e1e1e] border-gray-500 hover:border-gray-400 transition-colors"
              )}
            >
              <div className={cn(
                "text-center py-1 text-xs font-medium",
                (item as YearlyDisplayItem).isCurrentMonth ? "bg-gray-500 text-white" : "bg-gray-500 text-white"
              )}>
                {item.displayDate}
              </div>
              
              <div className="flex-1 flex flex-col justify-end p-1">
                <div className="relative h-16 w-full flex flex-col justify-end">
                  {item.revenue > 0 && (
                    <div 
                      style={{ height: `${Math.max(5, Math.min(100, (item.revenue / maxRevenue) * 100))}%` }}
                      className="w-full rounded-t bg-gray-500"
                    ></div>
                  )}
                </div>
                
                <div className="text-center text-lg font-medium text-emerald-500">
                  {renderRevenueValue(item.revenue)}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
  };
  
  // Render revenue value with loading state
  const renderRevenueValue = (revenue: number) => {
    if (isRefreshing) {
      return (
        <div className="animate-pulse bg-gray-700 h-5 w-12 rounded mx-auto"></div>
      );
    }
    
    return revenue > 0 
      ? (revenue >= 1000 
          ? `$${(revenue / 1000).toFixed(1)}k` 
          : `$${revenue.toFixed(0)}`)
      : '$0';
  };
  
  return (
    <div className="h-full w-full flex flex-col bg-[#111111] rounded-lg border border-gray-700 overflow-hidden shadow-lg">
      <div className="flex items-center justify-between p-3 bg-[#1A1A1A] border-b border-gray-700">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-gray-400"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Revenue Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-base font-medium text-white mr-2">
            {getTitle()}
          </div>
          <Select 
            value={timeFrame} 
            onValueChange={handleTimeFrameChange}
          >
            <SelectTrigger className="w-[120px] bg-gray-800 border-gray-700 h-8 text-white">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex-1 px-3 pb-3 pt-3 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-400"></div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            {error}
          </div>
        ) : (
          renderCalendarContent()
        )}
      </div>
      
      <div className="p-2 border-t border-gray-800 bg-[#0f0f0f] text-sm font-medium flex justify-between">
        <div className="text-emerald-500">Total Revenue: ${totalRevenue.toLocaleString()}</div>
        <div className="text-white">Last updated: {format(lastUpdated, 'h:mm a')}</div>
      </div>
    </div>
  )
}