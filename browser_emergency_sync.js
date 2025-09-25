// RUN THIS IN BROWSER CONSOLE ON brezmarketingdashboard.com
console.log('🚨 STARTING EMERGENCY SYNC FROM BROWSER...')

fetch('/api/meta/emergency-sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    brandId: '1a30f34b-b048-4f80-b880-6c61bd12c720'
  })
})
.then(response => response.json())
.then(result => {
  if (result.success) {
    console.log('✅ EMERGENCY SYNC SUCCESS!')
    console.log('Final counts:', result.finalCounts)
    console.log('Date range:', result.dateRange)
    console.log('Raw insights:', result.rawInsights)
  } else {
    console.error('❌ EMERGENCY SYNC FAILED:', result)
  }
})
.catch(error => {
  console.error('❌ SYNC ERROR:', error)
})
