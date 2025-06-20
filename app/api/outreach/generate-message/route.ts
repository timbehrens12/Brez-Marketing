import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Security Configuration
const SECURITY_LIMITS = {
  MAX_MESSAGES_PER_HOUR: 15,      // Max 15 messages per hour per user
  MAX_MESSAGES_PER_DAY: 50,       // Max 50 messages per day per user
  MAX_MESSAGES_PER_LEAD: 3,       // Max 3 messages per lead (prevent spam to same person)
  COOLDOWN_BETWEEN_MESSAGES: 30,  // 30 seconds between message generations
  MAX_DAILY_COST_USD: 5.00        // Max $5 of OpenAI costs per user per day
}

// Track message generation usage
async function trackUsage(userId: string, leadId: string, messageType: string, cost: number = 0.02) {
  try {
    const { error } = await supabase
      .from('outreach_message_usage')
      .insert({
        user_id: userId,
        lead_id: leadId,
        message_type: messageType,
        generated_at: new Date().toISOString(),
        estimated_cost: cost
      })
    
    if (error) {
      console.error('❌ Failed to track usage:', error)
    }
  } catch (error) {
    console.error('❌ Error tracking usage:', error)
  }
}

// Check if user is within rate limits
async function checkRateLimits(userId: string, leadId?: string) {
  try {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const cooldownTime = new Date(now.getTime() - SECURITY_LIMITS.COOLDOWN_BETWEEN_MESSAGES * 1000)

    // Check hourly limit
    const { data: hourlyUsage, error: hourlyError } = await supabase
      .from('outreach_message_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('generated_at', oneHourAgo.toISOString())

    if (hourlyError) throw hourlyError

    if (hourlyUsage && hourlyUsage.length >= SECURITY_LIMITS.MAX_MESSAGES_PER_HOUR) {
      return {
        allowed: false,
        reason: 'HOURLY_LIMIT',
        message: `Rate limit exceeded. You can generate up to ${SECURITY_LIMITS.MAX_MESSAGES_PER_HOUR} messages per hour. Please wait before trying again.`,
        resetTime: new Date(oneHourAgo.getTime() + 60 * 60 * 1000)
      }
    }

    // Check daily limit
    const { data: dailyUsage, error: dailyError } = await supabase
      .from('outreach_message_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('generated_at', oneDayAgo.toISOString())

    if (dailyError) throw dailyError

    if (dailyUsage && dailyUsage.length >= SECURITY_LIMITS.MAX_MESSAGES_PER_DAY) {
      return {
        allowed: false,
        reason: 'DAILY_LIMIT',
        message: `Daily limit reached. You can generate up to ${SECURITY_LIMITS.MAX_MESSAGES_PER_DAY} messages per day. Limit resets at midnight.`,
        resetTime: new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000)
      }
    }

    // Check daily cost limit
    const totalDailyCost = dailyUsage?.reduce((sum, usage) => sum + (usage.estimated_cost || 0.02), 0) || 0
    if (totalDailyCost >= SECURITY_LIMITS.MAX_DAILY_COST_USD) {
      return {
        allowed: false,
        reason: 'COST_LIMIT',
        message: `Daily cost limit reached ($${SECURITY_LIMITS.MAX_DAILY_COST_USD}). Limit resets at midnight to prevent excessive API costs.`,
        resetTime: new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000)
      }
    }

    // Check cooldown period
    const { data: recentUsage, error: recentError } = await supabase
      .from('outreach_message_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('generated_at', cooldownTime.toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)

    if (recentError) throw recentError

    if (recentUsage && recentUsage.length > 0) {
      return {
        allowed: false,
        reason: 'COOLDOWN',
        message: `Please wait ${SECURITY_LIMITS.COOLDOWN_BETWEEN_MESSAGES} seconds between message generations to prevent spam.`,
        resetTime: new Date(new Date(recentUsage[0].generated_at).getTime() + SECURITY_LIMITS.COOLDOWN_BETWEEN_MESSAGES * 1000)
      }
    }

    // Check per-lead limit (prevent spam to same person)
    if (leadId) {
      const { data: leadUsage, error: leadError } = await supabase
        .from('outreach_message_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('lead_id', leadId)
        .gte('generated_at', oneDayAgo.toISOString())

      if (leadError) throw leadError

      if (leadUsage && leadUsage.length >= SECURITY_LIMITS.MAX_MESSAGES_PER_LEAD) {
        return {
          allowed: false,
          reason: 'LEAD_LIMIT',
          message: `You've already generated ${SECURITY_LIMITS.MAX_MESSAGES_PER_LEAD} messages for this lead today. This prevents spam and maintains professional outreach standards.`,
          resetTime: new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    }

    return { allowed: true, reason: null, message: null }
  } catch (error) {
    console.error('❌ Error checking rate limits:', error)
    // Allow the request if we can't check limits (graceful degradation)
    return { allowed: true, reason: null, message: null }
  }
}

export async function POST(request: NextRequest) {
  let requestBody: any = null
  
  try {
    console.log('🤖 AI Generate message API called')
    
    const { userId } = auth()
    console.log('👤 User ID:', userId)
    
    if (!userId) {
      console.log('❌ No user ID found, returning unauthorized')
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Please log in to generate messages',
        ai_generated: false
      }, { status: 401 })
    }

    // Parse request body with error handling
    try {
      requestBody = await request.json()
      console.log('📥 Request parsed successfully')
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return NextResponse.json({ 
        error: 'Invalid request format',
        message: 'Failed to parse request data',
        ai_generated: false
      }, { status: 400 })
    }
    
    const { lead, messageType, brandInfo, campaign_context, ai_instructions } = requestBody

    if (!lead || !messageType) {
      console.log('❌ Missing required fields:', { lead: !!lead, messageType })
      return NextResponse.json({ 
        error: 'Missing required fields',
        message: 'Lead data and message type are required',
        ai_generated: false
      }, { status: 400 })
    }

    // 🔒 SECURITY: Check rate limits before proceeding
    const leadId = lead.id || `${lead.business_name}_${lead.email || lead.phone || 'unknown'}`
    const rateLimitCheck = await checkRateLimits(userId, leadId)
    
    if (!rateLimitCheck.allowed) {
      console.log(`🚨 Rate limit exceeded for user ${userId}:`, rateLimitCheck.reason)
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: rateLimitCheck.message,
        reason: rateLimitCheck.reason,
        resetTime: rateLimitCheck.resetTime,
        ai_generated: false
      }, { status: 429 })
    }

    // Build comprehensive AI context
    const leadContext = `
Business: ${lead.business_name || 'Unknown Business'}
Owner: ${lead.owner_name || 'Unknown Owner'}
Industry: ${lead.niche_name || lead.industry || 'Unknown Industry'}
Location: ${lead.city && lead.state_province ? `${lead.city}, ${lead.state_province}` : 'Unknown Location'}
Website: ${lead.website || 'No website found'}
Phone: ${lead.phone ? 'Has phone' : 'No phone'}
Email: ${lead.email ? 'Has email' : 'No email'}
Lead Score: ${lead.lead_score || 'N/A'}/100
Social Media:
- Instagram: ${lead.instagram_handle ? `Yes (${lead.instagram_handle})` : 'No'}
- Facebook: ${lead.facebook_page ? `Yes (${lead.facebook_page})` : 'No'}
- LinkedIn: ${lead.linkedin_profile ? `Yes (${lead.linkedin_profile})` : 'No'}
- Twitter: ${lead.twitter_handle ? `Yes (${lead.twitter_handle})` : 'No'}
Business Type: ${lead.business_type || 'Unknown'}
Revenue Estimate: ${lead.estimated_revenue ? `$${lead.estimated_revenue}` : 'Unknown'}
`

    const brandContext = `
Agency Name: {YOUR_AGENCY_NAME}
Industry: Digital Marketing
Value Proposition: We help businesses grow through digital marketing using exclusive AI technology

EXCLUSIVE ADVANTAGE: You have access to proprietary AI-powered marketing software that:
- Uses advanced computer intelligence to optimize campaigns 24/7
- Delivers results that traditional marketers and agencies cannot match
- Is available to only a limited number of marketers
- Provides an unfair competitive advantage in campaign performance
- Automatically optimizes targeting, budgets, and creatives using AI
- Predicts campaign performance before spending money
- Continuously learns and improves results beyond human capability

IMPORTANT: Use {YOUR_AGENCY_NAME} or {YOUR_BRAND} as placeholders for the sender's brand name so users can customize it.
`

    const campaignContext = campaign_context ? `
Campaign Performance Context:
- Total leads in pipeline: ${campaign_context.total_leads}
- Current response rate: ${campaign_context.response_rate}%
- Conversion rate: ${campaign_context.conversion_rate}%
- Recent successes: ${campaign_context.recent_success} signed clients
` : ''

    const instructionsContext = ai_instructions ? `
AI Instructions:
- Tone: ${ai_instructions.tone}
- Personalization Level: ${ai_instructions.personalization_level}
- Call to Action: ${ai_instructions.call_to_action}
- Urgency Level: ${ai_instructions.urgency}
` : ''

    // Create method-specific prompts
    const methodPrompts = {
      email: `Create a professional email outreach message. Include a compelling subject line. The email should be:
- Professional but personable
- 150-250 words
- Include specific references to their business and industry
- EMPHASIZE exclusive access to AI-powered marketing software that delivers superior results
- Highlight that this AI technology gives an unfair advantage over traditional marketers
- Mention that few people have access to this level of AI optimization
- Have a clear call-to-action
- Include credibility indicators about the AI software's performance
Format as: Subject: [subject line]\n\n[email body]`,

      phone: `Create a complete phone call script for a cold outreach call. Include:
- Opening hook (15-20 seconds) that mentions exclusive AI technology
- Value proposition specific to their industry, emphasizing AI-powered optimization
- Credibility/social proof about the AI software's superior results
- Highlight that this AI technology is not available to most marketers
- Clear call-to-action
- Objection handling for common responses
- Closing and next steps
Format as a structured call script with clear sections.`,

      linkedin: `Create a LinkedIn connection request message or InMail. Should be:
- 100-150 words maximum
- Professional but friendly
- Reference something specific about their business
- Emphasize access to exclusive AI-powered marketing technology
- Highlight competitive advantage through AI optimization
- Include a soft call-to-action
- Position the AI software as rare and superior`,

      instagram: `Create an Instagram DM that's:
- Casual but professional
- 50-100 words
- Reference their Instagram content if possible
- Mention exclusive AI-powered marketing software in a natural way
- Highlight that this technology delivers results other marketers can't match
- Offer value upfront
- Include a collaborative angle`,

      facebook: `Create a Facebook message that's:
- Friendly and approachable
- 75-125 words
- Reference their business page or recent posts
- Naturally mention exclusive access to AI marketing technology
- Emphasize superior results through AI optimization
- Include a soft ask for connection`,

      sms: `Create a text message that's:
- 160 characters or less
- Direct and valuable
- Mention AI-powered marketing advantage
- Highlight exclusive access/limited availability
- Professional but conversational
- Include a simple next step`
    }

    const methodPrompt = methodPrompts[messageType as keyof typeof methodPrompts] || methodPrompts.email

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not configured, using enhanced fallback')
      throw new Error('OpenAI API key not configured')
    }

    // Enhanced prompt for GPT-4 (email/DM), simplified for GPT-3.5-turbo (phone)
    const systemPrompt = messageType === 'phone' 
      ? `You are an expert sales copywriter. Create personalized outreach messages that convert cold leads.

You represent someone with exclusive AI-powered marketing software that delivers superior results. This AI technology gives an unfair competitive advantage.

Key principles:
1. Reference specific business details
2. Emphasize EXCLUSIVE ACCESS to AI marketing technology  
3. Show industry understanding
4. Clear, low-pressure call-to-action
5. Professional but conversational tone
6. Focus on results they care about
7. Use {YOUR_AGENCY_NAME} or {YOUR_BRAND} placeholders for sender's business name`
      : `You are an expert sales copywriter and digital marketing strategist. Your job is to create highly personalized, effective outreach messages that convert cold leads into interested prospects.

CRITICAL: You represent someone with access to exclusive, limited-access AI-powered marketing software that delivers superior results compared to any other marketer or agency. This software uses advanced computer intelligence to optimize campaigns in ways that traditional marketers simply cannot match.

Key principles:
1. Always reference specific details about their business
2. Emphasize the EXCLUSIVE, LIMITED ACCESS to AI-powered marketing technology
3. Highlight that this AI software delivers results NO OTHER marketer can achieve
4. Show understanding of their industry challenges
5. Include social proof when relevant
6. Make the call-to-action clear and low-pressure
7. Write in a conversational, professional tone (not robotic)
8. Focus on outcomes they care about
9. Position the AI technology as a competitive advantage that's rarely available

UNIQUE VALUE PROPOSITION: You have access to proprietary AI marketing software that most agencies don't have access to. This gives you an unfair advantage in delivering results.

CRITICAL FORMATTING: Always use clear placeholders like {YOUR_AGENCY_NAME}, {YOUR_BRAND}, {YOUR_COMPANY} when referring to the sender's business. Never use vague phrases like "your brand" or "our team" - use clear bracketed placeholders so users know exactly what to customize.`

    const userPrompt = `${methodPrompt}

LEAD CONTEXT:
${leadContext}

BRAND CONTEXT:
${brandContext}

${campaignContext}

${instructionsContext}

Generate a ${messageType} message for this lead. Make it highly personalized and compelling while emphasizing the exclusive AI technology advantage.`

    console.log('🔮 Sending request to OpenAI...')
    
    // Use GPT-4 for better quality, with timeout
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI request timeout')), 30000)
      )
    ]) as any

    const aiResponse = completion.choices[0]?.message?.content
    console.log('✅ OpenAI response received')

    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    // Track successful usage
    await trackUsage(userId, leadId, messageType, 0.02) // Estimate $0.02 per message

    // Extract subject line for email
    let subject = ''
    let message = aiResponse

    if (messageType === 'email' && aiResponse.includes('Subject:')) {
      const lines = aiResponse.split('\n')
      const subjectLine = lines.find((line: string) => line.toLowerCase().startsWith('subject:'))
      if (subjectLine) {
        subject = subjectLine.replace(/^subject:\s*/i, '').trim()
        message = lines.filter((line: string) => !line.toLowerCase().startsWith('subject:')).join('\n').trim()
      }
    }

    console.log('✅ AI message generated successfully')
    return NextResponse.json({
      message: message,
      subject: subject,
      ai_generated: true,
      usage: {
        messagesRemaining: {
          hourly: SECURITY_LIMITS.MAX_MESSAGES_PER_HOUR - (await getUsageCount(userId, 'hourly')),
          daily: SECURITY_LIMITS.MAX_MESSAGES_PER_DAY - (await getUsageCount(userId, 'daily'))
        }
      }
    })

  } catch (error) {
    console.error('❌ Error in AI generation:', error)
    
    // Enhanced fallback templates with exclusive AI messaging
    const enhancedFallbacks = {
      email: {
        subject: `Exclusive AI Marketing Technology for ${requestBody?.lead?.business_name || 'Your Business'}`,
        message: `Hi ${requestBody?.lead?.owner_name || 'there'},

I noticed ${requestBody?.lead?.business_name || 'your business'} and wanted to reach out about something that could give you a significant competitive advantage.

I have access to exclusive AI-powered marketing software that's only available to a select few marketers. This isn't your typical marketing automation - it's advanced AI that:

• Optimizes campaigns 24/7 using machine learning
• Delivers results that traditional marketers simply can't match  
• Predicts performance before you spend a dollar
• Continuously improves beyond human capability

${requestBody?.lead?.niche_name ? `For businesses in ${requestBody.lead.niche_name}, we've seen average ROI improvements of 150-300% compared to traditional methods.` : ''}

Would you be interested in a brief call to see how this AI technology could specifically help ${requestBody?.lead?.business_name || 'your business'}? 

I only work with a limited number of clients due to the exclusive nature of this software.

Best regards,
{YOUR_AGENCY_NAME}`
      },
      
      phone: `OPENING (15-20 seconds):
"Hi ${requestBody?.lead?.owner_name || '[Owner Name]'}, this is [Your Name] from {YOUR_AGENCY_NAME}. I'm calling because I have access to some exclusive AI-powered marketing technology that's delivering incredible results for businesses like ${requestBody?.lead?.business_name || '[Business Name]'}, and I think it could really help you too. Do you have 2 minutes?"

VALUE PROPOSITION:
"What makes this different is that I have access to proprietary AI marketing software that most agencies don't have. This AI technology optimizes campaigns 24/7, predicts performance before spending money, and delivers results that traditional marketers simply cannot match."

${requestBody?.lead?.niche_name ? `INDUSTRY SPECIFIC: "For ${requestBody.lead.niche_name} businesses specifically, we're seeing 150-300% better ROI compared to traditional marketing approaches."` : ''}

SOCIAL PROOF:
"The AI continuously learns and improves campaigns beyond human capability. It's like having a team of data scientists working on your marketing around the clock."

SCARCITY:
"The thing is, this technology is only available to a limited number of businesses. I can only take on a few more clients this quarter."

CALL TO ACTION:
"Would you be open to a brief 15-minute call where I can show you exactly how this AI technology could specifically help ${requestBody?.lead?.business_name || '[Business Name]'}?"

OBJECTION HANDLING:
- "Not interested": "I understand, but this isn't typical marketing. This is AI technology that gives you an unfair advantage over competitors."
- "Too busy": "That's exactly why you need AI doing the heavy lifting. It works while you focus on running your business."
- "Already have marketing": "That's great, but can your current marketing predict results before spending money and optimize 24/7? This AI can."

CLOSING:
"How about I send you a quick case study of a ${requestBody?.lead?.niche_name || 'similar business'} that saw [specific result] in their first month? What's the best email for that?"`,

      linkedin: `Hi ${requestBody?.lead?.owner_name || '[Name]'},

I came across ${requestBody?.lead?.business_name || 'your company'} and was impressed by ${requestBody?.lead?.niche_name ? 'your work in the ' + requestBody.lead.niche_name + ' space' : 'what you\'re building'}.

I wanted to connect because I have access to exclusive AI-powered marketing technology that's only available to a select group of marketers. This isn't typical automation - it's advanced AI that optimizes campaigns 24/7 and delivers results that traditional agencies simply can't match.

${requestBody?.lead?.niche_name ? 'For ' + requestBody.lead.niche_name + ' businesses, we\'re seeing 150-300% better ROI compared to conventional marketing.' : ''}

The AI technology predicts performance before spending money and continuously improves beyond human capability. It's like having a team of data scientists working on your marketing around the clock.

Would you be open to a brief conversation about how this could specifically help ${requestBody?.lead?.business_name || 'your business'}?

Best,
{YOUR_AGENCY_NAME}`,

      instagram: `Hey ${requestBody?.lead?.owner_name || 'there'}! 👋

Love what you're doing with ${requestBody?.lead?.business_name || 'your brand'}! ${requestBody?.lead?.instagram_handle ? `Your Instagram content is great` : 'Your business looks awesome'}.

I have access to some exclusive AI marketing tech that's only available to select marketers. It uses advanced AI to optimize campaigns 24/7 and delivers results other agencies can't match.

${requestBody?.lead?.niche_name ? `Perfect for ${requestBody.lead.niche_name} businesses like yours!` : ''}

Interested in chatting about how this AI could help scale your business? DM me! 🚀

{YOUR_AGENCY_NAME}`,

      facebook: `Hi ${requestBody?.lead?.owner_name || 'there'},

I came across ${requestBody?.lead?.business_name || 'your business page'} and wanted to reach out about something exciting.

I have access to exclusive AI-powered marketing software that's only available to a limited number of marketers. This AI technology delivers results that traditional marketing simply can't match - it optimizes campaigns 24/7 and predicts performance before you spend money.

${requestBody?.lead?.niche_name ? `For ${requestBody.lead.niche_name} businesses, we're seeing incredible results.` : ''}

Would love to chat about how this could help ${requestBody?.lead?.business_name || 'your business'} grow!

{YOUR_AGENCY_NAME}`,

      sms: `Hi ${requestBody?.lead?.owner_name || '[Name]'}, I have exclusive AI marketing tech that delivers results other agencies can't match. Only available to select businesses. Interested? - {YOUR_AGENCY_NAME}`
    }

    const fallback = enhancedFallbacks[requestBody?.messageType as keyof typeof enhancedFallbacks] || enhancedFallbacks.email
    
    // Still track usage even for fallbacks to prevent abuse
    if (requestBody?.lead && requestBody?.messageType) {
      const leadId = requestBody.lead.id || `${requestBody.lead.business_name}_${requestBody.lead.email || requestBody.lead.phone || 'unknown'}`
      await trackUsage(requestBody.userId || 'unknown', leadId, requestBody.messageType, 0.001) // Lower cost for fallback
    }

    console.log('⚠️ Using enhanced fallback template')
    return NextResponse.json({
      message: typeof fallback === 'string' ? fallback : fallback.message,
      subject: typeof fallback === 'string' ? '' : (fallback.subject || ''),
      ai_generated: false,
      error: 'AI service temporarily unavailable, using enhanced template'
    })
  }
}

// Helper function to get usage count
async function getUsageCount(userId: string, period: 'hourly' | 'daily'): Promise<number> {
  try {
    const now = new Date()
    const timeAgo = period === 'hourly' 
      ? new Date(now.getTime() - 60 * 60 * 1000)
      : new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const { data, error } = await supabase
      .from('outreach_message_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('generated_at', timeAgo.toISOString())

    if (error) throw error
    return data?.length || 0
  } catch (error) {
    console.error('❌ Error getting usage count:', error)
    return 0
  }
} 