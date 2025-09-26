"use client"

import { useState, useEffect } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Eye,
  DollarSign,
  Target,
  Calendar,
  Brain,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  ArrowUp,
  ArrowDown,
  CircleDollarSign,
  Wallet,
  RefreshCw,
  Loader2,
  Play,
  Pause,
  Plus,
  Minus,
  ThumbsUp,
  ThumbsDown,
  TrendingUp as TrendIcon,
  Flame,
  Crown,
  AlertCircle,
  MapPin
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Tooltip, Cell, PieChart as RechartsPieChart } from 'recharts'

interface AdSetOptimization {
  adset_id: string
  adset_name: string
  campaign_name: string
  status: 'ACTIVE' | 'PAUSED' | 'LEARNING'
  budget: number
  spend_today: number
  revenue_today: number
  roas: number
  cpm: number
  ctr: number
  conversion_rate: number
  profit_today: number
  profit_margin: number
  performance_score: number // 0-100
  alert_level: 'success' | 'warning' | 'critical'
  recommendations: OptimizationAction[]
  trend_7d: 'up' | 'down' | 'stable'
  potential_profit_increase: number
}

interface OptimizationAction {
  type: 'budget_increase' | 'budget_decrease' | 'pause' | 'creative_refresh' | 'audience_expand' | 'bid_adjust'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number // 0-100
  estimated_profit_change: number
  estimated_roas_change: number
  action_data?: any
}

interface DashboardSummary {
  total_profit_today: number
  total_spend_today: number
  average_roas: number
  profit_trend: 'up' | 'down' | 'stable'
  profit_change_percent: number
  optimizations_available: number
  potential_profit_increase: number
  top_performer: string
  worst_performer: string
}

interface AIOptimizationDashboardProps {
  preloadedData?: any
}

const COLORS = {
  success: '#10b981',
  warning: '#f59e0b', 
  critical: '#ef4444',
  primary: '#3b82f6',
  purple: '#8b5cf6'
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function AIOptimizationDashboard({ preloadedData }: AIOptimizationDashboardProps = {}) {
  const { selectedBrandId } = useBrandContext()
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<{
    summary: DashboardSummary | null
    adsets: AdSetOptimization[]
    profitData: any[]
    performanceData: any[]
  }>({
    summary: null,
    adsets: [],
    profitData: [],
    performanceData: []
  })
  const [activeTab, setActiveTab] = useState('alerts')
  const [executingAction, setExecutingAction] = useState<string | null>(null)

  useEffect(() => {
    if (selectedBrandId) {
      fetchOptimizationData()
    }
  }, [selectedBrandId])

  const fetchOptimizationData = async () => {
    if (!selectedBrandId) return
    
    setIsLoading(true)
    try {
      // In a real implementation, this would call your API
      // For now, I'll create mock data that demonstrates the features
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      const mockData = generateMockOptimizationData()
      setDashboardData(mockData)
    } catch (error) {
      console.error('Failed to fetch optimization data:', error)
      toast.error('Failed to load optimization data')
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockOptimizationData = () => {
    const adsets: AdSetOptimization[] = [
      {
        adset_id: 'ad1',
        adset_name: 'High-Value Customers 25-45',
        campaign_name: 'Q4 Sales Campaign',
        status: 'ACTIVE',
        budget: 50,
        spend_today: 42.30,
        revenue_today: 156.80,
        roas: 3.71,
        cpm: 12.50,
        ctr: 2.8,
        conversion_rate: 4.2,
        profit_today: 67.20,
        profit_margin: 42.8,
        performance_score: 92,
        alert_level: 'success',
        trend_7d: 'up',
        potential_profit_increase: 25.40,
        recommendations: [
          {
            type: 'budget_increase',
            title: 'Increase Budget by 40%',
            description: 'High ROAS (3.71x) indicates room for scaling',
            impact: 'high',
            confidence: 89,
            estimated_profit_change: 25.40,
            estimated_roas_change: 0.15,
            action_data: { new_budget: 70 }
          }
        ]
      },
      {
        adset_id: 'ad2', 
        adset_name: 'Lookalike Broad Audience',
        campaign_name: 'Q4 Sales Campaign',
        status: 'ACTIVE',
        budget: 35,
        spend_today: 33.90,
        revenue_today: 45.20,
        roas: 1.33,
        cpm: 18.30,
        ctr: 1.9,
        conversion_rate: 1.8,
        profit_today: -12.60,
        profit_margin: -27.9,
        performance_score: 31,
        alert_level: 'critical',
        trend_7d: 'down',
        potential_profit_increase: 0,
        recommendations: [
          {
            type: 'pause',
            title: 'Pause Adset',
            description: 'Negative profit for 3+ days, ROAS below 1.5x threshold',
            impact: 'high',
            confidence: 94,
            estimated_profit_change: 12.60,
            estimated_roas_change: 0,
            action_data: { reason: 'poor_performance' }
          },
          {
            type: 'creative_refresh',
            title: 'Test New Creatives',
            description: 'Low CTR (1.9%) suggests creative fatigue',
            impact: 'medium',
            confidence: 67,
            estimated_profit_change: 8.30,
            estimated_roas_change: 0.45,
            action_data: { creative_type: 'video' }
          }
        ]
      },
      {
        adset_id: 'ad3',
        adset_name: 'Retargeting - Website Visitors',
        campaign_name: 'Retargeting Campaign',
        status: 'ACTIVE',
        budget: 25,
        spend_today: 22.15,
        revenue_today: 89.40,
        roas: 4.04,
        cpm: 8.90,
        ctr: 3.2,
        conversion_rate: 6.8,
        profit_today: 45.30,
        profit_margin: 50.7,
        performance_score: 96,
        alert_level: 'success',
        trend_7d: 'up',
        potential_profit_increase: 18.20,
        recommendations: [
          {
            type: 'budget_increase',
            title: 'Increase Budget by 60%',
            description: 'Excellent ROAS (4.04x) with strong conversion rate',
            impact: 'high',
            confidence: 92,
            estimated_profit_change: 18.20,
            estimated_roas_change: 0.08,
            action_data: { new_budget: 40 }
          }
        ]
      }
    ]

    const summary: DashboardSummary = {
      total_profit_today: adsets.reduce((sum, ad) => sum + ad.profit_today, 0),
      total_spend_today: adsets.reduce((sum, ad) => sum + ad.spend_today, 0),
      average_roas: adsets.reduce((sum, ad) => sum + ad.roas, 0) / adsets.length,
      profit_trend: 'up',
      profit_change_percent: 23.4,
      optimizations_available: adsets.reduce((sum, ad) => sum + ad.recommendations.length, 0),
      potential_profit_increase: adsets.reduce((sum, ad) => sum + ad.potential_profit_increase, 0),
      top_performer: adsets.sort((a, b) => b.performance_score - a.performance_score)[0]?.adset_name || '',
      worst_performer: adsets.sort((a, b) => a.performance_score - b.performance_score)[0]?.adset_name || ''
    }

    const profitData = [
      { time: '6AM', profit: 12.30 },
      { time: '9AM', profit: 28.90 },
      { time: '12PM', profit: 45.60 },
      { time: '3PM', profit: 67.80 },
      { time: '6PM', profit: 89.20 },
      { time: 'Now', profit: summary.total_profit_today }
    ]

    const performanceData = adsets.map(ad => ({
      name: ad.adset_name.split(' ')[0] + '...',
      roas: ad.roas,
      profit: ad.profit_today,
      score: ad.performance_score
    }))

    return {
      summary,
      adsets,
      profitData,
      performanceData
    }
  }

  const executeOptimization = async (adsetId: string, action: OptimizationAction) => {
    setExecutingAction(`${adsetId}-${action.type}`)
    
    try {
      // Simulate API call to execute the optimization
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success(`${action.title} executed successfully!`)
      
      // Refresh data
      await fetchOptimizationData()
    } catch (error) {
      toast.error('Failed to execute optimization')
    } finally {
      setExecutingAction(null)
    }
  }

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-400" />
      default: return <Activity className="w-4 h-4 text-gray-400" />
    }
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'budget_increase': return <Plus className="w-4 h-4" />
      case 'budget_decrease': return <Minus className="w-4 h-4" />
      case 'pause': return <Pause className="w-4 h-4" />
      case 'creative_refresh': return <RefreshCw className="w-4 h-4" />
      case 'audience_expand': return <Target className="w-4 h-4" />
      case 'bid_adjust': return <TrendingUp className="w-4 h-4" />
      default: return <Zap className="w-4 h-4" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (isLoading) {
    return (
      <Card className="h-full bg-[#0a0a0a] border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }

  const { summary, adsets, profitData, performanceData } = dashboardData

  if (!summary) {
    return (
      <Card className="h-full bg-[#0a0a0a] border-gray-800">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No optimization data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full bg-[#0a0a0a] border-gray-800 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-lg text-white">AI Optimization Center</CardTitle>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={fetchOptimizationData}
            disabled={isLoading}
            className="border-gray-600 hover:border-gray-500"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {/* Executive Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="bg-[#1a1a1a] p-3 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Profit Today</p>
                <p className="text-lg font-bold text-green-400">{formatCurrency(summary.total_profit_today)}</p>
              </div>
              <div className="flex items-center gap-1">
                {summary.profit_trend === 'up' ? 
                  <ArrowUp className="w-4 h-4 text-green-400" /> : 
                  <ArrowDown className="w-4 h-4 text-red-400" />
                }
                <span className="text-xs text-gray-400">+{summary.profit_change_percent}%</span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#1a1a1a] p-3 rounded-lg border border-gray-700">
            <div>
              <p className="text-xs text-gray-400">Avg ROAS</p>
              <p className="text-lg font-bold text-blue-400">{summary.average_roas.toFixed(2)}x</p>
            </div>
          </div>
          
          <div className="bg-[#1a1a1a] p-3 rounded-lg border border-gray-700">
            <div>
              <p className="text-xs text-gray-400">Optimizations</p>
              <p className="text-lg font-bold text-purple-400">{summary.optimizations_available}</p>
            </div>
          </div>
          
          <div className="bg-[#1a1a1a] p-3 rounded-lg border border-gray-700">
            <div>
              <p className="text-xs text-gray-400">Potential Gain</p>
              <p className="text-lg font-bold text-yellow-400">{formatCurrency(summary.potential_profit_increase)}</p>
            </div>
          </div>
        </div>

        {/* Priority Actions Banner */}
        {summary.optimizations_available > 0 && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-3 mt-4">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">
                {summary.optimizations_available} optimizations available - potential ${summary.potential_profit_increase.toFixed(2)} daily profit increase
              </span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 bg-[#1a1a1a] border border-gray-700">
            <TabsTrigger value="alerts" className="text-xs">Performance Alerts</TabsTrigger>
            <TabsTrigger value="heatmap" className="text-xs">Profit Heatmap</TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs">Smart Actions</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">AI Insights</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="alerts" className="space-y-3 mt-0">
              {adsets.map((adset) => (
                <div 
                  key={adset.adset_id}
                  className={`bg-[#1a1a1a] border rounded-lg p-4 ${
                    adset.alert_level === 'critical' ? 'border-red-500/30' :
                    adset.alert_level === 'warning' ? 'border-yellow-500/30' :
                    'border-green-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getAlertIcon(adset.alert_level)}
                      <div>
                        <h4 className="text-sm font-medium text-white">{adset.adset_name}</h4>
                        <p className="text-xs text-gray-400">{adset.campaign_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{formatCurrency(adset.profit_today)}</p>
                      <p className="text-xs text-gray-400">Profit Today</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-400">ROAS</p>
                      <p className="text-sm font-medium text-white">{adset.roas.toFixed(2)}x</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Spend</p>
                      <p className="text-sm font-medium text-white">{formatCurrency(adset.spend_today)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">CTR</p>
                      <p className="text-sm font-medium text-white">{adset.ctr}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Score</p>
                      <p className="text-sm font-medium text-white">{adset.performance_score}/100</p>
                    </div>
                  </div>
                  
                  <Progress 
                    value={adset.performance_score} 
                    className="h-2 mb-3"
                    style={{
                      background: `linear-gradient(to right, ${
                        adset.performance_score >= 80 ? COLORS.success :
                        adset.performance_score >= 60 ? COLORS.warning :
                        COLORS.critical
                      } 0%, transparent 0%)`
                    }}
                  />
                  
                  {adset.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-300">Recommended Actions:</p>
                      {adset.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#0f0f0f] p-2 rounded border border-gray-700">
                          <div className="flex items-center gap-2 flex-1">
                            {getActionIcon(rec.type)}
                            <div>
                              <p className="text-xs font-medium text-white">{rec.title}</p>
                              <p className="text-xs text-gray-400">{rec.description}</p>
                            </div>
                          </div>
                          <div className="text-right mr-3">
                            <p className="text-xs text-green-400">+{formatCurrency(rec.estimated_profit_change)}</p>
                            <p className="text-xs text-gray-400">{rec.confidence}% confidence</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500/30 hover:border-blue-500/50 text-blue-400"
                            onClick={() => executeOptimization(adset.adset_id, rec)}
                            disabled={executingAction === `${adset.adset_id}-${rec.type}`}
                          >
                            {executingAction === `${adset.adset_id}-${rec.type}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Apply'
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="heatmap" className="mt-0">
              <div className="space-y-4">
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700">
                  <h4 className="text-sm font-medium text-white mb-3">Profit Trend Today</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={profitData}>
                      <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #374151',
                          borderRadius: '8px' 
                        }}
                        formatter={(value) => [formatCurrency(Number(value)), 'Profit']}
                      />
                      <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700">
                  <h4 className="text-sm font-medium text-white mb-3">AdSet Performance Matrix</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={performanceData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #374151',
                          borderRadius: '8px' 
                        }}
                      />
                      <Bar dataKey="roas" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="recommendations" className="mt-0">
              <div className="space-y-3">
                {adsets.flatMap(adset => 
                  adset.recommendations.map((rec, idx) => (
                    <div key={`${adset.adset_id}-${idx}`} className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getActionIcon(rec.type)}
                          <div>
                            <h4 className="text-sm font-medium text-white">{rec.title}</h4>
                            <p className="text-xs text-gray-400">{adset.adset_name}</p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`
                            ${rec.impact === 'high' ? 'border-red-500/30 text-red-400' : 
                              rec.impact === 'medium' ? 'border-yellow-500/30 text-yellow-400' : 
                              'border-green-500/30 text-green-400'}
                          `}
                        >
                          {rec.impact} impact
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-300 mb-3">{rec.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-gray-400">Estimated Profit Gain</p>
                            <p className="text-sm font-medium text-green-400">{formatCurrency(rec.estimated_profit_change)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Confidence</p>
                            <p className="text-sm font-medium text-white">{rec.confidence}%</p>
                          </div>
                        </div>
                        
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => executeOptimization(adset.adset_id, rec)}
                          disabled={executingAction === `${adset.adset_id}-${rec.type}`}
                        >
                          {executingAction === `${adset.adset_id}-${rec.type}` ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Zap className="w-4 h-4 mr-2" />
                          )}
                          Execute
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="insights" className="mt-0">
              <div className="space-y-4">
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <h4 className="text-sm font-medium text-white">Top Performer</h4>
                  </div>
                  <p className="text-sm text-gray-300">
                    <span className="text-green-400 font-medium">{summary.top_performer}</span> is your best performing adset today with excellent profitability and efficiency.
                  </p>
                </div>
                
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <h4 className="text-sm font-medium text-white">Needs Attention</h4>
                  </div>
                  <p className="text-sm text-gray-300">
                    <span className="text-red-400 font-medium">{summary.worst_performer}</span> is underperforming and may need immediate optimization or pausing.
                  </p>
                </div>
                
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-medium text-white">AI Recommendation</h4>
                  </div>
                  <p className="text-sm text-gray-300">
                    Focus on scaling your high-ROAS adsets while optimizing or pausing underperformers. 
                    You have <span className="text-yellow-400 font-medium">${summary.potential_profit_increase.toFixed(2)}</span> in 
                    potential daily profit improvements available.
                  </p>
                </div>
                
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-medium text-white">Next Steps</h4>
                  </div>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Execute high-confidence optimizations first</li>
                    <li>• Monitor performance changes over 24-48 hours</li>
                    <li>• Consider creative refresh for low-CTR adsets</li>
                    <li>• Scale profitable audiences gradually</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
