"use client"

import { useState, useEffect, useRef } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { useAuth, useUser } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  PieChart,
  Building2,
  Store,
  ChevronDown,
  Send,
  FileText,
  UserPlus,
  Phone,
  CheckCircle,
  Filter
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

interface AIMode {
  id: 'brand' | 'agency'
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

interface PromptSuggestion {
  id: string
  icon: React.ReactNode
  title: string
  prompt: string
  category: 'performance' | 'optimization' | 'creative' | 'audience' | 'budget' | 'troubleshooting' | 'reports' | 'leadgen' | 'outreach' | 'agency'
  mode?: 'brand' | 'agency' | 'both'
}

interface MarketingGoal {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

const AI_MODES: AIMode[] = [
  {
    id: 'agency',
    title: 'Agency Assistant',
    description: 'Overall agency management and multi-brand insights',
    icon: <Building2 className="w-4 h-4" />,
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
  },
  {
    id: 'brand',
    title: 'Brand Assistant',
    description: 'Focus on specific brand optimization and insights',
    icon: <Store className="w-4 h-4" />,
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  }
]

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
  // Campaign Performance & Optimization
  {
    id: 'improve-roas',
    icon: <TrendingUp className="w-4 h-4" />,
    title: 'How can I improve my ROAS?',
    prompt: 'Analyze my last 30 days of campaign data and provide specific recommendations to improve my return on ad spend (ROAS). Focus on budget allocation, audience targeting, and creative performance.',
    category: 'performance',
    mode: 'brand'
  },
  {
    id: 'scale-winners',
    icon: <Zap className="w-4 h-4" />,
    title: 'Which campaigns should I scale?',
    prompt: 'Based on my recent performance data, identify which campaigns, ad sets, or creatives I should scale up and which ones I should pause or optimize. Provide specific scaling strategies.',
    category: 'optimization',
    mode: 'brand'
  },
  {
    id: 'audience-insights',
    icon: <Users className="w-4 h-4" />,
    title: 'What audiences work best?',
    prompt: 'Analyze my audience performance data and identify which demographics, interests, and behavioral segments are driving the best results. Suggest new audience opportunities.',
    category: 'audience',
    mode: 'brand'
  },
  {
    id: 'creative-fatigue',
    icon: <Clock className="w-4 h-4" />,
    title: 'Check for ad fatigue before ROAS drops',
    prompt: 'Analyze my ad creatives for early signs of fatigue by examining creative runtime, frequency, engagement trends, and performance decay patterns. Identify which creatives are at risk of declining performance BEFORE they significantly impact ROAS. Provide specific recommendations for creative rotation and refresh timing.',
    category: 'creative',
    mode: 'brand'
  },
  {
    id: 'creative-refresh',
    icon: <Sparkles className="w-4 h-4" />,
    title: 'Which creatives need refreshing?',
    prompt: 'Examine my ad creative performance and identify which ones are showing signs of fatigue or declining performance. Recommend creative refresh strategies and winning elements to replicate.',
    category: 'creative',
    mode: 'brand'
  },
  {
    id: 'budget-optimization',
    icon: <Target className="w-4 h-4" />,
    title: 'How should I reallocate my budget?',
    prompt: 'Analyze my current budget distribution across campaigns and ad sets. Recommend optimal budget reallocation to maximize ROI based on performance data and trends.',
    category: 'budget',
    mode: 'brand'
  },

  // Reports & Analytics
  {
    id: 'generate-performance-report',
    icon: <FileText className="w-4 h-4" />,
    title: 'Generate a performance report',
    prompt: 'Create a comprehensive performance report for the last 30 days including key metrics, trends, insights, and actionable recommendations. Include graphs and data visualizations where helpful.',
    category: 'reports',
    mode: 'both'
  },
  {
    id: 'weekly-summary-report',
    icon: <BarChart3 className="w-4 h-4" />,
    title: 'Create weekly summary report',
    prompt: 'Generate a weekly summary report highlighting this week\'s performance vs last week, key wins, areas for improvement, and next week\'s recommendations.',
    category: 'reports',
    mode: 'both'
  },
  {
    id: 'roi-analysis-report',
    icon: <DollarSign className="w-4 h-4" />,
    title: 'ROI analysis report',
    prompt: 'Analyze return on investment across all campaigns and create a detailed ROI report with recommendations for improving profitability and scaling high-performing initiatives.',
    category: 'reports',
    mode: 'both'
  },

  // Lead Generation
  {
    id: 'lead-gen-strategy',
    icon: <UserPlus className="w-4 h-4" />,
    title: 'Optimize lead generation strategy',
    prompt: 'Review my current lead generation campaigns and landing pages. Provide specific recommendations to improve lead quality, reduce cost per lead, and increase conversion rates.',
    category: 'leadgen',
    mode: 'brand'
  },
  {
    id: 'lead-scoring-optimization',
    icon: <Target className="w-4 h-4" />,
    title: 'Improve lead scoring and qualification',
    prompt: 'Analyze my lead data to help create better lead scoring criteria. Identify patterns in high-quality leads and recommend ways to optimize lead qualification processes.',
    category: 'leadgen',
    mode: 'brand'
  },
  {
    id: 'landing-page-optimization',
    icon: <Eye className="w-4 h-4" />,
    title: 'Optimize landing pages for conversions',
    prompt: 'Review landing page performance data and provide recommendations for improving conversion rates, reducing bounce rates, and enhancing user experience.',
    category: 'leadgen',
    mode: 'brand'
  },

  // Outreach & Client Management
  {
    id: 'client-outreach-strategy',
    icon: <Phone className="w-4 h-4" />,
    title: 'Develop client outreach strategy',
    prompt: 'Help me create effective outreach sequences and messaging for prospective clients. Include email templates, timing recommendations, and follow-up strategies.',
    category: 'outreach',
    mode: 'agency'
  },
  {
    id: 'client-retention-analysis',
    icon: <Users className="w-4 h-4" />,
    title: 'Analyze client retention patterns',
    prompt: 'Review client data to identify patterns in client retention and churn. Provide recommendations for improving client satisfaction and reducing churn rates.',
    category: 'outreach',
    mode: 'agency'
  },
  {
    id: 'proposal-optimization',
    icon: <FileText className="w-4 h-4" />,
    title: 'Optimize proposals and pitches',
    prompt: 'Help me improve my agency proposals and pitch presentations. Analyze successful proposals and recommend improvements for winning more clients.',
    category: 'outreach',
    mode: 'agency'
  },

  // Agency Management
  {
    id: 'brands-need-focus',
    icon: <AlertTriangle className="w-4 h-4" />,
    title: 'Which brands need immediate attention?',
    prompt: 'Analyze all my brands and identify which ones need immediate attention or intervention. Look for sudden performance drops, declining ROAS, creative fatigue patterns, and budget inefficiencies. Provide prioritized action items for each brand requiring attention.',
    category: 'agency',
    mode: 'agency'
  },
  {
    id: 'performance-fluctuations',
    icon: <Activity className="w-4 h-4" />,
    title: 'Detect performance fluctuations',
    prompt: 'Scan all brands for sudden fluctuations in key metrics (ROAS, CPC, CTR, conversion rates). Identify potential causes and predict what might happen next based on historical patterns and current trends. Flag any brands showing early warning signs.',
    category: 'agency',
    mode: 'agency'
  },
  {
    id: 'predictive-analysis',
    icon: <TrendingUp className="w-4 h-4" />,
    title: 'What will happen to my brands next?',
    prompt: 'Analyze current trends across all my brands and provide predictive insights. Based on historical patterns, seasonal factors, and current performance trajectory, forecast what is likely to happen in the next 7-30 days. Include recommendations to capitalize on opportunities or prevent issues.',
    category: 'agency',
    mode: 'agency'
  },
  {
    id: 'available-reports',
    icon: <FileText className="w-4 h-4" />,
    title: 'What reports are available?',
    prompt: 'Show me what reports I can generate for my brands. Include performance reports, ROI analysis, weekly summaries, and any other available analytics.',
    category: 'agency',
    mode: 'agency'
  },
  {
    id: 'campaign-optimizations',
    icon: <Zap className="w-4 h-4" />,
    title: 'Available campaign optimizations',
    prompt: 'Identify campaign optimization opportunities across all my brands. What campaigns can be scaled, paused, or need immediate attention?',
    category: 'agency',
    mode: 'agency'
  },
  {
    id: 'multi-brand-performance',
    icon: <Building2 className="w-4 h-4" />,
    title: 'Compare performance across brands',
    prompt: 'Analyze performance across all my brands. Identify top performers, underperformers, and opportunities for cross-brand learnings and optimizations.',
    category: 'agency',
    mode: 'agency'
  },
  {
    id: 'resource-allocation',
    icon: <Settings className="w-4 h-4" />,
    title: 'Optimize resource allocation',
    prompt: 'Help me optimize how I allocate time, budget, and resources across different brands and campaigns. Identify areas where I should focus more or less attention.',
    category: 'agency',
    mode: 'agency'
  },
  {
    id: 'agency-growth-strategy',
    icon: <TrendingUp className="w-4 h-4" />,
    title: 'Develop agency growth strategy',
    prompt: 'Based on my current agency performance, help me develop a growth strategy. Include recommendations for scaling successful approaches and expanding into new opportunities.',
    category: 'agency',
    mode: 'agency'
  },
  {
    id: 'top-performing-brands',
    icon: <CheckCircle className="w-4 h-4" />,
    title: 'Which brands are performing best?',
    prompt: 'Identify my top-performing brands and analyze what makes them successful. How can I replicate these strategies across other brands?',
    category: 'agency',
    mode: 'agency'
  },

  // Troubleshooting
  {
    id: 'performance-drops',
    icon: <AlertTriangle className="w-4 h-4" />,
    title: 'Why did my performance drop?',
    prompt: 'Investigate any recent drops in my campaign performance. Analyze metrics like CTR, CPC, ROAS, and conversion rates to identify potential causes and solutions.',
    category: 'troubleshooting',
    mode: 'brand'
  },
  {
    id: 'ad-fatigue',
    icon: <Clock className="w-4 h-4" />,
    title: 'Are my ads experiencing fatigue?',
    prompt: 'Check my ad frequency, engagement rates, and performance trends to identify ad fatigue issues and recommend refresh strategies.',
    category: 'troubleshooting',
    mode: 'brand'
  },
  {
    id: 'conversion-tracking',
    icon: <Activity className="w-4 h-4" />,
    title: 'Is my conversion tracking optimized?',
    prompt: 'Analyze my conversion data patterns and tracking setup to identify potential issues or optimization opportunities in my measurement and attribution.',
    category: 'troubleshooting',
    mode: 'brand'
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
  const [selectedMode, setSelectedMode] = useState<'brand' | 'agency'>('agency')
  const [remainingUses, setRemainingUses] = useState<number | null>(null)
  const [isLimitReached, setIsLimitReached] = useState(false)
  const [inputMessage, setInputMessage] = useState('')

  // Initialize with welcome message
  useEffect(() => {
    if ((selectedMode === 'brand' && !selectedBrandId) || isInitialized) return

    const selectedGoalData = MARKETING_GOALS.find(g => g.id === selectedGoal)
    const selectedModeData = AI_MODES.find(m => m.id === selectedMode)
    
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'system',
      content: selectedMode === 'agency' 
        ? `👋 Hi ${user?.firstName || 'there'}! I'm your ${selectedModeData?.title} focused on ${selectedGoalData?.title.toLowerCase() || 'general optimization'}. I can analyze your entire agency performance, help with multi-brand insights, client management, and business growth. Choose a question below or type your own!`
        : `👋 Hi ${user?.firstName || 'there'}! I'm your ${selectedModeData?.title} focused on ${selectedGoalData?.title.toLowerCase() || 'general optimization'}. I can analyze your campaign data and provide personalized brand recommendations. Choose a question below or type your own!`,
      timestamp: new Date()
    }

    setMessages([welcomeMessage])
    setIsInitialized(true)
  }, [selectedBrandId, user, isInitialized, selectedGoal, selectedMode])

  // Reset conversation when goal changes
  useEffect(() => {
    if (isInitialized) {
      setMessages([])
      setIsInitialized(false)
    }
  }, [selectedGoal])

  // Check initial usage status on component mount
  useEffect(() => {
    const checkInitialUsage = async () => {
      if (!user?.id || (selectedMode === 'brand' && !selectedBrandId)) return
      
      try {
        const response = await fetch('/api/ai/marketing-consultant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '',
            mode: selectedMode,
            goal: selectedGoal,
            brandId: selectedBrandId,
            checkUsageOnly: true
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.remainingUses !== undefined) {
            setRemainingUses(data.remainingUses)
            setIsLimitReached(!data.canUse)
          }
        }
      } catch (error) {
        console.error('[AI Marketing] Error checking initial usage:', error)
      }
    }
    
    checkInitialUsage()
  }, [user?.id, selectedBrandId, selectedMode])

  // Listen for refresh events to reset conversation with fresh data
  useEffect(() => {
    if (selectedMode === 'brand' && !selectedBrandId) return

    let refreshTimeout: NodeJS.Timeout

    const handleRefreshEvent = (event: CustomEvent) => {
      const { brandId, source } = event.detail
      
      // For brand mode, only refresh if it's for the current brand
      // For agency mode, refresh on any brand update
      const shouldRefresh = selectedMode === 'agency' || 
                           (selectedMode === 'brand' && brandId === selectedBrandId)
      
      if (shouldRefresh && source !== 'AIMarketingConsultant') {
        console.log('[AIMarketingConsultant] Refresh event triggered, resetting conversation for fresh data analysis...', { source, mode: selectedMode })
        
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
            content: selectedMode === 'agency'
              ? `🔄 Data updated! I'm now analyzing your latest agency performance. I can provide fresh insights based on your most recent ${selectedGoalData?.title.toLowerCase() || 'general optimization'} data. Ask me anything about your current performance!`
              : `🔄 Data updated! I'm now analyzing your latest campaign performance. I can provide fresh insights based on your most recent ${selectedGoalData?.title.toLowerCase() || 'general optimization'} data. Ask me anything about your current performance!`,
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
  }, [selectedBrandId, selectedGoal, selectedMode, user])

  // Auto-scroll to bottom of chat container when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      // Add a small delay to ensure content is rendered before scrolling
      setTimeout(() => {
        if (messagesEndRef.current) {
          // Scroll to bottom with smooth behavior
          messagesEndRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end',
            inline: 'nearest'
          })
        }
      }, 100)
    }
  }, [messages])

  // Check initial usage status when component mounts
  useEffect(() => {
    const checkInitialUsage = async () => {
      if (selectedMode === 'brand' && !selectedBrandId) return
      
      try {
        const response = await fetch('/api/ai/marketing-consultant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brandId: selectedMode === 'brand' ? selectedBrandId : null,
            prompt: '', // Empty prompt to just check usage
            marketingGoal: selectedGoal,
            mode: selectedMode,
            checkUsageOnly: true, // Flag to indicate we only want usage info
            userContext: {
              name: user?.firstName || 'there'
            }
          }),
        })

        const data = await response.json()
        
        if (response.ok && data.remainingUses !== undefined) {
          console.log('[AI Marketing Frontend] Initial usage check:', data.remainingUses)
          setRemainingUses(data.remainingUses)
          if (data.remainingUses <= 0) {
            setIsLimitReached(true)
          }
        }
      } catch (error) {
        console.log('[AI Marketing Frontend] Failed to check initial usage:', error)
        // Don't show error to user for this background check
      }
    }

    checkInitialUsage()
  }, [selectedMode, selectedBrandId, selectedGoal, user?.firstName])

  const filteredPrompts = selectedCategory === 'all' 
    ? PROMPT_SUGGESTIONS.filter(p => p.mode === selectedMode || p.mode === 'both')
    : PROMPT_SUGGESTIONS.filter(p => p.category === selectedCategory && (p.mode === selectedMode || p.mode === 'both'))

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
      content: selectedMode === 'agency' ? 'Analyzing your agency data...' : 'Analyzing your campaign data...',
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

  const handleCustomInput = async (customPrompt: string) => {
    if (isLoading || isLimitReached || !customPrompt.trim()) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: customPrompt,
      timestamp: new Date()
    }

    // Add loading assistant message
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: selectedMode === 'agency' ? 'Analyzing your agency data...' : 'Analyzing your campaign data...',
      timestamp: new Date(),
      isLoading: true
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setIsLoading(true)
    setInputMessage('')

    try {
      await analyzeAndRespond(customPrompt, assistantMessage.id)
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
          brandId: selectedMode === 'brand' ? selectedBrandId : null,
          prompt,
          marketingGoal: selectedGoal,
          mode: selectedMode,
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
      console.log('[AI Marketing Frontend] API Response:', data)
      if (data.remainingUses !== undefined) {
        console.log('[AI Marketing Frontend] Setting remaining uses:', data.remainingUses)
        setRemainingUses(data.remainingUses)
        if (data.remainingUses <= 0) {
          setIsLimitReached(true)
        }
      } else {
        console.log('[AI Marketing Frontend] No remainingUses in response!')
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
    { id: 'all', label: 'All', count: filteredPrompts.length },
    { id: 'performance', label: 'Performance', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'performance' && (p.mode === selectedMode || p.mode === 'both')).length },
    { id: 'optimization', label: 'Optimization', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'optimization' && (p.mode === selectedMode || p.mode === 'both')).length },
    { id: 'audience', label: 'Audience', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'audience' && (p.mode === selectedMode || p.mode === 'both')).length },
    { id: 'creative', label: 'Creative', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'creative' && (p.mode === selectedMode || p.mode === 'both')).length },
    { id: 'budget', label: 'Budget', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'budget' && (p.mode === selectedMode || p.mode === 'both')).length },
    { id: 'reports', label: 'Reports', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'reports' && (p.mode === selectedMode || p.mode === 'both')).length },
    { id: 'leadgen', label: 'Lead Gen', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'leadgen' && (p.mode === selectedMode || p.mode === 'both')).length },
    { id: 'outreach', label: 'Outreach', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'outreach' && (p.mode === selectedMode || p.mode === 'both')).length },
    { id: 'agency', label: 'Agency', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'agency' && (p.mode === selectedMode || p.mode === 'both')).length },
    { id: 'troubleshooting', label: 'Troubleshooting', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'troubleshooting' && (p.mode === selectedMode || p.mode === 'both')).length }
  ].filter(cat => cat.count > 0)

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

  if (selectedMode === 'brand' && !selectedBrandId) {
    return (
      <Card className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-2xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>
        <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
                            flex items-center justify-center border border-white/10 shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white font-bold tracking-tight">
                  AI Marketing Assistant
                </CardTitle>
                <p className="text-gray-400 font-medium">Your intelligent marketing optimization partner</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 flex-1 flex items-center justify-center">
          <div className="text-center py-12 max-w-md">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Store className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to Optimize</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Switch to Agency mode for multi-brand insights, or select a brand to get personalized campaign optimization recommendations.
            </p>
            <Button
              onClick={() => setSelectedMode('agency')}
              className="bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-2 rounded-lg border border-white/20 transition-all duration-300"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Switch to Agency Mode
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen flex gap-4 p-6">
      {/* Left Column - Controls and Quick Actions (25%) */}
      <Card className="bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] border border-[#222] rounded-2xl overflow-hidden flex flex-col shadow-2xl" style={{ width: '25%', height: 'calc(100vh - 3rem)' }}>
        <CardContent className="p-0 flex flex-col h-full">
        {/* Header with Title and Mode/Focus Controls */}
        <div className="border-b border-[#1a1a1a] p-4 bg-gradient-to-r from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f]">
          <div className="flex flex-col gap-4">
            {/* Title and Usage Counter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-white/10 to-gray-200/20 rounded-xl 
                              flex items-center justify-center border border-white/10 shadow-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">AI Marketing Assistant</h2>
                  <p className="text-gray-400 text-sm">Intelligent campaign optimization insights</p>
                </div>
              </div>
              
              {/* Usage Counter in Header */}
              {remainingUses !== null && (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 shadow-sm">
                  <MessageCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-white">{remainingUses}/15 left today</span>
                </div>
              )}
            </div>
            
            {/* Mode Selector */}
            <div className="flex items-center gap-2 p-1 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] shadow-inner">
              {AI_MODES.map((mode) => (
                <Button
                  key={mode.id}
                  variant={selectedMode === mode.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setSelectedMode(mode.id)
                    setMessages([])
                    setIsInitialized(false)
                    setSelectedCategory('all')
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-300 ${
                    selectedMode === mode.id
                      ? "bg-gradient-to-r from-white/10 to-gray-200/20 text-white border border-white/20 shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {mode.icon}
                  {mode.title}
                </Button>
              ))}
            </div>

            {/* Focus Area Dropdown - Bigger */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-400 font-medium">Marketing Focus:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="bg-[#0a0a0a] border-[#1a1a1a] text-white hover:bg-white/5 hover:border-white/10 rounded-lg h-12 px-4 justify-start"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                        {MARKETING_GOALS.find(g => g.id === selectedGoal)?.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <span className="font-medium text-white">{MARKETING_GOALS.find(g => g.id === selectedGoal)?.title}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72 bg-[#0a0a0a] border-[#1a1a1a] rounded-xl shadow-2xl">
                  {MARKETING_GOALS.map((goal) => (
                    <DropdownMenuItem
                      key={goal.id}
                      onClick={() => setSelectedGoal(goal.id)}
                      className="focus:bg-white/5 cursor-pointer p-4 rounded-lg m-1"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                          {goal.icon}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">{goal.title}</div>
                          <div className="text-xs text-gray-400 mt-1 leading-relaxed">{goal.description}</div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Quick Prompts Section */}
        <div className="p-4 bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] flex flex-col flex-1 min-h-0">
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-3 font-semibold">Quick Actions:</p>
            <div className="flex gap-1 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`text-xs rounded-lg px-2 py-1 transition-all duration-300 font-medium ${
                    selectedCategory === category.id
                      ? "bg-gradient-to-r from-white/10 to-gray-200/20 text-white border border-white/20 shadow-lg"
                      : "bg-[#0a0a0a] border-[#1a1a1a] text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2 flex-1 overflow-y-auto">
            {filteredPrompts.slice(0, 12).map((prompt) => (
              <Button
                key={prompt.id}
                variant="ghost"
                size="sm"
                onClick={() => handlePromptSelect(prompt)}
                disabled={isLoading || isLimitReached}
                className="justify-start h-auto p-3 text-left bg-gradient-to-r from-[#0a0a0a] to-[#0f0f0f] hover:from-white/5 hover:to-white/10 
                         border border-[#1a1a1a] hover:border-white/10 rounded-lg transition-all duration-300
                         disabled:opacity-50 disabled:cursor-not-allowed shadow-lg group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 bg-white/5 rounded-md flex items-center justify-center text-gray-400 group-hover:text-white transition-colors border border-white/5 flex-shrink-0">
                    {prompt.icon}
                  </div>
                  <span className="text-xs text-white font-medium group-hover:text-white transition-colors leading-tight truncate">{prompt.title}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>
        </CardContent>
      </Card>

      {/* Right Column - Chat and Results (75%) */}
      <Card className="bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] border border-[#222] rounded-2xl overflow-hidden flex flex-col shadow-2xl" style={{ width: '75%', height: 'calc(100vh - 3rem)' }}>
        <CardContent className="p-0 flex flex-col h-full">
          {/* Chat Messages */}
          <div className="bg-[#0a0a0a]/50 backdrop-blur-sm" style={{ flex: '1 1 auto', minHeight: '300px' }}>
            <ScrollArea className="h-full p-6">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl p-4 ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-white/10 to-gray-200/20 text-white border border-white/20 shadow-lg'
                          : message.type === 'system'
                          ? 'bg-gradient-to-r from-gray-500/10 to-gray-600/10 text-gray-300 border border-gray-500/20 shadow-lg'
                          : 'bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border border-[#1a1a1a] text-white shadow-2xl'
                      }`}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm font-medium">{message.content}</span>
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap space-y-3 leading-relaxed">
                          {message.content.split('\n\n').map((paragraph, index) => (
                            <p key={index} className="leading-relaxed">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-3 font-medium">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
                {/* Bottom buffer to allow scrolling past last message */}
                <div className="h-32" />
              </div>
            </ScrollArea>
          </div>

          {/* Custom Input Field */}
          <div className="border-t border-[#1a1a1a] p-4 bg-gradient-to-r from-[#0a0a0a] to-[#0f0f0f]">
            <div className="flex gap-3 max-w-4xl mx-auto">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleCustomInput(inputMessage)
                    }
                  }}
                  placeholder={selectedMode === 'agency' 
                    ? "Ask me anything about your agency performance, brands, or growth strategies..." 
                    : "Ask me anything about your marketing campaigns..."}
                  disabled={isLoading || isLimitReached}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white/30 focus:bg-white/5 transition-all duration-300 text-sm shadow-inner"
                />
              </div>
              <Button
                onClick={() => handleCustomInput(inputMessage)}
                disabled={isLoading || isLimitReached || !inputMessage.trim()}
                className="px-4 py-3 bg-gradient-to-r from-white/10 to-gray-200/20 hover:from-white/20 hover:to-gray-200/30 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 shadow-lg"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 