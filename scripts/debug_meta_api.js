// Debug script to check fields from Meta API
// Run with: node scripts/debug_meta_api.js

console.log("Debug Meta API Script");
console.log("---------------------");

// Replace with your own values
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

// If no ACCESS_TOKEN is provided, show instructions
if (!ACCESS_TOKEN || !AD_ACCOUNT_ID) {
  console.log("Error: Missing environment variables.");
  console.log("\nTo use this script:");
  console.log("1. Set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID environment variables");
  console.log("   Example: META_ACCESS_TOKEN=your_token META_AD_ACCOUNT_ID=act_123456 node scripts/debug_meta_api.js");
  console.log("\nOr edit this script to manually set the ACCESS_TOKEN and AD_ACCOUNT_ID variables.");
  process.exit(1);
}

const startDate = new Date();
startDate.setDate(startDate.getDate() - 7); // Last 7 days
const endDate = new Date();

const startDateStr = startDate.toISOString().split('T')[0];
const endDateStr = endDate.toISOString().split('T')[0];

async function debugMetaAPI() {
  try {
    console.log(`Fetching data from account ${AD_ACCOUNT_ID}`);
    console.log(`Date range: ${startDateStr} to ${endDateStr}`);
    
    const url = `https://graph.facebook.com/v18.0/${AD_ACCOUNT_ID}/insights?fields=account_id,account_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,actions,action_values,reach,inline_link_clicks,page_views&time_range={"since":"${startDateStr}","until":"${endDateStr}"}&level=ad&time_increment=1&limit=5&access_token=${ACCESS_TOKEN}`;
    
    console.log("Fetching from Meta API...");
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error("API Error:", data.error);
      return;
    }
    
    if (!data.data || data.data.length === 0) {
      console.log("No data returned from the API.");
      return;
    }
    
    console.log(`Got ${data.data.length} records from API.`);
    
    // Check first record for page_views field
    const firstRecord = data.data[0];
    console.log("\nFirst record fields:");
    
    // Log all fields in the record
    Object.keys(firstRecord).forEach(key => {
      console.log(`${key}: ${typeof firstRecord[key] === 'object' ? JSON.stringify(firstRecord[key]).slice(0, 100) + '...' : firstRecord[key]}`);
    });
    
    // Specifically check for page_views
    console.log("\nChecking for page_views field:");
    if ('page_views' in firstRecord) {
      console.log(`✓ page_views found: ${firstRecord.page_views}`);
    } else {
      console.log("✕ page_views field not found in the response");
      console.log("This might indicate that Meta doesn't provide page_views data for this account or campaign.");
    }
    
    // Check the actions array for page view related actions
    if (firstRecord.actions && Array.isArray(firstRecord.actions)) {
      console.log("\nChecking actions array for page view related actions:");
      
      const pageViewActions = firstRecord.actions.filter(action => 
        action.action_type && action.action_type.includes('page_view')
      );
      
      if (pageViewActions.length > 0) {
        console.log("Found page view related actions:");
        pageViewActions.forEach(action => {
          console.log(`  - ${action.action_type}: ${action.value}`);
        });
      } else {
        console.log("No page view related actions found in the actions array.");
      }
    }
    
  } catch (error) {
    console.error("Error fetching data from Meta API:", error);
  }
}

// Run the debug function
debugMetaAPI(); 