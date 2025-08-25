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
    
    const testResults = []
    
    // Test 1: Check what auth.uid() returns
    try {
      const { data: authData, error: authError } = await supabase
        .rpc('get_auth_uid_test')
      
      testResults.push({
        test: 'auth.uid() check',
        success: !authError,
        data: authData,
        error: authError?.message
      })
    } catch (e) {
      testResults.push({
        test: 'auth.uid() check',
        success: false,
        error: 'Function call failed'
      })
    }
    
    // Test 2: Query brands table (should work with RLS)
    try {
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('*')
        .limit(1)
      
      testResults.push({
        test: 'brands table query',
        success: !brandsError,
        data: brandsData,
        error: brandsError?.message
      })
    } catch (e) {
      testResults.push({
        test: 'brands table query',
        success: false,
        error: (e as Error).message
      })
    }
    
    // Test 3: Try to insert into user_preferences (should work with text user_id)
    try {
      const { data: prefData, error: prefError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          brand_id: 'bb2fafbe-9fea-4409-b4ec-f25463ee6a75', // Use a known brand ID
          preference_type: 'test',
          preferences: { test: true }
        }, {
          onConflict: 'user_id,brand_id,preference_type'
        })
      
      testResults.push({
        test: 'user_preferences upsert',
        success: !prefError,
        data: prefData,
        error: prefError?.message
      })
    } catch (e) {
      testResults.push({
        test: 'user_preferences upsert',
        success: false,
        error: (e as Error).message
      })
    }
    
    // Test 4: Try to insert into ai_marketing_reports
    try {
      const testReport = {
        brand_id: 'bb2fafbe-9fea-4409-b4ec-f25463ee6a75',
        user_id: user.id,
        date_range_from: '2024-01-01',
        date_range_to: '2024-01-01',
        period_name: 'test',
        raw_response: 'test response',
        html_report: '<p>Test report</p>'
      }
      
      const { data: reportData, error: reportError } = await supabase
        .from('ai_marketing_reports')
        .insert(testReport)
        .select()
      
      testResults.push({
        test: 'ai_marketing_reports insert',
        success: !reportError,
        data: reportData,
        error: reportError?.message
      })
      
      // Clean up the test record
      if (!reportError && reportData && reportData.length > 0) {
        await supabase
          .from('ai_marketing_reports')
          .delete()
          .eq('id', reportData[0].id)
      }
    } catch (e) {
      testResults.push({
        test: 'ai_marketing_reports insert',
        success: false,
        error: (e as Error).message
      })
    }
    
    // Decode JWT token to see its claims
    let tokenClaims = null
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]))
        tokenClaims = {
          sub: payload.sub,
          iat: payload.iat,
          exp: payload.exp,
          iss: payload.iss,
          aud: payload.aud,
          custom_claims: Object.keys(payload).filter(key => 
            !['sub', 'iat', 'exp', 'iss', 'aud', 'nbf', 'jti'].includes(key)
          ).reduce((obj, key) => ({ ...obj, [key]: payload[key] }), {})
        }
      }
    } catch (jwtError) {
      console.error('JWT decode error:', jwtError)
    }
    
    return NextResponse.json({ 
      success: true,
      user: { 
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress 
      },
      tokenInfo: {
        length: token.length,
        prefix: token.substring(0, 10) + '...',
        claims: tokenClaims
      },
      testResults
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
} 