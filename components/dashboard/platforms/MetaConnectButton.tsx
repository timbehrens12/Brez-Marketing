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
      // For review, just show mock data after connection
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://brezmarketingdashboard.com'
      const authUrl = `${baseUrl}/meta/auth?brandId=${brandId}&t=${Date.now()}&review=true`
      window.location.href = authUrl
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

  // For review, show mock data
  const handleTest = async () => {
    toast({
      title: "Connection Test",
      description: "Successfully connected to Meta! This is a demo view for app review.",
      variant: "default",
    })
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
            Connected to Meta
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        ) : (
          <>
            Connect Meta Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      {isConnected && (
        <Button onClick={handleTest} variant="outline" size="sm">
          View Demo Data
        </Button>
      )}
    </div>
  )
}
