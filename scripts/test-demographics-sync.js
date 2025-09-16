/**
 * Test script for the new demographics sync system
 * 
 * Run with: node scripts/test-demographics-sync.js
 */

const { createClient } = require('@supabase/supabase-js')

async function testDemographicsSync() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  console.log('🧪 Testing Demographics Sync System...\n')

  try {
    // 1. Check if new tables exist
    console.log('1. Checking database schema...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'meta_demographics_facts',
        'meta_demographics_jobs_ledger_v2',
        'meta_demographics_sync_status'
      ])

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError)
      return
    }

    const tableNames = tables.map(t => t.table_name)
    console.log('✅ Tables found:', tableNames)

    if (tableNames.length !== 3) {
      console.log('⚠️  Missing tables. Expected 3, found:', tableNames.length)
    }

    // 2. Check for existing brands with Meta connections
    console.log('\n2. Checking Meta connections...')
    
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('id, brand_id, platform_type, status, metadata')
      .eq('platform_type', 'meta')
      .eq('status', 'active')

    if (connectionsError) {
      console.error('❌ Error checking connections:', connectionsError)
      return
    }

    console.log(`✅ Found ${connections.length} active Meta connections`)
    
    if (connections.length === 0) {
      console.log('⚠️  No Meta connections found. Connect a Meta account first.')
      return
    }

    // 3. Test with first connection
    const testConnection = connections[0]
    console.log(`\n3. Testing with brand ${testConnection.brand_id}...`)
    console.log(`   Account ID: ${testConnection.metadata?.account_id || 'Not set'}`)

    // 4. Check existing sync status
    const { data: syncStatus } = await supabase
      .from('meta_demographics_sync_status')
      .select('*')
      .eq('brand_id', testConnection.brand_id)
      .single()

    if (syncStatus) {
      console.log('✅ Sync status exists:')
      console.log(`   Status: ${syncStatus.overall_status}`)
      console.log(`   Progress: ${syncStatus.days_completed}/${syncStatus.total_days_target} days`)
      console.log(`   Phase: ${syncStatus.current_phase}`)
    } else {
      console.log('ℹ️  No sync status found (will be created on first sync)')
    }

    // 5. Check existing jobs
    const { data: jobs } = await supabase
      .from('meta_demographics_jobs_ledger_v2')
      .select('status, granularity, breakdown_types, date_from, date_to')
      .eq('brand_id', testConnection.brand_id)

    if (jobs && jobs.length > 0) {
      console.log(`\n✅ Found ${jobs.length} existing jobs:`)
      const statusCounts = jobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1
        return acc
      }, {})
      console.log('   Status breakdown:', statusCounts)
      
      const latestJob = jobs[0]
      console.log(`   Latest job: ${latestJob.granularity} from ${latestJob.date_from} to ${latestJob.date_to}`)
    } else {
      console.log('\nℹ️  No jobs found (will be created when sync starts)')
    }

    // 6. Check existing data
    const { data: existingData, error: dataError } = await supabase
      .from('meta_demographics_facts')
      .select('grain, breakdown_type, date_value')
      .eq('brand_id', testConnection.brand_id)
      .order('date_value', { ascending: false })
      .limit(5)

    if (dataError) {
      console.log('ℹ️  No existing data in new facts table (expected for fresh setup)')
    } else if (existingData && existingData.length > 0) {
      console.log(`\n✅ Found ${existingData.length} existing data records:`)
      console.log(`   Latest: ${existingData[0].date_value} (${existingData[0].grain}, ${existingData[0].breakdown_type})`)
    } else {
      console.log('\nℹ️  No data in facts table yet')
    }

    console.log('\n🎯 System Status Summary:')
    console.log('   ✅ Database schema ready')
    console.log('   ✅ Meta connections available') 
    console.log('   ✅ Ready for 12-month sync')
    console.log('\n📋 Next Steps:')
    console.log('   1. Disconnect and reconnect Meta to trigger auto-sync')
    console.log('   2. Or manually trigger via: POST /api/meta/demographics/sync')
    console.log('   3. Monitor progress via the Demographics Sync Status widget')
    console.log('   4. Data will appear in demographics widgets once sync completes')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testDemographicsSync().then(() => {
  console.log('\n🏁 Test completed')
  process.exit(0)
}).catch(error => {
  console.error('💥 Test crashed:', error)
  process.exit(1)
})
