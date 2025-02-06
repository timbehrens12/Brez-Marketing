"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { DashboardContent } from "@/components/DashboardContent"
import { Loader2 } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://my-campaign-manager-8170707a798c.herokuapp.com"

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const shop = searchParams.get("shop") || sessionStorage.getItem("shopify_shop")
    console.log("[Dashboard] Initial load", { shop, searchParams: searchParams.toString() })

    if (!shop) {
      console.log("[Dashboard] No shop found, redirecting to root")
      router.push("/")
      return
    }

    // Store in both sessionStorage and cookie (cookie set via middleware)
    sessionStorage.setItem("shopify_shop", shop)

    async function verifySession() {
      try {
        console.log("[Dashboard] Verifying session for shop:", shop)
        const response = await fetch(`${API_URL}/shopify/verify-session?shop=${shop}`)
        const data = await response.json()

        if (!data.authenticated) {
          console.log("[Dashboard] Session not authenticated, initiating auth flow")
          const redirectUri = `${window.location.origin}/dashboard`
          window.location.href = `${API_URL}/shopify/auth?shop=${shop}&redirect_uri=${encodeURIComponent(redirectUri)}`
          return
        }

        console.log("[Dashboard] Session verified successfully")
        setIsLoading(false)
      } catch (error) {
        console.error("[Dashboard] Session verification failed:", error)
        setError("Failed to verify session. Please try again.")
        setIsLoading(false)
      }
    }

    verifySession()
  }, [router, searchParams])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Verifying session...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return <DashboardContent />
}

