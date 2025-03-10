import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const segment = searchParams.get('segment');
    const sortBy = searchParams.get('sortBy') || 'lifetime_value';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }
    
    // Get the connection ID for the brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active')
      .single();
    
    if (connectionError || !connection) {
      console.error('Error fetching connection:', connectionError);
      return NextResponse.json({ error: 'No active Shopify connection found for this brand' }, { status: 404 });
    }
    
    // Build the query
    let query = supabase
      .from('shopify_customers')
      .select('*', { count: 'exact' })
      .eq('connection_id', connection.id);
    
    // Apply segment filter if provided
    if (segment) {
      query = query.eq('customer_segment', segment);
    }
    
    // Apply sorting
    if (sortBy && sortOrder) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    // Execute the query
    const { data: customers, error, count } = await query;
    
    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }
    
    // Calculate summary metrics
    const totalCustomers = count || 0;
    
    // Calculate segment distribution
    const { data: segmentData, error: segmentError } = await supabase
      .from('shopify_customers')
      .select('customer_segment, count')
      .eq('connection_id', connection.id)
      .group('customer_segment');
    
    if (segmentError) {
      console.error('Error fetching segment data:', segmentError);
    }
    
    const segmentDistribution = segmentData || [];
    
    // Calculate geographic distribution
    const { data: geoData, error: geoError } = await supabase
      .from('shopify_customers')
      .select('geographic_region, count')
      .eq('connection_id', connection.id)
      .not('geographic_region', 'is', null)
      .group('geographic_region')
      .order('count', { ascending: false })
      .limit(10);
    
    if (geoError) {
      console.error('Error fetching geographic data:', geoError);
    }
    
    const geographicDistribution = geoData || [];
    
    // Calculate average metrics
    const { data: avgData, error: avgError } = await supabase
      .from('shopify_customers')
      .select()
      .eq('connection_id', connection.id)
      .then(result => {
        if (result.error) throw result.error;
        
        const data = result.data || [];
        const avgLifetimeValue = data.reduce((sum, customer) => sum + (customer.lifetime_value || 0), 0) / (data.length || 1);
        const avgOrderValue = data.reduce((sum, customer) => sum + (customer.average_order_value || 0), 0) / (data.length || 1);
        const avgPurchaseFrequency = data.reduce((sum, customer) => sum + (customer.purchase_frequency || 0), 0) / (data.length || 1);
        
        return {
          data: {
            avgLifetimeValue,
            avgOrderValue,
            avgPurchaseFrequency
          },
          error: null
        };
      })
      .catch(error => {
        console.error('Error calculating averages:', error);
        return { data: null, error };
      });
    
    if (avgError) {
      console.error('Error calculating average metrics:', avgError);
    }
    
    // Return the data
    return NextResponse.json({
      customers,
      totalCustomers,
      segmentDistribution,
      geographicDistribution,
      averageMetrics: avgData,
      pagination: {
        limit,
        offset,
        total: count
      }
    });
    
  } catch (error) {
    console.error('Error in customer API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch customers', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 