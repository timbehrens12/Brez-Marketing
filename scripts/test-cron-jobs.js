#!/usr/bin/env node

/**
 * Test script for cron jobs
 * 
 * Usage:
 * node scripts/test-cron-jobs.js
 * 
 * Make sure to set CRON_SECRET and NEXT_PUBLIC_APP_URL in your environment
 */

const https = require('https');
const http = require('http');

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET environment variable is required');
  process.exit(1);
}

console.log(`🧪 Testing cron jobs for: ${APP_URL}`);
console.log(`🔑 Using CRON_SECRET: ${CRON_SECRET.substring(0, 8)}...`);

/**
 * Make a request to a cron endpoint
 */
function testCronEndpoint(path, description) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, APP_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    console.log(`\n🔄 Testing ${description}...`);
    console.log(`📍 URL: ${url.toString()}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'User-Agent': 'Brez-Cron-Test'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          console.log(`✅ ${description} - SUCCESS`);
          try {
            const parsed = JSON.parse(data);
            console.log(`📋 Result:`, parsed);
          } catch (e) {
            console.log(`📋 Response:`, data.substring(0, 200));
          }
        } else {
          console.log(`❌ ${description} - FAILED`);
          console.log(`📋 Response:`, data.substring(0, 500));
        }
        
        resolve({ success: res.statusCode === 200, status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${description} - ERROR`);
      console.error(error.message);
      reject(error);
    });

    // Set a timeout
    req.setTimeout(30000, () => {
      console.log(`⏰ ${description} - TIMEOUT`);
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Test cache invalidation
 */
function testCacheInvalidation() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/cache/invalidate', APP_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    console.log(`\n🔄 Testing Cache Invalidation...`);
    
    const postData = JSON.stringify({
      pattern: 'test-.*',
      reason: 'manual-test'
    });
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Brez-Cron-Test'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          console.log(`✅ Cache Invalidation - SUCCESS`);
          try {
            const parsed = JSON.parse(data);
            console.log(`📋 Result:`, parsed);
          } catch (e) {
            console.log(`📋 Response:`, data.substring(0, 200));
          }
        } else {
          console.log(`❌ Cache Invalidation - FAILED`);
          console.log(`📋 Response:`, data.substring(0, 500));
        }
        
        resolve({ success: res.statusCode === 200, status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Cache Invalidation - ERROR`);
      console.error(error.message);
      reject(error);
    });

    req.setTimeout(30000, () => {
      console.log(`⏰ Cache Invalidation - TIMEOUT`);
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting cron job tests...\n');
  
  const tests = [
    {
      path: '/api/cron/daily-sync',
      description: 'Daily Sync (Full)'
    },
    {
      path: '/api/cron/midday-refresh',
      description: 'Midday Refresh (Light)'
    }
  ];
  
  const results = [];
  
  // Test cron endpoints
  for (const test of tests) {
    try {
      const result = await testCronEndpoint(test.path, test.description);
      results.push({ ...test, ...result });
    } catch (error) {
      results.push({ ...test, success: false, error: error.message });
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Test cache invalidation
  try {
    const cacheResult = await testCacheInvalidation();
    results.push({ path: '/api/cache/invalidate', description: 'Cache Invalidation', ...cacheResult });
  } catch (error) {
    results.push({ path: '/api/cache/invalidate', description: 'Cache Invalidation', success: false, error: error.message });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.description} (${result.path})`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n🎯 Results: ${successful}/${total} tests passed`);
  
  if (successful === total) {
    console.log('🎉 All cron jobs are working correctly!');
  } else {
    console.log('⚠️  Some cron jobs need attention. Check the logs above.');
  }
}

// Run the tests
runTests().catch(console.error); 