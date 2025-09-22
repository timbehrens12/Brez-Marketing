import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Create Supabase client only when needed to avoid build-time errors
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are not set')
  }
  
  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    { auth: { persistSession: false } }
  )
}

// GET - Fetch image URLs for a specific creative
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const creativeId = searchParams.get('id')

    if (!creativeId) {
      return NextResponse.json({ error: 'Creative ID is required' }, { status: 400 })
    }

    // Get image URLs for the specific creative using direct query
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('creative_generations')
      .select('id, original_image_url, generated_image_url, created_at, status')
      .eq('id', creativeId)
      .single()

    if (error) {
      // If no rows found, silently return 404 (this is expected for unsaved creatives)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Creative not found',
          code: 'CREATIVE_NOT_FOUND'
        }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch creative images',
        details: error?.message,
        code: error?.code 
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 })
    }

    // console.log('✅ Successfully fetched images for creative')
    return NextResponse.json({ 
      id: data.id,
      originalImageUrl: data.original_image_url,
      generatedImageUrl: data.generated_image_url
    })

  } catch (error: any) {
    console.error('Error in GET /api/creative-images:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message 
    }, { status: 500 })
  }
}
