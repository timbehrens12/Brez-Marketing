"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Globe, Loader2, Users } from 'lucide-react'
import { 
  ComposableMap, 
  Geographies, 
  Geography, 
  Marker,
  GeographyProps,
  GeographiesProps
} from 'react-simple-maps'
import { scaleLinear } from 'd3-scale'
import { format } from 'date-fns'

interface CustomerGeographicMapProps {
  brandId: string
  isRefreshing?: boolean
}

interface RegionData {
  region: string
  country: string
  state?: string
  city?: string
  customers: number
  revenue: number
  latitude?: number
  longitude?: number
}

const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json"

export function CustomerGeographicMap({ brandId, isRefreshing = false }: CustomerGeographicMapProps) {
  const [data, setData] = useState<RegionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'revenue' | 'customers'>('customers')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [hasZeroRevenue, setHasZeroRevenue] = useState(false)

  useEffect(() => {
    if (brandId) {
      fetchGeographicData()
    }
  }, [brandId])

  useEffect(() => {
    if (isRefreshing) {
      fetchGeographicData()
    }
  }, [isRefreshing])

  const fetchGeographicData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/shopify/customers/geographic?brandId=${brandId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch geographic data')
      }
      const responseData = await response.json()
      
      setData(responseData.regions || [])
      setTotalRevenue(responseData.totalRevenue || 0)
      setTotalCustomers(responseData.totalCustomers || 0)
      setLastUpdated(new Date())
      
      // Check if we have zero revenue but some customers
      const hasZeroRev = (responseData.totalRevenue || 0) === 0 && (responseData.totalCustomers || 0) > 0
      setHasZeroRevenue(hasZeroRev)
      
      // If we have zero revenue, default to customers view
      if (hasZeroRev) {
        setView('customers')
      }
    } catch (error) {
      console.error('Error fetching geographic data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Create color scale for the map
  const colorScale = scaleLinear<string>()
    .domain([0, Math.max(...data.map(d => view === 'revenue' ? d.revenue : d.customers), 1)])
    .range(['#1f2937', '#3b82f6'])

  const getRegionColor = (region: string) => {
    const regionData = data.find(d => d.country === region)
    if (!regionData) return '#1f2937'
    
    // If we're in revenue view but have zero revenue, use customer count for coloring
    if (view === 'revenue' && hasZeroRevenue) {
      return colorScale(regionData.customers)
    }
    
    return colorScale(view === 'revenue' ? regionData.revenue : regionData.customers)
  }

  const getTotalValue = () => {
    if (view === 'revenue') {
      return totalRevenue
    } else {
      return totalCustomers
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const renderMap = () => {
    return (
      <div className="h-[400px] w-full">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 100,
          }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }: { geographies: Array<any> }) =>
              geographies.map((geo: any) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getRegionColor(geo.properties.name)}
                  stroke="#2A2A2A"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#4f46e5', outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>
          {data
            .filter(d => d.latitude && d.longitude)
            .map((d, i) => (
              <Marker key={i} coordinates={[d.longitude!, d.latitude!]}>
                <circle
                  r={Math.max(5, Math.min(12, view === 'revenue' && !hasZeroRevenue ? 
                    d.revenue / Math.max(totalRevenue / 20, 1) : 
                    d.customers / Math.max(totalCustomers / 10, 1) * 5))}
                  fill="#f97316"
                  stroke="#fff"
                  strokeWidth={1}
                />
                <title>{d.region}: {view === 'revenue' ? formatCurrency(d.revenue) : `${d.customers} customer${d.customers !== 1 ? 's' : ''}`}</title>
              </Marker>
            ))}
        </ComposableMap>
      </div>
    )
  }

  const renderTopRegions = () => {
    const sortedData = [...data].sort((a, b) => 
      view === 'revenue' && !hasZeroRevenue
        ? b.revenue - a.revenue 
        : b.customers - a.customers
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
                  ? formatCurrency(region.revenue)
                  : `${region.customers} customer${region.customers !== 1 ? 's' : ''}`
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
        {isLoading || isRefreshing ? (
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full bg-[#2A2A2A]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-[#2A2A2A]" />
              <Skeleton className="h-4 w-full bg-[#2A2A2A]" />
              <Skeleton className="h-4 w-full bg-[#2A2A2A]" />
            </div>
          </div>
        ) : data.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-2xl font-bold text-white">
                  {view === 'revenue' 
                    ? formatCurrency(getTotalValue())
                    : getTotalValue().toLocaleString()
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
            
            {renderMap()}
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