// API route for admin to force a complete resync of Meta data
import { fetchMetaAdInsights } from '../../../lib/services/meta-service';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Simple security - check for a token
  const { token, brandId, days } = req.query;
  const daysToFetch = parseInt(days) || 90; // Default to 90 days, longer than normal to ensure history
  
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

    // Calculate date range (90 days back by default)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToFetch);

    // First, clear existing data for this brand and date range
    console.log(`[Meta Resync] Clearing existing data for brand ${brandId} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    const { error: deleteError } = await supabase
      .from('meta_ad_insights')
      .delete()
      .eq('brand_id', brandId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);
    
    if (deleteError) {
      console.error('[Meta Resync] Error clearing existing data:', deleteError);
      return res.status(500).json({ 
        error: 'Failed to clear existing data', 
        details: deleteError 
      });
    }

    // Start resync process
    console.log(`[Meta Resync] Starting Meta resync for brand ${brandId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const result = await fetchMetaAdInsights(brandId, startDate, endDate);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to resync Meta data',
        details: result.details || {}
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Meta data resync complete. This has refreshed all data including the 'reach' field used for Views.`,
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