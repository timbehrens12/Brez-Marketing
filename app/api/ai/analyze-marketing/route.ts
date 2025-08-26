import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { addSecurityHeaders, sanitizeAIInput } from '@/lib/utils/validation'

// Set maximum duration for this API route (90 seconds for AI processing)
export const maxDuration = 90

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    console.log('Received data for AI analysis:', JSON.stringify(data, null, 2))
    
    // Extract historical context for improvement tracking
    const historicalContext = data.historical_context || { previous_reports: [], count: 0 }
    console.log(`📚 Historical context: ${historicalContext.count} previous reports for comparison`)
    
    // Build historical context string for AI prompt
    const historicalContextPrompt = historicalContext.count > 0 ? `

HISTORICAL CONTEXT FOR IMPROVEMENT TRACKING:
Found ${historicalContext.count} previous reports for trend analysis and improvement tracking:

${historicalContext.previous_reports.map((report: any, index: number) => `
Report ${index + 1} (${report.reportType}, Generated: ${new Date(report.generatedAt).toLocaleDateString()}):
- Date Range: ${report.dateRangeStart} to ${report.dateRangeEnd}
- Key Metrics: Revenue: $${report.keyMetrics.revenue || 0}, ROAS: ${report.keyMetrics.roas || 0}, Orders: ${report.keyMetrics.orders || 0}
- Previous Summary: ${report.summary}
- Previous Recommendations: ${report.recommendations.length > 0 ? report.recommendations.join('; ') : 'None recorded'}
`).join('\n')}

CRITICAL INSTRUCTIONS FOR HISTORICAL ANALYSIS:
1. Compare current performance to these previous periods
2. Identify trends (improving, declining, stable)
3. Evaluate whether previous recommendations were implemented
4. Track recommendation effectiveness over time
5. Provide specific insights about what's working vs what's not
6. Focus on continuous improvement narrative
7. Highlight any significant changes or patterns

` : `

HISTORICAL CONTEXT: This appears to be the first report for this brand/period. Focus on establishing baseline performance and comprehensive recommendations for future improvement tracking.

`
    
          // Extract key metrics from the data
      
            // Include historical context in the analysis prompt
      console.log('🔗 Including historical context in AI prompt for trend analysis')
      const { date_range, brand, platforms, user, formatting_instructions } = data
      
      // Add historical context to the main data structure for AI processing
      const enhancedData = {
        ...data,
        historical_context_prompt: historicalContextPrompt
      }
    
          // Build a comprehensive prompt for the AI
      const prompt = `${historicalContextPrompt}
Analyze the following marketing and e-commerce data for ${brand.name} and generate comprehensive business report content.

**Date Range**: ${date_range.from} to ${date_range.to} (${date_range.period_name})

**Shopify E-commerce Data**:
${JSON.stringify(platforms.shopify, null, 2)}

**Meta Advertising Data**:
${JSON.stringify(platforms.meta, null, 2)}

**CRITICAL FORMATTING REQUIREMENTS:**
- DO NOT include any main headers, titles, or "MARKETING INSIGHTS" text
- DO NOT include "OFFICIAL DOCUMENT" or similar headers
- Generate ONLY the content sections that will go inside a pre-styled wrapper
- Start directly with the first content section
- Use proper HTML structure with clear sections and headings

Generate professional business report content with proper HTML structure including:

<div class="executive-summary">
<h2 style="color: #e5e7eb; font-size: 1.5rem; font-weight: 700; margin: 0 0 1rem 0; padding-bottom: 0.75rem; border-bottom: 2px solid #4b5563;">1. EXECUTIVE SUMMARY</h2>
<p style="margin-bottom: 1rem; line-height: 1.7; color: #d1d5db;">Provide a brief overview of overall performance, highlighting key achievements and areas of concern.</p>
</div>

<div class="performance-overview">
<h2 style="color: #e5e7eb; font-size: 1.5rem; font-weight: 700; margin: 2.5rem 0 1rem 0; padding-bottom: 0.75rem; border-bottom: 2px solid #4b5563;">2. PERFORMANCE OVERVIEW</h2>
<p style="margin-bottom: 1rem; line-height: 1.7; color: #d1d5db;">Summary of key metrics with specific numbers and percentages.</p>
</div>

<div class="channel-analysis">
<h2 style="color: #e5e7eb; font-size: 1.5rem; font-weight: 700; margin: 2.5rem 0 1rem 0; padding-bottom: 0.75rem; border-bottom: 2px solid #4b5563;">3. CHANNEL ANALYSIS</h2>
<h3 style="color: #d1d5db; font-size: 1.25rem; font-weight: 600; margin: 2rem 0 0.75rem 0;">3.1 Shopify Performance</h3>
<p style="margin-bottom: 1rem; line-height: 1.7; color: #d1d5db;">Analyze revenue metrics, order metrics, and customer behavior insights with specific data.</p>

<h3 style="color: #d1d5db; font-size: 1.25rem; font-weight: 600; margin: 2rem 0 0.75rem 0;">3.2 Meta/Facebook Ads Performance</h3>
<p style="margin-bottom: 1rem; line-height: 1.7; color: #d1d5db;">Analyze ad spend efficiency, key performance indicators, and campaign insights with specific metrics.</p>

<h3 style="color: #d1d5db; font-size: 1.25rem; font-weight: 600; margin: 2rem 0 0.75rem 0;">3.3 Audience Demographics Analysis</h3>
<p style="margin-bottom: 1rem; line-height: 1.7; color: #d1d5db;">Analyze audience composition by age, gender, and device preferences. Identify top-performing demographic segments and optimization opportunities based on engagement and conversion data.</p>

<h3 style="color: #d1d5db; font-size: 1.25rem; font-weight: 600; margin: 2rem 0 0.75rem 0;">3.4 Geographic Performance Analysis</h3>
<p style="margin-bottom: 1rem; line-height: 1.7; color: #d1d5db;">Analyze customer distribution by location, regional revenue performance, and identify geographic market opportunities and expansion potential.</p>

<h3 style="color: #d1d5db; font-size: 1.25rem; font-weight: 600; margin: 2rem 0 0.75rem 0;">3.5 Repeat Customer Analysis</h3>
<p style="margin-bottom: 1rem; line-height: 1.7; color: #d1d5db;">Analyze customer retention rates, repeat purchase behavior, lifetime value trends, and identify opportunities to improve customer loyalty and repeat business.</p>
</div>

<div class="strengths-opportunities">
<h2 style="color: #e5e7eb; font-size: 1.5rem; font-weight: 700; margin: 2.5rem 0 1rem 0; padding-bottom: 0.75rem; border-bottom: 2px solid #4b5563;">4. STRENGTHS & OPPORTUNITIES</h2>
<p style="margin-bottom: 1rem; line-height: 1.7; color: #d1d5db;">Identify what's working well and areas for improvement.</p>
</div>

<div class="issues">
<h2 style="color: #e5e7eb; font-size: 1.5rem; font-weight: 700; margin: 2.5rem 0 1rem 0; padding-bottom: 0.75rem; border-bottom: 2px solid #4b5563;">5. WHAT'S NOT WORKING</h2>
<p style="margin-bottom: 1rem; line-height: 1.7; color: #d1d5db;">Identify performance issues and areas of concern with specific data points.</p>
</div>

<div class="recommendations">
<h2 style="color: #e5e7eb; font-size: 1.5rem; font-weight: 700; margin: 2.5rem 0 1rem 0; padding-bottom: 0.75rem; border-bottom: 2px solid #4b5563;">6. ACTIONABLE RECOMMENDATIONS</h2>
<ul style="margin: 0 0 1.5rem 2rem; line-height: 1.7; list-style: disc;">
<li style="margin-bottom: 0.75rem; color: #d1d5db;">Provide 4-5 specific, actionable recommendations</li>
</ul>
</div>

**CRITICAL FORMATTING RULES:**
- Use the exact styled structure shown above with inline styles
- Use <strong style="color: #f9fafb; font-weight: 700;"> for emphasis on key numbers/metrics
- Use professional dark theme: light gray (#e5e7eb) for headers, lighter gray (#d1d5db) for text
- Include specific numbers and percentages from the actual data provided
- Use <ul> and <li> with proper styling for bullet point lists
- Keep content structured and readable, NOT one big paragraph
- Make the report comprehensive but well-organized
- Use proper spacing with margin styles as shown

Response should be 400-600 words with proper HTML formatting and inline styles.
    `
    
    console.log('Sending prompt to OpenAI...')
    
    // Generate the report using OpenAI
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a senior business analyst specializing in e-commerce and digital marketing with expertise in audience demographics, geographic analysis, customer retention, and targeting optimization. Generate properly structured HTML report content with inline styles and color-coded sections. Never include main headers or titles - only generate the content sections that will go inside a pre-styled wrapper. Always use inline CSS styles for consistent formatting. Focus on data-driven insights and actionable recommendations with specific numbers from the data provided. When demographics data is available, provide detailed audience analysis including age groups, gender performance, and device preferences. When location data is available, analyze geographic distribution and regional opportunities. When repeat customer data is available, provide insights on retention rates, lifetime value, and loyalty optimization. Use the exact structure requested with comprehensive analysis for each section.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 4000
    })
    
    const analysis = chatCompletion.choices[0].message.content
    
    console.log('Successfully generated AI report')
    
    // Generate a unique report ID
    const reportId = `${brand.name.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 4)}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    // Format the date range for display
    const { format } = await import('date-fns')
    const brandName = brand.name || 'Unknown Brand'
    
    // Create only the report content with styling (no internal header/footer)
    const formattedReport = `
      <style>
        .report-content {
          padding: 2rem;
          background: transparent;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        .content-section {
          margin-bottom: 2rem;
        }
        
        .report-content h2 {
          color: #e5e7eb;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 2.5rem 0 1rem 0;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #4b5563;
        }
        
        .report-content h3 {
          color: #d1d5db;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 2rem 0 0.75rem 0;
        }
        
        .report-content p {
          margin-bottom: 1rem;
          line-height: 1.7;
          color: #d1d5db;
        }
        
        .report-content ul {
          margin: 0 0 1.5rem 2rem;
          line-height: 1.7;
          list-style: disc;
        }
        
        .report-content li {
          margin-bottom: 0.75rem;
          color: #d1d5db;
        }
        
        .report-content strong {
          color: #f9fafb;
          font-weight: 700;
        }
      </style>
      
      <div class="report-content">
        <div class="content-section">
          ${analysis}
        </div>
      </div>
    `
    
    // Return both the formatted report and raw response for caching
    return NextResponse.json({ 
      report: formattedReport,
      rawResponse: formattedReport,
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