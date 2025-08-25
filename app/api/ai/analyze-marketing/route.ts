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
      const { date_range, brand, platforms, user, formatting_instructions } = data
      
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

Generate a professional business report with proper HTML structure and inline styles for a dark theme. Use the following format:

1. EXECUTIVE SUMMARY
Brief overview of overall performance, highlighting key achievements and areas of concern.

2. PERFORMANCE OVERVIEW  
Summary of key metrics with specific numbers and percentages from the data.

3. CHANNEL ANALYSIS
3.1 Shopify Performance - Analyze revenue, orders, customer behavior
3.2 Meta/Facebook Ads Performance - Analyze ad spend, CTR, conversions
3.3 Audience Demographics Analysis - Age, gender, device preferences

4. STRENGTHS & OPPORTUNITIES
What's working well and areas for improvement.

5. WHAT'S NOT WORKING
Performance issues and areas of concern with specific data.

6. ACTIONABLE RECOMMENDATIONS
4-5 specific, actionable recommendations for improvement.

**FORMATTING REQUIREMENTS:**
- Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <li>
- Apply inline styles for dark theme: headers in #e5e7eb, text in #d1d5db
- Use <strong> tags for emphasis on key metrics
- Include specific numbers from the actual data provided
- Make content comprehensive but well-organized (400-600 words)
- Use proper spacing and structure
    `
    
    console.log('Sending prompt to OpenAI...')
    
    // Generate the report using OpenAI
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a senior business analyst specializing in e-commerce and digital marketing with expertise in audience demographics and targeting optimization. Generate properly structured HTML report content with inline styles and color-coded sections. Never include main headers or titles - only generate the content sections that will go inside a pre-styled wrapper. Always use inline CSS styles for consistent formatting. Focus on data-driven insights and actionable recommendations with specific numbers from the data provided. When demographics data is available, provide detailed audience analysis including age groups, gender performance, and device preferences with optimization recommendations based on engagement and conversion patterns.'
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
    
    // Create the complete formatted report with styling (like the original working version)
    const formattedReport = `
      <style>
        /* Reset and isolation styles */
        .report-wrapper {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #000000 !important;
          min-height: auto;
          height: auto;
          margin: 0;
          padding: 0;
          display: block !important;
          color: #ffffff !important;
          box-sizing: border-box;
        }
        
        .report-wrapper * {
          box-sizing: border-box;
        }
        
        .report-container {
          background: #000000;
          color: #ffffff;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0;
          box-sizing: border-box;
        }
        
        .report-header {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          padding: 3rem 2.5rem 2rem 2.5rem;
          border-bottom: 3px solid #333333;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
        }
        
        .report-header h1 {
          color: #ffffff;
          font-size: 2.5rem;
          font-weight: 800;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.025em;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .report-subtitle {
          color: #cccccc;
          font-size: 1.1rem;
          margin-bottom: 2rem;
          font-weight: 400;
        }
        
        .info-stack {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .info-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid #333333;
        }
        
        .info-label {
          color: #888888;
          font-size: 0.9rem;
          font-weight: 500;
          min-width: 80px;
        }
        
        .info-value {
          color: #ffffff;
          font-weight: 600;
          font-size: 0.95rem;
        }
        
        .monospace {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.85rem;
        }
        
        .header-brand-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .brand-logo {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }
        
        .brand-info {
          text-align: right;
        }
        
        .brand-label {
          color: #888888;
          font-size: 0.85rem;
          margin-bottom: 0.25rem;
        }
        
        .brand-name {
          color: #ffffff;
          font-size: 1.25rem;
          font-weight: 700;
        }
        
        .report-content {
          padding: 2.5rem;
          background: #000000 !important;
          color: #ffffff !important;
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
        
        .report-footer {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          padding: 2rem 2.5rem;
          border-top: 3px solid #333333;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .footer-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .footer-agency-logo {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          font-weight: 700;
          color: white;
        }
        
        .footer-agency-name {
          color: #ffffff;
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .footer-agency-tagline {
          color: #cccccc;
          font-size: 0.9rem;
        }
        
        .footer-right {
          text-align: right;
        }
        
        .document-status {
          color: #fbbf24;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        
        .footer-metadata {
          color: #888888;
          font-size: 0.8rem;
        }
        
        .timestamp, .report-id {
          margin-bottom: 0.25rem;
        }
      </style>
      
      <div class="report-wrapper">
        <div class="report-container">
          <!-- Enhanced Header -->
          <div class="report-header">
            <div class="report-header-left">
              <h1>MARKETING PERFORMANCE REPORT</h1>
              <div class="report-subtitle">Comprehensive marketing analysis and performance insights for ${brandName}</div>
              
              <!-- Hamburger-style Stacked Info -->
              <div class="info-stack">
                <div class="info-item">
                  <span class="info-label">Period</span>
                  <span class="info-value">${date_range.period_name}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Generated</span>
                  <span class="info-value">${format(new Date(), 'MMM d, yyyy')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Report ID</span>
                  <span class="info-value monospace">${reportId}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Generated by</span>
                  <span class="info-value">${user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'Unknown User'}</span>
                </div>
              </div>
            </div>
            
            <!-- Brand Section - Top Right -->
            <div class="header-brand-section">
              <div class="brand-logo">
                ${brand?.image_url 
                  ? `<img src="${brand.image_url}" alt="${brandName} Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" />`
                  : `<span>${brandName.slice(0, 2).toUpperCase()}</span>`
                }
              </div>
              <div class="brand-info">
                <div class="brand-label">Brand</div>
                <div class="brand-name">${brandName}</div>
              </div>
            </div>
          </div>
          
          <!-- Enhanced Report content -->
          <div class="report-content">
            <div class="content-section">
              ${analysis}
            </div>
          </div>
          
          <!-- Enhanced Footer with Agency Logo on Left -->
          <div class="report-footer">
            <div class="footer-left">
              <div class="footer-agency-logo">
                <span>BM</span>
              </div>
              <div class="footer-agency-info">
                <div class="footer-agency-name">Marketing Intelligence</div>
                <div class="footer-agency-tagline">Professional Marketing Analytics</div>
              </div>
            </div>
            
            <div class="footer-right">
              <div class="document-status">CONFIDENTIAL & PROPRIETARY</div>
              <div class="footer-metadata">
                <div class="timestamp">${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</div>
                <div class="report-id">ID: ${reportId}</div>
              </div>
            </div>
          </div>
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