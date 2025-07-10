import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, campaignId, campaign, includeCreatives, brandStats, brandSettings } = await request.json()
    
    // If we have the simplified campaign object from marketing assistant
    if (campaign && !campaignId) {
      // Simplified analysis for quick recommendations
      const quickAnalysisPrompt = `
Analyze this Meta advertising campaign and provide a quick recommendation:

CAMPAIGN: ${campaign.name}
- Status: ${campaign.status}
- Budget: $${campaign.budget}
- Spent: $${campaign.spent} (${((campaign.spent / campaign.budget) * 100).toFixed(0)}% of budget)
- ROAS: ${campaign.roas.toFixed(2)}x
- CTR: ${campaign.ctr.toFixed(2)}%
- CPC: $${campaign.cpc.toFixed(2)}
- Conversions: ${campaign.conversions}

BRAND CONTEXT:
- Overall ROAS: ${brandStats?.roas?.toFixed(2) || 'N/A'}x
- Brand Settings: ${JSON.stringify(brandSettings || {})}

Provide ONE concise recommendation (max 5 words) and severity level.
Examples:
- "Increase budget" (success)
- "Reduce CPC targeting" (warning)
- "Pause underperforming ads" (error)
- "Scale winning creative" (success)
- "Test new audiences" (warning)

Response format: { "recommendation": "Your recommendation", "severity": "success|warning|error" }
`

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a Meta ads expert. Provide extremely concise, actionable recommendations."
          },
          {
            role: "user",
            content: quickAnalysisPrompt
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      })

      try {
        const result = JSON.parse(completion.choices[0].message.content || '{}')
        return NextResponse.json({
          recommendation: result.recommendation || 'Optimize campaign',
          severity: result.severity || 'warning'
        })
      } catch {
        // Determine severity based on ROAS
        let severity = 'warning'
        if (campaign.roas >= 3) severity = 'success'
        else if (campaign.roas < 1.5) severity = 'error'
        
        return NextResponse.json({
          recommendation: completion.choices[0].message.content || 'Review performance',
          severity
        })
      }
    }

    if (!brandId || !campaignId || !campaign) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Get ad sets and ads for this campaign
    const { data: adSets, error: adSetsError } = await supabase
      .from('meta_adsets')
      .select('*')
      .eq('brand_id', brandId)
      .eq('campaign_id', campaignId)

    const { data: ads, error: adsError } = await supabase
      .from('meta_ads')
      .select('*')
      .eq('brand_id', brandId)
      .eq('campaign_id', campaignId)

    // Get historical performance data
    const { data: dailyStats, error: statsError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('campaign_id', campaignId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Prepare creative analysis if requested
    let creativeAnalysis = ''
    if (includeCreatives && ads && ads.length > 0) {
      const creativesWithUrls = ads.filter(ad => ad.image_url || ad.video_id || ad.headline || ad.body)
      if (creativesWithUrls.length > 0) {
        creativeAnalysis = `\n\nCREATIVE ANALYSIS:\n${creativesWithUrls.map(ad => `
Ad: ${ad.ad_name}
- Headlines: ${ad.headline || 'N/A'}
- Body Text: ${ad.body || 'N/A'}  
- CTA: ${ad.cta_type || 'N/A'}
- Performance: ${ad.ctr?.toFixed(2)}% CTR, $${ad.cpc?.toFixed(2)} CPC, ${ad.conversions} conversions
- Creative Type: ${ad.video_id ? 'Video' : ad.image_url ? 'Image' : 'Text-only'}
        `).join('\n')}`
      }
    }

    // Create comprehensive analysis prompt
    const analysisPrompt = `
Analyze this Meta advertising campaign with deep insights and actionable recommendations:

CAMPAIGN OVERVIEW:
- Name: ${campaign.campaign_name}
- Objective: ${campaign.objective}
- Status: ${campaign.status}
- Budget: $${campaign.budget} (${campaign.budget_type})
- Current Performance: $${campaign.spent} spent, ${campaign.roas?.toFixed(2)}x ROAS, ${campaign.ctr?.toFixed(2)}% CTR

AD SETS (${adSets?.length || 0} total):
${adSets?.map(adSet => `
- ${adSet.adset_name}: $${adSet.spent} spent, ${adSet.ctr?.toFixed(2)}% CTR, $${adSet.cpc?.toFixed(2)} CPC
  Budget: $${adSet.budget} (${adSet.budget_type})
  Optimization: ${adSet.optimization_goal || 'N/A'}
`).join('') || 'No ad sets data available'}

ADS (${ads?.length || 0} total):
${ads?.map(ad => `
- ${ad.ad_name}: ${ad.status}, ${ad.ctr?.toFixed(2)}% CTR, $${ad.cpc?.toFixed(2)} CPC, ${ad.conversions} conversions
`).join('') || 'No ads data available'}

PERFORMANCE TRENDS (Last 30 days):
${dailyStats?.slice(0, 7).map(stat => `
- ${stat.date}: $${stat.spend} spent, ${stat.ctr?.toFixed(2)}% CTR, ${stat.conversions} conversions
`).join('') || 'No historical data available'}

${creativeAnalysis}

Provide a comprehensive analysis with:
1. PERFORMANCE ASSESSMENT (A-F grade with reasoning)
2. KEY INSIGHTS (3-5 bullet points on what's working/not working)
3. CRITICAL ISSUES (any immediate problems to address)
4. OPTIMIZATION OPPORTUNITIES (specific actionable recommendations)
5. BUDGET & SCALING RECOMMENDATIONS
6. CREATIVE RECOMMENDATIONS (if creative data available)
7. AUDIENCE & TARGETING SUGGESTIONS
8. PREDICTED OUTCOMES (if recommendations are implemented)

Format as JSON with these sections: grade, insights, issues, optimizations, budget_recommendations, creative_recommendations, targeting_suggestions, predicted_outcomes
`

    // Get AI analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert Meta advertising strategist and data analyst. Provide detailed, actionable insights based on campaign performance data. Focus on practical recommendations that can improve ROAS and campaign efficiency."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })

    let analysis
    try {
      analysis = JSON.parse(completion.choices[0].message.content || '{}')
    } catch (parseError) {
      // Fallback if JSON parsing fails
      analysis = {
        grade: 'B',
        insights: [completion.choices[0].message.content || 'Analysis generated successfully'],
        issues: [],
        optimizations: [],
        budget_recommendations: [],
        creative_recommendations: [],
        targeting_suggestions: [],
        predicted_outcomes: []
      }
    }

    // Store analysis result (optional - for future reference)
    const { error: insertError } = await supabase
      .from('campaign_analysis_history')
      .insert({
        brand_id: brandId,
        campaign_id: campaignId,
        analysis_date: new Date().toISOString(),
        analysis_data: analysis,
        user_id: userId
      })

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error generating campaign analysis:', error)
    return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 })
  }
} 