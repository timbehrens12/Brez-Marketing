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
    <div className="bg-gradient-to-r from-[#0f0f0f]/30 to-[#1a1a1a]/20 border border-[#333]/50 rounded-xl h-full flex flex-col overflow-hidden">
      {/* Ultra-Compact Header */}
      <div className="p-3 border-b border-[#333]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-white/10 to-white/5 rounded-lg 
                          flex items-center justify-center border border-white/20">
              <BarChart3 className="w-3 h-3 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Trends</h4>
              <p className="text-xs text-gray-500">{getMetricLabel()}</p>
            </div>
          </div>
          
          {/* Mini Metric Selector */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-[#1a1a1a]/30 border-[#333]/20 text-white hover:bg-[#2a2a2a] rounded-md px-2 py-1 h-6 text-xs">
                  <Settings2 className="h-2 w-2 mr-1" />
                  {getMetricLabel()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 bg-[#0a0a0a] border-[#333] p-1 rounded-lg">
                {[
                  { key: 'spend', label: 'Spend' },
                  { key: 'roas', label: 'ROAS' },
                  { key: 'impressions', label: 'Impr.' },
                  { key: 'clicks', label: 'Clicks' },
                  { key: 'conversions', label: 'Conv.' }
                ].map(metric => (
                  <DropdownMenuItem 
                    key={metric.key}
                    onClick={() => setSelectedMetric(metric.key as any)}
                    className={`rounded px-2 py-1 text-xs transition-colors ${
                      selectedMetric === metric.key 
                        ? 'bg-white/10 text-white' 
                        : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-white'
                    }`}
                  >
                    {metric.label}
                    {selectedMetric === metric.key && (
                      <div className="w-1 h-1 rounded-full bg-white ml-auto"></div>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-0 flex-1 flex flex-col">
        {chartData.length > 0 ? (
          <div className="px-3 py-2 flex-1">
            {/* Ultra-Compact Chart */}
            <div className="h-48 bg-gradient-to-br from-[#0f0f0f]/30 to-[#1a1a1a]/30 rounded-lg p-2 border border-[#333]/30">
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
            <div className="text-center px-4 py-8">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1a1a1a] to-[#333] rounded-xl 
                            flex items-center justify-center border border-[#444]/50 mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-gray-500" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">No Data Available</h4>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                Connect platforms to see trends
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 