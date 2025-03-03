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
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  eachMonthOfInterval,
  getDay,
  getDate,
  addDays
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
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('monthly')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [salesData, setSalesData] = useState<Array<{date: string; revenue: number; id?: string; isTimezoneShifted?: boolean}>>([])
  const [displayData, setDisplayData] = useState<DisplayItem[]>([])
  const [maxRevenue, setMaxRevenue] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [totalRevenue, setTotalRevenue] = useState(0)
  
  // Fetch sales data on component mount and when brandId changes
  useEffect(() => {
    if (brandId) {
      fetchSalesData()
    }
  }, [brandId])
  
  // Update display data when timeFrame or salesData changes
  useEffect(() => {
    if (salesData.length > 0) {
      const newDisplayData = generateDisplayData()
      setDisplayData(newDisplayData)
      
      // Calculate max revenue for scaling bars
      const max = Math.max(...newDisplayData.map(item => item.revenue))
      setMaxRevenue(max > 0 ? max : 1000) // Default to 1000 if all zeros
      
      // Calculate total revenue
      const total = newDisplayData.reduce((sum, item) => sum + item.revenue, 0)
      setTotalRevenue(total)
    }
  }, [timeFrame, salesData])
  
  const fetchSalesData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch data from the last 5 years to 2 years in the future to ensure we have enough data
      const startDate = format(subYears(new Date(), 5), 'yyyy-MM-dd')
      const endDate = format(addYears(new Date(), 2), 'yyyy-MM-dd')
      
      console.log(`Fetching sales data for brand ${brandId} from ${startDate} to ${endDate}`)
      
      const response = await fetch(`/api/shopify/sales?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.sales || !Array.isArray(data.sales)) {
        console.error('No sales array returned:', data)
        
        // Check for database schema error
        if (data.error && data.error.includes('database schema')) {
          setError('Database schema error. Please contact support.')
          
          // Use initial data if available
          if (initialData && initialData.length > 0) {
            const processedData = ensureTodayAndYesterday(initialData)
            setSalesData(processedData)
          } else {
            // Create empty data with today and yesterday
            const emptyData = createEmptyDataWithTodayAndYesterday()
            setSalesData(emptyData)
          }
        } else {
          setError('Failed to load sales data')
          setSalesData([])
        }
      } else {
        console.log(`Received ${data.sales.length} sales records`)
        
        // Ensure today and yesterday are in the data
        const processedData = ensureTodayAndYesterday(data.sales)
        setSalesData(processedData)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Error fetching sales data:', err)
      setError('Failed to load sales data')
      
      // Use initial data if available
      if (initialData && initialData.length > 0) {
        const processedData = ensureTodayAndYesterday(initialData)
        setSalesData(processedData)
      } else {
        // Create empty data with today and yesterday
        const emptyData = createEmptyDataWithTodayAndYesterday()
        setSalesData(emptyData)
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Ensure today and yesterday are in the data
  const ensureTodayAndYesterday = (data: Array<{date: string; revenue: number; id?: string; isTimezoneShifted?: boolean}>) => {
    const today = new Date()
    const yesterday = subDays(today, 1)
    
    // Format dates to match API response format (with time component)
    const todayStr = format(today, 'yyyy-MM-dd\'T\'00:00:00')
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd\'T\'00:00:00')
    
    console.log(`Ensuring today (${todayStr}) and yesterday (${yesterdayStr}) are in the data`)
    
    // Check if today and yesterday are in the data
    const hasToday = data.some(item => {
      const itemDate = item.date.substring(0, 10)
      const todayDate = todayStr.substring(0, 10)
      return itemDate === todayDate
    })
    
    const hasYesterday = data.some(item => {
      const itemDate = item.date.substring(0, 10)
      const yesterdayDate = yesterdayStr.substring(0, 10)
      return itemDate === yesterdayDate
    })
    
    console.log(`Has today: ${hasToday}, Has yesterday: ${hasYesterday}`)
    
    // Create a copy of the data
    const newData = [...data]
    
    // Add today if not present
    if (!hasToday) {
      newData.push({
        date: todayStr,
        revenue: 0,
        id: `generated-today-${Date.now()}`,
        isTimezoneShifted: false,
        forceShowOnFirst: true
      })
    }
    
    // Add yesterday if not present
    if (!hasYesterday) {
      newData.push({
        date: yesterdayStr,
        revenue: 0,
        id: `generated-yesterday-${Date.now()}`,
        isTimezoneShifted: false,
        forceShowOnFirst: true
      })
    }
    
    return newData
  }
  
  // Create empty data with today and yesterday
  const createEmptyDataWithTodayAndYesterday = () => {
    const today = new Date()
    const yesterday = subDays(today, 1)
    
    // Format dates to match API response format
    const todayStr = format(today, 'yyyy-MM-dd\'T\'00:00:00')
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd\'T\'00:00:00')
    
    return [
      {
        date: todayStr,
        revenue: 0,
        id: `generated-today-${Date.now()}`,
        isTimezoneShifted: false,
        forceShowOnFirst: true
      },
      {
        date: yesterdayStr,
        revenue: 0,
        id: `generated-yesterday-${Date.now()}`,
        isTimezoneShifted: false,
        forceShowOnFirst: true
      }
    ]
  }
  
  // Generate display data based on timeFrame
  const generateDisplayData = (): DisplayItem[] => {
    const today = new Date()
    
    if (timeFrame === 'monthly') {
      // Get the current month
      const currentMonth = startOfMonth(today)
      const monthEnd = endOfMonth(today)
      
      // Get all days in the month
      const daysInMonth = eachDayOfInterval({ start: currentMonth, end: monthEnd })
      
      // Create display data for each day
      return daysInMonth.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd')
        
        // Find matching sales data
        const matchingSales = salesData.filter(sale => {
          const saleDate = sale.date.substring(0, 10)
          return saleDate === dayStr
        })
        
        // Calculate total revenue for the day
        const totalRevenue = matchingSales.reduce((sum, sale) => sum + sale.revenue, 0)
        
        return {
          date: dayStr,
          displayDate: getDate(day).toString(), // Day of month (1-31)
          revenue: totalRevenue,
          count: matchingSales.length,
          isToday: isSameDay(day, today)
        }
      })
    } else if (timeFrame === 'weekly') {
      // Get the current week
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Start on Monday
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
      
      // Get all days in the week
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })
      
      // Create display data for each day
      return daysInWeek.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd')
        
        // Find matching sales data
        const matchingSales = salesData.filter(sale => {
          const saleDate = sale.date.substring(0, 10)
          return saleDate === dayStr
        })
        
        // Calculate total revenue for the day
        const totalRevenue = matchingSales.reduce((sum, sale) => sum + sale.revenue, 0)
        
        return {
          date: dayStr,
          displayDate: format(day, 'EEE'), // Day name (Mon, Tue, etc.)
          revenue: totalRevenue,
          count: matchingSales.length,
          isToday: isSameDay(day, today)
        }
      })
    } else if (timeFrame === 'daily') {
      // For daily view, show hours of the current day
      const hours = Array.from({ length: 24 }, (_, i) => i)
      
      return hours.map(hour => {
        const hourDate = new Date(today)
        hourDate.setHours(hour, 0, 0, 0)
        
        // Format for display and matching
        const hourStr = format(hourDate, 'yyyy-MM-dd\'T\'HH:00:00')
        const displayHour = format(hourDate, 'ha') // 1am, 2pm, etc.
        
        // Find matching sales data for this hour
        const matchingSales = salesData.filter(sale => {
          if (!sale.date) return false
          
          try {
            const saleDate = new Date(sale.date)
            return saleDate.getHours() === hour && isSameDay(saleDate, today)
          } catch (e) {
            return false
          }
        })
        
        // Calculate total revenue for the hour
        const totalRevenue = matchingSales.reduce((sum, sale) => sum + sale.revenue, 0)
        
        return {
          date: hourStr,
          displayDate: displayHour,
          revenue: totalRevenue,
          count: matchingSales.length,
          isCurrentHour: new Date().getHours() === hour
        }
      })
    } else {
      // Yearly view - show months
      const yearStart = startOfYear(today)
      const yearEnd = endOfYear(today)
      
      // Get all months in the year
      const monthsInYear = eachMonthOfInterval({ start: yearStart, end: yearEnd })
      
      // Create display data for each month
      return monthsInYear.map(month => {
        const monthStr = format(month, 'yyyy-MM')
        
        // Find matching sales data for this month
        const matchingSales = salesData.filter(sale => {
          const saleMonth = sale.date.substring(0, 7)
          return saleMonth === monthStr
        })
        
        // Calculate total revenue for the month
        const totalRevenue = matchingSales.reduce((sum, sale) => sum + sale.revenue, 0)
        
        return {
          date: monthStr,
          displayDate: format(month, 'MMM'), // Month name (Jan, Feb, etc.)
          revenue: totalRevenue,
          count: matchingSales.length,
          isCurrentMonth: month.getMonth() === today.getMonth()
        }
      })
    }
  }
  
  // Format revenue for display
  const formatRevenue = (revenue: number): string => {
    if (revenue === 0) return '$0'
    if (revenue >= 1000000) return `$${(revenue / 1000000).toFixed(1)}M`
    if (revenue >= 1000) return `$${(revenue / 1000).toFixed(1)}k`
    return `$${revenue.toFixed(0)}`
  }
  
  // Get the current month and year for the title
  const currentDate = new Date()
  const monthYearTitle = format(currentDate, 'MMMM yyyy')
  
  // Generate days for the monthly view
  const generateMonthlyDays = () => {
    const today = new Date()
    const firstDayOfMonth = startOfMonth(today)
    const lastDayOfMonth = endOfMonth(today)
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = getDay(firstDayOfMonth)
    
    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
    
    // Create empty cells for days before the 1st
    const emptyCells = Array(adjustedFirstDay).fill(null)
    
    // Create cells for each day of the month
    const days = Array.from(
      { length: getDate(lastDayOfMonth) },
      (_, i) => {
        const day = i + 1
        const date = addDays(firstDayOfMonth, i)
        const isToday = isSameDay(date, today)
        
        // Find revenue for this day
        const dayData = displayData.find(item => parseInt(item.displayDate) === day)
        const revenue = dayData?.revenue || 0
        
        return { day, revenue, isToday }
      }
    )
    
    return { emptyCells, days }
  }
  
  // Get the month days
  const { emptyCells, days } = generateMonthlyDays()
  
  return (
    <div className="w-full h-full flex flex-col bg-black rounded-lg p-4">
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-white">Revenue Calendar</h2>
      </div>
      
      <div className="bg-[#111] rounded-lg p-4 flex-1">
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
            {timeFrame === 'monthly' && (
              <>
                <div className="grid grid-cols-7 gap-2 mb-2">
                  <div className="text-center text-xs font-medium text-gray-400">Mon</div>
                  <div className="text-center text-xs font-medium text-gray-400">Tue</div>
                  <div className="text-center text-xs font-medium text-gray-400">Wed</div>
                  <div className="text-center text-xs font-medium text-gray-400">Thu</div>
                  <div className="text-center text-xs font-medium text-gray-400">Fri</div>
                  <div className="text-center text-xs font-medium text-gray-400">Sat</div>
                  <div className="text-center text-xs font-medium text-gray-400">Sun</div>
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {/* Empty cells for days before the 1st */}
                  {emptyCells.map((_, index) => (
                    <div key={`empty-${index}`} className="bg-transparent h-[60px]"></div>
                  ))}
                  
                  {/* Days of the month */}
                  {days.map(({ day, revenue, isToday }) => (
                    <div 
                      key={`day-${day}`} 
                      className={`flex flex-col h-[60px] rounded-md overflow-hidden border ${
                        isToday 
                          ? 'bg-blue-900/20 border-blue-700' 
                          : 'bg-gray-900 border-gray-800'
                      }`}
                    >
                      <div 
                        className={`text-center py-1 text-sm font-medium ${
                          isToday 
                            ? 'bg-blue-900/50 text-blue-100' 
                            : 'bg-gray-800 text-gray-300'
                        }`}
                      >
                        {day}
                      </div>
                      <div className="flex-1 flex flex-col justify-end p-2 relative">
                        <div className="absolute inset-x-2 bottom-8 top-2 flex items-end">
                          <div 
                            className={`w-full rounded-t transition-all duration-300 ${
                              revenue > 0 
                                ? isToday ? 'bg-blue-500' : 'bg-blue-600' 
                                : 'bg-gray-700 h-0.5'
                            }`}
                            style={{ 
                              height: revenue > 0 
                                ? `${Math.max(5, Math.min(100, (revenue / maxRevenue) * 100))}%` 
                                : '0.125rem' 
                            }}
                          ></div>
                        </div>
                        <div className="text-center text-sm font-medium text-white">
                          {formatRevenue(revenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {timeFrame === 'weekly' && (
              <div className="grid grid-cols-7 gap-2">
                {displayData.map((item, index) => (
                  <div 
                    key={`week-${index}`} 
                    className={`flex flex-col h-[60px] rounded-md overflow-hidden border ${
                      'isToday' in item && item.isToday 
                        ? 'bg-blue-900/20 border-blue-700' 
                        : 'bg-gray-900 border-gray-800'
                    }`}
                  >
                    <div 
                      className={`text-center py-1 text-sm font-medium ${
                        'isToday' in item && item.isToday 
                          ? 'bg-blue-900/50 text-blue-100' 
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {item.displayDate}
                    </div>
                    <div className="flex-1 flex flex-col justify-end p-2 relative">
                      <div className="absolute inset-x-2 bottom-8 top-2 flex items-end">
                        <div 
                          className={`w-full rounded-t transition-all duration-300 ${
                            item.revenue > 0 
                              ? 'isToday' in item && item.isToday ? 'bg-blue-500' : 'bg-blue-600' 
                              : 'bg-gray-700 h-0.5'
                          }`}
                          style={{ 
                            height: item.revenue > 0 
                              ? `${Math.max(5, Math.min(100, (item.revenue / maxRevenue) * 100))}%` 
                              : '0.125rem' 
                          }}
                        ></div>
                      </div>
                      <div className="text-center text-sm font-medium text-white">
                        {formatRevenue(item.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {timeFrame === 'daily' && (
              <div className="grid grid-cols-8 gap-2">
                {displayData.slice(0, 24).map((item, index) => (
                  <div 
                    key={`hour-${index}`} 
                    className={`flex flex-col h-[60px] rounded-md overflow-hidden border ${
                      'isCurrentHour' in item && item.isCurrentHour 
                        ? 'bg-blue-900/20 border-blue-700' 
                        : 'bg-gray-900 border-gray-800'
                    }`}
                  >
                    <div 
                      className={`text-center py-1 text-sm font-medium ${
                        'isCurrentHour' in item && item.isCurrentHour 
                          ? 'bg-blue-900/50 text-blue-100' 
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {item.displayDate}
                    </div>
                    <div className="flex-1 flex flex-col justify-end p-2 relative">
                      <div className="absolute inset-x-2 bottom-8 top-2 flex items-end">
                        <div 
                          className={`w-full rounded-t transition-all duration-300 ${
                            item.revenue > 0 
                              ? 'isCurrentHour' in item && item.isCurrentHour ? 'bg-blue-500' : 'bg-blue-600' 
                              : 'bg-gray-700 h-0.5'
                          }`}
                          style={{ 
                            height: item.revenue > 0 
                              ? `${Math.max(5, Math.min(100, (item.revenue / maxRevenue) * 100))}%` 
                              : '0.125rem' 
                          }}
                        ></div>
                      </div>
                      <div className="text-center text-sm font-medium text-white">
                        {formatRevenue(item.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {timeFrame === 'yearly' && (
              <div className="grid grid-cols-6 gap-2">
                {displayData.map((item, index) => (
                  <div 
                    key={`month-${index}`} 
                    className={`flex flex-col h-[60px] rounded-md overflow-hidden border ${
                      'isCurrentMonth' in item && item.isCurrentMonth 
                        ? 'bg-blue-900/20 border-blue-700' 
                        : 'bg-gray-900 border-gray-800'
                    }`}
                  >
                    <div 
                      className={`text-center py-1 text-sm font-medium ${
                        'isCurrentMonth' in item && item.isCurrentMonth 
                          ? 'bg-blue-900/50 text-blue-100' 
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {item.displayDate}
                    </div>
                    <div className="flex-1 flex flex-col justify-end p-2 relative">
                      <div className="absolute inset-x-2 bottom-8 top-2 flex items-end">
                        <div 
                          className={`w-full rounded-t transition-all duration-300 ${
                            item.revenue > 0 
                              ? 'isCurrentMonth' in item && item.isCurrentMonth ? 'bg-blue-500' : 'bg-blue-600' 
                              : 'bg-gray-700 h-0.5'
                          }`}
                          style={{ 
                            height: item.revenue > 0 
                              ? `${Math.max(5, Math.min(100, (item.revenue / maxRevenue) * 100))}%` 
                              : '0.125rem' 
                          }}
                        ></div>
                      </div>
                      <div className="text-center text-sm font-medium text-white">
                        {formatRevenue(item.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}