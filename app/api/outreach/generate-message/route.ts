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
- Have a clear call-to-action
- Mention specific benefits relevant to their business type
- Include credibility indicators
Format as: Subject: [subject line]\n\n[email body]`,

      phone: `Create a complete phone call script for a cold outreach call. Include:
- Opening hook (15-20 seconds)
- Value proposition specific to their industry
- Credibility/social proof
- Clear call-to-action
- Objection handling for common responses
- Closing and next steps
Format as a structured call script with clear sections.`,

      linkedin: `Create a LinkedIn connection request message or InMail. Should be:
- 100-150 words maximum
- Professional but friendly
- Reference something specific about their business
- Include a soft call-to-action
- Mention mutual interests or industry insights`,

      instagram: `Create an Instagram DM that's:
- Casual but professional
- 50-100 words
- Reference their Instagram content if possible
- Offer value upfront
- Include a collaborative angle`,

      facebook: `Create a Facebook message that's:
- Friendly and approachable
- 75-125 words
- Reference their business page or recent posts
- Offer specific value
- Include a soft ask for connection`,

      sms: `Create a text message that's:
- 160 characters or less
- Direct and valuable
- Include a clear benefit
- Professional but conversational
- Include a simple next step`
    }

    const methodPrompt = methodPrompts[messageType as keyof typeof methodPrompts] || methodPrompts.email

    const systemPrompt = `You are an expert sales copywriter and digital marketing strategist. Your job is to create highly personalized, effective outreach messages that convert cold leads into interested prospects.

Key principles:
1. Always reference specific details about their business
2. Lead with value, not features
3. Show understanding of their industry challenges
4. Include social proof when relevant
5. Make the call-to-action clear and low-pressure
6. Write in a conversational, professional tone
7. Avoid generic language and obvious templates
8. Focus on outcomes they care about

You have access to detailed information about the lead and should use it to create a truly personalized message.`

    const userPrompt = `Create a ${messageType} outreach message for this prospect:

${leadContext}

${brandContext}

${campaignContext}

${instructionsContext}

${methodPrompt}

Important: Make this message feel personally crafted for this specific business. Reference their industry, location, or other relevant details. Do NOT use generic templates.`

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