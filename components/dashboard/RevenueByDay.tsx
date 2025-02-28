"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { useMemo, useState, useEffect } from 'react'
import { 
  startOfWeek, 
  addDays, 
  format, 
  isSameDay, 
  parseISO, 
  isValid, 
  startOfMonth, 
  getDaysInMonth, 
  getMonth, 
  getYear,
  getWeek,
  getWeeksInMonth,
  endOfMonth,
  startOfDay,
  eachWeekOfInterval,
  getHours,
  setHours,
  getDate,
  getDay,
  parse,
  endOfDay,
  subDays
} from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface RevenueByDayProps {
  data?: Array<{
    date: string;
    revenue: number;
  }>;
  brandId: string;
}

export function RevenueByDay({ data: initialData, brandId }: RevenueByDayProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('weekly');
  const [salesData, setSalesData] = useState<Array<{date: string; revenue: number}>>(initialData || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
    if (!brandId) {
      console.error('Revenue Calendar: No brandId provided');
      setError('No brand ID provided');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get data for the last 90 days by default
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = subDays(new Date(), 90).toISOString().split('T')[0];
      
      console.log('Revenue Calendar: Fetching sales data directly', { startDate, endDate, brandId });
      console.log('Revenue Calendar: Initial data available:', initialData?.length || 0, 'records');
      
      const response = await fetch(`/api/shopify/sales?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Revenue Calendar: API error (${response.status}):`, errorText);
        
        // Check if this is a database schema error
        if (errorText.includes('relation "public.shopify_data" does not exist') || 
            errorText.includes('Database schema has changed')) {
          console.log('Revenue Calendar: Database schema error detected in API response');
          
          // If we have initial data, use it and don't show an error
          if (initialData && initialData.length > 0) {
            console.log('Revenue Calendar: Using initial data for database schema error');
            setSalesData(initialData);
            setIsLoading(false);
            return;
          }
        }
        
        throw new Error(`Failed to fetch sales data: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      console.log('Revenue Calendar: API response:', result);
      
      if (!result.sales) {
        console.error('Revenue Calendar: No sales array in response', result);
        throw new Error('No sales data returned');
      }
      
      console.log(`Revenue Calendar: Fetched ${result.sales.length} sales records directly`);
      
      if (result.sales.length === 0) {
        console.warn('Revenue Calendar: Empty sales array returned');
        // Use the message from the API if available
        if (result.message) {
          console.log('Revenue Calendar: API message:', result.message);
          setError(result.message);
        } else {
          setError('No sales data found for the selected period');
        }
        
        // If we have initial data, use that instead of empty array
        if (initialData && initialData.length > 0) {
          console.log('Revenue Calendar: Using provided initial data instead of empty sales array');
          setSalesData(initialData);
          setError(null); // Clear error when using initial data
        } else {
          setSalesData([]);
        }
        
        setIsLoading(false);
        return;
      }
      
      // Transform the sales data into the format we need
      const transformedData = result.sales.map((sale: any) => ({
        date: sale.created_at,
        revenue: parseFloat(sale.total_price || '0')
      }));
      
      console.log('Revenue Calendar: Transformed data sample:', transformedData.slice(0, 3));
      
      setSalesData(transformedData);
    } catch (error) {
      console.error('Revenue Calendar: Error fetching sales data:', error);
      
      // Check for database schema error specifically
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sales data';
      setError(errorMessage);
      
      // If we have initial data, use that as a fallback
      if (initialData && initialData.length > 0) {
        console.log('Revenue Calendar: Using provided initial data as fallback after error');
        setSalesData(initialData);
        
        // If it's a database schema error, don't show the error to the user
        if (errorMessage.includes('Database schema has changed') || 
            errorMessage.includes('does not exist') ||
            errorMessage.includes('relation "public.shopify_data" does not exist')) {
          console.log('Revenue Calendar: Database schema error detected, using initial data silently');
          setError(null);
        }
      } else {
        // Clear any existing data
        setSalesData([]);
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
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = subDays(new Date(), 90).toISOString().split('T')[0];
            
            console.log('Revenue Calendar: Quiet background fetch', { startDate, endDate, brandId });
            
            const response = await fetch(`/api/shopify/sales?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}`);
            
            if (!response.ok) {
              console.error(`Revenue Calendar: Background API error (${response.status})`);
              return; // Keep using initial data
            }
            
            const result = await response.json();
            
            if (!result.sales || result.sales.length === 0) {
              console.log('Revenue Calendar: No sales data from background fetch, keeping initial data');
              return; // Keep using initial data
            }
            
            // Only update if we got valid data
            const transformedData = result.sales.map((sale: any) => ({
              date: sale.created_at,
              revenue: parseFloat(sale.total_price || '0')
            }));
            
            console.log('Revenue Calendar: Background fetch successful, updating data');
            setSalesData(transformedData);
            setError(null);
          } catch (error) {
            console.error('Revenue Calendar: Background fetch error:', error);
            // Keep using initial data, don't update error state
          }
        };
        
        quietFetch();
      }
    } else {
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
  
  // Get the current week's days (Monday-Sunday)
  const weekDays = useMemo(() => {
    const today = new Date()
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }) // 1 represents Monday
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(startOfCurrentWeek, i)
      return {
        date,
        dayName: format(date, "EEE"),
        dayNumber: format(date, "d"),
        formattedDate: format(date, "yyyy-MM-dd")
      }
    })
  }, [])

  // Get the current month's days
  const monthDays = useMemo(() => {
    const today = new Date()
    const startOfCurrentMonth = startOfMonth(today)
    const daysInMonth = getDaysInMonth(today)
    
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = addDays(startOfCurrentMonth, i)
      return {
        date,
        dayName: format(date, "EEE"),
        dayNumber: format(date, "d"),
        formattedDate: format(date, "yyyy-MM-dd")
      }
    })
  }, [])

  // Get the current year's months
  const yearMonths = useMemo(() => {
    const today = new Date()
    const currentYear = getYear(today)
    
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(currentYear, i, 1)
      return {
        date,
        dayName: format(date, "MMM"),
        dayNumber: "", // Remove month number
        formattedDate: format(date, "yyyy-MM")
      }
    })
  }, [])

  // Get the last 7 days
  const lastSevenDays = useMemo(() => {
    const today = new Date()
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, -6 + i)
      return {
        date,
        dayName: format(date, "EEE"),
        dayNumber: format(date, "d"),
        formattedDate: format(date, "yyyy-MM-dd")
      }
    })
  }, [])

  // Get the appropriate days based on the selected time frame
  const daysToDisplay = useMemo(() => {
    switch (timeFrame) {
      case 'daily':
        return lastSevenDays;
      case 'weekly':
        return weekDays;
      case 'monthly':
        return monthDays;
      case 'yearly':
        return yearMonths;
      default:
        return weekDays;
    }
  }, [timeFrame, weekDays, monthDays, yearMonths, lastSevenDays]);

  // Map revenue data to the days to display
  const displayData = useMemo(() => {
    // Log the incoming data for debugging
    console.log("Revenue Calendar: Processing sales data", salesData.length, "items");
    if (salesData.length > 0) {
      console.log("Sample data:", salesData.slice(0, 3));
    }
    
    return daysToDisplay.map(day => {
      // Find matching revenue data for this day
      const matchingData = salesData.filter(item => {
        try {
          if (!item || !item.date) return false;
          
          let itemDate: Date | undefined = undefined;
          
          // Parse the date based on its type
          if (typeof item.date === 'string') {
            // Try parsing as ISO string
            itemDate = parseISO(item.date);
            
            // If invalid, try as timestamp
            if (!isValid(itemDate)) {
              const timestamp = parseInt(item.date);
              if (!isNaN(timestamp)) {
                itemDate = new Date(timestamp);
              }
            }
            
            // If still invalid, try custom format
            if (!isValid(itemDate)) {
              try {
                itemDate = parse(item.date, 'yyyy-MM-dd', new Date());
              } catch (e) {
                // Try other formats
                try {
                  itemDate = parse(item.date, 'MM/dd/yyyy', new Date());
                } catch (e2) {
                  // Try one more format that might be used
                  try {
                    itemDate = parse(item.date, 'yyyy-MM-dd\'T\'HH:mm:ss.SSSX', new Date());
                  } catch (e3) {
                    // Parsing failed
                  }
                }
              }
            }
          } else if (typeof item.date === 'object' && item.date !== null && 'getTime' in item.date) {
            itemDate = item.date as Date;
          } else if (typeof item.date === 'number') {
            itemDate = new Date(item.date);
          }
          
          if (!itemDate || !isValid(itemDate)) return false;
          
          // Match based on timeframe
          if (timeFrame === 'daily') {
            const matches = format(itemDate, 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd');
            if (matches && item.revenue > 1000) {
              console.log(`Found significant sale for daily view: $${item.revenue} on ${format(itemDate, 'yyyy-MM-dd')}`);
            }
            return matches;
          } else if (timeFrame === 'weekly') {
            return getDay(itemDate) === getDay(day.date);
          } else if (timeFrame === 'monthly') {
            const matches = getDate(itemDate) === getDate(day.date);
            if (matches && item.revenue > 1000) {
              console.log(`Found significant sale for monthly view: $${item.revenue} on ${format(itemDate, 'yyyy-MM-dd')} (day ${getDate(itemDate)})`);
            }
            return matches;
          } else if (timeFrame === 'yearly') {
            return getMonth(itemDate) === getMonth(day.date);
          }
          
          return false;
        } catch (error) {
          console.error('Error matching date:', error);
          return false;
        }
      });

      // Sum up the revenue for matching data
      const revenue = matchingData.reduce((sum, item) => sum + (item.revenue || 0), 0);
      
      if (revenue > 1000) {
        console.log(`Total revenue for ${format(day.date, 'yyyy-MM-dd')}: $${revenue}`);
      }

      return {
        ...day,
        revenue,
        formattedDate: format(day.date, 'yyyy-MM-dd')
      };
    });
  }, [salesData, daysToDisplay, timeFrame]);

  // Find the maximum revenue for scaling
  const maxRevenue = useMemo(() => {
    const revenues = displayData.map(day => day.revenue)
    return Math.max(...revenues, 1) // Ensure we don't divide by zero
  }, [displayData])

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

  // Add a specific effect to handle API errors by using initial data
  useEffect(() => {
    if (error && error.includes('Database schema has changed') && initialData && initialData.length > 0) {
      console.log('Revenue Calendar: Database schema error detected with initial data available, using initial data');
      setSalesData(initialData);
      setError(null);
    }
  }, [error, initialData]);

  // Force use of initial data when available
  useEffect(() => {
    // If we have valid initial data and no sales data yet, use the initial data
    if (initialData && initialData.length > 0 && salesData.length === 0 && !isLoading) {
      console.log('Revenue Calendar: Forcing use of initial data');
      setSalesData(initialData);
      // Clear any error related to database schema
      if (error && (
          error.includes('Database schema has changed') || 
          error.includes('does not exist') ||
          error.includes('relation "public.shopify_data" does not exist')
        )) {
        console.log('Revenue Calendar: Clearing database schema error');
        setError(null);
      }
    }
  }, [initialData, salesData.length, isLoading, error]);

  // Debug log for component state
  useEffect(() => {
    console.log('Revenue Calendar: Component state updated:', {
      brandId,
      initialDataLength: initialData?.length || 0,
      salesDataLength: salesData.length,
      isUsingInitialData: initialData && salesData === initialData,
      timeFrame,
      isLoading,
      error,
      hasError: !!error
    });
  }, [brandId, initialData, salesData, timeFrame, isLoading, error]);

  return (
    <div className="h-full flex flex-col">
      {showDebug && (
        <div className="mb-4 p-3 bg-gray-800 text-gray-300 rounded text-xs overflow-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-bold mb-1">Component State:</h4>
              <div>Brand ID: {brandId || 'Not provided'}</div>
              <div>Initial data: {initialData ? `${initialData.length} records` : 'None'}</div>
              <div>Initial data valid: {initialData && Array.isArray(initialData) && initialData.every(item => item && typeof item === 'object' && 'date' in item && 'revenue' in item) ? 'Yes' : 'No'}</div>
              <div>Sales data: {salesData ? `${salesData.length} records` : 'None'}</div>
              <div>Using initial data: {salesData && initialData && salesData === initialData ? 'Yes' : 'No'}</div>
              <div>Time frame: {timeFrame}</div>
              <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
              <div>Error: {error || 'None'}</div>
              
              <h4 className="font-bold mt-2 mb-1">Actions:</h4>
              <div className="flex gap-2">
                <button
                  onClick={fetchSalesData}
                  className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Refresh Data
                </button>
                <button
                  onClick={() => {
                    console.clear();
                    console.log('Debug logs cleared');
                  }}
                  className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Clear Console
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-1">Raw Data Sample:</h4>
              <pre className="text-xs overflow-auto max-h-20 bg-gray-900 p-1 rounded">
                {JSON.stringify(salesData.slice(0, 3), null, 2) || 'No data'}
              </pre>
              
              <h4 className="font-bold mt-2 mb-1">Display Data Sample:</h4>
              <pre className="text-xs overflow-auto max-h-20 bg-gray-900 p-1 rounded">
                {JSON.stringify(displayData?.slice(0, 3), null, 2) || 'No data'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading sales data...</div>
        </div>
      ) : salesData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-red-500 mb-4">
            {error ? (
              error.includes('Database schema has changed') ? (
                <>
                  <p>Database update in progress.</p>
                  <p className="text-sm text-gray-400 mt-2">No historical data available to display.</p>
                </>
              ) : (
                error
              )
            ) : (
              'No sales data available to display.'
            )}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setIsLoading(true);
                setError(null);
                // If we have initial data, use it immediately
                if (initialData && initialData.length > 0) {
                  setSalesData(initialData);
                  setIsLoading(false);
                } else {
                  fetchSalesData();
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              {showDebug ? 'Hide Debug' : 'Debug Info'}
            </button>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-300">{getTitle()}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                {showDebug ? 'Hide' : 'Debug'}
              </button>
              <Select value={timeFrame} onValueChange={(value) => setTimeFrame(value as TimeFrame)}>
                <SelectTrigger className="w-[100px] h-8 text-xs bg-[#222] border-[#333]">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-[#333] text-white">
                  <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                  <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                  <SelectItem value="yearly" className="text-xs">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading sales data...</div>
            </div>
          )}
          
          {/* Error message */}
          {error && !isLoading && salesData.length > 0 && (
            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-md p-2 mb-4">
              <div className="text-yellow-500 text-sm">
                {error.includes('Database schema has changed') ? (
                  <>
                    <p className="font-medium">Database update in progress</p>
                    <p className="text-xs text-yellow-400/70 mt-1">Showing historical data. Recent sales may not be reflected.</p>
                  </>
                ) : (
                  error
                )}
              </div>
            </div>
          )}
          
          {!isLoading && !error && timeFrame === 'monthly' ? (
            // Monthly view with calendar-style layout - more compact
            <div className="grid grid-cols-7 gap-1 h-full">
              {/* Day headers (Mon, Tue, etc.) */}
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => (
                <div key={day} className="text-[10px] text-gray-300 text-center font-medium mb-1">
                  {day}
                </div>
              ))}
              
              {/* Calendar grid with proper day positioning */}
              {(() => {
                const today = new Date();
                const firstDayOfMonth = startOfMonth(today);
                const firstDayWeekday = (firstDayOfMonth.getDay() || 7) - 1; // 0-6 where 0 is Sunday, convert to 0-6 where 0 is Monday
                
                // Create empty cells for days before the first of the month
                const emptyCells = Array(firstDayWeekday).fill(null).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8"></div>
                ));
                
                return [
                  ...emptyCells,
                  ...displayData.map((day, index) => {
                    // Check if this is today
                    const isToday = isSameDay(day.date, new Date());
                    // Check if there's revenue for this day
                    const hasRevenue = day.revenue > 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center h-8 mb-1">
                        <div 
                          className={`
                            w-6 h-6 flex items-center justify-center rounded-full mb-0.5
                            ${isToday ? 'bg-blue-600 text-white' : hasRevenue ? 'bg-gray-800 text-white' : 'text-gray-400'}
                          `}
                        >
                          <span className="text-[10px] font-medium">{day.dayNumber}</span>
                        </div>
                        {hasRevenue ? (
                          <div className="text-[9px] font-medium text-green-400">
                            ${day.revenue > 999 ? (day.revenue/1000).toFixed(1) + 'k' : day.revenue.toFixed(0)}
                          </div>
                        ) : (
                          <div className="text-[9px] text-gray-600">$0</div>
                        )}
                      </div>
                    );
                  })
                ];
              })()}
            </div>
          ) : !isLoading && !error && (
            // Other views (weekly, daily, yearly)
            <div className={`grid gap-1 h-full ${
              timeFrame === 'yearly' ? 'grid-cols-6 grid-rows-2' : 
              'grid-cols-7'
            }`}>
              {displayData.map((day, index) => {
                // Calculate candle height as percentage of max revenue
                const heightPercentage = Math.max((day.revenue / maxRevenue) * 100, 5)
                
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div className="text-xs text-gray-400 mb-1">{day.dayName}</div>
                    {day.dayNumber && <div className="text-xs text-white mb-1">{day.dayNumber}</div>}
                    <div className="flex-1 w-full flex items-end justify-center">
                      <div 
                        className="w-6 bg-blue-600 rounded-t-sm"
                        style={{ 
                          height: `${heightPercentage}%`,
                          minHeight: '3px'
                        }}
                        title={`$${day.revenue.toFixed(2)}`}
                      ></div>
                    </div>
                    <div className="text-[9px] text-gray-400 mt-1">
                      ${day.revenue > 999 ? (day.revenue/1000).toFixed(1) + 'k' : day.revenue.toFixed(0)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

