"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2, Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { AlertBox } from '@/components/ui/alert-box'

interface AIDashboardAnalysisProps {
  brandId: string
  period: 'daily' | 'monthly' | 'weekly'
  metrics: any
  comparison: any
  bestSellingProducts?: Array<{ name: string; revenue: number; orders: number }>
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
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getToken } = useAuth()

  useEffect(() => {
    if (brandId && period && metrics) {
      generateAnalysis()
    }
  }, [brandId, period, metrics])

  const generateAnalysis = async () => {
    // Reset state
    setIsLoading(true)
    setError(null)
    
    try {
      // Strict validation to ensure we only have real data
      const hasSalesData = 
        typeof metrics.totalSales === 'number' && metrics.totalSales > 0 && 
        (typeof metrics.ordersCount === 'number' && metrics.ordersCount > 0 || 
         typeof metrics.ordersPlaced === 'number' && metrics.ordersPlaced > 0)
      
      if (!hasSalesData) {
        setError(`Insufficient sales data available for ${period === 'daily' ? 'today' : period === 'weekly' ? 'this week' : 'this month'}. Please check back when more data is available.`)
        setIsLoading(false)
        return
      }
      
      // Extremely strict validation for products - filter out any test/demo products
      const validProducts = Array.isArray(bestSellingProducts) 
        ? bestSellingProducts
            .filter(p => 
              p && 
              typeof p.name === 'string' && 
              p.name.trim() !== '' && 
              typeof p.revenue === 'number' && 
              p.revenue > 0 &&
              typeof p.orders === 'number' && 
              p.orders > 0)
            .filter(p => {
              const nameLower = p.name.toLowerCase();
              return !nameLower.includes('test') && 
                     !nameLower.includes('demo') && 
                     !nameLower.includes('sample') && 
                     !nameLower.includes('unused') &&
                     !nameLower.includes('placeholder');
            })
        : [];
      
      console.log('AI Dashboard Analysis - Validated Products:', validProducts);
      
      // Create clean metrics object - only include non-zero/valid metrics
      const cleanMetrics = {
        totalSales: typeof metrics.totalSales === 'number' ? metrics.totalSales : 0,
        ordersCount: typeof metrics.ordersCount === 'number' ? metrics.ordersCount : 0,
        // Only include these if they actually exist with valid values
        ...(typeof metrics.averageOrderValue === 'number' && metrics.averageOrderValue > 0 
          ? { averageOrderValue: metrics.averageOrderValue } : {}),
        ...(typeof metrics.customerCount === 'number' && metrics.customerCount > 0 
          ? { customerCount: metrics.customerCount } : {}),
        ...(typeof metrics.newCustomers === 'number'
          ? { newCustomers: metrics.newCustomers } : {}),
        ...(typeof metrics.returningCustomers === 'number' && metrics.returningCustomers > 0 
          ? { returningCustomers: metrics.returningCustomers } : {}),
        // Only include conversion rate if explicitly provided
        ...(typeof metrics.conversionRate === 'number' && metrics.conversionRate > 0 
          ? { conversionRate: metrics.conversionRate } : {}),
        ...(typeof metrics.adSpend === 'number'
          ? { adSpend: metrics.adSpend } : {}),
        ...(typeof metrics.roas === 'number' && metrics.roas > 0
          ? { roas: metrics.roas } : {}),
        ...(typeof metrics.ctr === 'number' && metrics.ctr > 0
          ? { ctr: metrics.ctr } : {}),
        ...(typeof metrics.cpc === 'number' && metrics.cpc > 0
          ? { cpc: metrics.cpc } : {})
      };
      
      // Clean comparison data - only include what's relevant
      const cleanComparison = {
        salesGrowth: typeof comparison.salesGrowth === 'number' ? comparison.salesGrowth : 0,
        orderGrowth: typeof comparison.orderGrowth === 'number' ? comparison.orderGrowth : 0,
        ...(typeof comparison.customerGrowth === 'number' && cleanMetrics.customerCount
          ? { customerGrowth: comparison.customerGrowth } : {}),
        ...(typeof comparison.roasGrowth === 'number' && cleanMetrics.roas
          ? { roasGrowth: comparison.roasGrowth } : {}),
        ...(typeof comparison.conversionGrowth === 'number' && cleanMetrics.conversionRate
          ? { conversionGrowth: comparison.conversionGrowth } : {}),
        ...(typeof comparison.adSpendGrowth === 'number' && typeof cleanMetrics.adSpend === 'number'
          ? { adSpendGrowth: comparison.adSpendGrowth } : {})
      };
      
      // Prepare the data for the API with validation
      const platformData = {
        shopifyConnected: true, // Determine this based on your actual connections
        metaConnected: typeof metrics.adSpend === 'number' && metrics.adSpend > 0
      }
      
      // Call the API to generate the analysis
      const response = await fetch('/api/ai/generate-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getToken()}`
        },
        body: JSON.stringify({
          period,
          metrics: cleanMetrics,
          comparison: cleanComparison,
          bestSellingProducts: validProducts,
          platformData
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate AI analysis')
      }
      
      const data = await response.json()
      setAiAnalysis(data.analysis)
    } catch (error) {
      console.error('Error generating AI analysis:', error)
      setError('Unable to generate AI analysis at this time. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  // Determine the title based on the period
  const getAnalysisTitle = () => {
    switch (period) {
      case 'daily':
        return "Today's Performance"
      case 'weekly':
        return "This Week's Performance"
      case 'monthly':
        return "Monthly Performance"
      default:
        return "Performance Analysis"
    }
  }

  if (error) {
    return (
      <AlertBox 
        type="warning" 
        title="Analysis Unavailable"
        className="my-4"
      >
        {error}
      </AlertBox>
    )
  }

  return (
    <div className="bg-[#1E1E1E] p-4 rounded-lg mb-6 border border-[#333] text-gray-300">
      <div className="flex items-center mb-3">
        <Sparkles className="text-blue-400 mr-2 h-5 w-5" />
        <h5 className="font-medium">AI Analysis: {getAnalysisTitle()}</h5>
      </div>
      
      <div className="text-sm leading-relaxed space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400 mb-2" />
            <p>Generating AI analysis...</p>
          </div>
        ) : aiAnalysis ? (
          <>
            {/* AI Generated Analysis - Main overview section */}
            <div className="mb-4">
              <div className="whitespace-pre-line">{aiAnalysis.split('\n\n')[0]}</div>
            </div>
            
            {/* Positive Highlights section */}
            <div>
              <h6 className="text-green-400 font-medium flex items-center mb-2">
                <TrendingUp className="h-3.5 w-3.5 mr-1" /> Positive Highlights
              </h6>
              <div className="whitespace-pre-line ml-1">
                {aiAnalysis.split('\n\n')[1]}
              </div>
            </div>
            
            {/* Areas Needing Attention section */}
            <div>
              <h6 className="text-amber-400 font-medium flex items-center mb-2">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Areas Needing Attention
              </h6>
              <div className="whitespace-pre-line ml-1">
                {aiAnalysis.split('\n\n')[2]}
              </div>
            </div>
            
            {/* Actionable Recommendations section */}
            <div>
              <h6 className="text-blue-400 font-medium flex items-center mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Recommended Actions
              </h6>
              <div className="whitespace-pre-line ml-1">
                {aiAnalysis.split('\n\n')[3] || recommendations.map((rec, i) => (
                  <div key={i} className="mb-1">• {rec}</div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p>Click the button below to generate an AI analysis of your performance data.</p>
            <button 
              onClick={generateAnalysis}
              className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
            >
              Generate Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 