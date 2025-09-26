import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { addSecurityHeaders, sanitizeAIInput } from '@/lib/utils/validation'

// Set maximum duration for this API route (300 seconds max for Vercel Pro)
export const maxDuration = 300

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
    
          // Build a streamlined prompt for the AI
      const prompt = `${historicalContextPrompt}
Analyze marketing data for ${brand.name} and generate business report content.

**Date Range**: ${date_range.from} to ${date_range.to} (${date_range.period_name})

**Shopify Data**: Sales: $${platforms.shopify.totalSales}, Orders: ${platforms.shopify.ordersPlaced}, AOV: $${platforms.shopify.averageOrderValue}, Growth: ${platforms.shopify.salesGrowth}%

**Meta Data**: Spend: $${platforms.meta.adSpend}, Impressions: ${platforms.meta.impressions}, Clicks: ${platforms.meta.clicks}, CTR: ${platforms.meta.ctr}%, ROAS: ${platforms.meta.roas}

**Demographics**: ${additional_insights?.demographics?.success ? 
  `Age groups: ${additional_insights.demographics.insights?.topAgeGroups?.map((a: any) => `${a.age} (${a.impressions} imp, $${a.spend})`).join(', ') || 'None'}, 
   Gender: ${additional_insights.demographics.insights?.genderDistribution?.map((g: any) => `${g.gender} (${g.impressions} imp, $${g.spend})`).join(', ') || 'None'},
   Devices: ${additional_insights.demographics.insights?.topDevices?.map((d: any) => `${d.device} (${d.impressions} imp)`).join(', ') || 'None'}` : 'No data'}

**Locations**: ${additional_insights?.customer_location?.locations?.length > 0 ? 
  additional_insights.customer_location.locations.map((l: any) => `${l.location} ($${l.revenue}, ${l.customers} customers)`).join(', ') : 'No data'}

**Repeat Customers**: ${additional_insights?.repeat_customers?.success ? 
  `Rate: ${additional_insights.repeat_customers.data?.overview?.repeatRate || 0}%, Revenue: $${additional_insights.repeat_customers.data?.overview?.repeatRevenue || 0}` : 'No data'}

**AGENCY REPORT REQUIREMENTS:**
- Write as a marketing agency presenting results to your client
- Use professional agency language: "We analyzed your campaigns", "Your audience shows", "We identified opportunities"
- Present data as insights and findings, not instructions
- Include all demographic segments (age, gender, devices) with specific performance data
- Show geographic distribution and regional performance patterns  
- Present customer retention metrics and loyalty insights
- Focus on what the data reveals about their business performance
- Provide strategic recommendations as expert guidance from the agency

Generate ONLY the report content sections (no title, no wrapper). Create a professional agency report FOR the client with these sections:

1. EXECUTIVE SUMMARY - High-level overview of performance and results
2. KEY PERFORMANCE METRICS - Month-over-month comparisons and growth metrics
3. TOP PERFORMING ADS & CREATIVES - Best performing campaigns and creative analysis
4. AUDIENCE PERFORMANCE INSIGHTS - Demographics, geographic, and behavioral data
5. BUDGET ALLOCATION & SCALING INSIGHTS - Spend efficiency and optimization opportunities
6. OVERALL CLIENT IMPACT & ROI - Business impact and return on investment
7. NEXT STEPS & RECOMMENDATIONS - Strategic guidance from your agency

Use this EXACT HTML structure but replace the example text with your actual analysis of the provided data:

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; display: flex; align-items: center; gap: 0.75rem;">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#d1d5db" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 4h7v5h5v11H6V4zm8 0l3 3h-3V4zM8 13h8v1H8v-1zm0 3h8v1H8v-1zm0-6h2v1H8v-1z"/>
  </svg>
  EXECUTIVE SUMMARY
</h2>
<p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">[Write your comprehensive executive summary here with actual performance data]</p>

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; display: flex; align-items: center; gap: 0.75rem;">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#d1d5db" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
    <path d="M3 17h4v4H3v-4zm6-7h4v11H9V10zm6-7h4v18h-4V3z"/>
  </svg>
  KEY PERFORMANCE METRICS
</h2>
<p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">[Write actual metrics analysis with specific numbers and percentages]</p>

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; display: flex; align-items: center; gap: 0.75rem;">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#d1d5db" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
    <path d="M12 2l3.09 6.26L22 9l-5 4.87 1.18 6.88L12 17.77l-6.18 2.98L7 14.87 2 9l6.91-1.26L12 2z"/>
  </svg>
  TOP PERFORMING ADS & CREATIVES
</h2>
<p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">[Write actual ad performance analysis with specific data]</p>

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; display: flex; align-items: center; gap: 0.75rem;">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#d1d5db" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
  AUDIENCE PERFORMANCE INSIGHTS
</h2>
<div style="margin: 1rem 0; padding: 1.5rem; border-left: 6px solid #10b981; background: rgba(42, 42, 42, 0.3); border-radius: 8px;">
<h3 style="color: #ffffff; font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem 0;">Demographics Analysis</h3>
<p style="color: #d1d5db; line-height: 1.8;">[Write actual demographics analysis with age groups, gender, device data]</p>
</div>
<div style="margin: 1rem 0; padding: 1.5rem; border-left: 6px solid #3b82f6; background: rgba(42, 42, 42, 0.3); border-radius: 8px;">
<h3 style="color: #ffffff; font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem 0;">Geographic Performance</h3>
<p style="color: #d1d5db; line-height: 1.8;">[Write actual geographic analysis with location data]</p>
</div>
<div style="margin: 1rem 0; padding: 1.5rem; border-left: 6px solid #8b5cf6; background: rgba(42, 42, 42, 0.3); border-radius: 8px;">
<h3 style="color: #ffffff; font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem 0;">Customer Retention</h3>
<p style="color: #d1d5db; line-height: 1.8;">[Write actual customer retention analysis with repeat customer data]</p>
</div>

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; display: flex; align-items: center; gap: 0.75rem;">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#d1d5db" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
  BUDGET ALLOCATION & SCALING INSIGHTS
</h2>
<p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">[Write actual budget analysis with spend efficiency data]</p>

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; display: flex; align-items: center; gap: 0.75rem;">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#d1d5db" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
  </svg>
  OVERALL CLIENT IMPACT & ROI
</h2>
<p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">[Write actual ROI analysis with business impact data]</p>

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; display: flex; align-items: center; gap: 0.75rem;">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#d1d5db" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
    <path d="M13 3l3.5 3.5L22 2l-2 8h-8l2.5-2.5L9.5 2.5 8 4l1.5 1.5L2 13l8-2-2.5-2.5L13 3z"/>
  </svg>
  NEXT STEPS & RECOMMENDATIONS
</h2>
<p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">[Write actual strategic recommendations based on the data analysis]</p>

MANDATORY REQUIREMENTS:
- You MUST include ALL 7 main sections shown above (Executive Summary through Next Steps)
- You MUST include ALL 3 colored subsections under Audience Performance Insights
- Use the EXACT HTML structure and styling provided above
- REPLACE ALL [bracketed placeholder text] with actual analysis of the provided data
- Do NOT copy the placeholder text - write real content based on the data
- Generate the same structure for daily and monthly reports
- Only change the data content, never the structure or section headers
- Include specific data points and be comprehensive

CRITICAL HTML SAFETY: Only use safe HTML tags (h1, h2, h3, p, div, strong, ul, li, span). Use inline styles only. Never use script, iframe, object, embed tags or event handlers.
    `
    
    console.log('Sending optimized prompt to OpenAI...')
    
    // Generate the report using OpenAI with aggressive optimization for speed
    const result = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a marketing agency analyst creating a report FOR your client. Use the provided HTML template but REPLACE ALL placeholder text with actual analysis of the data. Write in agency-to-client tone with specific data points. Generate ONLY the content sections using the exact HTML structure provided.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gpt-3.5-turbo', // Faster model
      temperature: 0.3, // Lower for faster, more focused responses
      max_tokens: 4000 // Increased to prevent cutoff
    }, {
      timeout: 25000 // 25 second timeout on OpenAI call
    })
    
    const analysis = result.choices[0].message.content
    
    if (!analysis) {
      throw new Error('No analysis content generated')
    }
    
    console.log('Successfully generated AI report')
    
    // Sanitize and validate the AI response
    const sanitizedAnalysis = analysis ? analysis.trim() : ''
    
    if (!sanitizedAnalysis) {
      throw new Error('AI generated empty response')
    }
    
    // Basic HTML validation - remove potentially dangerous elements and clean up
    const safeHtml = sanitizedAnalysis
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '') // Remove event handlers
      .replace(/javascript:/gi, '')
      .replace(/^```html\s*/gi, '') // Remove markdown code block start
      .replace(/\s*```\s*$/gi, '') // Remove markdown code block end
      .replace(/^["'`]+|["'`]+$/g, '') // Remove leading/trailing quotes
      .trim()
    
    // Create safe, contained response with proper HTML structure
    const formattedReport = `<div style="padding: 2rem; color: #ffffff; font-family: system-ui, sans-serif; max-width: 100%; overflow: hidden; word-wrap: break-word;">${safeHtml}</div>`
    
    console.log('Report length:', formattedReport.length)
    console.log('First 200 chars:', formattedReport.substring(0, 200))
    
    // Return optimized response
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
    
    // Fast fallback response instead of error
    const fallbackReport = `
    <div style="padding: 2rem; color: #ffffff; font-family: system-ui, sans-serif; max-width: 100%; overflow: hidden; word-wrap: break-word;">
      <h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; display: flex; align-items: center; gap: 0.75rem;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#d1d5db" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 4h7v5h5v11H6V4zm8 0l3 3h-3V4zM8 13h8v1H8v-1zm0 3h8v1H8v-1zm0-6h2v1H8v-1z"/>
        </svg>
        EXECUTIVE SUMMARY
      </h2>
      <p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">Report is being generated with current performance data. Analytics show ongoing campaign optimization and data collection in progress.</p>
      
      <h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; display: flex; align-items: center; gap: 0.75rem;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#d1d5db" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
          <path d="M3 17h4v4H3v-4zm6-7h4v11H9V10zm6-7h4v18h-4V3z"/>
        </svg>
        KEY PERFORMANCE METRICS
      </h2>
      <p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">Current performance metrics are being compiled. Please refresh for updated analysis.</p>
      
      <h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; display: flex; align-items: center; gap: 0.75rem;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#d1d5db" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
          <path d="M13 3l3.5 3.5L22 2l-2 8h-8l2.5-2.5L9.5 2.5 8 4l1.5 1.5L2 13l8-2-2.5-2.5L13 3z"/>
        </svg>
        NEXT STEPS & RECOMMENDATIONS
      </h2>
      <p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">Refresh the report to generate detailed analysis with current data insights.</p>
    </div>`
    
    return NextResponse.json(
      { 
        report: fallbackReport,
        rawResponse: fallbackReport,
        dateRange: { from: new Date().toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] }
      }, 
      { status: 200 }
    )
  }
} 