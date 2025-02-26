"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { format, parseISO, differenceInDays, isSameDay, startOfDay, endOfDay } from "date-fns"

interface RevenueByDayProps {
  data: RevenueData[];
  dateRange: DateRange | undefined;  // Make dateRange optional
}

export function RevenueByDay({ data, dateRange }: RevenueByDayProps) {
  // Ensure data is properly formatted with actual values
  const formattedData = data.map(item => ({
    date: format(parseISO(item.date), 'yyyy-MM-dd'),
    revenue: Number(item.revenue)
  }))

  // Fill in missing dates
  const filledData = fillMissingDates(formattedData, dateRange)

  // Calculate proper Y-axis domain
  const maxRevenue = Math.max(...filledData.map(d => d.revenue))
  const yAxisMax = Math.ceil(maxRevenue * 1.1)
  const yAxisTicks = generateYAxisTicks(0, yAxisMax, 5) // Generate 5 evenly spaced ticks

  // Format X-axis ticks based on date range
  const formatXAxis = (dateStr: string) => {
    const date = parseISO(dateStr)
    const daysDiff = differenceInDays(dateRange?.to, dateRange?.from)
    
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
        margin={{ top: 20, right: 30, left: 60, bottom: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="date"
          stroke="#888888"
          tickFormatter={formatXAxis}
          tick={{ fill: '#888888' }}
          interval="preserveEnd"
          minTickGap={30}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          stroke="#888888"
          tickFormatter={(value) => `$${value.toLocaleString()}`}
          tick={{ fill: '#888888' }}
          ticks={yAxisTicks}
          domain={[0, yAxisMax]}
          width={80}
        />
        <Tooltip
          contentStyle={{ 
            backgroundColor: '#222', 
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '8px'
          }}
          labelStyle={{ color: '#888', marginBottom: '4px' }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
          labelFormatter={(dateStr) => format(parseISO(dateStr as string), 'MMMM d, yyyy')}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
          activeDot={{ r: 6, fill: '#2563eb' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function fillMissingDates(data: any[], dateRange: DateRange | undefined) {
  const filledData = []
  const currentDate = startOfDay(new Date(dateRange?.from || new Date()))
  const endDate = endOfDay(new Date(dateRange?.to || new Date()))
  
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

// Helper function to generate nice Y-axis ticks
function generateYAxisTicks(min: number, max: number, count: number) {
  const step = (max - min) / (count - 1)
  return Array.from({ length: count }, (_, i) => Math.round(min + step * i))
}

