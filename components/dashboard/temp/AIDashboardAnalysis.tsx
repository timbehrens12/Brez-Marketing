"use client"

import React, { useState, useEffect } from 'react'
import { Sparkles, Loader2, CheckCircle2, TrendingUp, TrendingDown, ArrowRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { getGPT4Response } from '@/lib/openai'

interface AIDashboardAnalysisProps {
  brandId: string
  period: 'daily' | 'monthly'
  metrics: {
    totalSales: number
    ordersCount: number
    averageOrderValue: number
    adSpend: number
    roas: number
  }
  comparison: {
    salesGrowth: number
    orderGrowth: number
    roasGrowth: number
    adSpendGrowth: number
  }
  bestSellingProducts?: Array<{
    name: string
    revenue: number
    orders: number
  }>
  recommendations?: string[]
}

// Function to parse the AI response into sections
const parseAIResponse = (response: string) => {
  if (!response) return { 
    mainAnalysis: '', 
    positiveHighlights: [], 
    areasNeedingAttention: [], 
    recommendedActions: [] 
  };

  // Split the response into sections
  const mainAnalysisMatch = response.match(/^([\s\S]*?)(?=POSITIVE HIGHLIGHTS:|$)/);
  const positiveHighlightsMatch = response.match(/POSITIVE HIGHLIGHTS:([\s\S]*?)(?=AREAS NEEDING ATTENTION:|$)/);
  const areasNeedingAttentionMatch = response.match(/AREAS NEEDING ATTENTION:([\s\S]*?)(?=RECOMMENDED ACTIONS:|$)/);
  const recommendedActionsMatch = response.match(/RECOMMENDED ACTIONS:([\s\S]*?)$/);

  // Process main analysis
  const mainAnalysis = mainAnalysisMatch ? mainAnalysisMatch[1].trim() : '';
  
  // Process bullet points sections
  const processSection = (match: RegExpMatchArray | null): string[] => {
    if (!match || !match[1]) return [];
    return match[1]
      .split('-')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  };

  const positiveHighlights = processSection(positiveHighlightsMatch);
  const areasNeedingAttention = processSection(areasNeedingAttentionMatch);
  const recommendedActions = processSection(recommendedActionsMatch);

  return {
    mainAnalysis,
    positiveHighlights,
    areasNeedingAttention,
    recommendedActions
  };
};

export function AIDashboardAnalysis({
  brandId,
  period,
  metrics,
  comparison,
  bestSellingProducts = [],
  recommendations = []
}: AIDashboardAnalysisProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generateAnalysis()
  }, [brandId, period, metrics])

  const generateAnalysis = async () => {
    // Don't generate analysis if there's no sales data
    if (metrics.totalSales === 0 && metrics.ordersCount === 0) {
      setError('Insufficient data available for analysis')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const comparisonText = period === 'daily' ? 'yesterday' : 'last month'
      
      // Format the data for the AI
      const dataForAI = {
        period,
        metrics,
        comparison,
        bestSellingProducts
      }
      
      // Create system prompt for the AI with specific structure requirements
      const systemPrompt = `You are an expert e-commerce analytics AI assistant providing analysis for a business dashboard.
      
Your task is to analyze the provided data and generate a structured report with the following sections:

1. MAIN ANALYSIS: 150-200 words of insightful observations about business performance.
2. POSITIVE HIGHLIGHTS: 3 bullet points of positive aspects from the data.
3. AREAS NEEDING ATTENTION: 2-3 bullet points of concerning metrics or areas for improvement.
4. RECOMMENDED ACTIONS: 3-4 specific actionable steps the business should take.

For the main analysis:
- Focus on key trends, comparing to ${comparisonText}
- Highlight notable metrics (revenue, orders, ROAS, etc.)
- Identify product performance patterns if data is available
- Provide context for advertising metrics if available
- Keep your response professional and data-driven
- Indicate clearly if certain analysis isn't possible due to missing data

Format your response exactly like this:
\`\`\`
[Your main analysis paragraphs here]

POSITIVE HIGHLIGHTS:
- [First positive highlight]
- [Second positive highlight]
- [Third positive highlight]

AREAS NEEDING ATTENTION:
- [First area needing attention]
- [Second area needing attention]
- [Optional third area]

RECOMMENDED ACTIONS:
- [First recommended action]
- [Second recommended action]
- [Third recommended action]
- [Optional fourth recommended action]
\`\`\`

Important notes:
- Only analyze available data. If no ad platform data exists, focus on sales data.
- If limited data is available, acknowledge the limitations.
- Do NOT mention that you are an AI in your response.
- Be specific with your recommendations, not generic.
- For the ${period} analysis, tailor your response appropriately.`

      // Get AI response
      const aiResponse = await getGPT4Response(systemPrompt, JSON.stringify(dataForAI), 0.7)
      setAiAnalysis(aiResponse)
    } catch (error) {
      console.error('Error generating AI analysis:', error)
      setError('Unable to generate AI analysis. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  // No data message
  if (metrics.totalSales === 0 && metrics.ordersCount === 0) {
    return (
      <div className="bg-[#2A2A2A]/50 p-4 rounded-xl mt-4 mb-5 border border-blue-500/20">
        <div className="flex items-start mb-3">
          <Sparkles className="h-4 w-4 text-blue-400 mt-1 mr-2 flex-shrink-0" />
          <h6 className="text-sm font-medium text-blue-400">
            AI {period === 'daily' ? 'Daily' : 'Monthly'} Performance Analysis
          </h6>
        </div>
        
        <p className="mb-4">There isn't enough data available to generate a complete analysis.</p>
        
        <p className="mb-4">Your dashboard is ready to analyze your performance as soon as data becomes available. This could be because:</p>
        
        <ul className="list-disc pl-5 mb-4 space-y-1">
          <li>No sales have been recorded yet</li>
          <li>Your ad campaigns may not have delivered metrics yet</li>
          <li>There might be a delay in data synchronization</li>
        </ul>
        
        <p>{period === 'daily' 
          ? 'Data typically updates throughout the day. You can check back later or view the monthly tab for historical performance.' 
          : 'Connect your store and ad platforms to see comprehensive performance data.'}</p>
        
        <span className="mt-3 block text-blue-400 font-medium">
          Visit the AI Intelligence page for historical analysis and marketing recommendations based on your past performance.
        </span>
      </div>
    )
  }

  // Parse the AI response
  const parsedAnalysis = parseAIResponse(aiAnalysis);

  return (
    <div className="bg-[#1E1E1E] p-4 rounded-lg mb-6 border border-[#333] text-gray-300">
      <div className="flex items-center mb-3">
        <Sparkles className="text-blue-400 mr-2 h-5 w-5" />
        <h5 className="font-medium">AI Analysis: {period === 'daily' ? 'Today\'s' : 'Monthly'} Performance</h5>
      </div>
      
      <div className="text-sm leading-relaxed space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400 mb-2" />
            <p>Generating AI analysis...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p>{error}</p>
            <button 
              onClick={generateAnalysis}
              className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
            >
              Try Again
            </button>
          </div>
        ) :
          <>
            {/* Main Analysis */}
            <div className="border-b border-gray-800 pb-3">
              <div className="whitespace-pre-line">{parsedAnalysis.mainAnalysis}</div>
            </div>
            
            {/* Positive Highlights Section */}
            {parsedAnalysis.positiveHighlights.length > 0 && (
              <div>
                <h6 className="text-green-400 font-medium flex items-center mb-2">
                  <TrendingUp className="h-3.5 w-3.5 mr-1" /> Positive Highlights
                </h6>
                <ul className="space-y-1.5 pl-5 list-disc">
                  {parsedAnalysis.positiveHighlights.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Areas Needing Attention Section */}
            {parsedAnalysis.areasNeedingAttention.length > 0 && (
              <div>
                <h6 className="text-amber-400 font-medium flex items-center mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Areas Needing Attention
                </h6>
                <ul className="space-y-1.5 pl-5 list-disc">
                  {parsedAnalysis.areasNeedingAttention.map((area, index) => (
                    <li key={index}>{area}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Recommended Actions Section */}
            {parsedAnalysis.recommendedActions.length > 0 && (
              <div>
                <h6 className="text-blue-400 font-medium flex items-center mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Recommended Actions
                </h6>
                <ul className="space-y-1.5 pl-5 list-disc">
                  {parsedAnalysis.recommendedActions.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        }
      </div>
      
      <div className="mt-4 flex justify-between items-center border-t border-gray-800 pt-4">
        <p className="text-xs text-gray-500">
          {period === 'daily' ? 'Today\'s' : 'Monthly'} data analysis
        </p>
        <Link href="/ai-dashboard" className="text-xs text-blue-400 flex items-center">
          See more insights in AI Intelligence
          <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </div>
    </div>
  )
} 