"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { useBrandContext } from "@/lib/context/BrandContext"
import MetaSpendTrends from "./components/meta-spend-trends"
import MetaAdPerformance from "./components/meta-ad-performance"

export default function AnalyticsPage() {
  const { selectedBrandId } = useBrandContext()
  const supabase = useSupabase()
  
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