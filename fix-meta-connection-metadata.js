// Fix Meta Connection Metadata
// Run this in browser console to fix the missing Meta account ID

const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🔧 META CONNECTION METADATA FIX')
console.log('='.repeat(40))

async function checkMetaConnection() {
  try {
    console.log('🔍 Step 1: Checking current Meta connection...')
    
    // Get connection details
    const response = await fetch(`https://www.brezmarketingdashboard.com/api/platforms/sync-status?brandId=${BRAND_ID}&platformType=meta`)
    const result = await response.json()
    
    console.log('📊 Connection Status:', result)
    
    if (result.success) {
      console.log('✅ Meta connection found')
      console.log('🔗 Connection metadata:', result.connection_metadata)
      
      if (result.connection_metadata?.ad_account_id || result.connection_metadata?.account_id) {
        console.log('✅ Account ID found in metadata!')
        console.log('💡 Retrying demographics sync with existing metadata...')
        triggerDemographicsSync()
      } else {
        console.log('❌ Missing account ID in metadata')
        console.log('🔧 Need to fix the metadata first...')
        fixMetaConnectionMetadata()
      }
    } else {
      console.log('❌ Failed to get connection status')
      console.log('Error:', result.error)
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error)
  }
}

async function fixMetaConnectionMetadata() {
  try {
    console.log('🔧 Step 2: Attempting to fix Meta connection metadata...')
    
    // Try to refresh the Meta connection by calling the complete endpoint
    // This should re-fetch account details and update metadata
    const response = await fetch('https://www.brezmarketingdashboard.com/api/auth/meta/refresh-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: BRAND_ID })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Metadata refresh response:', result)
      
      // Wait a moment then check again
      setTimeout(() => {
        console.log('🔍 Checking metadata after refresh...')
        checkMetaConnection()
      }, 2000)
      
    } else {
      console.log('❌ Metadata refresh failed, trying alternative method...')
      manualMetadataFix()
    }
    
  } catch (error) {
    console.error('❌ Metadata refresh error:', error)
    console.log('🔧 Trying manual metadata fix...')
    manualMetadataFix()
  }
}

async function manualMetadataFix() {
  console.log('🔧 Manual metadata fix - checking existing campaign data...')
  
  try {
    // Check if we have existing Meta data that contains account ID
    const response = await fetch(`https://www.brezmarketingdashboard.com/api/meta/campaigns?brandId=${BRAND_ID}&limit=1`)
    const data = await response.json()
    
    if (data.success && data.campaigns && data.campaigns.length > 0) {
      const campaign = data.campaigns[0]
      console.log('📊 Found existing campaign data:', campaign)
      
      // Extract account ID from campaign data
      const accountId = campaign.account_id || campaign.ad_account_id
      
      if (accountId) {
        console.log(`✅ Found account ID in campaign data: ${accountId}`)
        console.log('🔧 This should be updated in the platform_connections metadata')
        console.log('💡 Try reconnecting Meta to fix the metadata automatically')
        
        // Show the user what to do
        console.log('\n🎯 SOLUTION:')
        console.log('1. Go to Settings > Connection Management')
        console.log('2. Disconnect Meta Ads')
        console.log('3. Reconnect Meta Ads')
        console.log('4. This will refresh the metadata with the correct account ID')
        
      } else {
        console.log('❌ No account ID found in campaign data either')
      }
    } else {
      console.log('❌ No existing campaign data found')
    }
    
  } catch (error) {
    console.error('❌ Error checking campaign data:', error)
  }
}

async function triggerDemographicsSync() {
  try {
    console.log('🚀 Step 3: Triggering demographics sync...')
    
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
    } else {
      console.log('❌ Demographics sync still failed')
      console.log('Error:', result.error || result.message)
    }
    
  } catch (error) {
    console.error('❌ Demographics sync error:', error)
  }
}

// Auto-start the diagnosis
console.log('🎯 Starting Meta connection diagnosis...')
checkMetaConnection()

// Export functions for manual use
window.checkMetaConnection = checkMetaConnection
window.fixMetaConnectionMetadata = fixMetaConnectionMetadata
window.triggerDemographicsSync = triggerDemographicsSync

console.log('\n💡 Available commands:')
console.log('- checkMetaConnection() - Check current connection status')
console.log('- fixMetaConnectionMetadata() - Try to fix metadata')
console.log('- triggerDemographicsSync() - Try demographics sync again')
