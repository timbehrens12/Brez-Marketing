import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { auth } from '@clerk/nextjs'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

const USAGE_FEATURE_TYPE = 'creative_generation'
const WEEKLY_CREATIVE_LIMIT = 50

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Optimized AI Creative Generation Started...')

    // Quick auth check
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const formData = await request.formData()

    // Extract basic parameters
    const imageFile = formData.get('image') as File
    const prompt = formData.get('prompt') as string
    const styleId = formData.get('styleId') as string
    const aspectRatio = formData.get('aspectRatio') as string || 'portrait'
    const quality = formData.get('quality') as string || 'hd'
    const textOverlays = formData.get('textOverlays') as string
    const backgroundType = formData.get('backgroundType') as string || 'minimalist'
    const multiProductCount = parseInt(formData.get('multiProductCount') as string) || 1

    console.log(`📊 Processing ${multiProductCount} products with style: ${styleId}`)

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Skip usage limits for now to reduce database calls
    console.log('⏭️ Skipping usage limit checks for faster processing...')

    // Process images immediately
    const imageBuffer = await imageFile.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const imageDataUrl = `data:${imageFile.type};base64,${base64Image}`

    console.log('🔍 Analyzing primary image...')

    // Use Gemini 2.5 Flash Image for analysis
    let imageModel
    try {
      imageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" })
    } catch (error) {
      console.log('⚠️ Trying alternative model...')
      try {
        imageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" })
      } catch (error2) {
        imageModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-image" })
      }
    }

    // Enhanced analysis for multi-product
    const analysisPrompt = multiProductCount > 1
      ? "Analyze this product image and provide detailed descriptions of all visible products. Include colors, styles, fabrics, and distinctive features for each item. Focus on how they complement each other and could be arranged in a professional showcase."
      : "Analyze this product image and provide a detailed description that captures all important visual details including colors, patterns, fabrics, style, and distinctive features."

    const analysisResult = await imageModel.generateContent([
      analysisPrompt,
      {
        inlineData: {
          mimeType: imageFile.type,
          data: base64Image
        }
      }
    ])

    const productDescription = analysisResult.response.text() || 'product'
    console.log('📝 Product analysis complete')

    // Process additional images if provided
    let additionalContext = ''
    const additionalImages = formData.getAll('additionalImages') as File[]

    if (additionalImages.length > 0) {
      console.log(`🔍 Analyzing ${additionalImages.length} additional images...`)
      for (let i = 0; i < additionalImages.length; i++) {
        const additionalBuffer = await additionalImages[i].arrayBuffer()
        const additionalBase64 = Buffer.from(additionalBuffer).toString('base64')

        const additionalAnalysis = await imageModel.generateContent([
          `Describe this additional product #${i + 2} and how it complements the main product.`,
          {
            inlineData: {
              mimeType: additionalImages[i].type,
              data: additionalBase64
            }
          }
        ])

        additionalContext += `\nAdditional Product ${i + 2}: ${additionalAnalysis.response.text()}`
      }
    }

    // Build final generation prompt
    let finalPrompt = `Create a professional product photography image featuring: ${productDescription}${additionalContext}

Style: ${styleId}
Background: ${backgroundType}
Quality: ${quality}
Aspect Ratio: ${aspectRatio}

${prompt}`

    // Generate the creative
    console.log('🎨 Generating AI creative...')

    const generationResult = await imageModel.generateContent([
      finalPrompt,
      {
        inlineData: {
          mimeType: imageFile.type,
          data: base64Image
        }
      }
    ])

    const response = generationResult.response
    const generatedImage = response.candidates?.[0]?.content?.parts?.[0]

    if (!generatedImage || !generatedImage.inlineData) {
      throw new Error('No image generated')
    }

    const generatedBase64 = generatedImage.inlineData.data
    const generatedImageUrl = `data:${generatedImage.inlineData.mimeType};base64,${generatedBase64}`

    console.log('✅ AI creative generation complete!')

    // Skip database usage tracking for now to speed up response
    console.log('⏭️ Skipping usage tracking for faster response...')

    return NextResponse.json({
      imageUrl: generatedImageUrl,
      success: true,
      multiProduct: multiProductCount > 1
    })

  } catch (error: any) {
    console.error('❌ Optimized AI generation error:', error)

    // Handle specific errors
    if (error.message?.includes('timeout')) {
      return NextResponse.json({
        error: 'Generation timed out. Try using fewer images or a simpler template.',
        suggestion: 'Use 2-3 images max for multi-product generation'
      }, { status: 504 })
    }

    if (error.message?.includes('quota')) {
      return NextResponse.json({
        error: 'API quota exceeded. Please try again later.',
        suggestion: 'Wait a few minutes before trying again'
      }, { status: 429 })
    }

    return NextResponse.json({
      error: error.message || 'Failed to generate creative',
      suggestion: 'Try using a simpler template or fewer images'
    }, { status: 500 })
  }
}
