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
import { UnifiedLoading } from "@/components/ui/unified-loading"

interface WidgetManagerProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  brandId: string | null;
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
  // All hooks must be called before any conditional returns
  const { metrics: contextMetrics, isLoading: contextIsLoading } = useMetrics()
  const [activeTab, setActiveTab] = useState<string>("site")
  const [connections, setConnections] = useState<PlatformConnection[]>(existingConnections || [])

  // Define all functions before useEffect hooks
  const loadConnections = async () => {
    if (!brandId) return; // Do not load if brandId is null
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
        setConnections(data as unknown as PlatformConnection[])
      }
    } catch (error) {
      console.error('Error loading connections:', error)
    }
  }

  // Add a validation function to safely access metric values
  const safeMetricValue = (value: any, defaultValue: any = 0) => {
    return (value !== undefined && value !== null && !isNaN(value)) ? value : defaultValue;
  };

  // All useEffect hooks must be called before conditional returns
  useEffect(() => {
    if (existingConnections?.length > 0) {
      setConnections(existingConnections)
    }
  }, [existingConnections])

  useEffect(() => {
    if (brandId) {
      loadConnections()
    }
  }, [brandId])

  // NOW we can have conditional returns after all hooks are called
  // If no brand is selected, show a message
  if (!brandId) {
    return (
      <div className="text-center text-gray-400 py-12">
        Select a brand to view metrics
      </div>
    );
  }

  // Show a loading spinner during the initial data load for a selected brand
  if (initialDataLoad) {
    return <UnifiedLoading variant="page" page="dashboard" />
  }

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