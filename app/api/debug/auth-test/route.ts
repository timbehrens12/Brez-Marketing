import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Get the current user from Clerk
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Get the JWT token from Clerk for Supabase
    const { getToken } = auth()
    const token = await getToken({ template: 'supabase' })
    
    if (!token) {
      return NextResponse.json({ error: 'Failed to generate Supabase token' }, { status: 500 })
    }
    
    // Create a Supabase client with the token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    // Test a simple query to Supabase
    const { data, error } = await supabase.from('brands').select('*').limit(1)
    
    if (error) {
      return NextResponse.json({ 
        error: 'Supabase query failed', 
        details: error,
        token: token.substring(0, 10) + '...' // Only show part of the token for security
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress 
      },
      tokenInfo: {
        length: token.length,
        prefix: token.substring(0, 10) + '...' // Only show part of the token for security
      },
      data
    })
  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
} 