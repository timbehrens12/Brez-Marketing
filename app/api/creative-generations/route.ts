import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'

// Create Supabase client with service role for server-side operations (for POST/DELETE)
// FIXED: Handle missing environment variables during build
const serviceSupabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
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
  console.log('🚀 DELETE endpoint reached for creative-generations')
  
  try {
    // Get authenticated user
    const { userId: clerkUserId } = auth()
    
    if (!clerkUserId) {
      console.log('❌ Unauthorized - no user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const creativeId = searchParams.get('id')
    
    console.log('📝 DELETE params:', { creativeId, userId: clerkUserId, url: req.url })
    
    if (!creativeId) {
      console.log('❌ Missing creative ID')
      return NextResponse.json({ error: 'Creative ID is required' }, { status: 400 })
    }
  
    console.log('🗑️ Deleting creative generation:', creativeId, 'for user:', clerkUserId)

    // First check if the creative exists and user has access
    const { data: existingCreative, error: checkError } = await serviceSupabase
      .from('creative_generations')
      .select('id, brand_id, user_id')
      .eq('id', creativeId)
      .single()

    if (checkError) {
      console.log('ℹ️ Creative check result:', checkError)
      
      if (checkError.code === 'PGRST116') {
        // Creative doesn't exist - this is actually a success case for deletion
        console.log('✅ Creative does not exist (already deleted or never existed) - treating as success')
        return NextResponse.json({ 
          success: true,
          message: 'Creative deletion completed successfully',
          alreadyDeleted: true
        }, { status: 200 })
      }
      
      console.error('❌ Error checking creative existence:', checkError)
      return NextResponse.json({ 
        error: 'Access Denied',
        message: 'You do not have permission to delete this creative.',
        details: checkError.message,
        userFriendly: true
      }, { status: 403 })
    }

    console.log('✅ Creative found:', existingCreative)

    // Check if user has permission to delete this creative
    if (existingCreative.user_id !== clerkUserId) {
      console.log('❌ User does not have permission to delete this creative')
      return NextResponse.json({ error: 'Unauthorized to delete this creative' }, { status: 403 })
    }

    // Delete the creative generation - RLS policies will handle access control based on brand ownership
    const { error, data } = await serviceSupabase
      .from('creative_generations')
      .delete()
      .eq('id', creativeId)
      .select()

    if (error) {
      console.error('❌ Error deleting creative generation:', error)
      return NextResponse.json({ 
        error: 'Failed to delete creative generation',
        details: error.message
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.error('❌ No rows deleted - RLS policy may have blocked deletion')
      return NextResponse.json({ 
        error: 'Deletion Failed',
        message: 'Could not delete creative. You may not have permission or the creative may have already been deleted.',
        details: 'Row Level Security policy prevented deletion',
        userFriendly: true
      }, { status: 403 })
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