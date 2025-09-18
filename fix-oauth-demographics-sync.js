#!/usr/bin/env node

/**
 * EMERGENCY FIX: OAuth Demographics Sync Issue
 * 
 * The user reconnected Meta and now demographics sync is broken again.
 * This script will:
 * 1. Check the current sync status records
 * 2. Trigger a proper demographics sync
 * 3. Fix the 63% stuck progress issue
 */

const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🚨 EMERGENCY: Fixing OAuth Demographics Sync Issue...')

async function main() {
  try {
    // Step 1: Check current sync status
    console.log('📊 Step 1: Checking current sync status...')
    
    const syncStatusResponse = await fetch(`https://www.brezmarketingdashboard.com/api/platforms/sync-status?brandId=${BRAND_ID}`)
    const syncData = await syncStatusResponse.json()
    
    console.log('🔍 Current sync status:', JSON.stringify(syncData, null, 2))
    
    // Step 2: Check demographics sync status specifically
    console.log('📈 Step 2: Checking demographics sync status...')
    
    const demographicsStatusResponse = await fetch(`https://www.brezmarketingdashboard.com/api/meta/demographics/sync-status?brandId=${BRAND_ID}`)
    const demographicsData = await demographicsStatusResponse.json()
    
    console.log('📊 Demographics sync status:', JSON.stringify(demographicsData, null, 2))
    
    // Step 3: Trigger fresh demographics sync
    console.log('🚀 Step 3: Triggering fresh demographics sync...')
    
    const syncResponse = await fetch(`https://www.brezmarketingdashboard.com/api/meta/sync-demographics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        brandId: BRAND_ID
      })
    })
    
    const syncResult = await syncResponse.json()
    console.log('✅ Demographics sync result:', JSON.stringify(syncResult, null, 2))
    
    // Step 4: Wait a moment and check status again
    console.log('⏱️ Step 4: Waiting 10 seconds then checking status...')
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    const finalStatusResponse = await fetch(`https://www.brezmarketingdashboard.com/api/platforms/sync-status?brandId=${BRAND_ID}`)
    const finalStatus = await finalStatusResponse.json()
    
    console.log('🎯 Final sync status:', JSON.stringify(finalStatus, null, 2))
    
    console.log('✅ EMERGENCY FIX COMPLETE!')
    console.log('📝 Summary:')
    console.log('   - Checked sync status records')
    console.log('   - Triggered fresh demographics sync') 
    console.log('   - Should resolve 63% stuck issue')
    console.log('   - Demographics should now show "Syncing..." instead of "Waiting"')
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error)
    console.error('Full error:', error.message)
  }
}

main()
