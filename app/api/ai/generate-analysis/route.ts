import { NextRequest, NextResponse } from 'next/server';
import { getGPT4Response } from '@/lib/openai';
import { auth } from '@clerk/nextjs';

export const maxDuration = 30; // Set max duration for Vercel Functions

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { 
      period,
      metrics,
      comparison,
      bestSellingProducts = [],
      platformData = { shopifyConnected: false, metaConnected: false }
    } = await request.json();
    
    if (!period || !metrics || !comparison) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Process platform data
    const platformsConnected = [];
    if (platformData?.shopifyConnected) platformsConnected.push('Shopify');
    if (platformData?.metaConnected) platformsConnected.push('Meta Ads');
    
    const comparisonText = period === 'daily' ? 'yesterday' : 'last month';
    
    // Format the data for the AI
    const dataForAI = {
      period,
      metrics,
      comparison,
      bestSellingProducts,
      connectedPlatforms: platformsConnected
    };
    
    // Create system prompt for the AI with structured output requirements
    const systemPrompt = `You are an expert e-commerce analytics AI assistant providing analysis for a business dashboard.
    
Your task is to analyze the provided data and generate a structured report with insightful observations about business performance.

${period === 'daily' ? 'For today\'s data analysis:' : 'For this month\'s data analysis:'}

Please structure your response in the following format with clear section breaks:

PART 1: GENERAL OVERVIEW
- Begin with a 2-3 sentence summary of the overall performance
- Compare to ${comparisonText} using the growth percentages provided
- Highlight the most significant metrics (revenue, orders, ROAS, etc.)
- Keep this section to 150-200 words maximum

PART 2: POSITIVE HIGHLIGHTS
- Create 3-4 bullet points of positive performance areas
- Each highlight should be specific and data-driven
- Examples: "Strong performance in X product category with Y% growth" or "Advertising ROAS improved to X from Y"

PART 3: AREAS NEEDING ATTENTION
- Create 2-3 bullet points of areas that need improvement
- Be specific about the metrics showing concerns
- Examples: "Mobile conversion rate lags behind desktop by X%" or "Ad spend increased by X% but resulted in only Y% revenue growth"

PART 4: RECOMMENDED ACTIONS
- Provide 3-4 specific, actionable recommendations based on the data
- Each recommendation should be clear and directly tied to the analysis
- Examples: "Consider restocking [product name] within 7 days based on current sales velocity" or "Optimize mobile checkout process to address the 25% lower conversion rate"

Important formatting guidelines:
1. Use professional, concise language throughout
2. Do NOT include the section headers (PART 1, PART 2, etc.) in your response
3. Use paragraph breaks between sections
4. For highlights, attention areas, and recommendations, use bullet point format
5. Do NOT mention that you are an AI in your response
6. Only analyze available data - if certain metrics are missing, adapt your analysis accordingly

The response should mirror the structure of the existing hard-coded analyses in the dashboard but with insights specific to the current data.`;

    // Get AI response
    const aiResponse = await getGPT4Response(systemPrompt, JSON.stringify(dataForAI), 0.7);
    
    return NextResponse.json({ analysis: aiResponse });
    
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return NextResponse.json({ 
      analysis: 'Unable to generate AI analysis at this time. Please try refreshing the page or check back later.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 