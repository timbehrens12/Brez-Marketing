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
  Play, Pause, Edit, Trash2, Clock, Filter, Search, Plus, FileText
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
    cpc: 0,
    revenue: 0,
    cpa: 0
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
  const [insightHistory, setInsightHistory] = useState<Record<string, AIInsight[]>>({})
  
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
  
  // State for creative performance
  const [topCreatives, setTopCreatives] = useState<any[]>([])
  const [showABTestLauncher, setShowABTestLauncher] = useState(false)
  
  // State for budget recommendations
  const [budgetRecommendations, setBudgetRecommendations] = useState<any[]>([])


  // Load initial data
  useEffect(() => {
    if (selectedBrandId) {
      loadAllData()
    }
  }, [selectedBrandId, dateRange])
  
  // Auto-refresh AI insights daily
  useEffect(() => {
    if (selectedBrandId) {
      // Load insights from localStorage
      const savedInsights = localStorage.getItem(`ai_insights_history_${selectedBrandId}`)
      if (savedInsights) {
        setInsightHistory(JSON.parse(savedInsights))
      }
      
      // Check if we need to refresh insights (daily)
      const lastInsightDate = localStorage.getItem(`last_insight_date_${selectedBrandId}`)
      const today = new Date().toDateString()
      
      if (!lastInsightDate || lastInsightDate !== today) {
        // Generate new insights for today
        setTimeout(() => {
          loadAIInsights()
          localStorage.setItem(`last_insight_date_${selectedBrandId}`, today)
        }, 2000) // Small delay to ensure data is loaded
      }
    }
  }, [selectedBrandId])

  const loadAllData = async (silent = false) => {
    if (!silent) setIsLoading(true)
    
    try {
      // Load campaigns and metrics first
      await Promise.all([
        loadCampaigns(),
        loadMetrics(),
        loadBrandGoals(),
        loadCreativePerformance(),
        generateBudgetRecommendations()
      ])
      
      // Load AI insights if not already loaded today
      const lastInsightDate = localStorage.getItem(`last_insight_date_${selectedBrandId}`)
      const today = new Date().toDateString()
      
      if (!lastInsightDate || lastInsightDate !== today || aiInsights.length === 0) {
        await loadAIInsights()
        localStorage.setItem(`last_insight_date_${selectedBrandId}`, today)
      }
      
      setLastRefreshTime(new Date())
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
        cpc: data.cpc || 0,
        revenue: data.revenue || 0,
        cpa: data.cpa || 0
      })
    } catch (error) {
      console.error('Error loading metrics:', error)
    }
  }

  const loadAIInsights = async () => {
    if (!selectedBrandId || campaigns.length === 0) return
    
    setIsLoadingInsights(true)
    
    try {
      // Generate new insights
      const insights = await generateAIInsights()
      setAiInsights(insights)
      
      // Save to history
      const today = new Date().toDateString()
      const history = { ...insightHistory }
      if (!history[today]) {
        history[today] = []
      }
      history[today] = insights
      
      // Keep only last 30 days of history
      const dates = Object.keys(history).sort()
      if (dates.length > 30) {
        delete history[dates[0]]
      }
      
      setInsightHistory(history)
      localStorage.setItem(`ai_insights_history_${selectedBrandId}`, JSON.stringify(history))
      
    } catch (error) {
      console.error('Error loading AI insights:', error)
    } finally {
      setIsLoadingInsights(false)
    }
  }

  const generateAIInsights = async (): Promise<AIInsight[]> => {
    const insights: AIInsight[] = []
    
    // Analyze campaign performance
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE')
    const topPerformers = activeCampaigns.sort((a, b) => b.roas - a.roas).slice(0, 3)
    const poorPerformers = activeCampaigns.filter(c => c.roas < 1.5 || c.ctr < 1)
    
    // Budget optimization insights
    topPerformers.forEach(campaign => {
      if (campaign.ctr > 2 && campaign.cpc < totalMetrics.cpc * 0.8) {
        insights.push({
          id: `budget-${campaign.campaign_id}`,
          type: 'recommendation',
          priority: 'high',
          title: `Increase budget by 20% on ${campaign.campaign_name}`,
          description: `High CTR (${campaign.ctr.toFixed(2)}%), low CPC (${formatCurrency(campaign.cpc)})`,
          actionable: true,
          action: {
            type: 'increase_budget',
            label: 'Apply Budget Increase',
            params: { campaignId: campaign.campaign_id, increase: 20 }
          },
          metrics: [
            { label: 'Current ROAS', value: `${campaign.roas.toFixed(2)}x` },
            { label: 'Potential Revenue', value: formatCurrency(campaign.spent * campaign.roas * 1.2) }
          ],
          timestamp: new Date()
        })
      }
    })
    
    // Poor performer insights
    poorPerformers.forEach(campaign => {
      if (campaign.spent > totalMetrics.spend * 0.1) {
        insights.push({
          id: `pause-${campaign.campaign_id}`,
          type: 'alert',
          priority: 'high',
          title: `Pause ${campaign.campaign_name}`,
          description: `Low performance (${campaign.roas.toFixed(2)}x ROAS), high spend (${formatCurrency(campaign.spent)})`,
          actionable: true,
          action: {
            type: 'pause_campaign',
            label: 'Pause Campaign',
            params: { campaignId: campaign.campaign_id }
          },
          metrics: [
            { label: 'Wasted Spend', value: formatCurrency(campaign.spent - (campaign.spent * campaign.roas)) },
            { label: 'CTR', value: `${campaign.ctr.toFixed(2)}%`, trend: 'down' }
          ],
          timestamp: new Date()
        })
      }
    })
    
    // Creative fatigue detection
    campaigns.forEach(campaign => {
      if (campaign.daily_insights && campaign.daily_insights.length > 7) {
        const recentCTR = campaign.daily_insights.slice(-7).map(d => d.ctr)
        const avgRecentCTR = recentCTR.reduce((a, b) => a + b, 0) / recentCTR.length
        const olderCTR = campaign.daily_insights.slice(0, -7).map(d => d.ctr)
        const avgOlderCTR = olderCTR.reduce((a, b) => a + b, 0) / olderCTR.length
        
        if (avgOlderCTR > 0 && avgRecentCTR < avgOlderCTR * 0.7) {
          insights.push({
            id: `creative-fatigue-${campaign.campaign_id}`,
            type: 'opportunity',
            priority: 'medium',
            title: `Test new creative for ${campaign.campaign_name}`,
            description: `Creative fatigue detected - CTR dropped ${((1 - avgRecentCTR/avgOlderCTR) * 100).toFixed(0)}%`,
            actionable: true,
            action: {
              type: 'launch_ab_test',
              label: 'Launch A/B Test',
              params: { campaignId: campaign.campaign_id }
            },
            metrics: [
              { label: 'Recent CTR', value: `${avgRecentCTR.toFixed(2)}%`, trend: 'down' },
              { label: 'Previous CTR', value: `${avgOlderCTR.toFixed(2)}%` }
            ],
            timestamp: new Date()
          })
        }
      }
    })
    
    // Overall account insights
    if (totalMetrics.roas < 2) {
      insights.push({
        id: 'account-optimization',
        type: 'insight',
        priority: 'high',
        title: 'Account needs optimization',
        description: `Overall ROAS (${totalMetrics.roas.toFixed(2)}x) is below target. Consider pausing low performers and reallocating budget.`,
        actionable: false,
        metrics: [
          { label: 'Total Spend', value: formatCurrency(totalMetrics.spend) },
          { label: 'Revenue Lost', value: formatCurrency(totalMetrics.spend * (2 - totalMetrics.roas)) }
        ],
        timestamp: new Date()
      })
    }
    
    return insights
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

  const loadCreativePerformance = async () => {
    if (!selectedBrandId || !dateRange?.from || !dateRange?.to) return
    try {
      // For now, we'll use campaign data to simulate creative performance
      // In a real implementation, this would fetch actual creative data
      const topCampaigns = campaigns
        .filter(c => c.status === 'ACTIVE')
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 5)
        .map(campaign => ({
          id: campaign.campaign_id,
          name: campaign.campaign_name,
          ctr: campaign.ctr,
          cpc: campaign.cpc,
          impressions: campaign.impressions,
          conversions: campaign.conversions,
          creative_url: null // Would be actual creative URL in real implementation
        }))
      
      setTopCreatives(topCampaigns)
    } catch (error) {
      console.error('Error loading creative performance:', error)
    }
  }

  const generateBudgetRecommendations = async () => {
    if (!selectedBrandId || !dateRange?.from || !dateRange?.to || campaigns.length === 0) return
    try {
      // Generate budget recommendations based on campaign performance
      const recommendations = campaigns
        .filter(c => c.status === 'ACTIVE')
        .map(campaign => {
          let recommendation = { 
            campaignId: campaign.campaign_id,
            campaignName: campaign.campaign_name,
            currentBudget: campaign.budget,
            suggestedBudget: campaign.budget,
            reason: '',
            expectedImpact: ''
          }
          
          if (campaign.roas > 2.5 && campaign.ctr > 2) {
            recommendation.suggestedBudget = campaign.budget * 1.5
            recommendation.reason = 'High performing campaign'
            recommendation.expectedImpact = `+${formatCurrency(campaign.spent * 0.5 * campaign.roas)} revenue`
          } else if (campaign.roas < 1 || campaign.ctr < 0.5) {
            recommendation.suggestedBudget = campaign.budget * 0.5
            recommendation.reason = 'Poor performance'
            recommendation.expectedImpact = `Save ${formatCurrency(campaign.budget * 0.5)}`
          }
          
          return recommendation
        })
        .filter(r => r.suggestedBudget !== r.currentBudget)
      
      setBudgetRecommendations(recommendations)
    } catch (error) {
      console.error('Error generating budget recommendations:', error)
    }
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

  // Show brand selection message if no brand is selected
  if (!selectedBrandId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-16 w-16 text-purple-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Marketing Assistant</h1>
          <p className="text-gray-400">Please select a brand to view marketing insights and campaign data</p>
        </div>
      </div>
    )
  }

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
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">Marketing Command Center</h1>
            {lastRefreshTime && (
              <p className="text-xs text-gray-500">
                Updated {format(lastRefreshTime, 'h:mm a')}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <DateRangePicker
              dateRange={{
                from: dateRange?.from || addDays(new Date(), -7),
                to: dateRange?.to || new Date()
              }}
              setDateRange={(range) => setDateRange(range)}
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAllData()}
              className="bg-[#1A1A1A] border-[#333] hover:bg-[#252525]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Column - Performance Overview */}
          <div className="lg:col-span-1 space-y-6">
            {/* Performance Overview Card */}
            <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-white">Performance Overview</CardTitle>
                <CardDescription className="text-xs text-gray-400">
                  {dateRange?.from && dateRange?.to && 
                    `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Total Spend */}
                <div className="p-3 bg-[#0A0A0A] rounded-lg border border-[#333]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">Total Spend</p>
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{formatCurrency(totalMetrics.spend)}</p>
                  <p className="text-xs text-gray-500 mt-1">Budget utilized</p>
                </div>
                
                {/* ROAS & Conversions */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#0A0A0A] rounded-lg border border-[#333]">
                    <p className="text-xs text-gray-400 mb-1">ROAS</p>
                    <p className="text-xl font-bold text-white">{totalMetrics.roas.toFixed(1)}x</p>
                    <p className="text-xs text-gray-500">{formatNumber(totalMetrics.conversions)}</p>
                    <p className="text-xs text-gray-500">Conversions</p>
                  </div>
                  
                  <div className="p-3 bg-[#0A0A0A] rounded-lg border border-[#333]">
                    <p className="text-xs text-gray-400 mb-1">CPA</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(totalMetrics.spend / (totalMetrics.conversions || 1))}
                    </p>
                    <p className="text-xs text-gray-500">{formatNumber(totalMetrics.conversions)}</p>
                    <p className="text-xs text-gray-500">Conversions</p>
                  </div>
                </div>
                
                {/* CTR */}
                <div className="p-3 bg-[#0A0A0A] rounded-lg border border-[#333]">
                  <p className="text-xs text-gray-400 mb-1">CTR</p>
                  <p className="text-xl font-bold text-white">{totalMetrics.ctr.toFixed(2)}%</p>
                  <div className="mt-2">
                    <div className="w-full bg-[#222] rounded-full h-1.5">
                      <div 
                        className={cn(
                          "h-1.5 rounded-full",
                          totalMetrics.ctr >= 2 ? "bg-green-500" : 
                          totalMetrics.ctr >= 1 ? "bg-yellow-500" : "bg-red-500"
                        )} 
                        style={{ width: `${Math.min(totalMetrics.ctr * 20, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Account Performance */}
            <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-white">Account Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 mb-2">Suggested Budget Allocation</p>
                  {campaigns
                    .filter(c => c.status === 'ACTIVE')
                    .sort((a, b) => b.roas - a.roas)
                    .slice(0, 3)
                    .map((campaign, idx) => {
                      const suggestedBudget = campaign.roas > 2.5 ? campaign.budget * 1.5 : 
                                             campaign.roas > 1.5 ? campaign.budget : 
                                             campaign.budget * 0.5
                      return (
                        <div key={campaign.campaign_id} className="flex items-center justify-between py-2 border-b border-[#333] last:border-0">
                          <div className="flex-1">
                            <p className="text-sm text-white truncate">{campaign.campaign_name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{formatCurrency(suggestedBudget)}</span>
                            <ChevronRight className="h-3 w-3 text-gray-400" />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
            
            {/* Goals */}
            <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-white">Goals</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGoalDialog(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {brandGoals.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No goals set</p>
                ) : (
                  <div className="space-y-3">
                    {brandGoals.slice(0, 3).map((goal) => {
                      const progress = goal.targetValue ? 
                        Math.min((totalMetrics.revenue / goal.targetValue) * 100, 100) : 
                        50
                      return (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-white">{goal.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {goal.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          {goal.targetValue && (
                            <>
                              <Progress value={progress} className="h-1.5" />
                              <p className="text-xs text-gray-400">
                                {formatCurrency(totalMetrics.revenue)} of {formatCurrency(goal.targetValue)}
                              </p>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Center Column - AI Recommendations */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                      <Brain className="h-5 w-5 text-gray-400" />
                      AI RECOMMENDATIONS
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-400 mt-1">
                      Powered by campaign performance analysis
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadAIInsights()}
                    disabled={isLoadingInsights}
                  >
                    <RefreshCw className={cn("h-4 w-4", isLoadingInsights && "animate-spin")} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {isLoadingInsights ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                          <p className="text-sm text-gray-400">Analyzing campaign performance...</p>
                        </div>
                      </div>
                    ) : aiInsights.length === 0 ? (
                      <div className="text-center py-12">
                        <Brain className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">No recommendations available</p>
                        <p className="text-xs text-gray-500">Run campaigns to generate insights</p>
                      </div>
                    ) : (
                      aiInsights.map((insight) => (
                        <div
                          key={insight.id}
                          className={cn(
                            "p-4 bg-[#0A0A0A] rounded-lg border transition-all cursor-pointer",
                            selectedInsight?.id === insight.id 
                              ? "border-blue-500" 
                              : "border-[#333] hover:border-[#444]"
                          )}
                          onClick={() => setSelectedInsight(insight)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "p-2 rounded-lg flex-shrink-0",
                              insight.type === 'alert' ? "bg-red-500/10" :
                              insight.type === 'opportunity' ? "bg-green-500/10" :
                              insight.type === 'recommendation' ? "bg-blue-500/10" :
                              "bg-gray-500/10"
                            )}>
                              {getInsightIcon(insight.type)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="text-sm font-medium text-white pr-2">
                                  {insight.title}
                                </h4>
                                <Badge 
                                  variant={getPriorityBadgeVariant(insight.priority)}
                                  className="text-xs flex-shrink-0"
                                >
                                  {insight.priority}
                                </Badge>
                              </div>
                              
                              <p className="text-xs text-gray-400 mb-3">
                                {insight.description}
                              </p>
                              
                              {insight.metrics && insight.metrics.length > 0 && (
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  {insight.metrics.map((metric, idx) => (
                                    <div key={idx} className="bg-[#1A1A1A] p-2 rounded">
                                      <p className="text-xs text-gray-500">{metric.label}</p>
                                      <p className="text-sm font-medium text-white flex items-center gap-1">
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
                                  className="w-full bg-blue-500/10 border-blue-500/50 hover:bg-blue-500/20 text-blue-400"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleInsightAction(insight)
                                  }}
                                >
                                  {insight.action.label}
                                  <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Creative Performance & A/B Testing */}
          <div className="lg:col-span-1 space-y-6">
            {/* Creative Performance */}
            <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-white">Creative Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns
                    .filter(c => c.status === 'ACTIVE')
                    .sort((a, b) => b.ctr - a.ctr)
                    .slice(0, 2)
                    .map((campaign, idx) => (
                      <div key={campaign.campaign_id} className="space-y-2">
                        <div className="aspect-video bg-[#0A0A0A] rounded-lg border border-[#333] overflow-hidden relative">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Eye className="h-8 w-8 text-gray-600" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                            <p className="text-xs text-white font-medium truncate">{campaign.campaign_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <p className="text-gray-400">CTR</p>
                            <p className="font-medium text-white">{campaign.ctr.toFixed(1)}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400">CPC</p>
                            <p className="font-medium text-white">{formatCurrency(campaign.cpc)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
            
            {/* A/B Test Launcher */}
            <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-white">Launch AI-Optimized A/B Test</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-[#0A0A0A] rounded-lg border border-[#333]">
                    <p className="text-sm font-medium text-white mb-2">Copy 1</p>
                    <p className="text-xs text-gray-400">Get 50% Off Your First Month</p>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Primary text</p>
                      <p className="text-xs text-gray-300">Enjoy 50% Off the First Month</p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-[#0A0A0A] rounded-lg border border-[#333]">
                    <p className="text-sm font-medium text-white mb-2">Copy 2</p>
                    <p className="text-xs text-gray-400">Limited Time: Half Price First Month</p>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Primary text</p>
                      <p className="text-xs text-gray-300">Start Today - 50% Off</p>
                    </div>
                  </div>
                  
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      setShowABTestLauncher(true)
                      toast.info('A/B test launcher coming soon!')
                    }}
                  >
                    Launch Test
                  </Button>
                </div>
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
                placeholder="e.g., Q4 Revenue Target"
                className="bg-[#0A0A0A] border-gray-700 text-white"
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Target Value</Label>
              <Input
                type="number"
                placeholder="e.g., 150000"
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
                className="bg-blue-600 hover:bg-blue-700"
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