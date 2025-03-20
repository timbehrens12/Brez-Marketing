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