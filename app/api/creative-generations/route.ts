import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Create Supabase client with service role for server-side operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// GET - Fetch creative generations for a specific brand
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const brandId = searchParams.get('brandId')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50') // Default limit of 50
    const offset = parseInt(searchParams.get('offset') || '0') // Default offset of 0

    if (!brandId || !userId) {
      return NextResponse.json({ error: 'Brand ID and User ID are required' }, { status: 400 })
    }

    console.log('🎨 Fetching creative generations for brand:', brandId, 'user:', userId, 'limit:', limit, 'offset:', offset)

    // Use direct SQL query to bypass RLS performance issues with service role
    const { data, error } = await supabase.rpc('get_creative_generations_for_brand', {
      p_brand_id: brandId,
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset
    })

    if (error) {
      console.error('Error fetching creative generations:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch creative generations',
        details: error?.message 
      }, { status: 500 })
    }

    // Extract total count from the first record (all records have the same total_count)
    const totalCount = data && data.length > 0 ? data[0].total_count : 0
    
    // Remove total_count from each record to clean up the response
    const cleanedData = data?.map((record: any) => {
      const { total_count, ...rest } = record
      return rest
    }) || []

    console.log('✅ Successfully fetched', cleanedData.length, 'creative generations out of', totalCount, 'total')
    return NextResponse.json({ 
      creatives: cleanedData,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (totalCount || 0) > offset + limit
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/creative-generations:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message 
    }, { status: 500 })
  }
}

// POST - Create a new creative generation
export async function POST(req: NextRequest) {
  try {
    const {
      brandId,
      userId,
      styleId,
      styleName,
      originalImageUrl,
      generatedImageUrl,
      promptUsed,
      textOverlays,
      metadata,
      customName
    } = await req.json()

    if (!brandId || !userId || !styleId || !styleName || !originalImageUrl || !generatedImageUrl || !promptUsed) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    console.log('🎨 Creating new creative generation:', {
      brandId,
      userId,
      styleId,
      styleName
    })

    // Insert new creative generation
    const { data, error } = await supabase
      .from('creative_generations')
      .insert({
        brand_id: brandId,
        user_id: userId,
        style_id: styleId,
        style_name: styleName,
        original_image_url: originalImageUrl,
        generated_image_url: generatedImageUrl,
        prompt_used: promptUsed,
        text_overlays: textOverlays || {},
        status: 'completed',
        metadata: metadata || {},
        custom_name: customName || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating creative generation:', error)
      return NextResponse.json({ error: 'Failed to create creative generation' }, { status: 500 })
    }

    console.log('✅ Successfully created creative generation with ID:', data.id)
    return NextResponse.json({ creative: data })

  } catch (error: any) {
    console.error('Error in POST /api/creative-generations:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message 
    }, { status: 500 })
  }
}

// DELETE - Delete a creative generation
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const creativeId = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!creativeId || !userId) {
      return NextResponse.json({ error: 'Creative ID and User ID are required' }, { status: 400 })
    }

    console.log('🗑️ Deleting creative generation:', creativeId, 'for user:', userId)

    // Delete the creative generation (with RLS policy enforcement)
    const { error } = await supabase
      .from('creative_generations')
      .delete()
      .eq('id', creativeId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting creative generation:', error)
      return NextResponse.json({ error: 'Failed to delete creative generation' }, { status: 500 })
    }

    console.log('✅ Successfully deleted creative generation')
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error in DELETE /api/creative-generations:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message 
    }, { status: 500 })
  }
}