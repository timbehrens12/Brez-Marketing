import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Simple mapping of countries to coordinates (center points)
const countryCoordinates: Record<string, [number, number]> = {
  'United States': [-95.7129, 37.0902],
  'Canada': [-106.3468, 56.1304],
  'United Kingdom': [-3.4360, 55.3781],
  'Australia': [133.7751, -25.2744],
  'Germany': [10.4515, 51.1657],
  'France': [2.2137, 46.2276],
  'Italy': [12.5674, 41.8719],
  'Spain': [-3.7492, 40.4637],
  'Japan': [138.2529, 36.2048],
  'China': [104.1954, 35.8617],
  'India': [78.9629, 20.5937],
  'Brazil': [-51.9253, -14.2350],
  'Mexico': [-102.5528, 23.6345],
  'Russia': [105.3188, 61.5240],
  'South Africa': [22.9375, -30.5595],
  // Add more countries as needed
};

// US states mapping
const usStateCoordinates: Record<string, [number, number]> = {
  'Alabama': [-86.9023, 32.3182],
  'Alaska': [-152.4044, 61.3850],
  'Arizona': [-111.0937, 34.0489],
  'Arkansas': [-92.3809, 34.7999],
  'California': [-119.4179, 36.7783],
  'Colorado': [-105.7821, 39.5501],
  'Connecticut': [-72.7555, 41.6032],
  'Delaware': [-75.5277, 39.1453],
  'Florida': [-81.5158, 27.6648],
  'Georgia': [-83.4428, 32.1656],
  'Hawaii': [-157.5311, 21.0943],
  'Idaho': [-114.7420, 44.0682],
  'Illinois': [-89.3985, 40.6331],
  'Indiana': [-86.2816, 39.8494],
  'Iowa': [-93.0977, 41.8780],
  'Kansas': [-98.3804, 39.0119],
  'Kentucky': [-84.2700, 37.8393],
  'Louisiana': [-91.9623, 31.1695],
  'Maine': [-69.4455, 44.6939],
  'Maryland': [-76.6413, 39.0458],
  'Massachusetts': [-71.3824, 42.4072],
  'Michigan': [-84.5603, 44.3148],
  'Minnesota': [-94.6859, 46.7296],
  'Mississippi': [-89.3985, 32.7416],
  'Missouri': [-92.6032, 38.4561],
  'Montana': [-109.6333, 46.8797],
  'Nebraska': [-99.9018, 41.4925],
  'Nevada': [-116.4194, 38.8026],
  'New Hampshire': [-71.5724, 43.1939],
  'New Jersey': [-74.4057, 40.0583],
  'New Mexico': [-105.8701, 34.5199],
  'New York': [-74.2179, 43.2994],
  'North Carolina': [-79.0193, 35.7596],
  'North Dakota': [-100.4701, 47.5515],
  'Ohio': [-82.9071, 40.4173],
  'Oklahoma': [-97.5164, 35.4676],
  'Oregon': [-120.5542, 43.8041],
  'Pennsylvania': [-77.1945, 41.2033],
  'Rhode Island': [-71.4774, 41.6809],
  'South Carolina': [-81.1637, 33.8361],
  'South Dakota': [-99.9018, 44.3668],
  'Tennessee': [-86.5804, 35.7478],
  'Texas': [-99.9018, 31.9686],
  'Utah': [-111.0937, 39.3210],
  'Vermont': [-72.5778, 44.5588],
  'Virginia': [-78.6569, 37.4316],
  'Washington': [-120.7401, 47.7511],
  'West Virginia': [-80.4549, 38.5976],
  'Wisconsin': [-89.6385, 44.2563],
  'Wyoming': [-107.2903, 42.7559],
};

// Canadian provinces mapping
const canadaProvinceCoordinates: Record<string, [number, number]> = {
  'Alberta': [-115.0008, 55.0000],
  'British Columbia': [-127.6476, 53.7267],
  'Manitoba': [-97.8306, 53.7609],
  'New Brunswick': [-66.4619, 46.5653],
  'Newfoundland and Labrador': [-61.2075, 53.1355],
  'Northwest Territories': [-114.3718, 64.8255],
  'Nova Scotia': [-63.7443, 45.1510],
  'Nunavut': [-94.9690, 70.2998],
  'Ontario': [-85.3232, 51.2538],
  'Prince Edward Island': [-63.0363, 46.5107],
  'Quebec': [-73.5673, 52.9399],
  'Saskatchewan': [-106.4509, 55.0000],
  'Yukon': [-135.0568, 64.2823],
};

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
        regions: [],
        message: 'No Shopify connections found for this brand'
      });
    }
    
    const connectionIds = connections.map(c => c.id);
    
    // Aggregate customer data by geographic region
    const { data: customersByRegion, error: regionError } = await supabase
      .from('shopify_customers')
      .select(`
        geographic_region,
        default_address->country as country,
        default_address->province as province,
        default_address->city as city,
        lifetime_value
      `)
      .in('connection_id', connectionIds)
      .not('geographic_region', 'is', null);
    
    if (regionError) {
      console.error('Error fetching customer geographic data:', regionError);
      return NextResponse.json({ error: 'Failed to fetch geographic data' }, { status: 500 });
    }
    
    // Process the data to group by region
    const regionMap = new Map<string, { 
      region: string;
      country: string;
      state?: string;
      city?: string;
      customers: number;
      revenue: number;
      latitude?: number;
      longitude?: number;
    }>();
    
    customersByRegion?.forEach(customer => {
      const region = customer.geographic_region || 'Unknown';
      const country = customer.country || 'Unknown';
      const state = customer.province;
      const city = customer.city;
      const revenue = parseFloat(customer.lifetime_value) || 0;
      
      if (!regionMap.has(region)) {
        // Determine coordinates
        let latitude: number | undefined;
        let longitude: number | undefined;
        
        // Check if it's a US state
        if (country === 'United States' && state && usStateCoordinates[state]) {
          [longitude, latitude] = usStateCoordinates[state];
        } 
        // Check if it's a Canadian province
        else if (country === 'Canada' && state && canadaProvinceCoordinates[state]) {
          [longitude, latitude] = canadaProvinceCoordinates[state];
        }
        // Otherwise use country coordinates
        else if (countryCoordinates[country]) {
          [longitude, latitude] = countryCoordinates[country];
        }
        
        regionMap.set(region, {
          region,
          country,
          state,
          city,
          customers: 1,
          revenue,
          latitude,
          longitude
        });
      } else {
        const existing = regionMap.get(region)!;
        existing.customers += 1;
        existing.revenue += revenue;
      }
    });
    
    // Convert the map to an array
    const regions = Array.from(regionMap.values());
    
    return NextResponse.json({ 
      regions,
      count: regions.length
    });
    
  } catch (error) {
    console.error('Error in geographic data endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch geographic data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 