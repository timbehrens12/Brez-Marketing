"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { useMemo, useState } from 'react'
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
  setHours
} from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type TimeFrame = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'

interface RevenueByDayProps {
  data: Array<{
    date: string;
    revenue: number;
  }>;
  dateRange?: DateRange;
}

export function RevenueByDay({ data }: RevenueByDayProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('weekly');
  
  // Get hours of the day (12am to 11pm)
  const hoursOfDay = useMemo(() => {
    const today = new Date()
    
    return Array.from({ length: 24 }, (_, i) => {
      const hour = setHours(startOfDay(today), i)
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
      case 'hourly':
        return hoursOfDay;
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
  }, [timeFrame, hoursOfDay, weekDays, monthDays, yearMonths, lastSevenDays]);

  // Map revenue data to the days to display
  const displayData = useMemo(() => {
    // Log the incoming data for debugging
    console.log("Revenue data received:", data);
    
    return daysToDisplay.map(day => {
      // Find matching revenue data for this day
      const matchingData = data.find(item => {
        // Handle different date formats
        let itemDate;
        try {
          if (!item || !item.date) return false;
          
          // Try different date parsing approaches
          if (typeof item.date === 'string') {
            // Try parsing as ISO string
            itemDate = parseISO(item.date);
            
            // If parsing failed or resulted in an invalid date, try another approach
            if (!isValid(itemDate)) {
              // Try parsing as YYYY-MM-DD
              const parts = item.date.split('-');
              if (parts.length === 3) {
                itemDate = new Date(
                  parseInt(parts[0]), 
                  parseInt(parts[1]) - 1, // Month is 0-indexed
                  parseInt(parts[2])
                );
              }
            }
          } else if (typeof item.date === 'object' && item.date !== null && 'getTime' in item.date) {
            itemDate = item.date as Date;
          } else {
            return false;
          }
          
          // Check if the dates match
          if (!isValid(itemDate)) return false;
          
          // For hourly view, match by hour of the day
          if (timeFrame === 'hourly') {
            return getHours(itemDate) === getHours(day.date);
          }
          
          // For yearly view, match by month and year
          if (timeFrame === 'yearly') {
            return getMonth(itemDate) === getMonth(day.date) && 
                   getYear(itemDate) === getYear(day.date);
          }
          
          // For other views, match by exact day
          const matches = isSameDay(itemDate, day.date);
          if (matches) {
            console.log(`Match found for ${day.formattedDate}: ${item.revenue}`);
          }
          return matches;
        } catch (error) {
          console.error("Error parsing date:", item.date, error);
          return false;
        }
      });
      
      // For hourly view, sum all revenues for the hour
      if (timeFrame === 'hourly') {
        const hourRevenue = data.reduce((sum, item) => {
          try {
            const itemDate = typeof item.date === 'string' ? parseISO(item.date) : new Date(item.date);
            if (isValid(itemDate) && getHours(itemDate) === getHours(day.date)) {
              return sum + (item.revenue || 0);
            }
          } catch (error) {
            console.error("Error processing date for hourly view:", item.date, error);
          }
          return sum;
        }, 0);
        
        return {
          ...day,
          revenue: hourRevenue
        };
      }
      
      // For yearly view, sum all revenues for the month
      if (timeFrame === 'yearly') {
        const monthRevenue = data.reduce((sum, item) => {
          try {
            const itemDate = typeof item.date === 'string' ? parseISO(item.date) : new Date(item.date);
            if (isValid(itemDate) && 
                getMonth(itemDate) === getMonth(day.date) && 
                getYear(itemDate) === getYear(day.date)) {
              return sum + (item.revenue || 0);
            }
          } catch (error) {
            console.error("Error processing date for yearly view:", item.date, error);
          }
          return sum;
        }, 0);
        
        return {
          ...day,
          revenue: monthRevenue
        };
      }
      
      console.log(`Day ${day.formattedDate}: ${matchingData ? matchingData.revenue : 'No data'}`);
      
      return {
        ...day,
        revenue: matchingData?.revenue || 0
      }
    });
  }, [daysToDisplay, data, timeFrame]);

  // Find the maximum revenue for scaling
  const maxRevenue = useMemo(() => {
    const revenues = displayData.map(day => day.revenue)
    return Math.max(...revenues, 1) // Ensure we don't divide by zero
  }, [displayData])

  // Get the title based on the selected time frame
  const getTitle = () => {
    switch (timeFrame) {
      case 'hourly':
        return 'Sales by Hour of Day';
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
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-300">{getTitle()}</h3>
        <Select value={timeFrame} onValueChange={(value) => setTimeFrame(value as TimeFrame)}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-[#222] border-[#333]">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent className="bg-[#222] border-[#333] text-white">
            <SelectItem value="hourly" className="text-xs">Hourly (24h)</SelectItem>
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
          className="text-xs text-gray-400 mb-2 underline self-end"
        >
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </button>
      )}
      
      {/* Debug info */}
      {showDebug && (
        <div className="bg-gray-800 p-2 text-xs text-gray-300 rounded mb-4 overflow-auto max-h-32">
          <div>Raw Data ({data.length} points):</div>
          <pre>{JSON.stringify(data.slice(0, 5), null, 2)}</pre>
          <div className="mt-2">Display Data ({timeFrame}):</div>
          <pre>{JSON.stringify(displayData.slice(0, 5).map(d => ({ 
            day: d.dayName, 
            date: d.formattedDate, 
            revenue: d.revenue 
          })), null, 2)}</pre>
        </div>
      )}
      
      {timeFrame === 'monthly' ? (
        // Monthly view with calendar-style layout
        <div className="grid grid-cols-7 gap-1 h-full">
          {/* Day headers (Mon, Tue, etc.) */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-xs text-gray-400 text-center font-medium mb-2">
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
              <div key={`empty-${i}`} className="h-12"></div>
            ));
            
            return [
              ...emptyCells,
              ...displayData.map((day, index) => {
                // Calculate candle height as percentage of max revenue
                const heightPercentage = Math.max((day.revenue / maxRevenue) * 100, 5);
                
                return (
                  <div key={index} className="flex flex-col items-center h-12">
                    <div className="text-xs text-white mb-1">{day.dayNumber}</div>
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div 
                        className="w-6 bg-blue-600 rounded-t-sm"
                        style={{ 
                          height: `${heightPercentage}%`,
                          minHeight: '3px'
                        }}
                        title={`$${day.revenue.toFixed(2)}`}
                      ></div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      ${day.revenue > 999 ? (day.revenue/1000).toFixed(1) + 'k' : day.revenue.toFixed(0)}
                    </div>
                  </div>
                );
              })
            ];
          })()}
        </div>
      ) : timeFrame === 'hourly' ? (
        // Hourly view (24 hours) - now in a single row like the 7-day view
        <div className="grid grid-cols-24 gap-1 h-full">
          {displayData.map((hour, index) => {
            // Calculate candle height as percentage of max revenue
            const heightPercentage = Math.max((hour.revenue / maxRevenue) * 100, 5);
            
            return (
              <div key={index} className="flex flex-col items-center">
                <div className="text-xs text-gray-400 mb-1">{hour.dayName}</div>
                <div className="flex-1 w-full flex items-end justify-center">
                  <div 
                    className="w-3 bg-blue-600 rounded-t-sm"
                    style={{ 
                      height: `${heightPercentage}%`,
                      minHeight: '4px'
                    }}
                    title={`$${hour.revenue.toFixed(2)}`}
                  ></div>
                </div>
                <div className="text-[8px] text-gray-400 mt-1">
                  ${hour.revenue > 999 ? (hour.revenue/1000).toFixed(1) + 'k' : hour.revenue.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Other views (weekly, daily, yearly)
        <div className={`grid gap-2 h-full ${
          timeFrame === 'yearly' ? 'grid-cols-6 grid-rows-2' : 
          'grid-cols-7'
        }`}>
          {displayData.map((day, index) => {
            // Calculate candle height as percentage of max revenue
            const heightPercentage = Math.max((day.revenue / maxRevenue) * 100, 5)
            
            return (
              <div key={index} className="flex flex-col items-center">
                <div className="text-sm text-gray-400 mb-1">{day.dayName}</div>
                {day.dayNumber && <div className="text-sm text-white mb-2">{day.dayNumber}</div>}
                <div className="flex-1 w-full flex items-end justify-center">
                  <div 
                    className="w-8 bg-blue-600 rounded-t-sm"
                    style={{ 
                      height: `${heightPercentage}%`,
                      minHeight: '4px'
                    }}
                    title={`$${day.revenue.toFixed(2)}`}
                  ></div>
                </div>
                <div className="text-xs text-gray-400 mt-2">
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

