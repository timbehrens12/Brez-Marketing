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

  const handleConnect = () => {
    const authUrl = `${process.env.NEXT_PUBLIC_API_URL}/meta/auth?brandId=${brandId}`
    window.location.href = authUrl
  }

  return (
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
  )
}
