// Script to update Meta connections by adding missing ad_account_id to metadata
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateMetaConnections() {
  try {
    console.log('Starting Meta connection update process...');

    // Get all active Meta connections
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'meta')
      .eq('status', 'active');

    if (connectionsError) {
      console.error('Error fetching Meta connections:', connectionsError);
      return;
    }

    console.log(`Found ${connections.length} active Meta connections`);

    // Process each connection
    for (const connection of connections) {
      console.log(`\nProcessing connection ID: ${connection.id} for brand: ${connection.brand_id}`);
      
      if (!connection.access_token) {
        console.log('Skipping connection due to missing access token');
        continue;
      }

      // Check if metadata has ad_account_id
      const metadata = connection.metadata || {};
      const hasAdAccountId = metadata && metadata.ad_account_id;
      
      console.log(`Connection has ad_account_id in metadata: ${hasAdAccountId ? 'Yes' : 'No'}`);

      // Attempt to fetch ad accounts only if ad_account_id is missing
      if (!hasAdAccountId) {
        try {
          // Fetch ad accounts from Meta
          console.log('Fetching ad accounts from Meta API...');
          const response = await fetch(
            `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&access_token=${connection.access_token}`,
            { 
              headers: { 'Content-Type': 'application/json' }
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Error fetching ad accounts from Meta:', errorData);
            continue;
          }

          const accountsData = await response.json();

          if (!accountsData.data || accountsData.data.length === 0) {
            console.log('No ad accounts found for this connection');
            continue;
          }

          // Use the first ad account
          const firstAccount = accountsData.data[0];
          const accountId = firstAccount.account_id || firstAccount.id.replace('act_', '');
          const adAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
          
          console.log(`Found ad account: ${adAccountId}`);

          // Update the connection with the ad_account_id
          const updatedMetadata = {
            ...metadata,
            ad_account_id: adAccountId
          };

          const { error: updateError } = await supabase
            .from('platform_connections')
            .update({ metadata: updatedMetadata })
            .eq('id', connection.id);

          if (updateError) {
            console.error('Error updating connection metadata:', updateError);
            continue;
          }

          console.log(`Updated connection ${connection.id} with ad_account_id: ${adAccountId}`);
        } catch (error) {
          console.error('Error processing connection:', error);
        }
      }
    }

    console.log('\nMeta connections update process completed!');
  } catch (error) {
    console.error('Error in updateMetaConnections:', error);
  }
}

// Execute the update process
updateMetaConnections(); 