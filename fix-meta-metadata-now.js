// EMERGENCY META METADATA FIX
// Run this in browser console to manually fix the broken connection

const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🚨 EMERGENCY META METADATA FIX')
console.log('='.repeat(40))

async function fixMetadata() {
  try {
    console.log('🔍 Step 1: Getting Meta access token from current connection...')
    
    // First, let's see if we can get the access token
    const response = await fetch('/api/debug/get-meta-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: BRAND_ID })
    })
    
    if (response.ok) {
      const tokenData = await response.json()
      console.log('✅ Got access token, trying Meta API...')
      
      // Call Meta API directly
      const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${tokenData.access_token}&fields=id,name,account_status`)
      const meData = await meResponse.json()
      
      console.log('📊 Meta API Response:', meData)
      
      if (meData.data && meData.data.length > 0) {
        const account = meData.data[0]
        console.log(`✅ Found account: ${account.name} (${account.id})`)
        
        // Update metadata via API
        const updateResponse = await fetch('/api/debug/update-meta-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            brandId: BRAND_ID,
            metadata: {
              ad_account_id: account.id,
              account_name: account.name,
              account_status: account.account_status
            }
          })
        })
        
        if (updateResponse.ok) {
          console.log('✅ Metadata updated successfully!')
          console.log('🚀 Now trying demographics sync...')
          
          // Try demographics sync
          const syncResponse = await fetch('https://www.brezmarketingdashboard.com/api/meta/demographics/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId: BRAND_ID })
          })
          
          const syncResult = await syncResponse.json()
          
          if (syncResult.success) {
            console.log('🎉 SUCCESS! Demographics sync started!')
            console.log(`📈 Jobs created: ${syncResult.jobsCreated}`)
          } else {
            console.log('❌ Demographics sync still failed:', syncResult.error)
          }
          
        } else {
          console.log('❌ Failed to update metadata')
        }
        
      } else {
        console.log('❌ No accounts found in Meta API response')
      }
      
    } else {
      console.log('❌ Could not get access token')
      console.log('🔧 Need to fix this manually via reconnection')
      
      // Show manual solution
      showManualSolution()
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    showManualSolution()
  }
}

function showManualSolution() {
  console.log('\n🔧 MANUAL SOLUTION REQUIRED:')
  console.log('==================================')
  console.log('The OAuth flow has a bug. Here\'s what to do:')
  console.log('')
  console.log('1. 🔌 Go to Settings → Connection Management')
  console.log('2. 🗑️  Click "Disconnect" on Meta Ads') 
  console.log('3. ⏳ Wait 10 seconds')
  console.log('4. 🔗 Click "Connect" to reconnect Meta Ads')
  console.log('5. ✅ The updated OAuth flow should now save metadata properly')
  console.log('')
  console.log('💡 If that doesn\'t work, the developer needs to debug the OAuth endpoint.')
}

// Try the fix
console.log('🎯 Starting emergency metadata fix...')
fixMetadata()

console.log('\n💡 If this fails, use showManualSolution()')
window.showManualSolution = showManualSolution
