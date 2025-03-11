// Add type declarations at the top of the file
declare global {
  interface Window {
    Globe: any;
    countries: any;
    THREE: any;
  }
}

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

interface Location {
  city: string;
  state?: string;
  country: string;
  lat: number;
  lng: number;
  customerCount: number;
  totalRevenue: number;
}

interface CustomerGeographicData {
  locations: Location[];
  topRegions: {
    byCustomers: { region: string; count: number }[];
    byRevenue: { region: string; revenue: number }[];
  };
}

// Define a simpler interface for the data passed to the GlobeComponent
interface GlobePoint {
  lat: number;
  lng: number;
  size: number;
  color: string;
  name: string;
  state?: string;
  country: string;
  customers: number;
  revenue: number;
}

const GlobeComponent = ({ data, viewMode }: { data: CustomerGeographicData; viewMode: 'customers' | 'revenue' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load required scripts
    const loadScripts = async () => {
      if (!window.Globe) {
        // Load Three.js first
        const threeScript = document.createElement('script');
        threeScript.src = 'https://unpkg.com/three@0.152.2/build/three.min.js';
        document.head.appendChild(threeScript);
        
        await new Promise(resolve => threeScript.onload = resolve);
        
        // Then load globe.gl
        const globeScript = document.createElement('script');
        globeScript.src = 'https://unpkg.com/globe.gl@2.32.1/dist/globe.gl.min.js';
        document.head.appendChild(globeScript);
        
        await new Promise(resolve => globeScript.onload = resolve);
        
        // Load countries data
        if (!window.countries) {
          const response = await fetch('https://unpkg.com/world-atlas@2/countries-110m.json');
          window.countries = await response.json();
        }
      }
      
      setIsLoading(false);
      initGlobe();
    };

    loadScripts();

    // Cleanup function
    return () => {
      if (globeRef.current) {
        const container = containerRef.current;
        if (container && container.firstChild) {
          container.removeChild(container.firstChild);
        }
        globeRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoading && globeRef.current && data) {
      updateGlobeData();
    }
  }, [data, viewMode, isLoading]);

  useEffect(() => {
    const handleResize = () => {
      if (globeRef.current && containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        globeRef.current.width(width);
        globeRef.current.height(height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initGlobe = () => {
    if (!containerRef.current || isLoading) return;

    const { width, height } = containerRef.current.getBoundingClientRect();
    
    // Clear previous globe
    if (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    // Create new globe
    globeRef.current = window.Globe()
      .width(width)
      .height(height)
      .backgroundColor('rgba(5, 5, 35, 1)')
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .hexPolygonsData(window.countries.features)
      .hexPolygonResolution(3) // Higher values = more hexagons
      .hexPolygonMargin(0.6)
      .hexPolygonColor(() => '#1f2937') // Default color for all countries
      .onHexPolygonHover((polygon: any) => {
        if (polygon) {
          const countryName = polygon.properties.name;
          const countryData = data.locations.filter(loc => loc.country === countryName);
          
          if (countryData.length > 0) {
            const totalCustomers = countryData.reduce((sum, loc) => sum + loc.customerCount, 0);
            const totalRevenue = countryData.reduce((sum, loc) => sum + loc.totalRevenue, 0);
            
            setTooltipContent(`
              <div style="font-weight: bold;">${countryName}</div>
              <div>Customers: ${totalCustomers}</div>
              <div>Revenue: $${totalRevenue.toLocaleString()}</div>
            `);
          } else {
            setTooltipContent(`<div style="font-weight: bold;">${countryName}</div>`);
          }
          
          const event = window.event as MouseEvent;
          setTooltipPosition({ x: event.clientX, y: event.clientY });
        } else {
          setTooltipContent(null);
        }
      })
      .hexPolygonLabel((polygon: any) => {
        const countryName = polygon.properties.name;
        const countryData = data.locations.filter(loc => loc.country === countryName);
        
        if (countryData.length > 0) {
          const totalCustomers = countryData.reduce((sum, loc) => sum + loc.customerCount, 0);
          const totalRevenue = countryData.reduce((sum, loc) => sum + loc.totalRevenue, 0);
          
          return `
            <div style="font-weight: bold;">${countryName}</div>
            <div>Customers: ${totalCustomers}</div>
            <div>Revenue: $${totalRevenue.toLocaleString()}</div>
          `;
        }
        
        return `<div style="font-weight: bold;">${countryName}</div>`;
      });

    // Add to DOM
    containerRef.current.appendChild(globeRef.current.canvas());
    
    // Initial camera position
    globeRef.current.pointOfView({ lat: 39.6, lng: -98.5, altitude: 2.5 });
    
    // Update data
    updateGlobeData();
  };

  const updateGlobeData = () => {
    if (!globeRef.current || !data || !data.locations) return;

    // Group locations by country
    const countriesWithData = new Set<string>();
    data.locations.forEach(loc => {
      if (loc.country) {
        countriesWithData.add(loc.country);
      }
    });

    // Update hexagon colors based on data
    globeRef.current.hexPolygonColor((polygon: any) => {
      const countryName = polygon.properties.name;
      
      // If country has data, color it darker
      if (countriesWithData.has(countryName)) {
        return viewMode === 'customers' ? '#0f172a' : '#172554'; // Darker blue for countries with data
      }
      
      return '#1f2937'; // Default color for countries without data
    });

    // Add points for cities with data
    const pointsData = data.locations.map(loc => ({
      lat: loc.lat,
      lng: loc.lng,
      size: viewMode === 'customers' 
        ? Math.max(0.5, Math.min(3, loc.customerCount / 10)) 
        : Math.max(0.5, Math.min(3, loc.totalRevenue / 1000)),
      color: viewMode === 'customers' ? '#60a5fa' : '#fbbf24',
      name: loc.city,
      state: loc.state || '',
      country: loc.country,
      customers: loc.customerCount,
      revenue: loc.totalRevenue
    }));

    globeRef.current
      .pointsData(pointsData)
      .pointColor('color')
      .pointRadius('size')
      .pointAltitude(0.01)
      .pointsMerge(true)
      .pointLabel((point: any) => `
        <div style="font-weight: bold;">${point.name}${point.state ? `, ${point.state}` : ''}, ${point.country}</div>
        <div>Customers: ${point.customers}</div>
        <div>Revenue: $${point.revenue.toLocaleString()}</div>
      `);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {tooltipContent && (
        <div 
          className="absolute z-10 bg-black bg-opacity-80 text-white p-2 rounded-md text-sm pointer-events-none"
          style={{ 
            left: `${tooltipPosition.x + 10}px`, 
            top: `${tooltipPosition.y + 10}px`,
            transform: 'translate(-50%, -100%)'
          }}
          dangerouslySetInnerHTML={{ __html: tooltipContent }}
        />
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
          Loading globe...
        </div>
      )}
    </div>
  );
};

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

export function CustomerGeographicMap({ brandId, isRefreshing = false }: CustomerGeographicMapProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasZeroRevenue, setHasZeroRevenue] = useState(false)
  const [clusteredData, setClusteredData] = useState<RegionData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'revenue' | 'customers'>('revenue')
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  
  // Add a resize observer to update the container width
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Set initial width
    setContainerWidth(containerRef.current.clientWidth);
    
    // Create resize observer
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    
    // Start observing
    resizeObserver.observe(containerRef.current);
    
    // Cleanup
    return () => {
      resizeObserver.disconnect();
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

  // Prepare data for globe visualization
  const globeData = {
    locations: clusteredData.map(d => ({
      city: d.city,
      state: d.state,
      country: d.country,
      lat: d.lat,
      lng: d.lng,
      customerCount: d.customerCount,
      totalRevenue: d.totalRevenue
    })),
    topRegions: {
      byCustomers: sortedData.map(d => ({ region: `${d.city}${d.state ? `, ${d.state}` : ''}`, count: d.customerCount })),
      byRevenue: sortedData.map(d => ({ region: `${d.city}${d.state ? `, ${d.state}` : ''}`, revenue: d.totalRevenue }))
    }
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
              {/* Globe Visualization */}
              <div ref={containerRef} className="relative w-full h-[400px] bg-gray-900 rounded-md overflow-hidden">
                {typeof window !== 'undefined' && (
                  <GlobeComponent 
                    data={globeData}
                    viewMode={view}
                  />
                )}
                
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