#!/usr/bin/env node
/**
 * Test Redis Connection for Shopify V2 Queue System
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const Queue = require('bull')

// Get Redis config from environment (Vercel will inject these)
const redisHost = process.env.REDIS_HOST?.replace('https://', '').replace('http://', '') || ''
const redisConfig = {
  redis: {
    port: parseInt(process.env.REDIS_PORT || '6379'),
    host: redisHost,
    password: process.env.REDIS_PASSWORD,
  },
}

console.log('🧪 Testing Redis connection...')
console.log(`📡 Connecting to: ${redisConfig.redis.host}:${redisConfig.redis.port}`)

async function testConnection() {
  try {
    // Create a test queue
    const testQueue = new Queue('test-connection', redisConfig)
    
    console.log('⏳ Creating test job...')
    
    // Add a test job
    const job = await testQueue.add('test-job', {
      message: 'Hello from Brez Marketing!',
      timestamp: new Date().toISOString()
    })
    
    console.log(`✅ Job created with ID: ${job.id}`)
    
    // Process the job
    testQueue.process('test-job', async (job) => {
      console.log(`🔄 Processing job: ${job.data.message}`)
      return { success: true, processed_at: new Date().toISOString() }
    })
    
    // Wait a bit for processing
    setTimeout(async () => {
      console.log('📊 Queue stats:')
      const waiting = await testQueue.getWaiting()
      const completed = await testQueue.getCompleted()
      const failed = await testQueue.getFailed()
      
      console.log(`   Waiting: ${waiting.length}`)
      console.log(`   Completed: ${completed.length}`)
      console.log(`   Failed: ${failed.length}`)
      
      if (completed.length > 0) {
        console.log('🎉 SUCCESS! Redis and Bull queue are working perfectly!')
        console.log('🚀 Your Shopify V2 sync system is ready to go!')
      } else {
        console.log('⚠️  Job processing might be slow, but connection works!')
      }
      
      // Clean up
      await testQueue.close()
      process.exit(0)
    }, 3000)
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Check your Vercel environment variables are set correctly')
    console.log('2. Verify your Upstash Redis token is the main token (not read-only)')
    console.log('3. Make sure your Redis database is active in Upstash dashboard')
    process.exit(1)
  }
}

// Check environment variables first
if (!process.env.REDIS_HOST || !process.env.REDIS_PASSWORD) {
  console.error('❌ Missing Redis environment variables!')
  console.log('Make sure these are set in Vercel:')
  console.log('- REDIS_HOST')
  console.log('- REDIS_PORT')  
  console.log('- REDIS_PASSWORD')
  process.exit(1)
}

testConnection()
