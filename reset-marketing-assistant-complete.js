/**
 * ============================================
 * MARKETING ASSISTANT COMPLETE RESET SCRIPT
 * ============================================
 * 
 * This script completely resets the Marketing Assistant
 * to a clean state as if you just connected Meta for the first time.
 * 
 * INSTRUCTIONS:
 * 1. Go to the Marketing Assistant page
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Wait for the countdown to complete
 * 6. Page will auto-refresh
 * 
 * WHAT IT DOES:
 * - Clears all localStorage data for this brand
 * - Deletes all AI recommendations from database
 * - Clears all performance tracking data
 * - Clears all usage logs (mark as done records)
 * - Resets optimization action logs
 * - Clears the optimization timeline
 * - Hard refreshes the page with cache cleared
 */

(async function resetMarketingAssistantComplete() {
  console.log('%c🧹 COMPLETE MARKETING ASSISTANT RESET', 'font-size: 16px; font-weight: bold; color: #FF2A2A;')
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;')
  
  // Get brand ID from current URL or localStorage
  const getBrandId = () => {
    // Try to get from localStorage keys
    const keys = Object.keys(localStorage)
    const recommendationKey = keys.find(k => k.startsWith('recommendationsViewed_'))
    if (recommendationKey) {
      return recommendationKey.replace('recommendationsViewed_', '')
    }
    
    // Try to get from URL
    const urlParams = new URLSearchParams(window.location.search)
    const brandId = urlParams.get('brandId')
    if (brandId) return brandId
    
    // Prompt user
    return prompt('⚠️ Could not detect Brand ID automatically.\n\nPlease enter your Brand ID:')
  }

  const brandId = getBrandId()
  
  if (!brandId) {
    console.error('%c❌ ERROR: No brand ID provided', 'color: #FF2A2A; font-weight: bold;')
    console.log('%cReset cancelled. Please make sure you are on the Marketing Assistant page.', 'color: #FF9500;')
    return
  }

  console.log(`%c📍 Brand ID: ${brandId}`, 'color: #10b981; font-weight: bold;')
  console.log('')

  try {
    // ============================================
    // STEP 1: Clear localStorage
    // ============================================
    console.log('%c💾 STEP 1/4: Clearing localStorage...', 'color: #3b82f6; font-weight: bold;')
    
    const keysToRemove = [
      `recommendationsViewed_${brandId}`,
      `completedItems_${brandId}`,
      `lastRefreshDate_${brandId}`,
      `marketing_assistant_widgets_${brandId}`,
      `optimization_timeline_${brandId}`
    ]
    
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key)
        console.log(`   ✓ Removed: ${key}`)
      }
    })
    console.log('%c   ✅ localStorage cleared', 'color: #10b981;')
    console.log('')

    // ============================================
    // STEP 2: Delete recommendations and tracking
    // ============================================
    console.log('%c📋 STEP 2/4: Deleting AI recommendations & tracking...', 'color: #3b82f6; font-weight: bold;')
    
    const deleteResponse = await fetch(`/api/marketing-assistant/recommendations?brandId=${brandId}&secret=reset-ai-recs`, {
      method: 'DELETE',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
    
    if (deleteResponse.ok) {
      const result = await deleteResponse.json()
      console.log(`   ✓ Recommendations deleted: ${result.message || 'Success'}`)
      console.log('%c   ✅ Database cleaned', 'color: #10b981;')
    } else {
      const error = await deleteResponse.text()
      console.warn(`   ⚠️ Delete response: ${deleteResponse.status} - ${error}`)
      console.log('%c   ℹ️ Continuing with reset...', 'color: #FF9500;')
    }
    console.log('')

    // ============================================
    // STEP 3: Clear usage tracking
    // ============================================
    console.log('%c📊 STEP 3/4: Resetting usage tracking...', 'color: #3b82f6; font-weight: bold;')
    
    const resetUsageResponse = await fetch(`/api/marketing-assistant/reset-usage?brandId=${brandId}`, {
      method: 'DELETE',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
    
    if (resetUsageResponse.ok) {
      console.log('   ✓ Usage tracking reset')
      console.log('%c   ✅ Weekly limit reset', 'color: #10b981;')
    } else {
      console.log('   ℹ️ Usage tracking endpoint returned:', resetUsageResponse.status)
    }
    console.log('')

    // ============================================
    // STEP 4: Prepare for reload
    // ============================================
    console.log('%c🔄 STEP 4/4: Preparing to reload page...', 'color: #3b82f6; font-weight: bold;')
    console.log('')
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;')
    console.log('%c✨ RESET COMPLETE!', 'font-size: 16px; font-weight: bold; color: #10b981;')
    console.log('')
    console.log('%c📝 What to expect after reload:', 'font-weight: bold;')
    console.log('   • All widgets will be empty')
    console.log('   • "Update Analysis" button will be available')
    console.log('   • Click it to generate your first recommendations')
    console.log('   • All widgets will populate with fresh data')
    console.log('')
    
    // Countdown before reload
    console.log('%c⏳ Auto-reloading in:', 'color: #3b82f6; font-weight: bold;')
    
    for (let i = 3; i > 0; i--) {
      console.log(`%c   ${i}...`, 'font-size: 18px; color: #FF2A2A;')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log('')
    console.log('%c🚀 Reloading page with cache cleared...', 'color: #10b981; font-weight: bold;')
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;')
    
    // Force hard refresh (bypasses cache)
    setTimeout(() => {
      window.location.reload(true)
    }, 500)
    
  } catch (error) {
    console.log('')
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;')
    console.error('%c❌ ERROR DURING RESET:', 'color: #FF2A2A; font-weight: bold;')
    console.error(error)
    console.log('')
    console.log('%c⚠️ Some data may have been cleared. Please refresh the page manually.', 'color: #FF9500;')
  }
})()
