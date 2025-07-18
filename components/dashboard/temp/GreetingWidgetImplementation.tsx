// This file shows the implementation needed for the GreetingWidget component
// Import existing libs and the new function for OpenAI

import { useEffect, useState } from 'react';
import { getGPT4Response } from '@/lib/openai';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';

// Add state variables to the component
function GreetingWidget() {
  // ... existing state variables
  
  const [dailyAiAnalysis, setDailyAiAnalysis] = useState<string>('');
  const [monthlyAiAnalysis, setMonthlyAiAnalysis] = useState<string>('');
  const [isLoadingDailyAnalysis, setIsLoadingDailyAnalysis] = useState<boolean>(false);
  const [isLoadingMonthlyAnalysis, setIsLoadingMonthlyAnalysis] = useState<boolean>(false);
  
  // ... rest of existing code

  // Add this utility function outside the component
  async function generateRealAIAnalysis(
    period: 'daily' | 'monthly',
    metrics: any,
    comparison: any,
    bestSellingProducts?: any[],
    platformData?: {
      shopifyConnected: boolean;
      metaConnected: boolean;
    }
  ): Promise<string> {
    // Format the data for the AI
    const dataForAI = {
      period,
      metrics,
      comparison,
      bestSellingProducts,
      platformConnections: platformData
    };
    
    const comparisonText = period === 'daily' ? 'yesterday' : 'last month';
    
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

Important: Only analyze available data. If no ad platform data exists, focus on sales data. If limited data is available, acknowledge the limitations.`;

    // Get AI response
    return await getGPT4Response(systemPrompt, JSON.stringify(dataForAI), 0.7);
  }

  // Modify the fetchPeriodData function to include AI analysis generation
  const fetchPeriodData = async () => {
    // ... existing code for fetching data
    
    try {
      // After setting the daily report data
      if (dailyReport && dailyReport.revenueGenerated > 0) {
        setIsLoadingDailyAnalysis(true);
        
        const platformData = {
          shopifyConnected: !!shopifyConnection,
          metaConnected: !!metaConnection
        };
        
        try {
          const analysis = await generateRealAIAnalysis(
            'daily',
            {
              totalSales: dailyReport.revenueGenerated,
              ordersCount: dailyReport.totalPurchases,
              averageOrderValue: dailyReport.revenueGenerated / dailyReport.totalPurchases,
              adSpend: dailyReport.totalAdSpend,
              roas: dailyReport.averageRoas
            },
            dailyReport.periodComparison,
            dailyReport.bestSellingProducts,
            platformData
          );
          
          setDailyAiAnalysis(analysis);
        } catch (error) {
          console.error('Error generating daily AI analysis:', error);
        } finally {
          setIsLoadingDailyAnalysis(false);
        }
      }
      
      // After setting the monthly report data
      if (monthlyReport && monthlyReport.revenueGenerated > 0) {
        setIsLoadingMonthlyAnalysis(true);
        
        const platformData = {
          shopifyConnected: !!shopifyConnection,
          metaConnected: !!metaConnection
        };
        
        try {
          const analysis = await generateRealAIAnalysis(
            'monthly',
            {
              totalSales: monthlyReport.revenueGenerated,
              ordersCount: monthlyReport.totalPurchases,
              averageOrderValue: monthlyReport.revenueGenerated / monthlyReport.totalPurchases,
              adSpend: monthlyReport.totalAdSpend,
              roas: monthlyReport.averageRoas
            },
            monthlyReport.periodComparison,
            monthlyReport.bestSellingProducts,
            platformData
          );
          
          setMonthlyAiAnalysis(analysis);
        } catch (error) {
          console.error('Error generating monthly AI analysis:', error);
        } finally {
          setIsLoadingMonthlyAnalysis(false);
        }
      }
      
    } catch (error) {
      // ... existing error handling
    }
  };
  
  // In the rendering section, find the AI Analysis Summary section for Daily view
  // Replace with:
  
  {/* AI Analysis Summary - Daily view */}
  <div className="bg-[#1E1E1E] p-4 rounded-lg mb-6 border border-[#333] text-gray-300">
    <div className="flex items-center mb-3">
      <Sparkles className="text-blue-400 mr-2 h-5 w-5" />
      <h5 className="font-medium">AI Analysis: Today's Performance</h5>
    </div>
    
    <div className="text-sm leading-relaxed space-y-4">
      {isLoadingDailyAnalysis ? (
        <div className="flex flex-col items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 mb-2" />
          <p>Generating AI analysis...</p>
        </div>
      ) : dailyAiAnalysis ? (
        <>
          {/* AI Generated Analysis */}
          <div className="border-b border-gray-800 pb-3">
            <div className="whitespace-pre-line">{dailyAiAnalysis}</div>
          </div>
          
          {/* Actionable Recommendations section */}
          <div>
            <h6 className="text-blue-400 font-medium flex items-center mb-2">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Recommended Actions
            </h6>
            <ul className="space-y-1.5 pl-5 list-disc">
              {dailyReport.recommendations.map((recommendation, index) => (
                <li key={index}>{recommendation}</li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p>Unable to generate AI analysis at this time. Please try refreshing the page or check back later.</p>
          <button 
            onClick={() => fetchPeriodData()}
            className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  </div>
  
  // Similarly for the Monthly view, replace the section with:
  
  {/* AI Analysis Summary - Monthly view */}
  <div className="bg-[#1E1E1E] p-4 rounded-lg mb-6 border border-[#333] text-gray-300">
    <div className="flex items-center mb-3">
      <Sparkles className="text-blue-400 mr-2 h-5 w-5" />
      <h5 className="font-medium">AI Analysis: Monthly Performance</h5>
    </div>
    
    <div className="text-sm leading-relaxed space-y-4">
      {isLoadingMonthlyAnalysis ? (
        <div className="flex flex-col items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 mb-2" />
          <p>Generating AI analysis...</p>
        </div>
      ) : monthlyAiAnalysis ? (
        <>
          {/* AI Generated Analysis */}
          <div className="border-b border-gray-800 pb-3">
            <div className="whitespace-pre-line">{monthlyAiAnalysis}</div>
          </div>
          
          {/* Actionable Recommendations section */}
          <div>
            <h6 className="text-blue-400 font-medium flex items-center mb-2">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Recommended Actions
            </h6>
            <ul className="space-y-1.5 pl-5 list-disc">
              {monthlyReport.recommendations.map((recommendation, index) => (
                <li key={index}>{recommendation}</li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p>Unable to generate AI analysis at this time. Please try refreshing the page or check back later.</p>
          <button 
            onClick={() => fetchPeriodData()}
            className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  </div>
}

export default GreetingWidget; 