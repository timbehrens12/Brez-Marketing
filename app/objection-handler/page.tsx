"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Phone, Send, Copy, CheckCircle2, Sparkles, Zap, TrendingUp, DollarSign, Clock, Shield, Award, Target } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuth } from '@clerk/nextjs'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface PresetObjection {
  id: string
  label: string
  objection: string
  icon: any
  color: string
}

const presetObjections: PresetObjection[] = [
  {
    id: 'price',
    label: "Too Expensive",
    objection: "Your price is too high. I can't afford that right now.",
    icon: DollarSign,
    color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
  },
  {
    id: 'timing',
    label: "Bad Timing",
    objection: "Now is not a good time. Maybe later.",
    icon: Clock,
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20'
  },
  {
    id: 'already-have',
    label: "Already Have Website",
    objection: "We already have a website. Why would we need a new one?",
    icon: Shield,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20'
  },
  {
    id: 'no-budget',
    label: "No Budget",
    objection: "We don't have budget allocated for this.",
    icon: TrendingUp,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20'
  },
  {
    id: 'need-approval',
    label: "Need Approval",
    objection: "I need to talk to my business partner/spouse first.",
    icon: Target,
    color: 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
  },
  {
    id: 'diy',
    label: "DIY Approach",
    objection: "I can just build it myself or use a template.",
    icon: Award,
    color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'
  },
  {
    id: 'no-leads',
    label: "Don't Need Leads",
    objection: "We get enough business through word of mouth. Don't need more leads.",
    icon: Zap,
    color: 'bg-pink-500/10 text-pink-500 border-pink-500/20 hover:bg-pink-500/20'
  },
  {
    id: 'think-about',
    label: "Need to Think",
    objection: "Let me think about it and I'll get back to you.",
    icon: Sparkles,
    color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/20'
  }
]

export default function ObjectionHandlerPage() {
  const { userId } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [customObjection, setCustomObjection] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handlePresetObjection = async (preset: PresetObjection) => {
    if (isGenerating) return
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: preset.objection,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    
    await generateResponse(preset.objection)
  }

  const handleCustomObjection = async () => {
    if (!customObjection.trim() || isGenerating) return
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: customObjection,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    
    const objectionText = customObjection
    setCustomObjection('')
    
    await generateResponse(objectionText)
  }

  const generateResponse = async (objection: string) => {
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/objection-handler/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          objection,
          userId 
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate response')
      }
      
      const data = await response.json()
      
      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      
    } catch (error) {
      console.error('Error generating response:', error)
      toast.error('Failed to generate response. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      toast.success('Response copied to clipboard!')
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCustomObjection()
    }
  }

  const clearConversation = () => {
    setMessages([])
    toast.success('Conversation cleared')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-400 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#FF2A2A]/10 rounded-lg border border-[#FF2A2A]/20">
                <Phone className="h-6 w-6 text-[#FF2A2A]" />
              </div>
              <h1 className="text-3xl font-bold text-gray-200">Objection Handler</h1>
            </div>
            <p className="text-gray-500">
              AI-powered responses for handling sales objections in real-time
            </p>
          </div>
          {messages.length > 0 && (
            <Button
              onClick={clearConversation}
              variant="outline"
              className="border-[#333] hover:bg-[#222] text-gray-400"
            >
              Clear Conversation
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preset Objections */}
          <Card className="bg-[#1A1A1A] border-[#333] lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-gray-200 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#FF2A2A]" />
                Quick Objections
              </CardTitle>
              <CardDescription className="text-gray-500">
                Click any common objection for an instant response
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {presetObjections.map((preset) => {
                const Icon = preset.icon
                return (
                  <Button
                    key={preset.id}
                    onClick={() => handlePresetObjection(preset)}
                    disabled={isGenerating}
                    className={`w-full justify-start text-left h-auto py-3 px-4 ${preset.color} border transition-all`}
                    variant="outline"
                  >
                    <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{preset.label}</div>
                      <div className="text-xs opacity-75 truncate">{preset.objection}</div>
                    </div>
                  </Button>
                )
              })}
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <Card className="bg-[#1A1A1A] border-[#333] lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-gray-200 flex items-center gap-2">
                <Phone className="h-5 w-5 text-[#FF2A2A]" />
                Live Conversation
              </CardTitle>
              <CardDescription className="text-gray-500">
                Type custom objections or use quick buttons for instant AI responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Messages Area */}
              <div className="bg-[#0A0A0A] border border-[#333] rounded-lg p-4 h-[500px] overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="p-4 bg-[#FF2A2A]/10 rounded-full mb-4">
                      <Phone className="h-8 w-8 text-[#FF2A2A]" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">
                      Ready to Handle Objections
                    </h3>
                    <p className="text-sm text-gray-500 max-w-md">
                      Click a preset objection or type a custom one below. Get instant AI-powered responses to help close more deals.
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            message.role === 'user'
                              ? 'bg-[#FF2A2A]/10 border border-[#FF2A2A]/20'
                              : 'bg-[#2A2A2A] border border-[#444]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                message.role === 'user'
                                  ? 'border-[#FF2A2A]/30 text-[#FF2A2A]'
                                  : 'border-[#555] text-gray-400'
                              }`}
                            >
                              {message.role === 'user' ? 'Objection' : 'AI Response'}
                            </Badge>
                            {message.role === 'assistant' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-[#333]"
                                onClick={() => copyToClipboard(message.content, index)}
                              >
                                {copiedIndex === index ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3 text-gray-400" />
                                )}
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                          <div className="text-xs text-gray-600 mt-2">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isGenerating && (
                      <div className="flex justify-start">
                        <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Generating response...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={customObjection}
                    onChange={(e) => setCustomObjection(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type the objection you're hearing on the call... (Press Enter to send, Shift+Enter for new line)"
                    className="bg-[#2A2A2A] border-[#444] text-gray-300 placeholder:text-gray-600 resize-none"
                    rows={3}
                    disabled={isGenerating}
                  />
                  <Button
                    onClick={handleCustomObjection}
                    disabled={!customObjection.trim() || isGenerating}
                    className="bg-[#FF2A2A] hover:bg-[#E02424] text-black font-bold h-auto px-6"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-600">
                  💡 Tip: Type exactly what the prospect says for the most accurate response
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tips Section */}
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <CardTitle className="text-gray-200 text-lg">Pro Tips for Handling Objections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#2A2A2A] rounded-lg border border-[#444]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-[#FF2A2A]/10 rounded">
                    <Phone className="h-4 w-4 text-[#FF2A2A]" />
                  </div>
                  <h4 className="font-medium text-gray-300">Listen First</h4>
                </div>
                <p className="text-sm text-gray-500">
                  Let the prospect fully explain their concern before responding. Type their exact words for better AI responses.
                </p>
              </div>
              <div className="p-4 bg-[#2A2A2A] rounded-lg border border-[#444]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-[#FF2A2A]/10 rounded">
                    <Sparkles className="h-4 w-4 text-[#FF2A2A]" />
                  </div>
                  <h4 className="font-medium text-gray-300">Personalize</h4>
                </div>
                <p className="text-sm text-gray-500">
                  Use the AI response as a framework, but add personal touches and specific details about their business.
                </p>
              </div>
              <div className="p-4 bg-[#2A2A2A] rounded-lg border border-[#444]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-[#FF2A2A]/10 rounded">
                    <Target className="h-4 w-4 text-[#FF2A2A]" />
                  </div>
                  <h4 className="font-medium text-gray-300">Follow Up</h4>
                </div>
                <p className="text-sm text-gray-500">
                  After addressing the objection, ask a follow-up question to keep the conversation moving forward.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

