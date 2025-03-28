// API route to directly update views from reach
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

    // Check if brand exists
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .single();
    
    if (brandError || !brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    console.log(`Directly updating views from reach for brand ${brandId}`);
    
    // Count records before update
    const { count: beforeCount, error: countError } = await supabase
      .from('meta_ad_insights')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .gt('views', 0);
      
    if (countError) {
      console.error("Error counting records:", countError);
    }
    
    console.log(`Records with views before update: ${beforeCount || 0}`);
    
    // Direct update approach 1 - use SQL
    try {
      const { data, error: sqlError } = await supabase.rpc(
        'update_meta_views',
        { brand_id_param: brandId }
      );
      
      if (sqlError) {
        console.error("SQL update error:", sqlError);
        
        // Try approach 2 - direct update
        console.log("Trying alternative direct update approach");
        const { error: updateError } = await supabase
          .from('meta_ad_insights')
          .update({ views: supabase.raw('reach') })
          .eq('brand_id', brandId)
          .gt('reach', 0);
          
        if (updateError) {
          console.error("Error with direct update:", updateError);
          return res.status(500).json({ 
            success: false, 
            message: "Failed to update views from reach", 
            error: updateError.message 
          });
        }
      } else {
        console.log("SQL update successful");
      }
    } catch (err) {
      console.error("Update error:", err);
      
      // Fallback to simple update
      const { error: updateError } = await supabase
        .from('meta_ad_insights')
        .update({ views: supabase.raw('reach') })
        .eq('brand_id', brandId)
        .gt('reach', 0);
        
      if (updateError) {
        console.error("Error with fallback update:", updateError);
      }
    }
    
    // Count records after update
    const { count: afterCount, error: afterCountError } = await supabase
      .from('meta_ad_insights')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .gt('views', 0);
      
    if (afterCountError) {
      console.error("Error counting updated records:", afterCountError);
    }
    
    console.log(`Records with views after update: ${afterCount || 0}`);
    
    // Get some sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('meta_ad_insights')
      .select('date, reach, views')
      .eq('brand_id', brandId)
      .gt('reach', 0)
      .limit(5);
      
    if (sampleError) {
      console.error("Error fetching sample data:", sampleError);
    }

    return res.status(200).json({
      success: true,
      message: 'Views updated from reach data',
      beforeCount: beforeCount || 0,
      afterCount: afterCount || 0,
      recordsUpdated: (afterCount || 0) - (beforeCount || 0),
      sampleData: sampleData || []
    });
  } catch (error) {
    console.error('Error in views update API:', error);
    return res.status(500).json({ 
      error: 'Failed to update views', 
      details: error.message 
    });
  }
} 