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
    
    // Simplified historical context
    const historicalContextPrompt = historicalContext.count > 0 ? `
Previous reports: ${historicalContext.count} found. Compare current vs previous performance.
` : `First report for this brand. Focus on current performance.
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

**REQUIREMENTS:**
- Use ALL provided data: demographics, geographic, repeat customers
- Include specific numbers, percentages, and metrics
- Keep content CONCISE for 8.5x11 format
- Use bullet points and short paragraphs
- Generate ONLY content sections (no headers/titles)

Generate compact business report:

Use this HTML structure with YOUR analysis:

<h2 style="color: #e5e7eb; font-size: 0.85rem; margin: 0 0 0.3rem 0;">📊 SUMMARY</h2>
<p style="color: #d1d5db; font-size: 0.7rem; margin-bottom: 0.5rem;">Brief overview with key numbers.</p>

<h2 style="color: #e5e7eb; font-size: 0.85rem; margin: 0.5rem 0 0.3rem 0;">🛒 SHOPIFY PERFORMANCE</h2>
<p style="color: #d1d5db; font-size: 0.7rem; margin-bottom: 0.5rem;">Revenue, orders, growth rates with specific data.</p>

<h2 style="color: #e5e7eb; font-size: 0.85rem; margin: 0.5rem 0 0.3rem 0;">📱 META ADS</h2>
<p style="color: #d1d5db; font-size: 0.7rem; margin-bottom: 0.5rem;">Spend, CTR, ROAS with specific numbers.</p>

<h2 style="color: #e5e7eb; font-size: 0.85rem; margin: 0.5rem 0 0.3rem 0;">👥 DEMOGRAPHICS</h2>
<p style="color: #d1d5db; font-size: 0.7rem; margin-bottom: 0.5rem;">ALL age groups, genders, devices from data.</p>

<h2 style="color: #e5e7eb; font-size: 0.85rem; margin: 0.5rem 0 0.3rem 0;">🗺️ GEOGRAPHY</h2>
<p style="color: #d1d5db; font-size: 0.7rem; margin-bottom: 0.5rem;">Customer locations and revenue by region.</p>

<h2 style="color: #e5e7eb; font-size: 0.85rem; margin: 0.5rem 0 0.3rem 0;">🔄 RETENTION</h2>
<p style="color: #d1d5db; font-size: 0.7rem; margin-bottom: 0.5rem;">Repeat customer rates and trends.</p>

<h2 style="color: #e5e7eb; font-size: 0.85rem; margin: 0.5rem 0 0.3rem 0;">🎯 RECOMMENDATIONS</h2>
<ul style="color: #d1d5db; font-size: 0.7rem; margin: 0 0 0.5rem 1rem;">
<li>Action item 1</li>
<li>Action item 2</li>
<li>Action item 3</li>
</ul>

Keep response under 400 words. Use <strong> for key numbers.
    `
    
    console.log('Sending prompt to OpenAI...')
    
    // Generate the report using OpenAI with timeout handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
    
    try {
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst. Generate compact HTML report content with inline styles. Use the exact structure provided. Keep responses under 400 words. Include specific numbers from the data. Focus on key insights only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 2000
      }, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('AI request timed out')
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