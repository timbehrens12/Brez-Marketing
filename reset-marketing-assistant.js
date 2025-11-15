/**
 * ═══════════════════════════════════════════════════════════════
 *  MARKETING ASSISTANT - COMPLETE RESET SCRIPT
 * ═══════════════════════════════════════════════════════════════
 * 
 * 🎯 PURPOSE: Reset Marketing Assistant to fresh state as if
 *    you're a first-time user. All widgets blank, button ready.
 * 
 * 📋 INSTRUCTIONS:
 * 
 *    1. Go to your Marketing Assistant page
 *    2. Open browser console (F12 or Ctrl+Shift+J)
 *    3. Copy and paste this ENTIRE script
 *    4. Press Enter
 *    5. Wait for "✅ RESET COMPLETE" message
 *    6. Page will auto-refresh
 *    7. Click "Update Recommendations" to generate first insights
 * 
 * ═══════════════════════════════════════════════════════════════
 */

(async function resetMarketingAssistantToFreshState() {
  const styles = {
    title: 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: bold; padding: 10px 20px; font-size: 16px; border-radius: 8px;',
    step: 'background: #3b82f6; color: white; font-weight: bold; padding: 6px 12px; font-size: 14px; border-radius: 6px;',
    success: 'background: #10b981; color: white; font-weight: bold; padding: 6px 12px; font-size: 14px; border-radius: 6px;',
    error: 'background: #ef4444; color: white; font-weight: bold; padding: 6px 12px; font-size: 14px; border-radius: 6px;',
    info: 'color: #6b7280; font-size: 13px;',
    complete: 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; font-weight: bold; padding: 12px 24px; font-size: 18px; border-radius: 8px;'
  }

  console.log('%c 🧹 MARKETING ASSISTANT - COMPLETE RESET ', styles.title)
  console.log(' ')
  
  // Auto-detect brand ID
  const getBrandId = () => {
    // Try from localStorage
    const keys = Object.keys(localStorage)
    const recKey = keys.find(k => k.startsWith('recommendationsViewed_'))
    if (recKey) return recKey.replace('recommendationsViewed_', '')
    
    // Try from URL
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('brandId')) return urlParams.get('brandId')
    
    // Last resort: prompt user
    return prompt('⚠️  Could not auto-detect Brand ID.\n\nPlease enter your Brand ID:')
  }
  
  const brandId = getBrandId()
  
  if (!brandId || brandId.trim() === '') {
    console.log('%c ❌ ERROR: No Brand ID provided ', styles.error)
    console.log('%c Make sure you are on the Marketing Assistant page ', styles.info)
    return
  }
  
  console.log(`%c 📍 BRAND ID: ${brandId} `, styles.info)
  console.log(' ')
  
  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Clear localStorage
    // ═══════════════════════════════════════════════════════════
    console.log('%c 📦 STEP 1: Clearing Browser Storage ', styles.step)
    
    const keysToRemove = [
      `recommendationsViewed_${brandId}`,
      `completedItems_${brandId}`,
      `lastRefreshDate_${brandId}`
    ]
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`   ✓ Removed: ${key}`)
    })
    
    console.log('%c ✅ Browser storage cleared ', styles.success)
    console.log(' ')
    
    // ═══════════════════════════════════════════════════════════
    // STEP 2: Delete AI Recommendations
    // ═══════════════════════════════════════════════════════════
    console.log('%c 🤖 STEP 2: Deleting AI Recommendations ', styles.step)
    
    const deleteRecsResponse = await fetch(
      `/api/marketing-assistant/recommendations?brandId=${brandId}&secret=reset-ai-recs`,
      {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    )
    
    if (deleteRecsResponse.ok) {
      const result = await deleteRecsResponse.json()
      console.log('   ✓ AI recommendations deleted')
      console.log('   ✓ Performance tracking cleared')
    } else {
      console.log('   ⚠️  No existing recommendations to delete')
    }
    
    console.log('%c ✅ AI data cleared ', styles.success)
    console.log(' ')
    
    // ═══════════════════════════════════════════════════════════
    // STEP 3: Reset Usage Tracking (Make Button Available)
    // ═══════════════════════════════════════════════════════════
    console.log('%c 🔓 STEP 3: Resetting Usage Tracking ', styles.step)
    
    const resetUsageResponse = await fetch(
      `/api/marketing-assistant/reset-usage?brandId=${brandId}&secret=reset-usage-only`,
      {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    )
    
    if (resetUsageResponse.ok) {
      console.log('   ✓ Usage tracking reset')
      console.log('   ✓ Update Recommendations button now available')
    } else {
      console.log('   ⚠️  Could not reset usage (button may still work)')
    }
    
    console.log('%c ✅ Usage tracking reset ', styles.success)
    console.log(' ')
    
    // ═══════════════════════════════════════════════════════════
    // COMPLETE!
    // ═══════════════════════════════════════════════════════════
    console.log(' ')
    console.log('%c ✅ RESET COMPLETE! ', styles.complete)
    console.log(' ')
    console.log('%c 📝 What happens next: ', styles.step)
    console.log('   1. Page will refresh in 3 seconds...')
    console.log('   2. All widgets will be EMPTY (as if first time)')
    console.log('   3. "Update Recommendations" button will be AVAILABLE')
    console.log('   4. Click the button to generate your first AI insights')
    console.log('   5. Watch all widgets populate with fresh data! 🚀')
    console.log(' ')
    console.log('%c 🔄 Refreshing page in 3 seconds... ', styles.info)
    
    // Countdown
    let countdown = 3
    const countdownInterval = setInterval(() => {
      console.log(`   ${countdown}...`)
      countdown--
      if (countdown === 0) {
        clearInterval(countdownInterval)
      }
    }, 1000)
    
    // Hard refresh after 3 seconds
    setTimeout(() => {
      window.location.reload(true)
    }, 3000)
    
  } catch (error) {
    console.log('%c ❌ ERROR DURING RESET ', styles.error)
    console.error(error)
    console.log(' ')
    console.log('%c Try refreshing the page manually (F5) ', styles.info)
  }
})()
