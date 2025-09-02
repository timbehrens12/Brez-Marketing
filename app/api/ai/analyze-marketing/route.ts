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

**CRITICAL DATA ANALYSIS REQUIREMENTS:**
- ALWAYS use the Demographics & Audience Insights data to provide COMPREHENSIVE analysis of ALL age groups, genders, and devices in section 3.3 - not just the top performers
- ALWAYS use the Customer Geographic Data to provide COMPLETE location analysis including ALL locations with revenue/customer data in section 3.4  
- ALWAYS use the Repeat Customer Analysis data to provide DETAILED retention and loyalty insights in section 3.5
- Show performance data for ALL demographic segments, not just the highest performing ones
- Include specific numbers, percentages, impressions, CTR, and spend data for multiple segments
- If any additional insights data is empty or null, then and only then mention data is unavailable
- Provide detailed breakdowns rather than just highlighting top performers

Generate a business report with this structure:

1. **📊 EXECUTIVE SUMMARY** - Overview with key metrics
2. **📈 PERFORMANCE OVERVIEW** - Sales and ad performance 
3. **🔍 CHANNEL ANALYSIS** - Shopify, Meta, Demographics, Geographic, Repeat Customers
4. **💪 STRENGTHS & OPPORTUNITIES** - What's working well
5. **⚠️ WHAT'S NOT WORKING** - Areas of concern
6. **🎯 ACTIONABLE RECOMMENDATIONS** - 4-5 specific next steps

Use this HTML styling:
- Main headers: h2 with white text, large font, border-bottom
- Subsection boxes: div with dark gradient background and border
- Sub headers: h3 with white text, uppercase
- Text: p with light gray text
- Emphasis: strong with bright white text

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
          content: 'You are a business analyst. Generate valid, safe HTML marketing report content with inline styles. CRITICAL: Only use safe HTML tags (h1, h2, h3, p, div, strong, ul, li, span). Never use script, iframe, or other potentially unsafe tags. Focus on data-driven insights with specific numbers. Use the exact structure requested.'
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
    
    // Basic HTML validation - remove potentially dangerous elements
    const safeHtml = sanitizedAnalysis
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '') // Remove event handlers
      .replace(/javascript:/gi, '')
    
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