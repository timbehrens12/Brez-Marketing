"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

// Define metro areas with their centers and suburbs
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

// Define US cities with their coordinates and positions for rendering on the map
const US_CITIES = [
  { name: "New York", lat: 40.7128, lng: -74.0060, x: 820, y: 160 },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437, x: 150, y: 230 },
  { name: "Chicago", lat: 41.8781, lng: -87.6298, x: 670, y: 170 },
  { name: "Houston", lat: 29.7604, lng: -95.3698, x: 550, y: 320 },
  { name: "Phoenix", lat: 33.4484, lng: -112.0740, x: 220, y: 250 },
  { name: "Philadelphia", lat: 39.9526, lng: -75.1652, x: 800, y: 180 },
  { name: "San Antonio", lat: 29.4241, lng: -98.4936, x: 500, y: 340 },
  { name: "San Diego", lat: 32.7157, lng: -117.1611, x: 170, y: 260 },
  { name: "Dallas", lat: 32.7767, lng: -96.7970, x: 530, y: 290 },
  { name: "San Francisco", lat: 37.7749, lng: -122.4194, x: 130, y: 190 },
  { name: "Austin", lat: 30.2672, lng: -97.7431, x: 520, y: 330 },
  { name: "Seattle", lat: 47.6062, lng: -122.3321, x: 150, y: 100 },
  { name: "Denver", lat: 39.7392, lng: -104.9903, x: 380, y: 200 },
  { name: "Boston", lat: 42.3601, lng: -71.0589, x: 850, y: 140 },
  { name: "Atlanta", lat: 33.7490, lng: -84.3880, x: 700, y: 270 },
  { name: "Miami", lat: 25.7617, lng: -80.1918, x: 780, y: 380 },
  { name: "Detroit", lat: 42.3314, lng: -83.0458, x: 720, y: 150 },
  { name: "Minneapolis", lat: 44.9778, lng: -93.2650, x: 600, y: 120 },
  { name: "Portland", lat: 45.5051, lng: -122.6750, x: 150, y: 120 },
  { name: "New Orleans", lat: 29.9511, lng: -90.0715, x: 630, y: 340 },
  { name: "Las Vegas", lat: 36.1699, lng: -115.1398, x: 220, y: 220 },
  { name: "St. Louis", lat: 38.6270, lng: -90.1994, x: 640, y: 210 },
  { name: "Nashville", lat: 36.1627, lng: -86.7816, x: 670, y: 240 },
  { name: "Charlotte", lat: 35.2271, lng: -80.8431, x: 750, y: 240 }
];

// Define types for our data
type RegionData = {
  id: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  customerCount: number;
  totalRevenue: number;
};

type CityWithData = {
  name: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  hasData: boolean;
  data?: RegionData;
};

interface CustomerGeographicMapProps {
  brandId?: string;
  isRefreshing?: boolean;
}

export function CustomerGeographicMap({ brandId, isRefreshing = false }: CustomerGeographicMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasZeroRevenue, setHasZeroRevenue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clusteredData, setClusteredData] = useState<RegionData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [hoveredCity, setHoveredCity] = useState<CityWithData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null);

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
        
        // Process and cluster the data
        setClusteredData(data.locations || []);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching geographic data:", error);
        setError("Failed to load geographic data");
        setIsLoading(false);
      }
    };

    fetchGeoData();
  }, [brandId, isRefreshing]);

  // Function to find the metro area for a city
  const findMetroArea = (city: string, lat: number, lng: number): string => {
    // Check if the city is already a metro area
    if (METRO_AREAS[city]) {
      return city;
    }
    
    // Check if city is a known suburb
    for (const [metro, data] of Object.entries(METRO_AREAS)) {
      if (data.suburbs.includes(city)) {
        return metro;
      }
    }
    
    // Default to the original city name
    return city;
  };

  // Prepare cities with data for the map
  const citiesWithData = React.useMemo(() => {
    return US_CITIES.map(city => {
      const matchingData = clusteredData.find(d => 
        d.city === city.name || 
        (METRO_AREAS[d.city] && METRO_AREAS[d.city].suburbs.includes(city.name))
      );
      
      return {
        ...city,
        hasData: !!matchingData,
        data: matchingData
      };
    });
  }, [clusteredData]);

  const handleCityMouseEnter = (city: CityWithData, event: React.MouseEvent) => {
    if (city.hasData && city.data) {
      setHoveredCity(city);
      setTooltipPosition({ 
        x: event.clientX, 
        y: event.clientY - 100 // Offset to show above the cursor
      });
    }
  };

  const handleCityMouseLeave = () => {
    setHoveredCity(null);
    setTooltipPosition(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // For demo purposes, if no data is available
  if (clusteredData.length === 0) {
    // Mock data for demonstration
    const mockData: RegionData[] = [
      { id: "1", city: "New York", state: "NY", country: "USA", lat: 40.7128, lng: -74.0060, customerCount: 1250, totalRevenue: 1250000 },
      { id: "2", city: "Los Angeles", state: "CA", country: "USA", lat: 34.0522, lng: -118.2437, customerCount: 980, totalRevenue: 980000 },
      { id: "3", city: "Chicago", state: "IL", country: "USA", lat: 41.8781, lng: -87.6298, customerCount: 750, totalRevenue: 750000 },
      { id: "4", city: "Houston", state: "TX", country: "USA", lat: 29.7604, lng: -95.3698, customerCount: 620, totalRevenue: 620000 },
      { id: "5", city: "Dallas", state: "TX", country: "USA", lat: 32.7767, lng: -96.7970, customerCount: 580, totalRevenue: 580000 },
      { id: "6", city: "San Francisco", state: "CA", country: "USA", lat: 37.7749, lng: -122.4194, customerCount: 520, totalRevenue: 520000 }
    ];
    
    return renderContent(mockData);
  }

  return renderContent(clusteredData);

  function renderContent(data: RegionData[]) {
    // Sort data by customer count
    const sortedData = [...data].sort((a, b) => b.customerCount - a.customerCount);
    
    // Calculate totals if not already set
    const calculatedTotalCustomers = totalCustomers || sortedData.reduce((sum, item) => sum + item.customerCount, 0);
    const calculatedTotalRevenue = totalRevenue || sortedData.reduce((sum, item) => sum + item.totalRevenue, 0);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Geographic Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 2D Map Visualization */}
          <div className="relative w-full h-[300px] mb-6 bg-card rounded-md overflow-hidden">
            {/* US Map SVG */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
              <img 
                src="/images/us-map.svg" 
                alt="US Map"
                className="w-full h-full object-contain"
                style={{ 
                  filter: 'brightness(0.8) contrast(1.2)',
                  opacity: 0.7
                }}
              />
            </div>
            
            {/* City Dots */}
            {citiesWithData.map((city) => (
              <div
                key={city.name}
                className={cn(
                  "absolute rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200",
                  city.hasData 
                    ? "w-3 h-3 bg-primary border-white cursor-pointer hover:scale-150 hover:z-10" 
                    : "w-2 h-2 bg-transparent border-white/50"
                )}
                style={{ top: city.y, left: city.x }}
                onMouseEnter={(e) => handleCityMouseEnter(city, e)}
                onMouseLeave={handleCityMouseLeave}
              />
            ))}
            
            {/* City Labels for cities with data */}
            {citiesWithData
              .filter(city => city.hasData)
              .map((city) => (
                <div
                  key={`label-${city.name}`}
                  className="absolute text-[8px] text-white/70 pointer-events-none"
                  style={{ 
                    top: city.y + 8, 
                    left: city.x,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {city.name}
                </div>
              ))}
            
            {/* Tooltip */}
            {hoveredCity && tooltipPosition && (
              <div
                className="fixed bg-card p-2 rounded-md shadow-md z-50 pointer-events-none border border-primary/30"
                style={{
                  top: tooltipPosition.y,
                  left: tooltipPosition.x,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <p className="font-medium">{hoveredCity.name}</p>
                {hoveredCity.data && (
                  <>
                    <p className="text-sm">Customers: {hoveredCity.data.customerCount.toLocaleString()}</p>
                    <p className="text-sm">Revenue: ${hoveredCity.data.totalRevenue.toLocaleString()}</p>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Customer Data Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row) => (
                <TableRow 
                  key={row.id}
                  className={cn(
                    "hover:bg-muted/50",
                    hoveredRegion === row ? "bg-muted" : ""
                  )}
                  onMouseEnter={() => setHoveredRegion(row)}
                  onMouseLeave={() => setHoveredRegion(null)}
                >
                  <TableCell>
                    {row.city}, {row.state}, {row.country}
                  </TableCell>
                  <TableCell className="text-right">{row.customerCount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${row.totalRevenue.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{calculatedTotalCustomers.toLocaleString()}</TableCell>
                <TableCell className="text-right">${calculatedTotalRevenue.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }
}