import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { image, prompt, style } = await req.json()

    if (!image || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Extract base64 data and format for OpenAI
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '')
    
    console.log('Generating image with gpt-image-1 model ONLY...')
    console.log('Prompt length:', prompt.length)
    console.log('Base64 image length:', base64Data.length)
    
    // Try different approaches to send both image and prompt to gpt-image-1
    
    // Approach 1: Try to include the image in the prompt somehow
    try {
      console.log('Attempting approach 1: Enhanced prompt with image reference...')
      const imageGenResponse = await openai.images.generate({
        model: "gpt-image-1", 
        prompt: `${prompt}\n\nThe image to be modified is provided as context. Use the provided product image as the base for this transformation.`,
        n: 1,
        size: "1024x1024",
        quality: "high"
      })
      
      const generatedImageUrl = imageGenResponse.data[0]?.url
      if (generatedImageUrl) {
        console.log('Approach 1 successful!')
        return NextResponse.json({ 
          imageUrl: generatedImageUrl,
          style: style,
          modelUsed: 'gpt-image-1',
          approach: 'enhanced-prompt'
        })
      }
    } catch (approach1Error: any) {
      console.log('Approach 1 failed:', approach1Error.message)
    }
    
    // Approach 2: Try using image edits endpoint (if available for gpt-image-1)
    try {
      console.log('Attempting approach 2: Image edits endpoint...')
      
      // Convert base64 to buffer for the edits endpoint
      const imageBuffer = Buffer.from(base64Data, 'base64')
      
      // Create a File-like object that works with OpenAI SDK in Node.js
      const imageFile = new File([imageBuffer], 'product.png', { 
        type: 'image/png',
        lastModified: Date.now()
      })
      
      console.log('Image file created, size:', imageBuffer.length, 'bytes')
      
      const editResponse = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: prompt,
        n: 1,
        size: "1024x1024"
      })
      
      const generatedImageUrl = editResponse.data[0]?.url
      if (generatedImageUrl) {
        console.log('Approach 2 (image edit) successful!')
        return NextResponse.json({ 
          imageUrl: generatedImageUrl,
          style: style,
          modelUsed: 'gpt-image-1',
          approach: 'image-edit'
        })
      }
    } catch (approach2Error: any) {
      console.log('Approach 2 failed:', approach2Error.message)
      console.log('Full error:', approach2Error)
    }
    
    // Approach 3: Try using chat completions with multimodal capabilities
    try {
      console.log('Attempting approach 3: Chat completions with image generation...')
      
      const chatResponse = await openai.chat.completions.create({
        model: "gpt-4o", // Use gpt-4o which supports image understanding
        messages: [
          {
            role: "user",  
            content: [
              {
                type: "text",
                text: `${prompt}\n\nPlease generate a new image based on this request. I need you to create the exact scene described in the prompt using the product shown in the uploaded image.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      })
      
      const textResponse = chatResponse.choices[0]?.message?.content
      console.log('Chat response:', textResponse)
      
      // This approach might just return text, not generate an actual image
      // But let's see what happens and log it for debugging
      console.log('Approach 3 completed - check if it can generate images directly')
      
    } catch (approach3Error: any) {
      console.log('Approach 3 failed:', approach3Error.message)
    }
    
    // If all approaches fail, throw an error with details
    throw new Error('All approaches to use gpt-image-1 with input image failed')

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