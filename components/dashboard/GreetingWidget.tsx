"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Metrics } from "@/types/metrics"
import { PlatformConnection } from "@/types/platformConnection"

interface GreetingWidgetProps {
  brandId: string
  brandName: string
  metrics: Metrics
  connections: PlatformConnection[]
}

export function GreetingWidget({ 
  brandId, 
  brandName, 
  metrics, 
  connections 
}: GreetingWidgetProps) {
  const { user } = useUser()
  const [greeting, setGreeting] = useState("")
  const [summary, setSummary] = useState("")

  // Set the greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours()
    
    if (hour >= 5 && hour < 12) {
      setGreeting("Good morning")
    } else if (hour >= 12 && hour < 18) {
      setGreeting("Good afternoon")
    } else {
      setGreeting("Good evening")
    }
  }, [])

  // Generate summary based on metrics
  useEffect(() => {
    if (!metrics || !brandName) {
      setSummary("Welcome to your marketing dashboard. Connect your platforms to see insights.")
      return
    }

    const hasShopify = connections.some(c => c.platform_type === 'shopify' && c.status === 'active')
    const hasMeta = connections.some(c => c.platform_type === 'meta' && c.status === 'active')
    
    let summaryText = ""
    
    // Add Shopify insights if connected
    if (hasShopify) {
      const salesTrend = metrics.salesGrowth > 0 ? "up" : "down"
      const salesGrowthAbs = Math.abs(metrics.salesGrowth).toFixed(1)
      const ordersGrowthAbs = Math.abs(metrics.ordersGrowth).toFixed(1)
      
      summaryText += `Shopify sales for "${brandName}" are ${salesTrend} ${salesGrowthAbs}% this week. `
      
      if (metrics.ordersGrowth !== 0) {
        const ordersTrend = metrics.ordersGrowth > 0 ? "increased" : "decreased"
        summaryText += `Orders have ${ordersTrend} by ${ordersGrowthAbs}%. `
      }
    }
    
    // Add Meta insights if connected
    if (hasMeta) {
      if (metrics.adSpend > 0) {
        const roasTrend = metrics.roasGrowth > 0 ? "improved" : "decreased"
        const roasGrowthAbs = Math.abs(metrics.roasGrowth).toFixed(1)
        
        summaryText += `Meta ad performance has ${roasTrend} by ${roasGrowthAbs}% with a ROAS of ${metrics.roas.toFixed(2)}x. `
      } else {
        summaryText += `Your Meta ads account is connected but no recent ad spend detected. `
      }
    }
    
    // Add a recommendation
    if (hasShopify) {
      if (metrics.salesGrowth > 10) {
        summaryText += `Consider increasing inventory levels to meet growing demand. `
      } else if (metrics.salesGrowth < -5) {
        summaryText += `Consider running a promotion to boost sales. `
      }
    }
    
    // If no platforms connected
    if (!hasShopify && !hasMeta) {
      summaryText = `Welcome to ${brandName}'s dashboard. Connect your platforms to see AI-powered insights.`
    }
    
    setSummary(summaryText)
  }, [metrics, brandName, connections])

  return (
    <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700 mb-6">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="bg-blue-500/20 rounded-full p-2 mt-1">
            <Sparkles className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-1">
              {greeting}, {user?.firstName || "there"}!
            </h3>
            <p className="text-gray-400">
              {summary}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 