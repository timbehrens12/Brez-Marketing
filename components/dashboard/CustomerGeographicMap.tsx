"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Globe, Loader2, Users } from 'lucide-react'
import { format } from 'date-fns'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
// @ts-ignore
import ThreeGlobe from 'three-globe'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Tooltip } from "@/components/ui/tooltip"
import * as turf from '@turf/turf'
// @ts-ignore
import countries from './countries.json'

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
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null)
  
  const globeContainerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const frameRef = useRef<number | null>(null)
  const pointsRef = useRef<{point: THREE.Object3D, data: RegionData}[]>([])
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
    
    // Clean up previous globe
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    
    if (rendererRef.current && globeContainerRef.current.contains(rendererRef.current.domElement)) {
      globeContainerRef.current.removeChild(rendererRef.current.domElement);
    }
    
    // Initialize Three.js scene
    const container = globeContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 300;
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Add a second directional light from another angle
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);
    
    // Create globe
    const globe = new ThreeGlobe()
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .hexPolygonsData(countries.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.7)
      .hexPolygonColor(() => '#3b5e7c')
      .pointsData(clusteredData.filter(d => d.customerCount > 0))
      .pointLat(d => (d as RegionData).lat)
      .pointLng(d => (d as RegionData).lng)
      .pointColor(d => {
        const data = d as RegionData;
        if (view === 'revenue') {
          if (data.totalRevenue <= 0) return '#888888';
          const intensity = Math.min(1, data.totalRevenue / 10000);
          return `rgba(30, ${100 + intensity * 155}, ${200 + intensity * 55}, 1)`;
        } else {
          const intensity = Math.min(1, data.customerCount / 100);
          return `rgba(${100 + intensity * 155}, 30, ${200 + intensity * 55}, 1)`;
        }
      })
      .pointRadius(d => {
        const data = d as RegionData;
        if (view === 'revenue') {
          return Math.max(0.5, Math.min(3, 0.5 + (data.totalRevenue / 5000) * 2.5));
        } else {
          return Math.max(0.5, Math.min(3, 0.5 + (data.customerCount / 50) * 2.5));
        }
      })
      .pointAltitude(0.01)
      .pointsMerge(false);
    
    // Add globe to scene
    scene.add(globe);
    globeRef.current = globe;
    
    // Store references to points for raycasting
    pointsRef.current = [];
    
    // Find the points group in the globe
    globe.children.forEach((child: THREE.Object3D) => {
      if (child.type === 'Group' && child.name === 'points') {
        child.children.forEach((point: THREE.Object3D, index: number) => {
          if (index < clusteredData.length) {
            pointsRef.current.push({
              point,
              data: clusteredData[index]
            });
          }
        });
      }
    });
    
    // Add mouse move handler for raycasting
    const handleMouseMove = (event: MouseEvent) => {
      if (!globeContainerRef.current || !cameraRef.current) return;
      
      // Calculate mouse position in normalized device coordinates
      const rect = globeContainerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update the picking ray
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      
      // Find intersections
      const intersects = raycasterRef.current.intersectObjects(
        pointsRef.current.map(item => item.point),
        true // Include descendants
      );
      
      if (intersects.length > 0) {
        // Find the data for the intersected point
        const intersectedObject = intersects[0].object;
        
        // Find the parent point that contains this object
        let parentPoint: THREE.Object3D | null = intersectedObject;
        let foundPoint = false;
        
        // Traverse up to find the parent point
        while (parentPoint && !foundPoint) {
          const pointData = pointsRef.current.find(item => item.point === parentPoint);
          if (pointData) {
            foundPoint = true;
            setHoveredRegion(pointData.data);
            
            // Calculate screen position for tooltip
            const position = new THREE.Vector3();
            intersectedObject.getWorldPosition(position);
            position.project(cameraRef.current);
            
            const x = (position.x * 0.5 + 0.5) * rect.width;
            const y = (-position.y * 0.5 + 0.5) * rect.height;
            
            setTooltipPosition({ x, y });
            
            // Highlight the point
            parentPoint.traverse((child: THREE.Object3D) => {
              if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshBasicMaterial({
                  color: 0xff9900,
                  transparent: true,
                  opacity: 1
                });
              }
            });
          } else {
            parentPoint = parentPoint.parent;
          }
        }
      } else {
        // Reset hover state
        setHoveredRegion(null);
        setTooltipPosition(null);
        
        // Reset all points to their original material
        pointsRef.current.forEach(({ point, data }) => {
          point.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
              let pointColor;
              if (view === 'revenue') {
                if (data.totalRevenue <= 0) {
                  pointColor = new THREE.Color(0x888888);
                } else {
                  const intensity = Math.min(1, data.totalRevenue / 10000);
                  pointColor = new THREE.Color(0.1, 0.4 + intensity * 0.6, 0.7 + intensity * 0.3);
                }
              } else {
                const intensity = Math.min(1, data.customerCount / 100);
                pointColor = new THREE.Color(
                  (100 + intensity * 155) / 255,
                  30 / 255,
                  (200 + intensity * 55) / 255
                );
              }
              
              child.material = new THREE.MeshBasicMaterial({
                color: pointColor,
                transparent: true,
                opacity: 0.9
              });
            }
          });
        });
      }
    };
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.enableZoom = true;
    controls.minDistance = 120;
    controls.maxDistance = 500;
    controlsRef.current = controls;
    
    // Add event listeners
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    
    // Animation loop
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!globeContainerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = globeContainerRef.current.clientWidth;
      const height = globeContainerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      if (rendererRef.current && globeContainerRef.current && globeContainerRef.current.contains(rendererRef.current.domElement)) {
        globeContainerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  }, [clusteredData, isLoading, view]);

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
    
    // Sort by revenue or customer count based on view
    const sortedData = [...clusteredData].sort((a, b) => {
      if (view === 'revenue') {
        return b.totalRevenue - a.totalRevenue;
      } else {
        return b.customerCount - a.customerCount;
      }
    }).slice(0, 5);
    
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
                {view === 'revenue' 
                  ? formatCurrency(region.totalRevenue)
                  : `${region.customerCount} ${region.customerCount === 1 ? 'customer' : 'customers'}`
                }
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
      <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-md p-3 text-sm text-amber-600 dark:text-amber-400">
        Your store has customers but no revenue data yet. The map is showing customer locations instead of sales.
      </div>
    );
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
            <div className="relative">
              <div 
                ref={globeContainerRef} 
                className="w-full h-[400px] rounded-md overflow-hidden relative"
                style={{ cursor: 'grab' }}
              >
                {hoveredRegion && tooltipPosition && (
                  <div 
                    className="absolute z-50 bg-black/90 text-white text-xs p-3 rounded-md pointer-events-none border border-blue-400"
                    style={{
                      left: `${tooltipPosition.x}px`,
                      top: `${tooltipPosition.y - 20}px`,
                      transform: 'translate(-50%, -100%)',
                      minWidth: '200px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
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
                        <span className="font-bold text-white">{formatCurrency(hoveredRegion.totalRevenue)}</span>
                      </div>
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