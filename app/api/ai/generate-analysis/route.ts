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
    
    // Create system prompt for the AI with specific structure requirements
    const systemPrompt = `You are an expert e-commerce analytics AI assistant providing analysis for a business dashboard.
    
Your task is to analyze the provided data and generate a structured report with the following sections:

1. MAIN ANALYSIS: 150-200 words of insightful observations about business performance.
2. POSITIVE HIGHLIGHTS: 3 bullet points of positive aspects from the data.
3. AREAS NEEDING ATTENTION: 2-3 bullet points of concerning metrics or areas for improvement.
4. RECOMMENDED ACTIONS: 3-4 specific actionable steps the business should take.

For the main analysis:
- Focus on key trends, comparing to ${comparisonText}
- Highlight notable metrics (revenue, orders, ROAS, etc.)
- Identify product performance patterns if data is available
- Provide context for advertising metrics if available
- Keep your response professional and data-driven
- Indicate clearly if certain analysis isn't possible due to missing data

Format your response exactly like this:
\`\`\`
[Your main analysis paragraphs here]

POSITIVE HIGHLIGHTS:
- [First positive highlight]
- [Second positive highlight]
- [Third positive highlight]

AREAS NEEDING ATTENTION:
- [First area needing attention]
- [Second area needing attention]
- [Optional third area]

RECOMMENDED ACTIONS:
- [First recommended action]
- [Second recommended action]
- [Third recommended action]
- [Optional fourth recommended action]
\`\`\`

Important notes:
- Only analyze available data. If no ad platform data exists, focus on sales data.
- If limited data is available, acknowledge the limitations.
- Do NOT mention that you are an AI in your response.
- Be specific with your recommendations, not generic.
- For the ${period} analysis, tailor your response appropriately.`;

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