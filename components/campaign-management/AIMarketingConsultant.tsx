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
  PieChart,
  Building2,
  Store,
  Send,
  FileText,
  UserPlus,
  Phone,
  CheckCircle,
  Filter,
  ArrowUp
} from "lucide-react"
import BrandSelector from "@/components/BrandSelector"
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
  category: 'performance' | 'optimization' | 'creative' | 'audience' | 'budget' | 'troubleshooting' | 'reports' | 'leadgen' | 'outreach' | 'agency' | 'seasonal' | 'email-sms'
  mode?: 'brand' | 'agency' | 'both'
}









const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  // Seasonal & Holiday Marketing (NEW)
  {
    id: 'upcoming-holidays',
    icon: <Sparkles className="w-4 h-4" />,
    title: 'What upcoming holidays should I advertise for?',
    prompt: 'Based on the current date and my business type, recommend upcoming holiday opportunities, seasonal events, and marketing moments I should prepare campaigns for. Include timeline recommendations for when to start planning and launching each campaign.',
    category: 'seasonal',
    mode: 'both'
  },
  {
    id: 'black-friday-strategy',
    icon: <DollarSign className="w-4 h-4" />,
    title: 'Create Black Friday campaign strategy',
    prompt: 'Help me develop a comprehensive Black Friday and Cyber Monday marketing strategy. Include pre-launch, launch day, and post-holiday tactics, budget recommendations, creative concepts, and audience targeting strategies.',
    category: 'seasonal',
    mode: 'both'
  },
  {
    id: 'back-to-school-marketing',
    icon: <UserPlus className="w-4 h-4" />,
    title: 'Back-to-school marketing opportunities',
    prompt: 'Identify back-to-school marketing opportunities for my business. Suggest campaign themes, timing, target audiences, and creative concepts that align with the back-to-school season.',
    category: 'seasonal',
    mode: 'both'
  },
  {
    id: 'seasonal-content-calendar',
    icon: <Clock className="w-4 h-4" />,
    title: 'Create seasonal content calendar',
    prompt: 'Help me create a 3-month seasonal marketing calendar identifying key holidays, events, and opportunities to advertise. Include suggested campaign types, budget allocation, and creative themes for each opportunity.',
    category: 'seasonal',
    mode: 'both'
  },

  // SMS & Email Marketing (NEW)
  {
    id: 'sms-strategy',
    icon: <Phone className="w-4 h-4" />,
    title: 'SMS marketing strategy for my brand',
    prompt: 'Based on my Shopify data including cart abandonment rates, conversion rates, and customer behavior, recommend a comprehensive SMS marketing strategy. Include list building tactics, segmentation strategies, message timing, automation sequences, and specific SMS campaigns that would work best for my brand.',
    category: 'email-sms',
    mode: 'brand'
  },
  {
    id: 'email-retargeting',
    icon: <FileText className="w-4 h-4" />,
    title: 'Email retargeting campaign recommendations',
    prompt: 'Analyze my Shopify conversion funnel data (add-to-cart rates, checkout completion, etc.) and recommend targeted email campaigns. Include cart abandonment sequences, browse abandonment emails, post-purchase follow-ups, and win-back campaigns based on my specific customer behavior patterns.',
    category: 'email-sms',
    mode: 'brand'
  },
  {
    id: 'list-building-strategy',
    icon: <UserPlus className="w-4 h-4" />,
    title: 'Build email/SMS subscriber lists',
    prompt: 'Based on my brand\'s performance data and customer journey, recommend strategies to grow my email and SMS subscriber lists. Include lead magnets, opt-in incentives, pop-up strategies, and integration tactics that align with my conversion rates and customer lifetime value.',
    category: 'email-sms',
    mode: 'brand'
  },
  {
    id: 'automation-sequences',
    icon: <Activity className="w-4 h-4" />,
    title: 'Marketing automation sequences',
    prompt: 'Design automated email and SMS sequences based on my Shopify customer data. Include welcome series, abandoned cart recovery, post-purchase upsells, re-engagement campaigns, and VIP customer nurturing flows optimized for my brand\'s metrics.',
    category: 'email-sms',
    mode: 'brand'
  },

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

  // Creative Studio & Tools (NEW)
  {
    id: 'creative-studio-tips',
    icon: <Sparkles className="w-4 h-4" />,
    title: 'How to use Creative Studio effectively?',
    prompt: 'Give me tips on using the Creative Studio tool to generate high-converting ad creatives. Include best practices for prompts, image selection, text overlays, and how to iterate on generated creatives for better performance.',
    category: 'creative',
    mode: 'both'
  },
  {
    id: 'outreach-optimization',
    icon: <Phone className="w-4 h-4" />,
    title: 'Optimize my outreach campaigns',
    prompt: 'Review my current outreach campaigns and lead generation efforts. Provide recommendations for improving message response rates, lead qualification, and follow-up sequences.',
    category: 'outreach',
    mode: 'both'
  },
  {
    id: 'brand-report-insights',
    icon: <FileText className="w-4 h-4" />,
    title: 'Generate brand performance insights',
    prompt: 'Create comprehensive insights from my latest brand reports. Identify key trends, opportunities, and actionable recommendations based on my brand health data.',
    category: 'reports',
    mode: 'both'
  },
  {
    id: 'lead-generator-strategy',
    icon: <Target className="w-4 h-4" />,
    title: 'Improve lead generation strategy',
    prompt: 'Analyze my lead generation efforts and suggest improvements. Include recommendations for better targeting, landing page optimization, and lead nurturing workflows.',
    category: 'leadgen',
    mode: 'both'
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
  {
    id: 'client-acquisition-strategy',
    icon: <UserPlus className="w-4 h-4" />,
    title: 'Develop client acquisition strategy',
    prompt: 'Help me create a systematic approach for acquiring new clients. Include prospecting strategies, outreach templates, pricing models, and qualification criteria for ideal clients.',
    category: 'agency',
    mode: 'agency'
  },
  {
    id: 'agency-efficiency-audit',
    icon: <Activity className="w-4 h-4" />,
    title: 'Audit agency operational efficiency',
    prompt: 'Analyze my agency operations and identify areas for improvement. Look at workflow optimization, client communication, reporting processes, and resource allocation to recommend efficiency gains.',
    category: 'agency',
    mode: 'agency'
  },
  {
    id: 'cross-brand-optimization',
    icon: <Building2 className="w-4 h-4" />,
    title: 'Cross-brand optimization opportunities',
    prompt: 'Identify optimization strategies that can be applied across multiple brands. Look for successful tactics from high-performing brands that could benefit underperforming ones.',
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
  },

  // Marketing Focus Quick Actions
  {
    id: 'focus-general-optimization',
    icon: <TrendingUp className="w-4 h-4" />,
    title: 'Focus on General Optimization',
    prompt: 'Help me with general campaign performance and ROI improvement. Analyze my overall marketing effectiveness and provide optimization recommendations.',
    category: 'focus',
    mode: 'both'
  },
  {
    id: 'focus-holiday-campaign',
    icon: <Sparkles className="w-4 h-4" />,
    title: 'Focus on Holiday Campaign',
    prompt: 'Help me plan and optimize holiday campaigns including Black Friday, Christmas, and seasonal promotions. Provide timing, creative, and budget recommendations.',
    category: 'focus',
    mode: 'both'
  },
  {
    id: 'focus-lead-generation',
    icon: <Target className="w-4 h-4" />,
    title: 'Focus on Lead Generation',
    prompt: 'Focus on capturing and qualifying leads. Analyze my lead generation funnels and provide recommendations to improve lead quality, reduce cost per lead, and increase conversion rates.',
    category: 'focus',
    mode: 'both'
  },
  {
    id: 'focus-product-launch',
    icon: <Zap className="w-4 h-4" />,
    title: 'Focus on Product Launch',
    prompt: 'Help me launch new products or services. Provide campaign strategies, creative concepts, and audience targeting recommendations for product launches.',
    category: 'focus',
    mode: 'both'
  },
  {
    id: 'focus-brand-awareness',
    icon: <Eye className="w-4 h-4" />,
    title: 'Focus on Brand Awareness',
    prompt: 'Focus on building brand recognition and reach. Help me create campaigns that increase brand visibility and engagement across my target audience.',
    category: 'focus',
    mode: 'both'
  },
  {
    id: 'focus-customer-retention',
    icon: <Settings className="w-4 h-4" />,
    title: 'Focus on Customer Retention',
    prompt: 'Focus on retargeting and customer lifetime value. Help me create strategies to retain existing customers and increase their lifetime value.',
    category: 'focus',
    mode: 'both'
  },

  // Additional Useful Quick Actions
  {
    id: 'quick-analysis',
    icon: <BarChart3 className="w-4 h-4" />,
    title: 'Quick Performance Analysis',
    prompt: 'Give me a quick overview of my current campaign performance. Highlight the most important metrics, trends, and immediate action items.',
    category: 'analysis',
    mode: 'both'
  },
  {
    id: 'creative-review',
    icon: <Sparkles className="w-4 h-4" />,
    title: 'Review My Creative Assets',
    prompt: 'Analyze my ad creative performance. Identify which creatives are working well and which ones need to be refreshed or optimized.',
    category: 'creative',
    mode: 'both'
  },
  {
    id: 'budget-recommendation',
    icon: <DollarSign className="w-4 h-4" />,
    title: 'Budget Allocation Advice',
    prompt: 'Review my current budget distribution and provide recommendations for optimal budget reallocation to maximize ROI.',
    category: 'budget',
    mode: 'both'
  },
  {
    id: 'competitor-insights',
    icon: <TrendingUp className="w-4 h-4" />,
    title: 'Competitor Analysis',
    prompt: 'Based on my industry and performance data, provide insights on competitor strategies and opportunities for competitive advantage.',
    category: 'analysis',
    mode: 'both'
  },
  {
    id: 'automation-opportunities',
    icon: <Activity className="w-4 h-4" />,
    title: 'Automation Recommendations',
    prompt: 'Identify opportunities to automate my marketing workflows. Suggest tools, processes, and strategies to improve efficiency and scale.',
    category: 'optimization',
    mode: 'both'
  },
  {
    id: 'market-trends',
    icon: <TrendingUp className="w-4 h-4" />,
    title: 'Current Market Trends',
    prompt: 'Analyze current market trends in my industry and provide recommendations on how to adapt my marketing strategy accordingly.',
    category: 'analysis',
    mode: 'both'
  },
  {
    id: 'conversion-optimization',
    icon: <Target className="w-4 h-4" />,
    title: 'Optimize Conversion Funnel',
    prompt: 'Review my conversion funnel from awareness to purchase. Identify bottlenecks and provide specific recommendations to improve conversion rates.',
    category: 'optimization',
    mode: 'both'
  },
  {
    id: 'content-strategy',
    icon: <FileText className="w-4 h-4" />,
    title: 'Content Strategy Review',
    prompt: 'Analyze my content performance and provide recommendations for a comprehensive content marketing strategy.',
    category: 'creative',
    mode: 'both'
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
  const { selectedBrandId, brands, setSelectedBrandId } = useBrandContext()
  const { user } = useUser()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const [remainingUses, setRemainingUses] = useState<number | null>(null)
  const [isLimitReached, setIsLimitReached] = useState(false)
  const [inputMessage, setInputMessage] = useState('')

  // Initialize with welcome message
  useEffect(() => {
    if (isInitialized) return

    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'system',
      content: `👋 Hi ${user?.firstName || 'there'}! I'm your AI Marketing Consultant that works with both individual brands and your entire agency.

For agency-wide questions: "show me last Christmas performance", "compare Q1 vs Q2", "analyze my worst campaigns from last year", "what marketing strategies should I try?"
For brand-specific questions: Select a brand from the sidebar first, then ask about that brand's performance, scaling, or optimization strategies

I can help with literally anything marketing-related - scaling strategies, creative optimization, budget allocation, competitive analysis, and more. Choose a question below or type your own!`,
      timestamp: new Date()
    }

    setMessages([welcomeMessage])
    setIsInitialized(true)
  }, [user, isInitialized])



  // Check initial usage status on component mount
  useEffect(() => {
    const checkInitialUsage = async () => {
      if (!user?.id) return
      
      try {
        const response = await fetch('/api/ai/marketing-consultant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '',
            mode: selectedBrandId ? 'brand' : 'agency',
            goal: 'general', // Default to general since we removed the focus selector
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
  }, [user?.id, selectedBrandId])

  // Listen for refresh events to reset conversation with fresh data
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout

    const handleRefreshEvent = (event: CustomEvent) => {
      const { brandId, source } = event.detail

      // Refresh if it's for the selected brand or for agency-wide updates
      const shouldRefresh = !selectedBrandId || brandId === selectedBrandId

      if (shouldRefresh && source !== 'AIMarketingConsultant') {
        console.log('[AIMarketingConsultant] Refresh event triggered, resetting conversation for fresh data analysis...', { source, brandId: selectedBrandId })
        
        // Clear existing conversation and reset
        clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(() => {
          // Reset conversation to get fresh analysis with new data
          setMessages([])
          setIsInitialized(false)
          setRemainingUses(null)
          setIsLimitReached(false)
          
          // Re-initialize with fresh welcome message
          const welcomeMessage: ChatMessage = {
            id: 'welcome-refresh',
            type: 'system',
            content: selectedBrandId
              ? `🔄 Data updated! I'm now analyzing your latest campaign performance for ${brands.find(b => b.id === selectedBrandId)?.name || 'this brand'}. I can provide fresh insights based on your most recent data. Ask me anything about your current performance!`
              : `🔄 Data updated! I'm now analyzing your latest agency performance. I can provide fresh insights based on your most recent data. Ask me anything about your current performance!`,
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
  }, [selectedBrandId, user, brands])

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

      
      try {
        const response = await fetch('/api/ai/marketing-consultant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brandId: selectedBrandId,
            prompt: '', // Empty prompt to just check usage
            marketingGoal: 'general', // Default to general since we removed the focus selector
            mode: selectedBrandId ? 'brand' : 'agency',
            checkUsageOnly: true, // Flag to indicate we only want usage info
            userContext: {
              name: user?.firstName || 'there'
            }
          }),
        })

        const data = await response.json()
        
        if (response.ok && data.remainingUses !== undefined) {
          // console.log('[AI Marketing Frontend] Initial usage check:', data.remainingUses)
          setRemainingUses(data.remainingUses)
          if (data.remainingUses <= 0) {
            setIsLimitReached(true)
          }
        }
      } catch (error) {
        // console.log('[AI Marketing Frontend] Failed to check initial usage:', error)
        // Don't show error to user for this background check
      }
    }

    checkInitialUsage()
  }, [selectedBrandId, user?.firstName])

  const filteredPrompts = selectedCategory === 'all'
    ? PROMPT_SUGGESTIONS.filter(p => p.mode === 'brand' || p.mode === 'agency' || p.mode === 'both')
    : PROMPT_SUGGESTIONS.filter(p => p.category === selectedCategory && (p.mode === 'brand' || p.mode === 'agency' || p.mode === 'both'))

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
      content: selectedBrandId ? 'Analyzing your campaign data...' : 'Analyzing your agency data...',
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

    // Determine loading message based on content - be more contextual
    const isAnalysisRequest = /\b(analyz|report|performance|data|campaign|metric|roas|spend|budget|revenue|conversion|click|impression|ctr|cpc|cpm|optimiz|recommend|suggest|strateg|improve)\b/i.test(customPrompt)
    const isSimpleResponse = /^(thanks?|thank you|ok|okay|got it|sure|yes|no|i'll|ill|will do|sounds good|perfect|great|nice|cool|awesome)\b/i.test(customPrompt.trim())
    
    let loadingMessage = ''
    if (isSimpleResponse) {
      loadingMessage = 'Thinking...'
    } else if (isAnalysisRequest) {
      loadingMessage = selectedBrandId ? 'Analyzing your campaign data...' : 'Analyzing your agency data...'
    } else {
      loadingMessage = 'Thinking...'
    }

    // Add loading assistant message
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: loadingMessage,
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
          brandId: selectedBrandId,
          prompt,
          marketingGoal: 'general', // Default to general since we removed the focus selector
          mode: selectedBrandId ? 'brand' : 'agency',
          userContext: {
            name: user?.firstName || 'there'
          },
          conversationHistory: messages.slice(-6).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),

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

        // Handle data validation errors
        if (response.status === 422) {
          const errorMessage = data.details && data.details.length > 0
            ? `⚠️ Data Quality Issue Detected:\n${data.details.join('\n')}\n\n${data.guidance || 'Please check your Meta pixel setup or contact support if this persists.'}`
            : `⚠️ ${data.error || 'Data validation error detected. Please refresh and try again.'}`

          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: errorMessage,
                  isLoading: false
                }
              : msg
          ))
          return
        }

        throw new Error(data.error || 'Failed to get AI response')
      }
      
      // Update remaining uses
      // console.log('[AI Marketing Frontend] API Response:', data)
      if (data.remainingUses !== undefined) {
        // console.log('[AI Marketing Frontend] Setting remaining uses:', data.remainingUses)
        setRemainingUses(data.remainingUses)
        if (data.remainingUses <= 0) {
          setIsLimitReached(true)
        }
      } else {
        // console.log('[AI Marketing Frontend] No remainingUses in response!')
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
    { id: 'focus', label: 'Focus Areas', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'focus').length },
    { id: 'analysis', label: 'Quick Analysis', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'analysis').length },
    { id: 'performance', label: 'Performance', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'performance').length },
    { id: 'optimization', label: 'Optimization', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'optimization').length },
    { id: 'creative', label: 'Creative', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'creative').length },
    { id: 'audience', label: 'Audience', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'audience').length },
    { id: 'budget', label: 'Budget', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'budget').length },
    { id: 'reports', label: 'Reports', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'reports').length },
    { id: 'leadgen', label: 'Lead Gen', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'leadgen').length },
    { id: 'outreach', label: 'Outreach', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'outreach').length },
    { id: 'seasonal', label: 'Seasonal', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'seasonal').length },
    { id: 'email-sms', label: 'Email/SMS', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'email-sms').length },
    { id: 'agency', label: 'Agency', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'agency').length },
    { id: 'troubleshooting', label: 'Troubleshooting', count: PROMPT_SUGGESTIONS.filter(p => p.category === 'troubleshooting').length }
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
                  <h2 className="text-xl font-bold text-white tracking-tight">AI Chatbot</h2>
                  <p className="text-gray-400 text-sm">Intelligent campaign optimization insights</p>
                </div>
              </div>
              
              {/* Usage Counter in Header */}
              {remainingUses !== null && (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 shadow-sm">
                  <MessageCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-white">{15 - remainingUses}/15 used today</span>
                </div>
              )}
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
                  placeholder={selectedBrandId
                    ? `Ask me anything about ${brands.find(b => b.id === selectedBrandId)?.name || 'this brand'} - marketing, scaling, optimization, strategy...`
                    : "Ask me anything about your marketing - strategy, scaling, optimization, campaigns, budget, creative..."}
                  disabled={isLoading || isLimitReached}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white/30 focus:bg-white/5 transition-all duration-300 text-sm shadow-inner"
                />
              </div>
              <Button
                onClick={() => handleCustomInput(inputMessage)}
                disabled={isLoading || isLimitReached || !inputMessage.trim()}
                className="px-4 py-3 bg-gradient-to-r from-white/10 to-gray-200/20 hover:from-white/20 hover:to-gray-200/30 text-white rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 shadow-lg flex items-center justify-center"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 