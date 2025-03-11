"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Users, Loader2 } from 'lucide-react'

interface CustomerSegmentationProps {
  brandId: string
  isRefreshing?: boolean
}

interface SegmentData {
  segment: string
  count: number
  revenue: number
  averageOrderValue: number
  color: string
}

export function CustomerSegmentation({ brandId, isRefreshing = false }: CustomerSegmentationProps) {
  const [data, setData] = useState<SegmentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'count' | 'revenue'>('count')

  useEffect(() => {
    if (brandId) {
      fetchSegmentationData()
    }
  }, [brandId])

  useEffect(() => {
    if (isRefreshing) {
      fetchSegmentationData()
    }
  }, [isRefreshing])

  const fetchSegmentationData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/shopify/customers/segments?brandId=${brandId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch segmentation data')
      }
      const responseData = await response.json()
      
      // Assign colors to segments
      const segmentColors: Record<string, string> = {
        'VIP': '#f97316', // Orange
        'Loyal': '#3b82f6', // Blue
        'Returning': '#10b981', // Green
        'New': '#8b5cf6', // Purple
        'At Risk': '#ef4444', // Red
        'Inactive': '#6b7280', // Gray
      }
      
      const formattedData = responseData.segments.map((segment: any) => ({
        ...segment,
        color: segmentColors[segment.segment] || '#6b7280'
      }))
      
      setData(formattedData)
    } catch (error) {
      console.error('Error fetching segmentation data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }

  const getTotalCustomers = () => {
    return data.reduce((sum, segment) => sum + segment.count, 0)
  }

  const getTotalRevenue = () => {
    return data.reduce((sum, segment) => sum + segment.revenue, 0)
  }

  const renderPieChart = () => {
    const chartData = data.map(segment => ({
      name: segment.segment,
      value: view === 'count' ? segment.count : segment.revenue,
      color: segment.color
    }))

    return (
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => 
                view === 'count' 
                  ? `${value.toLocaleString()} customers` 
                  : formatCurrency(value)
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const renderSegmentTable = () => {
    const totalValue = view === 'count' ? getTotalCustomers() : getTotalRevenue()
    
    return (
      <div className="mt-4">
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-2">
          <div>Segment</div>
          <div className="text-right">
            {view === 'count' ? 'Customers' : 'Revenue'}
          </div>
          <div className="text-right">% of Total</div>
        </div>
        <div className="space-y-2">
          {data.map((segment, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-center">
              <div className="flex items-center">
                <div 
                  className="h-3 w-3 rounded-full mr-2" 
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm text-gray-300">{segment.segment}</span>
              </div>
              <div className="text-sm text-right">
                {view === 'count' 
                  ? segment.count.toLocaleString()
                  : formatCurrency(segment.revenue)
                }
              </div>
              <div className="text-sm text-right text-gray-400">
                {formatPercentage(
                  view === 'count' ? segment.count : segment.revenue, 
                  totalValue
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white text-lg">Customer Segments</CardTitle>
            <CardDescription className="text-gray-400">
              Breakdown of customer segments
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setView('count')}
              className={`px-3 py-1 text-xs rounded-md ${
                view === 'count' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#333]'
              }`}
            >
              By Count
            </button>
            <button
              onClick={() => setView('revenue')}
              className={`px-3 py-1 text-xs rounded-md ${
                view === 'revenue' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#333]'
              }`}
            >
              By Revenue
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || isRefreshing ? (
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full bg-[#2A2A2A]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-[#2A2A2A]" />
              <Skeleton className="h-4 w-full bg-[#2A2A2A]" />
              <Skeleton className="h-4 w-full bg-[#2A2A2A]" />
            </div>
          </div>
        ) : data.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-2xl font-bold text-white">
                  {view === 'count' 
                    ? getTotalCustomers().toLocaleString()
                    : formatCurrency(getTotalRevenue())
                  }
                </div>
                <div className="text-sm text-gray-400">
                  {view === 'count' ? 'Total Customers' : 'Total Revenue'}
                </div>
              </div>
            </div>
            {renderPieChart()}
            {renderSegmentTable()}
          </>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
            <Users className="h-16 w-16 mb-4 opacity-20" />
            <p>No segmentation data available</p>
            <p className="text-sm mt-2">Sync customer data to see segmentation insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 