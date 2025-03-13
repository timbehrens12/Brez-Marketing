"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Metrics } from "@/types/metrics"
import { PlatformConnection } from "@/types/platformConnection"
import { supabase } from "@/lib/supabase"
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"

interface GreetingWidgetProps {
  brandId: string
  brandName: string
  metrics: Metrics
  connections: PlatformConnection[]
}

interface PeriodMetrics {
  totalSales: number
  ordersCount: number
  averageOrderValue: number
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
  const [isLoading, setIsLoading] = useState(true)
  const [periodData, setPeriodData] = useState<{
    today: PeriodMetrics,
    week: PeriodMetrics,
    month: PeriodMetrics
  }>({
    today: { totalSales: 0, ordersCount: 0, averageOrderValue: 0 },
    week: { totalSales: 0, ordersCount: 0, averageOrderValue: 0 },
    month: { totalSales: 0, ordersCount: 0, averageOrderValue: 0 }
  })

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

  // Fetch data for different time periods
  useEffect(() => {
    const fetchPeriodData = async () => {
      if (!brandId || !connections.length) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      
      try {
        const shopifyConnection = connections.find(c => 
          c.platform_type === 'shopify' && c.status === 'active'
        )
        
        if (!shopifyConnection) {
          setIsLoading(false)
          return
        }
        
        const today = new Date()
        
        // Define time periods
        const periods = {
          today: {
            from: startOfDay(today),
            to: endOfDay(today)
          },
          week: {
            from: startOfWeek(today, { weekStartsOn: 1 }),
            to: endOfWeek(today, { weekStartsOn: 1 })
          },
          month: {
            from: startOfMonth(today),
            to: endOfMonth(today)
          }
        }
        
        // Fetch data for each period
        const results = {
          today: await fetchPeriodMetrics(shopifyConnection.id, periods.today.from, periods.today.to),
          week: await fetchPeriodMetrics(shopifyConnection.id, periods.week.from, periods.week.to),
          month: await fetchPeriodMetrics(shopifyConnection.id, periods.month.from, periods.month.to)
        }
        
        setPeriodData(results)
      } catch (error) {
        console.error('Error fetching period data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPeriodData()
  }, [brandId, connections])

  // Function to fetch metrics for a specific period
  const fetchPeriodMetrics = async (connectionId: string, from: Date, to: Date): Promise<PeriodMetrics> => {
    try {
      const { data: orders, error } = await supabase
        .from('shopify_orders')
        .select('*')
        .eq('connection_id', connectionId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
      
      if (error) throw error
      
      if (!orders || orders.length === 0) {
        return { totalSales: 0, ordersCount: 0, averageOrderValue: 0 }
      }
      
      const totalSales = orders.reduce((sum: number, order: { total_price: string | number }) => {
        const price = typeof order.total_price === 'string' 
          ? parseFloat(order.total_price) 
          : (order.total_price || 0)
        return sum + price
      }, 0)
      
      const ordersCount = orders.length
      const averageOrderValue = ordersCount > 0 ? totalSales / ordersCount : 0
      
      return {
        totalSales,
        ordersCount,
        averageOrderValue
      }
    } catch (error) {
      console.error('Error fetching period metrics:', error)
      return { totalSales: 0, ordersCount: 0, averageOrderValue: 0 }
    }
  }

  // Generate summary based on metrics
  useEffect(() => {
    if (isLoading) {
      setSummary("Loading your brand snapshot...")
      return
    }
    
    if (!brandName) {
      setSummary("Welcome to your marketing dashboard. Select a brand to see insights.")
      return
    }

    const hasShopify = connections.some(c => c.platform_type === 'shopify' && c.status === 'active')
    const hasMeta = connections.some(c => c.platform_type === 'meta' && c.status === 'active')
    
    if (!hasShopify && !hasMeta) {
      setSummary(`Welcome to ${brandName}'s dashboard. Connect your platforms to see AI-powered insights.`)
      return
    }
    
    let summaryText = `You've connected ${[
      hasShopify && 'Shopify',
      hasMeta && 'Meta'
    ].filter(Boolean).join(' and ')} - great job! `

    // Quick platform status overview
    const platformStatus = []
    
    if (hasShopify) {
      if (periodData.today.ordersCount > 0) {
        platformStatus.push(`Shopify: ${periodData.today.ordersCount} order${periodData.today.ordersCount !== 1 ? 's' : ''} today (${formatCurrency(periodData.today.totalSales)})`)
      } else if (periodData.week.ordersCount > 0) {
        platformStatus.push(`Shopify: ${periodData.week.ordersCount} orders this week`)
      } else {
        platformStatus.push('Shopify: No recent orders')
      }
    }
    
    if (hasMeta && metrics.adSpend > 0) {
      platformStatus.push(`Meta: ${metrics.roas.toFixed(1)}x ROAS on ${formatCurrency(metrics.adSpend)} ad spend`)
    } else if (hasMeta) {
      platformStatus.push('Meta: Connected but no active campaigns')
    }

    if (platformStatus.length > 0) {
      summaryText += platformStatus.join(' • ')
    }

    // Add customer journey insight if both platforms are connected
    if (hasShopify && hasMeta) {
      summaryText += ` This gives you a complete view of your customer journey from ad to purchase.`
    }

    // Add quick performance highlight if we have enough data
    if (hasShopify && periodData.month.ordersCount > 5) {
      const monthlyRevenue = periodData.month.totalSales
      const weeklyRevenue = periodData.week.totalSales
      const revenueGrowth = ((weeklyRevenue * 4 - monthlyRevenue) / monthlyRevenue) * 100

      if (Math.abs(revenueGrowth) > 10) {
        summaryText += ` Revenue is trending ${revenueGrowth > 0 ? 'up' : 'down'} ${Math.abs(revenueGrowth).toFixed(0)}% this month.`
      }
    }
    
    setSummary(summaryText)
  }, [isLoading, brandName, connections, periodData, metrics])

  // Helper function to format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }
  
  // Helper function to get days in current month
  const getDaysInCurrentMonth = (): number => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  }

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