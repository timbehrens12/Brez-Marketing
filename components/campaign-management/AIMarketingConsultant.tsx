"use client"

import { useState, useEffect, useRef } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { useAuth, useUser } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Brain,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Target,
  Users,
  Zap,
  Clock,
  Loader2,
  ChevronRight,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Eye,
  Settings,
  TrendingDown,
  Activity,
  PieChart
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isLoading?: boolean
}

interface PromptSuggestion {
  id: string
  icon: React.ReactNode
  title: string
  prompt: string
  category: 'performance' | 'optimization' | 'creative' | 'audience' | 'budget' | 'troubleshooting'
}

interface MarketingGoal {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

const MARKETING_GOALS: MarketingGoal[] = [
  {
    id: 'general',
    title: 'General Optimization',
    description: 'Overall campaign performance and ROI improvement',
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  },
  {
    id: 'holiday',
    title: 'Holiday Campaign',
    description: 'Black Friday, Christmas, seasonal promotions',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'bg-red-500/10 text-red-400 border-red-500/30'
  },
  {
    id: 'lead-gen',
    title: 'Lead Generation',
    description: 'Focus on capturing and qualifying leads',
    icon: <Target className="w-4 h-4" />,
    color: 'bg-green-500/10 text-green-400 border-green-500/30'
  },
  {
    id: 'product-launch',
    title: 'Product Launch',
    description: 'Introducing new products or services',
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
  },
  {
    id: 'brand-awareness',
    title: 'Brand Awareness',
    description: 'Building brand recognition and reach',
    icon: <Eye className="w-4 h-4" />,
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/30'
  },
  {
    id: 'retention',
    title: 'Customer Retention',
    description: 'Retargeting and customer lifetime value',
    icon: <Settings className="w-4 h-4" />,
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
  }
]

const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    id: 'improve-roas',
    icon: <TrendingUp className="w-4 h-4" />,
    title: 'How can I improve my ROAS?',
    prompt: 'Analyze my last 30 days of campaign data and provide specific recommendations to improve my return on ad spend (ROAS). Focus on budget allocation, audience targeting, and creative performance.',
    category: 'performance'
  },
  {
    id: 'scale-winners',
    icon: <Zap className="w-4 h-4" />,
    title: 'Which campaigns should I scale?',
    prompt: 'Based on my recent performance data, identify which campaigns, ad sets, or creatives I should scale up and which ones I should pause or optimize. Provide specific scaling strategies.',
    category: 'optimization'
  },
  {
    id: 'audience-insights',
    icon: <Users className="w-4 h-4" />,
    title: 'What audiences work best?',
    prompt: 'Analyze my audience performance data and identify which demographics, interests, and behavioral segments are driving the best results. Suggest new audience opportunities.',
    category: 'audience'
  },
  {
    id: 'creative-fatigue',
    icon: <Sparkles className="w-4 h-4" />,
    title: 'Which creatives need refreshing?',
    prompt: 'Examine my ad creative performance and identify which ones are showing signs of fatigue or declining performance. Recommend creative refresh strategies and winning elements to replicate.',
    category: 'creative'
  },
  {
    id: 'budget-optimization',
    icon: <Target className="w-4 h-4" />,
    title: 'How should I reallocate my budget?',
    prompt: 'Analyze my current budget distribution across campaigns and ad sets. Recommend optimal budget reallocation to maximize ROI based on performance data and trends.',
    category: 'budget'
  },
  {
    id: 'performance-drops',
    icon: <Clock className="w-4 h-4" />,
    title: 'Why did my performance drop?',
    prompt: 'Investigate any recent drops in my campaign performance. Analyze metrics like CTR, CPC, ROAS, and conversion rates to identify potential causes and solutions.',
    category: 'troubleshooting'
  },
  {
    id: 'cost-analysis',
    icon: <DollarSign className="w-4 h-4" />,
    title: 'How can I reduce my cost per conversion?',
    prompt: 'Analyze my conversion costs across all campaigns and provide actionable strategies to lower my cost per acquisition while maintaining conversion volume.',
    category: 'optimization'
  },
  {
    id: 'competitor-analysis',
    icon: <BarChart3 className="w-4 h-4" />,
    title: 'How do I compete better in my market?',
    prompt: 'Based on my campaign performance data and industry benchmarks, suggest competitive strategies for bidding, targeting, and creative approaches.',
    category: 'performance'
  },
  {
    id: 'seasonal-optimization',
    icon: <Clock className="w-4 h-4" />,
    title: 'How should I adjust for seasonal trends?',
    prompt: 'Analyze my historical performance data to identify seasonal patterns and recommend adjustments for upcoming periods or current trends.',
    category: 'optimization'
  },
  {
    id: 'ad-fatigue',
    icon: <AlertTriangle className="w-4 h-4" />,
    title: 'Are my ads experiencing fatigue?',
    prompt: 'Check my ad frequency, engagement rates, and performance trends to identify ad fatigue issues and recommend refresh strategies.',
    category: 'troubleshooting'
  },
  {
    id: 'lookalike-audiences',
    icon: <Users className="w-4 h-4" />,
    title: 'Should I create new lookalike audiences?',
    prompt: 'Analyze my best-performing customer segments and conversion data to recommend new lookalike audience strategies and expansion opportunities.',
    category: 'audience'
  },
  {
    id: 'creative-insights',
    icon: <Eye className="w-4 h-4" />,
    title: 'What creative elements work best?',
    prompt: 'Examine my top-performing ads to identify winning creative elements, messaging themes, and visual styles that I should replicate in new campaigns.',
    category: 'creative'
  },
  {
    id: 'bidding-strategy',
    icon: <Settings className="w-4 h-4" />,
    title: 'Should I change my bidding strategy?',
    prompt: 'Review my current bidding approaches across campaigns and recommend optimal bidding strategies based on my performance goals and budget constraints.',
    category: 'optimization'
  },
  {
    id: 'underperforming-campaigns',
    icon: <TrendingDown className="w-4 h-4" />,
    title: 'What should I do with underperforming campaigns?',
    prompt: 'Identify my worst-performing campaigns and provide specific recommendations: optimize, pause, or restructure based on detailed performance analysis.',
    category: 'troubleshooting'
  },
  {
    id: 'conversion-tracking',
    icon: <Activity className="w-4 h-4" />,
    title: 'Is my conversion tracking optimized?',
    prompt: 'Analyze my conversion data patterns and tracking setup to identify potential issues or optimization opportunities in my measurement and attribution.',
    category: 'troubleshooting'
  }
]

interface AIMarketingConsultantProps {
  // Remove loading prop
  // loading?: boolean
}

export default function AIMarketingConsultant(
  // Remove loading prop with default
  // { loading = false }: AIMarketingConsultantProps
  {}: AIMarketingConsultantProps = {}
) {
  const { selectedBrandId } = useBrandContext()
  const { user } = useUser()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedGoal, setSelectedGoal] = useState<string>('general')
  const [remainingUses, setRemainingUses] = useState<number | null>(null)
  const [isLimitReached, setIsLimitReached] = useState(false)

  // Initialize with welcome message
  useEffect(() => {
    if (!selectedBrandId || isInitialized) return

    const selectedGoalData = MARKETING_GOALS.find(g => g.id === selectedGoal)
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'system',
      content: `👋 Hi ${user?.firstName || 'there'}! I'm your AI Marketing Consultant focused on ${selectedGoalData?.title.toLowerCase() || 'general optimization'}. I can analyze your campaign data and provide personalized recommendations. Choose one of the questions below to get started!`,
      timestamp: new Date()
    }

    setMessages([welcomeMessage])
    setIsInitialized(true)
  }, [selectedBrandId, user, isInitialized, selectedGoal])

  // Reset conversation when goal changes
  useEffect(() => {
    if (isInitialized) {
      setMessages([])
      setIsInitialized(false)
    }
  }, [selectedGoal])

  // Listen for refresh events to reset conversation with fresh data
  useEffect(() => {
    if (!selectedBrandId) return

    let refreshTimeout: NodeJS.Timeout

    const handleRefreshEvent = (event: CustomEvent) => {
      const { brandId, source } = event.detail
      
      // Only refresh if it's for the current brand, not from this widget
      if (brandId === selectedBrandId && source !== 'AIMarketingConsultant') {
        console.log('[AIMarketingConsultant] Refresh event triggered, resetting conversation for fresh data analysis...', { source })
        
        // Clear existing conversation and reset
        clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(() => {
          // Reset conversation to get fresh analysis with new data
          setMessages([])
          setIsInitialized(false)
          setRemainingUses(null)
          setIsLimitReached(false)
          
          // Re-initialize with fresh welcome message
          const selectedGoalData = MARKETING_GOALS.find(g => g.id === selectedGoal)
          const welcomeMessage: ChatMessage = {
            id: 'welcome-refresh',
            type: 'system',
            content: `🔄 Data updated! I'm now analyzing your latest campaign performance. I can provide fresh insights based on your most recent ${selectedGoalData?.title.toLowerCase() || 'general optimization'} data. Ask me anything about your current performance!`,
            timestamp: new Date()
          }
          
          setMessages([welcomeMessage])
          setIsInitialized(true)
        }, 500)
      }
    }

    // Listen for the same refresh events as other widgets
    window.addEventListener('metaDataRefreshed', handleRefreshEvent as EventListener)
    window.addEventListener('global-refresh-all', handleRefreshEvent as EventListener)
    window.addEventListener('newDayDetected', handleRefreshEvent as EventListener)
    window.addEventListener('force-meta-refresh', handleRefreshEvent as EventListener)

    return () => {
      clearTimeout(refreshTimeout)
      window.removeEventListener('metaDataRefreshed', handleRefreshEvent as EventListener)
      window.removeEventListener('global-refresh-all', handleRefreshEvent as EventListener)
      window.removeEventListener('newDayDetected', handleRefreshEvent as EventListener)
      window.removeEventListener('force-meta-refresh', handleRefreshEvent as EventListener)
    }
  }, [selectedBrandId, selectedGoal, user])

  // Auto-scroll to bottom of chat container when new messages arrive (but not for initial welcome message)
  useEffect(() => {
    // Only auto-scroll if there are actual conversation messages (more than just the welcome message)
    if (messages.length > 1 && messagesEndRef.current) {
      // Use scrollTop to scroll within the container instead of scrollIntoView which affects the entire page
      const scrollContainer = messagesEndRef.current.closest('.overflow-y-auto')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const filteredPrompts = selectedCategory === 'all' 
    ? PROMPT_SUGGESTIONS 
    : PROMPT_SUGGESTIONS.filter(p => p.category === selectedCategory)

  const handlePromptSelect = async (prompt: PromptSuggestion) => {
    if (isLoading || isLimitReached) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: prompt.title,
      timestamp: new Date()
    }

    // Add loading assistant message
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: 'Analyzing your campaign data...',
      timestamp: new Date(),
      isLoading: true
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setIsLoading(true)

    try {
      await analyzeAndRespond(prompt.prompt, assistantMessage.id)
    } catch (error) {
      console.error('Error getting AI response:', error)
      
      // Update the loading message with error
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content: 'Sorry, I encountered an error analyzing your data. Please try again.', isLoading: false }
          : msg
      ))
      
      toast.error('Failed to get AI response')
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeAndRespond = async (prompt: string, messageId: string) => {
    try {
      const response = await fetch('/api/ai/marketing-consultant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: selectedBrandId,
          prompt,
          marketingGoal: selectedGoal,
          userContext: {
            name: user?.firstName || 'there'
          }
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          setIsLimitReached(true)
          setMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? { 
                  ...msg, 
                  content: `⚠️ ${data.reason || 'Daily limit reached. You can ask more questions tomorrow!'}`, 
                  isLoading: false 
                }
              : msg
          ))
          return
        }
        throw new Error(data.error || 'Failed to get AI response')
      }
      
      // Update remaining uses
      if (data.remainingUses !== undefined) {
        setRemainingUses(data.remainingUses)
        if (data.remainingUses <= 0) {
          setIsLimitReached(true)
        }
      }
      
      // Clean up the response content
      const cleanedContent = cleanAIResponse(data.response)
      
      // Update the loading message with the actual response
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: cleanedContent, isLoading: false }
          : msg
      ))

    } catch (error) {
      console.error('Error in analyzeAndRespond:', error)
      throw error
    }
  }

  // Function to clean up AI response formatting
  const cleanAIResponse = (content: string) => {
    if (!content) return content
    
    return content
      // Remove markdown headers
      .replace(/#+\s*/g, '')
      // Clean up bullet points - convert markdown to simple format
      .replace(/^\*\s*/gm, '• ')
      .replace(/^-\s*/gm, '• ')
      // Remove formal closers
      .replace(/\n\n(Best regards|Warm regards|Sincerely|Best|Thanks)[^]*$/i, '')
      .replace(/\n\n(Let me know|Feel free|Please don't hesitate)[^]*$/i, '')
      // Clean up excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Remove markdown bold/italic
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .trim()
  }

  const categories = [
    { id: 'all', label: 'All', count: PROMPT_SUGGESTIONS.length },
    { id: 'performance', label: 'Performance', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'performance').length },
    { id: 'optimization', label: 'Optimization', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'optimization').length },
    { id: 'audience', label: 'Audience', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'audience').length },
    { id: 'creative', label: 'Creative', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'creative').length },
    { id: 'budget', label: 'Budget', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'budget').length },
    { id: 'troubleshooting', label: 'Troubleshooting', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'troubleshooting').length }
  ]

  // Remove loading skeleton check - always show content
  // if (loading) {
  //   return (
  //     <Card className="bg-[#0a0a0a] border-[#1a1a1a] shadow-2xl overflow-hidden h-[1380px] flex flex-col">
  //       <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] pb-5">
  //         <div className="flex items-center justify-between">
  //           <div className="flex items-center gap-4">
  //             <div className="w-14 h-14 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
  //                           flex items-center justify-center border border-white/10 shadow-lg">
  //               <Brain className="w-6 h-6 text-white" />
  //             </div>
  //             <div>
  //               <CardTitle className="text-2xl text-white font-bold tracking-tight">AI Marketing Consultant</CardTitle>
  //               <div className="flex items-center gap-2 mt-1">
  //                 <p className="text-gray-400 font-medium">Personalized campaign optimization insights</p>
  //                 <Badge className="bg-white/5 text-gray-300 border-white/10 text-xs px-2 py-1">
  //                   Beta
  //                 </Badge>
  //               </div>
  //             </div>
  //           </div>
  //         </div>
  //       </CardHeader>
  //       <CardContent className="p-0 flex flex-col" style={{ height: 'calc(100% - 120px)' }}>
  //         {/* Goal Selection Skeleton */}
  //         <div className="border-b border-[#1a1a1a] p-6 bg-[#0f0f0f]/50">
  //           <Skeleton className="h-4 w-32 bg-[#1a1a1a] mb-3" />
  //           <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
  //             {[1, 2, 3, 4, 5, 6].map((i) => (
  //               <Skeleton key={i} className="h-20 w-full bg-[#1a1a1a] rounded-xl" />
  //             ))}
  //           </div>
  //         </div>
          
  //         {/* Chat Area Skeleton - matches real chat area */}
  //         <div className="bg-[#0f0f0f]/30" style={{ flex: '1 1 auto' }}>
  //           <ScrollArea className="h-full p-6">
  //             <div className="space-y-4">
  //               <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-4 max-w-[80%]">
  //                 <div className="space-y-2">
  //                   <Skeleton className="h-4 w-3/4 bg-[#1a1a1a] rounded" />
  //                   <Skeleton className="h-4 w-full bg-[#1a1a1a] rounded" />
  //                   <Skeleton className="h-4 w-1/2 bg-[#1a1a1a] rounded" />
  //                 </div>
  //               </div>
  //             </div>
  //           </ScrollArea>
  //         </div>
          
  //         {/* Quick Prompts Skeleton */}
  //         <div className="border-t border-[#1a1a1a] p-6 bg-[#0f0f0f]/50">
  //           <div className="mb-4">
  //             <Skeleton className="h-4 w-28 bg-[#1a1a1a] mb-3" />
  //             <div className="flex flex-wrap gap-2 mb-4">
  //               <Skeleton className="h-8 w-20 bg-[#1a1a1a] rounded-xl" />
  //               <Skeleton className="h-8 w-24 bg-[#1a1a1a] rounded-xl" />
  //               <Skeleton className="h-8 w-18 bg-[#1a1a1a] rounded-xl" />
  //               <Skeleton className="h-8 w-16 bg-[#1a1a1a] rounded-xl" />
  //             </div>
  //           </div>
  //           <div className="space-y-3">
  //             {[1, 2, 3, 4].map((i) => (
  //               <Skeleton key={i} className="h-14 w-full bg-[#1a1a1a] rounded-xl" />
  //             ))}
  //           </div>
  //         </div>
  //       </CardContent>
  //     </Card>
  //   )
  // }

  if (!selectedBrandId) {
    return (
      <Card className="bg-[#0a0a0a] border-[#1a1a1a] shadow-2xl overflow-hidden h-[1380px] flex flex-col">
        <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
                            flex items-center justify-center border border-white/10 shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white font-bold tracking-tight">AI Marketing Consultant</CardTitle>
                <p className="text-gray-400 font-medium">Personalized campaign optimization insights</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Brain className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to Optimize Your Campaigns</h3>
            <p className="text-gray-400 text-sm">Select a brand to start your consultation and get personalized AI recommendations</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#0a0a0a] border-[#1a1a1a] shadow-2xl overflow-hidden h-[1380px] flex flex-col">
      <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
                          flex items-center justify-center border border-white/10 shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-white font-bold tracking-tight">AI Marketing Consultant</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-400 font-medium">Personalized campaign optimization insights</p>
                <Badge className="bg-white/5 text-gray-300 border-white/10 text-xs px-2 py-1">
                  {remainingUses !== null ? `${remainingUses}/5 left today` : 'Beta'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex flex-col" style={{ height: 'calc(100% - 120px)' }}>
        {/* Marketing Goal Selection */}
        <div className="border-b border-[#1a1a1a] p-6 bg-[#0f0f0f]/50">
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-3 font-medium">Marketing Goal:</p>
            <div className="grid grid-cols-2 gap-3">
              {MARKETING_GOALS.map((goal) => (
                <Button
                  key={goal.id}
                  variant={selectedGoal === goal.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedGoal(goal.id)}
                  className={`h-auto p-3 text-left flex flex-col items-start gap-2 rounded-xl transition-all duration-300 min-h-[80px] w-full ${
                    selectedGoal === goal.id
                      ? "bg-white/10 text-white border-white/20 shadow-lg"
                      : "bg-[#0f0f0f] border-[#1a1a1a] text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedGoal === goal.id ? "bg-white/10" : "bg-white/5"
                    }`}>
                      {goal.icon}
                    </div>
                    <span className="text-sm font-semibold flex-1 truncate">{goal.title}</span>
                  </div>
                  <span className="text-xs text-gray-500 leading-tight w-full break-words overflow-hidden display-webkit-box" style={{
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                    display: '-webkit-box'
                  }}>
                    {goal.description}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-[#0f0f0f]/30" style={{ flex: '1 1 auto', maxHeight: '400px' }}>
          <ScrollArea className="h-full p-6">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.type === 'user'
                        ? 'bg-white/10 text-white border border-white/20'
                        : message.type === 'system'
                        ? 'bg-gray-500/10 text-gray-300 border border-gray-500/20'
                        : 'bg-[#0f0f0f] border border-[#1a1a1a] text-white shadow-lg'
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">{message.content}</span>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap space-y-2 leading-relaxed">
                        {message.content.split('\n\n').map((paragraph, index) => (
                          <p key={index} className="leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Quick Prompts */}
        <div className="border-t border-[#1a1a1a] p-6 bg-[#0f0f0f]/50">
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-3 font-medium">Choose a question:</p>
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`text-xs rounded-xl transition-all duration-300 ${
                    selectedCategory === category.id
                      ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                      : "bg-[#0f0f0f] border-[#1a1a1a] text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/10"
                  }`}
                >
                  {category.label} ({category.count})
                </Button>
              ))}
            </div>
          </div>
          
          <div className="grid gap-3 max-h-[300px] overflow-y-auto custom-scrollbar">
            {filteredPrompts.map((prompt) => (
              <Button
                key={prompt.id}
                variant="ghost"
                size="sm"
                onClick={() => handlePromptSelect(prompt)}
                disabled={isLoading || isLimitReached}
                className="justify-between h-auto p-4 text-left bg-[#0f0f0f] hover:bg-white/5 
                         border border-[#1a1a1a] hover:border-white/10 rounded-xl transition-all duration-300
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-gray-400">
                    {prompt.icon}
                  </div>
                  <span className="text-sm text-white font-medium">{prompt.title}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </Button>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-[#1a1a1a] flex items-center justify-between">
            <p className="text-xs text-gray-500">
              💡 I analyze your last 30 days of campaign data to provide personalized recommendations
            </p>
            {remainingUses !== null && (
              <div className={`text-xs px-3 py-1 rounded-full font-medium ${
                remainingUses <= 1 
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                  : remainingUses <= 3 
                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  : 'bg-green-500/10 text-green-400 border border-green-500/20'
              }`}>
                {remainingUses} questions remaining today
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 