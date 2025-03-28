// API endpoint to forcefully fix Meta data sync issues
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { token, brandId, days } = req.query;
  const daysToFetch = parseInt(days) || 30;
  
  if (token !== 'fix-meta-data') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!brandId) {
    return res.status(400).json({ error: 'brandId is required' });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single();

    if (connectionError || !connection) {
      return res.status(404).json({ 
        error: 'Meta connection not found', 
        details: connectionError?.message || 'No active Meta connection for this brand'
      });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToFetch);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`[Meta Fix] Starting emergency fix for brand ${brandId} from ${startDateStr} to ${endDateStr}`);

    // 1. Check if meta_ad_insights table exists and create it if needed
    await ensureTableExists(supabase, brandId, connection.id, startDateStr);

    // 2. First clear existing data for this brand and date range
    console.log(`[Meta Fix] Clearing existing data`);
    
    const { error: deleteError } = await supabase
      .from('meta_ad_insights')
      .delete()
      .eq('brand_id', brandId)
      .gte('date', startDateStr)
      .lte('date', endDateStr);
    
    if (deleteError) {
      console.error('[Meta Fix] Error clearing existing data:', deleteError);
      // Continue anyway - the data might not exist
    }

    // 3. Fetch ad accounts
    console.log(`[Meta Fix] Fetching ad accounts`);
    
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&access_token=${connection.access_token}`
    );
    
    const accountsData = await accountsResponse.json();
    
    if (accountsData.error) {
      return res.status(500).json({
        error: 'Failed to fetch Meta ad accounts',
        details: accountsData.error
      });
    }

    if (!accountsData.data || accountsData.data.length === 0) {
      return res.status(404).json({
        error: 'No Meta ad accounts found for this connection'
      });
    }

    console.log(`[Meta Fix] Found ${accountsData.data.length} ad accounts`);

    // 4. Fetch insights from each account
    let allInsights = [];
    let fetchErrors = [];
    
    for (const account of accountsData.data) {
      console.log(`[Meta Fix] Fetching insights for account ${account.name} (${account.id})`);
      
      try {
        // Note: Removed page_views from the fields list
        const insightsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${account.id}/insights?fields=account_id,account_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,actions,action_values,reach,inline_link_clicks&time_range={"since":"${startDateStr}","until":"${endDateStr}"}&level=ad&time_increment=1&access_token=${connection.access_token}`
        );
        
        const insightsData = await insightsResponse.json();
        
        if (insightsData.error) {
          console.error(`[Meta Fix] Error fetching insights for account ${account.id}:`, insightsData.error);
          fetchErrors.push({
            accountId: account.id,
            accountName: account.name,
            error: insightsData.error
          });
          continue;
        }
        
        if (insightsData.data && insightsData.data.length > 0) {
          allInsights.push(...insightsData.data);
          console.log(`[Meta Fix] Fetched ${insightsData.data.length} insights for account ${account.name}`);
        } else {
          console.log(`[Meta Fix] No insights found for account ${account.name}`);
        }
      } catch (error) {
        console.error(`[Meta Fix] Error fetching insights for account ${account.id}:`, error);
        fetchErrors.push({
          accountId: account.id,
          accountName: account.name,
          error: error.message
        });
      }
    }

    console.log(`[Meta Fix] Fetched a total of ${allInsights.length} insights across all accounts`);
    
    if (allInsights.length === 0) {
      return res.status(404).json({ 
        warning: 'No insights data available for the specified period',
        fetchErrors
      });
    }

    // 5. Prepare the data for insertion
    console.log(`[Meta Fix] Preparing data for insertion`);
    
    const enrichedInsights = allInsights.map((insight) => {
      // Ensure we have a valid date
      let recordDate = insight.date_start || startDateStr;
      
      // Validate date format (YYYY-MM-DD)
      if (!recordDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.warn(`[Meta Fix] Invalid date format in insight record: "${recordDate}", defaulting to startDate`);
        recordDate = startDateStr;
      }
      
      // Using views=reach instead of page_views
      return {
        brand_id: brandId,
        connection_id: connection.id,
        account_id: insight.account_id || '',
        account_name: insight.account_name || '',
        campaign_id: insight.campaign_id || '',
        campaign_name: insight.campaign_name || '',
        adset_id: insight.adset_id || '',
        adset_name: insight.adset_name || '',
        ad_id: insight.ad_id || '',
        ad_name: insight.ad_name || '',
        impressions: parseInt(insight.impressions || '0'),
        clicks: parseInt(insight.clicks || '0'),
        spend: parseFloat(insight.spend || '0'),
        reach: parseInt(insight.reach || '0'),
        link_clicks: parseInt(insight.inline_link_clicks || '0'),
        views: parseInt(insight.reach || '0'), // Use reach as views
        date: recordDate,
        actions: insight.actions || [],
        action_values: insight.action_values || [],
        created_at: new Date()
      };
    });
    
    // 6. Insert data in batches to avoid size limits
    console.log(`[Meta Fix] Inserting ${enrichedInsights.length} records in batches`);
    
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < enrichedInsights.length; i += batchSize) {
      batches.push(enrichedInsights.slice(i, i + batchSize));
    }
    
    const insertErrors = [];
    let insertedCount = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`[Meta Fix] Inserting batch ${i + 1} of ${batches.length} (${batch.length} records)`);
      
      const { error: insertError } = await supabase
        .from('meta_ad_insights')
        .upsert(batch);
      
      if (insertError) {
        console.error(`[Meta Fix] Error inserting batch ${i + 1}:`, insertError);
        insertErrors.push({
          batchNumber: i + 1,
          error: insertError
        });
      } else {
        insertedCount += batch.length;
        console.log(`[Meta Fix] Successfully inserted batch ${i + 1}`);
      }
    }
    
    // 7. Return results
    return res.status(200).json({
      success: true,
      message: `Meta data fix complete. Inserted ${insertedCount} of ${enrichedInsights.length} records.`,
      stats: {
        totalFetched: allInsights.length,
        totalInserted: insertedCount,
        batchCount: batches.length,
        dateRange: {
          from: startDateStr,
          to: endDateStr
        }
      },
      fetchErrors: fetchErrors.length > 0 ? fetchErrors : null,
      insertErrors: insertErrors.length > 0 ? insertErrors : null,
      sampleInsight: enrichedInsights.length > 0 ? enrichedInsights[0] : null
    });
  } catch (error) {
    console.error('[Meta Fix] Emergency fix failed:', error);
    return res.status(500).json({ 
      error: 'Emergency Meta fix failed', 
      details: error.message,
      stack: error.stack
    });
  }
}

// Helper function to ensure the table exists with the right columns
async function ensureTableExists(supabase, brandId, connectionId, dateStr) {
  // Check if table exists
  const { data: tableInfo, error: tableError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'meta_ad_insights')
    .single();
  
  const tableExists = !!tableInfo;
  
  if (!tableExists) {
    console.log('[Meta Fix] Table does not exist, creating it');
    
    try {
      // Try direct insertion to create the table
      const { error: insertError } = await supabase
        .from('meta_ad_insights')
        .insert([{
          brand_id: brandId,
          connection_id: connectionId,
          date: dateStr,
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0,
          link_clicks: 0,
          views: 0
        }]);
      
      if (insertError) {
        console.error('[Meta Fix] Error creating table via insert:', insertError);
        throw new Error(`Failed to create table: ${insertError.message}`);
      }
      
      // Clean up the dummy record
      await supabase
        .from('meta_ad_insights')
        .delete()
        .eq('brand_id', brandId)
        .eq('date', dateStr);
      
      console.log('[Meta Fix] Table created successfully');
    } catch (error) {
      console.error('[Meta Fix] Table creation failed:', error);
      throw error;
    }
  } else {
    // Table exists, check if views column exists
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'meta_ad_insights');
    
    if (columnError) {
      console.error('[Meta Fix] Error checking columns:', columnError);
      return; // Continue anyway
    }
    
    const columnNames = columns.map(col => col.column_name);
    const hasViews = columnNames.includes('views');
    
    if (!hasViews) {
      console.log('[Meta Fix] Adding views column');
      
      try {
        // Try direct insertion with views column to implicitly add it
        const { error: insertError } = await supabase
          .from('meta_ad_insights')
          .insert([{
            brand_id: brandId,
            connection_id: connectionId,
            date: dateStr,
            impressions: 0,
            clicks: 0,
            spend: 0,
            reach: 0,
            link_clicks: 0,
            views: 0
          }]);
        
        if (insertError) {
          console.error('[Meta Fix] Error adding views column via insert:', insertError);
          // Continue anyway
        } else {
          // Clean up the dummy record
          await supabase
            .from('meta_ad_insights')
            .delete()
            .eq('brand_id', brandId)
            .eq('date', dateStr)
            .eq('impressions', 0);
          
          console.log('[Meta Fix] Views column added successfully');
        }
      } catch (error) {
        console.error('[Meta Fix] Adding views column failed:', error);
        // Continue anyway
      }
    }
  }
}