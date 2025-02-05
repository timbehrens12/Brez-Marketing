"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ShopifyConnect } from "@/components/ShopifyConnect"
import { DashboardContent } from "@/components/DashboardContent"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://my-campaign-manager-8170707a798c.herokuapp.com"

export default function DashboardPage() {
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const shop = searchParams.get("shop") || sessionStorage.getItem("shopify_shop")

    if (shop) {
      console.log("DashboardPage: Checking authentication for shop:", shop)
      checkAuthentication(shop)
    }
  }, [searchParams])

  const checkAuthentication = async (shop: string) => {
    try {
      const response = await fetch(`${API_URL}/api/shopify/shop?shop=${encodeURIComponent(shop)}`)

      if (response.ok) {
        console.log("DashboardPage: Shop is authenticated")
        setSelectedStore(shop)
        setIsAuthenticated(true)
      } else {
        console.log("DashboardPage: Shop needs authentication")
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error("DashboardPage: Error checking authentication:", error)
      setIsAuthenticated(false)
    }
  }

  if (!isAuthenticated) {
    return <ShopifyConnect />
  }

  return <DashboardContent selectedStore={selectedStore} />
}

