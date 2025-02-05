"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

export default function InstallPage() {
  const [shop, setShop] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const shopName = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`

      window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/shopify/auth?shop=${shopName}`
    } catch (error) {
      console.error("Installation error:", error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Install Campaign Manager</h1>
          <p className="text-muted-foreground mt-2">Enter your shop domain to install the app</p>
        </div>

        <form onSubmit={handleInstall} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="yourstore.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Installing..." : "Install App"}
          </Button>
        </form>
      </div>
    </div>
  )
}

