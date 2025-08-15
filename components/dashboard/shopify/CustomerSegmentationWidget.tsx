"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Users, Crown, Repeat, UserCheck, TrendingUp, DollarSign } from "lucide-react"
import { useState, useEffect } from "react"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatters"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

interface CustomerSegmentData {
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  highValueCustomers: number
  vipCustomers: number
  retentionRate: number
  averageCustomerValue: number
  avgOrderFrequency: number
  segments: Array<{
    name: string
    count: number
    percentage: number
    avgValue: number
    color: string
  }>
  topCustomers: Array<{
    email: string
    totalSpent: number
    ordersCount: number
    lastOrderDate: string
  }>
}

interface CustomerSegmentationWidgetProps {
  brandId: string
  dateRange: { from: Date; to: Date }
  connectionId: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export function CustomerSegmentationWidget({ brandId, dateRange, connectionId }: CustomerSegmentationWidgetProps) {
  const [data, setData] = useState<CustomerSegmentData | null>(null)
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

        const response = await fetch(`/api/shopify/customer-segments?${params}`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error('Error fetching customer segmentation data:', error)
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
      <Card className="col-span-2 bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-green-500" />
            Customer Segmentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-[#333] rounded animate-pulse"></div>
            <div className="h-4 bg-[#333] rounded animate-pulse"></div>
            <div className="h-4 bg-[#333] rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="col-span-2 bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-green-500" />
            Customer Segmentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">No customer segmentation data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-2 bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="h-5 w-5 text-green-500" />
          Customer Segmentation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-300">Total</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(data.totalCustomers)}</div>
            <div className="text-xs text-gray-400">Customers</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <UserCheck className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-300">New</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(data.newCustomers)}</div>
            <div className="text-xs text-gray-400">{formatPercentage((data.newCustomers / data.totalCustomers) * 100)}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Repeat className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-gray-300">Returning</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(data.returningCustomers)}</div>
            <div className="text-xs text-gray-400">{formatPercentage(data.retentionRate)}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-300">VIP</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(data.vipCustomers)}</div>
            <div className="text-xs text-gray-400">{formatPercentage((data.vipCustomers / data.totalCustomers) * 100)}</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">Customer Distribution</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.segments}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {data.segments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [formatNumber(value), 'Customers']}
                    labelFormatter={(label) => label}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">Average Value by Segment</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.segments}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(value), 'Avg Value']}
                    labelFormatter={(label) => label}
                  />
                  <Bar dataKey="avgValue" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Segment Details */}
                  <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">Segment Breakdown</h4>
            <div className="grid grid-cols-1 gap-3">
              {data.segments.map((segment, index) => (
                <div key={segment.name} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg border border-[#333]">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="font-medium text-white">{segment.name}</span>
                    <Badge variant="secondary">{formatNumber(segment.count)} customers</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-white">{formatCurrency(segment.avgValue)}</div>
                    <div className="text-xs text-gray-400">avg value</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        {/* Top Customers */}
        {data.topCustomers && data.topCustomers.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2 text-white">
              <Crown className="h-4 w-4 text-yellow-500" />
              Top Customers
            </h4>
            <div className="space-y-2">
              {data.topCustomers.slice(0, 5).map((customer, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-[#2a2a2a] rounded border border-[#333]">
                  <div>
                    <div className="font-medium text-sm text-white">{customer.email}</div>
                    <div className="text-xs text-gray-400">{formatNumber(customer.ordersCount)} orders</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-white">{formatCurrency(customer.totalSpent)}</div>
                    <div className="text-xs text-gray-400">LTV</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Create Lookalike Audience
          </Button>
          <Button variant="outline" size="sm">
            Export Customer List
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
