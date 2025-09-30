"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAuth } from '@clerk/nextjs'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAgency } from '@/contexts/AgencyContext'

// Components
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  Sparkles,
  Info,
  X,
  Clock,
  TrendingDown,
  Wand2,
  Activity,
  Award,
  Gauge
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

interface ActionKPIs {
  activeCampaigns: number
  totalCampaigns: number
  budgetUtilization: number // percentage of daily budget spent
  topPerformer: {
    name: string
  roas: number
    spend: number
  } | null
  needsAttention: number // count of underperforming campaigns
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
  platform?: 'meta' | 'google' | 'tiktok' | 'all' // Platform this alert is for
}

export default function MarketingAssistantPage() {
  const { userId } = useAuth()
  const { selectedBrandId } = useBrandContext()
  const { agencySettings } = useAgency()
  
  // State
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null)
  const [actionKPIs, setActionKPIs] = useState<ActionKPIs | null>(null)
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
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState(['meta', 'google', 'tiktok'])
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable')
  const [recommendationsViewed, setRecommendationsViewed] = useState(false)
  const [timeUntilRefresh, setTimeUntilRefresh] = useState('')
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set())
  const [dateRangeText, setDateRangeText] = useState<string>('')
  const [nextUpdateText, setNextUpdateText] = useState<string>('')

  // Filter data based on selected platforms (client-side filtering for display only)
  const filteredAlerts = alerts // Alerts are already platform-specific based on filtered metrics
  const filteredOptimizations = optimizationCards.filter(card => 
    selectedPlatforms.includes('meta') // All recommendations are from meta_campaigns for now
  )
  const filteredBudgetAllocations = budgetAllocations.filter(allocation =>
    selectedPlatforms.includes('meta') // Budget data is from meta_campaigns
  )
  const filteredAudienceExpansions = audienceExpansions.filter(expansion =>
    selectedPlatforms.includes('meta') // Audience data is from meta_campaigns
  )
  // Note: Performance trends filter by platform in their rendering logic already

  // Calculate Monday-to-Monday date range
  const getMondayToMondayDates = () => {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate this week's Monday (or today if it's Monday)
    const thisMonday = new Date(now)
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    thisMonday.setDate(now.getDate() - daysFromMonday)
    thisMonday.setHours(0, 0, 0, 0)
    
    // Calculate last Monday (7 days before this Monday)
    const lastMonday = new Date(thisMonday)
    lastMonday.setDate(thisMonday.getDate() - 7)
    
    return { lastMonday, thisMonday }
  }
  
  // Calculate time until next Monday 12am
  const getNextMondayMidnight = () => {
    const now = new Date()
    const nextMonday = new Date(now)
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7))
    nextMonday.setHours(0, 0, 0, 0)
    return nextMonday
  }

  const updateCountdown = () => {
    const now = new Date()
    const nextMonday = getNextMondayMidnight()
    const diff = nextMonday.getTime() - now.getTime()
    
    // Update date range text and next update text
    const { lastMonday, thisMonday } = getMondayToMondayDates()
    const formatDate = (date: Date) => {
      const month = date.toLocaleDateString('en-US', { month: 'short' })
      const day = date.getDate()
      return `${month} ${day}`
    }
    setDateRangeText(`${formatDate(lastMonday)} - ${formatDate(thisMonday)}`)
    setNextUpdateText(`Next Update: ${formatDate(nextMonday)}`)
    
    // Check if it's Monday after midnight - reset the viewed state, completed items, and acknowledged alerts
    if (now.getDay() === 1 && now.getHours() === 0 && now.getMinutes() < 5) {
      if (selectedBrandId) {
        localStorage.removeItem(`recommendationsViewed_${selectedBrandId}`)
      }
      if (selectedBrandId) {
        localStorage.removeItem(`completedItems_${selectedBrandId}`)
      }
      if (selectedBrandId) {
        localStorage.removeItem(`acknowledgedAlerts_${selectedBrandId}`)
      }
      setRecommendationsViewed(false)
      // Don't clear completed items on countdown - only clear on "Update Recommendations" click
      // Alerts will be refreshed with acknowledged: false on next load
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    setTimeUntilRefresh(`${days}d ${hours}h ${minutes}m`)
  }

  // Load viewed state and completed items from localStorage
  useEffect(() => {
    if (!selectedBrandId) return
    const viewed = localStorage.getItem(`recommendationsViewed_${selectedBrandId}`)
    if (viewed === 'true') {
      setRecommendationsViewed(true)
    } else {
      setRecommendationsViewed(false)
    }
    
    const completed = localStorage.getItem(`completedItems_${selectedBrandId}`)
    console.log('📋 Loading completed items from localStorage:', completed)
    if (completed) {
      try {
        const completedArray = JSON.parse(completed)
        console.log('📋 Parsed completed items:', completedArray)
        setCompletedItems(new Set(completedArray))
      } catch (e) {
        console.error('Error parsing completedItems:', e)
      }
    } else {
      console.log('📋 No completed items found in localStorage')
      setCompletedItems(new Set())
    }
  }, [selectedBrandId])

  // Countdown timer
  useEffect(() => {
    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  // Data Loading - ONLY reload when brand changes on initial load
  // Data refreshes ONLY when "Update Recommendations" button is clicked (available Monday 12 AM)
  useEffect(() => {
    if (selectedBrandId && initialDataLoad) {
      console.log('🔄 Initial brand load, loading data for brand:', selectedBrandId)
      loadDashboardData()
    }
  }, [selectedBrandId])

  // Reload data when platform filter changes (for viewing, not regenerating recommendations)
  useEffect(() => {
    if (selectedBrandId && !initialDataLoad) {
      console.log('🔄 Platform filter changed, reloading data for:', selectedPlatforms)
      // Reload metrics, trends, alerts, budget, audience - but NOT recommendations (those stay cached)
      loadKPIMetrics()
      loadTrends()
      loadAlerts()
      loadBudgetAllocations()
      loadAudienceExpansions()
    }
  }, [selectedPlatforms])

  // Secret keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      // Ctrl+Shift+U to unlock Update Recommendations button
      if (e.ctrlKey && e.shiftKey && e.key === 'U') {
        e.preventDefault()
        if (selectedBrandId) {
          localStorage.removeItem(`recommendationsViewed_${selectedBrandId}`)
          setRecommendationsViewed(false)
          alert('Update Recommendations button unlocked!')
        }
        return
      }
      
      // Ctrl+Shift+R to reset recommendations
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        if (!selectedBrandId) {
          alert('No brand selected')
      return
    }

        const confirm = window.confirm('Reset all AI recommendations for this brand? This will generate fresh recommendations on next load.')
        if (!confirm) return

        try {
          const response = await fetch(
            `/api/marketing-assistant/recommendations?brandId=${selectedBrandId}&secret=reset-ai-recs`,
            { method: 'DELETE' }
          )

          if (response.ok) {
            const data = await response.json()
            alert(data.message || 'Recommendations reset successfully!')
            // Reload recommendations
            await loadOptimizationRecommendations()
          } else {
            const error = await response.json()
            alert(`Failed to reset: ${error.error}`)
          }
        } catch (error) {
          console.error('Error resetting recommendations:', error)
          alert('Failed to reset recommendations')
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedBrandId])

  const loadDashboardData = async (forceRefresh = false) => {
    if (!selectedBrandId) return
    
    console.log('🔄 loadDashboardData called, forceRefresh:', forceRefresh)
    
      // If force refresh, clear ALL state first
      if (forceRefresh) {
        console.log('🧹 FORCE REFRESH - Clearing all React state')
        setOptimizationCards([])
        setAlerts([])
        setBudgetAllocations([])
        setAudienceExpansions([])
        setKpiMetrics(null)
        setTrends(null)
      }
    
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
    console.log('✅ All data loaded successfully')
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error)
    } finally {
      if (initialDataLoad) {
        setInitialDataLoad(false)
        setLoading(false)
        setIsLoadingPage(false)
      } else {
        setIsRefreshingData(false)
      }
    }
  }

  const loadKPIMetrics = async () => {
    if (!selectedBrandId) return

    try {
      // Backend always uses last 7 days - pass platform and status filters
      const response = await fetch(`/api/marketing-assistant/metrics?brandId=${selectedBrandId}&platforms=${selectedPlatforms.join(',')}`)
      
      if (response.ok) {
        const data = await response.json()
        setKpiMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Error loading KPI metrics:', error)
    }
  }

  const loadActionKPIs = async () => {
    if (!selectedBrandId) return

    try {
      console.log('🎯 Loading Action KPIs for brand:', selectedBrandId, 'platforms:', selectedPlatforms)
      const timestamp = Date.now()
      const response = await fetch(`/api/marketing-assistant/action-kpis?brandId=${selectedBrandId}&platforms=${selectedPlatforms.join(',')}&_t=${timestamp}`, {
        cache: 'no-store'
      })
      
      console.log('🎯 Action KPIs response status:', response.status)
            
            if (response.ok) {
              const data = await response.json()
        console.log('🎯 Action KPIs data received:', data)
        setActionKPIs(data.actionKPIs)
      } else {
        const errorText = await response.text()
        console.error('🎯 Action KPIs error response:', errorText)
            }
          } catch (error) {
      console.error('Error loading Action KPIs:', error)
    }
  }

  const loadOptimizationRecommendations = async () => {
    if (!selectedBrandId) return

    try {
      console.log('🤖 Loading AI recommendations for brand:', selectedBrandId)
      const timestamp = Date.now()
      // Backend always uses last 7 days - pass platform and status filters
      const response = await fetch(`/api/marketing-assistant/recommendations?brandId=${selectedBrandId}&platforms=${selectedPlatforms.join(',')}&_t=${timestamp}`, {
        cache: 'no-store'
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('🤖 AI recommendations received:', data.recommendations?.length, 'recommendations')
        console.log('🤖 Sample recommendation IDs:', data.recommendations?.slice(0, 3).map((r: any) => r.id))
        setOptimizationCards(data.recommendations)
      } else {
        console.error('🤖 AI recommendations error:', response.status)
            }
          } catch (error) {
      console.error('Error loading optimization recommendations:', error)
    }
  }

  const loadBudgetAllocations = async () => {
    if (!selectedBrandId) return
    
    try {
      // Backend always uses last 7 days - pass platform and status filters
      const timestamp = Date.now()
      const response = await fetch(`/api/marketing-assistant/budget-allocation?brandId=${selectedBrandId}&platforms=${selectedPlatforms.join(',')}&_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
            if (response.ok) {
              const data = await response.json()
        console.log('[Budget Allocations] Received data:', data)
        console.log('[Budget Allocations] Setting allocations:', data.allocations || [])
        if (data.allocations && data.allocations.length > 0) {
          console.log('💰 FRONTEND RECEIVED BUDGET:', data.allocations[0].currentBudget, 'for campaign:', data.allocations[0].campaignName)
        }
        setBudgetAllocations(data.allocations || [])
      } else {
        console.error('[Budget Allocations] Response not OK:', response.status, response.statusText)
                  }
                } catch (error) {
      console.error('Error loading budget allocations:', error)
      setBudgetAllocations([])
    }
  }

  const loadAudienceExpansions = async () => {
    if (!selectedBrandId) return
    
    try {
      const response = await fetch(`/api/marketing-assistant/audience-expansion?brandId=${selectedBrandId}&platforms=${selectedPlatforms.join(',')}`)
      if (response.ok) {
        const data = await response.json()
        console.log('[Audience Expansion] Received data:', data)
        console.log('[Audience Expansion] Setting opportunities:', data.opportunities || [])
        setAudienceExpansions(data.opportunities || [])
      } else {
        console.error('[Audience Expansion] Response not OK:', response.status, response.statusText)
        }
      } catch (error) {
      console.error('Error loading audience expansions:', error)
      setAudienceExpansions([])
    }
  }

  const loadAlerts = async () => {
    if (!selectedBrandId) return

    try {
      const timestamp = Date.now()
      console.log('🚨 Loading alerts for platforms:', selectedPlatforms)
      // Get both current metrics and trends for comparison (both use last 7 days) - pass filters
      const [metricsResponse, trendsResponse] = await Promise.all([
        fetch(`/api/marketing-assistant/metrics?brandId=${selectedBrandId}&platforms=${selectedPlatforms.join(',')}&_t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/marketing-assistant/trends?brandId=${selectedBrandId}&days=7&platforms=${selectedPlatforms.join(',')}&_t=${timestamp}`, { cache: 'no-store' })
      ])
      
      if (metricsResponse.ok && trendsResponse.ok) {
        const metricsData = await metricsResponse.json()
        const trendsData = await trendsResponse.json()
        const metrics = metricsData.metrics
        const trends = trendsData.trends
        const generatedAlerts: AlertItem[] = []

        // Only generate alerts if there's actual spend (i.e., we have data)
        const hasData = metrics && metrics.spend > 0

        if (hasData) {
          // Low performance alerts
          if (metrics.ctr < 2.0) {
            generatedAlerts.push({
              id: 'low-engagement',
              type: 'warning',
              title: 'Low Click-Through Rate',
              description: `CTR of ${metrics.ctr.toFixed(2)}% is below 2% benchmark - creative refresh may improve performance`,
              timestamp: new Date(),
              acknowledged: false,
              platform: 'all'
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
              acknowledged: false,
              platform: 'all'
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
              acknowledged: false,
              platform: 'all'
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
              acknowledged: false,
              platform: 'all'
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
            acknowledged: false,
            platform: 'all'
          })
        }

        if (trends?.roas && trends.roas.change < -20 && trends.roas.current < 2.5) {
          generatedAlerts.push({
            id: 'roas-dropping',
            type: 'error',
            title: 'ROAS Declining',
            description: `ROAS dropped ${Math.abs(trends.roas.change)}% to ${trends.roas.current.toFixed(2)}x - immediate optimization needed`,
            timestamp: new Date(),
            acknowledged: false,
            platform: 'all'
          })
        }

        if (trends?.revenue && trends.revenue.change < -15 && trends.revenue.current > 1000) {
          generatedAlerts.push({
            id: 'revenue-drop',
            type: 'warning',
            title: 'Revenue Decreasing',
            description: `Revenue down ${Math.abs(trends.revenue.change)}% to $${trends.revenue.current.toLocaleString()} - investigate campaign performance`,
            timestamp: new Date(),
            acknowledged: false,
            platform: 'all'
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
            acknowledged: false,
            platform: 'all'
          })
        }

        if (metrics.cpc > 3.0 && metrics.clicks > 50) {
          generatedAlerts.push({
            id: 'high-cpc-2',
            type: 'error',
            title: 'High Cost Per Click',
            description: `CPC of $${metrics.cpc.toFixed(2)} is inefficient - optimize targeting or pause underperforming ads`,
            timestamp: new Date(),
            acknowledged: false,
            platform: 'all'
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
            acknowledged: false,
            platform: 'all'
          })
        }

        // Load acknowledged alerts from localStorage and apply them
        const acknowledgedIds = JSON.parse(localStorage.getItem(`acknowledgedAlerts_${selectedBrandId}`) || '[]')
        const alertsWithAcknowledged = generatedAlerts.map(alert => ({
          ...alert,
          acknowledged: acknowledgedIds.includes(alert.id)
        }))
        
        console.log('🚨 Generated alerts:', alertsWithAcknowledged.length, 'total,', alertsWithAcknowledged.filter(a => !a.acknowledged).length, 'unread')
        setAlerts(alertsWithAcknowledged)
      } else {
          console.log('🚨 No data - skipping alert generation')
        }
      } catch (error) {
      console.error('Error loading alerts:', error)
      setAlerts([])
    }
  }


  const dismissAlert = (alertId: string) => {
    setAlerts(prevAlerts => {
      const updated = prevAlerts.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true } 
          : alert
      )
      // Save acknowledged alerts to localStorage
      const acknowledged = updated.filter(a => a.acknowledged).map(a => a.id)
      if (selectedBrandId) {
        localStorage.setItem(`acknowledgedAlerts_${selectedBrandId}`, JSON.stringify(acknowledged))
      }
      return updated
    })
  }

  const handleMarkAsDone = async (cardId: string, actionId: string) => {
    try {
      const itemId = `opt-${cardId}`
      const newCompleted = new Set(completedItems).add(itemId)
      console.log('✅ Marking as done:', itemId)
      console.log('✅ New completed items:', [...newCompleted])
      setCompletedItems(newCompleted)
      if (selectedBrandId) {
        const storageKey = `completedItems_${selectedBrandId}`
        const storageValue = JSON.stringify([...newCompleted])
        localStorage.setItem(storageKey, storageValue)
        console.log('✅ Saved to localStorage:', storageKey, '=', storageValue)
      }
      
      const card = optimizationCards.find(c => c.id === cardId)
      if (!card) return

      // Track performance impact
      try {
        const response = await fetch('/api/marketing-assistant/recommendation-performance', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recommendationId: cardId,
            brandId: selectedBrandId,
            campaignId: card.campaignId
          })
        })
        if (response.ok) {
          const result = await response.json()
          console.log(`📊 Performance tracking initiated for ${cardId}:`, result.outcome)
        }
      } catch (err) {
        console.error('Error tracking performance:', err)
      }

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
        // Keep the item visible - just marked as completed in state
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
      const newCompleted = new Set(completedItems).add(`budget-${allocationId}`)
      setCompletedItems(newCompleted)
      if (selectedBrandId) {
        localStorage.setItem(`completedItems_${selectedBrandId}`, JSON.stringify([...newCompleted]))
      }
    } catch (error) {
      console.error('Error marking budget allocation as done:', error)
    }
  }

  const handleMarkAudienceAsDone = async (expansionId: string) => {
    try {
      const newCompleted = new Set(completedItems).add(`audience-${expansionId}`)
      setCompletedItems(newCompleted)
      if (selectedBrandId) {
        localStorage.setItem(`completedItems_${selectedBrandId}`, JSON.stringify([...newCompleted]))
      }
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
      console.log('📊 Loading trends for platforms:', selectedPlatforms)
      // Backend always uses last 7 days - pass platform and status filters
      const response = await fetch(`/api/marketing-assistant/trends?brandId=${selectedBrandId}&days=7&platforms=${selectedPlatforms.join(',')}`)
      
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

  if (isLoadingPage || loading) {
    return (
      <div className="w-full min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden py-8 animate-in fade-in duration-300">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        <div className="relative z-10 text-center max-w-lg mx-auto px-6">
          {/* Main loading icon */}
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-[#FF2A2A] animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
              {agencySettings?.agency_logo_url && (
                <img 
                  src={agencySettings.agency_logo_url} 
                  alt={`${agencySettings?.agency_name || 'Agency'} Logo`} 
                  className="w-12 h-12 object-contain rounded" 
                />
              )}
            </div>
          </div>
          
          {/* Loading title */}
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Marketing Assistant
          </h1>
          
          {/* Dynamic loading phase */}
          <p className="text-xl text-gray-300 mb-6 font-medium min-h-[28px]">
            Preparing AI insights
          </p>
          
          {/* Subtle loading tip */}
          <div className="mt-8 text-xs text-gray-500 italic">
            Analyzing your campaigns and generating recommendations...
          </div>
        </div>
      </div>
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
      
       <div className="w-full px-2 sm:px-4 lg:px-6 py-4 overflow-x-hidden">
         <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 lg:gap-4 max-w-[1920px] mx-auto">
           
            {/* Left Rail */}
           <div className="col-span-1 xl:col-span-3 flex flex-col gap-4 min-w-0">
            
            {/* Scope & Filters */}
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] flex-shrink-0">
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                flex items-center justify-center border border-white/10">
                    <Filter className="w-5 h-5 text-white" />
          </div>
                  <div className="min-w-0 overflow-hidden">
                    <h3 className="text-base lg:text-lg font-bold text-white truncate">Scope & Filters</h3>
                    <p className="text-gray-400 text-xs lg:text-sm truncate">Configure analysis parameters</p>
        </div>
      </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="p-3 bg-[#222] border border-[#333] rounded-lg">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Calendar className="h-4 w-4 text-[#FF2A2A] flex-shrink-0" />
                      <span className="text-gray-400 text-sm truncate">Performance Window</span>
        </div>
                    <Badge className="text-xs bg-[#FF2A2A] text-black border-[#FF2A2A] flex-shrink-0 font-semibold">Fixed</Badge>
      </div>
                  <div className="text-white font-semibold mb-2">{dateRangeText || 'Loading...'}</div>
                  <p className="text-xs text-gray-500 mb-2">{nextUpdateText || 'Loading...'}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHowItWorks(true)}
                    className="w-full text-xs h-7 bg-white/10 hover:bg-white/20 text-white border border-white/10"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    How It Works
                  </Button>
                  
                  {/* Update Recommendations Button - Shows countdown after first click */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      console.log('🔥 UPDATE RECOMMENDATIONS CLICKED')
                      setIsRefreshingData(true)
                      
                      // Clear ALL localStorage for this brand
                      if (selectedBrandId) {
                        console.log('🧹 Clearing localStorage')
                        localStorage.removeItem(`recommendationsViewed_${selectedBrandId}`)
                        localStorage.removeItem(`completedItems_${selectedBrandId}`)
                        localStorage.removeItem(`acknowledgedAlerts_${selectedBrandId}`)
                      }
                      
                      // Delete AI recommendations from database
                      console.log('🗑️ Deleting AI recommendations from database')
                      await fetch(`/api/marketing-assistant/recommendations?brandId=${selectedBrandId}&secret=reset-ai-recs`, {
                        method: 'DELETE'
                      })
                      
                      // Clear local state including alerts AND save to localStorage
                      setRecommendationsViewed(true) // Mark as viewed so countdown shows
                      if (selectedBrandId) {
                        localStorage.setItem(`recommendationsViewed_${selectedBrandId}`, 'true')
                      }
                      setCompletedItems(new Set())
                      setAlerts(alerts.map(a => ({ ...a, acknowledged: false })))
                      
                      // Reload ALL widgets with FORCE REFRESH
                      console.log('🔄 Calling loadDashboardData with forceRefresh=true')
                      await loadDashboardData(true)
                      
                      setIsRefreshingData(false)
                      console.log('✅ UPDATE COMPLETE')
                    }}
                    className="w-full text-xs h-7 bg-[#FF2A2A] hover:bg-[#FF2A2A]/80 text-black border-[#FF2A2A] font-medium"
                    disabled={isRefreshingData || recommendationsViewed}
                  >
                    {isRefreshingData ? 'Updating...' : recommendationsViewed ? `Next update: ${timeUntilRefresh}` : 'Update Recommendations'}
                  </Button>
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

          
              </CardContent>
            </Card>

            {/* Campaign Scaling Tools */}
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] flex flex-col flex-1 min-h-[490px] max-h-[490px]">
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                flex items-center justify-center border border-white/10">
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                  <div className="min-w-0 overflow-hidden">
                    <h3 className="text-base lg:text-lg font-bold text-white truncate">Campaign Scaling</h3>
                    <p className="text-gray-400 text-xs lg:text-sm truncate">Budget optimization & audience expansion</p>
        </div>
      </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden min-h-0">
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

                  <TabsContent value="budget" className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading && (
                      <div className="text-center py-6 text-gray-400">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-600 border-t-white mx-auto mb-2"></div>
                        <p className="text-sm">Loading budget data...</p>
                      </div>
                    )}
                    {!loading && filteredBudgetAllocations.length > 0 && filteredBudgetAllocations.map(allocation => (
                      <div key={allocation.id} className="p-3 bg-[#1A1A1A] border border-[#333] rounded-lg min-w-0">
                        <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="flex-shrink-0 w-5 h-5 relative">
                              <Image 
                                src="/meta-icon.png" 
                                alt="Meta" 
                                width={20} 
                                height={20}
                                className="rounded"
                              />
                            </div>
                            <h4 className="text-white font-medium text-sm truncate min-w-0">{allocation.campaignName}</h4>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="flex-shrink-0 text-xs bg-gray-500 text-white border-gray-500">
                                  {allocation.confidence}%
                              </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Confidence Score</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                            </div>
                        <div className="grid grid-cols-2 gap-2 text-xs min-w-0">
                          <div className="min-w-0">
                            <p className="text-gray-400 truncate">Current: ${allocation.currentBudget}/day {console.log('🎨 RENDERING BUDGET:', allocation.currentBudget)}</p>
                            <p className="text-gray-400 truncate">ROAS: {allocation.currentRoas}x</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-white truncate">Suggested: ${allocation.suggestedBudget}/day</p>
                            <p className="text-white truncate">Est. ROAS: {allocation.projectedRoas}x</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2 min-w-0">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs flex-1 min-w-0"
                            onClick={() => handleExplainBudgetAllocation(allocation.id)}
                          >
                            <Brain className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">Explain</span>
                          </Button>
                          {completedItems.has(`budget-${allocation.id}`) ? (
                            <div className="flex-1 min-w-0 px-3 py-1.5 bg-white/5 border border-white/10 rounded-md flex items-center justify-center gap-1.5">
                              <CheckCircle className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <div className="text-xs text-gray-400 min-w-0">
                                <div className="truncate">Completed</div>
                                <div className="text-xs truncate">{timeUntilRefresh}</div>
                              </div>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              className="bg-white/10 hover:bg-white/20 text-white text-xs flex-1 min-w-0"
                              onClick={() => handleMarkBudgetAsDone(allocation.id)}
                            >
                              <span className="truncate">Mark as Done</span>
                            </Button>
                          )}
                          </div>
                        </div>
                      ))}
                    {!loading && filteredBudgetAllocations.length === 0 && (
                      <div className="text-center py-6 text-gray-400">
                        <PieChart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No budget optimization opportunities</p>
                        <p className="text-xs text-gray-500 mt-1">Check console for API response data</p>
                    </div>
                    )}
                  </TabsContent>

                  <TabsContent value="audience" className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading && (
                      <div className="text-center py-6 text-gray-400">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-600 border-t-white mx-auto mb-2"></div>
                        <p className="text-sm">Loading audience data...</p>
                            </div>
                    )}
                    {!loading && filteredAudienceExpansions.length > 0 && filteredAudienceExpansions.map(expansion => (
                      <div key={expansion.id} className="p-3 bg-[#1A1A1A] border border-[#333] rounded-lg min-w-0">
                        <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="flex-shrink-0 w-5 h-5 relative">
                              <Image 
                                src="/meta-icon.png" 
                                alt="Meta" 
                                width={20} 
                                height={20}
                                className="rounded"
                              />
                            </div>
                            {expansion.type === 'lookalike' && <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                            {expansion.type === 'geographic' && <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                            {expansion.type === 'interest' && <Target className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                            {expansion.type === 'demographic' && <BarChart3 className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                            <h4 className="text-white font-medium text-sm truncate min-w-0">{expansion.title}</h4>
                            </div>
                          <Badge className="flex-shrink-0 text-xs bg-gray-500 text-white border-gray-500">{expansion.confidence}%</Badge>
                        </div>
                        <p className="text-gray-400 text-xs mb-2 leading-relaxed">{expansion.description}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs min-w-0">
                          <div className="min-w-0">
                            <p className="text-gray-400 truncate">Current: {expansion.currentReach.toLocaleString()}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-white truncate">+{(expansion.projectedReach - expansion.currentReach).toLocaleString()} reach</p>
                          </div>
                        </div>
                        <p className="text-blue-400 text-xs mt-1 truncate">Est. CPA: ${expansion.estimatedCpa}</p>
                        <div className="flex gap-2 mt-2 min-w-0">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs flex-1 min-w-0"
                            onClick={() => handleExplainAudienceExpansion(expansion.id)}
                          >
                            <Brain className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">Explain</span>
                          </Button>
                          {completedItems.has(`audience-${expansion.id}`) ? (
                            <div className="flex-1 min-w-0 px-3 py-1.5 bg-white/5 border border-white/10 rounded-md flex items-center justify-center gap-1.5">
                              <CheckCircle className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <div className="text-xs text-gray-400 min-w-0">
                                <div className="truncate">Completed</div>
                                <div className="text-xs truncate">{timeUntilRefresh}</div>
                            </div>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              className="bg-white/10 hover:bg-white/20 text-white text-xs flex-1 min-w-0"
                              onClick={() => handleMarkAudienceAsDone(expansion.id)}
                            >
                              <span className="truncate">Mark as Done</span>
                            </Button>
                          )}
                          </div>
                        </div>
                      ))}
                    {!loading && filteredAudienceExpansions.length === 0 && (
                      <div className="text-center py-6 text-gray-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No audience expansion opportunities</p>
                        <p className="text-xs text-gray-500 mt-1">Check console for API response data</p>
                    </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
                </div>

            {/* Middle Column - Main Work Area */}
           <div className="col-span-1 xl:col-span-6 flex flex-col gap-4 min-w-0">
            
            {/* Optimization Feed - Expanded without top KPIs */}
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] flex flex-col flex-1 min-h-[890px] max-h-[890px]">
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                  flex items-center justify-center border border-white/10 flex-shrink-0">
                      <Brain className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                          </div>
                    <div className="min-w-0 overflow-hidden flex-1">
                      <h2 className="text-lg lg:text-xl font-bold text-white truncate">AI Optimization Feed</h2>
                      <p className="text-gray-400 text-xs hidden lg:block truncate">Prioritized recommendations based on performance analysis</p>
                    </div>
                  </div>
                        </div>
              </CardHeader>
              <CardContent className="p-6 flex-1 overflow-y-auto min-h-0">
                <div className="space-y-3">
                  {filteredOptimizations.map(card => (
                    <div key={card.id} className="bg-[#1A1A1A] border border-[#333] rounded-lg overflow-hidden">
                      {/* Header with Priority Badge */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#252525] to-[#1A1A1A] border-b border-[#333] gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 flex-shrink-0">
                            <Target className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="min-w-0 overflow-hidden flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex-shrink-0 w-4 h-4 relative">
                                <Image 
                                  src="/meta-icon.png" 
                                  alt="Meta" 
                                  width={16} 
                                  height={16}
                                  className="rounded"
                                />
                              </div>
                              <h3 className="text-white font-medium text-sm truncate">{card.title}</h3>
                            </div>
                            <p className="text-gray-400 text-xs truncate font-medium">{card.projectedImpact.confidence}% confidence</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            card.priority === 'high' ? 'bg-[#FF2A2A]' :
                            card.priority === 'medium' ? 'bg-[#FF2A2A]' : 'bg-[#FF2A2A]'
                          }`}></div>
                          <span className="text-xs text-[#FF2A2A] uppercase tracking-wide font-medium">{card.priority}</span>
                        </div>
                </div>

                      {/* Content */}
                      <div className="p-3 min-w-0">
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
                            <p className="text-white text-sm font-medium">{card.recommendedValue}</p>
                          </div>
                        </div>

                        {/* Actions */}
                <div className="flex gap-2 min-w-0">
                  <Button
                            size="sm" 
                            variant="outline" 
                            className="border-[#333] text-gray-300 text-xs flex-1 min-w-0"
                            onClick={() => handleExplainRecommendation(card.id)}
                          >
                            <Brain className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">Explain</span>
                  </Button>
                  {completedItems.has(`opt-${card.id}`) ? (
                    <div className="flex-1 min-w-0 px-3 py-1.5 bg-white/5 border border-white/10 rounded-md flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <div className="text-xs text-gray-400 min-w-0">
                        <div className="truncate">Completed</div>
                        <div className="text-xs truncate">{timeUntilRefresh}</div>
                          </div>
                    </div>
                  ) : (
                          <Button
                            size="sm"
                              className="bg-white/10 hover:bg-white/20 text-white text-xs flex-1 min-w-0"
                              onClick={() => handleMarkAsDone(card.id, card.actions[0]?.id)}
                          >
                              <span className="truncate">Mark as Done</span>
                          </Button>
                  )}
                </div>
          </div>
                        </div>
                      ))}
                  
                  {filteredOptimizations.length === 0 && (
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
           <div className="col-span-1 xl:col-span-3 flex flex-col gap-4 min-w-0">
            
            {/* Trends */}
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] flex-shrink-0">
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                flex items-center justify-center border border-white/10">
                    <BarChart3 className="w-5 h-5 text-white" />
                </div>
                  <div className="min-w-0 overflow-hidden">
                    <h3 className="text-base lg:text-lg font-bold text-white truncate">Performance Trends</h3>
                    <p className="text-gray-400 text-xs lg:text-sm truncate">7-day overview</p>
              </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {trends && (
                    <>
                     <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                       <div className="flex items-center gap-3 min-w-0 flex-1">
                         {/* Platform icons on the left */}
                         <div className="flex gap-1.5 flex-shrink-0">
                           {selectedPlatforms.includes('meta') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors">
                                 <Image src="/meta-icon.png" alt="Meta" width={18} height={18} className="rounded" />
                               </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">Meta: ${trends.spend.current.toLocaleString()}</div>
                                 <div className="text-gray-400">100% of total</div>
                               </div>
                             </div>
                           )}
                           {selectedPlatforms.includes('google') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors opacity-40">
                                 <img src="https://i.imgur.com/TavV4UJ.png" alt="Google" width={18} height={18} className="rounded" />
                               </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">Google: $0</div>
                                 <div className="text-gray-400">No data</div>
                               </div>
                             </div>
                           )}
                           {selectedPlatforms.includes('tiktok') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors opacity-40">
                                 <img src="https://i.imgur.com/AXHa9UT.png" alt="TikTok" width={18} height={18} className="rounded" />
                               </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">TikTok: $0</div>
                                 <div className="text-gray-400">No data</div>
                               </div>
                             </div>
                           )}
                         </div>
                         <div className="min-w-0">
                           <p className="text-gray-400 text-sm mb-0.5">Spend</p>
                           <p className="text-white font-semibold text-base">${trends.spend.current.toLocaleString()}</p>
                         </div>
                       </div>
                       <div 
                         className={`flex items-center gap-1 cursor-help relative group ${trends.spend.direction === 'up' ? 'text-[#10B981]' : 'text-[#FF2A2A]'}`}
                         title={`Previous: $${trends.spend.previous.toLocaleString()} → Current: $${trends.spend.current.toLocaleString()}`}
                       >
                         {trends.spend.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                         <span className="text-sm font-medium">{trends.spend.change > 0 ? '+' : ''}{trends.spend.change}%</span>
                         <div className="absolute bottom-full mb-2 right-0 hidden group-hover:block bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-xs text-gray-300 whitespace-nowrap z-10 shadow-lg">
                           <div className="text-gray-400 mb-1">Comparing:</div>
                           <div>Previous: <span className="text-white font-medium">${trends.spend.previous.toLocaleString()}</span></div>
                           <div>Current: <span className="text-white font-medium">${trends.spend.current.toLocaleString()}</span></div>
                </div>
          </div>
        </div>

                     <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                       <div className="flex items-center gap-3 min-w-0 flex-1">
                         {/* Platform icons on the left */}
                         <div className="flex gap-1.5 flex-shrink-0">
                           {selectedPlatforms.includes('meta') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors">
                                 <Image src="/meta-icon.png" alt="Meta" width={18} height={18} className="rounded" />
                               </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">Meta: ${trends.revenue.current.toLocaleString()}</div>
                                 <div className="text-gray-400">100% of total</div>
                               </div>
                             </div>
                           )}
                           {selectedPlatforms.includes('google') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors opacity-40">
                                 <img src="https://i.imgur.com/TavV4UJ.png" alt="Google" width={18} height={18} className="rounded" />
                               </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">Google: $0</div>
                                 <div className="text-gray-400">No data</div>
                               </div>
                             </div>
                           )}
                           {selectedPlatforms.includes('tiktok') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors opacity-40">
                                 <img src="https://i.imgur.com/AXHa9UT.png" alt="TikTok" width={18} height={18} className="rounded" />
                               </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">TikTok: $0</div>
                                 <div className="text-gray-400">No data</div>
                               </div>
                             </div>
                           )}
                         </div>
                         <div className="min-w-0">
                           <p className="text-gray-400 text-sm mb-0.5">Revenue</p>
                           <p className="text-white font-semibold text-base">${trends.revenue.current.toLocaleString()}</p>
                         </div>
                       </div>
                       <div 
                         className={`flex items-center gap-1 cursor-help relative group ${trends.revenue.direction === 'up' ? 'text-[#10B981]' : 'text-[#FF2A2A]'}`}
                         title={`Previous: $${trends.revenue.previous.toLocaleString()} → Current: $${trends.revenue.current.toLocaleString()}`}
                       >
                         {trends.revenue.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                         <span className="text-sm font-medium">{trends.revenue.change > 0 ? '+' : ''}{trends.revenue.change}%</span>
                         <div className="absolute bottom-full mb-2 right-0 hidden group-hover:block bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-xs text-gray-300 whitespace-nowrap z-10 shadow-lg">
                           <div className="text-gray-400 mb-1">Comparing:</div>
                           <div>Previous: <span className="text-white font-medium">${trends.revenue.previous.toLocaleString()}</span></div>
                           <div>Current: <span className="text-white font-medium">${trends.revenue.current.toLocaleString()}</span></div>
                </div>
          </div>
        </div>

                     <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                       <div className="flex items-center gap-3 min-w-0 flex-1">
                         {/* Platform icons on the left */}
                         <div className="flex gap-1.5 flex-shrink-0">
                           {selectedPlatforms.includes('meta') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors">
                                 <Image src="/meta-icon.png" alt="Meta" width={18} height={18} className="rounded" />
                </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">Meta: {trends.roas.current.toFixed(2)}x</div>
                                 <div className="text-gray-400">100% of total</div>
              </div>
                </div>
                           )}
                           {selectedPlatforms.includes('google') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors opacity-40">
                                 <img src="https://i.imgur.com/TavV4UJ.png" alt="Google" width={18} height={18} className="rounded" />
              </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">Google: 0.00x</div>
                                 <div className="text-gray-400">No data</div>
                </div>
              </div>
                           )}
                           {selectedPlatforms.includes('tiktok') && (
                             <div className="relative group/platform">
                               <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors opacity-40">
                                 <img src="https://i.imgur.com/AXHa9UT.png" alt="TikTok" width={18} height={18} className="rounded" />
                </div>
                               <div className="absolute top-full left-0 mt-2 hidden group-hover/platform:block bg-[#0a0a0a] border border-[#555] rounded px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap z-[100] shadow-xl">
                                 <div className="text-white font-medium">TikTok: 0.00x</div>
                                 <div className="text-gray-400">No data</div>
              </div>
                </div>
                           )}
              </div>
                         <div className="min-w-0">
                           <p className="text-gray-400 text-sm mb-0.5">ROAS</p>
                           <p className="text-white font-semibold text-base">{trends.roas.current.toFixed(2)}x</p>
                </div>
                </div>
                       <div 
                         className={`flex items-center gap-1 cursor-help relative group ${trends.roas.direction === 'up' ? 'text-[#10B981]' : 'text-[#FF2A2A]'}`}
                         title={`Previous: ${trends.roas.previous.toFixed(2)}x → Current: ${trends.roas.current.toFixed(2)}x`}
                       >
                         {trends.roas.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                         <span className="text-sm font-medium">{trends.roas.change > 0 ? '+' : ''}{trends.roas.change}%</span>
                         <div className="absolute bottom-full mb-2 right-0 hidden group-hover:block bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-xs text-gray-300 whitespace-nowrap z-10 shadow-lg">
                           <div className="text-gray-400 mb-1">Comparing:</div>
                           <div>Previous: <span className="text-white font-medium">{trends.roas.previous.toFixed(2)}x</span></div>
                           <div>Current: <span className="text-white font-medium">{trends.roas.current.toFixed(2)}x</span></div>
              </div>
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
            <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] flex flex-col flex-1 min-h-[502px] max-h-[502px]">
              <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#333] rounded-t-lg flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                                flex items-center justify-center border border-white/10">
                    <AlertTriangle className="w-5 h-5 text-gray-400" />
                        </div>
                  <div className="min-w-0 overflow-hidden">
                    <h3 className="text-base lg:text-lg font-bold text-white truncate">Alerts</h3>
                    <p className="text-gray-400 text-xs lg:text-sm truncate">{alerts.filter(a => !a.acknowledged).length} unread</p>
                        </div>
                      </div>
              </CardHeader>
              <CardContent className="p-4 flex-1 overflow-y-auto min-h-0">
                <div className="space-y-3">
                  {alerts.map(alert => (
                    <div key={alert.id} className={`p-3 bg-[#1A1A1A] border border-[#333] rounded-lg group hover:border-[#444] transition-colors ${alert.acknowledged ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            alert.type === 'error' ? 'bg-[#FF2A2A]' :
                            alert.type === 'warning' ? 'bg-[#FF2A2A]' :
                            'bg-[#FF2A2A]'
                          }`} />
                          <h4 className={`text-white font-medium text-sm ${alert.acknowledged ? 'line-through' : ''}`}>{alert.title}</h4>
                          {alert.platform && (
                            <div className="flex-shrink-0 w-4 h-4 relative">
                              {alert.platform === 'all' ? (
                                <div className="flex gap-0.5">
                                  <Image src="/meta-icon.png" alt="All" width={24} height={24} className="rounded" />
                                </div>
                              ) : (
                        <Image 
                                  src={`/${alert.platform}-icon.png`}
                                  alt={alert.platform}
                          width={16} 
                          height={16} 
                                  className="rounded"
                                />
                              )}
                            </div>
                          )}
                            </div>
                            <Button
                          variant="ghost"
                              size="sm"
                          onClick={() => dismissAlert(alert.id)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                        >
                          <CheckCircle className="h-3 w-3 text-gray-400" />
                            </Button>
                          </div>
                      <p className={`text-gray-400 text-xs mb-2 ${alert.acknowledged ? 'line-through' : ''}`}>{alert.description}</p>
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
                     <p className="text-[#FF2A2A] text-lg font-bold">+${simulationData.simulation?.projectedImpact?.revenue?.toLocaleString() || 0}</p>
                        </div>
                   <div>
                     <p className="text-gray-400 text-xs">Projected ROAS</p>
                     <p className="text-white text-lg font-bold">{simulationData.simulation?.projectedImpact?.roas?.toFixed(2) || 0}x</p>
                        </div>
                   <div>
                     <p className="text-gray-400 text-xs">Confidence Level</p>
                     <p className="text-gray-400 text-lg font-bold">{simulationData.simulation?.projectedImpact?.confidence || 0}%</p>
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
                           <span className="text-[#FF2A2A] mt-1">✓</span>
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
                       <p className={`text-lg font-bold ${outcome.positive ? 'text-[#FF2A2A]' : 'text-[#FF2A2A]'}`}>
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
                        
      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#333] rounded-lg p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">How the Marketing Assistant Works</h3>
                <p className="text-gray-400">Understanding the 7-day recommendation cycle</p>
                        </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHowItWorks(false)}
                className="border-[#333] text-gray-300 hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </Button>
                      </div>

            <div className="space-y-6">
              {/* Overview */}
              <div className="bg-[#1A1A1A] p-5 rounded-lg border border-[#333]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-white" />
                    </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">AI-Powered Weekly Optimization</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      The Marketing Assistant analyzes your campaigns every 7 days, generating intelligent recommendations based on actual performance data. 
                      It then tracks the effectiveness of those recommendations and learns from the results.
                    </p>
            </div>
          </div>
        </div>

              {/* The Cycle */}
              <div className="bg-[#1A1A1A] p-5 rounded-lg border border-[#333]">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  The 7-Day Cycle
                </h4>
                <div className="space-y-4">
                  {/* Week 1 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">1</span>
                    </div>
                      <div className="w-0.5 h-full bg-[#333] mt-2"></div>
                </div>
                    <div className="pb-6">
                      <h5 className="text-white font-medium mb-1">Monday: Fresh Analysis & New Recommendations</h5>
                      <p className="text-gray-400 text-sm mb-2">
                        Every Monday at 12 AM, the system analyzes a <strong className="text-white">Monday-to-Monday weekly window</strong> (last Monday to this Monday):
                      </p>
                      <ul className="space-y-1 text-sm text-gray-400 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Full week of spend, impressions, clicks, conversions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>ROAS performance, CPA trends, CTR changes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Validates if last week's recommendations worked</span>
                        </li>
                      </ul>
                      <div className="mt-3 p-3 bg-[#0f0f0f] rounded border border-[#444]">
                        <p className="text-xs text-gray-300">
                          <strong className="text-white">Result:</strong> Generates new prioritized recommendations based on the full week's data. 
                          Old recommendations expire and are replaced with fresh insights.
                        </p>
                  </div>
                  </div>
                </div>

                  {/* Tuesday-Sunday */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">2</span>
                    </div>
                      <div className="w-0.5 h-full bg-[#333] mt-2"></div>
                </div>
                    <div className="pb-6">
                      <h5 className="text-white font-medium mb-1">Tuesday-Sunday: Review & Apply Changes</h5>
                      <p className="text-gray-400 text-sm mb-2">
                        You review the recommendations and apply changes throughout the week:
                      </p>
                      <ul className="space-y-1 text-sm text-gray-400 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Review AI suggestions for budget, audience, and creative</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Apply changes to your campaigns as you see fit</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Monitor performance with real-time alerts</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Same recommendations stay locked until next Monday</span>
                        </li>
                      </ul>
                      <div className="mt-3 p-3 bg-[#0f0f0f] rounded border border-[#444]">
                        <p className="text-xs text-gray-300">
                          <strong className="text-white">Why weekly?</strong> Changes need time to stabilize. Algorithms need to learn. 
                          Testing changes mid-week would contaminate the data and give false signals.
                        </p>
                  </div>
                  </div>
                </div>

                  {/* Next Monday */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">3</span>
          </div>
        </div>
                    <div>
                      <h5 className="text-white font-medium mb-1">Next Monday: Validation & New Cycle</h5>
                      <p className="text-gray-400 text-sm mb-2">
                        When Monday rolls around again, the system analyzes the <strong className="text-white">new Monday-to-Monday window</strong>:
                      </p>
                      <ul className="space-y-1 text-sm text-gray-400 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span><strong>Validates last week's recommendations:</strong> Did they work?</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Compares <strong>actual ROAS/spend/conversions</strong> to predictions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span><strong>Expires old recommendations</strong> and generates fresh ones</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-300 mt-1">•</span>
                          <span>Adapts strategy based on what worked vs. what didn't</span>
                        </li>
                      </ul>
                      <div className="mt-3 p-3 bg-[#0f0f0f] rounded border border-[#444]">
                        <p className="text-xs text-gray-300">
                          <strong className="text-white">Continuous Learning:</strong> If ROAS improved as predicted ✓, similar recommendations 
                          get higher confidence next week. If not ✗, the system adjusts its approach. The cycle repeats every Monday with 
                          fresh insights based on the most recent full week of data.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* How the AI Learns */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] p-5 rounded-lg border border-emerald-500/30">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-emerald-400" />
                  How the AI Learns from Your Results
                </h4>
                <p className="text-gray-300 text-sm mb-4">
                  The system doesn't just generate recommendations—it tracks their outcomes and adapts its strategy based on what actually works for YOUR campaigns.
                </p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 text-xs font-bold">1</span>
                      </div>
                    <div>
                      <h5 className="text-white font-medium text-sm mb-1">Baseline Capture</h5>
                      <p className="text-gray-400 text-xs">
                        When a recommendation is created, the system captures your campaign's current performance (spend, ROAS, CTR, conversions) as a baseline.
                      </p>
                    </div>
                </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 text-xs font-bold">2</span>
                    </div>
                    <div>
                      <h5 className="text-white font-medium text-sm mb-1">Action Tracking</h5>
                      <p className="text-gray-400 text-xs">
                        When you mark a recommendation as done, the system logs the action and waits 7 days to measure the impact.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 text-xs font-bold">3</span>
                    </div>
                    <div>
                      <h5 className="text-white font-medium text-sm mb-1">Impact Analysis</h5>
                      <p className="text-gray-400 text-xs">
                        After 7 days, it compares the new performance to the baseline: Did ROAS improve? Did CTR increase? Did revenue grow?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 text-xs font-bold">4</span>
                    </div>
                    <div>
                      <h5 className="text-white font-medium text-sm mb-1">Strategy Adaptation</h5>
                      <p className="text-gray-400 text-xs">
                        Future recommendations are weighted based on historical success. If budget scaling worked 5 times but creative refresh failed 3 times, 
                        you'll see more budget recommendations and fewer creative ones—or the creative recommendations will be adjusted.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-emerald-500/10 rounded border border-emerald-500/30">
                  <p className="text-xs text-emerald-200">
                    <strong className="text-emerald-100">Example:</strong> If "increase budget to $50/day" resulted in +35% revenue with stable ROAS, 
                    the system will confidently suggest similar scaling next time. If "creative refresh" didn't improve CTR, it will adjust the threshold 
                    or recommend different creative strategies.
                  </p>
                </div>
              </div>

              {/* Key Benefits */}
              <div className="bg-[#1A1A1A] p-5 rounded-lg border border-[#333]">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gray-400" />
                  Key Benefits
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#0f0f0f] rounded border border-[#444]">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                      <h5 className="text-white font-medium text-sm">No Recommendation Fatigue</h5>
                    </div>
                    <p className="text-gray-400 text-xs">
                      You won't see the same suggestion over and over. Once generated, it stays until resolved.
                    </p>
                        </div>
                  <div className="p-3 bg-[#0f0f0f] rounded border border-[#444]">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <h5 className="text-white font-medium text-sm">Data-Driven Decisions</h5>
                      </div>
                    <p className="text-gray-400 text-xs">
                      All recommendations based on real performance data, not guesses or hunches.
                    </p>
                    </div>
                  <div className="p-3 bg-[#0f0f0f] rounded border border-[#444]">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-4 h-4 text-gray-400" />
                      <h5 className="text-white font-medium text-sm">Continuous Learning</h5>
          </div>
                    <p className="text-gray-400 text-xs">
                      System learns from what worked and what didn't, improving recommendations over time.
                    </p>
        </div>
                  <div className="p-3 bg-[#0f0f0f] rounded border border-[#444]">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-gray-400" />
                      <h5 className="text-white font-medium text-sm">Consistent Cadence</h5>
      </div>
                    <p className="text-gray-400 text-xs">
                      Weekly rhythm keeps you on track without overwhelming you with constant changes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Example Timeline */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] p-5 rounded-lg border border-[#333]">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  Example Timeline
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3 p-2 bg-[#0f0f0f] rounded">
                    <span className="text-gray-500 font-mono text-xs">Sept 29</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-300">System analyzes Sept 22-28 data, generates recommendations</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-[#0f0f0f] rounded">
                    <span className="text-gray-500 font-mono text-xs">Sept 30</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-300">You review and apply: "Increase Budget by 20% for Campaign A"</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-[#0f0f0f] rounded">
                    <span className="text-gray-500 font-mono text-xs">Oct 1-6</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-emerald-400">Testing period - letting campaign stabilize</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-[#0f0f0f] rounded">
                    <span className="text-gray-500 font-mono text-xs">Oct 7</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-white">System checks: ROAS improved 2.1x → 2.8x ✓ Success!</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-[#0f0f0f] rounded">
                    <span className="text-gray-500 font-mono text-xs">Oct 7</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-300">Generates NEW recommendations based on Oct 1-6 performance</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-6 border-t border-[#333] mt-6">
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => setShowHowItWorks(false)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Got It!
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
