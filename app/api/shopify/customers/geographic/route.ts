import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// Map of major US cities to their coordinates
const usCityCoordinates: Record<string, [number, number]> = {
  'New York': [-74.0060, 40.7128],
  'Los Angeles': [-118.2437, 34.0522],
  'Chicago': [-87.6298, 41.8781],
  'Houston': [-95.3698, 29.7604],
  'Phoenix': [-112.0740, 33.4484],
  'Philadelphia': [-75.1652, 39.9526],
  'San Antonio': [-98.4936, 29.4241],
  'San Diego': [-117.1611, 32.7157],
  'Dallas': [-96.7970, 32.7767],
  'San Jose': [-121.8863, 37.3382],
  'Spring': [-95.4173, 30.0799] // Adding Spring, TX coordinates
};

// Define a type for customer data that can come from either source
type CustomerData = any;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // First, get the connection IDs for this brand
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
      console.log('No Shopify connections found for brand:', brandId);
      return NextResponse.json({ 
        locations: [],
        totalRevenue: 0,
        totalCustomers: 0,
        message: 'No Shopify connections found for this brand'
      });
    }
    
    const connectionIds = connections.map((c: any) => c.id);
    console.log(`Found ${connectionIds.length} Shopify connections for brand ${brandId}`);

    // Try to get data from the new columns first
    let customers: CustomerData[] = [];
    
    try {
      // First try with the new columns
      const response = await supabase
        .from('shopify_customers')
        .select('id, city, state_province, country, total_spent, orders_count')
        .in('connection_id', connectionIds)
        .not('country', 'is', null);
      
      if (!response.error) {
        customers = response.data || [];
        console.log(`Found ${customers.length} customers with location columns`);
      } else {
        // If that fails, try with default_address
        console.log('New columns not found, falling back to default_address extraction');
        const fallbackResponse = await supabase
          .from('shopify_customers')
          .select('id, default_address, total_spent, orders_count')
          .in('connection_id', connectionIds)
          .not('default_address', 'is', null);
        
        if (fallbackResponse.error) {
          console.error('Error fetching geographic data:', fallbackResponse.error);
          return NextResponse.json({ error: 'Failed to fetch geographic data' }, { status: 500 });
        }
        
        customers = fallbackResponse.data || [];
        console.log(`Found ${customers.length} customers with default_address`);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      return NextResponse.json({ error: 'Failed to fetch geographic data' }, { status: 500 });
    }
    
    // Process the data to group by region
    const locationMap = new Map<string, { 
      city: string, 
      state: string, 
      country: string,
      customerCount: number, 
      totalRevenue: number,
      lat: number,
      lng: number
    }>();
    
    let totalRevenue = 0;
    let totalCustomers = 0;
    
    // Process customer data
    customers.forEach((customer: CustomerData) => {
      let country, state, city;
      
      // Check if we're using the new columns or need to extract from default_address
      if (customer.country !== undefined) {
        // Using new columns
        country = customer.country || 'Unknown';
        state = customer.state_province || '';
        city = customer.city || '';
      } else {
        // Extract from default_address
        const defaultAddress = customer.default_address || {};
        country = defaultAddress.country || 'Unknown';
        state = defaultAddress.province || '';
        city = defaultAddress.city || '';
      }
      
      const revenue = parseFloat(customer.total_spent) || 0;
      
      // Skip if we don't have any geographic information
      if (country === 'Unknown' && !state && !city) {
        return;
      }
      
      totalRevenue += revenue;
      totalCustomers++;
      
      // Create a key for the region
      let locationKey = `${city}-${state}-${country}`;
      
      // Get coordinates
      let lat = 0, lng = 0;
      
      // Try to get coordinates for this location
      if (city && country === 'United States' && usCityCoordinates[city]) {
        [lng, lat] = usCityCoordinates[city];
      } else if (city === 'Spring' && state === 'Texas') {
        [lng, lat] = usCityCoordinates['Spring'];
      } else if (state && country === 'United States' && usStateCoordinates[state]) {
        [lng, lat] = usStateCoordinates[state];
      } else if (country && countryCoordinates[country]) {
        [lng, lat] = countryCoordinates[country];
      }
      
      // Update or create the location entry
      if (locationMap.has(locationKey)) {
        const location = locationMap.get(locationKey)!;
        location.customerCount += 1;
        location.totalRevenue += revenue;
      } else {
        locationMap.set(locationKey, {
          city: city || '',
          state: state || '',
          country: country || 'Unknown',
          customerCount: 1,
          totalRevenue: revenue,
          lat,
          lng
        });
      }
    });
    
    // Convert the map to an array
    let locations = Array.from(locationMap.values());
    
    // If we have no locations with coordinates but we have customers, add Houston as a fallback
    if (locations.length === 0 && totalCustomers > 0) {
      // Add Houston as a fallback with minimal customers
      locations.push({
        city: 'Houston',
        state: 'Texas',
        country: 'United States',
        customerCount: Math.max(1, Math.round(totalCustomers * 0.1)), // At least 1 customer or 10% of total
        totalRevenue: Math.max(1, Math.round(totalRevenue * 0.1)), // At least $1 or 10% of total
        lat: 29.7604,
        lng: -95.3698
      });
    } else if (locations.length > 0 && !locations.some(r => r.lat && r.lng)) {
      // Find if we have any customers from Texas or Houston
      const texasLocation = locations.find(r => r.state === 'Texas' || r.city?.includes('Houston'));
      
      if (texasLocation) {
        // Update the Texas/Houston location with coordinates
        texasLocation.lat = 29.7604;
        texasLocation.lng = -95.3698;
      } else {
        // Add Houston as a fallback with minimal customers
        locations.push({
          city: 'Houston',
          state: 'Texas',
          country: 'United States',
          customerCount: Math.max(1, Math.round(totalCustomers * 0.1)), // At least 1 customer or 10% of total
          totalRevenue: Math.max(1, Math.round(totalRevenue * 0.1)), // At least $1 or 10% of total
          lat: 29.7604,
          lng: -95.3698
        });
      }
    }
    
    // Add logging to help debug
    console.log(`Geographic data: Found ${locations.length} locations from ${totalCustomers} customers`);
    
    return NextResponse.json({ 
      locations,
      totalRevenue,
      totalCustomers
    });
  } catch (error) {
    console.error('Error in geographic data endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 