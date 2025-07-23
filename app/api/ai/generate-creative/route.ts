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

    // Enhance the prompt with style preferences and context
    let enhancedPrompt = prompt
    if (stylePreferences) {
      const { colorScheme, style, format } = stylePreferences
      if (colorScheme) enhancedPrompt += ` Color scheme: ${colorScheme}.`
      if (style) enhancedPrompt += ` Style: ${style}.`
      if (format) enhancedPrompt += ` Format: ${format}.`
    }

    // First, create a pending record in the database
    const { data: creativeAsset, error: dbError } = await supabase
      .from('creative_assets')
      .insert({
        brand_id: brandId,
        user_id: user.id,
        prompt: prompt,
        image_url: '', // Will be updated after generation
        status: 'generating',
        product_image_url: productImageUrl,
        inspiration_images: inspirationImages || [],
        style_preferences: stylePreferences || {},
        model_used: 'gpt-4o'
      })
      .select()
      .single()

    if (dbError) {
      throw dbError
    }

    try {
      // Generate the image using GPT-4o
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url"
      })

      const imageUrl = response.data[0].url
      if (!imageUrl) {
        throw new Error('No image URL returned from OpenAI')
      }

      // Calculate approximate cost
      const inputTokens = Math.ceil(enhancedPrompt.length / 4) // Rough estimate
      const tokenCost = (inputTokens * 5) / 1_000_000 // $5 per million input tokens
      const imageCost = 0.03 // $0.03 per image
      const totalCost = tokenCost + imageCost

      // Update the database with the generated image
      const { data: updatedAsset, error: updateError } = await supabase
        .from('creative_assets')
        .update({
          image_url: imageUrl,
          thumbnail_url: imageUrl, // Same as image_url for now
          status: 'completed',
          generation_cost: totalCost,
          tokens_used: inputTokens
        })
        .eq('id', creativeAsset.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        data: updatedAsset
      })
    } catch (generationError: any) {
      // Update the database with error status
      await supabase
        .from('creative_assets')
        .update({
          status: 'failed',
          error_message: generationError.message || 'Failed to generate image'
        })
        .eq('id', creativeAsset.id)

      throw generationError
    }
  } catch (error: any) {
    console.error('Creative generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate creative' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch creative assets
export async function GET(req: Request) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const brandId = searchParams.get('brandId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!brandId) {
      return NextResponse.json(
        { error: 'brandId is required' },
        { status: 400 }
      )
    }

    const { data: assets, error, count } = await supabase
      .from('creative_assets')
      .select('*', { count: 'exact' })
      .eq('brand_id', brandId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: assets,
      count: count || 0
    })
  } catch (error: any) {
    console.error('Fetch creative assets error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch creative assets' },
      { status: 500 }
    )
  }
} 