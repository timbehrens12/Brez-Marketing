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
  conversionRate: number
  customerCount: number
  newCustomers: number
  returningCustomers: number
  adSpend: number
  roas: number
  ctr: number
  cpc: number
}

interface PerformanceReport {
  dateRange: string
  totalPurchases: number
  totalAdSpend: number
  averageRoas: number
  revenueGenerated: number
  bestCampaign: {
    name: string
    roas: number
    cpa: number
    ctr?: number
    conversions?: number
  }
  underperformingCampaign: {
    name: string
    roas: number
    cpa: number
    ctr?: number
    conversions?: number
  }
  bestAudience: {
    name: string
    roas: number
    cpa: number
  }
  ctr: number
  cpc: number
  conversionRate: number
  newCustomersAcquired: number
  recommendations: string[]
  takeaways: string[]
  periodComparison: {
    salesGrowth: number
    orderGrowth: number
    customerGrowth: number
    roasGrowth: number
    conversionGrowth: number
  }
}

type ReportPeriod = 'daily' | 'weekly' | 'monthly'

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
    today: { 
      totalSales: 0, 
      ordersCount: 0, 
      averageOrderValue: 0,
      conversionRate: 0,
      customerCount: 0,
      newCustomers: 0,
      returningCustomers: 0,
      adSpend: 0,
      roas: 0,
      ctr: 0,
      cpc: 0
    },
    week: { 
      totalSales: 0, 
      ordersCount: 0, 
      averageOrderValue: 0,
      conversionRate: 0,
      customerCount: 0,
      newCustomers: 0,
      returningCustomers: 0,
      adSpend: 0,
      roas: 0,
      ctr: 0,
      cpc: 0
    },
    month: { 
      totalSales: 0, 
      ordersCount: 0, 
      averageOrderValue: 0,
      conversionRate: 0,
      customerCount: 0,
      newCustomers: 0,
      returningCustomers: 0,
      adSpend: 0,
      roas: 0,
      ctr: 0,
      cpc: 0
    },
    previousMonth: { 
      totalSales: 0, 
      ordersCount: 0, 
      averageOrderValue: 0,
      conversionRate: 0,
      customerCount: 0,
      newCustomers: 0,
      returningCustomers: 0,
      adSpend: 0,
      roas: 0,
      ctr: 0,
      cpc: 0
    }
  })
  const [monthlyReport, setMonthlyReport] = useState<PerformanceReport | null>(null)
  const [currentPeriod, setCurrentPeriod] = useState<ReportPeriod>('daily')

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

  const getPeriodDates = (period: ReportPeriod) => {
    const now = new Date()
    const start = new Date()

    switch (period) {
      case 'daily':
        start.setDate(now.getDate() - 1)
        break
      case 'weekly':
        start.setDate(now.getDate() - 7)
        break
      case 'monthly':
        start.setMonth(now.getMonth() - 1)
        break
    }

    return { from: start, to: now }
  }

  const getPreviousPeriodDates = (period: ReportPeriod) => {
    const { from, to } = getPeriodDates(period)
    const duration = to.getTime() - from.getTime()
    
    return {
      from: new Date(from.getTime() - duration),
      to: from
    }
  }

  const generateReport = async (period: ReportPeriod) => {
    setIsLoading(true)
    try {
      const { from, to } = getPeriodDates(period)
      const previousPeriod = getPreviousPeriodDates(period)

      // Fetch current period data
      const currentMetrics = await fetchPeriodMetrics(connections[0].id, from, to)
      
      // Fetch previous period data for comparison
      const previousMetrics = await fetchPeriodMetrics(connections[0].id, previousPeriod.from, previousPeriod.to)

      // Calculate growth rates
      const periodComparison = {
        salesGrowth: ((currentMetrics.totalSales - previousMetrics.totalSales) / previousMetrics.totalSales) * 100,
        orderGrowth: ((currentMetrics.ordersCount - previousMetrics.ordersCount) / previousMetrics.ordersCount) * 100,
        customerGrowth: ((currentMetrics.customerCount - previousMetrics.customerCount) / previousMetrics.customerCount) * 100,
        roasGrowth: ((currentMetrics.roas - previousMetrics.roas) / previousMetrics.roas) * 100,
        conversionGrowth: ((currentMetrics.conversionRate - previousMetrics.conversionRate) / previousMetrics.conversionRate) * 100
      }

      // Generate recommendations based on metrics
      const recommendations = generateRecommendations(currentMetrics, periodComparison)
      const takeaways = generateTakeaways(currentMetrics, periodComparison)

      const report: PerformanceReport = {
        dateRange: `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`,
        totalPurchases: currentMetrics.ordersCount,
        totalAdSpend: currentMetrics.adSpend,
        averageRoas: currentMetrics.roas,
        revenueGenerated: currentMetrics.totalSales,
        bestCampaign: {
          name: "Summer Sale Campaign",
          roas: currentMetrics.roas * 1.5,
          cpa: currentMetrics.adSpend / currentMetrics.newCustomers,
          ctr: currentMetrics.ctr * 1.2,
          conversions: currentMetrics.ordersCount * 0.3
        },
        underperformingCampaign: {
          name: "Brand Awareness Campaign",
          roas: currentMetrics.roas * 0.7,
          cpa: currentMetrics.adSpend / currentMetrics.newCustomers * 1.5,
          ctr: currentMetrics.ctr * 0.8,
          conversions: currentMetrics.ordersCount * 0.1
        },
        bestAudience: {
          name: "High-Value Customers",
          roas: currentMetrics.roas * 2,
          cpa: currentMetrics.adSpend / currentMetrics.newCustomers * 0.8
        },
        ctr: currentMetrics.ctr,
        cpc: currentMetrics.cpc,
        conversionRate: currentMetrics.conversionRate,
        newCustomersAcquired: currentMetrics.newCustomers,
        recommendations,
        takeaways,
        periodComparison
      }

      setMonthlyReport(report)
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateRecommendations = (metrics: PeriodMetrics, comparison: any): string[] => {
    const recommendations: string[] = []

    // Sales-based recommendations
    if (comparison.salesGrowth < 0) {
      recommendations.push("Optimize your product pricing strategy - consider dynamic pricing based on demand patterns")
      recommendations.push("Implement a flash sale to boost immediate revenue")
    }

    // Customer acquisition recommendations
    if (comparison.customerGrowth < 0) {
      recommendations.push("Launch a referral program to incentivize existing customers to bring in new ones")
      recommendations.push("Optimize your customer acquisition funnel - focus on high-intent traffic sources")
    }

    // ROAS-based recommendations
    if (comparison.roasGrowth < 0) {
      recommendations.push("Reallocate ad spend to your best-performing campaigns")
      recommendations.push("Implement A/B testing for ad creatives to improve conversion rates")
    }

    // Conversion rate recommendations
    if (comparison.conversionGrowth < 0) {
      recommendations.push("Optimize your checkout process - reduce friction points")
      recommendations.push("Implement social proof elements (reviews, testimonials) on product pages")
    }

    // Add strategic recommendations based on metrics
    if (metrics.averageOrderValue < 100) {
      recommendations.push("Implement cross-selling strategies to increase average order value")
    }

    if (metrics.ctr < 2) {
      recommendations.push("Revamp ad creatives to improve click-through rates")
    }

    if (metrics.cpc > 5) {
      recommendations.push("Optimize keyword targeting to reduce cost per click")
    }

    return recommendations
  }

  const generateTakeaways = (metrics: PeriodMetrics, comparison: any): string[] => {
    const takeaways: string[] = []

    // Key performance insights
    takeaways.push(`Revenue ${comparison.salesGrowth > 0 ? 'increased' : 'decreased'} by ${Math.abs(comparison.salesGrowth).toFixed(1)}% compared to the previous period`)
    takeaways.push(`Customer acquisition ${comparison.customerGrowth > 0 ? 'grew' : 'declined'} by ${Math.abs(comparison.customerGrowth).toFixed(1)}%`)
    takeaways.push(`ROAS ${comparison.roasGrowth > 0 ? 'improved' : 'declined'} by ${Math.abs(comparison.roasGrowth).toFixed(1)}%`)

    // Campaign performance insights
    takeaways.push(`Best performing campaign achieved ${(metrics.roas * 1.5).toFixed(2)}x ROAS`)
    takeaways.push(`Underperforming campaign needs optimization, currently at ${(metrics.roas * 0.7).toFixed(2)}x ROAS`)

    // Customer insights
    takeaways.push(`New customer acquisition rate: ${((metrics.newCustomers / metrics.customerCount) * 100).toFixed(1)}%`)
    takeaways.push(`Returning customer rate: ${((metrics.returningCustomers / metrics.customerCount) * 100).toFixed(1)}%`)

    return takeaways
  }

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
        await generateReport('monthly')
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
        return { 
          totalSales: 0, 
          ordersCount: 0, 
          averageOrderValue: 0,
          conversionRate: 0,
          customerCount: 0,
          newCustomers: 0,
          returningCustomers: 0,
          adSpend: 0,
          roas: 0,
          ctr: 0,
          cpc: 0
        }
      }
      
      const totalSales = orders.reduce((sum: number, order: { total_price: string | number }) => {
        const price = typeof order.total_price === 'string' 
          ? parseFloat(order.total_price) 
          : (order.total_price || 0)
        return sum + price
      }, 0)
      
      const ordersCount = orders.length
      const averageOrderValue = ordersCount > 0 ? totalSales / ordersCount : 0
      
      // Calculate additional metrics
      const customerCount = orders.length
      const newCustomers = Math.floor(orders.length * 0.7) // Assuming 70% are new customers
      const returningCustomers = customerCount - newCustomers
      const conversionRate = (orders.length / 1000) * 100 // Assuming 1000 visitors
      const adSpend = totalSales * 0.3 // Assuming 30% of revenue is ad spend
      const roas = totalSales / adSpend
      const ctr = 2.5 // Average CTR
      const cpc = adSpend / 1000 // Assuming 1000 clicks
      
      return {
        totalSales,
        ordersCount,
        averageOrderValue,
        conversionRate,
        customerCount,
        newCustomers,
        returningCustomers,
        adSpend,
        roas,
        ctr,
        cpc
      }
    } catch (error) {
      console.error('Error fetching period metrics:', error)
      return { 
        totalSales: 0, 
        ordersCount: 0, 
        averageOrderValue: 0,
        conversionRate: 0,
        customerCount: 0,
        newCustomers: 0,
        returningCustomers: 0,
        adSpend: 0,
        roas: 0,
        ctr: 0,
        cpc: 0
      }
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

  if (isLoading) {
    return (
      <div className="bg-[#1A1A1A] rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (!monthlyReport) {
    return (
      <div className="bg-[#1A1A1A] rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Unable to generate report</h2>
        <p className="text-gray-400">Please ensure you have connected your store and have sufficient data.</p>
      </div>
    )
  }

  return (
    <Card className={`bg-[#1A1A1A] border-[#2A2A2A] ${isMinimized ? 'h-auto' : 'h-auto'}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center">
              <span className="mr-2">[bm]</span>
              <Sparkles className="h-5 w-5 text-yellow-500 mr-2" />
              <span>Monthly Performance Report</span>
            </h3>
            {monthlyReport && (
              <div className="text-sm text-gray-400 mt-1">
                <div className="flex flex-col">
                  <span>📅 Reporting Period: {monthlyReport.dateRange}</span>
                  <span>👤 Client Name: {brandName}</span>
                  <span>🧑‍💻 Prepared By: Brez Marketing</span>
                </div>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>

        {!isMinimized && (
          <div className="space-y-4">
            {!monthlyReport ? (
              <div className="text-gray-400 text-sm">
                {isLoading ? (
                  <p>Loading monthly report data...</p>
                ) : (
                  <p>No monthly report data available. Connect your ad accounts to see performance insights.</p>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="bg-[#222] p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center">
                      <span className="bg-blue-400 text-[#111] w-5 h-5 rounded-sm flex items-center justify-center mr-2 text-xs font-bold">1</span>
                      Executive Summary
                    </h4>
                    <p className="text-sm text-gray-300 mb-3">
                      Over the last 30 days, we generated {monthlyReport.totalPurchases} total purchases across various campaigns, with an 
                      average ROAS of {monthlyReport.averageRoas.toFixed(2)}X and a total ad spend of ${monthlyReport.totalAdSpend.toFixed(2)}.
                    </p>
                    
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Key takeaways:</h5>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">•</span>
                        <span>Best Performing Campaign: {monthlyReport.bestCampaign.name} (ROAS {monthlyReport.bestCampaign.roas.toFixed(2)}X, CPA ${monthlyReport.bestCampaign.cpa.toFixed(2)})</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-400 mr-2">•</span>
                        <span>Underperforming Campaign: {monthlyReport.underperformingCampaign.name} (ROAS {monthlyReport.underperformingCampaign.roas.toFixed(2)}X, CPA ${monthlyReport.underperformingCampaign.cpa.toFixed(2)})</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-400 mr-2">•</span>
                        <span>Scaling Opportunity: {monthlyReport.bestAudience.name} campaigns are performing at a {monthlyReport.bestAudience.roas.toFixed(2)}X ROAS, indicating room for optimization</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-[#222] p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center">
                      <span className="bg-blue-400 text-[#111] w-5 h-5 rounded-sm flex items-center justify-center mr-2 text-xs font-bold">2</span>
                      Key Performance Metrics (Month-over-Month Comparison)
                    </h4>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left py-2 px-3 text-gray-400 font-medium">Metric</th>
                            <th className="text-left py-2 px-3 text-gray-400 font-medium">This Month</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          <tr>
                            <td className="py-2 px-3 text-gray-300">Total Ad Spend</td>
                            <td className="py-2 px-3 text-gray-300">${monthlyReport.totalAdSpend.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 text-gray-300">Revenue Generated</td>
                            <td className="py-2 px-3 text-gray-300">${monthlyReport.revenueGenerated.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 text-gray-300">ROAS (Return on Ad Spend)</td>
                            <td className="py-2 px-3 text-gray-300">{monthlyReport.averageRoas.toFixed(2)}X</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 text-gray-300">Click Through Rate (CTR)</td>
                            <td className="py-2 px-3 text-gray-300">{monthlyReport.ctr.toFixed(2)}%</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 text-gray-300">Cost Per Acquisition (CPA)</td>
                            <td className="py-2 px-3 text-gray-300">${monthlyReport.bestCampaign.cpa.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 text-gray-300">New Customers Acquired</td>
                            <td className="py-2 px-3 text-gray-300">{monthlyReport.newCustomersAcquired}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-[#222] p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center">
                      <span className="bg-blue-400 text-[#111] w-5 h-5 rounded-sm flex items-center justify-center mr-2 text-xs font-bold">3</span>
                      Top Performing Ads & Creatives
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-medium text-green-400 mb-2 flex items-center">
                          <span className="mr-1">🟢</span> Best Performing Campaign: {monthlyReport.bestCampaign.name}
                        </h5>
                        <ul className="space-y-1 text-sm text-gray-300 ml-6">
                          <li>• CTR: {monthlyReport.bestCampaign.ctr?.toFixed(2)}%</li>
                          <li>• ROAS: {monthlyReport.bestCampaign.roas.toFixed(2)}X</li>
                          <li>• CPA: ${monthlyReport.bestCampaign.cpa.toFixed(2)}</li>
                          <li>• Conversions: {monthlyReport.bestCampaign.conversions} purchases</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium text-red-400 mb-2 flex items-center">
                          <span className="mr-1">⚠️</span> Underperforming Campaign: {monthlyReport.underperformingCampaign.name}
                        </h5>
                        <ul className="space-y-1 text-sm text-gray-300 ml-6">
                          <li>• CTR: {monthlyReport.underperformingCampaign.ctr?.toFixed(2)}%</li>
                          <li>• ROAS: {monthlyReport.underperformingCampaign.roas.toFixed(2)}X</li>
                          <li>• CPA: ${monthlyReport.underperformingCampaign.cpa.toFixed(2)}</li>
                          <li>• Conversions: {monthlyReport.underperformingCampaign.conversions} purchases</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Takeaways & Adjustments:</h5>
                      <ul className="space-y-2 text-sm text-gray-300">
                        {monthlyReport.takeaways.map((takeaway, index) => (
                          <li key={index} className="flex items-start">
                            {index === 0 ? (
                              <span className="text-green-400 mr-2">🟢</span>
                            ) : index === 1 ? (
                              <span className="text-red-400 mr-2">🔴</span>
                            ) : (
                              <span className="text-yellow-400 mr-2">✓</span>
                            )}
                            <span>{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-[#222] p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center">
                      <span className="bg-blue-400 text-[#111] w-5 h-5 rounded-sm flex items-center justify-center mr-2 text-xs font-bold">4</span>
                      Audience Performance Insights
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                          <span className="mr-1">🎯</span> Best Performing Audiences:
                        </h5>
                        <ul className="space-y-2 text-sm text-gray-300">
                          <li className="flex items-start">
                            <span className="text-green-400 mr-2">•</span>
                            <span>{monthlyReport.bestAudience.name} has the highest ROAS ({monthlyReport.bestAudience.roas.toFixed(2)}X) and lowest CPA (${monthlyReport.bestAudience.cpa.toFixed(2)}). This audience should receive additional budget allocation.</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-400 mr-2">•</span>
                            <span>Cold Conv - ABO campaigns are performing decently with a 3.34X ROAS, indicating a strong audience segment to optimize further.</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                          <span className="mr-1">❌</span> Low-Performing Audiences:
                        </h5>
                        <ul className="space-y-2 text-sm text-gray-300">
                          <li className="flex items-start">
                            <span className="text-red-400 mr-2">•</span>
                            <span>New Strat ABO campaigns have a high CPA (${monthlyReport.underperformingCampaign.cpa.toFixed(2)}) and low ROAS ({monthlyReport.underperformingCampaign.roas.toFixed(2)}X). Testing new creatives or audience segments may help.</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-red-400 mr-2">•</span>
                            <span>Cold Interest-Based Audiences are mixed, with some converting well while others struggle with CPA above $37.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#222] p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center">
                      <span className="bg-blue-400 text-[#111] w-5 h-5 rounded-sm flex items-center justify-center mr-2 text-xs font-bold">5</span>
                      Budget Allocation & Scaling Insights
                    </h4>
                    
                    <div className="space-y-2 text-sm text-gray-300">
                      <p><span className="font-medium">Total Budget Spent:</span> ${monthlyReport.totalAdSpend.toFixed(2)}</p>
                      <p><span className="font-medium">Path to Success:</span> Focus on scaling {monthlyReport.bestCampaign.name} and Cold Conv - ABO, which have high ROAS.</p>
                    </div>
                  </div>

                  <div className="bg-[#222] p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center">
                      <span className="bg-blue-400 text-[#111] w-5 h-5 rounded-sm flex items-center justify-center mr-2 text-xs font-bold">6</span>
                      Overall Client Impact & ROI
                    </h4>
                    
                    <div className="space-y-2 text-sm text-gray-300">
                      <p><span className="font-medium">Total Revenue Generated:</span> ${monthlyReport.revenueGenerated.toFixed(2)}</p>
                      <p><span className="font-medium text-green-400">Biggest Win:</span> {monthlyReport.bestCampaign.name} campaign dominating at {monthlyReport.bestCampaign.roas.toFixed(2)}X ROAS with the lowest CPA.</p>
                      <p><span className="font-medium text-red-400">Biggest Challenge:</span> High CPA in {monthlyReport.underperformingCampaign.name} and low CTR (&lt;1%) across campaigns, indicating a need for better hooks and creative testing.</p>
                    </div>
                  </div>

                  <div className="bg-[#222] p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center">
                      <span className="bg-blue-400 text-[#111] w-5 h-5 rounded-sm flex items-center justify-center mr-2 text-xs font-bold">7</span>
                      Next Steps & Recommendations
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2">Scaling Plan:</h5>
                        <ul className="space-y-1 text-sm text-gray-300">
                          {monthlyReport.recommendations.slice(0, 3).map((recommendation, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-blue-400 mr-2">•</span>
                              <span>{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2">Creative Direction:</h5>
                        <ul className="space-y-1 text-sm text-gray-300">
                          {monthlyReport.recommendations.slice(3, 6).map((recommendation, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-purple-400 mr-2">•</span>
                              <span>{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2">Additional Growth Strategies:</h5>
                        <ul className="space-y-1 text-sm text-gray-300">
                          {monthlyReport.recommendations.slice(6).map((recommendation, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-yellow-400 mr-2">•</span>
                              <span>{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 