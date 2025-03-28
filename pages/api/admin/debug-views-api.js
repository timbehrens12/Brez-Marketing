// API endpoint to debug the views/reach API endpoint and check what data it returns
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { token, brandId, from, to } = req.query;
  
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
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single();

    if (connectionError || !connection) {
      return res.status(404).json({ error: 'Meta connection not found' });
    }

    // Use provided dates or default to last 7 days
    let fromDate = from;
    let toDate = to;
    
    if (!fromDate || !toDate) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      fromDate = startDate.toISOString().split('T')[0];
      toDate = endDate.toISOString().split('T')[0];
    }

    console.log(`[Debug Views API] Checking for brand ${brandId} from ${fromDate} to ${toDate}`);

    // 1. First, check what raw data we have in the database for reach
    const { data: rawInsights, error: rawError } = await supabase
      .from('meta_ad_insights')
      .select('id, date, reach')
      .eq('connection_id', connection.id)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: false });
    
    // 2. Check how Views API would process this data
    let totalViews = 0;
    let recordsWithViews = 0;
    
    if (rawInsights && rawInsights.length > 0) {
      rawInsights.forEach(insight => {
        if (insight.reach && !isNaN(insight.reach) && insight.reach > 0) {
          totalViews += parseInt(insight.reach);
          recordsWithViews++;
        }
      });
    }
    
    // 3. Get all data for a sample of records to help diagnose
    const { data: sampleFullRecords, error: sampleError } = await supabase
      .from('meta_ad_insights')
      .select('*')
      .eq('connection_id', connection.id)
      .gte('date', fromDate)
      .lte('date', toDate)
      .limit(3);
    
    // 4. Return the results
    return res.status(200).json({
      success: true,
      debug: {
        params: {
          brandId,
          connectionId: connection.id,
          from: fromDate,
          to: toDate
        },
        rawData: {
          recordCount: rawInsights?.length || 0,
          recordsWithViews,
          totalViews,
          recordSample: rawInsights?.slice(0, 10) || []
        },
        viewsApiSimulation: {
          result: {
            value: totalViews,
            dateRange: {
              from: fromDate,
              to: toDate
            }
          },
          explanation: recordsWithViews === 0 
            ? "⚠️ No reach/views data found in database records" 
            : `✅ Found ${recordsWithViews} records with reach data, totaling ${totalViews}`
        },
        sampleFullRecords: sampleFullRecords || []
      }
    });
  } catch (error) {
    console.error('Error debugging views API:', error);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
} 