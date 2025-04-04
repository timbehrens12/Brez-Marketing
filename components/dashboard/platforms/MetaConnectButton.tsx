"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ArrowRight, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface MetaConnectButtonProps {
  onConnect: (data: any) => Promise<void>
  isConnected: boolean
  brandId: string
  onDisconnect?: () => Promise<void>
}

export function MetaConnectButton({ onConnect, isConnected, brandId, onDisconnect }: MetaConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://brezmarketingdashboard.com'
      const authUrl = `${baseUrl}/api/auth/meta?brandId=${brandId}`
      const finalUrl = `${authUrl}&t=${Date.now()}`
      console.log('Redirecting to:', finalUrl)
      window.location.href = finalUrl
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

  const handleDisconnect = async () => {
    if (!onDisconnect) return
    
    if (confirm('Are you sure you want to disconnect Meta Ads? This will revoke all permissions.')) {
      await onDisconnect()
    }
  }

  return (
    <div className="flex gap-2">
      {isConnected ? (
        <>
          <Button 
            variant="outline"
            className="bg-transparent text-red-500 hover:bg-red-500/10"
            onClick={handleDisconnect}
            disabled={isConnecting}
          >
            Disconnect
          </Button>
        </>
      ) : (
        <Button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Connect Meta Ads
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  )
}
