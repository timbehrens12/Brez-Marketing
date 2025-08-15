"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart, AlertTriangle, TrendingDown, DollarSign } from "lucide-react"
import { useState, useEffect } from "react"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatters"

interface CartAbandonmentData {
  totalDrafts: number
  abandonedCarts: number
  abandonmentRate: number
  averageCartValue: number
  potentialRevenue: number
  topAbandonedProducts: Array<{
    title: string
    quantity: number
    value: number
  }>
}

interface CartAbandonmentWidgetProps {
  brandId: string
  dateRange: { from: Date; to: Date }
  connectionId: string
}

export function CartAbandonmentWidget({ brandId, dateRange, connectionId }: CartAbandonmentWidgetProps) {
  const [data, setData] = useState<CartAbandonmentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setData(null) // Clear existing data to prevent flashing
      try {
        const params = new URLSearchParams({
          connectionId,
          from: dateRange.from.toISOString().split('T')[0],
          to: dateRange.to.toISOString().split('T')[0]
        })

        const response = await fetch(`/api/shopify/cart-abandonment?${params}`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error('Error fetching cart abandonment data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (connectionId) {
      fetchData()
    }
  }, [connectionId, dateRange])

  if (isLoading) {
    return (
      <Card className="bg-[#111] border-[#333] shadow-md overflow-hidden transition-all duration-200 hover:border-[#444]">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-green-500" />
            Cart Abandonment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center h-8">
              <div className="w-32 h-8 bg-gray-800 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center mt-2">
              <div className="w-20 h-5 bg-gray-800/50 rounded animate-pulse"></div>
            </div>
            <div className="mt-4 h-20 bg-gray-800/30 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="bg-[#111] border-[#333] shadow-md overflow-hidden transition-all duration-200 hover:border-[#444]">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-green-500" />
            Cart Abandonment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <p className="text-sm text-gray-400">No cart abandonment data available</p>
        </CardContent>
      </Card>
    )
  }

  const getSeverityColor = (rate: number) => {
    if (rate >= 70) return "destructive"
    if (rate >= 50) return "secondary" 
    return "default"
  }

  const getSeverityIcon = (rate: number) => {
    if (rate >= 70) return <AlertTriangle className="h-4 w-4" />
    if (rate >= 50) return <TrendingDown className="h-4 w-4" />
    return <ShoppingCart className="h-4 w-4" />
  }

  return (
    <Card className="bg-[#111] border-[#333] shadow-md overflow-hidden transition-all duration-200 hover:border-[#444]">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-green-500" />
          Cart Abandonment Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {/* Main Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getSeverityIcon(data.abandonmentRate)}
              <span className="text-sm font-medium text-gray-200">Abandonment Rate</span>
            </div>
            <div className="font-bold text-xl md:text-3xl text-white">{formatPercentage(data.abandonmentRate)}</div>
            <Progress value={data.abandonmentRate} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-200">Potential Revenue</span>
            </div>
            <div className="font-bold text-xl md:text-3xl text-white">{formatCurrency(data.potentialRevenue)}</div>
            <p className="text-xs text-gray-400">From {formatNumber(data.abandonedCarts)} abandoned carts</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge variant={getSeverityColor(data.abandonmentRate)} className="flex items-center gap-1">
            {getSeverityIcon(data.abandonmentRate)}
            {data.abandonmentRate >= 70 ? 'Critical' : data.abandonmentRate >= 50 ? 'High' : 'Normal'} Abandonment Rate
          </Badge>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total Carts:</span>
            <span className="font-medium ml-2 text-white">{formatNumber(data.totalDrafts)}</span>
          </div>
          <div>
            <span className="text-gray-400">Avg Cart Value:</span>
            <span className="font-medium ml-2 text-white">{formatCurrency(data.averageCartValue)}</span>
          </div>
        </div>

        {/* Top Abandoned Products */}
        {data.topAbandonedProducts && data.topAbandonedProducts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">Most Abandoned Products</h4>
            <div className="space-y-2">
              {data.topAbandonedProducts.slice(0, 3).map((product, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-[#2a2a2a] rounded border border-[#333]">
                  <span className="text-sm font-medium truncate text-white">{product.title}</span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">{formatCurrency(product.value)}</div>
                    <div className="text-xs text-gray-400">{formatNumber(product.quantity)} units</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        {data.abandonmentRate > 50 && (
          <Button variant="outline" className="w-full">
            Create Retargeting Campaign
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
