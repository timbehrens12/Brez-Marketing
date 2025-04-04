/**
 * This script performs a full reset and resync of Meta data tables
 * It should be run when Meta data is showing incorrectly or needs to be rebuilt
 */

import { createClient } from '@supabase/supabase-js'

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function resyncMetaData(brandId: string) {
  console.log(`\n========== STARTING META DATA RESYNC FOR BRAND ${brandId} ==========\n`)
  
  try {
    // 1. Check if the Meta connection exists and is valid
    console.log('Checking Meta connection...')
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()
    
    if (connectionError || !connection) {
      console.error('❌ No active Meta connection found for this brand:', connectionError)
      return
    }
    
    console.log(`✅ Found Meta connection: ${connection.id}`)
    
    // 2. Clear all Meta insights tables
    console.log('\nClearing Meta data tables...')
    
    // Delete meta_ad_insights data
    console.log('- Clearing meta_ad_insights table')
    const { error: insightsError } = await supabase
      .from('meta_ad_insights')
      .delete()
      .eq('brand_id', brandId)
    
    if (insightsError) {
      console.error('❌ Error clearing meta_ad_insights:', insightsError)
    } else {
      console.log('✅ Successfully cleared meta_ad_insights')
    }
    
    // 3. Trigger the resync endpoint
    console.log('\nTriggering full data resync...')
    
    // Calculate date range (90 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 90)
    
    console.log(`Fetching data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
    
    // First, fetch and save new insights data
    console.log('- Calling API to fetch new insights data (this may take a while)...')
    
    // Use fetch to call the /api/meta/resync endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resyncUrl = `${baseUrl}/api/meta/resync?brandId=${brandId}`
    
    try {
      const response = await fetch(resyncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          days: 90,
          force_refresh: true
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Resync API error (${response.status}):`, errorText)
      } else {
        const result = await response.json()
        console.log(`✅ Successfully resynced ${result.insights || 0} insights`)
      }
    } catch (error) {
      console.error('❌ Error calling resync API:', error)
    }
    
    console.log('\n========== META DATA RESYNC COMPLETE ==========\n')
    console.log('What to do next:')
    console.log('1. Verify data in the Meta Dashboard')
    console.log('2. Check campaigns, ad sets, and metrics')
    console.log('3. If issues persist, check API logs for errors')
    
  } catch (error) {
    console.error('❌ Unexpected error during resync:', error)
  }
}

// Get brand ID from command line args
const brandId = process.argv[2]

if (!brandId) {
  console.error('Please provide a brand ID as a command line argument')
  console.log('Usage: npx tsx lib/scripts/resync-meta-db.ts BRAND_ID')
  process.exit(1)
}

// Run the script
resyncMetaData(brandId)
  .catch(console.error)
  .finally(() => {
    console.log('\nScript execution complete')
    process.exit(0)
  }) 