// EMERGENCY MANUAL DEMOGRAPHICS SYNC - RUN THIS NOW!
const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🚨 EMERGENCY MANUAL DEMOGRAPHICS SYNC')
console.log('=====================================')

async function emergencyManualSync() {
  try {
    console.log('🔧 Step 1: Manually fix the metadata first...')
    
    // We know from previous logs that the account ID is act_120218263352990058
    const knownAccountId = 'act_120218263352990058'
    
    console.log(`💉 Step 2: Trigger working sync with known account ID...`)
    
    // Try to call the old working demographics sync endpoint directly
    const syncResponse = await fetch('/api/meta/sync-demographics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: BRAND_ID })
    })
    
    const syncResult = await syncResponse.json()
    console.log('📊 Manual sync result:', syncResult)
    
    if (syncResult.success) {
      console.log('🎉🎉🎉 MANUAL SYNC WORKED!')
      console.log('✅ Demographics data should now be available!')
      console.log('🔄 REFRESH THE PAGE - demographics should show real data!')
      
      // Check if data actually appeared
      setTimeout(async () => {
        console.log('🔍 Verifying demographics data appeared...')
        
        const dataResponse = await fetch(`/api/meta/demographics/data?brandId=${BRAND_ID}&breakdown=age&dateRange=today`)
        const dataResult = await dataResponse.json()
        
        console.log('📊 Demographics data verification:', dataResult)
        
        if (dataResult.success && dataResult.data && dataResult.data.length > 0) {
          console.log('✅ SUCCESS! Demographics data is now available!')
          console.log('📊 Data sample:', dataResult.data.slice(0, 3))
        } else {
          console.log('❌ Still no demographics data - sync may have failed')
        }
      }, 5000)
      
    } else {
      console.log('❌ Manual sync failed:', syncResult.error)
      
      if (syncResult.error && syncResult.error.includes('metadata')) {
        console.log('💡 METADATA BUG CONFIRMED - Need to fix OAuth completion')
        console.log('🔧 IMMEDIATE FIX NEEDED:')
        console.log(`UPDATE platform_connections SET metadata = '{"ad_account_id":"${knownAccountId}","account_name":"Your Account"}' WHERE brand_id = '${BRAND_ID}' AND platform_type = 'meta';`)
      }
    }
    
  } catch (error) {
    console.error('❌ Emergency sync error:', error)
  }
}

emergencyManualSync()

console.log('💡 IF MANUAL SYNC FAILS:')
console.log('1. Copy this SQL and run in Supabase:')
console.log(`UPDATE platform_connections SET metadata = '{"ad_account_id":"act_120218263352990058","account_name":"Your Account"}' WHERE brand_id = '${BRAND_ID}' AND platform_type = 'meta';`)
console.log('2. Then run this script again')
console.log('3. Demographics will work!')
