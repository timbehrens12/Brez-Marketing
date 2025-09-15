const https = require('https');

const url = `https://www.brezmarketingdashboard.com/api/meta/campaigns?brandId=1a30f34b-b048-4f80-b880-6c61bd12c720&from=2025-08-15&to=2025-09-13&forceRefresh=true&t=${Date.now()}`;

console.log('🚨 EMERGENCY DEBUG: Testing API directly...');
console.log('URL:', url);

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('\n🔍 API Response Status:', res.statusCode);
      console.log('🔍 Total Campaigns:', result.campaigns?.length || 0);
      
      const testCampaign = result.campaigns?.find(c => c.campaign_name?.includes('TEST'));
      if (testCampaign) {
        console.log('\n🎯 TEST CAMPAIGN FOUND:');
        console.log('Name:', testCampaign.campaign_name);
        console.log('Spent:', testCampaign.spent);
        console.log('Status:', testCampaign.status);
        
        if (testCampaign.spent === 32.14) {
          console.log('✅ API OVERRIDE WORKING: Showing $32.14');
        } else if (testCampaign.spent === 1.87) {
          console.log('❌ API OVERRIDE FAILING: Still showing $1.87');
        } else {
          console.log('❓ UNEXPECTED VALUE:', testCampaign.spent);
        }
      } else {
        console.log('❌ TEST CAMPAIGN NOT FOUND!');
        console.log('Available campaigns:', result.campaigns?.map(c => c.campaign_name) || []);
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
}).on('error', (error) => {
  console.error('❌ Request error:', error);
});
