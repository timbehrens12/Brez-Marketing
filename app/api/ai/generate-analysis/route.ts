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
    
    if (!period || !metrics || !comparison || !Array.isArray(bestSellingProducts)) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 });
    }

    // Process platform data
    const platformsConnected: string[] = [];
    if (platformData?.shopifyConnected) platformsConnected.push('Shopify');
    if (platformData?.metaConnected) platformsConnected.push('Meta Ads');
    if (platformsConnected.length === 0) platformsConnected.push('None');
    
    // Validate and filter out any test/demo products
    const validatedProducts = bestSellingProducts
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
      });

    const productNames = validatedProducts.map(p => p.name);
    
    // Determine period description more accurately
    const periodDescription = 
      period === 'daily' ? 'today' : 
      period === 'weekly' ? 'this week' : 
      period === 'monthly' ? 'this month' : 
      period === 'quarterly' ? 'this quarter' : 
      period === 'yearly' ? 'this year' : 
      period;

    // Only include metrics that are non-zero and valid
    const validatedMetrics = {
      totalSales: typeof metrics.totalSales === 'number' ? metrics.totalSales : 0,
      ordersCount: typeof metrics.ordersCount === 'number' ? metrics.ordersCount : 
                   (typeof metrics.ordersPlaced === 'number' ? metrics.ordersPlaced : 0),
      // Only include these if they actually exist with valid values
      ...(typeof metrics.averageOrderValue === 'number' && metrics.averageOrderValue > 0 
        ? { averageOrderValue: metrics.averageOrderValue } : {}),
      ...(typeof metrics.customerCount === 'number' && metrics.customerCount > 0 
        ? { customerCount: metrics.customerCount } : {}),
      ...(typeof metrics.newCustomers === 'number' && metrics.newCustomers >= 0
        ? { newCustomers: metrics.newCustomers } : {}),
      ...(typeof metrics.returningCustomers === 'number' && metrics.returningCustomers > 0 
        ? { returningCustomers: metrics.returningCustomers } : {}),
      // Only include conversion rate if explicitly provided
      ...(typeof metrics.conversionRate === 'number' && metrics.conversionRate > 0 
        ? { conversionRate: metrics.conversionRate } : {}),
      ...(typeof metrics.adSpend === 'number' && metrics.adSpend >= 0
        ? { adSpend: metrics.adSpend } : {}),
      ...(typeof metrics.roas === 'number' && metrics.roas > 0
        ? { roas: metrics.roas } : {}),
      ...(typeof metrics.ctr === 'number' && metrics.ctr > 0
        ? { ctr: metrics.ctr } : {}),
      ...(typeof metrics.cpc === 'number' && metrics.cpc > 0
        ? { cpc: metrics.cpc } : {})
    };
    
    // Only include comparison data that is relevant to our validated metrics
    const validatedComparison = {
      ...(typeof comparison.salesGrowth === 'number' ? { salesGrowth: comparison.salesGrowth } : {}),
      ...(typeof comparison.orderGrowth === 'number' ? { orderGrowth: comparison.orderGrowth } : {}),
      ...(typeof comparison.customerGrowth === 'number' && 'customerCount' in validatedMetrics
        ? { customerGrowth: comparison.customerGrowth } : {}),
      ...(typeof comparison.roasGrowth === 'number' && 'roas' in validatedMetrics
        ? { roasGrowth: comparison.roasGrowth } : {}),
      ...(typeof comparison.conversionGrowth === 'number' && 'conversionRate' in validatedMetrics
        ? { conversionGrowth: comparison.conversionGrowth } : {}),
      ...(typeof comparison.adSpendGrowth === 'number' && 'adSpend' in validatedMetrics
        ? { adSpendGrowth: comparison.adSpendGrowth } : {})
    };
    
    // Format the data for the AI
    const dataForAI = {
      period,
      metrics: validatedMetrics,
      comparison: validatedComparison,
      bestSellingProducts: validatedProducts,
      connectedPlatforms: platformsConnected,
      // Add a flag to indicate if we have valid product data
      hasProductData: validatedProducts.length > 0
    };
    
    // Create a list of actual product names to include in the prompt
    const actualProductNames = validatedProducts.map(p => `"${p.name}"`).join(', ');
    
    // Create the system prompt for AI
    const systemPrompt = `You are an expert data analyst and marketing consultant specializing in e-commerce. Your task is to provide a brief, data-driven analysis of the store's performance for the specified time period.

IMPORTANT: Only reference actual data that is explicitly provided to you. DO NOT mention or reference ANY products, metrics, or categories that aren't explicitly listed in the data provided. If no products are provided, do not mention specific products.

Your analysis should be factual, concise, and actionable, focusing ONLY on the data provided. If there is limited data, acknowledge this limitation and provide a more general analysis based on what IS available.

Here is the available data:
- Time period: ${period} (${periodDescription})
${Object.keys(validatedMetrics).length > 0 ? `- Current metrics: ${JSON.stringify(validatedMetrics, null, 2)}` : '- No metrics available'}
${Object.keys(validatedComparison).length > 0 ? `- Comparison with previous period: ${JSON.stringify(validatedComparison, null, 2)}` : '- No comparison data available'}
${validatedProducts.length > 0 ? `- Best selling products: ${actualProductNames}` : '- No product data available'}
- Connected platforms: ${platformsConnected.join(', ')}

Provide 2-3 concise bullet points for each of the following sections:
1. "Overall Performance" - Brief summary of the store's performance for the period.
2. "Product Analysis" - ONLY IF product data is available, mention the actual bestselling products by name and suggest actions.
3. "Recommendations" - Actionable recommendations based ONLY on the provided data.

DO NOT FABRICATE DATA OR INSIGHTS. If you don't have enough information for a particular section, say so briefly and focus on what you can determine from the available data.

Format your response as a concise business analysis with the three sections. Use markdown formatting with bullet points. Do not include introductions or conclusions.`;

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