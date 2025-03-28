// API endpoint to directly check Meta API connection without database involvement
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { token, brandId } = req.query;
  
  if (token !== 'fix-meta-data') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!brandId) {
    return res.status(400).json({ error: 'brandId is required' });
  }

  try {
    // Initialize Supabase client - we need this just to get the Meta access token
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

    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // First check if we can fetch ad accounts
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&access_token=${connection.access_token}`
    );
    
    const accountsData = await accountsResponse.json();
    
    if (accountsData.error) {
      return res.status(500).json({
        success: false,
        error: 'Meta API accounts error',
        details: accountsData.error
      });
    }

    if (!accountsData.data || accountsData.data.length === 0) {
      return res.status(200).json({
        success: true,
        accountsFound: false,
        message: 'Meta connection is valid but no ad accounts found',
        connection: {
          id: connection.id,
          brandId: connection.brand_id,
          status: connection.status,
          createdAt: connection.created_at
        }
      });
    }

    // Test account - try to get insights from first account
    const testAccount = accountsData.data[0];
    
    // Try to fetch insights directly from Meta for one account
    const insightsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${testAccount.id}/insights?fields=account_id,account_name,impressions,clicks,spend,reach&time_range={"since":"${startDateStr}","until":"${endDateStr}"}&time_increment=1&access_token=${connection.access_token}`
    );
    
    const insightsData = await insightsResponse.json();
    
    // Return detailed results of our check
    return res.status(200).json({
      success: true,
      connection: {
        id: connection.id,
        brandId: connection.brand_id,
        status: connection.status,
        createdAt: connection.created_at
      },
      accounts: {
        count: accountsData.data.length,
        testAccount: {
          id: testAccount.id,
          name: testAccount.name
        }
      },
      insights: {
        success: !insightsData.error,
        error: insightsData.error || null,
        recordCount: insightsData.data?.length || 0,
        dateRange: {
          from: startDateStr,
          to: endDateStr
        },
        sampleData: insightsData.data?.[0] || null
      }
    });
  } catch (error) {
    console.error('Direct Meta API check failed:', error);
    return res.status(500).json({ 
      success: false,
      error: `Meta API check failed: ${error.message}`,
      stack: error.stack
    });
  }
} 