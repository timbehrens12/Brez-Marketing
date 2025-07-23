import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

// Enhanced product analysis that mimics ChatGPT's approach
async function analyzeProductWithVision(imageUrl: string, userPrompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert product photographer and creative director. Analyze this product image in extreme detail and create a comprehensive prompt for DALL-E 3 that will generate a professional ad creative.

The user wants: "${userPrompt}"

Please provide a detailed DALL-E prompt that includes:
1. EXACT product description (colors, text, logos, design elements, materials, fit, style)
2. The specific styling/scene requested by the user
3. Professional photography techniques (lighting, angles, composition)
4. High-end commercial photography specifications

Make the prompt incredibly specific so DALL-E can recreate this EXACT product with the requested styling. Focus on preserving all brand elements, text, logos, and design details while applying the new creative direction.

Respond with ONLY the enhanced DALL-E prompt - no explanations or additional text.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Vision analysis error:', error)
    throw new Error('Failed to analyze product image')
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      prompt, 
      brandId, 
      productImageUrl,
      inspirationImages,
      stylePreferences,
      sessionId 
    } = await req.json()

    if (!prompt || !brandId) {
      return NextResponse.json(
        { error: 'Prompt and brandId are required' },
        { status: 400 }
      )
    }

    let enhancedPrompt = prompt

    // If product image is provided, use GPT-4 Vision to analyze and enhance the prompt
    if (productImageUrl) {
      console.log('Analyzing product image with GPT-4 Vision...')
      enhancedPrompt = await analyzeProductWithVision(productImageUrl, prompt)
      console.log('Enhanced prompt:', enhancedPrompt)
    }

    // Generate image with DALL-E 3 using the enhanced prompt
    console.log('Generating image with DALL-E 3...')
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      size: "1024x1024",
      quality: "hd",
      n: 1,
    })

    const imageUrl = imageResponse.data[0]?.url
    if (!imageUrl) {
      throw new Error('Failed to generate image')
    }

    // Calculate cost (approximate)
    const totalCost = 0.040 // DALL-E 3 HD cost
    const tokensUsed = Math.ceil(enhancedPrompt.length / 4) // Rough token estimate

    // Save to database
    const { data: creative, error: dbError } = await supabase
      .from('creative_assets')
      .insert({
        user_id: user.id,
        brand_id: brandId,
        prompt: prompt, // Original prompt
        enhanced_prompt: enhancedPrompt, // Store the enhanced version too
        image_url: imageUrl,
        product_image_url: productImageUrl,
        inspiration_images: inspirationImages || [],
        style_preferences: stylePreferences || {},
        model_used: 'dall-e-3-hd',
        generation_cost: totalCost,
        tokens_used: tokensUsed,
        session_id: sessionId,
        status: 'completed'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to save creative asset')
    }

    return NextResponse.json({
      success: true,
      creative: {
        id: creative.id,
        imageUrl: imageUrl,
        prompt: prompt,
        enhancedPrompt: enhancedPrompt,
        cost: totalCost,
        tokensUsed: tokensUsed
      }
    })

  } catch (error: any) {
    console.error('Creative generation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate creative',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json(
        { error: 'brandId is required' },
        { status: 400 }
      )
    }

    const { data: creatives, error } = await supabase
      .from('creative_assets')
      .select('*')
      .eq('user_id', user.id)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Fetch creatives error:', error)
      throw error
    }

    return NextResponse.json({ creatives })

  } catch (error: any) {
    console.error('Fetch creative assets error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch creative assets',
        details: error.message 
      },
      { status: 500 }
    )
  }
} 