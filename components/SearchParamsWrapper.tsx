"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function SearchParamsWrapper({ onShopFound }: { onShopFound: (shop: string) => void }) {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const shop = searchParams.get("shop")
    if (shop) {
      console.log("SearchParamsWrapper: Shop found in URL:", shop)

      // Store the shop in sessionStorage
      sessionStorage.setItem("shopify_shop", shop)

      // Call the callback
      onShopFound(shop)

      // Remove the shop parameter from the URL without reloading
      const newUrl = window.location.pathname
      router.replace(newUrl, { shallow: true })
    } else {
      // Check sessionStorage for a stored shop
      const storedShop = sessionStorage.getItem("shopify_shop")
      if (storedShop) {
        console.log("SearchParamsWrapper: Shop found in sessionStorage:", storedShop)
        onShopFound(storedShop)
      } else {
        console.log("SearchParamsWrapper: No shop found in URL or sessionStorage")
      }
    }
  }, [searchParams, onShopFound, router])

  return null
}

