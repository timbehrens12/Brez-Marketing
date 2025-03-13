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
    
    let summaryText = ""
    
    // Add Shopify insights if connected
    if (hasShopify) {
      // Calculate daily averages for comparison
      const dailyAverage = periodData.month.totalSales / getDaysInCurrentMonth()
      const weeklyAverage = periodData.week.totalSales / 7
      const isWeekStronger = weeklyAverage > dailyAverage
      const weekVsMonth = ((weeklyAverage - dailyAverage) / dailyAverage) * 100
      
      // Today's performance with context
      if (periodData.today.ordersCount > 0) {
        const todayVsWeek = ((periodData.today.totalSales - weeklyAverage) / weeklyAverage) * 100
        summaryText += `Today's sales: ${formatCurrency(periodData.today.totalSales)} (${periodData.today.ordersCount} order${periodData.today.ordersCount !== 1 ? 's' : ''})`
        if (Math.abs(todayVsWeek) > 10) {
          summaryText += ` - ${todayVsWeek > 0 ? 'above' : 'below'} your weekly average. `
        } else {
          summaryText += " - in line with your weekly average. "
        }
      } else {
        summaryText += "No orders yet today. "
      }
      
      // Weekly performance with trend
      if (periodData.week.ordersCount > 0) {
        summaryText += `This week: ${formatCurrency(periodData.week.totalSales)} (${periodData.week.ordersCount} order${periodData.week.ordersCount !== 1 ? 's' : ''})`
        if (Math.abs(weekVsMonth) > 10) {
          summaryText += ` - ${weekVsMonth > 0 ? 'above' : 'below'} your monthly average. `
        } else {
          summaryText += " - in line with your monthly average. "
        }
      }
      
      // Monthly performance and AOV
      if (periodData.month.ordersCount > 5) {
        const aov = periodData.month.averageOrderValue
        summaryText += `Monthly AOV: ${formatCurrency(aov)}`
        if (aov > 100) {
          summaryText += " - strong performance. "
        } else if (aov < 50) {
          summaryText += " - room for improvement. "
        } else {
          summaryText += ". "
        }
      }
    }
    
    // Add Meta insights if connected
    if (hasMeta && metrics.adSpend > 0) {
      summaryText += `Meta ads: ${formatCurrency(metrics.adSpend)} spent with ${metrics.roas.toFixed(1)}x ROAS`
      if (metrics.roas > 3) {
        summaryText += " - excellent performance. "
      } else if (metrics.roas > 2) {
        summaryText += " - good performance. "
      } else if (metrics.roas > 1) {
        summaryText += " - positive but could improve. "
      } else {
        summaryText += " - needs optimization. "
      }
    }
    
    // Add overall brand health summary
    if (hasShopify && periodData.month.ordersCount > 5) {
      const monthlyRevenue = periodData.month.totalSales
      const weeklyRevenue = periodData.week.totalSales
      const revenueGrowth = ((weeklyRevenue * 4 - monthlyRevenue) / monthlyRevenue) * 100
      
      if (Math.abs(revenueGrowth) > 10) {
        summaryText += `Your ${revenueGrowth > 0 ? 'revenue is trending up' : 'revenue is trending down'} ${Math.abs(revenueGrowth).toFixed(0)}% compared to last month. `
      }
    }
    
    // If we have no meaningful data yet
    if (summaryText.trim() === "") {
      summaryText = `Welcome to ${brandName}'s dashboard. We're waiting for more data to provide insights.`
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