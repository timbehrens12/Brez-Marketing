import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'

/**
 * Debug Meta OAuth Flow
 * Test what happens during Meta connection without going through full OAuth
 */
export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'brandId required' }, { status: 400 })
    }

    console.log(`[Meta OAuth Debug] Testing for brand: ${brandId}`)
    
    const supabase = getSupabaseClient()
    
    // Get current connection data
    const { data: connectionData, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .single()
    
    if (connectionError) {
      console.error(`[Meta OAuth Debug] Connection error:`, connectionError)
      return NextResponse.json({ error: 'No Meta connection found', details: connectionError })
    }
    
    console.log(`[Meta OAuth Debug] Current connection:`, connectionData)
    
    // Test metadata update
    const testMetadata = {
      ad_account_id: 'act_120218263352990058',
      account_name: 'Test Meta Account',
      account_status: 'ACTIVE',
      debug_updated: new Date().toISOString()
    }
    
    console.log(`[Meta OAuth Debug] Testing metadata update:`, testMetadata)
    
    const { data: updateResult, error: updateError } = await supabase
      .from('platform_connections')
      .update({ metadata: testMetadata })
      .eq('id', connectionData.id)
      .select('id, metadata')
    
    if (updateError) {
      console.error(`[Meta OAuth Debug] Update error:`, updateError)
      return NextResponse.json({ 
        error: 'Metadata update failed', 
        details: updateError,
        connectionId: connectionData.id
      })
    }
    
    console.log(`[Meta OAuth Debug] Update result:`, updateResult)
    
    // Verify the update worked
    const { data: verifyData, error: verifyError } = await supabase
      .from('platform_connections')
      .select('metadata')
      .eq('id', connectionData.id)
      .single()
    
    console.log(`[Meta OAuth Debug] Verification result:`, verifyData)
    
    return NextResponse.json({
      success: true,
      message: 'Meta OAuth debug completed',
      originalConnection: connectionData,
      updateResult: updateResult,
      verificationResult: verifyData,
      metadataWorking: !!verifyData?.metadata?.ad_account_id
    })
    
  } catch (error) {
    console.error('[Meta OAuth Debug] Error:', error)
    return NextResponse.json({ 
      error: 'Debug test failed',
      details: error.message 
    }, { status: 500 })
  }
}
