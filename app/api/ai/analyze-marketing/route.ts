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

Generate a comprehensive professional business report with rich HTML structure including:

<div class="executive-summary">
<h2 style="color: #10b981; font-size: 1.75rem; font-weight: 800; margin: 0 0 1.5rem 0; padding: 1rem 1.5rem; background: linear-gradient(135deg, #065f46 0%, #047857 100%); border-left: 4px solid #10b981; border-radius: 8px;">
  📊 EXECUTIVE SUMMARY
</h2>
<div style="background: #1f2937; padding: 1.5rem; border-radius: 8px; border: 1px solid #374151; margin-bottom: 2rem;">
  <h4 style="color: #f59e0b; font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem 0;">🎯 Key Performance Highlights</h4>
  <p style="margin-bottom: 1rem; line-height: 1.8; color: #e5e7eb;">Provide a compelling overview of overall performance with specific metrics and growth indicators.</p>
  
  <h4 style="color: #ef4444; font-size: 1.1rem; font-weight: 700; margin: 1.5rem 0 1rem 0;">⚠️ Critical Areas of Focus</h4>
  <p style="margin-bottom: 0; line-height: 1.8; color: #e5e7eb;">Highlight urgent issues and immediate opportunities that require attention.</p>
</div>
</div>

<div class="performance-overview">
<h2 style="color: #3b82f6; font-size: 1.75rem; font-weight: 800; margin: 3rem 0 1.5rem 0; padding: 1rem 1.5rem; background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); border-left: 4px solid #3b82f6; border-radius: 8px;">
  📈 PERFORMANCE OVERVIEW
</h2>
<div style="background: #1f2937; padding: 1.5rem; border-radius: 8px; border: 1px solid #374151; margin-bottom: 2rem;">
  <h4 style="color: #10b981; font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem 0;">💰 Revenue Performance</h4>
  <p style="margin-bottom: 1.5rem; line-height: 1.8; color: #e5e7eb;">Detail total sales, growth rates, and revenue trends with specific numbers and percentages.</p>
  
  <h4 style="color: #8b5cf6; font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem 0;">📊 Key Metrics Summary</h4>
  <ul style="margin: 0 0 1.5rem 1.5rem; line-height: 1.8; list-style: none;">
    <li style="margin-bottom: 0.75rem; color: #e5e7eb; padding-left: 1.5rem; position: relative;">
      <span style="position: absolute; left: 0; color: #10b981;">✓</span> Average Order Value (AOV)
    </li>
    <li style="margin-bottom: 0.75rem; color: #e5e7eb; padding-left: 1.5rem; position: relative;">
      <span style="position: absolute; left: 0; color: #10b981;">✓</span> Order Volume & Growth
    </li>
    <li style="margin-bottom: 0.75rem; color: #e5e7eb; padding-left: 1.5rem; position: relative;">
      <span style="position: absolute; left: 0; color: #10b981;">✓</span> Customer Acquisition Metrics
    </li>
  </ul>
</div>
</div>

<div class="channel-analysis">
<h2 style="color: #f59e0b; font-size: 1.75rem; font-weight: 800; margin: 3rem 0 1.5rem 0; padding: 1rem 1.5rem; background: linear-gradient(135deg, #92400e 0%, #d97706 100%); border-left: 4px solid #f59e0b; border-radius: 8px;">
  🚀 CHANNEL PERFORMANCE ANALYSIS
</h2>

<div class="shopify-section" style="background: #1f2937; padding: 1.5rem; border-radius: 8px; border: 1px solid #374151; margin-bottom: 2rem;">
  <h3 style="color: #10b981; font-size: 1.4rem; font-weight: 700; margin: 0 0 1rem 0; display: flex; align-items: center;">
    <span style="background: #10b981; color: #000; padding: 0.25rem 0.75rem; border-radius: 4px; margin-right: 1rem; font-size: 0.9rem;">3.1</span>
    🛒 Shopify Performance
  </h3>
  <h4 style="color: #3b82f6; font-size: 1.1rem; font-weight: 700; margin: 1rem 0 0.75rem 0;">💵 Revenue Analysis</h4>
  <p style="margin-bottom: 1rem; line-height: 1.8; color: #e5e7eb;">Analyze total sales, order volume, and revenue trends with specific growth metrics.</p>
  
  <h4 style="color: #3b82f6; font-size: 1.1rem; font-weight: 700; margin: 1rem 0 0.75rem 0;">👥 Customer Behavior</h4>
  <p style="margin-bottom: 0; line-height: 1.8; color: #e5e7eb;">Detail customer acquisition, purchasing patterns, and order characteristics.</p>
</div>

<div class="meta-section" style="background: #1f2937; padding: 1.5rem; border-radius: 8px; border: 1px solid #374151; margin-bottom: 2rem;">
  <h3 style="color: #3b82f6; font-size: 1.4rem; font-weight: 700; margin: 0 0 1rem 0; display: flex; align-items: center;">
    <span style="background: #3b82f6; color: #fff; padding: 0.25rem 0.75rem; border-radius: 4px; margin-right: 1rem; font-size: 0.9rem;">3.2</span>
    📱 Meta/Facebook Ads Performance
  </h3>
  <h4 style="color: #f59e0b; font-size: 1.1rem; font-weight: 700; margin: 1rem 0 0.75rem 0;">💸 Ad Spend Efficiency</h4>
  <p style="margin-bottom: 1rem; line-height: 1.8; color: #e5e7eb;">Detail ad spend, CPM, CPC, and ROAS with specific performance metrics.</p>
  
  <h4 style="color: #f59e0b; font-size: 1.1rem; font-weight: 700; margin: 1rem 0 0.75rem 0;">🎯 Campaign Performance</h4>
  <p style="margin-bottom: 0; line-height: 1.8; color: #e5e7eb;">Analyze impressions, clicks, CTR, and conversion rates with optimization insights.</p>
</div>

<div class="demographics-section" style="background: #1f2937; padding: 1.5rem; border-radius: 8px; border: 1px solid #374151; margin-bottom: 2rem;">
  <h3 style="color: #8b5cf6; font-size: 1.4rem; font-weight: 700; margin: 0 0 1rem 0; display: flex; align-items: center;">
    <span style="background: #8b5cf6; color: #fff; padding: 0.25rem 0.75rem; border-radius: 4px; margin-right: 1rem; font-size: 0.9rem;">3.3</span>
    👥 Audience Demographics Analysis
  </h3>
  <h4 style="color: #ec4899; font-size: 1.1rem; font-weight: 700; margin: 1rem 0 0.75rem 0;">🎂 Age Group Performance</h4>
  <p style="margin-bottom: 1rem; line-height: 1.8; color: #e5e7eb;">Provide comprehensive breakdown of ALL age groups (18-24, 25-34, 35-44, 45-54, 55-64, 65+) with specific impressions, CTR, and spend data for each segment.</p>
  
  <h4 style="color: #ec4899; font-size: 1.1rem; font-weight: 700; margin: 1rem 0 0.75rem 0;">⚧️ Gender Performance</h4>
  <p style="margin-bottom: 1rem; line-height: 1.8; color: #e5e7eb;">Detail male vs female audience performance with specific engagement metrics and spend allocation.</p>
  
  <h4 style="color: #ec4899; font-size: 1.1rem; font-weight: 700; margin: 1rem 0 0.75rem 0;">📱 Device & Platform Analysis</h4>
  <p style="margin-bottom: 0; line-height: 1.8; color: #e5e7eb;">Analyze performance across devices (mobile, desktop, tablet) and platforms with specific CTR and conversion data.</p>
</div>

<div class="geographic-section" style="background: #1f2937; padding: 1.5rem; border-radius: 8px; border: 1px solid #374151; margin-bottom: 2rem;">
  <h3 style="color: #06b6d4; font-size: 1.4rem; font-weight: 700; margin: 0 0 1rem 0; display: flex; align-items: center;">
    <span style="background: #06b6d4; color: #000; padding: 0.25rem 0.75rem; border-radius: 4px; margin-right: 1rem; font-size: 0.9rem;">3.4</span>
    🌍 Geographic Performance Analysis
  </h3>
  <h4 style="color: #10b981; font-size: 1.1rem; font-weight: 700; margin: 1rem 0 0.75rem 0;">📍 Location Distribution</h4>
  <p style="margin-bottom: 1rem; line-height: 1.8; color: #e5e7eb;">Detail specific cities, states, and countries with customer counts and revenue by region from the actual geographic data.</p>
  
  <h4 style="color: #10b981; font-size: 1.1rem; font-weight: 700; margin: 1rem 0 0.75rem 0;">🎯 Regional Opportunities</h4>
  <p style="margin-bottom: 0; line-height: 1.8; color: #e5e7eb;">Identify high-performing regions and untapped markets with expansion recommendations.</p>
</div>

<div class="retention-section" style="background: #1f2937; padding: 1.5rem; border-radius: 8px; border: 1px solid #374151; margin-bottom: 2rem;">
  <h3 style="color: #f97316; font-size: 1.4rem; font-weight: 700; margin: 0 0 1rem 0; display: flex; align-items: center;">
    <span style="background: #f97316; color: #fff; padding: 0.25rem 0.75rem; border-radius: 4px; margin-right: 1rem; font-size: 0.9rem;">3.5</span>
    🔄 Customer Retention Analysis
  </h3>
  <h4 style="color: #8b5cf6; font-size: 1.1rem; font-weight: 700; margin: 1rem 0 0.75rem 0;">📊 Retention Metrics</h4>
  <p style="margin-bottom: 1rem; line-height: 1.8; color: #e5e7eb;">Detail repeat purchase rates, customer lifetime value, and retention percentages with specific numbers from the data.</p>
  
  <h4 style="color: #8b5cf6; font-size: 1.1rem; font-weight: 700; margin: 1rem 0 0.75rem 0;">💎 Customer Loyalty</h4>
  <p style="margin-bottom: 0; line-height: 1.8; color: #e5e7eb;">Analyze customer loyalty trends and identify strategies to improve retention rates.</p>
</div>
</div>

<div class="strengths-opportunities">
<h2 style="color: #10b981; font-size: 1.75rem; font-weight: 800; margin: 3rem 0 1.5rem 0; padding: 1rem 1.5rem; background: linear-gradient(135deg, #065f46 0%, #047857 100%); border-left: 4px solid #10b981; border-radius: 8px;">
  💪 STRENGTHS & OPPORTUNITIES
</h2>
<div style="background: #1f2937; padding: 1.5rem; border-radius: 8px; border: 1px solid #374151; margin-bottom: 2rem;">
  <h4 style="color: #10b981; font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem 0;">🌟 What's Working Well</h4>
  <ul style="margin: 0 0 1.5rem 1.5rem; line-height: 1.8; list-style: none;">
    <li style="margin-bottom: 0.75rem; color: #e5e7eb; padding-left: 1.5rem; position: relative;">
      <span style="position: absolute; left: 0; color: #10b981;">🚀</span> Identify top-performing channels and campaigns
    </li>
  </ul>
  
  <h4 style="color: #f59e0b; font-size: 1.1rem; font-weight: 700; margin: 1.5rem 0 1rem 0;">🔍 Growth Opportunities</h4>
  <ul style="margin: 0; line-height: 1.8; list-style: none;">
    <li style="margin-bottom: 0.75rem; color: #e5e7eb; padding-left: 1.5rem; position: relative;">
      <span style="position: absolute; left: 0; color: #f59e0b;">💡</span> Highlight areas for improvement and expansion
    </li>
  </ul>
</div>
</div>

<div class="issues">
<h2 style="color: #ef4444; font-size: 1.75rem; font-weight: 800; margin: 3rem 0 1.5rem 0; padding: 1rem 1.5rem; background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); border-left: 4px solid #ef4444; border-radius: 8px;">
  ⚠️ PERFORMANCE CHALLENGES
</h2>
<div style="background: #1f2937; padding: 1.5rem; border-radius: 8px; border: 1px solid #374151; margin-bottom: 2rem;">
  <h4 style="color: #ef4444; font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem 0;">🚨 Critical Issues</h4>
  <ul style="margin: 0 0 1.5rem 1.5rem; line-height: 1.8; list-style: none;">
    <li style="margin-bottom: 0.75rem; color: #e5e7eb; padding-left: 1.5rem; position: relative;">
      <span style="position: absolute; left: 0; color: #ef4444;">⛔</span> Identify underperforming areas with specific data points
    </li>
  </ul>
  
  <h4 style="color: #f97316; font-size: 1.1rem; font-weight: 700; margin: 1.5rem 0 1rem 0;">⚡ Immediate Concerns</h4>
  <p style="margin-bottom: 0; line-height: 1.8; color: #e5e7eb;">Detail areas requiring urgent attention with specific metrics and impact assessment.</p>
</div>
</div>

<div class="recommendations">
<h2 style="color: #8b5cf6; font-size: 1.75rem; font-weight: 800; margin: 3rem 0 1.5rem 0; padding: 1rem 1.5rem; background: linear-gradient(135deg, #581c87 0%, #7c3aed 100%); border-left: 4px solid #8b5cf6; border-radius: 8px;">
  🎯 ACTIONABLE RECOMMENDATIONS
</h2>
<div style="background: #1f2937; padding: 1.5rem; border-radius: 8px; border: 1px solid #374151; margin-bottom: 2rem;">
  <h4 style="color: #10b981; font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem 0;">🚀 High-Priority Actions</h4>
  <ul style="margin: 0 0 1.5rem 1.5rem; line-height: 1.8; list-style: none;">
    <li style="margin-bottom: 1rem; color: #e5e7eb; padding: 1rem; background: #374151; border-radius: 6px; border-left: 3px solid #10b981;">
      <strong style="color: #10b981;">Recommendation 1:</strong> Provide specific, actionable steps with expected impact and timeline
    </li>
    <li style="margin-bottom: 1rem; color: #e5e7eb; padding: 1rem; background: #374151; border-radius: 6px; border-left: 3px solid #3b82f6;">
      <strong style="color: #3b82f6;">Recommendation 2:</strong> Detail optimization strategies with measurable outcomes
    </li>
  </ul>
  
  <h4 style="color: #f59e0b; font-size: 1.1rem; font-weight: 700; margin: 1.5rem 0 1rem 0;">📈 Growth Strategies</h4>
  <ul style="margin: 0; line-height: 1.8; list-style: none;">
    <li style="margin-bottom: 1rem; color: #e5e7eb; padding: 1rem; background: #374151; border-radius: 6px; border-left: 3px solid #f59e0b;">
      <strong style="color: #f59e0b;">Strategy 1:</strong> Provide expansion and scaling recommendations with clear next steps
    </li>
  </ul>
</div>
</div>

**CRITICAL FORMATTING RULES:**
- Use the exact styled structure shown above with inline styles and color-coded sections
- Use gradient backgrounds, emojis, and visual elements as specified
- Use <strong style="color: #f9fafb; font-weight: 700;"> for emphasis on key numbers/metrics
- Include numbered section badges and colored subsection headers
- Use the dark gray (#1f2937) content boxes with proper padding and borders
- Include specific numbers and percentages from the actual data provided
- Use color-coded bullet points and visual indicators as shown
- Structure content with clear subsections and visual hierarchy
- Make each section comprehensive with detailed analysis
- Use proper spacing, padding, and styling as specified

**CONTENT REQUIREMENTS:**
- Executive Summary: Include both highlights AND critical focus areas
- Performance Overview: Detailed revenue analysis with specific metrics
- Channel Analysis: Comprehensive breakdown with subsections for each platform
- Demographics: COMPLETE analysis of ALL age groups, genders, and devices
- Geographic: Specific location data with customer counts and revenue
- Retention: Detailed metrics on repeat customers and loyalty
- Strengths/Opportunities: Clear categorization of what's working vs growth areas
- Challenges: Critical issues with urgent concerns
- Recommendations: Actionable steps with priority levels and expected outcomes

Response should be 800-1200 words with rich HTML formatting, inline styles, and comprehensive analysis.
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