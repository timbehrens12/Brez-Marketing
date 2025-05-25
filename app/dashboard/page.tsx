"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { PlatformTabs } from "@/components/dashboard/platforms/PlatformTabs"
import BrandSelector from "@/components/BrandSelector"
import { useDataRefresh } from "@/contexts/DataRefreshContext"
import { formatLastUpdated } from "@/lib/utils/timeAgo"
import { toast } from "sonner"
import { PlatformConnection } from "@/types/platformConnection"

interface Brand {
  id: string
  name: string
}

export default function DashboardPage() {
  const { userId, isLoaded } = useAuth()
  const router = useRouter()
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [brands, setBrands] = useState<Brand[]>([])
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  })
  const [metrics, setMetrics] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const [platforms, setPlatforms] = useState({
    shopify: false,
    meta: false,
    tiktok: false,
    googleads: false
  })

  const { lastShopifyRefresh, lastMetaRefresh, markDataRefreshed } = useDataRefresh()

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/")
    }
  }, [isLoaded, userId, router])

  // Load brands on mount
  useEffect(() => {
    if (userId) {
      fetchBrands()
    }
  }, [userId])

  // Load connections when brand is selected
  useEffect(() => {
    if (selectedBrandId) {
      fetchConnections()
      fetchMetrics()
    }
  }, [selectedBrandId, dateRange])

  const fetchBrands = async () => {
    try {
      const response = await fetch("/api/brands")
      if (response.ok) {
        const data = await response.json()
        setBrands(data.brands || [])
        if (data.brands?.length > 0 && !selectedBrandId) {
          setSelectedBrandId(data.brands[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching brands:", error)
    }
  }

  const fetchConnections = async () => {
    if (!selectedBrandId) return
    
    try {
      const response = await fetch(`/api/connections?brandId=${selectedBrandId}`)
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
        
        // Update platforms based on connections
        const newPlatforms = {
          shopify: data.connections?.some((c: PlatformConnection) => c.platform_type === "shopify" && c.status === "active") || false,
          meta: data.connections?.some((c: PlatformConnection) => c.platform_type === "meta" && c.status === "active") || false,
          tiktok: false, // Not implemented yet
          googleads: false // Not implemented yet
        }
        setPlatforms(newPlatforms)
      }
    } catch (error) {
      console.error("Error fetching connections:", error)
    }
  }

  const fetchMetrics = async () => {
    if (!selectedBrandId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/metrics?brandId=${selectedBrandId}&from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`)
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics || {})
      }
    } catch (error) {
      console.error("Error fetching metrics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!selectedBrandId) return
    
    setIsRefreshingData(true)
    
    try {
      // Dispatch refresh events for all platforms
      if (platforms.shopify) {
        window.dispatchEvent(new CustomEvent('shopify-force-refresh', {
          detail: { 
            brandId: selectedBrandId, 
            timestamp: Date.now(),
            source: 'main-refresh-button'
          }
        }))
        markDataRefreshed('shopify')
      }
      
      if (platforms.meta) {
        window.dispatchEvent(new CustomEvent('meta-force-resync', {
          detail: { 
            brandId: selectedBrandId, 
            timestamp: Date.now(),
            source: 'main-refresh-button',
            forceRefresh: true
          }
        }))
        markDataRefreshed('meta')
      }
      
      // Also refresh metrics
      await fetchMetrics()
      
      toast.success("Dashboard refreshed successfully")
    } catch (error) {
      console.error("Error refreshing dashboard:", error)
      toast.error("Failed to refresh dashboard")
    } finally {
      setIsRefreshingData(false)
    }
  }

  const getLastUpdatedTime = () => {
    const times = [lastShopifyRefresh, lastMetaRefresh].filter(Boolean)
    if (times.length === 0) return null
    return new Date(Math.max(...times.map(t => t!.getTime())))
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Marketing Dashboard</h1>
            <p className="text-gray-400">
              Monitor your marketing performance across all platforms
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <BrandSelector 
              onSelect={setSelectedBrandId} 
              selectedBrandId={selectedBrandId}
              className="w-48"
            />
            
            {/* Date picker temporarily removed due to import issues */}
            
            <div className="flex flex-col items-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshingData || !selectedBrandId}
                className="bg-gray-800 hover:bg-gray-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingData ? 'animate-spin' : ''}`} />
                {isRefreshingData ? 'Refreshing...' : 'Refresh Data'}
              </Button>
              
              {getLastUpdatedTime() && (
                <span className="text-xs text-gray-500">
                  {formatLastUpdated(getLastUpdatedTime())}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Platform Tabs */}
        {selectedBrandId && (
          <PlatformTabs
            platforms={platforms}
            dateRange={dateRange}
            metrics={metrics}
            isLoading={isLoading}
            isRefreshingData={isRefreshingData}
            initialDataLoad={false}
            brandId={selectedBrandId}
            connections={connections}
            brands={brands}
          />
        )}
        
        {!selectedBrandId && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Please select a brand to view your dashboard</p>
          </div>
        )}
      </div>
    </div>
  )
}
