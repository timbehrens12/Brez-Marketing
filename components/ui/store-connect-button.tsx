"use client"

import { Button } from "@/components/ui/button"
import { Store } from "lucide-react"

interface StoreConnectButtonProps {
  brandId: string
}

export function StoreConnectButton({ brandId }: StoreConnectButtonProps) {
  const handleConnect = async () => {
    try {
      const response = await fetch('/api/shopify/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId }),
      })

      if (!response.ok) throw new Error('Failed to initiate connection')

      const data = await response.json()
      // Redirect to Shopify OAuth page
      window.location.href = data.authUrl
    } catch (error) {
      console.error('Error connecting store:', error)
    }
  }

  return (
    <Button 
      onClick={handleConnect}
      className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-2"
    >
      <Store className="h-4 w-4" />
      Connect Shopify Store
    </Button>
  )
} 