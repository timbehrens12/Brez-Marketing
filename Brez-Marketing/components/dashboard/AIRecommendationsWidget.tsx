"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  Loader2, 
  Mail, 
  Share2, 
  ShoppingBag, 
  DollarSign, 
  Megaphone,
  CheckCircle,
  Calendar,
  Users,
  MessageSquare,
  Clock,
  Target
} from 'lucide-react'
import { AIRecommendations, AIRecommendation, EmailCampaign, SocialCampaign, ProductRecommendation, PricingRecommendation, MarketingRecommendation } from '@/types/ai'
import { toast } from 'sonner'

interface AIRecommendationsWidgetProps {
  brandId: string
  focusArea?: 'overall' | 'sales' | 'customers' | 'products' | 'inventory'
}

export function AIRecommendationsWidget({ brandId, focusArea }: AIRecommendationsWidgetProps) {
  const [recommendations, setRecommendations] = useState<AIRecommendations | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('email')
  
  // Map focus areas to recommendation types
  const getRecommendationArea = () => {
    if (!focusArea || focusArea === 'overall') return 'email';
    if (focusArea === 'sales') return 'email';
    if (focusArea === 'customers') return 'email';
    if (focusArea === 'products') return 'product';
    if (focusArea === 'inventory') return 'pricing';
    return 'email';
  };

  useEffect(() => {
    if (brandId) {
      const area = getRecommendationArea();
      setActiveTab(area);
      fetchRecommendations(area);
    }
  }, [brandId, focusArea]);

  const fetchRecommendations = async (area: string = 'email') => {
    if (!brandId) return
    
    setIsLoading(true)
    
    try {
      // Create an AbortController to handle timeouts
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          area
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch recommendations')
      }
      
      const data = await response.json()
      setRecommendations(data)
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      
      // Check if it's an abort error (timeout)
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.error('AI recommendations request timed out. Please try again later.')
        
        // Set fallback recommendations
        setRecommendations({
          recommendations: []
        })
      } else {
        toast.error('Failed to fetch AI recommendations. Please try again later.')
        
        // Set fallback recommendations
        setRecommendations({
          recommendations: []
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    fetchRecommendations(value)
  }
  

  
  // Helper function to check if an object is an email campaign
  const isEmailCampaign = (item: any): item is EmailCampaign => {
    return item && 'subjectLine' in item && 'targetAudience' in item && 'message' in item;
  }
  
  // Helper function to check if an object is a social campaign
  const isSocialCampaign = (item: any): item is SocialCampaign => {
    return item && 'concept' in item && 'platforms' in item && 'contentSuggestions' in item;
  }
  
  // Helper function to check if an object is a product recommendation
  const isProductRecommendation = (item: any): item is ProductRecommendation => {
    return item && 'products' in item && 'approach' in item && 'targetAudience' in item;
  }
  
  // Helper function to check if an object is a pricing recommendation
  const isPricingRecommendation = (item: any): item is PricingRecommendation => {
    return item && 'products' in item && 'strategy' in item && 'expectedImpact' in item;
  }
  
  // Helper function to check if an object is a general marketing recommendation
  const isMarketingRecommendation = (item: any): item is MarketingRecommendation => {
    return item && 'channel' in item && 'targetAudience' in item && 'message' in item;
  }
  
  const renderEmailCampaign = (campaign: EmailCampaign) => (
    <Card key={campaign.title} className="bg-[#0f0f0f] border-[#1a1a1a] hover:border-[#2a2a2a] transition-all duration-300 
                                         shadow-lg hover:shadow-2xl group overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl 
                        flex items-center justify-center border border-blue-500/30">
            <Mail className="h-5 w-5 text-blue-400" />
          </div>
          <h4 className="text-lg font-bold text-white tracking-tight">{campaign.title}</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Subject Line</p>
            <p className="text-sm text-white font-medium">{campaign.subjectLine}</p>
          </div>
          
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Target Audience</p>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-gray-400" />
              <p className="text-sm text-white">{campaign.targetAudience}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors mb-4">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Message</p>
          <p className="text-sm text-gray-300 leading-relaxed">{campaign.message}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Timing</p>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <p className="text-sm text-white">{campaign.timing}</p>
            </div>
          </div>
          
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Expected Outcome</p>
            <div className="flex items-center">
              <Target className="h-4 w-4 mr-2 text-gray-400" />
              <p className="text-sm text-white">{campaign.expectedOutcome}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
  
  const renderSocialCampaign = (campaign: SocialCampaign) => (
    <Card key={campaign.title} className="bg-[#0f0f0f] border-[#1a1a1a] hover:border-[#2a2a2a] transition-all duration-300 
                                         shadow-lg hover:shadow-2xl group overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl 
                        flex items-center justify-center border border-purple-500/30">
            <Share2 className="h-5 w-5 text-purple-400" />
          </div>
          <h4 className="text-lg font-bold text-white tracking-tight">{campaign.title}</h4>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors mb-4">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Concept</p>
          <p className="text-sm text-gray-300 leading-relaxed">{campaign.concept}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Platforms</p>
            <div className="flex flex-wrap gap-2">
              {campaign.platforms.map((platform, index) => (
                <span key={index} className="text-xs bg-[#2a2a2a] text-gray-300 px-3 py-1 rounded-full border border-[#3a3a3a]">
                  {platform}
                </span>
              ))}
            </div>
          </div>
          
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Timing</p>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <p className="text-sm text-white">{campaign.timing}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors mb-4">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Content Suggestions</p>
          <ul className="text-sm text-gray-300 space-y-1">
            {campaign.contentSuggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Expected Outcome</p>
          <div className="flex items-center">
            <Target className="h-4 w-4 mr-2 text-gray-400" />
            <p className="text-sm text-white">{campaign.expectedOutcome}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
  
  const renderProductRecommendation = (recommendation: ProductRecommendation) => (
    <Card key={recommendation.title} className="bg-[#0f0f0f] border-[#1a1a1a] hover:border-[#2a2a2a] transition-all duration-300 
                                              shadow-lg hover:shadow-2xl group overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl 
                        flex items-center justify-center border border-green-500/30">
            <ShoppingBag className="h-5 w-5 text-green-400" />
          </div>
          <h4 className="text-lg font-bold text-white tracking-tight">{recommendation.title}</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Products</p>
            <div className="flex flex-wrap gap-2">
              {recommendation.products.map((product, index) => (
                <span key={index} className="text-xs bg-[#2a2a2a] text-gray-300 px-3 py-1 rounded-full border border-[#3a3a3a]">
                  {product}
                </span>
              ))}
            </div>
          </div>
          
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Approach</p>
            <p className="text-sm text-white">{recommendation.approach}</p>
          </div>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors mb-4">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Target Audience</p>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-2 text-gray-400" />
            <p className="text-sm text-white">{recommendation.targetAudience}</p>
          </div>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors mb-4">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Implementation Steps</p>
          <ul className="text-sm text-gray-300 space-y-1">
            {recommendation.implementation.map((step, index) => (
              <li key={index} className="flex items-start">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                {step}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Expected Outcome</p>
          <div className="flex items-center">
            <Target className="h-4 w-4 mr-2 text-gray-400" />
            <p className="text-sm text-white">{recommendation.expectedOutcome}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
  
  const renderPricingRecommendation = (recommendation: PricingRecommendation) => (
    <Card key={recommendation.title} className="bg-[#0f0f0f] border-[#1a1a1a] hover:border-[#2a2a2a] transition-all duration-300 
                                              shadow-lg hover:shadow-2xl group overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl 
                        flex items-center justify-center border border-amber-500/30">
            <DollarSign className="h-5 w-5 text-amber-400" />
          </div>
          <h4 className="text-lg font-bold text-white tracking-tight">{recommendation.title}</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Products</p>
            <div className="flex flex-wrap gap-2">
              {recommendation.products.map((product, index) => (
                <span key={index} className="text-xs bg-[#2a2a2a] text-gray-300 px-3 py-1 rounded-full border border-[#3a3a3a]">
                  {product}
                </span>
              ))}
            </div>
          </div>
          
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Strategy</p>
            <p className="text-sm text-white">{recommendation.strategy}</p>
          </div>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors mb-4">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Implementation Steps</p>
          <ul className="text-sm text-gray-300 space-y-1">
            {recommendation.implementation.map((step, index) => (
              <li key={index} className="flex items-start">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                {step}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Expected Impact</p>
          <div className="flex items-center">
            <Target className="h-4 w-4 mr-2 text-gray-400" />
            <p className="text-sm text-white">{recommendation.expectedImpact}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
  
  const renderMarketingRecommendation = (recommendation: MarketingRecommendation) => (
    <Card key={recommendation.title} className="bg-[#0f0f0f] border-[#1a1a1a] hover:border-[#2a2a2a] transition-all duration-300 
                                              shadow-lg hover:shadow-2xl group overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-xl 
                        flex items-center justify-center border border-red-500/30">
            <Megaphone className="h-5 w-5 text-red-400" />
          </div>
          <h4 className="text-lg font-bold text-white tracking-tight">{recommendation.title}</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Channel</p>
            <p className="text-sm text-white">{recommendation.channel}</p>
          </div>
          
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Target Audience</p>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-gray-400" />
              <p className="text-sm text-white">{recommendation.targetAudience}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors mb-4">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Message</p>
          <p className="text-sm text-gray-300 leading-relaxed">{recommendation.message}</p>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors mb-4">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Implementation Steps</p>
          <ul className="text-sm text-gray-300 space-y-1">
            {recommendation.implementation.map((step, index) => (
              <li key={index} className="flex items-start">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                {step}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Expected Outcome</p>
          <div className="flex items-center">
            <Target className="h-4 w-4 mr-2 text-gray-400" />
            <p className="text-sm text-white">{recommendation.expectedOutcome}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
  
  const renderRecommendation = (recommendation: any) => {
    if (isEmailCampaign(recommendation)) {
      return renderEmailCampaign(recommendation);
    } else if (isSocialCampaign(recommendation)) {
      return renderSocialCampaign(recommendation);
    } else if (isProductRecommendation(recommendation)) {
      return renderProductRecommendation(recommendation);
    } else if (isPricingRecommendation(recommendation)) {
      return renderPricingRecommendation(recommendation);
    } else if (isMarketingRecommendation(recommendation)) {
      return renderMarketingRecommendation(recommendation);
    } else {
      // Fallback for unknown recommendation type
      return (
        <div key={recommendation.title} className="mb-6 p-4 bg-gray-800 rounded-md">
          <h4 className="text-md font-medium mb-2">{recommendation.title}</h4>
          <pre className="text-xs text-gray-400 overflow-auto">{JSON.stringify(recommendation, null, 2)}</pre>
        </div>
      );
    }
  }
  
  return (
    <Card className="col-span-3 bg-[#0a0a0a] border-[#1a1a1a] shadow-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
                          flex items-center justify-center border border-white/10 shadow-lg">
              <span className="text-white font-bold text-xl">AI</span>
            </div>
            <div>
              <CardTitle className="text-2xl text-white font-bold tracking-tight">Marketing Recommendations</CardTitle>
              <CardDescription className="text-gray-400 font-medium">
                AI-powered marketing strategies tailored to your store
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="p-6 pt-6">
          <Tabs defaultValue="email" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-1">
              <TabsTrigger value="email" className="flex items-center bg-transparent text-gray-400 hover:text-white 
                                                   data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white 
                                                   data-[state=active]:border-[#2a2a2a] rounded-lg px-4 py-2 
                                                   transition-all duration-300">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center bg-transparent text-gray-400 hover:text-white 
                                                     data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white 
                                                     data-[state=active]:border-[#2a2a2a] rounded-lg px-4 py-2 
                                                     transition-all duration-300">
                <Share2 className="h-4 w-4 mr-2" />
                Social
              </TabsTrigger>
              <TabsTrigger value="product" className="flex items-center bg-transparent text-gray-400 hover:text-white 
                                                      data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white 
                                                      data-[state=active]:border-[#2a2a2a] rounded-lg px-4 py-2 
                                                      transition-all duration-300">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Product
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center bg-transparent text-gray-400 hover:text-white 
                                                     data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white 
                                                     data-[state=active]:border-[#2a2a2a] rounded-lg px-4 py-2 
                                                     transition-all duration-300">
                <DollarSign className="h-4 w-4 mr-2" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center bg-transparent text-gray-400 hover:text-white 
                                                     data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white 
                                                     data-[state=active]:border-[#2a2a2a] rounded-lg px-4 py-2 
                                                     transition-all duration-300">
                <Megaphone className="h-4 w-4 mr-2" />
                General
              </TabsTrigger>
            </TabsList>
          
          {isLoading ? (
            <div className="text-center py-16 mx-6 mb-6 bg-[#0f0f0f] rounded-2xl border border-[#1a1a1a]">
              <div className="w-20 h-20 mx-auto mb-6 bg-[#1a1a1a] rounded-2xl flex items-center justify-center 
                            border border-[#2a2a2a] shadow-lg">
                <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Generating Marketing Recommendations</h3>
              <p className="text-gray-500 max-w-md mx-auto">Our AI is analyzing your store data to create personalized marketing strategies</p>
              <p className="text-sm text-gray-600 mt-2">This may take a moment</p>
            </div>
          ) : !recommendations || !recommendations.recommendations || recommendations.recommendations.length === 0 ? (
            <div className="text-center py-16 mx-6 mb-6 bg-[#0f0f0f] rounded-2xl border border-[#1a1a1a]">
              <div className="w-20 h-20 mx-auto mb-6 bg-[#1a1a1a] rounded-2xl flex items-center justify-center 
                            border border-[#2a2a2a] shadow-lg">
                <Megaphone className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">No Recommendations Available</h3>
              <p className="text-gray-500 max-w-md mx-auto">Try refreshing or selecting a different category to see AI-powered marketing strategies</p>
            </div>
          ) : (
            <div className="grid gap-5">
              {activeTab === 'email' && recommendations.recommendations
                .filter(item => isEmailCampaign(item))
                .map((item, index) => (
                  <div key={index}>{renderRecommendation(item)}</div>
                ))}
              
              {activeTab === 'social' && recommendations.recommendations
                .filter(item => isSocialCampaign(item))
                .map((item, index) => (
                  <div key={index}>{renderRecommendation(item)}</div>
                ))}
              
              {activeTab === 'product' && recommendations.recommendations
                .filter(item => isProductRecommendation(item))
                .map((item, index) => (
                  <div key={index}>{renderRecommendation(item)}</div>
                ))}
              
              {activeTab === 'pricing' && recommendations.recommendations
                .filter(item => isPricingRecommendation(item))
                .map((item, index) => (
                  <div key={index}>{renderRecommendation(item)}</div>
                ))}
              
              {activeTab === 'general' && recommendations.recommendations
                .filter(item => isMarketingRecommendation(item))
                .map((item, index) => (
                  <div key={index}>{renderRecommendation(item)}</div>
                ))}
              
              {activeTab === 'email' && !recommendations.recommendations.some(item => isEmailCampaign(item)) && (
                <div className="text-center py-8 mx-6 mb-6 bg-[#0f0f0f] rounded-2xl border border-[#1a1a1a]">
                  <p className="text-gray-400 text-lg font-medium">No email recommendations available</p>
                  <p className="text-gray-600 text-sm mt-2">Try refreshing to generate new recommendations</p>
                </div>
              )}
              
              {activeTab === 'social' && !recommendations.recommendations.some(item => isSocialCampaign(item)) && (
                <div className="text-center py-8 mx-6 mb-6 bg-[#0f0f0f] rounded-2xl border border-[#1a1a1a]">
                  <p className="text-gray-400 text-lg font-medium">No social media recommendations available</p>
                  <p className="text-gray-600 text-sm mt-2">Try refreshing to generate new recommendations</p>
                </div>
              )}
              
              {activeTab === 'product' && !recommendations.recommendations.some(item => isProductRecommendation(item)) && (
                <div className="text-center py-8 mx-6 mb-6 bg-[#0f0f0f] rounded-2xl border border-[#1a1a1a]">
                  <p className="text-gray-400 text-lg font-medium">No product recommendations available</p>
                  <p className="text-gray-600 text-sm mt-2">Try refreshing to generate new recommendations</p>
                </div>
              )}
              
              {activeTab === 'pricing' && !recommendations.recommendations.some(item => isPricingRecommendation(item)) && (
                <div className="text-center py-8 mx-6 mb-6 bg-[#0f0f0f] rounded-2xl border border-[#1a1a1a]">
                  <p className="text-gray-400 text-lg font-medium">No pricing recommendations available</p>
                  <p className="text-gray-600 text-sm mt-2">Try refreshing to generate new recommendations</p>
                </div>
              )}
              
              {activeTab === 'general' && !recommendations.recommendations.some(item => isMarketingRecommendation(item)) && (
                <div className="text-center py-8 mx-6 mb-6 bg-[#0f0f0f] rounded-2xl border border-[#1a1a1a]">
                  <p className="text-gray-400 text-lg font-medium">No general recommendations available</p>
                  <p className="text-gray-600 text-sm mt-2">Try refreshing to generate new recommendations</p>
                </div>
              )}
            </div>
          )}
        </Tabs>
        </div>
      </CardContent>
    </Card>
  )
} 