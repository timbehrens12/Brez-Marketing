// Advanced Brand ID Finder - Run in browser console
// This will actively monitor network requests to find your brand ID

console.log('🔍 Advanced Brand ID Finder - Monitoring network requests...')

// Method 1: Intercept fetch requests
const originalFetch = window.fetch
let brandIdFound = null

window.fetch = function(...args) {
  const url = args[0]
  if (typeof url === 'string' && url.includes('brandId=')) {
    const urlObj = new URL(url, window.location.origin)
    const brandId = urlObj.searchParams.get('brandId')
    if (brandId && !brandIdFound) {
      brandIdFound = brandId
      console.log('✅ FOUND BRAND ID:', brandId)
      console.log('📋 Copy this ID:', brandId)
      
      // Auto-fill the debug script
      console.log('\n🚀 Ready-to-use debug commands:')
      console.log(`// 1. Check sync status:`)
      console.log(`fetch('https://www.brezmarketingdashboard.com/api/debug/sync-status?brandId=${brandId}').then(r=>r.json()).then(d=>console.log('Sync Status:',d))`)
      
      console.log(`\n// 2. Force complete if stuck:`)
      console.log(`fetch('https://www.brezmarketingdashboard.com/api/debug/force-complete-sync', {`)
      console.log(`  method: 'POST',`)
      console.log(`  headers: {'Content-Type': 'application/json'},`)
      console.log(`  body: JSON.stringify({brandId: '${brandId}', confirm: true})`)
      console.log(`}).then(r=>r.json()).then(d=>console.log('Force Complete Result:',d))`)
    }
  }
  return originalFetch.apply(this, args)
}

// Method 2: Check current page elements
function checkPageElements() {
  // Look for brand selector or brand info in DOM
  const elements = document.querySelectorAll('[data-brand-id], [data-brandid], .brand-selector, .brand-dropdown')
  elements.forEach(el => {
    const brandId = el.getAttribute('data-brand-id') || el.getAttribute('data-brandid') || el.dataset.brandId
    if (brandId) {
      console.log('✅ Found Brand ID in DOM element:', brandId)
      brandIdFound = brandId
    }
  })
  
  // Check form inputs or hidden fields
  const inputs = document.querySelectorAll('input[name*="brand"], input[id*="brand"], select[name*="brand"]')
  inputs.forEach(input => {
    if (input.value && input.value.length > 10) {
      console.log('🔍 Possible Brand ID in form input:', input.value)
    }
  })
}

// Method 3: Wait for React/Next.js to load and check props
function checkReactProps() {
  setTimeout(() => {
    // Look for React fiber data
    const allElements = document.querySelectorAll('*')
    for (let el of allElements) {
      const keys = Object.keys(el)
      const reactKey = keys.find(key => key.startsWith('__reactInternalInstance') || key.startsWith('_reactInternalFiber'))
      if (reactKey && el[reactKey]) {
        try {
          const props = el[reactKey].memoizedProps || el[reactKey].pendingProps
          if (props && props.brandId) {
            console.log('✅ Found Brand ID in React props:', props.brandId)
            brandIdFound = props.brandId
            break
          }
        } catch (e) {
          // Ignore
        }
      }
    }
  }, 2000)
}

// Method 4: Manual trigger for current page
function manualTrigger() {
  console.log('\n📋 Manual Steps:')
  console.log('1. Go to Settings → Brand Management')
  console.log('2. Open Network tab in dev tools')
  console.log('3. Refresh the page or click on a brand')
  console.log('4. Look for API calls to sync-status, brands, or similar')
  console.log('5. Check the request URL or body for brandId parameter')
  
  console.log('\n🔄 OR try triggering a sync status check:')
  console.log('1. Go to Connection Management settings')
  console.log('2. The sync progress widget should make API calls')
  console.log('3. Check Network tab for those API calls')
}

// Run all methods
checkPageElements()
checkReactProps()

console.log('\n⏳ Monitoring network requests... Refresh the page or navigate to trigger API calls.')
console.log('💡 If no Brand ID is found automatically, run manualTrigger() for manual steps.')

// Auto-restore fetch after 30 seconds
setTimeout(() => {
  if (!brandIdFound) {
    console.log('\n⚠️ No Brand ID found automatically. Try manual method:')
    manualTrigger()
  }
}, 30000)
