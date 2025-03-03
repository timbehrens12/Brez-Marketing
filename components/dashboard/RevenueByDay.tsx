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

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface RevenueByDayProps {
  data?: Array<{
    date: string;
    revenue: number;
    isTimezoneShifted?: boolean;
    forceShowOnFirst?: boolean;
    id?: string;
  }>;
  brandId: string;
}

// Define types for our display items
interface BaseDisplayItem {
  date: string;
  displayDate: string;
  revenue: number;
  count: number;
}

interface DailyDisplayItem extends BaseDisplayItem {
  isCurrentHour: boolean;
}

interface WeeklyOrMonthlyDisplayItem extends BaseDisplayItem {
  isToday: boolean;
}

interface YearlyDisplayItem extends BaseDisplayItem {
  isCurrentMonth: boolean;
}

type DisplayItem = DailyDisplayItem | WeeklyOrMonthlyDisplayItem | YearlyDisplayItem;

export function RevenueByDay({ data: initialData, brandId }: RevenueByDayProps) {
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
        setError('No sales data available');
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
    if (!sale.date) return acc;
    
    try {
      // Parse the date with timezone consideration
      const saleDate = parseISO(sale.date);
      let key = '';
      
      // Group by different time frames
      if (timeFrame === 'daily') {
        // For daily view, group by hour of today
        if (isSameDay(saleDate, new Date())) {
          // Get the hour and format as 12am, 1am, etc.
          const hour = getHours(saleDate);
          key = `hour-${hour}`;
        } else {
          // Skip sales not from today
          return acc;
        }
      } else if (timeFrame === 'weekly') {
        // For weekly view, group by day of current week
        const today = new Date();
        if (isSameWeek(saleDate, today)) {
          key = format(saleDate, 'yyyy-MM-dd');
        } else {
          // Skip sales not from current week
          return acc;
        }
      } else if (timeFrame === 'monthly') {
        // For monthly view, group by day of current month
        const today = new Date();
        if (isSameMonth(saleDate, today)) {
          key = format(saleDate, 'yyyy-MM-dd');
        } else {
          // Skip sales not from current month
          return acc;
        }
      } else if (timeFrame === 'yearly') {
        // For yearly view, group by month of current year
        const today = new Date();
        if (saleDate.getFullYear() === today.getFullYear()) {
          key = format(saleDate, 'yyyy-MM');
        } else {
          // Skip sales not from current year
          return acc;
        }
      }
      
      // Skip if we couldn't determine a key
      if (!key) return acc;
      
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
    
    if (timeFrame === 'daily') {
      // For daily view, show hours of today (12am-11pm)
      const hoursOfDay = Array.from({ length: 24 }, (_, i) => {
        const hourDate = setHours(startOfDay(today), i);
        const key = `hour-${i}`;
        const existingData = groupedSalesData[key];
        
        return {
          date: key,
          displayDate: format(hourDate, 'ha').toLowerCase(), // 12am, 1am, etc.
          revenue: existingData ? existingData.revenue : 0,
          count: existingData ? existingData.count : 0,
          isCurrentHour: getHours(new Date()) === i
        } as DailyDisplayItem;
      });
      
      return hoursOfDay;
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
      
      // Get the first day of the month
      const firstDayOfMonth = getDay(monthStart);
      // Adjust for Monday as first day (0 = Monday, 6 = Sunday in our grid)
      const firstDayAdjusted = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1;
      
      // Create empty cells for days before the 1st of the month
      const emptyCells = Array.from({ length: firstDayAdjusted }, (_, i) => ({
        date: `empty-${i}`,
        displayDate: '',
        revenue: 0,
        count: 0,
        isToday: false
      } as WeeklyOrMonthlyDisplayItem));
      
      // Get all days of the month
      const daysOfMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const daysData = daysOfMonth.map(day => {
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
      
      // Combine empty cells and days data
      return [...emptyCells, ...daysData];
    } else if (timeFrame === 'yearly') {
      // For yearly view, show months of current year (Jan-Dec)
      const yearStart = startOfYear(today);
      const yearEnd = endOfYear(today);
      const monthsOfYear = eachMonthOfInterval({ start: yearStart, end: yearEnd });
      
      return monthsOfYear.map(month => {
        const monthKey = format(month, 'yyyy-MM');
        const existingData = groupedSalesData[monthKey];
        
        return {
          date: monthKey,
          displayDate: format(month, 'MMM'), // Jan, Feb, etc.
          revenue: existingData ? existingData.revenue : 0,
          count: existingData ? existingData.count : 0,
          isCurrentMonth: isSameMonth(month, today)
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
  
  // Format the display label based on time frame
  const formatDisplayLabel = (item: any): string => {
    return item.displayDate || '';
  };
  
  // Get the current month and year for the title
  const currentDate = new Date();
  const monthYearTitle = format(currentDate, 'MMMM yyyy');

  // Get revenue for a specific day
  const getRevenueForDay = (day: number): { revenue: number, formattedRevenue: string } => {
    // Find the day in our data
    const dayData = displayData.find(item => {
      if (timeFrame === 'monthly' && item.displayDate === day.toString()) {
        return true;
      }
      return false;
    });
    
    const revenue = dayData?.revenue || 0;
    const formattedRevenue = revenue > 0 
      ? revenue >= 1000
        ? `$${(revenue/1000).toFixed(1)}k`
        : `$${revenue.toFixed(0)}`
      : '$0';
      
    return { revenue, formattedRevenue };
  };
  
  // Calculate height percentage for bars
  const getHeightPercentage = (revenue: number): string => {
    if (revenue <= 0) return '0%';
    return `${Math.max(5, Math.min(100, (revenue / maxRevenue) * 100))}%`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-black rounded-lg p-4">
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-white">Revenue Calendar</h2>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-white">{monthYearTitle}</h3>
        <Select value={timeFrame} onValueChange={(value: TimeFrame) => setTimeFrame(value)}>
          <SelectTrigger className="w-[120px] bg-gray-900 border-gray-700">
            <SelectValue>This Month</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Today</SelectItem>
            <SelectItem value="weekly">This Week</SelectItem>
            <SelectItem value="monthly">This Month</SelectItem>
            <SelectItem value="yearly">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse w-full">
            <div className="h-[300px] bg-gray-800 rounded-md"></div>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">{error}</div>
        </div>
      ) : (
        <div className="flex-1">
          <div className="grid grid-cols-7 gap-2">
            <div className="text-center text-xs font-medium text-gray-400 py-1">Mon</div>
            <div className="text-center text-xs font-medium text-gray-400 py-1">Tue</div>
            <div className="text-center text-xs font-medium text-gray-400 py-1">Wed</div>
            <div className="text-center text-xs font-medium text-gray-400 py-1">Thu</div>
            <div className="text-center text-xs font-medium text-gray-400 py-1">Fri</div>
            <div className="text-center text-xs font-medium text-gray-400 py-1">Sat</div>
            <div className="text-center text-xs font-medium text-gray-400 py-1">Sun</div>
            
            {/* Empty cells for days before the 1st */}
            <div className="bg-transparent h-[60px]"></div>
            <div className="bg-transparent h-[60px]"></div>
            <div className="bg-transparent h-[60px]"></div>
            <div className="bg-transparent h-[60px]"></div>
            
            {/* Day 1 */}
            {(() => {
              const { revenue, formattedRevenue } = getRevenueForDay(1);
              return (
                <div className="flex flex-col h-[60px] rounded-md overflow-hidden border bg-gray-900 border-gray-800">
                  <div className="text-center py-1 text-sm font-medium bg-gray-800 text-gray-300">1</div>
                  <div className="flex-1 flex flex-col justify-end p-2 relative">
                    <div className="absolute inset-x-2 bottom-8 top-2 flex items-end">
                      <div 
                        className={`w-full rounded-t transition-all duration-300 ${revenue > 0 ? 'bg-blue-600' : 'bg-gray-700 h-0.5'}`}
                        style={{ height: getHeightPercentage(revenue) }}
                      ></div>
                    </div>
                    <div className="text-center text-sm font-medium text-white">{formattedRevenue}</div>
                  </div>
                </div>
              );
            })()}
            
            {/* Day 2 */}
            {(() => {
              const { revenue, formattedRevenue } = getRevenueForDay(2);
              return (
                <div className="flex flex-col h-[60px] rounded-md overflow-hidden border bg-gray-900 border-gray-800">
                  <div className="text-center py-1 text-sm font-medium bg-gray-800 text-gray-300">2</div>
                  <div className="flex-1 flex flex-col justify-end p-2 relative">
                    <div className="absolute inset-x-2 bottom-8 top-2 flex items-end">
                      <div 
                        className={`w-full rounded-t transition-all duration-300 ${revenue > 0 ? 'bg-blue-600' : 'bg-gray-700 h-0.5'}`}
                        style={{ height: getHeightPercentage(revenue) }}
                      ></div>
                    </div>
                    <div className="text-center text-sm font-medium text-white">{formattedRevenue}</div>
                  </div>
                </div>
              );
            })()}
            
            {/* Day 3 (highlighted) */}
            {(() => {
              const { revenue, formattedRevenue } = getRevenueForDay(3);
              return (
                <div className="flex flex-col h-[60px] rounded-md overflow-hidden border bg-blue-900/20 border-blue-700">
                  <div className="text-center py-1 text-sm font-medium bg-blue-900/50 text-blue-100">3</div>
                  <div className="flex-1 flex flex-col justify-end p-2 relative">
                    <div className="absolute inset-x-2 bottom-8 top-2 flex items-end">
                      <div 
                        className={`w-full rounded-t transition-all duration-300 ${revenue > 0 ? 'bg-blue-500' : 'bg-gray-700 h-0.5'}`}
                        style={{ height: getHeightPercentage(revenue) }}
                      ></div>
                    </div>
                    <div className="text-center text-sm font-medium text-white">{formattedRevenue}</div>
                  </div>
                </div>
              );
            })()}
            
            {/* Days 4-16 */}
            {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(day => {
              const { revenue, formattedRevenue } = getRevenueForDay(day);
              return (
                <div key={day} className="flex flex-col h-[60px] rounded-md overflow-hidden border bg-gray-900 border-gray-800">
                  <div className="text-center py-1 text-sm font-medium bg-gray-800 text-gray-300">{day}</div>
                  <div className="flex-1 flex flex-col justify-end p-2 relative">
                    <div className="absolute inset-x-2 bottom-8 top-2 flex items-end">
                      <div 
                        className={`w-full rounded-t transition-all duration-300 ${revenue > 0 ? 'bg-blue-600' : 'bg-gray-700 h-0.5'}`}
                        style={{ height: getHeightPercentage(revenue) }}
                      ></div>
                    </div>
                    <div className="text-center text-sm font-medium text-white">{formattedRevenue}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
        <div>
          Total: ${totalRevenue.toLocaleString()}
        </div>
        <div>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}