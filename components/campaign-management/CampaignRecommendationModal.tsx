"use client"

import { useState } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  PlayCircle,
  BookOpen,
  AlertTriangle,
  Activity,
  Eye,
  ChevronRight,
  Star,
  ShieldCheck,
  Rocket,
  Brain,
  Timer,
  DollarSign,
  Gauge,
  TrendingUpIcon
} from "lucide-react"
import { toast } from "sonner"

interface CampaignRecommendationModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: {
    campaign_name: string
    campaign_id: string
    recommendation?: {
      action: string
      priority?: string
      reasoning: string
      impact: string
      confidence: number
      implementation: string
      forecast: string
      timeline?: string
      risk_level?: string
      monitoring_plan?: string
      rollback_plan?: string
      seasonal_considerations?: string
      specific_actions?: {
        adsets_to_scale?: string[]
        adsets_to_optimize?: string[]
        adsets_to_pause?: string[]
        ads_to_pause?: string[]
        ads_to_duplicate?: string[]
        new_audiences_to_test?: string[]
        creative_actions?: string[]
        budget_adjustments?: string[]
      }
      success_metrics?: {
        primary: string
        secondary: string[]
        targets: {
          '7_day': string
          '14_day': string
          '30_day': string
        }
      }
      tutorial?: {
        title: string
        steps: string[]
        tips: string[]
        common_mistakes: string[]
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
  const [activeTab, setActiveTab] = useState('overview')

  if (!campaign?.recommendation) return null

  const { recommendation } = campaign
  
  const getActionIcon = (action: string) => {
    const actionLower = action.toLowerCase()
    
    if (actionLower.includes('aggressive_scale')) return <Rocket className="w-5 h-5" />
    if (actionLower.includes('conservative_scale')) return <TrendingUp className="w-5 h-5" />
    if (actionLower.includes('creative_refresh')) return <Lightbulb className="w-5 h-5" />
    if (actionLower.includes('budget')) return <DollarSign className="w-5 h-5" />
    if (actionLower.includes('pause')) return <Clock className="w-5 h-5" />
    if (actionLower.includes('optimization')) return <Target className="w-5 h-5" />
    if (actionLower.includes('audience')) return <Users className="w-5 h-5" />
    
    return <Settings className="w-5 h-5" />
  }

  const getPriorityConfig = (priority: string = 'medium') => {
    const configs = {
      critical: {
        color: 'text-red-400',
        bg: 'bg-red-950/30',
        border: 'border-red-800/50',
        label: 'Critical Priority',
        icon: <AlertTriangle className="w-4 h-4" />,
        description: 'Immediate action required to prevent losses'
      },
      high: {
        color: 'text-orange-400',
        bg: 'bg-orange-950/30',
        border: 'border-orange-800/50',
        label: 'High Priority',
        icon: <Zap className="w-4 h-4" />,
        description: 'Significant opportunity for improvement'
      },
      medium: {
        color: 'text-yellow-400',
        bg: 'bg-yellow-950/30',
        border: 'border-yellow-800/50',
        label: 'Medium Priority',
        icon: <Activity className="w-4 h-4" />,
        description: 'Optimization opportunity available'
      },
      low: {
        color: 'text-green-400',
        bg: 'bg-green-950/30',
        border: 'border-green-800/50',
        label: 'Low Priority',
        icon: <Eye className="w-4 h-4" />,
        description: 'Minor adjustment recommended'
      }
    }
    return configs[priority as keyof typeof configs] || configs.medium
  }

  const getRiskConfig = (riskLevel: string = 'medium') => {
    const configs = {
      high: {
        color: 'text-red-400',
        bg: 'bg-red-950/20',
        label: 'High Risk',
        icon: <AlertTriangle className="w-4 h-4" />,
        description: 'Requires careful monitoring and possible rollback plan'
      },
      medium: {
        color: 'text-yellow-400',
        bg: 'bg-yellow-950/20',
        label: 'Medium Risk',
        icon: <ShieldCheck className="w-4 h-4" />,
        description: 'Standard risk level with monitoring recommended'
      },
      low: {
        color: 'text-green-400',
        bg: 'bg-green-950/20',
        label: 'Low Risk',
        icon: <CheckCircle className="w-4 h-4" />,
        description: 'Safe implementation with minimal downside'
      }
    }
    return configs[riskLevel as keyof typeof configs] || configs.medium
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 8) return 'text-green-400'
    if (confidence >= 6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getTimelineConfig = (timeline: string = '1_week') => {
    const configs = {
      immediate: { label: 'Immediate', color: 'text-red-400', description: 'Implement within hours' },
      '1-3_days': { label: '1-3 Days', color: 'text-orange-400', description: 'Implement within this week' },
      '1_week': { label: '1 Week', color: 'text-yellow-400', description: 'Implement within 7 days' },
      '2_weeks': { label: '2 Weeks', color: 'text-green-400', description: 'Implement within 14 days' }
    }
    return configs[timeline as keyof typeof configs] || configs['1_week']
  }

  const handleImplement = async () => {
    setIsImplementing(true)
    
    try {
      // Simulate implementation process
      await new Promise(resolve => setTimeout(resolve, 3000))
      toast.success('Recommendation implementation initiated! Monitor performance closely.')
      onClose()
    } catch (error) {
      toast.error('Failed to implement recommendation. Please try again.')
    } finally {
      setIsImplementing(false)
    }
  }

  const priorityConfig = getPriorityConfig(recommendation.priority)
  const riskConfig = getRiskConfig(recommendation.risk_level)
  const timelineConfig = getTimelineConfig(recommendation.timeline)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-[#111] border-[#333] text-white">
        <DialogHeader className="border-b border-[#333] pb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-[#222] rounded-lg border border-[#444]">
                  <Brain className="w-6 h-6 text-blue-400" />
                </div>
                AI Campaign Optimization
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-base">
                Advanced AI analysis and recommendations for <span className="font-semibold text-white">{campaign.campaign_name}</span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${priorityConfig.bg} ${priorityConfig.color} ${priorityConfig.border} px-3 py-1 text-sm font-medium`}>
                {priorityConfig.icon}
                <span className="ml-2">{priorityConfig.label}</span>
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#222] border border-[#444] p-1 w-full justify-start">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="implementation" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
              <PlayCircle className="w-4 h-4 mr-2" />
              Implementation
            </TabsTrigger>
            <TabsTrigger value="tutorial" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
              <BookOpen className="w-4 h-4 mr-2" />
              Tutorial
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-2" />
              Monitoring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Action Summary Card */}
            <Card className="bg-[#111] border-[#333]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-white flex items-center gap-3">
                    {getActionIcon(recommendation.action)}
                    <div>
                      <div className="text-xl font-bold">{recommendation.action.replace(/_/g, ' ').toUpperCase()}</div>
                      <div className="text-sm font-normal text-gray-400 mt-1">{priorityConfig.description}</div>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{recommendation.confidence}/10</div>
                      <div className="text-xs text-gray-400">Confidence</div>
                    </div>
                    <div className="w-16 h-16 relative">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                          fill="none"
                          stroke="#333"
                          strokeWidth="2"
                        />
                        <path
                          d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeDasharray={`${recommendation.confidence * 10}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Star className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-[#222] border-[#444]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Timer className={`w-5 h-5 ${timelineConfig.color}`} />
                        <div>
                          <div className="font-semibold text-white">{timelineConfig.label}</div>
                          <div className="text-sm text-gray-400">{timelineConfig.description}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-[#222] border-[#444]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {riskConfig.icon}
                        <div>
                          <div className={`font-semibold ${riskConfig.color}`}>{riskConfig.label}</div>
                          <div className="text-sm text-gray-400">{riskConfig.description}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-[#222] border-[#444]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Gauge className="w-5 h-5 text-green-400" />
                        <div>
                          <div className="font-semibold text-white">Success Rate</div>
                          <div className="text-sm text-gray-400">85% similar campaigns</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#222] border border-[#444] rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-blue-400" />
                      AI Analysis & Reasoning
                    </h4>
                    <p className="text-gray-300 leading-relaxed text-base">
                      {recommendation.reasoning}
                    </p>
                  </div>

                  <div className="bg-[#222] border border-[#444] rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <TrendingUpIcon className="w-5 h-5 text-green-400" />
                      Expected Impact
                    </h4>
                    <p className="text-gray-300 leading-relaxed text-base">
                      {recommendation.impact}
                    </p>
                  </div>

                  <div className="bg-[#222] border border-[#444] rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-400" />
                      Performance Forecast
                    </h4>
                    <p className="text-gray-300 leading-relaxed text-base">
                      {recommendation.forecast}
                    </p>
                    
                    {recommendation.success_metrics && (
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-[#111] rounded-lg border border-[#333]">
                          <div className="text-lg font-bold text-blue-400">7 Days</div>
                          <div className="text-sm text-gray-400">{recommendation.success_metrics.targets['7_day']}</div>
                        </div>
                        <div className="text-center p-3 bg-[#111] rounded-lg border border-[#333]">
                          <div className="text-lg font-bold text-green-400">14 Days</div>
                          <div className="text-sm text-gray-400">{recommendation.success_metrics.targets['14_day']}</div>
                        </div>
                        <div className="text-center p-3 bg-[#111] rounded-lg border border-[#333]">
                          <div className="text-lg font-bold text-purple-400">30 Days</div>
                          <div className="text-sm text-gray-400">{recommendation.success_metrics.targets['30_day']}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {recommendation.seasonal_considerations && (
                    <div className="bg-[#222] border border-[#444] rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-400" />
                        Seasonal Considerations
                      </h4>
                      <p className="text-gray-300 leading-relaxed text-base">
                        {recommendation.seasonal_considerations}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="implementation" className="space-y-6">
            <Card className="bg-[#111] border-[#333]">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-green-400" />
                  Step-by-Step Implementation Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-[#222] border border-[#444] rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Implementation Instructions</h4>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 text-base leading-relaxed whitespace-pre-line">
                      {recommendation.implementation}
                    </p>
                  </div>
                </div>

                {recommendation.specific_actions && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* AdSet Actions */}
                    <Card className="bg-[#222] border-[#444]">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-400" />
                          AdSet Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {recommendation.specific_actions.adsets_to_scale && recommendation.specific_actions.adsets_to_scale.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-medium text-green-400 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              Scale Budget ({recommendation.specific_actions.adsets_to_scale.length})
                            </h5>
                            <ul className="space-y-1 text-sm text-gray-300">
                              {recommendation.specific_actions.adsets_to_scale.map((adset, index) => (
                                <li key={index} className="flex items-center gap-2 p-2 bg-[#111] rounded border border-[#333]">
                                  <ArrowRight className="w-3 h-3 text-green-400 flex-shrink-0" />
                                  {adset}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {recommendation.specific_actions.adsets_to_optimize && recommendation.specific_actions.adsets_to_optimize.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-medium text-yellow-400 flex items-center gap-2">
                              <Settings className="w-4 h-4" />
                              Optimize Settings ({recommendation.specific_actions.adsets_to_optimize.length})
                            </h5>
                            <ul className="space-y-1 text-sm text-gray-300">
                              {recommendation.specific_actions.adsets_to_optimize.map((adset, index) => (
                                <li key={index} className="flex items-center gap-2 p-2 bg-[#111] rounded border border-[#333]">
                                  <ArrowRight className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                                  {adset}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {recommendation.specific_actions.adsets_to_pause && recommendation.specific_actions.adsets_to_pause.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-medium text-red-400 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Pause AdSets ({recommendation.specific_actions.adsets_to_pause.length})
                            </h5>
                            <ul className="space-y-1 text-sm text-gray-300">
                              {recommendation.specific_actions.adsets_to_pause.map((adset, index) => (
                                <li key={index} className="flex items-center gap-2 p-2 bg-[#111] rounded border border-[#333]">
                                  <ArrowRight className="w-3 h-3 text-red-400 flex-shrink-0" />
                                  {adset}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Ad Actions */}
                    <Card className="bg-[#222] border-[#444]">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-purple-400" />
                          Creative Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {recommendation.specific_actions.ads_to_duplicate && recommendation.specific_actions.ads_to_duplicate.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-medium text-green-400 flex items-center gap-2">
                              <ArrowRight className="w-4 h-4" />
                              Duplicate Top Performers ({recommendation.specific_actions.ads_to_duplicate.length})
                            </h5>
                            <ul className="space-y-1 text-sm text-gray-300">
                              {recommendation.specific_actions.ads_to_duplicate.map((ad, index) => (
                                <li key={index} className="flex items-center gap-2 p-2 bg-[#111] rounded border border-[#333]">
                                  <ArrowRight className="w-3 h-3 text-green-400 flex-shrink-0" />
                                  {ad}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {recommendation.specific_actions.ads_to_pause && recommendation.specific_actions.ads_to_pause.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-medium text-red-400 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Pause Underperformers ({recommendation.specific_actions.ads_to_pause.length})
                            </h5>
                            <ul className="space-y-1 text-sm text-gray-300">
                              {recommendation.specific_actions.ads_to_pause.map((ad, index) => (
                                <li key={index} className="flex items-center gap-2 p-2 bg-[#111] rounded border border-[#333]">
                                  <ArrowRight className="w-3 h-3 text-red-400 flex-shrink-0" />
                                  {ad}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {recommendation.specific_actions.creative_actions && recommendation.specific_actions.creative_actions.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-medium text-purple-400 flex items-center gap-2">
                              <Lightbulb className="w-4 h-4" />
                              Creative Changes ({recommendation.specific_actions.creative_actions.length})
                            </h5>
                            <ul className="space-y-1 text-sm text-gray-300">
                              {recommendation.specific_actions.creative_actions.map((action, index) => (
                                <li key={index} className="flex items-center gap-2 p-2 bg-[#111] rounded border border-[#333]">
                                  <ArrowRight className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tutorial" className="space-y-6">
            {recommendation.tutorial && (
              <Card className="bg-[#111] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    {recommendation.tutorial.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Steps */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      Step-by-Step Process
                    </h4>
                    <div className="space-y-3">
                      {recommendation.tutorial.steps.map((step, index) => (
                        <div key={index} className="flex gap-4 p-4 bg-[#222] border border-[#444] rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-300 leading-relaxed">{step}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pro Tips */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400" />
                      Pro Tips
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recommendation.tutorial.tips.map((tip, index) => (
                        <div key={index} className="p-4 bg-[#222] border border-[#444] rounded-lg border-l-4 border-l-yellow-400">
                          <p className="text-gray-300 leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Common Mistakes */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      Common Mistakes to Avoid
                    </h4>
                    <div className="space-y-3">
                      {recommendation.tutorial.common_mistakes.map((mistake, index) => (
                        <div key={index} className="p-4 bg-[#222] border border-[#444] rounded-lg border-l-4 border-l-red-400">
                          <p className="text-gray-300 leading-relaxed">{mistake}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Monitoring Plan */}
              <Card className="bg-[#111] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    Monitoring Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-[#222] border border-[#444] rounded-lg">
                      <p className="text-gray-300 leading-relaxed">
                        {recommendation.monitoring_plan || 'Monitor key performance metrics daily for the first week, then weekly thereafter.'}
                      </p>
                    </div>
                    
                    {recommendation.success_metrics && (
                      <div>
                        <h5 className="font-medium text-white mb-3">Key Metrics to Track</h5>
                        <div className="space-y-2">
                          <div className="p-3 bg-[#222] border border-[#444] rounded-lg">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-blue-400" />
                              <span className="font-medium text-white">Primary:</span>
                              <span className="text-gray-300">{recommendation.success_metrics.primary}</span>
                            </div>
                          </div>
                          {recommendation.success_metrics.secondary.map((metric, index) => (
                            <div key={index} className="p-3 bg-[#222] border border-[#444] rounded-lg">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-white">Secondary:</span>
                                <span className="text-gray-300">{metric}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Rollback Plan */}
              <Card className="bg-[#111] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-red-400" />
                    Rollback Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-[#222] border border-[#444] rounded-lg">
                    <p className="text-gray-300 leading-relaxed">
                      {recommendation.rollback_plan || 'If performance declines by more than 20% within 48 hours, revert all changes and reassess strategy.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-[#333]">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-[#444] text-gray-400 hover:text-white hover:bg-[#222] bg-transparent"
          >
            Close
          </Button>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="border-[#444] text-gray-400 hover:text-white hover:bg-[#222] bg-transparent"
              onClick={() => {
                toast.success('Recommendation saved for later review')
              }}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Save for Later
            </Button>
            
            <Button 
              onClick={handleImplement}
              disabled={isImplementing}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-6 py-2"
            >
              {isImplementing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Implementing...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Implement Now
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 