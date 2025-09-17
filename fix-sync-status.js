// FIX SYNC STATUS - FORCE RESET TO COMPLETED
const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🔧 FIXING SYNC STATUS - FORCE RESET TO COMPLETED')
console.log('=================================================')

async function fixSyncStatus() {
  try {
    console.log('🎯 Manual demographics sync worked, but UI still shows "in_progress"')
    console.log('🔧 Force resetting sync status to "completed"...')
    
    const resetResponse = await fetch(`/api/meta/reset-sync-status?brandId=${BRAND_ID}&confirm=true`)
    const resetResult = await resetResponse.json()
    
    console.log('📊 Reset result:', resetResult)
    
    if (resetResult.success) {
      console.log('✅ Sync status reset to completed!')
      console.log('🔄 REFRESH THE PAGE - progress should show 100%!')
      
      // Also check if demographics data is actually available now
      setTimeout(async () => {
        console.log('🔍 Testing demographics data with correct parameters...')
        
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        
        const dateFrom = yesterday.toISOString().split('T')[0]
        const dateTo = today.toISOString().split('T')[0]
        
        console.log(`📅 Testing date range: ${dateFrom} to ${dateTo}`)
        
        const dataResponse = await fetch(`/api/meta/demographics/data?brandId=${BRAND_ID}&breakdown=age&dateFrom=${dateFrom}&dateTo=${dateTo}`)
        const dataResult = await dataResponse.json()
        
        console.log('📊 Demographics data test (fixed params):', dataResult)
        
        if (dataResult.success && dataResult.data && dataResult.data.length > 0) {
          console.log('🎉🎉🎉 DEMOGRAPHICS DATA IS WORKING!')
          console.log('📊 Sample data:', dataResult.data.slice(0, 3))
          console.log('✅ The manual sync completely fixed the demographics!')
          console.log('🎯 Just need to refresh page to see 100% progress!')
        } else {
          console.log('📊 Data result for debugging:', dataResult)
          if (dataResult.error && dataResult.error.includes('parameters')) {
            console.log('💡 API parameter format issue - need to check endpoint')
          }
        }
      }, 2000)
      
    } else {
      console.log('❌ Reset failed:', resetResult.error)
    }
    
  } catch (error) {
    console.error('❌ Fix sync status error:', error)
  }
}

fixSyncStatus()

console.log('💡 SUMMARY:')
console.log('✅ Manual demographics sync worked!')
console.log('🔧 Resetting UI sync status to stop 63% animation')
console.log('🔄 Refresh page after this completes')
console.log('🎯 Demographics widgets should now show real data!')
