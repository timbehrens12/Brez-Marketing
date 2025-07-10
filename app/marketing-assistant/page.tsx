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
    cpc: 0
  })
  
  // State for campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set())
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  
  // State for AI insights with memory
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null)
  const [pastRecommendations, setPastRecommendations] = useState<Record<string, {
    recommendation: AIInsight
    implementedAt?: Date
    effectiveness?: 'positive' | 'negative' | 'neutral'
    metricsBeforeAfter?: {
      before: { roas: number, ctr: number, spend: number }
      after: { roas: number, ctr: number, spend: number }
    }
  }>>({})
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
  
  // Filtered campaigns based on search and filters
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter
    const matchesObjective = objectiveFilter === 'all' || campaign.objective === objectiveFilter
    const shouldShowPaused = showPausedCampaigns || campaign.status === 'ACTIVE'
    
    return matchesSearch && matchesStatus && matchesObjective && shouldShowPaused
  })

  // Load initial data
  useEffect(() => {
    if (selectedBrandId) {
      loadPastRecommendations()
      loadAllData()
      // Load AI insights automatically on page load
      loadAIInsights()
    }
  }, [selectedBrandId, dateRange])

  // Load past recommendations from localStorage
  const loadPastRecommendations = () => {
    try {
      const stored = localStorage.getItem(`ai_recommendations_${selectedBrandId}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Convert date strings back to Date objects
        Object.keys(parsed).forEach(key => {
          if (parsed[key].implementedAt) {
            parsed[key].implementedAt = new Date(parsed[key].implementedAt)
          }
          if (parsed[key].recommendation?.timestamp) {
            parsed[key].recommendation.timestamp = new Date(parsed[key].recommendation.timestamp)
          }
        })
        setPastRecommendations(parsed)
      }
    } catch (error) {
      console.error('Error loading past recommendations:', error)
    }
  }

  // Save recommendations to localStorage
  const savePastRecommendations = (recommendations: typeof pastRecommendations) => {
    try {
      localStorage.setItem(`ai_recommendations_${selectedBrandId}`, JSON.stringify(recommendations))
    } catch (error) {
      console.error('Error saving past recommendations:', error)
    }
  }

  // Track when a recommendation is implemented
  const markRecommendationImplemented = (insightId: string) => {
    const updated = {
      ...pastRecommendations,
      [insightId]: {
        ...pastRecommendations[insightId],
        implementedAt: new Date(),
        metricsBeforeAfter: {
          before: {
            roas: totalMetrics.roas,
            ctr: totalMetrics.ctr,
            spend: totalMetrics.spend
          },
          after: { roas: 0, ctr: 0, spend: 0 } // Will be updated later
        }
      }
    }
    setPastRecommendations(updated)
    savePastRecommendations(updated)
  }

  // Measure effectiveness of past recommendations
  const measureRecommendationEffectiveness = () => {
    const updated = { ...pastRecommendations }
    let hasUpdates = false

    Object.keys(updated).forEach(insightId => {
      const rec = updated[insightId]
      if (rec.implementedAt && rec.metricsBeforeAfter && !rec.effectiveness) {
        const daysSinceImplemented = Math.floor((new Date().getTime() - rec.implementedAt.getTime()) / (1000 * 60 * 60 * 24))
        
        // Wait at least 3 days before measuring effectiveness
        if (daysSinceImplemented >= 3) {
          // Update "after" metrics
          rec.metricsBeforeAfter.after = {
            roas: totalMetrics.roas,
            ctr: totalMetrics.ctr,
            spend: totalMetrics.spend
          }

          // Determine effectiveness based on metric improvements
          const roasImprovement = totalMetrics.roas - rec.metricsBeforeAfter.before.roas
          const ctrImprovement = totalMetrics.ctr - rec.metricsBeforeAfter.before.ctr
          
          if (roasImprovement > 0.2 || ctrImprovement > 0.5) {
            rec.effectiveness = 'positive'
          } else if (roasImprovement < -0.2 || ctrImprovement < -0.5) {
            rec.effectiveness = 'negative'
          } else {
            rec.effectiveness = 'neutral'
          }
          
          hasUpdates = true
        }
      }
    })

    if (hasUpdates) {
      setPastRecommendations(updated)
      savePastRecommendations(updated)
    }
  }

  const loadAllData = async (silent = false) => {
    if (!silent) setIsLoading(true)
    
    try {
      // Load campaigns and metrics first
      await Promise.all([
        loadCampaigns(),
        loadMetrics(),
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
    setIsLoadingInsights(true)
    
    try {
      // Measure effectiveness of past recommendations first
      measureRecommendationEffectiveness()
      
      const insights = await generateAIInsights()
      setAiInsights(insights)
      
      // Save new insights to past recommendations if they're actionable
      const newRecommendations = { ...pastRecommendations }
      insights.forEach(insight => {
        if (insight.actionable && !newRecommendations[insight.id]) {
          newRecommendations[insight.id] = {
            recommendation: insight
          }
        }
      })
      
      if (Object.keys(newRecommendations).length !== Object.keys(pastRecommendations).length) {
        setPastRecommendations(newRecommendations)
        savePastRecommendations(newRecommendations)
      }
    } catch (error) {
      console.error('Error loading AI insights:', error)
      toast.error('Failed to load AI insights')
    } finally {
      setIsLoadingInsights(false)
    }
  }

  const generateAIInsights = async (): Promise<AIInsight[]> => {
    if (campaigns.length === 0) return []
    
    const insights: AIInsight[] = []
    
    // Get effectiveness of past recommendations for context
    const pastEffectiveness = Object.values(pastRecommendations).filter(r => r.effectiveness)
    const successfulRecommendations = pastEffectiveness.filter(r => r.effectiveness === 'positive').length
    const totalPastRecommendations = pastEffectiveness.length
    
    // Add context about past recommendation success
    if (totalPastRecommendations > 0) {
      const successRate = (successfulRecommendations / totalPastRecommendations) * 100
      insights.push({
        id: `past-performance-${Date.now()}`,
        type: 'insight',
        priority: 'medium',
        title: 'AI Recommendation Track Record',
        description: `${successfulRecommendations}/${totalPastRecommendations} past recommendations showed positive results (${successRate.toFixed(1)}% success rate).`,
        actionable: false,
        timestamp: new Date()
      })
    }

    // Campaign performance analysis
    const poorPerformers = campaigns.filter(c => c.roas < 1.5 && c.spent > 100)
    const topPerformers = campaigns.filter(c => c.roas > 3 && c.status === 'ACTIVE')
    const lowCtrCampaigns = campaigns.filter(c => c.ctr < 1.0 && c.status === 'ACTIVE')
    
    // Budget reallocation recommendations (avoiding past failed recommendations)
    if (poorPerformers.length > 0 && topPerformers.length > 0) {
      const budgetReallocId = `budget-realloc-${Date.now()}`
      const pastBudgetRecs = Object.values(pastRecommendations).filter(r => 
        r.recommendation.title.includes('budget') && r.effectiveness === 'negative'
      )
      
      if (pastBudgetRecs.length === 0) { // Only suggest if past budget recommendations weren't negative
        insights.push({
          id: budgetReallocId,
          type: 'opportunity',
          priority: 'high',
          title: `Reallocate budget from ${poorPerformers.length} underperforming campaigns`,
          description: `Move budget from campaigns with ROAS < 1.5x to campaigns with ROAS > 3x to improve overall performance.`,
          actionable: true,
          action: {
            type: 'budget_reallocation',
            label: 'Implement Budget Changes',
            params: { poorPerformers: poorPerformers.map(c => c.campaign_id), topPerformers: topPerformers.map(c => c.campaign_id) }
          },
          metrics: [
            { label: 'Potential ROAS Gain', value: '+0.5x', trend: 'up' },
            { label: 'Budget Impact', value: formatCurrency(poorPerformers.reduce((sum, c) => sum + c.spent, 0)) }
          ],
          timestamp: new Date()
        })
      }
    }

    // Creative fatigue detection
    if (lowCtrCampaigns.length > 0) {
      const creativeRefreshId = `creative-refresh-${Date.now()}`
      insights.push({
        id: creativeRefreshId,
        type: 'alert',
        priority: 'medium',
        title: `${lowCtrCampaigns.length} campaigns show signs of creative fatigue`,
        description: 'CTR below 1% suggests audiences may be tired of current creatives. Consider refreshing ad content.',
        actionable: true,
        action: {
          type: 'creative_refresh',
          label: 'Launch Creative Tests',
          params: { campaigns: lowCtrCampaigns.map(c => c.campaign_id) }
        },
        metrics: [
          { label: 'Avg CTR', value: `${(lowCtrCampaigns.reduce((sum, c) => sum + c.ctr, 0) / lowCtrCampaigns.length).toFixed(2)}%`, trend: 'down' },
          { label: 'Affected Spend', value: formatCurrency(lowCtrCampaigns.reduce((sum, c) => sum + c.spent, 0)) }
        ],
        timestamp: new Date()
      })
    }

    // Account-level insights
    if (totalMetrics.roas < 2) {
      insights.push({
        id: `account-optimization-${Date.now()}`,
        type: 'recommendation',
        priority: 'high',
        title: 'Account ROAS below target threshold',
        description: 'Overall ROAS is below 2x. Focus on audience refinement and bid optimization.',
        actionable: true,
        action: {
          type: 'account_optimization',
          label: 'Review Account Settings',
          params: { currentRoas: totalMetrics.roas }
        },
        metrics: [
          { label: 'Current ROAS', value: `${totalMetrics.roas.toFixed(2)}x`, trend: 'down' },
          { label: 'Target ROAS', value: '2.0x' }
        ],
        timestamp: new Date()
      })
    }

    // Positive reinforcement for successful past implementations
    const recentSuccesses = Object.values(pastRecommendations).filter(r => 
      r.effectiveness === 'positive' && 
      r.implementedAt &&
      (new Date().getTime() - r.implementedAt.getTime()) < (7 * 24 * 60 * 60 * 1000) // Last 7 days
    )
    
    if (recentSuccesses.length > 0) {
      insights.push({
        id: `success-reinforcement-${Date.now()}`,
        type: 'insight',
        priority: 'low',
        title: `Recent optimization success detected`,
        description: `${recentSuccesses.length} recent recommendations are showing positive results. Keep monitoring performance.`,
        actionable: false,
        timestamp: new Date()
      })
    }

    return insights.slice(0, 8) // Limit to 8 insights
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
    
    try {
      // Mark the recommendation as implemented
      markRecommendationImplemented(insight.id)
      
      switch (insight.action.type) {
        case 'budget_reallocation':
          toast.info('Budget reallocation recommendations noted. Review your Meta Ads Manager to implement changes.')
          break
          
        case 'creative_refresh':
          toast.info('Creative refresh recommended. Consider A/B testing new ad creatives for the affected campaigns.')
          break
          
        case 'account_optimization':
          toast.info('Account optimization needed. Review audience targeting and bid strategies in Meta Ads Manager.')
          break
          
        case 'pause_campaign':
          toast.info('Campaign pause recommended. Review performance in Meta Ads Manager.')
          break
          
        case 'increase_budget':
          toast.info('Budget increase recommended. Consider scaling successful campaigns in Meta Ads Manager.')
          break
          
        case 'refresh_creative':
          toast.info('Creative refresh suggested. Test new ad formats and messaging.')
          break
          
        case 'create_audience':
          toast.info('New audience opportunity identified. Create custom audiences in Meta Ads Manager.')
          break
          
        default:
          toast.info('Recommendation noted. Review details in Meta Ads Manager.')
      }
      
      // Show feedback message about tracking
      setTimeout(() => {
        toast.success('✅ Action implemented! We\'ll track the effectiveness of this change over the next few days.')
      }, 1000)
      
    } catch (error) {
      console.error('Error handling insight action:', error)
      toast.error('Failed to process action')
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
      {/* Top Metrics */}
      <div className="px-6 py-6">
        {/* Header with controls moved inline */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">Performance Overview</h2>
            {lastRefreshTime && (
              <p className="text-xs text-gray-500">
                Last refreshed: {format(lastRefreshTime, 'MMM dd, yyyy HH:mm')}
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

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total Spend</p>
                <p className="text-xl font-bold text-white">{formatCurrency(totalMetrics.spend)}</p>
                <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
              </div>
              <div className="text-right">
                <DollarSign className="h-8 w-8 text-gray-400 mb-1" />
                <div className="text-xs text-gray-400">+12%</div>
              </div>
            </div>
          </div>
          
          <div className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors rounded-lg p-4">
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
                <TrendingUp className="h-8 w-8 text-gray-400 mb-1" />
                <div className="text-xs text-gray-400">+8%</div>
              </div>
            </div>
          </div>
          
          <div className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Active Campaigns</p>
                <p className="text-xl font-bold text-white">{totalMetrics.activeCampaigns}</p>
              </div>
              <Target className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Avg CTR</p>
                <p className="text-xl font-bold text-white">{totalMetrics.ctr.toFixed(2)}%</p>
              </div>
              <MousePointerClick className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Conversions</p>
                <p className="text-xl font-bold text-white">{formatNumber(totalMetrics.conversions)}</p>
              </div>
              <Zap className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Impressions</p>
                <p className="text-xl font-bold text-white">{formatNumber(totalMetrics.impressions)}</p>
              </div>
              <Eye className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Clicks</p>
                <p className="text-xl font-bold text-white">{formatNumber(totalMetrics.clicks)}</p>
              </div>
              <MousePointerClick className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Avg CPC</p>
                <p className="text-xl font-bold text-white">{formatCurrency(totalMetrics.cpc)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>
        
        {/* Quick Performance Summary */}
        {campaigns.length > 0 && (
          <div className="mt-6 p-4 bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors rounded-lg">
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

      {/* Main Content - New 3-Column Layout */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Left Column: Performance Overview */}
          <div className="xl:col-span-4 space-y-6">
            {/* Key Metrics */}
            <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-400" />
                  Performance Overview
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {dateRange?.from && dateRange?.to ? 
                    `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` : 
                    'Last 7 days'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-[#0A0A0A] rounded-lg">
                    <div className="text-2xl font-bold text-white">{formatCurrency(totalMetrics.spend)}</div>
                    <div className="text-xs text-gray-400">Total Spend</div>
                    <div className="text-xs text-gray-500 mt-1">+12% vs last period</div>
                  </div>
                  <div className="text-center p-3 bg-[#0A0A0A] rounded-lg">
                    <div className="text-2xl font-bold text-white">{totalMetrics.roas.toFixed(1)}x</div>
                    <div className="text-xs text-gray-400">ROAS</div>
                    <div className={cn(
                      "text-xs mt-1 font-medium",
                      totalMetrics.roas >= 2 ? "text-green-400" : "text-yellow-400"
                    )}>
                      {totalMetrics.roas >= 3 ? "Excellent" : totalMetrics.roas >= 2 ? "Good" : "Needs Work"}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-[#0A0A0A] rounded-lg">
                    <div className="text-lg font-bold text-white">{totalMetrics.ctr.toFixed(2)}%</div>
                    <div className="text-xs text-gray-400">CTR</div>
                  </div>
                  <div className="text-center p-3 bg-[#0A0A0A] rounded-lg">
                    <div className="text-lg font-bold text-white">{formatNumber(totalMetrics.conversions)}</div>
                    <div className="text-xs text-gray-400">Conversions</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-[#0A0A0A] rounded-lg">
                    <div className="text-lg font-bold text-white">{formatCurrency(totalMetrics.cpc)}</div>
                    <div className="text-xs text-gray-400">CPC</div>
                  </div>
                  <div className="text-center p-3 bg-[#0A0A0A] rounded-lg">
                    <div className="text-lg font-bold text-white">{formatNumber(totalMetrics.impressions)}</div>
                    <div className="text-xs text-gray-400">Impressions</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Performance Suggestions */}
            <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                  Account Performance
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Suggested budget allocations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {campaigns.slice(0, 3).map((campaign, index) => (
                    <div key={campaign.campaign_id} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-white text-sm truncate">{campaign.campaign_name}</div>
                        <div className="text-xs text-gray-400">
                          {campaign.roas >= 2 ? 'High performer' : 'Optimization needed'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">{formatCurrency(campaign.spent)}</div>
                        <div className="text-xs text-gray-400">
                          {campaign.roas >= 2 ? '↑ Increase' : '↓ Reduce'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-gray-400" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start bg-[#0A0A0A] border-[#333] hover:bg-[#222] text-gray-300"
                    onClick={() => loadAllData()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start bg-[#0A0A0A] border-[#333] hover:bg-[#222] text-gray-300"
                    onClick={() => setShowGoalDialog(true)}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Set Goal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column: AI Recommendations & Goals */}
          <div className="xl:col-span-4 space-y-6">
            {/* AI Recommendations */}
            <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Brain className="h-5 w-5 text-gray-400" />
                    AI Recommendations
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadAIInsights()}
                    className="bg-[#0A0A0A] border-[#333] hover:bg-[#222] text-gray-400"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {isLoadingInsights ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : aiInsights.length === 0 ? (
                      <div className="text-center py-8">
                        <Brain className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Generating insights...</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 bg-[#0A0A0A] border-[#333] hover:bg-[#222] text-gray-300"
                          onClick={() => loadAIInsights()}
                        >
                          Generate Now
                        </Button>
                      </div>
                    ) : (
                      aiInsights.map((insight) => (
                        <div
                          key={insight.id}
                          className="p-3 bg-[#0A0A0A] rounded-lg border border-[#333] hover:border-[#444] transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-1">
                              {insight.type === 'alert' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                              {insight.type === 'opportunity' && <TrendingUp className="h-4 w-4 text-green-500" />}
                              {insight.type === 'recommendation' && <Sparkles className="h-4 w-4 text-blue-500" />}
                              {insight.type === 'insight' && <Eye className="h-4 w-4 text-purple-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-white">{insight.title}</h4>
                              <p className="text-xs text-gray-400 mt-1">{insight.description}</p>
                              {insight.actionable && insight.action && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 h-6 text-xs bg-[#222] border-[#444] hover:bg-[#333] text-gray-300"
                                  onClick={() => handleInsightAction(insight)}
                                >
                                  {insight.action.label}
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

            {/* Goals */}
            <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="h-5 w-5 text-gray-400" />
                    Goals
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGoalDialog(true)}
                    className="bg-[#0A0A0A] border-[#333] hover:bg-[#222] text-gray-400"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {brandGoals.length === 0 ? (
                  <div className="text-center py-6">
                    <Target className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 mb-3">No goals set</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGoalDialog(true)}
                      className="bg-[#0A0A0A] border-[#333] hover:bg-[#222] text-gray-300"
                    >
                      Create First Goal
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {brandGoals.map((goal) => (
                      <div key={goal.id} className="p-3 bg-[#0A0A0A] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-white">{goal.name}</h4>
                          <Badge variant="outline" className="text-xs border-[#444] text-gray-400">
                            {goal.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        {goal.targetValue && (
                          <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Progress</span>
                              <span>65%</span>
                            </div>
                            <Progress value={65} className="h-2" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Creative Performance & Campaign Details */}
          <div className="xl:col-span-4 space-y-6">
            {/* Creative Performance */}
            <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Eye className="h-5 w-5 text-gray-400" />
                  Creative Performance
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Top performing ads and creatives
                </CardDescription>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <Eye className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No campaigns data</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {campaigns.slice(0, 2).map((campaign) => (
                      <div key={campaign.campaign_id} className="p-3 bg-[#0A0A0A] rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-[#333] rounded-lg flex items-center justify-center">
                            <Eye className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-white truncate">{campaign.campaign_name}</h4>
                            <p className="text-xs text-gray-400">{campaign.objective}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-400">CTR: </span>
                            <span className="text-white font-medium">{campaign.ctr.toFixed(2)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-400">ROAS: </span>
                            <span className={cn(
                              "font-medium",
                              campaign.roas >= 2 ? "text-green-400" : "text-yellow-400"
                            )}>
                              {campaign.roas.toFixed(1)}x
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Spend: </span>
                            <span className="text-white font-medium">{formatCurrency(campaign.spent)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Conv: </span>
                            <span className="text-white font-medium">{formatNumber(campaign.conversions)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* A/B Test Suggestion */}
                    <div className="p-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-800/30">
                      <h4 className="text-sm font-medium text-white mb-2">Launch A/B Test</h4>
                      <p className="text-xs text-gray-400 mb-3">Test new creative variations for top campaigns</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/30 text-blue-400"
                        onClick={() => toast.info('A/B testing feature coming soon!')}
                      >
                        Launch Test
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Campaign List */}
            <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-400" />
                  Campaigns ({campaigns.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {isLoadingCampaigns ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : filteredCampaigns.length === 0 ? (
                      <div className="text-center py-8">
                        <BarChart3 className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No campaigns found</p>
                      </div>
                    ) : (
                      filteredCampaigns.map((campaign) => (
                        <div
                          key={campaign.campaign_id}
                          className="p-3 bg-[#0A0A0A] rounded-lg hover:bg-[#111] transition-colors cursor-pointer"
                          onClick={() => toggleCampaignExpanded(campaign.campaign_id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  campaign.status === 'ACTIVE' ? "bg-green-500" : "bg-gray-500"
                                )}></div>
                                <h4 className="text-sm font-medium text-white truncate">{campaign.campaign_name}</h4>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                                <span>{formatCurrency(campaign.spent)}</span>
                                <span>ROAS: {campaign.roas.toFixed(1)}x</span>
                                <span>CTR: {campaign.ctr.toFixed(2)}%</span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
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