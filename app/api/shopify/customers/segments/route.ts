import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }
    
    // Get all connections for this brand
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify');
    
    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }
    
    if (!connections || connections.length === 0) {
      return NextResponse.json({ 
        segments: [],
        message: 'No Shopify connections found for this brand'
      });
    }
    
    const connectionIds = connections.map(c => c.id);
    
    // Aggregate customer data by segment
    const { data: customersBySegment, error: segmentError } = await supabase
      .from('shopify_customers')
      .select(`
        customer_segment,
        lifetime_value,
        average_order_value
      `)
      .in('connection_id', connectionIds);
    
    if (segmentError) {
      console.error('Error fetching customer segment data:', segmentError);
      return NextResponse.json({ error: 'Failed to fetch segment data' }, { status: 500 });
    }
    
    // Process the data to group by segment
    const segmentMap = new Map<string, { 
      segment: string;
      count: number;
      revenue: number;
      averageOrderValue: number;
    }>();
    
    // Ensure we have all possible segments with default values
    const defaultSegments = ['VIP', 'Loyal', 'Returning', 'New', 'At Risk', 'Inactive'];
    defaultSegments.forEach(segment => {
      segmentMap.set(segment, {
        segment,
        count: 0,
        revenue: 0,
        averageOrderValue: 0
      });
    });
    
    // Process actual data
    customersBySegment?.forEach(customer => {
      const segment = customer.customer_segment || 'Unknown';
      const revenue = parseFloat(customer.lifetime_value) || 0;
      const aov = parseFloat(customer.average_order_value) || 0;
      
      if (!segmentMap.has(segment)) {
        segmentMap.set(segment, {
          segment,
          count: 1,
          revenue,
          averageOrderValue: aov
        });
      } else {
        const existing = segmentMap.get(segment)!;
        existing.count += 1;
        existing.revenue += revenue;
        existing.averageOrderValue = (existing.averageOrderValue * (existing.count - 1) + aov) / existing.count;
      }
    });
    
    // Convert the map to an array and sort by revenue
    const segments = Array.from(segmentMap.values())
      .filter(segment => segment.count > 0) // Only include segments with customers
      .sort((a, b) => b.revenue - a.revenue);
    
    return NextResponse.json({ 
      segments,
      count: segments.length
    });
    
  } catch (error) {
    console.error('Error in segment data endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch segment data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 