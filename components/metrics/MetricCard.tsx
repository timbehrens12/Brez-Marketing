"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { format, parse } from "date-fns"
import type { MetricData } from "@/types/metrics"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
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

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <PlatformIcon />
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {infoTooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="cursor-help">
                      <Info className="h-4 w-4 text-gray-500 hover:text-gray-900" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs">
                      {infoTooltip}
                      {includesRefunds && " (Includes adjustments for refunds)"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <span
          className={cn(
            "text-xs font-medium",
            isPositive ? "text-green-600" : "text-red-600",
            change === 0 ? "text-muted-foreground" : "",
          )}
        >
          {change === 0 ? "0%" : `${isPositive ? "+" : ""}${change.toFixed(2)}%`}
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {valueFormat === "currency" ? "$" : ""}
          {formattedValue}
          {valueFormat === "percentage" ? "%" : ""}
        </div>
        {includesRefunds && <div className="text-xs text-muted-foreground mt-1">Includes adjustments for refunds</div>}
        <div className="h-[80px] mt-4">
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
                      return `$${val}`
                    default:
                      return val.toString()
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

