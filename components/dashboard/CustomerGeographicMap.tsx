"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Loader2, ArrowUpDown } from 'lucide-react'
import { format } from 'date-fns'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import { cn } from "@/lib/utils"
import { CustomerSyncButton } from './CustomerSyncButton'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

interface CustomerGeographicMapProps {
  brandId: string
  isRefreshing?: boolean
}

interface RegionData {
  id: string
  city: string
  state: string
  country: string
  lat: number
  lng: number
  customerCount: number
  totalRevenue: number
}

// Metro areas for clustering
const METRO_AREAS: Record<string, { center: { lat: number, lng: number }, suburbs: string[] }> = {
  "Houston": {
    center: { lat: 29.7604, lng: -95.3698 },
    suburbs: ["Spring", "The Woodlands", "Sugar Land", "Katy", "Cypress", "Pearland", "Pasadena", "Baytown"]
  },
  "New York": {
    center: { lat: 40.7128, lng: -74.0060 },
    suburbs: ["Brooklyn", "Queens", "Bronx", "Staten Island", "Jersey City", "Newark", "Yonkers"]
  },
  "Los Angeles": {
    center: { lat: 34.0522, lng: -118.2437 },
    suburbs: ["Long Beach", "Anaheim", "Santa Ana", "Irvine", "Glendale", "Huntington Beach", "Santa Clarita"]
  },
  "Chicago": {
    center: { lat: 41.8781, lng: -87.6298 },
    suburbs: ["Aurora", "Naperville", "Joliet", "Elgin", "Waukegan", "Cicero", "Evanston"]
  },
  "Dallas": {
    center: { lat: 32.7767, lng: -96.7970 },
    suburbs: ["Fort Worth", "Arlington", "Plano", "Garland", "Irving", "Frisco", "McKinney", "Denton"]
  },
  "San Francisco": {
    center: { lat: 37.7749, lng: -122.4194 },
    suburbs: ["Oakland", "Berkeley", "San Jose", "Palo Alto", "Mountain View", "Santa Clara", "Sunnyvale"]
  },
  "Miami": {
    center: { lat: 25.7617, lng: -80.1918 },
    suburbs: ["Hollywood", "Fort Lauderdale", "Pompano Beach", "Boca Raton", "Hialeah", "Coral Gables", "Miami Beach", "Kendall", "Homestead", "Doral"]
  },
  "Atlanta": {
    center: { lat: 33.7490, lng: -84.3880 },
    suburbs: ["Marietta", "Alpharetta", "Decatur", "Sandy Springs", "Roswell", "Smyrna", "Dunwoody", "Brookhaven"]
  },
  "Boston": {
    center: { lat: 42.3601, lng: -71.0589 },
    suburbs: ["Cambridge", "Somerville", "Brookline", "Newton", "Quincy", "Medford", "Waltham", "Malden"]
  },
  "Seattle": {
    center: { lat: 47.6062, lng: -122.3321 },
    suburbs: ["Bellevue", "Redmond", "Kirkland", "Renton", "Tacoma", "Everett", "Kent", "Auburn"]
  },
  "Denver": {
    center: { lat: 39.7392, lng: -104.9903 },
    suburbs: ["Aurora", "Lakewood", "Centennial", "Littleton", "Thornton", "Westminster", "Arvada", "Boulder"]
  },
  "Phoenix": {
    center: { lat: 33.4484, lng: -112.0740 },
    suburbs: ["Scottsdale", "Mesa", "Chandler", "Tempe", "Gilbert", "Glendale", "Peoria", "Surprise"]
  },
  "Portland": {
    center: { lat: 45.5051, lng: -122.6750 },
    suburbs: ["Beaverton", "Hillsboro", "Gresham", "Tigard", "Lake Oswego", "Oregon City", "Tualatin"]
  },
  "Austin": {
    center: { lat: 30.2672, lng: -97.7431 },
    suburbs: ["Round Rock", "Cedar Park", "Georgetown", "San Marcos", "Pflugerville", "Leander", "Kyle"]
  },
  "Nashville": {
    center: { lat: 36.1627, lng: -86.7816 },
    suburbs: ["Franklin", "Murfreesboro", "Hendersonville", "Brentwood", "Lebanon", "Smyrna", "Gallatin"]
  },
  "Philadelphia": {
    center: { lat: 39.9526, lng: -75.1652 },
    suburbs: ["Camden", "Cherry Hill", "King of Prussia", "West Chester", "Norristown", "Doylestown", "Media"]
  }
};

// Calculate distance between two points in km
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

// Find metro area for a city
function findMetroArea(city: string | null | undefined): string | null {
  if (!city) return null;
  
  for (const [metro, data] of Object.entries(METRO_AREAS)) {
    if (city.toLowerCase() === metro.toLowerCase() || data.suburbs.some(s => city.toLowerCase() === s.toLowerCase())) {
      return metro;
    }
  }
  return null;
}

export function CustomerGeographicMap({ brandId, isRefreshing = false }: CustomerGeographicMapProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<RegionData[]>([]);
  const [clusteredData, setClusteredData] = useState<RegionData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [dataSource, setDataSource] = useState<string>('loading');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const supabase = useSupabase();
  const [activeTab, setActiveTab] = useState('chart');
  const [sortColumn, setSortColumn] = useState<'city' | 'customerCount' | 'totalRevenue'>('totalRevenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [message, setMessage] = useState<string | null>(null);

  const fetchGeoData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the Shopify connection ID
      const shopifyConnectionId = await getShopifyConnectionId();
      setConnectionId(shopifyConnectionId);
      
      const response = await fetch(`/api/shopify/customers/geographic?brandId=${brandId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch geographic data');
      }
      
      if (data.dataSource) {
        setDataSource(data.dataSource);
      }
      
      if (!data.locations || data.locations.length === 0) {
        setLocations([]);
        setClusteredData([]);
        setTotalRevenue(0);
        setTotalCustomers(0);
        setError('No geographic data found. Please sync your customers first.');
        return;
      }
      
      // Process the data
      const rawLocations: RegionData[] = data.locations.map((loc: any) => ({
        id: loc.id || `${loc.city}-${loc.state}-${loc.country}`,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        lat: loc.lat,
        lng: loc.lng,
        customerCount: loc.customerCount || 0,
        totalRevenue: loc.totalRevenue || 0
      }));
      
      setLocations(rawLocations);
      setClusteredData(rawLocations);
      setTotalCustomers(data.totalCustomers || 0);
      setTotalRevenue(data.totalRevenue || 0);
    } catch (error) {
      console.error('Error fetching geographic data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch geographic data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (brandId) {
      fetchGeoData();
    }
  }, [brandId, isRefreshing]);
  
  // Add a function to get the Shopify connection ID
  const getShopifyConnectionId = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('brand_id', brandId)
        .eq('platform_type', 'shopify')
        .eq('status', 'active')
        .single();
      
      if (error) {
        console.error('Error fetching Shopify connection:', error);
        return null;
      }
      
      return data?.id || null;
    } catch (error) {
      console.error('Error in getShopifyConnectionId:', error);
      return null;
    }
  };
  
  const handleSort = (column: 'city' | 'customerCount' | 'totalRevenue') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };
  
  const sortedData = [...clusteredData].sort((a, b) => {
    if (sortColumn === 'city') {
      const cityA = `${a.city}, ${a.state}, ${a.country}`;
      const cityB = `${b.city}, ${b.state}, ${b.country}`;
      return sortDirection === 'asc' 
        ? cityA.localeCompare(cityB)
        : cityB.localeCompare(cityA);
    } else {
      return sortDirection === 'asc'
        ? a[sortColumn] - b[sortColumn]
        : b[sortColumn] - a[sortColumn];
    }
  });
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const getDataSourceLabel = () => {
    switch (dataSource) {
      case 'customer_location':
        return 'Customer Location Data';
      case 'default_address':
        return 'Customer Address Data';
      case 'default':
        return 'Default Sample Data';
      case 'none':
        return 'No Data Available';
      default:
        return 'Loading...';
    }
  };
  
  const renderSortIcon = (column: 'city' | 'customerCount' | 'totalRevenue') => {
    if (sortColumn !== column) return null;
    
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold">Customer Geography</CardTitle>
            <CardDescription>
              {loading ? (
                'Loading customer geographic data...'
              ) : error ? (
                error
              ) : (
                <div className="space-y-1">
                  <div>
                    {totalCustomers} {totalCustomers === 1 ? 'customer' : 'customers'} across {locations.length} {locations.length === 1 ? 'location' : 'locations'} 
                    {totalRevenue > 0 && ` with ${formatCurrency(totalRevenue)} total revenue`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Source: {getDataSourceLabel()}
                    {message && <span className="ml-2 text-amber-500">{message}</span>}
                  </div>
                </div>
              )}
            </CardDescription>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[200px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chart">Map</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="h-[calc(100%-5rem)]">
        <div className="h-full">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading geographic data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  <div className="space-y-2">
                    <p>{error}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchGeoData}
                      className="mt-2"
                    >
                      Try Again
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="h-full">
              <TabsContent value="chart" className="h-full">
                {/* Map visualization goes here */}
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <MapPin className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Map visualization coming soon</p>
                    <p className="text-xs text-muted-foreground">
                      {locations.length} locations with {totalCustomers} customers
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="table" className="h-full">
                <div className="h-full overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer"
                          onClick={() => handleSort('city')}
                        >
                          Location {renderSortIcon('city')}
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer"
                          onClick={() => handleSort('customerCount')}
                        >
                          Customers {renderSortIcon('customerCount')}
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer"
                          onClick={() => handleSort('totalRevenue')}
                        >
                          Revenue {renderSortIcon('totalRevenue')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No geographic data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedData.map((location) => (
                          <TableRow key={location.id}>
                            <TableCell className="font-medium">
                              {location.city}
                              {location.state && <span className="text-muted-foreground">, {location.state}</span>}
                              {location.country && location.country !== 'United States' && (
                                <span className="text-muted-foreground">, {location.country}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{location.customerCount}</TableCell>
                            <TableCell className="text-right">{formatCurrency(location.totalRevenue)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}