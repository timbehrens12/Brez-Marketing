"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react"
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
  const [insightType, setInsightType] = useState<"neutral" | "positive" | "negative" | "tip">("neutral")

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
      setInsightType("neutral")
      return
    }

    const hasShopify = connections.some(c => c.platform_type === 'shopify' && c.status === 'active')
    const hasMeta = connections.some(c => c.platform_type === 'meta' && c.status === 'active')
    
    // Generate a variety of insights that could be shown
    const possibleInsights = []
    
    // Overall business health insights
    if (hasShopify) {
      // Revenue insights
      if (metrics.totalSales > 0) {
        possibleInsights.push({
          text: `${brandName} has generated $${metrics.totalSales.toLocaleString(undefined, {maximumFractionDigits: 0})} in revenue with ${metrics.ordersPlaced} orders. Your average order value is $${metrics.averageOrderValue.toFixed(2)}.`,
          type: "neutral"
        })
      }
      
      // AOV insights
      if (metrics.averageOrderValue > 0) {
        const aovBenchmark = 75 // Example benchmark
        if (metrics.averageOrderValue > aovBenchmark) {
          possibleInsights.push({
            text: `Your average order value of $${metrics.averageOrderValue.toFixed(2)} is strong. Consider upselling premium products to leverage this trend.`,
            type: "positive"
          })
        } else {
          possibleInsights.push({
            text: `Try increasing your average order value of $${metrics.averageOrderValue.toFixed(2)} with bundle offers or free shipping thresholds.`,
            type: "tip"
          })
        }
      }
      
      // Customer segment insights
      if (metrics.customerSegments) {
        const returningRatio = metrics.customerSegments.returningCustomers / 
          (metrics.customerSegments.newCustomers + metrics.customerSegments.returningCustomers) || 0
        
        if (returningRatio > 0.5) {
          possibleInsights.push({
            text: `${Math.round(returningRatio * 100)}% of your customers are returning customers - your retention strategy is working well!`,
            type: "positive"
          })
        } else if (metrics.customerSegments.newCustomers > 0) {
          possibleInsights.push({
            text: `You're attracting new customers well, but only ${Math.round(returningRatio * 100)}% are returning. Consider a loyalty program to improve retention.`,
            type: "tip"
          })
        }
      }
      
      // Top product insights
      if (metrics.topProducts && metrics.topProducts.length > 0) {
        const topProduct = metrics.topProducts[0]
        possibleInsights.push({
          text: `Your best-selling product is "${topProduct.title || 'Unknown'}" with ${topProduct.quantity} units sold. Consider featuring it prominently in your marketing.`,
          type: "positive"
        })
      }
    }
    
    // Meta ad insights
    if (hasMeta && metrics.adSpend > 0) {
      // ROAS insights
      if (metrics.roas > 0) {
        if (metrics.roas > 4) {
          possibleInsights.push({
            text: `Your Meta ads are performing exceptionally well with a ROAS of ${metrics.roas.toFixed(2)}x. Consider increasing your ad budget to scale these results.`,
            type: "positive"
          })
        } else if (metrics.roas < 2) {
          possibleInsights.push({
            text: `Your Meta ads ROAS is ${metrics.roas.toFixed(2)}x. Review your targeting and creative to improve performance.`,
            type: "negative"
          })
        } else {
          possibleInsights.push({
            text: `Your Meta ads have a healthy ROAS of ${metrics.roas.toFixed(2)}x. Continue testing new audiences to optimize further.`,
            type: "neutral"
          })
        }
      }
      
      // CTR insights
      if (metrics.ctr > 0) {
        const ctrPercentage = (metrics.ctr * 100).toFixed(2)
        if (metrics.ctr > 0.02) { // 2% is generally good
          possibleInsights.push({
            text: `Your Meta ads have a strong click-through rate of ${ctrPercentage}%. Your creative is resonating with your audience.`,
            type: "positive"
          })
        } else {
          possibleInsights.push({
            text: `Your Meta ads click-through rate is ${ctrPercentage}%. Try refreshing your ad creative to improve engagement.`,
            type: "tip"
          })
        }
      }
    }
    
    // General business tips
    possibleInsights.push({
      text: `Looking to grow ${brandName}? The AI Intelligence section can provide personalized marketing recommendations based on your data.`,
      type: "tip"
    })
    
    if (hasShopify && hasMeta) {
      possibleInsights.push({
        text: `You've connected both Shopify and Meta - great job! This gives you a complete view of your customer journey from ad to purchase.`,
        type: "positive"
      })
    } else if (!hasShopify && !hasMeta) {
      possibleInsights.push({
        text: `Connect your Shopify store and Meta Ads account to get the most out of your dashboard and unlock AI-powered insights.`,
        type: "tip"
      })
    } else if (hasShopify && !hasMeta) {
      possibleInsights.push({
        text: `Connect your Meta Ads account to track your marketing performance alongside your Shopify sales data.`,
        type: "tip"
      })
    } else if (!hasShopify && hasMeta) {
      possibleInsights.push({
        text: `Connect your Shopify store to see how your Meta Ads are driving actual sales and revenue.`,
        type: "tip"
      })
    }
    
    // Select a random insight from the possible insights
    if (possibleInsights.length > 0) {
      const randomIndex = Math.floor(Math.random() * possibleInsights.length)
      const selectedInsight = possibleInsights[randomIndex]
      setSummary(selectedInsight.text)
      setInsightType(selectedInsight.type as "neutral" | "positive" | "negative" | "tip")
    } else {
      setSummary(`Welcome to ${brandName}'s dashboard. Explore your metrics to gain insights into your business performance.`)
      setInsightType("neutral")
    }
  }, [metrics, brandName, connections])

  const getIconForInsightType = () => {
    switch (insightType) {
      case "positive":
        return <TrendingUp className="h-5 w-5 text-green-400" />
      case "negative":
        return <AlertTriangle className="h-5 w-5 text-amber-400" />
      case "tip":
        return <Lightbulb className="h-5 w-5 text-blue-400" />
      default:
        return <Sparkles className="h-5 w-5 text-blue-400" />
    }
  }

  const getBackgroundForInsightType = () => {
    switch (insightType) {
      case "positive":
        return "bg-green-500/20"
      case "negative":
        return "bg-amber-500/20"
      case "tip":
        return "bg-blue-500/20"
      default:
        return "bg-blue-500/20"
    }
  }

  return (
    <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700 mb-6">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`${getBackgroundForInsightType()} rounded-full p-2 mt-1`}>
            {getIconForInsightType()}
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