"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { useMemo, useState } from 'react'
import { DateRange } from "react-day-picker"
import { startOfWeek, addDays, format, isSameDay, parseISO, isValid } from "date-fns"

interface RevenueByDayProps {
  data: Array<{
    date: string;
    revenue: number;
  }>;
  dateRange?: DateRange;
}

export function RevenueByDay({ data }: RevenueByDayProps) {
  const [showDebug, setShowDebug] = useState(false);
  
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
    // Log the incoming data for debugging
    console.log("Revenue data received:", data);
    
    return weekDays.map(day => {
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
      
      console.log(`Day ${day.formattedDate}: ${matchingData ? matchingData.revenue : 'No data'}`);
      
      return {
        ...day,
        revenue: matchingData?.revenue || 0
      }
    });
  }, [weekDays, data]);

  // Find the maximum revenue for scaling
  const maxRevenue = useMemo(() => {
    const revenues = weeklyData.map(day => day.revenue)
    return Math.max(...revenues, 1) // Ensure we don't divide by zero
  }, [weeklyData])

  return (
    <div className="h-full flex flex-col">
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
          <div className="mt-2">Weekly Data:</div>
          <pre>{JSON.stringify(weeklyData.map(d => ({ 
            day: d.dayName, 
            date: d.formattedDate, 
            revenue: d.revenue 
          })), null, 2)}</pre>
        </div>
      )}
      
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

