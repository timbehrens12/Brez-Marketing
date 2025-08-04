import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Set timeout to 5 minutes for image generation
export const maxDuration = 300

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 300000, // 5 minutes
})

export async function POST(req: NextRequest) {
  try {
    const { image, prompt, style } = await req.json()

    if (!image || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Extract base64 data and format for OpenAI
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '')
    
    console.log('Generating image with gpt-image-1 using image edit...')
    console.log('Prompt length:', prompt.length)
    console.log('Base64 image length:', base64Data.length)
    
    // Convert base64 to buffer for the edits endpoint
    const imageBuffer = Buffer.from(base64Data, 'base64')
    
    // Create a File-like object that works with OpenAI SDK in Node.js
    const imageFile = new File([imageBuffer], 'product.png', { 
      type: 'image/png',
      lastModified: Date.now()
    })
    
    console.log('Image file created, size:', imageBuffer.length, 'bytes')
    console.log('Starting gpt-image-1 generation... (this may take 30-60 seconds)')
    
    const editResponse = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    })
    
    console.log('Raw gpt-image-1 response:', JSON.stringify(editResponse, null, 2))
    console.log('Response data:', editResponse.data)
    console.log('Data length:', editResponse.data?.length)
    console.log('First item:', editResponse.data?.[0])
    
    const generatedImageUrl = editResponse.data?.[0]?.url

    if (!generatedImageUrl) {
      console.error('No URL found in response structure')
      console.error('Full response object keys:', Object.keys(editResponse))
      console.error('Data object keys:', editResponse.data ? Object.keys(editResponse.data) : 'data is undefined')
      throw new Error(`No image URL returned from gpt-image-1. Response: ${JSON.stringify(editResponse)}`)
    }
    
    console.log('Image generated successfully with gpt-image-1!')

    return NextResponse.json({ 
      imageUrl: generatedImageUrl,
      style: style,
      modelUsed: 'gpt-image-1'
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