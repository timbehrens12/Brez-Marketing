import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'

// Server-side Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient()

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`🔍 Loading agency settings for user: ${userId}`)

    const { data, error } = await supabase
      .from('agency_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('❌ Error loading agency settings:', error)
      return NextResponse.json({ error: 'Failed to load agency settings' }, { status: 500 })
    }

    // If no settings exist, return defaults
    if (!data) {
      console.log('ℹ️ No agency settings found, returning defaults')
      return NextResponse.json({
        success: true,
        settings: {
          agency_name: 'Brez Marketing Assistant',
          agency_logo_url: null,
          signature_name: undefined,
          signature_image: null
        }
      })
    }

    console.log('✅ Successfully loaded agency settings')
    return NextResponse.json({
      success: true,
      settings: {
        agency_name: data.agency_name,
        agency_logo_url: data.agency_logo_url,
        signature_name: data.signature_name,
        signature_image: data.signature_image
      }
    })

  } catch (error) {
    console.error('❌ Exception in agency settings GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agency_name, agency_logo_url, signature_name, signature_image } = await request.json()

    if (!agency_name || typeof agency_name !== 'string') {
      return NextResponse.json({ error: 'Agency name is required' }, { status: 400 })
    }

    console.log(`💾 Saving agency settings for user: ${userId}`, {
      agency_name,
      signature_name,
      hasSignatureImage: !!signature_image
    })

    // Upsert the agency settings
    const { data, error } = await supabase
      .from('agency_settings')
      .upsert({
        user_id: userId,
        agency_name: agency_name.trim(),
        agency_logo_url: agency_logo_url || null,
        signature_name: signature_name || null,
        signature_image: signature_image || null
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error saving agency settings:', error)
      return NextResponse.json({ error: 'Failed to save agency settings' }, { status: 500 })
    }

    console.log('✅ Successfully saved agency settings')
    return NextResponse.json({
      success: true,
      settings: {
        agency_name: data.agency_name,
        agency_logo_url: data.agency_logo_url,
        signature_name: data.signature_name,
        signature_image: data.signature_image
      }
    })

  } catch (error) {
    console.error('❌ Exception in agency settings POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 