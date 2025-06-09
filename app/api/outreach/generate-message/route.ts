import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { leadId, messageType, customInstructions } = body

    // Get lead details from database
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', userId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Generate personalized message using OpenAI
    const prompt = generateMessagePrompt(lead, messageType, customInstructions)

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert marketing copywriter specializing in outbound sales and lead generation. Create personalized, engaging messages that focus on the prospect's specific pain points and how Facebook/Instagram advertising can solve their problems. Keep the tone professional but friendly, and always include a clear call-to-action."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    const generatedContent = completion.choices[0].message.content

    // Parse the response to extract subject and message content
    let subject = ''
    let messageContent = generatedContent || ''

    if (messageType === 'email' && generatedContent) {
      const lines = generatedContent.split('\n')
      const subjectLine = lines.find(line => line.toLowerCase().includes('subject:'))
      if (subjectLine) {
        subject = subjectLine.replace(/subject:\s*/i, '').trim()
        messageContent = generatedContent.replace(subjectLine, '').trim()
      }
    }

    // Save the generated message to database
    const { data: message, error: messageError } = await supabase
      .from('outreach_messages')
      .insert({
        user_id: userId,
        brand_id: lead.brand_id,
        lead_id: leadId,
        message_type: messageType,
        subject: subject || undefined,
        message_content: messageContent,
        personalization_data: {
          business_name: lead.business_name,
          owner_name: lead.owner_name,
          niche_name: lead.niche_name,
          city: lead.city,
          pain_points: lead.pain_points,
          ai_insights: lead.ai_insights
        },
        status: 'draft',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error saving message:', messageError)
    }

    return NextResponse.json({
      subject,
      message_content: messageContent,
      message_id: message?.id,
      lead_info: {
        business_name: lead.business_name,
        owner_name: lead.owner_name,
        niche_name: lead.niche_name
      }
    })

  } catch (error) {
    console.error('Message generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    )
  }
}

function generateMessagePrompt(lead: any, messageType: string, customInstructions?: string) {
  const baseContext = `
Lead Information:
- Business Name: ${lead.business_name}
- Owner Name: ${lead.owner_name || 'Business Owner'}
- Niche: ${lead.niche_name}
- Business Type: ${lead.business_type}
- Location: ${lead.city ? `${lead.city}, ${lead.state_province}` : 'Online'}
- Website: ${lead.website || 'Not available'}
- Lead Score: ${lead.lead_score}/100
- Pain Points: ${Array.isArray(lead.pain_points) ? lead.pain_points.join(', ') : 'General marketing challenges'}
- AI Insights: ${lead.ai_insights || 'Potential for growth with targeted advertising'}
- Estimated Revenue: $${lead.estimated_revenue || '100,000-500,000'}
`

  const templates = {
    email: `${baseContext}

Create a personalized cold email for this prospect. The email should:
1. Start with "Subject: [compelling subject line]"
2. Address them by name and mention their business specifically
3. Reference their niche and location if relevant
4. Highlight 2-3 specific pain points they likely face
5. Explain how Facebook/Instagram ads can solve these problems
6. Include social proof or results from similar businesses
7. End with a soft call-to-action for a brief call
8. Keep it under 200 words
9. Use a professional but friendly tone
10. Include a P.S. with a specific benefit or quick win

${customInstructions ? `Additional instructions: ${customInstructions}` : ''}`,

    sms: `${baseContext}

Create a personalized SMS message for this prospect. The message should:
1. Be under 160 characters
2. Mention their business name
3. Reference their niche
4. Include a specific benefit (like "30-50% revenue increase")
5. End with a question to encourage response
6. Be casual but professional

${customInstructions ? `Additional instructions: ${customInstructions}` : ''}`,

    linkedin: `${baseContext}

Create a personalized LinkedIn connection request message or follow-up message. The message should:
1. Reference their business and niche specifically
2. Mention a specific achievement or what impressed you about their business
3. Briefly explain your expertise with similar businesses
4. Include a soft call-to-action
5. Keep it under 300 characters for connection requests, or under 500 words for follow-up
6. Be professional and relationship-focused

${customInstructions ? `Additional instructions: ${customInstructions}` : ''}`,

    call_script: `${baseContext}

Create a personalized cold call script for this prospect. The script should include:
1. **Opening**: Natural introduction with reason for calling
2. **Permission**: Ask if it's a good time to talk
3. **Purpose**: Briefly explain why you're calling
4. **Value Proposition**: Specific benefits for their business type/niche
5. **Discovery Questions**: 2-3 questions about their current marketing
6. **Objection Handling**: Common responses and how to address them
7. **Close**: Clear next step (usually scheduling a meeting)
8. Include natural conversation flow and transition phrases
9. Reference their specific business details throughout

${customInstructions ? `Additional instructions: ${customInstructions}` : ''}`
  }

  return templates[messageType as keyof typeof templates] || templates.email
} 