import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    // Simple security check
    const { token } = req.query;
    if (token !== 'debug-meta-data') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get the brand ID from query params
    const { brandId } = req.query;
    
    if (!brandId) {
      // If no brandId provided, return general diagnostic info
      const diagnostics = {
        server: {
          port: req.headers.host.split(':')[1] || 'unknown',
          environment: process.env.NODE_ENV || 'unknown',
          nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
          supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing',
        }
      };

      // Check if the meta_ad_insights table exists
      const { data: tableExists, error: tableCheckError } = await supabase.rpc(
        'check_table_exists',
        { table_name: 'meta_ad_insights' }
      ).catch(() => ({ data: false, error: { message: 'Function check_table_exists does not exist' } }));

      diagnostics.database = {
        tableExists: tableExists,
        tableCheckError: tableCheckError ? tableCheckError.message : null
      };

      // If the table check failed, try a different approach
      if (tableCheckError) {
        try {
          // Try counting records in the table
          const { count, error: countError } = await supabase
            .from('meta_ad_insights')
            .select('*', { count: 'exact', head: true });

          diagnostics.database.tableExists = !countError;
          diagnostics.database.recordCount = count;
        } catch (countError) {
          diagnostics.database.alternateCheckError = countError.message;
        }
      }

      // Check if the table has a views column
      if (diagnostics.database.tableExists && !tableCheckError) {
        try {
          const { data: columns, error: columnsError } = await supabase
            .rpc('list_table_columns', { table_name: 'meta_ad_insights' })
            .catch(() => ({ data: [], error: { message: 'Function list_table_columns does not exist' } }));

          diagnostics.database.columns = columns || [];
          diagnostics.database.columnsError = columnsError ? columnsError.message : null;
          diagnostics.database.hasViewsColumn = columns ? columns.includes('views') : false;
        } catch (columnsError) {
          diagnostics.database.columnsCheckError = columnsError.message;
        }
      }

      // Get list of active Meta connections
      const { data: connections, error: connectionsError } = await supabase
        .from('platform_connections')
        .select('id, brand_id, platform_type, status, connected_at')
        .eq('platform_type', 'meta')
        .eq('status', 'active');

      diagnostics.connections = {
        data: connections || [],
        error: connectionsError ? connectionsError.message : null,
        count: connections ? connections.length : 0
      };

      return res.status(200).json(diagnostics);
    }

    // If brandId is provided, get specific brand data
    const results = {};

    // Check Meta connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single();

    results.connection = {
      exists: !!connection,
      error: connectionError ? connectionError.message : null,
      data: connection ? {
        id: connection.id,
        brandId: connection.brand_id,
        platform: connection.platform_type,
        status: connection.status,
        connectedAt: connection.connected_at
      } : null
    };

    // Check if there's data in meta_ad_insights for this brand
    if (connection) {
      const { count, error: countError } = await supabase
        .from('meta_ad_insights')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', brandId);

      results.insights = {
        count: count || 0,
        error: countError ? countError.message : null
      };

      // Get a sample record with views data if available
      if (count && count > 0) {
        const { data: sample, error: sampleError } = await supabase
          .from('meta_ad_insights')
          .select('impressions, clicks, reach, views')
          .eq('brand_id', brandId)
          .order('date', { ascending: false })
          .limit(1)
          .single();

        results.sampleRecord = {
          data: sample || null,
          error: sampleError ? sampleError.message : null
        };
      }
    }

    return res.status(200).json(results);

  } catch (error) {
    console.error('Error in Meta database debug endpoint:', error);
    return res.status(500).json({ 
      error: 'Failed to debug Meta database', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 