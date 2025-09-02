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
- ALWAYS use the Demographics & Audience Insights data to provide COMPREHENSIVE analysis of ALL age groups, genders, and devices - not just top performers
- ALWAYS use the Customer Geographic Data to provide COMPLETE location analysis including ALL locations with revenue/customer data  
- ALWAYS use the Repeat Customer Analysis data to provide DETAILED retention and loyalty insights
- Show performance data for ALL demographic segments with specific numbers, percentages, impressions, CTR, and spend
- If any additional insights data is empty or null, then and only then mention data is unavailable
- Keep content CONCISE and well-organized for 8.5x11 paper format - use bullet points and short paragraphs
- Focus on key insights rather than lengthy explanations

**CRITICAL FORMATTING REQUIREMENTS:**
- DO NOT include any main headers, titles, or "MARKETING INSIGHTS" text
- DO NOT include "OFFICIAL DOCUMENT" or similar headers
- Generate ONLY the content sections that will go inside a pre-styled wrapper
- Start directly with the first content section
- Use proper HTML structure optimized for 8.5x11 paper format
- Use two-column layouts where appropriate to maximize space efficiency
- Keep sections concise and well-organized for standard paper printing

Generate professional business report content optimized for 8.5x11 paper format:

<div class="report-header" style="margin-bottom: 0.5rem;">
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.5rem;">
  <div class="executive-summary">
    <h2 style="color: #e5e7eb; font-size: 0.85rem; font-weight: 700; margin: 0 0 0.3rem 0; padding-bottom: 0.2rem; border-bottom: 1px solid #4b5563;">EXECUTIVE SUMMARY</h2>
    <p style="margin-bottom: 0.4rem; line-height: 1.3; color: #d1d5db; font-size: 0.7rem;">Concise overview of performance, key achievements and critical areas.</p>
  </div>
  <div class="performance-overview">
    <h2 style="color: #e5e7eb; font-size: 0.85rem; font-weight: 700; margin: 0 0 0.3rem 0; padding-bottom: 0.2rem; border-bottom: 1px solid #4b5563;">KEY METRICS</h2>
    <p style="margin-bottom: 0.4rem; line-height: 1.3; color: #d1d5db; font-size: 0.7rem;">Critical metrics with specific numbers and percentages.</p>
  </div>
</div>
</div>

<div class="channel-analysis" style="margin-bottom: 0.5rem;">
<h2 style="color: #e5e7eb; font-size: 0.9rem; font-weight: 700; margin: 0 0 0.4rem 0; padding-bottom: 0.2rem; border-bottom: 1px solid #4b5563;">CHANNEL PERFORMANCE</h2>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.5rem;">
  <div class="shopify-section">
    <h3 style="color: #10b981; font-size: 0.75rem; font-weight: 600; margin: 0 0 0.2rem 0;">🛒 Shopify</h3>
    <p style="margin-bottom: 0.3rem; line-height: 1.3; color: #d1d5db; font-size: 0.65rem;">Revenue, orders, customer behavior with growth %.</p>
  </div>
  <div class="meta-section">
    <h3 style="color: #3b82f6; font-size: 0.75rem; font-weight: 600; margin: 0 0 0.2rem 0;">📱 Meta Ads</h3>
    <p style="margin-bottom: 0.3rem; line-height: 1.3; color: #d1d5db; font-size: 0.65rem;">Ad spend, CTR, impressions, campaign metrics.</p>
  </div>
</div>

<div class="audience-analysis" style="margin-bottom: 0.5rem;">
  <h3 style="color: #f59e0b; font-size: 0.75rem; font-weight: 600; margin: 0 0 0.2rem 0;">👥 Demographics</h3>
  <p style="margin-bottom: 0.3rem; line-height: 1.3; color: #d1d5db; font-size: 0.65rem;">ALL age groups (18-24, 25-34, 35-44, 45-54, 55-64, 65+), genders, devices with specific numbers.</p>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
  <div class="geographic-section">
    <h3 style="color: #ef4444; font-size: 0.75rem; font-weight: 600; margin: 0 0 0.2rem 0;">🗺️ Geographic</h3>
    <p style="margin-bottom: 0.3rem; line-height: 1.3; color: #d1d5db; font-size: 0.65rem;">Customer locations, regional revenue, city/state/country data.</p>
  </div>
  <div class="retention-section">
    <h3 style="color: #8b5cf6; font-size: 0.75rem; font-weight: 600; margin: 0 0 0.2rem 0;">🔄 Retention</h3>
    <p style="margin-bottom: 0.3rem; line-height: 1.3; color: #d1d5db; font-size: 0.65rem;">Repeat rates, customer lifetime value, loyalty trends.</p>
  </div>
</div>
</div>

<div class="analysis-summary" style="margin-bottom: 0.5rem;">
<h2 style="color: #e5e7eb; font-size: 0.9rem; font-weight: 700; margin: 0 0 0.4rem 0; padding-bottom: 0.2rem; border-bottom: 1px solid #4b5563;">INSIGHTS & ACTIONS</h2>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.5rem;">
  <div class="strengths-section">
    <h3 style="color: #10b981; font-size: 0.75rem; font-weight: 600; margin: 0 0 0.2rem 0;">✓ Strengths</h3>
    <p style="margin-bottom: 0.3rem; line-height: 1.3; color: #d1d5db; font-size: 0.65rem;">What's working well with specific data.</p>
  </div>
  <div class="issues-section">
    <h3 style="color: #ef4444; font-size: 0.75rem; font-weight: 600; margin: 0 0 0.2rem 0;">⚠ Issues</h3>
    <p style="margin-bottom: 0.3rem; line-height: 1.3; color: #d1d5db; font-size: 0.65rem;">Performance concerns with metrics.</p>
  </div>
</div>

<div class="recommendations-section">
  <h3 style="color: #3b82f6; font-size: 0.75rem; font-weight: 600; margin: 0 0 0.2rem 0;">🎯 Action Items</h3>
  <p style="margin-bottom: 0.3rem; line-height: 1.3; color: #d1d5db; font-size: 0.65rem;">4-6 specific recommendations as concise bullet points.</p>
</div>
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
          padding: 0.75rem;
          background: transparent;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 0.75rem;
          line-height: 1.3;
        }
        
        .content-section {
          margin-bottom: 0.75rem;
        }
        
        .report-content h2 {
          color: #e5e7eb;
          font-size: 0.9rem;
          font-weight: 700;
          margin: 0.5rem 0 0.4rem 0;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid #4b5563;
        }
        
        .report-content h3 {
          color: #d1d5db;
          font-size: 0.8rem;
          font-weight: 600;
          margin: 0.5rem 0 0.3rem 0;
        }
        
        .report-content p {
          margin-bottom: 0.4rem;
          line-height: 1.3;
          color: #d1d5db;
          font-size: 0.7rem;
        }
        
        .report-content ul {
          margin: 0 0 0.5rem 1rem;
          line-height: 1.3;
          list-style: disc;
        }
        
        .report-content li {
          margin-bottom: 0.3rem;
          color: #d1d5db;
          font-size: 0.7rem;
        }
        
        .report-content strong {
          color: #f9fafb;
          font-weight: 700;
        }
        
        .report-content .grid {
          display: grid;
          gap: 0.75rem;
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