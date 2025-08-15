import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'

// Create Supabase client with service role for server-side operations (for POST/DELETE)
const serviceSupabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// GET - Fetch creative generations for a specific brand
export async function GET(req: NextRequest) {
  // Set a timeout to prevent 504 errors
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 second timeout
  )
  
  try {
    // Get authenticated user
    const { userId: clerkUserId } = auth()
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const brandId = searchParams.get('brandId')
    const limit = parseInt(searchParams.get('limit') || '25') // Reduce default limit to 25
    const offset = parseInt(searchParams.get('offset') || '0') // Default offset of 0

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log('🎨 Fetching creative generations for brand:', brandId, 'user:', clerkUserId, 'limit:', limit, 'offset:', offset)

    // Use authenticated Supabase client for RLS-enabled function
    const supabase = getSupabaseClient()

    // Use direct query with RLS policies - this will show all brand creatives to shared users
    const { data, error } = await Promise.race([
        supabase
          .from('creative_generations')
          .select(`
            id,
            brand_id,
            user_id,
            style_id,
            style_name,
            status,
            custom_name,
            created_at,
            updated_at
          `)
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1),
        timeoutPromise
      ]) as any

      if (error) {
        console.error('Error fetching creative generations:', error)
        return NextResponse.json({ 
          error: 'Failed to fetch creative generations',
          details: error?.message 
        }, { status: 500 })
      }

      // For now, we'll skip the total count to avoid any performance issues
      // The frontend can handle pagination without knowing the exact total
      console.log('✅ Successfully fetched', data?.length || 0, 'creative generations')
      return NextResponse.json({ 
        creatives: data || [],
        pagination: {
          total: data?.length || 0, // Just return the current batch size
          limit,
          offset,
          hasMore: (data?.length || 0) === limit // If we got a full page, assume there might be more
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
    const { data, error } = await serviceSupabase
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

    // Delete the creative generation - RLS policies will handle access control
    const { error } = await serviceSupabase
      .from('creative_generations')
      .delete()
      .eq('id', creativeId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting creative generation:', error)
      return NextResponse.json({ 
        error: 'Failed to delete creative generation',
        details: error.message
      }, { status: 500 })
    }

    console.log('✅ Successfully deleted creative generation')
    return NextResponse.json({ 
      success: true,
      message: 'Creative generation deleted successfully'
    })

  } catch (error: any) {
    console.error('Error in DELETE /api/creative-generations:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message 
    }, { status: 500 })
  }
}