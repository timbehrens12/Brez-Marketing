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
  MAX_MESSAGES_PER_DAY: 25,       // Max 25 messages per day per user
  MAX_MESSAGES_PER_PLATFORM_PER_LEAD: 1, // Max 1 message per platform per lead (email, linkedin, etc.)
  COOLDOWN_BETWEEN_MESSAGES: 30,  // 30 seconds between message generations
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
async function checkRateLimits(userId: string, leadId?: string, messageType?: string) {
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

    if (hourlyError) {
      console.error('❌ Error checking hourly usage:', hourlyError)
      // If table doesn't exist or other DB error, allow operation (fail open)
      return { allowed: true, reason: null, message: null }
    }

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

    if (dailyError) {
      console.error('❌ Error checking daily usage:', dailyError)
      // If table doesn't exist or other DB error, allow operation (fail open)
      return { allowed: true, reason: null, message: null }
    }

    if (dailyUsage && dailyUsage.length >= SECURITY_LIMITS.MAX_MESSAGES_PER_DAY) {
      return {
        allowed: false,
        reason: 'DAILY_LIMIT',
        message: `Daily limit reached. You can generate up to ${SECURITY_LIMITS.MAX_MESSAGES_PER_DAY} messages per day. Limit resets at midnight.`,
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

    if (recentError) {
      console.error('❌ Error checking recent usage:', recentError)
      // If table doesn't exist or other DB error, allow operation (fail open)
      return { allowed: true, reason: null, message: null }
    }

    if (recentUsage && recentUsage.length > 0) {
      return {
        allowed: false,
        reason: 'COOLDOWN',
        message: `Please wait ${SECURITY_LIMITS.COOLDOWN_BETWEEN_MESSAGES} seconds between message generations to prevent spam.`,
        resetTime: new Date(new Date(recentUsage[0].generated_at).getTime() + SECURITY_LIMITS.COOLDOWN_BETWEEN_MESSAGES * 1000)
      }
    }

    // Check per-platform-per-lead limit (prevent multiple messages on same platform to same person)
    if (leadId && messageType) {
      const { data: platformUsage, error: platformError } = await supabase
        .from('outreach_message_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('lead_id', leadId)
        .eq('message_type', messageType)
        .gte('generated_at', oneDayAgo.toISOString())

      if (platformError) {
        console.error('❌ Error checking platform usage:', platformError)
        // If table doesn't exist or other DB error, allow operation (fail open)
        return { allowed: true, reason: null, message: null }
      }

      if (platformUsage && platformUsage.length >= SECURITY_LIMITS.MAX_MESSAGES_PER_PLATFORM_PER_LEAD) {
        return {
          allowed: false,
          reason: 'PLATFORM_LIMIT',
          message: `You've already generated a ${messageType} message for this lead today. Try a different platform (email, LinkedIn, Instagram, etc.) or wait until tomorrow.`,
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
    const rateLimitCheck = await checkRateLimits(userId, leadId, messageType)
    
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
Industry: Performance Marketing & Growth
Value Proposition: We specialize in profitable customer acquisition using data-driven strategies and proven systems

CORE ADVANTAGE: You have access to advanced marketing systems and strategies that:
- Generate consistent, predictable customer acquisition
- Focus on profitable growth and positive ROI from day one
- Use proven frameworks that scale with business growth
- Eliminate waste in marketing spend through precise targeting
- Turn marketing into a profit center instead of just an expense
- Are based on systematic approaches rather than guesswork
- Focus on sustainable, long-term growth strategies

EXCLUSIVE AI ADVANTAGE: You have access to very limited per-person AI software that uses artificial intelligence to achieve superior results in customer acquisition and targeting. This technology is restricted and not widely available, giving you a significant competitive advantage.

IMPORTANT: Use {YOUR_AGENCY_NAME} or {YOUR_BRAND} as placeholders for the sender's brand name so users can customize it.
CRITICAL: Never mention specific case studies, revenue numbers, or results you haven't personally achieved. Focus on methodology and approach.
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
      email: `Create a conversational email that reads like one successful business owner reaching out to another. Include a compelling subject line. The email should be:
- Warm and genuine (like talking to a friend in business)
- 150-250 words
- Reference their specific business and industry challenges 
- Focus on approach and methodology, not specific numbers or results
- Never mention fake statistics, revenue numbers, or specific outcomes
- Address a pain point they likely face (customer acquisition, scaling challenges, etc.)
- Position yourself as someone who understands their struggles
- Have a natural, consultative call-to-action
- Sound like authentic business advice from a peer, not a sales pitch
- Use casual, human language - avoid corporate buzzwords
Format as: Subject: [subject line]\n\n[email body]`,

      phone: `Create a natural phone conversation framework that sounds like one business owner calling another. Include:
- Friendly opening (15-20 seconds) that feels genuine and establishes connection
- Conversational hooks that spark curiosity naturally
- Industry-specific talking points that show understanding
- Focus on shared challenges and approaches, never specific numbers or claims
- Multiple response pathways that feel organic
- Gentle objection responses that build rapport
- Natural next steps that feel collaborative
- Authentic conversation pivots for different reactions
- Script should sound like a helpful peer, not a salesperson
- Use everyday language, avoid jargon and corporate speak
Format as: OPENING → CONNECTION → SHARED CHALLENGES → NATURAL CLOSE`,

      linkedin: `Create a LinkedIn message that sounds like authentic professional networking between peers. Should be:
- 100-150 words maximum
- Written like you're connecting two successful people
- Reference something specific about their business or recent activity
- Lead with value or insight, not a pitch
- Position yourself as a peer who's solved similar challenges
- Focus on methodology and approach, not specific claims
- Natural, collaborative call-to-action
- Sound like business development, not sales`,

      instagram: `Create an Instagram DM that feels genuine and friendly:
- Casual but respectful
- 50-100 words
- Reference their content or business genuinely
- Lead with a compliment or insight
- Offer value before asking for anything
- Sound like a fellow entrepreneur reaching out
- Include natural next step
- Avoid any "marketing speak"`,

      facebook: `Create a Facebook message that feels like connecting with a fellow business owner:
- Friendly and authentic
- 75-125 words
- Reference their business or recent posts specifically
- Lead with genuine interest in their business
- Offer insight or value relevant to their industry
- Sound like a business connection, not a pitch
- Include natural next conversation starter`,

      sms: `Create a text message that's direct and valuable:
- 160 characters or less
- Sound like a successful business owner reaching out
- Lead with specific value or opportunity
- No marketing jargon - straight business talk
- Include clear, simple next step
- Professional but approachable tone`,

      twitter: `Create a Twitter/X DM that's brief and authentic:
- 250 characters or less (allowing for DM format)
- Sound like a successful entrepreneur reaching out
- Reference their content or business activity if relevant
- Lead with value or interesting insight
- Professional but conversational tone
- Include clear call-to-action`,

      x: `Create an X (Twitter) message that's engaging and direct:
- 250 characters or less (allowing for DM format)
- Sound like a successful entrepreneur reaching out
- Reference their content or business activity if relevant
- Lead with value or interesting insight
- Professional but conversational tone
- Include clear call-to-action`
    }

    const methodPrompt = methodPrompts[messageType as keyof typeof methodPrompts] || methodPrompts.email

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not configured, using enhanced fallback')
      throw new Error('OpenAI API key not configured')
    }

    // Enhanced prompt for GPT-4 (email/DM), simplified for GPT-3.5-turbo (phone)
    const systemPrompt = messageType === 'phone' 
      ? `You are a top 1% sales professional and business development expert who specializes in B2B outreach that converts. You write messages that sound natural and build genuine relationships.

You represent a successful marketing strategist who helps businesses achieve predictable, profitable growth through proven customer acquisition systems.

CORE MESSAGING FRAMEWORK:
1. Lead with curiosity and specific business insights
2. Focus on PROFITABLE OUTCOMES, not features or technology
3. Sound like a peer business owner, not a vendor
4. Address real pain points with empathy
5. Focus on methodology and systematic approach, not specific claims
6. Create urgency through opportunity, not pressure
7. Always use {YOUR_AGENCY_NAME} or {YOUR_BRAND} placeholders
8. Write like you're having a conversation with a friend

AVOID: Sales jargon, feature lists, generic compliments, obvious pitches`
      : `You are a master copywriter and business strategist who writes outreach that converts. Your messages sound authentic, valuable, and build genuine business relationships.

IDENTITY: You represent a successful entrepreneur/consultant who specializes in profitable customer acquisition and business growth. You've helped hundreds of businesses scale through proven marketing systems and strategies.

CORE MESSAGING PHILOSOPHY:
1. Sound like a successful business owner reaching out to a peer
2. Lead with value and insights specific to their industry
3. Focus on PROFITABLE GROWTH and business outcomes
4. Address common business challenges with empathy and solutions
5. Focus on proven methodology and systematic approach, not specific claims
6. Create conversations, not pitches
7. Write in a warm, professional tone that builds trust
8. Position yourself as someone who gets results, not someone who just provides services

PSYCHOLOGICAL TRIGGERS TO USE:
- Curiosity gaps (mention methodology without explaining everything initially)
- Authority positioning through expertise and systematic approach
- Scarcity (limited availability/selective with clients)
- Reciprocity (offer value upfront through insights)
- Peer-to-peer connection (business owner to business owner)
- Problem-solution fit (identify pain points and offer systematic solutions)

LANGUAGE STYLE:
- Conversational and warm, never corporate
- Confident but not arrogant
- Specific rather than vague
- Action-oriented
- Industry-appropriate tone

CRITICAL FORMATTING: Always use clear placeholders like {YOUR_AGENCY_NAME}, {YOUR_BRAND}, {YOUR_COMPANY} when referring to the sender's business. Use these consistently so users can easily customize.`

    const userPrompt = `${methodPrompt}

LEAD CONTEXT:
${leadContext}

BRAND CONTEXT:
${brandContext}

${campaignContext}

${instructionsContext}

Generate a ${messageType} message for this lead. Make it highly personalized and compelling. IMPORTANT: Emphasize that you have access to very limited per-person AI software that uses artificial intelligence to achieve superior results in customer acquisition - this technology is restricted and not widely available, giving clients a significant competitive advantage. Make this AI advantage a key selling point in your message.`

    console.log('🔮 Sending request to OpenAI with optimized timeout...')
    
    // Use GPT-3.5-turbo for faster response to prevent 504s (Vercel has 10s limit)
    // Add extra timeout wrapper to ensure we NEVER exceed platform limits
    const completion = await Promise.race([
      Promise.race([
        openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 600, // Reduced for faster response
          temperature: 0.7,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI request timeout')), 8000) // Much shorter timeout
        )
      ]),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Server timeout protection')), 9000) // Absolute safety timeout
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
    console.log('⚠️ Using fallback templates due to error:', error instanceof Error ? error.message : 'Unknown error')
    
    // Enhanced fallback templates with natural, results-focused messaging
    const enhancedFallbacks = {
      email: {
        subject: `Quick question about ${requestBody?.lead?.business_name || 'your business'}'s customer acquisition`,
        message: `Hi ${requestBody?.lead?.owner_name || 'there'},

I came across ${requestBody?.lead?.business_name || 'your business'} and was impressed by what you're building${requestBody?.lead?.niche_name ? ` in the ${requestBody.lead.niche_name} space` : ''}.

I'm reaching out because I specialize in helping ${requestBody?.lead?.niche_name ? requestBody.lead.niche_name + ' businesses' : 'businesses'} solve a pretty common challenge - turning marketing spend into predictable, profitable customer acquisition.

${requestBody?.lead?.niche_name ? `Most ${requestBody.lead.niche_name} businesses struggle with inconsistent lead flow and high customer acquisition costs. ` : ''}I've developed a systematic approach that focuses on eliminating waste in marketing spend and creating predictable growth.

The methodology is based on data-driven targeting and proven frameworks that turn marketing from an expense into a profit center. I also have access to very limited per-person AI software that uses artificial intelligence to achieve superior results - this technology isn't widely available, which gives my clients a significant competitive advantage.

I only take on a few new clients each quarter, but I'd love to share how this systematic approach could work for ${requestBody?.lead?.business_name || 'your business'}.

Worth a quick 15-minute conversation?

Best,
{YOUR_AGENCY_NAME}

P.S. Even if we don't end up working together, I can share some insights about what's working in customer acquisition right now.`
      },
      
      phone: `=== COLD CALL SCRIPT ===

🎯 OPENING (Pattern Interrupt - 15-20 seconds):
"Hi ${requestBody?.lead?.owner_name || '[Owner Name]'}, this is [Your Name] from {YOUR_AGENCY_NAME}. I know this is a cold call, so I'll be quick. I'm calling because I specialize in helping ${requestBody?.lead?.niche_name || 'businesses'} solve a really common problem - turning marketing spend into predictable customer acquisition. I thought my systematic approach might be valuable for ${requestBody?.lead?.business_name || '[Business Name]'}. Do you have 90 seconds for me to explain?"

📈 VALUE PROPOSITION (If they say yes):
"Most ${requestBody?.lead?.niche_name || 'business'} owners I talk to are frustrated because their marketing feels like gambling - you spend money but you're never sure what's going to work. What I do is turn marketing into a predictable profit center using a systematic, data-driven approach that eliminates waste and focuses on profitable growth."

💥 METHODOLOGY/POSITIONING:
"I specialize specifically in ${requestBody?.lead?.niche_name || 'businesses like yours'} and have developed a systematic methodology that focuses on sustainable growth. My approach is based on proven frameworks and I also have access to very limited per-person AI software that uses artificial intelligence to optimize customer acquisition - this technology isn't widely available to most agencies. I work with ${requestBody?.lead?.niche_name || 'business'} owners who are serious about building systematic customer acquisition processes."

🎯 QUALIFYING QUESTION:
"Quick question - what's your biggest challenge right now when it comes to getting new customers consistently?"

⚡ OBJECTION HANDLING:

"Not interested":
→ "I totally get that. Most successful business owners are skeptical of marketing pitches. But here's the thing - this isn't about pitching services, it's about sharing a systematic approach that could eliminate the guesswork from your customer acquisition. Would that be worth 15 minutes?"

"Too busy":
→ "That's exactly why this approach works so well. You're busy running your business, not learning marketing. The system I've developed handles customer acquisition systematically so you can focus on what you do best - running your business."

"Already have marketing":
→ "That's great! What kind of results are you getting? [Listen] Here's the thing - if your marketing doesn't feel predictable and systematic, there might be room for improvement. Mind if I ask what your biggest challenge is with your current approach?"

"No budget":
→ "I understand budget is always a consideration. But here's what I've learned: it's not about finding money for marketing, it's about making marketing pay for itself. The system I'm talking about typically pays for itself within the first month. Would it be worth exploring if it cost you nothing to test?"

"Send me information":
→ "I could do that, but honestly, most people who say that never look at it. Plus, this is really about whether it's a fit for your specific situation. How about this - let me ask you three quick questions, and if it sounds like it could work for you, we'll schedule 15 minutes to dig deeper. Sound fair?"

🎯 ASSUMPTIVE CLOSE:
"Based on what you've told me, this could be exactly what ${requestBody?.lead?.business_name || 'your business'} needs. I have time Thursday at 2pm or Friday at 10am for a 15-minute call where I can show you exactly how this would work for your business. Which works better for you?"

🆘 EMERGENCY OBJECTION BREAKERS:
"Really not interested":
→ "No problem at all. Mind if I ask what would need to happen for you to be interested in making your customer acquisition more predictable and profitable?"

"Call me back later":
→ "I'll be honest with you - I'm pretty selective about who I work with, and I may not have availability later. But I can send you a quick overview of the systematic approach I mentioned. What's your email?"

📞 FINAL CLOSE:
"How about this - let me send you an overview of the customer acquisition framework that's working well for ${requestBody?.lead?.niche_name || 'businesses'} right now, and if it looks interesting, we can hop on a quick call. What's the best email for that?"`,

      linkedin: `Hi ${requestBody?.lead?.owner_name || '[Name]'},

I noticed ${requestBody?.lead?.business_name || 'your company'} while researching successful ${requestBody?.lead?.niche_name || 'businesses'} and was impressed by what you've built.

I'm reaching out because I specialize in helping ${requestBody?.lead?.niche_name || 'businesses'} solve a pretty common challenge - turning marketing from an expense into a predictable profit center.

${requestBody?.lead?.niche_name ? `Most ${requestBody.lead.niche_name} businesses struggle with the same challenge - marketing that feels unpredictable and expensive. ` : ''}My systematic approach focuses on eliminating waste and creating consistent, profitable customer acquisition. I also have access to very limited per-person AI software that uses artificial intelligence to achieve superior results - this technology isn't widely available, which gives my clients a significant competitive advantage.

I only work with a handful of businesses each quarter, but I'd love to share how this methodology could work for ${requestBody?.lead?.business_name || 'your business'}. 

Worth a brief conversation?

Best,
{YOUR_AGENCY_NAME}

P.S. Even if we don't end up working together, I can share insights about what's working in customer acquisition right now.`,

      instagram: `Hey ${requestBody?.lead?.owner_name || 'there'}! 👋

Love what you're doing with ${requestBody?.lead?.business_name || 'your brand'}! ${requestBody?.lead?.instagram_handle ? `Your content is really engaging` : 'Your business looks amazing'}.

I specialize in helping ${requestBody?.lead?.niche_name || 'businesses'} turn their marketing into a predictable profit center using systematic customer acquisition strategies and limited-access AI technology.

${requestBody?.lead?.niche_name ? `The approach is specifically designed for ${requestBody.lead.niche_name} businesses and focuses on sustainable, profitable growth.` : ''} I have access to very limited per-person AI software that achieves superior results - this technology isn't widely available to most agencies.

Would love to share how this methodology could work for you! Worth a quick chat? 🚀

{YOUR_AGENCY_NAME}`,

      facebook: `Hi ${requestBody?.lead?.owner_name || 'there'},

I came across ${requestBody?.lead?.business_name || 'your business page'} and was really impressed by what you've built.

I'm reaching out because I specialize in helping ${requestBody?.lead?.niche_name || 'businesses'} turn their marketing into a predictable profit center using systematic customer acquisition strategies and limited-access AI technology.

${requestBody?.lead?.niche_name ? `Most ${requestBody.lead.niche_name} businesses struggle with inconsistent sales, but ` : ''}my approach focuses on eliminating waste and creating sustainable, profitable growth. I have access to very limited per-person AI software that achieves superior results - this technology isn't widely available to most agencies.

Would love to chat about how this methodology could help ${requestBody?.lead?.business_name || 'your business'} grow!

{YOUR_AGENCY_NAME}`,

      sms: `Hi ${requestBody?.lead?.owner_name || '[Name]'}, I help ${requestBody?.lead?.niche_name || 'businesses'} turn marketing into predictable profit using systematic customer acquisition. Think this approach could work for ${requestBody?.lead?.business_name || 'you'}? Worth a chat? - {YOUR_AGENCY_NAME}`,

      twitter: `Hey ${requestBody?.lead?.owner_name || 'there'}! 👋

Saw ${requestBody?.lead?.business_name || 'your account'} and loved your insights. I specialize in helping ${requestBody?.lead?.niche_name || 'businesses'} turn marketing into predictable profit using limited-access AI technology.

Worth a quick chat about systematic customer acquisition? 🚀

- {YOUR_AGENCY_NAME}`,

      x: `Hey ${requestBody?.lead?.owner_name || 'there'}! 👋

Saw ${requestBody?.lead?.business_name || 'your account'} and loved your insights. I specialize in helping ${requestBody?.lead?.niche_name || 'businesses'} turn marketing into predictable profit using limited-access AI technology.

Worth a quick chat about systematic customer acquisition? 🚀

- {YOUR_AGENCY_NAME}`
    }

    const fallback = enhancedFallbacks[requestBody?.messageType as keyof typeof enhancedFallbacks] || enhancedFallbacks.email
    
    // Still track usage even for fallbacks to prevent abuse
    if (requestBody?.lead && requestBody?.messageType && requestBody?.userId) {
      const leadId = requestBody.lead.id || `${requestBody.lead.business_name}_${requestBody.lead.email || requestBody.lead.phone || 'unknown'}`
      await trackUsage(requestBody.userId, leadId, requestBody.messageType, 0.001) // Lower cost for fallback
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

    if (error) {
      console.error('❌ Error getting usage count:', error)
      // If table doesn't exist or other DB error, return 0 to allow operation
      return 0
    }
    return data?.length || 0
  } catch (error) {
    console.error('❌ Error getting usage count:', error)
    return 0
  }
} 