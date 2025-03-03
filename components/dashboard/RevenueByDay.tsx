"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { useMemo, useState, useEffect, useRef } from 'react'
import { 
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
  subDays,
  isValid,
  parse,
  setHours,
  getDaysInMonth,
  getMonth,
  getYear,
  getWeek,
  getWeeksInMonth,
  eachWeekOfInterval,
  getHours,
  getDate,
  getDay,
  endOfDay
} from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

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
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('weekly');
  const [salesData, setSalesData] = useState<Array<{
    date: string; 
    revenue: number; 
    isTimezoneShifted?: boolean;
    forceShowOnFirst?: boolean;
    id?: string;
  }>>(initialData || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to track displayed sale IDs across renders
  const displayedSaleIdsRef = useRef(new Set<string>());
  
  // Helper function to check if an error is related to database updates
  const isDatabaseUpdateError = (errorMessage: string): boolean => {
    return errorMessage.includes('Database update in progress') || 
           errorMessage.includes('Database schema has changed') || 
           errorMessage.includes('database schema') || 
           errorMessage.includes('does not exist');
  };
  
  // Clear the displayed sales IDs when the sales data changes
  useEffect(() => {
    displayedSaleIdsRef.current.clear();
  }, [salesData]);
  
  // Log initial data on mount
  useEffect(() => {
    console.log('Revenue Calendar: Component mounted with initial data:', {
      initialDataProvided: !!initialData,
      initialDataLength: initialData?.length || 0,
      initialDataSample: initialData?.slice(0, 3) || [],
      brandId
    });
    
    // Check if initial data is valid
    if (initialData) {
      const isValid = Array.isArray(initialData) && initialData.every(item => 
        item && typeof item === 'object' && 'date' in item && 'revenue' in item
      );
      
      console.log('Revenue Calendar: Initial data is valid:', isValid);
      
      if (!isValid) {
        console.error('Revenue Calendar: Invalid initial data format:', initialData);
      } else if (initialData.length > 0) {
        // If we have valid initial data, use it right away
        console.log('Revenue Calendar: Using initial data on mount');
        setSalesData(initialData);
      }
    }
  }, [initialData, brandId]);
  
  // Define fetchSalesData outside of useEffect so it can be called from the retry button
  const fetchSalesData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // IMPORTANT: Always use a very wide date range to ensure we get ALL sales data
      // regardless of what date range is selected in the date picker
      // This ensures the revenue calendar always shows all data
      const endDate = new Date(new Date().getFullYear() + 2, 0, 1).toISOString().split('T')[0]; // 2 years in the future
      const startDate = new Date(new Date().getFullYear() - 5, 0, 1).toISOString().split('T')[0]; // 5 years ago
      
      console.log('Revenue Calendar: Fetching ALL sales data', { startDate, endDate, brandId });
      
      const response = await fetch(`/api/shopify/sales?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Revenue Calendar: API error (${response.status}):`, errorText);
        
        // Check if this is a database schema error
        if (errorText.includes('relation "public.shopify_data" does not exist') || 
            errorText.includes('Database schema has changed')) {
          console.log('Revenue Calendar: Database schema error detected');
          
          // If we have initial data, use it and don't show an error
          if (initialData && initialData.length > 0) {
            console.log('Revenue Calendar: Using initial data for database schema error');
            setSalesData(initialData);
            setError(null);
          } else {
            // No data available, set empty array
            setSalesData([]);
            setError('Database update in progress.');
          }
          setIsLoading(false);
          return;
        }
        
        throw new Error(errorText);
      }
      
      const result = await response.json();
      
      if (!result.sales) {
        console.error('Revenue Calendar: No sales array in response', result);
        setSalesData([]);
        setError('No sales data available.');
        setIsLoading(false);
        return;
      }
      
      if (result.sales.length === 0) {
        console.warn('Revenue Calendar: Empty sales array returned');
        
        // Check if this is a database schema error
        if (result.message && result.message.includes('Database schema has changed')) {
          console.log('Revenue Calendar: Database schema error detected in message');
          
          // If we have initial data, use it and don't show an error
          if (initialData && initialData.length > 0) {
            console.log('Revenue Calendar: Using initial data for database schema error');
            setSalesData(initialData);
            setError(null);
          } else {
            // No data available, set empty array
            setSalesData([]);
            setError('Database update in progress.');
          }
          setIsLoading(false);
          return;
        }
        
        setSalesData([]);
        setError('No sales data available.');
        setIsLoading(false);
        return;
      }
      
      // Transform the sales data
      const transformedData = result.sales.map((sale: any) => {
        const rawDate = sale.created_at;
        const saleAmount = parseFloat(sale.total_price || '0');
        
        return {
          date: rawDate,
          revenue: saleAmount,
          id: sale.id
        };
      });
      
      console.log('Revenue Calendar: Fetch successful, updating data');
      setSalesData(transformedData);
      setError(null);
      
    } catch (error) {
      console.error('Revenue Calendar: Error fetching sales data:', error);
      
      // If we have initial data, use it and don't show an error
      if (initialData && initialData.length > 0) {
        console.log('Revenue Calendar: Using initial data after fetch error');
        setSalesData(initialData);
        setError(null);
      } else {
        // No data available, set empty array
        setSalesData([]);
        setError('Error loading sales data.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch sales data directly from the API
  useEffect(() => {
    console.log('Revenue Calendar: useEffect triggered', { 
      initialDataLength: initialData?.length || 0,
      brandId
    });
    
    // Always use initial data if provided, regardless of whether we fetch or not
    if (initialData && initialData.length > 0) {
      console.log('Revenue Calendar: Using provided initial data in useEffect');
      setSalesData(initialData);
      
      // If we want to refresh in the background, we can still fetch but not show loading state
      if (brandId) {
        const quietFetch = async () => {
          try {
            // IMPORTANT: Always use a very wide date range to ensure we get ALL sales data
            // regardless of what date range is selected in the date picker
            // This ensures the revenue calendar always shows all data
            const endDate = new Date(new Date().getFullYear() + 2, 0, 1).toISOString().split('T')[0]; // 2 years in the future
            const startDate = new Date(new Date().getFullYear() - 5, 0, 1).toISOString().split('T')[0]; // 5 years ago
            
            console.log('Revenue Calendar: Quiet background fetch for ALL sales data', { startDate, endDate, brandId });
            
            const response = await fetch(`/api/shopify/sales?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}`);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Revenue Calendar: Background fetch API error (${response.status}):`, errorText);
              
              // Don't update state or show error for background fetches with errors
              // This ensures we keep showing whatever data we already have
              console.log('Revenue Calendar: Background fetch error, keeping existing data');
              return;
            }
            
            const result = await response.json();
            
            if (!result.sales) {
              console.error('Revenue Calendar: No sales array in background fetch response', result);
              // Keep existing data
              console.log('Revenue Calendar: No sales array in response, keeping existing data');
              return;
            }
            
            if (result.sales.length === 0) {
              console.warn('Revenue Calendar: Empty sales array returned in background fetch');
              
              // Check if this is a database schema error
              if (result.message && result.message.includes('Database schema has changed')) {
                console.log('Revenue Calendar: Database schema error detected in background fetch message');
                // Keep existing data
                console.log('Revenue Calendar: Database schema error, keeping existing data');
                return;
              }
              
              // CRITICAL: If we have existing data, don't overwrite it with empty data
              if (Array.isArray(salesData) && salesData.length > 0) {
                console.log('Revenue Calendar: Empty sales array but we have existing data, keeping it');
                return;
              }
              
              // Only set empty array if we don't already have data
              console.log('Revenue Calendar: Empty sales array and no existing data');
              return;
            }
            
            // Transform the sales data
            const transformedData = result.sales.map((sale: any) => {
              const rawDate = sale.created_at;
              const saleAmount = parseFloat(sale.total_price || '0');
              
              return {
                date: rawDate,
                revenue: saleAmount,
                id: sale.id
              };
            });
            
            // Only update if we got valid data AND it's different from what we have
            if (transformedData.length > 0) {
              console.log('Revenue Calendar: Background fetch successful, updating data');
              setSalesData(transformedData);
              setError(null);
            } else {
              console.log('Revenue Calendar: Background fetch returned no valid data, keeping existing data');
            }
            
          } catch (error) {
            console.error('Revenue Calendar: Error in background fetch:', error);
            // Don't update state or show error for background fetches
            console.log('Revenue Calendar: Background fetch exception, keeping existing data');
          }
        };
        
        quietFetch();
      }
    } else if (brandId) {
      // No initial data, need to fetch
      fetchSalesData();
    }
  }, [brandId, initialData]);
  
  // Get hours of the day (12am to 11pm)
  const hoursOfDay = useMemo(() => {
    const today = new Date()
    // Set to start of today
    const startOfToday = startOfDay(today)
    
    return Array.from({ length: 24 }, (_, i) => {
      const hour = setHours(startOfToday, i)
      return {
        date: hour,
        dayName: format(hour, "ha").toLowerCase(), // Format as 12am, 1am, etc.
        dayNumber: i.toString(),
        formattedDate: format(hour, "yyyy-MM-dd HH:00")
      }
    })
  }, [])
  
  // Get days to display based on timeFrame
  const daysToDisplay = useMemo(() => {
    const now = new Date();
    const days = [];

    switch (timeFrame) {
      case 'yearly': {
        // Get all months of the current year
        const yearStart = startOfYear(now);
        for (let month = 0; month < 12; month++) {
          const date = addMonths(yearStart, month);
          days.push({
            date,
            dayName: format(date, 'MMM'),
            dayNumber: format(date, 'M'),
            formattedDate: format(date, 'yyyy-MM'),
            isToday: isSameMonth(date, now)
          });
        }
        break;
      }

      case 'monthly': {
        // Get all days of the current month
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        let currentDay = monthStart;
        while (currentDay <= monthEnd) {
          days.push({
            date: currentDay,
            dayName: format(currentDay, 'EEE'),
            dayNumber: format(currentDay, 'd'),
            formattedDate: format(currentDay, 'yyyy-MM-dd'),
            isToday: isSameDay(currentDay, now)
          });
          currentDay = addDays(currentDay, 1);
        }
        break;
      }

      default: {
        // Weekly view - show last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = subDays(now, i);
          days.push({
            date,
            dayName: format(date, 'EEE'),
            dayNumber: format(date, 'd'),
            formattedDate: format(date, 'yyyy-MM-dd'),
            isToday: isSameDay(date, now)
          });
        }
      }
    }

    return days;
  }, [timeFrame]);

  // Process sales data for display
  const displayData = useMemo(() => {
    if (!salesData || !Array.isArray(salesData)) {
      return [];
    }

    return daysToDisplay.map(day => {
      const dayRevenue = salesData
        .filter(sale => {
          if (!sale || !sale.date) return false;
          
          // Parse the sale date and the day we're checking
          const saleDate = parseISO(sale.date);
          const checkDate = day.date;
          
          if (timeFrame === 'yearly') {
            // For yearly view, match year and month
            return format(saleDate, 'yyyy-MM') === format(checkDate, 'yyyy-MM');
          } else {
            // For other views, match exact date but ignore time
            return format(saleDate, 'yyyy-MM-dd') === format(checkDate, 'yyyy-MM-dd');
          }
        })
        .reduce((sum, sale) => sum + (sale.revenue || 0), 0);

      return {
        ...day,
        revenue: dayRevenue
      };
    });
  }, [salesData, daysToDisplay, timeFrame]);

  // Find the maximum revenue for scaling
  const maxRevenue = useMemo(() => {
    if (!displayData || !Array.isArray(displayData) || displayData.length === 0) {
      return 1; // Default value if displayData is invalid
    }
    const revenues = displayData.map(day => day?.revenue || 0);
    return Math.max(...revenues, 1); // Ensure we don't divide by zero
  }, [displayData]);

  // Calculate total revenue for the current timeframe
  const totalRevenue = useMemo(() => {
    if (!displayData || !Array.isArray(displayData)) {
      return 0;
    }
    return displayData.reduce((sum, day) => sum + (day?.revenue || 0), 0);
  }, [displayData]);

  // Format the total revenue for display
  const formattedTotalRevenue = useMemo(() => {
    if (totalRevenue >= 1000000) {
      return `$${(totalRevenue / 1000000).toFixed(2)}M`;
    } else if (totalRevenue >= 1000) {
      return `$${(totalRevenue / 1000).toFixed(2)}K`;
    } else {
      return `$${totalRevenue.toFixed(2)}`;
    }
  }, [totalRevenue]);

  // Get the title based on the selected time frame
  const getTitle = () => {
    switch (timeFrame) {
      case 'daily':
        return 'Last 7 Days';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return `${format(new Date(), 'MMMM yyyy')}`;
      case 'yearly':
        return `${format(new Date(), 'yyyy')} by Month`;
      default:
        return 'Revenue Calendar';
    }
  }

  // Fetch data on mount
  useEffect(() => {
    if (brandId) {
      fetchSalesData();
    }
  }, [brandId]);

  // Clear the displayed sales IDs when the sales data changes
  useEffect(() => {
    displayedSaleIdsRef.current.clear();
    console.log('Revenue Calendar: Cleared displayed sale IDs');
  }, [salesData]);

  // Modify the useEffect for error handling
  useEffect(() => {
    if (error) {
      // If we have initial data, use it
      if (initialData && Array.isArray(initialData) && initialData.length > 0) {
        setSalesData(initialData);
        setError(null);
      } else {
        // No data available, set empty array
        setSalesData([]);
        setError('No sales data available.');
      }
    }
  }, [error, initialData]);

  // Modify the useEffect for initial data
  useEffect(() => {
    if (!isLoading && initialData && Array.isArray(initialData) && initialData.length > 0) {
      console.log('Setting initial data:', initialData.length, 'records');
      setSalesData(initialData);
      setError(null);
    }
  }, [initialData, isLoading]);

  // Debug log for component state
  useEffect(() => {
    console.log('Revenue Calendar: Component state updated:', {
      brandId,
      initialDataLength: initialData?.length || 0,
      salesDataLength: Array.isArray(salesData) ? salesData.length : 0,
      isUsingInitialData: initialData && Array.isArray(initialData) && Array.isArray(salesData) && salesData === initialData,
      timeFrame,
      isLoading,
      error,
      hasError: !!error
    });
  }, [brandId, initialData, salesData, timeFrame, isLoading, error]);

  // Modify the quiet fetch to prevent overwriting valid data
  const quietFetch = async () => {
    try {
      // IMPORTANT: Always use a very wide date range to ensure we get ALL sales data
      // regardless of what date range is selected in the date picker
      // This ensures the revenue calendar always shows all data
      const endDate = new Date(new Date().getFullYear() + 2, 0, 1).toISOString().split('T')[0]; // 2 years in the future
      const startDate = new Date(new Date().getFullYear() - 5, 0, 1).toISOString().split('T')[0]; // 5 years ago
      
      console.log('Revenue Calendar: Quiet background fetch for ALL sales data', { startDate, endDate, brandId });
      
      const response = await fetch(`/api/shopify/sales?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Revenue Calendar: Background fetch API error (${response.status}):`, errorText);
        
        // Don't update state or show error for background fetches with errors
        // This ensures we keep showing whatever data we already have
        console.log('Revenue Calendar: Background fetch error, keeping existing data');
        return;
      }
      
      const result = await response.json();
      
      if (!result.sales) {
        console.error('Revenue Calendar: No sales array in background fetch response', result);
        // Keep existing data
        console.log('Revenue Calendar: No sales array in response, keeping existing data');
        return;
      }
      
      if (result.sales.length === 0) {
        console.warn('Revenue Calendar: Empty sales array returned in background fetch');
        
        // Check if this is a database schema error
        if (result.message && result.message.includes('Database schema has changed')) {
          console.log('Revenue Calendar: Database schema error detected in background fetch message');
          // Keep existing data
          console.log('Revenue Calendar: Database schema error, keeping existing data');
          return;
        }
        
        // CRITICAL: If we have existing data, don't overwrite it with empty data
        if (Array.isArray(salesData) && salesData.length > 0) {
          console.log('Revenue Calendar: Empty sales array but we have existing data, keeping it');
          return;
        }
        
        // Only set empty array if we don't already have data
        console.log('Revenue Calendar: Empty sales array and no existing data');
        return;
      }
      
      // Transform the sales data
      const transformedData = result.sales.map((sale: any) => {
        const rawDate = sale.created_at;
        const saleAmount = parseFloat(sale.total_price || '0');
        
        return {
          date: rawDate,
          revenue: saleAmount,
          id: sale.id
        };
      });
      
      // Only update if we got valid data AND it's different from what we have
      if (transformedData.length > 0) {
        console.log('Revenue Calendar: Background fetch successful, updating data');
        setSalesData(transformedData);
        setError(null);
      } else {
        console.log('Revenue Calendar: Background fetch returned no valid data, keeping existing data');
      }
      
    } catch (error) {
      console.error('Revenue Calendar: Error in background fetch:', error);
      // Don't update state or show error for background fetches
      console.log('Revenue Calendar: Background fetch exception, keeping existing data');
    }
  };
  
  // Set up the refresh interval with proper cleanup
  useEffect(() => {
    let isSubscribed = true;

    const fetchData = async () => {
      if (!isSubscribed) return;
      await fetchSalesData();
    };

    const quietFetchData = async () => {
      if (!isSubscribed) return;
      await quietFetch();
    };

    // Initial fetch
    if (brandId) {
      fetchData();
    }

    // Set up interval for quiet fetches
    const intervalId = setInterval(quietFetchData, 30000); // Every 30 seconds

    // Cleanup function
    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [brandId]);

  // Handle initial data
  useEffect(() => {
    if (initialData && Array.isArray(initialData) && initialData.length > 0 && !isLoading) {
      console.log('Setting initial data:', initialData.length, 'records');
      setSalesData(initialData);
      setError(null);
    }
  }, [initialData, isLoading]);

  return (
    <div className="w-full">
      {error && (
        <div className="text-sm text-gray-400 mb-4">
          {error}
        </div>
      )}
      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-[200px] bg-gray-800 rounded"></div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{getTitle()}</h3>
            <div className="flex gap-2">
              <Select value={timeFrame} onValueChange={(value: TimeFrame) => setTimeFrame(value)}>
                <SelectTrigger className="w-[120px]">
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

          <div className="grid grid-cols-7 gap-2">
            {daysToDisplay.map((day, index) => {
              const dayData = displayData.find(d => d.formattedDate === day.formattedDate) || {
                ...day,
                revenue: 0
              };

              return (
                <div
                  key={day.formattedDate}
                  className={cn(
                    "flex flex-col items-center p-2 rounded border border-gray-800",
                    day.isToday && "bg-blue-950 border-blue-800"
                  )}
                >
                  <div className="text-xs text-gray-400">
                    {timeFrame !== 'yearly' && day.dayName}
                  </div>
                  <div className="text-sm font-medium">
                    {timeFrame !== 'yearly' && day.dayNumber}
                  </div>
                  <div className="w-full mt-2">
                    <div className="relative h-24">
                      <div
                        className={cn(
                          "absolute bottom-0 w-full",
                          dayData.revenue > 0 ? "bg-blue-500" : "bg-gray-700"
                        )}
                        style={{
                          height: dayData.revenue > 0 ? `${(dayData.revenue / maxRevenue) * 100}%` : '2px'
                        }}
                        title={`$${dayData.revenue.toFixed(2)}`}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      ${dayData.revenue > 999 ? (dayData.revenue/1000).toFixed(1) + 'k' : dayData.revenue.toFixed(0)}
                    </div>
                    {timeFrame === 'yearly' && (
                      <div className="text-xs text-gray-400 mt-1">{day.dayName}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  )
}

