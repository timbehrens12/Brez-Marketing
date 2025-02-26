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
  // Fill missing dates and prepare data
  const filledData = fillMissingDates(data, dateRange)

  // Calculate Y-axis domain based on actual data
  const maxRevenue = Math.max(...filledData.map(d => d.revenue))
  const yAxisDomain = [0, Math.ceil(maxRevenue * 1.1)] // Add 10% padding to top

  // Format X-axis ticks based on date range
  const formatXAxis = (dateStr: string) => {
    const date = parseISO(dateStr)
    const daysDiff = differenceInDays(dateRange.to, dateRange.from)
    
    if (daysDiff <= 1) {
      return format(date, 'ha') // 1PM, 2PM, etc.
    } else if (daysDiff <= 7) {
      return format(date, 'EEE') // Mon, Tue, etc.
    } else if (daysDiff <= 31) {
      return format(date, 'MMM d') // Jan 1, Jan 2, etc.
    } else {
      return format(date, 'MMM') // Jan, Feb, etc.
    }
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart 
        data={filledData}
        margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="date"
          stroke="#888888"
          tickFormatter={formatXAxis}
          tick={{ fill: '#888888' }}
          interval={0} // Show all ticks
          angle={-45} // Angle the labels
          textAnchor="end" // Align the rotated text
          height={60} // Make room for angled labels
        />
        <YAxis
          stroke="#888888"
          tickFormatter={(value) => `$${value.toLocaleString()}`}
          tick={{ fill: '#888888' }}
          domain={yAxisDomain}
          allowDecimals={false}
          width={80}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#222', border: '1px solid #333', borderRadius: '4px' }}
          labelStyle={{ color: '#888' }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
          labelFormatter={(dateStr) => format(parseISO(dateStr as string), 'MMMM d, yyyy')}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3, fill: '#2563eb' }}
          activeDot={{ r: 6, fill: '#2563eb' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function fillMissingDates(data: any[], dateRange: { from: Date; to: Date }) {
  const filledData = []
  const currentDate = startOfDay(new Date(dateRange.from))
  const endDate = endOfDay(new Date(dateRange.to))
  
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
  
  return filledData
}

