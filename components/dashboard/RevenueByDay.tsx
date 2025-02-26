"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { format, parseISO, differenceInDays, isSameDay, startOfDay, endOfDay } from "date-fns"

interface RevenueByDayProps {
  data: Array<{
    date: string
    revenue: number
  }>
  dateRange: {
    from: Date
    to: Date
  }
}

export function RevenueByDay({ data, dateRange }: RevenueByDayProps) {
  // Format X-axis ticks based on date range
  const formatXAxis = (dateStr: string) => {
    const date = parseISO(dateStr)
    const daysDiff = differenceInDays(dateRange.to, dateRange.from)
    
    if (daysDiff <= 1) {
      // For single day, show hours
      return format(date, 'ha')
    } else if (daysDiff <= 7) {
      // For week view, show day names
      return format(date, 'EEE')
    } else if (daysDiff <= 31) {
      // For month view, show day of month
      return format(date, 'MMM d')
    } else {
      // For longer periods, show month
      return format(date, 'MMM')
    }
  }

  // Format tooltip label based on date range
  const formatTooltipLabel = (dateStr: string) => {
    const date = parseISO(dateStr)
    const daysDiff = differenceInDays(dateRange.to, dateRange.from)
    
    if (daysDiff <= 1) {
      return format(date, 'MMM d, yyyy h:mm a')
    } else {
      return format(date, 'MMM d, yyyy')
    }
  }

  // Calculate Y-axis domain based on actual data
  const maxRevenue = Math.max(...data.map(d => d.revenue))
  const yAxisDomain = [0, Math.ceil(maxRevenue * 1.1)] // Add 10% padding to top

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart 
        data={data} 
        margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="date"
          stroke="#888888"
          tickFormatter={formatXAxis}
          tick={{ fill: '#888888' }}
          interval="preserveStartEnd"
          minTickGap={30}
        />
        <YAxis
          stroke="#888888"
          tickFormatter={(value) => `$${value.toLocaleString()}`}
          tick={{ fill: '#888888' }}
          domain={yAxisDomain}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#222', border: '1px solid #333' }}
          labelStyle={{ color: '#888' }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
          labelFormatter={formatTooltipLabel}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#2563eb' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Helper function to ensure we have data points for all intervals
function fillMissingDates(data: any[], dateRange: { from: Date; to: Date }) {
  const filledData = []
  const daysDiff = differenceInDays(dateRange.to, dateRange.from)
  const currentDate = startOfDay(dateRange.from)
  const endDate = endOfDay(dateRange.to)
  
  if (daysDiff <= 1) {
    // For single day, fill hourly data
    for (let hour = 0; hour < 24; hour++) {
      const dateStr = format(new Date(currentDate).setHours(hour), "yyyy-MM-dd'T'HH:mm:ss")
      const existingData = data.find(d => {
        const dHour = parseISO(d.date).getHours()
        return dHour === hour && isSameDay(parseISO(d.date), currentDate)
      })
      
      filledData.push({
        date: dateStr,
        revenue: existingData ? existingData.revenue : 0
      })
    }
  } else {
    // For multiple days, fill daily data
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      const existingData = data.find(d => 
        isSameDay(parseISO(d.date), currentDate)
      )
      
      filledData.push({
        date: dateStr,
        revenue: existingData ? existingData.revenue : 0
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }
  
  return filledData
}

