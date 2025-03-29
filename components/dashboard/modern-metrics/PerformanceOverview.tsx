"use client"

import React, { useState, useEffect } from 'react'
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts'
import { cn } from '@/lib/utils'
import { 
  BarChart3,
  PieChart as PieChartIcon,
  LineChart,
  Layers,
  LayoutDashboard,
  RefreshCw,
  Loader2,
  Calendar,
  TrendingUp,
  ChevronDown,
  Settings
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface PerformanceOverviewProps {
  brandId: string
  className?: string
  metrics?: any
  loading?: boolean
}

export function PerformanceOverview({
  brandId,
  className,
  metrics = {},
  loading = false
}: PerformanceOverviewProps) {
  const [viewMode, setViewMode] = useState<string>('areaChart')
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [showInsights, setShowInsights] = useState<boolean>(false)
  const [data, setData] = useState<any[]>([])
  
  // Process metrics data to get a clean dataset for visualization
  useEffect(() => {
    if (!metrics?.dailyData) return
    
    const processedData = Array.isArray(metrics.dailyData) 
      ? metrics.dailyData
          .filter((day: any) => day && day.date)
          .map((day: any) => ({
            date: day.date || '',
            spend: typeof day.spend === 'number' ? day.spend : 0,
            clicks: typeof day.clicks === 'number' ? day.clicks : 0,
            impressions: typeof day.impressions === 'number' ? day.impressions : 0,
            ctr: typeof day.ctr === 'number' ? day.ctr : 0,
            cpc: typeof day.cpc === 'number' ? day.cpc : 0,
            roas: typeof day.roas === 'number' ? day.roas : 0,
          }))
      : []
    
    setData(processedData)
  }, [metrics])
  
  // Function to manually refresh data
  const handleRefresh = () => {
    setIsRefreshing(true)
    // Simulating a refresh
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1500)
  }
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch (e) {
      return dateStr
    }
  }
  
  // Generate comparative metrics for insights
  const getInsights = () => {
    if (data.length < 7) return []
    
    const recent = data.slice(-7)
    const previous = data.slice(-14, -7)
    
    // Calculate averages
    const calcAverage = (arr: any[], key: string) => {
      return arr.reduce((sum, item) => sum + (item[key] || 0), 0) / arr.length
    }
    
    return [
      {
        metric: 'Spend',
        current: calcAverage(recent, 'spend'),
        previous: calcAverage(previous, 'spend'),
        change: (calcAverage(recent, 'spend') - calcAverage(previous, 'spend')) / calcAverage(previous, 'spend') * 100
      },
      {
        metric: 'ROAS',
        current: calcAverage(recent, 'roas'),
        previous: calcAverage(previous, 'roas'),
        change: (calcAverage(recent, 'roas') - calcAverage(previous, 'roas')) / calcAverage(previous, 'roas') * 100
      },
      {
        metric: 'CTR',
        current: calcAverage(recent, 'ctr'),
        previous: calcAverage(previous, 'ctr'),
        change: (calcAverage(recent, 'ctr') - calcAverage(previous, 'ctr')) / calcAverage(previous, 'ctr') * 100
      },
      {
        metric: 'CPC',
        current: calcAverage(recent, 'cpc'),
        previous: calcAverage(previous, 'cpc'),
        change: (calcAverage(recent, 'cpc') - calcAverage(previous, 'cpc')) / calcAverage(previous, 'cpc') * 100
      }
    ]
  }
  
  // Prepare radar chart data
  const radarData = [
    { subject: 'ROAS', A: metrics?.roas || 0, fullMark: 5 },
    { subject: 'Spend', A: metrics?.adSpend ? Math.min(metrics.adSpend / 1000, 5) : 0, fullMark: 5 },
    { subject: 'Clicks', A: metrics?.clicks ? Math.min(metrics.clicks / 1000, 5) : 0, fullMark: 5 },
    { subject: 'CTR', A: metrics?.ctr || 0, fullMark: 5 },
    { subject: 'Imp.', A: metrics?.impressions ? Math.min(metrics.impressions / 10000, 5) : 0, fullMark: 5 },
    { subject: 'CPC', A: metrics?.cpc ? Math.min(5 - metrics.cpc, 5) : 0, fullMark: 5 }
  ]
  
  // Color schemes for charts
  const colors = {
    spend: '#3b82f6',
    clicks: '#8b5cf6',
    impressions: '#f59e0b',
    roas: '#10b981',
    ctr: '#ec4899',
    cpc: '#ef4444'
  }
  
  // Prepare pie chart data
  const pieData = [
    { name: 'Clicks', value: metrics?.clicks || 0, color: colors.clicks },
    { name: 'Impressions', value: metrics?.impressions ? metrics.impressions / 1000 : 0, color: colors.impressions },
    { name: 'Spend', value: metrics?.adSpend ? metrics.adSpend * 10 : 0, color: colors.spend }
  ]

  const insights = getInsights()
  
  return (
    <Card className={cn(
      "overflow-hidden bg-gradient-to-br from-[#0c0c0c] to-[#111] border-[#333] shadow-xl relative",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-[#333] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-500/20 h-8 w-8 rounded-md flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-blue-400" />
          </div>
          <h2 className="text-white font-medium">Performance Overview</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs 
            value={viewMode} 
            onValueChange={setViewMode} 
            className="hidden sm:block"
          >
            <TabsList className="bg-[#1a1a1a] border border-[#333]">
              <TabsTrigger 
                value="areaChart" 
                className="data-[state=active]:bg-[#222] data-[state=active]:text-white text-gray-400"
              >
                <LineChart className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger 
                value="barChart" 
                className="data-[state=active]:bg-[#222] data-[state=active]:text-white text-gray-400"
              >
                <BarChart3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger 
                value="radarChart" 
                className="data-[state=active]:bg-[#222] data-[state=active]:text-white text-gray-400"
              >
                <LayoutDashboard className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger 
                value="pieChart" 
                className="data-[state=active]:bg-[#222] data-[state=active]:text-white text-gray-400"
              >
                <PieChartIcon className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button
            variant="outline" 
            size="sm" 
            className="h-9 bg-[#1a1a1a] hover:bg-[#222] border-[#333]"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline" 
                size="sm" 
                className="h-9 bg-[#1a1a1a] hover:bg-[#222] border-[#333]"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#111] border-[#333]">
              <DropdownMenuItem 
                className="text-xs hover:bg-[#222]"
                onClick={() => setShowInsights(!showInsights)}
              >
                {showInsights ? 'Hide Insights' : 'Show Insights'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Main content */}
      <div className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="text-sm text-gray-400">Loading performance data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <p className="text-sm text-gray-400">No performance data available</p>
          </div>
        ) : (
          <div>
            {/* Insights Section */}
            {showInsights && insights.length > 0 && (
              <div className="p-4 border-b border-[#333] bg-[#0a0a0a]">
                <div className="flex items-center mb-3">
                  <TrendingUp className="h-4 w-4 text-blue-400 mr-2" />
                  <h3 className="text-sm font-medium text-gray-300">Performance Insights</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {insights.map((insight, index) => (
                    <div 
                      key={index} 
                      className="bg-[#1a1a1a] border border-[#333] rounded-md p-3"
                    >
                      <div className="text-xs text-gray-400 mb-1">{insight.metric}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-medium text-white">
                          {insight.metric === 'ROAS' && insight.current.toFixed(2) + 'x'}
                          {insight.metric === 'CTR' && insight.current.toFixed(2) + '%'}
                          {insight.metric === 'CPC' && '$' + insight.current.toFixed(2)}
                          {insight.metric === 'Spend' && '$' + insight.current.toFixed(2)}
                        </div>
                        <div className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full flex items-center",
                          insight.metric === 'CPC' 
                            ? insight.change < 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                            : insight.change > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        )}>
                          {insight.change > 0 ? '+' : ''}{insight.change.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Charts */}
            <div className={cn(
              "p-0 relative",
              !showInsights && "pt-4"
            )}>
              {/* Absolute positioned orbs */}
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-blue-500/5 blur-3xl pointer-events-none opacity-60" />
              <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-purple-500/5 blur-3xl pointer-events-none opacity-60" />
              
              {/* Area Chart */}
              {viewMode === 'areaChart' && (
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data}
                      margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                    >
                      <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors.spend} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={colors.spend} stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorRoas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors.roas} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={colors.roas} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#888" 
                        tickFormatter={formatDate} 
                        tick={{ fill: '#888' }}
                      />
                      <YAxis 
                        yAxisId="left" 
                        stroke="#888" 
                        tick={{ fill: '#888' }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#888" 
                        tick={{ fill: '#888' }}
                        tickFormatter={(value) => `${value}x`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#111', 
                          border: '1px solid #444',
                          borderRadius: '4px' 
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'spend') return ['$' + value.toFixed(2), 'Spend']
                          if (name === 'roas') return [value.toFixed(2) + 'x', 'ROAS']
                          return [value, name]
                        }}
                        labelFormatter={formatDate}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="spend"
                        name="Spend" 
                        stroke={colors.spend} 
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorSpend)"
                        yAxisId="left"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="roas"
                        name="ROAS" 
                        stroke={colors.roas} 
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRoas)"
                        yAxisId="right"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {/* Bar Chart */}
              {viewMode === 'barChart' && (
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data}
                      margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#888" 
                        tickFormatter={formatDate} 
                        tick={{ fill: '#888' }}
                      />
                      <YAxis 
                        yAxisId="left" 
                        stroke="#888" 
                        tick={{ fill: '#888' }}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#888" 
                        tick={{ fill: '#888' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#111', 
                          border: '1px solid #444',
                          borderRadius: '4px' 
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'spend') return ['$' + value.toFixed(2), 'Spend']
                          if (name === 'clicks') return [value, 'Clicks']
                          return [value, name]
                        }}
                        labelFormatter={formatDate}
                      />
                      <Legend />
                      <Bar 
                        dataKey="spend" 
                        name="Spend" 
                        fill={colors.spend} 
                        yAxisId="left"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="clicks" 
                        name="Clicks" 
                        fill={colors.clicks} 
                        yAxisId="right"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {/* Radar Chart */}
              {viewMode === 'radarChart' && (
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#888' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#888' }} />
                      <Radar 
                        name="Performance" 
                        dataKey="A" 
                        stroke={colors.spend} 
                        fill={colors.spend} 
                        fillOpacity={0.5} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#111', 
                          border: '1px solid #444',
                          borderRadius: '4px' 
                        }}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {/* Pie Chart */}
              {viewMode === 'pieChart' && (
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        innerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#111', 
                          border: '1px solid #444',
                          borderRadius: '4px' 
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
} 