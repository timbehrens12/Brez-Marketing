"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ShopDetails } from "@/components/ShopDetails"

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const [shop, setShop] = useState<string | null>(null)

  useEffect(() => {
    const shopParam = searchParams.get("shop")
    if (shopParam) {
      setShop(shopParam)
    }
  }, [searchParams])

  if (!shop) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <ShopDetails shop={shop} />
      {/* Add more dashboard components here */}
    </div>
  )
}

