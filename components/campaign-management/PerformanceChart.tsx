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
  const { selectedBrandId } = useBrandContext()
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>(preloadedPerformanceData || [])
  const [selectedMetric, setSelectedMetric] = useState<'spend' | 'roas' | 'impressions' | 'clicks' | 'conversions'>('spend')
  const [enabledPlatforms, setEnabledPlatforms] = useState({
    meta: true,
    tiktok: false,
    google: false
  })
  // Remove loading state
  // const [isLoading, setIsLoading] = useState(true)

  // Use preloaded performance data when it changes
  useEffect(() => {
    if (preloadedPerformanceData && preloadedPerformanceData.length > 0) {
      // console.log('[PerformanceChart] Using preloaded performance data:', preloadedPerformanceData.length)
      setPerformanceData(preloadedPerformanceData)
    }
  }, [preloadedPerformanceData])

  // Fetch performance data - only if no preloaded data
  useEffect(() => {
    if (!selectedBrandId) return

    if (preloadedPerformanceData && preloadedPerformanceData.length > 0) {
      // console.log('[PerformanceChart] Using preloaded data, skipping fetch')
      return
    }

    const fetchPerformanceData = async (forceRefresh = false) => {
      // console.log('[PerformanceChart] No preloaded data, fetching from API...')
      // Remove loading state
      // setIsLoading(true)
      try {
        const response = await fetch('/api/ai/daily-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify({ 
            brandId: selectedBrandId,
            forceRegenerate: forceRefresh,
            timestamp: Date.now()
          })
        })
        if (response.ok) {
          const data = await response.json()
          
          // console.log('[PerformanceChart] API Response:', data)
          // console.log('[PerformanceChart] Weekly Performance:', data.report?.weeklyPerformance)
          
          // Transform the data to include all platforms - use same structure as AI Daily Report
          const transformedData = data.report?.weeklyPerformance?.map((day: any) => ({
            day: day.day,
            date: day.date,
            meta: {
              spend: day.spend || 0,
              roas: day.roas || 0,
              impressions: day.impressions || 0,
              clicks: day.clicks || 0,
              conversions: day.conversions || 0
            },
            // Placeholder data for other platforms - in real implementation, fetch from respective APIs
            tiktok: {
              spend: 0,
              roas: 0,
              impressions: 0,
              clicks: 0,
              conversions: 0
            },
            google: {
              spend: 0,
              roas: 0,
              impressions: 0,
              clicks: 0,
              conversions: 0
            }
          })) || []
          
          setPerformanceData(transformedData)
        }
      } catch (error) {
        console.error('Error fetching performance data:', error)
      } finally {
        // Remove loading state
        // setIsLoading(false)
      }
    }

    fetchPerformanceData(false)
  }, [selectedBrandId, preloadedPerformanceData])

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = (event: CustomEvent) => {
      if (event.detail?.brandId === selectedBrandId) {
        // console.log('[PerformanceChart] Refresh event triggered, forcing fresh data...', { source: event.detail.source })
        
        // Force regeneration when new data is detected
        const fetchData = async () => {
          try {
            const response = await fetch('/api/ai/daily-report', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              },
              body: JSON.stringify({ 
                brandId: selectedBrandId,
                forceRegenerate: true, // Force regeneration for fresh data
                timestamp: Date.now()
              })
            })
            if (response.ok) {
              const data = await response.json()
              
              // console.log('[PerformanceChart] Refresh API Response:', data)
              // console.log('[PerformanceChart] Refresh Weekly Performance:', data.report?.weeklyPerformance)
              
              const transformedData = data.report?.weeklyPerformance?.map((day: any) => ({
                day: day.day,
                date: day.date,
                meta: {
                  spend: day.spend || 0,
                  roas: day.roas || 0,
                  impressions: day.impressions || 0,
                  clicks: day.clicks || 0,
                  conversions: day.conversions || 0
                },
                tiktok: {
                  spend: 0,
                  roas: 0,
                  impressions: 0,
                  clicks: 0,
                  conversions: 0
                },
                google: {
                  spend: 0,
                  roas: 0,
                  impressions: 0,
                  clicks: 0,
                  conversions: 0
                }
              })) || []
              setPerformanceData(transformedData)
            }
          } catch (error) {
            console.error('Error refreshing performance data:', error)
          }
        }
        fetchData()
      }
    }

    // Listen for the same refresh events as other widgets
    window.addEventListener('metaDataRefreshed', handleRefresh as EventListener)
    window.addEventListener('global-refresh-all', handleRefresh as EventListener)
    window.addEventListener('newDayDetected', handleRefresh as EventListener)
    window.addEventListener('force-meta-refresh', handleRefresh as EventListener)
    
    return () => {
      window.removeEventListener('metaDataRefreshed', handleRefresh as EventListener)
      window.removeEventListener('global-refresh-all', handleRefresh as EventListener)
      window.removeEventListener('newDayDetected', handleRefresh as EventListener)
      window.removeEventListener('force-meta-refresh', handleRefresh as EventListener)
    }
  }, [selectedBrandId])

  const togglePlatform = (platform: keyof typeof enabledPlatforms) => {
    setEnabledPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }))
  }

  const formatValue = (value: number) => {
    switch (selectedMetric) {
      case 'spend':
        return `$${value.toFixed(2)}`
      case 'roas':
        return `${value.toFixed(2)}x`
      case 'impressions':
      case 'clicks':
      case 'conversions':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'spend':
        return 'Daily Spend'
      case 'roas':
        return 'ROAS'
      case 'impressions':
        return 'Impressions'
      case 'clicks':
        return 'Clicks'
      case 'conversions':
        return 'Conversions'
      default:
        return selectedMetric
    }
  }

  // Transform data for the selected metric
  const chartData = performanceData.map(day => {
    const dataPoint: any = {
      day: day.day,
      date: day.date
    }
    
    if (enabledPlatforms.meta) {
      dataPoint.Meta = day.meta[selectedMetric]
    }
    if (enabledPlatforms.tiktok) {
      dataPoint.TikTok = day.tiktok[selectedMetric]
    }
    if (enabledPlatforms.google) {
      dataPoint.Google = day.google[selectedMetric]
    }
    
    return dataPoint
  })
  
  // console.log('[PerformanceChart] Performance Data:', performanceData)
  // console.log('[PerformanceChart] Chart Data:', chartData)
  // Remove loading log - removed problematic console.log

  const platformColors = {
    Meta: '#6b7280',  // Gray instead of blue
    TikTok: '#FE2C55',
    Google: '#4285F4'
  }

  return (
    <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-lg shadow-lg h-full flex flex-col">
      {/* Header - matches other widgets style */}
      <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] p-6 border-b border-[#333] rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
                          flex items-center justify-center border border-white/10 shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Performance Trends</h2>
              <p className="text-gray-400 font-medium text-base">{getMetricLabel()} across platforms</p>
            </div>
          </div>
          
          {/* Settings Dropdown */}
          <div className="flex items-center gap-2">
            {/* Metric Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-[#1a1a1a] border-[#333]">
                <DropdownMenuLabel className="text-gray-400">Select Metric</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#333]" />
                <DropdownMenuItem 
                  onClick={() => setSelectedMetric('spend')}
                  className={selectedMetric === 'spend' ? 'bg-white/10' : ''}
                >
                  Daily Spend
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSelectedMetric('roas')}
                  className={selectedMetric === 'roas' ? 'bg-white/10' : ''}
                >
                  ROAS
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSelectedMetric('impressions')}
                  className={selectedMetric === 'impressions' ? 'bg-white/10' : ''}
                >
                  Impressions
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSelectedMetric('clicks')}
                  className={selectedMetric === 'clicks' ? 'bg-white/10' : ''}
                >
                  Clicks
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSelectedMetric('conversions')}
                  className={selectedMetric === 'conversions' ? 'bg-white/10' : ''}
                >
                  Conversions
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-[#333]" />
                <DropdownMenuLabel className="text-gray-400">Platforms</DropdownMenuLabel>
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
      
      {/* Content */}
      <CardContent className="p-6">
        {/* Remove loading state check - always show chart or empty state */}
        {chartData.length > 0 ? (
          <div className="h-80">
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
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={formatValue}
                  width={60}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f0f0f', 
                    border: '1px solid #1a1a1a',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                  }}
                  labelStyle={{ color: '#fff', fontWeight: '500', marginBottom: '4px' }}
                  formatter={(value: any, name: string) => [
                    <span key={name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {name === 'Meta' && (
                        <img 
                          src="https://i.imgur.com/6hyyRrs.png" 
                          alt="Meta" 
                          style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                        />
                      )}
                      {name === 'TikTok' && (
                        <img 
                          src="https://i.imgur.com/AXHa9UT.png" 
                          alt="TikTok" 
                          style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                        />
                      )}
                      {name === 'Google' && (
                        <img 
                          src="https://i.imgur.com/TavV4UJ.png" 
                          alt="Google Ads" 
                          style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                        />
                      )}
                      {formatValue(value)}
                    </span>,
                    name
                  ]}
                  cursor={false}
                />
                
                {enabledPlatforms.meta && (
                  <Area
                    type="monotone"
                    dataKey="Meta"
                    stroke={platformColors.Meta}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#metaGradient)"
                    dot={false}
                    activeDot={false}
                  />
                )}
                
                {enabledPlatforms.tiktok && (
                  <Area
                    type="monotone"
                    dataKey="TikTok"
                    stroke={platformColors.TikTok}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#tiktokGradient)"
                    dot={false}
                    activeDot={false}
                  />
                )}
                
                {enabledPlatforms.google && (
                  <Area
                    type="monotone"
                    dataKey="Google"
                    stroke={platformColors.Google}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#googleGradient)"
                    dot={false}
                    activeDot={false}
                  />
                )}
                
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="line"
                  formatter={(value) => (
                    <span style={{ color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {value === 'Meta' && (
                        <img 
                          src="https://i.imgur.com/6hyyRrs.png" 
                          alt="Meta" 
                          style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                        />
                      )}
                      {value === 'TikTok' && (
                        <img 
                          src="https://i.imgur.com/AXHa9UT.png" 
                          alt="TikTok" 
                          style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                        />
                      )}
                      {value === 'Google' && (
                        <img 
                          src="https://i.imgur.com/TavV4UJ.png" 
                          alt="Google Ads" 
                          style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                        />
                      )}
                      {value}
                    </span>
                  )}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No performance data available</p>
            </div>
          </div>
        )}
        
        {/* Platform Toggle Section */}
        <div className="mt-6 p-4 bg-[#0a0a0a] rounded-lg border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-400">Platform Comparison</h4>
            <span className="text-xs text-gray-500">Click to toggle platforms</span>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {/* Meta Platform */}
            <button
              onClick={() => togglePlatform('meta')}
              className={`relative p-4 rounded-lg border transition-all duration-200 ${
                enabledPlatforms.meta 
                  ? 'bg-gray-800/50 border-gray-600 shadow-lg' 
                  : 'bg-[#0f0f0f] border-white/10 opacity-60'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta" 
                  width={24} 
                  height={24} 
                  className={`object-contain transition-all ${
                    !enabledPlatforms.meta ? 'grayscale' : ''
                  }`}
                />
                <span className="text-xs font-medium text-white">Meta</span>
                <span className={`text-xs ${enabledPlatforms.meta ? 'text-gray-400' : 'text-gray-600'}`}>
                  Connected
                </span>
              </div>
              {enabledPlatforms.meta && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </button>

            {/* TikTok Platform */}
            <button
              disabled
              className="relative p-4 rounded-lg border bg-[#0f0f0f] border-white/10 opacity-40 cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-2">
                <Image 
                  src="https://i.imgur.com/AXHa9UT.png" 
                  alt="TikTok" 
                  width={24} 
                  height={24} 
                  className="object-contain grayscale"
                />
                <span className="text-xs font-medium text-gray-500">TikTok</span>
                <span className="text-xs text-gray-600">Not Connected</span>
              </div>
            </button>

            {/* Google Ads Platform */}
            <button
              disabled
              className="relative p-4 rounded-lg border bg-[#0f0f0f] border-white/10 opacity-40 cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-2">
                <Image 
                  src="https://i.imgur.com/TavV4UJ.png" 
                  alt="Google Ads" 
                  width={24} 
                  height={24} 
                  className="object-contain grayscale"
                />
                <span className="text-xs font-medium text-gray-500">Google Ads</span>
                <span className="text-xs text-gray-600">Not Connected</span>
              </div>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 