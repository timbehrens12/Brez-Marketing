"use client"

import type { JSX } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/utils"
import { useMemo } from 'react'

interface DayData {
  day: string
  date: string
  revenue: number | null
}

interface RevenueByDayProps {
  data: DayData[]
}

export function RevenueByDay({ data = [] }: RevenueByDayProps) {
  const placeholderData = useMemo(() => {
    if (data.length > 0) return data;
    
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDay = now.getDay();
    
    return days.map((day, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - currentDay + i);
      return {
        day,
        date: date.toLocaleDateString(),
        revenue: 0
      };
    });
  }, [data]);

  return (
    <Card className="col-span-4 bg-[#111111] border-[#222222]">
      <CardHeader>
        <CardTitle className="text-white">Revenue by Day of Current Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={placeholderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="day"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const [day, date] = value.split("\n")
                  return `${day}\n${date}`
                }}
                height={60}
                tickSize={20}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <RechartsTooltip
                formatter={(value) => (value !== null ? formatCurrency(value as number) : "No data")}
                labelFormatter={(label) => label.replace("\n", " - ")}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]}>
                {placeholderData.map((entry, index) => (
                  <Bar key={`bar-${index}`} dataKey="revenue" fill={entry.revenue === null ? "#222222" : "#2563eb"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

