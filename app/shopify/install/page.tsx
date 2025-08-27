"use client"

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Store, BarChart3, Brain, Zap } from "lucide-react"

export default function ShopifyInstallPage() {
  const searchParams = useSearchParams()
  const [isInstalling, setIsInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shop = searchParams.get('shop')

  const handleInstall = async () => {
    if (!shop) {
      setError('No shop parameter provided')
      return
    }

    setIsInstalling(true)
    setError(null)

    try {
      // Starting Shopify OAuth flow
      
      // Start OAuth flow
      const response = await fetch('/api/shopify/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shop }),
      })

      const data = await response.json()

      if (response.ok && data.authUrl) {
        // Force redirect using top-level window to break out of any iframe
        if (window.top && window.top !== window) {
          window.top.location.href = data.authUrl
        } else {
          window.location.href = data.authUrl
        }
      } else {
        setError(data.error || 'Failed to start installation')
      }
    } catch (err) {
      setError('Installation failed. Please try again.')
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <Card className="bg-[#1A1A1A] border-[#333] max-w-2xl w-full">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <img 
                src="https://i.imgur.com/PZCtbwG.png" 
                alt="Brez Marketing Logo" 
                className="h-16 w-auto object-contain" 
              />
            </div>
            <CardTitle className="text-3xl font-bold mb-4">
              Install Brez Marketing
            </CardTitle>
            <p className="text-gray-400 text-lg">
              Connect your Shopify store to unlock powerful analytics and AI-driven insights
            </p>
            {shop && (
              <div className="mt-4 p-3 bg-[#222] border border-[#333] rounded-lg">
                <p className="text-sm text-gray-300">
                  Installing for: <span className="font-semibold text-white">{shop}</span>
                </p>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-1">Real-Time Analytics</h3>
                <p className="text-xs text-gray-400">Track performance instantly</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/30 border border-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Brain className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-semibold mb-1">AI Insights</h3>
                <p className="text-xs text-gray-400">Optimization recommendations</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/30 border border-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="font-semibold mb-1">Smart Automation</h3>
                <p className="text-xs text-gray-400">Automated reporting</p>
              </div>
            </div>

            {/* What You'll Get */}
            <div className="bg-[#222] border border-[#333] rounded-lg p-6">
              <h3 className="font-semibold mb-4 text-center">What you'll get:</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Real-time sales and performance analytics</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>AI-powered optimization recommendations</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Custom dashboard with key metrics</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Automated weekly performance reports</span>
                </li>
              </ul>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Install Button */}
            <Button 
              onClick={handleInstall}
              disabled={isInstalling || !shop}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Store className="w-5 h-5 mr-2" />
                  Install Brez Marketing
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By installing, you agree to our Terms of Service and Privacy Policy. 
              You can uninstall at any time from your Shopify admin.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
