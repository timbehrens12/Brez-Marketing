"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { format, parseISO } from "date-fns"

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
  // Ensure we have a data point for each day in the range
  const filledData = fillMissingDates(data, dateRange)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={filledData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="date"
          stroke="#888888"
          tickFormatter={(date) => format(parseISO(date), "MMM d")}
          tick={{ fill: '#888888' }}
        />
        <YAxis
          stroke="#888888"
          tickFormatter={(value) => `$${value.toLocaleString()}`}
          tick={{ fill: '#888888' }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#222', border: '1px solid #333' }}
          labelStyle={{ color: '#888' }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
          labelFormatter={(date) => format(parseISO(date as string), "MMMM d, yyyy")}
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

// Helper function to ensure we have data points for all dates
function fillMissingDates(data: any[], dateRange: { from: Date; to: Date }) {
  const filledData = []
  const currentDate = new Date(dateRange.from)
  
  while (currentDate <= dateRange.to) {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    const existingData = data.find(d => d.date === dateStr)
    
    filledData.push({
      date: dateStr,
      revenue: existingData ? existingData.revenue : 0
    })
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return filledData
}

