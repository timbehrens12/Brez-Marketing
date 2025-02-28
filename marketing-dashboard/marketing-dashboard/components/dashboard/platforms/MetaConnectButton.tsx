"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { ArrowRight, Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export function MetaConnectButton() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      // Use the correct endpoint path that matches your backend
      window.location.href = `${API_URL}/api/meta/auth`
    } catch (error) {
      console.error("Failed to initiate Meta connection:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect Meta Ads. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
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
