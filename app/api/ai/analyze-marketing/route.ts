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

<div class="executive-summary" style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border: 1px solid #333; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
<h2 style="color: #ffffff; font-size: 1.75rem; font-weight: 800; margin: 0 0 1.5rem 0; padding-bottom: 1rem; border-bottom: 3px solid #22d3ee; display: flex; align-items: center; gap: 0.75rem;">
<span style="background: #22d3ee; color: #000; padding: 0.5rem; border-radius: 8px; font-size: 1rem; font-weight: 900;">📊</span>
1. EXECUTIVE SUMMARY
</h2>
<p style="margin-bottom: 1.5rem; line-height: 1.8; color: #e5e7eb; font-size: 1.1rem; background: rgba(34, 211, 238, 0.1); padding: 1.5rem; border-radius: 8px; border-left: 4px solid #22d3ee;">Provide a comprehensive overview of overall performance, highlighting key achievements, critical metrics, and areas requiring immediate attention.</p>
</div>

<div class="performance-overview" style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border: 1px solid #333; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
<h2 style="color: #ffffff; font-size: 1.75rem; font-weight: 800; margin: 0 0 1.5rem 0; padding-bottom: 1rem; border-bottom: 3px solid #10b981; display: flex; align-items: center; gap: 0.75rem;">
<span style="background: #10b981; color: #000; padding: 0.5rem; border-radius: 8px; font-size: 1rem; font-weight: 900;">📈</span>
2. PERFORMANCE OVERVIEW
</h2>
<p style="margin-bottom: 1.5rem; line-height: 1.8; color: #e5e7eb; font-size: 1.1rem; background: rgba(16, 185, 129, 0.1); padding: 1.5rem; border-radius: 8px; border-left: 4px solid #10b981;">Detailed summary of key performance metrics with specific numbers, percentages, and growth indicators.</p>
</div>

<div class="channel-analysis" style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border: 1px solid #333; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
<h2 style="color: #ffffff; font-size: 1.75rem; font-weight: 800; margin: 0 0 1.5rem 0; padding-bottom: 1rem; border-bottom: 3px solid #f59e0b; display: flex; align-items: center; gap: 0.75rem;">
<span style="background: #f59e0b; color: #000; padding: 0.5rem; border-radius: 8px; font-size: 1rem; font-weight: 900;">🎯</span>
3. CHANNEL ANALYSIS
</h2>

<div style="background: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem;">
<h3 style="color: #22c55e; font-size: 1.4rem; font-weight: 700; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
<span style="background: #22c55e; color: #000; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.875rem;">🛒</span>
3.1 Shopify Performance
</h3>
<p style="margin-bottom: 1.25rem; line-height: 1.8; color: #e5e7eb; font-size: 1.05rem;">Analyze revenue metrics, order metrics, and customer behavior insights with specific data.</p>
</div>

<div style="background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem;">
<h3 style="color: #3b82f6; font-size: 1.4rem; font-weight: 700; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
<span style="background: #3b82f6; color: #000; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.875rem;">📱</span>
3.2 Meta/Facebook Ads Performance
</h3>
<p style="margin-bottom: 1.25rem; line-height: 1.8; color: #e5e7eb; font-size: 1.05rem;">Analyze ad spend efficiency, key performance indicators, and campaign insights with specific metrics.</p>
</div>

<div style="background: rgba(168, 85, 247, 0.1); border: 1px solid #a855f7; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem;">
<h3 style="color: #a855f7; font-size: 1.4rem; font-weight: 700; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
<span style="background: #a855f7; color: #000; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.875rem;">👥</span>
3.3 Audience Demographics Analysis
</h3>
<p style="margin-bottom: 1.25rem; line-height: 1.8; color: #e5e7eb; font-size: 1.05rem;">Provide a comprehensive breakdown of ALL demographic segments from the Demographics & Audience Insights data above. Include performance data (impressions, CTR, spend) for ALL age groups (18-24, 25-34, 35-44, 45-54, 55-64, 65+), ALL gender segments (male, female), and ALL device types available in the data. Show specific numbers and percentages for each segment, not just the top performers. Identify patterns and optimization opportunities across the complete demographic spectrum.</p>
</div>

<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem;">
<h3 style="color: #ef4444; font-size: 1.4rem; font-weight: 700; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
<span style="background: #ef4444; color: #000; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.875rem;">🗺️</span>
3.4 Geographic Performance Analysis
</h3>
<p style="margin-bottom: 1.25rem; line-height: 1.8; color: #e5e7eb; font-size: 1.05rem;">Use the Customer Geographic Data provided above to analyze specific customer locations, regional revenue performance, and distribution patterns. Include actual city/state/country data, customer counts per location, and revenue by region from the provided data.</p>
</div>

<div style="background: rgba(236, 72, 153, 0.1); border: 1px solid #ec4899; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem;">
<h3 style="color: #ec4899; font-size: 1.4rem; font-weight: 700; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
<span style="background: #ec4899; color: #000; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.875rem;">🔄</span>
3.5 Repeat Customer Analysis
</h3>
<p style="margin-bottom: 1.25rem; line-height: 1.8; color: #e5e7eb; font-size: 1.05rem;">Use the Repeat Customer Analysis data provided above to analyze specific retention rates, repeat purchase percentages, customer lifetime value metrics, and loyalty trends. Include actual numbers and percentages from the provided repeat customer data.</p>
</div>
</div>

<div class="strengths-opportunities" style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border: 1px solid #333; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
<h2 style="color: #ffffff; font-size: 1.75rem; font-weight: 800; margin: 0 0 1.5rem 0; padding-bottom: 1rem; border-bottom: 3px solid #10b981; display: flex; align-items: center; gap: 0.75rem;">
<span style="background: #10b981; color: #000; padding: 0.5rem; border-radius: 8px; font-size: 1rem; font-weight: 900;">💪</span>
4. STRENGTHS & OPPORTUNITIES
</h2>
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
<div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; padding: 1.25rem;">
<h4 style="color: #10b981; font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem 0; display: flex; align-items: center; gap: 0.5rem;">
<span style="font-size: 1.25rem;">✅</span> STRENGTHS
</h4>
<p style="margin-bottom: 1rem; line-height: 1.7; color: #e5e7eb; font-size: 1rem;">Identify what's working well with specific data points.</p>
</div>
<div style="background: rgba(245, 158, 11, 0.1); border: 1px solid #f59e0b; border-radius: 8px; padding: 1.25rem;">
<h4 style="color: #f59e0b; font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem 0; display: flex; align-items: center; gap: 0.5rem;">
<span style="font-size: 1.25rem;">🚀</span> OPPORTUNITIES
</h4>
<p style="margin-bottom: 1rem; line-height: 1.7; color: #e5e7eb; font-size: 1rem;">Identify areas for growth and improvement.</p>
</div>
</div>
</div>

<div class="issues" style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border: 1px solid #333; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
<h2 style="color: #ffffff; font-size: 1.75rem; font-weight: 800; margin: 0 0 1.5rem 0; padding-bottom: 1rem; border-bottom: 3px solid #ef4444; display: flex; align-items: center; gap: 0.75rem;">
<span style="background: #ef4444; color: #000; padding: 0.5rem; border-radius: 8px; font-size: 1rem; font-weight: 900;">⚠️</span>
5. WHAT'S NOT WORKING
</h2>
<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; padding: 1.5rem; border-left: 4px solid #ef4444;">
<p style="margin-bottom: 1.25rem; line-height: 1.8; color: #e5e7eb; font-size: 1.05rem;">Identify performance issues and areas of concern with specific data points and metrics that need immediate attention.</p>
</div>
</div>

<div class="recommendations" style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border: 1px solid #333; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
<h2 style="color: #ffffff; font-size: 1.75rem; font-weight: 800; margin: 0 0 1.5rem 0; padding-bottom: 1rem; border-bottom: 3px solid #8b5cf6; display: flex; align-items: center; gap: 0.75rem;">
<span style="background: #8b5cf6; color: #000; padding: 0.5rem; border-radius: 8px; font-size: 1rem; font-weight: 900;">💡</span>
6. ACTIONABLE RECOMMENDATIONS
</h2>
<div style="background: rgba(139, 92, 246, 0.1); border: 1px solid #8b5cf6; border-radius: 8px; padding: 1.5rem; border-left: 4px solid #8b5cf6;">
<ul style="margin: 0; line-height: 1.8; list-style: none; padding: 0;">
<li style="margin-bottom: 1rem; color: #e5e7eb; font-size: 1.05rem; display: flex; align-items: flex-start; gap: 0.75rem;">
<span style="background: #8b5cf6; color: #000; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; margin-top: 0.125rem;">1</span>
Provide 4-5 specific, actionable recommendations with priority numbering</li>
<li style="margin-bottom: 1rem; color: #e5e7eb; font-size: 1.05rem; display: flex; align-items: flex-start; gap: 0.75rem;">
<span style="background: #8b5cf6; color: #000; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; margin-top: 0.125rem;">2</span>
Each recommendation should be specific and actionable</li>
<li style="margin-bottom: 1rem; color: #e5e7eb; font-size: 1.05rem; display: flex; align-items: flex-start; gap: 0.75rem;">
<span style="background: #8b5cf6; color: #000; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; margin-top: 0.125rem;">3</span>
Include expected impact and timeline when possible</li>
</ul>
</div>
</div>

**CRITICAL FORMATTING RULES:**
- Use the EXACT styled structure shown above with all inline styles
- Each section MUST be wrapped in the styled div containers
- Each subsection (3.1, 3.2, etc.) MUST use the colored card styling
- ALWAYS include the emoji icons and colored badges
- Use numbered list items with styled number badges for recommendations
- Use <strong style="color: #f9fafb; font-weight: 700;"> for emphasis on key numbers/metrics
- Use professional dark theme: light gray (#e5e7eb) for headers, lighter gray (#d1d5db) for text
- Include specific numbers and percentages from the actual data provided
- Use <ul> and <li> with proper styling for bullet point lists
- Keep content structured and readable, NOT one big paragraph
- Break down complex sections into clear subsections with headers
- Use data tables when presenting multiple metrics (with styled borders and spacing)
- Add visual emphasis to important insights with background highlights
- Structure demographic data in organized lists by age group, gender, and device type
- Present geographic data with clear location breakdowns and revenue figures
- Make the report comprehensive but well-organized
- Use proper spacing with margin styles as shown

**EXAMPLE DATA PRESENTATION STYLES:**

For key metrics, use highlight boxes:
<div style="background: rgba(34, 211, 238, 0.15); border: 1px solid #22d3ee; border-radius: 6px; padding: 1rem; margin: 1rem 0; display: inline-block;">
<strong style="color: #22d3ee; font-size: 1.1rem;">$1,200 Revenue</strong> | <span style="color: #e5e7eb;">2 Orders</span>
</div>

For demographic breakdowns, use organized lists:
<ul style="margin: 1rem 0; padding: 0; list-style: none;">
<li style="background: rgba(168, 85, 247, 0.1); border-radius: 6px; padding: 0.75rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
<span style="color: #e5e7eb;">65+ Age Group:</span> <strong style="color: #a855f7;">58 impressions, 5.17% CTR</strong>
</li>
</ul>

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