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
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Find metro area for a city
function findMetroArea(city: string, lat: number, lng: number): string {
  // Normalize city name for case-insensitive comparison
  const normalizedCity = city?.toLowerCase() || '';
  
  // Check if city is a known suburb (case-insensitive)
  for (const [metro, data] of Object.entries(METRO_AREAS)) {
    if (data.suburbs.some(suburb => suburb.toLowerCase() === normalizedCity)) {
      return metro;
    }
  }
  
  // Check if city is within 50km of a metro center
  for (const [metro, data] of Object.entries(METRO_AREAS)) {
    const distance = calculateDistance(lat, lng, data.center.lat, data.center.lng);
    if (distance < 50) {
      return metro;
    }
  }
  
  // If not a suburb or near a metro, return the original city name
  return city;
}

export function CustomerGeographicMap({ brandId, isRefreshing = false }: CustomerGeographicMapProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasZeroRevenue, setHasZeroRevenue] = useState(false)
  const [clusteredData, setClusteredData] = useState<RegionData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'revenue' | 'customers'>('revenue')
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [displayCount, setDisplayCount] = useState(10)
  
  useEffect(() => {
    if (!brandId) return

    const fetchGeoData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/shopify/customers/geographic?brandId=${brandId}`)
        if (!response.ok) {
          throw new Error(`Error fetching geographic data: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        if (!data.locations || data.locations.length === 0) {
          setError("No geographic data found")
          setIsLoading(false)
          return
        }
        
        // Set total values
        setTotalRevenue(data.totalRevenue || 0)
        setTotalCustomers(data.totalCustomers || 0)
        
        // Check if all revenue values are zero
        const hasZeroRev = (data.totalRevenue || 0) === 0 && (data.totalCustomers || 0) > 0
        setHasZeroRevenue(hasZeroRev)
        
        // If we have zero revenue, default to customers view
        if (hasZeroRev) {
          setView('customers')
        }
        
        // Process and cluster the data
        const processedData = data.locations.map((loc: any) => {
          // Default coordinates for locations without lat/lng
          const lat = loc.lat || 0;
          const lng = loc.lng || 0;
          
          // Find metro area for city clustering
          const metroArea = findMetroArea(loc.city, lat, lng);
          
          return {
            id: `${metroArea}-${loc.state}-${loc.country}`,
            city: metroArea, // Use metro area name instead of original city
            state: loc.state,
            country: loc.country,
            lat: METRO_AREAS[metroArea as keyof typeof METRO_AREAS]?.center.lat || lat,
            lng: METRO_AREAS[metroArea as keyof typeof METRO_AREAS]?.center.lng || lng,
            customerCount: loc.customerCount,
            totalRevenue: loc.totalRevenue
          };
        });
        
        // Aggregate data by metro area
        const aggregatedData: Record<string, RegionData> = {};
        
        processedData.forEach((loc: RegionData) => {
          const key = `${loc.city}-${loc.state}-${loc.country}`;
          
          if (!aggregatedData[key]) {
            aggregatedData[key] = { ...loc };
          } else {
            aggregatedData[key].customerCount += loc.customerCount;
            aggregatedData[key].totalRevenue += loc.totalRevenue;
          }
        });
        
        setClusteredData(Object.values(aggregatedData));
        
      } catch (error) {
        console.error('Error fetching geographic data:', error)
        setError("Failed to load geographic data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchGeoData()
  }, [brandId, isRefreshing])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const renderZeroRevenueNotice = () => {
    if (!hasZeroRevenue) return null;
    
    return (
      <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-md p-3 text-sm text-amber-600 dark:text-amber-400">
        Your store has customers but no revenue data yet. The chart is showing customer locations instead of sales.
      </div>
    );
  };

  // Sort data by revenue or customer count
  const getSortedData = () => {
    return [...clusteredData].sort((a, b) => {
      const compareValue = view === 'revenue' 
        ? (b.totalRevenue - a.totalRevenue) 
        : (b.customerCount - a.customerCount);
      
      return sortOrder === 'desc' ? compareValue : -compareValue;
    });
  };

  const sortedData = getSortedData();
  
  // Prepare data for the bar chart
  const chartData = sortedData.slice(0, displayCount).map(location => {
    const locationName = `${location.city}${location.state ? `, ${location.state.substring(0, 2)}` : ''}`;
    return {
      name: locationName,
      fullName: `${location.city}${location.state ? `, ${location.state}` : ''}${location.country && location.country !== 'United States' ? `, ${location.country}` : ''}`,
      revenue: location.totalRevenue,
      customers: location.customerCount
    };
  });

  // Custom tooltip for the bar chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-md shadow-lg">
          <p className="font-medium text-white">{payload[0].payload.fullName}</p>
          <p className="text-blue-400">Revenue: {formatCurrency(payload[0].payload.revenue)}</p>
          <p className="text-purple-400">Customers: {payload[0].payload.customers}</p>
        </div>
      );
    }
    return null;
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  const handleShowMore = () => {
    setDisplayCount(prev => Math.min(prev + 10, clusteredData.length));
  };

  const handleShowLess = () => {
    setDisplayCount(prev => Math.max(prev - 10, 5));
  };

  return (
    <Card className="col-span-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold">Customer Geography</CardTitle>
        <CardDescription>Geographic distribution of customers</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="revenue" className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="revenue" onClick={() => setView('revenue')} disabled={hasZeroRevenue}>Revenue</TabsTrigger>
              <TabsTrigger value="customers" onClick={() => setView('customers')}>Customers</TabsTrigger>
            </TabsList>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleSortOrder}
              className="flex items-center gap-1"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortOrder === 'desc' ? 'Highest First' : 'Lowest First'}
            </Button>
          </div>
          
          {isLoading ? (
            <div className="w-full h-[400px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="w-full h-[400px] flex items-center justify-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : clusteredData.length > 0 ? (
            <div className="space-y-6">
              {/* Bar Chart */}
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70} 
                      tick={{ fill: '#888', fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fill: '#888' }}
                      tickFormatter={(value) => view === 'revenue' 
                        ? formatCurrency(value).replace('$', '') 
                        : value.toString()
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey={view === 'revenue' ? 'revenue' : 'customers'} 
                      fill={view === 'revenue' ? '#3b82f6' : '#8b5cf6'}
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={view === 'revenue' 
                            ? (entry.revenue > 0 ? '#3b82f6' : '#6b7280') 
                            : '#8b5cf6'
                          } 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {renderZeroRevenueNotice()}
              
              {/* Data Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Customers</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.slice(0, displayCount).map((region) => (
                      <TableRow key={region.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span>
                              {region.city}
                              {region.state ? `, ${region.state}` : ''}
                              {region.country && region.country !== 'United States' ? `, ${region.country}` : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{region.customerCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(region.totalRevenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Show more/less buttons */}
              <div className="flex justify-center gap-2">
                {displayCount > 5 && (
                  <Button variant="outline" size="sm" onClick={handleShowLess}>
                    Show Less
                  </Button>
                )}
                {displayCount < clusteredData.length && (
                  <Button variant="outline" size="sm" onClick={handleShowMore}>
                    Show More
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">No geographic data available</p>
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}