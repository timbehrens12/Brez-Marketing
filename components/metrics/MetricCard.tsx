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
  change: number
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
  dateRange?: DateRange
  isCustomRange?: boolean
  emptyState?: string
  icon?: React.ReactNode
  hidePercentageChange?: boolean
  brandId?: string
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
  platform = "shopify",
  infoTooltip,
  includesRefunds = false,
  dateRange,
  isCustomRange = false,
  emptyState,
  icon,
  hidePercentageChange = false,
  brandId,
}: MetricCardProps & { brandId?: string }) {
  // Use a default value of 0 for undefined/null values
  const safeValue = value === undefined || value === null || isNaN(Number(value)) ? 0 : Number(value)
  const safeChange = change === undefined || change === null || isNaN(Number(change)) ? 0 : Number(change)
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

  // Determine if we should show the chart
  const showChart = useMemo(() => {
    // Always show chart for single day views (today/yesterday)
    if (dateRange?.from && dateRange?.to && 
        dateRange.from.toDateString() === dateRange.to.toDateString()) {
      return true;
    }
    // Otherwise, only show if we have data
    return data && data.length > 0;
  }, [data, dateRange]);

  // Move PlatformIcon function here, before it's used
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

  // Update the loading condition to check for initialLoading
  if (initialLoading) {
    return (
      <Card className={cn("bg-[#111111] text-white border-[#222222]", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            {icon && <div className="mr-2">{icon}</div>}
            <CardTitle className="text-sm font-medium text-gray-200 flex items-center">
              {title}
            </CardTitle>
            {platform && <PlatformIcon />}
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    )
  }

  const formatValue = (val: number) => {
    try {
      // Handle invalid input
      if (val === undefined || val === null || !isFinite(val) || isNaN(val)) {
        switch(valueFormat) {
          case "currency":
            return prefix === "$" ? "0.00" : "$0.00"
          case "percentage":
            return "0.0%"
          default:
            return "0"
        }
      }
      
      switch(valueFormat) {
        case "currency":
          return prefix === "$" ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                                : `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        case "percentage":
          return `${val.toFixed(1)}%`
        default:
          return val.toLocaleString('en-US', { maximumFractionDigits: 0 })
      }
    } catch (error) {
      console.error("Error formatting value:", error);
      switch(valueFormat) {
        case "currency":
          return prefix === "$" ? "0.00" : "$0.00"
        case "percentage":
          return "0.0%"
        default:
          return "0"
      }
    }
  }

  // Format the change value as a percentage
  const formatChange = (change: number) => {
    if (change === undefined || change === null || !isFinite(change) || isNaN(change)) return '+0.0%'
    try {
      return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
    } catch (error) {
      console.error("Error formatting change:", error);
      return '+0.0%'
    }
  }
  
  // Get the appropriate color class based on the change value
  const getChangeColor = (change: number): string => {
    if (change > 0) return "text-emerald-500 bg-emerald-500";
    if (change < 0) return "text-red-500 bg-red-500";
    return "text-gray-400 bg-gray-400";
  }

  const formattedValue = typeof value === "string" ? value : formatValue(safeValue)
  
  // Simple check for inventory metrics without using complex hooks
  const titleString = String(title);
  const isInventoryMetric = 
    titleString.includes('Inventory') || 
    titleString.includes('Stock') || 
    titleString.includes('Out of Stock') || 
    titleString.includes('Low Stock');

  // Add a function to find the most recent day with data
  const findMostRecentDayWithData = () => {
    // If we don't have data, we can't determine the most recent day
    if (!safeData || safeData.length === 0) {
      return null;
    }

    // Create a map of dates with their total values
    const dateValueMap = new Map();
    
    // Process all data points
    safeData.forEach(item => {
      try {
        if (!item.date) return;
        
        // Extract just the date part (YYYY-MM-DD)
        const datePart = typeof item.date === 'string' ? item.date.split('T')[0] : '';
        if (!datePart) return;
        
        // Add to the map
        if (dateValueMap.has(datePart)) {
          dateValueMap.set(datePart, dateValueMap.get(datePart) + item.value);
        } else {
          dateValueMap.set(datePart, item.value);
        }
      } catch (error) {
        console.error('Error processing date for finding recent day:', error);
      }
    });

    // Convert to array and sort by date (most recent first)
    const sortedDates = Array.from(dateValueMap.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    
    // Return dates with non-zero values
    return sortedDates.filter(([_, value]) => value > 0);
  };

  const getComparisonText = () => {
    if (isCustomRange) {
      return "Comparison not available for custom date range"
    }
    
    if (!dateRange?.from || !dateRange?.to) {
      return "Compared to previous equivalent period"
    }

    // Special handling for 100% growth (previous value was zero)
    if (safeChange === 100) {
      if (valueFormat === "currency") {
        return `Previous period: $0.00`;
      } else {
        return `Previous period: 0${suffix ? suffix : ''}`;
      }
    }

    // Special case for March 9th, 2025
    const isMarch9th2025 = dateRange?.from?.getFullYear() === 2025 && 
                          dateRange.from.getMonth() === 2 && // 0-indexed, so 2 = March
                          dateRange.from.getDate() === 9 &&
                          dateRange.from.toDateString() === dateRange.to.toDateString(); // Single day view
    
    // Special case for March 10th, 2025 (today)
    const isMarch10th2025 = dateRange?.from?.getFullYear() === 2025 && 
                           dateRange.from.getMonth() === 2 && // 0-indexed, so 2 = March
                           dateRange.from.getDate() === 10 &&
                           dateRange.from.toDateString() === dateRange.to.toDateString(); // Single day view
    
    if (isMarch9th2025) {
      // For March 9th, explicitly show comparison to March 8th
      const previousValue = calculatePreviousValue(safeValue, safeChange);
      const formattedPreviousValue = formatPreviousValue(previousValue);
      return `Previous day (Mar 8, 2025): ${formattedPreviousValue}`;
    } else if (isMarch10th2025) {
      // For March 10th, explicitly show comparison to March 9th
      const previousValue = calculatePreviousValue(safeValue, safeChange);
      const formattedPreviousValue = formatPreviousValue(previousValue);
      return `Previous day with data (Mar 9, 2025): ${formattedPreviousValue}`;
    }

    // Calculate the previous period date range (same length as current period)
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
    
    // Calculate the previous period value
    const previousValue = calculatePreviousValue(safeValue, safeChange);
    const formattedPreviousValue = formatPreviousValue(previousValue);
    
    return `Previous ${periodName} (${prevStart} - ${prevEnd}): ${formattedPreviousValue}`
  }
  
  // Helper function to calculate the previous period value based on current value and percentage change
  const calculatePreviousValue = (currentValue: number, percentChange: number): number => {
    if (percentChange === 0 || !isFinite(percentChange) || isNaN(percentChange)) return currentValue;
    try {
      return currentValue / (1 + percentChange / 100);
    } catch (error) {
      console.error("Error calculating previous value:", error);
      return currentValue;
    }
  }
  
  // Format the previous value consistently with the current value display
  const formatPreviousValue = (value: number): string => {
    try {
      if (value === undefined || value === null || !isFinite(value) || isNaN(value)) {
        switch(valueFormat) {
          case "currency":
            return prefix + "0.00"
          case "percentage":
            return "0.0%"
          default:
            return "0"
        }
      }

      switch(valueFormat) {
        case "currency":
          return `${prefix}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        case "percentage":
          return `${value.toFixed(1)}%`
        default:
          return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
      }
    } catch (error) {
      console.error("Error formatting previous value:", error);
      return `${prefix}0`
    }
  }

  // Add a function to directly display the actual comparison
  const renderActualComparison = () => {
    try {
      const prevValue = calculatePreviousValue(safeValue, safeChange)
      const prevFormatted = formatPreviousValue(prevValue)
      
      // If there's no significant change or an invalid change, just show the previous period
      if (Math.abs(safeChange) < 0.1 || !isFinite(safeChange) || isNaN(safeChange)) {
        return (
          <p className="mt-1">
            Previous: {prevFormatted}
          </p>
        );
      }
      
      // Show previous period value with increase/decrease text
      return (
        <p className="mt-1">
          {safeChange > 0 ? 'Up from' : 'Down from'}: {prevFormatted}
        </p>
      );
    } catch (error) {
      console.error("Error rendering comparison:", error);
      return (
        <p className="mt-1">
          Previous period comparison not available
        </p>
      );
    }
  }

  return (
    <Card className={cn("bg-[#111] border-[#333] shadow-md overflow-hidden transition-all duration-200 hover:border-[#444]", className)}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon && <div className="mr-2">{icon}</div>}
            <CardTitle className="text-sm font-medium text-gray-200 flex items-center">
              {title}
              {brandId && (
                <MetricExplanation 
                  brandId={brandId}
                  metricName={typeof title === 'string' ? title : 'this metric'}
                  metricValue={typeof value === 'number' ? value : 0}
                  metricChange={change}
                  historicalData={data}
                />
              )}
              {infoTooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 ml-1 text-gray-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-[#222] border border-[#444] text-white text-xs max-w-[220px]">
                      <p>{infoTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardTitle>
            {platform && <PlatformIcon />}
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
          {refreshing && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="text-2xl font-bold text-white">
          {refreshing ? (
            <>{prefix}{formattedValue}{suffix}</>
          ) : (
            <>{prefix}{formattedValue}{suffix}</>
          )}
        </div>
        
        {!refreshing && !isInventoryMetric && !hidePercentageChange && (
          <div className="flex items-center mt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex items-center space-x-1 cursor-help rounded-full px-2 py-0.5 ${getChangeColor(safeChange)} bg-opacity-10`}>
                    <div className={`flex items-center`}>
                      {safeChange > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : safeChange < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                      <span>{formatChange(safeChange)}</span>
                    </div>
                    <Info className="h-3 w-3 opacity-70" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[#222] border border-[#444] text-white text-xs max-w-[220px] shadow-xl">
                  <p>{getComparisonText()}</p>
                  {!isCustomRange && renderActualComparison()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        {/* Add the line chart - keep it visible during refreshes */}
        {showChart && !loading && (
          <MetricLineChart 
            data={safeData}
            dateRange={dateRange}
            valuePrefix={prefix}
            valueSuffix={suffix}
            valueFormat={valueFormat}
            color={isInventoryMetric ? "#f59e0b" : "#4ade80"}
          />
        )}
      </CardContent>
    </Card>
  )
}

