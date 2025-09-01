 import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

// Set maximum duration for this API route (90 seconds for AI processing)
export const maxDuration = 90

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Helper function to format numbers
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num)
}

// Helper function to format percentage
const formatPercentage = (num: number) => {
  return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`
}

export async function POST(request: Request) {
  try {
    // Check for secret token when this is a scheduled refresh
    const authHeader = request.headers.get('authorization')
    const isScheduledRefresh = authHeader?.startsWith('Bearer ') 
      && authHeader.substring(7) === process.env.REPORT_REFRESH_SECRET
    
    // Parse the request body
    const body = await request.json()
    const { customPrompt, enrichedData, period, brandId, isScheduledRefresh: bodyFlag } = body
    
    // Combined flag for scheduled refresh from either header or body
    const isAutomatedRefresh = isScheduledRefresh || bodyFlag
    
    // For scheduled refreshes, we need to generate the enriched data
    let data = enrichedData
    
    if (isAutomatedRefresh && brandId && !enrichedData) {
      console.log(`Automated refresh for brand ${brandId}, period: ${period}`)
      
      // Initialize Supabase client using server singleton
      const supabase = createClient()
      
      // Get brand details
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()
      
      if (brandError || !brand) {
        console.error(`Brand not found for id ${brandId}:`, brandError)
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
      }
      
      // Get connections for this brand
      const { data: connections, error: connectionsError } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', brandId)
      
      if (connectionsError) {
        console.error(`Error fetching connections for brand ${brandId}:`, connectionsError)
        return NextResponse.json({ error: 'Error fetching connections' }, { status: 500 })
      }
      
      // Fetch and process data to create enrichedData
      // This would call similar logic to what's in the HomeTab component
      // For brevity, we'll use a simplified example here:
      
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      let startDate, endDate, prevStartDate, prevEndDate
      
      if (period === 'daily') {
        startDate = today.toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        prevStartDate = new Date(today)
        prevStartDate.setDate(today.getDate() - 1)
        prevEndDate = prevStartDate
      } else { // monthly
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        prevStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        prevEndDate = new Date(today.getFullYear(), today.getMonth(), 0)
      }
      
      // Create a custom prompt for the AI
      const periodName = period === 'daily' ? "today" : "this month"
      const prompt = `
        Generate a concise business report for ${brand.name} for ${periodName} (${startDate} to ${endDate}).

        Structure the report with these sections, but use flowing paragraphs rather than bullet points:
        
        ## Business Summary
        A brief executive summary in 2-3 sentences that captures the overall performance.
        
        ## Performance Analysis
        A paragraph covering key metrics like Sales, Orders, AOV, and Marketing ROI. 
        Include specific numbers and percentages in the text. Highlight significant changes.
        
        ## Inventory & Operations
        A short paragraph about inventory status and operational insights.
        
        Keep paragraphs concise but informative. Use markdown headers to separate sections.
        Bold important numbers and insights within the paragraphs.
        The entire report should be under 250 words.
      `
      
      // For the automated version, we'll return a simpler response
      // A more complete implementation would fetch and calculate all the metrics
      data = {
        currentPeriod: {
          startDate,
          endDate
        },
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
      
      body.customPrompt = prompt
    }
    
    if (!body.customPrompt) {
      return NextResponse.json({ error: 'Missing customPrompt in request body' }, { status: 400 })
    }
    
    console.log('Generating AI report...')
    
    // Generate the report using OpenAI
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a professional marketing analyst. Generate ONLY the report content sections that will be inserted into a styled template. Use simple HTML tags that work with the existing CSS:\n\n<h2>1. EXECUTIVE SUMMARY</h2>\n<p>[Write comprehensive paragraph about overall performance with insights and context]</p>\n\n<h2>2. PERFORMANCE OVERVIEW</h2>\n<p>[Write detailed performance metrics and analysis with specific numbers and trends]</p>\n\n<h2>3. CHANNEL ANALYSIS</h2>\n<h3>3.1 Shopify Performance</h3>\n<p>[Write detailed analysis of Shopify performance, sales, orders, customer behavior]</p>\n\n<h3>3.2 Meta/Facebook Ads Performance</h3>\n<p>[Write detailed analysis of Meta ads performance, impressions, clicks, conversions, CTR]</p>\n\n<h2>4. STRENGTHS & OPPORTUNITIES</h2>\n<p>[Write about current strengths and growth opportunities with actionable insights]</p>\n\n<h2>5. WHAT\'S NOT WORKING</h2>\n<p>[Write about issues, problems, and areas needing improvement with specific examples]</p>\n\n<h2>6. ACTIONABLE RECOMMENDATIONS</h2>\n<ol>\n<li>[Specific recommendation 1 with clear action steps]</li>\n<li>[Specific recommendation 2 with clear action steps]</li>\n<li>[Specific recommendation 3 with clear action steps]</li>\n<li>[Additional recommendations as needed]</li>\n</ol>\n\nUse only basic HTML tags: <h2>, <h3>, <p>, <ol>, <li>, <strong>, <em>. The content will be styled by the existing CSS template.'
        },
        {
          role: 'user',
          content: body.customPrompt
        }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 4000
    })
    
    // Extract the generated text
    const report = chatCompletion.choices[0].message.content
    
    console.log('AI report generated successfully')
    
    // Return the report
    return NextResponse.json({ 
      report,
      dateRange: data?.dateRange || { start: '', end: '' } 
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { 
        error: 'Error generating report', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
} 