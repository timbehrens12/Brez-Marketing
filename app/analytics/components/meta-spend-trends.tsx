'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { ArrowUpRight, TrendingUp, DollarSign } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

export default function MetaSpendTrends({ brandId }: { brandId: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState({
    spendChange: 0,
    roasChange: 0,
    currentSpend: 0,
    previousSpend: 0,
    currentRoas: 0,
    previousRoas: 0
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/metrics/meta?brandId=${brandId}`)
        const result = await response.json()
        
        if (result.error) {
          throw new Error(result.error)
        }
        
        setData(result.dailyData || [])
        
        // Calculate percentage changes if we have enough data
        if (result.dailyData && result.dailyData.length >= 2) {
          const currentData = result.dailyData.slice(-1)[0];
          const previousData = result.dailyData.slice(-2)[0];
          
          if (currentData && previousData) {
            const spendChange = previousData.spend > 0 
              ? ((currentData.spend - previousData.spend) / previousData.spend) * 100 
              : 0;
              
            const roasChange = previousData.roas > 0 
              ? ((currentData.roas - previousData.roas) / previousData.roas) * 100 
              : 0;
              
            setMetrics({
              spendChange,
              roasChange,
              currentSpend: currentData.spend,
              previousSpend: previousData.spend,
              currentRoas: currentData.roas,
              previousRoas: previousData.roas
            });
          }
        }
      } catch (err) {
        console.error('Error fetching Meta trends:', err)
        setError('Failed to load Meta spend trends data')
      } finally {
        setLoading(false)
      }
    }

    if (brandId) {
      fetchData()
    }
  }, [brandId])

  if (loading) {
    return (
      <Card className="bg-[#111] border-[#333] shadow-lg">
        <CardContent className="pt-6 flex items-center justify-center h-[350px]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-6 w-32 bg-[#222] rounded mb-4"></div>
            <div className="h-40 w-full bg-[#222] rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-[#111] border-[#333] shadow-lg">
        <CardContent className="pt-6 text-red-500 flex items-center justify-center h-[350px]">
          {error}
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="bg-[#111] border-[#333] shadow-lg">
        <CardContent className="pt-6 text-gray-400 flex items-center justify-center h-[350px]">
          No Meta spend trends data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#111] border-[#333] shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            Spend & ROAS Trends
          </CardTitle>
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`text-xs cursor-help ${metrics.spendChange > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    Spend: {metrics.spendChange > 0 ? '↑' : '↓'} {Math.abs(metrics.spendChange).toFixed(1)}%
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#333] border-[#444]">
                  <p className="text-xs">
                    Today: ${Math.round(metrics.currentSpend)} vs Yesterday: ${Math.round(metrics.previousSpend)}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`text-xs cursor-help ${metrics.roasChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ROAS: {metrics.roasChange > 0 ? '↑' : '↓'} {Math.abs(metrics.roasChange).toFixed(1)}%
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#333] border-[#444]">
                  <p className="text-xs">
                    Today: {metrics.currentRoas.toFixed(1)}x vs Yesterday: {metrics.previousRoas.toFixed(1)}x
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth()+1}/${date.getDate()}`;
              }}
            />
            <YAxis yAxisId="left" stroke="#8884d8" />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
            <RechartsTooltip 
              contentStyle={{ 
                backgroundColor: '#222', 
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#fff'
              }} 
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="spend" 
              stroke="#8884d8" 
              name="Spend ($)" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5, stroke: '#8884d8', strokeWidth: 2 }}
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="roas" 
              stroke="#82ca9d" 
              name="ROAS (x)" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5, stroke: '#82ca9d', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
} 