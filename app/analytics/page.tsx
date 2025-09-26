"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { useBrandContext } from "@/lib/context/BrandContext"
import MetaSpendTrends from "./components/meta-spend-trends"
import MetaAdPerformance from "./components/meta-ad-performance"
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { useAgency } from "@/contexts/AgencyContext"
import { usePathname } from "next/navigation"
import { GridOverlay } from "@/components/GridOverlay"
import { CustomerSegmentationWidget } from "@/components/shopify/CustomerSegmentationWidget"
import { AbandonedCartWidget } from "@/components/shopify/AbandonedCartWidget"
import { RepeatCustomersWidget } from "@/components/shopify/RepeatCustomersWidget"

export default function AnalyticsPage() {
  const { selectedBrandId } = useBrandContext()
  const supabase = useSupabase()
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const { agencySettings } = useAgency()
  const pathname = usePathname()

  useEffect(() => {
    // Page loading simulation
    const timer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Show loading state
  if (isLoadingPage) {
    const loadingConfig = getPageLoadingConfig(pathname)
    
    return (
      <UnifiedLoading
        variant="page"
        size="lg"
        message="Loading Analytics"
        subMessage="Preparing your performance insights"
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
    )
  }
  
  return (
    <div className="container mx-auto p-6 animate-in fade-in duration-300 relative">
      <GridOverlay />
      <div className="relative z-10">
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        {selectedBrandId ? (
          <div className="space-y-6">
            {/* Meta Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MetaSpendTrends brandId={selectedBrandId} />
              <MetaAdPerformance brandId={selectedBrandId} />
            </div>
            
            {/* Shopify Enhanced Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CustomerSegmentationWidget 
                brandId={selectedBrandId}
                isLoading={false}
                isRefreshingData={false}
              />
              <AbandonedCartWidget 
                brandId={selectedBrandId}
                isLoading={false}
                isRefreshingData={false}
              />
            </div>
            
            {/* Repeat Customer Analysis - Full width */}
            <div>
              <RepeatCustomersWidget 
                brandId={selectedBrandId}
                isLoading={false}
                isRefreshingData={false}
              />
            </div>
          </div>
        ) : (
          <p>Please select a brand to view analytics</p>
        )}
      </div>
    </div>
  )
} 