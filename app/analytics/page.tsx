"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { useBrandContext } from "@/lib/context/BrandContext"
import MetaSpendTrends from "./components/meta-spend-trends"
import MetaAdPerformance from "./components/meta-ad-performance"
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { useAgency } from "@/contexts/AgencyContext"
import { usePathname } from "next/navigation"

export default function AnalyticsPage() {
  const { selectedBrandId } = useBrandContext()
  const supabase = useSupabase()
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
        message="Loading Analytics"
        subMessage="Preparing your performance insights"
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
    )
  }
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      {selectedBrandId ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetaSpendTrends brandId={selectedBrandId} />
          <MetaAdPerformance brandId={selectedBrandId} />
        </div>
      ) : (
        <p>Please select a brand to view analytics</p>
      )}
    </div>
  )
} 