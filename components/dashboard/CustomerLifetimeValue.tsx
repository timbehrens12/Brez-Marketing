"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { DollarSign, Users, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface CustomerLifetimeValueProps {
  brandId: string
  isRefreshing?: boolean
}

interface LTVData {
  range: string
  value: number
  count: number
  color: string
}

export function CustomerLifetimeValue({ brandId, isRefreshing = false }: CustomerLifetimeValueProps) {
  const [data, setData] = useState<LTVData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [averageLTV, setAverageLTV] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hasLimitedData, setHasLimitedData] = useState(false)

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
    setError(null)
    try {
      const response = await fetch(`/api/shopify/customers/ltv?brandId=${brandId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch LTV data')
      }
      const responseData = await response.json()
      
      if (responseData.ltvRanges && responseData.ltvRanges.length > 0) {
        setData(responseData.ltvRanges)
        setAverageLTV(responseData.averageLTV || 0)
        setTotalCustomers(responseData.totalCustomers || 0)
        
        // Check if we have limited data
        setHasLimitedData(responseData.totalCustomers < 10 || responseData.ltvRanges.length <= 1)
      } else if (responseData.totalCustomers > 0) {
        // Create default data if we have customers but no LTV ranges
        const defaultData = [
          {
            range: "$0 - $100",
            value: responseData.averageLTV || 0,
            count: responseData.totalCustomers || 0,
            color: "#3b82f6"
          }
        ];
        setData(defaultData);
        setAverageLTV(responseData.averageLTV || 0);
        setTotalCustomers(responseData.totalCustomers || 0);
        setHasLimitedData(true);
      } else {
        setData([]);
        setAverageLTV(0);
        setTotalCustomers(0);
      }
      
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching LTV data:', error)
      setError('Failed to load customer lifetime value data. Please try again later.')
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

  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#2A2A2A] p-3 border border-[#3A3A3A] rounded-md shadow-lg">
          <p className="font-medium text-white">{label}</p>
          <div className="flex justify-between mt-2">
            <span className="text-gray-400 text-sm">Average LTV:</span>
            <span className="text-white text-sm font-medium">{formatCurrency(payload[0].value)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Customers:</span>
            <span className="text-white text-sm font-medium">{payload[0].payload.count.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">% of Total:</span>
            <span className="text-white text-sm font-medium">
              {Math.round((payload[0].payload.count / totalCustomers) * 100)}%
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
        <DollarSign className="h-16 w-16 mb-4 opacity-20" />
        <p>No customer lifetime value data available</p>
        <p className="text-sm mt-2">Sync customer data to see LTV insights</p>
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
    if (!hasLimitedData) return null;
    
    return (
      <div className="bg-blue-900/20 border border-blue-800 rounded-md p-3 mb-4">
        <div className="flex items-start">
          <Users className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-300">
              Limited customer data available. More detailed LTV analysis will appear as your customer base grows and makes more purchases.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg">Customer Lifetime Value</CardTitle>
        <CardDescription className="text-gray-400">
          Average revenue per customer over time
        </CardDescription>
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
                  {formatCurrency(averageLTV)}
                </div>
                <div className="text-sm text-gray-400">
                  Average Lifetime Value
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {lastUpdated && `Last updated: ${format(lastUpdated, 'MMM d, yyyy h:mm a')}`}
              </div>
            </div>
            
            {renderLimitedDataMessage()}
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fill: '#9CA3AF' }} 
                    angle={-45} 
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fill: '#9CA3AF' }} 
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={renderCustomTooltip} />
                  <Bar 
                    dataKey="value" 
                    name="Average LTV" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
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