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
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'
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
          // Get the user's timezone
          const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          
          // Parse the UTC date from the order
          const orderDate = parseISO(order.created_at);
          
          // Convert to the user's local timezone
          const zonedDate = toZonedTime(orderDate, userTimeZone);
          
          // Format directly in the target timezone
          const localTimeStr = formatInTimeZone(orderDate, userTimeZone, 'yyyy-MM-dd HH:mm:ss');
          const localHour = formatInTimeZone(orderDate, userTimeZone, 'HH');
          
          // Log detailed conversion information
          console.log(`Order conversion:
            - Original ISO: ${order.created_at}
            - Parsed UTC: ${format(orderDate, 'yyyy-MM-dd HH:mm:ss')}
            - Formatted in ${userTimeZone}: ${localTimeStr}
            - Hour in local time: ${localHour}
          `);
          
          return {
            date: order.created_at, // Keep the original ISO string
            zonedDate: zonedDate,   // Store the timezone-adjusted date
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
        localTimeStr: formatInTimeZone(today, userTimeZone, 'yyyy-MM-dd HH:mm:ss'),
        localHour: formatInTimeZone(today, userTimeZone, 'HH'),
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
        localTimeStr: formatInTimeZone(yesterday, userTimeZone, 'yyyy-MM-dd HH:mm:ss'),
        localHour: formatInTimeZone(yesterday, userTimeZone, 'HH'),
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
          const todayStr = formatInTimeZone(today, userTimeZone, 'yyyy-MM-dd');
          const saleDateStr = formatInTimeZone(saleDate, userTimeZone, 'yyyy-MM-dd');
          
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
          const localHour = formatInTimeZone(saleDate, userTimeZone, 'HH');
          const todayStr = formatInTimeZone(today, userTimeZone, 'yyyy-MM-dd');
          const saleDateStr = formatInTimeZone(saleDate, userTimeZone, 'yyyy-MM-dd');
          
          if (todayStr === saleDateStr) {
            key = localHour;
            console.log(`Fallback grouping to hour ${key} using formatInTimeZone:
              - Original date: ${sale.date}
              - Local time: ${formatInTimeZone(saleDate, userTimeZone, 'yyyy-MM-dd HH:mm:ss')}
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
        <div className="flex flex-col h-full" style={{backgroundColor: '#131722', color: '#d1d5db'}}>
          <div className="text-xs text-gray-400 mb-3" style={{color: '#9ca3af'}}>
            Sales by hour of the day (adjusted to your local timezone: {userTimeZone})
          </div>
          
          {/* AM Hours (12am-11am) */}
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-300 mb-2" style={{color: '#d1d5db'}}>AM</div>
            <div className="grid grid-cols-12 gap-2">
              {displayData.slice(0, 12).map((item, index) => {
                const isCurrentHour = (item as WeeklyOrMonthlyDisplayItem).isToday;
                const hasRevenue = item.revenue > 0;
                
                return (
                  <div 
                    key={index}
                    className="flex flex-col rounded-md overflow-hidden border border-gray-800 bg-[#131722] h-20"
                    style={{borderColor: '#1f2937', backgroundColor: '#131722'}}
                  >
                    <div className="text-center py-1 text-xs font-medium bg-[#1a1f2c] text-gray-300" style={{backgroundColor: '#1a1f2c', color: '#d1d5db'}}>
                      {item.displayDate}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-end p-2">
                      {hasRevenue ? (
                        <>
                          <div className="relative h-full w-full flex flex-col justify-end mb-1">
                            <div 
                              style={{ 
                                height: `${Math.max(5, Math.min(100, (item.revenue / maxRevenue) * 100))}%`,
                                backgroundColor: '#4b5563'
                              }}
                              className="w-full rounded-sm bg-gray-600"
                            ></div>
                          </div>
                          
                          <div className="text-center text-xs font-medium text-gray-300" style={{color: '#d1d5db'}}>
                            {renderRevenueValue(item.revenue)}
                          </div>
                          {item.count > 0 && (
                            <div className="text-center text-xs text-gray-500" style={{color: '#6b7280'}}>
                              {item.count} order{item.count !== 1 ? 's' : ''}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-600 text-xs" style={{color: '#4b5563'}}>
                          -
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* PM Hours (12pm-11pm) */}
          <div>
            <div className="text-xs font-medium text-gray-300 mb-2" style={{color: '#d1d5db'}}>PM</div>
            <div className="grid grid-cols-12 gap-2">
              {displayData.slice(12, 24).map((item, index) => {
                const isCurrentHour = (item as WeeklyOrMonthlyDisplayItem).isToday;
                const hasRevenue = item.revenue > 0;
                
                return (
                  <div 
                    key={index}
                    className="flex flex-col rounded-md overflow-hidden border border-gray-800 bg-[#131722] h-20"
                    style={{borderColor: '#1f2937', backgroundColor: '#131722'}}
                  >
                    <div className="text-center py-1 text-xs font-medium bg-[#1a1f2c] text-gray-300" style={{backgroundColor: '#1a1f2c', color: '#d1d5db'}}>
                      {item.displayDate}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-end p-2">
                      {hasRevenue ? (
                        <>
                          <div className="relative h-full w-full flex flex-col justify-end mb-1">
                            <div 
                              style={{ 
                                height: `${Math.max(5, Math.min(100, (item.revenue / maxRevenue) * 100))}%`,
                                backgroundColor: '#4b5563'
                              }}
                              className="w-full rounded-sm bg-gray-600"
                            ></div>
                          </div>
                          
                          <div className="text-center text-xs font-medium text-gray-300" style={{color: '#d1d5db'}}>
                            {renderRevenueValue(item.revenue)}
                          </div>
                          {item.count > 0 && (
                            <div className="text-center text-xs text-gray-500" style={{color: '#6b7280'}}>
                              {item.count} order{item.count !== 1 ? 's' : ''}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-600 text-xs" style={{color: '#4b5563'}}>
                          -
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    } else if (timeFrame === 'weekly') {
      // Weekly view - 7 days in a row
      return (
        <div className="grid grid-cols-7 gap-2 h-full" style={{backgroundColor: '#131722', color: '#d1d5db'}}>
          {displayData.map((item, index) => {
            const isToday = (item as WeeklyOrMonthlyDisplayItem).isToday;
            const hasRevenue = item.revenue > 0;
            
            return (
              <div 
                key={index}
                className="flex flex-col rounded-md overflow-hidden border border-gray-800 bg-[#131722] h-full"
                style={{borderColor: '#1f2937', backgroundColor: '#131722'}}
              >
                <div className="text-center py-1 text-xs font-medium bg-[#1a1f2c] text-gray-300" style={{backgroundColor: '#1a1f2c', color: '#d1d5db'}}>
                  {item.displayDate}
                </div>
                
                <div className="flex-1 p-2 flex flex-col">
                  <div className="flex-grow flex items-end">
                    {hasRevenue && (
                      <div 
                        className="w-full bg-gray-600 rounded-sm"
                        style={{ 
                          height: `${Math.max(5, Math.min(80, (item.revenue / maxRevenue) * 100))}%`,
                          backgroundColor: '#4b5563'
                        }}
                      ></div>
                    )}
                  </div>
                  
                  <div className="mt-2 text-center">
                    <div className="text-gray-300 text-sm font-medium" style={{color: '#d1d5db'}}>
                      {renderRevenueValue(item.revenue)}
                    </div>
                    {item.count > 0 && (
                      <div className="text-gray-500 text-xs" style={{color: '#6b7280'}}>
                        {item.count} order{item.count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    } else if (timeFrame === 'monthly') {
      // Monthly view - calendar grid
      const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      const today = new Date();
      const firstDayOfMonth = startOfMonth(today);
      const startDayOfWeek = getDay(firstDayOfMonth) || 7; // Convert Sunday (0) to 7 for easier calculation
      const startDayIndex = startDayOfWeek === 7 ? 0 : startDayOfWeek; // Adjust for Monday start (0)
      
      // Create array for empty cells before the first day of the month
      const emptyCells = Array.from({ length: startDayIndex }, (_, i) => ({ isEmpty: true, index: i }));
      
      return (
        <div className="h-full flex flex-col" style={{backgroundColor: '#131722', color: '#d1d5db'}}>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {daysOfWeek.map((day, index) => (
              <div key={index} className="text-center text-xs font-medium text-gray-400 py-0.5" style={{color: '#9ca3af'}}>
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 flex-1">
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
                  className="flex flex-col rounded-md overflow-hidden min-h-[40px] border border-gray-800 bg-[#131722]"
                  style={{borderColor: '#1f2937', backgroundColor: '#131722'}}
                >
                  <div className="text-center py-0.5 text-xs font-medium bg-[#1a1f2c] text-gray-300" style={{backgroundColor: '#1a1f2c', color: '#d1d5db'}}>
                    {day}
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center p-0.5">
                    {hasRevenue ? (
                      <div className="text-center text-xs font-medium text-gray-300" style={{color: '#d1d5db'}}>
                        {renderRevenueValue(item.revenue)}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-600 text-xs" style={{color: '#4b5563'}}>
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
        <div className="grid grid-cols-4 gap-2 h-full" style={{backgroundColor: '#131722', color: '#d1d5db'}}>
          {displayData.map((item, index) => {
            const isCurrentMonth = (item as YearlyDisplayItem).isCurrentMonth;
            const hasRevenue = item.revenue > 0;
            
            return (
              <div 
                key={index}
                className="flex flex-col rounded-md overflow-hidden border border-gray-800 bg-[#131722] h-full"
                style={{borderColor: '#1f2937', backgroundColor: '#131722'}}
              >
                <div className="text-center py-1 text-sm font-medium bg-[#1a1f2c] text-gray-300" style={{backgroundColor: '#1a1f2c', color: '#d1d5db'}}>
                  {item.displayDate}
                </div>
                
                <div className="flex-1 p-2 flex flex-col">
                  <div className="flex-grow flex items-end">
                    {hasRevenue && (
                      <div 
                        className="w-full bg-gray-600 rounded-sm"
                        style={{ 
                          height: `${Math.max(5, Math.min(80, (item.revenue / maxRevenue) * 100))}%`,
                          backgroundColor: '#4b5563'
                        }}
                      ></div>
                    )}
                  </div>
                  
                  <div className="mt-2 text-center">
                    <div className="text-gray-300 text-sm font-medium" style={{color: '#d1d5db'}}>
                      {renderRevenueValue(item.revenue)}
                    </div>
                    {item.count > 0 && (
                      <div className="text-gray-500 text-xs" style={{color: '#6b7280'}}>
                        {item.count} order{item.count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
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
        <div className="animate-pulse bg-gray-700 h-4 w-12 rounded mx-auto" style={{backgroundColor: '#374151'}}></div>
      );
    }
    
    return revenue > 0 
      ? (revenue >= 1000 
          ? `$${(revenue / 1000).toFixed(1)}k` 
          : `$${revenue.toFixed(0)}`)
      : "-";
  };
  
  return (
    <Card className="h-full bg-[#131722] border-gray-800" style={{backgroundColor: '#131722', borderColor: '#1f2937'}}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-white">Revenue Calendar</CardTitle>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs h-7 px-3 rounded-md transition-all",
                timeFrame === 'today' 
                  ? "bg-gray-800 text-white hover:bg-gray-800" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
              style={{
                backgroundColor: timeFrame === 'today' ? '#1f2937' : 'transparent',
                color: timeFrame === 'today' ? 'white' : '#d1d5db',
                border: 'none'
              }}
              onClick={() => handleTimeFrameChange('today')}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs h-7 px-3 rounded-md transition-all",
                timeFrame === 'weekly' 
                  ? "bg-gray-800 text-white hover:bg-gray-800" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
              style={{
                backgroundColor: timeFrame === 'weekly' ? '#1f2937' : 'transparent',
                color: timeFrame === 'weekly' ? 'white' : '#d1d5db',
                border: 'none'
              }}
              onClick={() => handleTimeFrameChange('weekly')}
            >
              Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs h-7 px-3 rounded-md transition-all",
                timeFrame === 'monthly' 
                  ? "bg-gray-800 text-white hover:bg-gray-800" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
              style={{
                backgroundColor: timeFrame === 'monthly' ? '#1f2937' : 'transparent',
                color: timeFrame === 'monthly' ? 'white' : '#d1d5db',
                border: 'none'
              }}
              onClick={() => handleTimeFrameChange('monthly')}
            >
              Month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs h-7 px-3 rounded-md transition-all",
                timeFrame === 'yearly' 
                  ? "bg-gray-800 text-white hover:bg-gray-800" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
              style={{
                backgroundColor: timeFrame === 'yearly' ? '#1f2937' : 'transparent',
                color: timeFrame === 'yearly' ? 'white' : '#d1d5db',
                border: 'none'
              }}
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
      
      <div className="flex-1 px-3 pb-3 pt-2 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-500 mb-2" style={{borderColor: '#6b7280'}}></div>
              <div className="text-gray-400 text-sm">Loading sales data...</div>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center text-center max-w-md">
              <div className="bg-gray-800 p-2 rounded-full mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-gray-300 font-medium mb-1">Error Loading Data</div>
              <div className="text-gray-400 text-sm">{error}</div>
            </div>
          </div>
        ) : (
          renderCalendarContent()
        )}
      </div>
      
      <div className="p-2 border-t border-gray-800 bg-[#131722] text-sm font-medium flex justify-between items-center" style={{borderColor: '#1f2937', backgroundColor: '#131722'}}>
        <div className="text-gray-300 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color: '#d1d5db'}}>
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