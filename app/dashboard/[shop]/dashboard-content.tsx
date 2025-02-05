"use client"

import { useState, useEffect } from "react"

interface ShopDetails {
  name: string
  email: string
}

export function DashboardContent({ shop }: { shop: string }) {
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchShopDetails() {
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/shopify/shop?shop=${shop}`
        console.log("Fetching from:", url)

        const response = await fetch(url)
        console.log("Response status:", response.status)

        if (!response.ok) {
          throw new Error(`Failed to fetch shop details: ${response.status}`)
        }

        const data = await response.json()
        console.log("Shop data:", data)
        setShopDetails(data)
      } catch (err) {
        console.error("Error fetching shop details:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
      }
    }

    fetchShopDetails()
  }, [shop])

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-500">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <p className="mt-2 text-sm">
            Debug info:
            <br />
            API URL: {process.env.NEXT_PUBLIC_API_URL}
            <br />
            Shop: {shop}
          </p>
        </div>
      </div>
    )
  }

  if (!shopDetails) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Loading shop details...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Shop Details</h2>
        <div className="space-y-2">
          <p>Shop Name: {shopDetails.name}</p>
          <p>Email: {shopDetails.email}</p>
        </div>
      </div>
    </div>
  )
}

