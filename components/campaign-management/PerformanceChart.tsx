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
    <div className="h-full flex flex-col space-y-4">
      {/* Compact header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 
                        flex items-center justify-center border border-cyan-500/30">
            <BarChart3 className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm">Performance Trends</h4>
            <p className="text-gray-400 text-xs">{getMetricLabel()} over time</p>
          </div>
        </div>
        
        {/* Compact controls */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10">
              <Settings2 className="h-4 w-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#0d1117] border-[#30363d]">
            <DropdownMenuLabel className="text-white text-xs">Metric</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#30363d]" />
            {[
              { key: 'spend', label: 'Spend' },
              { key: 'roas', label: 'ROAS' },
              { key: 'clicks', label: 'Clicks' },
              { key: 'conversions', label: 'Conversions' }
            ].map(({ key, label }) => (
              <DropdownMenuItem 
                key={key}
                onClick={() => setSelectedMetric(key as any)}
                className="text-white hover:bg-[#1c2128] text-xs"
              >
                <span>{label}</span>
                {selectedMetric === key && (
                  <span className="ml-auto text-cyan-400">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Chart Container */}
      <div className="flex-1 min-h-0 bg-gradient-to-br from-[#161b22] via-[#1c2128] to-[#0d1117] 
                    border border-[#30363d] rounded-xl p-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 w-40 h-40 bg-cyan-500/8 rounded-full blur-3xl transform -translate-x-1/2"></div>
        
        <div className="relative z-10 h-full">
          {chartData.length > 0 ? (
            <div className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="metaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" opacity={0.5} />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8b949e', fontSize: 11 }}
                    interval="preserveStartEnd"
                    height={40}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8b949e', fontSize: 11 }}
                    tickFormatter={formatValue}
                    width={50}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0d1117', 
                      border: '1px solid #30363d',
                      borderRadius: '12px',
                      padding: '8px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                    }}
                    labelStyle={{ color: '#f0f6fc', fontWeight: '500', fontSize: '12px' }}
                    formatter={(value: any, name: string) => [
                      <span key={name} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        fontSize: '12px',
                        color: '#f0f6fc'
                      }}>
                        {name === 'Meta' && (
                          <img 
                            src="https://i.imgur.com/6hyyRrs.png" 
                            alt="Meta" 
                            style={{ width: '12px', height: '12px', objectFit: 'contain' }}
                          />
                        )}
                        {formatValue(value)}
                      </span>,
                      name
                    ]}
                    cursor={{ stroke: '#30363d', strokeWidth: 1 }}
                  />
                  
                  {enabledPlatforms.meta && (
                    <Area
                      type="monotone"
                      dataKey="Meta"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#metaGradient)"
                      dot={false}
                      activeDot={{ r: 4, stroke: '#06b6d4', strokeWidth: 2, fill: '#0d1117' }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-xl 
                              flex items-center justify-center border border-cyan-500/30 mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 text-cyan-300" />
                </div>
                <h3 className="text-sm font-medium text-white mb-1">No Data Available</h3>
                <p className="text-xs text-gray-400">Performance data will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Platform Status */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span className="text-blue-300 text-xs font-medium">Meta Connected</span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-500/10 border border-gray-500/20 rounded-lg">
          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
          <span className="text-gray-400 text-xs font-medium">Others Pending</span>
        </div>
      </div>
    </div>
  )
} 