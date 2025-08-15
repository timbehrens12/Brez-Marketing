"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, RefreshCw, TrendingUp, TrendingDown } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { DateRange } from 'react-day-picker'

interface MarginData {
  order_id: string
  order_name: string
  created_at: string
  product_title: string
  quantity: number
  unit_price: number
  unit_cost: number
  line_total: number
  total_cost: number
  line_profit: number
  margin_percentage: number
}

interface MarginSummary {
  total_revenue: number
  total_cost: number
  total_profit: number
  overall_margin: number
  orders_analyzed: number
}

interface ProductPerformance {
  product_title: string
  total_revenue: number
  total_cost: number
  total_profit: number
  units_sold: number
  margin_percentage: number
}

interface MarginAnalysisWidgetProps {
  connectionId: string
  dateRange?: DateRange
  className?: string
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

export function MarginAnalysisWidget({ 
  connectionId, 
  dateRange,
  className = ""
}: MarginAnalysisWidgetProps) {
  const [data, setData] = useState<{
    summary: MarginSummary,
    line_items: MarginData[],
    top_products: ProductPerformance[],
    bottom_products: ProductPerformance[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = async () => {
    if (!connectionId) return
    
    setIsLoading(true)
    setData(null) // Clear existing data to prevent flashing
    
    try {
      const params = new URLSearchParams({
        connectionId
      })

      if (dateRange?.from && dateRange?.to) {
        params.append('dateRangeStart', dateRange.from.toISOString().split('T')[0])
        params.append('dateRangeEnd', dateRange.to.toISOString().split('T')[0])
      }

      const response = await fetch(`/api/shopify/margin-analysis?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data || null)
      } else {
        console.error('Error fetching margin analysis:', result.error)
      }
    } catch (error) {
      console.error('Error fetching margin analysis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [connectionId, dateRange])

  const chartData = data?.top_products?.slice(0, 8).map(item => ({
    name: item.product_title.length > 20 ? item.product_title.substring(0, 20) + '...' : item.product_title,
    margin: item.margin_percentage,
    profit: item.total_profit,
    revenue: item.total_revenue
  })) || []

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{label}</p>
          <p className="text-green-400">Margin: {data.margin.toFixed(1)}%</p>
          <p className="text-blue-400">Profit: ${data.profit.toFixed(2)}</p>
          <p className="text-yellow-400">Revenue: ${data.revenue.toFixed(2)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className={`bg-[#111] border-[#333] shadow-md overflow-hidden transition-all duration-200 hover:border-[#444] ${className}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <CardTitle className="text-sm font-medium text-gray-200">Profit Margin Analysis</CardTitle>
          </div>
          <Button
            onClick={fetchData}
            disabled={isLoading}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-[#1a1a1a]"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {isLoading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-4">
              <div className="h-4 bg-gray-800 rounded animate-pulse" />
              <div className="h-4 bg-gray-800 rounded animate-pulse" />
              <div className="h-4 bg-gray-800 rounded animate-pulse" />
              <div className="h-4 bg-gray-800 rounded animate-pulse" />
            </div>
            <div className="h-48 bg-gray-800/50 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-800/30 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-800/30 rounded animate-pulse w-1/2" />
            </div>
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Total Revenue</span>
                <p className="text-lg md:text-xl font-bold text-white">${data.summary.total_revenue.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-400">Total Cost</span>
                <p className="text-lg md:text-xl font-bold text-white">${data.summary.total_cost.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-400">Total Profit</span>
                <p className="text-lg md:text-xl font-bold text-green-400">${data.summary.total_profit.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-400">Avg Margin</span>
                <p className="text-lg md:text-xl font-bold text-white">{data.summary.overall_margin.toFixed(1)}%</p>
              </div>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="margin" 
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Top Performing Products</h4>
                <div className="space-y-2">
                  {data.top_products.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-[#333] last:border-b-0">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          {product.margin_percentage > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          )}
                          <span className="text-gray-300 font-medium truncate max-w-[200px]">
                            {product.product_title}
                          </span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex gap-4 text-xs">
                          <span className="text-green-400">{product.margin_percentage.toFixed(1)}%</span>
                          <span className="text-blue-400">${product.total_profit.toFixed(2)}</span>
                        </div>
                        <div className="text-gray-500 text-xs">
                          {product.units_sold} units sold
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {data.bottom_products.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">Products Needing Attention</h4>
                  <div className="space-y-2">
                    {data.bottom_products.slice(0, 3).map((product, index) => (
                      <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-[#333] last:border-b-0">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-3 h-3 text-red-400" />
                          <span className="text-gray-300 truncate max-w-[200px]">
                            {product.product_title}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-red-400 text-xs">{product.margin_percentage.toFixed(1)}%</div>
                          <div className="text-gray-500 text-xs">{product.units_sold} units</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No margin data available</p>
            <p className="text-sm text-gray-500">Margin analysis requires product cost data from inventory items</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
