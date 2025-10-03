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
      
      const synopsisPrompt = `Generate a concise performance overview for ${brandData.name}. 

CRITICAL REQUIREMENTS:
1. This brand has BOTH Shopify AND Meta connected - you MUST mention BOTH platforms in your response
2. Even if data is $0, explicitly state it (e.g., "Shopify: $0 in sales" or "Meta: No ad spend yet")
3. Never ignore a connected platform, even with zero data
4. DO NOT give specific campaign recommendations - only provide performance overview
5. If Marketing Assistant is available, mention it as the next step for optimization

Connected Platforms & Data:
${hasMeta ? `- Meta Ads: $${brandData.spend ? brandData.spend.toLocaleString() : '0'} spend, ${brandData.roas ? brandData.roas.toFixed(2) : '0.00'}x ROAS, ${brandData.conversions || 0} conversions` : ''}
${hasShopify ? `- Shopify: $${brandData.revenue ? brandData.revenue.toLocaleString() : '0'} in sales${brandData.shopifyOrders ? `, ${brandData.shopifyOrders} orders` : ', 0 orders'}` : ''}
- ROAS Change: ${brandData.roasChange ? (brandData.roasChange > 0 ? '+' : '') + brandData.roasChange.toFixed(1) + '%' : 'N/A'}
- Sales Change: ${brandData.salesChange ? (brandData.salesChange > 0 ? '+' : '') + brandData.salesChange.toFixed(1) + '%' : 'N/A'}
- Status: ${brandData.status}
- Marketing Assistant: ${marketingAssistantAvailable ? 'Available' : 'Used this week'}

REQUIRED FORMAT (2-3 sentences):
- First sentence: State performance from BOTH Meta AND Shopify with actual numbers
- Second sentence: Highlight trends or performance status
- Third sentence: ${marketingAssistantAvailable ? 'Suggest running Campaign Optimizer (Marketing Assistant) for personalized recommendations' : 'Note that performance overview only, detailed recommendations available weekly'}

Example: "Meta ads generated $0 in spend while Shopify recorded $600 in sales from 2 orders today. Sales are performing above average with strong organic growth. Run Campaign Optimizer for AI-powered recommendations to scale with paid ads."

Write the synopsis now, ensuring you mention BOTH platforms:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective model for simple summaries
        messages: [
          { 
            role: "system", 
            content: "You are a marketing performance analyst providing brief performance overviews. You MUST mention ALL connected platforms in every response, even if they have zero data. DO NOT give specific campaign recommendations - that's what Campaign Optimizer (Marketing Assistant) is for. Only provide performance overview and suggest using Campaign Optimizer if available." 
          },
          { role: "user", content: synopsisPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent, factual responses
        max_tokens: 200, // Enough for a concise 2-3 sentence overview
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