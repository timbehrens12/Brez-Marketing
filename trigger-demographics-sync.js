// Manual Demographics Sync Trigger
// Run this in browser console to manually start demographics sync

const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🚀 MANUAL DEMOGRAPHICS SYNC TRIGGER')
console.log('='.repeat(40))

async function triggerDemographicsSync() {
  try {
    console.log('🔍 Step 1: Triggering demographics sync...')
    
    // Call the demographics sync endpoint directly
    const response = await fetch('https://www.brezmarketingdashboard.com/api/meta/demographics/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: BRAND_ID })
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Demographics sync triggered successfully!')
      console.log(`📊 Jobs created: ${result.jobsCreated || 'Unknown'}`)
      console.log(`💬 Message: ${result.message}`)
      
      console.log('\n⏳ Step 2: Checking sync progress...')
      
      // Wait a moment then check progress
      setTimeout(() => {
        checkDemographicsProgress()
      }, 3000)
      
    } else {
      console.log('❌ Failed to trigger demographics sync')
      console.log('Error:', result.error || result.message)
    }
    
    console.log('\n📄 Full Response:', result)
    
  } catch (error) {
    console.error('❌ Network Error:', error)
  }
}

async function checkDemographicsProgress() {
  try {
    console.log('🔍 Checking demographics progress...')
    
    const response = await fetch(`https://www.brezmarketingdashboard.com/api/test/demographics-sync?brandId=${BRAND_ID}`)
    const data = await response.json()
    
    if (data.success) {
      console.log('\n📊 DEMOGRAPHICS SYNC STATUS')
      console.log('='.repeat(30))
      
      const status = data.syncStatus
      if (status) {
        console.log(`Status: ${status.overall_status}`)
        console.log(`Progress: ${status.progress_percentage || 0}%`)
        console.log(`Days completed: ${status.days_completed || 0}`)
        console.log(`Total days: ${status.total_days_target || 0}`)
      } else {
        console.log('No sync status found - may still be initializing')
      }
      
      const jobs = data.jobStats
      console.log('\n🔧 Job Statistics:')
      console.log(`Total: ${jobs.total}`)
      console.log(`Pending: ${jobs.pending}`)
      console.log(`Running: ${jobs.running}`)
      console.log(`Completed: ${jobs.completed}`)
      console.log(`Failed: ${jobs.failed}`)
      
      if (jobs.pending > 0 || jobs.running > 0) {
        console.log('\n⏳ Sync is active! Check progress in 30 seconds.')
        
        // Auto-check again in 30 seconds
        setTimeout(() => {
          console.log('\n🔄 Auto-checking progress again...')
          checkDemographicsProgress()
        }, 30000)
      } else if (jobs.completed > 0) {
        console.log('\n✅ Demographics sync appears to be completed!')
      } else {
        console.log('\n⚠️  No jobs found - sync may not have started properly.')
      }
      
    } else {
      console.log('❌ Failed to check demographics progress')
      console.log('Error:', data.error)
    }
    
  } catch (error) {
    console.error('❌ Error checking progress:', error)
  }
}

async function forceProcessJobs() {
  try {
    console.log('🔧 Force processing demographics jobs...')
    
    const response = await fetch('https://www.brezmarketingdashboard.com/api/meta/demographics/process-jobs', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'debug-mode'}`
      }
    })
    
    const result = await response.json()
    console.log('📊 Job processing result:', result)
    
  } catch (error) {
    console.error('❌ Error processing jobs:', error)
  }
}

// Auto-start
console.log('🎯 Starting manual demographics sync...')
triggerDemographicsSync()

// Export functions for manual use
window.checkDemographicsProgress = checkDemographicsProgress
window.triggerDemographicsSync = triggerDemographicsSync
window.forceProcessJobs = forceProcessJobs

console.log('\n💡 Available commands:')
console.log('- checkDemographicsProgress() - Check current status')
console.log('- triggerDemographicsSync() - Restart demographics sync')
console.log('- forceProcessJobs() - Force process pending jobs')
