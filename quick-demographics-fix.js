// QUICK DEMOGRAPHICS FIX
// Run this in browser console to manually trigger demographics sync

const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🚀 QUICK DEMOGRAPHICS FIX')
console.log('='.repeat(30))

async function quickFix() {
  try {
    console.log('🔍 Step 1: Checking connection metadata...')
    
    // Check current connection status
    const statusResponse = await fetch(`https://www.brezmarketingdashboard.com/api/platforms/sync-status?brandId=${BRAND_ID}&platformType=meta`)
    const statusData = await statusResponse.json()
    
    console.log('📊 Current connection:', statusData.success ? '✅ Found' : '❌ Not found')
    
    if (statusData.success && statusData.connection_metadata) {
      console.log('🔗 Metadata:', statusData.connection_metadata)
      
      const accountId = statusData.connection_metadata.ad_account_id || statusData.connection_metadata.account_id
      
      if (accountId) {
        console.log(`✅ Account ID found: ${accountId}`)
        console.log('🚀 Triggering demographics sync...')
        
        // Try demographics sync
        const syncResponse = await fetch('https://www.brezmarketingdashboard.com/api/meta/demographics/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandId: BRAND_ID })
        })
        
        const syncResult = await syncResponse.json()
        
        if (syncResult.success) {
          console.log('✅ SUCCESS! Demographics sync started!')
          console.log(`📊 Jobs created: ${syncResult.jobsCreated}`)
          console.log(`💬 Message: ${syncResult.message}`)
          
          // Check progress in 5 seconds
          setTimeout(() => {
            checkProgress()
          }, 5000)
          
        } else {
          console.log('❌ Demographics sync failed:', syncResult.error || syncResult.message)
          
          // Show alternative solution
          console.log('\n🔧 ALTERNATIVE SOLUTION:')
          console.log('1. Go to Settings → Connection Management')
          console.log('2. Click "Disconnect" on Meta Ads')
          console.log('3. Click "Connect" to reconnect Meta Ads')
          console.log('4. This will refresh the connection and trigger all syncs')
        }
        
      } else {
        console.log('❌ No account ID in metadata')
        showReconnectSolution()
      }
    } else {
      console.log('❌ No connection found or failed to get status')
      showReconnectSolution()
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    showReconnectSolution()
  }
}

async function checkProgress() {
  try {
    console.log('\n🔍 Checking demographics progress...')
    
    const response = await fetch(`https://www.brezmarketingdashboard.com/api/test/demographics-sync?brandId=${BRAND_ID}`)
    const data = await response.json()
    
    if (data.success) {
      const status = data.syncStatus
      const jobs = data.jobStats
      
      console.log('📊 DEMOGRAPHICS STATUS:')
      if (status) {
        console.log(`   Status: ${status.overall_status}`)
        console.log(`   Progress: ${status.progress_percentage || 0}%`)
        console.log(`   Days: ${status.days_completed || 0}/${status.total_days_target || 0}`)
      }
      
      console.log('🔧 JOBS:')
      console.log(`   Total: ${jobs.total}`)
      console.log(`   Pending: ${jobs.pending}`)
      console.log(`   Running: ${jobs.running}`)
      console.log(`   Completed: ${jobs.completed}`)
      console.log(`   Failed: ${jobs.failed}`)
      
      if (jobs.pending > 0 || jobs.running > 0) {
        console.log('\n✅ Demographics sync is active!')
        console.log('📈 Progress should start showing in the UI soon')
      } else if (jobs.completed > 0) {
        console.log('\n✅ Demographics sync completed!')
      } else {
        console.log('\n⚠️ No jobs found - sync may not have started')
      }
      
    } else {
      console.log('❌ Failed to check progress:', data.error)
    }
    
  } catch (error) {
    console.error('❌ Progress check error:', error)
  }
}

function showReconnectSolution() {
  console.log('\n🔧 MANUAL SOLUTION:')
  console.log('====================')
  console.log('1. Go to Settings (gear icon) → Connection Management')
  console.log('2. Find "Meta Ads" section')
  console.log('3. Click "Disconnect" button')
  console.log('4. Click "Connect" button to reconnect')
  console.log('5. This will:')
  console.log('   ✅ Refresh the Meta connection')
  console.log('   ✅ Update account metadata')
  console.log('   ✅ Start campaigns + demographics sync together')
  console.log('\n💡 This is the most reliable solution!')
}

// Start the fix
console.log('🎯 Starting quick fix diagnosis...')
quickFix()

// Make function available
window.checkProgress = checkProgress
window.quickFix = quickFix

console.log('\n💡 Manual commands: quickFix(), checkProgress()')
