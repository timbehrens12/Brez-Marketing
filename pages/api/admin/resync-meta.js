// API route for admin to force a complete resync of Meta data
import { fetchMetaAdInsights } from '../../../lib/services/meta-service';
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

    // Calculate date range (90 days back)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    // Start resync process
    console.log(`Starting Meta resync for brand ${brandId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const result = await fetchMetaAdInsights(brandId, startDate, endDate);
    
    // Update the views column based on reach values for newly synced data
    try {
      const { error: updateError } = await supabase.rpc('update_meta_views_from_reach', {
        brand_id_param: brandId
      });
      
      if (updateError) {
        console.error("Error updating views from reach:", updateError);
        return res.status(500).json({
          success: false,
          message: "Data synced but views update failed",
          error: updateError.message
        });
      }
      
      // Success log
      console.log(`Meta data refresh complete for brand ${brandId}. Views data updated.`);
    } catch (updateError) {
      console.error("Error in views update:", updateError);
    }

    return res.status(200).json({
      success: result.success,
      message: result.message || 'Meta data resync complete',
      count: result.count || 0,
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Error in Meta resync API:', error);
    return res.status(500).json({ error: 'Failed to resync Meta data', details: error.message });
  }
} 