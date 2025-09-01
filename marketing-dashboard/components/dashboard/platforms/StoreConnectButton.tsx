"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Store, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  console.error("NEXT_PUBLIC_API_URL is not defined in the environment variables.")
}

export function StoreConnectButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [storeUrl, setStoreUrl] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState("")

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsConnecting(true)

    try {
      // Direct OAuth redirect - this was working before
      window.location.href = `${API_URL}/shopify/auth?shop=${encodeURIComponent(storeUrl)}`
    } catch (error) {
      console.error("Connection error:", error)
      setError("Failed to connect store. Please try again.")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async (store: string) => {
    try {
      const response = await fetch(`${API_URL}/api/disconnect-store`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shop: store }),
      })

      if (!response.ok) {
        throw new Error("Failed to disconnect store")
      }

      // Refresh the page or update state as needed
      window.location.reload()
    } catch (error) {
      console.error("Error disconnecting store:", error)
      setError("Failed to disconnect store. Please try again.")
    }
  }

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="bg-[#96BF48] hover:bg-[#85AB3F] text-white"
      >
        <Store className="mr-2 h-4 w-4" />
        Connect Shopify Store
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Shopify Store</DialogTitle>
            <DialogDescription>
              Enter your Shopify store URL to begin the connection process.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-url">Store URL</Label>
              <div className="flex gap-2">
                <Input
                  id="store-url"
                  placeholder="your-store.myshopify.com"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  disabled={isConnecting}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#96BF48] hover:bg-[#85AB3F] text-white"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Store'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
