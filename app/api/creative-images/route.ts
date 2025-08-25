import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Create Supabase client with service role for server-side operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// GET - Fetch image URLs for a specific creative
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const creativeId = searchParams.get('id')

    if (!creativeId) {
      return NextResponse.json({ error: 'Creative ID is required' }, { status: 400 })
    }

    // console.log('🖼️ Fetching images for creative:', creativeId)

    // Get image URLs for the specific creative
    const { data, error } = await supabase.rpc('get_creative_images', {
      p_creative_id: creativeId
    })

    if (error) {
      console.error('Error fetching creative images:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch creative images',
        details: error?.message 
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 })
    }

    // console.log('✅ Successfully fetched images for creative')
    return NextResponse.json({ 
      id: data[0].id,
      originalImageUrl: data[0].original_image_url,
      generatedImageUrl: data[0].generated_image_url
    })

  } catch (error: any) {
    console.error('Error in GET /api/creative-images:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message 
    }, { status: 500 })
  }
}
