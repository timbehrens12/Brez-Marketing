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

Generate marketing report using this structure with real data:

<div style="background: #1e293b; padding: 1rem; margin: 1rem 0; border-left: 3px solid #3b82f6;">
<h2 style="color: #fff; margin: 0 0 0.5rem 0;">📊 Summary</h2>
<p style="color: #cbd5e1;">Brief overview with revenue: $${revenue}, orders: ${orders}, growth: ${growth}%</p>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0;">
<div style="background: #065f46; padding: 1rem;">
<h3 style="color: #fff; margin: 0 0 0.5rem 0;">🛒 Shopify</h3>
<p style="color: #d1fae5;">Revenue, orders, AOV with data</p>
</div>
<div style="background: #1e40af; padding: 1rem;">
<h3 style="color: #fff; margin: 0 0 0.5rem 0;">📱 Meta Ads</h3>
<p style="color: #dbeafe;">Spend, CTR, impressions</p>
</div>
</div>

<div style="background: #b45309; padding: 1rem; margin: 1rem 0;">
<h3 style="color: #fff; margin: 0 0 0.5rem 0;">👥 Demographics</h3>
<p style="color: #fef3c7;">Age groups, gender, devices with percentages</p>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0;">
<div style="background: #dc2626; padding: 1rem;">
<h3 style="color: #fff; margin: 0 0 0.5rem 0;">🗺️ Locations</h3>
<p style="color: #fecaca;">Cities and revenue</p>
</div>
<div style="background: #7c3aed; padding: 1rem;">
<h3 style="color: #fff; margin: 0 0 0.5rem 0;">🔄 Retention</h3>
<p style="color: #e9d5ff;">Repeat rates</p>
</div>
</div>

<div style="background: #1e40af; padding: 1rem; margin: 1rem 0;">
<h3 style="color: #fff; margin: 0 0 0.5rem 0;">🎯 Recommendations</h3>
<ul style="color: #dbeafe; margin: 0; padding-left: 1rem;">
<li>Action 1</li>
<li>Action 2</li>
<li>Action 3</li>
</ul>
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
     const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout
     
     let chatCompletion
     try {
       chatCompletion = await openai.chat.completions.create({
         messages: [
           {
                        role: 'system',
           content: 'Generate concise HTML marketing report. Use provided structure exactly. Include specific numbers and metrics. Keep response under 1500 words.'
           },
           {
             role: 'user',
             content: prompt
           }
         ],
         model: 'gpt-3.5-turbo',
         temperature: 0.3,
         max_tokens: 2000
       }, {
         signal: controller.signal
       })
       
       clearTimeout(timeoutId)
     } catch (error) {
       clearTimeout(timeoutId)
       if (error.name === 'AbortError') {
         console.error('AI request timed out after 2 minutes')
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