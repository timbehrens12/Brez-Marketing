"use client"

export const runtime = 'edge'

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { useBrandContext } from "@/lib/context/BrandContext"
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { useAgency } from "@/contexts/AgencyContext"
import { usePathname } from "next/navigation"

export default function OrdersPage() {
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
        message="Loading Orders"
        subMessage="Preparing your order data"
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
    )
  }
  
  return (
    <div className="container mx-auto p-6 animate-in fade-in duration-300">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      {/* Add your orders content here */}
    </div>
  )
} 