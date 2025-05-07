"use client"

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { format } from 'date-fns'

interface OrdersTimelineProps {
  data: Array<{
    date: string
    orders: number
  }>
  dateRange: {
    from: Date
    to: Date
  }
}

export function OrdersTimeline({ data, dateRange }: OrdersTimelineProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <Line 
          type="monotone" 
          dataKey="orders" 
          stroke="#96BF48" 
          strokeWidth={2} 
        />
        <CartesianGrid stroke="#333" strokeDasharray="5 5" />
        <XAxis 
          dataKey="date" 
          stroke="#666"
          tickFormatter={(date) => format(new Date(date), 'MMM d')}
        />
        <YAxis stroke="#666" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '4px'
          }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#96BF48' }}
          labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
        />
      </LineChart>
    </ResponsiveContainer>
  )
} 