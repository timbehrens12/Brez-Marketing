"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Define metro areas with their centers and suburbs
const METRO_AREAS: Record<string, { center: [number, number], suburbs: string[] }> = {
  'Houston': { 
    center: [29.7604, -95.3698], 
    suburbs: ['The Woodlands', 'Sugar Land', 'Katy', 'Pearland', 'League City', 'Baytown', 'Missouri City', 'Conroe'] 
  },
  'New York': { 
    center: [40.7128, -74.0060], 
    suburbs: ['Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Jersey City', 'Newark', 'Yonkers', 'Paterson'] 
  },
  'Los Angeles': { 
    center: [34.0522, -118.2437], 
    suburbs: ['Long Beach', 'Santa Monica', 'Pasadena', 'Beverly Hills', 'Malibu', 'Glendale', 'Burbank', 'Anaheim', 'Santa Ana', 'Irvine'] 
  },
  'Chicago': { 
    center: [41.8781, -87.6298], 
    suburbs: ['Evanston', 'Naperville', 'Aurora', 'Joliet', 'Schaumburg', 'Oak Park', 'Elgin', 'Waukegan'] 
  },
  'Dallas': { 
    center: [32.7767, -96.7970], 
    suburbs: ['Fort Worth', 'Arlington', 'Plano', 'Garland', 'Irving', 'Frisco', 'McKinney', 'Denton'] 
  },
  'San Francisco': { 
    center: [37.7749, -122.4194], 
    suburbs: ['Oakland', 'Berkeley', 'San Jose', 'Palo Alto', 'Mountain View', 'Sunnyvale', 'Santa Clara', 'Fremont'] 
  },
  'Miami': {
    center: [25.7617, -80.1918],
    suburbs: ['Fort Lauderdale', 'West Palm Beach', 'Boca Raton', 'Hollywood', 'Pompano Beach', 'Coral Springs', 'Miami Beach']
  },
  'Seattle': {
    center: [47.6062, -122.3321],
    suburbs: ['Bellevue', 'Tacoma', 'Everett', 'Renton', 'Kirkland', 'Redmond', 'Kent', 'Auburn']
  },
  'Denver': {
    center: [39.7392, -104.9903],
    suburbs: ['Aurora', 'Lakewood', 'Centennial', 'Thornton', 'Arvada', 'Westminster', 'Boulder', 'Fort Collins']
  },
  'Atlanta': {
    center: [33.7490, -84.3880],
    suburbs: ['Marietta', 'Alpharetta', 'Roswell', 'Sandy Springs', 'Smyrna', 'Dunwoody', 'Decatur', 'Johns Creek']
  },
  'Phoenix': {
    center: [33.4484, -112.0740],
    suburbs: ['Scottsdale', 'Mesa', 'Chandler', 'Tempe', 'Gilbert', 'Glendale', 'Peoria', 'Surprise']
  },
  'Boston': {
    center: [42.3601, -71.0589],
    suburbs: ['Cambridge', 'Somerville', 'Newton', 'Brookline', 'Quincy', 'Medford', 'Waltham', 'Malden']
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
  const [data, setData] = useState<RegionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.8283, -98.5795]); // Center of US
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (brandId) {
      fetchGeoData();
    }
  }, [brandId]);

  useEffect(() => {
    if (isRefreshing) {
      fetchGeoData();
    }
  }, [isRefreshing]);

  const fetchGeoData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/shopify/customers/geographic?brandId=${brandId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch geographic data');
      }
      const responseData = await response.json();
      
      if (responseData.regions && responseData.regions.length > 0) {
        setData(responseData.regions);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error('Error fetching geographic data:', error);
      setError('Failed to load geographic data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const findMetroArea = (city: string, lat: number, lng: number): string => {
    // First check if the city is a metro area itself
    if (city in METRO_AREAS) {
      return city;
    }
    
    // Then check if it's a suburb of a metro area
    for (const [metroName, metroData] of Object.entries(METRO_AREAS)) {
      if (metroData.suburbs.includes(city)) {
        return metroName;
      }
    }
    
    // If not found by name, check by proximity to metro centers
    let closestMetro = '';
    let minDistance = Number.MAX_VALUE;
    
    for (const [metroName, metroData] of Object.entries(METRO_AREAS)) {
      const [metroLat, metroLng] = metroData.center;
      const distance = Math.sqrt(
        Math.pow(lat - metroLat, 2) + Math.pow(lng - metroLng, 2)
      );
      
      if (distance < minDistance && distance < 1) { // ~69 miles radius
        minDistance = distance;
        closestMetro = metroName;
      }
    }
    
    return closestMetro || city;
  };

  const handleCityClick = (city: RegionData) => {
    // Set map center to the clicked city and increase zoom
    setMapCenter([city.lat, city.lng]);
    setZoomLevel(Math.min(zoomLevel + 1, 3));
  };

  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 0.5, 1));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setMapCenter([39.8283, -98.5795]); // Reset to center of US
  };

  // Group data by metro area or city
  const groupedData = data.reduce((acc: Record<string, RegionData>, item) => {
    const metroArea = findMetroArea(item.city, item.lat, item.lng);
    const key = metroArea || `${item.city}, ${item.state}`;
    
    if (!acc[key]) {
      acc[key] = {
        ...item,
        city: metroArea || item.city,
        customerCount: 0,
        totalRevenue: 0
      };
    }
    
    acc[key].customerCount += item.customerCount;
    acc[key].totalRevenue += item.totalRevenue;
    
    return acc;
  }, {});

  function renderContent(data: RegionData[]) {
    const totalCustomers = data.reduce((sum, item) => sum + item.customerCount, 0);
    const totalRevenue = data.reduce((sum, item) => sum + item.totalRevenue, 0);
    
    // Sort locations by customer count (descending)
    const sortedLocations = Object.values(groupedData).sort((a, b) => b.customerCount - a.customerCount);
    
    return (
      <div className="space-y-4">
        <div className="relative h-[400px] bg-[#111] rounded-lg overflow-hidden border border-[#333]" ref={mapContainerRef}>
          <div 
            className="absolute inset-0 transform-gpu transition-transform duration-300"
            style={{
              transform: `scale(${zoomLevel}) translate(${(1 - zoomLevel) * 50}%, ${(1 - zoomLevel) * 50}%)`,
              transformOrigin: `${mapCenter[1] * 1.5 + 50}% ${mapCenter[0] * 1.5 + 50}%`
            }}
          >
            {/* US Map SVG */}
            <svg viewBox="0 0 959 593" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <g>
                {/* US States - using light gray outlines */}
                <path d="M... (US map SVG path data)" fill="transparent" stroke="#444" strokeWidth="1"/>
                
                {/* Only render dots for cities with data */}
                {sortedLocations.map((city, index) => {
                  // Calculate position based on lat/lng
                  const x = ((city.lng + 125) / 65) * 100; // Adjust these values based on your map
                  const y = ((city.lat - 25) / 25) * 100;  // Adjust these values based on your map
                  
                  // Only show cities with actual data
                  if (city.customerCount > 0) {
                    return (
                      <g key={index} 
                         onClick={() => handleCityClick(city)}
                         className="cursor-pointer transition-all duration-300 hover:opacity-80"
                      >
                        {/* City dot */}
                        <circle 
                          cx={`${x}%`} 
                          cy={`${y}%`} 
                          r={Math.max(4, Math.min(8, 4 + Math.log(city.customerCount)))} 
                          fill="#fff" 
                          stroke="#333"
                          strokeWidth="1.5"
                          className="transition-all duration-300"
                          onMouseEnter={(e) => {
                            setHoveredRegion(city);
                          }}
                          onMouseLeave={() => {
                            setHoveredRegion(null);
                          }}
                        />
                        
                        {/* City label - only for cities with significant customer count */}
                        {city.customerCount >= 5 && (
                          <text 
                            x={`${x}%`} 
                            y={`${y + 3}%`} 
                            textAnchor="middle" 
                            fill="#ccc" 
                            fontSize="8"
                            dy="12"
                            className="pointer-events-none"
                          >
                            {city.city}
                          </text>
                        )}
                      </g>
                    );
                  }
                  return null;
                })}
              </g>
            </svg>
            
            {/* Tooltip */}
            {hoveredRegion && (
              <div 
                className="absolute z-10 bg-[#222] border border-[#444] rounded-md p-3 shadow-lg pointer-events-none"
                style={{
                  left: `${((hoveredRegion.lng + 125) / 65) * 100}%`,
                  top: `${((hoveredRegion.lat - 25) / 25) * 100}%`,
                  transform: 'translate(-50%, -130%)'
                }}
              >
                <div className="text-white font-medium">{hoveredRegion.city}, {hoveredRegion.state}</div>
                <div className="text-gray-300 text-sm">Customers: {hoveredRegion.customerCount}</div>
                <div className="text-gray-300 text-sm">Revenue: ${hoveredRegion.totalRevenue.toLocaleString()}</div>
              </div>
            )}
          </div>
          
          {/* Zoom controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomIn} className="bg-[#222] border-[#444] hover:bg-[#333]">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut} className="bg-[#222] border-[#444] hover:bg-[#333]">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset} className="bg-[#222] border-[#444] hover:bg-[#333]">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#333]">
                <th className="text-left py-2 px-4 text-gray-400">Location</th>
                <th className="text-right py-2 px-4 text-gray-400">Customers</th>
                <th className="text-right py-2 px-4 text-gray-400">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sortedLocations.map((location, index) => (
                <tr key={index} className="border-b border-[#222] hover:bg-[#1E1E1E]">
                  <td className="py-2 px-4 text-white">{location.city}, {location.state}, {location.country}</td>
                  <td className="py-2 px-4 text-right text-white">{location.customerCount}</td>
                  <td className="py-2 px-4 text-right text-white">${location.totalRevenue.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-[#1A1A1A] font-medium">
                <td className="py-2 px-4 text-white">Total</td>
                <td className="py-2 px-4 text-right text-white">{totalCustomers}</td>
                <td className="py-2 px-4 text-right text-white">${totalRevenue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const renderLoadingState = () => (
    <div className="space-y-4">
      <Skeleton className="h-[400px] w-full bg-[#2A2A2A]" />
      <Skeleton className="h-8 w-full bg-[#2A2A2A]" />
      <Skeleton className="h-8 w-full bg-[#2A2A2A]" />
      <Skeleton className="h-8 w-full bg-[#2A2A2A]" />
    </div>
  );

  const renderErrorState = () => (
    <div className="h-[400px] flex flex-col items-center justify-center text-gray-500">
      <AlertCircle className="h-16 w-16 mb-4 text-amber-500/50" />
      <p className="text-amber-500">{error}</p>
      <p className="text-sm mt-2">Try refreshing the data or check your connection</p>
    </div>
  );

  const renderEmptyState = () => (
    <div className="h-[400px] flex flex-col items-center justify-center text-gray-500">
      <div className="h-16 w-16 mb-4 rounded-full border-2 border-gray-700 flex items-center justify-center">
        <span className="text-2xl">📍</span>
      </div>
      <p>No customer location data available</p>
      <p className="text-sm mt-2">Sync customer data to see geographic insights</p>
    </div>
  );

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg">Customer Geographic Distribution</CardTitle>
        <CardDescription className="text-gray-400">
          Customer locations and revenue by region
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || isRefreshing ? (
          renderLoadingState()
        ) : error ? (
          renderErrorState()
        ) : data.length > 0 ? (
          renderContent(data)
        ) : (
          renderEmptyState()
        )}
      </CardContent>
    </Card>
  );
}