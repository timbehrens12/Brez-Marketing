"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { useMemo } from 'react'
import { DateRange } from "react-day-picker"
import { startOfWeek, addDays, format, isSameDay } from "date-fns"

interface RevenueByDayProps {
  data: Array<{
    date: string;
    revenue: number;
  }>;
  dateRange?: DateRange;
}

export function RevenueByDay({ data }: RevenueByDayProps) {
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

  // Map revenue data to the current week days
  const weeklyData = useMemo(() => {
    return weekDays.map(day => {
      // Find matching revenue data for this day
      const matchingData = data.find(item => {
        const itemDate = new Date(item.date)
        return isSameDay(itemDate, day.date)
      })
      
      return {
        ...day,
        revenue: matchingData?.revenue || 0
      }
    })
  }, [weekDays, data])

  // Find the maximum revenue for scaling
  const maxRevenue = useMemo(() => {
    const revenues = weeklyData.map(day => day.revenue)
    return Math.max(...revenues, 1) // Ensure we don't divide by zero
  }, [weeklyData])

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 gap-2 h-full">
        {weeklyData.map((day, index) => {
          // Calculate candle height as percentage of max revenue
          const heightPercentage = Math.max((day.revenue / maxRevenue) * 100, 5)
          
          return (
            <div key={index} className="flex flex-col items-center">
              <div className="text-sm text-gray-400 mb-1">{day.dayName}</div>
              <div className="text-sm text-white mb-2">{day.dayNumber}</div>
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
                ${day.revenue.toFixed(0)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

