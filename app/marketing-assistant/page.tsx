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
  Clock,
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
  Activity,
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
  const [actionLog, setActionLog] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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
    
    setLoading(true)
    try {
      await Promise.all([
        loadKPIMetrics(),
        loadOptimizationRecommendations(),
        loadExperimentQueue(),
        loadAlerts(),
        loadActionLog()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
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
    // Load staged and running experiments
    setExperimentQueue([
      {
        id: '1',
        type: 'staged',
        campaignName: 'Holiday Campaign 2024',
        action: 'Increase budget by 25%',
        projectedImpact: '+$2,400 revenue',
        risk: 'low'
      },
      {
        id: '2',
        type: 'running',
        campaignName: 'Black Friday Special',
        action: 'Test new audience segment',
        projectedImpact: '+15% ROAS',
        risk: 'medium'
      }
    ])
  }

  const loadAlerts = async () => {
    // Load system alerts and warnings
    setAlerts([
      {
        id: '1',
        type: 'warning',
        title: 'High frequency detected',
        description: 'Campaign "Summer Sale" showing 4.2x frequency - consider creative rotation',
        timestamp: new Date(),
        acknowledged: false
      },
      {
        id: '2',
        type: 'error',
        title: 'Low CTR alert',
        description: 'Ad set "Lookalike 1%" CTR dropped below 1.5%',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        acknowledged: false
      }
    ])
  }

  const loadActionLog = async () => {
    if (!selectedBrandId) return

    try {
      const response = await fetch(`/api/marketing-assistant/action-log?brandId=${selectedBrandId}&limit=20`)
      
      if (response.ok) {
        const data = await response.json()
        setActionLog(data.actions)
      }
    } catch (error) {
      console.error('Error loading action log:', error)
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

  const handleRevertAction = async (actionId: string) => {
    try {
      const response = await fetch('/api/marketing-assistant/action-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'revert',
          actionId,
          brandId: selectedBrandId
        })
      })

      if (response.ok) {
        // Reload action log and dashboard data
        loadActionLog()
        loadDashboardData()
      }
    } catch (error) {
      console.error('Error reverting action:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] p-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B]" 
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
      
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-6 h-screen">
          
          {/* Left Rail - Sticky */}
          <div className="col-span-3 space-y-6 overflow-y-auto">
            
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
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No staged experiments</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Main Work Area */}
          <div className="col-span-6 space-y-6 overflow-y-auto">
            
            {/* KPI Band */}
            {kpiMetrics && (
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl 
                                    flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-blue-400" />
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
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl 
                                    flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-400" />
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
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl 
                                    flex items-center justify-center">
                        <Eye className="w-5 h-5 text-purple-400" />
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
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl 
                                    flex items-center justify-center">
                        <MousePointer className="w-5 h-5 text-orange-400" />
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
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            card.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            card.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            <Target className="w-4 h-4" />
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
          <div className="col-span-3 space-y-6 overflow-y-auto">
            
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
                  <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                    <div>
                      <p className="text-gray-400 text-sm">Spend</p>
                      <p className="text-white font-semibold">${kpiMetrics?.spend.toLocaleString() || 0}</p>
                    </div>
                    <div className="flex items-center gap-1 text-green-400">
                      <ArrowUpRight className="w-4 h-4" />
                      <span className="text-sm">+12%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                    <div>
                      <p className="text-gray-400 text-sm">Revenue</p>
                      <p className="text-white font-semibold">${kpiMetrics?.revenue.toLocaleString() || 0}</p>
                    </div>
                    <div className="flex items-center gap-1 text-green-400">
                      <ArrowUpRight className="w-4 h-4" />
                      <span className="text-sm">+8%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                    <div>
                      <p className="text-gray-400 text-sm">ROAS</p>
                      <p className="text-white font-semibold">{kpiMetrics?.roas.toFixed(2) || 0}x</p>
                    </div>
                    <div className="flex items-center gap-1 text-red-400">
                      <ArrowDownRight className="w-4 h-4" />
                      <span className="text-sm">-3%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333]">
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                flex items-center justify-center border border-white/10">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
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

            {/* Action Log */}
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333]">
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                flex items-center justify-center border border-white/10">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Action Log</h3>
                    <p className="text-gray-400 text-sm">{actionLog.length} recent changes</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {actionLog.map((action: any) => (
                    <div key={action.id} className="p-3 bg-[#1A1A1A] border border-[#333] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={
                          action.status === 'applied' ? 'default' : 
                          action.status === 'reverted' ? 'destructive' : 
                          'secondary'
                        }>
                          {action.status}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(action.appliedAt || action.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-white text-sm mb-2">{action.description}</p>
                      {action.impact && (
                        <p className="text-green-400 text-xs">
                          Impact: +${action.impact.revenue?.toLocaleString() || 0} revenue
                        </p>
                      )}
                      {action.canRevert && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2 text-xs border-[#333] text-gray-300"
                          onClick={() => handleRevertAction(action.id)}
                        >
                          Revert
                        </Button>
                      )}
                    </div>
                  ))}
                  {actionLog.length === 0 && (
                    <div className="text-center py-6 text-gray-400">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent actions</p>
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
