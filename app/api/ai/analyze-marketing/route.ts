import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { addSecurityHeaders, sanitizeAIInput } from '@/lib/utils/validation'

// Set maximum duration for this API route (60 seconds for optimized AI processing)
export const maxDuration = 60

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

Use this exact HTML structure:

Use this professional agency report structure:

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase;">📊 EXECUTIVE SUMMARY</h2>
<p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">Professional overview of campaign performance and key insights for the client.</p>

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase;">📈 KEY PERFORMANCE METRICS</h2>
<p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">Month-over-month performance comparisons and growth analysis.</p>

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase;">🎯 TOP PERFORMING ADS & CREATIVES</h2>
<p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">Analysis of best performing campaigns and creative elements.</p>

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase;">👥 AUDIENCE PERFORMANCE INSIGHTS</h2>
<div style="margin: 1rem 0; padding: 1.5rem; border-left: 6px solid #10b981; background: rgba(42, 42, 42, 0.3); border-radius: 8px;">
<h3 style="color: #ffffff; font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem 0;">Demographics Analysis</h3>
<p style="color: #d1d5db; line-height: 1.8;">Age, gender, and device performance breakdown.</p>
</div>
<div style="margin: 1rem 0; padding: 1.5rem; border-left: 6px solid #3b82f6; background: rgba(42, 42, 42, 0.3); border-radius: 8px;">
<h3 style="color: #ffffff; font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem 0;">Geographic Performance</h3>
<p style="color: #d1d5db; line-height: 1.8;">Regional distribution and location-based insights.</p>
</div>
<div style="margin: 1rem 0; padding: 1.5rem; border-left: 6px solid #8b5cf6; background: rgba(42, 42, 42, 0.3); border-radius: 8px;">
<h3 style="color: #ffffff; font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem 0;">Customer Retention</h3>
<p style="color: #d1d5db; line-height: 1.8;">Repeat customer analysis and loyalty metrics.</p>
</div>

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase;">💰 BUDGET ALLOCATION & SCALING INSIGHTS</h2>
<p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">Spend efficiency analysis and scaling opportunities.</p>

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase;">📊 OVERALL CLIENT IMPACT & ROI</h2>
<p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">Business impact assessment and return on investment analysis.</p>

<h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase;">🎯 NEXT STEPS & RECOMMENDATIONS</h2>
<p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">Strategic recommendations from your marketing team.</p>

Include specific data points and be comprehensive. 400-600 words total.

CRITICAL HTML SAFETY: Only use safe HTML tags (h1, h2, h3, p, div, strong, ul, li, span). Use inline styles only. Never use script, iframe, object, embed tags or event handlers.
    `
    
    console.log('Sending optimized prompt to OpenAI...')
    
    // Set a timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 50000)
    })
    
    // Generate the report using OpenAI with optimized settings
    const aiPromise = openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a marketing agency analyst creating a professional report FOR your client. Write in agency-to-client tone (we did this, we found that, here are your results). Generate ONLY content sections - no headers/titles/wrappers. Focus on presenting results and insights professionally to the client with specific data points.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 2500 // Reduced for faster generation
    })
    
    // Race between AI generation and timeout
    const result = await Promise.race([aiPromise, timeoutPromise])
    
    if (!result || typeof result === 'string') {
      throw new Error('OpenAI request timed out')
    }
    
    const chatCompletion = result as any
    const analysis = chatCompletion.choices[0].message.content
    
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
    return NextResponse.json(
      { 
        error: 'Error generating analysis', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
} 