"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useBrandContext } from '@/lib/context/BrandContext'

// Components
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/DateRangePicker'
import BrandSelector from '@/components/BrandSelector'
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"

// Icons
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Zap, 
  DollarSign, 
  Eye, 
  MousePointer, 
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Settings,
  RefreshCw,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Sparkles
} from 'lucide-react'

interface KPIMetrics {
  spend: number
  impressions: number
  clicks: number
  conversions: number
  cpa: number
  cpc: number
  roas: number
  revenue: number
  ctr: number
  costPerConversion: number
}

interface OptimizationCard {
  id: string
  type: 'budget' | 'audience' | 'creative' | 'bid' | 'frequency'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  rootCause: string
  actions: Array<{
    id: string
    type: string
    label: string
    impact: {
      revenue: number
      roas: number
      confidence: number
    }
    estimatedTimeToStabilize: string
  }>
  currentValue: string
  recommendedValue: string
  projectedImpact: {
    revenue: number
    roas: number
    confidence: number
  }
}

interface ExperimentQueueItem {
  id: string
  type: 'staged' | 'running' | 'completed'
  campaignName: string
  action: string
  projectedImpact: string
  risk: 'low' | 'medium' | 'high'
  scheduledFor?: Date
}

interface AlertItem {
  id: string
  type: 'warning' | 'error' | 'info'
  title: string
  description: string
  timestamp: Date
  acknowledged: boolean
}

export default function MarketingAssistantPage() {
  const { userId } = useAuth()
  const { selectedBrandId } = useBrandContext()
  
  // State
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null)
  const [optimizationCards, setOptimizationCards] = useState<OptimizationCard[]>([])
  const [experimentQueue, setExperimentQueue] = useState<ExperimentQueueItem[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [trends, setTrends] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [initialDataLoad, setInitialDataLoad] = useState(true)
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // Last 7 days  
    to: new Date()
  })
  const [selectedPlatforms, setSelectedPlatforms] = useState(['meta', 'google', 'tiktok'])
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable')

  // Data Loading
  useEffect(() => {
    if (selectedBrandId) {
      loadDashboardData()
    }
  }, [selectedBrandId, dateRange])

  const loadDashboardData = async () => {
    if (!selectedBrandId) return
    
    // Use initialDataLoad for first load, isRefreshingData for subsequent loads
    if (initialDataLoad) {
      setLoading(true)
      setIsRefreshingData(false)
    } else {
      setIsRefreshingData(true)
      setLoading(false)
    }
    
    try {
      await Promise.all([
        loadKPIMetrics(),
        loadOptimizationRecommendations(),
        loadExperimentQueue(),
        loadAlerts(),
        loadTrends()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      if (initialDataLoad) {
        setInitialDataLoad(false)
        setLoading(false)
      } else {
        setIsRefreshingData(false)
      }
    }
  }

  const loadKPIMetrics = async () => {
    if (!selectedBrandId) return

    try {
      const response = await fetch(`/api/marketing-assistant/metrics?brandId=${selectedBrandId}&from=${dateRange.from.toISOString().split('T')[0]}&to=${dateRange.to.toISOString().split('T')[0]}&platforms=${selectedPlatforms.join(',')}`)
      
      if (response.ok) {
        const data = await response.json()
        setKpiMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Error loading KPI metrics:', error)
    }
  }

  const loadOptimizationRecommendations = async () => {
    if (!selectedBrandId) return

    try {
      const response = await fetch(`/api/marketing-assistant/recommendations?brandId=${selectedBrandId}&from=${dateRange.from.toISOString().split('T')[0]}&to=${dateRange.to.toISOString().split('T')[0]}`)
      
      if (response.ok) {
        const data = await response.json()
        setOptimizationCards(data.recommendations)
      }
    } catch (error) {
      console.error('Error loading optimization recommendations:', error)
    }
  }

  const loadExperimentQueue = async () => {
    if (!selectedBrandId) return

    try {
      // Get staged experiments (pending actions)
      const response = await fetch(`/api/marketing-assistant/action-log?brandId=${selectedBrandId}&limit=20`)
      
      if (response.ok) {
        const data = await response.json()
        
        // Transform action log data into experiment queue format
        const experiments = data.actions
          .filter((action: any) => action.status === 'pending' || action.status === 'applied')
          .map((action: any) => ({
            id: action.id,
            type: action.status === 'pending' ? 'staged' : 'running',
            campaignName: action.campaignId || 'Unknown Campaign',
            action: action.description,
            projectedImpact: action.impact ? `+$${action.impact.revenue?.toLocaleString() || 0}` : '+0',
            risk: determineRiskLevel(action),
            scheduledFor: action.status === 'pending' ? new Date() : undefined
          }))

        setExperimentQueue(experiments)
      }
    } catch (error) {
      console.error('Error loading experiment queue:', error)
      setExperimentQueue([])
    }
  }

  const determineRiskLevel = (action: any): 'low' | 'medium' | 'high' => {
    const impactValue = action.impact?.revenue || 0
    if (impactValue > 5000) return 'high'
    if (impactValue > 1000) return 'medium'
    return 'low'
  }

  const loadAlerts = async () => {
    if (!selectedBrandId) return

    try {
      // Get both current metrics and trends for comparison
      const [metricsResponse, trendsResponse] = await Promise.all([
        fetch(`/api/marketing-assistant/metrics?brandId=${selectedBrandId}&from=${dateRange.from.toISOString().split('T')[0]}&to=${dateRange.to.toISOString().split('T')[0]}&platforms=${selectedPlatforms.join(',')}`),
        fetch(`/api/marketing-assistant/trends?brandId=${selectedBrandId}&days=7`)
      ])
      
      if (metricsResponse.ok && trendsResponse.ok) {
        const metricsData = await metricsResponse.json()
        const trendsData = await trendsResponse.json()
        const metrics = metricsData.metrics
        const trends = trendsData.trends
        const generatedAlerts: AlertItem[] = []

        // Trend-based alerts with real performance analysis
        if (trends?.spend && trends.spend.change > 50 && trends.spend.current > 200) {
          generatedAlerts.push({
            id: 'spend-surge',
            type: 'warning',
            title: 'Ad Spend Surging',
            description: `Spend increased ${trends.spend.change}% to $${trends.spend.current.toLocaleString()} - monitor ROAS closely`,
            timestamp: new Date(),
            acknowledged: false
          })
        }

        if (trends?.cac && trends.cac.change > 30 && trends.cac.current > 25) {
          generatedAlerts.push({
            id: 'cac-rising',
            type: 'error',
            title: 'CAC Rising Fast',
            description: `Customer acquisition cost up ${trends.cac.change}% to $${trends.cac.current.toFixed(2)} - check targeting efficiency`,
            timestamp: new Date(),
            acknowledged: false
          })
        }

        if (trends?.roas && trends.roas.change < -20 && trends.roas.current < 2.5) {
          generatedAlerts.push({
            id: 'roas-dropping',
            type: 'error',
            title: 'ROAS Declining',
            description: `ROAS dropped ${Math.abs(trends.roas.change)}% to ${trends.roas.current.toFixed(2)}x - immediate optimization needed`,
            timestamp: new Date(),
            acknowledged: false
          })
        }

        if (trends?.revenue && trends.revenue.change < -15 && trends.revenue.current > 1000) {
          generatedAlerts.push({
            id: 'revenue-drop',
            type: 'warning',
            title: 'Revenue Decreasing',
            description: `Revenue down ${Math.abs(trends.revenue.change)}% to $${trends.revenue.current.toLocaleString()} - investigate campaign performance`,
            timestamp: new Date(),
            acknowledged: false
          })
        }

        // Static threshold alerts
        if (metrics.ctr < 1.0 && metrics.impressions > 1000) {
          generatedAlerts.push({
            id: 'low-ctr',
            type: 'warning',
            title: 'Poor Ad Engagement',
            description: `CTR of ${metrics.ctr.toFixed(2)}% suggests ad fatigue - consider creative refresh`,
            timestamp: new Date(),
            acknowledged: false
          })
        }

        if (metrics.cpc > 3.0 && metrics.clicks > 50) {
          generatedAlerts.push({
            id: 'high-cpc',
            type: 'error',
            title: 'High Cost Per Click',
            description: `CPC of $${metrics.cpc.toFixed(2)} is inefficient - optimize targeting or pause underperforming ads`,
            timestamp: new Date(),
            acknowledged: false
          })
        }

        // Opportunity alerts
        if (trends?.revenue && trends.revenue.change > 25 && metrics.roas > 3.0) {
          generatedAlerts.push({
            id: 'scale-opportunity',
            type: 'info',
            title: 'Scaling Opportunity',
            description: `Revenue up ${trends.revenue.change}% with ${metrics.roas.toFixed(2)}x ROAS - consider increasing budgets`,
            timestamp: new Date(),
            acknowledged: false
          })
        }

        setAlerts(generatedAlerts)
      }
    } catch (error) {
      console.error('Error loading alerts:', error)
      setAlerts([])
    }
  }


  const handleApplyAction = async (cardId: string, actionId: string) => {
    try {
      const card = optimizationCards.find(c => c.id === cardId)
      if (!card) return

      const response = await fetch('/api/marketing-assistant/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'apply_action',
          campaignId: card.actions[0]?.id || card.id,
          actionId,
          brandId: selectedBrandId
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Add to experiment queue as running
        setExperimentQueue(prev => [...prev, {
          id: `exp_${Date.now()}`,
          type: 'running',
          campaignName: card.title,
          action: card.actions.find(a => a.id === actionId)?.label || 'Unknown action',
          projectedImpact: `+$${card.projectedImpact.revenue.toLocaleString()}`,
          risk: 'low'
        }])

        // Remove the applied recommendation
        setOptimizationCards(prev => prev.filter(c => c.id !== cardId))
        
        // Reload data
        loadDashboardData()
      }
    } catch (error) {
      console.error('Error applying action:', error)
    }
  }

  const handleBatchApply = async (selectedCards: string[]) => {
    // Apply multiple actions at once
    console.log('Applying batch actions:', selectedCards)
  }


  const loadTrends = async () => {
    if (!selectedBrandId) return

    try {
      // Calculate days between selected date range for proper comparison
      const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) || 7
      const response = await fetch(`/api/marketing-assistant/trends?brandId=${selectedBrandId}&days=${daysDiff}&fromDate=${dateRange.from.toISOString().split('T')[0]}&toDate=${dateRange.to.toISOString().split('T')[0]}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[Dashboard] Trends data received:', data)
        setTrends(data.trends)
      } else {
        console.error('Failed to load trends')
        setTrends(null)
      }
    } catch (error) {
      console.error('Error loading trends:', error)
      setTrends(null)
    }
  }

  if (loading) {
    const loadingConfig = getPageLoadingConfig('/marketing-assistant')
    return (
      <UnifiedLoading 
        variant="page"
        size="lg"
        message={loadingConfig.message}
        subMessage={loadingConfig.subMessage}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] relative" 
         style={{
           backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
             <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
               <defs>
                 <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                   <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.05"/>
                 </pattern>
               </defs>
               <rect width="100%" height="100%" fill="url(#grid)" />
             </svg>
           `)}")`,
           backgroundRepeat: 'repeat',
           backgroundSize: '40px 40px',
           backgroundAttachment: 'fixed'
         }}>
       
       {/* Loading overlay for data refreshes */}
       {isRefreshingData && (
         <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
           <div className="bg-[#111] border border-[#333] rounded-lg p-6 text-center">
             <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-white mx-auto mb-3"></div>
             <p className="text-white text-sm">Refreshing data...</p>
           </div>
         </div>
       )}
      
      <div className="w-full px-6 py-4">
        <div className="grid grid-cols-12 gap-4 h-screen">
          
          {/* Left Rail - Sticky */}
          <div className="col-span-3 space-y-4 overflow-y-auto">
            
            {/* Scope & Filters */}
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333]">
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                flex items-center justify-center border border-white/10">
                    <Filter className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Scope & Filters</h3>
                    <p className="text-gray-400 text-sm">Configure analysis parameters</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Date Range</label>
                  <DateRangePicker 
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Platforms</label>
                  <Select value={selectedPlatforms.join(',')} onValueChange={(value) => setSelectedPlatforms(value.split(','))}>
                    <SelectTrigger className="bg-[#2A2A2A] border-[#333] text-white">
                      <SelectValue placeholder="Select platforms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta,google,tiktok">All Platforms</SelectItem>
                      <SelectItem value="meta">Meta Only</SelectItem>
                      <SelectItem value="google">Google Only</SelectItem>
                      <SelectItem value="tiktok">TikTok Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Campaign Status</label>
                  <Select defaultValue="active">
                    <SelectTrigger className="bg-[#2A2A2A] border-[#333] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="all">All Campaigns</SelectItem>
                      <SelectItem value="paused">Paused Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Attribution Window</label>
                  <Select defaultValue="7d_click_1d_view">
                    <SelectTrigger className="bg-[#2A2A2A] border-[#333] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d_click">1-day click</SelectItem>
                      <SelectItem value="7d_click_1d_view">7-day click, 1-day view</SelectItem>
                      <SelectItem value="28d_click_1d_view">28-day click, 1-day view</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Experiment Queue */}
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333]">
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                  flex items-center justify-center border border-white/10">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Experiment Queue</h3>
                      <p className="text-gray-400 text-sm">{experimentQueue.length} staged actions</p>
                    </div>
                  </div>
                  {experimentQueue.filter(exp => exp.type === 'staged').length > 0 && (
                    <Button 
                      onClick={() => handleBatchApply(experimentQueue.filter(exp => exp.type === 'staged').map(exp => exp.id))}
                      className="bg-[#FF2A2A] hover:bg-[#FF2A2A]/80 text-white text-xs px-3 py-1"
                    >
                      Run All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {experimentQueue.map(exp => (
                    <div key={exp.id} className="p-3 bg-[#1A1A1A] border border-[#333] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={exp.type === 'staged' ? 'secondary' : exp.type === 'running' ? 'default' : 'outline'}>
                          {exp.type}
                        </Badge>
                        <Badge variant={exp.risk === 'low' ? 'secondary' : exp.risk === 'medium' ? 'default' : 'destructive'}>
                          {exp.risk} risk
                        </Badge>
                      </div>
                      <h4 className="text-white font-medium text-sm">{exp.campaignName}</h4>
                      <p className="text-gray-400 text-xs mt-1">{exp.action}</p>
                      <p className="text-green-400 text-xs mt-1">{exp.projectedImpact}</p>
                      {exp.type === 'staged' && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" className="text-xs">Preview</Button>
                          <Button size="sm" className="bg-[#FF2A2A] hover:bg-[#FF2A2A]/80 text-xs">Apply</Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {experimentQueue.length === 0 && (
                    <div className="text-center py-6 text-gray-400">
                      <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No staged experiments</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Main Work Area */}
          <div className="col-span-6 space-y-4 overflow-y-auto">
            
            {/* KPI Band */}
            {kpiMetrics && (
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                   flex items-center justify-center border border-white/10">
                       <DollarSign className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Total Spend</p>
                        <p className="text-white text-lg font-bold">${kpiMetrics.spend.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                   flex items-center justify-center border border-white/10">
                       <TrendingUp className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">ROAS</p>
                        <p className="text-white text-lg font-bold">{kpiMetrics.roas.toFixed(2)}x</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                   flex items-center justify-center border border-white/10">
                       <Eye className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Impressions</p>
                        <p className="text-white text-lg font-bold">{kpiMetrics.impressions.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                   flex items-center justify-center border border-white/10">
                       <MousePointer className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">CTR</p>
                        <p className="text-white text-lg font-bold">{kpiMetrics.ctr.toFixed(2)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Optimization Feed */}
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333]">
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                  flex items-center justify-center border border-white/10">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">AI Optimization Feed</h2>
                      <p className="text-gray-400">Prioritized recommendations based on performance analysis</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-[#333] text-gray-300">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {optimizationCards.map(card => (
                    <div key={card.id} className="p-4 bg-[#1A1A1A] border border-[#333] rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
                            <Target className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{card.title}</h3>
                            <Badge variant={card.priority === 'high' ? 'destructive' : card.priority === 'medium' ? 'default' : 'secondary'}>
                              {card.priority} priority
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-semibold">+${card.projectedImpact.revenue.toLocaleString()}</p>
                          <p className="text-gray-400 text-sm">{card.projectedImpact.confidence}% confidence</p>
                        </div>
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-3">{card.description}</p>
                      
                      <div className="bg-[#0F0F0F] p-3 rounded-lg mb-3">
                        <p className="text-gray-400 text-xs mb-1">Root Cause Analysis</p>
                        <p className="text-gray-300 text-sm">{card.rootCause}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-gray-400">Current: </span>
                          <span className="text-white">{card.currentValue}</span>
                          <span className="text-gray-400 mx-2">→</span>
                          <span className="text-green-400">{card.recommendedValue}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-[#333] text-gray-300">
                            Simulate
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-[#FF2A2A] hover:bg-[#FF2A2A]/80"
                            onClick={() => handleApplyAction(card.id, card.actions[0]?.id)}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {optimizationCards.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No optimization opportunities detected</h3>
                      <p className="text-sm">Your campaigns are performing well. Check back later for new recommendations.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Rail - Sticky */}
          <div className="col-span-3 space-y-4 overflow-y-auto">
            
            {/* Trends */}
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333]">
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                flex items-center justify-center border border-white/10">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Performance Trends</h3>
                    <p className="text-gray-400 text-sm">7-day overview</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {trends && (
                    <>
                      <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                        <div>
                          <p className="text-gray-400 text-sm">Spend</p>
                          <p className="text-white font-semibold">${trends.spend.current.toLocaleString()}</p>
                        </div>
                        <div className={`flex items-center gap-1 ${trends.spend.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                          {trends.spend.direction === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          <span className="text-sm">{trends.spend.change > 0 ? '+' : ''}{trends.spend.change}%</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                        <div>
                          <p className="text-gray-400 text-sm">Revenue</p>
                          <p className="text-white font-semibold">${trends.revenue.current.toLocaleString()}</p>
                        </div>
                        <div className={`flex items-center gap-1 ${trends.revenue.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                          {trends.revenue.direction === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          <span className="text-sm">{trends.revenue.change > 0 ? '+' : ''}{trends.revenue.change}%</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                        <div>
                          <p className="text-gray-400 text-sm">ROAS</p>
                          <p className="text-white font-semibold">{trends.roas.current.toFixed(2)}x</p>
                        </div>
                        <div className={`flex items-center gap-1 ${trends.roas.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                          {trends.roas.direction === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          <span className="text-sm">{trends.roas.change > 0 ? '+' : ''}{trends.roas.change}%</span>
                        </div>
                      </div>
                    </>
                  )}
                  {!trends && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                        <div>
                          <p className="text-gray-400 text-sm">Spend</p>
                          <p className="text-white font-semibold">${kpiMetrics?.spend.toLocaleString() || 0}</p>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <span className="text-sm">—</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                        <div>
                          <p className="text-gray-400 text-sm">Revenue</p>
                          <p className="text-white font-semibold">${kpiMetrics?.revenue.toLocaleString() || 0}</p>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <span className="text-sm">—</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                        <div>
                          <p className="text-gray-400 text-sm">ROAS</p>
                          <p className="text-white font-semibold">{kpiMetrics?.roas.toFixed(2) || 0}x</p>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <span className="text-sm">—</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333]">
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                flex items-center justify-center border border-white/10">
                    <AlertTriangle className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Alerts</h3>
                    <p className="text-gray-400 text-sm">{alerts.filter(a => !a.acknowledged).length} unread</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {alerts.map(alert => (
                    <div key={alert.id} className={`p-3 rounded-lg border ${
                      alert.type === 'error' ? 'bg-red-500/10 border-red-500/20' :
                      alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
                      'bg-blue-500/10 border-blue-500/20'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-white font-medium text-sm">{alert.title}</h4>
                        {!alert.acknowledged && (
                          <div className={`w-2 h-2 rounded-full ${
                            alert.type === 'error' ? 'bg-red-400' :
                            alert.type === 'warning' ? 'bg-yellow-400' :
                            'bg-blue-400'
                          }`} />
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mb-2">{alert.description}</p>
                      <p className="text-gray-500 text-xs">{alert.timestamp.toLocaleTimeString()}</p>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-center py-6 text-gray-400">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">All systems running smoothly</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
