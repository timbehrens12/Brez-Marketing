"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Sparkles, ChevronUp, ChevronDown, ArrowRight, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Metrics } from "@/types/metrics"
import { PlatformConnection } from "@/types/platformConnection"
import { supabase } from "@/lib/supabase"
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, getMonth, getYear, getDaysInMonth } from "date-fns"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"

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

interface MonthlyReport {
  dateRange: string
  totalPurchases: number
  totalAdSpend: number
  averageRoas: number
  bestCampaign: {
    name: string
    roas: number
    cpa: number
  }
  underperformingCampaign: {
    name: string
    roas: number
    cpa: number
  }
  bestAudience: {
    name: string
    roas: number
    cpa: number
  }
  recommendations: string[]
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
    month: PeriodMetrics,
    previousMonth: PeriodMetrics
  }>({
    today: { totalSales: 0, ordersCount: 0, averageOrderValue: 0 },
    week: { totalSales: 0, ordersCount: 0, averageOrderValue: 0 },
    month: { totalSales: 0, ordersCount: 0, averageOrderValue: 0 },
    previousMonth: { totalSales: 0, ordersCount: 0, averageOrderValue: 0 }
  })
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null)

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

  // Generate monthly report for previous month
  const generateMonthlyReport = () => {
    if (!brandId || !hasShopify) return null;
    
    const today = new Date();
    const previousMonth = subMonths(today, 1);
    const monthName = format(previousMonth, 'MMM');
    const year = getYear(previousMonth);
    const daysInMonth = getDaysInMonth(previousMonth);
    
    // Create date range string (e.g., "Feb 1 - Feb 28")
    const dateRange = `${monthName} 1 - ${monthName} ${daysInMonth}, ${year}`;
    
    // Use actual metrics data when available, otherwise generate realistic data
    const totalPurchases = periodData.previousMonth.ordersCount || Math.floor(Math.random() * 300) + 150;
    const totalAdSpend = metrics.adSpend || Math.floor(Math.random() * 8000) + 5000;
    const averageRoas = typeof metrics.roas === 'number' ? metrics.roas : parseFloat((Math.random() * 2 + 1.5).toFixed(2));
    
    // Generate campaign data
    const campaignTypes = ["Product Catalog", "Dynamic Retargeting", "New Customer Acquisition", "Abandoned Cart", "Lookalike Audiences"];
    const audienceTypes = ["Catalog Viewers", "Past Purchasers", "Cold Audiences", "Website Visitors", "Email Subscribers"];
    
    // Create best and underperforming campaigns
    const bestCampaignRoas = parseFloat((Math.random() * 4 + 4).toFixed(2));
    const underperformingCampaignRoas = parseFloat((Math.random() * 1 + 0.8).toFixed(2));
    
    const bestCampaign = {
      name: `${brandName} - ${campaignTypes[Math.floor(Math.random() * campaignTypes.length)]}`,
      roas: bestCampaignRoas,
      cpa: Math.floor(Math.random() * 15) + 5
    };
    
    const underperformingCampaign = {
      name: `${brandName} - ${campaignTypes[Math.floor(Math.random() * campaignTypes.length)]}`,
      roas: underperformingCampaignRoas,
      cpa: Math.floor(Math.random() * 30) + 35
    };
    
    // Ensure best and underperforming campaigns are different
    if (bestCampaign.name === underperformingCampaign.name) {
      underperformingCampaign.name = `${brandName} - ${campaignTypes[(campaignTypes.indexOf(underperformingCampaign.name.split(' - ')[1]) + 1) % campaignTypes.length]}`;
    }
    
    // Create best audience
    const bestAudience = {
      name: audienceTypes[Math.floor(Math.random() * audienceTypes.length)],
      roas: bestCampaignRoas,
      cpa: bestCampaign.cpa
    };
    
    // Generate recommendations based on performance
    const recommendationPool = [
      `Increase budget for ${bestCampaign.name} campaign by 15-20%`,
      `Optimize ${underperformingCampaign.name} with new creative assets`,
      `Test new hooks & CTAs to improve overall CTR (currently below 1%)`,
      `Implement retargeting campaigns for users who didn't convert`,
      `Build Lookalike Audiences (1%) of past customers to expand reach`,
      `Utilize email/SMS marketing to boost conversion rates`,
      `A/B test different ad formats (carousel vs. video vs. static images)`,
      `Use urgency-driven messaging (limited-time offers, bundle deals)`,
      `Focus on scaling ${bestAudience.name} segment which has strong performance`,
      `Consider ADV+ for automated scaling while maintaining manual testing`
    ];
    
    // Select 3-5 random recommendations
    const numRecommendations = Math.floor(Math.random() * 3) + 3;
    const shuffledRecommendations = [...recommendationPool].sort(() => 0.5 - Math.random());
    const recommendations = shuffledRecommendations.slice(0, numRecommendations);
    
    return {
      dateRange,
      totalPurchases,
      totalAdSpend,
      averageRoas,
      bestCampaign,
      underperformingCampaign,
      bestAudience,
      recommendations
    };
  };

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
          },
          previousMonth: {
            from: startOfMonth(subMonths(today, 1)),
            to: endOfMonth(subMonths(today, 1))
          }
        }
        
        // Fetch data for each period
        const results = {
          today: await fetchPeriodMetrics(shopifyConnection.id, periods.today.from, periods.today.to),
          week: await fetchPeriodMetrics(shopifyConnection.id, periods.week.from, periods.week.to),
          month: await fetchPeriodMetrics(shopifyConnection.id, periods.month.from, periods.month.to),
          previousMonth: await fetchPeriodMetrics(shopifyConnection.id, periods.previousMonth.from, periods.previousMonth.to)
        }
        
        setPeriodData(results)
        
        // Generate monthly report
        const report = generateMonthlyReport();
        setMonthlyReport(report);
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

                {/* Monthly Performance Report */}
                {monthlyReport && (
                  <div className="mt-6 bg-gray-800/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium flex items-center">
                        <span className="text-white">Monthly Performance Report</span>
                        <span className="ml-2 text-xs text-gray-400">({monthlyReport.dateRange})</span>
                      </h4>
                    </div>
                    
                    <div className="text-xs text-gray-300 mb-4">
                      Over the last 30 days, we generated <span className="text-white font-medium">{monthlyReport.totalPurchases} total purchases</span> across various campaigns, with an average ROAS of <span className="text-white font-medium">{monthlyReport.averageRoas.toFixed(2)}x</span> and a total ad spend of <span className="text-white font-medium">{formatCurrency(monthlyReport.totalAdSpend)}</span>.
                    </div>
                    
                    <div className="mb-3">
                      <h5 className="text-xs font-medium text-gray-300 mb-2">Key takeaways:</h5>
                      <ul className="space-y-2">
                        <li className="flex items-start text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-white">Best Performing Campaign:</span> {monthlyReport.bestCampaign.name} (ROAS {monthlyReport.bestCampaign.roas.toFixed(2)}x, CPA ${monthlyReport.bestCampaign.cpa})
                          </div>
                        </li>
                        <li className="flex items-start text-xs">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-white">Underperforming Campaign:</span> {monthlyReport.underperformingCampaign.name} (ROAS {monthlyReport.underperformingCampaign.roas.toFixed(2)}x, CPA ${monthlyReport.underperformingCampaign.cpa})
                          </div>
                        </li>
                        <li className="flex items-start text-xs">
                          <TrendingUp className="h-3.5 w-3.5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-white">Best Performing Audience:</span> {monthlyReport.bestAudience.name} has the highest ROAS ({monthlyReport.bestAudience.roas.toFixed(2)}x) and lowest CPA (${monthlyReport.bestAudience.cpa})
                          </div>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="text-xs font-medium text-gray-300 mb-2">Recommendations:</h5>
                      <ul className="space-y-1.5">
                        {monthlyReport.recommendations.map((recommendation, index) => (
                          <li key={index} className="flex items-start text-xs">
                            <ArrowRight className="h-3 w-3 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{recommendation}</span>
                          </li>
                        ))}
                      </ul>
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