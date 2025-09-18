#!/usr/bin/env node

/**
 * TRIGGER REAL DEMOGRAPHICS SYNC
 * 
 * Since there's NO demographics data in any table, we need to call the 
 * ACTUAL working sync method that populates the meta_demographics table
 */

const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🔥 TRIGGERING REAL DEMOGRAPHICS SYNC TO POPULATE DATA...')

async function triggerRealSync() {
  try {
    console.log('📡 Calling the WORKING demographics sync endpoint...')
    
    // Use fetch to call the endpoint that actually works
    const response = await fetch(`https://www.brezmarketingdashboard.com/api/meta/sync-demographics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brandId: BRAND_ID
      })
    })
    
    console.log('📊 Response status:', response.status)
    const responseText = await response.text()
    console.log('📊 Response:', responseText)
    
    if (response.ok) {
      console.log('✅ DEMOGRAPHICS SYNC TRIGGERED!')
      console.log('🎯 This should populate the meta_demographics table with real data')
      console.log('⏱️ Wait 2-3 minutes for data to sync')
      console.log('🔄 Then refresh your dashboard')
    } else {
      console.error('❌ Sync failed:', response.status, responseText)
    }
    
  } catch (error) {
    console.error('❌ Error triggering sync:', error)
  }
}

triggerRealSync()
