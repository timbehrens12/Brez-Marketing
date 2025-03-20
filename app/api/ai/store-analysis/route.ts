import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGPT4Response } from '@/lib/openai';
import { auth } from '@clerk/nextjs';

// Define types
interface PlatformConnection {
  id: string;
  platform_type: string;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { 
      brandId, 
      period, 
      currentMetrics, 
      previousMetrics,
      periodComparison,
      brandName
    } = await request.json();
    
    if (!brandId || !period || !currentMetrics) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('user_id', userId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 403 });
    }

    // Get platform connections to determine what data is available
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('id, platform_type, status')
      .eq('brand_id', brandId);

    if (connectionsError) {
      return NextResponse.json({ error: 'Failed to fetch platform connections' }, { status: 500 });
    }

    // Check what platforms are connected
    const hasShopify = connections.some((c: PlatformConnection) => c.platform_type === 'shopify' && c.status === 'active');
    const hasMeta = connections.some((c: PlatformConnection) => c.platform_type === 'meta' && c.status === 'active');
    
    // If no platforms are connected, return a message
    if (!hasShopify && !hasMeta) {
      return NextResponse.json({ 
        analysis: "No connected platforms found. Please connect your store and advertising platforms to see AI-powered analysis."
      });
    }

    // Build prompt based on what data we have and the time period
    let systemPrompt = '';
    if (period === 'daily') {
      systemPrompt = `You are an expert e-commerce analyst providing daily performance analysis for ${brandName}.
      Create a comprehensive yet concise analysis of today's store performance based on the metrics provided.
      Focus on actionable insights that the store owner can use immediately.
      
      Structure your response in the following sections:
      1. A brief overview of performance (revenue, orders, ad performance)
      2. 3-5 positive highlights (what's working well today)
      3. 3-5 areas that need attention (what's not working well)
      4. 3-5 specific recommended actions
      
      Keep each bullet point concise and focused on today's data.
      If there is data indicating inventory issues, customer behavior patterns, or specific product performance, highlight these.
      Mention specific products, campaigns, or metrics where the data supports it.
      
      The response should be conversational but data-driven.
      Do not include any generic advice that isn't backed by the data provided.
      Format the response as plain text, not JSON.`;
    } else {
      systemPrompt = `You are an expert e-commerce analyst providing monthly performance analysis for ${brandName}.
      Create a comprehensive yet concise analysis of the previous month's store performance based on the metrics provided.
      Focus on actionable insights that the store owner can use for strategic planning.
      
      Structure your response in the following sections:
      1. A brief overview of monthly performance (revenue, orders, ad performance)
      2. 3-5 positive highlights (what worked well this month)
      3. 3-5 areas that need attention (what needs improvement)
      4. 3-5 specific recommended actions
      
      Keep each bullet point concise and focused on the monthly data.
      If there is data indicating inventory issues, customer behavior patterns, or specific product performance, highlight these.
      Mention specific products, campaigns, or metrics where the data supports it.
      
      The response should be conversational but data-driven.
      Do not include any generic advice that isn't backed by the data provided.
      Format the response as plain text, not JSON.`;
    }

    // Prepare the data for the AI
    const data = {
      period,
      brandName,
      currentMetrics,
      previousMetrics,
      periodComparison,
      connectedPlatforms: {
        shopify: hasShopify,
        meta: hasMeta
      }
    };

    // Generate analysis using GPT-4
    const analysis = await getGPT4Response(systemPrompt, JSON.stringify(data), 0.5);
    
    return NextResponse.json({ analysis });
    
  } catch (error) {
    console.error('Error generating store analysis:', error);
    
    // Return a fallback analysis
    return NextResponse.json({
      analysis: "Unable to generate a detailed analysis at this time. Please check your store's performance metrics directly or try again later."
    });
  }
} 