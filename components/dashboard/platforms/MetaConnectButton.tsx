"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ArrowRight, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface MetaConnectButtonProps {
  onConnect: (data: any) => Promise<void>
  isConnected: boolean
  brandId: string
}

export function MetaConnectButton({ onConnect, isConnected, brandId }: MetaConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      // First clear Facebook session in a popup
      const width = 600
      const height = 400
      const left = (window.innerWidth - width) / 2
      const top = (window.innerHeight - height) / 2
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://brezmarketingdashboard.com'
      const authUrl = `${baseUrl}/meta/auth?brandId=${brandId}&t=${Date.now()}`
      
      // Create the logout URL that redirects to our auth URL
      const logoutUrl = `https://www.facebook.com/logout.php?` + 
        `next=${encodeURIComponent(authUrl)}&` +
        `access_token=&` +
        `delete_cache=true`
      
      const popup = window.open(
        logoutUrl,
        'facebook_logout',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      // Wait for logout to complete, then close popup
      setTimeout(() => {
        if (popup) popup.close()
        // Redirect to auth URL
        window.location.href = authUrl
      }, 2000)

    } catch (error) {
      console.error("Failed to initiate Meta connection:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect Meta Ads. Please try again.",
        variant: "destructive",
      })
      setIsConnecting(false)
    }
  }

  const handleTest = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://brezmarketingdashboard.com'
      const response = await fetch(`${baseUrl}/api/meta/insights?brandId=${brandId}`)
      const data = await response.json()
      console.log('Meta API Test Response:', data)
      
      toast({
        title: "Connection Test",
        description: "Successfully fetched Meta Ads data!",
        variant: "default",
      })
    } catch (error) {
      console.error('Meta API test failed:', error)
      toast({
        title: "Connection Test Failed",
        description: "Could not fetch Meta Ads data. Check console for details.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <Button 
        onClick={handleConnect}
        disabled={isConnecting || isConnected}
        className={isConnected ? "bg-green-600 hover:bg-green-700" : ""}
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : isConnected ? (
          <>
            Connected to Meta Ads
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        ) : (
          <>
            Connect Meta Ads
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      {isConnected && (
        <Button onClick={handleTest} variant="outline" size="sm">
          Test Connection
        </Button>
      )}
    </div>
  )
}
