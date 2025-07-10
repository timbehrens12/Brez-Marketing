"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { useBrandContext } from '@/lib/context/BrandContext'
import { getSupabaseClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UnifiedLoading } from "@/components/ui/unified-loading"
import { 
  Bot, 
  Send, 
  Sparkles, 
  TrendingUp, 
  Target, 
  Users, 
  Zap, 
  MessageCircle,
  Lightbulb,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Brain
} from "lucide-react"
import { formatCurrency, formatNumber } from "@/lib/utils/formatters"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: string[]
}

interface MarketingInsight {
  id: string
  title: string
  description: string
  category: 'campaign' | 'audience' | 'creative' | 'budget' | 'general'
  confidence: number
  actionable: boolean
}

export default function MarketingAssistantPage() {
  const { userId, isLoaded } = useAuth()
  const { selectedBrandId, brands } = useBrandContext()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [assistantType, setAssistantType] = useState<'general' | 'campaign' | 'creative' | 'analytics'>('general')
  const [insights, setInsights] = useState<MarketingInsight[]>([])
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)

  const supabase = getSupabaseClient()

  // Initial greeting message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          type: 'assistant',
          content: "👋 Hello! I'm your AI Marketing Assistant. I can help you with campaign optimization, audience targeting, creative ideas, and performance analysis. What would you like to work on today?",
          timestamp: new Date(),
          suggestions: [
            "Analyze my campaign performance",
            "Suggest new audience targeting ideas",
            "Help me create ad copy",
            "Optimize my ad budget allocation"
          ]
        }
      ])
    }
  }, [])

  // Load marketing insights
  const loadInsights = async () => {
    if (!selectedBrandId) return
    
    setIsLoadingInsights(true)
    try {
      // This would typically call an API to get AI-generated insights
      // For now, we'll simulate with static data
      const mockInsights: MarketingInsight[] = [
        {
          id: '1',
          title: 'Campaign Performance Opportunity',
          description: 'Your recent campaigns show 23% higher conversion rates on weekends. Consider increasing weekend budget allocation.',
          category: 'campaign',
          confidence: 87,
          actionable: true
        },
        {
          id: '2',
          title: 'Audience Expansion Potential',
          description: 'Lookalike audiences based on your top customers could expand reach by 40% with similar conversion rates.',
          category: 'audience',
          confidence: 92,
          actionable: true
        },
        {
          id: '3',
          title: 'Creative Performance Insight',
          description: 'Video creatives are outperforming static images by 156% in your industry vertical.',
          category: 'creative',
          confidence: 78,
          actionable: true
        }
      ]
      
      setInsights(mockInsights)
    } catch (error) {
      console.error('Error loading insights:', error)
    } finally {
      setIsLoadingInsights(false)
    }
  }

  useEffect(() => {
    if (selectedBrandId) {
      loadInsights()
    }
  }, [selectedBrandId])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/marketing-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          context: assistantType,
          brandId: selectedBrandId,
          messageHistory: messages.slice(-5) // Send last 5 messages for context
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        timestamp: new Date(),
        suggestions: data.suggestions || []
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'campaign': return BarChart3
      case 'audience': return Users
      case 'creative': return Sparkles
      case 'budget': return Target
      default: return Lightbulb
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'campaign': return 'text-blue-400'
      case 'audience': return 'text-green-400'
      case 'creative': return 'text-purple-400'
      case 'budget': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <UnifiedLoading 
          size="lg" 
          variant="page" 
          message="Loading Marketing Assistant"
          subMessage="Preparing AI insights..."
        />
      </div>
    )
  }

  if (!selectedBrandId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Card className="bg-[#1A1A1A] border-[#333] p-6">
          <div className="text-center">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Select a Brand</h2>
            <p className="text-gray-400">Choose a brand to start your marketing consultation</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="border-b border-[#333] bg-[#1A1A1A] px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-blue-400" />
              <h1 className="text-2xl font-bold">AI Marketing Assistant</h1>
            </div>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              Beta
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Select value={assistantType} onValueChange={(value: any) => setAssistantType(value)}>
              <SelectTrigger className="w-[180px] bg-[#0A0A0A] border-[#333]">
                <SelectValue placeholder="Assistant Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Marketing</SelectItem>
                <SelectItem value="campaign">Campaign Strategy</SelectItem>
                <SelectItem value="creative">Creative Ideas</SelectItem>
                <SelectItem value="analytics">Performance Analysis</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadInsights}
              disabled={isLoadingInsights}
            >
              {isLoadingInsights ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh Insights
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="bg-[#1A1A1A] border-[#333] h-[700px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                  Marketing Consultation
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.type === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] p-3 rounded-lg",
                          message.type === 'user'
                            ? "bg-blue-600 text-white"
                            : "bg-[#0A0A0A] border border-[#333] text-gray-100"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {message.suggestions && message.suggestions.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm text-gray-400">Suggestions:</p>
                            {message.suggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="block w-full text-left p-2 bg-[#1A1A1A] border border-[#333] rounded text-sm hover:bg-[#2A2A2A] transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#0A0A0A] border border-[#333] p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-[#333]">
                  <div className="flex gap-2">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask me anything about your marketing campaigns..."
                      className="flex-1 bg-[#0A0A0A] border-[#333] resize-none"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!input.trim() || isLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insights Sidebar */}
          <div className="space-y-4">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingInsights ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-[#0A0A0A] rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {insights.map((insight) => {
                      const Icon = getCategoryIcon(insight.category)
                      return (
                        <div key={insight.id} className="p-3 bg-[#0A0A0A] rounded-lg border border-[#333]">
                          <div className="flex items-start gap-2">
                            <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", getCategoryColor(insight.category))} />
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-white mb-1">{insight.title}</h4>
                              <p className="text-xs text-gray-400 mb-2">{insight.description}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {insight.confidence}% confidence
                                </Badge>
                                {insight.actionable && (
                                  <Badge variant="outline" className="text-xs text-green-400 border-green-400/30">
                                    Actionable
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleSuggestionClick("Analyze my current campaign performance")}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analyze Performance
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleSuggestionClick("Suggest audience targeting improvements")}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Audience Insights
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleSuggestionClick("Help me create compelling ad copy")}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Creative Ideas
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleSuggestionClick("Optimize my budget allocation")}
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Budget Optimization
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 