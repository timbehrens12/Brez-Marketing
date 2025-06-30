import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    console.log('Received data for AI analysis:', JSON.stringify(data, null, 2))
    
    // Extract key metrics from the data
    const { date_range, brand, platforms, user, formatting_instructions } = data
    
    // Build a comprehensive prompt for the AI
    const prompt = `
Analyze the following marketing and e-commerce data for ${brand.name} and generate a comprehensive business report.

**Date Range**: ${date_range.from} to ${date_range.to} (${date_range.period_name})

**Shopify E-commerce Data**:
${JSON.stringify(platforms.shopify, null, 2)}

**Meta Advertising Data**:
${JSON.stringify(platforms.meta, null, 2)}

**IMPORTANT FORMATTING REQUIREMENTS:**
${formatting_instructions?.style || 'Use proper HTML structure with clear sections and headings'}

Generate a professional business report with proper HTML structure including:

<h2>1. EXECUTIVE SUMMARY</h2>
<p>Provide a brief overview of overall performance, highlighting key achievements and areas of concern.</p>

<h2>2. PERFORMANCE OVERVIEW</h2>
<p>Summary of key metrics and overall business performance indicators.</p>

<h2>3. CHANNEL ANALYSIS</h2>
<h3>3.1 Shopify Performance</h3>
<p>Analyze revenue metrics, order metrics, and customer behavior insights.</p>

<h3>3.2 Meta/Facebook Ads Performance</h3>
<p>Analyze ad spend efficiency, key performance indicators, and campaign insights.</p>

<h2>4. STRENGTHS & OPPORTUNITIES</h2>
<p>Identify what's working well and areas for improvement.</p>

<h2>5. WHAT'S NOT WORKING</h2>
<p>Identify performance issues and areas of concern.</p>

<h2>6. ACTIONABLE RECOMMENDATIONS</h2>
<p>Provide 4-5 specific, actionable recommendations with expected outcomes.</p>

**CRITICAL FORMATTING RULES:**
- Use <h2> for main sections (numbered 1-6)
- Use <h3> for subsections (like 3.1, 3.2)
- Use <p> tags for paragraphs
- Use <ul> and <li> for bullet point lists
- Use <strong> for emphasis on key numbers/metrics
- Include specific numbers and percentages from the data
- Keep content structured and readable, NOT one big paragraph
- Use proper HTML structure throughout
- Make the report comprehensive but well-organized

Response should be 400-600 words with proper HTML formatting.
    `
    
    console.log('Sending prompt to OpenAI...')
    
    // Generate the report using OpenAI
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a senior business analyst specializing in e-commerce and digital marketing. Generate properly structured HTML reports with clear sections, headings, and formatting. Always use HTML tags for structure, never markdown. Focus on data-driven insights and actionable recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gpt-4-turbo',
      temperature: 0.7,
      max_tokens: 1500
    })
    
    const report = chatCompletion.choices[0].message.content
    
    console.log('Successfully generated AI report')
    
    // Return both the formatted report and raw response for caching
    return NextResponse.json({ 
      report,
      rawResponse: report,
      dateRange: {
        from: date_range.from,
        to: date_range.to
      }
    })

  } catch (error) {
    console.error('Error in AI analysis:', error)
    return NextResponse.json(
      { 
        error: 'Error generating analysis', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
} 