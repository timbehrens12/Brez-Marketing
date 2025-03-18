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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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

type ReportPeriod = 'daily' | 'monthly'

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
    // SIMULATION: Return a mix of realistic takeaways for demo purposes
    return [
      `Revenue ${comparison.salesGrowth > 0 ? 'increased' : 'decreased'} by ${Math.abs(comparison.salesGrowth).toFixed(1)}% compared to the previous period`,
      `Meta ads are outperforming Google ads with a 2.8x vs 1.9x ROAS`,
      `Mobile conversion rate (${(metrics.conversionRate * 0.8).toFixed(1)}%) lags behind desktop (${(metrics.conversionRate * 1.2).toFixed(1)}%)`,
      `New customer acquisition cost is $${(metrics.adSpend / metrics.newCustomers).toFixed(2)}`,
      `Weekend sales performance exceeds weekday sales by 35%`,
      `'Summer Collection' campaign is your top performer with 3.2x ROAS`
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
      { name: "Summer T-Shirt Collection", revenue: 2450, orders: 35 },
      { name: "Beach Tote Bag", revenue: 1870, orders: 22 },
      { name: "Sunglasses - Aviator", revenue: 1520, orders: 19 },
      { name: "Linen Shorts", revenue: 1320, orders: 16 },
      { name: "Sandals - Unisex", revenue: 980, orders: 14 },
    ];
    
    // Sample historical comparison data
    const historicalData = period === 'daily' 
      ? [
          { name: '3 Days Ago', revenue: metrics.totalSales * 0.85, orders: metrics.ordersCount * 0.82, adSpend: metrics.adSpend * 0.9, roas: metrics.roas * 0.95 },
          { name: '2 Days Ago', revenue: metrics.totalSales * 0.92, orders: metrics.ordersCount * 0.90, adSpend: metrics.adSpend * 0.95, roas: metrics.roas * 0.98 },
          { name: 'Yesterday', revenue: metrics.totalSales * 0.97, orders: metrics.ordersCount * 0.95, adSpend: metrics.adSpend * 0.98, roas: metrics.roas * 0.99 },
          { name: 'Today', revenue: metrics.totalSales, orders: metrics.ordersCount, adSpend: metrics.adSpend, roas: metrics.roas },
        ]
      : [
          { name: '3 Months Ago', revenue: metrics.totalSales * 0.8, orders: metrics.ordersCount * 0.75, adSpend: metrics.adSpend * 0.85, roas: metrics.roas * 0.9 },
          { name: '2 Months Ago', revenue: metrics.totalSales * 0.85, orders: metrics.ordersCount * 0.82, adSpend: metrics.adSpend * 0.9, roas: metrics.roas * 0.95 },
          { name: 'Last Month', revenue: metrics.totalSales * 0.92, orders: metrics.ordersCount * 0.9, adSpend: metrics.adSpend * 0.95, roas: metrics.roas * 0.98 },
          { name: 'This Month', revenue: metrics.totalSales, orders: metrics.ordersCount, adSpend: metrics.adSpend, roas: metrics.roas },
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
      <div className="flex flex-col mb-6">
        <h3 className="text-2xl font-bold mb-1">{getGreeting()}, {userName}</h3>
        <p className="text-gray-400">Here's your {currentPeriod === 'daily' ? 'today' : 'monthly'} performance overview</p>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">
            {currentPeriod === 'daily' ? 'Today\'s Performance' : 'Last Month\'s Performance'} 
          </h2>
          <p className="text-gray-400 text-sm">
            {currentPeriod === 'daily' 
              ? `${format(new Date(), 'MMMM d, yyyy')}` 
              : `${format(subMonths(new Date(), 1), 'MMMM 1')} - ${format(subMonths(endOfMonth(new Date()), 1), 'MMMM d, yyyy')}`}
          </p>
        </div>
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
            className={currentPeriod === 'monthly' ? 'bg-gray-800' : ''}
            onClick={() => setCurrentPeriod('monthly')}
          >
            Last Month
          </Button>
        </div>
      </div>
      
      <div className="bg-[#222] rounded-lg p-3 mb-6 text-xs text-gray-400 flex items-center">
        <div className="mr-2 text-yellow-400">
          <AlertTriangle size={14} />
        </div>
        {currentPeriod === 'daily' 
          ? "Today's data is refreshed every 30 minutes. Last update: " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          : "Monthly data is compiled on the 1st of each month at 12:00 AM. This ensures complete data for the previous month."}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Ad Spend</h5>
              <p className="text-2xl font-semibold">{formatCurrency(monthlyReport.totalAdSpend)}</p>
              <p className="text-sm text-gray-400">
                {Math.round(monthlyReport.totalAdSpend / monthlyReport.revenueGenerated * 100)}% of revenue
              </p>
            </div>
            
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Average ROAS</h5>
              <p className="text-2xl font-semibold">{monthlyReport.averageRoas.toFixed(1)}x</p>
              {monthlyReport.periodComparison.roasGrowth !== 0 && (
                <p className={`text-sm ${monthlyReport.periodComparison.roasGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {monthlyReport.periodComparison.roasGrowth > 0 ? '↑' : '↓'} {Math.abs(monthlyReport.periodComparison.roasGrowth).toFixed(1)}% from {getPreviousMonthName()}
                </p>
              )}
            </div>
          </div>
          
          {/* AI Analysis Section */}
          <div className="bg-[#1E1E1E] p-4 rounded-lg mb-6 border border-[#333] text-gray-300">
            <div className="flex items-center mb-3">
              <Sparkles className="text-blue-400 mr-2 h-5 w-5" />
              <h5 className="font-medium">AI Analysis</h5>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-line">
              {monthlyReport.aiAnalysis}
            </div>
            <div className="mt-4 text-right">
              <Link href="/ai-dashboard" className="text-blue-400 text-sm hover:underline inline-flex items-center">
                Get detailed AI intelligence
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="font-medium mb-3">Best Selling Products</h5>
              <div className="bg-[#222] p-4 rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-700">
                      <th className="pb-2 text-left">Product</th>
                      <th className="pb-2 text-right">Revenue</th>
                      <th className="pb-2 text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReport.bestSellingProducts?.map((product, index) => (
                      <tr key={index} className="border-b border-gray-800 last:border-0">
                        <td className="py-3 text-sm">{product.name}</td>
                        <td className="py-3 text-sm text-right">{formatCurrency(product.revenue)}</td>
                        <td className="py-3 text-sm text-right">{product.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium mb-3">Historical Comparison</h5>
              <div className="bg-[#222] p-4 rounded-lg" style={{ height: "350px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyReport.historicalData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" tick={{ fill: '#aaa' }} />
                    <YAxis yAxisId="left" orientation="left" stroke="#aaa" tick={{ fill: '#aaa' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#aaa" tick={{ fill: '#aaa' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#333', borderColor: '#444' }}
                      labelStyle={{ color: 'white' }}
                      itemStyle={{ color: 'white' }}
                      formatter={(value: any) => typeof value === 'number' ? 
                        value.toString().includes('.') ? value.toFixed(1) : value : value}
                    />
                    <Legend wrapperStyle={{ color: '#aaa' }} />
                    <Bar yAxisId="left" dataKey="revenue" name="Revenue ($)" fill="#4ade80" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="adSpend" name="Ad Spend ($)" fill="#f87171" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="roas" name="ROAS (x)" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
              <div className="flex items-center mt-1">
                <div className="h-2 w-full bg-gray-700 rounded-full">
                  <div 
                    className="h-2 bg-blue-500 rounded-full" 
                    style={{ width: `${Math.min(100, (dailyReport.totalPurchases / 20) * 100)}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-xs text-gray-400">
                  {Math.round((dailyReport.totalPurchases / 20) * 100)}% of daily goal
                </span>
              </div>
            </div>
            
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Ad Spend</h5>
              <p className="text-2xl font-semibold">{formatCurrency(dailyReport.totalAdSpend)}</p>
              <p className="text-sm text-gray-400">
                {Math.round(dailyReport.totalAdSpend / dailyReport.revenueGenerated * 100)}% of revenue
              </p>
            </div>
            
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Average ROAS</h5>
              <p className="text-2xl font-semibold">{dailyReport.averageRoas.toFixed(1)}x</p>
              {dailyReport.periodComparison.roasGrowth !== 0 && (
                <p className={`text-sm ${dailyReport.periodComparison.roasGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {dailyReport.periodComparison.roasGrowth > 0 ? '↑' : '↓'} {Math.abs(dailyReport.periodComparison.roasGrowth).toFixed(1)}% from yesterday
                </p>
              )}
            </div>
          </div>
          
          {/* AI Analysis Section */}
          <div className="bg-[#1E1E1E] p-4 rounded-lg mb-6 border border-[#333] text-gray-300">
            <div className="flex items-center mb-3">
              <Sparkles className="text-blue-400 mr-2 h-5 w-5" />
              <h5 className="font-medium">AI Analysis</h5>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-line">
              {dailyReport.aiAnalysis}
            </div>
            <div className="mt-4 text-right">
              <Link href="/ai-dashboard" className="text-blue-400 text-sm hover:underline inline-flex items-center">
                Get detailed AI intelligence
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="font-medium mb-3">Best Selling Products</h5>
              <div className="bg-[#222] p-4 rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-700">
                      <th className="pb-2 text-left">Product</th>
                      <th className="pb-2 text-right">Revenue</th>
                      <th className="pb-2 text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReport.bestSellingProducts?.map((product, index) => (
                      <tr key={index} className="border-b border-gray-800 last:border-0">
                        <td className="py-3 text-sm">{product.name}</td>
                        <td className="py-3 text-sm text-right">{formatCurrency(product.revenue)}</td>
                        <td className="py-3 text-sm text-right">{product.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium mb-3">Historical Comparison</h5>
              <div className="bg-[#222] p-4 rounded-lg" style={{ height: "350px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailyReport.historicalData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" tick={{ fill: '#aaa' }} />
                    <YAxis yAxisId="left" orientation="left" stroke="#aaa" tick={{ fill: '#aaa' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#aaa" tick={{ fill: '#aaa' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#333', borderColor: '#444' }}
                      labelStyle={{ color: 'white' }}
                      itemStyle={{ color: 'white' }}
                      formatter={(value: any) => typeof value === 'number' ? 
                        value.toString().includes('.') ? value.toFixed(1) : value : value}
                    />
                    <Legend wrapperStyle={{ color: '#aaa' }} />
                    <Bar yAxisId="left" dataKey="revenue" name="Revenue ($)" fill="#4ade80" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="adSpend" name="Ad Spend ($)" fill="#f87171" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="roas" name="ROAS (x)" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
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