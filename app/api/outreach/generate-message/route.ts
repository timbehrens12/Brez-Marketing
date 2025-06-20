import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('AI Generate message API called')
    
    const { userId } = auth()
    console.log('User ID:', userId)
    
    if (!userId) {
      console.log('No user ID found, returning unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const { lead, messageType, brandInfo, campaign_context, ai_instructions } = body

    if (!lead || !messageType) {
      console.log('Missing required fields:', { lead: !!lead, messageType })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    const systemPrompt = `You are an expert sales copywriter and digital marketing strategist. Your job is to create highly personalized, effective outreach messages that convert cold leads into interested prospects.

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

UNIQUE VALUE PROPOSITION: You have access to proprietary AI marketing software that most agencies don't have access to. This gives you an unfair advantage in delivering results.`

    const userPrompt = `Create a ${messageType} outreach message for this prospect:

${leadContext}

${brandContext}

${campaignContext}

${instructionsContext}

${methodPrompt}

Important: 
1. Make this message feel personally crafted for this specific business
2. Reference their industry, location, or other relevant details
3. Do NOT use generic templates
4. ALWAYS emphasize the exclusive, limited-access AI software advantage
5. Position this as an opportunity they won't get from other marketers
6. Highlight superior results through AI optimization without sounding robotic
7. Make the AI technology sound exclusive and powerful, but keep the tone human`

    console.log('Calling OpenAI with personalized prompt...')

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
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
      max_tokens: 800,
      temperature: 0.7,
    })

    const aiResponse = completion.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    console.log('AI Response length:', aiResponse.length)

    // Parse response to extract subject and message for emails
    let subject = ''
    let message = aiResponse

    if (messageType === 'email' && aiResponse.includes('Subject:')) {
      const lines = aiResponse.split('\n')
      const subjectLine = lines.find(line => line.toLowerCase().includes('subject:'))
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

    console.log('Sending AI-generated response')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error generating AI message:', error)
    
    // Fallback to a simple personalized template if AI fails
    const body = await request.json()
    const fallbackMessage = `Hi ${body?.lead?.owner_name || 'there'},

I noticed ${body?.lead?.business_name || 'your business'} and wanted to reach out with a quick question.

Would you be interested in seeing how other ${body?.lead?.niche_name || 'businesses'} in ${body?.lead?.city || 'your area'} are using AI-powered marketing to improve their results?

Best regards,
${body?.brandInfo?.name || 'Your Marketing Team'}`

    return NextResponse.json({ 
      message: fallbackMessage,
      subject: body?.messageType === 'email' ? `Quick question about ${body?.lead?.business_name || 'your business'}` : undefined,
      ai_generated: false,
      error: 'AI generation failed, using fallback template'
    })
  }
} 