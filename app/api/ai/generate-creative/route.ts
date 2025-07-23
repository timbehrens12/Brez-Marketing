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

// Helper function to analyze product image with GPT-4 Vision
async function analyzeProductImage(imageUrl: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product image in detail for advertising creative generation. Describe the product's style, colors, materials, branding, shape, key features, and any text visible on the product. Focus on visual elements that would be important for creating marketing visuals. Be specific about colors (exact shades), textures, and design elements. Keep the description concise but comprehensive for AI image generation."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 300
    })

    return response.choices[0]?.message?.content || ""
  } catch (error) {
    console.error('Error analyzing product image:', error)
    return ""
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

    // Analyze product image if provided
    let productAnalysis = ""
    let enhancedPrompt = prompt

    if (productImageUrl) {
      console.log('Analyzing product image with GPT-4 Vision...')
      productAnalysis = await analyzeProductImage(productImageUrl)
      
      if (productAnalysis) {
        // Enhance the original prompt with product analysis
        enhancedPrompt = `Create an advertising creative featuring this specific product: ${productAnalysis}

Original creative brief: ${prompt}

Make sure to accurately represent the product's colors, style, and branding while incorporating the creative direction provided.`
      }
    }

    // Further enhance the prompt with style preferences and context
    if (stylePreferences) {
      const { colorScheme, style, format, audience, includeText } = stylePreferences
      
      let styleEnhancement = ""
      if (colorScheme && colorScheme !== 'vibrant') styleEnhancement += ` Color palette: ${colorScheme}.`
      if (style && style !== 'modern') styleEnhancement += ` Visual style: ${style}.`
      if (format && format !== 'square') styleEnhancement += ` Format: ${format} aspect ratio.`
      if (audience && audience !== 'general') styleEnhancement += ` Target audience: ${audience}.`
      if (!includeText) styleEnhancement += ` No text overlay required.`
      
      if (styleEnhancement) {
        enhancedPrompt += styleEnhancement
      }
    }

    // Add professional photography direction
    enhancedPrompt += " Professional advertising photography, high quality, studio lighting, commercial grade."

    console.log('Enhanced prompt:', enhancedPrompt)

    // First, create a pending record in the database
    const { data: creativeAsset, error: dbError } = await supabase
      .from('creative_assets')
      .insert({
        brand_id: brandId,
        user_id: user.id,
        prompt: prompt, // Store original prompt
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
      // Generate the image using DALL-E 3 with enhanced prompt
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
      const visionTokens = productAnalysis ? 85 : 0 // Approximate tokens for vision analysis
      const inputTokens = Math.ceil(enhancedPrompt.length / 4) + visionTokens
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
          tokens_used: inputTokens,
          // Store the enhanced prompt and analysis for reference
          style_preferences: {
            ...stylePreferences,
            enhanced_prompt: enhancedPrompt,
            product_analysis: productAnalysis
          }
        })
        .eq('id', creativeAsset.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        data: updatedAsset,
        debug: {
          originalPrompt: prompt,
          enhancedPrompt: enhancedPrompt,
          productAnalysis: productAnalysis,
          tokensUsed: inputTokens,
          cost: totalCost
        }
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

// GET endpoint to fetch creative assets (unchanged)
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