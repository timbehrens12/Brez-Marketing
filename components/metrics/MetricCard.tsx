"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { format, subDays } from "date-fns"
import type { MetricData } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { useMemo } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TrendingUp, TrendingDown, Info } from "lucide-react"

interface MetricCardProps {
  title: string | React.ReactNode
  value: string | number
  change: number
  data: MetricData[]
  prefix?: string
  suffix?: string
  className?: string
  loading?: boolean
  refreshing?: boolean
  valueFormat?: "number" | "percentage" | "currency"
  platform?: string
  infoTooltip?: string
  includesRefunds?: boolean
  dateRange?: DateRange
  isCustomRange?: boolean
  emptyState?: string
  icon?: React.ReactNode
}

export function MetricCard({
  title = "",
  value = 0,
  change = 0,
  data = [],
  prefix = "",
  suffix = "",
  className,
  loading = false,
  refreshing = false,
  valueFormat = "number",
  platform = "shopify",
  infoTooltip,
  includesRefunds = false,
  dateRange,
  isCustomRange = false,
  emptyState,
  icon,
}: MetricCardProps) {
  // Force everything to be numbers
  const safeValue = typeof value === 'number' ? value : Number(value) || 0
  const safeChange = typeof change === 'number' ? change : Number(change) || 0
  const safeData = Array.isArray(data) ? data : []
  
  const isPositive = safeChange > 0

  // Generate placeholder data if no data provided
  const placeholderData = useMemo(() => {
    if (safeData.length > 0) return safeData;
    
    const now = new Date();
    let days = 30; // default
    
    if (dateRange?.from && dateRange?.to) {
      days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(now.getTime() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: 0
    }));
  }, [safeData, dateRange]);

  if (loading) {
    return (
      <Card className={cn("bg-[#111111] text-white border-[#222222]", className)}>
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
    try {
      switch(valueFormat) {
        case "currency":
          return prefix === "$" ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                                : `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        case "percentage":
          return `${val.toFixed(1)}%`
        default:
          return val.toLocaleString('en-US', { maximumFractionDigits: 0 })
      }
    } catch {
      return "0"
    }
  }

  const formatChange = (change: number) => {
    if (!isFinite(change)) return '+0.0%'
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
  }

  const formattedValue = typeof value === "string" ? value : formatValue(safeValue)

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
      case "Google Ads":
        return (
          <img
            src="https://i.imgur.com/TavV4UJ.png"
            alt="Google Ads"
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
      return "Compared to previous equivalent period"
    }

    const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    const prevStart = format(subDays(dateRange.from, days), 'MMM d, yyyy')
    const prevEnd = format(subDays(dateRange.from, 1), 'MMM d, yyyy')
    
    let periodName = "period";
    if (days === 1) {
      periodName = "day";
    } else if (days === 7) {
      periodName = "week";
    } else if (days === 30 || days === 31 || days === 28 || days === 29) {
      periodName = "month";
    } else if (days === 90 || days === 91 || days === 92) {
      periodName = "quarter";
    } else if (days >= 365 && days <= 366) {
      periodName = "year";
    }
    
    return `Compared to previous ${periodName}: ${prevStart} - ${prevEnd}`
  }

  return (
    <Card className={cn("bg-[#1A1A1A] border-[#2A2A2A] hover:bg-[#222] transition-colors", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <PlatformIcon />
          <CardTitle className="text-sm font-medium text-gray-200">{title}</CardTitle>
          {icon && <span className="text-gray-400">{icon}</span>}
          
          {infoTooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <Info className="h-3.5 w-3.5 text-gray-500 hover:text-gray-300 transition-colors" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[#222] border border-[#444] text-white text-xs max-w-[220px]">
                  <p>{infoTooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">
          {refreshing ? (
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 animate-pulse bg-gray-700 rounded-full"></div>
              <div className="h-6 w-20 animate-pulse bg-gray-700 rounded"></div>
            </div>
          ) : (
            <>{prefix}{formattedValue}{suffix}</>
          )}
        </div>
        
        {!refreshing && (
          <div className="flex items-center mt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1 cursor-help">
                    <div className={cn(
                      "flex items-center text-sm font-medium",
                      isPositive ? "text-emerald-500" : safeChange < 0 ? "text-red-500" : "text-gray-400"
                    )}>
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : safeChange < 0 ? (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      ) : null}
                      <span>{formatChange(safeChange)}</span>
                    </div>
                    <Info className="h-3 w-3 text-gray-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-[#222] border border-[#444] text-white text-xs max-w-[220px]">
                  <p>{getComparisonText()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

