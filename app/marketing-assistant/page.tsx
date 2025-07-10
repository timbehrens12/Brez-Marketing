"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { useAgency } from "@/contexts/AgencyContext"
import { usePathname } from "next/navigation"
import { useBrandContext } from '@/lib/context/BrandContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  DollarSign, TrendingUp, Target, MousePointerClick, Zap, Brain, 
  AlertTriangle, CheckCircle, RefreshCw, Settings, Calendar,
  BarChart3, Users, Eye, ArrowUpRight, ArrowDownRight, ChevronRight,
  Sparkles, Activity, AlertCircle, Info, ChevronDown, ChevronUp,
  Play, Pause, Edit, Trash2, Clock, Filter, Search, Plus
} from 'lucide-react'
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/formatters'
import { DateRange } from "react-day-picker"
import { addDays, format } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { DateRangePicker } from "@/components/DateRangePicker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Types
interface Campaign {
  id: string
  campaign_id: string
  campaign_name: string
  status: string
  objective: string
  budget: number
  budget_type: string
  spent: number
  impressions: number
  reach: number
  clicks: number
  ctr: number
  cpc: number
  conversions: number
  cost_per_conversion: number
  roas: number
  account_name: string
  start_date: string | null
  end_date: string | null
  daily_insights: any[]
  adSets?: AdSet[]
}

interface AdSet {
  id: string
  adset_id: string
  adset_name: string
  campaign_id: string
  status: string
  budget: number
  budget_type: string
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cost_per_conversion: number
  ads?: Ad[]
}

interface Ad {
  id: string
  ad_id: string
  ad_name: string
  adset_id: string
  status: string
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cost_per_conversion: number
  creative_url?: string
}

interface AIInsight {
  id: string
  type: 'alert' | 'opportunity' | 'recommendation' | 'insight'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionable: boolean
  action?: {
    type: string
    label: string
    params?: any
  }
  metrics?: {
    label: string
    value: string
    change?: number
    trend?: 'up' | 'down' | 'stable'
  }[]
  timestamp: Date
}

interface BrandGoal {
  id: string
  type: 'sales' | 'leads' | 'traffic' | 'brand_awareness' | 'drop' | 'event'
  name: string
  description?: string
  targetDate?: Date
  targetMetric?: string
  targetValue?: number
  active: boolean
}

export default function MarketingAssistantPage() {
  const [isLoading, setIsLoading] = useState(true)
  const { agencySettings } = useAgency()
  const pathname = usePathname()
  const { selectedBrandId } = useBrandContext()
  
  // State for metrics
  const [totalMetrics, setTotalMetrics] = useState({
    spend: 0,
    roas: 0,
    activeCampaigns: 0,
    ctr: 0,
    conversions: 0,
    impressions: 0,
    clicks: 0,
    cpc: 0
  })
  
  // State for campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set())
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  
  // State for AI insights
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null)
  const [dailyCampaignAnalysis, setDailyCampaignAnalysis] = useState<Record<string, { lastAnalyzed: Date, analysis: any }>>({})
  
  // State for platform selection
  const [selectedPlatform, setSelectedPlatform] = useState<string>('meta')
  
  // State for brand goals
  const [brandGoals, setBrandGoals] = useState<BrandGoal[]>([])
  const [showGoalDialog, setShowGoalDialog] = useState(false)
  const [selectedGoalType, setSelectedGoalType] = useState<string>('sales')
  
  // State for date range
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  })
  
  // State for filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [objectiveFilter, setObjectiveFilter] = useState('all')
  const [showPausedCampaigns, setShowPausedCampaigns] = useState(true)
  
  // Auto-refresh timer
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(60) // seconds

  // Load initial data
  useEffect(() => {
    if (selectedBrandId) {
      loadAllData()
      
      // Set up auto-refresh
      if (autoRefresh) {
        refreshIntervalRef.current = setInterval(() => {
          loadAllData(true) // Silent refresh
        }, refreshInterval * 1000)
      }
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [selectedBrandId, dateRange, autoRefresh, refreshInterval])

  const loadAllData = async (silent = false) => {
    if (!silent) setIsLoading(true)
    
    try {
      await Promise.all([
        loadCampaigns(),
        loadMetrics(),
        loadAIInsights(),
        loadBrandGoals()
      ])
      setLastRefreshTime(new Date())
      if (!silent) {
        toast.success('Data refreshed successfully')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load marketing data')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const loadCampaigns = async () => {
    if (!selectedBrandId || !dateRange?.from || !dateRange?.to) return
    
    setIsLoadingCampaigns(true)
    
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd')
      const toDate = format(dateRange.to, 'yyyy-MM-dd')
      
      const response = await fetch(
        `/api/meta/campaigns/date-range?brandId=${selectedBrandId}&from=${fromDate}&to=${toDate}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch campaigns')
      
      const data = await response.json()
      setCampaigns(data.campaigns || [])
      
      // Load ad sets for expanded campaigns
      for (const campaignId of expandedCampaigns) {
        await loadAdSets(campaignId)
      }
    } catch (error) {
      console.error('Error loading campaigns:', error)
      toast.error('Failed to load campaigns')
    } finally {
      setIsLoadingCampaigns(false)
    }
  }

  const loadAdSets = async (campaignId: string) => {
    if (!selectedBrandId || !dateRange?.from || !dateRange?.to) return
    
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd')
      const toDate = format(dateRange.to, 'yyyy-MM-dd')
      
      const response = await fetch(
        `/api/meta/adsets?brandId=${selectedBrandId}&campaignId=${campaignId}&from=${fromDate}&to=${toDate}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch ad sets')
      
      const data = await response.json()
      
      // Update campaign with ad sets
      setCampaigns(prev => prev.map(campaign => 
        campaign.campaign_id === campaignId 
          ? { ...campaign, adSets: data.adSets || [] }
          : campaign
      ))
      
      // Load ads for expanded ad sets
      for (const adSetId of expandedAdSets) {
        const adSet = data.adSets?.find((as: AdSet) => as.adset_id === adSetId)
        if (adSet) {
          await loadAds(campaignId, adSetId)
        }
      }
    } catch (error) {
      console.error('Error loading ad sets:', error)
    }
  }

  const loadAds = async (campaignId: string, adSetId: string) => {
    if (!selectedBrandId || !dateRange?.from || !dateRange?.to) return
    
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd')
      const toDate = format(dateRange.to, 'yyyy-MM-dd')
      
      const response = await fetch(
        `/api/meta/ads?brandId=${selectedBrandId}&adSetId=${adSetId}&from=${fromDate}&to=${toDate}&forceRefresh=true`
      )
      
      if (!response.ok) throw new Error('Failed to fetch ads')
      
      const data = await response.json()
      
      // Update ad set with ads
      setCampaigns(prev => prev.map(campaign => {
        if (campaign.campaign_id === campaignId && campaign.adSets) {
          return {
            ...campaign,
            adSets: campaign.adSets.map(adSet =>
              adSet.adset_id === adSetId
                ? { ...adSet, ads: data.ads || [] }
                : adSet
            )
          }
        }
        return campaign
      }))
    } catch (error) {
      console.error('Error loading ads:', error)
      toast.error('Failed to load ads')
    }
  }

  const loadMetrics = async () => {
    if (!selectedBrandId || !dateRange?.from || !dateRange?.to) return
    
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd')
      const toDate = format(dateRange.to, 'yyyy-MM-dd')
      
      const response = await fetch(
        `/api/metrics/meta?brandId=${selectedBrandId}&from=${fromDate}&to=${toDate}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch metrics')
      
      const data = await response.json()
      
      // Calculate total metrics
      setTotalMetrics({
        spend: data.adSpend || 0,
        roas: data.roas || 0,
        activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
        ctr: data.ctr || 0,
        conversions: data.conversions || 0,
        impressions: data.impressions || 0,
        clicks: data.clicks || 0,
        cpc: data.cpc || 0
      })
    } catch (error) {
      console.error('Error loading metrics:', error)
    }
  }

  const loadAIInsights = async () => {
    if (!selectedBrandId) return
    
    setIsLoadingInsights(true)
    
    try {
      // First try to get AI-powered insights from the API
      const response = await fetch('/api/ai/marketing-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: selectedBrandId,
          campaigns,
          totalMetrics,
          brandGoals,
          dateRange
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setAiInsights(data.insights || [])
      } else {
        // Fallback to local insights generation
        const insights = await generateAIInsights()
        setAiInsights(insights)
      }
    } catch (error) {
      console.error('Error loading AI insights:', error)
      // Fallback to local insights generation
      const insights = await generateAIInsights()
      setAiInsights(insights)
    } finally {
      setIsLoadingInsights(false)
    }
  }

  const generateAIInsights = async (): Promise<AIInsight[]> => {
    const insights: AIInsight[] = []
    
    // Analyze campaign performance
    campaigns.forEach(campaign => {
      // High spend with low ROAS
      if (campaign.spent > 1000 && campaign.roas < 1.5) {
        insights.push({
          id: `${campaign.campaign_id}-low-roas`,
          type: 'alert',
          priority: 'high',
          title: `Low ROAS Alert: ${campaign.campaign_name}`,
          description: `Campaign has spent ${formatCurrency(campaign.spent)} with only ${campaign.roas.toFixed(2)}x ROAS. Consider pausing or optimizing targeting.`,
          actionable: true,
          action: {
            type: 'pause_campaign',
            label: 'Pause Campaign',
            params: { campaignId: campaign.campaign_id }
          },
          metrics: [
            { label: 'Spend', value: formatCurrency(campaign.spent) },
            { label: 'ROAS', value: `${campaign.roas.toFixed(2)}x`, trend: 'down' }
          ],
          timestamp: new Date()
        })
      }
      
      // High performing campaigns to scale
      if (campaign.roas > 3 && campaign.spent < 500) {
        insights.push({
          id: `${campaign.campaign_id}-scale-opportunity`,
          type: 'opportunity',
          priority: 'high',
          title: `Scaling Opportunity: ${campaign.campaign_name}`,
          description: `Campaign achieving ${campaign.roas.toFixed(2)}x ROAS with only ${formatCurrency(campaign.spent)} spend. Increase budget to capture more conversions.`,
          actionable: true,
          action: {
            type: 'increase_budget',
            label: 'Increase Budget 50%',
            params: { campaignId: campaign.campaign_id, increase: 0.5 }
          },
          metrics: [
            { label: 'ROAS', value: `${campaign.roas.toFixed(2)}x`, trend: 'up' },
            { label: 'Potential', value: '+$2,500/mo' }
          ],
          timestamp: new Date()
        })
      }
      
      // CTR optimization opportunities
      if (campaign.ctr < 1 && campaign.impressions > 10000) {
        insights.push({
          id: `${campaign.campaign_id}-low-ctr`,
          type: 'recommendation',
          priority: 'medium',
          title: `Improve Ad Creative: ${campaign.campaign_name}`,
          description: `CTR is only ${campaign.ctr.toFixed(2)}% after ${formatNumber(campaign.impressions)} impressions. Test new ad creatives to improve engagement.`,
          actionable: true,
          action: {
            type: 'refresh_creative',
            label: 'View Creative Tips',
            params: { campaignId: campaign.campaign_id }
          },
          metrics: [
            { label: 'CTR', value: `${campaign.ctr.toFixed(2)}%`, trend: 'down' },
            { label: 'Industry Avg', value: '2.5%' }
          ],
          timestamp: new Date()
        })
      }
    })
    
    // Overall insights
    if (totalMetrics.spend > 0) {
      // Budget efficiency insight
      const budgetEfficiency = (totalMetrics.conversions / totalMetrics.spend) * 100
      insights.push({
        id: 'overall-efficiency',
        type: 'insight',
        priority: 'medium',
        title: 'Overall Budget Efficiency',
        description: `You're generating ${budgetEfficiency.toFixed(1)} conversions per $100 spent. ${budgetEfficiency > 5 ? 'Great performance!' : 'Room for improvement.'}`,
        actionable: false,
        metrics: [
          { label: 'Efficiency', value: `${budgetEfficiency.toFixed(1)}/100` },
          { label: 'Total Spend', value: formatCurrency(totalMetrics.spend) }
        ],
        timestamp: new Date()
      })
      
      // New audience segment discovery (simulated)
      if (Math.random() > 0.7) {
        insights.push({
          id: 'new-audience-segment',
          type: 'opportunity',
          priority: 'medium',
          title: 'New High-Value Audience Discovered',
          description: 'Analysis shows women 25-34 interested in sustainable fashion have 3.2x higher conversion rate. Create targeted campaign for this segment.',
          actionable: true,
          action: {
            type: 'create_audience',
            label: 'Create Audience',
            params: { segment: 'sustainable_fashion_25_34_f' }
          },
          metrics: [
            { label: 'Potential ROAS', value: '4.5x' },
            { label: 'Est. Audience', value: '125K' }
          ],
          timestamp: new Date()
        })
      }
    }
    
    return insights.sort((a, b) => {
      // Sort by priority then by timestamp
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return b.timestamp.getTime() - a.timestamp.getTime()
    })
  }

  const loadBrandGoals = async () => {
    // In a real implementation, this would load from the database
    // For now, we'll use default goals
    setBrandGoals([
      {
        id: '1',
        type: 'sales',
        name: 'Q4 Revenue Target',
        description: 'Achieve $100K in revenue by end of Q4',
        targetMetric: 'revenue',
        targetValue: 100000,
        active: true
      }
    ])
  }

  const toggleCampaignExpanded = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId)
      } else {
        newSet.add(campaignId)
        // Load ad sets when expanding
        loadAdSets(campaignId)
      }
      return newSet
    })
  }

  const toggleAdSetExpanded = (campaignId: string, adSetId: string) => {
    setExpandedAdSets(prev => {
      const newSet = new Set(prev)
      if (newSet.has(adSetId)) {
        newSet.delete(adSetId)
      } else {
        newSet.add(adSetId)
        // Load ads when expanding
        loadAds(campaignId, adSetId)
      }
      return newSet
    })
  }

  const handleInsightAction = async (insight: AIInsight) => {
    if (!insight.action) return
    
    // Handle different action types
    switch (insight.action.type) {
      case 'pause_campaign':
        toast.info('Opening campaign settings...')
        break
      case 'increase_budget':
        toast.info('Opening budget optimizer...')
        break
      case 'refresh_creative':
        toast.info('Opening creative recommendations...')
        break
      case 'create_audience':
        toast.info('Opening audience builder...')
        break
      default:
        toast.info('Action not implemented yet')
    }
  }

  const runDailyCampaignAnalysis = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.campaign_id === campaignId)
    if (!campaign) return

    // Check if already analyzed today
    const today = new Date().toDateString()
    const lastAnalyzed = dailyCampaignAnalysis[campaignId]?.lastAnalyzed?.toDateString()
    
    if (lastAnalyzed === today) {
      toast.info('Campaign already analyzed today. Try again tomorrow!')
      return
    }

    try {
      toast.info('Running AI analysis on campaign...')
      
      const response = await fetch('/api/ai/campaign-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: selectedBrandId,
          campaignId,
          campaign,
          includeCreatives: true
        })
      })

      if (response.ok) {
        const analysis = await response.json()
        setDailyCampaignAnalysis(prev => ({
          ...prev,
          [campaignId]: {
            lastAnalyzed: new Date(),
            analysis
          }
        }))
        toast.success('Campaign analysis complete! Check insights for recommendations.')
        // Reload insights to show new analysis
        loadAIInsights()
      } else {
        throw new Error('Analysis failed')
      }
    } catch (error) {
      console.error('Error running campaign analysis:', error)
      toast.error('Failed to analyze campaign')
    }
  }

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="h-4 w-4" />
      case 'opportunity':
        return <TrendingUp className="h-4 w-4" />
      case 'recommendation':
        return <Sparkles className="h-4 w-4" />
      case 'insight':
        return <Brain className="h-4 w-4" />
    }
  }

  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'alert':
        return 'text-red-500'
      case 'opportunity':
        return 'text-green-500'
      case 'recommendation':
        return 'text-blue-500'
      case 'insight':
        return 'text-purple-500'
    }
  }

  const getPriorityBadgeVariant = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
    }
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    // Search filter
    if (searchQuery && !campaign.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    // Status filter
    if (statusFilter !== 'all' && campaign.status !== statusFilter) {
      return false
    }
    
    // Objective filter
    if (objectiveFilter !== 'all' && campaign.objective !== objectiveFilter) {
      return false
    }
    
    // Show/hide paused campaigns
    if (!showPausedCampaigns && campaign.status === 'PAUSED') {
      return false
    }
    
    return true
  })

  if (isLoading) {
    const loadingConfig = getPageLoadingConfig(pathname)
    
    return (
      <UnifiedLoading
        variant="page"
        size="lg"
        message={loadingConfig.message}
        subMessage={loadingConfig.subMessage}
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#0F0F0F]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Brain className="h-6 w-6 text-purple-500" />
                AI Marketing Assistant
              </h1>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-gray-400">Your personal AI-powered media buyer</p>
                {lastRefreshTime && (
                  <p className="text-xs text-gray-500">
                    Last refreshed: {format(lastRefreshTime, 'MMM dd, yyyy HH:mm')}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Date Range Picker */}
              <DateRangePicker
                dateRange={{
                  from: dateRange?.from || addDays(new Date(), -7),
                  to: dateRange?.to || new Date()
                }}
                setDateRange={(range) => setDateRange(range)}
              />
              
              {/* Auto Refresh */}
              <div className="flex items-center gap-2">
                <Label htmlFor="auto-refresh" className="text-sm text-gray-400">
                  Auto-refresh
                </Label>
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-green-600/10 border-green-600/50 hover:bg-green-600/20 text-green-400"
                        onClick={() => toast.info('Opening campaign creation wizard...')}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Create New Campaign</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadAllData()}
                  className="bg-[#1A1A1A] border-gray-700 hover:bg-[#252525]"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Performance Overview</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-400">Live Data</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="bg-[#1A1A1A] border-gray-800 hover:border-gray-700 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Total Spend</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(totalMetrics.spend)}</p>
                  <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
                </div>
                <div className="text-right">
                  <DollarSign className="h-8 w-8 text-gray-600 mb-1" />
                  <div className="text-xs text-green-500">+12%</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-gray-800 hover:border-gray-700 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Total ROAS</p>
                  <p className="text-xl font-bold text-white">{totalMetrics.roas.toFixed(2)}x</p>
                  <p className={cn(
                    "text-xs mt-1 font-medium",
                    totalMetrics.roas >= 3 ? "text-green-500" : 
                    totalMetrics.roas >= 2 ? "text-yellow-500" : "text-red-500"
                  )}>
                    {totalMetrics.roas >= 3 ? "Excellent" : 
                     totalMetrics.roas >= 2 ? "Good" : "Needs Work"}
                  </p>
                </div>
                <div className="text-right">
                  <TrendingUp className="h-8 w-8 text-green-500 mb-1" />
                  <div className="text-xs text-green-500">+8%</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Active Campaigns</p>
                  <p className="text-xl font-bold text-white">{totalMetrics.activeCampaigns}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Avg CTR</p>
                  <p className="text-xl font-bold text-white">{totalMetrics.ctr.toFixed(2)}%</p>
                </div>
                <MousePointerClick className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Conversions</p>
                  <p className="text-xl font-bold text-white">{formatNumber(totalMetrics.conversions)}</p>
                </div>
                <Zap className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Impressions</p>
                  <p className="text-xl font-bold text-white">{formatNumber(totalMetrics.impressions)}</p>
                </div>
                <Eye className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Clicks</p>
                  <p className="text-xl font-bold text-white">{formatNumber(totalMetrics.clicks)}</p>
                </div>
                <MousePointerClick className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Avg CPC</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(totalMetrics.cpc)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Quick Performance Summary */}
        {campaigns.length > 0 && (
          <div className="mt-6 p-4 bg-[#1A1A1A] border border-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white mb-1">Account Performance Summary</h3>
                <p className="text-xs text-gray-400">
                  {campaigns.filter(c => c.status === 'ACTIVE').length} active campaigns • 
                  Avg ROAS: {totalMetrics.roas.toFixed(2)}x • 
                  Best Campaign: {campaigns.reduce((prev, current) => (prev.roas > current.roas) ? prev : current, campaigns[0])?.campaign_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Optimization Score</p>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    totalMetrics.roas >= 3 ? "bg-green-500" : 
                    totalMetrics.roas >= 2 ? "bg-yellow-500" : "bg-red-500"
                  )}></div>
                  <span className="text-sm font-medium text-white">
                    {Math.round((totalMetrics.roas / 4) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaigns Section - 2 columns */}
          <div className="lg:col-span-2">
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Campaign Performance by Platform</CardTitle>
                  
                  {/* Filters */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search campaigns..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-48 h-8 bg-[#0A0A0A] border-gray-700 text-white placeholder-gray-500"
                    />
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32 h-8 bg-[#0A0A0A] border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-gray-700">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="PAUSED">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-[#0A0A0A] border-gray-700"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Platform Tabs */}
                <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform} className="w-full">
                  <TabsList className="grid grid-cols-1 w-full bg-[#0A0A0A]">
                    <TabsTrigger value="meta" className="data-[state=active]:bg-blue-600">
                      Meta (Facebook/Instagram)
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {isLoadingCampaigns ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : filteredCampaigns.length === 0 ? (
                      <div className="text-center py-12">
                        <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No campaigns found</p>
                      </div>
                    ) : (
                      <Accordion type="multiple" value={Array.from(expandedCampaigns)}>
                        {filteredCampaigns.map((campaign) => (
                          <AccordionItem
                            key={campaign.campaign_id}
                            value={campaign.campaign_id}
                            className="border-b border-gray-800"
                          >
                            <AccordionTrigger
                              onClick={() => toggleCampaignExpanded(campaign.campaign_id)}
                              className="hover:no-underline"
                            >
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}
                                    className={cn(
                                      campaign.status === 'ACTIVE' 
                                        ? 'bg-green-500/20 text-green-500' 
                                        : 'bg-gray-500/20 text-gray-400'
                                    )}
                                  >
                                    {campaign.status}
                                  </Badge>
                                  <div className="text-left">
                                    <p className="font-medium text-white">{campaign.campaign_name}</p>
                                    <p className="text-xs text-gray-400">{campaign.objective}</p>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-8 gap-4 text-right">
                                  <div>
                                    <p className="text-xs text-gray-400">Spend</p>
                                    <p className="font-medium text-white">{formatCurrency(campaign.spent)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400">ROAS</p>
                                    <p className={cn(
                                      "font-medium",
                                      campaign.roas >= 2 ? "text-green-500" : 
                                      campaign.roas >= 1 ? "text-yellow-500" : "text-red-500"
                                    )}>
                                      {campaign.roas.toFixed(2)}x
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400">Impressions</p>
                                    <p className="font-medium text-white">{formatNumber(campaign.impressions)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400">Reach</p>
                                    <p className="font-medium text-white">{formatNumber(campaign.reach)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400">CTR</p>
                                    <p className="font-medium text-white">{campaign.ctr.toFixed(2)}%</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400">CPC</p>
                                    <p className="font-medium text-white">{formatCurrency(campaign.cpc)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400">Conv.</p>
                                    <p className="font-medium text-white">{formatNumber(campaign.conversions)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400">CPConv</p>
                                    <p className="font-medium text-white">{formatCurrency(campaign.cost_per_conversion)}</p>
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            
                            <AccordionContent>
                              <div className="pl-12 space-y-3">
                                {/* Campaign Analysis */}
                                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                                  <div className="grid grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-400">Budget</p>
                                      <p className="text-white font-medium">{formatCurrency(campaign.budget)}</p>
                                      <p className="text-xs text-gray-500">{campaign.budget_type}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400">Clicks</p>
                                      <p className="text-white font-medium">{formatNumber(campaign.clicks)}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400">Account</p>
                                      <p className="text-white font-medium">{campaign.account_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400">Period</p>
                                      <p className="text-xs text-white">
                                        {campaign.start_date ? format(new Date(campaign.start_date), 'MMM dd') : 'N/A'} - 
                                        {campaign.end_date ? format(new Date(campaign.end_date), 'MMM dd') : 'Ongoing'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="bg-purple-600/10 border-purple-600/50 hover:bg-purple-600/20 text-purple-400"
                                      onClick={() => runDailyCampaignAnalysis(campaign.campaign_id)}
                                      disabled={dailyCampaignAnalysis[campaign.campaign_id]?.lastAnalyzed?.toDateString() === new Date().toDateString()}
                                    >
                                      <Brain className="h-3 w-3 mr-1" />
                                      {dailyCampaignAnalysis[campaign.campaign_id]?.lastAnalyzed?.toDateString() === new Date().toDateString() 
                                        ? 'Analyzed Today' 
                                        : 'AI Analyze (1/day)'}
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Ad Sets */}
                                {campaign.adSets && campaign.adSets.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium text-gray-300">Ad Sets</p>
                                    <Accordion type="multiple" value={Array.from(expandedAdSets)}>
                                      {campaign.adSets.map((adSet) => (
                                        <AccordionItem
                                          key={adSet.adset_id}
                                          value={adSet.adset_id}
                                          className="border border-gray-800 rounded-lg"
                                        >
                                          <AccordionTrigger
                                            onClick={() => toggleAdSetExpanded(campaign.campaign_id, adSet.adset_id)}
                                            className="px-3 py-2 hover:no-underline"
                                          >
                                            <div className="flex items-center justify-between w-full pr-2">
                                              <div className="flex items-center gap-2">
                                                <Badge
                                                  variant={adSet.status === 'ACTIVE' ? 'default' : 'secondary'}
                                                  className="text-xs"
                                                >
                                                  {adSet.status}
                                                </Badge>
                                                <p className="text-sm text-white">{adSet.adset_name}</p>
                                              </div>
                                              
                                              <div className="grid grid-cols-6 gap-3 text-right text-xs">
                                                <div>
                                                  <p className="text-gray-400">Spend</p>
                                                  <p className="text-white">{formatCurrency(adSet.spent)}</p>
                                                </div>
                                                <div>
                                                  <p className="text-gray-400">Budget</p>
                                                  <p className="text-white">{formatCurrency(adSet.budget)}</p>
                                                </div>
                                                <div>
                                                  <p className="text-gray-400">Impressions</p>
                                                  <p className="text-white">{formatNumber(adSet.impressions)}</p>
                                                </div>
                                                <div>
                                                  <p className="text-gray-400">CTR</p>
                                                  <p className="text-white">{adSet.ctr.toFixed(2)}%</p>
                                                </div>
                                                <div>
                                                  <p className="text-gray-400">CPC</p>
                                                  <p className="text-white">{formatCurrency(adSet.cpc)}</p>
                                                </div>
                                                <div>
                                                  <p className="text-gray-400">Conv.</p>
                                                  <p className="text-white">{formatNumber(adSet.conversions)}</p>
                                                </div>
                                              </div>
                                            </div>
                                          </AccordionTrigger>
                                          
                                          <AccordionContent>
                                            <div className="px-3 pb-2">
                                              {/* Ads */}
                                              {adSet.ads && adSet.ads.length > 0 ? (
                                                <div className="space-y-2">
                                                  <p className="text-xs font-medium text-gray-400 mb-2">Ads</p>
                                                  {adSet.ads.map((ad) => (
                                                    <div
                                                      key={ad.ad_id}
                                                      className="p-3 bg-[#0A0A0A] rounded-lg border border-gray-800"
                                                    >
                                                      <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                          <Badge
                                                            variant={ad.status === 'ACTIVE' ? 'default' : 'secondary'}
                                                            className="text-xs"
                                                          >
                                                            {ad.status}
                                                          </Badge>
                                                          <p className="text-xs text-white font-medium">{ad.ad_name}</p>
                                                        </div>
                                                        
                                                        {ad.creative_url && (
                                                          <div className="flex items-center gap-1">
                                                            <Eye className="h-3 w-3 text-gray-400" />
                                                            <span className="text-xs text-gray-400">Creative</span>
                                                          </div>
                                                        )}
                                                      </div>
                                                      
                                                      <div className="grid grid-cols-5 gap-2 text-xs">
                                                        <div>
                                                          <p className="text-gray-500">Spend</p>
                                                          <p className="text-white">{formatCurrency(ad.spent)}</p>
                                                        </div>
                                                        <div>
                                                          <p className="text-gray-500">Impressions</p>
                                                          <p className="text-white">{formatNumber(ad.impressions)}</p>
                                                        </div>
                                                        <div>
                                                          <p className="text-gray-500">CTR</p>
                                                          <p className="text-white">{ad.ctr.toFixed(2)}%</p>
                                                        </div>
                                                        <div>
                                                          <p className="text-gray-500">CPC</p>
                                                          <p className="text-white">{formatCurrency(ad.cpc)}</p>
                                                        </div>
                                                        <div>
                                                          <p className="text-gray-500">Conv.</p>
                                                          <p className="text-white">{formatNumber(ad.conversions)}</p>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <p className="text-xs text-gray-500 text-center py-2">Loading ads...</p>
                                              )}
                                            </div>
                                          </AccordionContent>
                                        </AccordionItem>
                                      ))}
                                    </Accordion>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* AI Media Buyer Assistant - 1 column */}
          <div className="space-y-6">
            {/* Brand Goals */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-500" />
                    Brand Goals
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGoalDialog(true)}
                    className="bg-[#0A0A0A] border-gray-700"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Goal
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {brandGoals.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400">No active goals set</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {brandGoals.map((goal) => (
                      <div
                        key={goal.id}
                        className="p-3 bg-[#0A0A0A] rounded-lg border border-gray-800"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-white">{goal.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {goal.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        {goal.description && (
                          <p className="text-xs text-gray-400 mb-2">{goal.description}</p>
                        )}
                        {goal.targetValue && (
                          <Progress value={65} className="h-1" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  AI Media Buyer Insights
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Real-time optimization recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {isLoadingInsights ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : aiInsights.length === 0 ? (
                      <div className="text-center py-12">
                        <Brain className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">No insights available yet</p>
                        <p className="text-xs text-gray-500">Run campaigns to generate AI-powered optimization recommendations</p>
                        {campaigns.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 bg-purple-600/10 border-purple-600/50 hover:bg-purple-600/20 text-purple-400"
                            onClick={() => loadAIInsights()}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Generate Insights
                          </Button>
                        )}
                      </div>
                    ) : (
                      aiInsights.map((insight) => (
                        <Card
                          key={insight.id}
                          className={cn(
                            "bg-[#0A0A0A] border-gray-800 cursor-pointer transition-all hover:border-gray-700",
                            selectedInsight?.id === insight.id && "border-purple-500"
                          )}
                          onClick={() => setSelectedInsight(insight)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={getInsightColor(insight.type)}>
                                  {getInsightIcon(insight.type)}
                                </div>
                                <Badge variant={getPriorityBadgeVariant(insight.priority)}>
                                  {insight.priority}
                                </Badge>
                              </div>
                              <span className="text-xs text-gray-500">
                                {format(insight.timestamp, 'HH:mm')}
                              </span>
                            </div>
                            
                            <h4 className="text-sm font-medium text-white mb-1">
                              {insight.title}
                            </h4>
                            
                            <p className="text-xs text-gray-400 mb-3">
                              {insight.description}
                            </p>
                            
                            {insight.metrics && insight.metrics.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                {insight.metrics.map((metric, idx) => (
                                  <div key={idx} className="text-xs">
                                    <p className="text-gray-500">{metric.label}</p>
                                    <p className="text-white font-medium flex items-center gap-1">
                                      {metric.value}
                                      {metric.trend && (
                                        metric.trend === 'up' ? (
                                          <ArrowUpRight className="h-3 w-3 text-green-500" />
                                        ) : metric.trend === 'down' ? (
                                          <ArrowDownRight className="h-3 w-3 text-red-500" />
                                        ) : null
                                      )}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {insight.actionable && insight.action && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full bg-purple-500/10 border-purple-500/50 hover:bg-purple-500/20 text-purple-400"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleInsightAction(insight)
                                }}
                              >
                                {insight.action.label}
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Goal Dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent className="bg-[#1A1A1A] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Set Brand Goal</DialogTitle>
            <DialogDescription className="text-gray-400">
              Define your marketing objectives for AI optimization
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-gray-300">Goal Type</Label>
              <Select value={selectedGoalType} onValueChange={setSelectedGoalType}>
                <SelectTrigger className="bg-[#0A0A0A] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gray-700">
                  <SelectItem value="sales">Maximize Sales</SelectItem>
                  <SelectItem value="leads">Generate Leads</SelectItem>
                  <SelectItem value="traffic">Drive Traffic</SelectItem>
                  <SelectItem value="brand_awareness">Build Brand Awareness</SelectItem>
                  <SelectItem value="drop">Product Drop/Launch</SelectItem>
                  <SelectItem value="event">Event Promotion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-gray-300">Goal Name</Label>
              <Input
                placeholder="e.g., Black Friday Sales Target"
                className="bg-[#0A0A0A] border-gray-700 text-white"
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Description (Optional)</Label>
              <Textarea
                placeholder="Additional details about your goal..."
                className="bg-[#0A0A0A] border-gray-700 text-white"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowGoalDialog(false)}
                className="bg-[#0A0A0A] border-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toast.success('Goal added successfully')
                  setShowGoalDialog(false)
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Save Goal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 