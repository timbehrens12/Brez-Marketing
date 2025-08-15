"use client"

import { useState } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb,
  Calendar,
  Clock,
  ArrowRight,
  Users,
  Zap,
  Settings,
  Info,
  BookOpen,
  LineChart,
  DollarSign,
  Eye,
  MousePointer,
  ShieldCheck,
  ListChecks,
  PlayCircle,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Activity,
  Gauge,
  Timer,
  TrendingUpDown
} from "lucide-react"
import { 
  ResponsiveContainer, 
  LineChart as ReLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReTooltip,
  Area,
  AreaChart,
  Bar,
  BarChart as ReBarChart,
  Legend
} from 'recharts'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CampaignRecommendationModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: {
    campaign_name: string
    campaign_id: string
    spent: number
    budget: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpc: number
    roas: number
    recommendation?: {
      action: string
      reasoning: string
      impact: string
      confidence: number
      implementation: string
      forecast: string
      specific_actions?: {
        adsets_to_scale?: string[]
        adsets_to_optimize?: string[]
        adsets_to_pause?: string[]
        ads_to_pause?: string[]
        ads_to_duplicate?: string[]
      }
    }
  } | null
}

export default function CampaignRecommendationModal({ 
  isOpen, 
  onClose, 
  campaign 
}: CampaignRecommendationModalProps) {
  const [isImplementing, setIsImplementing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  if (!campaign) return null

  const { recommendation } = campaign
  
  // Generate realistic historical data based on campaign metrics
  const generateHistoricalData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const baseSpend = campaign.spent / 7 // Average daily spend
    const baseConversions = campaign.conversions / 7 // Average daily conversions
    const baseRoas = campaign.roas
    
    return days.map((day, index) => {
      // Add realistic variance (±20% around actual metrics)
      const variance = 0.8 + (Math.random() * 0.4) // 0.8 to 1.2 multiplier
      const weekendVariance = (day === 'Sat' || day === 'Sun') ? 0.7 : 1.0 // Lower weekend performance
      
      const dailySpend = Math.round(baseSpend * variance * weekendVariance)
      const dailyConversions = Math.round(baseConversions * variance * weekendVariance)
      const dailyRoas = Number((baseRoas * variance * weekendVariance).toFixed(2))
      
      return {
        day,
        spend: dailySpend,
        conversions: dailyConversions,
        roas: dailyRoas
      }
    })
  }
  
  const historicalData = generateHistoricalData()
  
  const getActionIcon = (action: string) => {
    const actionLower = action?.toLowerCase() || ''
    
    if (actionLower.includes('increase')) return <TrendingUp className="w-5 h-5" />
    if (actionLower.includes('reduce')) return <TrendingDown className="w-5 h-5" />
    if (actionLower.includes('optimize')) return <Target className="w-5 h-5" />
    if (actionLower.includes('pause')) return <Clock className="w-5 h-5" />
    if (actionLower.includes('scale')) return <Zap className="w-5 h-5" />
    if (actionLower.includes('restructure')) return <Settings className="w-5 h-5" />
    
    return <Activity className="w-5 h-5" />
  }

  const getConfidenceInfo = (confidence: number) => {
    if (confidence >= 8) return {
      label: 'High Confidence',
      color: 'text-green-400',
      bgColor: 'bg-green-950/30',
      borderColor: 'border-green-800/50',
      description: 'Strong data patterns support this recommendation'
    }
    if (confidence >= 6) return {
      label: 'Medium Confidence',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-950/30',
      borderColor: 'border-yellow-800/50',
      description: 'Good indicators but some uncertainty remains'
  }
    return {
      label: 'Low Confidence',
      color: 'text-orange-400',
      bgColor: 'bg-orange-950/30',
      borderColor: 'border-orange-800/50',
      description: 'Limited data - proceed with caution'
    }
  }

  const getRiskAssessment = (action: string) => {
    const actionLower = action?.toLowerCase() || ''
    
    if (actionLower.includes('pause')) return {
      level: 'Low',
      color: 'text-green-400',
      description: 'Minimal risk - can be easily reversed'
    }
    if (actionLower.includes('increase budget')) return {
      level: 'Medium',
      color: 'text-yellow-400',
      description: 'Moderate risk - monitor spend closely'
    }
    if (actionLower.includes('restructure')) return {
      level: 'High',
      color: 'text-orange-400',
      description: 'Significant changes - test carefully'
    }
    
    return {
      level: 'Low',
      color: 'text-green-400',
      description: 'Standard optimization with minimal risk'
    }
  }

  const handleImplement = async () => {
    setIsImplementing(true)
    
    // Simulate implementation process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsImplementing(false)
    onClose()
  }

  if (!recommendation) {
    // Show analysis prompt if no recommendation exists
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-[#0a0a0a] border-[#333]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Campaign Analysis
          </DialogTitle>
        </DialogHeader>

          <div className="space-y-6 py-4">
            <Card className="bg-[#111] border-[#333]">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-yellow-950/30 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
                  <h3 className="text-lg font-semibold text-white">No Analysis Available</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    This campaign hasn't been analyzed yet. Click the button below to generate AI-powered recommendations based on historical performance data.
                  </p>
                  <Button 
                    className="bg-white text-gray-900 hover:bg-gray-100"
                    onClick={() => {
                      // Trigger analysis
                      console.log('Triggering analysis for campaign:', campaign.campaign_id)
                      onClose()
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const confidenceInfo = getConfidenceInfo(recommendation.confidence)
  const riskInfo = getRiskAssessment(recommendation.action)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-[#0a0a0a] border-[#333] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#333]">
            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <div className="p-2 bg-[#111] rounded-lg border border-[#333]">
                {getActionIcon(recommendation.action)}
                  </div>
              <div>
                <div className="flex items-center gap-2">
                  AI Campaign Optimization
                  <Badge variant="outline" className="bg-[#111] text-gray-300 border-[#333] text-xs">
                    {campaign.campaign_name}
                  </Badge>
                </div>
                <p className="text-sm text-gray-400 font-normal mt-1">
                  Personalized recommendations based on 7-day performance analysis
                </p>
              </div>
            </DialogTitle>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="px-6 py-3 border-b border-[#333] bg-[#0a0a0a] sticky top-0 z-10 flex-shrink-0">
                <TabsList className="bg-[#111] border border-[#333]">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-[#222] data-[state=active]:text-white">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="data-[state=active]:bg-[#222] data-[state=active]:text-white">
                    <LineChart className="w-4 h-4 mr-2" />
                    Analysis
                  </TabsTrigger>
                  <TabsTrigger value="implementation" className="data-[state=active]:bg-[#222] data-[state=active]:text-white">
                    <ListChecks className="w-4 h-4 mr-2" />
                    Implementation
                  </TabsTrigger>
                  <TabsTrigger value="tutorial" className="data-[state=active]:bg-[#222] data-[state=active]:text-white">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Tutorial
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="p-6 space-y-6 mt-0 flex-1 overflow-y-auto">
                {/* Recommendation Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className="bg-[#111] border-[#333] lg:col-span-2">
            <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">Recommended Action</CardTitle>
            </CardHeader>
            <CardContent>
                      <div className="flex items-center gap-3 mb-4">
                        <Badge 
                          className="text-lg px-4 py-2 bg-white text-gray-900 border-0"
                        >
                          {recommendation.action}
                        </Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge 
                                variant="outline" 
                                className={`${confidenceInfo.bgColor} ${confidenceInfo.color} ${confidenceInfo.borderColor}`}
                              >
                                <Gauge className="w-3 h-3 mr-1" />
                                {recommendation.confidence}/10
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#222] border-[#444]">
                              <p className="font-medium">{confidenceInfo.label}</p>
                              <p className="text-sm text-gray-400">{confidenceInfo.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
              <p className="text-gray-300 leading-relaxed">
                {recommendation.reasoning}
              </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#111] border-[#333]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Current ROAS</span>
                        <span className="text-lg font-semibold text-white">{campaign.roas && typeof campaign.roas === 'number' ? campaign.roas.toFixed(2) : '0.00'}x</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Budget Utilization</span>
                        <span className="text-lg font-semibold text-white">
                          {Math.round((campaign.spent / campaign.budget) * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">CTR</span>
                        <span className="text-lg font-semibold text-white">{campaign.ctr.toFixed(2)}%</span>
                      </div>
                      <Separator className="bg-[#333]" />
                      <div className="pt-2">
                        <div className="flex items-center gap-2 text-sm">
                          <ShieldCheck className={`w-4 h-4 ${riskInfo.color}`} />
                          <span className="text-gray-400">Risk Level:</span>
                          <span className={riskInfo.color}>{riskInfo.level}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{riskInfo.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Visualization */}
                <Card className="bg-[#111] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      7-Day Performance Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historicalData}>
                          <defs>
                            <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorROAS" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="day" stroke="#666" />
                          <YAxis stroke="#666" />
                          <ReTooltip 
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="spend" 
                            stroke="#3b82f6" 
                            fillOpacity={1} 
                            fill="url(#colorSpend)" 
                            name="Spend ($)"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="roas" 
                            stroke="#10b981" 
                            fillOpacity={1} 
                            fill="url(#colorROAS)" 
                            name="ROAS"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
            </CardContent>
          </Card>

          {/* Expected Impact */}
                <Card className="bg-[#111] border-[#333]">
                  <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-400" />
                Expected Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
                    <Alert className="bg-green-950/20 border-green-800/50 text-green-400">
                      <TrendingUp className="w-4 h-4" />
                      <AlertDescription className="text-green-300">
                {recommendation.impact}
                      </AlertDescription>
                    </Alert>
                    
                    <div className="mt-4 space-y-3">
                      <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[#333]">
                        <h4 className="text-sm font-medium text-white mb-2">Performance Forecast</h4>
                  <p className="text-sm text-gray-400">
                          {recommendation.forecast}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
              </TabsContent>

              <TabsContent value="analysis" className="p-6 space-y-6 mt-0 flex-1 overflow-y-auto">
                {/* Performance Metrics */}
                <Card className="bg-[#111] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Performance Breakdown</CardTitle>
              </CardHeader>
                  <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                        <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[#333]">
                          <h4 className="text-sm font-medium text-white mb-3">Efficiency Scores</h4>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400">ROAS Efficiency</span>
                                <span className="text-white">{Math.round(campaign.roas * 20)}%</span>
                              </div>
                              <Progress value={campaign.roas * 20} className="h-2 bg-[#222]" />
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400">CTR Performance</span>
                                <span className="text-white">{Math.round(campaign.ctr * 10)}%</span>
                              </div>
                              <Progress value={campaign.ctr * 10} className="h-2 bg-[#222]" />
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400">Budget Efficiency</span>
                                <span className="text-white">{Math.round((campaign.spent / campaign.budget) * 100)}%</span>
                              </div>
                              <Progress value={(campaign.spent / campaign.budget) * 100} className="h-2 bg-[#222]" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[#333]">
                          <h4 className="text-sm font-medium text-white mb-3">Key Metrics</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total Spend</span>
                              <span className="text-white">${campaign.spent.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Conversions</span>
                              <span className="text-white">{campaign.conversions.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Avg. CPC</span>
                              <span className="text-white">${campaign.cpc.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Impressions</span>
                              <span className="text-white">{campaign.impressions.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Specific Actions */}
                    {recommendation.specific_actions && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-white">Specific Actions Recommended</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {recommendation.specific_actions.adsets_to_scale && recommendation.specific_actions.adsets_to_scale.length > 0 && (
                            <ActionCard 
                              icon={<TrendingUp className="w-4 h-4" />}
                              title="AdSets to Scale"
                              items={recommendation.specific_actions.adsets_to_scale}
                              color="green"
                            />
                          )}
                    {recommendation.specific_actions.adsets_to_optimize && recommendation.specific_actions.adsets_to_optimize.length > 0 && (
                            <ActionCard 
                              icon={<Target className="w-4 h-4" />}
                              title="AdSets to Optimize"
                              items={recommendation.specific_actions.adsets_to_optimize}
                              color="blue"
                            />
                          )}
                          {recommendation.specific_actions.adsets_to_pause && recommendation.specific_actions.adsets_to_pause.length > 0 && (
                            <ActionCard 
                              icon={<Clock className="w-4 h-4" />}
                              title="AdSets to Pause"
                              items={recommendation.specific_actions.adsets_to_pause}
                              color="red"
                            />
                          )}
                          {recommendation.specific_actions.ads_to_pause && recommendation.specific_actions.ads_to_pause.length > 0 && (
                            <ActionCard 
                              icon={<Eye className="w-4 h-4" />}
                              title="Ads to Pause"
                              items={recommendation.specific_actions.ads_to_pause}
                              color="purple"
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="implementation" className="p-6 space-y-6 mt-0 flex-1 overflow-y-auto">
                <Card className="bg-[#111] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-gray-400" />
                      Implementation Guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[#333]">
                      <h4 className="text-sm font-medium text-white mb-3">Step-by-Step Instructions</h4>
                      <div className="prose prose-sm prose-invert max-w-none">
                        <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                          {recommendation.implementation}
                        </p>
                      </div>
                  </div>

                    {/* Implementation Timeline */}
                    <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[#333]">
                      <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                        <Timer className="w-4 h-4 text-gray-400" />
                        Implementation Timeline
                      </h4>
                  <div className="space-y-4">
                        <TimelineItem
                          time="0-5 min"
                          title="Backup Current Settings"
                          description="Export current campaign settings and create a backup before making changes"
                        />
                        <TimelineItem
                          time="5-15 min"
                          title="Apply Recommended Changes"
                          description="Implement the specific modifications outlined in the recommendation"
                        />
                        <TimelineItem
                          time="15-30 min"
                          title="Configure Monitoring"
                          description="Set up alerts and monitoring to track performance changes"
                        />
                        <TimelineItem
                          time="Day 1-3"
                          title="Initial Observation"
                          description="Monitor early performance indicators and make minor adjustments if needed"
                        />
                        <TimelineItem
                          time="Day 3-7"
                          title="Performance Evaluation"
                          description="Analyze full impact and determine if further optimizations are needed"
                        />
                      </div>
                    </div>

                    {/* Key Metrics to Track */}
                    <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[#333]">
                      <h4 className="text-sm font-medium text-white mb-4">Key Metrics to Track</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <MetricToTrack label="ROAS Target" target="> 3.5x" />
                        <MetricToTrack label="CTR Target" target="> 2.0%" />
                        <MetricToTrack label="CPC Target" target="< $1.50" />
                      </div>
                    </div>

                    {/* Warnings & Considerations */}
                    <Alert className="bg-yellow-950/20 border-yellow-800/50 text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription className="text-yellow-300">
                        <span className="font-medium">Important:</span> Monitor performance closely for the first 24-48 hours after implementation. Be prepared to revert changes if performance drops significantly.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tutorial" className="p-6 space-y-6 mt-0 flex-1 overflow-y-auto">
                <Card className="bg-[#111] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                      Meta Ads Manager Tutorial
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[#333]">
                      <h4 className="text-sm font-medium text-white mb-4">How to Apply These Changes</h4>
                      <div className="space-y-6">
                        <TutorialStep
                          number={1}
                          title="Access Meta Ads Manager"
                          description="Log into your Meta Ads Manager account and navigate to the Campaigns tab. Locate your specific campaign in the list."
                          tip="Use the search function to quickly find your campaign by name"
                        />
                        
                        <TutorialStep
                          number={2}
                          title="Navigate to Campaign Settings"
                          description="Click on your campaign name to open the campaign overview. Then click on the 'Edit' button to access campaign settings."
                          tip="Keep the original tab open in case you need to reference current settings"
                        />
                        
                        <TutorialStep
                          number={3}
                          title="Apply Recommended Changes"
                          description={`Based on the "${recommendation.action}" recommendation, make the specific adjustments to your campaign settings.`}
                          tip="Make changes during off-peak hours to minimize disruption"
                        />
                        
                        <TutorialStep
                          number={4}
                          title="Set Up Monitoring"
                          description="Create custom alerts in Ads Manager to notify you if performance drops below thresholds. Set up automated rules if appropriate."
                          tip="Set alerts for: ROAS < 2.5, CTR < 1.5%, or daily spend > 120% of target"
                        />
                        
                        <TutorialStep
                          number={5}
                          title="Document Changes"
                          description="Record all changes made, including timestamps and reasoning. This helps with future optimization and troubleshooting."
                          tip="Use the Notes feature in Ads Manager or maintain a separate optimization log"
                        />
                      </div>

                      <div className="mt-6 bg-[#0a0a0a] border border-[#333] rounded-lg p-4">
                        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <PlayCircle className="w-4 h-4 text-gray-400" />
                          Video Resources
                        </h4>
                        <div className="space-y-2">
                          <VideoResource 
                            title="Meta Ads Budget Optimization" 
                            duration="5:23"
                            link="#"
                          />
                          <VideoResource 
                            title="Advanced Audience Targeting" 
                            duration="8:45"
                            link="#"
                          />
                          <VideoResource 
                            title="Creative Testing Strategies" 
                            duration="6:12"
                            link="#"
                          />
                        </div>
                  </div>
                </div>
              </CardContent>
            </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#333] bg-[#0a0a0a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
                  className="bg-transparent border-[#333] text-gray-400 hover:text-white hover:bg-[#111] hover:border-[#444]"
            >
              Close
            </Button>
            
              <Button 
                variant="outline" 
                  className="bg-transparent border-[#333] text-gray-400 hover:text-white hover:bg-[#111] hover:border-[#444]"
                onClick={() => {
                  console.log('Recommendation saved for later review')
                }}
              >
                  <Clock className="w-4 h-4 mr-2" />
                Save for Later
              </Button>
              </div>
              
              <Button 
                onClick={handleImplement}
                disabled={isImplementing}
                className="bg-white text-gray-900 hover:bg-gray-100"
              >
                {isImplementing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-900 border-t-transparent mr-2" />
                    Implementing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Implement Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper Components
function ActionCard({ icon, title, items, color }: { 
  icon: React.ReactNode
  title: string
  items: string[]
  color: 'green' | 'blue' | 'red' | 'purple'
}) {
  const colors = {
    green: 'bg-green-950/20 border-green-800/50 text-green-400',
    blue: 'bg-blue-950/20 border-blue-800/50 text-blue-400',
    red: 'bg-red-950/20 border-red-800/50 text-red-400',
    purple: 'bg-purple-950/20 border-purple-800/50 text-purple-400'
  }
  
  return (
    <div className={`p-3 rounded-lg border ${colors[color]}`}>
      <h6 className="text-sm font-medium mb-2 flex items-center gap-2">
        {icon}
        {title} ({items.length})
      </h6>
      <ul className="text-sm opacity-80 space-y-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2 truncate">
            <div className="w-1 h-1 rounded-full bg-current" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function TimelineItem({ time, title, description }: {
  time: string
  title: string
  description: string
}) {
  return (
    <div className="flex gap-3">
      <div className="w-2 h-2 rounded-full bg-white mt-1.5 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-500">{time}</span>
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  )
}

function MetricToTrack({ label, target }: { label: string; target: string }) {
  return (
    <div className="bg-[#111] p-3 rounded-lg border border-[#333]">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-white">{target}</p>
    </div>
  )
}

function TutorialStep({ number, title, description, tip }: {
  number: number
  title: string
  description: string
  tip: string
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center font-semibold text-sm">
        {number}
      </div>
      <div className="flex-1 space-y-2">
        <h4 className="font-medium text-white">{title}</h4>
        <p className="text-sm text-gray-400">{description}</p>
        <div className="bg-blue-950/20 border border-blue-800/50 rounded-lg p-3">
          <p className="text-xs text-blue-300">
            <span className="font-medium">Pro tip:</span> {tip}
          </p>
        </div>
      </div>
    </div>
  )
}

function VideoResource({ title, duration, link }: {
  title: string
  duration: string
  link: string
}) {
  return (
    <a 
      href={link}
      className="flex items-center justify-between p-3 bg-[#111] border border-[#333] rounded-lg hover:bg-[#1a1a1a] transition-colors group"
    >
      <div className="flex items-center gap-3">
        <PlayCircle className="w-5 h-5 text-gray-400 group-hover:text-white" />
        <span className="text-sm text-gray-300 group-hover:text-white">{title}</span>
      </div>
      <span className="text-xs text-gray-500">{duration}</span>
    </a>
  )
} 