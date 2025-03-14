"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Sparkles, AlertTriangle, ChevronUp, ChevronDown, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Metrics } from "@/types/metrics"
import { PlatformConnection } from "@/types/platformConnection"
import { supabase } from "@/lib/supabase"
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { Button } from "@/components/ui/button"

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
    let alerts = []
    
    // Add Shopify insights
    if (hasShopify) {
      // Today's performance
      if (periodData.today.totalSales > 0) {
        if (todayVsAverage > 20) {
          summaryParts.push(`Today's sales are ${Math.abs(todayVsAverage).toFixed(0)}% above your daily average. `)
        } else if (todayVsAverage < -20) {
          summaryParts.push(`Today's sales are ${Math.abs(todayVsAverage).toFixed(0)}% below your daily average. `)
        }
      }
      
      // Weekly trends
      if (revenueGrowth > 15) {
        summaryParts.push(`Your weekly revenue is trending ${Math.abs(revenueGrowth).toFixed(0)}% above your monthly average. `)
      } else if (revenueGrowth < -15) {
        summaryParts.push(`Your weekly revenue is trending ${Math.abs(revenueGrowth).toFixed(0)}% below your monthly average. `)
      }
      
      // Conversion insights
      if (metrics.conversionRate > 0) {
        if (metrics.conversionRateGrowth > 10) {
          summaryParts.push(`Your store conversion rate has improved by ${metrics.conversionRateGrowth.toFixed(0)}%. `)
        } else if (metrics.conversionRateGrowth < -10) {
          summaryParts.push(`Your store conversion rate has decreased by ${Math.abs(metrics.conversionRateGrowth).toFixed(0)}%. `)
        }
      }
    }
    
    // Add Meta insights
    if (hasMeta && metrics.adSpend > 0) {
      // ROAS insights
      if (metrics.roas > 0) {
        if (metrics.roasGrowth > 15) {
          summaryParts.push(`Your ad return on spend has improved by ${metrics.roasGrowth.toFixed(0)}%. `)
        } else if (metrics.roasGrowth < -15) {
          summaryParts.push(`Your ad return on spend has decreased by ${Math.abs(metrics.roasGrowth).toFixed(0)}%. `)
        }
      }
      
      // CTR insights
      if (metrics.ctr > 0) {
        if (metrics.ctrGrowth > 15) {
          summaryParts.push(`Your ad click-through rate has improved by ${metrics.ctrGrowth.toFixed(0)}%. `)
        } else if (metrics.ctrGrowth < -15) {
          summaryParts.push(`Your ad click-through rate has decreased by ${Math.abs(metrics.ctrGrowth).toFixed(0)}%. `)
        }
      }
    }

    // Generate action items from all available data sources
    if (hasShopify) {
      // Inventory alerts
      const lowStockThreshold = 5 // We can make this configurable later
      const lowStockCount = metrics.topProducts?.filter(p => p.quantity <= lowStockThreshold).length || 0
      if (lowStockCount > 0) {
        const lowStockProducts = metrics.topProducts?.filter(p => p.quantity <= lowStockThreshold).map(p => p.title).slice(0, 2).join(", ")
        const additionalCount = lowStockCount > 2 ? ` and ${lowStockCount - 2} more` : ""
        alerts.push({
          id: `inventory-${Date.now()}`,
          severity: 'high',
          message: `Restock inventory for ${lowStockProducts}${additionalCount}`,
          context: `${lowStockCount} products are below the minimum threshold of ${lowStockThreshold} units`,
          action: 'Review inventory levels and place orders with suppliers'
        })
      }
      
      // Sales trend alerts
      const monthlyRevenue = periodData.month.totalSales
      const weeklyRevenue = periodData.week.totalSales
      const revenueGrowth = ((weeklyRevenue * 4 - monthlyRevenue) / monthlyRevenue) * 100
      if (revenueGrowth < -20) {
        alerts.push({
          id: `revenue-${Date.now()}`,
          severity: 'high',
          message: `Revenue down ${Math.abs(revenueGrowth).toFixed(0)}% compared to monthly average`,
          context: `Weekly revenue of ${formatCurrency(weeklyRevenue)} is significantly below trend`,
          action: 'Launch a promotional campaign or review pricing strategy'
        })
      }
      
      // AOV alerts
      const currentAOV = periodData.today.ordersCount > 0 ? 
        periodData.today.totalSales / periodData.today.ordersCount : 0
      const monthlyAOV = periodData.month.ordersCount > 0 ? 
        periodData.month.totalSales / periodData.month.ordersCount : 0
      
      if (currentAOV > 0 && monthlyAOV > 0 && currentAOV < monthlyAOV * 0.7) {
        alerts.push({
          id: `aov-${Date.now()}`,
          severity: 'medium',
          message: `Average order value down to ${formatCurrency(currentAOV)}`,
          context: `Current AOV is ${((1 - currentAOV/monthlyAOV) * 100).toFixed(0)}% below your monthly average of ${formatCurrency(monthlyAOV)}`,
          action: 'Add product bundles or implement upsell strategies'
        })
      }
      
      // Order frequency alerts
      if (periodData.week.ordersCount < 5 && periodData.month.ordersCount > 20) {
        alerts.push({
          id: `orders-${Date.now()}`,
          severity: 'medium',
          message: `Order frequency has dropped significantly this week`,
          context: `Only ${periodData.week.ordersCount} orders this week compared to a monthly pace of ${Math.round(periodData.month.ordersCount / 4)} per week`,
          action: 'Send a re-engagement email campaign to recent customers'
        })
      }
    }

    if (hasMeta && metrics.adSpend > 0) {
      // Ad performance alerts
      if (metrics.roas < 1) {
        alerts.push({
          id: `roas-${Date.now()}`,
          severity: 'high',
          message: `Ad campaigns losing money with ${metrics.roas.toFixed(1)}x ROAS`,
          context: `Spending ${formatCurrency(metrics.adSpend)} with negative return on ad spend`,
          action: 'Pause underperforming ad sets and reallocate budget'
        })
      }
      if (metrics.ctr < 0.01) {
        alerts.push({
          id: `ctr-${Date.now()}`,
          severity: 'high',
          message: `Critical: Ad engagement rate below 1%`,
          context: `CTR of ${(metrics.ctr * 100).toFixed(2)}% indicates ad creative or targeting issues`,
          action: 'Refresh ad creative and review audience targeting'
        })
      }
      if (metrics.adSpend > 500 && metrics.roas < 1.5) {
        alerts.push({
          id: `adspend-${Date.now()}`,
          severity: 'medium',
          message: `High ad spend (${formatCurrency(metrics.adSpend)}) with low return`,
          context: `ROAS of ${metrics.roas.toFixed(1)}x is below target for your current spend level`,
          action: 'Optimize campaigns or reduce daily budget until performance improves'
        })
      }
      if (metrics.conversionRate && metrics.conversionRate < 0.01) {
        alerts.push({
          id: `conversion-${Date.now()}`,
          severity: 'medium',
          message: `Ad traffic not converting to sales`,
          context: `Conversion rate of ${(metrics.conversionRate * 100).toFixed(2)}% indicates landing page or offer issues`,
          action: 'Review landing pages and optimize checkout experience'
        })
      }
    }

    // Check for additional platform-specific metrics that might not be displayed in the widget
    if (metrics.customerRetentionRate < 0.3) {
      alerts.push({
        id: `retention-${Date.now()}`,
        severity: 'medium',
        message: `Low customer retention rate of ${(metrics.customerRetentionRate * 100).toFixed(0)}%`,
        context: `Most customers are not making repeat purchases`,
        action: 'Implement a customer loyalty program or post-purchase follow-up'
      })
    }
    
    if (metrics.returnRate > 0.1) {
      alerts.push({
        id: `returns-${Date.now()}`,
        severity: 'medium',
        message: `High product return rate of ${(metrics.returnRate * 100).toFixed(0)}%`,
        context: `Returns are affecting profitability and customer satisfaction`,
        action: 'Review product descriptions and quality control processes'
      })
    }
    
    if (metrics.customerSegments && 
        metrics.customerSegments.newCustomers > 0 && 
        metrics.customerSegments.returningCustomers > 0) {
      const newToReturningRatio = metrics.customerSegments.newCustomers / metrics.customerSegments.returningCustomers;
      if (newToReturningRatio > 5) {
        alerts.push({
          id: `newcust-${Date.now()}`,
          severity: 'low',
          message: `Few customers are returning for repeat purchases`,
          context: `New to returning customer ratio of ${newToReturningRatio.toFixed(1)}:1 indicates retention issues`,
          action: 'Create a win-back campaign for one-time purchasers'
        })
      }
    }

    console.log('Alerts:', alerts);
    console.log('Summary Parts:', summaryParts);

    // Combine all insights
    let summaryText = summaryParts.join('')
    
    // Add priority alerts if any, renamed to "Action Items"
    if (alerts.length > 0) {
      // Convert the structured alerts to a string format for backward compatibility
      const alertStrings = alerts.map(alert => alert.message);
      summaryText += `Action Items: ${alertStrings.join('. ')}.`
      
      // Store the structured alerts for rendering
      setActionItems(alerts as Array<{
        id: string;
        severity: 'high' | 'medium' | 'low';
        message: string;
        context: string;
        action: string;
      }>);
    } else {
      setActionItems([]);
    }

    // Add recommendation for incomplete data
    if (!summaryText) {
      summaryText = `${brandName} dashboard initialized. Gathering performance data to generate insights.`
    }
    
    console.log('Final Summary:', summaryText);
    
    setSummary(summaryText)
  }, [isLoading, brandName, connections, periodData, metrics])

  // Add state for action items
  const [actionItems, setActionItems] = useState<Array<{
    id: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    context: string;
    action: string;
  }>>([])
  
  // Function to handle completing an action item
  const completeActionItem = (id: string) => {
    setActionItems(prev => prev.filter(item => item.id !== id))
  }

  // Helper function to format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Helper function to get severity color
  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'high':
        return 'text-red-400 bg-red-900/20 border-red-800/30'
      case 'medium':
        return 'text-amber-400 bg-amber-900/20 border-amber-800/30'
      case 'low':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-800/30'
      default:
        return 'text-amber-400 bg-amber-900/20 border-amber-800/30'
    }
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

                {/* Action Items Section */}
                {actionItems.length > 0 && (
                  <div className="mt-4 bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
                    <div className="bg-gray-800 px-3 py-2 border-b border-gray-700/50 flex items-center justify-between">
                      <h4 className="text-white text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        Action Items
                      </h4>
                      <span className="text-xs text-gray-400">{actionItems.length} items requiring attention</span>
                    </div>
                    <div className="divide-y divide-gray-700/50">
                      {actionItems.map((item) => (
                        <div key={item.id} className={`p-3 ${getSeverityColor(item.severity)}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h5 className="font-medium text-sm mb-1">{item.message}</h5>
                              <p className="text-xs text-gray-300 mb-1">{item.context}</p>
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <span className="font-medium">Recommended action:</span> {item.action}
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 px-2 text-xs bg-gray-800/30 hover:bg-gray-700 border-gray-600"
                              onClick={() => completeActionItem(item.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legacy Action Items Section - for backward compatibility */}
                {summary && summary.includes("Action Items:") && actionItems.length === 0 && (
                  <div className="mt-4 bg-amber-900/20 border border-amber-800/30 rounded-lg p-3">
                    <h4 className="text-amber-400 text-sm font-medium flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Action Items
                    </h4>
                    <ul className="text-gray-300 text-sm space-y-1 pl-6 list-disc">
                      {summary
                        .split("Action Items:")[1]
                        .split(".")
                        .filter(item => item.trim().length > 0)
                        .map((item, index) => (
                          <li key={index}>{item.trim()}</li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Summary Text (excluding priority items which are now in their own section) */}
                {summary && !summary.includes("Action Items:") && (
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
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 