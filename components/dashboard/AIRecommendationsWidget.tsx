"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  Loader2, 
  RefreshCw, 
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
  
  const handleRefresh = () => {
    fetchRecommendations(activeTab)
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
    <div key={campaign.title} className="mb-6 p-4 bg-gray-800 rounded-md">
      <h4 className="text-md font-medium mb-2 flex items-center">
        <Mail className="h-4 w-4 mr-2 text-blue-400" />
        {campaign.title}
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Subject Line</p>
          <p className="text-sm text-white bg-gray-700 p-2 rounded">{campaign.subjectLine}</p>
        </div>
        
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Target Audience</p>
          <div className="flex items-center">
            <Users className="h-3 w-3 mr-1 text-gray-400" />
            <p className="text-sm text-gray-300">{campaign.targetAudience}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-400 mb-1">Message</p>
        <p className="text-sm text-gray-300">{campaign.message}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Timing</p>
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
            <p className="text-sm text-gray-300">{campaign.timing}</p>
          </div>
        </div>
        
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Expected Outcome</p>
          <div className="flex items-center">
            <Target className="h-3 w-3 mr-1 text-gray-400" />
            <p className="text-sm text-gray-300">{campaign.expectedOutcome}</p>
          </div>
        </div>
      </div>
    </div>
  )
  
  const renderSocialCampaign = (campaign: SocialCampaign) => (
    <div key={campaign.title} className="mb-6 p-4 bg-gray-800 rounded-md">
      <h4 className="text-md font-medium mb-2 flex items-center">
        <Share2 className="h-4 w-4 mr-2 text-purple-400" />
        {campaign.title}
      </h4>
      
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-400 mb-1">Concept</p>
        <p className="text-sm text-gray-300">{campaign.concept}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Platforms</p>
          <div className="flex flex-wrap gap-1">
            {campaign.platforms.map((platform, index) => (
              <span key={index} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                {platform}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Timing</p>
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
            <p className="text-sm text-gray-300">{campaign.timing}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-400 mb-1">Content Suggestions</p>
        <ul className="text-sm text-gray-300 list-disc pl-4">
          {campaign.contentSuggestions.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      </div>
      
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-400 mb-1">Expected Outcome</p>
        <div className="flex items-center">
          <Target className="h-3 w-3 mr-1 text-gray-400" />
          <p className="text-sm text-gray-300">{campaign.expectedOutcome}</p>
        </div>
      </div>
    </div>
  )
  
  const renderProductRecommendation = (recommendation: ProductRecommendation) => (
    <div key={recommendation.title} className="mb-6 p-4 bg-gray-800 rounded-md">
      <h4 className="text-md font-medium mb-2 flex items-center">
        <ShoppingBag className="h-4 w-4 mr-2 text-green-400" />
        {recommendation.title}
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Products</p>
          <div className="flex flex-wrap gap-1">
            {recommendation.products.map((product, index) => (
              <span key={index} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                {product}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Approach</p>
          <p className="text-sm text-gray-300">{recommendation.approach}</p>
        </div>
      </div>
      
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-400 mb-1">Target Audience</p>
        <div className="flex items-center">
          <Users className="h-3 w-3 mr-1 text-gray-400" />
          <p className="text-sm text-gray-300">{recommendation.targetAudience}</p>
        </div>
      </div>
      
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-400 mb-1">Implementation Steps</p>
        <ul className="text-sm text-gray-300 list-disc pl-4">
          {recommendation.implementation.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ul>
      </div>
      
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-400 mb-1">Expected Outcome</p>
        <div className="flex items-center">
          <Target className="h-3 w-3 mr-1 text-gray-400" />
          <p className="text-sm text-gray-300">{recommendation.expectedOutcome}</p>
        </div>
      </div>
    </div>
  )
  
  const renderPricingRecommendation = (recommendation: PricingRecommendation) => (
    <div key={recommendation.title} className="mb-6 p-4 bg-gray-800 rounded-md">
      <h4 className="text-md font-medium mb-2 flex items-center">
        <DollarSign className="h-4 w-4 mr-2 text-amber-400" />
        {recommendation.title}
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Products</p>
          <div className="flex flex-wrap gap-1">
            {recommendation.products.map((product, index) => (
              <span key={index} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                {product}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Strategy</p>
          <p className="text-sm text-gray-300">{recommendation.strategy}</p>
        </div>
      </div>
      
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-400 mb-1">Implementation Steps</p>
        <ul className="text-sm text-gray-300 list-disc pl-4">
          {recommendation.implementation.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ul>
      </div>
      
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-400 mb-1">Expected Impact</p>
        <div className="flex items-center">
          <Target className="h-3 w-3 mr-1 text-gray-400" />
          <p className="text-sm text-gray-300">{recommendation.expectedImpact}</p>
        </div>
      </div>
    </div>
  )
  
  const renderMarketingRecommendation = (recommendation: MarketingRecommendation) => (
    <div key={recommendation.title} className="mb-6 p-4 bg-gray-800 rounded-md">
      <h4 className="text-md font-medium mb-2 flex items-center">
        <Megaphone className="h-4 w-4 mr-2 text-red-400" />
        {recommendation.title}
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Channel</p>
          <p className="text-sm text-gray-300">{recommendation.channel}</p>
        </div>
        
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Target Audience</p>
          <div className="flex items-center">
            <Users className="h-3 w-3 mr-1 text-gray-400" />
            <p className="text-sm text-gray-300">{recommendation.targetAudience}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-400 mb-1">Message</p>
        <p className="text-sm text-gray-300">{recommendation.message}</p>
      </div>
      
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-400 mb-1">Implementation Steps</p>
        <ul className="text-sm text-gray-300 list-disc pl-4">
          {recommendation.implementation.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ul>
      </div>
      
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-400 mb-1">Expected Outcome</p>
        <div className="flex items-center">
          <Target className="h-3 w-3 mr-1 text-gray-400" />
          <p className="text-sm text-gray-300">{recommendation.expectedOutcome}</p>
        </div>
      </div>
    </div>
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
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Marketing Recommendations</CardTitle>
          <CardDescription>
            AI-powered marketing strategies tailored to your store
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="email" value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="email" className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center">
              <Share2 className="h-4 w-4 mr-2" />
              Social
            </TabsTrigger>
            <TabsTrigger value="product" className="flex items-center">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Product
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center">
              <Megaphone className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
          </TabsList>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400">Generating marketing recommendations...</p>
                <p className="text-xs text-gray-500 mt-2">This may take a moment</p>
              </div>
            </div>
          ) : !recommendations || !recommendations.recommendations || recommendations.recommendations.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-gray-400">No recommendations available</p>
                <p className="text-xs text-gray-500 mt-2">Try refreshing or selecting a different category</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
                <div className="text-center py-4">
                  <p className="text-gray-400">No email recommendations available</p>
                </div>
              )}
              
              {activeTab === 'social' && !recommendations.recommendations.some(item => isSocialCampaign(item)) && (
                <div className="text-center py-4">
                  <p className="text-gray-400">No social media recommendations available</p>
                </div>
              )}
              
              {activeTab === 'product' && !recommendations.recommendations.some(item => isProductRecommendation(item)) && (
                <div className="text-center py-4">
                  <p className="text-gray-400">No product recommendations available</p>
                </div>
              )}
              
              {activeTab === 'pricing' && !recommendations.recommendations.some(item => isPricingRecommendation(item)) && (
                <div className="text-center py-4">
                  <p className="text-gray-400">No pricing recommendations available</p>
                </div>
              )}
              
              {activeTab === 'general' && !recommendations.recommendations.some(item => isMarketingRecommendation(item)) && (
                <div className="text-center py-4">
                  <p className="text-gray-400">No general recommendations available</p>
                </div>
              )}
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
} 