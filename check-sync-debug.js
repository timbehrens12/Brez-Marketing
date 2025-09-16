// Quick script to check sync status and force complete if needed
// Replace YOUR_BRAND_ID with your actual brand ID

const BRAND_ID = "YOUR_BRAND_ID" // You need to replace this
const BASE_URL = "https://www.brezmarketingdashboard.com"

async function checkSyncStatus() {
  try {
    console.log(`🔍 Checking sync status for brand: ${BRAND_ID}`)
    
    const response = await fetch(`${BASE_URL}/api/debug/sync-status?brandId=${BRAND_ID}`)
    const data = await response.json()
    
    if (!data.success) {
      console.error('❌ Error checking sync status:', data.error)
      return
    }
    
    console.log('\n📊 SYNC STATUS ANALYSIS:')
    console.log('='.repeat(50))
    
    // Platform connections
    const connection = data.platformConnections[0]
    if (connection) {
      console.log(`📱 Platform Connection: ${connection.sync_status}`)
      console.log(`📅 Last Updated: ${connection.updated_at}`)
    }
    
    // ETL Jobs
    console.log(`\n🔧 ETL Jobs (Recent ${data.etlJobs.recent.length}):`)
    console.log(`   Total: ${data.etlJobs.summary.total}`)
    console.log(`   Pending: ${data.etlJobs.summary.byStatus.pending}`)
    console.log(`   Running: ${data.etlJobs.summary.byStatus.running}`)
    console.log(`   Completed: ${data.etlJobs.summary.byStatus.completed}`)
    console.log(`   Failed: ${data.etlJobs.summary.byStatus.failed}`)
    
    // Demographics Jobs
    console.log(`\n📈 Demographics Jobs:`)
    console.log(`   Total: ${data.demographicsSync.jobs.counts.total}`)
    console.log(`   Pending: ${data.demographicsSync.jobs.counts.pending}`)
    console.log(`   Running: ${data.demographicsSync.jobs.counts.running}`)
    console.log(`   Completed: ${data.demographicsSync.jobs.counts.completed}`)
    console.log(`   Failed: ${data.demographicsSync.jobs.counts.failed}`)
    
    // Analysis
    console.log(`\n🔍 ANALYSIS:`)
    console.log(`   Is Stuck: ${data.analysis.isStuck ? '🚨 YES' : '✅ NO'}`)
    console.log(`   Has Running Jobs: ${data.analysis.hasRunningJobs ? '✅ YES' : '❌ NO'}`)
    console.log(`   Has Pending Jobs: ${data.analysis.hasPendingJobs ? '✅ YES' : '❌ NO'}`)
    console.log(`   Last Activity: ${data.analysis.lastActivity}`)
    
    // Recent data
    if (data.demographicsSync.recentData.length > 0) {
      console.log(`\n📊 Recent Data: ${data.demographicsSync.recentData.length} records`)
      console.log(`   Latest: ${data.demographicsSync.recentData[0].date_value}`)
    } else {
      console.log(`\n📊 Recent Data: ❌ No recent data found`)
    }
    
    // Recommendation
    console.log(`\n💡 RECOMMENDATION:`)
    if (data.analysis.isStuck) {
      console.log(`   🚨 SYNC IS STUCK! Use force complete to fix.`)
      console.log(`   Run: await forceCompleteSync()`)
    } else if (data.analysis.hasRunningJobs || data.analysis.hasPendingJobs) {
      console.log(`   ⏳ Sync appears to be working. Wait a few more minutes.`)
    } else {
      console.log(`   ✅ Sync appears complete or ready for new sync.`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function forceCompleteSync() {
  try {
    console.log(`🔧 Force completing stuck sync for brand: ${BRAND_ID}`)
    
    const response = await fetch(`${BASE_URL}/api/debug/force-complete-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: BRAND_ID, confirm: true })
    })
    
    const data = await response.json()
    
    if (!data.success) {
      console.error('❌ Error force completing sync:', data.error)
      return
    }
    
    console.log('\n✅ FORCE COMPLETE SUCCESSFUL!')
    console.log('='.repeat(40))
    console.log(`🔧 Stuck jobs fixed: ${data.actions.stuckJobsFixed}`)
    console.log(`🎯 Trigger jobs fixed: ${data.actions.triggerJobsFixed}`)
    console.log(`📱 Connection updated: ${data.actions.connectionUpdated}`)
    console.log(`📊 Demographics updated: ${data.actions.demographicsUpdated}`)
    
    console.log('\n📊 Final Job Counts:')
    console.log(`   Total: ${data.finalJobCounts.total}`)
    console.log(`   Pending: ${data.finalJobCounts.pending}`)
    console.log(`   Running: ${data.finalJobCounts.running}`)
    console.log(`   Completed: ${data.finalJobCounts.completed}`)
    console.log(`   Failed: ${data.finalJobCounts.failed}`)
    
    console.log('\n🎉 Sync should now show as completed! Refresh your dashboard.')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Instructions
console.log('🚀 SYNC DEBUG HELPER')
console.log('='.repeat(30))
console.log('1. Update BRAND_ID at the top of this file')
console.log('2. Run: await checkSyncStatus()')
console.log('3. If stuck, run: await forceCompleteSync()')
console.log('')

// Auto-check if BRAND_ID is set
if (BRAND_ID !== "YOUR_BRAND_ID") {
  console.log('🔍 Auto-checking sync status...')
  checkSyncStatus()
} else {
  console.log('⚠️  Please update BRAND_ID first!')
}
