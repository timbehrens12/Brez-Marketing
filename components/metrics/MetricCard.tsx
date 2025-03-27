"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { format, subDays } from "date-fns"
import type { MetricData } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { useMemo } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TrendingUp, TrendingDown, Info, Minus, Loader2 } from "lucide-react"
import { MetricLineChart } from "./MetricLineChart"
import { MetricExplanation } from '@/components/dashboard/MetricExplanation'

interface MetricCardProps {
  title: string | React.ReactNode
  value: string | number
  change?: number
  data: MetricData[]
  prefix?: string
  suffix?: string
  className?: string
  loading?: boolean
  refreshing?: boolean
  initialLoading?: boolean
  valueFormat?: "number" | "percentage" | "currency"
  platform?: string
  infoTooltip?: string
  includesRefunds?: boolean
  dateRange?: DateRange | string
  isCustomRange?: boolean
  emptyState?: string
  icon?: React.ReactNode
  hidePercentageChange?: boolean
  hideGraph?: boolean
  brandId?: string
  showChart?: boolean
  hideChange?: boolean
  previousValue?: number
  previousValuePrefix?: string
  previousValueSuffix?: string
  previousValueFormat?: "number" | "percentage" | "currency"
  showPreviousPeriod?: boolean
  previousPeriodLabel?: string
}

// Define a proper type guard for DateRange
function isDateRangeObject(value: any): value is DateRange {
  return (
    value !== null &&
    typeof value === 'object' &&
    'from' in value &&
    'to' in value &&
    value.from instanceof Date &&
    value.to instanceof Date
  );
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
  initialLoading = false,
  valueFormat = "number",
  platform = "meta",
  infoTooltip,
  includesRefunds = false,
  dateRange,
  isCustomRange = false,
  emptyState,
  icon,
  hidePercentageChange = false,
  hideGraph = false,
  brandId,
  showChart = true,
  hideChange = false,
  previousValue = 0,
  previousValuePrefix = "",
  previousValueSuffix = "",
  previousValueFormat = "number",
  showPreviousPeriod = false,
  previousPeriodLabel = "Previous period",
}: MetricCardProps & { brandId?: string }) {
  // Use a more robust conversion with error catching
  const safeValue = useMemo(() => {
    try {
      if (value === undefined || value === null) return 0;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
      }
      return typeof value === 'number' && !isNaN(value) ? value : 0;
    } catch (e) {
      console.error("Error converting value in MetricCard:", e);
      return 0;
    }
  }, [value]);
  
  // Create a safe version of the formatter with better error handling
  const formatSafeValue = () => {
    try {
      if (value === undefined || value === null) {
        return `${prefix}0${suffix}`;
      }
      
      if (typeof value === 'string') {
        // Try to parse numeric strings
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          // Format the parsed numeric value
          if (valueFormat === 'currency') {
            return `${prefix}${parsed.toFixed(2)}${suffix}`;
          } else if (valueFormat === 'percentage') {
            return `${prefix}${parsed.toFixed(1)}%${suffix}`;
          } else {
            return `${prefix}${Math.round(parsed).toLocaleString()}${suffix}`;
          }
        }
        // If not numeric, return as is with prefix/suffix
        return `${prefix}${value}${suffix}`;
      }
      
      // Handle numeric values
      const num = Number(value);
      if (isNaN(num)) return `${prefix}0${suffix}`;
      
      if (valueFormat === 'currency') {
        return `${prefix}${num.toFixed(2)}${suffix}`;
      } else if (valueFormat === 'percentage') {
        return `${prefix}${num.toFixed(1)}%${suffix}`;
      } else {
        return `${prefix}${Math.round(num).toLocaleString()}${suffix}`;
      }
    } catch (error) {
      console.error("Error formatting value:", error);
      return `${prefix}0${suffix}`;
    }
  };
  
  // Safe change formatter with error catching
  const formatChange = () => {
    try {
      if (change === undefined || change === null) return '0%';
      
      const num = Number(change);
      if (isNaN(num)) return '0%';
      
      return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;
    } catch (error) {
      console.error("Error formatting change:", error);
      return '0%';
    }
  };
  
  // Add the comparison text generation function
  const getComparisonText = (changeValue: number, dateRange?: DateRange | string | undefined): string => {
    try {
      // Ensure changeValue is a number to prevent toFixed errors
      const safeChangeValue = Number(changeValue) || 0;
      
      // Use the type guard to check if it's a DateRange object
      if (!dateRange || typeof dateRange === 'string' || !isDateRangeObject(dateRange) || !dateRange.from) {
        return `${Math.abs(safeChangeValue).toFixed(1)}% ${safeChangeValue >= 0 ? 'increase' : 'decrease'} compared to previous period`;
      }
      
      // Handle single day view
      if (dateRange.from && dateRange.to && dateRange.from.toDateString() === dateRange.to.toDateString()) {
        return `${Math.abs(safeChangeValue).toFixed(1)}% ${safeChangeValue >= 0 ? 'increase' : 'decrease'} compared to previous day`;
      }
      
      // Calculate the number of days in the selected range
      const daysDiff = dateRange.to 
        ? Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 1;
      
      if (daysDiff <= 1) {
        return `${Math.abs(safeChangeValue).toFixed(1)}% ${safeChangeValue >= 0 ? 'increase' : 'decrease'} compared to previous day`;
      } else if (daysDiff <= 7) {
        return `${Math.abs(safeChangeValue).toFixed(1)}% ${safeChangeValue >= 0 ? 'increase' : 'decrease'} compared to previous ${daysDiff} days`;
      } else if (daysDiff <= 31) {
        return `${Math.abs(safeChangeValue).toFixed(1)}% ${safeChangeValue >= 0 ? 'increase' : 'decrease'} compared to previous month`;
      } else {
        return `${Math.abs(safeChangeValue).toFixed(1)}% ${safeChangeValue >= 0 ? 'increase' : 'decrease'} compared to previous period`;
      }
    } catch (error) {
      console.error("Error generating comparison text:", error);
      return "Comparison data unavailable";
    }
  };
  
  // Add formatter for previous value
  const formatPreviousValue = () => {
    try {
      if (previousValue === undefined || previousValue === null) {
        return `${previousValuePrefix}0${previousValueSuffix}`;
      }
      
      // Handle numeric values
      const num = Number(previousValue);
      if (isNaN(num)) return `${previousValuePrefix}0${previousValueSuffix}`;
      
      if (previousValueFormat === 'currency') {
        return `${previousValuePrefix}${num.toFixed(2)}${previousValueSuffix}`;
      } else if (previousValueFormat === 'percentage') {
        return `${previousValuePrefix}${num.toFixed(1)}%${previousValueSuffix}`;
      } else {
        return `${previousValuePrefix}${Math.round(num).toLocaleString()}${previousValueSuffix}`;
      }
    } catch (error) {
      console.error("Error formatting previous value:", error);
      return `${previousValuePrefix}0${previousValueSuffix}`;
    }
  };
  
  // If in initial loading state, show loading card
  if (initialLoading) {
    return (
      <Card className={cn("bg-[#111111] text-white border-[#222222]", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  try {
    return (
      <Card className={cn("bg-[#111] border-[#333] shadow-md overflow-hidden transition-all duration-200 hover:border-[#444]", className)}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {icon && <div className="mr-2">{icon}</div>}
              <CardTitle className="text-sm font-medium text-gray-200 flex items-center">
                {title}
                {infoTooltip && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex cursor-help ml-1.5">
                          <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-300 transition-colors" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        align="center"
                        className="bg-[#222] border border-[#444] text-white text-xs max-w-[220px] p-2 rounded-md shadow-md z-50"
                      >
                        <p>{infoTooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardTitle>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
            {refreshing && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {loading ? (
            <div className="flex items-center h-8">
              <div className="w-20 h-7 bg-gray-800 rounded animate-pulse"></div>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-white">
                {refreshing ? (
                  <span className="opacity-50">{formatSafeValue()}</span>
                ) : (
                  <>{formatSafeValue()}</>
                )}
              </div>
              
              {showPreviousPeriod && !loading && !refreshing && (
                <div className="mt-1 text-sm text-gray-400">
                  <span className="flex items-center">
                    <span className="text-gray-500 mr-1">vs</span>
                    {formatPreviousValue()}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help ml-1">
                          <Info className="h-3 w-3 text-gray-600" />
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          align="center"
                          className="z-50 bg-black border border-gray-800 text-xs p-2"
                        >
                          <p>{previousPeriodLabel || "Value from the previous comparable time period"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </div>
              )}
              
              {!loading && !refreshing && !hidePercentageChange && !hideChange && typeof change === 'number' && !isNaN(change) && (
                <div className="flex items-center mt-2">
                  <div className={`flex items-center space-x-1 rounded-full px-2 py-0.5 ${change > 0 ? "text-green-500 bg-green-500" : change < 0 ? "text-red-500 bg-red-500" : "text-gray-500 bg-gray-500"} bg-opacity-10`}>
                    <div className={`flex items-center`}>
                      {change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : change < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                      <span>{formatChange()}</span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help ml-1">
                          <Info className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          align="center"
                          className="z-50 bg-black border border-gray-800 text-xs p-2"
                        >
                          <p>{getComparisonText(change, dateRange)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
              
              {showChart && !hideGraph && !loading && data.length > 0 && (
                <MetricLineChart 
                  data={data}
                  dateRange={typeof dateRange === 'object' ? dateRange : undefined}
                  valuePrefix={prefix}
                  valueSuffix={suffix}
                  valueFormat={valueFormat}
                  color={"#4ade80"}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error("Error rendering MetricCard:", error);
    return (
      <Card className={cn("bg-[#111] border-[#333] shadow-md overflow-hidden", className)}>
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-medium text-gray-200">
            {typeof title === 'string' ? title : 'Metric Card'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-sm text-red-400">Error rendering metric</div>
        </CardContent>
      </Card>
    );
  }
}

