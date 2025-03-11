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
import { Tooltip } from "@/components/ui/tooltip"
import * as turf from '@turf/turf'

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
  const [isLoading, setIsLoading] = useState(true)
  const [hasZeroRevenue, setHasZeroRevenue] = useState(false)
  const [clusteredData, setClusteredData] = useState<RegionData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'revenue' | 'customers'>('revenue')
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null)
  
  const globeContainerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    globe: THREE.Mesh;
    points: THREE.Group;
    raycaster: THREE.Raycaster;
    pointsData: {point: THREE.Mesh, data: RegionData}[];
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
    
    // Draw country outlines with more detail
    worldGeoData.features.forEach((feature: any) => {
      if (feature.geometry.type === 'Polygon') {
        feature.geometry.coordinates.forEach((polygon: number[][]) => {
          const points: THREE.Vector3[] = [];
          
          polygon.forEach((coord: number[]) => {
            const [lng, lat] = coord;
            points.push(latLngToVector3(lat, lng, globeRadius * 1.001));
          });
          
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x6d9caa, 
            transparent: true, 
            opacity: 0.9,
            linewidth: 2
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          countriesGroup.add(line);
        });
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach((multiPolygon: number[][][]) => {
          multiPolygon.forEach((polygon: number[][]) => {
            const points: THREE.Vector3[] = [];
            
            polygon.forEach((coord: number[]) => {
              const [lng, lat] = coord;
              points.push(latLngToVector3(lat, lng, globeRadius * 1.001));
            });
            
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const lineMaterial = new THREE.LineBasicMaterial({ 
              color: 0x6d9caa, 
              transparent: true, 
              opacity: 0.9,
              linewidth: 2
            });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            countriesGroup.add(line);
          });
        });
      }
    });
    
    // Add continent labels
    const continentLabels = [
      { name: "North America", lat: 40, lng: -100 },
      { name: "South America", lat: -20, lng: -60 },
      { name: "Europe", lat: 50, lng: 10 },
      { name: "Africa", lat: 0, lng: 20 },
      { name: "Asia", lat: 40, lng: 100 },
      { name: "Australia", lat: -25, lng: 135 }
    ];
    
    // Add major cities as small dots for reference
    const majorCities = [
      { name: "New York", lat: 40.7128, lng: -74.0060 },
      { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
      { name: "Chicago", lat: 41.8781, lng: -87.6298 },
      { name: "London", lat: 51.5074, lng: -0.1278 },
      { name: "Paris", lat: 48.8566, lng: 2.3522 },
      { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
      { name: "Sydney", lat: -33.8688, lng: 151.2093 },
      { name: "Beijing", lat: 39.9042, lng: 116.4074 },
      { name: "Moscow", lat: 55.7558, lng: 37.6173 },
      { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729 }
    ];
    
    // Add reference cities as small dots
    majorCities.forEach(city => {
      if (!clusteredData.some(loc => 
        turf.distance(
          turf.point([city.lng, city.lat]), 
          turf.point([loc.lng, loc.lat]), 
          {units: 'kilometers'}
        ) < 100
      )) {
        const position = latLngToVector3(city.lat, city.lng, globeRadius * 1.01);
        const dotGeometry = new THREE.SphereGeometry(0.005, 8, 8);
        const dotMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xaaaaaa,
          transparent: true,
          opacity: 0.7
        });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.position.copy(position);
        countriesGroup.add(dot);
      }
    });
    
    // Add customer location points
    const pointsGroup = new THREE.Group();
    scene.add(pointsGroup);
    
    // Create raycaster for mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const pointsData: {point: THREE.Mesh, data: RegionData}[] = [];
    
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
      
      const pointMaterial = new THREE.MeshBasicMaterial({ 
        color: pointColor,
        transparent: true,
        opacity: 0.9
      });
      const point = new THREE.Mesh(pointGeometry, pointMaterial);
      point.position.copy(position);
      pointsGroup.add(point);
      
      // Store reference to point and its data for raycasting
      pointsData.push({ point, data: location });
      
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
      
      // Add location label for major cities
      if (location.customerCount > 5 || location.totalRevenue > 1000) {
        const labelPosition = latLngToVector3(location.lat, location.lng, globeRadius * 1.1);
        const labelGeometry = new THREE.SphereGeometry(0.005, 8, 8);
        const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.copy(labelPosition);
        pointsGroup.add(label);
      }
    });
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light for better visibility
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Handle mouse move for tooltips
    const handleMouseMove = (event: MouseEvent) => {
      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouse, camera);
      
      // Calculate objects intersecting the picking ray
      const intersects = raycaster.intersectObjects(pointsData.map(item => item.point));
      
      if (intersects.length > 0) {
        // Find the data for the intersected point
        const intersectedPoint = intersects[0].object;
        const pointData = pointsData.find(item => item.point === intersectedPoint);
        
        if (pointData) {
          setHoveredRegion(pointData.data);
          setTooltipPosition({ x: event.clientX, y: event.clientY });
          
          // Highlight the hovered point
          (intersectedPoint as THREE.Mesh).material = new THREE.MeshBasicMaterial({ 
            color: 0xff9900,
            transparent: true,
            opacity: 1
          });
        }
      } else {
        // Reset all points to their original material
        pointsData.forEach(({ point, data }) => {
          let pointColor;
          if (data.totalRevenue <= 0) {
            pointColor = new THREE.Color(0x888888);
          } else {
            const intensity = Math.min(1, data.totalRevenue / 10000);
            pointColor = new THREE.Color(0.1, 0.4 + intensity * 0.6, 0.7 + intensity * 0.3);
          }
          
          (point as THREE.Mesh).material = new THREE.MeshBasicMaterial({ 
            color: pointColor,
            transparent: true,
            opacity: 0.9
          });
        });
        
        setHoveredRegion(null);
        setTooltipPosition(null);
      }
    };
    
    // Add mouse move event listener
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    
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
      points: pointsGroup,
      raycaster,
      pointsData
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
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      
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
    if (clusteredData.length === 0) return null;
    
    const sortedData = [...clusteredData].sort((a, b) => 
      view === 'revenue' && !hasZeroRevenue
         ? b.totalRevenue - a.totalRevenue 
         : b.customerCount - a.customerCount
    ).slice(0, 5)

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Top Regions</h4>
        <div className="space-y-2">
          {sortedData.map((region) => (
            <div key={region.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-2 text-muted-foreground" />
                <span className="text-sm">
                  {region.city}
                  {region.state ? `, ${region.state}` : ''}
                  {region.country && region.country !== 'United States' ? `, ${region.country}` : ''}
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

  const renderZeroRevenueNotice = () => {
    if (!hasZeroRevenue) return null;
    
    return (
      <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Your store has customers but no revenue data yet. The map is showing customer locations instead of sales.
        </p>
      </div>
    )
  }

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
              <TabsTrigger value="revenue" onClick={() => setView('revenue')}>Revenue</TabsTrigger>
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
            <div className="relative">
              <div 
                ref={globeContainerRef} 
                className="w-full h-[400px] rounded-md overflow-hidden relative"
                style={{ cursor: 'grab' }}
              >
                {hoveredRegion && tooltipPosition && (
                  <div 
                    className="absolute z-50 bg-black/80 text-white text-xs p-2 rounded pointer-events-none border border-gray-600"
                    style={{
                      left: `${tooltipPosition.x}px`,
                      top: `${tooltipPosition.y - 40}px`,
                      transform: 'translate(-50%, -100%)',
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
              {renderTopRegions()}
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