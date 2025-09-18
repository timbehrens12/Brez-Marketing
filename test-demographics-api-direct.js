#!/usr/bin/env node

/**
 * TEST THE DEMOGRAPHICS API DIRECTLY
 * 
 * Let's call the /api/meta/sync-demographics endpoint with proper auth
 * to see what happens and get real data into meta_demographics table
 */

const https = require('https')

const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720'

console.log('🧪 TESTING DEMOGRAPHICS API DIRECTLY...')

async function testDemographicsAPI() {
  try {
    console.log('📡 Calling /api/meta/sync-demographics directly...')
    
    const postData = JSON.stringify({
      brandId: BRAND_ID
    })
    
    const options = {
      hostname: 'www.brezmarketingdashboard.com',
      port: 443,
      path: '/api/meta/sync-demographics',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Direct-API-Test/1.0'
      }
    }
    
    const req = https.request(options, (res) => {
      console.log(`📊 Status: ${res.statusCode}`)
      console.log(`📊 Headers:`, res.headers)
      
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        console.log('📊 Response:', data)
        
        if (res.statusCode === 200) {
          console.log('✅ API call succeeded!')
          console.log('🎯 Check the database for new demographics data')
        } else {
          console.log('❌ API call failed')
          console.log('🔍 This explains why demographics data is not populating')
        }
      })
    })
    
    req.on('error', (err) => {
      console.error('❌ Request error:', err)
    })
    
    req.write(postData)
    req.end()
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testDemographicsAPI()
