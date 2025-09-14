"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, RefreshCw } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { DateRange } from 'react-day-picker'

interface DemographicData {
  breakdown_value: string
  impressions: number
  clicks: number
  spend: number
  reach: number
  cpm: number
  cpc: number
  ctr: number
}

interface AudienceDemographicsWidgetProps {
  connectionId: string
  dateRange?: DateRange
  className?: string
  loading?: boolean
}

const BREAKDOWN_TYPES = [
  { value: 'age', label: 'Age Groups' },
  { value: 'gender', label: 'Gender' },
  { value: 'age_gender', label: 'Age + Gender' }
]

// Modern professional color scheme
const CHART_COLOR = '#9ca3af' // Single professional gray

export function AudienceDemographicsWidget({ 
  connectionId, 
  dateRange,
  className = "",
  loading = false
}: AudienceDemographicsWidgetProps) {
  const [data, setData] = useState<DemographicData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBreakdown, setSelectedBreakdown] = useState('age_gender')

  const fetchData = async () => {
    if (!connectionId) return
    
    setIsLoading(true)
    setData([]) // Clear existing data to prevent flashing
    
    try {
      const params = new URLSearchParams({
        connectionId,
        breakdownType: selectedBreakdown
      })

      if (dateRange?.from && dateRange?.to) {
        const startDate = dateRange.from.toISOString().split('T')[0]
        const endDate = dateRange.to.toISOString().split('T')[0]
        params.append('dateRangeStart', startDate)
        params.append('dateRangeEnd', endDate)
        // console.log(`[Demographics Widget] 🔥 Using date range: ${startDate} to ${endDate}`)
      } else {
        // console.log(`[Demographics Widget] 🔥 No date range provided, fetching all data`)
      }

      const response = await fetch(`/api/meta/demographics?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data || [])
      } else {
        console.error('Error fetching demographic data:', result.error)
      }
    } catch (error) {
      console.error('Error fetching demographic data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // console.log(`[Demographics Widget] 🔥 useEffect triggered - connectionId: ${connectionId}, breakdown: ${selectedBreakdown}, dateRange:`, dateRange)
    fetchData()
  }, [connectionId, selectedBreakdown, dateRange])

  // Listen for refresh events
  useEffect(() => {
    if (!connectionId) return

    const handleRefresh = () => {
      fetchData()
    }

    // Listen to global refresh events
    window.addEventListener('global-refresh-all', handleRefresh)
    window.addEventListener('force-meta-refresh', handleRefresh)
    window.addEventListener('metaDataRefreshed', handleRefresh)

    return () => {
      window.removeEventListener('global-refresh-all', handleRefresh)
      window.removeEventListener('force-meta-refresh', handleRefresh)
      window.removeEventListener('metaDataRefreshed', handleRefresh)
    }
  }, [connectionId])

  const formatBreakdownValue = (value: string) => {
    if (selectedBreakdown === 'age_gender') {
      const [age, gender] = value.split('_')
      return `${age}, ${gender}`
    }
    if (selectedBreakdown === 'gender') {
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
    return value
  }

  const chartData = data.map((item) => ({
    name: formatBreakdownValue(item.breakdown_value),
    impressions: item.impressions,
    spend: item.spend,
    clicks: item.clicks,
    ctr: item.ctr
  }))

  const totalImpressions = data.reduce((sum, item) => sum + item.impressions, 0)
  const totalSpend = data.reduce((sum, item) => sum + item.spend, 0)
  const totalClicks = data.reduce((sum, item) => sum + item.clicks, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-300">Impressions: {data.impressions.toLocaleString()}</p>
            <p className="text-gray-300">Clicks: {data.clicks.toLocaleString()}</p>
            <p className="text-gray-300">Spend: ${data.spend.toFixed(2)}</p>
            <p className="text-gray-300">CTR: {data.ctr.toFixed(2)}%</p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className={`bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl overflow-hidden transition-all duration-300 hover:border-[#444] ${className}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <CardTitle className="text-sm font-medium text-white">Audience Demographics</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedBreakdown} onValueChange={setSelectedBreakdown}>
              <SelectTrigger className="w-32 h-8 bg-[#1a1a1a] border-[#333] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#333]">
                {BREAKDOWN_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-xs">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={fetchData}
              disabled={isLoading}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#1a1a1a]"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-800 rounded animate-pulse" />
            <div className="h-48 bg-gray-800/50 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-800/30 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-800/30 rounded animate-pulse w-1/2" />
            </div>
          </div>
        ) : data.length > 0 ? (
          <div className="space-y-4">
            {/* Modern KPI Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Impressions</div>
                <div className="text-lg font-bold text-white">{totalImpressions.toLocaleString()}</div>
              </div>
              <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Clicks</div>
                <div className="text-lg font-bold text-white">{totalClicks.toLocaleString()}</div>
              </div>
              <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Spend</div>
                <div className="text-lg font-bold text-white">${totalSpend.toFixed(2)}</div>
              </div>
            </div>
            
            {/* Modern Bar Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="impressions" 
                    fill={CHART_COLOR}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Clean Data Table */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-400 mb-2">Performance Breakdown</div>
              {data.slice(0, 8).map((item) => (
                <div key={item.breakdown_value} className="flex items-center justify-between py-2 px-3 bg-[#0f0f0f]/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    <span className="text-sm text-gray-300 font-medium">{formatBreakdownValue(item.breakdown_value)}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white font-medium">{item.impressions.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{item.ctr.toFixed(2)}% CTR</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No demographic data available</p>
            <p className="text-sm text-gray-500">Data will appear after your Meta ads have demographic insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
