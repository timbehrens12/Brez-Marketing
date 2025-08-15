"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Percent, TrendingUp, TrendingDown, DollarSign, Clock, Target } from "lucide-react"
import { useState, useEffect } from "react"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatters"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface DiscountPerformanceData {
  totalDiscounts: number
  activeDiscounts: number
  totalUsage: number
  totalDiscountAmount: number
  avgDiscountRate: number
  bestPerformers: Array<{
    code: string
    type: string
    amount: number
    usageCount: number
    usageRate: number
    revenue: number
    status: 'active' | 'expired' | 'scheduled'
  }>
  underPerformers: Array<{
    code: string
    type: string
    amount: number
    usageCount: number
    usageLimit: number
    daysActive: number
  }>
  discountTypes: Array<{
    type: string
    count: number
    totalUsage: number
    avgPerformance: number
  }>
  revenueImpact: {
    withDiscount: number
    withoutDiscount: number
    percentageIncrease: number
  }
}

interface DiscountPerformanceWidgetProps {
  brandId: string
  dateRange: { from: Date; to: Date }
  connectionId: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export function DiscountPerformanceWidget({ brandId, dateRange, connectionId }: DiscountPerformanceWidgetProps) {
  const [data, setData] = useState<DiscountPerformanceData | null>(null)
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

        const response = await fetch(`/api/shopify/discount-performance?${params}`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error('Error fetching discount performance data:', error)
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Discount Performance
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Discount Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No discount performance data available</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDiscountTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'percentage': return 'text-blue-600'
      case 'fixed_amount': return 'text-green-600'
      case 'shipping': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Percent className="h-5 w-5 text-green-500" />
          Discount Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-300">Total Usage</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(data.totalUsage)}</div>
            <div className="text-xs text-gray-400">Across {formatNumber(data.totalDiscounts)} codes</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-300">Discount Amount</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(data.totalDiscountAmount)}</div>
            <div className="text-xs text-gray-400">{formatPercentage(data.avgDiscountRate)} avg rate</div>
          </div>
        </div>

        {/* Revenue Impact */}
        <div className="p-4 bg-gradient-to-r from-blue-900/20 to-green-900/20 rounded-lg border border-[#333]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="font-medium text-white">Revenue Impact</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-300">Revenue with Discounts</div>
              <div className="text-xl font-bold text-green-400">{formatCurrency(data.revenueImpact.withDiscount)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-300">Estimated without Discounts</div>
              <div className="text-xl font-bold text-gray-300">{formatCurrency(data.revenueImpact.withoutDiscount)}</div>
            </div>
          </div>
          <div className="mt-2 text-sm">
            <span className="text-green-400 font-medium">
              +{formatPercentage(data.revenueImpact.percentageIncrease)} revenue increase
            </span>
            <span className="text-gray-400"> from discount strategy</span>
          </div>
        </div>

        {/* Active vs Total Discounts */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Active Discounts</div>
          <div className="flex items-center gap-2">
            <Progress 
              value={(data.activeDiscounts / data.totalDiscounts) * 100} 
              className="w-24 h-2"
            />
            <span className="text-sm font-medium">
              {formatNumber(data.activeDiscounts)}/{formatNumber(data.totalDiscounts)}
            </span>
          </div>
        </div>

        {/* Discount Types Chart */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Discount Types Performance</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.discountTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="totalUsage"
                >
                  {data.discountTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [formatNumber(value), 'Usage']}
                  labelFormatter={(label) => label}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {data.discountTypes.map((type, index) => (
              <div key={type.type} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className={getDiscountTypeColor(type.type)}>{type.type}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatNumber(type.totalUsage)}</div>
                  <div className="text-xs text-gray-500">{formatNumber(type.count)} codes</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best Performers */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Top Performing Codes
          </h4>
          <div className="space-y-2">
            {data.bestPerformers.slice(0, 3).map((discount, index) => (
              <div key={discount.code} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium font-mono text-sm">{discount.code}</span>
                    {getStatusBadge(discount.status)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {discount.type} • {formatNumber(discount.usageCount)} uses • {formatPercentage(discount.usageRate)} rate
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(discount.revenue)}</div>
                  <div className="text-xs text-gray-500">revenue</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Underperformers */}
        {data.underPerformers.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              Needs Attention
            </h4>
            <div className="space-y-2">
              {data.underPerformers.slice(0, 2).map((discount, index) => (
                <div key={discount.code} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium font-mono text-sm">{discount.code}</span>
                      <Badge variant="outline" className="text-orange-600">Low Usage</Badge>
                    </div>
                    <div className="text-xs text-gray-600">
                      {formatNumber(discount.usageCount)}/{formatNumber(discount.usageLimit)} uses • {formatNumber(discount.daysActive)} days active
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-orange-600">
                      {formatPercentage((discount.usageCount / discount.usageLimit) * 100)}
                    </div>
                    <div className="text-xs text-gray-500">utilization</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Create New Discount
          </Button>
          <Button variant="outline" size="sm">
            Optimize Existing
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
