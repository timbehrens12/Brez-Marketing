"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Users, Loader2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface CustomerSegmentationProps {
  brandId: string
  isRefreshing?: boolean
}

interface SegmentData {
  name: string
  value: number
  color: string
  description: string
}

export function CustomerSegmentation({ brandId, isRefreshing = false }: CustomerSegmentationProps) {
  const [data, setData] = useState<SegmentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'count' | 'percentage'>('percentage')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (brandId) {
      fetchSegmentData()
    }
  }, [brandId])

  useEffect(() => {
    if (isRefreshing) {
      fetchSegmentData()
    }
  }, [isRefreshing])

  const fetchSegmentData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/shopify/customers/segments?brandId=${brandId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch segment data')
      }
      const responseData = await response.json()
      
      if (responseData.segments && responseData.segments.length > 0) {
        setData(responseData.segments)
        setTotalCustomers(responseData.totalCustomers || 0)
      } else {
        // If no segments are returned, create default segments
        setData(createDefaultSegments(responseData.totalCustomers || 0))
        setTotalCustomers(responseData.totalCustomers || 0)
      }
      
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching segment data:', error)
      setError('Failed to load customer segments. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  // Create default segments if no data is available
  const createDefaultSegments = (total: number): SegmentData[] => {
    if (total === 0) return [];
    
    return [
      {
        name: 'New Customers',
        value: total,
        color: '#3b82f6',
        description: 'Customers who have recently joined'
      }
    ];
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`
  }

  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#2A2A2A] p-3 border border-[#3A3A3A] rounded-md shadow-lg">
          <p className="font-medium text-white">{data.name}</p>
          <p className="text-gray-300 text-sm">{data.description}</p>
          <div className="flex justify-between mt-2">
            <span className="text-gray-400 text-sm">Customers:</span>
            <span className="text-white text-sm font-medium">{data.value.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Percentage:</span>
            <span className="text-white text-sm font-medium">
              {formatPercentage(data.value / totalCustomers)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderNoDataMessage = () => {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
        <Users className="h-16 w-16 mb-4 opacity-20" />
        <p>No customer segment data available</p>
        <p className="text-sm mt-2">Sync customer data to see segmentation insights</p>
      </div>
    );
  };

  const renderErrorMessage = () => {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
        <AlertCircle className="h-16 w-16 mb-4 text-amber-500/50" />
        <p className="text-amber-500">{error}</p>
        <p className="text-sm mt-2">Try refreshing the data or check your connection</p>
      </div>
    );
  };

  const renderLimitedDataMessage = () => {
    if (totalCustomers > 5) return null;
    
    return (
      <div className="bg-blue-900/20 border border-blue-800 rounded-md p-3 mb-4">
        <div className="flex items-start">
          <Users className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-300">
              Limited customer data available. More detailed segmentation will appear as your customer base grows.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white text-lg">Customer Segmentation</CardTitle>
            <CardDescription className="text-gray-400">
              Customer groups based on behavior
            </CardDescription>
          </div>
          <Tabs defaultValue="percentage" className="w-[200px]" onValueChange={(v) => setView(v as 'count' | 'percentage')}>
            <TabsList className="bg-[#2A2A2A]">
              <TabsTrigger value="percentage" className="data-[state=active]:bg-blue-600">Percentage</TabsTrigger>
              <TabsTrigger value="count" className="data-[state=active]:bg-blue-600">Count</TabsTrigger>
            </TabsList>
          </Tabs>
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
        ) : error ? (
          renderErrorMessage()
        ) : data.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-2xl font-bold text-white">
                  {totalCustomers.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">
                  Total Customers
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {lastUpdated && `Last updated: ${format(lastUpdated, 'MMM d, yyyy h:mm a')}`}
              </div>
            </div>
            
            {renderLimitedDataMessage()}
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => view === 'percentage' ? formatPercentage(percent) : ''}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={renderCustomTooltip} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    formatter={(value, entry, index) => {
                      const item = data[index];
                      return (
                        <span className="text-gray-300">
                          {value} {view === 'count' ? `(${item.value.toLocaleString()})` : `(${formatPercentage(item.value / totalCustomers)})`}
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          renderNoDataMessage()
        )}
      </CardContent>
    </Card>
  )
} 