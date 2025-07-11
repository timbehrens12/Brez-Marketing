"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { LucideIcon } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface BlendedStatCardProps {
  title: string
  value: number
  change?: number
  icon: LucideIcon
  format?: "number" | "currency" | "percentage"
  decimals?: number
  suffix?: string
  description?: string
  loading?: boolean
}

export function BlendedStatCard({
  title,
  value,
  change = 0,
  icon: Icon,
  format = "number",
  decimals = 0,
  suffix = "",
  description,
  loading = false,
}: BlendedStatCardProps) {
  const formatValue = (value: number): string => {
    if (format === "currency") {
      return `$${value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals || 2
      })}`
    } else if (format === "percentage") {
      return `${value.toFixed(decimals)}%`
    } else {
      // number format
      if (decimals > 0) {
        return `${value.toFixed(decimals)}${suffix}`
      } else {
        return `${Math.round(value).toLocaleString()}${suffix}`
      }
    }
  }

  const formatChange = (change: number): string => {
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3" />
    if (change < 0) return <TrendingDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-400"
    if (change < 0) return "text-red-400"
    return "text-gray-400"
  }

  if (loading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-16 bg-gray-700" />
            <Skeleton className="h-4 w-4 bg-gray-700" />
          </div>
          <Skeleton className="h-6 w-20 bg-gray-700 mb-2" />
          <Skeleton className="h-3 w-12 bg-gray-700" />
        </CardContent>
      </Card>
    )
  }

  const card = (
    <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors group">
      <CardContent className="p-4">
        {/* Header with title and icon */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-300">{title}</span>
          <Icon className="h-4 w-4 text-gray-400 group-hover:text-gray-300 transition-colors" />
        </div>
        
        {/* Main value */}
        <div className="text-2xl font-bold text-white mb-2">
          {formatValue(value)}
        </div>
        
        {/* Change indicator */}
        <div className={cn(
          "flex items-center gap-1 text-sm",
          getChangeColor(change)
        )}>
          {getChangeIcon(change)}
          <span>{formatChange(change)}</span>
        </div>
      </CardContent>
    </Card>
  )

  if (description) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {card}
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-64">{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return card
} 