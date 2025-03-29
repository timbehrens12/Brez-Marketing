"use client"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  TrendingUp, 
  TrendingDown, 
  Loader2, 
  Info, 
  Minus
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FuturisticMetricCardProps {
  title: string | React.ReactNode
  value: string | number
  change?: number
  icon?: React.ReactNode
  prefix?: string
  suffix?: string
  className?: string
  loading?: boolean
  refreshing?: boolean
  valueFormat?: "number" | "percentage" | "currency"
  decimals?: number
  infoTooltip?: string
  hoverEffect?: boolean
  variant?: "primary" | "secondary" | "success" | "danger" | "warning" | "info"
  showGraph?: boolean
  previousValue?: number
  previousValueFormat?: "number" | "percentage" | "currency"
  showPreviousPeriod?: boolean
  previousPeriodLabel?: string
  size?: "sm" | "md" | "lg"
  dataPoints?: number[]
}

export function FuturisticMetricCard({
  title,
  value = 0,
  change,
  icon,
  prefix = "",
  suffix = "",
  className,
  loading = false,
  refreshing = false,
  valueFormat = "number",
  decimals = 0,
  infoTooltip,
  hoverEffect = true,
  variant = "primary",
  showGraph = false,
  previousValue,
  previousValueFormat = "number",
  showPreviousPeriod = false,
  previousPeriodLabel = "Previous period",
  size = "md",
  dataPoints = []
}: FuturisticMetricCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Format the value
  const formatValue = () => {
    try {
      if (value === undefined || value === null) return `${prefix}0${suffix}`
      
      if (typeof value === 'string') {
        const parsed = parseFloat(value)
        if (isNaN(parsed)) return `${prefix}${value}${suffix}`
        
        if (valueFormat === 'currency') {
          return `${prefix}${parsed.toFixed(2)}${suffix}`
        } else if (valueFormat === 'percentage') {
          return `${prefix}${parsed.toFixed(1)}%${suffix}`
        } else {
          return parsed > 999 
            ? `${prefix}${(parsed / 1000).toFixed(1)}k${suffix}` 
            : `${prefix}${parsed.toLocaleString(undefined, { maximumFractionDigits: decimals })}${suffix}`
        }
      }
      
      const num = Number(value)
      if (isNaN(num)) return `${prefix}0${suffix}`
      
      if (valueFormat === 'currency') {
        return `${prefix}${num.toFixed(2)}${suffix}`
      } else if (valueFormat === 'percentage') {
        return `${prefix}${num.toFixed(1)}%${suffix}`
      } else {
        return num > 999 
          ? `${prefix}${(num / 1000).toFixed(1)}k${suffix}` 
          : `${prefix}${num.toLocaleString(undefined, { maximumFractionDigits: decimals })}${suffix}`
      }
    } catch (error) {
      console.error("Error formatting value:", error)
      return `${prefix}0${suffix}`
    }
  }
  
  // Calculate percentage change from previous period
  const calculatePercentChange = () => {
    try {
      if (previousValue === undefined || previousValue === 0) {
        return { value: 0, isPositive: false, isZero: true }
      }
      
      const currentValue = Number(value)
      const change = ((currentValue - previousValue) / Math.abs(previousValue)) * 100
      
      return { 
        value: Math.abs(change), 
        isPositive: change > 0,
        isZero: change === 0
      }
    } catch (error) {
      console.error("Error calculating percentage change:", error)
      return { value: 0, isPositive: false, isZero: true }
    }
  }
  
  // Get color based on variant
  const getColor = () => {
    switch (variant) {
      case "primary": return { bg: "from-blue-500/20 to-indigo-500/10", border: "border-blue-500/30", text: "text-blue-400", glow: "rgba(59, 130, 246, 0.5)" }
      case "secondary": return { bg: "from-purple-500/20 to-indigo-500/10", border: "border-purple-500/30", text: "text-purple-400", glow: "rgba(168, 85, 247, 0.5)" }
      case "success": return { bg: "from-green-500/20 to-emerald-500/10", border: "border-green-500/30", text: "text-green-400", glow: "rgba(16, 185, 129, 0.5)" }
      case "danger": return { bg: "from-red-500/20 to-rose-500/10", border: "border-red-500/30", text: "text-red-400", glow: "rgba(239, 68, 68, 0.5)" }
      case "warning": return { bg: "from-amber-500/20 to-yellow-500/10", border: "border-amber-500/30", text: "text-amber-400", glow: "rgba(245, 158, 11, 0.5)" }
      case "info": return { bg: "from-cyan-500/20 to-sky-500/10", border: "border-cyan-500/30", text: "text-cyan-400", glow: "rgba(6, 182, 212, 0.5)" }
      default: return { bg: "from-blue-500/20 to-indigo-500/10", border: "border-blue-500/30", text: "text-blue-400", glow: "rgba(59, 130, 246, 0.5)" }
    }
  }
  
  // Set size class
  const sizeClass = size === "sm" 
    ? "p-3" 
    : size === "lg" 
      ? "p-5" 
      : "p-4"
  
  const colors = getColor()
  const percentChange = calculatePercentChange()
  
  // Draw sparkline graph
  useEffect(() => {
    if (!showGraph || !canvasRef.current || dataPoints.length < 2) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const drawGraph = () => {
      const width = canvas.width
      const height = canvas.height
      
      ctx.clearRect(0, 0, width, height)
      
      // Find min/max for scaling
      const min = Math.min(...dataPoints)
      const max = Math.max(...dataPoints)
      const range = max - min || 1
      
      // Draw path
      ctx.beginPath()
      ctx.moveTo(0, height - ((dataPoints[0] - min) / range) * height)
      
      const step = width / (dataPoints.length - 1)
      
      for (let i = 1; i < dataPoints.length; i++) {
        const x = i * step
        const y = height - ((dataPoints[i] - min) / range) * height
        ctx.lineTo(x, y)
      }
      
      // Stroke settings
      ctx.strokeStyle = isHovered ? "#fff" : getComputedStyle(document.documentElement).getPropertyValue(`--${variant}-500`).trim() || "#3b82f6"
      ctx.lineWidth = 2
      ctx.stroke()
    }
    
    drawGraph()
    
    // Redraw on window resize
    const handleResize = () => drawGraph()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [dataPoints, showGraph, isHovered, variant])
  
  return (
    <div 
      className={cn(
        "relative rounded-lg overflow-hidden transition-all duration-300 bg-gradient-to-br border",
        colors.bg,
        colors.border,
        hoverEffect && "hover:scale-[1.02] hover:shadow-lg",
        isHovered && "shadow-lg",
        sizeClass,
        className
      )}
      style={{
        boxShadow: isHovered ? `0 0 15px ${colors.glow}` : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glowing corner accent */}
      <div className={cn(
        "absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rounded-full blur-xl opacity-25 transition-opacity duration-300",
        isHovered ? "opacity-60" : "opacity-25",
        variant === "primary" && "bg-blue-500",
        variant === "secondary" && "bg-purple-500",
        variant === "success" && "bg-green-500",
        variant === "danger" && "bg-red-500",
        variant === "warning" && "bg-amber-500",
        variant === "info" && "bg-cyan-500"
      )} />
      
      {/* Header with title and icon */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={cn(
              "p-1.5 rounded-md bg-black/20",
              colors.text
            )}>
              {icon}
            </div>
          )}
          <div className="flex items-center">
            <h3 className="text-sm font-medium text-gray-200">{title}</h3>
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
          </div>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
        {refreshing && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
      </div>
      
      {/* Value display */}
      {loading ? (
        <div className="flex items-center h-8">
          <div className="w-20 h-7 bg-gray-800/50 rounded animate-pulse"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className={cn(
              "text-2xl font-bold",
              isHovered ? "text-white" : "text-white/90",
              "transition-colors duration-200"
            )}>
              {formatValue()}
            </div>
            
            {/* Change indicator */}
            {typeof change === 'number' && !isNaN(change) && (
              <div className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5",
                change > 0 ? "bg-green-500/20 text-green-400" : 
                change < 0 ? "bg-red-500/20 text-red-400" : 
                "bg-gray-500/20 text-gray-400"
              )}>
                {change > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : change < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                <span className="text-xs font-medium">
                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
              </div>
            )}
            
            {/* Previous period indicator */}
            {showPreviousPeriod && !loading && previousValue !== undefined && !change && (
              <div className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5",
                percentChange.isZero ? "bg-gray-500/20 text-gray-400" : 
                percentChange.isPositive ? "bg-green-500/20 text-green-400" : 
                "bg-red-500/20 text-red-400"
              )}>
                {percentChange.isZero ? (
                  <Minus className="h-3 w-3" />
                ) : percentChange.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span className="text-xs font-medium">
                  {percentChange.isZero ? '0' : 
                   percentChange.isPositive ? '+' : '-'}{percentChange.value.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          
          {/* Mini sparkline graph */}
          {showGraph && dataPoints.length > 1 && (
            <div className="mt-3 h-10">
              <canvas 
                ref={canvasRef} 
                width="100%" 
                height="100%" 
                className="w-full h-full" 
              />
            </div>
          )}
        </>
      )}
    </div>
  )
} 