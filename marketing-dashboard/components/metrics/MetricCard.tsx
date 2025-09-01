"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { format, parse, subDays } from "date-fns"
import type { MetricData } from "@/types/metrics"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { DateRange } from "react-day-picker"

interface MetricCardProps {
  title: string
  value: string | number
  change: number
  data: MetricData[]
  prefix?: string
  suffix?: string
  className?: string
  loading?: boolean
  valueFormat?: "number" | "percentage" | "currency"
  platform?: string
  infoTooltip?: string
  includesRefunds?: boolean
  dateRange?: DateRange
  isCustomRange?: boolean
  emptyState?: string
}

export function MetricCard({
  title,
  value,
  change,
  data,
  prefix = "",
  suffix = "",
  className,
  loading = false,
  valueFormat = "number",
  platform,
  infoTooltip,
  includesRefunds = false,
  dateRange,
  isCustomRange = false,
  emptyState,
}: MetricCardProps) {
  const isPositive = change > 0

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[60px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-[120px] mb-4" />
          <Skeleton className="h-[80px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const formatValue = (val: number) => {
    switch (valueFormat) {
      case "percentage":
        return `${val.toFixed(2)}`
      case "currency":
        return val
          .toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
          .replace(/^\$/, "") // Remove the leading dollar sign
      default:
        return val.toLocaleString()
    }
  }

  const formattedValue = typeof value === "string" ? value : formatValue(Number(value))

  const PlatformIcon = () => {
    switch (platform) {
      case "Shopify":
        return (
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Di8NeCzywloJqM3PWXj5VGVChVgmxi.png"
            alt="Shopify"
            className="h-4 w-4"
          />
        )
      case "Meta Ads":
        return (
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-xNnLSFG1hEPttp3zbiVUSkeeKN3EXY.png"
            alt="Meta"
            className="h-4 w-4"
          />
        )
      case "TikTok Ads":
        return (
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kQNBaAXHdkQfjbkUEzr7W0yvQmt22Z.png"
            alt="TikTok"
            className="h-4 w-4"
          />
        )
      default:
        return null
    }
  }

  const getComparisonText = () => {
    if (isCustomRange) {
      return "Comparison not available for custom date range"
    }
    
    if (!dateRange?.from || !dateRange?.to) {
      return "No date range selected"
    }

    const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    const prevStart = format(subDays(dateRange.from, days), 'MMM d, yyyy')
    const prevEnd = format(subDays(dateRange.from, 1), 'MMM d, yyyy')
    
    return `Compared to ${prevStart} - ${prevEnd}`
  }

  return (
    <Card className={cn("bg-gray-50", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <PlatformIcon />
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium text-gray-900">{title}</CardTitle>
            {infoTooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>{infoTooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-2xl font-bold text-gray-900">
            {prefix}
            {formattedValue}
            {suffix}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "text-xs font-medium cursor-help",
                    isCustomRange ? "text-gray-500" : isPositive ? "text-green-600" : "text-red-600"
                  )}
                >
                  {isCustomRange ? (
                    "--%"
                  ) : (
                    <>
                      {isPositive ? "+" : ""}
                      {change.toFixed(1)}%
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getComparisonText()}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {includesRefunds && (
          <div className="text-xs text-gray-600 mt-1">Includes adjustments for refunds</div>
        )}
        <div className="h-[100px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="date"
                fontSize={10}
                tickFormatter={(dateStr) => {
                  try {
                    // Check if the date string is in HH:mm format
                    if (dateStr.includes(":")) {
                      return format(parse(dateStr, "HH:mm", new Date()), "ha")
                    }
                    // Otherwise, assume it's a full date string
                    return format(new Date(dateStr), "MMM d")
                  } catch (error) {
                    console.error("Error formatting date:", error)
                    return dateStr // Fallback to original string if parsing fails
                  }
                }}
                stroke="#888888"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={10}
                tickFormatter={(val) => {
                  switch (valueFormat) {
                    case "percentage":
                      return `${val}%`
                    case "currency":
                      return `$${val.toLocaleString('en-US')}`
                    default:
                      return val.toLocaleString()
                  }
                }}
                stroke="#888888"
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0 && payload[0].payload) {
                    const dateStr = payload[0].payload.date
                    let formattedDate
                    try {
                      if (dateStr.includes(":")) {
                        formattedDate = format(parse(dateStr, "HH:mm", new Date()), "h:mm a")
                      } else {
                        formattedDate = format(new Date(dateStr), "MMM d, yyyy")
                      }
                    } catch (error) {
                      console.error("Error formatting date:", error)
                      formattedDate = dateStr
                    }
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">{formattedDate}</span>
                            <span className="font-bold text-muted-foreground">
                              {valueFormat === "currency" ? "$" : ""}
                              {formatValue(payload[0].value as number)}
                              {valueFormat === "percentage" ? "%" : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={isPositive ? "#16a34a" : "#dc2626"}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

