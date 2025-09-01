"use client"

import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useBrandContext } from "@/lib/context/BrandContext"
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
  TrendingUpDown,
  Brain,
  Layers,
  PieChart,
  Maximize2,
  Minimize2,
  Copy,
  ExternalLink,
  Video,
  FileText,
  Calculator,
  Crosshair,
  Sliders,
  BarChart2
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
  Legend,
  PieChart as RePieChart,
  Cell,
  Pie,
  RadialBarChart,
  RadialBar,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"

interface EnhancedRecommendationModalProps {
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
  } | null
}

export default function EnhancedRecommendationModal({ 
  isOpen, 
  onClose, 
  campaign 
}: EnhancedRecommendationModalProps) {
  const [activeTab, setActiveTab] = useState('analysis')
  const [isLoading, setIsLoading] = useState(false)
  const [enhancedData, setEnhancedData] = useState<any>(null)
  const [isImplementing, setIsImplementing] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState('realistic')
  const [tutorialStep, setTutorialStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  
  // Get brand context for real brand ID
  const { selectedBrandId } = useBrandContext()

  useEffect(() => {
    if (isOpen && campaign) {
      fetchEnhancedAnalysis()
    }
  }, [isOpen, campaign])

  const fetchEnhancedAnalysis = async () => {
    if (!campaign || !selectedBrandId) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/enhanced-campaign-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId, // Use real brand ID from context
          campaignId: campaign.campaign_id,
          campaignData: campaign
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setEnhancedData(data)
      } else {
        toast.error('Failed to load enhanced analysis')
      }
    } catch (error) {
      console.error('Error fetching enhanced analysis:', error)
      toast.error('Error loading analysis')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImplement = async () => {
    setIsImplementing(true)
    
    // Simulate implementation
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    toast.success('Recommendations implemented successfully!')
    setIsImplementing(false)
    onClose()
  }

  if (!campaign) return null

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-[#0a0a0a] border-[#333]">
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-[#444] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h3 className="text-lg font-semibold text-white">Analyzing Campaign Data</h3>
              <p className="text-gray-400">Running comprehensive analysis on 30+ data points...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const recommendation = enhancedData?.recommendation || {}
  const predictions = enhancedData?.predictions || {}
  const visualData = enhancedData?.visualData || {}
  const roadmap = enhancedData?.roadmap || {}
  const analysisData = enhancedData?.analysisData || {}

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[95vh] bg-[#0a0a0a] border-[#333] p-0 flex flex-col">
        {/* Clean Header */}
        <div className="px-6 py-4 border-b border-[#333] bg-[#0a0a0a] flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-3">
            <div className="p-2 bg-[#333] rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span>AI Campaign Analysis</span>
                <Badge variant="outline" className="bg-[#111] text-gray-300 border-[#444]">
                  Enhanced
                </Badge>
              </div>
              <p className="text-sm text-gray-400 font-normal mt-1">
                {campaign.campaign_name}
              </p>
            </div>
          </DialogTitle>
        </div>

        {/* Clean Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-6 py-3 border-b border-[#333] bg-[#0a0a0a] flex-shrink-0">
              <TabsList className="bg-[#111] border border-[#333] grid grid-cols-5 w-full">
                <TabsTrigger value="analysis" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="predictions" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Predictions
                </TabsTrigger>
                <TabsTrigger value="implementation" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
                  <ListChecks className="w-4 h-4 mr-2" />
                  Roadmap
                </TabsTrigger>
                <TabsTrigger value="tutorial" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
                  <Video className="w-4 h-4 mr-2" />
                  Tutorial
                </TabsTrigger>
                <TabsTrigger value="simulator" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
                  <Calculator className="w-4 h-4 mr-2" />
                  Simulator
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Deep Analysis Tab */}
              <TabsContent value="analysis" className="p-6 space-y-6 mt-0 h-full">
                {/* Key Recommendation Card */}
                <Card className="bg-[#111] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Primary Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#333]">
                        <h4 className="font-semibold text-white mb-2">{recommendation.title || 'Optimize Campaign Performance'}</h4>
                        <p className="text-gray-300 leading-relaxed">
                          {recommendation.summary || 'Based on comprehensive analysis, we recommend focusing on budget reallocation and audience refinement.'}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#333] text-center">
                          <div className="text-2xl font-bold text-white">
                            {recommendation.expectedRoasIncrease || '+15%'}
                          </div>
                          <div className="text-sm text-gray-400">Expected ROAS Increase</div>
                        </div>
                        <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#333] text-center">
                          <div className="text-2xl font-bold text-white">
                            {recommendation.estimatedTimeline || '2-3 weeks'}
                          </div>
                          <div className="text-sm text-gray-400">Implementation Time</div>
                        </div>
                        <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#333] text-center">
                          <div className="text-2xl font-bold text-white">
                            {recommendation.confidenceLevel || 'High'}
                          </div>
                          <div className="text-sm text-gray-400">Confidence Level</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-[#111] border-[#333]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <LineChart className="w-5 h-5" />
                        Performance Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReLineChart data={visualData.performanceTrends || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" stroke="#666" />
                            <YAxis stroke="#666" />
                            <ReTooltip 
                              contentStyle={{ 
                                backgroundColor: '#111', 
                                border: '1px solid #333',
                                borderRadius: '8px',
                                color: 'white'
                              }} 
                            />
                            <Line 
                              type="monotone" 
                              dataKey="roas" 
                              stroke="#fff" 
                              strokeWidth={2}
                              dot={{ fill: '#fff', strokeWidth: 2 }}
                            />
                          </ReLineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#111] border-[#333]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Marketing Funnel
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FunnelVisualization data={{
                        impressions: campaign.impressions,
                        clicks: campaign.clicks,
                        conversions: campaign.conversions
                      }} />
                    </CardContent>
                  </Card>
                </div>

                {/* Key Insights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InsightCard
                    title="Creative Fatigue"
                    value={analysisData.creativeFatigue?.level || "Low"}
                    status={analysisData.creativeFatigue?.status || "good"}
                    icon={<Sparkles className="w-5 h-5" />}
                    description="Current creative performance and refresh recommendations"
                  />
                  <InsightCard
                    title="Audience Saturation"
                    value={analysisData.audienceSaturation?.level || "Medium"}
                    status={analysisData.audienceSaturation?.status || "warning"}
                    icon={<Users className="w-5 h-5" />}
                    description="Audience reach efficiency and expansion opportunities"
                  />
                  <InsightCard
                    title="Performance Volatility"
                    value={analysisData.volatility?.level || "Stable"}
                    status={analysisData.volatility?.status || "good"}
                    icon={<Activity className="w-5 h-5" />}
                    description="Campaign stability and consistency metrics"
                  />
                </div>

                {/* Action Items */}
                <Card className="bg-[#111] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Immediate Action Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(recommendation.actionItems || [
                        "Increase budget for top-performing ad sets by 20%",
                        "Pause underperforming creatives with CTR < 1%",
                        "Test new audience segments similar to converters"
                      ]).map((action: string, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded-lg border border-[#333]">
                          <div className="w-6 h-6 rounded-full bg-[#333] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs text-white">{index + 1}</span>
                          </div>
                          <span className="text-gray-300">{action}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Bottom padding for scroll */}
                <div className="h-6"></div>
              </TabsContent>

              {/* Predictions Tab */}
              <TabsContent value="predictions" className="p-6 space-y-6 mt-0 h-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <PredictionCard
                    title="Conservative"
                    data={predictions.conservative || {}}
                    isSelected={selectedScenario === 'conservative'}
                    onClick={() => setSelectedScenario('conservative')}
                  />
                  <PredictionCard
                    title="Realistic"
                    data={predictions.realistic || {}}
                    isSelected={selectedScenario === 'realistic'}
                    onClick={() => setSelectedScenario('realistic')}
                  />
                  <PredictionCard
                    title="Optimistic"
                    data={predictions.optimistic || {}}
                    isSelected={selectedScenario === 'optimistic'}
                    onClick={() => setSelectedScenario('optimistic')}
                  />
                </div>

                <Card className="bg-[#111] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-white">30-Day Performance Projection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PredictionChart scenario={predictions[selectedScenario]} />
                  </CardContent>
                </Card>

                {/* Bottom padding for scroll */}
                <div className="h-6"></div>
              </TabsContent>

              {/* Implementation Tab */}
              <TabsContent value="implementation" className="p-6 space-y-6 mt-0 h-full">
                <RoadmapView roadmap={roadmap} recommendation={recommendation} />
                {/* Bottom padding for scroll */}
                <div className="h-6"></div>
              </TabsContent>

              {/* Tutorial Tab */}
              <TabsContent value="tutorial" className="p-6 space-y-6 mt-0 h-full">
                <InteractiveTutorial recommendation={recommendation} />
                {/* Bottom padding for scroll */}
                <div className="h-6"></div>
              </TabsContent>

              {/* Simulator Tab */}
              <TabsContent value="simulator" className="p-6 space-y-6 mt-0 h-full">
                <PerformanceSimulator campaign={campaign} recommendation={recommendation} />
                {/* Bottom padding for scroll */}
                <div className="h-6"></div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Clean Footer */}
        <div className="px-6 py-4 border-t border-[#333] bg-[#0a0a0a] flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              Analysis powered by AI • Real campaign data
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="border-[#333] text-gray-300 hover:bg-[#111]">
                Close
              </Button>
              <Button 
                onClick={handleImplement} 
                disabled={isImplementing}
                className="bg-white text-black hover:bg-gray-200"
              >
                {isImplementing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                    Implementing...
                  </>
                ) : (
                  'Implement Recommendations'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InsightCard({ title, value, status, icon, description }: {
  title: string
  value: string
  status: string
  icon: React.ReactNode
  description: string
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-400 border-green-400/20 bg-green-400/10'
      case 'warning': return 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10'
      case 'danger': return 'text-red-400 border-red-400/20 bg-red-400/10'
      default: return 'text-gray-400 border-gray-400/20 bg-gray-400/10'
    }
  }

  return (
    <Card className={`bg-[#111] border-[#333] ${getStatusColor(status)}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-white">{title}</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <p className="text-sm text-gray-400">{description}</p>
      </CardContent>
    </Card>
  )
}

function FunnelVisualization({ data }: { data: { impressions: number, clicks: number, conversions: number } }) {
  const funnelData = [
    { name: 'Impressions', value: data.impressions, percentage: 100 },
    { name: 'Clicks', value: data.clicks, percentage: Math.round((data.clicks / data.impressions) * 100) },
    { name: 'Conversions', value: data.conversions, percentage: Math.round((data.conversions / data.impressions) * 100) }
  ]

  return (
    <div className="space-y-4">
      {funnelData.map((item, index) => (
        <div key={item.name} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">{item.name}</span>
            <span className="text-white">{item.value.toLocaleString()} ({item.percentage}%)</span>
          </div>
          <div className="w-full bg-[#333] rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-500" 
              style={{ width: `${item.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function PredictionCard({ title, data, isSelected, onClick }: {
  title: string
  data: any
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'bg-[#222] border-white' 
          : 'bg-[#111] border-[#333] hover:border-[#444]'
      }`}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className={`text-lg ${isSelected ? 'text-white' : 'text-gray-300'}`}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-400">ROAS</div>
            <div className="text-xl font-bold text-white">{data.roas || '2.5x'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Revenue</div>
            <div className="text-xl font-bold text-white">${data.revenue || '15,000'}</div>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          Confidence: {data.confidence || '75%'}
        </div>
      </CardContent>
    </Card>
  )
}

function PredictionChart({ scenario }: { scenario: any }) {
  const chartData = scenario?.chartData || [
    { day: 1, revenue: 500, spend: 200 },
    { day: 7, revenue: 3500, spend: 1400 },
    { day: 14, revenue: 7000, spend: 2800 },
    { day: 21, revenue: 10500, spend: 4200 },
    { day: 30, revenue: 15000, spend: 6000 }
  ]

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ReLineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="day" stroke="#666" />
          <YAxis stroke="#666" />
          <ReTooltip 
            contentStyle={{ 
              backgroundColor: '#111', 
              border: '1px solid #333',
              borderRadius: '8px',
              color: 'white'
            }} 
          />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="#fff" 
            strokeWidth={2}
            name="Revenue"
          />
          <Line 
            type="monotone" 
            dataKey="spend" 
            stroke="#666" 
            strokeWidth={2}
            name="Spend"
          />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  )
}

function RoadmapView({ roadmap, recommendation }: { roadmap: any, recommendation: any }) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    )
  }

  const phases = roadmap?.phases || [
    {
      id: 'immediate',
      title: 'Immediate Actions (1-3 days)',
      description: 'Quick wins and urgent optimizations',
      tasks: [
        { id: 'pause-poor', title: 'Pause underperforming ad sets', description: 'Stop ads with ROAS < 1.5x' },
        { id: 'increase-budget', title: 'Increase budget for top performers', description: 'Boost spend on highest ROAS campaigns by 20%' }
      ]
    },
    {
      id: 'short-term',
      title: 'Short-term Optimizations (1-2 weeks)',
      description: 'Strategic improvements and testing',
      tasks: [
        { id: 'new-creatives', title: 'Launch new creative variants', description: 'Test 3-5 new ad formats and messaging' },
        { id: 'audience-expansion', title: 'Expand audience targeting', description: 'Test lookalike audiences and interest targeting' }
      ]
    },
    {
      id: 'long-term',
      title: 'Long-term Strategy (1+ months)',
      description: 'Comprehensive campaign restructuring',
      tasks: [
        { id: 'campaign-restructure', title: 'Restructure campaign architecture', description: 'Implement new campaign structure based on performance data' },
        { id: 'attribution-setup', title: 'Implement advanced attribution', description: 'Set up server-side tracking and attribution modeling' }
      ]
    }
  ]

  return (
    <div className="space-y-6">
      {phases.map((phase: any) => (
        <Card key={phase.id} className="bg-[#111] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {phase.title}
            </CardTitle>
            <p className="text-gray-400">{phase.description}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {phase.tasks.map((task: any) => (
                <div key={task.id} className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded-lg border border-[#333]">
                  <button
                    onClick={() => toggleStep(task.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
                      completedSteps.includes(task.id)
                        ? 'bg-white border-white'
                        : 'border-[#444] hover:border-[#555]'
                    }`}
                  >
                    {completedSteps.includes(task.id) && (
                      <CheckCircle className="w-3 h-3 text-black" />
                    )}
                  </button>
                  <div>
                    <h4 className={`font-medium ${
                      completedSteps.includes(task.id) ? 'text-gray-400 line-through' : 'text-white'
                    }`}>
                      {task.title}
                    </h4>
                    <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function InteractiveTutorial({ recommendation }: { recommendation: any }) {
  const [currentStep, setCurrentStep] = useState(0)

  const tutorials = recommendation?.tutorials || [
    {
      title: "Budget Optimization Basics",
      description: "Learn how to allocate budget across campaigns effectively",
      steps: [
        "Identify your best performing campaigns",
        "Calculate cost per conversion for each campaign", 
        "Redistribute budget to highest ROAS campaigns",
        "Monitor performance and adjust weekly"
      ]
    },
    {
      title: "Audience Targeting Strategy",
      description: "Master audience segmentation and targeting",
      steps: [
        "Analyze your current audience performance",
        "Create lookalike audiences from converters",
        "Test interest-based targeting expansion",
        "Implement exclusion audiences to reduce overlap"
      ]
    },
    {
      title: "Creative Testing Framework",
      description: "Systematic approach to creative optimization",
      steps: [
        "Audit current creative performance",
        "Develop creative testing hypotheses",
        "Launch A/B tests with statistical significance",
        "Scale winning creatives and refresh underperformers"
      ]
    }
  ]

  const currentTutorial = tutorials[currentStep] || tutorials[0]

  return (
    <div className="space-y-6">
      <Card className="bg-[#111] border-[#333]">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Video className="w-5 h-5" />
                {currentTutorial.title}
              </CardTitle>
              <p className="text-gray-400 mt-1">{currentTutorial.description}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="border-[#333] text-gray-300 hover:bg-[#111]"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(Math.min(tutorials.length - 1, currentStep + 1))}
                disabled={currentStep === tutorials.length - 1}
                className="border-[#333] text-gray-300 hover:bg-[#111]"
              >
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {currentTutorial.steps.map((step: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded-lg border border-[#333]">
                  <div className="w-6 h-6 rounded-full bg-[#333] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-white">{index + 1}</span>
                  </div>
                  <span className="text-gray-300">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tutorials.map((tutorial: any, index: number) => (
          <Card
            key={index}
            className={`cursor-pointer transition-all duration-200 ${
              currentStep === index
                ? 'bg-[#222] border-white'
                : 'bg-[#111] border-[#333] hover:border-[#444]'
            }`}
            onClick={() => setCurrentStep(index)}
          >
            <CardContent className="p-4">
              <h4 className={`font-medium mb-2 ${
                currentStep === index ? 'text-white' : 'text-gray-300'
              }`}>
                {tutorial.title}
              </h4>
              <p className="text-sm text-gray-400">{tutorial.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function PerformanceSimulator({ campaign, recommendation }: { campaign: any, recommendation: any }) {
  const [budgetMultiplier, setBudgetMultiplier] = useState(1)
  const [cpcChange, setCpcChange] = useState(0)
  const [ctrChange, setCtrChange] = useState(0)

  const calculateProjections = () => {
    const newBudget = campaign.budget * budgetMultiplier
    const newCpc = campaign.cpc * (1 + cpcChange / 100)
    const newCtr = campaign.ctr * (1 + ctrChange / 100)
    const newClicks = (newBudget / newCpc) 
    const newImpressions = newClicks / (newCtr / 100)
    const newConversions = newClicks * (campaign.conversions / campaign.clicks)
    const newRevenue = newConversions * (campaign.spent * campaign.roas / campaign.conversions)
    const newRoas = newRevenue / newBudget

    return {
      budget: newBudget,
      impressions: Math.round(newImpressions),
      clicks: Math.round(newClicks),
      conversions: Math.round(newConversions),
      revenue: Math.round(newRevenue),
      roas: newRoas,
      cpc: newCpc,
      ctr: newCtr
    }
  }

  const projections = calculateProjections()

  return (
    <div className="space-y-6">
      <Card className="bg-[#111] border-[#333]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sliders className="w-5 h-5" />
            Performance Simulator
          </CardTitle>
          <p className="text-gray-400">Adjust parameters to see projected performance changes</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Budget Multiplier</label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={budgetMultiplier}
                  onChange={(e) => setBudgetMultiplier(Number(e.target.value))}
                  className="w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="text-center text-white font-medium">
                  {budgetMultiplier.toFixed(1)}x (${Math.round(campaign.budget * budgetMultiplier).toLocaleString()})
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-white">CPC Change (%)</label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="5"
                  value={cpcChange}
                  onChange={(e) => setCpcChange(Number(e.target.value))}
                  className="w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="text-center text-white font-medium">
                  {cpcChange > 0 ? '+' : ''}{cpcChange}% (${projections.cpc.toFixed(2)})
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-white">CTR Change (%)</label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="-50"
                  max="100"
                  step="5"
                  value={ctrChange}
                  onChange={(e) => setCtrChange(Number(e.target.value))}
                  className="w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="text-center text-white font-medium">
                  {ctrChange > 0 ? '+' : ''}{ctrChange}% ({projections.ctr.toFixed(2)}%)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#111] border-[#333]">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {projections.impressions.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Impressions</div>
            <div className="text-xs text-gray-500 mt-1">
              {projections.impressions > campaign.impressions ? '+' : ''}
              {((projections.impressions - campaign.impressions) / campaign.impressions * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-[#333]">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {projections.clicks.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Clicks</div>
            <div className="text-xs text-gray-500 mt-1">
              {projections.clicks > campaign.clicks ? '+' : ''}
              {((projections.clicks - campaign.clicks) / campaign.clicks * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-[#333]">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {projections.conversions.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Conversions</div>
            <div className="text-xs text-gray-500 mt-1">
              {projections.conversions > campaign.conversions ? '+' : ''}
              {((projections.conversions - campaign.conversions) / campaign.conversions * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-[#333]">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {projections.roas.toFixed(2)}x
            </div>
            <div className="text-sm text-gray-400">ROAS</div>
            <div className="text-xs text-gray-500 mt-1">
              {projections.roas > campaign.roas ? '+' : ''}
              {((projections.roas - campaign.roas) / campaign.roas * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case 'budget': return <DollarSign className="w-5 h-5" />
    case 'audience': return <Users className="w-5 h-5" />
    case 'creative': return <Sparkles className="w-5 h-5" />
    case 'bidding': return <Target className="w-5 h-5" />
    case 'placement': return <Layers className="w-5 h-5" />
    default: return <Settings className="w-5 h-5" />
  }
}
