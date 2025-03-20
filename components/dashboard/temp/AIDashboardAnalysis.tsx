"use client"

import React, { useState, useEffect } from 'react'
import { Sparkles, Loader2, CheckCircle2, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
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
      
      // Create system prompt for the AI
      const systemPrompt = `You are an expert e-commerce analytics AI assistant providing analysis for a business dashboard.
      
Your task is to analyze the provided data and generate insightful, concise observations about business performance.

${period === 'daily' ? 'For today\'s data analysis:' : 'For this month\'s data analysis:'}
1. Focus on key trends, comparing to ${comparisonText}.
2. Highlight notable metrics (revenue, orders, ROAS, etc.).
3. Identify product performance patterns if data is available.
4. Provide context for advertising metrics if available.
5. Keep your response between 150-300 words, using a professional tone.
6. Use paragraphs to organize information.
7. Indicate clearly if certain analysis isn't possible due to missing data.
8. Do NOT mention that you are an AI in your response.

Important: Only analyze available data. If no ad platform data exists, focus on sales data. If limited data is available, acknowledge the limitations.`

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
        
        <div className="text-sm text-gray-300 leading-relaxed">
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
      </div>
    )
  }

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
        ) : (
          <>
            {/* AI Generated Analysis */}
            <div className="border-b border-gray-800 pb-3">
              <div className="whitespace-pre-line">{aiAnalysis}</div>
            </div>
            
            {/* Positive Highlights section */}
            <div>
              <h6 className="text-green-400 font-medium flex items-center mb-2">
                <TrendingUp className="h-3.5 w-3.5 mr-1" /> Positive Highlights
              </h6>
              <ul className="space-y-1.5 pl-5 list-disc">
                <li>Average order value increased to ${metrics.averageOrderValue.toFixed(2)}, 
                  up {Math.abs(comparison.orderGrowth).toFixed(1)}% from {period === 'daily' ? 'yesterday' : 'last month'}</li>
                {bestSellingProducts.length > 0 && (
                  <li>{bestSellingProducts[0].name} is the top performer, generating ${bestSellingProducts[0].revenue.toFixed(2)} in revenue</li>
                )}
                {metrics.roas > 0 && (
                  <li>ROAS of {metrics.roas.toFixed(1)}x shows {comparison.roasGrowth > 0 ? 'improved' : 'consistent'} campaign efficiency</li>
                )}
              </ul>
            </div>
            
            {/* Actionable Recommendations section */}
            <div>
              <h6 className="text-blue-400 font-medium flex items-center mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Recommended Actions
              </h6>
              <ul className="space-y-1.5 pl-5 list-disc">
                {recommendations.length > 0 ? (
                  recommendations.map((recommendation, index) => (
                    <li key={index}>{recommendation}</li>
                  ))
                ) : (
                  <>
                    <li>Optimize your top-selling products for better visibility</li>
                    <li>Consider inventory adjustments based on sales velocity</li>
                    <li>Review marketing campaigns to improve ROAS</li>
                  </>
                )}
              </ul>
            </div>
          </>
        )}
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