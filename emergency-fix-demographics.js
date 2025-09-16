// EMERGENCY DEMOGRAPHICS FIX - BYPASS THE BROKEN OAUTH
// Run this in browser console to force fix the issue

const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🚨 EMERGENCY DEMOGRAPHICS FIX')
console.log('='.repeat(35))

async function emergencyFix() {
  try {
    console.log('🔥 Step 1: Force disconnecting Meta...')
    
    // Force disconnect
    const disconnectResponse = await fetch('/api/meta/force-disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: BRAND_ID })
    })
    
    console.log('Disconnect result:', await disconnectResponse.text())
    
    console.log('⏳ Waiting 3 seconds...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    console.log('🔗 Step 2: Getting new Meta auth URL...')
    
    // Get auth URL
    const authResponse = await fetch(`/api/auth/meta?brandId=${BRAND_ID}`)
    
    if (authResponse.status === 307 || authResponse.status === 302) {
      const authUrl = authResponse.headers.get('location') || authResponse.url
      console.log('✅ Got auth URL:', authUrl)
      console.log('')
      console.log('🎯 MANUAL STEPS REQUIRED:')
      console.log('========================')
      console.log('1. Open this URL in a new tab:')
      console.log(authUrl)
      console.log('')
      console.log('2. Complete the Meta authorization')
      console.log('3. Come back here and run: checkStatus()')
      
      // Make the URL clickable
      window.open(authUrl, '_blank')
      
    } else {
      console.log('❌ Failed to get auth URL')
      
      // Try alternative method
      console.log('🔧 Trying alternative: redirecting to Meta auth...')
      window.location.href = `/api/auth/meta?brandId=${BRAND_ID}`
    }
    
  } catch (error) {
    console.error('❌ Emergency fix error:', error)
    
    console.log('\n🔧 MANUAL FALLBACK:')
    console.log('===================')
    console.log('1. Go to Settings → Connection Management')
    console.log('2. Disconnect Meta')
    console.log('3. Connect Meta again')
    console.log('4. If that fails, there\'s a deeper OAuth bug that needs code fixes')
  }
}

async function checkStatus() {
  try {
    console.log('🔍 Checking connection status...')
    
    const response = await fetch(`/api/platforms/sync-status?brandId=${BRAND_ID}&platformType=meta`)
    const data = await response.json()
    
    console.log('📊 Status:', data)
    
    if (data.connection_metadata && Object.keys(data.connection_metadata).length > 0) {
      console.log('✅ Metadata looks good!')
      console.log('🚀 Trying demographics sync...')
      
      const syncResponse = await fetch('/api/meta/demographics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: BRAND_ID })
      })
      
      const syncResult = await syncResponse.json()
      console.log('📈 Sync result:', syncResult)
      
      if (syncResult.success) {
        console.log('🎉 SUCCESS! Demographics should start syncing!')
      }
      
    } else {
      console.log('❌ Metadata still empty - OAuth flow still broken')
      console.log('💡 Try the manual steps again or contact developer')
    }
    
  } catch (error) {
    console.error('❌ Status check error:', error)
  }
}

async function forceComplete() {
  try {
    console.log('🔧 Force completing the stuck sync at 63%...')
    
    const response = await fetch('/api/meta/reset-sync-status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: BRAND_ID, confirm: 'true' })
    })
    
    console.log('Reset result:', await response.text())
    console.log('✅ Sync should be reset - try reconnecting Meta now')
    
  } catch (error) {
    console.error('❌ Force complete error:', error)
  }
}

// Make functions available
window.checkStatus = checkStatus
window.forceComplete = forceComplete
window.emergencyFix = emergencyFix

console.log('🎯 Starting emergency fix...')
emergencyFix()

console.log('\n💡 Available commands:')
console.log('- checkStatus() - Check if connection is fixed')
console.log('- forceComplete() - Reset the stuck sync')
console.log('- emergencyFix() - Run the full emergency process again')
