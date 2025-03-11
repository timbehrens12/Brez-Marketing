"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Globe, Loader2, Users } from 'lucide-react'
import { format } from 'date-fns'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import worldGeoData from './worldGeo.json'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

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

// Define metropolitan areas and their suburbs
const METRO_AREAS: Record<string, { center: { lat: number; lng: number }; suburbs: string[] }> = {
  "Houston": {
    center: { lat: 29.7604, lng: -95.3698 },
    suburbs: ["Spring", "The Woodlands", "Sugar Land", "Katy", "Pearland", "Pasadena", "Baytown", "Conroe", "Cypress"]
  },
  "Dallas": {
    center: { lat: 32.7767, lng: -96.7970 },
    suburbs: ["Plano", "Irving", "Arlington", "Frisco", "McKinney", "Denton", "Carrollton", "Richardson", "Allen"]
  },
  "New York": {
    center: { lat: 40.7128, lng: -74.0060 },
    suburbs: ["Brooklyn", "Queens", "Bronx", "Staten Island", "Jersey City", "Newark", "Yonkers", "New Rochelle"]
  },
  "Los Angeles": {
    center: { lat: 34.0522, lng: -118.2437 },
    suburbs: ["Long Beach", "Santa Monica", "Pasadena", "Glendale", "Burbank", "Anaheim", "Irvine", "Huntington Beach"]
  },
  "Chicago": {
    center: { lat: 41.8781, lng: -87.6298 },
    suburbs: ["Evanston", "Oak Park", "Naperville", "Aurora", "Joliet", "Schaumburg", "Elgin", "Waukegan"]
  },
  "Phoenix": { 
    center: { lat: 33.4484, lng: -112.0740 },
    suburbs: ["Scottsdale", "Tempe", "Mesa", "Chandler", "Glendale", "Gilbert", "Peoria"]
  },
  "San Antonio": { 
    center: { lat: 29.4241, lng: -98.4936 },
    suburbs: ["New Braunfels", "Schertz", "Seguin", "Boerne", "Helotes"]
  },
  "San Diego": { 
    center: { lat: 32.7157, lng: -117.1611 },
    suburbs: ["Chula Vista", "Oceanside", "Escondido", "Carlsbad", "El Cajon", "Vista", "San Marcos", "Encinitas"]
  },
  "San Francisco": { 
    center: { lat: 37.7749, lng: -122.4194 },
    suburbs: ["Oakland", "Berkeley", "San Jose", "Palo Alto", "Mountain View", "Sunnyvale", "Santa Clara", "Fremont"]
  },
  "Austin": { 
    center: { lat: 30.2672, lng: -97.7431 },
    suburbs: ["Round Rock", "Cedar Park", "Georgetown", "San Marcos", "Pflugerville", "Leander", "Kyle"]
  }
};

// Function to calculate distance between two geographic points
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

// Function to find the metro area for a given city
function findMetroArea(city: string, lat: number, lng: number): string {
  // Direct match for metro area name
  if (METRO_AREAS[city as keyof typeof METRO_AREAS]) {
    return city;
  }
  
  // Check if city is a known suburb
  for (const [metro, data] of Object.entries(METRO_AREAS)) {
    if (data.suburbs.includes(city)) {
      return metro;
    }
  }
  
  // Check by proximity (within 50km of metro center)
  for (const [metro, data] of Object.entries(METRO_AREAS)) {
    const distance = calculateDistance(lat, lng, data.center.lat, data.center.lng);
    if (distance < 50) {
      return metro;
    }
  }
  
  // If no match, return the original city
  return city;
}

// Convert lat/lng to 3D coordinates on a sphere
function latLngToVector3(lat: number, lng: number, radius: number = 1): THREE.Vector3 {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
}

export function CustomerGeographicMap({ brandId, isRefreshing = false }: CustomerGeographicMapProps) {
  const [data, setData] = useState<RegionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'revenue' | 'customers'>('revenue')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [hasZeroRevenue, setHasZeroRevenue] = useState(false)
  const [clusteredData, setClusteredData] = useState<RegionData[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const globeContainerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    globe: THREE.Mesh;
    points: THREE.Group;
  } | null>(null)

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

  useEffect(() => {
    if (!globeContainerRef.current || isLoading || clusteredData.length === 0) return;
    
    // Initialize Three.js scene
    const container = globeContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Create scene
    const scene = new THREE.Scene();
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 3;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 1.5;
    controls.maxDistance = 5;
    
    // Create globe
    const globeRadius = 1;
    const globeGeometry = new THREE.SphereGeometry(globeRadius, 64, 64);
    const globeMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.8,
      wireframe: false
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);
    
    // Add wireframe to globe
    const wireframeGeometry = new THREE.SphereGeometry(globeRadius * 1.001, 64, 64);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x3a506b,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    scene.add(wireframe);
    
    // Add countries outlines from GeoJSON
    const countriesGroup = new THREE.Group();
    scene.add(countriesGroup);
    
    worldGeoData.features.forEach((feature: any) => {
      if (feature.geometry.type === 'Polygon') {
        feature.geometry.coordinates.forEach((polygon: number[][]) => {
          const points: THREE.Vector3[] = [];
          
          polygon.forEach((coord: number[]) => {
            const [lng, lat] = coord;
            points.push(latLngToVector3(lat, lng, globeRadius * 1.001));
          });
          
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0x4d7c8a, transparent: true, opacity: 0.5 });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          countriesGroup.add(line);
        });
      }
    });
    
    // Add customer location points
    const pointsGroup = new THREE.Group();
    scene.add(pointsGroup);
    
    // Add all locations as dots
    clusteredData.forEach((location) => {
      const position = latLngToVector3(location.lat, location.lng, globeRadius * 1.02);
      
      // Base size on customer count (min 0.01, max 0.05)
      const size = Math.max(0.01, Math.min(0.05, 0.01 + (location.customerCount / 100) * 0.04));
      
      // Create point
      const pointGeometry = new THREE.SphereGeometry(size, 16, 16);
      
      // Color based on revenue (gray for zero, blue gradient for positive)
      let pointColor;
      if (location.totalRevenue <= 0) {
        pointColor = new THREE.Color(0x888888); // Gray for zero revenue
      } else {
        // Blue gradient based on revenue
        const intensity = Math.min(1, location.totalRevenue / 10000);
        pointColor = new THREE.Color(0.1, 0.4 + intensity * 0.6, 0.7 + intensity * 0.3);
      }
      
      const pointMaterial = new THREE.MeshBasicMaterial({ color: pointColor });
      const point = new THREE.Mesh(pointGeometry, pointMaterial);
      point.position.copy(position);
      pointsGroup.add(point);
      
      // Add glow effect for points with revenue
      if (location.totalRevenue > 0) {
        const glowGeometry = new THREE.SphereGeometry(size * 1.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: pointColor,
          transparent: true,
          opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(position);
        pointsGroup.add(glow);
      }
    });
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    
    animate();
    
    // Store references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      globe,
      points: pointsGroup
    };
    
    // Handle resize
    const handleResize = () => {
      if (!globeContainerRef.current || !sceneRef.current) return;
      
      const width = globeContainerRef.current.clientWidth;
      const height = globeContainerRef.current.clientHeight;
      
      sceneRef.current.camera.aspect = width / height;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (sceneRef.current) {
        sceneRef.current.renderer.dispose();
        container.removeChild(sceneRef.current.renderer.domElement);
      }
    };
  }, [clusteredData, isLoading]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const renderTopRegions = () => {
    const sortedData = [...clusteredData].sort((a, b) => 
      view === 'revenue' && !hasZeroRevenue
        ? b.totalRevenue - a.totalRevenue 
        : b.customerCount - a.customerCount
    ).slice(0, 5)

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Top Regions</h4>
        <div className="space-y-2">
          {sortedData.map((region, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-sm text-gray-300">
                  {region.city || region.state || region.country}
                </span>
              </div>
              <span className="text-sm font-medium">
                {view === 'revenue' && !hasZeroRevenue
                  ? formatCurrency(region.totalRevenue)
                  : `${region.customerCount} customer${region.customerCount !== 1 ? 's' : ''}`
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show a notice when we have zero revenue but some customers
  const renderZeroRevenueNotice = () => {
    if (!hasZeroRevenue || view !== 'revenue') return null;
    
    return (
      <div className="bg-blue-900/20 border border-blue-800 rounded-md p-3 mb-4">
        <div className="flex items-start">
          <Users className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-300">
              Your store has customers but no revenue data yet. This could be because your orders were created in the backend or have $0 value.
            </p>
            <p className="text-sm text-blue-300 mt-1">
              The map is currently showing customer locations instead of revenue.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white text-lg">Customer Geography</CardTitle>
            <CardDescription className="text-gray-400">
              {view === 'revenue' ? 'Sales by region' : 'Customers by region'}
            </CardDescription>
          </div>
          <Tabs defaultValue={hasZeroRevenue ? "customers" : "revenue"} className="w-[200px]" onValueChange={(v) => setView(v as 'revenue' | 'customers')}>
            <TabsList className="bg-[#2A2A2A]">
              <TabsTrigger value="revenue" className="data-[state=active]:bg-blue-600">Revenue</TabsTrigger>
              <TabsTrigger value="customers" className="data-[state=active]:bg-blue-600">Customers</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full bg-[#2A2A2A]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-[#2A2A2A]" />
              <Skeleton className="h-4 w-full bg-[#2A2A2A]" />
              <Skeleton className="h-4 w-full bg-[#2A2A2A]" />
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : clusteredData.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-2xl font-bold text-white">
                  {view === 'revenue' 
                    ? formatCurrency(totalRevenue)
                    : totalCustomers.toLocaleString()
                  }
                </div>
                <div className="text-sm text-gray-400">
                  {view === 'revenue' ? 'Total Revenue' : 'Total Customers'}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {lastUpdated && `Last updated: ${format(lastUpdated, 'MMM d, yyyy h:mm a')}`}
              </div>
            </div>
            
            {renderZeroRevenueNotice()}
            
            <div ref={globeContainerRef} className="h-[400px] w-full" />
            {renderTopRegions()}
          </>
        ) : (
          <div className="h-[400px] flex flex-col items-center justify-center text-gray-500">
            <Globe className="h-16 w-16 mb-4 opacity-20" />
            <p>No geographic data available</p>
            <p className="text-sm mt-2">Sync customer data to see geographic insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 