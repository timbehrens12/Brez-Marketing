"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { format, parseISO, subDays, isSameDay, subYears, addYears } from "date-fns"
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
      const processedData = orders.map((order: { created_at: string; total_price: string; id: string }) => ({
        date: order.created_at,
        revenue: parseFloat(order.total_price || '0'),
        id: order.id
      }));
      
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
  
  // Group sales data by time frame
  const groupedSalesData = salesData.reduce((acc, sale) => {
    if (!sale.date) return acc;
    
    try {
      const saleDate = parseISO(sale.date);
      let key = '';
      
      // Group by different time frames
      if (timeFrame === 'daily') {
        key = format(saleDate, 'yyyy-MM-dd');
      } else if (timeFrame === 'weekly') {
        // Get the week number and year
        const weekNumber = Math.ceil(saleDate.getDate() / 7);
        key = `${format(saleDate, 'yyyy-MM')}-W${weekNumber}`;
      } else if (timeFrame === 'monthly') {
        key = format(saleDate, 'yyyy-MM');
      } else if (timeFrame === 'yearly') {
        key = format(saleDate, 'yyyy');
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
  
  // Convert grouped data to array and sort
  const displayData = Object.values(groupedSalesData).sort((a, b) => {
    return a.date.localeCompare(b.date);
  });
  
  // Get the current month and year for the title
  const currentDate = new Date();
  const currentMonthYear = format(currentDate, 'MMMM yyyy');
  
  // Format the display label based on time frame
  const formatDisplayLabel = (dateStr: string): string => {
    try {
      if (timeFrame === 'daily') {
        const date = parseISO(dateStr);
        return format(date, 'd');
      } else if (timeFrame === 'weekly') {
        // Extract week number from our custom format
        const weekMatch = dateStr.match(/-W(\d+)$/);
        return weekMatch ? `Week ${weekMatch[1]}` : dateStr;
      } else if (timeFrame === 'monthly') {
        const date = parseISO(`${dateStr}-01`);
        return format(date, 'MMM yyyy');
      } else {
        return dateStr;
      }
    } catch (error) {
      return dateStr;
    }
  };
  
  // Get the maximum revenue for scaling
  const maxRevenue = Math.max(...displayData.map(item => item.revenue), 1);
  
  // Calculate total revenue
  const totalRevenue = displayData.reduce((sum, item) => sum + item.revenue, 0);
  
  // Get the last 7 items based on time frame
  const getDisplayItems = () => {
    // For monthly view, show the last 12 months
    if (timeFrame === 'monthly') {
      return displayData.slice(-12);
    }
    // For yearly view, show all years
    if (timeFrame === 'yearly') {
      return displayData;
    }
    // For daily and weekly, show the last 7
    return displayData.slice(-7);
  };
  
  const itemsToDisplay = getDisplayItems();
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Revenue Calendar</h3>
        <div className="flex gap-2">
          <Select value={timeFrame} onValueChange={(value: TimeFrame) => setTimeFrame(value)}>
            <SelectTrigger className="w-[120px] bg-gray-900 border-gray-700">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="text-lg font-medium text-white mb-2">
        {currentMonthYear}
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse w-full">
            <div className="h-[200px] bg-gray-800 rounded-md"></div>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">{error}</div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
          {itemsToDisplay.map((item) => {
            // Calculate the height percentage based on revenue
            const heightPercentage = item.revenue > 0 
              ? Math.max(5, Math.min(100, (item.revenue / maxRevenue) * 100)) 
              : 0;
              
            // Format the revenue display
            const formattedRevenue = item.revenue > 0 
              ? item.revenue >= 1000
                ? `$${(item.revenue/1000).toFixed(1)}k`
                : `$${item.revenue.toFixed(0)}`
              : '$0';
              
            // Check if this is the current period
            const isCurrentPeriod = timeFrame === 'daily' 
              ? item.date === format(new Date(), 'yyyy-MM-dd')
              : timeFrame === 'monthly'
                ? item.date === format(new Date(), 'yyyy-MM')
                : false;

            return (
              <div
                key={item.date}
                className={cn(
                  "flex flex-col h-[120px] rounded-md overflow-hidden border",
                  isCurrentPeriod 
                    ? "bg-blue-900/20 border-blue-700" 
                    : "bg-gray-900 border-gray-800"
                )}
              >
                <div className={cn(
                  "text-center py-1 text-sm font-medium",
                  isCurrentPeriod ? "bg-blue-900/50 text-blue-100" : "bg-gray-800 text-gray-300"
                )}>
                  {formatDisplayLabel(item.date)}
                </div>
                
                <div className="flex-1 flex flex-col justify-end p-2 relative">
                  <div className="absolute inset-x-2 bottom-8 top-2 flex items-end">
                    <div
                      className={cn(
                        "w-full rounded-t transition-all duration-300",
                        item.revenue > 0 
                          ? isCurrentPeriod 
                            ? "bg-blue-500" 
                            : "bg-blue-600"
                          : "bg-gray-700 h-0.5"
                      )}
                      style={{
                        height: heightPercentage > 0 ? `${heightPercentage}%` : '2px'
                      }}
                    />
                  </div>
                  <div className="text-center text-sm font-medium text-white">
                    {formattedRevenue}
                  </div>
                </div>
              </div>
            );
          })}
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