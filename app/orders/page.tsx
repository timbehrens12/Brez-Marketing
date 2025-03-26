"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { useBrandContext } from "@/lib/context/BrandContext"

export default function OrdersPage() {
  const { selectedBrandId } = useBrandContext()
  const supabase = useSupabase()
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      {/* Add your orders content here */}
    </div>
  )
} 