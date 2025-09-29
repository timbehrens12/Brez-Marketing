"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useBrandContext } from '@/lib/context/BrandContext'

// Components
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  PieChart,
  Users,
  Globe,
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

interface BudgetAllocation {
  id: string
  campaignName: string
  currentBudget: number
  suggestedBudget: number
  currentRoas: number
  projectedRoas: number
  confidence: number
  risk: 'low' | 'medium' | 'high'
}

interface AudienceExpansion {
  id: string
  type: 'lookalike' | 'interest' | 'geographic' | 'demographic'
  title: string
  description: string
  currentReach: number
  projectedReach: number
  estimatedCpa: number
  confidence: number
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
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [trends, setTrends] = useState<any>(null)
  const [budgetAllocations, setBudgetAllocations] = useState<any[]>([])
  const [audienceExpansions, setAudienceExpansions] = useState<any[]>([])
  const [scalingTab, setScalingTab] = useState('budget')
  const [loading, setLoading] = useState(true)
  const [initialDataLoad, setInitialDataLoad] = useState(true)
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const [simulationData, setSimulationData] = useState<any>(null)
  const [showSimulation, setShowSimulation] = useState(false)
  const [explanationData, setExplanationData] = useState<any>(null)
  const [showExplanation, setShowExplanation] = useState(false)
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
      loadBudgetAllocations(),
      loadAudienceExpansions(),
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

  const loadBudgetAllocations = async () => {
    if (!selectedBrandId) return
    
    try {
      const response = await fetch(`/api/marketing-assistant/budget-allocation?brandId=${selectedBrandId}&fromDate=${dateRange.from.toISOString()}&toDate=${dateRange.to.toISOString()}`)
      if (response.ok) {
        const data = await response.json()
        setBudgetAllocations(data.allocations || [])
      }
    } catch (error) {
      console.error('Error loading budget allocations:', error)
      setBudgetAllocations([])
    }
  }

  const loadAudienceExpansions = async () => {
    if (!selectedBrandId) return
    
    try {
      const response = await fetch(`/api/marketing-assistant/audience-expansion?brandId=${selectedBrandId}`)
      if (response.ok) {
        const data = await response.json()
        setAudienceExpansions(data.opportunities || [])
      }
    } catch (error) {
      console.error('Error loading audience expansions:', error)
      setAudienceExpansions([])
    }
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

        // Always generate some basic alerts for testing
        if (metrics) {
          // Low performance alerts
          if (metrics.ctr < 2.0) {
            generatedAlerts.push({
              id: 'low-engagement',
              type: 'warning',
              title: 'Low Click-Through Rate',
              description: `CTR of ${metrics.ctr.toFixed(2)}% is below 2% benchmark - creative refresh may improve performance`,
              timestamp: new Date(),
              acknowledged: false
            })
          }

          // High CPC alerts
          if (metrics.cpc > 1.0) {
            generatedAlerts.push({
              id: 'high-cpc',
              type: 'error',
              title: 'High Cost Per Click',
              description: `CPC of $${metrics.cpc.toFixed(2)} is above $1.00 - consider optimizing targeting or ad quality`,
              timestamp: new Date(),
              acknowledged: false
            })
          }

          // Low ROAS alerts
          if (metrics.roas < 2.0 && metrics.spend > 1) {
            generatedAlerts.push({
              id: 'low-roas',
              type: 'error',
              title: 'Low Return on Ad Spend',
              description: `ROAS of ${metrics.roas.toFixed(2)}x is below 2x target - review campaign effectiveness`,
              timestamp: new Date(),
              acknowledged: false
            })
          }

          // Revenue tracking alerts
          if (metrics.spend > 1 && metrics.revenue === 0) {
            generatedAlerts.push({
              id: 'no-revenue-tracking',
              type: 'warning',
              title: 'Revenue Tracking Issue',
              description: `Campaign has spend of $${metrics.spend.toFixed(2)} but no tracked revenue - verify conversion tracking`,
              timestamp: new Date(),
              acknowledged: false
            })
          }
        }

        // Trend-based alerts with lower thresholds
        if (trends?.spend && trends.spend.change > 20 && trends.spend.current > 5) {
          generatedAlerts.push({
            id: 'spend-increase',
            type: 'info',
            title: 'Ad Spend Increased',
            description: `Spend increased ${trends.spend.change}% to $${trends.spend.current.toLocaleString()} - monitor performance closely`,
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


  const handleMarkAsDone = async (cardId: string, actionId: string) => {
    try {
      const card = optimizationCards.find(c => c.id === cardId)
      if (!card) return

      // Log the action as manually completed
      const response = await fetch('/api/marketing-assistant/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'mark_done',
          campaignId: card.id,
          actionId,
          brandId: selectedBrandId,
          status: 'completed_manually'
        })
      })

      if (response.ok) {
        // Remove the completed recommendation from the UI
        setOptimizationCards(prev => prev.filter(c => c.id !== cardId))
        console.log(`Marked recommendation ${cardId} as done`)
      }
    } catch (error) {
      console.error('Error marking as done:', error)
    }
  }

  const handleExplainRecommendation = async (cardId: string) => {
    try {
      const card = optimizationCards.find(c => c.id === cardId)
      if (!card) return

      const response = await fetch('/api/marketing-assistant/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'recommendation',
          data: card,
          brandId: selectedBrandId
        })
      })

      if (response.ok) {
        const explanation = await response.json()
        setExplanationData(explanation)
        setShowExplanation(true)
      }
    } catch (error) {
      console.error('Error getting explanation:', error)
    }
  }

  const handleExplainBudgetAllocation = async (allocationId: string) => {
    try {
      const allocation = budgetAllocations.find(a => a.id === allocationId)
      if (!allocation) return

      const response = await fetch('/api/marketing-assistant/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'budget_allocation',
          data: allocation,
          brandId: selectedBrandId
        })
      })

      if (response.ok) {
        const explanation = await response.json()
        setExplanationData(explanation)
        setShowExplanation(true)
      }
    } catch (error) {
      console.error('Error getting budget explanation:', error)
    }
  }

  const handleExplainAudienceExpansion = async (expansionId: string) => {
    try {
      const expansion = audienceExpansions.find(e => e.id === expansionId)
      if (!expansion) return

      const response = await fetch('/api/marketing-assistant/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'audience_expansion',
          data: expansion,
          brandId: selectedBrandId
        })
      })

      if (response.ok) {
        const explanation = await response.json()
        setExplanationData(explanation)
        setShowExplanation(true)
      }
    } catch (error) {
      console.error('Error getting audience explanation:', error)
    }
  }

  const handleMarkBudgetAsDone = async (allocationId: string) => {
    try {
      setBudgetAllocations(prev => prev.filter(a => a.id !== allocationId))
    } catch (error) {
      console.error('Error marking budget allocation as done:', error)
    }
  }

  const handleMarkAudienceAsDone = async (expansionId: string) => {
    try {
      setAudienceExpansions(prev => prev.filter(e => e.id !== expansionId))
    } catch (error) {
      console.error('Error marking audience expansion as done:', error)
    }
  }

  const handleSimulateAction = async (cardId: string, actionId: string) => {
    try {
      const card = optimizationCards.find(c => c.id === cardId)
      if (!card) {
        console.error('Card not found:', cardId)
        return
      }

      console.log('Simulating action:', { cardId, actionId, card })

      const response = await fetch('/api/marketing-assistant/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'simulate_action',
          campaignId: card.id,
          actionId,
          brandId: selectedBrandId
        })
      })

      console.log('Simulation response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Simulation result:', result)
        
        setSimulationData({
          card,
          action: card.actions.find(a => a.id === actionId),
          simulation: result.simulation
        })
        setShowSimulation(true)
      } else {
        const errorText = await response.text()
        console.error('Simulation failed:', response.status, errorText)
      }
    } catch (error) {
      console.error('Error simulating action:', error)
    }
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
      
      <div className="w-full px-6 py-4 min-h-screen">
        <div className="grid grid-cols-12 gap-4 min-h-[calc(100vh-2rem)]">
          
          {/* Left Rail */}
          <div className="col-span-3 space-y-4 flex flex-col">
            
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
        
              </CardContent>
            </Card>

            {/* Campaign Scaling Tools */}
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] flex-1">
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                flex items-center justify-center border border-white/10">
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Campaign Scaling</h3>
                    <p className="text-gray-400 text-sm">Budget optimization & audience expansion</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <Tabs value={scalingTab} onValueChange={setScalingTab} className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-2 bg-[#1A1A1A] border-b border-[#333] rounded-none">
                    <TabsTrigger value="budget" className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-[#333]">
                      <PieChart className="w-4 h-4 mr-2" />
                      Budget
                    </TabsTrigger>
                    <TabsTrigger value="audience" className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-[#333]">
                      <Users className="w-4 h-4 mr-2" />
                      Audience
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="budget" className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
                    {budgetAllocations.map(allocation => (
                      <div key={allocation.id} className="p-3 bg-[#1A1A1A] border border-[#333] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium text-sm">{allocation.campaignName}</h4>
                          <Badge variant={allocation.risk === 'low' ? 'secondary' : allocation.risk === 'medium' ? 'default' : 'destructive'}>
                            {allocation.confidence}% confidence
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-400">Current: ${allocation.currentBudget}/day</p>
                            <p className="text-gray-400">ROAS: {allocation.currentRoas}x</p>
                          </div>
                          <div>
                            <p className="text-green-400">Suggested: ${allocation.suggestedBudget}/day</p>
                            <p className="text-green-400">Est. ROAS: {allocation.projectedRoas}x</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs"
                            onClick={() => handleExplainBudgetAllocation(allocation.id)}
                          >
                            <Brain className="w-3 h-3 mr-1" />
                            Explain
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-[#FF2A2A] hover:bg-[#FF2A2A]/80 text-black text-xs"
                            onClick={() => handleMarkBudgetAsDone(allocation.id)}
                          >
                            Mark as Done
                          </Button>
                        </div>
                      </div>
                    ))}
                    {budgetAllocations.length === 0 && (
                      <div className="text-center py-6 text-gray-400">
                        <PieChart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No budget optimization opportunities</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="audience" className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
                    {audienceExpansions.map(expansion => (
                      <div key={expansion.id} className="p-3 bg-[#1A1A1A] border border-[#333] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {expansion.type === 'lookalike' && <Users className="w-4 h-4 text-blue-400" />}
                            {expansion.type === 'geographic' && <Globe className="w-4 h-4 text-green-400" />}
                            {expansion.type === 'interest' && <Target className="w-4 h-4 text-purple-400" />}
                            {expansion.type === 'demographic' && <BarChart3 className="w-4 h-4 text-orange-400" />}
                            <h4 className="text-white font-medium text-sm">{expansion.title}</h4>
                          </div>
                          <Badge variant="secondary">{expansion.confidence}% match</Badge>
                        </div>
                        <p className="text-gray-400 text-xs mb-2">{expansion.description}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-400">Current: {expansion.currentReach.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-green-400">+{(expansion.projectedReach - expansion.currentReach).toLocaleString()} reach</p>
                          </div>
                        </div>
                        <p className="text-blue-400 text-xs mt-1">Est. CPA: ${expansion.estimatedCpa}</p>
                        <div className="flex gap-2 mt-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs"
                            onClick={() => handleExplainAudienceExpansion(expansion.id)}
                          >
                            <Brain className="w-3 h-3 mr-1" />
                            Explain
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-[#FF2A2A] hover:bg-[#FF2A2A]/80 text-black text-xs"
                            onClick={() => handleMarkAudienceAsDone(expansion.id)}
                          >
                            Mark as Done
                          </Button>
                        </div>
                      </div>
                    ))}
                    {audienceExpansions.length === 0 && (
                      <div className="text-center py-6 text-gray-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No audience expansion opportunities</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
                </div>

          {/* Middle Column - Main Work Area */}
          <div className="col-span-6 space-y-4 flex flex-col">
            
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
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] flex-1">
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
              <CardContent className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-3">
                  {optimizationCards.map(card => (
                    <div key={card.id} className="bg-[#1A1A1A] border border-[#333] rounded-lg overflow-hidden">
                      {/* Header with Priority Badge */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#252525] to-[#1A1A1A] border-b border-[#333]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
                            <Target className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-medium text-sm">{card.title}</h3>
                            <p className="text-gray-400 text-xs">{card.projectedImpact.confidence}% confidence</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            card.priority === 'high' ? 'bg-red-400' :
                            card.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                          }`}></div>
                          <span className="text-xs text-gray-400 uppercase tracking-wide">{card.priority}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-3">
                        <p className="text-gray-300 text-xs mb-3 leading-relaxed">{card.description}</p>
                        
                        {/* Metrics Row */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-[#0F0F0F] rounded p-2 text-center">
                            <p className="text-gray-400 text-xs">Current</p>
                            <p className="text-white text-sm font-medium">{card.currentValue}</p>
                          </div>
                          <div className="flex items-center justify-center">
                            <ArrowUpRight className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="bg-[#0F0F0F] rounded p-2 text-center">
                            <p className="text-gray-400 text-xs">Target</p>
                            <p className="text-green-400 text-sm font-medium">{card.recommendedValue}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            size="sm" 
                            variant="outline" 
                            className="border-[#333] text-gray-300 text-xs flex-1"
                            onClick={() => handleExplainRecommendation(card.id)}
                          >
                            <Brain className="w-3 h-3 mr-1" />
                            Explain
                          </Button>
                          <Button
                            size="sm" 
                            className="bg-[#FF2A2A] hover:bg-[#FF2A2A]/80 text-black text-xs flex-1"
                            onClick={() => handleMarkAsDone(card.id, card.actions[0]?.id)}
                          >
                            Mark as Done
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

          {/* Right Rail */}
          <div className="col-span-3 space-y-4 flex flex-col">
            
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
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] flex-1">
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
              <CardContent className="p-4 flex-1 overflow-y-auto max-h-[400px]">
                <div className="space-y-3">
                  {alerts.map(alert => (
                    <div key={alert.id} className="p-3 bg-[#1A1A1A] border border-[#333] rounded-lg">
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
                        
       {/* Simulation Modal */}
       {showSimulation && simulationData && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-[#111] border border-[#333] rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-6">
               <div>
                 <h3 className="text-xl font-bold text-white">Simulation Results</h3>
                 <p className="text-gray-400">{simulationData.card.title}</p>
                            </div>
                            <Button
                 variant="outline" 
                              size="sm"
                 onClick={() => setShowSimulation(false)}
                 className="border-[#333] text-gray-300"
               >
                 Close
                            </Button>
                          </div>

             <div className="space-y-6">
               {/* Action Details */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-2">Proposed Action</h4>
                 <p className="text-gray-300 text-sm">{simulationData.action?.label}</p>
                          </div>

               {/* Projected Impact */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-3">7-Day Projection</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-gray-400 text-xs">Expected Revenue Increase</p>
                     <p className="text-green-400 text-lg font-bold">+${simulationData.simulation?.projectedImpact?.revenue?.toLocaleString() || 0}</p>
                        </div>
                   <div>
                     <p className="text-gray-400 text-xs">Projected ROAS</p>
                     <p className="text-white text-lg font-bold">{simulationData.simulation?.projectedImpact?.roas?.toFixed(2) || 0}x</p>
                      </div>
                   <div>
                     <p className="text-gray-400 text-xs">Confidence Level</p>
                     <p className="text-white text-lg font-bold">{simulationData.simulation?.projectedImpact?.confidence || 0}%</p>
                    </div>
                   <div>
                     <p className="text-gray-400 text-xs">Time to Stabilize</p>
                     <p className="text-white text-lg font-bold">{simulationData.simulation?.timeline || 'Unknown'}</p>
            </div>
          </div>
        </div>

               {/* Risks & Safeguards */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-3">Risks & Safeguards</h4>
                 <div className="space-y-3">
                   <div>
                     <p className="text-gray-400 text-xs mb-1">Potential Risks</p>
                     <ul className="text-gray-300 text-sm space-y-1">
                       {simulationData.simulation?.risks?.map((risk: string, index: number) => (
                         <li key={index} className="flex items-start gap-2">
                           <span className="text-yellow-400 mt-1">⚠</span>
                           {risk}
                         </li>
                       ))}
                     </ul>
                    </div>
                   <div>
                     <p className="text-gray-400 text-xs mb-1">Safeguards in Place</p>
                     <ul className="text-gray-300 text-sm space-y-1">
                       {simulationData.simulation?.safeguards?.map((safeguard: string, index: number) => (
                         <li key={index} className="flex items-start gap-2">
                           <span className="text-green-400 mt-1">✓</span>
                           {safeguard}
                         </li>
                       ))}
                     </ul>
                </div>
                  </div>
                  </div>

               {/* Action Buttons */}
               <div className="flex gap-3">
                 <Button 
                   className="bg-green-600 hover:bg-green-700 flex-1"
                   onClick={() => {
                     handleMarkAsDone(simulationData.card.id, simulationData.action.id)
                     setShowSimulation(false)
                   }}
                 >
                   Mark as Completed
                 </Button>
                 <Button 
                   variant="outline" 
                   className="border-[#333] text-gray-300"
                   onClick={() => setShowSimulation(false)}
                 >
                   Close
                    </Button>
                  </div>
                      </div>
                    </div>
                </div>
       )}

       {/* AI Explanation Modal */}
       {showExplanation && explanationData && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-[#111] border border-[#333] rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                               flex items-center justify-center border border-white/10">
                   <Brain className="w-5 h-5 text-white" />
                 </div>
                 <div>
                   <h3 className="text-xl font-bold text-white">AI Analysis</h3>
                   <p className="text-gray-400">In-depth recommendation explanation</p>
                 </div>
               </div>
               <Button
                 variant="outline" 
                 size="sm"
                 onClick={() => setShowExplanation(false)}
                 className="border-[#333] text-gray-300"
               >
                 Close
               </Button>
             </div>

             <div className="space-y-6">
               {/* Why This Matters */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                   <Target className="w-4 h-4" />
                   Why This Recommendation Matters
                 </h4>
                 <p className="text-gray-300 text-sm leading-relaxed">{explanationData.reasoning}</p>
               </div>

               {/* Data Analysis */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                   <BarChart3 className="w-4 h-4" />
                   Data-Driven Insights
                 </h4>
                 <div className="space-y-2">
                   {explanationData.insights?.map((insight: string, index: number) => (
                     <div key={index} className="flex items-start gap-2">
                       <span className="text-blue-400 mt-1">•</span>
                       <p className="text-gray-300 text-sm">{insight}</p>
                     </div>
                   ))}
                 </div>
               </div>

               {/* Expected Outcomes */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                   <TrendingUp className="w-4 h-4" />
                   Expected Outcomes
                 </h4>
                 <div className="grid grid-cols-2 gap-4">
                   {explanationData.outcomes?.map((outcome: any, index: number) => (
                     <div key={index} className="text-center">
                       <p className="text-gray-400 text-xs">{outcome.label}</p>
                       <p className={`text-lg font-bold ${outcome.positive ? 'text-green-400' : 'text-red-400'}`}>
                         {outcome.value}
                       </p>
                     </div>
                   ))}
                 </div>
               </div>

               {/* Implementation Steps */}
               <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                 <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                   <CheckCircle className="w-4 h-4" />
                   How to Implement
                 </h4>
                 <div className="space-y-2">
                   {explanationData.steps?.map((step: string, index: number) => (
                     <div key={index} className="flex items-start gap-2">
                       <span className="text-[#FF2A2A] text-sm font-bold mt-1">{index + 1}.</span>
                       <p className="text-gray-300 text-sm">{step}</p>
                     </div>
                   ))}
                 </div>
               </div>
             </div>

             {/* Close Button */}
             <div className="flex justify-end pt-6">
               <Button 
                 className="bg-[#FF2A2A] hover:bg-[#FF2A2A]/80 text-black"
                 onClick={() => setShowExplanation(false)}
               >
                 Got It
               </Button>
             </div>
           </div>
         </div>
       )}
    </div>
  )
}
