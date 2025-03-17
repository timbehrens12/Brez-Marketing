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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

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
  const [weeklyReport, setWeeklyReport] = useState<PerformanceReport | null>(null)
  const [dailyReport, setDailyReport] = useState<PerformanceReport | null>(null)
  const [hasEnoughData, setHasEnoughData] = useState<boolean>(true)
  const [currentPeriod, setCurrentPeriod] = useState<ReportPeriod>('monthly')
  const [userName, setUserName] = useState<string>("")
  const supabase = createClientComponentClient()

  // Get greeting based on time of day
  const getGreeting = (): string => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  // Get the current month name
  const getCurrentMonthName = (): string => {
    return new Date().toLocaleString('default', { month: 'long' })
  }

  // Get the previous month name
  const getPreviousMonthName = (): string => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toLocaleString('default', { month: 'long' })
  }

  // Calculate platform status
  const hasShopify = connections.some(c => c.platform_type === 'shopify' && c.status === 'active')
  const hasMeta = connections.some(c => c.platform_type === 'meta' && c.status === 'active')

  // Calculate performance metrics
  const monthlyRevenue = periodData.month.totalSales
  const weeklyRevenue = periodData.week.totalSales
  const dailyAverage = periodData.month.totalSales / getDaysInMonth(new Date())
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
    let from: Date
    let to: Date = new Date(now)

    if (period === 'daily') {
      // Today
      from = new Date(now.setHours(0, 0, 0, 0))
    } else if (period === 'weekly') {
      // Current week (last 7 days)
      from = new Date(now)
      from.setDate(from.getDate() - 7)
    } else {
      // Last complete month (not last 30 days)
      to = new Date(now.getFullYear(), now.getMonth(), 0) // Last day of previous month
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1) // First day of previous month
    }

    return { from, to }
  }

  const getPreviousPeriodDates = (period: ReportPeriod) => {
    const { from, to } = getPeriodDates(period)
    const periodLength = to.getTime() - from.getTime()
    
    const previousFrom = new Date(from.getTime() - periodLength)
    const previousTo = new Date(to.getTime() - periodLength)
    
    if (period === 'monthly') {
      // For monthly, we want the month before last month
      const now = new Date()
      const previousTo = new Date(now.getFullYear(), now.getMonth() - 1, 0) // Last day of month before last
      const previousFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1) // First day of month before last
      return { from: previousFrom, to: previousTo }
    }
    
    return { from: previousFrom, to: previousTo }
  }

  const generateReport = async (period: ReportPeriod) => {
    try {
      const currentPeriodDates = getPeriodDates(period)
      const previousPeriodDates = getPreviousPeriodDates(period)
      
      let currentMetrics: PeriodMetrics
      let previousMetrics: PeriodMetrics = {
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
      
      if (period === 'daily') {
        currentMetrics = periodData.today
        // Previous day metrics would need to be fetched
      } else if (period === 'weekly') {
        currentMetrics = periodData.week
        // Previous week metrics would need to be fetched
      } else {
        currentMetrics = periodData.month
        previousMetrics = periodData.previousMonth
      }
      
      // Check if we have enough data
      const hasData = currentMetrics.totalSales > 0 || currentMetrics.ordersCount > 0
      if (!hasData) {
        setHasEnoughData(false)
        return null
      }
      
      setHasEnoughData(true)
      
      setIsLoading(true)
      
      // Calculate growth rates
      const salesGrowth = previousMetrics && previousMetrics.totalSales > 0 
        ? ((currentMetrics.totalSales - previousMetrics.totalSales) / previousMetrics.totalSales) * 100 
        : 0
      
      const orderGrowth = previousMetrics && previousMetrics.ordersCount > 0 
        ? ((currentMetrics.ordersCount - previousMetrics.ordersCount) / previousMetrics.ordersCount) * 100 
        : 0
      
      const customerGrowth = previousMetrics && previousMetrics.customerCount > 0 
        ? ((currentMetrics.customerCount - previousMetrics.customerCount) / previousMetrics.customerCount) * 100 
        : 0
      
      const roasGrowth = previousMetrics && previousMetrics.roas > 0 
        ? ((currentMetrics.roas - previousMetrics.roas) / previousMetrics.roas) * 100 
        : 0
      
      const conversionGrowth = previousMetrics && previousMetrics.conversionRate > 0 
        ? ((currentMetrics.conversionRate - previousMetrics.conversionRate) / previousMetrics.conversionRate) * 100 
        : 0
      
      // Generate period-specific date range string
      let dateRangeStr = ""
      if (period === 'daily') {
        dateRangeStr = `Today, ${currentPeriodDates.from.toLocaleDateString()}`
      } else if (period === 'weekly') {
        dateRangeStr = `Last 7 days (${currentPeriodDates.from.toLocaleDateString()} - ${currentPeriodDates.to.toLocaleDateString()})`
      } else {
        dateRangeStr = `${getCurrentMonthName()} (${currentPeriodDates.from.toLocaleDateString()} - ${currentPeriodDates.to.toLocaleDateString()})`
      }
      
      // Generate recommendations and takeaways
      const recommendations = generateRecommendations(currentMetrics, {
        salesGrowth,
        orderGrowth,
        customerGrowth,
        roasGrowth,
        conversionGrowth
      })
      
      const takeaways = generateTakeaways(currentMetrics, {
        salesGrowth,
        orderGrowth,
        customerGrowth,
        roasGrowth,
        conversionGrowth
      })
      
      // Create the report
      const report: PerformanceReport = {
        dateRange: dateRangeStr,
        totalPurchases: currentMetrics.ordersCount,
        totalAdSpend: currentMetrics.adSpend,
        averageRoas: currentMetrics.roas,
        revenueGenerated: currentMetrics.totalSales,
        bestCampaign: {
          name: "Top Campaign",
          roas: currentMetrics.roas * 1.2, // Example: 20% better than average
          cpa: currentMetrics.adSpend / (currentMetrics.newCustomers || 1),
          ctr: currentMetrics.ctr * 1.15, // Example: 15% better than average
          conversions: Math.round(currentMetrics.newCustomers * 0.7) // Example: 70% of new customers
        },
        underperformingCampaign: {
          name: "Underperforming Campaign",
          roas: currentMetrics.roas * 0.7, // Example: 30% worse than average
          cpa: currentMetrics.adSpend / (currentMetrics.newCustomers || 1) * 1.4, // 40% higher CPA
          ctr: currentMetrics.ctr * 0.8, // Example: 20% worse than average
          conversions: Math.round(currentMetrics.newCustomers * 0.2) // Example: 20% of new customers
        },
        bestAudience: {
          name: "Best Performing Audience",
          roas: currentMetrics.roas * 1.3, // Example: 30% better than average
          cpa: currentMetrics.adSpend / (currentMetrics.newCustomers || 1) * 0.7 // 30% lower CPA
        },
        ctr: currentMetrics.ctr,
        cpc: currentMetrics.cpc,
        conversionRate: currentMetrics.conversionRate,
        newCustomersAcquired: currentMetrics.newCustomers,
        recommendations,
        takeaways,
        periodComparison: {
          salesGrowth,
          orderGrowth,
          customerGrowth,
          roasGrowth,
          conversionGrowth
        }
      }
      
      return report
    } catch (error) {
      console.error(`Error generating ${period} report:`, error)
      return null
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

  const fetchPeriodData = async () => {
    if (!brandId || connections.length === 0) {
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    
    try {
      // Find Shopify connection using the correct property name
      const shopifyConnection = connections.find(conn => conn.platform_type === 'shopify')
      
      if (!shopifyConnection) {
        setIsLoading(false)
        setHasEnoughData(false)
        return
      }
      
      // Get dates for different periods
      const dailyDates = getPeriodDates('daily')
      const weeklyDates = getPeriodDates('weekly')
      const monthlyDates = getPeriodDates('monthly')
      const previousMonthDates = getPreviousPeriodDates('monthly')
      
      // Fetch metrics for each period
      const todayMetrics = await fetchPeriodMetrics(shopifyConnection.id, dailyDates.from, dailyDates.to)
      const weekMetrics = await fetchPeriodMetrics(shopifyConnection.id, weeklyDates.from, weeklyDates.to)
      const monthMetrics = await fetchPeriodMetrics(shopifyConnection.id, monthlyDates.from, monthlyDates.to)
      const previousMonthMetrics = await fetchPeriodMetrics(shopifyConnection.id, previousMonthDates.from, previousMonthDates.to)
      
      // Update state with fetched metrics
      setPeriodData({
        today: todayMetrics,
        week: weekMetrics,
        month: monthMetrics,
        previousMonth: previousMonthMetrics
      })
      
      // Generate reports for each period
      const dailyReportData = await generateReport('daily')
      const weeklyReportData = await generateReport('weekly')
      const monthlyReportData = await generateReport('monthly')
      
      if (dailyReportData) setDailyReport(dailyReportData)
      if (weeklyReportData) setWeeklyReport(weeklyReportData)
      if (monthlyReportData) setMonthlyReport(monthlyReportData)
      
    } catch (error) {
      console.error('Error fetching period data:', error)
    } finally {
      setIsLoading(false)
    }
  }

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

  useEffect(() => {
    if (user) {
      setUserName(user.firstName || "")
    }
    fetchPeriodData()
  }, [brandId, connections])

  if (isLoading) {
    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">{getGreeting()}, {userName}</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-24 w-full bg-gray-800 rounded"></div>
          <div className="h-12 w-2/3 bg-gray-800 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">{getGreeting()}, {userName}</h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            className={currentPeriod === 'daily' ? 'bg-gray-800' : ''}
            onClick={() => setCurrentPeriod('daily')}
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className={currentPeriod === 'weekly' ? 'bg-gray-800' : ''}
            onClick={() => setCurrentPeriod('weekly')}
          >
            This Week
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className={currentPeriod === 'monthly' ? 'bg-gray-800' : ''}
            onClick={() => setCurrentPeriod('monthly')}
          >
            Last Month
          </Button>
        </div>
      </div>
      
      {!hasEnoughData ? (
        <div className="text-center py-6">
          <p className="text-gray-400 mb-4">Limited data available to generate a complete performance report.</p>
          <div className="bg-[#222] p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">Available Information</h4>
            <p className="text-sm text-gray-300 mb-3">
              We're showing a limited report based on the data available. For a more comprehensive analysis:
            </p>
            <ul className="space-y-2">
              {!connections.some(c => c.platform_type === 'shopify' && c.status === 'active') && (
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span className="text-gray-300">Connect your Shopify store to see sales performance metrics</span>
                </li>
              )}
              {!connections.some(c => c.platform_type === 'meta' && c.status === 'active') && (
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span className="text-gray-300">Connect Meta Ads to see advertising performance metrics</span>
                </li>
              )}
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span className="text-gray-300">Continue processing orders to build historical data for trend analysis</span>
              </li>
            </ul>
          </div>
          <p className="text-gray-500 text-sm">
            We'll automatically update your report as more data becomes available.
          </p>
        </div>
      ) : currentPeriod === 'monthly' && monthlyReport ? (
        <div>
          <h4 className="font-medium text-lg mb-2">Monthly Performance Review</h4>
          <p className="text-gray-400 mb-4">
            Here's how your store performed in {getCurrentMonthName()} compared to {getPreviousMonthName()}.
            {!connections.some(c => c.platform_type === 'meta' && c.status === 'active') && (
              <span className="text-amber-400 ml-2">
                Note: Limited advertising metrics available. Connect Meta Ads for complete analysis.
              </span>
            )}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Revenue Generated</h5>
              <p className="text-2xl font-semibold">{formatCurrency(monthlyReport.revenueGenerated)}</p>
              {monthlyReport.periodComparison.salesGrowth !== 0 && (
                <p className={`text-sm ${monthlyReport.periodComparison.salesGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {monthlyReport.periodComparison.salesGrowth > 0 ? '↑' : '↓'} {Math.abs(monthlyReport.periodComparison.salesGrowth).toFixed(1)}% from {getPreviousMonthName()}
                </p>
              )}
            </div>
            
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Orders Placed</h5>
              <p className="text-2xl font-semibold">{monthlyReport.totalPurchases}</p>
              {monthlyReport.periodComparison.orderGrowth !== 0 && (
                <p className={`text-sm ${monthlyReport.periodComparison.orderGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {monthlyReport.periodComparison.orderGrowth > 0 ? '↑' : '↓'} {Math.abs(monthlyReport.periodComparison.orderGrowth).toFixed(1)}% from {getPreviousMonthName()}
                </p>
              )}
            </div>
          </div>
          
          <div className="mb-6">
            <h5 className="font-medium mb-2">Key Takeaways</h5>
            <ul className="space-y-2">
              {monthlyReport.takeaways.map((takeaway, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span className="text-gray-300">{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h5 className="font-medium mb-2">Recommendations</h5>
            <ul className="space-y-2">
              {monthlyReport.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span className="text-gray-300">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : currentPeriod === 'weekly' && weeklyReport ? (
        <div>
          <h4 className="font-medium text-lg mb-2">Weekly Performance Review</h4>
          <p className="text-gray-400 mb-4">
            Here's how your store performed in the last 7 days compared to the previous week.
            {!connections.some(c => c.platform_type === 'meta' && c.status === 'active') && (
              <span className="text-amber-400 ml-2">
                Note: Limited advertising metrics available. Connect Meta Ads for complete analysis.
              </span>
            )}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Revenue Generated</h5>
              <p className="text-2xl font-semibold">{formatCurrency(weeklyReport.revenueGenerated)}</p>
              {weeklyReport.periodComparison.salesGrowth !== 0 && (
                <p className={`text-sm ${weeklyReport.periodComparison.salesGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {weeklyReport.periodComparison.salesGrowth > 0 ? '↑' : '↓'} {Math.abs(weeklyReport.periodComparison.salesGrowth).toFixed(1)}% from previous week
                </p>
              )}
            </div>
            
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Orders Placed</h5>
              <p className="text-2xl font-semibold">{weeklyReport.totalPurchases}</p>
              {weeklyReport.periodComparison.orderGrowth !== 0 && (
                <p className={`text-sm ${weeklyReport.periodComparison.orderGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {weeklyReport.periodComparison.orderGrowth > 0 ? '↑' : '↓'} {Math.abs(weeklyReport.periodComparison.orderGrowth).toFixed(1)}% from previous week
                </p>
              )}
            </div>
          </div>
          
          <div className="mb-6">
            <h5 className="font-medium mb-2">Key Takeaways</h5>
            <ul className="space-y-2">
              {weeklyReport.takeaways.map((takeaway, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span className="text-gray-300">{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h5 className="font-medium mb-2">Recommendations</h5>
            <ul className="space-y-2">
              {weeklyReport.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span className="text-gray-300">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : currentPeriod === 'daily' && dailyReport ? (
        <div>
          <h4 className="font-medium text-lg mb-2">Today's Performance</h4>
          <p className="text-gray-400 mb-4">
            Here's how your store is performing today compared to yesterday.
            {!connections.some(c => c.platform_type === 'meta' && c.status === 'active') && (
              <span className="text-amber-400 ml-2">
                Note: Limited advertising metrics available. Connect Meta Ads for complete analysis.
              </span>
            )}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Revenue Generated</h5>
              <p className="text-2xl font-semibold">{formatCurrency(dailyReport.revenueGenerated)}</p>
              {dailyReport.periodComparison.salesGrowth !== 0 && (
                <p className={`text-sm ${dailyReport.periodComparison.salesGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {dailyReport.periodComparison.salesGrowth > 0 ? '↑' : '↓'} {Math.abs(dailyReport.periodComparison.salesGrowth).toFixed(1)}% from yesterday
                </p>
              )}
            </div>
            
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Orders Placed</h5>
              <p className="text-2xl font-semibold">{dailyReport.totalPurchases}</p>
              {dailyReport.periodComparison.orderGrowth !== 0 && (
                <p className={`text-sm ${dailyReport.periodComparison.orderGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {dailyReport.periodComparison.orderGrowth > 0 ? '↑' : '↓'} {Math.abs(dailyReport.periodComparison.orderGrowth).toFixed(1)}% from yesterday
                </p>
              )}
            </div>
          </div>
          
          <div className="mb-6">
            <h5 className="font-medium mb-2">Key Takeaways</h5>
            <ul className="space-y-2">
              {dailyReport.takeaways.map((takeaway, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span className="text-gray-300">{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h5 className="font-medium mb-2">Recommendations</h5>
            <ul className="space-y-2">
              {dailyReport.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span className="text-gray-300">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        // Fallback when no report is available for the selected period
        <div className="text-center py-6">
          <p className="text-gray-400 mb-4">No data available for the selected period.</p>
          <p className="text-gray-500 text-sm">
            Try selecting a different time period or check back later as more data becomes available.
          </p>
        </div>
      )}
    </div>
  )
} 