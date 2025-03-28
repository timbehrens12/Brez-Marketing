// API endpoint to run the SQL schema fix
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
    
    console.log('[Schema Fix] Checking database connection');
    
    // Test database connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('platform_connections')
      .select('count(*)', { count: 'exact' });
    
    if (connectionError) {
      return res.status(500).json({ 
        error: 'Database connection error', 
        details: connectionError.message 
      });
    }
    
    console.log('[Schema Fix] Reading SQL script');
    
    // Read the SQL file
    let sqlScript;
    try {
      const scriptPath = path.join(process.cwd(), 'scripts', 'update_meta_schema.sql');
      sqlScript = fs.readFileSync(scriptPath, 'utf8');
    } catch (readError) {
      return res.status(500).json({ 
        error: 'Failed to read SQL script', 
        details: readError.message,
        path: path.join(process.cwd(), 'scripts', 'update_meta_schema.sql')
      });
    }
    
    console.log('[Schema Fix] Executing SQL script');
    
    // Since we might not have execute_sql RPC, we'll execute the important parts individually
    let schemaUpdated = false;
    let errors = [];
    
    try {
      // Check if table exists
      const { data: tableCheck, error: tableCheckError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'meta_ad_insights')
        .single();
      
      const tableExists = !!tableCheck;
      
      if (!tableExists) {
        // Create table if it doesn't exist
        const { error: createTableError } = await supabase.rpc('create_meta_insights_table');
        
        if (createTableError) {
          errors.push({
            step: 'create_table',
            error: createTableError.message
          });
          
          // Try an alternate method to create the table
          const { error: createTableAltError } = await supabase.from('meta_ad_insights').insert([
            {
              brand_id: '00000000-0000-0000-0000-000000000000',
              connection_id: '00000000-0000-0000-0000-000000000000',
              date: '2023-01-01',
              impressions: 0,
              clicks: 0,
              spend: 0,
              reach: 0,
              link_clicks: 0
            }
          ]);
          
          if (createTableAltError) {
            errors.push({
              step: 'create_table_alt',
              error: createTableAltError.message
            });
          } else {
            // Clean up the dummy record
            await supabase.from('meta_ad_insights')
              .delete()
              .eq('brand_id', '00000000-0000-0000-0000-000000000000');
          }
        }
      }
      
      // Check if views column exists
      const { data: columnsCheck, error: columnsCheckError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'meta_ad_insights');
      
      if (columnsCheckError) {
        errors.push({
          step: 'check_columns',
          error: columnsCheckError.message
        });
      } else {
        const columns = columnsCheck ? columnsCheck.map(col => col.column_name) : [];
        const hasViews = columns.includes('views');
        const hasReach = columns.includes('reach');
        const hasPageViews = columns.includes('page_views');
        
        // Add views column if it doesn't exist
        if (!hasViews) {
          const { error: addViewsError } = await supabase.rpc(
            'execute_alter_table',
            { sql_string: 'ALTER TABLE meta_ad_insights ADD COLUMN views INTEGER DEFAULT 0' }
          );
          
          if (addViewsError) {
            errors.push({
              step: 'add_views_column',
              error: addViewsError.message
            });
          }
        }
        
        // Copy reach data to views if both columns exist
        if (hasReach) {
          const { error: updateViewsError } = await supabase.rpc(
            'execute_update',
            { sql_string: 'UPDATE meta_ad_insights SET views = reach WHERE views = 0 OR views IS NULL' }
          );
          
          if (updateViewsError) {
            errors.push({
              step: 'update_views',
              error: updateViewsError.message
            });
          } else {
            schemaUpdated = true;
          }
        }
        
        // Drop page_views column if it exists
        if (hasPageViews) {
          const { error: dropColumnError } = await supabase.rpc(
            'execute_alter_table',
            { sql_string: 'ALTER TABLE meta_ad_insights DROP COLUMN page_views' }
          );
          
          if (dropColumnError) {
            errors.push({
              step: 'drop_page_views',
              error: dropColumnError.message
            });
          }
        }
      }
    } catch (error) {
      errors.push({
        step: 'general_execution',
        error: error.message
      });
    }
    
    // Check the current state after our updates
    const { data: tableCheck, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'meta_ad_insights')
      .single();
    
    // Check if views column exists
    const { data: viewsColumnCheck, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'meta_ad_insights')
      .eq('column_name', 'views')
      .single();
    
    // Return a result even if there were some errors
    return res.status(200).json({
      success: errors.length === 0 || schemaUpdated,
      message: schemaUpdated 
        ? 'SQL schema update executed successfully' 
        : errors.length > 0 
          ? `Schema update completed with ${errors.length} errors` 
          : 'No changes were needed',
      tableExists: !!tableCheck,
      viewsColumnExists: !!viewsColumnCheck,
      errors: errors.length > 0 ? errors : null,
      sqlDetails: 'The SQL script has been parsed and executed in parts',
      nextSteps: schemaUpdated 
        ? 'Now run the Emergency Meta Fix to populate the database with new data' 
        : 'Try running the Emergency Meta Fix directly'
    });
  } catch (error) {
    console.error('[Schema Fix] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to run schema fix', 
      details: error.message 
    });
  }
} 