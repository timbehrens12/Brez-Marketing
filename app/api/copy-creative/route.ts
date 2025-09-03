import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import { Database } from '@/types/supabase'

// Create Supabase client with service role for server-side operations
const serviceSupabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// GET - Fetch copy creatives for a specific brand
export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = auth()
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const brandId = searchParams.get('brandId')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log('📋 Fetching copy creatives for brand:', brandId)

    const { data, error } = await serviceSupabase
      .from('copy_creatives')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', clerkUserId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching copy creatives:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch copy creatives',
        details: error?.message 
      }, { status: 500 })
    }

    console.log('✅ Successfully fetched', data?.length || 0, 'copy creatives')
    return NextResponse.json({ creatives: data || [] })

  } catch (error: any) {
    console.error('Error in GET /api/copy-creative:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message 
    }, { status: 500 })
  }
}

// POST - Create a new copy creative
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = auth()
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const referenceImage = formData.get('reference_image') as File
    const productImage = formData.get('product_image') as File
    const brandId = formData.get('brand_id') as string
    const customModifications = formData.get('custom_modifications') as string || ''
    const styleAnalysis = formData.get('style_analysis') as string || ''

    if (!referenceImage || !productImage || !brandId) {
      return NextResponse.json({ 
        error: 'Reference image, product image, and brand ID are required' 
      }, { status: 400 })
    }

    console.log('🎨 Creating copy creative for brand:', brandId)

    // Upload reference image to storage
    const referenceImageBuffer = await referenceImage.arrayBuffer()
    const referenceImageBase64 = Buffer.from(referenceImageBuffer).toString('base64')
    
    // Upload product image to storage
    const productImageBuffer = await productImage.arrayBuffer()
    const productImageBase64 = Buffer.from(productImageBuffer).toString('base64')

    // Store in database first
    const { data: copyCreative, error: dbError } = await serviceSupabase
      .from('copy_creatives')
      .insert({
        brand_id: brandId,
        user_id: clerkUserId,
        reference_image_url: `data:image/jpeg;base64,${referenceImageBase64}`,
        product_image_url: `data:image/jpeg;base64,${productImageBase64}`,
        generated_image_url: '',
        style_analysis: styleAnalysis,
        custom_modifications: customModifications,
        status: 'generating',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error creating copy creative record:', dbError)
      return NextResponse.json({ error: 'Failed to create copy creative' }, { status: 500 })
    }

    console.log('✅ Copy creative record created with ID:', copyCreative.id)

    // Generate the copy creative using AI
    try {
      // Build the comprehensive prompt
      let generationPrompt = `Create a high-quality product advertisement that closely mimics the style and composition of the reference image, but featuring the new product instead.

REFERENCE ANALYSIS: ${styleAnalysis || 'Analyze and match the visual style, composition, lighting, and overall aesthetic of the reference image.'}

CORE REQUIREMENTS:
1. Replace the main product with the new product image provided
2. Maintain the exact same visual style, mood, and aesthetic as the reference
3. Keep similar composition, framing, and layout principles
4. Match the color palette, lighting style, and overall atmosphere
5. Preserve the background style and environmental elements
6. Maintain similar typography and text placement if present
7. Keep the same professional quality and visual impact

TECHNICAL SPECIFICATIONS:
- High resolution, professional quality
- Maintain aspect ratio and composition balance
- Ensure the new product integrates seamlessly into the scene
- Preserve lighting consistency and shadows
- Match color grading and visual filters from reference

PRODUCT INTEGRATION:
- Position the new product in the same location as the original
- Scale appropriately to match the reference composition
- Ensure realistic lighting and shadows on the product
- Maintain depth and perspective consistency`

      if (customModifications) {
        generationPrompt += `\n\nCUSTOM MODIFICATIONS: ${customModifications}`
      }

      generationPrompt += `\n\nCRITICAL FRAME REQUIREMENTS: All content must be contained within the creative boundaries. NEVER allow text, products, graphics, or any visual elements to extend beyond or clip outside the canvas edges. Keep generous margins (at least 10% on all sides) from the frame borders. Ensure perfect centering and containment. All elements must fit completely within the visible creative area with no cropping or clipping whatsoever.`

      // Call AI generation service
      const generationResponse = await fetch(`${process.env.RUNPOD_ENDPOINT_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`
        },
        body: JSON.stringify({
          input: {
            prompt: generationPrompt,
            reference_image: referenceImageBase64,
            product_image: productImageBase64,
            width: 1024,
            height: 1024,
            guidance_scale: 7.5,
            num_inference_steps: 50,
            strength: 0.8, // How much to transform the reference
            negative_prompt: "blurry, low quality, distorted, cropped, clipped, cut off, text extending beyond frame, elements outside boundaries"
          }
        })
      })

      if (!generationResponse.ok) {
        throw new Error('AI generation failed')
      }

      const generationData = await generationResponse.json()
      const generatedImageUrl = generationData.output?.image_url || generationData.output

      // Update the database with the generated image
      const { error: updateError } = await serviceSupabase
        .from('copy_creatives')
        .update({
          generated_image_url: generatedImageUrl,
          status: 'completed'
        })
        .eq('id', copyCreative.id)

      if (updateError) {
        console.error('Error updating copy creative:', updateError)
      }

      // Return the updated creative
      const updatedCreative = {
        ...copyCreative,
        generated_image_url: generatedImageUrl,
        status: 'completed'
      }

      console.log('✅ Copy creative generated successfully')
      return NextResponse.json({ creative: updatedCreative })

    } catch (generationError) {
      console.error('Error generating copy creative:', generationError)
      
      // Update status to failed
      await serviceSupabase
        .from('copy_creatives')
        .update({ status: 'failed' })
        .eq('id', copyCreative.id)

      return NextResponse.json({ 
        error: 'Failed to generate copy creative',
        creative: { ...copyCreative, status: 'failed' }
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Error in POST /api/copy-creative:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message 
    }, { status: 500 })
  }
}

// DELETE - Delete a copy creative
export async function DELETE(req: NextRequest) {
  try {
    const { userId: clerkUserId } = auth()
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const creativeId = searchParams.get('id')
    
    if (!creativeId) {
      return NextResponse.json({ error: 'Creative ID is required' }, { status: 400 })
    }

    console.log('🗑️ Deleting copy creative:', creativeId)

    const { error } = await serviceSupabase
      .from('copy_creatives')
      .delete()
      .eq('id', creativeId)
      .eq('user_id', clerkUserId)

    if (error) {
      console.error('Error deleting copy creative:', error)
      return NextResponse.json({ 
        error: 'Failed to delete copy creative',
        details: error.message
      }, { status: 500 })
    }

    console.log('✅ Copy creative deleted successfully')
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error in DELETE /api/copy-creative:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message 
    }, { status: 500 })
  }
}
