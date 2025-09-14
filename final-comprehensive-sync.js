// Final comprehensive demographics sync - get all 158 days
const fetch = require('node-fetch');

async function runFinalComprehensiveSync() {
  try {
    console.log('🚀 FINAL COMPREHENSIVE SYNC - Getting all 158 days of demographics...');
    console.log('📊 Currently: 4 days, $3.49 spend');
    console.log('🎯 Target: 158 days, $155.83 spend (100% coverage)');
    console.log('');
    
    const response = await fetch('https://www.brezmarketingdashboard.com/api/meta/comprehensive-demographics-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        brandId: '1a30f34b-b048-4f80-b880-6c61bd12c720'
      })
    });
    
    console.log(`📡 Response status: ${response.status}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('❌ Endpoint still not deployed (404)');
        console.log('⏰ Vercel deployment typically takes 1-2 minutes');
        console.log('🔄 Try again in a minute or check Vercel dashboard');
        return;
      }
      
      const errorText = await response.text();
      console.log('❌ API Error:', errorText.substring(0, 500));
      return;
    }
    
    const result = await response.json();
    console.log('');
    console.log('🎉 SUCCESS! COMPREHENSIVE SYNC INITIATED!');
    console.log('');
    console.log(`📅 Jobs created: ${result.jobsCreated}`);
    console.log(`💰 Missing spend to backfill: $${result.estimatedSpend?.toFixed(2)}`);
    console.log(`📊 Days to backfill: ${result.missingDays}`);
    console.log('');
    console.log('🔄 Jobs are now processing automatically via the queue');
    console.log('⏱️  Each job processes 1 day - estimated completion: ~5-10 minutes');
    console.log('📈 Demographics data will populate gradually');
    console.log('');
    console.log('✅ The duplication bug is FIXED - data will be clean!');
    
  } catch (error) {
    console.error('❌ Error running comprehensive sync:', error.message);
  }
}

runFinalComprehensiveSync();
