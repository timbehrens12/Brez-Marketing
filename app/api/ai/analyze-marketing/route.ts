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
- Use proper HTML structure optimized for 8.5x11 paper format
- Use two-column layouts where appropriate to maximize space efficiency
- Keep sections concise and well-organized for standard paper printing

Generate professional business report content with beautiful, organized sections:

<div class="executive-summary" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 12px; padding: 2rem; margin-bottom: 2rem; border-left: 4px solid #3b82f6;">
  <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
    <div style="width: 12px; height: 12px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>
    <h2 style="color: #f1f5f9; font-size: 1.5rem; font-weight: 700; margin: 0;">Executive Summary</h2>
  </div>
  <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; align-items: start;">
    <div>
      <p style="color: #cbd5e1; font-size: 1.1rem; line-height: 1.7; margin: 0;">Provide a compelling overview of overall performance, highlighting key achievements, growth trends, and critical areas requiring attention with specific metrics.</p>
    </div>
    <div style="background: rgba(59, 130, 246, 0.1); border-radius: 8px; padding: 1.5rem; border: 1px solid rgba(59, 130, 246, 0.2);">
      <div style="text-align: center;">
        <div style="color: #3b82f6; font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Quick Stats</div>
        <div style="color: #f1f5f9; font-size: 1.25rem; font-weight: 700;">Include key numbers like total revenue, growth %, orders, etc.</div>
      </div>
    </div>
  </div>
</div>

<div class="platform-performance" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
  <div style="background: linear-gradient(135deg, #064e3b 0%, #10b981 100%); border-radius: 12px; padding: 2rem; position: relative; overflow: hidden;">
    <div style="position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
      <span style="color: #ffffff; font-size: 1.5rem;">🛒</span>
    </div>
    <h3 style="color: #ffffff; font-size: 1.3rem; font-weight: 700; margin: 0 0 1rem 0;">Shopify Performance</h3>
    <div style="color: #ecfdf5; font-size: 1rem; line-height: 1.6;">
      <p style="margin: 0 0 1rem 0;">Analyze revenue metrics, order counts, customer behavior, AOV, and growth percentages with specific data from the reporting period.</p>
      <div style="background: rgba(255, 255, 255, 0.1); border-radius: 6px; padding: 1rem; margin-top: 1rem;">
        <div style="font-size: 0.875rem; color: #a7f3d0; font-weight: 600;">Include metrics like:</div>
        <div style="font-size: 0.875rem; color: #ecfdf5; margin-top: 0.5rem;">Total revenue, orders, AOV, growth rates</div>
      </div>
    </div>
  </div>

  <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); border-radius: 12px; padding: 2rem; position: relative; overflow: hidden;">
    <div style="position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
      <span style="color: #ffffff; font-size: 1.5rem;">📱</span>
    </div>
    <h3 style="color: #ffffff; font-size: 1.3rem; font-weight: 700; margin: 0 0 1rem 0;">Meta Advertising</h3>
    <div style="color: #dbeafe; font-size: 1rem; line-height: 1.6;">
      <p style="margin: 0 0 1rem 0;">Analyze ad spend efficiency, CTR, impressions, ROAS, campaign performance with specific metrics and budget utilization.</p>
      <div style="background: rgba(255, 255, 255, 0.1); border-radius: 6px; padding: 1rem; margin-top: 1rem;">
        <div style="font-size: 0.875rem; color: #93c5fd; font-weight: 600;">Include metrics like:</div>
        <div style="font-size: 0.875rem; color: #dbeafe; margin-top: 0.5rem;">Spend, CTR, impressions, conversions, ROAS</div>
      </div>
    </div>
  </div>
</div>

<div class="audience-demographics" style="background: linear-gradient(135deg, #92400e 0%, #f59e0b 100%); border-radius: 12px; padding: 2rem; margin-bottom: 2rem; position: relative;">
  <div style="position: absolute; top: 1.5rem; right: 2rem; width: 50px; height: 50px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
    <span style="color: #ffffff; font-size: 2rem;">👥</span>
  </div>
  <h3 style="color: #ffffff; font-size: 1.4rem; font-weight: 700; margin: 0 0 1.5rem 0;">Audience Demographics Analysis</h3>
  <div style="color: #fef3c7; font-size: 1.05rem; line-height: 1.7; margin-bottom: 1.5rem;">
    <p style="margin: 0;">Provide comprehensive breakdown of ALL demographic segments from the data. Include performance metrics for ALL age groups (18-24, 25-34, 35-44, 45-54, 55-64, 65+), ALL gender segments (male, female), and ALL device types. Show specific numbers, percentages, impressions, CTR, and spend data for each segment - not just top performers.</p>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 1rem; text-align: center;">
      <div style="color: #fbbf24; font-size: 0.875rem; font-weight: 600;">Age Groups</div>
      <div style="color: #fef3c7; font-size: 0.8rem; margin-top: 0.25rem;">All 6 segments</div>
    </div>
    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 1rem; text-align: center;">
      <div style="color: #fbbf24; font-size: 0.875rem; font-weight: 600;">Gender Split</div>
      <div style="color: #fef3c7; font-size: 0.8rem; margin-top: 0.25rem;">Male vs Female</div>
    </div>
    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 1rem; text-align: center;">
      <div style="color: #fbbf24; font-size: 0.875rem; font-weight: 600;">Device Types</div>
      <div style="color: #fef3c7; font-size: 0.8rem; margin-top: 0.25rem;">All platforms</div>
    </div>
  </div>
</div>

<div class="location-retention" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
  <div style="background: linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%); border-radius: 12px; padding: 2rem; position: relative;">
    <div style="position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
      <span style="color: #ffffff; font-size: 1.5rem;">🗺️</span>
    </div>
    <h3 style="color: #ffffff; font-size: 1.3rem; font-weight: 700; margin: 0 0 1rem 0;">Geographic Distribution</h3>
    <div style="color: #fecaca; font-size: 1rem; line-height: 1.6;">
      <p style="margin: 0 0 1rem 0;">Analyze customer locations, regional revenue performance, and distribution patterns. Include actual city/state/country data with customer counts and revenue by region.</p>
      <div style="background: rgba(255, 255, 255, 0.1); border-radius: 6px; padding: 1rem; margin-top: 1rem;">
        <div style="font-size: 0.875rem; color: #fca5a5; font-weight: 600;">Show specific:</div>
        <div style="font-size: 0.875rem; color: #fecaca; margin-top: 0.5rem;">Cities, revenue by location, customer distribution</div>
      </div>
    </div>
  </div>

  <div style="background: linear-gradient(135deg, #581c87 0%, #8b5cf6 100%); border-radius: 12px; padding: 2rem; position: relative;">
    <div style="position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
      <span style="color: #ffffff; font-size: 1.5rem;">🔄</span>
    </div>
    <h3 style="color: #ffffff; font-size: 1.3rem; font-weight: 700; margin: 0 0 1rem 0;">Customer Retention</h3>
    <div style="color: #e9d5ff; font-size: 1rem; line-height: 1.6;">
      <p style="margin: 0 0 1rem 0;">Analyze retention rates, repeat purchase percentages, customer lifetime value metrics, and loyalty trends using actual repeat customer data.</p>
      <div style="background: rgba(255, 255, 255, 0.1); border-radius: 6px; padding: 1rem; margin-top: 1rem;">
        <div style="font-size: 0.875rem; color: #c4b5fd; font-weight: 600;">Key metrics:</div>
        <div style="font-size: 0.875rem; color: #e9d5ff; margin-top: 0.5rem;">Repeat rate, CLV, loyalty patterns</div>
      </div>
    </div>
  </div>
</div>

<div class="insights-recommendations" style="margin-bottom: 2rem;">
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
    <div style="background: linear-gradient(135deg, #064e3b 0%, #059669 100%); border-radius: 12px; padding: 2rem; position: relative;">
      <div style="position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; background: rgba(255, 255, 255, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <span style="color: #ffffff; font-size: 1.3rem;">✅</span>
      </div>
      <h3 style="color: #ffffff; font-size: 1.3rem; font-weight: 700; margin: 0 0 1.5rem 0;">What's Working</h3>
      <div style="color: #d1fae5; font-size: 1rem; line-height: 1.7;">
        <p style="margin: 0;">Identify strengths and opportunities with specific data points. Highlight top-performing metrics, successful strategies, and growth areas to build upon.</p>
      </div>
    </div>

    <div style="background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%); border-radius: 12px; padding: 2rem; position: relative;">
      <div style="position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; background: rgba(255, 255, 255, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <span style="color: #ffffff; font-size: 1.3rem;">⚠️</span>
      </div>
      <h3 style="color: #ffffff; font-size: 1.3rem; font-weight: 700; margin: 0 0 1.5rem 0;">Areas for Improvement</h3>
      <div style="color: #fecaca; font-size: 1rem; line-height: 1.7;">
        <p style="margin: 0;">Identify performance issues and concerns with specific metrics. Focus on underperforming areas that need immediate attention and optimization.</p>
      </div>
    </div>
  </div>

  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px; padding: 2.5rem; position: relative;">
    <div style="position: absolute; top: 1.5rem; right: 2rem; width: 50px; height: 50px; background: rgba(255, 255, 255, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
      <span style="color: #ffffff; font-size: 1.8rem;">🎯</span>
    </div>
    <h3 style="color: #ffffff; font-size: 1.5rem; font-weight: 700; margin: 0 0 1.5rem 0;">Strategic Action Plan</h3>
    <div style="color: #dbeafe; font-size: 1.05rem; line-height: 1.8; margin-bottom: 1.5rem;">
      <p style="margin: 0;">Provide 4-6 specific, actionable recommendations with clear next steps and expected outcomes. Format as organized bullet points with implementation priorities and timeline considerations.</p>
    </div>
    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 1.5rem;">
      <div style="color: #93c5fd; font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem;">Recommendation Structure:</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
        <div style="text-align: center; padding: 0.75rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
          <div style="color: #60a5fa; font-size: 0.875rem; font-weight: 600;">Priority</div>
          <div style="color: #dbeafe; font-size: 0.8rem;">High/Medium/Low</div>
        </div>
        <div style="text-align: center; padding: 0.75rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
          <div style="color: #60a5fa; font-size: 0.875rem; font-weight: 600;">Action</div>
          <div style="color: #dbeafe; font-size: 0.8rem;">Specific steps</div>
        </div>
        <div style="text-align: center; padding: 0.75rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
          <div style="color: #60a5fa; font-size: 0.875rem; font-weight: 600;">Expected Impact</div>
          <div style="color: #dbeafe; font-size: 0.8rem;">Measurable outcomes</div>
        </div>
      </div>
    </div>
  </div>
</div>

**CRITICAL FORMATTING RULES:**
- Use the EXACT styled structure shown above with all inline styles preserved
- Replace the instructional text in each section with your actual analysis using the same styling
- Use <strong style="color: #ffffff; font-weight: 700;"> for emphasis on key numbers/metrics
- Keep the gradient backgrounds, icons, and layout structure exactly as shown
- Fill in actual data and insights while maintaining the visual design
- Use bullet points with proper styling for recommendations
- Make each section comprehensive with real data from the provided information
- Maintain the color-coded theme for each section (blue, green, orange, red, purple)
- Keep content organized and professional, not cramped paragraphs
- Use specific numbers, percentages, and actionable insights throughout

Response should be comprehensive with actual analysis replacing the placeholder text while maintaining all visual styling.
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