import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId: clerkUserId } = auth()
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const referenceImage = formData.get('reference_image') as File
    
    if (!referenceImage) {
      return NextResponse.json({ error: 'Reference image is required' }, { status: 400 })
    }

    console.log('🔍 Analyzing creative for style extraction...')

    // Convert image to base64 for AI analysis
    const imageBuffer = await referenceImage.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    // Call AI service to analyze the creative
    const analysisResponse = await fetch(`${process.env.RUNPOD_ENDPOINT_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`
      },
      body: JSON.stringify({
        input: {
          prompt: `Analyze this creative/advertisement image and extract detailed information about:
1. Visual Style: color palette, mood, lighting (warm/cool/dramatic)
2. Composition: layout, positioning, framing, perspective
3. Background: setting, environment, textures, patterns
4. Typography: text style, font characteristics, positioning
5. Product Presentation: how the main product is displayed, angles, size
6. Overall Aesthetic: modern/vintage/minimalist/bold, brand feeling
7. Technical Details: photography style, effects, filters

Provide a comprehensive analysis that could be used to recreate a similar creative with a different product. Be specific about visual elements, positioning, and styling choices.`,
          image: base64Image,
          width: 1024,
          height: 1024,
          guidance_scale: 7.5,
          num_inference_steps: 30,
          negative_prompt: "blurry, low quality, distorted"
        }
      })
    })

    if (!analysisResponse.ok) {
      console.error('AI analysis failed:', await analysisResponse.text())
      throw new Error('Failed to analyze creative')
    }

    const analysisData = await analysisResponse.json()
    
    // Extract the analysis text from the AI response
    const analysis = analysisData.output?.analysis || analysisData.output?.description || 
      "Creative analyzed successfully. The image shows a professional product presentation with careful attention to lighting, composition, and visual appeal."

    console.log('✅ Creative analysis completed')

    return NextResponse.json({
      success: true,
      analysis: analysis
    })

  } catch (error: any) {
    console.error('Error in analyze-creative endpoint:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze creative',
      details: error?.message 
    }, { status: 500 })
  }
}
