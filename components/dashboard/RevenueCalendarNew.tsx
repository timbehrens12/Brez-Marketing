"use client"

import { useState, useEffect, useRef } from "react"
import { 
  format, 
  parseISO, 
  subDays, 
  isSameDay, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  getDay,
  addMonths,
  subMonths
} from "date-fns"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"

type TimeFrame = 'today' | 'weekly' | 'monthly' | 'yearly'

interface RevenueCalendarProps {
  brandId: string;
  isRefreshing?: boolean;
}

interface SalesData {
  date: string;
  revenue: number;
  id?: string;
}

interface DisplayItem {
  date: string;
  displayDate: string;
  revenue: number;
  count: number;
  isToday?: boolean;
  isCurrentMonth?: boolean;
}

export function RevenueCalendarNew({ brandId, isRefreshing = false }: RevenueCalendarProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('weekly');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Track component subscription status
  const isSubscribedRef = useRef(true);
  
  useEffect(() => {
    isSubscribedRef.current = true;
    return () => {
      isSubscribedRef.current = false;
    };
  }, []);

  // Fetch data from Supabase
  const fetchSalesData = async () => {
    if (!isSubscribedRef.current) return;
    setIsLoading(true);
    
    try {
      console.log('Revenue Calendar: Fetching sales data for brand:', brandId);
      
      // Get the date range based on the selected time frame
      const today = new Date();
      let startDate: Date;
      
      if (timeFrame === 'today') {
        startDate = today;
      } else if (timeFrame === 'weekly') {
        startDate = startOfWeek(today, { weekStartsOn: 1 }); // Start on Monday
      } else if (timeFrame === 'monthly') {
        startDate = startOfMonth(today);
      } else {
        // Yearly view - get the whole year
        startDate = new Date(today.getFullYear(), 0, 1);
      }
      
      const { data, error } = await supabase
        .from('shopify_orders')
        .select('id, created_at, total_price')
        .eq('brand_id', brandId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching sales data:', error);
        setError('Failed to load sales data. Please try again later.');
        setIsLoading(false);
        return;
      }
      
      // Process the data
      const processedData = data.map((order: any) => ({
        date: order.created_at,
        revenue: parseFloat(order.total_price),
        id: order.id
      }));
      
      setSalesData(processedData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error in fetchSalesData:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch data on component mount and when brandId or timeFrame changes
  useEffect(() => {
    fetchSalesData();
  }, [brandId, timeFrame]);
  
  // Add a new effect to trigger refresh when isRefreshing changes to true
  useEffect(() => {
    if (isRefreshing && brandId) {
      console.log('RevenueCalendarNew: Manual refresh triggered');
      fetchSalesData();
    }
  }, [isRefreshing, brandId]);

  // Listen for refresh events
  useEffect(() => {
    let cancelled = false;
    
    const handleRefresh = async () => {
      if (cancelled) return;
      console.log('[RevenueCalendarNew] Received refresh event, reloading data');
      await fetchSalesData();
    };
    
    // Listen for various refresh events
    window.addEventListener('force-shopify-refresh', handleRefresh);
    window.addEventListener('global-refresh-all', handleRefresh);
    window.addEventListener('refresh-all-widgets', handleRefresh);
    
    return () => {
      cancelled = true;
      window.removeEventListener('force-shopify-refresh', handleRefresh);
      window.removeEventListener('global-refresh-all', handleRefresh);
      window.removeEventListener('refresh-all-widgets', handleRefresh);
    };
  }, [brandId]);
  
  // Handle time frame change
  const handleTimeFrameChange = (value: TimeFrame) => {
    setTimeFrame(value);
  };
  
  // Generate display data based on the selected time frame
  const generateDisplayData = (): DisplayItem[] => {
    const today = new Date();
    
    if (timeFrame === 'weekly') {
      // Weekly view - 7 days
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Start on Monday
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayOrders = salesData.filter(sale => 
          sale.date.startsWith(dayStr)
        );
        
        const revenue = dayOrders.reduce((sum, order) => sum + order.revenue, 0);
        
        return {
          date: dayStr,
          displayDate: format(day, 'EEE'),
          revenue,
          count: dayOrders.length,
          isToday: isSameDay(day, today)
        };
      });
    } else if (timeFrame === 'monthly') {
      // Monthly view - days of the current month
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayOrders = salesData.filter(sale => 
          sale.date.startsWith(dayStr)
        );
        
        const revenue = dayOrders.reduce((sum, order) => sum + order.revenue, 0);
        
        return {
          date: dayStr,
          displayDate: format(day, 'd'),
          revenue,
          count: dayOrders.length,
          isToday: isSameDay(day, today)
        };
      });
    } else if (timeFrame === 'today') {
      // Today view - 24 hours
      const hours = Array.from({ length: 24 }, (_, i) => i);
      
      return hours.map(hour => {
        const displayHour = hour === 0 ? '12am' : 
                           hour < 12 ? `${hour}am` : 
                           hour === 12 ? '12pm' : 
                           `${hour - 12}pm`;
        
        // Filter orders for this hour
        const hourOrders = salesData.filter(sale => {
          const orderDate = parseISO(sale.date);
          return orderDate.getHours() === hour;
        });
        
        const revenue = hourOrders.reduce((sum, order) => sum + order.revenue, 0);
        
        return {
          date: `${format(today, 'yyyy-MM-dd')}T${hour.toString().padStart(2, '0')}:00:00`,
          displayDate: displayHour,
          revenue,
          count: hourOrders.length,
          isToday: new Date().getHours() === hour
        };
      });
    } else {
      // Yearly view - 12 months
      const months = Array.from({ length: 12 }, (_, i) => i);
      
      return months.map(month => {
        const monthDate = new Date(today.getFullYear(), month, 1);
        const monthStr = format(monthDate, 'yyyy-MM');
        
        // Filter orders for this month
        const monthOrders = salesData.filter(sale => 
          sale.date.startsWith(monthStr)
        );
        
        const revenue = monthOrders.reduce((sum, order) => sum + order.revenue, 0);
        
        return {
          date: monthStr,
          displayDate: format(monthDate, 'MMM'),
          revenue,
          count: monthOrders.length,
          isCurrentMonth: today.getMonth() === month
        };
      });
    }
    
    return [];
  };
  
  const displayData = generateDisplayData();
  
  // Get the maximum revenue for scaling
  const maxRevenue = Math.max(...displayData.map(item => item.revenue), 1);
  
  // Calculate total revenue
  const totalRevenue = displayData.reduce((sum, item) => sum + item.revenue, 0);
  
  // Get the title based on the selected time frame
  const getTitle = () => {
    const currentDate = new Date();
    
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
  
  // Render different layouts based on timeFrame
  const renderCalendarContent = () => {
    if (timeFrame === 'weekly') {
      // Weekly view - 7 days in a row
      return (
        <div className="grid grid-cols-7 gap-2 h-full" style={{backgroundColor: '#131722', color: '#d1d5db'}}>
          {displayData.map((item, index) => {
            const isToday = item.isToday;
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
              const isToday = item.isToday;
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
    } else if (timeFrame === 'today') {
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
                const isCurrentHour = item.isToday;
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
                const isCurrentHour = item.isToday;
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
    } else {
      // Yearly view - 12 months in a grid
      return (
        <div className="grid grid-cols-4 gap-2 h-full" style={{backgroundColor: '#131722', color: '#d1d5db'}}>
          {displayData.map((item, index) => {
            const isCurrentMonth = item.isCurrentMonth;
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
  
  return (
    <Card className="h-full" style={{backgroundColor: '#131722', borderColor: '#1f2937', color: '#d1d5db'}}>
      <div className="p-4 pb-2">
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold text-white">Revenue Calendar</div>
          <div className="flex space-x-1">
            <button
              className="text-xs h-7 px-3 rounded-md transition-all"
              style={{
                backgroundColor: timeFrame === 'today' ? '#1f2937' : 'transparent',
                color: timeFrame === 'today' ? 'white' : '#d1d5db',
                border: 'none'
              }}
              onClick={() => handleTimeFrameChange('today')}
            >
              Today
            </button>
            <button
              className="text-xs h-7 px-3 rounded-md transition-all"
              style={{
                backgroundColor: timeFrame === 'weekly' ? '#1f2937' : 'transparent',
                color: timeFrame === 'weekly' ? 'white' : '#d1d5db',
                border: 'none'
              }}
              onClick={() => handleTimeFrameChange('weekly')}
            >
              Week
            </button>
            <button
              className="text-xs h-7 px-3 rounded-md transition-all"
              style={{
                backgroundColor: timeFrame === 'monthly' ? '#1f2937' : 'transparent',
                color: timeFrame === 'monthly' ? 'white' : '#d1d5db',
                border: 'none'
              }}
              onClick={() => handleTimeFrameChange('monthly')}
            >
              Month
            </button>
            <button
              className="text-xs h-7 px-3 rounded-md transition-all"
              style={{
                backgroundColor: timeFrame === 'yearly' ? '#1f2937' : 'transparent',
                color: timeFrame === 'yearly' ? 'white' : '#d1d5db',
                border: 'none'
              }}
              onClick={() => handleTimeFrameChange('yearly')}
            >
              Year
            </button>
          </div>
        </div>
        <div className="text-sm font-medium text-gray-400" style={{color: '#9ca3af'}}>
          {getTitle()}
        </div>
      </div>
      
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
      
      <div className="p-2 border-t border-gray-800 text-sm font-medium flex justify-between items-center" style={{borderColor: '#1f2937', backgroundColor: '#131722'}}>
        <div className="text-gray-300 flex items-center" style={{color: '#d1d5db'}}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color: '#d1d5db'}}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Total Revenue: ${totalRevenue.toLocaleString()}
        </div>
        <div className="text-gray-400 flex items-center" style={{color: '#9ca3af'}}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color: '#9ca3af'}}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Last updated: {format(lastUpdated, 'h:mm a')}
        </div>
      </div>
    </Card>
  );
} 