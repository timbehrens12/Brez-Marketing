// API endpoint to check basic database connectivity
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { token } = req.query;
  
  if (token !== 'fix-meta-data') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Check connection by running a simple query
    const { data: dbInfo, error: infoError } = await supabase.rpc('get_database_info');
    
    // Check if meta_ad_insights table exists
    const { data: tableInfo, error: tableError } = await supabase.from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'meta_ad_insights')
      .single();
    
    // Count tables in the public schema
    const { data: tableCount, error: countError } = await supabase.from('information_schema.tables')
      .select('table_name', { count: 'exact' })
      .eq('table_schema', 'public');
    
    // Check for brands
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name')
      .limit(5);
    
    // Check for platform connections
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('id, brand_id, platform_type, status')
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .limit(5);
    
    // Check for Meta insights records
    const { count: insightsCount, error: insightsError } = await supabase
      .from('meta_ad_insights')
      .select('*', { count: 'exact' });
    
    // Return detailed information
    return res.status(200).json({
      success: true,
      database: {
        connected: !infoError,
        info: dbInfo || null,
        error: infoError ? infoError.message : null
      },
      tables: {
        metaAdInsightsExists: !!tableInfo,
        totalTables: tableCount?.length || 0,
        error: tableError ? tableError.message : null
      },
      data: {
        brandsCount: brands?.length || 0,
        metaConnectionsCount: connections?.length || 0,
        metaInsightsCount: insightsCount || 0,
        brands: brands || [],
        connections: connections || []
      },
      errors: {
        brandsError: brandsError ? brandsError.message : null,
        connectionsError: connectionsError ? connectionsError.message : null,
        insightsError: insightsError ? insightsError.message : null
      }
    });
  } catch (error) {
    console.error('Database connection check failed:', error);
    return res.status(500).json({ 
      success: false,
      error: `Database connection failed: ${error.message}`,
      details: error.stack
    });
  }
} 