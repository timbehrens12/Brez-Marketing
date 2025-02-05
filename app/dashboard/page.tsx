"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

interface ShopDetails {
  name: string
  email: string
  domain: string
  // Add other shop properties you need
}

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const shop = searchParams.get("shop")
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shop) {
      setError("No shop parameter provided")
      setLoading(false)
      return
    }

    async function fetchShopDetails() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shopify/shop?shop=${shop}`)

        if (!response.ok) {
          throw new Error("Failed to fetch shop details")
        }

        const data = await response.json()
        setShopDetails(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchShopDetails()
  }, [shop])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  if (!shopDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">No shop details found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>
      <div className="rounded-lg border p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Shop Details</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Name:</span> {shopDetails.name}
          </p>
          <p>
            <span className="font-medium">Email:</span> {shopDetails.email}
          </p>
          <p>
            <span className="font-medium">Domain:</span> {shopDetails.domain}
          </p>
        </div>
      </div>
    </div>
  )
}

