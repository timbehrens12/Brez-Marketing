/**
 * Reset Usage Only - Browser Script
 * 
 * INSTRUCTIONS:
 * 1. Open the Marketing Assistant page in your browser
 * 2. Open Developer Console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Refresh the page
 * 
 * This will reset ONLY the usage tracking,
 * keeping all recommendations and widget data intact.
 */

(async function resetUsageOnly() {
  console.log('🧹 Resetting AI Usage Tracking Only...\n')
  
  // Get brand ID from URL or localStorage
  const getBrandId = () => {
    const keys = Object.keys(localStorage)
    const recommendationKey = keys.find(k => k.startsWith('recommendationsViewed_'))
    if (recommendationKey) {
      return recommendationKey.replace('recommendationsViewed_', '')
    }
    return prompt('Enter your Brand ID:')
  }
  
  const brandId = getBrandId()
  if (!brandId) {
    console.error('❌ No brand ID found')
    return
  }
  
  console.log(`📍 Brand ID: ${brandId}\n`)
  
  try {
    // Call API to delete usage records only
    const response = await fetch(`/api/marketing-assistant/reset-usage?brandId=${brandId}&secret=reset-usage-only`, {
      method: 'DELETE',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
    
    if (response.ok) {
      console.log('✅ Usage tracking reset successfully')
      console.log('\n📝 Next steps:')
      console.log('   1. Refreshing page in 2 seconds...')
      console.log('   2. "Update Recommendations" button will be available')
      console.log('   3. All widgets and recommendations remain intact')
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } else {
      console.error('❌ Failed to reset usage:', await response.text())
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
})()

