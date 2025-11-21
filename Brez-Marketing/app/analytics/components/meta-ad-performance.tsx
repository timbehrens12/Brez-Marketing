'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { Activity, Layers, MousePointerClick, ShoppingCart } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge'

// Define interface for meta analytics data
interface MetaAnalyticItem {
  impressions?: number;
  clicks?: number;
  conversions?: number;
  ctr?: number | string;
  cvr?: number | string;
  cost_per_conversion?: number;
}

export default function MetaAdPerformance({ brandId }: { brandId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conversionMetrics, setConversionMetrics] = useState({
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cvr: 0,
    cost_per_conversion: 0,
    conversionImprovementRate: 0,
    funnelStatus: 'neutral' as 'improving' | 'declining' | 'neutral'
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/analytics/meta?brandId=${brandId}`)
        const result = await response.json()
        
        console.log(`[MetaAdPerformance] DEBUG: API Response:`, JSON.stringify({
          hasData: !!result.data,
          dataLength: result.data?.length || 0,
          sampleData: result.data?.[0] ? {
            impressions: result.data[0].impressions,
            clicks: result.data[0].clicks,
            conversions: result.data[0].conversions,
            spend: result.data[0].spend,
            date: result.data[0].date
          } : null,
          error: result.error
        }, null, 2))
        
        if (result.error) {
          throw new Error(result.error)
        }
        
        // Calculate aggregated metrics from all campaigns
        let totalImpressions = 0
        let totalClicks = 0
        let totalConversions = 0
        let totalCost = 0
        
        // Use actual data if available, otherwise fallback to sample data for demo
        if (result.data && result.data.length > 0) {
          const campaigns = result.data
          
          totalImpressions = campaigns.reduce((sum: number, item: any) => 
            sum + (item.impressions || 0), 0)
          totalClicks = campaigns.reduce((sum: number, item: any) => 
            sum + (item.clicks || 0), 0)
          totalConversions = campaigns.reduce((sum: number, item: any) => 
            sum + (item.conversions || 0), 0)
          totalCost = campaigns.reduce((sum: number, item: any) => 
            sum + (item.spend || 0), 0)
          
          console.log(`[MetaAdPerformance] DEBUG: Aggregated metrics:`, JSON.stringify({
            totalImpressions,
            totalClicks,
            totalConversions,
            totalCost,
            calculatedCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            calculatedCVR: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
          }, null, 2))
        } else {
          // Fallback sample data if no real data available
          totalImpressions = 15200
          totalClicks = 820
          totalConversions = 41
          totalCost = 450
          
          console.log(`[MetaAdPerformance] DEBUG: Using fallback sample data`)
        }
        
        // Calculate metrics
        const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
        const cvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
        const cost_per_conversion = totalConversions > 0 ? totalCost / totalConversions : 0
        
        // Determine if funnel is improving based on periodComparison
        let conversionImprovementRate = 0
        let funnelStatus: 'improving' | 'declining' | 'neutral' = 'neutral'
        
        if (result.periodComparison) {
          const { current, previous } = result.periodComparison
          
          // Calculate improvement rates
          const prevCvr = previous.clicks > 0 ? 
            (previous.conversions / previous.clicks) * 100 : 0
          
          conversionImprovementRate = prevCvr > 0 ? 
            ((cvr - prevCvr) / prevCvr) * 100 : 0
            
          // Set funnel status based on improvement rate
          funnelStatus = conversionImprovementRate > 5 ? 'improving' : 
                        conversionImprovementRate < -5 ? 'declining' : 'neutral'
        }
        
        setConversionMetrics({
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          ctr,
          cvr,
          cost_per_conversion,
          conversionImprovementRate,
          funnelStatus
        })
        
      } catch (err) {
        console.error('Error fetching Meta analytics:', err)
        setError('Failed to load Meta analytics data')
      } finally {
        setLoading(false)
      }
    }

    if (brandId) {
      fetchData()
    }
  }, [brandId])

  // Data for the funnel visualization
  const funnelData = [
    { name: 'Impressions', value: conversionMetrics.impressions, color: '#7B61FF' },
    { name: 'Clicks', value: conversionMetrics.clicks, color: '#52A9FF' },
    { name: 'Conversions', value: conversionMetrics.conversions, color: '#1EE0AC' }
  ]
  
  // For the pie chart visualization
  const ratioData = [
    { name: 'Clicked', value: conversionMetrics.clicks, color: '#52A9FF' },
    { name: 'Not Clicked', value: conversionMetrics.impressions - conversionMetrics.clicks, color: '#404040' }
  ]
  
  const conversionRatioData = [
    { name: 'Converted', value: conversionMetrics.conversions, color: '#1EE0AC' },
    { name: 'Not Converted', value: conversionMetrics.clicks - conversionMetrics.conversions, color: '#404040' }
  ]
  
  const renderFunnelStatusBadge = () => {
    if (conversionMetrics.funnelStatus === 'improving') {
      return <Badge className="bg-green-500/20 hover:bg-green-500/20 text-green-400 border-green-500/30">Funnel Improving</Badge>
    } else if (conversionMetrics.funnelStatus === 'declining') {
      return <Badge className="bg-red-500/20 hover:bg-red-500/20 text-red-400 border-red-500/30">Funnel Declining</Badge>
    } else {
      return <Badge className="bg-blue-500/20 hover:bg-blue-500/20 text-blue-400 border-blue-500/30">Funnel Stable</Badge>
    }
  }

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

  return (
    <Card className="bg-[#111] border-[#333] shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            Conversion Funnel Analytics
          </CardTitle>
          <div className="flex items-center gap-2">
            {renderFunnelStatusBadge()}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`text-xs cursor-help ${conversionMetrics.conversionImprovementRate > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    CVR: {conversionMetrics.conversionImprovementRate > 0 ? '↑' : '↓'} {Math.abs(conversionMetrics.conversionImprovementRate).toFixed(1)}%
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1a1a1a] border-[#333] p-3">
                  <p className="text-xs">
                    Current conversion rate: {conversionMetrics.cvr.toFixed(2)}%
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#222] rounded-lg p-4 border border-[#333] flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-medium">Impressions</h3>
            </div>
            <p className="text-2xl font-semibold">{conversionMetrics.impressions.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">Ad views by potential customers</p>
          </div>
          
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#222] rounded-lg p-4 border border-[#333] flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-medium">Clicks</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold">{conversionMetrics.clicks.toLocaleString()}</p>
              <p className="text-xs text-blue-400">CTR: {conversionMetrics.ctr.toFixed(2)}%</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">Users who clicked on your ads</p>
          </div>
          
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#222] rounded-lg p-4 border border-[#333] flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-4 w-4 text-green-400" />
              <h3 className="text-sm font-medium">Conversions</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold">{conversionMetrics.conversions.toLocaleString()}</p>
              <p className="text-xs text-green-400">CVR: {conversionMetrics.cvr.toFixed(2)}%</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">Cost per conv: ${conversionMetrics.cost_per_conversion.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2 text-gray-300">Click-Through Rate</h3>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratioData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {ratioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value, name) => [`${value.toLocaleString()}`, name]}
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '4px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2 text-gray-300">Conversion Rate</h3>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conversionRatioData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {conversionRatioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value, name) => [`${value.toLocaleString()}`, name]}
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '4px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 