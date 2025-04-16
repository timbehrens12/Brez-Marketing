/**
 * Budget-only Ad Sets API
 * 
 * This lightweight endpoint returns just the budget information for ad sets
 * belonging to a specific campaign. It's optimized for performance and
 * used for updating budget totals without fetching full ad set details.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const brandId = searchParams.get('brandId');
  const campaignId = searchParams.get('campaignId');
  
  if (!brandId || !campaignId) {
    return NextResponse.json({ 
      error: 'Missing required parameters: brandId and campaignId are required' 
    }, { status: 400 });
  }
  
  try {
    const supabase = createClient();
    
    // Get the brand to verify access permission
    const { data: brand } = await supabase
      .from('brand')
      .select('id, platform_connections(*)')
      .eq('id', brandId)
      .single();
    
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    
    // Check if brand has Meta connection
    const metaConnection = brand.platform_connections?.find(
      (conn: any) => conn.platform_type === 'meta' && conn.status === 'active'
    );
    
    if (!metaConnection) {
      return NextResponse.json({ error: 'Meta connection not found for this brand' }, { status: 404 });
    }
    
    // Get ad sets with minimal fields (just budget data)
    const { data: adSets, error } = await supabase
      .from('meta_adset')
      .select('id, adset_id, adset_name, campaign_id, status, budget, budget_type')
      .eq('brand_id', brandId)
      .eq('campaign_id', campaignId);
    
    if (error) {
      console.error('Error fetching ad sets:', error);
      return NextResponse.json({ error: 'Failed to fetch ad sets' }, { status: 500 });
    }
    
    // Return only essential budget data
    return NextResponse.json({
      adSets: adSets || [],
      count: adSets?.length || 0,
      source: 'db',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error in budget-only ad sets API:', error);
    return NextResponse.json({ 
      error: error.message || 'An internal server error occurred' 
    }, { status: 500 });
  }
} 