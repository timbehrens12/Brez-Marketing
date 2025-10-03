import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { aiUsageService } from '@/lib/services/ai-usage-service'

// Initialize OpenAI client only when needed to avoid build-time issues
const getOpenAIClient = () => {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

// Rate limiting - store user usage in memory (in production, use Redis or database)
const userUsage = new Map<string, { count: number, resetTime: number }>()
const DAILY_LIMIT = 10 // 10 smart responses per day
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Security: Filter out potentially harmful content
const containsHarmfulContent = (text: string): boolean => {
  const harmfulPatterns = [
    /\b(hack|exploit|bypass|inject|script|malware|virus)\b/i,
    /\b(kill|murder|suicide|death|violence)\b/i,
    /\b(illegal|drugs|weapons|bomb)\b/i,
    /<script|javascript:|data:|vbscript:/i,
    /\b(admin|root|password|token|key|secret)\b/i,
  ]
  
  return harmfulPatterns.some(pattern => pattern.test(text))
}

// Security: Clean and validate input
const sanitizeInput = (text: string): string => {
  if (!text || typeof text !== 'string') return ''
  
  // Remove HTML tags and scripts
  const cleaned = text
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .trim()
  
  // Limit length
  return cleaned.slice(0, 2000)
}

// Rate limiting check
const checkRateLimit = (userId: string): { allowed: boolean, remaining: number, resetTime: number } => {
  const now = Date.now()
  const userRecord = userUsage.get(userId)
  
  if (!userRecord || now > userRecord.resetTime) {
    // Reset or create new record
    const resetTime = now + RATE_LIMIT_WINDOW
    userUsage.set(userId, { count: 0, resetTime })
    return { allowed: true, remaining: DAILY_LIMIT - 1, resetTime }
  }
  
  if (userRecord.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0, resetTime: userRecord.resetTime }
  }
  
  return { allowed: true, remaining: DAILY_LIMIT - userRecord.count - 1, resetTime: userRecord.resetTime }
}

const incrementUsage = (userId: string) => {
  const userRecord = userUsage.get(userId)
  if (userRecord) {
    userRecord.count += 1
    userUsage.set(userId, userRecord)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { leadResponse, platform, leadInfo, userId, brandId } = await request.json()

    if (!leadResponse || !platform || !leadInfo || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Record AI usage (if brandId provided)
    if (brandId) {
      await aiUsageService.recordUsage(brandId, userId, 'smart_response', {
        platform,
        businessName: leadInfo.business_name,
        timestamp: new Date().toISOString()
      })
    }

    // Rate limiting check
    const rateLimitResult = checkRateLimit(userId)
    if (!rateLimitResult.allowed) {
      const hoursUntilReset = Math.ceil((rateLimitResult.resetTime - Date.now()) / (1000 * 60 * 60))
      return NextResponse.json({ 
        error: `Daily limit of ${DAILY_LIMIT} smart responses reached. Resets in ${hoursUntilReset} hours.`,
        rateLimited: true,
        resetTime: rateLimitResult.resetTime
      }, { status: 429 })
    }

    // Security checks
    const cleanResponse = sanitizeInput(leadResponse)
    if (!cleanResponse) {
      return NextResponse.json({ error: 'Invalid response content' }, { status: 400 })
    }

    if (containsHarmfulContent(cleanResponse)) {
      return NextResponse.json({ error: 'Content contains prohibited material' }, { status: 400 })
    }

    if (cleanResponse.length < 10) {
      return NextResponse.json({ error: 'Response too short - please provide more context' }, { status: 400 })
    }

    // Generate smart response
    const systemPrompt = `You are an expert sales professional specializing in digital marketing services. 
    Generate a professional, personalized response to a lead's message.

    IMPORTANT GUIDELINES:
    - Keep responses under 150 words
    - Be professional but friendly
    - Focus on their specific needs/concerns
    - Include a clear next step or call-to-action
    - Match the tone of their message
    - Never make false claims or promises
    - If they mention budget, acknowledge it respectfully
    - If they show interest, suggest a brief call
    - If they have concerns, address them directly

    Lead Information:
    - Business: ${leadInfo.business_name}
    - Industry: ${leadInfo.niche_name || 'Not specified'}
    - Platform: ${platform}
    - Owner: ${leadInfo.owner_name || 'Not specified'}

    Their Response: "${cleanResponse}"

    Generate a smart, personalized response that moves the conversation forward:`

    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // GPT-4o-mini - high-quality lead responses for conversion
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a response to: "${cleanResponse}"` }
      ],
      max_completion_tokens: 200,
      temperature: 0.7,
    })

    const smartResponse = completion.choices[0]?.message?.content?.trim()

    if (!smartResponse) {
      return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
    }

    // Final security check on generated content
    if (containsHarmfulContent(smartResponse)) {
      return NextResponse.json({ error: 'Unable to generate appropriate response' }, { status: 500 })
    }

    // Increment usage count after successful generation
    incrementUsage(userId)

    return NextResponse.json({ 
      smartResponse,
      platform,
      leadInfo: {
        business_name: leadInfo.business_name,
        niche_name: leadInfo.niche_name
      },
      remaining: rateLimitResult.remaining - 1
    })

  } catch (error) {
    console.error('Error generating smart response:', error)
    return NextResponse.json({ error: 'Failed to generate smart response' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Smart response endpoint' })
} 