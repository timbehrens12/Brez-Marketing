// DEBUG OAUTH COMPLETION - CHECK IF SIMPLE SYNC WAS CALLED
const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🔍 DEBUG: CHECKING IF OAUTH COMPLETION WORKED')
console.log('============================================')

async function debugOAuthCompletion() {
  try {
    console.log('🔍 Step 1: Check if Meta connection has proper metadata...')
    
    const statusResponse = await fetch(`/api/platforms/sync-status?brandId=${BRAND_ID}&platformType=meta`)
    const statusData = await statusResponse.json()
    
    console.log('📊 Connection Data:', statusData)
    console.log('🔧 Metadata:', statusData.connection_metadata || 'MISSING')
    
    if (!statusData.connection_metadata?.ad_account_id) {
      console.log('❌ PROBLEM: Metadata still missing after reconnect!')
      console.log('💡 This means OAuth completion metadata saving failed again')
      return
    }
    
    console.log('✅ Metadata exists, checking if simple sync was called...')
    
    console.log('🔍 Step 2: Check if simple demographics data exists...')
    
    // Check if the simple sync created any demographic data in the last hour
    const testResponse = await fetch(`/api/meta/demographics/data?brandId=${BRAND_ID}&breakdown=age&dateRange=today`)
    const testData = await testResponse.json()
    
    console.log('📊 Demographics data test:', testData)
    
    if (testData.success && testData.data && testData.data.length > 0) {
      console.log('✅ SIMPLE SYNC WORKED! Demographics data exists!')
      console.log('🔧 UI issue: Progress bars are stuck because sync status detection is broken')
    } else {
      console.log('❌ SIMPLE SYNC FAILED OR NOT CALLED')
      console.log('💡 Need to manually trigger the working simple sync')
    }
    
    console.log('🔍 Step 3: Manual trigger test...')
    
    const manualResponse = await fetch('/api/meta/sync-demographics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: BRAND_ID })
    })
    
    const manualResult = await manualResponse.json()
    console.log('📊 Manual simple sync result:', manualResult)
    
    if (manualResult.success) {
      console.log('🎉 MANUAL SIMPLE SYNC WORKS!')
      console.log('📋 Solution: Add manual trigger button or fix OAuth completion')
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

debugOAuthCompletion()
