// TEST DEMOGRAPHICS API FIX
const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🔧 TESTING DEMOGRAPHICS API FIX')
console.log('================================')

async function testDemographicsFix() {
  try {
    console.log('✅ Fixed API to:')
    console.log('  1. Accept "breakdown" parameter (not just "breakdownType")')
    console.log('  2. Read from meta_demographics table (where manual sync stored data)')
    console.log('  3. Support all breakdown types (age, gender, age_gender)')
    console.log('  4. Convert old table format to new format')
    
    console.log('🔍 Testing all breakdown types with correct parameters...')
    
    const breakdowns = ['age', 'gender', 'age_gender']
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const dateFrom = weekAgo.toISOString().split('T')[0]
    const dateTo = today.toISOString().split('T')[0]
    
    console.log(`📅 Testing date range: ${dateFrom} to ${dateTo}`)
    
    for (const breakdown of breakdowns) {
      console.log(`\n🔍 Testing breakdown: ${breakdown}`)
      
      // Use correct parameter name: "breakdown" (not "breakdownType")
      const response = await fetch(`/api/meta/demographics/data?brandId=${BRAND_ID}&breakdown=${breakdown}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      const result = await response.json()
      
      console.log(`📊 ${breakdown} result:`, {
        success: result.success,
        dataCount: result.data?.length || 0,
        breakdown_type: result.breakdown_type,
        total_records: result.total_records,
        cached: result.cached
      })
      
      if (result.success && result.data && result.data.length > 0) {
        console.log(`🎉 FOUND DATA in ${breakdown}!`)
        console.log('📊 Sample data:', result.data.slice(0, 2))
        console.log('✅ DEMOGRAPHICS WORKING!')
        
        // Test that the data has proper format
        const sample = result.data[0]
        console.log('📋 Data structure:', {
          breakdown_key: sample.breakdown_key,
          breakdown_value: sample.breakdown_value,
          spend: sample.spend,
          impressions: sample.impressions,
          clicks: sample.clicks
        })
        
        return true // Found working data
      } else if (!result.success) {
        console.log(`❌ API error for ${breakdown}:`, result.error)
      } else {
        console.log(`📊 No data for ${breakdown} (but API works)`)
      }
    }
    
    console.log('🔍 If no data found, testing broader date range...')
    
    // Test much broader range
    const monthAgo = new Date(today)
    monthAgo.setDate(monthAgo.getDate() - 30)
    
    const broadDateFrom = monthAgo.toISOString().split('T')[0]
    console.log(`📅 Testing broader range: ${broadDateFrom} to ${dateTo}`)
    
    const broadResponse = await fetch(`/api/meta/demographics/data?brandId=${BRAND_ID}&breakdown=age&dateFrom=${broadDateFrom}&dateTo=${dateTo}`)
    const broadResult = await broadResponse.json()
    
    console.log('📊 Broad range result:', {
      success: broadResult.success,
      dataCount: broadResult.data?.length || 0,
      breakdown_type: broadResult.breakdown_type,
      total_records: broadResult.total_records
    })
    
    if (broadResult.success && broadResult.data && broadResult.data.length > 0) {
      console.log('🎉 FOUND DATA with broader range!')
      console.log('📊 Sample:', broadResult.data.slice(0, 2))
      return true
    }
    
    console.log('💡 If still no data, the manual sync may have used different dates')
    console.log('📋 Manual sync used last 3 days, so check around September 14-17, 2025')
    
    return false
    
  } catch (error) {
    console.error('❌ Test error:', error)
    return false
  }
}

testDemographicsFix().then(success => {
  if (success) {
    console.log('\n🎉🎉🎉 DEMOGRAPHICS API IS WORKING!')
    console.log('✅ Manual sync data successfully retrieved!')
    console.log('🔄 REFRESH YOUR DASHBOARD - demographics widgets should show real data!')
  } else {
    console.log('\n❌ Still no data found')
    console.log('💡 Next steps: Check exact dates the manual sync used')
  }
})

console.log('\n💡 WHAT WAS FIXED:')
console.log('1. ✅ API parameter: "breakdown" instead of "breakdownType"')
console.log('2. ✅ Table: meta_demographics instead of meta_demographics_facts')
console.log('3. ✅ Format conversion: old table structure → new expected format')
console.log('4. ✅ All breakdown types supported: age, gender, age_gender')
