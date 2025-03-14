"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Sparkles, ChevronUp, ChevronDown, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Metrics } from "@/types/metrics"
import { PlatformConnection } from "@/types/platformConnection"
import { supabase } from "@/lib/supabase"
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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
  const [synopsis, setSynopsis] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [periodData, setPeriodData] = useState<{
    today: PeriodMetrics,
    week: PeriodMetrics,
    month: PeriodMetrics
  }>({
    today: { totalSales: 0, ordersCount: 0, averageOrderValue: 0 },
    week: { totalSales: 0, ordersCount: 0, averageOrderValue: 0 },
    month: { totalSales: 0, ordersCount: 0, averageOrderValue: 0 }
  })

  // Helper function to get days in current month
  const getDaysInCurrentMonth = (): number => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  }

  // Calculate platform status
  const hasShopify = connections.some(c => c.platform_type === 'shopify' && c.status === 'active')
  const hasMeta = connections.some(c => c.platform_type === 'meta' && c.status === 'active')

  // Calculate performance metrics
  const monthlyRevenue = periodData.month.totalSales
  const weeklyRevenue = periodData.week.totalSales
  const dailyAverage = periodData.month.totalSales / getDaysInCurrentMonth()
  const weeklyAverage = periodData.week.totalSales / 7
  const revenueGrowth = ((weeklyRevenue * 4 - monthlyRevenue) / monthlyRevenue) * 100
  const todayVsAverage = ((periodData.today.totalSales - dailyAverage) / dailyAverage) * 100

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

  // Generate synopsis based on metrics
  useEffect(() => {
    if (isLoading) {
      setSynopsis("Loading your brand snapshot...")
      return
    }
    
    if (!brandName) {
      setSynopsis("Welcome to your marketing dashboard. Select a brand to see insights.")
      return
    }

    if (!hasShopify && !hasMeta) {
      setSynopsis(`Welcome to ${brandName}'s dashboard. Connect your platforms to see performance metrics.`)
      return
    }

    // Create a simple performance synopsis
    let synopsisText = ""
    
    // Overall performance assessment
    if (hasShopify) {
      if (revenueGrowth > 10) {
        synopsisText = `${brandName} is performing well with revenue trending ${Math.abs(revenueGrowth).toFixed(0)}% above monthly average. `
      } else if (revenueGrowth < -10) {
        synopsisText = `${brandName} is experiencing a revenue dip, trending ${Math.abs(revenueGrowth).toFixed(0)}% below monthly average. `
      } else {
        synopsisText = `${brandName} is performing steadily with revenue in line with monthly averages. `
      }
    }
    
    // Add Meta performance if available
    if (hasMeta && metrics.adSpend > 0) {
      if (metrics.roas > 2) {
        synopsisText += `Ad campaigns are performing well with a ${metrics.roas.toFixed(1)}x return on ad spend.`
      } else if (metrics.roas < 1) {
        synopsisText += `Ad campaigns need optimization with current ROAS at ${metrics.roas.toFixed(1)}x.`
      } else {
        synopsisText += `Ad campaigns are generating a ${metrics.roas.toFixed(1)}x return on ad spend.`
      }
    }
    
    // Default message if we don't have enough data
    if (!synopsisText) {
      synopsisText = `${brandName} dashboard initialized. Gathering performance data to generate insights.`
    }
    
    setSynopsis(synopsisText)
  }, [isLoading, brandName, connections, periodData, metrics, hasShopify, hasMeta, revenueGrowth])

  // Helper function to format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <Card className="bg-gradient-to-r from-[#1A1A1A] to-[#222222] border-[#333] mb-6">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="bg-gray-700/20 rounded-full p-2 mt-1">
            <Sparkles className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                {greeting}, {user?.firstName || "there"}!
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-white"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
            
            {!isMinimized && (
              <>
                {/* Performance Synopsis */}
                <p className="text-gray-400 mt-2">
                  {synopsis}
                </p>
                
                {/* Daily Sales Snapshot */}
                {hasShopify && periodData.today && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Today's Revenue */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Today's Revenue</div>
                      <div className="text-xl font-semibold text-white">
                        {formatCurrency(periodData.today.totalSales)}
                      </div>
                      {Math.abs(todayVsAverage) > 0 && (
                        <div className={`text-xs flex items-center mt-1 ${todayVsAverage > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {todayVsAverage > 0 ? '↑' : '↓'} {Math.abs(todayVsAverage).toFixed(1)}% vs daily avg
                        </div>
                      )}
                    </div>

                    {/* Orders Today */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Orders Today</div>
                      <div className="text-xl font-semibold text-white">
                        {periodData.today.ordersCount}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {periodData.today.ordersCount > 0 ? `${formatCurrency(periodData.today.totalSales / periodData.today.ordersCount)} AOV` : 'No orders yet'}
                      </div>
                    </div>

                    {/* Weekly Performance */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">This Week</div>
                      <div className="text-xl font-semibold text-white">
                        {formatCurrency(periodData.week.totalSales)}
                      </div>
                      {Math.abs(revenueGrowth) > 0 && (
                        <div className={`text-xs flex items-center mt-1 ${revenueGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {revenueGrowth > 0 ? '↑' : '↓'} {Math.abs(revenueGrowth).toFixed(1)}% vs monthly avg
                        </div>
                      )}
                    </div>

                    {/* Monthly Progress */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Monthly Progress</div>
                      <div className="text-xl font-semibold text-white">
                        {formatCurrency(periodData.month.totalSales)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {getDaysInCurrentMonth() - new Date().getDate()} days remaining
                      </div>
                    </div>
                  </div>
                )}

                {/* Meta Ads Data (only shown when connected and has data) */}
                {hasMeta && metrics.adSpend > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Ad Spend */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Ad Spend</div>
                      <div className="text-xl font-semibold text-white">
                        {formatCurrency(metrics.adSpend)}
                      </div>
                    </div>

                    {/* ROAS */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">ROAS</div>
                      <div className="text-xl font-semibold text-white">
                        {metrics.roas ? `${metrics.roas.toFixed(1)}x` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {metrics.roas > 3 ? 'Excellent' : metrics.roas > 2 ? 'Good' : metrics.roas > 1 ? 'Average' : 'Needs improvement'}
                      </div>
                    </div>

                    {/* CTR */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Click-Through Rate</div>
                      <div className="text-xl font-semibold text-white">
                        {metrics.ctr ? `${(metrics.ctr * 100).toFixed(2)}%` : 'N/A'}
                      </div>
                    </div>

                    {/* Conversion Rate */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Conversion Rate</div>
                      <div className="text-xl font-semibold text-white">
                        {metrics.conversionRate ? `${(metrics.conversionRate * 100).toFixed(2)}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Insights Link */}
                <div className="mt-4 flex justify-between items-center">
                  {/* Platform Status */}
                  <div className="flex flex-wrap gap-2">
                    <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${hasShopify ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      Shopify {hasShopify ? 'Connected' : 'Not Connected'}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${hasMeta ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      Meta Ads {hasMeta ? 'Connected' : 'Not Connected'}
                    </div>
                  </div>
                  
                  {/* AI Insights Button */}
                  <Link href="/ai-dashboard">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs bg-gray-800/30 hover:bg-gray-700 border-gray-600"
                    >
                      View AI Insights
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 