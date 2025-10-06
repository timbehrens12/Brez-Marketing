/**
 * Marketing Assistant Browser Reset Script
 * 
 * INSTRUCTIONS:
 * 1. Go to the Marketing Assistant page
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Refresh the page (F5)
 * 
 * This will:
 * - Clear all localStorage related to Marketing Assistant
 * - Clear AI recommendations from the database (via API)
 * - Reset the page to fresh state
 */

(async function resetMarketingAssistant() {
  console.log('🧹 Starting Marketing Assistant Reset...\n')
  
  // Get brand ID from current URL or prompt user
  const getBrandId = () => {
    // Try to get from localStorage keys
    const keys = Object.keys(localStorage)
    const recommendationKey = keys.find(k => k.startsWith('recommendationsViewed_'))
    if (recommendationKey) {
      return recommendationKey.replace('recommendationsViewed_', '')
    }
    
    // If not found, prompt user
    return prompt('Enter your Brand ID:')
  }
  
  const brandId = getBrandId()
  
  if (!brandId) {
    console.error('❌ No brand ID found. Please make sure you are on the Marketing Assistant page.')
    return
  }
  
  console.log(`📍 Brand ID: ${brandId}\n`)
  
  try {
    // 1. Clear localStorage
    console.log('💾 Clearing localStorage...')
    const keysToRemove = [
      `recommendationsViewed_${brandId}`,
      `completedItems_${brandId}`,
      `lastRefreshDate_${brandId}`
    ]
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`  ✓ Removed: ${key}`)
    })
    
    // 2. Delete AI recommendations via API
    console.log('\n📋 Deleting AI recommendations from database...')
    const deleteResponse = await fetch(`/api/marketing-assistant/recommendations?brandId=${brandId}&secret=reset-ai-recs`, {
      method: 'DELETE'
    })
    
    if (deleteResponse.ok) {
      console.log('  ✓ AI recommendations deleted')
    } else {
      console.warn('  ⚠️  Failed to delete recommendations (may not exist)')
    }
    
    console.log('\n✨ Reset complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Refresh this page (F5)')
    console.log('   2. All widgets should be empty')
    console.log('   3. Click "Update Recommendations" to generate first analysis')
    console.log('   4. All widgets will populate with data')
    
    // Ask if user wants to refresh now
    if (confirm('Reset complete! Refresh the page now?')) {
      window.location.reload()
    }
    
  } catch (error) {
    console.error('❌ Error during reset:', error)
  }
})()

