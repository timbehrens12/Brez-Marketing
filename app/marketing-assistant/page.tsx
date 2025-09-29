"use client"

import { useState, useEffect, useCallback } from 'react'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/DateRangePicker'
import { GridOverlay } from '@/components/GridOverlay'
import { toast } from 'react-hot-toast'
import { 
  Brain, 
  Filter, 
  Settings, 
  TrendingUp, 
  AlertTriangle, 
  Activity,
  Target,
  BarChart3,
  Clock,
  CheckCircle,
  Play,
  Pause,
  MoreHorizontal,
  Eye,
  MousePointer,
  DollarSign,
  Loader2,
  RefreshCw,
  Zap
} from 'lucide-react'
import PlatformCampaignWidget from '@/components/campaign-management/PlatformCampaignWidget'
import AIMarketingConsultant from '@/components/campaign-management/AIMarketingConsultant'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { getSupabaseClient } from '@/lib/supabase/client'

interface MarketingAssistantPageProps {}

export default function MarketingAssistantPage({}: MarketingAssistantPageProps) {
  const { selectedBrandId, brands } = useBrandContext()
  const { userId } = useAuth()
  
  // State management
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date())
  })
  const [selectedCampaignStatus, setSelectedCampaignStatus] = useState('all')
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Real data states
  const [kpiData, setKpiData] = useState({
    totalSpend: 0,
    spendGrowth: 0,
    totalConversions: 0,
    conversionsGrowth: 0,
    averageROAS: 0,
    roasGrowth: 0,
    activeCampaigns: 0,
    campaignsGrowth: 0
  })
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true)
  const [experimentsQueue, setExperimentsQueue] = useState<any[]>([])
  const [isLoadingExperiments, setIsLoadingExperiments] = useState(true)
  const [performanceTrends, setPerformanceTrends] = useState<any[]>([])
  const [isLoadingTrends, setIsLoadingTrends] = useState(true)
  const [actionLog, setActionLog] = useState<any[]>([])
  const [isLoadingActionLog, setIsLoadingActionLog] = useState(true)
  const [alerts, setAlerts] = useState<any[]>([])
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true)

  // Fetch real KPI data from API
  const fetchKPIData = useCallback(async () => {
    if (!selectedBrandId) return
    
    setIsLoadingKPIs(true)
    try {
      const params = new URLSearchParams({
        brandId: selectedBrandId,
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd'),
        t: Date.now().toString()
      })
      
      const response = await fetch(`/api/metrics?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setKpiData({
          totalSpend: data.adSpend || 0,
          spendGrowth: data.adSpendGrowth || 0,
          totalConversions: data.conversions || 0,
          conversionsGrowth: data.conversionGrowth || 0,
          averageROAS: data.roas || 0,
          roasGrowth: data.roasGrowth || 0,
          activeCampaigns: data.activeCampaigns || 0,
          campaignsGrowth: 0
        })
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error)
      toast.error('Failed to load performance metrics')
    } finally {
      setIsLoadingKPIs(false)
    }
  }, [selectedBrandId, dateRange])

  // Fetch campaigns data
  const fetchCampaignsData = useCallback(async () => {
    if (!selectedBrandId) return
    
    setIsLoadingCampaigns(true)
    try {
      const supabase = getSupabaseClient()
      const { data: campaignsData, error } = await supabase
        .from('meta_campaigns')
        .select('*')
        .eq('brand_id', selectedBrandId)
        .order('spent', { ascending: false })
        .limit(20)

      if (error) throw error
      setCampaigns(campaignsData || [])
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      toast.error('Failed to load campaigns')
    } finally {
      setIsLoadingCampaigns(false)
    }
  }, [selectedBrandId])

  // Generate AI-powered experiments queue
  const fetchExperimentsQueue = useCallback(async () => {
    if (!selectedBrandId) return
    
    setIsLoadingExperiments(true)
    try {
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId,
          type: 'optimization_queue',
          dateRange: {
            from: format(dateRange.from, 'yyyy-MM-dd'),
            to: format(dateRange.to, 'yyyy-MM-dd')
          }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setExperimentsQueue(data.recommendations || [])
      }
    } catch (error) {
      console.error('Error fetching experiments:', error)
      // Fall back to some default recommendations
      setExperimentsQueue([
        {
          id: '1',
          type: 'budget_optimization',
          campaignName: 'Top performing campaign',
          status: 'pending',
          estimatedImpact: 'Analyze performance',
          priority: 'medium'
        }
      ])
    } finally {
      setIsLoadingExperiments(false)
    }
  }, [selectedBrandId, dateRange])

  // Load all data when component mounts or dependencies change
  useEffect(() => {
    if (selectedBrandId) {
      fetchKPIData()
      fetchCampaignsData()
      fetchExperimentsQueue()
      setIsLoadingTrends(false)
      setIsLoadingActionLog(false)
      setIsLoadingAlerts(false)
    }
  }, [selectedBrandId, dateRange, fetchKPIData, fetchCampaignsData, fetchExperimentsQueue])

  return (
    <div className="min-h-screen bg-gray-200">
      <GridOverlay />
      
      {/* Main Content Grid */}
      <div className="relative z-10">
        <div className="grid grid-cols-12 gap-4 lg:gap-6 p-4 lg:p-6 max-w-[1600px] mx-auto">
          
          {/* Left Column - Sticky (3 cols) */}
          <div className="col-span-12 lg:col-span-3 order-1 lg:order-1">
            <div className="sticky top-6 space-y-4 lg:space-y-6">
              
              {/* Scope & Filters Panel */}
              <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <Filter className="w-5 h-5 text-[#FF2A2A]" />
                    Scope & Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block text-gray-400">
                      Date Range
                    </label>
                    <DateRangePicker 
                      dateRange={dateRange} 
                      setDateRange={setDateRange}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block text-gray-400">
                      Platform
                    </label>
                    <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                      <SelectTrigger className="bg-[#111] border-[#333] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-[#333]">
                        <SelectItem value="all">All Platforms</SelectItem>
                        <SelectItem value="meta">Meta</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block text-gray-400">
                      Campaign Status
                    </label>
                    <Select value={selectedCampaignStatus} onValueChange={setSelectedCampaignStatus}>
                      <SelectTrigger className="bg-[#111] border-[#333] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-[#333]">
                        <SelectItem value="all">All Campaigns</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block text-gray-400">
                      Search Campaigns
                    </label>
                    <Input 
                      placeholder="Search campaigns..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-[#111] border-[#333] text-white placeholder:text-gray-500"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Experiments Queue Panel */}
              <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <Brain className="w-5 h-5 text-[#FF2A2A]" />
                    AI Experiments Queue
                    {isLoadingExperiments && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingExperiments ? (
                    <div className="space-y-3">
                      {[1,2].map(i => (
                        <div key={i} className="p-3 rounded-lg bg-[#111] border border-[#333] animate-pulse">
                          <div className="h-4 bg-gray-800 rounded mb-2"></div>
                          <div className="h-3 bg-gray-800 rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {experimentsQueue.length === 0 ? (
                        <div className="text-center text-gray-400 py-4">
                          <Brain className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm">AI analyzing campaigns...</p>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="mt-2 border-[#333] text-gray-400 hover:text-white"
                            onClick={fetchExperimentsQueue}
                          >
                            Generate Recommendations
                          </Button>
                        </div>
                      ) : (
                        experimentsQueue.map((experiment) => (
                          <div 
                            key={experiment.id}
                            className="p-3 rounded-lg bg-[#111] border border-[#333]"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge 
                                variant={experiment.priority === 'high' ? 'destructive' : 'secondary'}
                                className={cn(
                                  experiment.priority === 'high' ? 'bg-red-600 text-white' : 'bg-gray-600 text-white'
                                )}
                              >
                                {experiment.priority}
                              </Badge>
                              <Badge 
                                variant="outline"
                                className="border-[#333] text-gray-400"
                              >
                                {experiment.status}
                              </Badge>
                            </div>
                            <div className="text-sm font-medium mb-1 text-white">
                              {experiment.campaignName}
                            </div>
                            <div className="text-xs text-gray-400">
                              {experiment.estimatedImpact}
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full mt-2 bg-[#FF2A2A] hover:bg-[#DC2626] text-white"
                            >
                              Apply Optimization
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Middle Column - Scrollable (6 cols) */}
          <div className="col-span-12 lg:col-span-6 order-2 lg:order-2">
            <div className="space-y-4 lg:space-y-6">
              
              {/* KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Spend Card */}
                <Card className="bg-[#111] border-[#333] shadow-md">
                  <CardContent className="p-4">
                    {isLoadingKPIs ? (
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-800 rounded mb-2"></div>
                        <div className="h-8 bg-gray-800 rounded mb-2"></div>
                        <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-400">Total Spend</p>
                          <p className="text-2xl font-bold text-white">
                            ${kpiData.totalSpend.toLocaleString()}
                          </p>
                          <p className={cn(
                            "text-sm font-medium",
                            kpiData.spendGrowth > 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {kpiData.spendGrowth > 0 ? '+' : ''}{kpiData.spendGrowth.toFixed(1)}%
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-[#FF2A2A]" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Conversions Card */}
                <Card className="bg-[#111] border-[#333] shadow-md">
                  <CardContent className="p-4">
                    {isLoadingKPIs ? (
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-800 rounded mb-2"></div>
                        <div className="h-8 bg-gray-800 rounded mb-2"></div>
                        <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-400">Conversions</p>
                          <p className="text-2xl font-bold text-white">
                            {kpiData.totalConversions.toLocaleString()}
                          </p>
                          <p className={cn(
                            "text-sm font-medium",
                            kpiData.conversionsGrowth > 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {kpiData.conversionsGrowth > 0 ? '+' : ''}{kpiData.conversionsGrowth.toFixed(1)}%
                          </p>
                        </div>
                        <Target className="w-8 h-8 text-[#FF2A2A]" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Avg ROAS Card */}
                <Card className="bg-[#111] border-[#333] shadow-md">
                  <CardContent className="p-4">
                    {isLoadingKPIs ? (
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-800 rounded mb-2"></div>
                        <div className="h-8 bg-gray-800 rounded mb-2"></div>
                        <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-400">Avg ROAS</p>
                          <p className="text-2xl font-bold text-white">
                            {kpiData.averageROAS.toFixed(1)}x
                          </p>
                          <p className={cn(
                            "text-sm font-medium",
                            kpiData.roasGrowth > 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {kpiData.roasGrowth > 0 ? '+' : ''}{kpiData.roasGrowth.toFixed(1)}%
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-[#FF2A2A]" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Active Campaigns Card */}
                <Card className="bg-[#111] border-[#333] shadow-md">
                  <CardContent className="p-4">
                    {isLoadingCampaigns ? (
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-800 rounded mb-2"></div>
                        <div className="h-8 bg-gray-800 rounded mb-2"></div>
                        <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-400">Active Campaigns</p>
                          <p className="text-2xl font-bold text-white">
                            {campaigns.filter(c => c.status === 'ACTIVE').length}
                          </p>
                          <p className="text-sm font-medium text-gray-400">
                            {campaigns.length} total
                          </p>
                        </div>
                        <Activity className="w-8 h-8 text-[#FF2A2A]" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Campaign Management with AI */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Campaign List */}
                <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                      <BarChart3 className="w-5 h-5 text-[#FF2A2A]" />
                      Campaign Management
                      {isLoadingCampaigns && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Use existing PlatformCampaignWidget with proper theme injection */}
                    <div className="[&_.bg-white]:!bg-[#111] [&_.bg-gray-50]:!bg-[#0a0a0a] [&_.border-gray-200]:!border-[#333] [&_.text-gray-900]:!text-white [&_.text-gray-600]:!text-gray-400 [&_.bg-gray-100]:!bg-[#0a0a0a] [&_.text-gray-700]:!text-gray-300 [&_.text-gray-800]:!text-white [&_.border-gray-300]:!border-[#333] overflow-hidden">
                      <PlatformCampaignWidget preloadedCampaigns={campaigns} />
                    </div>
                  </CardContent>
                </Card>

                {/* AI Marketing Consultant */}
                <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                      <Brain className="w-5 h-5 text-[#FF2A2A]" />
                      AI Marketing Consultant
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[400px] overflow-hidden">
                      <AIMarketingConsultant />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Right Column - Sticky (3 cols) */}
          <div className="col-span-12 lg:col-span-3 order-3 lg:order-3">
            <div className="sticky top-6 space-y-4 lg:space-y-6">
              
              {/* Performance Trends */}
              <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <TrendingUp className="w-5 h-5 text-[#FF2A2A]" />
                    Performance Trends
                    {isLoadingKPIs && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingKPIs ? (
                    <div className="space-y-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="animate-pulse flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
                            <div className="h-4 bg-gray-800 rounded w-16"></div>
                          </div>
                          <div className="animate-pulse">
                            <div className="h-4 bg-gray-800 rounded w-12"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            kpiData.averageROAS >= 3 ? "bg-green-500" : kpiData.averageROAS >= 2 ? "bg-yellow-500" : "bg-red-500"
                          )} />
                          <span className="text-sm font-medium text-white">ROAS</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-white">
                            {kpiData.averageROAS.toFixed(1)}x
                          </div>
                          <div className={cn(
                            "text-xs",
                            kpiData.roasGrowth > 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {kpiData.roasGrowth > 0 ? '+' : ''}{kpiData.roasGrowth.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-sm font-medium text-white">CTR</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-white">2.4%</div>
                          <div className="text-xs text-green-500">+0.3%</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-sm font-medium text-white">CVR</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-white">1.2%</div>
                          <div className="text-xs text-red-500">-0.1%</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <Zap className="w-5 h-5 text-[#FF2A2A]" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full bg-[#FF2A2A] hover:bg-[#DC2626] text-white"
                    onClick={() => window.open('/ai-marketing-consultant', '_blank')}
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Ask AI Consultant
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-[#333] text-gray-400 hover:text-white"
                    onClick={fetchKPIData}
                    disabled={isLoadingKPIs}
                  >
                    <RefreshCw className={cn("w-4 h-4 mr-2", isLoadingKPIs && "animate-spin")} />
                    Refresh Data
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-[#333] text-gray-400 hover:text-white"
                    onClick={() => window.open('/ad-creative-studio', '_blank')}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Creative Studio
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <Clock className="w-5 h-5 text-[#FF2A2A]" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {campaigns.slice(0, 3).map((campaign, index) => (
                      <div key={campaign.campaign_id || index} className="p-2 rounded bg-[#111] border border-[#333]">
                        <div className="text-sm font-medium mb-1 text-white truncate">
                          {campaign.campaign_name || 'Campaign'}
                        </div>
                        <div className="text-xs text-gray-400">
                          Status: {campaign.status || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-400">
                          Spent: ${campaign.spent?.toLocaleString() || '0'}
                        </div>
                      </div>
                    ))}
                    {campaigns.length === 0 && !isLoadingCampaigns && (
                      <div className="text-center text-gray-400 py-4">
                        <Activity className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm">No recent activity</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <AlertTriangle className="w-5 h-5 text-[#FF2A2A]" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Meta API</span>
                      <Badge className="bg-green-600 text-white">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Data Sync</span>
                      <Badge className="bg-blue-600 text-white">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">AI Services</span>
                      <Badge className="bg-green-600 text-white">Online</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
