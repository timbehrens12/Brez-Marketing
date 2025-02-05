"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function SearchParamsWrapper({ onShopFound }: { onShopFound: (shop: string) => void }) {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const shop = searchParams.get("shop")
    if (shop) {
      console.log("Shop found in URL:", shop)
      onShopFound(shop)

      // Remove the 'shop' parameter from the URL without reloading the page
      const newUrl = window.location.pathname
      router.replace(newUrl, undefined, { shallow: true })
    }
  }, [searchParams, onShopFound, router])

  return null
}

