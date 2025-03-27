'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { BarChart2, TrendingUp } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

// Define interface for meta analytics data
interface MetaAnalyticItem {
  campaign_name?: string;
  spend?: number | string;
  impressions?: number;
  clicks?: number;
  ctr?: number | string;
}

export default function MetaAdPerformance({ brandId }: { brandId: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState({
    ctrChange: 0,
    clicksChange: 0,
    currentCTR: 0,
    previousCTR: 0,
    currentClicks: 0,
    previousClicks: 0
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/analytics/meta?brandId=${brandId}`)
        const result = await response.json()
        
        if (result.error) {
          throw new Error(result.error)
        }
        
        // Ensure data is in the right format
        const formattedData = (result.data || []).map((item: MetaAnalyticItem) => ({
          campaign_name: item.campaign_name || 'Unknown Campaign',
          spend: typeof item.spend === 'string' ? parseFloat(item.spend) : item.spend || 0,
          impressions: item.impressions || 0,
          clicks: item.clicks || 0,
          ctr: typeof item.ctr === 'string' ? parseFloat(item.ctr) : item.ctr || 0
        }))
        
        setData(formattedData)
        
        // Calculate total metrics and changes if we have data from previous periods
        if (result.periodComparison) {
          const { current, previous } = result.periodComparison;
          
          const ctrChange = previous.ctr > 0 
            ? ((current.ctr - previous.ctr) / previous.ctr) * 100 
            : 0;
            
          const clicksChange = previous.clicks > 0 
            ? ((current.clicks - previous.clicks) / previous.clicks) * 100 
            : 0;
            
          setMetrics({
            ctrChange,
            clicksChange,
            currentCTR: current.ctr,
            previousCTR: previous.ctr,
            currentClicks: current.clicks,
            previousClicks: previous.clicks
          });
        }
      } catch (err) {
        console.error('Error fetching Meta analytics:', err)
        setError('Failed to load Meta ad performance data')
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
          No Meta ad performance data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#111] border-[#333] shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-green-400" />
            Campaign Performance
          </CardTitle>
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`text-xs cursor-help ${metrics.clicksChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    Clicks: {metrics.clicksChange > 0 ? '↑' : '↓'} {Math.abs(metrics.clicksChange).toFixed(1)}%
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#333] border-[#444]">
                  <p className="text-xs">
                    Today: {Math.round(metrics.currentClicks)} vs Yesterday: {Math.round(metrics.previousClicks)}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`text-xs cursor-help ${metrics.ctrChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    CTR: {metrics.ctrChange > 0 ? '↑' : '↓'} {Math.abs(metrics.ctrChange).toFixed(1)}%
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#333] border-[#444]">
                  <p className="text-xs">
                    Today: {(metrics.currentCTR * 100).toFixed(2)}% vs Yesterday: {(metrics.previousCTR * 100).toFixed(2)}%
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="campaign_name" stroke="#666" />
            <YAxis stroke="#666" />
            <RechartsTooltip 
              contentStyle={{ 
                backgroundColor: '#222', 
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#fff'
              }} 
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar 
              dataKey="spend" 
              fill="#8884d8" 
              name="Spend ($)" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="clicks" 
              fill="#82ca9d" 
              name="Clicks" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
} 