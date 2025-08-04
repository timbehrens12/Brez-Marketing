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
    
    console.log('Attempting image generation with gpt-image-1 model...')
    
    let imageGenResponse;
    let usedModel = 'gpt-image-1';
    
    try {
      // First try with gpt-image-1 (your new verified model access)
      imageGenResponse = await openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "natural"
      })

      console.log('Successfully generated with gpt-image-1!')
      
    } catch (gptImageError: any) {
      console.log('gpt-image-1 failed, falling back to vision + DALL-E approach...')
      console.log('Error:', gptImageError.message)
      
      usedModel = 'dall-e-3';
      
      // Fallback: Use gpt-4o for description then DALL-E 3
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `I need you to help me create a new image. ${prompt}

Please describe exactly how this image should look, focusing on:
1. The exact placement and positioning of the product
2. The lighting and shadows
3. The background texture and details
4. The overall composition

Provide a detailed description for image generation.`
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
        max_tokens: 1000,
      })

      const imageDescription = response.choices[0]?.message?.content

      if (!imageDescription) {
        throw new Error('No description generated')
      }

      console.log('Generated description:', imageDescription)
      console.log('Now generating image with DALL-E 3...')

      // Use the description to generate with DALL-E 3
      imageGenResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: imageDescription,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "natural"
      })
    }

    const generatedImageUrl = imageGenResponse.data[0].url

    if (!generatedImageUrl) {
      throw new Error('No image URL returned from OpenAI')
    }

    console.log('Image generated successfully!')

    return NextResponse.json({ 
      imageUrl: generatedImageUrl,
      style: style,
      modelUsed: usedModel
    })

  } catch (error: any) {
    console.error('Error generating image:', error)
    
    // Provide more specific error messages
    if (error?.code === 'invalid_request_error') {
      return NextResponse.json({ 
        error: `Invalid request to OpenAI: ${error.message}` 
      }, { status: 400 })
    }
    
    if (error?.code === 'insufficient_quota') {
      return NextResponse.json({ 
        error: 'OpenAI quota exceeded. Please check your billing.' 
      }, { status: 429 })
    }

    if (error?.code === 'content_policy_violation') {
      return NextResponse.json({ 
        error: 'Content policy violation. Please try a different image or prompt.' 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Failed to generate image',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}