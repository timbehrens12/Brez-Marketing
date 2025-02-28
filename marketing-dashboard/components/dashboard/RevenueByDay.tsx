"use client"

import type { JSX } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/utils"
import { useMemo } from 'react'
import { DateRange } from "react-day-picker"

interface RevenueByDayProps {
  data: Array<{
    date: string;
    revenue: number;
  }>;
  dateRange?: DateRange;
}

export function RevenueByDay({ data, dateRange }: RevenueByDayProps) {
  return (
    <Card className="col-span-4 bg-[#111111] border-[#222222]">
      <CardHeader>
        <CardTitle className="text-white">Daily Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="date" 
                stroke="#888888"
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis
                stroke="#888888"
                tickFormatter={(value) => `$${value}`}
              />
              <RechartsTooltip
                formatter={(value) => [`$${value}`, 'Revenue']}
                labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              />
              <Bar dataKey="revenue" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

