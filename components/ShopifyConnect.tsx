import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.brezmarketingdashboard.com"

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

      // Remove any protocol and www
      shopUrl = shopUrl.replace(/^(https?:\/\/)?(www\.)?/, "")

      // Add myshopify.com if it's not there
      if (!shopUrl.includes("myshopify.com")) {
        shopUrl = `${shopUrl}.myshopify.com`
      }

      // Remove any trailing slashes
      shopUrl = shopUrl.replace(/\/$/, "")

      console.log("Connecting to shop:", shopUrl)

      // First verify the server is running
      const healthCheck = await fetch(`${API_URL}`)
      if (!healthCheck.ok) {
        throw new Error("Backend server is not responding")
      }

      // Redirect to the Shopify auth endpoint
      const authUrl = `${API_URL}/shopify/auth?shop=${encodeURIComponent(shopUrl)}`
      console.log("Redirecting to:", authUrl)
      window.location.href = authUrl
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
        <Button onClick={handleConnect} variant="outline" disabled={loading} className="w-full">
          {loading ? "Connecting..." : "Connect Shopify Store"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground text-center">Enter your Shopify store URL to connect your store</p>
    </div>
  )
}

