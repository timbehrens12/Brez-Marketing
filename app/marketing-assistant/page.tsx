"use client"

import { useState, useEffect, useRef } from "react"
import { useBrandContext } from '@/lib/context/BrandContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser } from "@clerk/nextjs"
import { Send, Bot, Sparkles, ArrowRight, RefreshCw, User } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function MarketingAssistantPage() {
  const { toast } = useToast()
  const { user } = useUser()
  const { selectedBrandId, brands } = useBrandContext()
  const [prompt, setPrompt] = useState("")
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [isTyping, setIsTyping] = useState(false)

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  // Get user's first name
  const getUserFirstName = () => {
    if (!user) return ""
    return user.firstName || user.fullName?.split(' ')[0] || ""
  }

  // Handle sending message to AI assistant
  const sendMessage = async () => {
    if (!prompt.trim() || !selectedBrandId) return

    // Add user message to chat
    const userMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString()
    }
    
    setChatHistory(prev => [...prev, userMessage])
    setPrompt("")
    setIsTyping(true)

    try {
      // Fetch brand info for context
      const selectedBrand = brands.find(brand => brand.id === selectedBrandId)

      // Send the prompt to the AI endpoint
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: prompt,
          history: chatHistory,
          brand: {
            id: selectedBrandId,
            name: selectedBrand?.name || "Unknown Brand"
          }
        })
      })
      
      if (!response.ok) {
        throw new Error("Failed to get response from AI")
      }
      
      const data = await response.json()
      
      // Add AI response to chat
      const aiMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      }
      
      setChatHistory(prev => [...prev, aiMessage])
    } catch (error) {
      console.error("Error communicating with AI:", error)
      toast({
        title: "Error",
        description: "Failed to communicate with the AI assistant. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsTyping(false)
    }
  }

  // Handle keyboard shortcut for sending message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Clear chat history
  const clearChat = () => {
    setChatHistory([])
  }

  // Suggested prompts that users can click on
  const suggestedPrompts = [
    "Help me create a marketing strategy for my brand",
    "What are the best practices for Facebook ads?",
    "Give me some content ideas for my Instagram",
    "How can I improve my email marketing campaigns?"
  ]

  // Initialize chat with a greeting when selectedBrandId changes
  useEffect(() => {
    if (selectedBrandId && chatHistory.length === 0) {
      const selectedBrand = brands.find(brand => brand.id === selectedBrandId)
      const greeting = `${getGreeting()}, ${getUserFirstName()}! I'm your marketing assistant for ${selectedBrand?.name || "your brand"}. How can I help you today?`
      
      setChatHistory([{
        role: 'assistant',
        content: greeting,
        timestamp: new Date().toISOString()
      }])
    }
  }, [selectedBrandId, brands])

  return (
    <div className="container mx-auto py-6 h-full">
      <div className="flex flex-col space-y-6 h-full">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Marketing Assistant</h1>
          
          <Button 
            variant="outline" 
            className="flex items-center space-x-2 text-gray-200 bg-[#222] border-[#333] hover:bg-[#2a2a2a]"
            onClick={clearChat}
          >
                <RefreshCw className="h-4 w-4" />
            <span>New Conversation</span>
          </Button>
      </div>
      
        <Card className="bg-[#111] border-[#333] h-full flex flex-col">
          <CardHeader className="border-b border-[#333] pb-4">
            <div className="flex justify-between items-center">
                  <div>
                <CardTitle className="text-white">AI Assistant</CardTitle>
                <CardDescription className="text-gray-400">
                  Chat with your AI marketing expert
                </CardDescription>
                  </div>
              
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                <span className="text-gray-300 text-sm">Powered by AI</span>
                  </div>
                </div>
              </CardHeader>
          
          <CardContent className="flex-grow overflow-hidden p-0 flex flex-col">
            {/* Chat messages */}
            <div className="overflow-y-auto p-6 flex-grow space-y-5">
              {chatHistory.map((message, i) => (
                <div key={i} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`flex gap-3 max-w-[80%] ${message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className="flex-shrink-0 mt-1">
                      {message.role === 'assistant' ? (
                        <Avatar className="h-8 w-8 border border-[#333]">
                          <AvatarFallback className="bg-blue-600 text-white">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Avatar className="h-8 w-8 border border-[#333]">
                          <AvatarImage src={user?.imageUrl} />
                          <AvatarFallback className="bg-gray-600 text-white">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    
                    <div className={`rounded-lg p-4 ${
                      message.role === 'assistant' 
                        ? 'bg-[#1e293b] text-gray-200' 
                        : 'bg-blue-600 text-white'
                    }`}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className={`text-xs mt-2 ${
                        message.role === 'assistant' ? 'text-gray-400' : 'text-blue-100'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit'
                        })}
                        </div>
                      </div>
                        </div>
                      </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[80%]">
                    <Avatar className="h-8 w-8 border border-[#333] mt-1">
                      <AvatarFallback className="bg-blue-600 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="rounded-lg p-4 bg-[#1e293b] text-gray-200">
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                          </div>
                        </div>
                          </div>
                        </div>
              )}
                          </div>
            
            {/* Suggested prompts */}
            {chatHistory.length <= 1 && (
              <div className="px-6 py-3 border-t border-[#333] bg-[#0a0a0a]">
                <p className="text-sm text-gray-400 mb-3">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="text-sm bg-[#1a1a1a] border-[#333] hover:bg-[#222] text-gray-300"
                      onClick={() => {
                        setPrompt(prompt)
                      }}
                    >
                      {prompt}
                      </Button>
                  ))}
                    </div>
                  </div>
            )}
            
            {/* Input area */}
            <div className="p-4 border-t border-[#333] mt-auto">
              <div className="flex gap-2">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="min-h-10 resize-none bg-[#1a1a1a] border-[#333] text-white"
                  disabled={isTyping}
                />
                <Button 
                  className="px-3"
                  disabled={!prompt.trim() || isTyping || !selectedBrandId}
                  onClick={sendMessage}
                >
                  <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                </CardContent>
              </Card>
                      </div>
    </div>
  )
} 