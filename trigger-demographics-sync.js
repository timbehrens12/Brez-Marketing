#!/usr/bin/env node

/**
 * TRIGGER DEMOGRAPHICS SYNC
 * 
 * This script calls the working demographics sync API endpoint directly
 * to bypass the OAuth completion issue and get demographics syncing.
 */

const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🚀 TRIGGERING DEMOGRAPHICS SYNC...')

async function triggerSync() {
  try {
    console.log('📡 Calling demographics sync API...')
    
    // Use the working sync endpoint that we know works
    const response = await fetch(`https://www.brezmarketingdashboard.com/api/meta/sync-demographics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any required headers
      },
      body: JSON.stringify({
        brandId: BRAND_ID
      })
    })
    
    console.log('📊 Response status:', response.status)
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      console.error('❌ Response not OK:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('❌ Error response:', errorText)
      return
    }
    
    const result = await response.json()
    console.log('✅ Sync triggered successfully!')
    console.log('📊 Result:', JSON.stringify(result, null, 2))
    
    console.log('\n🎯 NEXT STEPS:')
    console.log('1. Check your dashboard - demographics should show "Syncing..."')
    console.log('2. Wait 2-5 minutes for sync to complete')
    console.log('3. Progress should move beyond 63% and complete at 100%')
    console.log('4. Demographics widgets should populate with data')
    
  } catch (error) {
    console.error('❌ Sync trigger failed:', error)
    console.error('Full error:', error.message)
    
    console.log('\n🔧 MANUAL ALTERNATIVE:')
    console.log('1. Go to your dashboard')
    console.log('2. Disconnect Meta')
    console.log('3. Reconnect Meta')
    console.log('4. Wait for automatic sync to complete')
  }
}

triggerSync()