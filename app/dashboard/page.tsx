"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardContent } from "@/components/DashboardContent"

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const shop = searchParams.get("shop")

  useEffect(() => {
    async function verifySession() {
      try {
        // Get the shop from URL params or session storage
        const shopDomain = shop || sessionStorage.getItem("shopify_shop")

        if (!shopDomain) {
          window.location.href = "/"
          return
        }

        // Verify the session with your backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shopify/verify-session?shop=${shopDomain}`)
        const data = await response.json()

        if (data.authenticated) {
          setIsAuthenticated(true)
        } else {
          window.location.href = "/"
        }
      } catch (error) {
        console.error("Session verification failed:", error)
        window.location.href = "/"
      } finally {
        setIsLoading(false)
      }
    }

    verifySession()
  }, [shop])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return null
  }

  return <DashboardContent />
}

