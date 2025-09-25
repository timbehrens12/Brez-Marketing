// EMERGENCY SYNC RUNNER
async function runEmergencySync() {
  console.log('🚨 RUNNING EMERGENCY SYNC...')
  
  try {
    const response = await fetch('https://www.brezmarketingdashboard.com/api/meta/emergency-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brandId: '1a30f34b-b048-4f80-b880-6c61bd12c720'
      })
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ EMERGENCY SYNC SUCCESS!')
      console.log('Final counts:', result.finalCounts)
      console.log('Date range:', result.dateRange)
      console.log('Raw insights:', result.rawInsights)
    } else {
      console.error('❌ EMERGENCY SYNC FAILED:', result)
    }
    
  } catch (error) {
    console.error('❌ SYNC ERROR:', error)
  }
}

runEmergencySync()
