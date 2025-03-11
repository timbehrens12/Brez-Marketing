"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, Globe, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
// @ts-ignore
import ThreeGlobe from 'three-globe'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import * as turf from '@turf/turf'
// @ts-ignore
import countries from './countries.json'

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

// Add CSS for tooltip animation
const tooltipAnimation = `
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -90%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%);
  }
}
`;

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

export function CustomerGeographicMap({ brandId, isRefreshing = false }: CustomerGeographicMapProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasZeroRevenue, setHasZeroRevenue] = useState(false)
  const [clusteredData, setClusteredData] = useState<RegionData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [showFallbackMap, setShowFallbackMap] = useState(false)
  
  const globeContainerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const frameRef = useRef<number | null>(null)
  const pointsRef = useRef<{point: THREE.Object3D, data: RegionData, hitSphere?: THREE.Mesh}[]>([])
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())

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
        
        // Filter out locations with no customers
        const filteredData = Object.values(aggregatedData).filter(loc => loc.customerCount > 0);
        setClusteredData(filteredData);
        
      } catch (error) {
        console.error('Error fetching geographic data:', error)
        setError("Failed to load geographic data")
        setShowFallbackMap(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGeoData()
  }, [brandId, isRefreshing])

  // Fallback map implementation using simple HTML/CSS
  const renderFallbackMap = () => {
    if (!clusteredData.length) return null;
    
    return (
      <div className="relative w-full h-[400px] bg-[#0a1128] rounded-md overflow-hidden">
        <div className="absolute inset-0 bg-[url('/world-map-dark.png')] bg-cover bg-center opacity-70"></div>
        
        {clusteredData.map((region) => {
          // Convert lat/lng to x/y coordinates (simple equirectangular projection)
          const x = ((region.lng + 180) / 360) * 100; // 0-100%
          const y = ((90 - region.lat) / 180) * 100; // 0-100%
          
          return (
            <div
              key={region.id}
              className="absolute w-2 h-2 rounded-full bg-blue-500 transform -translate-x-1 -translate-y-1 cursor-pointer hover:bg-blue-300"
              style={{ 
                left: `${x}%`, 
                top: `${y}%`,
                zIndex: 10
              }}
              data-region-id={region.id}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredRegion(region);
                setTooltipPosition({ 
                  x: rect.left + rect.width / 2, 
                  y: rect.top 
                });
              }}
              onMouseLeave={() => {
                setHoveredRegion(null);
                setTooltipPosition(null);
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredRegion(region);
                setTooltipPosition({ 
                  x: rect.left + rect.width / 2, 
                  y: rect.top 
                });
              }}
            />
          );
        })}
        
        {hoveredRegion && tooltipPosition && (
          <div 
            className="fixed z-50 bg-black/90 text-white text-xs p-3 rounded-md pointer-events-none border border-blue-400"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y - 10}px`,
              transform: 'translate(-50%, -100%)',
              minWidth: '200px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              animation: 'fadeIn 0.2s ease-in-out'
            }}
          >
            <div className="font-medium text-sm mb-1">
              {hoveredRegion.city}
              {hoveredRegion.state ? `, ${hoveredRegion.state}` : ''}
              {hoveredRegion.country && hoveredRegion.country !== 'United States' ? `, ${hoveredRegion.country}` : ''}
            </div>
            <div className="flex justify-between gap-6 mt-1">
              <div>
                <span className="text-gray-300">Customers:</span>{' '}
                <span className="font-bold text-white">{hoveredRegion.customerCount}</span>
              </div>
              <div>
                <span className="text-gray-300">Revenue:</span>{' '}
                <span className="font-bold text-white">{formatCurrency(hoveredRegion.totalRevenue || 0)}</span>
              </div>
            </div>
            {hoveredRegion.totalRevenue === 0 && hoveredRegion.customerCount > 0 && (
              <div className="mt-1 text-xs text-gray-400">
                Customer data available, but no revenue recorded yet.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const renderTopRegions = () => {
    if (clusteredData.length === 0) return null;
    
    // Sort by customer count
    const sortedData = [...clusteredData].sort((a, b) => b.customerCount - a.customerCount).slice(0, 5);
    
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Top Regions</h3>
        <div className="space-y-1">
          {sortedData.map((region) => (
            <div key={region.id} className="flex justify-between items-center text-sm">
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                <span>
                  {region.city}
                  {region.state ? `, ${region.state}` : ''}
                  {region.country && region.country !== 'United States' ? `, ${region.country}` : ''}
                </span>
              </div>
              <span className="font-medium">
                {region.customerCount} {region.customerCount === 1 ? 'customer' : 'customers'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderZeroRevenueNotice = () => {
    if (!hasZeroRevenue) return null;
    
    return (
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
        <p>Your store has customers but no revenue data yet. The map is showing customer locations.</p>
      </div>
    );
  };

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold">Customer Geography</CardTitle>
      </CardHeader>
      <CardContent>
        <style dangerouslySetInnerHTML={{ __html: tooltipAnimation }} />
        
        {isLoading ? (
          <div className="w-full h-[400px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="w-full h-[400px] flex items-center justify-center">
            <p className="text-destructive">{error}</p>
          </div>
        ) : clusteredData.length > 0 ? (
          <div className="relative">
            {showFallbackMap ? (
              renderFallbackMap()
            ) : (
              <div 
                ref={globeContainerRef} 
                className="w-full h-[400px] rounded-md overflow-hidden relative"
                style={{ cursor: 'grab' }}
              >
                {/* Debug info */}
                {debugInfo && (
                  <div className="absolute top-2 left-2 z-50 bg-black/70 text-white text-xs p-1 rounded">
                    {debugInfo}
                  </div>
                )}
                
                {hoveredRegion && tooltipPosition && (
                  <div 
                    className="absolute z-50 bg-black/90 text-white text-xs p-3 rounded-md pointer-events-none border border-blue-400"
                    style={{
                      left: `${tooltipPosition.x}px`,
                      top: `${tooltipPosition.y - 20}px`,
                      transform: 'translate(-50%, -100%)',
                      minWidth: '200px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                      animation: 'fadeIn 0.2s ease-in-out'
                    }}
                  >
                    <div className="font-medium text-sm mb-1">
                      {hoveredRegion.city}
                      {hoveredRegion.state ? `, ${hoveredRegion.state}` : ''}
                      {hoveredRegion.country && hoveredRegion.country !== 'United States' ? `, ${hoveredRegion.country}` : ''}
                    </div>
                    <div className="flex justify-between gap-6 mt-1">
                      <div>
                        <span className="text-gray-300">Customers:</span>{' '}
                        <span className="font-bold text-white">{hoveredRegion.customerCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-300">Revenue:</span>{' '}
                        <span className="font-bold text-white">{formatCurrency(hoveredRegion.totalRevenue || 0)}</span>
                      </div>
                    </div>
                    {hoveredRegion.totalRevenue === 0 && hoveredRegion.customerCount > 0 && (
                      <div className="mt-1 text-xs text-gray-400">
                        Customer data available, but no revenue recorded yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {renderZeroRevenueNotice()}
            {renderTopRegions()}
          </div>
        ) : (
          <div className="w-full h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">No geographic data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}