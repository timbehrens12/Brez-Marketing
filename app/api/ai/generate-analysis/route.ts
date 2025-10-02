import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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
      
      // Create a specialized prompt for brand synopsis
      const synopsisPrompt = `Generate a concise, actionable brand performance synopsis for ${brandData.name}. 

IMPORTANT: This brand has ${brandData.connections.length > 0 ? brandData.connections.join(' and ') : 'no connected platforms'}. Analyze data from ALL connected platforms.

Current Performance Across All Platforms:
- ROAS: ${brandData.roas ? brandData.roas.toFixed(2) : 'No data'}
- ROAS Change: ${brandData.roasChange ? (brandData.roasChange > 0 ? '+' : '') + brandData.roasChange.toFixed(1) + '%' : 'No change data'}
- Ad Spend (Meta): $${brandData.spend ? brandData.spend.toLocaleString() : '0'}
- Sales Revenue (Shopify): $${brandData.revenue ? brandData.revenue.toLocaleString() : '0'}
- Sales Change: ${brandData.salesChange ? (brandData.salesChange > 0 ? '+' : '') + brandData.salesChange.toFixed(1) + '%' : 'No change data'}
- Status: ${brandData.status}
- Connected Platforms: ${brandData.connections.length > 0 ? brandData.connections.join(', ') : 'None'}
- Has Performance Data: ${brandData.hasData ? 'Yes' : 'No'}

Generate a 2-3 sentence synopsis that:
1. Mentions performance from EACH connected platform (e.g., "Meta ads spent $X" AND "Shopify generated $Y in sales")
2. Highlights ROAS and key metrics from all sources
3. Provides a brief actionable recommendation

Keep it conversational, specific to the numbers, and ensure you reference ALL connected platforms in your analysis. Avoid generic statements.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-nano", // Cheapest GPT-5 - perfect for simple summaries
        messages: [
          { 
            role: "system", 
            content: "You are a marketing performance analyst. Generate concise, data-driven brand performance summaries that cover ALL connected platforms (Shopify sales, Meta ads, etc.). Always mention performance from each platform explicitly. Be specific about numbers and actionable in recommendations. Keep responses under 75 words." 
          },
          { role: "user", content: synopsisPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent, factual responses
        max_tokens: 200, // Longer responses to cover all platforms
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