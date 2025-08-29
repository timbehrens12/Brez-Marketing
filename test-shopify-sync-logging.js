// Test script to verify Shopify sync logging is working
// Run with: node test-shopify-sync-logging.js

const fetch = require('node-fetch');

async function testShopifySync() {
  const testBrandId = process.argv[2] || 'test-brand-id';

  console.log('🧪 Testing Shopify sync with enhanced logging...');
  console.log(`📋 Test Brand ID: ${testBrandId}`);
  console.log('');

  try {
    const response = await fetch('http://localhost:3000/api/cron/shopify-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brandId: testBrandId,
        force_refresh: true,
        test_mode: true
      }),
    });

    const result = await response.json();

    console.log('📊 Sync Response:');
    console.log(`Status: ${response.status}`);
    console.log(`Sync ID: ${result.syncId || 'N/A'}`);
    console.log(`Success: ${result.success}`);
    console.log(`Message: ${result.message}`);
    console.log(`Synced: ${result.synced}`);
    console.log(`Errors: ${result.errors}`);
    console.log('');

    if (result.results) {
      console.log('📋 Connection Results:');
      result.results.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.shop || 'Unknown Shop'}: ${r.status} (${r.syncId || 'No ID'})`);
        if (r.error) {
          console.log(`     Error: ${r.error}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions
console.log('🔍 SHOPIFY SYNC LOGGING TEST');
console.log('===============================');
console.log('');
console.log('This script tests the enhanced Shopify sync logging.');
console.log('');
console.log('USAGE:');
console.log('  node test-shopify-sync-logging.js [brandId]');
console.log('');
console.log('WHAT TO LOOK FOR:');
console.log('1. Backend logs should show:');
console.log('   - [SYNC_...] [INFO] SYNC_STARTED');
console.log('   - [SYNC_...] [INFO] SYNC_CONNECTIONS_FOUND');
console.log('   - [SYNC_...] [INFO] SYNC_CONNECTION_STARTED');
console.log('   - [SYNC_...] [INFO] SYNC_RECENT_DATA_STARTED');
console.log('   - [MINI_...] [INFO] STARTING MINI-SYNC');
console.log('   - [MINI_...] [INFO] Found X recent orders');
console.log('   - [MINI_...] [INFO] SUCCESSFULLY BULK STORED X orders');
console.log('');
console.log('2. Frontend logs (in browser console):');
console.log('   - [FRONTEND_...] [INFO] SYNC_FRONTEND_STARTED');
console.log('   - [FRONTEND_...] [INFO] SYNC_API_CALL_STARTED');
console.log('   - [FRONTEND_...] [INFO] SYNC_API_SUCCESS');
console.log('');
console.log('3. Local storage logs (in browser dev tools):');
console.log('   - Check localStorage.getItem("shopify_sync_logs")');
console.log('');

// Run the test if a brand ID is provided
if (process.argv[2]) {
  testShopifySync();
} else {
  console.log('⚠️  No brand ID provided. Use: node test-shopify-sync-logging.js <brandId>');
  console.log('');
  console.log('To find a valid brand ID:');
  console.log('1. Go to your app dashboard');
  console.log('2. Check the URL for the brand ID parameter');
  console.log('3. Or check the database for existing brands');
}
