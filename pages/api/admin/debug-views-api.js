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

    // 1. First, check what raw data we have in the database for reach and views
    const { data: rawInsights, error: rawError } = await supabase
      .from('meta_ad_insights')
      .select('id, date, reach, views')
      .eq('connection_id', connection.id)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: false });
    
    if (rawError) {
      console.error('[Debug Views API] Error fetching raw insights:', rawError);
      // Continue with limited functionality
    }
    
    // 2. Check how Views API would process this data
    let totalViews = 0;
    let totalReach = 0;
    let recordsWithViews = 0;
    let recordsWithReach = 0;
    
    if (rawInsights && rawInsights.length > 0) {
      rawInsights.forEach(insight => {
        // Check for views column data first
        if (insight.views && !isNaN(insight.views) && insight.views > 0) {
          totalViews += parseInt(insight.views);
          recordsWithViews++;
        }
        
        // Also check for reach data
        if (insight.reach && !isNaN(insight.reach) && insight.reach > 0) {
          totalReach += parseInt(insight.reach);
          recordsWithReach++;
        }
      });
    }
    
    // Check if we need to fall back to reach data
    if (recordsWithViews === 0 && recordsWithReach > 0) {
      console.log('[Debug Views API] No views data found, falling back to reach data');
      totalViews = totalReach;
      recordsWithViews = recordsWithReach;
    }
    
    // 3. Get all data for a sample of records to help diagnose
    const { data: sampleFullRecords, error: sampleError } = await supabase
      .from('meta_ad_insights')
      .select('*')
      .eq('connection_id', connection.id)
      .gte('date', fromDate)
      .lte('date', toDate)
      .limit(3);
    
    // 4. Check if the columns exist in the table
    let columns = [];
    let tableExists = false;
    let columnError = null;
    
    try {
      // First check if the table exists
      const { data: tableInfo, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'meta_ad_insights');
      
      tableExists = tableInfo && tableInfo.length > 0;
      
      if (tableExists) {
        // Then get all columns
        const { data: columnInfo, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type')
          .eq('table_schema', 'public')
          .eq('table_name', 'meta_ad_insights');
        
        if (columnsError) {
          columnError = columnsError;
        } else if (columnInfo) {
          columns = columnInfo;
        }
      } else {
        console.log('[Debug Views API] meta_ad_insights table does not exist');
      }
    } catch (error) {
      console.error('[Debug Views API] Error checking schema:', error);
      columnError = error;
    }
    
    // Check for specific columns
    const hasReachColumn = columns.some(col => col.column_name === 'reach');
    const hasViewsColumn = columns.some(col => col.column_name === 'views');
    const hasPageViewsColumn = columns.some(col => col.column_name === 'page_views');
    
    // List all columns for debugging
    const allColumnNames = columns.map(col => `${col.column_name} (${col.data_type})`);
    
    // 5. Get the count of records in the table
    let totalRecords = 0;
    
    if (tableExists) {
      const { data: countData, error: countError } = await supabase
        .from('meta_ad_insights')
        .select('id', { count: 'exact' });
      
      if (!countError) {
        totalRecords = countData.length;
      }
    }
    
    // 6. Return the results
    return res.status(200).json({
      success: true,
      debug: {
        params: {
          brandId,
          connectionId: connection.id,
          from: fromDate,
          to: toDate
        },
        schemaInfo: {
          tableExists,
          totalRecords,
          hasReachColumn,
          hasViewsColumn,
          hasPageViewsColumn,
          columnError: columnError ? columnError.message : null,
          columnCount: columns.length,
          allColumns: allColumnNames,
          suggestedFix: !hasViewsColumn && hasReachColumn ? 
            "Run the schema fix to add the views column and set it equal to reach data" : 
            !hasReachColumn ? 
            "The table is missing the reach column. You need to rebuild the table or run a full emergency fix" :
            hasPageViewsColumn ? 
            "The page_views column exists but should be removed as it's not supported by Meta API" :
            "Schema looks good"
        },
        rawData: {
          recordCount: rawInsights?.length || 0,
          recordsWithViews,
          recordsWithReach,
          totalViews,
          totalReach,
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
            ? "⚠️ No views or reach data found in database records" 
            : recordsWithViews === recordsWithReach
              ? `✅ Found ${recordsWithViews} records with views/reach data, totaling ${totalViews}` 
              : `✓ Using ${recordsWithViews > 0 ? 'views' : 'reach'} data from ${recordsWithViews > 0 ? recordsWithViews : recordsWithReach} records, totaling ${totalViews}`
        },
        sampleFullRecords: sampleFullRecords || []
      }
    });
  } catch (error) {
    console.error('Error debugging views API:', error);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
} 