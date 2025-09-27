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
    <div className="relative h-full">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl blur-xl"></div>

      <Card className="relative bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-3xl shadow-2xl h-full flex flex-col">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-white/5 via-white/2 to-transparent border-b border-white/10 rounded-t-3xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Performance Trends</h2>
                <p className="text-gray-300 font-medium text-lg">{getMetricLabel()} across platforms</p>
              </div>
            </div>

            {/* Enhanced Controls */}
            <div className="flex items-center gap-3">
              {/* Enhanced Metric Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 px-4 py-2 rounded-2xl">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-white/20 w-64 p-3 rounded-2xl shadow-2xl backdrop-blur-sm">
                  <DropdownMenuLabel className="text-gray-300 font-semibold px-2 py-1">Select Metric</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => setSelectedMetric('spend')}
                    className={`text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors ${selectedMetric === 'spend' ? 'bg-blue-500/20 border border-blue-500/40' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">Daily Spend</span>
                      {selectedMetric === 'spend' && <div className="w-2 h-2 bg-blue-400 rounded-full"></div>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedMetric('roas')}
                    className={`text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors ${selectedMetric === 'roas' ? 'bg-emerald-500/20 border border-emerald-500/40' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">ROAS</span>
                      {selectedMetric === 'roas' && <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedMetric('impressions')}
                    className={`text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors ${selectedMetric === 'impressions' ? 'bg-blue-500/20 border border-blue-500/40' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">Impressions</span>
                      {selectedMetric === 'impressions' && <div className="w-2 h-2 bg-blue-400 rounded-full"></div>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedMetric('clicks')}
                    className={`text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors ${selectedMetric === 'clicks' ? 'bg-purple-500/20 border border-purple-500/40' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">Clicks</span>
                      {selectedMetric === 'clicks' && <div className="w-2 h-2 bg-purple-400 rounded-full"></div>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedMetric('conversions')}
                    className={`text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors ${selectedMetric === 'conversions' ? 'bg-orange-500/20 border border-orange-500/40' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">Conversions</span>
                      {selectedMetric === 'conversions' && <div className="w-2 h-2 bg-orange-400 rounded-full"></div>}
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuLabel className="text-gray-300 font-semibold px-2 py-1">Platforms</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={enabledPlatforms.meta}
                    onCheckedChange={() => togglePlatform('meta')}
                    className="text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src="https://i.imgur.com/6hyyRrs.png"
                        alt="Meta"
                        width={16}
                        height={16}
                        className="object-contain"
                      />
                      <span className="font-medium">Meta</span>
                      {enabledPlatforms.meta && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>}
                    </div>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={enabledPlatforms.tiktok}
                    onCheckedChange={() => togglePlatform('tiktok')}
                    disabled
                    className="text-gray-500 opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src="https://i.imgur.com/AXHa9UT.png"
                        alt="TikTok"
                        width={16}
                        height={16}
                        className="object-contain grayscale opacity-40"
                      />
                      <span>TikTok (Not Connected)</span>
                    </div>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={enabledPlatforms.google}
                    onCheckedChange={() => togglePlatform('google')}
                    disabled
                    className="text-gray-500 opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src="https://i.imgur.com/TavV4UJ.png"
                        alt="Google Ads"
                        width={16}
                        height={16}
                        className="object-contain grayscale opacity-40"
                      />
                      <span>Google Ads (Not Connected)</span>
                    </div>
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
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(dateStr) => format(new Date(`${dateStr}T00:00:00`), 'EEE')}
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
                  labelFormatter={(dateStr) => format(new Date(`${dateStr}T00:00:00`), 'EEE')}
                  formatter={(value: any, name: string, props: any) => {
                    // Ensure we're getting the right value
                    const formattedValue = formatValue(Number(value) || 0)
                    return [
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
                        {formattedValue}
                      </span>,
                      name
                    ]
                  }}
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
        
        {/* Enhanced Platform Toggle Section */}
        <div className="mt-6 p-6 bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold text-white mb-1">Platform Comparison</h4>
              <p className="text-sm text-gray-400">Click to toggle platforms in the chart</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Active platforms</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Enhanced Meta Platform */}
            <button
              onClick={() => togglePlatform('meta')}
              className={`relative p-4 rounded-2xl border-2 transition-all duration-300 group ${
                enabledPlatforms.meta
                  ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/30 shadow-lg hover:shadow-white/20'
                  : 'bg-gradient-to-br from-gray-800/30 to-gray-900/20 border-gray-600/50 hover:border-gray-500/70'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Image
                    src="https://i.imgur.com/6hyyRrs.png"
                    alt="Meta"
                    width={28}
                    height={28}
                    className={`object-contain transition-all duration-300 ${
                      !enabledPlatforms.meta ? 'grayscale opacity-60' : ''
                    }`}
                  />
                  {enabledPlatforms.meta && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white/20 animate-pulse shadow-lg"></div>
                  )}
                </div>
                <div className="text-center">
                  <span className={`text-sm font-bold transition-colors ${
                    enabledPlatforms.meta ? 'text-white' : 'text-gray-500'
                  }`}>
                    Meta
                  </span>
                  <div className={`text-xs mt-1 transition-colors ${
                    enabledPlatforms.meta ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {enabledPlatforms.meta ? 'Connected' : 'Connect to enable'}
                  </div>
                </div>
              </div>
              {enabledPlatforms.meta && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
              )}
            </button>

            {/* Enhanced TikTok Platform */}
            <div className="relative p-4 rounded-2xl border-2 bg-gradient-to-br from-gray-800/20 to-gray-900/10 border-gray-600/30 cursor-not-allowed opacity-60">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Image
                    src="https://i.imgur.com/AXHa9UT.png"
                    alt="TikTok"
                    width={28}
                    height={28}
                    className="object-contain grayscale opacity-40"
                  />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-600 rounded-full border border-gray-700"></div>
                </div>
                <div className="text-center">
                  <span className="text-sm font-bold text-gray-500">TikTok</span>
                  <div className="text-xs mt-1 text-gray-600">Not Connected</div>
                </div>
              </div>
            </div>

            {/* Enhanced Google Ads Platform */}
            <div className="relative p-4 rounded-2xl border-2 bg-gradient-to-br from-gray-800/20 to-gray-900/10 border-gray-600/30 cursor-not-allowed opacity-60">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Image
                    src="https://i.imgur.com/TavV4UJ.png"
                    alt="Google Ads"
                    width={28}
                    height={28}
                    className="object-contain grayscale opacity-40"
                  />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-600 rounded-full border border-gray-700"></div>
                </div>
                <div className="text-center">
                  <span className="text-sm font-bold text-gray-500">Google Ads</span>
                  <div className="text-xs mt-1 text-gray-600">Not Connected</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 