"use client"

import { PlatformTabs } from "@/components/dashboard/platforms/PlatformTabs"
import { useMetrics } from "@/lib/hooks/useMetrics"
import { DateRange } from "react-day-picker"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { PlatformConnection } from "@/types/platformConnection"
import { Metrics } from "@/types/metrics"
import { MetricCard } from "@/components/metrics/MetricCard"
import { DollarSign, TrendingUp, Eye, MousePointer, ShoppingBag, Users } from "lucide-react"
import Image from "next/image"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { RevenueCalendarNew } from "@/components/dashboard/RevenueCalendarNew"
import { SalesByProduct } from "@/components/dashboard/SalesByProduct"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"

interface WidgetManagerProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  brandId: string;
  metrics: Metrics;
  isLoading: boolean;
  isRefreshingData?: boolean;
  initialDataLoad?: boolean;
  platformStatus: {
    shopify: boolean;
    meta: boolean;
  };
  existingConnections: PlatformConnection[];
  children?: React.ReactNode;
  brands?: Array<{ id: string, name: string }>;
  isEditMode?: boolean;
  handleTabChange?: (tab: string) => void;
}

export function WidgetManager({ 
  dateRange, 
  brandId, 
  metrics, 
  isLoading,
  isRefreshingData = false,
  initialDataLoad = false,
  platformStatus,
  existingConnections,
  children,
  brands = [],
  isEditMode = false,
  handleTabChange
}: WidgetManagerProps) {
  const { metrics: contextMetrics, isLoading: contextIsLoading } = useMetrics()
  const [activeTab, setActiveTab] = useState<string>("site")
  const [connections, setConnections] = useState<PlatformConnection[]>(existingConnections || [])

  // Don't render anything during initial data load
  // This is redundant with the check in the dashboard page, but added as a safeguard
  if (initialDataLoad) {
    return null;
  }

  // Add a validation function to safely access metric values
  const safeMetricValue = (value: any, defaultValue: any = 0) => {
    return (value !== undefined && value !== null && !isNaN(value)) ? value : defaultValue;
  };

  useEffect(() => {
    if (existingConnections?.length > 0) {
      setConnections(existingConnections)
    }
  }, [existingConnections])

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', brandId)
      
      if (error) {
        console.error('Error loading connections:', error)
        return
      }
      
      if (data) {
        setConnections(data)
      }
    } catch (error) {
      console.error('Error loading connections:', error)
    }
  }

  useEffect(() => {
    if (brandId) {
      loadConnections()
    }
  }, [brandId])

  const handleTabChangeInternal = (value: string) => {
    setActiveTab(value)
    
    // Pass the change to the parent component if the handler exists
    if (handleTabChange) {
      handleTabChange(value)
    }
  }

  return (
    <>
      <PlatformTabs
        platforms={platformStatus}
        dateRange={dateRange}
        metrics={metrics}
        isLoading={isLoading}
        isRefreshingData={isRefreshingData}
        initialDataLoad={initialDataLoad}
        brandId={brandId}
        connections={connections}
        onTabChange={handleTabChangeInternal}
        brands={brands}
        isEditMode={isEditMode}
      />
      
      {/* Only show Meta widgets when Meta tab is active */}
      {activeTab === "meta" && children}
    </>
  )
} 