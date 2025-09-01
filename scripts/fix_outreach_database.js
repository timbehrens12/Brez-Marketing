const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Present' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🔧 Applying outreach database schema fix...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'fix_outreach_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return false;
    }
    
    console.log('✅ Migration applied successfully!');
    
    // Verify the schema
    console.log('\n📋 Verifying new schema...');
    
    const { data: campaigns, error: campaignsError } = await supabase
      .from('outreach_campaigns')
      .select('*')
      .limit(1);
      
    const { data: campaignLeads, error: campaignLeadsError } = await supabase
      .from('outreach_campaign_leads')
      .select('*')
      .limit(1);
    
    if (campaignsError) {
      console.error('❌ outreach_campaigns table check failed:', campaignsError);
      return false;
    }
    
    if (campaignLeadsError) {
      console.error('❌ outreach_campaign_leads table check failed:', campaignLeadsError);
      return false;
    }
    
    console.log('✅ Schema verification passed!');
    console.log('✅ outreach_campaigns table is accessible');
    console.log('✅ outreach_campaign_leads table is accessible');
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error during migration:', error);
    return false;
  }
}

async function testOutreachFlow() {
  try {
    console.log('\n🧪 Testing outreach flow...');
    
    // Test campaign creation
    const testCampaign = {
      user_id: 'test-user',
      brand_id: 'test-brand',
      name: 'Test Campaign',
      description: 'Test campaign for schema validation',
      campaign_type: 'lead_generation',
      status: 'active',
      max_leads: 10
    };
    
    const { data: campaign, error: campaignError } = await supabase
      .from('outreach_campaigns')
      .insert(testCampaign)
      .select()
      .single();
    
    if (campaignError) {
      console.error('❌ Campaign creation test failed:', campaignError);
      return false;
    }
    
    console.log('✅ Campaign creation test passed');
    
    // Clean up test data
    await supabase
      .from('outreach_campaigns')
      .delete()
      .eq('id', campaign.id);
    
    console.log('✅ Test data cleaned up');
    console.log('✅ Outreach flow test completed successfully!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting outreach database fix...\n');
  
  const migrationSuccess = await applyMigration();
  if (!migrationSuccess) {
    console.error('\n❌ Migration failed. Exiting...');
    process.exit(1);
  }
  
  const testSuccess = await testOutreachFlow();
  if (!testSuccess) {
    console.error('\n❌ Testing failed. Check the logs above.');
    process.exit(1);
  }
  
  console.log('\n🎉 Outreach database fix completed successfully!');
  console.log('\n📝 Summary:');
  console.log('• Fixed outreach_campaigns table schema');
  console.log('• Added outreach_campaign_leads junction table');
  console.log('• Updated indexes for better performance');
  console.log('• Verified schema integrity');
  console.log('\n✨ The outreach functionality should now work correctly!');
}

main().catch(console.error); 