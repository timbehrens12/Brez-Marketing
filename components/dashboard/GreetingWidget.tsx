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
  
  // Platform-specific data
  platformRevenue: {
    meta: number
    shopify: number
    google?: number
    tiktok?: number
    organic?: number
  }
  platformAdSpend: {
    meta: number
    google?: number
    tiktok?: number
    total: number
  }
  
  // Multiple wins and challenges
  bestCampaigns: {
    name: string
    roas: number
    cpa: number
    ctr?: number
    conversions?: number
    platform: string
  }[]
  
  underperformingCampaigns: {
    name: string
    roas: number
    cpa: number
    ctr?: number
    conversions?: number
    platform: string
  }[]
  
  // For backward compatibility
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
  scalingOpportunities: {
    name: string
    roas: number
  }[]
  ctr: number
  cpc: number
  conversionRate: number
  newCustomersAcquired: number
  recommendations: string[]
  takeaways: string[]
  nextSteps: string[]
  adCreativeSuggestions: string[]
  audienceInsights: {
    name: string
    performance: string
    roas?: number
    cpa?: number
    note?: string
  }[]
  periodicMetrics: {
    metric: string
    value: string | number
    previousValue?: string | number
  }[]
  periodComparison: {
    salesGrowth: number
    orderGrowth: number
    customerGrowth: number
    roasGrowth: number
    conversionGrowth: number
  }
  clientName: string
  preparedBy: string
  
  // AI analysis flag to show this is AI-generated
  aiAnalyzed: boolean
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
  const revenueGrowth = ((monthlyRevenue - dailyAverage) / dailyAverage) * 100

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
    let to: Date

    if (period === 'daily') {
      // Yesterday (since we're showing "today" compared to "yesterday")
      from = new Date(now)
      from.setDate(from.getDate() - 1)
      from.setHours(0, 0, 0, 0)
      to = new Date(from)
      to.setHours(23, 59, 59, 999)
    } else {
      // Last complete month
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      
      from = new Date(firstDayOfLastMonth)
      from.setHours(0, 0, 0, 0)
      
      to = new Date(lastDayOfLastMonth)
      to.setHours(23, 59, 59, 999)
    }

    return { from, to }
  }

  const getPreviousPeriodDates = (period: ReportPeriod) => {
    const { from, to } = getPeriodDates(period)
    
    if (period === 'daily') {
      // Day before yesterday
      const prevFrom = new Date(from)
      prevFrom.setDate(prevFrom.getDate() - 1)
      const prevTo = new Date(prevFrom)
      prevTo.setHours(23, 59, 59, 999)
      return { from: prevFrom, to: prevTo }
    } else {
      // Month before last complete month
      const lastDayOfTwoMonthsAgo = new Date(from.getFullYear(), from.getMonth(), 0)
      const firstDayOfTwoMonthsAgo = new Date(from.getFullYear(), from.getMonth() - 1, 1)
      
      const prevFrom = new Date(firstDayOfTwoMonthsAgo)
      prevFrom.setHours(0, 0, 0, 0)
      
      const prevTo = new Date(lastDayOfTwoMonthsAgo)
      prevTo.setHours(23, 59, 59, 999)
      
      return { from: prevFrom, to: prevTo }
    }
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
        
        // Platform specific revenue and ad spend
        platformRevenue: {
          meta: currentMetrics.totalSales * 0.65, // 65% from Meta
          shopify: currentMetrics.totalSales * 0.35, // 35% direct/organic
          google: currentMetrics.totalSales * 0.05, // 5% from Google
          organic: currentMetrics.totalSales * 0.30 // 30% organic
        },
        platformAdSpend: {
          meta: currentMetrics.adSpend * 0.85, // 85% on Meta
          google: currentMetrics.adSpend * 0.15, // 15% on Google
          total: currentMetrics.adSpend
        },
        
        // Multiple best and underperforming campaigns
        bestCampaigns: [
          {
            name: "Top Campaign",
            roas: currentMetrics.roas * 1.2, // Example: 20% better than average
            cpa: currentMetrics.adSpend / (currentMetrics.newCustomers || 1),
            ctr: currentMetrics.ctr * 1.15, // Example: 15% better than average
            conversions: Math.round(currentMetrics.newCustomers * 0.7), // Example: 70% of new customers
            platform: "Meta"
          },
          {
            name: "Secondary Campaign",
            roas: currentMetrics.roas * 1.1, // Example: 10% better than average
            cpa: currentMetrics.adSpend / (currentMetrics.newCustomers || 1) * 0.9,
            ctr: currentMetrics.ctr * 1.05,
            conversions: Math.round(currentMetrics.newCustomers * 0.2),
            platform: "Meta"
          }
        ],
        underperformingCampaigns: [
          {
            name: "Underperforming Campaign",
            roas: currentMetrics.roas * 0.7, // Example: 30% worse than average
            cpa: currentMetrics.adSpend / (currentMetrics.newCustomers || 1) * 1.4, // 40% higher CPA
            ctr: currentMetrics.ctr * 0.8, // Example: 20% worse than average
            conversions: Math.round(currentMetrics.newCustomers * 0.2), // Example: 20% of new customers
            platform: "Meta"
          },
          {
            name: "Experimental Campaign",
            roas: currentMetrics.roas * 0.5,
            cpa: currentMetrics.adSpend / (currentMetrics.newCustomers || 1) * 1.8,
            ctr: currentMetrics.ctr * 0.6,
            conversions: Math.round(currentMetrics.newCustomers * 0.1),
            platform: "Google"
          }
        ],
        
        // For backward compatibility
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
        scalingOpportunities: [],
        ctr: currentMetrics.ctr,
        cpc: currentMetrics.cpc,
        conversionRate: currentMetrics.conversionRate,
        newCustomersAcquired: currentMetrics.newCustomers,
        recommendations,
        takeaways,
        nextSteps: [],
        adCreativeSuggestions: [],
        audienceInsights: [],
        periodicMetrics: [],
        periodComparison: {
          salesGrowth,
          orderGrowth,
          customerGrowth,
          roasGrowth,
          conversionGrowth
        },
        clientName: "Yordy",
        preparedBy: "Carson Knutson",
        
        // AI analysis flag to show this is AI-generated
        aiAnalyzed: true
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
      // Today's date
      dateRangeStr = `Today, ${format(now, 'MMMM d, yyyy')}`;
    } else {
      // Last complete month
      const lastMonth = new Date(now);
      lastMonth.setDate(0); // Last day of previous month
      const firstDayOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      
      dateRangeStr = `${format(firstDayOfLastMonth, 'MMMM yyyy')}`;
    }
    
    // Generate recommendations and takeaways
    const recommendations = generateRecommendations(metrics, comparison);
    const takeaways = generateTakeaways(metrics, comparison);
    
    // Next steps suggestions from screenshots
    const nextSteps = [
      "Increase Adv+ Catalog spend by 15-20% since it's the best performing campaign",
      "Optimize Cold Conv - ABO campaigns for improved efficiency",
      "Consider ADV+ for automated scaling while maintaining manual ABO testing",
      "Test new hooks & CTAs to improve CTR (currently below 1%)",
      "A/B test different ad formats (carousel vs. video vs. static images)",
      "Use urgency-driven messaging (limited-time offers, bundle deals)"
    ];
    
    // Creative suggestions for ad campaigns
    const adCreativeSuggestions = [
      "Introduce new UGC content highlighting customer testimonials",
      "Create carousel ads featuring product benefits",
      "Develop video content demonstrating product in use",
      "Include eye-catching product lifestyle imagery",
      "Feature customer reviews directly in ad creative",
      "Try new hooks focusing on problem/solution framework"
    ];
    
    // Platform-specific revenue breakdown
    const metaRevenue = metrics.totalSales * 0.65; // 65% from Meta
    const shopifyRevenue = metrics.totalSales * 0.35; // 35% direct/organic
    
    // Platform-specific ad spend
    const metaAdSpend = metrics.adSpend * 0.85; // 85% on Meta
    const googleAdSpend = metrics.adSpend * 0.15; // 15% on Google
    
    // Multiple best performing campaigns
    const bestCampaigns = [
      {
        name: "Brez/Yordy - Adv+ Catalog",
        roas: 8.34,
        cpa: 7.81,
        ctr: 1.27,
        conversions: Math.round(metrics.newCustomers * 0.35),
        platform: "Meta"
      },
      {
        name: "Product Collection - Carousel",
        roas: 4.71,
        cpa: 12.35,
        ctr: 1.05,
        conversions: Math.round(metrics.newCustomers * 0.25),
        platform: "Meta"
      },
      {
        name: "Branded Search Campaign",
        roas: 6.89,
        cpa: 8.44,
        ctr: 3.52,
        conversions: Math.round(metrics.newCustomers * 0.15),
        platform: "Google"
      }
    ];
    
    // Multiple underperforming campaigns
    const underperformingCampaigns = [
      {
        name: "Brez/Yordy - New Strat - ABO",
        roas: 1.27,
        cpa: 47.56,
        ctr: 0.83,
        conversions: Math.round(metrics.newCustomers * 0.12),
        platform: "Meta"
      },
      {
        name: "Cold Traffic - Interest Targeting",
        roas: 0.88,
        cpa: 62.15,
        ctr: 0.64,
        conversions: Math.round(metrics.newCustomers * 0.08),
        platform: "Meta"
      },
      {
        name: "Display Network Awareness",
        roas: 0.52,
        cpa: 85.73,
        ctr: 0.31,
        conversions: Math.round(metrics.newCustomers * 0.05),
        platform: "Google"
      }
    ];
    
    // Create the report with simulated data
    const report: PerformanceReport = {
      dateRange: dateRangeStr,
      totalPurchases: metrics.ordersCount,
      totalAdSpend: metrics.adSpend,
      averageRoas: metrics.roas,
      revenueGenerated: metrics.totalSales,
      
      // Platform specific revenue and ad spend
      platformRevenue: {
        meta: metaRevenue,
        shopify: shopifyRevenue,
        google: googleAdSpend,
        organic: metrics.totalSales * 0.30 // 30% organic
      },
      platformAdSpend: {
        meta: metaAdSpend,
        google: googleAdSpend,
        total: metrics.adSpend
      },
      
      // Multiple best and underperforming campaigns
      bestCampaigns,
      underperformingCampaigns,
      
      // For backward compatibility
      bestCampaign: bestCampaigns[0],
      underperformingCampaign: underperformingCampaigns[0],
      
      bestAudience: {
        name: "Adv+ Catalog",
        roas: 8.34,
        cpa: 7.81
      },
      scalingOpportunities: [
        {
          name: "Cold Conv CBO campaigns",
          roas: 1.72
        }
      ],
      ctr: metrics.ctr,
      cpc: metrics.cpc,
      conversionRate: metrics.conversionRate,
      newCustomersAcquired: metrics.newCustomers,
      recommendations,
      takeaways,
      nextSteps,
      adCreativeSuggestions,
      audienceInsights: [
        {
          name: "Adv+ Catalog",
          performance: "Best Performing",
          roas: 8.34,
          cpa: 7.81,
          note: "This audience should receive additional budget allocation"
        },
        {
          name: "Cold Conv - ABO",
          performance: "Good",
          roas: 3.34,
          note: "Strong audience segment to optimize further"
        },
        {
          name: "New Strat ABO",
          performance: "Underperforming",
          roas: 1.27,
          cpa: 47.56,
          note: "Testing new creatives or audience segments may help"
        },
        {
          name: "Cold Interest-Based Audiences",
          performance: "Mixed",
          note: "Some converting well while others struggle with CPA above $37"
        }
      ],
      periodicMetrics: [
        { metric: "Total Ad Spend", value: metrics.adSpend.toFixed(2) },
        { metric: "Revenue Generated", value: metrics.totalSales.toFixed(2) },
        { metric: "ROAS (Return on Ad Spend)", value: metrics.roas.toFixed(2) },
        { metric: "Click Through Rate (CTR)", value: `${metrics.ctr.toFixed(2)}%` },
        { metric: "Cost Per Acquisition (CPA)", value: `$${(metrics.adSpend / metrics.newCustomers).toFixed(2)}` },
        { metric: "New Customers Acquired", value: metrics.newCustomers }
      ],
      periodComparison: comparison,
      clientName: "Yordy",
      preparedBy: "Carson Knutson",
      
      // Indicate that this report is AI-analyzed
      aiAnalyzed: true
    };
    
    return report;
  };

  if (isLoading) {
    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 mb-6">
        <h3 className="text-2xl md:text-3xl font-bold mb-4">{getGreeting()}, {userName}</h3>
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
        <div className="flex items-center space-x-4">
          <h3 className="text-2xl md:text-3xl font-bold">{getGreeting()}, {userName}</h3>
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isMinimized ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
        {!isMinimized && (
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
              Monthly
            </Button>
          </div>
        )}
      </div>

      {isMinimized ? (
        <p className="text-gray-400">Performance Review</p>
      ) : !hasEnoughData ? (
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
          <h4 className="text-xl font-bold mb-4">Monthly Performance Summary</h4>
          
          {/* Executive Summary Card */}
          <div className="bg-[#222] p-6 rounded-xl mb-6">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-semibold text-lg text-white">Performance Overview</h5>
              {monthlyReport.aiAnalyzed && (
                <div className="flex items-center text-xs text-gray-500">
                  <Sparkles className="h-3 w-3 mr-1 text-blue-400" />
                  AI-powered analysis
                </div>
              )}
            </div>
            
            {/* Comparison Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="p-3 bg-[#2A2A2A] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Revenue</p>
                <p className="text-xl font-semibold text-white">${monthlyReport.revenueGenerated.toFixed(0)}</p>
                {monthlyReport.periodComparison.salesGrowth !== 0 && (
                  <p className={`text-xs flex items-center ${monthlyReport.periodComparison.salesGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {monthlyReport.periodComparison.salesGrowth > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(monthlyReport.periodComparison.salesGrowth).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-3 bg-[#2A2A2A] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Ad Spend</p>
                <p className="text-xl font-semibold text-white">${monthlyReport.totalAdSpend.toFixed(0)}</p>
                <p className="text-xs text-gray-400">ROAS: {monthlyReport.averageRoas.toFixed(2)}x</p>
              </div>
              <div className="p-3 bg-[#2A2A2A] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Orders</p>
                <p className="text-xl font-semibold text-white">{monthlyReport.totalPurchases}</p>
                {monthlyReport.periodComparison.orderGrowth !== 0 && (
                  <p className={`text-xs flex items-center ${monthlyReport.periodComparison.orderGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {monthlyReport.periodComparison.orderGrowth > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(monthlyReport.periodComparison.orderGrowth).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-3 bg-[#2A2A2A] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Average ROAS</p>
                <p className="text-xl font-semibold text-white">{monthlyReport.averageRoas.toFixed(2)}x</p>
                {monthlyReport.periodComparison.roasGrowth !== 0 && (
                  <p className={`text-xs flex items-center ${monthlyReport.periodComparison.roasGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {monthlyReport.periodComparison.roasGrowth > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(monthlyReport.periodComparison.roasGrowth).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
            
            {/* AI Analysis Summary */}
            <div className="bg-[#2A2A2A]/50 p-4 rounded-xl mt-4 border border-blue-500/20">
              <div className="flex items-start mb-3">
                <Sparkles className="h-4 w-4 text-blue-400 mt-1 mr-2 flex-shrink-0" />
                <h6 className="text-sm font-medium text-blue-400">AI Performance Analysis</h6>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                During {getCurrentMonthName()}, your store generated ${monthlyReport.revenueGenerated.toFixed(0)} in total revenue across all connected platforms. 
                Performance analysis shows that Meta ads were the primary revenue driver at ${monthlyReport.platformRevenue.meta.toFixed(0)}, accounting for 
                {((monthlyReport.platformRevenue.meta / monthlyReport.revenueGenerated) * 100).toFixed(0)}% of your total sales. Your average ROAS across 
                all ad platforms is {monthlyReport.averageRoas.toFixed(2)}x, with top-performing campaigns significantly outperforming this average. 
                The "Brez/Yordy - Adv+ Catalog" campaign achieved the highest performance with 8.34x ROAS, while underperforming campaigns like 
                "Cold Traffic - Interest Targeting" delivered only 0.88x ROAS.
                
                Your customer acquisition cost is ${(monthlyReport.totalAdSpend / monthlyReport.newCustomersAcquired).toFixed(2)} per new customer, 
                which is {(monthlyReport.totalAdSpend / monthlyReport.newCustomersAcquired) > 30 ? "higher than industry average" : "within competitive range"} 
                for your vertical. Organic traffic generated ${monthlyReport.platformRevenue.organic?.toFixed(0) || "0"} in revenue, representing 
                {((monthlyReport.platformRevenue.organic || 0) / monthlyReport.revenueGenerated * 100).toFixed(0)}% of total sales, which suggests 
                {((monthlyReport.platformRevenue.organic || 0) / monthlyReport.revenueGenerated) > 0.25 ? "healthy brand awareness" : "opportunity to improve organic visibility"}.
                
                Inventory analysis shows consistent stock levels for your top-selling products, with the Premium Collection Bundle generating the highest 
                revenue share at 65% of total sales. Sales velocity patterns indicate peak performance during weekends, with Saturday showing 27% higher 
                conversion rates than weekdays. Your total ad spend of ${monthlyReport.totalAdSpend.toFixed(0)} represents 
                {((monthlyReport.totalAdSpend / monthlyReport.revenueGenerated) * 100).toFixed(0)}% of your revenue, which is 
                {(monthlyReport.totalAdSpend / monthlyReport.revenueGenerated) < 0.3 ? "efficient" : "higher than optimal"} for sustainable profitability.
                
                For personalized recommendations on how to optimize your marketing strategy, allocate budget more effectively, and improve underperforming 
                campaigns, visit the AI Intelligence page for comprehensive, data-driven insights tailored to your business objectives.
              </p>
            </div>
          </div>
          
          {/* Combined Revenue & Campaign Performance Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Revenue Breakdown */}
            <div>
              <h5 className="font-semibold mb-3 text-lg">Revenue Sources</h5>
              <div className="bg-[#222] p-5 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-white">Total Revenue: ${monthlyReport.revenueGenerated.toFixed(0)}</span>
                  <span className="text-xs text-gray-400">by platform</span>
                </div>
                
                {/* Revenue breakdown by platform */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Meta Ads</span>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-white">${monthlyReport.platformRevenue.meta.toFixed(0)}</span>
                        <span className="text-xs text-gray-400 ml-2">({((monthlyReport.platformRevenue.meta / monthlyReport.revenueGenerated) * 100).toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(monthlyReport.platformRevenue.meta / monthlyReport.revenueGenerated) * 100}%` }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Google Ads</span>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-white">${monthlyReport.platformRevenue.google?.toFixed(0) || "0"}</span>
                        <span className="text-xs text-gray-400 ml-2">({((monthlyReport.platformRevenue.google || 0) / monthlyReport.revenueGenerated * 100).toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${((monthlyReport.platformRevenue.google || 0) / monthlyReport.revenueGenerated) * 100}%` }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Organic</span>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-white">${monthlyReport.platformRevenue.organic?.toFixed(0) || "0"}</span>
                        <span className="text-xs text-gray-400 ml-2">({((monthlyReport.platformRevenue.organic || 0) / monthlyReport.revenueGenerated * 100).toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${((monthlyReport.platformRevenue.organic || 0) / monthlyReport.revenueGenerated) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
                
                {/* Ad Spend Summary */}
                <div className="mt-5 pt-4 border-t border-gray-800">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-white">Ad Spend</span>
                    <span className="text-sm font-medium text-white">${monthlyReport.totalAdSpend.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Meta: ${monthlyReport.platformAdSpend.meta.toFixed(0)} ({((monthlyReport.platformAdSpend.meta / monthlyReport.totalAdSpend) * 100).toFixed(0)}%)</span>
                    <span>Google: ${monthlyReport.platformAdSpend.google?.toFixed(0) || "0"} ({((monthlyReport.platformAdSpend.google || 0) / monthlyReport.totalAdSpend * 100).toFixed(0)}%)</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Campaign Performance */}
            <div>
              <h5 className="font-semibold mb-3 text-lg">Campaign Performance</h5>
              <div className="bg-[#222] p-5 rounded-xl">
                {/* Top Campaigns */}
                <h6 className="text-sm font-medium text-green-500 mb-3">Top Performers</h6>
                <div className="space-y-4 mb-5">
                  {monthlyReport.bestCampaigns.slice(0, 2).map((campaign, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <div>
                          <span className="text-sm font-medium text-white">{campaign.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-gray-700 rounded-md px-1 py-0.5 text-gray-300">{campaign.platform}</span>
                            {campaign.ctr && <span className="text-xs text-gray-400">CTR: {campaign.ctr.toFixed(2)}%</span>}
                          </div>
                        </div>
                        <span className="text-sm text-green-500 font-medium">ROAS: {campaign.roas.toFixed(2)}x</span>
                      </div>
                      <div className="w-full bg-gray-800 h-2 rounded-full mt-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, campaign.roas * 10)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Underperforming Campaigns */}
                <h6 className="text-sm font-medium text-red-500 mb-3">Needs Improvement</h6>
                <div className="space-y-4">
                  {monthlyReport.underperformingCampaigns.slice(0, 2).map((campaign, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <div>
                          <span className="text-sm font-medium text-white">{campaign.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-gray-700 rounded-md px-1 py-0.5 text-gray-300">{campaign.platform}</span>
                            {campaign.ctr && <span className="text-xs text-gray-400">CTR: {campaign.ctr.toFixed(2)}%</span>}
                          </div>
                        </div>
                        <span className="text-sm text-red-500 font-medium">ROAS: {campaign.roas.toFixed(2)}x</span>
                      </div>
                      <div className="w-full bg-gray-800 h-2 rounded-full mt-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, campaign.roas * 10)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Widgets Section - Matching the screenshot style */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Best Selling Products Widget */}
            <div>
              <h5 className="font-semibold mb-3 text-lg">Best Selling Products</h5>
              <div className="bg-[#222] p-5 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-white">Top Products</span>
                  <span className="text-xs text-gray-400">by revenue</span>
                </div>
                
                {/* Top Products List */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Premium Collection Bundle</span>
                      <span className="text-sm font-medium text-white">$10385</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `65%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>ROAS: 8.34x</span>
                      <span>65%</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Product Collection - Carousel</span>
                      <span className="text-sm font-medium text-white">$671</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `4%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>ROAS: 4.71x</span>
                      <span>4%</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Organic Sales</span>
                      <span className="text-sm font-medium text-white">$4793</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `30%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Direct Traffic</span>
                      <span>30%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Customer Acquisition Widget */}
            <div>
              <h5 className="font-semibold mb-3 text-lg">Customer Acquisition</h5>
              <div className="bg-[#222] p-5 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-white">Acquisition Sources</span>
                  <span className="text-xs text-gray-400">by platform</span>
                </div>
                
                {/* Acquisition Sources */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Brez/Yordy - Adv+ Catalog</span>
                      <span className="text-sm font-medium text-white">$3802</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `85%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Meta</span>
                      <span>85%</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Cold Traffic - Interest Targeting</span>
                      <span className="text-sm font-medium text-white">$671</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `15%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Google</span>
                      <span>15%</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">New Customer Metrics</span>
                    </div>
                    <div className="flex justify-between text-sm mt-3">
                      <div>
                        <p className="text-gray-400 text-xs">New Customers</p>
                        <p className="text-white font-medium">{monthlyReport.newCustomersAcquired}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Acquisition Cost</p>
                        <p className="text-white font-medium">${(monthlyReport.totalAdSpend / monthlyReport.newCustomersAcquired).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">ROAS</p>
                        <p className="text-white font-medium">{monthlyReport.averageRoas.toFixed(2)}x</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Simplified Next Steps & Recommendations Section */}
          <div>
            <h5 className="font-semibold mb-3 text-lg text-blue-400">Next Steps & Recommendations</h5>
            <div className="bg-[#222] p-5 rounded-xl text-center">
              <div className="mb-4">
                <Sparkles className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                <p className="text-gray-300 mb-1">View AI-powered recommendations to improve your marketing performance</p>
                <p className="text-xs text-gray-500">Based on your campaign data and performance trends</p>
              </div>
              <Link 
                href="/ai-dashboard" 
                className="inline-flex items-center justify-center px-5 py-2 text-sm font-medium text-white bg-blue-600/80 rounded-md hover:bg-blue-700 transition-colors"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                See AI-powered recommendations
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      ) : currentPeriod === 'daily' && dailyReport ? (
        <div>
          <h4 className="text-xl font-bold mb-4">Today's Performance</h4>
          
          {/* Combined Daily Metrics Card */}
          <div className="bg-[#222] p-5 rounded-xl mb-6">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-semibold text-lg text-white">Daily Overview</h5>
              {dailyReport.aiAnalyzed && (
                <div className="flex items-center text-xs text-gray-500">
                  <Sparkles className="h-3 w-3 mr-1 text-blue-400" />
                  AI-powered analysis
                </div>
              )}
            </div>
            
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="p-3 bg-[#2A2A2A] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Revenue</p>
                <p className="text-xl font-semibold text-white">${dailyReport.revenueGenerated.toFixed(0)}</p>
                {dailyReport.periodComparison.salesGrowth !== 0 && (
                  <p className={`text-xs flex items-center ${dailyReport.periodComparison.salesGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {dailyReport.periodComparison.salesGrowth > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(dailyReport.periodComparison.salesGrowth).toFixed(1)}% vs yesterday
                  </p>
                )}
              </div>
              <div className="p-3 bg-[#2A2A2A] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Orders</p>
                <p className="text-xl font-semibold text-white">{dailyReport.totalPurchases}</p>
                {dailyReport.periodComparison.orderGrowth !== 0 && (
                  <p className={`text-xs flex items-center ${dailyReport.periodComparison.orderGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {dailyReport.periodComparison.orderGrowth > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(dailyReport.periodComparison.orderGrowth).toFixed(1)}% vs yesterday
                  </p>
                )}
              </div>
              <div className="p-3 bg-[#2A2A2A] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Ad Spend</p>
                <p className="text-xl font-semibold text-white">${dailyReport.totalAdSpend.toFixed(0)}</p>
                <p className="text-xs text-gray-400">ROAS: {dailyReport.averageRoas.toFixed(2)}x</p>
              </div>
              <div className="p-3 bg-[#2A2A2A] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Average ROAS</p>
                <p className="text-xl font-semibold text-white">{dailyReport.averageRoas.toFixed(2)}x</p>
                {dailyReport.periodComparison.roasGrowth !== 0 && (
                  <p className={`text-xs flex items-center ${dailyReport.periodComparison.roasGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {dailyReport.periodComparison.roasGrowth > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(dailyReport.periodComparison.roasGrowth).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
            
            {/* AI Analysis Summary */}
            <div className="bg-[#2A2A2A]/50 p-4 rounded-xl mt-4 mb-5 border border-blue-500/20">
              <div className="flex items-start mb-3">
                <Sparkles className="h-4 w-4 text-blue-400 mt-1 mr-2 flex-shrink-0" />
                <h6 className="text-sm font-medium text-blue-400">AI Daily Performance Analysis</h6>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                Today's performance shows a ${dailyReport.revenueGenerated.toFixed(0)} revenue with 
                {dailyReport.periodComparison.salesGrowth > 0 ? ' a ' + Math.abs(dailyReport.periodComparison.salesGrowth).toFixed(1) + '% increase' : ' a ' + Math.abs(dailyReport.periodComparison.salesGrowth).toFixed(1) + '% decrease'} 
                compared to yesterday. You've processed {dailyReport.totalPurchases} orders today, with Meta ads generating 
                {((dailyReport.platformRevenue.meta / dailyReport.revenueGenerated) * 100).toFixed(0)}% of the revenue. 
                Your top campaign "{dailyReport.bestCampaigns?.[0]?.name || dailyReport.bestCampaign.name}" achieved a 
                {(dailyReport.bestCampaigns?.[0]?.roas || dailyReport.bestCampaign.roas).toFixed(2)}x ROAS, significantly outperforming 
                your ad spend average. Ad spend efficiency is {dailyReport.averageRoas > 2 ? 'strong' : 'needing optimization'} with an overall ROAS of 
                {dailyReport.averageRoas.toFixed(2)}x. The "{dailyReport.underperformingCampaigns?.[0]?.name || dailyReport.underperformingCampaign.name}" 
                campaign is underperforming at {(dailyReport.underperformingCampaigns?.[0]?.roas || dailyReport.underperformingCampaign.roas).toFixed(2)}x ROAS 
                and requires immediate attention to improve overall marketing efficiency.
              </p>
            </div>
          </div>
          
          {/* Simplified Next Steps & Recommendations Section */}
          <div>
            <h5 className="font-semibold mb-3 text-lg text-blue-400">Next Steps & Recommendations</h5>
            <div className="bg-[#222] p-5 rounded-xl text-center">
              <div className="mb-4">
                <Sparkles className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                <p className="text-gray-300 mb-1">View AI-powered recommendations to improve your marketing performance</p>
                <p className="text-xs text-gray-500">Based on your campaign data and performance trends</p>
              </div>
              <Link 
                href="/ai-dashboard" 
                className="inline-flex items-center justify-center px-5 py-2 text-sm font-medium text-white bg-blue-600/80 rounded-md hover:bg-blue-700 transition-colors"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                See AI-powered recommendations
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
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