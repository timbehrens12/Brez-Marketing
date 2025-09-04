"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { BarChart3, Settings2, TrendingUp } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { useBrandContext } from "@/lib/context/BrandContext"
import { format } from 'date-fns'

interface PerformanceData {
  day: string
  date: string
  meta: {
    spend: number
    roas: number
    impressions: number
    clicks: number
    conversions: number
  }
  tiktok: {
    spend: number
    roas: number
    impressions: number
    clicks: number
    conversions: number
  }
  google: {
    spend: number
    roas: number
    impressions: number
    clicks: number
    conversions: number
  }
}

interface PerformanceChartProps {
  preloadedPerformanceData?: any[]
}

export default function PerformanceChart({ preloadedPerformanceData }: PerformanceChartProps = {}) {
  
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>(preloadedPerformanceData || [])
  const [selectedMetric, setSelectedMetric] = useState<'spend' | 'roas' | 'impressions' | 'clicks' | 'conversions'>('spend')
  const [enabledPlatforms, setEnabledPlatforms] = useState({
    meta: true,
    tiktok: false,
    google: false
  })

  // Use preloaded performance data when it changes
  useEffect(() => {
    if (preloadedPerformanceData && preloadedPerformanceData.length > 0) {
      setPerformanceData(preloadedPerformanceData)
    }
  }, [preloadedPerformanceData])

  const togglePlatform = (platform: 'meta' | 'tiktok' | 'google') => {
    setEnabledPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }))
  }

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'spend': return 'Ad Spend'
      case 'roas': return 'ROAS'
      case 'impressions': return 'Impressions'
      case 'clicks': return 'Clicks'
      case 'conversions': return 'Conversions'
      default: return 'Performance'
    }
  }

  // Prepare chart data
  const chartData = performanceData.map(item => ({
    day: item.day,
    date: item.date,
    Meta: enabledPlatforms.meta ? item.meta[selectedMetric] : 0,
    TikTok: enabledPlatforms.tiktok ? item.tiktok[selectedMetric] : 0,
    Google: enabledPlatforms.google ? item.google[selectedMetric] : 0
  }))

  // Platform colors
  const platformColors = {
    Meta: '#6b7280',  // Gray instead of blue
    TikTok: '#FE2C55',
    Google: '#4285F4'
  }

  return (
    <div className="bg-gradient-to-br from-[#0f0f0f] via-[#111] to-[#0a0a0a] border border-[#333]/50 rounded-2xl shadow-2xl backdrop-blur-sm h-full flex flex-col">
      {/* Modern Compact Header */}
      <div className="p-4 border-b border-[#333]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg 
                          flex items-center justify-center border border-green-500/20">
              <BarChart3 className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Performance Trends</h2>
              <p className="text-gray-400 text-xs">{getMetricLabel()} over time</p>
            </div>
          </div>
          
          {/* Compact Controls */}
          <div className="flex items-center gap-2">
            {/* Metric Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                <DropdownMenuLabel>Metric</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#2a2a2a]" />
                <DropdownMenuItem onClick={() => setSelectedMetric('spend')}>
                  Ad Spend
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedMetric('roas')}>
                  ROAS
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedMetric('impressions')}>
                  Impressions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedMetric('clicks')}>
                  Clicks
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedMetric('conversions')}>
                  Conversions
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#2a2a2a]" />
                <DropdownMenuLabel>Platforms</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={enabledPlatforms.meta}
                  onCheckedChange={() => togglePlatform('meta')}
                >
                  <Image 
                    src="https://i.imgur.com/6hyyRrs.png" 
                    alt="Meta" 
                    width={14} 
                    height={14} 
                    className="object-contain mr-2"
                  />
                  Meta
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={enabledPlatforms.tiktok}
                  onCheckedChange={() => togglePlatform('tiktok')}
                  disabled
                >
                  <Image 
                    src="https://i.imgur.com/AXHa9UT.png" 
                    alt="TikTok" 
                    width={14} 
                    height={14} 
                    className="object-contain grayscale opacity-40 mr-2"
                  />
                  TikTok (Not Connected)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={enabledPlatforms.google}
                  onCheckedChange={() => togglePlatform('google')}
                  disabled
                >
                  <Image 
                    src="https://i.imgur.com/TavV4UJ.png" 
                    alt="Google Ads" 
                    width={14} 
                    height={14} 
                    className="object-contain grayscale opacity-40 mr-2"
                  />
                  Google Ads (Not Connected)
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Modern Chart Content */}
      <div className="flex-1 p-4">
        {chartData.length > 0 ? (
          <div className="h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="metaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6b7280" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="tiktokGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FE2C55" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FE2C55" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="googleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4285F4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4285F4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" opacity={0.5} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any, name: string) => [
                    selectedMetric === 'spend' ? `$${Number(value).toFixed(2)}` :
                    selectedMetric === 'roas' ? `${Number(value).toFixed(2)}x` :
                    Number(value).toLocaleString(),
                    name
                  ]}
                />
                {enabledPlatforms.meta && (
                  <Area
                    type="monotone"
                    dataKey="Meta"
                    stroke={platformColors.Meta}
                    strokeWidth={2}
                    fill="url(#metaGradient)"
                  />
                )}
                {enabledPlatforms.tiktok && (
                  <Area
                    type="monotone"
                    dataKey="TikTok"
                    stroke={platformColors.TikTok}
                    strokeWidth={2}
                    fill="url(#tiktokGradient)"
                  />
                )}
                {enabledPlatforms.google && (
                  <Area
                    type="monotone"
                    dataKey="Google"
                    stroke={platformColors.Google}
                    strokeWidth={2}
                    fill="url(#googleGradient)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-2">No Performance Data</h3>
              <p className="text-gray-400 text-sm">
                Performance trends will appear here once data is available
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}