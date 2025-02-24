"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2 } from "lucide-react"

export default function ReviewPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const brandId = "demo-brand-123"

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://brezmarketingdashboard.com'
      const authUrl = `${baseUrl}/api/auth/meta?brandId=${brandId}&review=true`
      window.location.href = authUrl
    } catch (error) {
      console.error("Failed to connect:", error)
      setIsConnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container max-w-6xl mx-auto p-8 space-y-8">
        <div className="bg-[#111111] p-6 rounded-lg">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Meta App Review Demo</h1>
            <p className="text-sm text-gray-400">
              This demo shows how our app integrates with Meta Ads
            </p>
          </div>
          
          <div className="mt-8">
            <div className="flex items-center justify-between p-4 bg-[#222222] rounded-lg">
              <div className="flex items-center gap-3">
                <img src="/meta-icon.png" alt="Meta" className="w-8 h-8" />
                <div>
                  <h3 className="font-medium">Meta Integration</h3>
                  <p className="text-sm text-gray-400">
                    Connect your Meta account to view ad performance
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleConnect}
                  disabled={isConnecting || isConnected}
                  className={isConnected ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 