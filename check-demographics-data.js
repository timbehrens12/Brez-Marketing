// CHECK WHERE DEMOGRAPHICS DATA WAS STORED
const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🔍 CHECKING WHERE DEMOGRAPHICS DATA WAS STORED')
console.log('===============================================')

async function checkDemographicsData() {
  try {
    console.log('📊 The manual sync worked and API responds with success: true')
    console.log('❌ But data array is empty: Array(0)')
    console.log('💡 This means data was stored in a different table than API expects')
    
    console.log('🔍 Step 1: Test different breakdown types...')
    
    const breakdowns = ['age', 'gender', 'age_gender', 'device_platform', 'placement']
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const dateFrom = yesterday.toISOString().split('T')[0]
    const dateTo = today.toISOString().split('T')[0]
    
    for (const breakdown of breakdowns) {
      console.log(`🔍 Testing breakdown: ${breakdown}`)
      
      const response = await fetch(`/api/meta/demographics/data?brandId=${BRAND_ID}&breakdown=${breakdown}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      const result = await response.json()
      
      console.log(`📊 ${breakdown} result:`, {
        success: result.success,
        dataCount: result.data?.length || 0,
        breakdown_type: result.breakdown_type,
        firstItem: result.data?.[0] || 'No data'
      })
      
      if (result.data && result.data.length > 0) {
        console.log(`✅ FOUND DATA in ${breakdown}!`)
        console.log('📊 Sample:', result.data.slice(0, 2))
        break
      }
    }
    
    console.log('🔍 Step 2: Test broader date range...')
    
    // Test last 7 days
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const weekDateFrom = weekAgo.toISOString().split('T')[0]
    console.log(`📅 Testing wider range: ${weekDateFrom} to ${dateTo}`)
    
    const wideResponse = await fetch(`/api/meta/demographics/data?brandId=${BRAND_ID}&breakdown=age&dateFrom=${weekDateFrom}&dateTo=${dateTo}`)
    const wideResult = await wideResponse.json()
    
    console.log('📊 Wide range result:', {
      success: wideResult.success,
      dataCount: wideResult.data?.length || 0,
      breakdown_type: wideResult.breakdown_type
    })
    
    if (wideResult.data && wideResult.data.length > 0) {
      console.log('✅ FOUND DATA with wider range!')
      console.log('📊 Sample:', wideResult.data.slice(0, 2))
    } else {
      console.log('❌ Still no data with wider range')
      console.log('💡 Possible issues:')
      console.log('  1. Data stored in different table (meta_demographics vs new tables)')
      console.log('  2. Date format mismatch')
      console.log('  3. API looking in wrong place')
      console.log('  4. Need to check what the working sync actually created')
    }
    
    console.log('🔍 Step 3: Check the raw response structure...')
    console.log('📊 Full API response for debugging:')
    console.log(JSON.stringify(wideResult, null, 2))
    
  } catch (error) {
    console.error('❌ Check demographics data error:', error)
  }
}

checkDemographicsData()

console.log('💡 NEXT STEPS:')
console.log('1. If no data found in any breakdown/date range:')
console.log('   → API is looking in wrong table')
console.log('   → Need to fix API to read from meta_demographics table')
console.log('2. If data found with different breakdown/date:')
console.log('   → Widget needs to use correct parameters')
console.log('3. The manual sync DID work - just need to connect API to right data!')
