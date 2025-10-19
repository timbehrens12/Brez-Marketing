import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { auth } from '@clerk/nextjs'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { objection } = await request.json()
    
    if (!objection || typeof objection !== 'string') {
      return NextResponse.json(
        { error: 'Objection text is required' },
        { status: 400 }
      )
    }

    // Generate response using OpenAI
    const systemPrompt = `You are an expert sales coach specializing in helping web design and digital marketing agencies sell custom-built websites with lead generation forms and management systems to local businesses.

Your role is to provide effective, empathetic, and persuasive responses to sales objections. When given an objection:

1. Acknowledge the concern genuinely
2. Reframe it as an opportunity or address the underlying fear
3. Provide specific value propositions related to custom websites with lead gen
4. Use social proof or statistics when relevant
5. End with a soft close or next step question

Key value propositions to emphasize:
- Custom websites convert 3-5x better than templates
- Lead gen forms capture potential customers 24/7
- Professional design builds trust and credibility
- Mobile-optimized sites reach customers anywhere
- Integrated lead management helps close more deals
- SEO optimization brings in organic traffic
- Analytics show exactly what's working

Keep responses conversational, confident, and around 3-4 sentences. Focus on ROI and how the investment pays for itself through increased leads and sales.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Prospect objection: "${objection}"\n\nProvide a persuasive response that addresses this objection for selling custom websites with lead generation to local businesses.` }
      ],
      temperature: 0.7,
      max_completion_tokens: 300
    })

    const response = completion.choices[0]?.message?.content?.trim()

    if (!response) {
      throw new Error('No response generated')
    }

    return NextResponse.json({
      success: true,
      response
    })

  } catch (error: any) {
    console.error('Error generating objection response:', error)
    
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded. Please contact support.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate response. Please try again.' },
      { status: 500 }
    )
  }
}

