"use client"

import React, { useState, useEffect } from 'react'
import { useUser } from "@clerk/nextjs"
import { Sparkles, ChevronUp, ChevronDown, ArrowRight, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { format, subDays, subMonths, startOfMonth, endOfMonth, getDaysInMonth } from "date-fns"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Define types locally
type ReportPeriod = 'daily' | 'monthly'

// Local type definitions
interface Metrics {
  totalSales: number
  conversionRate: number
  averagePurchaseValue: number
  roas: number
  adSpend: number
}

interface PlatformConnection {
  id: string
  platform_type: string
  status: string
}

// Define minimal interfaces for the components we need
interface AlertBoxProps {
  title?: string
  type?: 'info' | 'warning' | 'success' | 'error'
  icon?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function AlertBox({ title, type = 'info', icon, className, children }: AlertBoxProps) {
  return (
    <div className={`rounded-md p-3 bg-blue-950/30 border border-blue-900/50 ${className}`}>
      <div className="flex items-start">
        {icon && <div className="mr-3 mt-0.5">{icon}</div>}
        <div>
          {title && <div className="font-medium text-sm mb-1">{title}</div>}
          <div>{children}</div>
        </div>
      </div>
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-1/3 bg-gray-800 rounded mb-4"></div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 h-24 rounded-lg"></div>
        ))}
      </div>
      <div className="h-32 bg-gray-800 rounded-lg mb-6"></div>
    </div>
  )
}

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
  bestSellingProducts?: Array<{
    name: string
    revenue: number
    orders: number
  }>
  historicalData?: Array<{
    name: string
    revenue: number
    orders: number
    adSpend: number
    roas: number
  }>
  aiAnalysis?: string
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
  const [isMinimized, setIsMinimized] = useState(true)
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
    return format(subMonths(new Date(), 1), 'MMMM');
  }

  // Get month before previous month name
  const getTwoMonthsAgoName = (): string => {
    return format(subMonths(new Date(), 2), 'MMMM');
  }

  // Get three months ago name
  const getThreeMonthsAgoName = (): string => {
    return format(subMonths(new Date(), 3), 'MMMM');
  }

  // Calculate platform status
  const hasShopify = connections.some(c => c.platform_type === 'shopify' && c.status === 'active')
  const hasMeta = connections.some(c => c.platform_type === 'meta' && c.status === 'active')

  // Calculate performance metrics
  const monthlyRevenue = periodData.month.totalSales
  const dailyAverage = periodData.month.totalSales / getDaysInMonth(new Date())
  const revenueGrowth = ((periodData.today.totalSales * 30 - monthlyRevenue) / monthlyRevenue) * 100
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
  
  // Function to fetch metrics for a specific period - SIMULATION VERSION
  const fetchPeriodMetrics = async (connectionId: string, from: Date, to: Date): Promise<PeriodMetrics> => {
    // SIMULATION CODE: Instead of actually fetching from supabase, we'll return simulated data
    // This is just for testing the UI layout
    
    // Simulate a small delay to mimic API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Generate random but realistic looking data based on the period
    const daysDifference = Math.max(1, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
    const isPreviousMonth = from.getMonth() !== new Date().getMonth();
    
    // Base values that will be adjusted based on the period
    const baseOrdersPerDay = 12;
    const baseAvgOrderValue = 68;
    const baseTotalSales = baseOrdersPerDay * baseAvgOrderValue * daysDifference;
    
    // Adjust for previous periods (slightly lower numbers to show growth)
    const adjustmentFactor = isPreviousMonth ? 0.85 : 1;
    
    // Generate realistic looking metrics
    const ordersCount = Math.floor(baseOrdersPerDay * daysDifference * adjustmentFactor * (0.9 + Math.random() * 0.2));
    const averageOrderValue = baseAvgOrderValue * adjustmentFactor * (0.95 + Math.random() * 0.1);
    const totalSales = ordersCount * averageOrderValue;
    
    const customerCount = ordersCount;
    const newCustomers = Math.floor(customerCount * 0.65); // 65% are new customers
    const returningCustomers = customerCount - newCustomers;
    
    const conversionRate = 2.7 * adjustmentFactor * (0.9 + Math.random() * 0.2); // Average 2.7%
    const adSpend = totalSales * 0.28; // 28% of revenue goes to ad spend
    const impressions = Math.floor(ordersCount * 100); // 100 impressions per order
    const clicks = Math.floor(impressions * 0.03); // 3% CTR
    
    const ctr = (clicks / impressions) * 100;
    const cpc = adSpend / clicks;
    const roas = totalSales / adSpend;
    
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
    };
  };

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
      const monthlyDates = getPeriodDates('monthly')
      const previousMonthDates = getPreviousPeriodDates('monthly')
      
      // Fetch metrics for each period
      const todayMetrics = await fetchPeriodMetrics(shopifyConnection.id, dailyDates.from, dailyDates.to)
      const monthMetrics = await fetchPeriodMetrics(shopifyConnection.id, monthlyDates.from, monthlyDates.to)
      const previousMonthMetrics = await fetchPeriodMetrics(shopifyConnection.id, previousMonthDates.from, previousMonthDates.to)
      
      // Update state with fetched metrics
      setPeriodData({
        today: todayMetrics,
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
        month: monthMetrics,
        previousMonth: previousMonthMetrics
      })
      
      // Generate reports for each period
      const dailyReportData = await generateReport('daily')
      const monthlyReportData = await generateReport('monthly')
      
      if (dailyReportData) setDailyReport(dailyReportData)
      if (monthlyReportData) setMonthlyReport(monthlyReportData)
      
      setHasEnoughData(true) // We have simulated data now
      
    } catch (error) {
      console.error('Error fetching period data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate recommendations for the simulated data
  const generateRecommendations = (metrics: PeriodMetrics, comparison: any): string[] => {
    // SIMULATION: Return a mix of realistic recommendations for demo purposes
    return [
      "Increase budget allocation for your 'Summer Collection' campaign which has a ROAS of 3.2",
      "Pause underperforming Google Search ads with CPC above $4.50",
      "Optimize Meta ad creatives to improve current CTR (2.3%)",
      "Target lookalike audiences based on your high-value customer segment",
      "Implement cross-selling strategies on product pages to increase AOV",
      "Schedule email campaigns to target customers who haven't purchased in 30+ days",
      "Create dedicated landing pages for Google Ad campaigns to improve quality score",
      "Re-engage shopping cart abandoners with Meta retargeting ads"
    ];
  };

  // Generate takeaways for the simulated data
  const generateTakeaways = (metrics: PeriodMetrics, comparison: any): string[] => {
    // SIMULATION: Return a mix of realistic takeaways for demo purposes, including both positive and negative insights
    return [
      `Revenue ${comparison.salesGrowth > 0 ? 'increased' : 'decreased'} by ${Math.abs(comparison.salesGrowth).toFixed(1)}% compared to the previous period`,
      `Meta ads are outperforming Google ads with a 2.8x vs 1.9x ROAS`,
      `Mobile conversion rate (${(metrics.conversionRate * 0.8).toFixed(1)}%) lags behind desktop (${(metrics.conversionRate * 1.2).toFixed(1)}%) and needs optimization`,
      `New customer acquisition cost is $${(metrics.adSpend / metrics.newCustomers).toFixed(2)}, which is ${metrics.adSpend / metrics.newCustomers > 40 ? 'above target' : 'within target range'}`,
      `Weekend sales performance exceeds weekday sales by 35%, suggesting potential for weekday-focused promotions`,
      `'Summer Collection' campaign is your top performer with 3.2x ROAS`,
      `Cart abandonment rate has increased to 68%, up 12% from previous period`,
      `Email campaigns are generating 2.1x better conversion rates than social media ads`,
      `Three products have inventory levels below 15% and require reordering`,
      `Returning customer rate has decreased by 8% this period, retention strategy needs review`
    ];
  };

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
  
  // When component loads, trigger the data load
  useEffect(() => {
    if (user) {
      setUserName(user.firstName || "")
    }
    
    // Force loading of simulated data and ensure reports are created
    const loadSimulatedData = async () => {
      setIsLoading(true);
      
      try {
        // Get dates for different periods
        const dailyDates = getPeriodDates('daily')
        const monthlyDates = getPeriodDates('monthly')
        const previousMonthDates = getPreviousPeriodDates('monthly')
        
        // Generate simulated metrics for each period
        const todayMetrics = await fetchPeriodMetrics('simulation-id', dailyDates.from, dailyDates.to)
        const monthMetrics = await fetchPeriodMetrics('simulation-id', monthlyDates.from, monthlyDates.to)
        const previousMonthMetrics = await fetchPeriodMetrics('simulation-id', previousMonthDates.from, previousMonthDates.to)
        
        // Update state with simulated metrics
        setPeriodData({
          today: todayMetrics,
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
          month: monthMetrics,
          previousMonth: previousMonthMetrics
        })
        
        // Set reports based on the simulated data
        const dailyReportData = await generateSimulatedReport('daily', todayMetrics, { 
          salesGrowth: 15.7,
          orderGrowth: 12.3,
          customerGrowth: 8.5,
          roasGrowth: 4.2,
          conversionGrowth: 3.8
        });
        
        const monthlyReportData = await generateSimulatedReport('monthly', monthMetrics, {
          salesGrowth: 12.4,
          orderGrowth: 10.8,
          customerGrowth: 14.3,
          roasGrowth: 7.9,
          conversionGrowth: 6.2
        });
        
        if (dailyReportData) setDailyReport(dailyReportData);
        if (monthlyReportData) setMonthlyReport(monthlyReportData);
        
        // Ensure we mark data as available for the simulation
        setHasEnoughData(true);
      } catch (error) {
        console.error('Error generating simulated data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Always run the simulation data for the demo
    loadSimulatedData();
  }, []);

  // Function to generate simulated reports
  const generateSimulatedReport = async (
    period: ReportPeriod, 
    metrics: PeriodMetrics, 
    comparison: {
      salesGrowth: number;
      orderGrowth: number;
      customerGrowth: number;
      roasGrowth: number;
      conversionGrowth: number;
    }
  ): Promise<PerformanceReport> => {
    
    // Generate period-specific date range string
    let dateRangeStr = "";
    const now = new Date();
    
    if (period === 'daily') {
      dateRangeStr = `Today, ${format(now, 'MMMM d, yyyy')}`;
    } else {
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      dateRangeStr = `${format(monthStart, 'MMMM yyyy')}`;
    }
    
    // Generate recommendations and takeaways
    const recommendations = generateRecommendations(metrics, comparison);
    const takeaways = generateTakeaways(metrics, comparison);
    
    // Sample best-selling products
    const bestSellingProducts = [
      { name: "Test product 4", revenue: 1100, orders: 20 },
      { name: "Beach Tote Bag", revenue: 870, orders: 18 },
      { name: "Sunglasses - Aviator", revenue: 620, orders: 16 },
      { name: "Linen Shorts", revenue: 520, orders: 12 },
      { name: "Sandals - Unisex", revenue: 480, orders: 10 },
    ];
    
    // Sample historical comparison data for daily view - now showing 7 days total (today plus 6 prior days)
    const historicalData = period === 'daily' 
      ? [
          { name: format(subDays(new Date(), 6), 'EEE, MMM d'), revenue: metrics.totalSales * 0.78, orders: metrics.ordersCount * 0.75, adSpend: metrics.adSpend * 0.82, roas: metrics.roas * 0.88 },
          { name: format(subDays(new Date(), 5), 'EEE, MMM d'), revenue: metrics.totalSales * 0.82, orders: metrics.ordersCount * 0.79, adSpend: metrics.adSpend * 0.85, roas: metrics.roas * 0.90 },
          { name: format(subDays(new Date(), 4), 'EEE, MMM d'), revenue: metrics.totalSales * 0.85, orders: metrics.ordersCount * 0.82, adSpend: metrics.adSpend * 0.9, roas: metrics.roas * 0.95 },
          { name: format(subDays(new Date(), 3), 'EEE, MMM d'), revenue: metrics.totalSales * 0.88, orders: metrics.ordersCount * 0.85, adSpend: metrics.adSpend * 0.92, roas: metrics.roas * 0.97 },
          { name: format(subDays(new Date(), 2), 'EEE, MMM d'), revenue: metrics.totalSales * 0.92, orders: metrics.ordersCount * 0.90, adSpend: metrics.adSpend * 0.95, roas: metrics.roas * 0.98 },
          { name: format(subDays(new Date(), 1), 'EEE, MMM d'), revenue: metrics.totalSales * 0.97, orders: metrics.ordersCount * 0.95, adSpend: metrics.adSpend * 0.98, roas: metrics.roas * 0.99 },
          { name: 'Today', revenue: metrics.totalSales, orders: metrics.ordersCount, adSpend: metrics.adSpend, roas: metrics.roas },
        ]
      : [
          { name: getThreeMonthsAgoName(), revenue: metrics.totalSales * 0.75, orders: metrics.ordersCount * 0.70, adSpend: metrics.adSpend * 0.78, roas: metrics.roas * 0.85 },
          { name: getTwoMonthsAgoName(), revenue: metrics.totalSales * 0.85, orders: metrics.ordersCount * 0.82, adSpend: metrics.adSpend * 0.88, roas: metrics.roas * 0.95 },
          { name: getPreviousMonthName(), revenue: metrics.totalSales, orders: metrics.ordersCount, adSpend: metrics.adSpend, roas: metrics.roas },
        ];
    
    // Generate AI analysis based on period
    const aiAnalysis = period === 'daily'
      ? `Your store is showing strong performance today with revenue of ${formatCurrency(metrics.totalSales)} from ${metrics.ordersCount} orders, which is a ${comparison.salesGrowth > 0 ? 'positive' : 'negative'} ${Math.abs(comparison.salesGrowth).toFixed(1)}% change from yesterday. 
      
The Summer T-Shirt Collection continues to be your best-selling product line, generating 32% of today's revenue. Beach accessories are also performing well with the Beach Tote Bag and Aviator Sunglasses in the top 3 products.

Your advertising performance shows a ROAS of ${metrics.roas.toFixed(1)}x, which is ${comparison.roasGrowth > 0 ? 'up' : 'down'} ${Math.abs(comparison.roasGrowth).toFixed(1)}% from yesterday. Meta campaigns are outperforming Google campaigns with Meta showing a 3.2x ROAS compared to Google's 1.9x.

Customer behavior analysis shows peak purchasing times between 11am-2pm and 6pm-8pm. Mobile conversion rates continue to lag behind desktop by approximately 25%.

Inventory levels for Summer T-Shirts and Beach Tote Bags are below 30% - consider restocking these high-performing items within the next 7 days to avoid stockouts during peak sales periods.`
      : `Your store generated ${formatCurrency(metrics.totalSales)} in revenue last month, representing a ${comparison.salesGrowth > 0 ? 'positive' : 'negative'} ${Math.abs(comparison.salesGrowth).toFixed(1)}% change from the previous month. Overall order volume increased by ${comparison.orderGrowth > 0 ? '+' : ''}${comparison.orderGrowth.toFixed(1)}% to ${metrics.ordersCount} orders.

Product performance analysis shows summer apparel and accessories dominating your sales, with the Summer T-Shirt Collection being the clear leader generating 28% of monthly revenue. The top 5 products account for 52% of your total sales, suggesting strong category focus.

Customer acquisition metrics show ${metrics.newCustomers} new customers last month, with a cost per acquisition of $${(metrics.adSpend / metrics.newCustomers).toFixed(2)}. Your customer retention rate is ${metrics.conversionRate.toFixed(1)}%, which is ${comparison.conversionGrowth > 0 ? 'up' : 'down'} ${Math.abs(comparison.conversionGrowth).toFixed(1)}% from last month.

Advertising efficiency improved with an overall ROAS of ${metrics.roas.toFixed(1)}x, up ${comparison.roasGrowth.toFixed(1)}% from previous month. Meta campaigns continue to outperform other platforms with a ROAS of 3.2x versus Google's 1.9x. The "Summer Collection" campaign was your best performer with a 3.8x ROAS.

Inventory analysis indicates potential stockout risks for three of your top-selling items within the next 18-21 days based on current sales velocity. Beach Tote Bags are at critically low levels (12% of optimal stock).`;

    // Create the report with simulated data
    const report: PerformanceReport = {
      dateRange: dateRangeStr,
      totalPurchases: metrics.ordersCount,
      totalAdSpend: metrics.adSpend,
      averageRoas: metrics.roas,
      revenueGenerated: metrics.totalSales,
      bestCampaign: {
        name: "Summer Collection",
        roas: 3.2,
        cpa: 22.50,
        ctr: 2.7,
        conversions: Math.round(metrics.newCustomers * 0.35)
      },
      underperformingCampaign: {
        name: "Google Search - Non-Brand",
        roas: 0.9,
        cpa: 48.75,
        ctr: 1.2,
        conversions: Math.round(metrics.newCustomers * 0.15)
      },
      bestAudience: {
        name: "Previous Customers",
        roas: 4.1,
        cpa: 18.25
      },
      ctr: metrics.ctr,
      cpc: metrics.cpc,
      conversionRate: metrics.conversionRate,
      newCustomersAcquired: metrics.newCustomers,
      recommendations,
      takeaways,
      periodComparison: comparison,
      bestSellingProducts: bestSellingProducts,
      historicalData: historicalData,
      aiAnalysis: aiAnalysis
    };
    
    return report;
  };

  if (isLoading) {
    return (
      <div className="bg-[#1A1A1A] rounded-lg p-6 shadow-sm text-white">
        <div className="flex flex-col items-center justify-center p-12">
          <LoadingSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1A1A1A] rounded-lg p-6 shadow-sm text-white">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="flex items-center">
            <h3 className="text-lg font-medium">
              {getGreeting()}, {brandName}
            </h3>
            <button 
              onClick={() => setIsMinimized(!isMinimized)}
              className="ml-2 p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-[#333]"
            >
              {isMinimized ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {currentPeriod === 'monthly' 
              ? `Data for ${getPreviousMonthName()}, updated daily`
              : `Today's data, last updated ${new Date().toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={currentPeriod === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentPeriod('daily')}
            className={currentPeriod === 'daily' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            Daily
          </Button>
          <Button
            variant={currentPeriod === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentPeriod('monthly')}
            className={currentPeriod === 'monthly' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            Monthly
          </Button>
        </div>
      </div>
      
      {!isMinimized && (
        <AlertBox type="info" className="mb-6">
          <div className="text-sm">
            <span className="font-medium">Data Sources:</span> {connections.some(c => c.platform_type === 'shopify') ? 'Shopify' : 'No Shopify connection'} 
            {connections.some(c => c.platform_type === 'meta') && ', Meta Ads'} 
            {connections.some(c => c.platform_type === 'google') && ', Google Ads'}
          </div>
        </AlertBox>
      )}
      
      {isMinimized ? (
        <div className="py-2">
          <p className="text-gray-300 text-sm">
            {currentPeriod === 'monthly' 
              ? `${getPreviousMonthName()} Revenue: ${formatCurrency(monthlyReport?.revenueGenerated || 0)} (${monthlyReport?.periodComparison.salesGrowth.toFixed(1)}% from previous month)`
              : `Today's Revenue: ${formatCurrency(dailyReport?.revenueGenerated || 0)} (${dailyReport?.periodComparison.salesGrowth.toFixed(1)}% from yesterday)`}
          </p>
        </div>
      ) : currentPeriod === 'monthly' && monthlyReport ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Revenue Generated</h5>
              <p className="text-2xl font-semibold">{formatCurrency(monthlyReport.revenueGenerated)}</p>
              {monthlyReport.periodComparison.salesGrowth !== 0 && (
                <p className={`text-sm ${monthlyReport.periodComparison.salesGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {monthlyReport.periodComparison.salesGrowth > 0 ? '↑' : '↓'} {Math.abs(monthlyReport.periodComparison.salesGrowth).toFixed(1)}% from previous month
                </p>
              )}
            </div>
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Orders Placed</h5>
              <p className="text-2xl font-semibold">{monthlyReport.totalPurchases}</p>
              {monthlyReport.periodComparison.orderGrowth !== 0 && (
                <p className={`text-sm ${monthlyReport.periodComparison.orderGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {monthlyReport.periodComparison.orderGrowth > 0 ? '↑' : '↓'} {Math.abs(monthlyReport.periodComparison.orderGrowth).toFixed(1)}% from previous month
                </p>
              )}
            </div>
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Ad Spend</h5>
              <p className="text-2xl font-semibold">{formatCurrency(monthlyReport.totalAdSpend)}</p>
              <p className="text-sm text-gray-400">
                {((monthlyReport.totalAdSpend / monthlyReport.revenueGenerated) * 100).toFixed(1)}% of revenue
              </p>
            </div>
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Average ROAS</h5>
              <p className="text-2xl font-semibold">{monthlyReport.averageRoas.toFixed(1)}x</p>
              {monthlyReport.periodComparison.roasGrowth !== 0 && (
                <p className={`text-sm ${monthlyReport.periodComparison.roasGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {monthlyReport.periodComparison.roasGrowth > 0 ? '↑' : '↓'} {Math.abs(monthlyReport.periodComparison.roasGrowth).toFixed(1)}% from previous month
                </p>
              )}
            </div>
          </div>
          
          <div className="bg-[#1E1E1E] p-4 rounded-lg mb-6 border border-[#333] text-gray-300">
            <div className="flex items-center mb-3">
              <Sparkles className="text-blue-400 mr-2 h-5 w-5" />
              <h5 className="font-medium">Performance Summary</h5>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-line">
              {monthlyReport.aiAnalysis}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-7 gap-6 mb-6">
            <div className="md:col-span-2 grid grid-cols-1 gap-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-medium">{(currentPeriod as string) === 'daily' ? "Today's" : "Last Month's"} Best Sellers</h5>
                  <p className="text-xs text-gray-400">by {(currentPeriod as string) === 'daily' ? "today's" : "month's"} revenue</p>
                </div>
                <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A]">
                  {monthlyReport?.bestSellingProducts?.map((product, index) => (
                    <div key={index} className="mb-4 last:mb-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">{product.name}</span>
                        <span className="text-sm font-medium">${product.revenue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-500 rounded-full" 
                            style={{ 
                              width: `${(product.revenue / (monthlyReport?.bestSellingProducts?.[0]?.revenue || 1)) * 100}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400">{product.orders} units sold</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-medium">Top Performing Campaigns</h5>
                  <p className="text-xs text-gray-400">by ROAS</p>
                </div>
                <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A]">
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">Summer Collection</span>
                      <span className="text-sm font-medium">3.8x</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: "100%" }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400">$4,250 spent</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">Beach Essentials</span>
                      <span className="text-sm font-medium">3.2x</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: "84%" }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400">$2,800 spent</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">Returning Customers</span>
                      <span className="text-sm font-medium">2.9x</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: "76%" }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400">$1,950 spent</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">Weekend Flash Sale</span>
                      <span className="text-sm font-medium">2.6x</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: "68%" }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400">$1,200 spent</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">New Arrivals</span>
                      <span className="text-sm font-medium">2.3x</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: "60%" }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400">$2,400 spent</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-5">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-medium">
                    Month-to-Month Comparison
                  </h5>
                  <p className="text-xs text-gray-400">
                    {getPreviousMonthName()} vs. previous months
                  </p>
                </div>
                <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A]">
                  <h6 className="text-sm font-medium mb-4">Performance Trends</h6>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-400">Revenue</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getThreeMonthsAgoName()}
                          </div>
                          <div className="font-semibold">
                            ${Math.round(monthlyReport ? monthlyReport.revenueGenerated * 0.75 : 0)}
                          </div>
                        </div>
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getTwoMonthsAgoName()}
                          </div>
                          <div className="font-semibold">
                            ${Math.round(monthlyReport ? monthlyReport.revenueGenerated * 0.85 : 0)}
                          </div>
                          <div className="text-xs text-green-500">
                            +13.3%
                          </div>
                        </div>
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getPreviousMonthName()}
                          </div>
                          <div className="font-semibold">
                            ${Math.round(monthlyReport ? monthlyReport.revenueGenerated : 0)}
                          </div>
                          <div className="text-xs text-green-500">
                            +{monthlyReport ? Math.abs(monthlyReport.periodComparison.salesGrowth).toFixed(1) : 0}%
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-400">Ad Spend</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getThreeMonthsAgoName()}
                          </div>
                          <div className="font-semibold">
                            ${Math.round(monthlyReport ? monthlyReport.totalAdSpend * 0.78 : 0)}
                          </div>
                        </div>
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getTwoMonthsAgoName()}
                          </div>
                          <div className="font-semibold">
                            ${Math.round(monthlyReport ? monthlyReport.totalAdSpend * 0.88 : 0)}
                          </div>
                          <div className="text-xs text-amber-500">
                            +12.8%
                          </div>
                        </div>
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getPreviousMonthName()}
                          </div>
                          <div className="font-semibold">
                            ${Math.round(monthlyReport ? monthlyReport.totalAdSpend : 0)}
                          </div>
                          <div className="text-xs text-amber-500">
                            +13.6%
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-400">Average ROAS</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getThreeMonthsAgoName()}
                          </div>
                          <div className="font-semibold">
                            {(monthlyReport ? monthlyReport.averageRoas * 0.85 : 0).toFixed(1)}x
                          </div>
                        </div>
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getTwoMonthsAgoName()}
                          </div>
                          <div className="font-semibold">
                            {(monthlyReport ? monthlyReport.averageRoas * 0.95 : 0).toFixed(1)}x
                          </div>
                          <div className="text-xs text-green-500">
                            +11.8%
                          </div>
                        </div>
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getPreviousMonthName()}
                          </div>
                          <div className="font-semibold">
                            {(monthlyReport ? monthlyReport.averageRoas : 0).toFixed(1)}x
                          </div>
                          <div className="text-xs text-green-500">
                            +{monthlyReport ? Math.abs(monthlyReport.periodComparison.roasGrowth).toFixed(1) : 0}%
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-400">Orders</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getThreeMonthsAgoName()}
                          </div>
                          <div className="font-semibold">
                            {Math.round(monthlyReport ? monthlyReport.totalPurchases * 0.70 : 0)}
                          </div>
                        </div>
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getTwoMonthsAgoName()}
                          </div>
                          <div className="font-semibold">
                            {Math.round(monthlyReport ? monthlyReport.totalPurchases * 0.82 : 0)}
                          </div>
                          <div className="text-xs text-green-500">
                            +17.1%
                          </div>
                        </div>
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getPreviousMonthName()}
                          </div>
                          <div className="font-semibold">
                            {Math.round(monthlyReport ? monthlyReport.totalPurchases : 0)}
                          </div>
                          <div className="text-xs text-green-500">
                            +{monthlyReport ? Math.abs(monthlyReport.periodComparison.orderGrowth).toFixed(1) : 0}%
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-400">Ad CTR</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getThreeMonthsAgoName()}
                          </div>
                          <div className="font-semibold">
                            {(monthlyReport ? monthlyReport.ctr * 0.85 : 0).toFixed(2)}%
                          </div>
                        </div>
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getTwoMonthsAgoName()}
                          </div>
                          <div className="font-semibold">
                            {(monthlyReport ? monthlyReport.ctr * 0.92 : 0).toFixed(2)}%
                          </div>
                          <div className="text-xs text-green-500">
                            +8.2%
                          </div>
                        </div>
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getPreviousMonthName()}
                          </div>
                          <div className="font-semibold">
                            {(monthlyReport ? monthlyReport.ctr : 0).toFixed(2)}%
                          </div>
                          <div className="text-xs text-green-500">
                            +8.7%
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-400">Cost Per Acquisition</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getThreeMonthsAgoName()}
                          </div>
                          <div className="font-semibold">
                            ${(monthlyReport ? (monthlyReport.totalAdSpend / monthlyReport.newCustomersAcquired) * 1.2 : 0).toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getTwoMonthsAgoName()}
                          </div>
                          <div className="font-semibold">
                            ${(monthlyReport ? (monthlyReport.totalAdSpend / monthlyReport.newCustomersAcquired) * 1.1 : 0).toFixed(2)}
                          </div>
                          <div className="text-xs text-green-500">
                            -8.3%
                          </div>
                        </div>
                        <div className="bg-[#1A1A1A] p-2 rounded-md">
                          <div className="text-xs text-gray-400">
                            {getPreviousMonthName()}
                          </div>
                          <div className="font-semibold">
                            ${(monthlyReport ? (monthlyReport.totalAdSpend / monthlyReport.newCustomersAcquired) : 0).toFixed(2)}
                          </div>
                          <div className="text-xs text-green-500">
                            -9.1%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium mb-3">Key Takeaways</h5>
              <ul className="space-y-2 bg-[#222] p-4 rounded-lg h-[calc(100%-28px)]">
                {monthlyReport.takeaways.map((takeaway, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300 text-sm">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : currentPeriod === 'daily' && dailyReport ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#222] p-4 rounded-lg">
                <h5 className="text-sm text-gray-400 mb-1">Revenue</h5>
                <p className="text-2xl font-semibold">{formatCurrency(dailyReport?.revenueGenerated || 0)}</p>
                {dailyReport?.periodComparison.salesGrowth !== 0 && (
                  <p className={`text-sm ${dailyReport?.periodComparison.salesGrowth && dailyReport.periodComparison.salesGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {dailyReport?.periodComparison.salesGrowth && dailyReport.periodComparison.salesGrowth > 0 ? '↑' : '↓'} {Math.abs(dailyReport?.periodComparison.salesGrowth || 0).toFixed(1)}% from yesterday
                  </p>
                )}
              </div>
              <div className="bg-[#222] p-4 rounded-lg">
                <h5 className="text-sm text-gray-400 mb-1">Orders</h5>
                <p className="text-2xl font-semibold">{dailyReport?.totalPurchases || 0}</p>
                {dailyReport?.periodComparison.orderGrowth !== 0 && (
                  <p className={`text-sm ${dailyReport?.periodComparison.orderGrowth && dailyReport.periodComparison.orderGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {dailyReport?.periodComparison.orderGrowth && dailyReport.periodComparison.orderGrowth > 0 ? '↑' : '↓'} {Math.abs(dailyReport?.periodComparison.orderGrowth || 0).toFixed(1)}% from yesterday
                  </p>
                )}
              </div>
              <div className="bg-[#222] p-4 rounded-lg">
                <h5 className="text-sm text-gray-400 mb-1">Ad Spend</h5>
                <p className="text-2xl font-semibold">{formatCurrency(dailyReport?.totalAdSpend || 0)}</p>
                <p className="text-sm text-gray-400">
                  {(((dailyReport?.totalAdSpend || 0) / (dailyReport?.revenueGenerated || 1)) * 100).toFixed(1)}% of revenue
                </p>
              </div>
              <div className="bg-[#222] p-4 rounded-lg">
                <h5 className="text-sm text-gray-400 mb-1">Average ROAS</h5>
                <p className="text-2xl font-semibold">{dailyReport?.averageRoas.toFixed(1) || 'N/A'}x</p>
                {dailyReport?.periodComparison.roasGrowth !== 0 && (
                  <p className={`text-sm ${dailyReport?.periodComparison.roasGrowth && dailyReport.periodComparison.roasGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {dailyReport?.periodComparison.roasGrowth && dailyReport.periodComparison.roasGrowth > 0 ? '↑' : '↓'} {Math.abs(dailyReport?.periodComparison.roasGrowth || 0).toFixed(1)}% from yesterday
                  </p>
                )}
              </div>
            </div>
            
            <div className="bg-[#1E1E1E] p-4 rounded-lg mb-6 border border-[#333] text-gray-300">
              <div className="flex items-center mb-3">
                <Sparkles className="text-blue-400 mr-2 h-5 w-5" />
                <h5 className="font-medium">Performance Summary</h5>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-line">
                {dailyReport?.aiAnalysis || 'N/A'}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-7 gap-6 mb-6">
              <div className="md:col-span-2 grid grid-cols-1 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium">Today's Best Sellers</h5>
                    <p className="text-xs text-gray-400">by today's revenue</p>
                  </div>
                  <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A]">
                    {dailyReport?.bestSellingProducts?.map((product, index) => (
                      <div key={index} className="mb-4 last:mb-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">{product.name}</span>
                          <span className="text-sm font-medium">${product.revenue}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-yellow-500 rounded-full" 
                              style={{ 
                                width: `${(product.revenue / (dailyReport?.bestSellingProducts?.[0]?.revenue || 1)) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-400">{product.orders} units sold</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium">Top Performing Campaigns</h5>
                    <p className="text-xs text-gray-400">by ROAS</p>
                  </div>
                  <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A]">
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Summer Collection</span>
                        <span className="text-sm font-medium">3.8x</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: "100%" }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400">$4,250 spent</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Beach Essentials</span>
                        <span className="text-sm font-medium">3.2x</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: "84%" }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400">$2,800 spent</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Returning Customers</span>
                        <span className="text-sm font-medium">2.9x</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: "76%" }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400">$1,950 spent</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Weekend Flash Sale</span>
                        <span className="text-sm font-medium">2.6x</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: "68%" }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400">$1,200 spent</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">New Arrivals</span>
                        <span className="text-sm font-medium">2.3x</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: "60%" }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400">$2,400 spent</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-5">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium">
                      7-Day Performance
                    </h5>
                    <p className="text-xs text-gray-400">
                      Today vs. previous 6 days
                    </p>
                  </div>
                  <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 text-xs border-b border-gray-800">
                            <th className="pb-2 text-left">Date</th>
                            <th className="pb-2 text-right">Revenue</th>
                            <th className="pb-2 text-right">Change</th>
                            <th className="pb-2 text-right">Orders</th>
                            <th className="pb-2 text-right">Change</th>
                            <th className="pb-2 text-right">Ad Spend</th>
                            <th className="pb-2 text-right">Change</th>
                            <th className="pb-2 text-right">ROAS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyReport?.historicalData?.slice().reverse().map((day, index, array) => {
                            // Calculate day-over-day changes
                            const prevDay = index < array.length - 1 ? array[index + 1] : null;
                            
                            // Calculate percentage changes
                            const revenueChange = prevDay ? ((day.revenue - prevDay.revenue) / prevDay.revenue) * 100 : null;
                            const ordersChange = prevDay ? ((day.orders - prevDay.orders) / prevDay.orders) * 100 : null;
                            const adSpendChange = prevDay ? ((day.adSpend - prevDay.adSpend) / prevDay.adSpend) * 100 : null;
                            
                            return (
                              <tr key={day.name} className={index === 0 ? "bg-gray-900/30" : ""}>
                                <td className="py-2">{day.name}</td>
                                <td className="text-right py-2">${Math.round(day.revenue)}</td>
                                <td className="text-right py-2">
                                  {revenueChange !== null ? (
                                    <span className={`flex items-center justify-end ${revenueChange > 0 ? 'text-green-500' : revenueChange < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                      {revenueChange > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : revenueChange < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                                      {Math.abs(revenueChange).toFixed(1)}%
                                    </span>
                                  ) : "-"}
                                </td>
                                <td className="text-right py-2">{Math.round(day.orders)}</td>
                                <td className="text-right py-2">
                                  {ordersChange !== null ? (
                                    <span className={`flex items-center justify-end ${ordersChange > 0 ? 'text-green-500' : ordersChange < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                      {ordersChange > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : ordersChange < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                                      {Math.abs(ordersChange).toFixed(1)}%
                                    </span>
                                  ) : "-"}
                                </td>
                                <td className="text-right py-2">${Math.round(day.adSpend)}</td>
                                <td className="text-right py-2">
                                  {adSpendChange !== null ? (
                                    <span className={`flex items-center justify-end ${adSpendChange > 0 ? 'text-red-500' : adSpendChange < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                      {adSpendChange > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : adSpendChange < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                                      {Math.abs(adSpendChange).toFixed(1)}%
                                    </span>
                                  ) : "-"}
                                </td>
                                <td className="text-right py-2">{day.roas.toFixed(1)}x</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-5">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-medium">
                    7-Day Performance
                  </h5>
                  <p className="text-xs text-gray-400">
                    Today vs. previous 6 days
                  </p>
                </div>
                <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 text-xs border-b border-gray-800">
                          <th className="pb-2 text-left">Date</th>
                          <th className="pb-2 text-right">Revenue</th>
                          <th className="pb-2 text-right">Change</th>
                          <th className="pb-2 text-right">Orders</th>
                          <th className="pb-2 text-right">Change</th>
                          <th className="pb-2 text-right">Ad Spend</th>
                          <th className="pb-2 text-right">Change</th>
                          <th className="pb-2 text-right">ROAS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyReport?.historicalData?.slice().reverse().map((day, index, array) => {
                          // Calculate day-over-day changes
                          const prevDay = index < array.length - 1 ? array[index + 1] : null;
                          
                          // Calculate percentage changes
                          const revenueChange = prevDay ? ((day.revenue - prevDay.revenue) / prevDay.revenue) * 100 : null;
                          const ordersChange = prevDay ? ((day.orders - prevDay.orders) / prevDay.orders) * 100 : null;
                          const adSpendChange = prevDay ? ((day.adSpend - prevDay.adSpend) / prevDay.adSpend) * 100 : null;
                          
                          return (
                            <tr key={day.name} className={index === 0 ? "bg-gray-900/30" : ""}>
                              <td className="py-2">{day.name}</td>
                              <td className="text-right py-2">${Math.round(day.revenue)}</td>
                              <td className="text-right py-2">
                                {revenueChange !== null ? (
                                  <span className={`flex items-center justify-end ${revenueChange > 0 ? 'text-green-500' : revenueChange < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {revenueChange > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : revenueChange < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                                    {Math.abs(revenueChange).toFixed(1)}%
                                  </span>
                                ) : "-"}
                              </td>
                              <td className="text-right py-2">{Math.round(day.orders)}</td>
                              <td className="text-right py-2">
                                {ordersChange !== null ? (
                                  <span className={`flex items-center justify-end ${ordersChange > 0 ? 'text-green-500' : ordersChange < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {ordersChange > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : ordersChange < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                                    {Math.abs(ordersChange).toFixed(1)}%
                                  </span>
                                ) : "-"}
                              </td>
                              <td className="text-right py-2">${Math.round(day.adSpend)}</td>
                              <td className="text-right py-2">
                                {adSpendChange !== null ? (
                                  <span className={`flex items-center justify-end ${adSpendChange > 0 ? 'text-red-500' : adSpendChange < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                    {adSpendChange > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : adSpendChange < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                                    {Math.abs(adSpendChange).toFixed(1)}%
                                  </span>
                                ) : "-"}
                              </td>
                              <td className="text-right py-2">{day.roas.toFixed(1)}x</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium mb-3">Key Takeaways</h5>
              <ul className="space-y-2 bg-[#222] p-4 rounded-lg h-[calc(100%-28px)]">
                {dailyReport?.takeaways?.map((takeaway, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300 text-sm">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12">
            <LoadingSkeleton />
          </div>
        )}
      </div>
    </div>
  )
} 