import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { aiUsageService } from '@/lib/services/ai-usage-service';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract data from request
    const { customPrompt, enrichedData, period, type, data } = await req.json();

    // Handle brand synopsis generation
    if (type === 'brand_synopsis' && data) {
      const brandData = data;
      
      // Record AI usage for brand analysis
      if (brandData.id) {
        await aiUsageService.recordUsage(brandData.id, userId, 'brand_analysis', {
          brandName: brandData.name,
          connections: brandData.connections,
          roas: brandData.roas,
          spend: brandData.spend,
          revenue: brandData.revenue
        });
      }
      
      // Check Marketing Assistant availability
      const marketingAssistantAvailable = brandData.marketingAssistantAvailable || false;
      
      // Create a specialized prompt for brand synopsis
      const hasShopify = brandData.connections.includes('shopify');
      const hasMeta = brandData.connections.includes('meta');
      
      const synopsisPrompt = `Write a 2-3 sentence performance overview for ${brandData.name}.

DATA:
- Shopify: $${brandData.revenue ? brandData.revenue.toLocaleString() : '0'} in sales, ${brandData.shopifyOrders || 0} orders
- Meta Ads: $${brandData.spend ? brandData.spend.toLocaleString() : '0'} spend, ${brandData.roas ? brandData.roas.toFixed(2) : '0.00'}x ROAS, ${brandData.conversions || 0} conversions, ${brandData.impressions || 0} impressions, ${brandData.clicks || 0} clicks
- Marketing Assistant: ${marketingAssistantAvailable ? 'AVAILABLE' : 'Not available (used this week)'}

REQUIRED FORMAT:
Sentence 1: "Shopify sales are $[amount] from [X] orders today. Meta ad spend: $[amount] with [X]x ROAS, [X] conversions from [X] impressions and [X] clicks."
Sentence 2: Brief trend observation (e.g., "Strong organic growth" or "No paid ads running yet")
Sentence 3 (ONLY if Marketing Assistant AVAILABLE): "Campaign Optimizer is available - run it for personalized optimization recommendations."

DO NOT:
- Include percentage comparisons (like "0.0% vs previous")
- Give specific campaign advice

Write the overview now:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective model for simple summaries
        messages: [
          { 
            role: "system", 
            content: "You are a marketing performance analyst. Write EXACTLY 2-3 sentences. First sentence: state Shopify sales/orders AND Meta ad spend/ROAS/conversions/impressions/clicks. Second sentence: note the trend. Third sentence (ONLY if Marketing Assistant is available): say 'Campaign Optimizer is available - run it for personalized optimization recommendations.' DO NOT include percentage comparisons." 
          },
          { role: "user", content: synopsisPrompt }
        ],
        temperature: 0.7, // Higher temp for more natural language
        max_tokens: 200, // Enough for metrics + overview
      });

      const analysis = response.choices[0]?.message?.content || "Performance analysis unavailable";
      return NextResponse.json({ analysis });
    }

    // Validate inputs for regular analysis
    if (!enrichedData) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    // Prepare the data for the AI prompt
    const formattedData = JSON.stringify(enrichedData, null, 2);

    // Create system message and user message for better context
    const systemMessage = `You are an expert e-commerce and marketing analyst working for a brand analytics dashboard. 
Your task is to analyze store performance data and provide detailed, actionable insights.
Use markdown formatting for your response with headings (##), bullet points, and bold for important metrics.
If any data appears suspicious or all zeros, acknowledge this but still provide realistic analysis based on what is available.`;

    // Combine the custom prompt with the data
    const userMessage = `${customPrompt}\n\nHere is the data to analyze (JSON format):\n\`\`\`json\n${formattedData}\n\`\`\``;

    // Generate analysis using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Legacy unused code path - cost-effective model
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7, // Slightly creative but still factual
      max_tokens: 1500, // Allow for a detailed response
    });

    // Extract and return the generated analysis
    const analysis = response.choices[0]?.message?.content || "Analysis could not be generated";

    return NextResponse.json({ 
      analysis,
      status: "success" 
    });

  } catch (error: any) {
    console.error("Error generating analysis:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate analysis" },
      { status: 500 }
    );
  }
} 