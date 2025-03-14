import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mapping of countries to coordinates
const COUNTRY_COORDINATES: Record<string, { lat: number, lng: number }> = {
  'United States': { lat: 37.0902, lng: -95.7129 },
  'Canada': { lat: 56.1304, lng: -106.3468 },
  'United Kingdom': { lat: 55.3781, lng: -3.4360 },
  'Australia': { lat: -25.2744, lng: 133.7751 },
  'Germany': { lat: 51.1657, lng: 10.4515 },
  'France': { lat: 46.2276, lng: 2.2137 },
  'Italy': { lat: 41.8719, lng: 12.5674 },
  'Spain': { lat: 40.4637, lng: -3.7492 },
  'Japan': { lat: 36.2048, lng: 138.2529 },
  'China': { lat: 35.8617, lng: 104.1954 },
  'India': { lat: 20.5937, lng: 78.9629 },
  'Brazil': { lat: -14.2350, lng: -51.9253 },
  'Mexico': { lat: 23.6345, lng: -102.5528 },
  'South Africa': { lat: -30.5595, lng: 22.9375 },
  'Russia': { lat: 61.5240, lng: 105.3188 },
  'South Korea': { lat: 35.9078, lng: 127.7669 },
  'Netherlands': { lat: 52.1326, lng: 5.2913 },
  'Sweden': { lat: 60.1282, lng: 18.6435 },
  'Switzerland': { lat: 46.8182, lng: 8.2275 },
  'New Zealand': { lat: -40.9006, lng: 174.8860 }
};

// Mapping of US states to coordinates
const US_STATE_COORDINATES: Record<string, { lat: number, lng: number }> = {
  'Alabama': { lat: 32.3182, lng: -86.9023 },
  'Alaska': { lat: 64.2008, lng: -149.4937 },
  'Arizona': { lat: 34.0489, lng: -111.0937 },
  'Arkansas': { lat: 35.2010, lng: -91.8318 },
  'California': { lat: 36.7783, lng: -119.4179 },
  'Colorado': { lat: 39.5501, lng: -105.7821 },
  'Connecticut': { lat: 41.6032, lng: -73.0877 },
  'Delaware': { lat: 38.9108, lng: -75.5277 },
  'Florida': { lat: 27.6648, lng: -81.5158 },
  'Georgia': { lat: 32.1656, lng: -82.9001 },
  'Hawaii': { lat: 19.8968, lng: -155.5828 },
  'Idaho': { lat: 44.0682, lng: -114.7420 },
  'Illinois': { lat: 40.6331, lng: -89.3985 },
  'Indiana': { lat: 40.2672, lng: -86.1349 },
  'Iowa': { lat: 41.8780, lng: -93.0977 },
  'Kansas': { lat: 39.0119, lng: -98.4842 },
  'Kentucky': { lat: 37.8393, lng: -84.2700 },
  'Louisiana': { lat: 30.9843, lng: -91.9623 },
  'Maine': { lat: 45.2538, lng: -69.4455 },
  'Maryland': { lat: 39.0458, lng: -76.6413 },
  'Massachusetts': { lat: 42.4072, lng: -71.3824 },
  'Michigan': { lat: 44.3148, lng: -85.6024 },
  'Minnesota': { lat: 46.7296, lng: -94.6859 },
  'Mississippi': { lat: 32.3547, lng: -89.3985 },
  'Missouri': { lat: 37.9643, lng: -91.8318 },
  'Montana': { lat: 46.8797, lng: -110.3626 },
  'Nebraska': { lat: 41.4925, lng: -99.9018 },
  'Nevada': { lat: 38.8026, lng: -116.4194 },
  'New Hampshire': { lat: 43.1939, lng: -71.5724 },
  'New Jersey': { lat: 40.0583, lng: -74.4057 },
  'New Mexico': { lat: 34.5199, lng: -105.8701 },
  'New York': { lat: 42.1657, lng: -74.9481 },
  'North Carolina': { lat: 35.7596, lng: -79.0193 },
  'North Dakota': { lat: 47.5515, lng: -101.0020 },
  'Ohio': { lat: 40.4173, lng: -82.9071 },
  'Oklahoma': { lat: 35.0078, lng: -97.0929 },
  'Oregon': { lat: 43.8041, lng: -120.5542 },
  'Pennsylvania': { lat: 41.2033, lng: -77.1945 },
  'Rhode Island': { lat: 41.5801, lng: -71.4774 },
  'South Carolina': { lat: 33.8361, lng: -81.1637 },
  'South Dakota': { lat: 43.9695, lng: -99.9018 },
  'Tennessee': { lat: 35.5175, lng: -86.5804 },
  'Texas': { lat: 31.9686, lng: -99.9018 },
  'Utah': { lat: 39.3210, lng: -111.0937 },
  'Vermont': { lat: 44.5588, lng: -72.5778 },
  'Virginia': { lat: 37.4316, lng: -78.6569 },
  'Washington': { lat: 47.7511, lng: -120.7401 },
  'West Virginia': { lat: 38.5976, lng: -80.4549 },
  'Wisconsin': { lat: 43.7844, lng: -88.7879 },
  'Wyoming': { lat: 43.0759, lng: -107.2903 }
};

// Mapping of Canadian provinces to coordinates
const CANADA_PROVINCE_COORDINATES: Record<string, { lat: number, lng: number }> = {
  'Alberta': { lat: 53.9333, lng: -116.5765 },
  'British Columbia': { lat: 53.7267, lng: -127.6476 },
  'Manitoba': { lat: 53.7609, lng: -98.8139 },
  'New Brunswick': { lat: 46.5653, lng: -66.4619 },
  'Newfoundland and Labrador': { lat: 53.1355, lng: -57.6604 },
  'Northwest Territories': { lat: 64.8255, lng: -124.8457 },
  'Nova Scotia': { lat: 44.6820, lng: -63.7443 },
  'Nunavut': { lat: 70.2998, lng: -83.1076 },
  'Ontario': { lat: 51.2538, lng: -85.3232 },
  'Prince Edward Island': { lat: 46.5107, lng: -63.4168 },
  'Quebec': { lat: 52.9399, lng: -73.5491 },
  'Saskatchewan': { lat: 52.9399, lng: -106.4509 },
  'Yukon': { lat: 64.2823, lng: -135.0000 }
};

// Mapping of major US cities to coordinates
const US_CITY_COORDINATES: Record<string, { lat: number, lng: number }> = {
  'New York': { lat: 40.7128, lng: -74.0060 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Houston': { lat: 29.7604, lng: -95.3698 },
  'Phoenix': { lat: 33.4484, lng: -112.0740 },
  'Philadelphia': { lat: 39.9526, lng: -75.1652 },
  'San Antonio': { lat: 29.4241, lng: -98.4936 },
  'San Diego': { lat: 32.7157, lng: -117.1611 },
  'Dallas': { lat: 32.7767, lng: -96.7970 },
  'San Jose': { lat: 37.3382, lng: -121.8863 },
  'Austin': { lat: 30.2672, lng: -97.7431 },
  'Jacksonville': { lat: 30.3322, lng: -81.6557 },
  'Fort Worth': { lat: 32.7555, lng: -97.3308 },
  'Columbus': { lat: 39.9612, lng: -82.9988 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'Charlotte': { lat: 35.2271, lng: -80.8431 },
  'Indianapolis': { lat: 39.7684, lng: -86.1581 },
  'Seattle': { lat: 47.6062, lng: -122.3321 },
  'Denver': { lat: 39.7392, lng: -104.9903 },
  'Washington': { lat: 38.9072, lng: -77.0369 },
  'Boston': { lat: 42.3601, lng: -71.0589 },
  'El Paso': { lat: 31.7619, lng: -106.4850 },
  'Nashville': { lat: 36.1627, lng: -86.7816 },
  'Detroit': { lat: 42.3314, lng: -83.0458 },
  'Oklahoma City': { lat: 35.4676, lng: -97.5164 },
  'Portland': { lat: 45.5051, lng: -122.6750 },
  'Las Vegas': { lat: 36.1699, lng: -115.1398 },
  'Memphis': { lat: 35.1495, lng: -90.0490 },
  'Louisville': { lat: 38.2527, lng: -85.7585 },
  'Baltimore': { lat: 39.2904, lng: -76.6122 },
  'Milwaukee': { lat: 43.0389, lng: -87.9065 },
  'Albuquerque': { lat: 35.0844, lng: -106.6504 },
  'Tucson': { lat: 32.2226, lng: -110.9747 },
  'Fresno': { lat: 36.7378, lng: -119.7871 },
  'Sacramento': { lat: 38.5816, lng: -121.4944 },
  'Kansas City': { lat: 39.0997, lng: -94.5786 },
  'Mesa': { lat: 33.4152, lng: -111.8315 },
  'Atlanta': { lat: 33.7490, lng: -84.3880 },
  'Omaha': { lat: 41.2565, lng: -95.9345 },
  'Colorado Springs': { lat: 38.8339, lng: -104.8214 },
  'Raleigh': { lat: 35.7796, lng: -78.6382 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Oakland': { lat: 37.8044, lng: -122.2711 },
  'Minneapolis': { lat: 44.9778, lng: -93.2650 },
  'Tulsa': { lat: 36.1540, lng: -95.9928 },
  'Cleveland': { lat: 41.4993, lng: -81.6944 },
  'Wichita': { lat: 37.6872, lng: -97.3301 },
  'Arlington': { lat: 32.7357, lng: -97.1081 },
  'New Orleans': { lat: 29.9511, lng: -90.0715 },
  'Bakersfield': { lat: 35.3733, lng: -119.0187 },
  'Tampa': { lat: 27.9506, lng: -82.4572 },
  'Honolulu': { lat: 21.3069, lng: -157.8583 },
  'Aurora': { lat: 39.7294, lng: -104.8319 },
  'Anaheim': { lat: 33.8366, lng: -117.9143 },
  'Santa Ana': { lat: 33.7455, lng: -117.8677 },
  'St. Louis': { lat: 38.6270, lng: -90.1994 },
  'Riverside': { lat: 33.9806, lng: -117.3755 },
  'Corpus Christi': { lat: 27.8006, lng: -97.3964 },
  'Lexington': { lat: 38.0406, lng: -84.5037 },
  'Pittsburgh': { lat: 40.4406, lng: -79.9959 },
  'Anchorage': { lat: 61.2181, lng: -149.9003 },
  'Stockton': { lat: 37.9577, lng: -121.2908 },
  'Cincinnati': { lat: 39.1031, lng: -84.5120 },
  'St. Paul': { lat: 44.9537, lng: -93.0900 },
  'Toledo': { lat: 41.6639, lng: -83.5552 },
  'Newark': { lat: 40.7357, lng: -74.1724 },
  'Greensboro': { lat: 36.0726, lng: -79.7920 },
  'Plano': { lat: 33.0198, lng: -96.6989 },
  'Henderson': { lat: 36.0395, lng: -114.9817 },
  'Lincoln': { lat: 40.8136, lng: -96.7026 },
  'Buffalo': { lat: 42.8864, lng: -78.8784 },
  'Fort Wayne': { lat: 41.0793, lng: -85.1394 },
  'Jersey City': { lat: 40.7282, lng: -74.0776 },
  'Chula Vista': { lat: 32.6401, lng: -117.0842 },
  'Orlando': { lat: 28.5383, lng: -81.3792 },
  'St. Petersburg': { lat: 27.7676, lng: -82.6403 },
  'Norfolk': { lat: 36.8508, lng: -76.2859 },
  'Chandler': { lat: 33.3062, lng: -111.8413 },
  'Laredo': { lat: 27.5306, lng: -99.4803 },
  'Madison': { lat: 43.0731, lng: -89.4012 },
  'Durham': { lat: 35.9940, lng: -78.8986 },
  'Lubbock': { lat: 33.5779, lng: -101.8552 },
  'Winston-Salem': { lat: 36.0999, lng: -80.2442 },
  'Garland': { lat: 32.9126, lng: -96.6389 },
  'Glendale': { lat: 33.5387, lng: -112.1860 },
  'Hialeah': { lat: 25.8576, lng: -80.2781 },
  'Reno': { lat: 39.5296, lng: -119.8138 },
  'Baton Rouge': { lat: 30.4583, lng: -91.1403 },
  'Irvine': { lat: 33.6846, lng: -117.8265 },
  'Chesapeake': { lat: 36.7682, lng: -76.2875 },
  'Irving': { lat: 32.8140, lng: -96.9489 },
  'Scottsdale': { lat: 33.4942, lng: -111.9261 },
  'North Las Vegas': { lat: 36.1989, lng: -115.1175 },
  'Fremont': { lat: 37.5485, lng: -121.9886 },
  'Gilbert': { lat: 33.3528, lng: -111.7890 },
  'San Bernardino': { lat: 34.1083, lng: -117.2898 },
  'Boise': { lat: 43.6150, lng: -116.2023 },
  'Birmingham': { lat: 33.5207, lng: -86.8025 }
};

// Define a type for customer data that can come from either source
type CustomerData = any;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get('brandId');

  if (!brandId) {
    console.error('Missing brandId in request');
    return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
  }

  console.log('Fetching geographic data for brand:', brandId);

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get connection IDs for this brand
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('id, shop')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active');

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      return NextResponse.json({ 
        error: 'Failed to fetch connections', 
        details: connectionsError.message 
      }, { status: 500 });
    }

    if (!connections || connections.length === 0) {
      console.log('No active Shopify connections found for brand:', brandId);
      return NextResponse.json({ 
        error: 'No active Shopify connections found',
        solution: 'Please connect your Shopify store in the settings page',
        locations: [],
        totalCustomers: 0,
        totalRevenue: 0
      }, { status: 404 });
    }

    // Log the connections for debugging
    console.log('Found connections:', connections.map(c => ({ id: c.id, shop: c.shop })));

    // Check if any connection is missing shop URL
    const missingShopConnections = connections.filter(c => !c.shop);
    if (missingShopConnections.length > 0) {
      console.warn('Some connections are missing shop URL:', missingShopConnections.map(c => c.id));
    }

    // Get all connection IDs
    const connectionIds = connections.map(c => c.id);

    // First try to get customer data from the shopify_customers table
    let { data: customers, error: customersError } = await supabase
      .from('shopify_customers')
      .select('id, city, state_province, country, total_spent, orders_count, lat, lng, connection_id')
      .in('connection_id', connectionIds);

    // Check if the shopify_customers table exists
    if (customersError && customersError.message.includes('relation "shopify_customers" does not exist')) {
      console.error('shopify_customers table does not exist');
      return NextResponse.json({ 
        error: 'Customer data table does not exist',
        solution: 'Please sync your customers to create the necessary tables',
        locations: [],
        totalCustomers: 0,
        totalRevenue: 0
      }, { status: 404 });
    }

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      return NextResponse.json({ 
        error: 'Failed to fetch customer data', 
        details: customersError.message 
      }, { status: 500 });
    }

    // If no customers found, return empty response
    if (!customers || customers.length === 0) {
      console.log('No customer data found for brand:', brandId);
      return NextResponse.json({ 
        error: 'No customer data found',
        solution: 'Please sync your customers from Shopify',
        locations: [],
        totalCustomers: 0,
        totalRevenue: 0
      });
    }

    // Log sample customer data for debugging
    console.log('Sample customer data:', customers.slice(0, 3));

    // Create a map to aggregate customer counts and revenue by location
    const locationMap = new Map<string, {
      city: string;
      state: string;
      country: string;
      lat: number | null;
      lng: number | null;
      customerCount: number;
      totalRevenue: number;
    }>();

    // Process customer data
    let totalCustomers = 0;
    let totalRevenue = 0;
    let dataSource = 'customer_location';

    for (const customer of customers) {
      totalCustomers++;
      
      // Parse revenue value
      const revenue = typeof customer.total_spent === 'string' 
        ? parseFloat(customer.total_spent) 
        : (customer.total_spent || 0);
      
      totalRevenue += revenue;

      // Skip customers without location data
      if (!customer.city && !customer.state_province && !customer.country) {
        continue;
      }

      const locationKey = `${customer.city || ''}|${customer.state_province || ''}|${customer.country || ''}`;
      
      if (!locationMap.has(locationKey)) {
        locationMap.set(locationKey, {
          city: customer.city || '',
          state: customer.state_province || '',
          country: customer.country || '',
          lat: customer.lat || null,
          lng: customer.lng || null,
          customerCount: 0,
          totalRevenue: 0
        });
      }

      const location = locationMap.get(locationKey)!;
      location.customerCount++;
      location.totalRevenue += revenue;
    }

    // Convert the map to an array
    let locations = Array.from(locationMap.values());

    // Assign coordinates to locations that don't have them
    for (const location of locations) {
      if (!location.lat || !location.lng) {
        // Try to find coordinates based on city, state, or country
        if (location.city && US_CITY_COORDINATES[location.city]) {
          location.lat = US_CITY_COORDINATES[location.city].lat;
          location.lng = US_CITY_COORDINATES[location.city].lng;
        } else if (location.state && US_STATE_COORDINATES[location.state]) {
          location.lat = US_STATE_COORDINATES[location.state].lat;
          location.lng = US_STATE_COORDINATES[location.state].lng;
        } else if (location.country && COUNTRY_COORDINATES[location.country]) {
          location.lat = COUNTRY_COORDINATES[location.country].lat;
          location.lng = COUNTRY_COORDINATES[location.country].lng;
        } else {
          // Default to center of the world if no coordinates found
          location.lat = 0;
          location.lng = 0;
        }
      }
    }

    // Filter out locations with no coordinates
    locations = locations.filter(loc => loc.lat !== null && loc.lng !== null);

    // If no locations with coordinates, add a default location
    if (locations.length === 0) {
      // Add Houston as a default location
      locations.push({
        city: 'Houston',
        state: 'Texas',
        country: 'United States',
        lat: 29.7604,
        lng: -95.3698,
        customerCount: totalCustomers > 0 ? totalCustomers : 1,
        totalRevenue: totalRevenue > 0 ? totalRevenue : 100
      });
    }

    // Add IDs to locations
    locations = locations.map((loc, index) => ({
      id: `loc-${index}`,
      ...loc
    }));

    console.log(`Returning ${locations.length} locations with ${totalCustomers} customers and $${totalRevenue} revenue`);

    return NextResponse.json({
      locations,
      totalCustomers,
      totalRevenue,
      dataSource
    });
  } catch (error) {
    console.error('Error in geographic data API:', error);
    return NextResponse.json({ 
      error: 'Failed to process geographic data', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 