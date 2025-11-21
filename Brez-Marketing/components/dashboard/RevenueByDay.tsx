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
  getDay,
  addMonths,
  subMonths,
  formatISO
} from "date-fns"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type TimeFrame = 'today' | 'weekly' | 'monthly' | 'yearly'

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
    zonedDate?: Date;
    localTimeStr?: string;
    localHour?: string;
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
        try {
          // Parse the date from the order (it should already be in the correct timezone)
          const orderDate = parseISO(order.created_at);
          
          // Format in user's local timezone  
          const localTimeStr = format(orderDate, 'yyyy-MM-dd HH:mm:ss');
          const localHour = format(orderDate, 'HH');
          
          // Log detailed conversion information
          console.log(`Order conversion:
            - Original ISO: ${order.created_at}
            - Parsed: ${format(orderDate, 'yyyy-MM-dd HH:mm:ss')}
            - Local time: ${localTimeStr}
            - Hour: ${localHour}
          `);
          
          return {
            date: order.created_at, // Keep the original ISO string
            zonedDate: orderDate,   // Store the parsed date
            localTimeStr: localTimeStr, // Store the formatted local time string
            localHour: localHour,   // Store the local hour for grouping
            revenue: parseFloat(order.total_price || '0'),
            id: order.id
          };
        } catch (error) {
          console.error('Error processing order:', error);
          return {
            date: order.created_at,
            revenue: parseFloat(order.total_price || '0'),
            id: order.id
          };
        }
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
  
  // Add a new effect to trigger refresh when isRefreshing changes to true
  useEffect(() => {
    if (isRefreshing && brandId) {
      console.log('Revenue Calendar: Manual refresh triggered');
      fetchSalesData();
    }
  }, [isRefreshing, brandId]);
  
  // Handle timeframe change
  const handleTimeFrameChange = (value: TimeFrame) => {
    console.log('Changing timeframe to:', value);
    setTimeFrame(value);
  };
  
  // Ensure today and yesterday are included in the data
  const ensureTodayAndYesterday = (data: Array<{
    date: string; 
    zonedDate?: Date; 
    localTimeStr?: string;
    localHour?: string;
    revenue: number; 
    id?: string;
  }>) => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    
    const todayFormatted = format(today, 'yyyy-MM-dd');
    const yesterdayFormatted = format(yesterday, 'yyyy-MM-dd');
    
    // Check if today and yesterday are in the data
    const hasTodaySale = data.some(sale => {
      if (!sale || !sale.date) return false;
      try {
        // If we have a zonedDate, use that for comparison
        if (sale.zonedDate) {
          return format(sale.zonedDate, 'yyyy-MM-dd') === todayFormatted;
        }
        
        const saleDate = parseISO(sale.date);
        return format(saleDate, 'yyyy-MM-dd') === todayFormatted;
      } catch (error) {
        return false;
      }
    });
    
    const hasYesterdaySale = data.some(sale => {
      if (!sale || !sale.date) return false;
      try {
        // If we have a zonedDate, use that for comparison
        if (sale.zonedDate) {
          return format(sale.zonedDate, 'yyyy-MM-dd') === yesterdayFormatted;
        }
        
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
      // Get the user's timezone
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      enhancedData.push({
        date: format(today, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
        zonedDate: today,
                    localTimeStr: format(today, 'yyyy-MM-dd HH:mm:ss'),
            localHour: format(today, 'HH'),
        revenue: 0,
        id: `generated-today-${Date.now()}`
      });
    }
    
    // Add yesterday if not present
    if (!hasYesterdaySale) {
      // Get the user's timezone
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      enhancedData.push({
        date: format(yesterday, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
        zonedDate: yesterday,
                    localTimeStr: format(yesterday, 'yyyy-MM-dd HH:mm:ss'),
            localHour: format(yesterday, 'HH'),
        revenue: 0,
        id: `generated-yesterday-${Date.now()}`
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
      
      let key = '';
      
      // Group by different time frames
      if (timeFrame === 'today') {
        // Group by hour for today view
        const today = new Date();
        
        // Get the user's timezone
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // If we have localHour, use it directly (most accurate)
        if (sale.localHour) {
          // Check if the sale is from today in the user's timezone
          const saleDate = parseISO(sale.date);
          const todayStr = format(today, 'yyyy-MM-dd');
          const saleDateStr = format(saleDate, 'yyyy-MM-dd');
          
          if (todayStr === saleDateStr) {
            key = sale.localHour;
            
            console.log(`Sale grouped to hour ${key} using localHour:
              - Original date: ${sale.date}
              - Local time: ${sale.localTimeStr || 'N/A'}
              - Timezone: ${userTimeZone}
            `);
          } else {
            return acc; // Skip if not today
          }
        }
        // If we have a zonedDate, use it
        else if (sale.zonedDate) {
          // Check if the sale is from today in the user's timezone
          if (isSameDay(sale.zonedDate, today)) {
            // Use the hour from the timezone-adjusted date
            const hour = format(sale.zonedDate, 'HH'); // 00-23 hour format
            key = hour;
            
            console.log(`Sale grouped to hour ${hour} using zonedDate:
              - Original date: ${sale.date}
              - Local time: ${format(sale.zonedDate, 'yyyy-MM-dd HH:mm:ss')}
              - Timezone: ${userTimeZone}
            `);
          } else {
            return acc; // Skip if not today
          }
        } else {
          // Fallback if neither localHour nor zonedDate is available
          const saleDate = parseISO(sale.date);
          const localHour = format(saleDate, 'HH');
          const todayStr = format(today, 'yyyy-MM-dd');
          const saleDateStr = format(saleDate, 'yyyy-MM-dd');
          
          if (todayStr === saleDateStr) {
            key = localHour;
            console.log(`Fallback grouping to hour ${key}:
              - Original date: ${sale.date}
              - Local time: ${format(saleDate, 'yyyy-MM-dd HH:mm:ss')}
              - Timezone: ${userTimeZone}
            `);
          } else {
            return acc; // Skip if not today
          }
        }
      } else if (timeFrame === 'weekly') {
        // Group by day for weekly view
        const saleDate = sale.zonedDate || parseISO(sale.date);
        key = format(saleDate, 'yyyy-MM-dd');
      } else if (timeFrame === 'monthly') {
        // Group by day for monthly view
        const saleDate = sale.zonedDate || parseISO(sale.date);
        key = format(saleDate, 'yyyy-MM-dd');
      } else if (timeFrame === 'yearly') {
        // Group by month for yearly view
        const saleDate = sale.zonedDate || parseISO(sale.date);
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
  
  // For the "Today" view, add a helper function to get the current hour
  const getCurrentHour = (): number => {
    return new Date().getHours();
  };

  // Generate display data based on time frame
  const generateDisplayData = (): DisplayItem[] => {
    const today = new Date();
    const currentHour = getCurrentHour();
    
    if (timeFrame === 'today') {
      // For today view, show hours of the day (0-23)
      const hours = Array.from({ length: 24 }, (_, i) => i);
      
      return hours.map(hour => {
        const hourKey = hour.toString().padStart(2, '0');
        const existingData = groupedSalesData[hourKey];
        
        // Format the hour for display (12am, 1am, ..., 11pm)
        let displayHour;
        if (hour === 0) {
          displayHour = '12am';
        } else if (hour < 12) {
          displayHour = `${hour}am`;
        } else if (hour === 12) {
          displayHour = '12pm';
        } else {
          displayHour = `${hour - 12}pm`;
        }
        
        return {
          date: hourKey,
          displayDate: displayHour,
          revenue: existingData ? existingData.revenue : 0,
          count: existingData ? existingData.count : 0,
          isToday: hour === currentHour
        } as WeeklyOrMonthlyDisplayItem;
      });
    } else if (timeFrame === 'weekly') {
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
    if (timeFrame === 'today') {
      return `Today (${format(currentDate, 'MMMM d, yyyy')})`;
    } else if (timeFrame === 'weekly') {
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
    if (timeFrame === 'today') {
      // Today view - 24 hours in a row
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      return (
        <div className="flex flex-col h-full flex-1">
          <div className="text-xs text-gray-400 mb-2">
            Sales by hour of the day (adjusted to your local timezone: {userTimeZone})
          </div>
          
          <div className="flex flex-col flex-1">
            {/* AM Hours (12am-11am) */}
            <div className="flex-1 flex flex-col mb-2 min-h-[35%]">
              <div className="text-xs font-medium text-gray-300 mb-1">AM</div>
              <div className="grid grid-cols-12 gap-2 flex-1 h-[calc(50%-1rem)]">
                {displayData.slice(0, 12).map((item, index) => {
                  const isCurrentHour = (item as WeeklyOrMonthlyDisplayItem).isToday;
                  const hasRevenue = item.revenue > 0;
                  
                  return (
                    <div 
                      key={index}
                      className={cn(
                        "flex flex-col rounded-md overflow-hidden flex-1 min-h-[80px] transition-all duration-200",
                        isCurrentHour 
                          ? "border-2 border-gray-500 shadow-md" 
                          : "border border-gray-700 bg-[#111111]"
                      )}
                    >
                      <div className={cn(
                        "text-center py-1 text-xs font-medium",
                        isCurrentHour 
                          ? "bg-gray-500 text-white" 
                          : "bg-[#222222] text-gray-200"
                      )}>
                        {item.displayDate}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-end p-1">
                        {hasRevenue ? (
                          <>
                            <div className="flex-1 w-full flex flex-col justify-end mb-1 min-h-[60px]">
                              <div 
                                style={{ height: `${Math.max(5, Math.min(100, (item.revenue / maxRevenue) * 100))}%` }}
                                className="w-full rounded-t bg-emerald-500/80"
                              ></div>
                            </div>
                            
                            <div className="text-center text-xs font-medium text-emerald-500">
                              {renderRevenueValue(item.revenue)}
                            </div>
                            {item.count > 0 && (
                              <div className="text-center text-xs text-gray-400">
                                {item.count} order{item.count !== 1 ? 's' : ''}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                            No sales
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* PM Hours (12pm-11pm) */}
            <div className="flex-1 flex flex-col min-h-[35%]">
              <div className="text-xs font-medium text-gray-300 mb-1">PM</div>
              <div className="grid grid-cols-12 gap-2 flex-1 h-[calc(50%-1rem)]">
                {displayData.slice(12, 24).map((item, index) => {
                  const isCurrentHour = (item as WeeklyOrMonthlyDisplayItem).isToday;
                  const hasRevenue = item.revenue > 0;
                  
                  return (
                    <div 
                      key={index + 12}
                      className={cn(
                        "flex flex-col rounded-md overflow-hidden flex-1 min-h-[80px] transition-all duration-200",
                        isCurrentHour 
                          ? "border-2 border-gray-500 shadow-md" 
                          : "border border-gray-700 bg-[#111111]"
                      )}
                    >
                      <div className={cn(
                        "text-center py-1 text-xs font-medium",
                        isCurrentHour 
                          ? "bg-gray-500 text-white" 
                          : "bg-[#222222] text-gray-200"
                      )}>
                        {item.displayDate}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-end p-1">
                        {hasRevenue ? (
                          <>
                            <div className="flex-1 w-full flex flex-col justify-end mb-1 min-h-[60px]">
                              <div 
                                style={{ height: `${Math.max(5, Math.min(100, (item.revenue / maxRevenue) * 100))}%` }}
                                className="w-full rounded-t bg-emerald-500/80"
                              ></div>
                            </div>
                            
                            <div className="text-center text-xs font-medium text-emerald-500">
                              {renderRevenueValue(item.revenue)}
                            </div>
                            {item.count > 0 && (
                              <div className="text-center text-xs text-gray-400">
                                {item.count} order{item.count !== 1 ? 's' : ''}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                            No sales
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    } else if (timeFrame === 'weekly') {
      // Weekly view - 7 days in a row
      return (
        <div className="grid grid-cols-7 gap-2 h-full flex-1">
          {displayData.map((item, index) => {
            const isToday = (item as WeeklyOrMonthlyDisplayItem).isToday;
            const hasRevenue = item.revenue > 0;
            
            return (
              <div 
                key={index}
                className={cn(
                  "flex flex-col rounded-md overflow-hidden h-full min-h-[300px] transition-all duration-200",
                  isToday 
                    ? "border-2 border-gray-500 shadow-md" 
                    : "border border-gray-700 bg-[#111111]"
                )}
              >
                <div className={cn(
                  "text-center py-1 text-xs font-medium",
                  isToday 
                    ? "bg-gray-500 text-white" 
                    : "bg-[#222222] text-gray-200"
                )}>
                  {item.displayDate}
                </div>
                
                <div className="flex-1 flex flex-col justify-end p-2 h-full">
                  {hasRevenue ? (
                    <>
                      <div className="flex-1 w-full flex flex-col justify-end mb-1 min-h-[200px]">
                        <div 
                          style={{ height: `${Math.max(5, Math.min(100, (item.revenue / maxRevenue) * 100))}%` }}
                          className="w-full rounded-t bg-emerald-500/80"
                        ></div>
                      </div>
                      
                      <div className="text-center text-sm font-medium text-emerald-500">
                        {renderRevenueValue(item.revenue)}
                      </div>
                      {item.count > 0 && (
                        <div className="text-center text-xs text-gray-400">
                          {item.count} order{item.count !== 1 ? 's' : ''}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                      No sales
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
        <div className="h-full flex-1 flex flex-col">
          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {daysOfWeek.map((day, index) => (
              <div key={index} className="text-center text-xs font-medium text-gray-400">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-0.5 flex-1 h-full">
            {/* Empty cells for days before the first of the month */}
            {emptyCells.map(({ index }) => (
              <div key={`empty-${index}`} className="bg-transparent"></div>
            ))}
            
            {/* Actual days of the month */}
            {displayData.map((item, index) => {
              const day = parseInt(item.displayDate);
              const isToday = (item as WeeklyOrMonthlyDisplayItem).isToday;
              const hasRevenue = item.revenue > 0;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col rounded-sm overflow-hidden min-h-[60px] transition-all duration-200",
                    isToday 
                      ? "border border-gray-500 shadow-sm" 
                      : "border border-gray-700 bg-[#111111]"
                  )}
                >
                  <div className={cn(
                    "text-center text-xs font-medium",
                    isToday 
                      ? "bg-gray-500 text-white" 
                      : "bg-[#222222] text-gray-200"
                  )}>
                    {day}
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center p-0.5">
                    {hasRevenue ? (
                      <>
                        <div className="text-center text-xs font-medium text-emerald-500">
                          {renderRevenueValue(item.revenue)}
                        </div>
                        {item.count > 0 && (
                          <div className="text-center text-xs text-gray-400">
                            {item.count} order{item.count !== 1 ? 's' : ''}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500 text-[10px]">
                        -
                      </div>
                    )}
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
        <div className="grid grid-cols-4 gap-2 h-full flex-1">
          {displayData.map((item, index) => {
            const isCurrentMonth = (item as YearlyDisplayItem).isCurrentMonth;
            const hasRevenue = item.revenue > 0;
            
            return (
              <div 
                key={index}
                className={cn(
                  "flex flex-col rounded-md overflow-hidden h-full transition-all duration-200",
                  isCurrentMonth 
                    ? "border-2 border-gray-500 shadow-md" 
                    : "border border-gray-700 bg-[#111111]"
                )}
              >
                <div className={cn(
                  "text-center py-1 text-sm font-medium",
                  isCurrentMonth 
                    ? "bg-gray-500 text-white" 
                    : "bg-[#222222] text-gray-200"
                )}>
                  {item.displayDate}
                </div>
                
                <div className="flex-1 flex flex-col justify-end p-2">
                  {hasRevenue ? (
                    <>
                      <div className="flex-1 w-full flex flex-col justify-end mb-1 min-h-[60px]">
                        <div 
                          style={{ height: `${Math.max(5, Math.min(100, (item.revenue / maxRevenue) * 100))}%` }}
                          className="w-full rounded-t bg-emerald-500/80"
                        ></div>
                      </div>
                      
                      <div className="text-center text-sm font-medium text-emerald-500">
                        {renderRevenueValue(item.revenue)}
                      </div>
                      {item.count > 0 && (
                        <div className="text-center text-xs text-gray-400">
                          {item.count} order{item.count !== 1 ? 's' : ''}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                      No sales
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  };
  
  // Render revenue value with loading state
  const renderRevenueValue = (revenue: number) => {
    if (isRefreshing) {
      return (
        <div className="animate-pulse bg-gray-700 h-4 w-12 rounded mx-auto"></div>
      );
    }
    
    if (revenue <= 0) return "$0";
    
    // Format based on value range
    if (revenue >= 1000000) {
      // For values >= 1M, show as X.XXm
      return `$${(revenue / 1000000).toFixed(2)}m`;
    } else if (revenue >= 1000) {
      // For values >= 1K but < 1M, show as X.Xk
      return `$${(revenue / 1000).toFixed(1)}k`;
    } else {
      // For values < 1K, show as whole number
      return `$${revenue.toFixed(0)}`;
    }
  };
  
  return (
    <Card className="h-full flex flex-col bg-[#111111] border-gray-800">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-white">Revenue Calendar</CardTitle>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs h-7 px-2 rounded",
                timeFrame === 'today' 
                  ? "bg-gray-700 text-white hover:bg-gray-600" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
              onClick={() => handleTimeFrameChange('today')}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs h-7 px-2 rounded",
                timeFrame === 'weekly' 
                  ? "bg-gray-700 text-white hover:bg-gray-600" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
              onClick={() => handleTimeFrameChange('weekly')}
            >
              Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs h-7 px-2 rounded",
                timeFrame === 'monthly' 
                  ? "bg-gray-700 text-white hover:bg-gray-600" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
              onClick={() => handleTimeFrameChange('monthly')}
            >
              Month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs h-7 px-2 rounded",
                timeFrame === 'yearly' 
                  ? "bg-gray-700 text-white hover:bg-gray-600" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
              onClick={() => handleTimeFrameChange('yearly')}
            >
              Year
            </Button>
          </div>
        </div>
        <CardDescription className="text-sm font-medium text-gray-400">
          {getTitle()}
        </CardDescription>
      </CardHeader>
      
      <div className="flex-1 px-3 pb-3 pt-2 overflow-hidden flex flex-col h-full">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-500 mb-2"></div>
              <div className="text-gray-400 text-sm">Loading sales data...</div>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center text-center max-w-md">
              <div className="bg-red-900/20 p-3 rounded-full mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-red-400 font-medium mb-1">Error Loading Data</div>
              <div className="text-gray-400 text-sm">{error}</div>
            </div>
          </div>
        ) : (
          <div className="h-full flex-1 flex flex-col">
            {renderCalendarContent()}
          </div>
        )}
      </div>
      
      <div className="p-2 border-t border-gray-800 bg-[#0f0f0f] text-sm font-medium flex justify-between items-center">
        <div className="text-emerald-500 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Total Revenue: ${totalRevenue.toLocaleString()}
        </div>
        <div className="text-gray-400 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Last updated: {format(lastUpdated, 'h:mm a')}
        </div>
      </div>
    </Card>
  )
}