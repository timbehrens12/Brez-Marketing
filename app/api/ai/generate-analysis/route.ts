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
      
      // Create a specialized prompt for brand synopsis
      const hasShopify = brandData.connections.includes('shopify');
      const hasMeta = brandData.connections.includes('meta');
      
      const synopsisPrompt = `Generate a concise, actionable brand performance synopsis for ${brandData.name}. 

CRITICAL REQUIREMENTS:
1. This brand has BOTH Shopify AND Meta connected - you MUST mention BOTH platforms in your response
2. Even if data is $0, explicitly state it (e.g., "Shopify: $0 in sales" or "Meta: No ad spend yet")
3. Never ignore a connected platform, even with zero data

Connected Platforms & Data:
${hasMeta ? `- Meta Ads: $${brandData.spend ? brandData.spend.toLocaleString() : '0'} spend, ${brandData.roas ? brandData.roas.toFixed(2) : '0.00'}x ROAS, ${brandData.conversions || 0} conversions` : ''}
${hasShopify ? `- Shopify: $${brandData.revenue ? brandData.revenue.toLocaleString() : '0'} in sales${brandData.shopifyOrders ? `, ${brandData.shopifyOrders} orders` : ', 0 orders'}` : ''}
- ROAS Change: ${brandData.roasChange ? (brandData.roasChange > 0 ? '+' : '') + brandData.roasChange.toFixed(1) + '%' : 'N/A'}
- Sales Change: ${brandData.salesChange ? (brandData.salesChange > 0 ? '+' : '') + brandData.salesChange.toFixed(1) + '%' : 'N/A'}
- Status: ${brandData.status}

REQUIRED FORMAT (2-3 sentences):
- First sentence: State performance from BOTH Meta AND Shopify with actual numbers
- Second sentence: Highlight trends or concerns (even if it's "no data yet")
- Third sentence: One actionable recommendation

Example for zero data: "Meta ads show no spend yet, while Shopify has generated $0 in sales with no orders. This indicates the brand is in setup phase. Recommendation: Launch initial test campaigns to begin gathering performance data."

Write the synopsis now, ensuring you mention BOTH platforms:`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-nano", // Cheapest GPT-5 - perfect for simple summaries
        messages: [
          { 
            role: "system", 
            content: "You are a marketing performance analyst. You MUST mention ALL connected platforms in every response, even if they have zero data. Never skip mentioning a platform. If Shopify is connected, say 'Shopify: $X'. If Meta is connected, say 'Meta: $X'. Be explicit about every platform's performance." 
          },
          { role: "user", content: synopsisPrompt }
        ],
        // GPT-5 Nano only supports default temperature of 1
        max_completion_tokens: 200, // Longer responses to cover all platforms
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
      model: "gpt-5-nano", // Legacy unused code path - use cheapest GPT-5
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      // GPT-5 Nano only supports default temperature of 1
      max_completion_tokens: 1500, // Allow for a detailed response
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