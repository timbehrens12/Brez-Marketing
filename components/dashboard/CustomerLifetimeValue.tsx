"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, Loader2 } from 'lucide-react'

interface CustomerLifetimeValueProps {
  brandId: string
  isRefreshing?: boolean
}

interface LTVData {
  range: string
  count: number
  percentage: number
}

export function CustomerLifetimeValue({ brandId, isRefreshing = false }: CustomerLifetimeValueProps) {
  const [data, setData] = useState<LTVData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [averageLTV, setAverageLTV] = useState(0)
  const [medianLTV, setMedianLTV] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)

  useEffect(() => {
    if (brandId) {
      fetchLTVData()
    }
  }, [brandId])

  useEffect(() => {
    if (isRefreshing) {
      fetchLTVData()
    }
  }, [isRefreshing])

  const fetchLTVData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/shopify/customers/ltv?brandId=${brandId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch LTV data')
      }
      const responseData = await response.json()
      
      setData(responseData.distribution || [])
      setAverageLTV(responseData.averageLTV || 0)
      setMedianLTV(responseData.medianLTV || 0)
      setTotalCustomers(responseData.totalCustomers || 0)
    } catch (error) {
      console.error('Error fetching LTV data:', error)
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

  const renderBarChart = () => {
    return (
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="range" 
              tick={{ fill: '#9ca3af' }} 
              axisLine={{ stroke: '#333' }}
            />
            <YAxis 
              tick={{ fill: '#9ca3af' }} 
              axisLine={{ stroke: '#333' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              formatter={(value: number) => [`${value}%`, 'Percentage']}
              labelFormatter={(label) => `LTV Range: ${label}`}
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              itemStyle={{ color: '#e5e7eb' }}
              labelStyle={{ color: '#e5e7eb' }}
            />
            <Bar 
              dataKey="percentage" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
              name="Percentage of Customers"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const renderStats = () => {
    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1f2937] p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">Average LTV</div>
          <div className="text-xl font-bold text-white">{formatCurrency(averageLTV)}</div>
        </div>
        <div className="bg-[#1f2937] p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">Median LTV</div>
          <div className="text-xl font-bold text-white">{formatCurrency(medianLTV)}</div>
        </div>
        <div className="bg-[#1f2937] p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">Total Customers</div>
          <div className="text-xl font-bold text-white">{totalCustomers.toLocaleString()}</div>
        </div>
      </div>
    )
  }

  const renderDistributionTable = () => {
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">LTV Distribution</h4>
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-2">
          <div>Range</div>
          <div className="text-right">Customers</div>
          <div className="text-right">Percentage</div>
        </div>
        <div className="space-y-2">
          {data.map((item, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-center">
              <div className="text-sm text-gray-300">{item.range}</div>
              <div className="text-sm text-right">{item.count.toLocaleString()}</div>
              <div className="text-sm text-right text-gray-400">{item.percentage}%</div>
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
            <CardTitle className="text-white text-lg">Customer Lifetime Value</CardTitle>
            <CardDescription className="text-gray-400">
              Distribution of customer spending over time
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || isRefreshing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full bg-[#2A2A2A]" />
              <Skeleton className="h-20 w-full bg-[#2A2A2A]" />
              <Skeleton className="h-20 w-full bg-[#2A2A2A]" />
            </div>
            <Skeleton className="h-[300px] w-full bg-[#2A2A2A]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-[#2A2A2A]" />
              <Skeleton className="h-4 w-full bg-[#2A2A2A]" />
              <Skeleton className="h-4 w-full bg-[#2A2A2A]" />
            </div>
          </div>
        ) : data.length > 0 ? (
          <>
            {renderStats()}
            {renderBarChart()}
            {renderDistributionTable()}
          </>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
            <DollarSign className="h-16 w-16 mb-4 opacity-20" />
            <p>No lifetime value data available</p>
            <p className="text-sm mt-2">Sync customer data to see LTV insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 