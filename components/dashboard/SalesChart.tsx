"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { ComparisonPicker, type ComparisonType } from "@/components/ComparisonPicker"
import type { DateRange } from "react-day-picker"
import type { MetricData } from "@/types/metrics"
import { format, parse, isSameDay, isValid } from "date-fns"

interface SalesChartProps {
  data: MetricData[]
  showComparison?: boolean
  comparisonType: ComparisonType
  customDateRange?: DateRange
  onComparisonChange: (type: ComparisonType, dateRange?: DateRange) => void
  dateRange: DateRange | undefined
}

export function SalesChart({
  data,
  showComparison = false,
  comparisonType,
  customDateRange,
  onComparisonChange,
  dateRange,
}: SalesChartProps) {
  const isSingleDay = dateRange?.from && dateRange?.to && isSameDay(dateRange.from, dateRange.to)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const formatXAxis = (tickItem: string) => {
    if (isSingleDay) {
      // For hourly data, convert 24-hour format to 12-hour
      const [hours] = tickItem.split(":")
      const date = new Date()
      date.setHours(Number.parseInt(hours, 10), 0, 0, 0)
      return format(date, "ha")
    }

    try {
      const date = new Date(tickItem)
      if (isValid(date)) {
        return format(date, "MMM d")
      }
    } catch (error) {
      console.error("Error parsing date:", error)
    }
    return tickItem
  }

  const formatTooltipLabel = (label: string) => {
    if (isSingleDay && dateRange?.from) {
      // For hourly data, show full date and time
      const [hours] = label.split(":")
      const date = new Date(dateRange.from)
      date.setHours(Number.parseInt(hours, 10), 0, 0, 0)
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        timeZone: timezone,
      }).format(date)
    }

    try {
      const date = new Date(label)
      if (isValid(date)) {
        return new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: timezone,
        }).format(date)
      }
    } catch (error) {
      console.error("Error parsing date:", error)
    }
    return label
  }

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between pb-8">
        <CardTitle>Sales Overview</CardTitle>
        <ComparisonPicker
          comparisonType={comparisonType}
          customDateRange={customDateRange}
          onComparisonChange={onComparisonChange}
        />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis
              dataKey="date"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatXAxis}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "white", borderRadius: "8px" }}
              formatter={(value: number) => [`$${value}`, "Sales"]}
              labelFormatter={formatTooltipLabel}
            />
            {showComparison && (
              <>
                <Legend />
                <Line
                  type="monotone"
                  dataKey="comparisonValue"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={false}
                  name="Previous"
                />
              </>
            )}
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} name="Current" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

