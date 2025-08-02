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

Current Performance:
- ROAS: ${brandData.roas ? brandData.roas.toFixed(2) : 'No data'}
- ROAS Change: ${brandData.roasChange ? (brandData.roasChange > 0 ? '+' : '') + brandData.roasChange.toFixed(1) + '%' : 'No change data'}
- Ad Spend: $${brandData.spend ? brandData.spend.toLocaleString() : '0'}
- Revenue: $${brandData.revenue ? brandData.revenue.toLocaleString() : '0'}
- Sales Change: ${brandData.salesChange ? (brandData.salesChange > 0 ? '+' : '') + brandData.salesChange.toFixed(1) + '%' : 'No change data'}
- Status: ${brandData.status}
- Connected Platforms: ${brandData.connections.length > 0 ? brandData.connections.join(', ') : 'None'}
- Has Performance Data: ${brandData.hasData ? 'Yes' : 'No'}

Generate a 1-2 sentence synopsis that:
1. Summarizes current performance status
2. Highlights key metrics or concerns
3. Provides a brief actionable recommendation (e.g., "review Marketing Assistant", "continue current strategy", "connect platforms")

Keep it conversational and specific to the numbers provided. Avoid generic statements.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are a marketing performance analyst. Generate concise, data-driven brand performance summaries. Be specific about numbers and actionable in recommendations. Keep responses under 50 words." 
          },
          { role: "user", content: synopsisPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent, factual responses
        max_tokens: 150, // Shorter responses for synopsis
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
      model: "gpt-4-turbo",
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