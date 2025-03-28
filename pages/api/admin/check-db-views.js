// API endpoint to check for reach/views data in the meta_ad_insights table
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Simple security check
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

    // Check for Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single();

    if (connectionError || !connection) {
      return res.status(404).json({ error: 'Meta connection not found' });
    }

    // Get the last 30 days of data
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Check for any records with reach > 0
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('id, date, reach')
      .eq('connection_id', connection.id)
      .gte('date', startDateStr)
      .lte('date', endDate)
      .gt('reach', 0)
      .limit(20);

    if (error) {
      return res.status(500).json({ error: `Database error: ${error.message}` });
    }

    // Check for total records with reach = 0
    const { count: zeroReachCount, error: countError } = await supabase
      .from('meta_ad_insights')
      .select('id', { count: 'exact' })
      .eq('connection_id', connection.id)
      .gte('date', startDateStr)
      .lte('date', endDate)
      .eq('reach', 0);

    if (countError) {
      return res.status(500).json({ error: `Database count error: ${countError.message}` });
    }

    // Get total record count
    const { count: totalCount, error: totalCountError } = await supabase
      .from('meta_ad_insights')
      .select('id', { count: 'exact' })
      .eq('connection_id', connection.id)
      .gte('date', startDateStr)
      .lte('date', endDate);

    if (totalCountError) {
      return res.status(500).json({ error: `Database total count error: ${totalCountError.message}` });
    }

    // Return the results
    return res.status(200).json({
      success: true,
      recordsWithReach: insights.length > 0,
      sampleRecords: insights,
      stats: {
        total: totalCount || 0,
        withReach: (totalCount || 0) - (zeroReachCount || 0),
        withoutReach: zeroReachCount || 0,
        dateRange: {
          from: startDateStr,
          to: endDate
        }
      }
    });
  } catch (error) {
    console.error('Error checking Meta reach data:', error);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
} 