import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'
import { auth } from '@clerk/nextjs'
import { marked } from 'marked'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 second timeout
  maxRetries: 2,
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const data = await request.json()
    
    if (!data.brand || !data.brand.id || !data.date_range || !data.platforms) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
    }

    // Create a system prompt for the AI
    const systemPrompt = `You are an expert marketing analyst and strategist specializing in e-commerce businesses. 
Your task is to analyze the provided data and create a detailed, insightful marketing report.

The data includes metrics from different platforms (Shopify and Meta/Facebook) for the brand ${data.brand.name} 
over the period from ${data.date_range.from} to ${data.date_range.to} (${data.date_range.period_days} days).

IMPORTANT: Structure is vital. Your report MUST follow this exact structure with clear headings and subheadings:

## 1. EXECUTIVE SUMMARY
- A concise 3-5 bullet point summary of the most important insights and recommendations
- Each bullet should be 1-2 sentences maximum

## 2. PERFORMANCE OVERVIEW
- Overall business metrics
- Key trend observations
- Include 2-3 specific numbers/percentages from the data

## 3. CHANNEL ANALYSIS
### 3.1 Shopify Performance
- Revenue metrics
- Order metrics 
- Customer behavior insights

### 3.2 Meta/Facebook Ads Performance
- Ad spend efficiency
- Key performance indicators (ROAS, CTR, etc.)
- Campaign insights

## 4. STRENGTHS & OPPORTUNITIES
- 2-3 specific strengths identified from the data
- 2-3 clear opportunities for improvement

## 5. WHAT'S NOT WORKING
- Identify 2-3 specific underperforming areas
- Provide clear evidence from the data for each issue
- Focus on actionable problems that can be fixed

## 6. ACTIONABLE RECOMMENDATIONS
- 3-5 specific, prioritized action items
- Each recommendation should be practical and direct
- Include at least one recommendation to address each issue from the "What's Not Working" section

FORMATTING GUIDELINES:
- Use bold for important metrics or insights: **$10,000 in sales**
- Use bullet points for lists
- Keep paragraphs short (3-4 sentences maximum)
- Use inline formatting to highlight key metrics
- Keep the report concise and data-driven

The ENTIRE report should be no more than 1,000 words and focus only on the most important insights.`

    // Create a user message with the data
    const userMessage = JSON.stringify(data)

    // Call OpenAI API
    console.log('Calling OpenAI API...')
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.5,
      max_tokens: 2500,
    })

    // Extract and process the response
    const aiResponse = response.choices[0].message.content || ""
    
    // Apply custom CSS classes to enhance the report formatting
    let enhancedMarkdown = aiResponse
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-6 mb-3 text-white">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-300">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-white">$1</span>')
    
    // Convert markdown to HTML
    const htmlReport = marked(enhancedMarkdown)
    
    // Additional HTML processing to improve appearance
    const finalHtmlReport = `
      <div class="space-y-4" data-api-version="1.2">
        ${htmlReport}
      </div>
    `

    // Store the report in Supabase for future reference
    try {
      console.log('Storing report in database for brand_id:', data.brand.id)
      
      const reportData = {
        brand_id: data.brand.id,
        user_id: userId,
        date_range_from: data.date_range.from,
        date_range_to: data.date_range.to,
        period_name: data.date_range.period_name,
        raw_response: aiResponse,
        html_report: finalHtmlReport,
        created_at: new Date().toISOString()
      }
      
      const { data: savedData, error } = await supabase
        .from('ai_marketing_reports')
        .insert(reportData)
        .select()

      if (error) {
        console.error('Error storing report:', error)
        console.error('Report data that failed to save:', {
          brand_id: data.brand.id,
          user_id: userId,
          date_range_from: data.date_range.from,
          date_range_to: data.date_range.to,
          period_name: data.date_range.period_name
        })
      } else {
        console.log('Report saved successfully with ID:', savedData?.[0]?.id || 'Unknown')
      }
    } catch (storeError) {
      console.error('Exception while storing report:', storeError)
      // Continue even if storage fails
    }

    return NextResponse.json({ 
      report: finalHtmlReport,
      raw: aiResponse
    })

  } catch (error) {
    console.error('Error generating AI marketing report:', error)
    return NextResponse.json({ 
      error: 'Failed to generate marketing report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 