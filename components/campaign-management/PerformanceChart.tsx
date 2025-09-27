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
      date: day.date,
      fullDate: day.date // Add full date for debugging
    }
    
    if (enabledPlatforms.meta) {
      dataPoint.Meta = day.meta[selectedMetric] || 0
    }
    if (enabledPlatforms.tiktok) {
      dataPoint.TikTok = day.tiktok[selectedMetric] || 0
    }
    if (enabledPlatforms.google) {
      dataPoint.Google = day.google[selectedMetric] || 0
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
    <div className="relative bg-gradient-to-br from-[#0f0f0f]/50 to-[#1a1a1a]/50 backdrop-blur-xl border border-[#333]/50 rounded-3xl overflow-hidden h-full flex flex-col">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>

      <div className="relative z-10">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-[#0a0a0a]/80 to-[#141414]/80 backdrop-blur-xl border-b border-[#333]/50 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl
                            flex items-center justify-center border border-[#333]/50 shadow-lg backdrop-blur-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Performance Trends
                </h2>
                <p className="text-gray-400 text-sm">{getMetricLabel()} across all campaigns</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
            {/* Metric Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-[#1a1a1a]/50 border-[#333]/50 text-white hover:bg-[#2a2a2a]/50 rounded-xl">
                  <Settings2 className="h-4 w-4 mr-2" />
                  {getMetricLabel()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-[#1a1a1a] border-[#333] rounded-xl">
                <DropdownMenuLabel className="text-gray-400">Select Metric</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#333]" />
                <DropdownMenuItem
                  onClick={() => setSelectedMetric('spend')}
                  className={`rounded-lg ${selectedMetric === 'spend' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[#2a2a2a]'}`}
                >
                  Daily Spend
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedMetric('roas')}
                  className={`rounded-lg ${selectedMetric === 'roas' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[#2a2a2a]'}`}
                >
                  ROAS
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedMetric('impressions')}
                  className={`rounded-lg ${selectedMetric === 'impressions' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[#2a2a2a]'}`}
                >
                  Impressions
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedMetric('clicks')}
                  className={`rounded-lg ${selectedMetric === 'clicks' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[#2a2a2a]'}`}
                >
                  Clicks
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedMetric('conversions')}
                  className={`rounded-lg ${selectedMetric === 'conversions' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[#2a2a2a]'}`}
                >
                  Conversions
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-[#333]" />
                <DropdownMenuLabel className="text-gray-400">Platforms</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={enabledPlatforms.meta}
                  onCheckedChange={() => togglePlatform('meta')}
                  className="rounded-lg"
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
                  className="rounded-lg opacity-50"
                >
                  <Image
                    src="https://i.imgur.com/AXHa9UT.png"
                    alt="TikTok"
                    width={14}
                    height={14}
                    className="object-contain grayscale opacity-40 mr-2"
                  />
                  TikTok (Coming Soon)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={enabledPlatforms.google}
                  onCheckedChange={() => togglePlatform('google')}
                  disabled
                  className="rounded-lg opacity-50"
                >
                  <Image
                    src="https://i.imgur.com/TavV4UJ.png"
                    alt="Google Ads"
                    width={14}
                    height={14}
                    className="object-contain grayscale opacity-40 mr-2"
                  />
                  Google Ads (Coming Soon)
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Chart Content */}
        <div className="p-6 flex-1">
          {chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="metaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6b7280" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6b7280" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="tiktokGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FE2C55" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#FE2C55" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="googleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4285F4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4285F4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={(dateStr) => format(new Date(`${dateStr}T00:00:00`), 'EEE')}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={formatValue}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f0f0f',
                      border: '1px solid #333',
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}
                    labelFormatter={(dateStr) => format(new Date(`${dateStr}T00:00:00`), 'EEEE, MMM d')}
                    formatter={(value: any, name: string, props: any) => {
                      const formattedValue = formatValue(Number(value) || 0)
                      return [
                        <span key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          {name === 'Meta' && (
                            <img
                              src="https://i.imgur.com/6hyyRrs.png"
                              alt="Meta"
                              style={{ width: '16px', height: '16px', objectFit: 'contain', borderRadius: '4px' }}
                            />
                          )}
                          {name === 'TikTok' && (
                            <img
                              src="https://i.imgur.com/AXHa9UT.png"
                              alt="TikTok"
                              style={{ width: '16px', height: '16px', objectFit: 'contain', borderRadius: '4px' }}
                            />
                          )}
                          {name === 'Google' && (
                            <img
                              src="https://i.imgur.com/TavV4UJ.png"
                              alt="Google Ads"
                              style={{ width: '16px', height: '16px', objectFit: 'contain', borderRadius: '4px' }}
                            />
                          )}
                          <span style={{ fontWeight: '600' }}>{formattedValue}</span>
                        </span>,
                        name
                      ]
                    }}
                    cursor={{ stroke: '#333', strokeWidth: 1 }}
                  />

                  {enabledPlatforms.meta && (
                    <Area
                      type="monotone"
                      dataKey="Meta"
                      stroke="#6b7280"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#metaGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#6b7280', stroke: '#fff', strokeWidth: 2 }}
                    />
                  )}

                  {enabledPlatforms.tiktok && (
                    <Area
                      type="monotone"
                      dataKey="TikTok"
                      stroke="#FE2C55"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#tiktokGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#FE2C55', stroke: '#fff', strokeWidth: 2 }}
                    />
                  )}

                  {enabledPlatforms.google && (
                    <Area
                      type="monotone"
                      dataKey="Google"
                      stroke="#4285F4"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#googleGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#4285F4', stroke: '#fff', strokeWidth: 2 }}
                    />
                  )}

                  <Legend
                    wrapperStyle={{ paddingTop: '16px' }}
                    iconType="rect"
                    formatter={(value) => (
                      <span style={{ color: '#ccc', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                        {value === 'Meta' && (
                          <img
                            src="https://i.imgur.com/6hyyRrs.png"
                            alt="Meta"
                            style={{ width: '14px', height: '14px', objectFit: 'contain', borderRadius: '3px' }}
                          />
                        )}
                        {value === 'TikTok' && (
                          <img
                            src="https://i.imgur.com/AXHa9UT.png"
                            alt="TikTok"
                            style={{ width: '14px', height: '14px', objectFit: 'contain', borderRadius: '3px' }}
                          />
                        )}
                        {value === 'Google' && (
                          <img
                            src="https://i.imgur.com/TavV4UJ.png"
                            alt="Google Ads"
                            style={{ width: '14px', height: '14px', objectFit: 'contain', borderRadius: '3px' }}
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
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-2xl flex items-center justify-center border border-gray-500/30">
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Performance Data</h3>
                <p className="text-gray-400 max-w-xs">Performance trends will appear once you have campaign data available.</p>
              </div>
            </div>
          )}

          {/* Platform Toggle Section */}
          <div className="mt-6 p-4 bg-gradient-to-r from-[#0f0f0f]/50 to-[#1a1a1a]/50 backdrop-blur-xl rounded-xl border border-[#333]/30">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-300">Platform Comparison</h4>
              <span className="text-xs text-gray-500">Toggle platforms in chart</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Meta Platform */}
              <button
                onClick={() => togglePlatform('meta')}
                className={`relative p-4 rounded-xl border transition-all duration-300 hover:scale-105 ${
                  enabledPlatforms.meta
                    ? 'bg-gradient-to-br from-gray-500/20 to-gray-600/20 border-gray-500/50 shadow-lg shadow-gray-500/10'
                    : 'bg-[#0f0f0f]/50 border-[#333]/50 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                    enabledPlatforms.meta ? 'border-gray-500/50 bg-gray-500/10' : 'border-gray-600/50 bg-gray-600/10'
                  }`}>
                    <Image
                      src="https://i.imgur.com/6hyyRrs.png"
                      alt="Meta"
                      width={20}
                      height={20}
                      className={`object-contain transition-all ${
                        !enabledPlatforms.meta ? 'grayscale' : ''
                      }`}
                    />
                  </div>
                  <span className="text-xs font-medium text-white">Meta</span>
                  <span className={`text-xs ${enabledPlatforms.meta ? 'text-green-400' : 'text-gray-500'}`}>
                    {enabledPlatforms.meta ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {enabledPlatforms.meta && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full animate-pulse border border-[#0f0f0f]"></div>
                )}
              </button>

              {/* TikTok Platform */}
              <button
                disabled
                className="relative p-4 rounded-xl border bg-[#0f0f0f]/30 border-[#333]/30 opacity-40 cursor-not-allowed"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-600/30 bg-gray-600/10">
                    <Image
                      src="https://i.imgur.com/AXHa9UT.png"
                      alt="TikTok"
                      width={20}
                      height={20}
                      className="object-contain grayscale"
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-500">TikTok</span>
                  <span className="text-xs text-gray-600">Coming Soon</span>
                </div>
              </button>

              {/* Google Ads Platform */}
              <button
                disabled
                className="relative p-4 rounded-xl border bg-[#0f0f0f]/30 border-[#333]/30 opacity-40 cursor-not-allowed"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-600/30 bg-gray-600/10">
                    <Image
                      src="https://i.imgur.com/TavV4UJ.png"
                      alt="Google Ads"
                      width={20}
                      height={20}
                      className="object-contain grayscale"
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-500">Google Ads</span>
                  <span className="text-xs text-gray-600">Coming Soon</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 