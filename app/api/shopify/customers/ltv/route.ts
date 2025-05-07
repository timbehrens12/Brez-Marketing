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
        distribution: [],
        averageLTV: 0,
        medianLTV: 0,
        totalCustomers: 0,
        message: 'No Shopify connections found for this brand'
      });
    }
    
    const connectionIds = connections.map(c => c.id);
    
    // Fetch all customer LTV values
    const { data: customers, error: customersError } = await supabase
      .from('shopify_customers')
      .select('lifetime_value')
      .in('connection_id', connectionIds);
    
    if (customersError) {
      console.error('Error fetching customer LTV data:', customersError);
      return NextResponse.json({ error: 'Failed to fetch LTV data' }, { status: 500 });
    }
    
    if (!customers || customers.length === 0) {
      return NextResponse.json({ 
        distribution: [],
        averageLTV: 0,
        medianLTV: 0,
        totalCustomers: 0,
        message: 'No customer data found'
      });
    }
    
    // Extract and sort LTV values
    const ltvValues = customers
      .map(customer => parseFloat(customer.lifetime_value) || 0)
      .sort((a, b) => a - b);
    
    const totalCustomers = ltvValues.length;
    
    // Calculate average LTV
    const totalLTV = ltvValues.reduce((sum, ltv) => sum + ltv, 0);
    const averageLTV = totalLTV / totalCustomers;
    
    // Calculate median LTV
    let medianLTV = 0;
    if (totalCustomers % 2 === 0) {
      // Even number of customers
      const midIndex = totalCustomers / 2;
      medianLTV = (ltvValues[midIndex - 1] + ltvValues[midIndex]) / 2;
    } else {
      // Odd number of customers
      const midIndex = Math.floor(totalCustomers / 2);
      medianLTV = ltvValues[midIndex];
    }
    
    // Create LTV distribution ranges
    const ranges = [
      { min: 0, max: 50, label: '$0 - $50' },
      { min: 50, max: 100, label: '$50 - $100' },
      { min: 100, max: 200, label: '$100 - $200' },
      { min: 200, max: 500, label: '$200 - $500' },
      { min: 500, max: 1000, label: '$500 - $1,000' },
      { min: 1000, max: 2000, label: '$1,000 - $2,000' },
      { min: 2000, max: 5000, label: '$2,000 - $5,000' },
      { min: 5000, max: Infinity, label: '$5,000+' }
    ];
    
    // Calculate distribution
    const distribution = ranges.map(range => {
      const count = ltvValues.filter(ltv => ltv >= range.min && ltv < range.max).length;
      const percentage = Math.round((count / totalCustomers) * 100);
      
      return {
        range: range.label,
        count,
        percentage
      };
    }).filter(item => item.count > 0); // Only include ranges with customers
    
    return NextResponse.json({ 
      distribution,
      averageLTV,
      medianLTV,
      totalCustomers
    });
    
  } catch (error) {
    console.error('Error in LTV data endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch LTV data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 