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
      // For hourly view, sum all revenues for the hour (only for today)
      if (timeFrame === 'hourly') {
        const today = startOfDay(new Date());
        let hourRevenue = 0;
        
        // Log the current hour we're processing
        console.log(`Processing hour: ${format(day.date, "ha")} (${getHours(day.date)})`);
        
        data.forEach(item => {
          try {
            if (!item || !item.date) return;
            
            // Log the raw date from the data
            console.log(`Raw date from data: ${JSON.stringify(item.date)}`);
            
            let itemDate: Date | null = null;
            
            // Parse the date based on its type
            if (typeof item.date === 'string') {
              // Try parsing as ISO string
              itemDate = parseISO(item.date);
              console.log(`Parsed ISO date: ${itemDate.toString()}, valid: ${isValid(itemDate)}`);
              
              // If parsing failed, try other formats
              if (!isValid(itemDate)) {
                // Try as timestamp
                if (!isNaN(Number(item.date))) {
                  itemDate = new Date(Number(item.date));
                  console.log(`Parsed timestamp: ${itemDate.toString()}`);
                } else {
                  // Try as YYYY-MM-DD HH:mm:ss
                  const parts = item.date.split(/[-T: ]/);
                  if (parts.length >= 3) {
                    itemDate = new Date(
                      parseInt(parts[0]), 
                      parseInt(parts[1]) - 1,
                      parseInt(parts[2]),
                      parts.length > 3 ? parseInt(parts[3]) : 0,
                      parts.length > 4 ? parseInt(parts[4]) : 0
                    );
                    console.log(`Parsed from parts: ${itemDate.toString()}, parts: ${parts.join(',')}`);
                  }
                }
              }
            } else if (typeof item.date === 'object' && item.date !== null && 'getTime' in item.date) {
              itemDate = item.date as Date;
              console.log(`Date object: ${itemDate.toString()}`);
            } else if (typeof item.date === 'number') {
              itemDate = new Date(item.date);
              console.log(`Numeric date: ${itemDate.toString()}`);
            }
            
            // If we have a valid date, check if it matches the current hour and day
            if (itemDate && isValid(itemDate)) {
              // For debugging, log all hours
              console.log(`Item hour: ${getHours(itemDate)}, Day hour: ${getHours(day.date)}, Same day: ${isSameDay(itemDate, today)}`);
              
              // IMPORTANT: For hourly view, we want to show all sales for today, grouped by hour
              // We don't need to check if it's the same day as today - we want to show all data
              if (getHours(itemDate) === getHours(day.date)) {
                console.log(`✅ Found sale at hour ${getHours(itemDate)}: $${item.revenue}`);
                hourRevenue += (item.revenue || 0);
              }
            }
          } catch (error) {
            console.error("Error processing date:", item.date, error);
          }
        });
        
        return {
          ...day,
          revenue: hourRevenue
        };
      }
      
      // For other views, find matching revenue data
      const matchingData = data.find(item => {
        // Handle different date formats
        try {
          if (!item || !item.date) return false;
          
          let itemDate: Date | null = null;
          
          // Try different date parsing approaches
          if (typeof item.date === 'string') {
            itemDate = parseISO(item.date);
            
            if (!isValid(itemDate)) {
              const parts = item.date.split('-');
              if (parts.length === 3) {
                itemDate = new Date(
                  parseInt(parts[0]), 
                  parseInt(parts[1]) - 1,
                  parseInt(parts[2])
                );
              }
            }
          } else if (typeof item.date === 'object' && item.date !== null && 'getTime' in item.date) {
            itemDate = item.date as Date;
          } else if (typeof item.date === 'number') {
            itemDate = new Date(item.date);
          }
          
          if (!itemDate || !isValid(itemDate)) return false;
          
          // For yearly view, match by month and year
          if (timeFrame === 'yearly') {
            return getMonth(itemDate) === getMonth(day.date) && 
                   getYear(itemDate) === getYear(day.date);
          }
          
          // For other views, match by exact day
          return isSameDay(itemDate, day.date);
        } catch (error) {
          console.error("Error parsing date:", item.date, error);
          return false;
        }
      });
      
      // For yearly view, sum all revenues for the month
      if (timeFrame === 'yearly') {
        const monthRevenue = data.reduce((sum, item) => {
          try {
            if (!item || !item.date) return sum;
            
            let itemDate: Date | null = null;
            
            if (typeof item.date === 'string') {
              itemDate = parseISO(item.date);
            } else if (typeof item.date === 'object' && item.date !== null && 'getTime' in item.date) {
              itemDate = item.date as Date;
            } else if (typeof item.date === 'number') {
              itemDate = new Date(item.date);
            }
            
            if (itemDate && isValid(itemDate) && 
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
        // Hourly view - more compact layout
        <div className="flex flex-col h-full">
          {/* Morning (12am-11am) */}
          <div className="mb-1">
            <div className="text-[10px] font-medium text-gray-400 mb-1">Morning</div>
            <div className="flex justify-between">
              {displayData.slice(0, 12).map((hour, index) => {
                const heightPercentage = Math.max((hour.revenue / maxRevenue) * 100, 5);
                return (
                  <div key={index} className="flex flex-col items-center w-5">
                    <div className="text-[7px] text-gray-400">{hour.dayName}</div>
                    <div className="h-10 w-full flex items-end justify-center">
                      {hour.revenue > 0 && (
                        <div 
                          className="w-3 bg-blue-600 rounded-t-sm"
                          style={{ 
                            height: `${heightPercentage}%`,
                            minHeight: '3px'
                          }}
                          title={`$${hour.revenue.toFixed(2)}`}
                        ></div>
                      )}
                    </div>
                    <div className="text-[6px] text-gray-400 mt-1">
                      {hour.revenue > 0 ? `$${hour.revenue > 999 ? (hour.revenue/1000).toFixed(1) + 'k' : hour.revenue.toFixed(0)}` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Afternoon/Evening (12pm-11pm) */}
          <div>
            <div className="text-[10px] font-medium text-gray-400 mb-1">Afternoon/Evening</div>
            <div className="flex justify-between">
              {displayData.slice(12, 24).map((hour, index) => {
                const heightPercentage = Math.max((hour.revenue / maxRevenue) * 100, 5);
                return (
                  <div key={index} className="flex flex-col items-center w-5">
                    <div className="text-[7px] text-gray-400">{hour.dayName}</div>
                    <div className="h-10 w-full flex items-end justify-center">
                      {hour.revenue > 0 && (
                        <div 
                          className="w-3 bg-blue-600 rounded-t-sm"
                          style={{ 
                            height: `${heightPercentage}%`,
                            minHeight: '3px'
                          }}
                          title={`$${hour.revenue.toFixed(2)}`}
                        ></div>
                      )}
                    </div>
                    <div className="text-[6px] text-gray-400 mt-1">
                      {hour.revenue > 0 ? `$${hour.revenue > 999 ? (hour.revenue/1000).toFixed(1) + 'k' : hour.revenue.toFixed(0)}` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Debug info for hourly view */}
          {showDebug && (
            <div className="mt-1 text-[7px] text-gray-400">
              <div>Hours with revenue: {displayData.filter(d => d.revenue > 0).map(d => d.dayName).join(', ')}</div>
            </div>
          )}
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

