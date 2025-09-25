// EMERGENCY META API TEST
const ACCESS_TOKEN = "EACEhm43ODp8BPhNI8TMqEHz6aPGA63ZAs0khRaGwfntkqAZA9hNGISul8Om7atf2gXE0ZA0c3INaZBRMReQXC4bew6HOpRAMHm5eImfZA4eY5VOoZCddEmxu7IaF6rWURP5Mip5awfEAnFkd2fM7Ib1jhEmSnMUkjTQsh3n83xCn1ZAGNQDqn6gFUWiZC45NywdfL0mRelLDm4FfiAcN8Hv5VwAso7DcrwDYSfkMcugZBEosmn2oFRlFD2p8KUtslgnHF46JjLvCw4xK19jJYZBuLFscPW53tZCByfZA3K36";
const ACCOUNT_ID = "act_498473601902770";

async function testMetaAPI() {
  console.log("🚀 TESTING META API CONNECTION...");
  
  try {
    // Test 1: Get account info
    console.log("\n1. Testing account access...");
    const accountResponse = await fetch(`https://graph.facebook.com/v18.0/${ACCOUNT_ID}?fields=id,name,account_status,business&access_token=${ACCESS_TOKEN}`);
    const accountData = await accountResponse.json();
    console.log("Account data:", JSON.stringify(accountData, null, 2));
    
    // Test 2: Get recent ad insights (last 7 days)
    console.log("\n2. Testing recent ad insights...");
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const since = sevenDaysAgo.toISOString().split('T')[0];
    const until = today.toISOString().split('T')[0];
    
    console.log(`Date range: ${since} to ${until}`);
    
    const insightsResponse = await fetch(`https://graph.facebook.com/v18.0/${ACCOUNT_ID}/insights?fields=impressions,clicks,spend,reach,date_start,date_stop,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name&time_range={"since":"${since}","until":"${until}"}&level=ad&access_token=${ACCESS_TOKEN}`);
    const insightsData = await insightsResponse.json();
    
    console.log("Insights response:", JSON.stringify(insightsData, null, 2));
    
    if (insightsData.data && insightsData.data.length > 0) {
      console.log(`✅ SUCCESS: Found ${insightsData.data.length} ad insights for the last 7 days`);
      console.log("Sample insight:", insightsData.data[0]);
    } else {
      console.log("❌ NO INSIGHTS DATA for last 7 days");
    }
    
    // Test 3: Get campaigns
    console.log("\n3. Testing campaigns...");
    const campaignsResponse = await fetch(`https://graph.facebook.com/v18.0/${ACCOUNT_ID}/campaigns?fields=id,name,status,daily_budget,lifetime_budget&access_token=${ACCESS_TOKEN}`);
    const campaignsData = await campaignsResponse.json();
    console.log("Campaigns data:", JSON.stringify(campaignsData, null, 2));
    
  } catch (error) {
    console.error("❌ META API TEST FAILED:", error);
  }
}

testMetaAPI();
