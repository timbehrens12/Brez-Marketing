#!/usr/bin/env node
/**
 * Test script for Shopify V2 Architecture
 * 
 * This script tests the new database schema and verifies
 * that all tables and functions are created correctly.
 */

const { createClient } = require('@supabase/supabase-js')

// You'll need to add these to your environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testV2Architecture() {
  console.log('🧪 Testing Shopify V2 Architecture...\n')

  try {
    // Test 1: Check control schema tables
    console.log('1. Testing control schema...')
    const { data: jobs, error: jobsError } = await supabase
      .from('control.etl_job')
      .select('*')
      .limit(1)
    
    if (jobsError) throw new Error(`Control.etl_job error: ${jobsError.message}`)
    console.log('   ✅ control.etl_job table exists')

    const { data: cursors, error: cursorsError } = await supabase
      .from('control.etl_cursor') 
      .select('*')
      .limit(1)

    if (cursorsError) throw new Error(`Control.etl_cursor error: ${cursorsError.message}`)
    console.log('   ✅ control.etl_cursor table exists')

    // Test 2: Check staging schema tables  
    console.log('\n2. Testing staging schema...')
    const stagingTables = ['stage.shopify_orders', 'stage.shopify_customers', 'stage.shopify_products']
    
    for (const table of stagingTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) throw new Error(`${table} error: ${error.message}`)
      console.log(`   ✅ ${table} table exists`)
    }

    // Test 3: Test promotion functions
    console.log('\n3. Testing promotion functions...')
    const testBrandId = '00000000-0000-0000-0000-000000000000'
    
    const { data: ordersResult, error: ordersError } = await supabase
      .rpc('promote_orders_to_production', { brand_id_param: testBrandId })
    
    if (ordersError) throw new Error(`promote_orders_to_production error: ${ordersError.message}`)
    console.log('   ✅ promote_orders_to_production function works')

    const { data: customersResult, error: customersError } = await supabase
      .rpc('promote_customers_to_production', { brand_id_param: testBrandId })
    
    if (customersError) throw new Error(`promote_customers_to_production error: ${customersError.message}`)
    console.log('   ✅ promote_customers_to_production function works')

    const { data: productsResult, error: productsError } = await supabase
      .rpc('promote_products_to_production', { brand_id_param: testBrandId })
    
    if (productsError) throw new Error(`promote_products_to_production error: ${productsError.message}`)
    console.log('   ✅ promote_products_to_production function works')

    console.log('\n🎉 All tests passed! Shopify V2 Architecture is ready!')
    console.log('\n📋 Next steps:')
    console.log('1. Set up Redis (see setup-shopify-v2.md)')
    console.log('2. Add Redis environment variables')
    console.log('3. Start using the new connection flow')

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`)
    console.log('\n🔧 Check that you have run all the database migrations')
    process.exit(1)
  }
}

testV2Architecture()
