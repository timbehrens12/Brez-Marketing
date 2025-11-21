"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { ComparisonPicker, type ComparisonType } from "@/components/ComparisonPicker"
import type { DateRange } from "react-day-picker"
import type { MetricData } from "@/types/metrics"
import { format, isSameDay, isValid, parseISO, endOfDay } from "date-fns"


interface SalesChartProps {
  data: MetricData[]
  showComparison?: boolean
  comparisonType: ComparisonType
  customRange?: DateRange
  onComparisonChange: (type: ComparisonType, dateRange?: DateRange) => void
  dateRange: DateRange | undefined
}

export function SalesChart({
  data,
  showComparison = false,
  comparisonType,
  customRange,
  onComparisonChange,
  dateRange,
}: SalesChartProps) {
  const isSingleDay = dateRange?.from && dateRange?.to && isSameDay(dateRange.from, dateRange.to)
  const timezone = "America/New_York" // Use Shopify's timezone

  // Filter data points to only include those within the selected date range
  const filteredData = data.filter((point) => {
    if (!dateRange?.from || !dateRange?.to) return true
    const pointDate = parseISO(point.date)
    const rangeStart = dateRange.from
    const rangeEnd = endOfDay(dateRange.to)
    return pointDate >= rangeStart && pointDate <= rangeEnd
  })

  const formatXAxis = (tickItem: string) => {
    if (isSingleDay) {
      const date = parseISO(tickItem)
      return format(date, "ha")
    }

    try {
      const date = parseISO(tickItem)
      if (isValid(date)) {
        return format(date, "MMM d")
      }
    } catch (error) {
      console.error("Error parsing date:", error)
    }
    return tickItem
  }

  const formatTooltipLabel = (label: string) => {
    if (isSingleDay) {
      const date = parseISO(label)
      return format(date, "MMM d, h:mm a")
    }

    try {
      const date = parseISO(label)
      if (isValid(date)) {
        return format(date, "MMM d, yyyy")
      }
    } catch (error) {
      console.error("Error parsing date:", error)
    }
    return label
  }

  return (
    <Card className="col-span-4 bg-[#111111] border-[#222222]">
      <CardHeader className="flex flex-row items-center justify-between pb-8">
        <CardTitle className="text-white">Performance Trends</CardTitle>
        <ComparisonPicker
          comparisonType={comparisonType}
          customRange={customRange}
          onComparisonChange={onComparisonChange}
        />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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

