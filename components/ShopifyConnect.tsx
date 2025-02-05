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

      // Remove http:// or https:// if present
      shopUrl = shopUrl.replace(/^https?:\/\//, "")

      // Remove trailing slash if present
      shopUrl = shopUrl.replace(/\/$/, "")

      // Add .myshopify.com if not present
      if (!shopUrl.includes(".myshopify.com")) {
        shopUrl = `${shopUrl}.myshopify.com`
      }

      // First verify the server is running
      const healthCheck = await fetch(`${API_URL}`)
      if (!healthCheck.ok) {
        throw new Error("Backend server is not responding")
      }

      // Log the redirect URL for debugging
      console.log(`Redirecting to: ${API_URL}/shopify/auth?shop=${encodeURIComponent(shopUrl)}`)

      // Redirect to the Shopify auth endpoint
      window.location.href = `${API_URL}/shopify/auth?shop=${encodeURIComponent(shopUrl)}`
    } catch (err) {
      console.error("Connection error:", err)
      setError("Backend server is not responding. Please try again later or contact support.")
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
        {shop && !shop.includes(".myshopify.com") && (
          <p className="text-sm text-muted-foreground">Will connect to: {shop.trim().toLowerCase()}.myshopify.com</p>
        )}
        <Button onClick={handleConnect} variant="outline" disabled={loading} className="w-full">
          {loading ? "Connecting..." : "Connect Shopify Store"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground text-center">Enter your Shopify store URL to connect your store</p>
    </div>
  )
}

