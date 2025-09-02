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

Generate concise business report with organized sections:

<div style="background: #1e293b; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; border-left: 3px solid #3b82f6;">
  <h2 style="color: #f1f5f9; font-size: 1.2rem; font-weight: 700; margin: 0 0 1rem 0;">📊 Executive Summary</h2>
  <p style="color: #cbd5e1; font-size: 1rem; line-height: 1.6; margin: 0;">Provide overview of performance with key metrics: revenue, growth %, orders, and critical insights.</p>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
  <div style="background: #065f46; border-radius: 8px; padding: 1.5rem;">
    <h3 style="color: #ffffff; font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem 0;">🛒 Shopify Performance</h3>
    <p style="color: #d1fae5; font-size: 0.95rem; line-height: 1.5; margin: 0;">Revenue, orders, AOV, growth rates with specific data.</p>
  </div>
  <div style="background: #1e40af; border-radius: 8px; padding: 1.5rem;">
    <h3 style="color: #ffffff; font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem 0;">📱 Meta Advertising</h3>
    <p style="color: #dbeafe; font-size: 0.95rem; line-height: 1.5; margin: 0;">Spend, CTR, impressions, ROAS with specific metrics.</p>
  </div>
</div>

<div style="background: #b45309; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
  <h3 style="color: #ffffff; font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem 0;">👥 Audience Demographics</h3>
  <p style="color: #fef3c7; font-size: 0.95rem; line-height: 1.5; margin: 0;">Complete breakdown of ALL age groups, genders, devices with specific numbers, percentages, CTR data.</p>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
  <div style="background: #dc2626; border-radius: 8px; padding: 1.5rem;">
    <h3 style="color: #ffffff; font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem 0;">🗺️ Geographic Distribution</h3>
    <p style="color: #fecaca; font-size: 0.95rem; line-height: 1.5; margin: 0;">Customer locations, regional revenue with actual city/state data.</p>
  </div>
  <div style="background: #7c3aed; border-radius: 8px; padding: 1.5rem;">
    <h3 style="color: #ffffff; font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem 0;">🔄 Customer Retention</h3>
    <p style="color: #e9d5ff; font-size: 0.95rem; line-height: 1.5; margin: 0;">Retention rates, repeat purchase %, CLV with actual data.</p>
  </div>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
  <div style="background: #059669; border-radius: 8px; padding: 1.5rem;">
    <h3 style="color: #ffffff; font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem 0;">✅ What's Working</h3>
    <p style="color: #d1fae5; font-size: 0.95rem; line-height: 1.5; margin: 0;">Strengths and opportunities with specific data points.</p>
  </div>
  <div style="background: #dc2626; border-radius: 8px; padding: 1.5rem;">
    <h3 style="color: #ffffff; font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem 0;">⚠️ Areas for Improvement</h3>
    <p style="color: #fecaca; font-size: 0.95rem; line-height: 1.5; margin: 0;">Performance issues that need immediate attention.</p>
  </div>
</div>

<div style="background: #1e40af; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
  <h3 style="color: #ffffff; font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem 0;">🎯 Action Plan</h3>
  <p style="color: #dbeafe; font-size: 0.95rem; line-height: 1.5; margin: 0;">4-6 specific, actionable recommendations with priorities and expected outcomes.</p>
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
    
         // Generate the report using OpenAI with timeout handling
     const controller = new AbortController()
     const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout
     
     let chatCompletion
     try {
       chatCompletion = await openai.chat.completions.create({
         messages: [
           {
             role: 'system',
             content: 'You are a business analyst. Generate HTML report content with inline styles. Be concise but comprehensive. Focus on data-driven insights with specific numbers. Use the provided structure exactly as shown.'
           },
           {
             role: 'user',
             content: prompt
           }
         ],
         model: 'gpt-4o-mini',
         temperature: 0.5,
         max_tokens: 3000
       }, {
         signal: controller.signal
       })
       
       clearTimeout(timeoutId)
     } catch (error) {
       clearTimeout(timeoutId)
       if (error.name === 'AbortError') {
         console.error('AI request timed out after 45 seconds')
         throw new Error('AI request timed out - please try again')
       }
       throw error
     }
    
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