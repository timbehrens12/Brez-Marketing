// Helper to get your brand ID from the browser console
// Run this in your browser console on the dashboard page

function getBrandId() {
  // Try to get from URL
  const urlParams = new URLSearchParams(window.location.search)
  const brandFromUrl = urlParams.get('brandId')
  if (brandFromUrl) {
    console.log('✅ Brand ID from URL:', brandFromUrl)
    return brandFromUrl
  }
  
  // Try to get from localStorage
  const keys = Object.keys(localStorage)
  const brandKeys = keys.filter(key => key.includes('brand') || key.includes('Brand'))
  
  console.log('🔍 Checking localStorage for brand ID...')
  brandKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key)
      console.log(`   ${key}: ${value}`)
    } catch (e) {
      console.log(`   ${key}: [error reading]`)
    }
  })
  
  // Try to get from window object
  if (window._currentBrandId) {
    console.log('✅ Brand ID from window:', window._currentBrandId)
    return window._currentBrandId
  }
  
  // Manual instructions
  console.log('')
  console.log('📋 Manual ways to find Brand ID:')
  console.log('1. Go to Settings page')
  console.log('2. Open browser dev tools (F12)')
  console.log('3. Check Network tab for API calls')
  console.log('4. Look for "brandId" parameter in requests')
  console.log('')
  console.log('Or check the URL when you select a brand in the dashboard')
  
  return null
}

// Auto-run
console.log('🔍 BRAND ID FINDER')
console.log('='.repeat(20))
getBrandId()
