import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://my-campaign-manager-8170707a798c.herokuapp.com"

export function ShopifyConnect() {
  const [shop, setShop] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    if (!shop) {
      setError("Please enter your shop URL")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Clean and format the shop URL
      let shopUrl = shop.trim().toLowerCase()
      shopUrl = shopUrl.replace(/^(https?:\/\/)?(www\.)?/, "")
      if (!shopUrl.includes("myshopify.com")) {
        shopUrl = `${shopUrl}.myshopify.com`
      }
      shopUrl = shopUrl.replace(/\/$/, "")

      console.log("Connecting to shop:", shopUrl)

      // Redirect to the Shopify auth endpoint
      const authUrl = `${API_URL}/shopify/auth?shop=${encodeURIComponent(shopUrl)}`
      console.log("Redirecting to:", authUrl)
      window.location.href = authUrl
    } catch (err) {
      console.error("Connection error:", err)
      setError("Failed to initiate connection. Please try again later or contact support.")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto p-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-4 w-full">
        <Input
          type="text"
          placeholder="your-store.myshopify.com"
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          className="w-full"
        />
        <Button onClick={handleConnect} variant="outline" disabled={loading} className="w-full">
          {loading ? "Connecting..." : "Connect Shopify Store"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground text-center">Enter your Shopify store URL to connect your store</p>
    </div>
  )
}

