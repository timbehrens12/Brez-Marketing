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
      const { date_range, brand, platforms, user, formatting_instructions, additional_insights } = data
      
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

**Demographics & Audience Insights**:
${JSON.stringify(additional_insights?.demographics || {}, null, 2)}

**Customer Geographic Data**:
${JSON.stringify(additional_insights?.customer_location || {}, null, 2)}

**Repeat Customer Analysis**:
${JSON.stringify(additional_insights?.repeat_customers || {}, null, 2)}

**CRITICAL DATA ANALYSIS REQUIREMENTS:**
- ALWAYS use the Demographics & Audience Insights data to provide COMPREHENSIVE analysis of ALL age groups, genders, and devices in section 3.3 - not just the top performers
- ALWAYS use the Customer Geographic Data to provide COMPLETE location analysis including ALL locations with revenue/customer data in section 3.4  
- ALWAYS use the Repeat Customer Analysis data to provide DETAILED retention and loyalty insights in section 3.5
- Show performance data for ALL demographic segments, not just the highest performing ones
- Include specific numbers, percentages, impressions, CTR, and spend data for multiple segments
- If any additional insights data is empty or null, then and only then mention data is unavailable
- Provide detailed breakdowns rather than just highlighting top performers

**CRITICAL FORMATTING REQUIREMENTS:**
- DO NOT include any main headers, titles, or "MARKETING INSIGHTS" text
- DO NOT include "OFFICIAL DOCUMENT" or similar headers
- Generate ONLY the content sections that will go inside a pre-styled wrapper
- Start directly with the first content section
- Use proper HTML structure with clear sections and headings

Generate professional business report content with proper HTML structure including:

<div style="margin-bottom: 3rem;">
<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 0 0 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; letter-spacing: 0.1em; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">📊 EXECUTIVE SUMMARY</h2>
<h3 style="color: #ffffff; font-size: 1.5rem; font-weight: 800; margin: 0 0 1rem 0; text-transform: uppercase;">SUMMARY</h3>
<p style="margin-bottom: 1.5rem; line-height: 1.8; color: #d1d5db; font-size: 1.1rem;">Provide a comprehensive overview of the reporting period with specific metrics, growth trends, and key performance indicators.</p>
</div>

<div style="margin-bottom: 3rem;">
<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 0 0 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; letter-spacing: 0.1em; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">📈 PERFORMANCE OVERVIEW</h2>
<h3 style="color: #ffffff; font-size: 1.5rem; font-weight: 800; margin: 0 0 1rem 0; text-transform: uppercase;">KEY METRICS</h3>
<p style="margin-bottom: 1.5rem; line-height: 1.8; color: #d1d5db; font-size: 1.1rem;">Detail the overall performance metrics including total sales, order volumes, growth percentages, and comparative analysis.</p>
</div>

<div style="margin-bottom: 3rem;">
<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 0 0 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; letter-spacing: 0.1em; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">🔍 CHANNEL ANALYSIS</h2>

<div style="margin-bottom: 2.5rem; padding: 1.5rem; background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%); border: 1px solid #333333; border-radius: 8px;">
<h3 style="color: #ffffff; font-size: 1.5rem; font-weight: 800; margin: 0 0 1rem 0; text-transform: uppercase;">SHOPIFY PERFORMANCE</h3>
<p style="margin-bottom: 1.5rem; line-height: 1.8; color: #d1d5db; font-size: 1.1rem;">Analyze revenue metrics, order metrics, and customer behavior insights with specific data.</p>
</div>

<div style="margin-bottom: 2.5rem; padding: 1.5rem; background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%); border: 1px solid #333333; border-radius: 8px;">
<h3 style="color: #ffffff; font-size: 1.5rem; font-weight: 800; margin: 0 0 1rem 0; text-transform: uppercase;">META ADS PERFORMANCE</h3>
<p style="margin-bottom: 1.5rem; line-height: 1.8; color: #d1d5db; font-size: 1.1rem;">Analyze ad spend efficiency, key performance indicators, and campaign insights with specific metrics.</p>
</div>

<div style="margin-bottom: 2.5rem; padding: 1.5rem; background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%); border: 1px solid #333333; border-radius: 8px;">
<h3 style="color: #ffffff; font-size: 1.5rem; font-weight: 800; margin: 0 0 1rem 0; text-transform: uppercase;">DEMOGRAPHICS & GENDER PERFORMANCE</h3>
<p style="margin-bottom: 1.5rem; line-height: 1.8; color: #d1d5db; font-size: 1.1rem;">Provide a comprehensive breakdown of ALL demographic segments from the Demographics & Audience Insights data above. Include performance data (impressions, CTR, spend) for ALL age groups (18-24, 25-34, 35-44, 45-54, 55-64, 65+), ALL gender segments (male, female), and ALL device types available in the data. Show specific numbers and percentages for each segment, not just the top performers. Identify patterns and optimization opportunities across the complete demographic spectrum.</p>
</div>

<div style="margin-bottom: 2.5rem; padding: 1.5rem; background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%); border: 1px solid #333333; border-radius: 8px;">
<h3 style="color: #ffffff; font-size: 1.5rem; font-weight: 800; margin: 0 0 1rem 0; text-transform: uppercase;">GEOGRAPHIC PERFORMANCE</h3>
<p style="margin-bottom: 1.5rem; line-height: 1.8; color: #d1d5db; font-size: 1.1rem;">Use the Customer Geographic Data provided above to analyze specific customer locations, regional revenue performance, and distribution patterns. Include actual city/state/country data, customer counts per location, and revenue by region from the provided data.</p>
</div>

<div style="margin-bottom: 2.5rem; padding: 1.5rem; background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%); border: 1px solid #333333; border-radius: 8px;">
<h3 style="color: #ffffff; font-size: 1.5rem; font-weight: 800; margin: 0 0 1rem 0; text-transform: uppercase;">REPEAT CUSTOMER ANALYSIS</h3>
<p style="margin-bottom: 1.5rem; line-height: 1.8; color: #d1d5db; font-size: 1.1rem;">Use the Repeat Customer Analysis data provided above to analyze specific retention rates, repeat purchase percentages, customer lifetime value metrics, and loyalty trends. Include actual numbers and percentages from the provided repeat customer data.</p>
</div>
</div>

<div style="margin-bottom: 3rem;">
<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 0 0 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; letter-spacing: 0.1em; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">💪 STRENGTHS & OPPORTUNITIES</h2>
<h3 style="color: #ffffff; font-size: 1.5rem; font-weight: 800; margin: 0 0 1rem 0; text-transform: uppercase;">WHAT'S WORKING WELL</h3>
<p style="margin-bottom: 1.5rem; line-height: 1.8; color: #d1d5db; font-size: 1.1rem;">Identify key strengths to leverage and opportunities for growth based on the data analysis.</p>
</div>

<div style="margin-bottom: 3rem;">
<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 0 0 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; letter-spacing: 0.1em; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">⚠️ WHAT'S NOT WORKING</h2>
<h3 style="color: #ffffff; font-size: 1.5rem; font-weight: 800; margin: 0 0 1rem 0; text-transform: uppercase;">AREAS OF CONCERN</h3>
<p style="margin-bottom: 1.5rem; line-height: 1.8; color: #d1d5db; font-size: 1.1rem;">Highlight areas of concern, underperforming metrics, and challenges that need immediate attention.</p>
</div>

<div style="margin-bottom: 3rem;">
<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 0 0 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; letter-spacing: 0.1em; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">🎯 ACTIONABLE RECOMMENDATIONS</h2>
<h3 style="color: #ffffff; font-size: 1.5rem; font-weight: 800; margin: 0 0 1rem 0; text-transform: uppercase;">NEXT STEPS</h3>
<ul style="margin: 0 0 1.5rem 2rem; line-height: 1.8; list-style: none;">
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