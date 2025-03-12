"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Loader2, Lightbulb, TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { AIInsights, Insight, Opportunity, Risk, Recommendation } from '@/types/ai'
import { toast } from 'sonner'

interface AIInsightsWidgetProps {
  brandId: string
  dateRange: {
    from: Date
    to: Date
  }
  focusArea?: 'overall' | 'sales' | 'customers' | 'products' | 'inventory'
}

export function AIInsightsWidget({ brandId, dateRange, focusArea: externalFocusArea }: AIInsightsWidgetProps) {
  const [insights, setInsights] = useState<AIInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [focusArea, setFocusArea] = useState<'overall' | 'sales' | 'customers' | 'products' | 'inventory'>(externalFocusArea || 'overall')
  
  // Update internal focus area when external prop changes
  useEffect(() => {
    if (externalFocusArea) {
      setFocusArea(externalFocusArea)
    }
  }, [externalFocusArea])
  
  const fetchInsights = async (area: 'overall' | 'sales' | 'customers' | 'products' | 'inventory' = 'overall') => {
    if (!brandId) return
    
    setIsLoading(true)
    setFocusArea(area)
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          focusArea: area,
          dateRange: {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString()
          }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch insights');
      }
      
      const data = await response.json();
      setInsights(data);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      
      // Check if it's an abort error (timeout)
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.error('Request timed out. The server is taking too long to respond.');
      } else {
        toast.error('Failed to generate insights. Please try again later.');
      }
      
      // Set fallback insights
      setInsights({
        summary: "Unable to generate insights at this time.",
        insights: [
          {
            title: "Service Temporarily Unavailable",
            description: "Our AI analysis service is currently experiencing high demand. Please try again in a few minutes."
          }
        ],
        opportunities: [],
        risks: [],
        recommendations: [
          {
            title: "Try Again Later",
            description: "This is a temporary issue. Please try refreshing the insights in a moment."
          }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  useEffect(() => {
    fetchInsights()
  }, [brandId, dateRange])
  
  const handleRefresh = () => {
    fetchInsights(focusArea)
  }
  
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    
    // Map tab value to focus area
    if (value === 'sales' || value === 'customers' || value === 'products' || value === 'inventory') {
      fetchInsights(value as any)
    } else {
      fetchInsights('overall')
    }
  }
  
  const renderInsightItem = (insight: Insight) => (
    <div key={insight.title} className="mb-4 p-4 bg-gray-800 rounded-md">
      <h4 className="text-md font-medium mb-1 flex items-center">
        <Lightbulb className="h-4 w-4 mr-2 text-yellow-400" />
        {insight.title}
      </h4>
      <p className="text-sm text-gray-300">{insight.description}</p>
    </div>
  )
  
  const renderOpportunityItem = (opportunity: Opportunity) => (
    <div key={opportunity.title} className="mb-4 p-4 bg-gray-800 rounded-md">
      <h4 className="text-md font-medium mb-1 flex items-center">
        <TrendingUp className="h-4 w-4 mr-2 text-green-400" />
        {opportunity.title}
      </h4>
      <p className="text-sm text-gray-300 mb-2">{opportunity.description}</p>
      {opportunity.nextSteps && opportunity.nextSteps.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-400 mb-1">Next Steps:</p>
          <ul className="text-xs text-gray-300 list-disc pl-4">
            {opportunity.nextSteps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
  
  const renderRiskItem = (risk: Risk) => (
    <div key={risk.title} className="mb-4 p-4 bg-gray-800 rounded-md">
      <h4 className="text-md font-medium mb-1 flex items-center">
        <AlertTriangle className="h-4 w-4 mr-2 text-amber-400" />
        {risk.title}
      </h4>
      <p className="text-sm text-gray-300">{risk.description}</p>
    </div>
  )
  
  const renderRecommendationItem = (recommendation: Recommendation) => (
    <div key={recommendation.title} className="mb-4 p-4 bg-gray-800 rounded-md">
      <h4 className="text-md font-medium mb-1 flex items-center">
        <CheckCircle className="h-4 w-4 mr-2 text-blue-400" />
        {recommendation.title}
      </h4>
      <p className="text-sm text-gray-300 mb-2">{recommendation.description}</p>
      {recommendation.steps && recommendation.steps.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-400 mb-1">Implementation Steps:</p>
          <ul className="text-xs text-gray-300 list-disc pl-4">
            {recommendation.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
  
  const renderOverviewTab = () => (
    <div>
      {insights?.summary && (
        <div className="mb-6 p-4 bg-gray-800/50 rounded-md">
          <h3 className="text-lg font-medium mb-2">Executive Summary</h3>
          <p className="text-gray-300">{insights.summary}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-md font-medium mb-3 flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
            Key Insights
          </h3>
          {insights?.insights && insights.insights.length > 0 ? (
            insights.insights.slice(0, 2).map(renderInsightItem)
          ) : (
            <p className="text-gray-400 text-sm">No insights available</p>
          )}
        </div>
        
        <div>
          <h3 className="text-md font-medium mb-3 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
            Opportunities
          </h3>
          {insights?.opportunities && insights.opportunities.length > 0 ? (
            insights.opportunities.slice(0, 2).map(renderOpportunityItem)
          ) : (
            <p className="text-gray-400 text-sm">No opportunities available</p>
          )}
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-md font-medium mb-3 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 text-blue-400" />
          Top Recommendations
        </h3>
        {insights?.recommendations && insights.recommendations.length > 0 ? (
          insights.recommendations.slice(0, 3).map(renderRecommendationItem)
        ) : (
          <p className="text-gray-400 text-sm">No recommendations available</p>
        )}
      </div>
    </div>
  )
  
  const renderInsightsTab = () => (
    <div>
      <h3 className="text-md font-medium mb-3 flex items-center">
        <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
        Detailed Insights
      </h3>
      {insights?.insights && insights.insights.length > 0 ? (
        insights.insights.map(renderInsightItem)
      ) : (
        <p className="text-gray-400 text-sm">No insights available</p>
      )}
    </div>
  )
  
  const renderOpportunitiesTab = () => (
    <div>
      <h3 className="text-md font-medium mb-3 flex items-center">
        <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
        Growth Opportunities
      </h3>
      {insights?.opportunities && insights.opportunities.length > 0 ? (
        insights.opportunities.map(renderOpportunityItem)
      ) : (
        <p className="text-gray-400 text-sm">No opportunities available</p>
      )}
    </div>
  )
  
  const renderRisksTab = () => (
    <div>
      <h3 className="text-md font-medium mb-3 flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2 text-amber-400" />
        Potential Risks
      </h3>
      {insights?.risks && insights.risks.length > 0 ? (
        insights.risks.map(renderRiskItem)
      ) : (
        <p className="text-gray-400 text-sm">No risks identified</p>
      )}
    </div>
  )
  
  const renderRecommendationsTab = () => (
    <div>
      <h3 className="text-md font-medium mb-3 flex items-center">
        <CheckCircle className="h-5 w-5 mr-2 text-blue-400" />
        Actionable Recommendations
      </h3>
      {insights?.recommendations && insights.recommendations.length > 0 ? (
        insights.recommendations.map(renderRecommendationItem)
      ) : (
        <p className="text-gray-400 text-sm">No recommendations available</p>
      )}
    </div>
  )
  
  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">AI Insights</CardTitle>
          <CardDescription>
            Data-driven insights and recommendations powered by AI
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
              Analyzing...
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
        <Tabs defaultValue="overview" value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>
          
          <div className="mt-2">
            <TabsList className="mb-6">
              <TabsTrigger value="overall" onClick={() => fetchInsights('overall')}>
                Overall
              </TabsTrigger>
              <TabsTrigger value="sales" onClick={() => fetchInsights('sales')}>
                Sales
              </TabsTrigger>
              <TabsTrigger value="customers" onClick={() => fetchInsights('customers')}>
                Customers
              </TabsTrigger>
              <TabsTrigger value="products" onClick={() => fetchInsights('products')}>
                Products
              </TabsTrigger>
              <TabsTrigger value="inventory" onClick={() => fetchInsights('inventory')}>
                Inventory
              </TabsTrigger>
            </TabsList>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400">Analyzing your store data...</p>
                <p className="text-xs text-gray-500 mt-2">This may take a moment</p>
              </div>
            </div>
          ) : !insights ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-gray-400">No insights available</p>
                <p className="text-xs text-gray-500 mt-2">Try refreshing or selecting a different focus area</p>
              </div>
            </div>
          ) : (
            <>
              <TabsContent value="overview" className="mt-0">
                {renderOverviewTab()}
              </TabsContent>
              <TabsContent value="insights" className="mt-0">
                {renderInsightsTab()}
              </TabsContent>
              <TabsContent value="opportunities" className="mt-0">
                {renderOpportunitiesTab()}
              </TabsContent>
              <TabsContent value="risks" className="mt-0">
                {renderRisksTab()}
              </TabsContent>
              <TabsContent value="recommendations" className="mt-0">
                {renderRecommendationsTab()}
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
} 