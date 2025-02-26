"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { useBrandContext } from "@/lib/context/BrandContext"

export default function AnalyticsPage() {
  const { selectedBrandId } = useBrandContext()
  const supabase = useSupabase()
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      {/* Add your analytics content here */}
    </div>
  )
} 