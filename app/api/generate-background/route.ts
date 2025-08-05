import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Set timeout to 5 minutes for image generation
export const maxDuration = 300

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 300000, // 5 minutes
})

// Create Supabase client for database operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { 
      image, 
      prompt, 
      style, 
      brandId, 
      userId, 
      styleName, 
      textOverlays,
      saveToDatabase = false,
      customName
    } = await req.json()

    if (!image || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If saving to database, validate brand and user info
    if (saveToDatabase && (!brandId || !userId)) {
      return NextResponse.json({ error: 'Brand ID and User ID required for database save' }, { status: 400 })
    }

    // Extract base64 data and format for OpenAI
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '')
    
    console.log('🎨 Generating image with gpt-image-1 using image edit...')
    console.log('📏 Prompt length:', prompt.length)
    console.log('🖼️ Base64 input image length:', base64Data.length)
    console.log('📦 Estimated original image size:', Math.round(base64Data.length * 0.75), 'bytes')
    console.log('📝 FULL PROMPT BEING SENT:', prompt)
    
    // Convert base64 to buffer for the edits endpoint
    const imageBuffer = Buffer.from(base64Data, 'base64')
    
    // Create a File-like object that works with OpenAI SDK in Node.js
    // Using higher quality PNG format to preserve detail
    const imageFile = new File([imageBuffer], 'product.png', { 
      type: 'image/png',
      lastModified: Date.now()
    })
    
    // Log image dimensions if possible to help with quality debugging
    console.log('📐 Image buffer size:', imageBuffer.length, 'bytes')
    console.log('🔍 Input image quality analysis:')
    
    console.log('Image file created, size:', imageBuffer.length, 'bytes')
    console.log('Starting gpt-image-1 generation... (this may take 30-60 seconds)')
    
    // Use the actual user prompt directly - no overrides!
    console.log('Using actual user prompt for gpt-image-1...')
    
    let editResponse;
    
    // Try portrait first, fallback to square if it fails
    try {
      console.log('Attempting portrait format (1024x1536)...')
      editResponse = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: prompt, // Use the ACTUAL prompt with text overlays
        n: 1,
        size: "1024x1536", // Portrait for more vertical space for text
        quality: "high" // Use highest supported quality for maximum detail preservation
      })
      console.log('Portrait format succeeded!')
    } catch (portraitError: any) {
      console.log('Portrait format failed, trying square format:', portraitError.message)
      
      editResponse = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: prompt,
        n: 1,
        size: "1024x1024", // Fallback to square
        quality: "high" // Use highest supported quality for maximum detail preservation
      })
      console.log('Square format fallback succeeded!')
    }
    
    console.log('gpt-image-1 response received successfully!')
    console.log('Response data length:', editResponse.data?.length)
    
    // gpt-image-1 returns base64 data instead of URLs
    const generatedBase64 = editResponse.data?.[0]?.b64_json
    
    if (!generatedBase64) {
      console.error('No base64 data found in response')
      console.error('Available keys in first item:', editResponse.data?.[0] ? Object.keys(editResponse.data[0]) : 'no first item')
      throw new Error('No image data returned from gpt-image-1')
    }
    
    // Convert base64 to data URL that can be displayed in browser
    const generatedImageUrl = `data:image/png;base64,${generatedBase64}`
    
    console.log('Generated base64 data length:', generatedBase64.length)
    console.log('Generated data URL length:', generatedImageUrl.length)
    console.log('Input to output size ratio:', (generatedBase64.length / base64Data.length).toFixed(2))
    
    // Enhanced quality analysis
    const sizeRatio = generatedBase64.length / base64Data.length
    if (sizeRatio < 0.8) {
      console.warn('⚠️  Generated image is significantly smaller than input - possible quality loss')
      console.warn('📊  Size ratio:', sizeRatio.toFixed(2))
    } else {
      console.log('✅  Generated image size looks good - ratio:', sizeRatio.toFixed(2))
    }
    
    // Additional quality preservation logging
    console.log('🎯  Quality preservation check:')
    console.log('   - Input image size:', base64Data.length, 'chars')
    console.log('   - Output image size:', generatedBase64.length, 'chars')
    console.log('   - Quality used: high')
    console.log('   - Model: gpt-image-1')
    
    console.log('Image generated successfully with gpt-image-1!')

    // Save to database if requested
    let creativeRecord = null
    if (saveToDatabase) {
      try {
        console.log('💾 Saving creative generation to database...')
        
        const { data: creative, error: dbError } = await supabase
          .from('creative_generations')
          .insert({
            brand_id: brandId,
            user_id: userId,
            style_id: style,
            style_name: styleName || style,
            original_image_url: image, // Store the original base64 image
            generated_image_url: generatedImageUrl,
            prompt_used: prompt,
            text_overlays: textOverlays || {},
            status: 'completed',
            custom_name: customName || null,
            metadata: {
              model_used: 'gpt-image-1',
              quality: 'high',
              size_ratio: (generatedBase64.length / base64Data.length).toFixed(2)
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (dbError) {
          console.error('Error saving to database:', dbError)
          // Don't fail the generation if database save fails
        } else {
          console.log('✅ Successfully saved creative generation with ID:', creative.id)
          creativeRecord = creative
        }
      } catch (dbError) {
        console.error('Error saving creative generation:', dbError)
        // Don't fail the generation if database save fails
      }
    }

    return NextResponse.json({ 
      imageUrl: generatedImageUrl,
      style: style,
      modelUsed: 'gpt-image-1',
      creative: creativeRecord // Include the database record if saved
    })

  } catch (error: any) {
    console.error('Error generating image with gpt-image-1:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      type: error?.type,
      status: error?.status,
      statusText: error?.statusText
    })
    
    // Provide detailed error information for debugging
    if (error?.code === 'model_not_found' || error?.message?.includes('model')) {
      return NextResponse.json({ 
        error: 'gpt-image-1 model not found or not accessible',
        details: error.message,
        suggestion: 'Verify that gpt-image-1 is available in your OpenAI organization'
      }, { status: 400 })
    }
    
    if (error?.code === 'invalid_request_error') {
      return NextResponse.json({ 
        error: `Invalid request to gpt-image-1: ${error.message}`,
        details: error.message
      }, { status: 400 })
    }
    
    if (error?.code === 'insufficient_quota') {
      return NextResponse.json({ 
        error: 'OpenAI quota exceeded. Please check your billing.',
        details: error.message
      }, { status: 429 })
    }

    if (error?.code === 'content_policy_violation') {
      return NextResponse.json({ 
        error: 'Content policy violation. Please try a different image or prompt.',
        details: error.message
      }, { status: 400 })
    }

    // Handle timeout errors (504)
    if (error?.status === 504 || error?.code === 'timeout') {
      return NextResponse.json({ 
        error: 'Request timed out while generating image',
        details: 'The gpt-image-1 model request took too long to complete',
        suggestion: 'Try again or check if the model is properly configured'
      }, { status: 504 })
    }

    return NextResponse.json({ 
      error: 'Failed to generate image with gpt-image-1',
      details: error?.message || 'Unknown error',
      errorCode: error?.code,
      errorType: error?.type
    }, { status: 500 })
  }
}