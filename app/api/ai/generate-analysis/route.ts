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
    
    // Clean and validate the data to ensure we only use real data
    const validatedMetrics = {
      totalSales: typeof metrics.totalSales === 'number' ? metrics.totalSales : 0,
      ordersCount: typeof metrics.ordersCount === 'number' ? metrics.ordersCount : 0,
      averageOrderValue: typeof metrics.averageOrderValue === 'number' ? metrics.averageOrderValue : 0,
      customerCount: typeof metrics.customerCount === 'number' ? metrics.customerCount : 0,
      newCustomers: typeof metrics.newCustomers === 'number' ? metrics.newCustomers : 0,
      returningCustomers: typeof metrics.returningCustomers === 'number' ? metrics.returningCustomers : 0,
      conversionRate: typeof metrics.conversionRate === 'number' ? metrics.conversionRate : 0,
      adSpend: typeof metrics.adSpend === 'number' ? metrics.adSpend : 0,
      roas: typeof metrics.roas === 'number' ? metrics.roas : 0,
      ctr: typeof metrics.ctr === 'number' ? metrics.ctr : 0,
      cpc: typeof metrics.cpc === 'number' ? metrics.cpc : 0
    };
    
    const validatedComparison = {
      salesGrowth: typeof comparison.salesGrowth === 'number' ? comparison.salesGrowth : 0,
      orderGrowth: typeof comparison.orderGrowth === 'number' ? comparison.orderGrowth : 0,
      customerGrowth: typeof comparison.customerGrowth === 'number' ? comparison.customerGrowth : 0,
      roasGrowth: typeof comparison.roasGrowth === 'number' ? comparison.roasGrowth : 0,
      conversionGrowth: typeof comparison.conversionGrowth === 'number' ? comparison.conversionGrowth : 0,
      adSpendGrowth: typeof comparison.adSpendGrowth === 'number' ? comparison.adSpendGrowth : 0
    };
    
    // Validate bestselling products to ensure they have name and revenue
    const validatedProducts = Array.isArray(bestSellingProducts) 
      ? bestSellingProducts
          .filter(product => product && typeof product.name === 'string' && product.name.trim() !== '' && typeof product.revenue === 'number')
          .map(product => ({
            name: product.name,
            revenue: product.revenue,
            orders: typeof product.orders === 'number' ? product.orders : 0
          }))
      : [];
    
    // Format the data for the AI
    const dataForAI = {
      period,
      metrics: validatedMetrics,
      comparison: validatedComparison,
      bestSellingProducts: validatedProducts,
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
- Create 2-3 bullet points of positive performance areas
- Each highlight should be specific and data-driven
- Only mention actual products that appear in the bestSellingProducts array
- If there are no clear positives, focus on the most stable metrics

PART 3: AREAS NEEDING ATTENTION
- Create 2-3 bullet points of areas that need improvement
- Be specific about the metrics showing concerns
- Only reference actual data points, never assume or invent values
- If metrics are zero or missing, note this as an area for data collection improvement

PART 4: RECOMMENDED ACTIONS
- Provide 2-3 specific, actionable recommendations based on the data
- Each recommendation should be clear and directly tied to the analysis
- Only reference actual products in the bestSellingProducts array
- For metrics with zero values, recommend appropriate tracking measures

CRITICAL INSTRUCTIONS:
1. ONLY analyze the data provided - do not introduce fictional products, metrics, or scenarios
2. NEVER mention products unless they appear in bestSellingProducts with their exact names
3. ONLY reference actual numeric values that appear in the metrics or comparison objects
4. Be honest about data limitations - if certain metrics are zero or missing, acknowledge this
5. Adapt your analysis to be simpler when data is limited rather than inventing insights
6. Use professional, concise language throughout
7. Do NOT include the section headers (PART 1, PART 2, etc.) in your response
8. Use paragraph breaks between sections
9. For highlights, attention areas, and recommendations, use bullet point format
10. Do NOT mention that you are an AI in your response

Remember: It's better to have a shorter, accurate analysis than one based on assumptions.`;

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