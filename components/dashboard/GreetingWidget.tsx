"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Sparkles, AlertTriangle, BrainCircuit, ArrowRight } from "lucide-react"
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

  // Generate summary based on metrics
  useEffect(() => {
    console.log('GreetingWidget Data:', {
      periodData,
      metrics,
      connections,
      hasShopify: connections.some(c => c.platform_type === 'shopify' && c.status === 'active'),
      hasMeta: connections.some(c => c.platform_type === 'meta' && c.status === 'active')
    });

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

    let summaryParts = []
    
    // Shopify Performance Analysis
    if (hasShopify) {
      console.log('Shopify Data:', {
        today: periodData.today,
        week: periodData.week,
        month: periodData.month
      });

      const monthlyRevenue = periodData.month.totalSales
      const weeklyRevenue = periodData.week.totalSales
      const dailyAverage = periodData.month.totalSales / getDaysInCurrentMonth()
      const weeklyAverage = periodData.week.totalSales / 7
      const revenueGrowth = ((weeklyRevenue * 4 - monthlyRevenue) / monthlyRevenue) * 100
      const todayVsAverage = ((periodData.today.totalSales - dailyAverage) / dailyAverage) * 100

      console.log('Calculated Metrics:', {
        monthlyRevenue,
        weeklyRevenue,
        dailyAverage,
        weeklyAverage,
        revenueGrowth,
        todayVsAverage
      });

      let shopifyInsight = ""
      
      // Revenue Performance
      if (periodData.today.totalSales > 0) {
        shopifyInsight += `Revenue at ${formatCurrency(periodData.today.totalSales)} today `
        if (Math.abs(todayVsAverage) > 10) {
          shopifyInsight += `(${todayVsAverage > 0 ? '+' : ''}${todayVsAverage.toFixed(0)}% vs. daily average). `
        } else {
          shopifyInsight += "(on track with daily average). "
        }
      }

      // Sales Volume
      if (periodData.today.ordersCount > 0) {
        shopifyInsight += `${periodData.today.ordersCount} orders processed `
        const aov = periodData.today.totalSales / periodData.today.ordersCount
        if (aov > periodData.month.averageOrderValue * 1.2) {
          shopifyInsight += `with strong AOV of ${formatCurrency(aov)}. `
        } else if (aov < periodData.month.averageOrderValue * 0.8) {
          shopifyInsight += `with below-average AOV of ${formatCurrency(aov)} - consider upsell opportunities. `
        } else {
          shopifyInsight += `at typical AOV of ${formatCurrency(aov)}. `
        }
      }

      // Weekly and Monthly Context
      if (periodData.week.ordersCount > 20) {  // Only show if we have significant data
        shopifyInsight += `Weekly revenue of ${formatCurrency(weeklyRevenue)} `
        if (Math.abs(revenueGrowth) > 10) {
          shopifyInsight += `trending ${revenueGrowth > 0 ? 'up' : 'down'} ${Math.abs(revenueGrowth).toFixed(0)}% vs. monthly average. `
        } else {
          shopifyInsight += `maintaining consistent performance. `
        }
      }

      console.log('Shopify Insight:', shopifyInsight);

      if (shopifyInsight) {
        summaryParts.push(shopifyInsight)
      }
    }

    // Meta Ads Performance Analysis
    if (hasMeta && metrics.adSpend > 0) {
      console.log('Meta Data:', {
        adSpend: metrics.adSpend,
        roas: metrics.roas,
        ctr: metrics.ctr,
        conversionRate: metrics.conversionRate
      });

      let metaInsight = ""
      
      // ROAS Analysis
      if (metrics.roas > 0) {
        metaInsight += `Meta campaigns achieving ${metrics.roas.toFixed(1)}x ROAS on ${formatCurrency(metrics.adSpend)} spend `
        if (metrics.roas > 3) {
          metaInsight += `- exceptional performance. `
        } else if (metrics.roas > 2) {
          metaInsight += `- strong performance. `
        } else if (metrics.roas > 1) {
          metaInsight += `- room for optimization. `
        } else {
          metaInsight += `- urgent optimization needed. `
        }
      }

      // Campaign Performance
      if (metrics.ctr) {
        const ctr = metrics.ctr * 100
        if (ctr > 2) {
          metaInsight += `CTR of ${ctr.toFixed(1)}% indicates strong ad engagement. `
        } else if (ctr < 1) {
          metaInsight += `CTR of ${ctr.toFixed(1)}% suggests ad creative review needed. `
        }
      }

      if (metrics.conversionRate) {
        const cvr = metrics.conversionRate * 100
        if (cvr < 1) {
          metaInsight += `Low conversion rate of ${cvr.toFixed(1)}% - consider landing page optimization. `
        }
      }

      console.log('Meta Insight:', metaInsight);

      if (metaInsight) {
        summaryParts.push(metaInsight)
      }
    }

    // Priority Alerts
    const alerts = []
    
    if (hasShopify) {
      // Inventory alerts
      const lowStockThreshold = 5 // We can make this configurable later
      const lowStockCount = metrics.topProducts?.filter(p => p.quantity <= lowStockThreshold).length || 0
      if (lowStockCount > 0) {
        alerts.push(`${lowStockCount} products need inventory attention`)
      }
      
      // Sales trend alerts
      const monthlyRevenue = periodData.month.totalSales
      const weeklyRevenue = periodData.week.totalSales
      const revenueGrowth = ((weeklyRevenue * 4 - monthlyRevenue) / monthlyRevenue) * 100
      if (revenueGrowth < -20) {
        alerts.push('Revenue showing significant decline')
      }
    }

    if (hasMeta && metrics.adSpend > 0) {
      // Ad performance alerts
      if (metrics.roas < 1) {
        alerts.push('Ad campaigns underperforming')
      }
      if (metrics.ctr < 0.01) {
        alerts.push('Critical: Low ad engagement')
      }
    }

    console.log('Alerts:', alerts);
    console.log('Summary Parts:', summaryParts);

    // Combine all insights
    let summaryText = summaryParts.join('')
    
    // Add priority alerts if any
    if (alerts.length > 0) {
      summaryText += `Priority items: ${alerts.join(', ')}.`
    }

    // Add recommendation for incomplete data
    if (!summaryText) {
      summaryText = `${brandName} dashboard initialized. Gathering performance data to generate insights.`
    }
    
    console.log('Final Summary:', summaryText);
    
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

  return (
    <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700 mb-6">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="bg-blue-500/20 rounded-full p-2 mt-1">
            <Sparkles className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium mb-1">
              {greeting}, {user?.firstName || "there"}!
            </h3>
            
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
                <div className="bg-blue-900/30 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Ad Spend</div>
                  <div className="text-xl font-semibold text-white">
                    {formatCurrency(metrics.adSpend)}
                  </div>
                </div>

                {/* ROAS */}
                <div className="bg-blue-900/30 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">ROAS</div>
                  <div className="text-xl font-semibold text-white">
                    {metrics.roas ? `${metrics.roas.toFixed(1)}x` : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {metrics.roas > 3 ? 'Excellent' : metrics.roas > 2 ? 'Good' : metrics.roas > 1 ? 'Average' : 'Needs improvement'}
                  </div>
                </div>

                {/* CTR */}
                <div className="bg-blue-900/30 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Click-Through Rate</div>
                  <div className="text-xl font-semibold text-white">
                    {metrics.ctr ? `${(metrics.ctr * 100).toFixed(2)}%` : 'N/A'}
                  </div>
                </div>

                {/* Conversion Rate */}
                <div className="bg-blue-900/30 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Conversion Rate</div>
                  <div className="text-xl font-semibold text-white">
                    {metrics.conversionRate ? `${(metrics.conversionRate * 100).toFixed(2)}%` : 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {/* Priority Items Section */}
            {summary && summary.includes("Priority items:") && (
              <div className="mt-4 bg-amber-900/20 border border-amber-800/30 rounded-lg p-3">
                <h4 className="text-amber-400 text-sm font-medium flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Priority Items
                </h4>
                <ul className="text-gray-300 text-sm space-y-1 pl-6 list-disc">
                  {summary.split("Priority items:")[1].split(".")[0].split(",").map((item, index) => (
                    <li key={index}>{item.trim()}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Analysis Notification */}
            <div className="mt-4 bg-indigo-900/20 border border-indigo-800/30 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-500/20 rounded-full p-1.5">
                  <BrainCircuit className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-300">Your daily AI analysis is ready to view</p>
                  <p className="text-xs text-gray-500">Last analyzed: {new Date().toLocaleDateString()} at 12:00 AM</p>
                </div>
              </div>
              <Link href="/ai-dashboard">
                <Button variant="outline" size="sm" className="bg-indigo-800/50 border-indigo-700 hover:bg-indigo-700 text-indigo-200">
                  View Analysis
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {/* Summary Text (excluding priority items which are now in their own section) */}
            {summary && !summary.includes("Priority items:") && (
              <p className="text-gray-400 mt-4">
                {summary}
              </p>
            )}

            {/* Platform Status */}
            <div className="mt-4 flex flex-wrap gap-2">
              <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${hasShopify ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                <div className="w-2 h-2 rounded-full bg-current"></div>
                Shopify {hasShopify ? 'Connected' : 'Not Connected'}
              </div>
              <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${hasMeta ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                <div className="w-2 h-2 rounded-full bg-current"></div>
                Meta Ads {hasMeta ? 'Connected' : 'Not Connected'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 