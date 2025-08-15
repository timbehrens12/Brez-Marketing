# AI-Powered Analysis Implementation Guide

This guide provides step-by-step instructions for enhancing the `GreetingWidget` component with AI-generated content using the OpenAI GPT-4 API.

## Overview

The implementation involves:
1. Adding state variables to track AI analysis content and loading states
2. Creating a utility function to generate AI analysis using the OpenAI API
3. Modifying the data fetching to include AI analysis generation
4. Updating the UI to display dynamic AI-generated content

## Step-by-Step Implementation

### 1. Add Required Imports

First, make sure these imports are included at the top of your `GreetingWidget.tsx` file:

```tsx
import { getGPT4Response } from '@/lib/openai';
import { Loader2 } from 'lucide-react';
```

### 2. Add State Variables

Inside the `GreetingWidget` component, add these state variables:

```tsx
const [dailyAiAnalysis, setDailyAiAnalysis] = useState<string>('');
const [monthlyAiAnalysis, setMonthlyAiAnalysis] = useState<string>('');
const [isLoadingDailyAnalysis, setIsLoadingDailyAnalysis] = useState<boolean>(false);
const [isLoadingMonthlyAnalysis, setIsLoadingMonthlyAnalysis] = useState<boolean>(false);
```

### 3. Create the AI Analysis Generator Function

Add this utility function to your component file (outside the component):

```tsx
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
```

### 4. Update the fetchPeriodData Function

Modify the `fetchPeriodData` function to generate AI analysis after fetching the report data:

```tsx
// Within the fetchPeriodData function, after setting dailyReport
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

// Similarly for monthly report
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
```

### 5. Update the UI - Daily View

Find and replace the AI Analysis Summary section for the daily view with:

```tsx
{/* AI Analysis Summary - Daily view */}
<div className="bg-[#1E1E1E] p-4 rounded-lg mb-6 border border-[#333] text-gray-300">
  <div className="flex items-center mb-3">
    <Sparkles className="text-blue-400 mr-2 h-5 w-5" />
    <h5 className="font-medium">AI Analysis: Today's Performance</h5>
  </div>
  
  <div className="text-sm leading-relaxed space-y-4">
    {isLoadingDailyAnalysis ? (
      <div className="flex flex-col items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400 mb-2" />
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
```

### 6. Update the UI - Monthly View

Find and replace the AI Analysis Summary section for the monthly view with:

```tsx
{/* AI Analysis Summary - Monthly view */}
<div className="bg-[#1E1E1E] p-4 rounded-lg mb-6 border border-[#333] text-gray-300">
  <div className="flex items-center mb-3">
    <Sparkles className="text-blue-400 mr-2 h-5 w-5" />
    <h5 className="font-medium">AI Analysis: Monthly Performance</h5>
  </div>
  
  <div className="text-sm leading-relaxed space-y-4">
    {isLoadingMonthlyAnalysis ? (
      <div className="flex flex-col items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400 mb-2" />
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
```

### 7. Update Conditional Rendering for No Data

If there's no data available, ensure proper user-friendly messages are displayed:

```tsx
// If there's no data for daily report
if (!dailyReport || dailyReport.revenueGenerated === 0) {
  return (
    <div className="bg-[#2A2A2A]/50 p-4 rounded-xl mt-4 mb-5 border border-blue-500/20">
      <div className="flex items-start mb-3">
        <Sparkles className="h-4 w-4 text-blue-400 mt-1 mr-2 flex-shrink-0" />
        <h6 className="text-sm font-medium text-blue-400">
          AI Daily Performance Analysis
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
        
        <p>Data typically updates throughout the day. You can check back later or view the monthly tab for historical performance.</p>
      </div>
    </div>
  );
}
```

## Testing the Implementation

Once implemented, test the following scenarios:

1. **Full data available**: Ensure the AI analysis generates and displays properly
2. **Loading state**: Verify the loading spinner appears while the analysis is being generated
3. **No data available**: Confirm the user-friendly message appears when there's no data
4. **Error handling**: Test that the error message and retry button work correctly

## Notes

- The OpenAI API key is expected to be configured in Vercel environment variables
- The implementation uses the existing `getGPT4Response` function from `lib/openai.ts`
- The analysis respects the current layout of the dashboard
- If data is insufficient, the component will display appropriate user-friendly messages 