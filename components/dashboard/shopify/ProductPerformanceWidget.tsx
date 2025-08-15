"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Package, TrendingUp, TrendingDown, DollarSign, BarChart3, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatters"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProductPerformanceData {
  totalProducts: number
  activeProducts: number
  topPerformers: Array<{
    id: string
    title: string
    revenue: number
    unitsSold: number
    conversionRate: number
    profitMargin: number
    trend: 'up' | 'down' | 'stable'
    variants: number
  }>
  underPerformers: Array<{
    id: string
    title: string
    revenue: number
    unitsSold: number
    conversionRate: number
    profitMargin: number
    stockLevel: number
  }>
  categoryPerformance: Array<{
    category: string
    revenue: number
    products: number
    avgPrice: number
  }>
  inventoryAlerts: Array<{
    productTitle: string
    currentStock: number
    status: 'low' | 'out'
  }>
}

interface ProductPerformanceWidgetProps {
  brandId: string
  dateRange: { from: Date; to: Date }
  connectionId: string
}

export function ProductPerformanceWidget({ brandId, dateRange, connectionId }: ProductPerformanceWidgetProps) {
  const [data, setData] = useState<ProductPerformanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("performers")

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

        const response = await fetch(`/api/shopify/product-performance?${params}`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error('Error fetching product performance data:', error)
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
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No product performance data available</p>
        </CardContent>
      </Card>
    )
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return "text-green-600"
      case 'down': return "text-red-600"
      default: return "text-gray-600"
    }
  }

  return (
    <Card className="col-span-2 bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Package className="h-5 w-5 text-green-500" />
          Product Performance
          {data.inventoryAlerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              <AlertCircle className="h-3 w-3 mr-1" />
              {data.inventoryAlerts.length} alerts
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{formatNumber(data.totalProducts)}</div>
            <div className="text-sm text-gray-400">Total Products</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{formatNumber(data.activeProducts)}</div>
            <div className="text-sm text-gray-400">Active Products</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{formatNumber(data.topPerformers.length)}</div>
            <div className="text-sm text-gray-400">Top Performers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{formatNumber(data.categoryPerformance.length)}</div>
            <div className="text-sm text-gray-400">Categories</div>
          </div>
        </div>

        {/* Tabs for Different Views */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performers">Top Performers</TabsTrigger>
            <TabsTrigger value="underperformers">Needs Attention</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="performers" className="space-y-4">
            <div className="space-y-3">
              {data.topPerformers.slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{product.title}</span>
                      {getTrendIcon(product.trend)}
                      <Badge variant="secondary">{formatNumber(product.variants)} variants</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Revenue:</span>
                        <span className="font-medium ml-1">{formatCurrency(product.revenue)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Units Sold:</span>
                        <span className="font-medium ml-1">{formatNumber(product.unitsSold)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Conversion:</span>
                        <span className="font-medium ml-1">{formatPercentage(product.conversionRate)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getTrendColor(product.trend)}`}>
                      #{index + 1}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatPercentage(product.profitMargin)} margin
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="underperformers" className="space-y-4">
            <div className="space-y-3">
              {data.underPerformers.slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{product.title}</span>
                      <Badge variant="outline" className="text-orange-600">Needs Attention</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Revenue:</span>
                        <span className="font-medium ml-1">{formatCurrency(product.revenue)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Units Sold:</span>
                        <span className="font-medium ml-1">{formatNumber(product.unitsSold)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Stock:</span>
                        <span className="font-medium ml-1">{formatNumber(product.stockLevel)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-orange-600">
                      {formatPercentage(product.conversionRate)}
                    </div>
                    <div className="text-xs text-gray-500">conversion</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryPerformance}>
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'revenue') return [formatCurrency(value), 'Revenue']
                      if (name === 'products') return [formatNumber(value), 'Products']
                      if (name === 'avgPrice') return [formatCurrency(value), 'Avg Price']
                      return [value, name]
                    }}
                  />
                  <Bar dataKey="revenue" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {data.categoryPerformance.map((category, index) => (
                <div key={category.category} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{category.category}</span>
                    <div className="text-sm text-gray-500">{formatNumber(category.products)} products</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(category.revenue)}</div>
                    <div className="text-sm text-gray-500">{formatCurrency(category.avgPrice)} avg</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            {data.inventoryAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-green-600 font-medium">All products are well stocked!</p>
                <p className="text-sm text-gray-500">No inventory alerts at this time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.inventoryAlerts.map((alert, index) => (
                  <div key={index} className={`flex items-center justify-between p-4 rounded-lg border ${alert.status === 'out' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`h-5 w-5 ${alert.status === 'out' ? 'text-red-500' : 'text-yellow-500'}`} />
                      <div>
                        <div className="font-medium">{alert.productTitle}</div>
                        <div className="text-sm text-gray-500">
                          {alert.status === 'out' ? 'Out of stock' : 'Low stock'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${alert.status === 'out' ? 'text-red-600' : 'text-yellow-600'}`}>
                        {formatNumber(alert.currentStock)}
                      </div>
                      <div className="text-sm text-gray-500">units left</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Export Product Report
          </Button>
          <Button variant="outline" size="sm">
            Create Product Ads
          </Button>
          {data.inventoryAlerts.length > 0 && (
            <Button variant="outline" size="sm" className="text-orange-600">
              Restock Alerts
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
