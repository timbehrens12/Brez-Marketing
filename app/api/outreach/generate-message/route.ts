import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
Agency Name: ${brandInfo?.name || 'Digital Marketing Agency'}
Industry: ${brandInfo?.industry || 'Digital Marketing'}
Value Proposition: ${brandInfo?.value_prop || 'We help businesses grow through digital marketing'}

EXCLUSIVE ADVANTAGE: You have access to proprietary AI-powered marketing software that:
- Uses advanced computer intelligence to optimize campaigns 24/7
- Delivers results that traditional marketers and agencies cannot match
- Is available to only a limited number of marketers
- Provides an unfair competitive advantage in campaign performance
- Automatically optimizes targeting, budgets, and creatives using AI
- Predicts campaign performance before spending money
- Continuously learns and improves results beyond human capability
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

    const systemPrompt = `You are an expert sales copywriter. Create personalized outreach messages that convert cold leads.

You represent someone with exclusive AI-powered marketing software that delivers superior results. This AI technology gives an unfair competitive advantage.

Key principles:
1. Reference specific business details
2. Emphasize EXCLUSIVE ACCESS to AI marketing technology  
3. Show industry understanding
4. Clear, low-pressure call-to-action
5. Professional but conversational tone
6. Focus on results they care about`

    const userPrompt = `Create a ${messageType} outreach message for:

Business: ${lead.business_name}
Owner: ${lead.owner_name || 'Unknown'}
Industry: ${lead.niche_name || 'Unknown'}
Location: ${lead.city}, ${lead.state_province}
Website: ${lead.website || 'None'}

${methodPrompt}

Requirements:
- Personalize for their business and industry
- Emphasize exclusive AI marketing software advantage
- Professional but conversational tone
- Clear call-to-action`

    console.log('🤖 Calling OpenAI with personalized prompt...')
    console.log('📝 Prompt length:', userPrompt.length)

    // Create timeout controller
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 seconds

    let aiResponse: string | null | undefined
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: userPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      console.log('✅ OpenAI call successful')

      aiResponse = completion.choices[0]?.message?.content
    } catch (openaiError) {
      clearTimeout(timeoutId)
      console.error('❌ OpenAI API error:', openaiError)
      throw openaiError
    }

    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    console.log('✅ AI Response received, length:', aiResponse.length)

    // Parse response to extract subject and message for emails
    let subject = ''
    let message = aiResponse

    if (messageType === 'email' && aiResponse.includes('Subject:')) {
      const lines = aiResponse.split('\n')
      const subjectLine = lines.find((line: string) => line.toLowerCase().includes('subject:'))
      if (subjectLine) {
        subject = subjectLine.replace(/subject:\s*/i, '').trim()
        message = aiResponse.replace(/subject:.*?\n\n?/i, '').trim()
      }
    }
    
    const response = {
      message: message,
      subject: subject || undefined,
      ai_generated: true,
      personalization_score: 'high',
      tips: [
        "This message was AI-generated using your lead's specific data",
        "Review for accuracy and add any additional personal touches",
        "Consider timing and follow-up strategy",
        "Track response rates to optimize future messages"
      ]
    }

    console.log('✅ Sending AI-generated response')
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error generating AI message:', error)
    
    // Enhanced fallback with the original request data
    try {
      const fallbackData = requestBody || {}
      const { lead, messageType, brandInfo } = fallbackData
      
      const businessName = lead?.business_name || 'your business'
      const ownerName = lead?.owner_name || 'there'
      const industry = lead?.niche_name || 'industry'
      const location = lead?.city || 'your area'
      const brandName = brandInfo?.name || 'Your Marketing Team'

      let fallbackMessage = ''
      let fallbackSubject = ''

      if (messageType === 'email') {
        fallbackSubject = `Exclusive AI marketing software for ${businessName}`
        fallbackMessage = `Hi ${ownerName},

I came across ${businessName} and was impressed by your presence in the ${industry}.

I wanted to reach out because I have access to something most marketers don't - exclusive AI-powered marketing software that uses advanced computer intelligence to deliver results traditional agencies simply can't match.

This isn't your typical marketing approach. The AI technology I use:
• Optimizes campaigns 24/7 using machine learning
• Predicts performance before spending a dollar
• Delivers results other marketers in ${location} can't achieve
• Is available to only a limited number of professionals

The advantage is significant - while other marketers rely on guesswork, I use AI that continuously learns and improves your campaigns beyond human capability.

Would you be interested in a brief conversation about how this exclusive technology could specifically benefit ${businessName}?

Best regards,
${brandName}

P.S. This AI software isn't available to most agencies - it's part of what gives my clients an unfair competitive advantage.`
      } else if (messageType === 'phone') {
        fallbackMessage = `**OPENING:**
"Hi ${ownerName}, this is ${brandName}. I know you're busy with ${businessName}, so I'll be direct. I have access to exclusive AI marketing software that most agencies don't have access to, and it's delivering results that traditional marketers simply can't match. Do you have 30 seconds for me to explain?"

**VALUE PROP:**
"Great! So while most marketers in the ${industry} rely on guesswork and manual optimization, I use proprietary AI technology that works 24/7 to optimize campaigns using advanced computer intelligence. It's like having a world-class data scientist working around the clock, but it's actually AI that continuously learns and improves."

**CREDIBILITY:**
"The advantage is significant - this AI software predicts campaign performance before we spend money and automatically optimizes everything in real-time. It's only available to a limited number of marketers, which gives my clients an unfair competitive advantage."

**CLOSE:**
"I'd love to show you exactly how this exclusive AI technology would work for ${businessName}. Would you be open to a brief demo this week?"`
      } else {
        fallbackMessage = `Hi ${ownerName},

I noticed ${businessName} and wanted to reach out about something exclusive.

I have access to AI-powered marketing software that most marketers don't have - it uses advanced computer intelligence to deliver results traditional agencies can't match.

While other marketers in the ${industry} rely on guesswork, this AI optimizes campaigns 24/7 and predicts performance before spending money.

Interested in seeing how this exclusive technology could benefit ${businessName}?

Best,
${brandName}`
      }

      console.log('🔄 Using enhanced fallback template')
      return NextResponse.json({ 
        message: fallbackMessage,
        subject: fallbackSubject || undefined,
        ai_generated: false,
        error: error instanceof Error ? error.message : 'AI generation failed, using enhanced fallback template',
        fallback_reason: 'OpenAI unavailable or timed out'
      })
    } catch (fallbackError) {
      console.error('❌ Error creating fallback message:', fallbackError)
      return NextResponse.json({ 
        error: 'Failed to generate message',
        message: 'An error occurred while generating your outreach message. Please check your internet connection and try again.',
        ai_generated: false,
        fallback_reason: 'Complete system failure'
      }, { status: 500 })
    }
  }
} 