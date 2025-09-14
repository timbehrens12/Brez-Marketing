// Comprehensive demographics sync for ALL campaign days
const fetch = require('node-fetch');

async function createComprehensiveDemographicsSync() {
  try {
    console.log('🚀 Creating comprehensive demographics sync for ALL campaign days...');
    console.log('📊 This will create individual jobs for EVERY day with campaign spend');
    console.log('💪 Fixing the broken monthly approach that only covered 15% of days');
    
    const response = await fetch('https://www.brezmarketingdashboard.com/api/meta/comprehensive-demographics-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        brandId: '1a30f34b-b048-4f80-b880-6c61bd12c720'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ COMPREHENSIVE SYNC RESULT:');
    console.log(`📅 Jobs created: ${result.jobsCreated}`);
    console.log(`💰 Estimated missing spend: $${result.estimatedSpend?.toFixed(2)}`);
    console.log(`📊 Missing days: ${result.missingDays}`);
    console.log('🚀 All jobs queued! Processing will start automatically...');
    
  } catch (error) {
    console.error('❌ Error creating comprehensive sync:', error.message);
  }
}

createComprehensiveDemographicsSync();
