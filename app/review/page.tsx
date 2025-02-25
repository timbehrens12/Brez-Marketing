"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2 } from "lucide-react"

export default function ReviewPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [showMockData, setShowMockData] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    // Simulate connection delay
    setTimeout(() => {
      setIsConnected(true)
      setIsConnecting(false)
    }, 1500)
  }

  const handleViewDemo = () => {
    setShowMockData(true)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container max-w-6xl mx-auto p-8 space-y-8">
        <div className="bg-[#111111] p-6 rounded-lg">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Meta App Review Demo</h1>
            <p className="text-sm text-gray-400">
              This demo shows how our app will integrate with Meta Ads once approved
            </p>
          </div>
          
          <div className="mt-8 space-y-4">
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

            {isConnected && (
              <div className="p-4 bg-[#222222] rounded-lg">
                <h3 className="font-medium mb-4">Sample Data View</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-[#333333] rounded-lg">
                    <p className="text-sm text-gray-400">Total Ad Spend</p>
                    <p className="text-2xl font-bold">$1,234.56</p>
                  </div>
                  <div className="p-4 bg-[#333333] rounded-lg">
                    <p className="text-sm text-gray-400">Impressions</p>
                    <p className="text-2xl font-bold">45,678</p>
                  </div>
                  <div className="p-4 bg-[#333333] rounded-lg">
                    <p className="text-sm text-gray-400">Clicks</p>
                    <p className="text-2xl font-bold">2,345</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-400">
                  This is example data to demonstrate how the app will display Meta Ads metrics once approved.
                </p>
              </div>
            )}

            {isConnected && (
              <div className="p-4 bg-[#222222] rounded-lg">
                <h3 className="font-medium mb-4">Campaign Performance</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#333333] rounded-lg">
                    <div>
                      <h4 className="font-medium">Spring Sale Campaign</h4>
                      <p className="text-sm text-gray-400">Active • Last 30 days</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Spend / ROAS</p>
                      <p className="font-medium">$458.32 / 2.4x</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#333333] rounded-lg">
                    <div>
                      <h4 className="font-medium">Product Launch</h4>
                      <p className="text-sm text-gray-400">Active • Last 7 days</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Spend / ROAS</p>
                      <p className="font-medium">$892.15 / 3.1x</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#333333] rounded-lg">
                    <div>
                      <h4 className="font-medium">Retargeting</h4>
                      <p className="text-sm text-gray-400">Paused • Last 14 days</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Spend / ROAS</p>
                      <p className="font-medium">$234.67 / 1.8x</p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-400">
                  Sample campaign data showing how we'll display ad performance and ROAS metrics for different campaigns.
                </p>
              </div>
            )}

            {isConnected && (
              <>
                <div className="p-4 bg-[#222222] rounded-lg">
                  <h3 className="font-medium mb-4">How We'll Use the Permissions</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="font-medium">ads_read:</div>
                      <div className="text-gray-400">Used to fetch and display ad performance metrics shown above</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="font-medium">ads_management:</div>
                      <div className="text-gray-400">Enables users to view detailed campaign data and performance insights</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="font-medium">business_management:</div>
                      <div className="text-gray-400">Required to access business account ad information</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#222222] rounded-lg">
                  <h3 className="font-medium mb-4">Privacy & Data Usage</h3>
                  <p className="text-sm text-gray-400">
                    We only access the minimum required data to show ad performance metrics. All data is securely stored and never shared with third parties. Users can revoke access at any time through Facebook or our dashboard.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 