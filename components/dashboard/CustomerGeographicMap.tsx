"use client"

import React, { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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
  // Check if city is a known suburb
  for (const [metro, data] of Object.entries(METRO_AREAS)) {
    if (data.suburbs.includes(city)) {
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

// Convert lat/lng to x/y coordinates on a world map
function latLngToXY(lat: number, lng: number, width: number, height: number): { x: number, y: number } {
  // Simple equirectangular projection
  const x = (lng + 180) * (width / 360);
  const y = (90 - lat) * (height / 180);
  return { x, y };
}

export function CustomerGeographicMap({ brandId, isRefreshing = false }: CustomerGeographicMapProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasZeroRevenue, setHasZeroRevenue] = useState(false)
  const [clusteredData, setClusteredData] = useState<RegionData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'revenue' | 'customers'>('revenue')
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null)
  const [mapDimensions, setMapDimensions] = useState({ width: 800, height: 400 })
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Update map dimensions when container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        setMapDimensions({
          width: containerRef.current.clientWidth,
          height: 400
        });
      }
    };
    
    // Set initial dimensions
    updateDimensions();
    
    // Add resize listener
    window.addEventListener('resize', updateDimensions);
    
    // Create ResizeObserver for more accurate size tracking
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);
      
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateDimensions);
      };
    }
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [containerRef.current]);
  
  useEffect(() => {
    if (!brandId) return;

    const fetchGeoData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/shopify/customers/geographic?brandId=${brandId}`);
        if (!response.ok) {
          throw new Error(`Error fetching geographic data: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.locations || data.locations.length === 0) {
          setError("No geographic data found");
          setIsLoading(false);
          return;
        }
        
        // Set total values
        setTotalRevenue(data.totalRevenue || 0);
        setTotalCustomers(data.totalCustomers || 0);
        
        // Check if all revenue values are zero
        const hasZeroRev = (data.totalRevenue || 0) === 0 && (data.totalCustomers || 0) > 0;
        setHasZeroRevenue(hasZeroRev);
        
        // If we have zero revenue, default to customers view
        if (hasZeroRev) {
          setView('customers');
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
        console.error('Error fetching geographic data:', error);
        setError("Failed to load geographic data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGeoData();
  }, [brandId, isRefreshing]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const renderZeroRevenueNotice = () => {
    if (!hasZeroRevenue) return null;
    
    return (
      <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-md p-3 text-sm text-amber-600 dark:text-amber-400">
        Your store has customers but no revenue data yet. The map is showing customer locations instead of sales.
      </div>
    );
  };

  // Sort data by revenue or customer count
  const sortedData = [...clusteredData].sort((a, b) => {
    if (view === 'revenue') {
      return b.totalRevenue - a.totalRevenue;
    } else {
      return b.customerCount - a.customerCount;
    }
  });

  // Handle dot hover
  const handleDotHover = (region: RegionData | null) => {
    setHoveredRegion(region);
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
              {/* Map Visualization */}
              <div ref={containerRef} className="relative w-full h-[400px] bg-gray-900 rounded-md overflow-hidden">
                {/* World Map Background */}
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg"
                  alt="World Map"
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
                
                {/* SVG Overlay for Dots */}
                <svg 
                  className="absolute inset-0 w-full h-full"
                  viewBox={`0 0 ${mapDimensions.width} ${mapDimensions.height}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {clusteredData.map((region) => {
                    const { x, y } = latLngToXY(
                      region.lat, 
                      region.lng, 
                      mapDimensions.width, 
                      mapDimensions.height
                    );
                    
                    // Size based on data
                    const size = view === 'revenue' 
                      ? Math.max(4, Math.min(12, 4 + (region.totalRevenue / 1000)))
                      : Math.max(4, Math.min(12, 4 + (region.customerCount / 10)));
                    
                    // Color based on data
                    const color = view === 'revenue'
                      ? region.totalRevenue > 0 ? '#3b82f6' : '#6b7280'
                      : '#8b5cf6';
                    
                    // Only render if coordinates are valid
                    if (isNaN(x) || isNaN(y)) return null;
                    
                    return (
                      <circle
                        key={region.id}
                        cx={x}
                        cy={y}
                        r={size}
                        fill={color}
                        opacity={0.8}
                        stroke={hoveredRegion?.id === region.id ? 'white' : 'transparent'}
                        strokeWidth={2}
                        onMouseEnter={() => handleDotHover(region)}
                        onMouseLeave={() => handleDotHover(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </svg>
                
                {/* Tooltip */}
                {hoveredRegion && (
                  <div 
                    className="absolute z-50 bg-black/80 text-white text-xs p-2 rounded pointer-events-none border border-gray-600"
                    style={{
                      left: '50%',
                      bottom: '20px',
                      transform: 'translateX(-50%)',
                      minWidth: '180px'
                    }}
                  >
                    <div className="font-medium">
                      {hoveredRegion.city}
                      {hoveredRegion.state ? `, ${hoveredRegion.state}` : ''}
                      {hoveredRegion.country && hoveredRegion.country !== 'United States' ? `, ${hoveredRegion.country}` : ''}
                    </div>
                    <div className="flex justify-between gap-4 mt-1">
                      <span>Customers: <strong>{hoveredRegion.customerCount}</strong></span>
                      <span>Revenue: <strong>{formatCurrency(hoveredRegion.totalRevenue)}</strong></span>
                    </div>
                  </div>
                )}
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
                    {sortedData.slice(0, 10).map((region) => (
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