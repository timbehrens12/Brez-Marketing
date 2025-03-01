"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { useMemo, useState, useEffect } from 'react'
import { DateRange } from "react-day-picker"
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
  endOfDay
} from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface RevenueByDayProps {
  data: Array<{
    date: string;
    revenue: number;
  }>;
  dateRange?: DateRange;
}

export function RevenueByDay({ data, dateRange }: RevenueByDayProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('weekly');
  
  // Log the incoming date range for debugging
  useEffect(() => {
    if (dateRange) {
      console.log("Date range received:", {
        from: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
        to: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : null
      });
    }
  }, [dateRange]);
  
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

  // Filter data based on date range if provided
  const filteredData = useMemo(() => {
    if (!dateRange || !dateRange.from) {
      console.log("No date range filter applied");
      return data;
    }

    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    
    console.log(`Filtering data from ${format(from, 'yyyy-MM-dd')} to ${format(to, 'yyyy-MM-dd')}`);
    console.log(`Total data points before filtering: ${data.length}`);
    
    return data.filter(item => {
      try {
        if (!item || !item.date) return false;
        
        let itemDate: Date | undefined = undefined;
        
        // Parse the date based on its type
        if (typeof item.date === 'string') {
          // Log the raw date string for debugging
          console.log(`Processing date string: ${item.date}`);
          
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
                  console.error(`Failed to parse date: ${item.date}`);
                }
              }
            }
          }
        } else if (typeof item.date === 'object' && item.date !== null && 'getTime' in item.date) {
          itemDate = item.date as Date;
        } else if (typeof item.date === 'number') {
          itemDate = new Date(item.date);
        }
        
        if (!itemDate || !isValid(itemDate)) {
          console.log(`Invalid date found: ${JSON.stringify(item.date)}`);
          return false;
        }
        
        // Add a small buffer to the end date to ensure today's data is included
        // This helps with timezone issues where the date might be just outside the range
        const adjustedTo = new Date(to);
        adjustedTo.setHours(to.getHours() + 1);
        
        const isInRange = itemDate >= from && itemDate <= adjustedTo;
        
        if (isInRange && item.revenue > 1000) {
          console.log(`Found significant sale in range: $${item.revenue} on ${format(itemDate, 'yyyy-MM-dd HH:mm:ss')}`);
        }
        
        return isInRange;
      } catch (error) {
        console.error('Error filtering date:', error);
        return false;
      }
    });
  }, [data, dateRange]);

  // Map revenue data to the days to display
  const displayData = useMemo(() => {
    // Log the incoming data for debugging
    console.log("Revenue data after filtering:", filteredData.length, "items");
    if (filteredData.length > 0) {
      console.log("Sample data:", filteredData.slice(0, 3));
    }
    
    return daysToDisplay.map(day => {
      // Find matching revenue data for this day
      const matchingData = filteredData.filter(item => {
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
  }, [filteredData, daysToDisplay, timeFrame]);

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
        return 'Current Week (Mon-Sun)';
      case 'monthly':
        return `${format(new Date(), 'MMMM yyyy')}`;
      case 'yearly':
        return `${format(new Date(), 'yyyy')} by Month`;
      default:
        return 'Revenue Calendar';
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-300">{getTitle()}</h3>
        <Select value={timeFrame} onValueChange={(value) => setTimeFrame(value as TimeFrame)}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-[#222] border-[#333]">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent className="bg-[#222] border-[#333] text-white">
            <SelectItem value="daily" className="text-xs">Last 7 Days</SelectItem>
            <SelectItem value="weekly" className="text-xs">Weekly (Mon-Sun)</SelectItem>
            <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
            <SelectItem value="yearly" className="text-xs">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Debug toggle */}
      {process.env.NODE_ENV === 'development' && (
        <button 
          onClick={() => setShowDebug(!showDebug)} 
          className="text-xs text-gray-400 mb-1 underline self-end"
        >
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </button>
      )}
      
      {/* Debug info */}
      {showDebug && (
        <div className="bg-gray-800 p-2 text-xs text-gray-300 rounded mb-2 overflow-auto max-h-32">
          <div>Raw Data ({data.length} points):</div>
          <pre>{JSON.stringify(data.slice(0, 5), null, 2)}</pre>
          <div className="mt-2">Filtered Data ({filteredData.length} points):</div>
          <pre>{JSON.stringify(filteredData.slice(0, 5), null, 2)}</pre>
          <div className="mt-2">Date Range:</div>
          <pre>{JSON.stringify({
            from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
            to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null
          }, null, 2)}</pre>
          <div className="mt-2">Display Data ({timeFrame}):</div>
          <pre>{JSON.stringify(displayData.slice(0, 5).map(d => ({ 
            day: d.dayName, 
            date: d.formattedDate, 
            revenue: d.revenue 
          })), null, 2)}</pre>
        </div>
      )}
      
      {timeFrame === 'monthly' ? (
        // Monthly view with calendar-style layout - more compact
        <div className="grid grid-cols-7 gap-0.5 h-full">
          {/* Day headers (Mon, Tue, etc.) */}
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => (
            <div key={day} className="text-[9px] text-gray-400 text-center font-medium mb-1">
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
                
                return (
                  <div key={index} className="flex flex-col items-center h-8">
                    <div className={`text-[9px] ${isToday ? 'text-blue-400 font-medium' : 'text-white'}`}>
                      {day.dayNumber}
                    </div>
                    <div className="text-[8px] text-gray-400">
                      ${day.revenue > 999 ? (day.revenue/1000).toFixed(1) + 'k' : day.revenue.toFixed(0)}
                    </div>
                  </div>
                );
              })
            ];
          })()}
        </div>
      ) : (
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
  )
}

