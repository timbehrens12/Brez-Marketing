import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { validateRequest, checkRateLimit, addSecurityHeaders, sanitizeAIInput } from '@/lib/utils/validation'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Request validation schema
const actionRecommendationRequestSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID format'),
  userId: z.string().min(1, 'User ID is required')
})

interface ActionItem {
  id: string
  type: 'urgent' | 'opportunity' | 'insight' | 'optimization'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  leads?: string[]
  completed?: boolean
  completedAt?: string
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Enhanced authentication and rate limiting
    const { userId } = auth()
    
    if (!userId) {
      return addSecurityHeaders(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
    }

    // 🔒 SECURITY: Rate limiting for AI operations
    const rateLimitResponse = await checkRateLimit(userId, 'ai-action-recommendations', 3, 300) // 3 requests per 5 minutes
    if (rateLimitResponse) return addSecurityHeaders(rateLimitResponse)

    // 🔒 SECURITY: Input validation and sanitization
    const requestData = await request.json()
    const validatedData = validateRequest(actionRecommendationRequestSchema, requestData)
    
    if (validatedData instanceof NextResponse) {
      return addSecurityHeaders(validatedData)
    }
    
    const { campaignId, userId: requestUserId } = validatedData
    
    // 🔒 SECURITY: Ensure authenticated user matches request user
    if (userId !== requestUserId) {
      return addSecurityHeaders(NextResponse.json({ error: 'Access denied' }, { status: 403 }))
    }

    // Rate limiting: Only allow one generation per user per day
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const { data: existingRecommendation, error: checkError } = await supabase
      .from('action_recommendations_cache')
      .select('created_at')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (!checkError && existingRecommendation) {
      // Already generated today, return cached or deny
      return NextResponse.json({ 
        error: 'Recommendations already generated today. New recommendations available tomorrow.' 
      }, { status: 429 })
    }

    // Get campaign leads with lead data
    const { data: campaignLeads, error: leadsError } = await supabase
      .from('outreach_campaign_leads')
      .select(`
        *,
        lead:leads(*),
        campaign:outreach_campaigns(*)
      `)
      .eq('campaign_id', campaignId)

    if (leadsError) {
      console.error('Error fetching campaign leads:', leadsError)
      return NextResponse.json({ error: 'Failed to fetch campaign data' }, { status: 500 })
    }

    // Analyze the data and generate recommendations
    const recommendations = await generateAIRecommendations(campaignLeads)

    // Cache the recommendations for today
    try {
      await supabase
        .from('action_recommendations_cache')
        .upsert({
          user_id: userId,
          date: today,
          recommendations: JSON.stringify(recommendations),
          created_at: new Date().toISOString()
        })
    } catch (cacheError) {
      console.error('Error caching recommendations:', cacheError)
      // Continue anyway, don't fail the request
    }

    return addSecurityHeaders(NextResponse.json({ recommendations }))

  } catch (error) {
    console.error('Error generating recommendations:', error)
    return addSecurityHeaders(NextResponse.json({ 
      error: 'Failed to generate recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }))
  }
}

async function generateAIRecommendations(campaignLeads: any[]): Promise<ActionItem[]> {
  const recommendations: ActionItem[] = []
  const now = new Date()

  // Analyze leads data
  const stats = {
    total: campaignLeads.length,
    pending: campaignLeads.filter(cl => cl.status === 'pending').length,
    contacted: campaignLeads.filter(cl => cl.status === 'contacted').length,
    responded: campaignLeads.filter(cl => cl.status === 'responded').length,
    qualified: campaignLeads.filter(cl => cl.status === 'qualified').length,
    signed: campaignLeads.filter(cl => cl.status === 'signed').length,
    rejected: campaignLeads.filter(cl => cl.status === 'rejected').length,
  }

  // 1. URGENT: Follow-up needed (contacted leads going cold)
  const coldLeads = campaignLeads.filter(cl => 
    cl.status === 'contacted' && 
    cl.last_contacted_at && 
    new Date(cl.last_contacted_at) < new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  )

  if (coldLeads.length > 0) {
    recommendations.push({
      id: `follow-up-${Date.now()}`,
      type: 'urgent',
      priority: 'high',
      title: `Follow-up ${coldLeads.length} leads going cold`,
      description: `${coldLeads.length} leads haven't been contacted in 3+ days. Send follow-up messages to re-engage.`,
      action: 'Send follow-up messages',
      leads: coldLeads.map(cl => cl.lead?.business_name).filter(Boolean)
    })
  }

  // 1.5. URGENT: Smart follow-up reminders (1-2 days)
  const followUpSoon = campaignLeads.filter(cl => 
    cl.status === 'contacted' && 
    cl.last_contacted_at && 
    new Date(cl.last_contacted_at) >= new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) &&
    new Date(cl.last_contacted_at) <= new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
  )

  if (followUpSoon.length > 0) {
    recommendations.push({
      id: `smart-followup-${Date.now()}`,
      type: 'opportunity',
      priority: 'high',
      title: `${followUpSoon.length} leads ready for follow-up`,
      description: `Perfect timing - these leads were contacted 1-2 days ago. Follow up while you're still fresh in their mind.`,
      action: 'Send follow-up messages',
      leads: followUpSoon.map(cl => cl.lead?.business_name).filter(Boolean)
    })
  }

  // 1.6. SMART: Same-day follow-up for high-score leads
  const todayContacted = campaignLeads.filter(cl => 
    cl.status === 'contacted' && 
    cl.last_contacted_at && 
    new Date(cl.last_contacted_at) >= new Date(now.getTime() - 12 * 60 * 60 * 1000) && // Last 12 hours
    cl.lead?.lead_score && cl.lead.lead_score >= 80
  )

  if (todayContacted.length > 0) {
    recommendations.push({
      id: `same-day-followup-${Date.now()}`,
      type: 'opportunity',
      priority: 'medium',
      title: `${todayContacted.length} high-score leads contacted today`,
      description: `These high-value leads were contacted recently. Consider a same-day follow-up on a different platform.`,
      action: 'Try different platform',
      leads: todayContacted.map(cl => cl.lead?.business_name).filter(Boolean)
    })
  }

  // 2. URGENT: Responded leads need quick action
  const respondedLeads = campaignLeads.filter(cl => cl.status === 'responded')
  if (respondedLeads.length > 0) {
    recommendations.push({
      id: `responded-${Date.now()}`,
      type: 'urgent',
      priority: 'high',
      title: `${respondedLeads.length} hot leads responded`,
      description: `Active conversations waiting for your response. Strike while the iron is hot!`,
      action: 'Send follow-up messages',
      leads: respondedLeads.map(cl => cl.lead?.business_name).filter(Boolean)
    })
  }

  // 3. URGENT: Qualified leads need proposals
  const qualifiedLeads = campaignLeads.filter(cl => cl.status === 'qualified')
  if (qualifiedLeads.length > 0) {
    recommendations.push({
      id: `qualified-${Date.now()}`,
      type: 'urgent',
      priority: 'high',
      title: `${qualifiedLeads.length} qualified leads need proposals`,
      description: `Don't let qualified leads go cold. Send proposals within 24 hours of qualification.`,
      action: 'Send proposals',
      leads: qualifiedLeads.map(cl => cl.lead?.business_name).filter(Boolean)
    })
  }

  // 4. OPPORTUNITY: High-score pending leads
  const highScoreLeads = campaignLeads.filter(cl => 
    cl.status === 'pending' && 
    cl.lead?.lead_score && 
    cl.lead.lead_score >= 80
  ).sort((a, b) => (b.lead?.lead_score || 0) - (a.lead?.lead_score || 0))

  if (highScoreLeads.length > 0) {
    recommendations.push({
      id: `high-score-${Date.now()}`,
      type: 'opportunity',
      priority: 'high',
      title: `${highScoreLeads.length} high-value leads ready`,
      description: `Target your highest-scoring leads first for maximum conversion potential.`,
      action: 'Start outreach sequence',
      leads: highScoreLeads.slice(0, 5).map(cl => cl.lead?.business_name).filter(Boolean)
    })
  }

  // 4.5. SMART: Weekend follow-up strategy
  const weekendFollowUps = campaignLeads.filter(cl => 
    cl.status === 'contacted' && 
    cl.last_contacted_at && 
    new Date(cl.last_contacted_at) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) && // Last 7 days
    new Date(cl.last_contacted_at) <= new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // But more than 5 days ago
  )

  const isWeekend = now.getDay() === 0 || now.getDay() === 6 // Sunday or Saturday

  if (weekendFollowUps.length > 0 && isWeekend) {
    recommendations.push({
      id: `weekend-followup-${Date.now()}`,
      type: 'insight',
      priority: 'medium',
      title: `Weekend follow-up opportunity`,
      description: `${weekendFollowUps.length} leads contacted 5-7 days ago. Weekend follow-ups often get better response rates.`,
      action: 'Send weekend follow-ups',
      leads: weekendFollowUps.map(cl => cl.lead?.business_name).filter(Boolean)
    })
  }

  // 5. OPPORTUNITY: Pending leads with complete contact info
  const completeContactLeads = campaignLeads.filter(cl => 
    cl.status === 'pending' && 
    cl.lead?.email && 
    cl.lead?.phone && 
    cl.lead?.website
  )

  if (completeContactLeads.length > 0) {
    recommendations.push({
      id: `complete-contact-${Date.now()}`,
      type: 'opportunity',
      priority: 'medium',
      title: `${completeContactLeads.length} leads with complete contact info`,
      description: `These leads have email, phone, and website - start with your preferred outreach method.`,
      action: 'Start outreach',
      leads: completeContactLeads.slice(0, 3).map(cl => cl.lead?.business_name).filter(Boolean)
    })
  }

  // 6. INSIGHT: Optimal outreach timing
  const currentHour = now.getHours()
  if (currentHour >= 10 && currentHour <= 11) {
    recommendations.push({
      id: `timing-${Date.now()}`,
      type: 'insight',
      priority: 'medium',
      title: 'Prime outreach time active',
      description: 'You\'re in the optimal 10-11 AM window for highest response rates.',
      action: 'Send messages now'
    })
  } else if (currentHour >= 14 && currentHour <= 15) {
    recommendations.push({
      id: `timing-afternoon-${Date.now()}`,
      type: 'insight',
      priority: 'medium',
      title: 'Secondary outreach window',
      description: '2-3 PM is another good time for business outreach.',
      action: 'Send follow-ups now'
    })
  }

  // 7. OPTIMIZATION: Low response rate warning
  const responseRate = stats.total > 0 ? (stats.responded / stats.contacted) * 100 : 0
  if (stats.contacted >= 10 && responseRate < 15) {
    recommendations.push({
      id: `low-response-${Date.now()}`,
      type: 'optimization',
      priority: 'medium',
      title: `Response rate low at ${responseRate.toFixed(1)}%`,
      description: 'Consider targeting higher-scoring leads or trying different outreach methods.',
      action: 'Focus on high-score leads'
    })
  }

  // 8. OPTIMIZATION: Conversion funnel analysis
  if (stats.responded >= 5 && stats.qualified / stats.responded < 0.5) {
    recommendations.push({
      id: `qualification-${Date.now()}`,
      type: 'optimization',
      priority: 'medium',
      title: 'Low qualification rate detected',
      description: 'Many leads respond but few qualify. Focus on better lead qualification.',
      action: 'Review responded leads'
    })
  }

  // 9. INSIGHT: Success momentum
  const recentSigned = campaignLeads.filter(cl => 
    cl.status === 'signed' && 
    new Date(cl.added_at) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  )

  if (recentSigned.length > 0) {
    recommendations.push({
      id: `momentum-${Date.now()}`,
      type: 'insight',
      priority: 'low',
      title: `${recentSigned.length} new clients this week!`,
      description: 'Great momentum! Keep targeting similar high-quality leads.',
      action: 'Find similar leads'
    })
  }

  // 10. OPPORTUNITY: Weekend prep
  const dayOfWeek = now.getDay()
  if (dayOfWeek === 5 && currentHour >= 15) { // Friday afternoon
    const pendingForMonday = campaignLeads.filter(cl => cl.status === 'pending').length
    if (pendingForMonday > 0) {
      recommendations.push({
        id: `weekend-prep-${Date.now()}`,
        type: 'opportunity',
        priority: 'low',
        title: 'Plan Monday outreach',
        description: `${pendingForMonday} pending leads ready for outreach - get a head start on Monday.`,
        action: 'Review pending leads'
      })
    }
  }

  return recommendations.slice(0, 8) // Limit to 8 recommendations
}

export async function GET() {
  return addSecurityHeaders(NextResponse.json({ message: 'Action recommendations endpoint' }))
} 