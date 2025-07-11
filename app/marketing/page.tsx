"use client"

import { useEffect, useState } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { useAgency } from "@/contexts/AgencyContext"
import { usePathname } from "next/navigation"
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { BlendedStatsGrid } from "@/components/marketing/BlendedStatsGrid"

export default function MarketingPage() {
  const { selectedBrandId } = useBrandContext()
  const [isLoadingPage, setIsLoadingPage] = useState(true)
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
        message="Loading Marketing Dashboard"
        subMessage="Preparing your campaign insights"
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-950">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Marketing Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Unified view of all your advertising platforms
            </p>
          </div>
        </div>

        {selectedBrandId ? (
          <>
            {/* Blended Stats Widgets - Top Priority */}
            <BlendedStatsGrid brandId={selectedBrandId} />
            
            {/* Future Sections - Coming Soon */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Placeholder for future sections */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-4">Campaign Management</h3>
                <p className="text-gray-400 text-sm">
                  Active campaigns with AI recommendations - Coming Soon
                </p>
              </div>
              
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-4">Creative Analysis</h3>
                <p className="text-gray-400 text-sm">
                  Performance insights for all running creatives - Coming Soon
                </p>
              </div>
              
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-4">AI Daily Report</h3>
                <p className="text-gray-400 text-sm">
                  Automated daily insights and recommendations - Coming Soon
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">Please select a brand to view your marketing dashboard</p>
          </div>
        )}
      </div>
    </div>
  )
} 