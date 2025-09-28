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
    <div className="relative h-full flex flex-col">
      {/* Seamless Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-3 h-3 text-white/60" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Analytics Hub</h2>
              <p className="text-gray-500 text-sm">{getMetricLabel()} trends & insights</p>
            </div>
          </div>
          
          {/* Modern Metric Selector */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-[#1a1a1a]/60 border-[#333]/50 text-white hover:bg-[#2a2a2a] backdrop-blur-sm rounded-xl px-4 py-2">
                  <Settings2 className="h-4 w-4 mr-2" />
                  {getMetricLabel()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#0a0a0a] border-[#333] p-3 rounded-2xl backdrop-blur-sm">
                <DropdownMenuLabel className="text-white font-semibold px-2 py-1">Select Metric</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#333] my-2" />
                
                {/* Metric Options */}
                {[
                  { key: 'spend', label: 'Daily Spend', icon: '💰' },
                  { key: 'roas', label: 'ROAS', icon: '📈' },
                  { key: 'impressions', label: 'Impressions', icon: '👁️' },
                  { key: 'clicks', label: 'Clicks', icon: '🖱️' },
                  { key: 'conversions', label: 'Conversions', icon: '🎯' }
                ].map(metric => (
                  <DropdownMenuItem 
                    key={metric.key}
                    onClick={() => setSelectedMetric(metric.key as any)}
                    className={`rounded-xl mx-1 px-3 py-2 transition-colors ${
                      selectedMetric === metric.key 
                        ? 'bg-white/10 text-white' 
                        : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <span className="mr-3">{metric.icon}</span>
                        <span className="font-medium">{metric.label}</span>
                      </div>
                      {selectedMetric === metric.key && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator className="bg-[#333] my-3" />
                <DropdownMenuLabel className="text-white font-semibold px-2 py-1">Platforms</DropdownMenuLabel>
                
                {/* Platform toggles */}
                <div className="space-y-1 mt-2">
                  <div 
                    onClick={() => togglePlatform('meta')}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center">
                      <Image 
                        src="https://i.imgur.com/6hyyRrs.png" 
                        alt="Meta" 
                        width={16} 
                        height={16} 
                        className="object-contain mr-3"
                      />
                      <span className="text-white font-medium">Meta</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 transition-colors ${
                      enabledPlatforms.meta 
                        ? 'bg-emerald-500 border-emerald-500' 
                        : 'border-gray-500'
                    }`}>
                      {enabledPlatforms.meta && <div className="w-full h-full rounded-full bg-white scale-50"></div>}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 rounded-xl opacity-50 cursor-not-allowed">
                    <div className="flex items-center">
                      <Image 
                        src="https://i.imgur.com/AXHa9UT.png" 
                        alt="TikTok" 
                        width={16} 
                        height={16} 
                        className="object-contain grayscale mr-3"
                      />
                      <span className="text-gray-500 font-medium">TikTok</span>
                    </div>
                    <span className="text-xs text-gray-600">Not Connected</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 rounded-xl opacity-50 cursor-not-allowed">
                    <div className="flex items-center">
                      <Image 
                        src="https://i.imgur.com/TavV4UJ.png" 
                        alt="Google Ads" 
                        width={16} 
                        height={16} 
                        className="object-contain grayscale mr-3"
                      />
                      <span className="text-gray-500 font-medium">Google Ads</span>
                    </div>
                    <span className="text-xs text-gray-600">Not Connected</span>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Flowing Content */}
      <div className="flex-1 flex flex-col">
        {/* Remove loading state check - always show chart or empty state */}
        {chartData.length > 0 ? (
          <div className="px-6 py-4 flex-1">
            {/* Quick Stats Bar */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#0f0f0f]/60 rounded-xl p-4 border border-[#333]/50">
                <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Peak Value</div>
                <div className="text-lg font-bold text-white">
                  {(() => {
                    const peakValue = Math.max(...chartData.map(d => d.meta || 0))
                    if (selectedMetric === 'spend') return `$${peakValue.toFixed(2)}`
                    if (selectedMetric === 'roas') return `${peakValue.toFixed(2)}x`
                    return peakValue.toLocaleString()
                  })()}
                </div>
              </div>
              <div className="bg-[#0f0f0f]/60 rounded-xl p-4 border border-[#333]/50">
                <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Total Period</div>
                <div className="text-lg font-bold text-white">
                  {(() => {
                    const totalValue = chartData.reduce((sum, d) => sum + (d.meta || 0), 0)
                    if (selectedMetric === 'spend') return `$${totalValue.toFixed(2)}`
                    if (selectedMetric === 'roas') return `${(totalValue / chartData.length).toFixed(2)}x`
                    return totalValue.toLocaleString()
                  })()}
                </div>
              </div>
              <div className="bg-[#0f0f0f]/60 rounded-xl p-4 border border-[#333]/50">
                <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Trend</div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  {(() => {
                    const firstValue = chartData[0]?.meta || 0
                    const lastValue = chartData[chartData.length - 1]?.meta || 0
                    const trend = lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'stable'
                    const percentage = firstValue > 0 ? Math.abs(((lastValue - firstValue) / firstValue) * 100) : 0
                    
                    return (
                      <>
                        {trend === 'up' && <div className="w-3 h-3 bg-green-400 rounded-full"></div>}
                        {trend === 'down' && <div className="w-3 h-3 bg-red-400 rounded-full"></div>}
                        {trend === 'stable' && <div className="w-3 h-3 bg-gray-400 rounded-full"></div>}
                        <span className={
                          trend === 'up' ? 'text-green-400' : 
                          trend === 'down' ? 'text-red-400' : 
                          'text-gray-400'
                        }>
                          {trend === 'stable' ? 'Stable' : `${percentage.toFixed(1)}%`}
                        </span>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
            
            {/* Enhanced Chart */}
            <div className="h-80 bg-gradient-to-br from-[#0f0f0f]/30 to-[#1a1a1a]/30 rounded-2xl p-4 border border-[#333]/30">
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="metaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6b7280" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#6b7280" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="tiktokGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FE2C55" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#FE2C55" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="googleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4285F4" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#4285F4" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} />
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
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-6 py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-[#1a1a1a] to-[#333] rounded-3xl 
                            flex items-center justify-center border border-[#444]/50 mx-auto mb-6">
                <BarChart3 className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">No Performance Data</h3>
              <p className="text-gray-400 text-base leading-relaxed max-w-md mx-auto">
                Connect your advertising platforms and start running campaigns to see detailed performance trends and insights.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center border border-[#333]">
                  <Image src="https://i.imgur.com/6hyyRrs.png" alt="Meta" width={16} height={16} className="object-contain" />
                </div>
                <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center border border-[#333]">
                  <Image src="https://i.imgur.com/AXHa9UT.png" alt="TikTok" width={16} height={16} className="object-contain grayscale opacity-40" />
                </div>
                <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center border border-[#333]">
                  <Image src="https://i.imgur.com/TavV4UJ.png" alt="Google Ads" width={16} height={16} className="object-contain grayscale opacity-40" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 