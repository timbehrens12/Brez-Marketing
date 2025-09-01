#!/usr/bin/env node
/**
 * Shopify V2 Worker Startup Script
 * 
 * This script initializes the Bull queue worker for processing
 * Shopify sync jobs in the background.
 */

require('dotenv').config({ path: '.env.local' })

console.log('🚀 Starting Shopify V2 Worker...')

// Set worker mode
process.env.WORKER_MODE = 'true'

// Import and initialize the worker
const { ShopifyWorker } = require('../lib/workers/shopifyWorker')

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

console.log('✅ Shopify V2 Worker is running!')
console.log('📊 Ready to process sync jobs...')

// Keep the process alive
process.stdin.resume()
