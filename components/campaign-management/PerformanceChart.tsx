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
import { BarChart3, Settings2, TrendingUp, DollarSign } from 'lucide-react'
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
    <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col">
      {/* Modern Header */}
      <div className="relative bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-cyan-600/20 p-6 border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 animate-pulse"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl
                          flex items-center justify-center border border-emerald-500/30 shadow-lg backdrop-blur-sm">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Performance Trends</h2>
              <p className="text-emerald-200 text-sm">{getMetricLabel()} visualization</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full backdrop-blur-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-300 text-sm font-medium">Live Trends</span>
            </div>

            {/* Metric Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500/50">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Metric
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-800 border-slate-600 min-w-48">
                <DropdownMenuLabel className="text-slate-200">Select Metric</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-600" />
                {[
                  { key: 'spend', label: 'Daily Spend', icon: DollarSign },
                  { key: 'roas', label: 'ROAS', icon: TrendingUp },
                  { key: 'impressions', label: 'Impressions', icon: Eye },
                  { key: 'clicks', label: 'Clicks', icon: MousePointer },
                  { key: 'conversions', label: 'Conversions', icon: Target }
                ].map(({ key, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={key}
                    onSelect={() => setSelectedMetric(key as any)}
                    className={`text-slate-200 hover:bg-slate-700 focus:bg-slate-700 ${selectedMetric === key ? 'bg-slate-700' : ''}`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    <span className="flex-1">{label}</span>
                    {selectedMetric === key && (
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6">
        {/* Chart Area */}
        {chartData.length > 0 ? (
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="metaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(dateStr) => format(new Date(`${dateStr}T00:00:00`), 'EEE')}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={formatValue}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(12px)'
                  }}
                  labelStyle={{ color: '#f1f5f9', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}
                  labelFormatter={(dateStr) => format(new Date(`${dateStr}T00:00:00`), 'EEEE, MMM d')}
                  formatter={(value: any, name: string) => {
                    const formattedValue = formatValue(Number(value) || 0)
                    return [
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: platformColors[name as keyof typeof platformColors] || '#64748b'
                        }}></div>
                        <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{formattedValue}</span>
                      </div>,
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>{name}</span>
                    ]
                  }}
                  cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                />

                {enabledPlatforms.meta && (
                  <Area
                    type="monotone"
                    dataKey="Meta"
                    stroke="#64748b"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#metaGradient)"
                    dot={{ fill: '#64748b', strokeWidth: 2, stroke: '#0f172a', r: 4 }}
                    activeDot={{ r: 6, stroke: '#64748b', strokeWidth: 2, fill: '#0f172a' }}
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
                    dot={{ fill: '#FE2C55', strokeWidth: 2, stroke: '#0f172a', r: 4 }}
                    activeDot={{ r: 6, stroke: '#FE2C55', strokeWidth: 2, fill: '#0f172a' }}
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
                    dot={{ fill: '#4285F4', strokeWidth: 2, stroke: '#0f172a', r: 4 }}
                    activeDot={{ r: 6, stroke: '#4285F4', strokeWidth: 2, fill: '#0f172a' }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 mb-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-600/20 to-slate-700/30 rounded-2xl flex items-center justify-center border border-slate-600/50">
                <BarChart3 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Performance Data</h3>
              <p className="text-slate-400 text-sm">Performance trends will appear once you have campaign data</p>
            </div>
          </div>
        )}

        {/* Platform Control Panel */}
        <div className="backdrop-blur-xl bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Platform Visibility</h4>
              <p className="text-xs text-slate-400">Toggle platforms to compare performance</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-300 font-medium">Interactive</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Meta Platform */}
            <button
              onClick={() => togglePlatform('meta')}
              className={`relative p-4 rounded-xl border transition-all duration-300 group ${
                enabledPlatforms.meta
                  ? 'bg-slate-700/50 border-slate-600 shadow-lg scale-105'
                  : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/30'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Image
                    src="https://i.imgur.com/6hyyRrs.png"
                    alt="Meta"
                    width={32}
                    height={32}
                    className={`object-contain transition-all duration-300 ${
                      !enabledPlatforms.meta ? 'grayscale opacity-50' : 'opacity-100'
                    }`}
                  />
                  {enabledPlatforms.meta && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
                  )}
                </div>
                <div className="text-center">
                  <div className={`text-sm font-semibold mb-1 transition-colors ${
                    enabledPlatforms.meta ? 'text-white' : 'text-slate-400'
                  }`}>
                    Meta
                  </div>
                  <div className={`text-xs transition-colors ${
                    enabledPlatforms.meta ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    {enabledPlatforms.meta ? 'Active' : 'Connected'}
                  </div>
                </div>
              </div>

              {/* Hover effect */}
              <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
                enabledPlatforms.meta ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'
              } bg-gradient-to-br from-slate-400 to-slate-600`}></div>
            </button>

            {/* TikTok Platform */}
            <button
              disabled
              className="relative p-4 rounded-xl border bg-slate-800/20 border-slate-700/30 opacity-60 cursor-not-allowed group"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Image
                    src="https://i.imgur.com/AXHa9UT.png"
                    alt="TikTok"
                    width={32}
                    height={32}
                    className="object-contain grayscale opacity-40"
                  />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-slate-600 rounded-full border-2 border-slate-800"></div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-slate-500 mb-1">TikTok</div>
                  <div className="text-xs text-slate-600">Coming Soon</div>
                </div>
              </div>
            </button>

            {/* Google Ads Platform */}
            <button
              disabled
              className="relative p-4 rounded-xl border bg-slate-800/20 border-slate-700/30 opacity-60 cursor-not-allowed group"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Image
                    src="https://i.imgur.com/TavV4UJ.png"
                    alt="Google Ads"
                    width={32}
                    height={32}
                    className="object-contain grayscale opacity-40"
                  />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-slate-600 rounded-full border-2 border-slate-800"></div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-slate-500 mb-1">Google Ads</div>
                  <div className="text-xs text-slate-600">Coming Soon</div>
                </div>
              </div>
            </button>
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-center gap-6">
              {enabledPlatforms.meta && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                  <span className="text-xs text-slate-300 font-medium">Meta Ads</span>
                </div>
              )}
              {enabledPlatforms.tiktok && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs text-slate-300 font-medium">TikTok Ads</span>
                </div>
              )}
              {enabledPlatforms.google && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-slate-300 font-medium">Google Ads</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 