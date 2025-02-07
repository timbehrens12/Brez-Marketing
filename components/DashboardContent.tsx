"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.brezmarketingdashboard.com"

interface DashboardContentProps {
  selectedStore: string | null
}

export function DashboardContent({ selectedStore }: DashboardContentProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchData = async () => {
    if (!selectedStore) return

    setIsRefreshing(true)
    try {
      console.log("DashboardContent: Fetching data for shop:", selectedStore)
      const response = await fetch(`${API_URL}/api/shopify/sales?shop=${encodeURIComponent(selectedStore)}`)

      if (!response.ok) {
        if (response.status === 401) {
          // Handle authentication error
          window.location.href = `${API_URL}/shopify/auth?shop=${encodeURIComponent(selectedStore)}`
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log("DashboardContent: Received data:", result)
      setData(result)
      setError(null)
    } catch (error) {
      console.error("DashboardContent: Error fetching data:", error)
      setError(error instanceof Error ? error.message : "Failed to load dashboard data")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (selectedStore) {
      fetchData()
    }
  }, [selectedStore, fetchData]) // Added fetchData to dependencies

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading dashboard data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Alert variant="destructive" className="max-w-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={fetchData} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>

      {data && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-2">Orders</h2>
            <p className="text-2xl font-bold">{data.orders?.length || 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-2">Products</h2>
            <p className="text-2xl font-bold">{data.products?.length || 0}</p>
          </div>
        </div>
      )}
    </div>
  )
}

