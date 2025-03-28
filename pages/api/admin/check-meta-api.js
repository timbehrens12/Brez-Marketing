// API route for checking Meta API data
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Simple security - check for a token
  const { token, brandId } = req.query;
  
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
      return res.status(404).json({ error: 'No active Meta connection found' });
    }

    // Fetch ad accounts first
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&access_token=${connection.access_token}`
    );
    
    const accountsData = await accountsResponse.json();
    
    if (accountsData.error) {
      return res.status(500).json({ error: 'Failed to fetch Meta ad accounts', details: accountsData.error });
    }

    if (!accountsData.data || accountsData.data.length === 0) {
      return res.status(404).json({ error: 'No Meta ad accounts found for this connection' });
    }

    // Set a test date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Use the first account for testing
    const testAccount = accountsData.data[0];
    
    // Make test API call to check fields
    const insightsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${testAccount.id}/insights?fields=account_id,account_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,actions,action_values,reach,inline_link_clicks,page_views&time_range={"since":"${startDateStr}","until":"${endDateStr}"}&level=ad&time_increment=1&access_token=${connection.access_token}`
    );
    
    const insightsData = await insightsResponse.json();
    
    // Check if we have any data
    if (insightsData.error) {
      return res.status(500).json({ 
        error: 'Error fetching insights from Meta API', 
        details: insightsData.error 
      });
    }

    // Extract sample data and check for page_views
    let sampleRecord = null;
    let hasPageViews = false;
    
    if (insightsData.data && insightsData.data.length > 0) {
      sampleRecord = insightsData.data[0];
      hasPageViews = 'page_views' in sampleRecord;
    }
    
    // Determine available fields from the sample
    const availableFields = sampleRecord ? Object.keys(sampleRecord) : [];
    
    return res.status(200).json({
      success: true,
      message: 'Meta API check complete',
      connection: {
        id: connection.id,
        brandId: connection.brand_id,
        platform: connection.platform_type,
        status: connection.status
      },
      account: {
        id: testAccount.id,
        name: testAccount.name
      },
      dateRange: {
        from: startDateStr,
        to: endDateStr
      },
      apiResponse: {
        recordCount: insightsData.data?.length || 0,
        hasPageViews,
        availableFields,
        sampleRecord: sampleRecord ? {
          impressions: sampleRecord.impressions,
          clicks: sampleRecord.clicks,
          spend: sampleRecord.spend,
          reach: sampleRecord.reach,
          inline_link_clicks: sampleRecord.inline_link_clicks,
          page_views: sampleRecord.page_views
        } : null
      }
    });
  } catch (error) {
    console.error('Error in Meta API check:', error);
    return res.status(500).json({ 
      error: 'Failed to check Meta API', 
      details: error.message 
    });
  }
} 