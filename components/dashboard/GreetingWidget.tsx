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
        preparedBy: "Carson Knutson"
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
    
    // Create the report with simulated data
    const report: PerformanceReport = {
      dateRange: dateRangeStr,
      totalPurchases: metrics.ordersCount,
      totalAdSpend: metrics.adSpend,
      averageRoas: metrics.roas,
      revenueGenerated: metrics.totalSales,
      bestCampaign: {
        name: "Brez/Yordy - Adv+ Catalog",
        roas: 8.34,
        cpa: 7.81,
        ctr: 1.27,
        conversions: Math.round(metrics.newCustomers * 0.35)
      },
      underperformingCampaign: {
        name: "Brez/Yordy - New Strat - ABO",
        roas: 1.27,
        cpa: 47.56,
        ctr: 0.83,
        conversions: Math.round(metrics.newCustomers * 0.15)
      },
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
      preparedBy: "Carson Knutson"
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
          <h4 className="text-xl font-bold mb-4">Monthly Performance Overview</h4>
          
          {/* Executive Summary */}
          <div className="bg-[#222] p-6 rounded-xl mb-6">
            <h5 className="font-semibold text-lg mb-3 text-white">Executive Summary</h5>
            <p className="text-gray-300 mb-4">
              Over the last 30 days, we generated <span className="font-semibold text-white">{monthlyReport.totalPurchases} total purchases</span> across various campaigns, with an 
              average ROAS of <span className="font-semibold text-white">{monthlyReport.averageRoas.toFixed(2)}x</span> and a total ad spend of <span className="font-semibold text-white">${monthlyReport.totalAdSpend.toFixed(2)}</span>.
            </p>
            
            {/* Key Takeaways Section */}
            <div className="space-y-3 mt-4">
              <h6 className="font-semibold text-gray-200">Key takeaways:</h6>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <span className="font-medium text-white">Best Performing Campaign:</span> {monthlyReport.bestCampaign.name} (ROAS {monthlyReport.bestCampaign.roas.toFixed(2)}x, CPA ${monthlyReport.bestCampaign.cpa.toFixed(2)})
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center mr-3">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <span className="font-medium text-white">Underperforming Campaign:</span> {monthlyReport.underperformingCampaign.name} (ROAS {monthlyReport.underperformingCampaign.roas.toFixed(2)}x, CPA ${monthlyReport.underperformingCampaign.cpa.toFixed(2)})
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <span className="font-medium text-white">Scaling Opportunity:</span> {monthlyReport.scalingOpportunities[0].name} are performing at a {monthlyReport.scalingOpportunities[0].roas.toFixed(2)}x ROAS, indicating room for optimization
                </div>
              </div>
            </div>
          </div>
          
          {/* Performance Metrics Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="font-semibold mb-3 text-lg">Key Performance Metrics</h5>
              <div className="bg-[#222] p-5 rounded-xl">
                <div className="grid grid-cols-2 gap-4">
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
                  </div>
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">ROAS</p>
                    <p className="text-xl font-semibold text-white">{monthlyReport.averageRoas.toFixed(2)}x</p>
                    {monthlyReport.periodComparison.roasGrowth !== 0 && (
                      <p className={`text-xs flex items-center ${monthlyReport.periodComparison.roasGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {monthlyReport.periodComparison.roasGrowth > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {Math.abs(monthlyReport.periodComparison.roasGrowth).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">CTR</p>
                    <p className="text-xl font-semibold text-white">{monthlyReport.ctr.toFixed(2)}%</p>
                  </div>
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">CPA</p>
                    <p className="text-xl font-semibold text-white">${(monthlyReport.totalAdSpend / monthlyReport.totalPurchases).toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">New Customers</p>
                    <p className="text-xl font-semibold text-white">{monthlyReport.newCustomersAcquired}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Campaign Performance Insights */}
            <div>
              <h5 className="font-semibold mb-3 text-lg">Campaign Performance</h5>
              <div className="bg-[#222] p-5 rounded-xl space-y-5">
                <div>
                  <div className="flex justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-white">{monthlyReport.bestCampaign.name}</span>
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-gray-400 mr-2">CPA: ${monthlyReport.bestCampaign.cpa.toFixed(2)}</span>
                        <span className="text-xs text-gray-400">CTR: {monthlyReport.bestCampaign.ctr?.toFixed(2)}%</span>
                      </div>
                    </div>
                    <span className="text-sm text-green-500 font-medium">ROAS: {monthlyReport.bestCampaign.roas.toFixed(2)}x</span>
                  </div>
                  <div className="w-full bg-gray-800 h-2 rounded-full mt-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-white">{monthlyReport.underperformingCampaign.name}</span>
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-gray-400 mr-2">CPA: ${monthlyReport.underperformingCampaign.cpa.toFixed(2)}</span>
                        <span className="text-xs text-gray-400">CTR: {monthlyReport.underperformingCampaign.ctr?.toFixed(2)}%</span>
                      </div>
                    </div>
                    <span className="text-sm text-red-500 font-medium">ROAS: {monthlyReport.underperformingCampaign.roas.toFixed(2)}x</span>
                  </div>
                  <div className="w-full bg-gray-800 h-2 rounded-full mt-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Audience Insights Section */}
          <div className="mb-6">
            <h5 className="font-semibold mb-3 text-lg">Audience Performance Insights</h5>
            <div className="bg-[#222] p-5 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <h6 className="text-sm font-medium text-gray-200 mb-3">Best Performing Audiences</h6>
                  <div className="space-y-4">
                    <div className="p-3 bg-[#2A2A2A] rounded-lg">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-white">{monthlyReport.audienceInsights[0].name}</span>
                        <span className="text-green-500 text-sm">ROAS: {monthlyReport.audienceInsights[0].roas}x</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">CPA: ${monthlyReport.audienceInsights[0].cpa}</p>
                      <p className="text-xs text-gray-400 mt-1">{monthlyReport.audienceInsights[0].note}</p>
                    </div>
                    <div className="p-3 bg-[#2A2A2A] rounded-lg">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-white">{monthlyReport.audienceInsights[1].name}</span>
                        <span className="text-blue-500 text-sm">ROAS: {monthlyReport.audienceInsights[1].roas}x</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{monthlyReport.audienceInsights[1].note}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h6 className="text-sm font-medium text-gray-200 mb-3">Low-Performing Audiences</h6>
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-white">{monthlyReport.audienceInsights[2].name}</span>
                      <span className="text-red-500 text-sm">ROAS: {monthlyReport.audienceInsights[2].roas}x</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">CPA: ${monthlyReport.audienceInsights[2].cpa}</p>
                    <p className="text-xs text-gray-400 mt-1">{monthlyReport.audienceInsights[2].note}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Revenue Breakdown Section */}
          <div className="mb-6">
            <h5 className="font-semibold mb-3 text-lg">Revenue & Ad Performance by Platform</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#222] p-5 rounded-xl">
                <h6 className="text-sm font-medium text-gray-200 mb-3">Meta Ads Performance</h6>
                <div className="space-y-4">
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">Revenue Generated</span>
                      <span className="text-sm font-medium text-white">${(monthlyReport.revenueGenerated * 0.65).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">Ad Spend</span>
                      <span className="text-sm font-medium text-white">${(monthlyReport.totalAdSpend * 0.7).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">ROAS</span>
                      <span className="text-sm font-medium text-green-400">{(monthlyReport.averageRoas * 1.1).toFixed(2)}x</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#222] p-5 rounded-xl">
                <h6 className="text-sm font-medium text-gray-200 mb-3">Google Ads Performance</h6>
                <div className="space-y-4">
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">Revenue Generated</span>
                      <span className="text-sm font-medium text-white">${(monthlyReport.revenueGenerated * 0.35).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">Ad Spend</span>
                      <span className="text-sm font-medium text-white">${(monthlyReport.totalAdSpend * 0.3).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">ROAS</span>
                      <span className="text-sm font-medium text-yellow-400">{(monthlyReport.averageRoas * 0.9).toFixed(2)}x</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Client Impact Section with Multiple Wins/Challenges */}
          <div className="mb-6">
            <h5 className="font-semibold mb-3 text-lg">Performance Highlights</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#222] p-5 rounded-xl">
                <h6 className="text-sm font-medium text-gray-200 mb-3 flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                  Top Performing Areas
                </h6>
                <div className="space-y-3">
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-2">
                        <span className="text-green-400">🏆</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{monthlyReport.bestCampaign.name}</p>
                        <p className="text-xs text-gray-400">ROAS: {monthlyReport.bestCampaign.roas.toFixed(2)}x</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-2">
                        <span className="text-green-400">📈</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">High CTR Campaigns</p>
                        <p className="text-xs text-gray-400">CTR: {(monthlyReport.ctr * 1.2).toFixed(2)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#222] p-5 rounded-xl">
                <h6 className="text-sm font-medium text-gray-200 mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-amber-400" />
                  Areas for Improvement
                </h6>
                <div className="space-y-3">
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mr-2">
                        <span className="text-red-400">⚠</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{monthlyReport.underperformingCampaign.name}</p>
                        <p className="text-xs text-gray-400">ROAS: {monthlyReport.underperformingCampaign.roas.toFixed(2)}x</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mr-2">
                        <span className="text-red-400">📉</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Low Converting Audiences</p>
                        <p className="text-xs text-gray-400">Conv. Rate: {(monthlyReport.conversionRate * 0.7).toFixed(2)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recommendations Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h5 className="font-semibold text-lg text-blue-400">Next Steps & Recommendations</h5>
              <Link href="/ai-dashboard" className="text-sm text-blue-400 hover:text-blue-300 flex items-center">
                See Full Analysis <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="bg-[#222] p-5 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <h6 className="font-medium mb-3 text-white flex items-center">
                    <TrendingUp className="h-4 w-4 text-blue-400 mr-2" />
                    Scaling Plan
                  </h6>
                  <ul className="space-y-3">
                    {monthlyReport.nextSteps.slice(0, 3).map((step, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-blue-400 mr-2">•</span>
                        <span className="text-gray-300">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h6 className="font-medium mb-3 text-white flex items-center">
                    <Sparkles className="h-4 w-4 text-blue-400 mr-2" />
                    Creative Direction
                  </h6>
                  <ul className="space-y-3">
                    {monthlyReport.adCreativeSuggestions.slice(0, 3).map((step, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-blue-400 mr-2">•</span>
                        <span className="text-gray-300">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h6 className="font-medium mb-3 text-white flex items-center">
                    <ArrowRight className="h-4 w-4 text-blue-400 mr-2" />
                    Growth Strategies
                  </h6>
                  <ul className="space-y-3">
                    {monthlyReport.nextSteps.slice(3, 6).map((step, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-blue-400 mr-2">•</span>
                        <span className="text-gray-300">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : currentPeriod === 'daily' && dailyReport ? (
        <div>
          <h4 className="text-xl font-bold mb-4">Today's Performance</h4>
          <p className="text-gray-400 mb-4">
            Here's how your store is performing today compared to yesterday.
            <span className="text-yellow-400 ml-2">
              <span className="font-medium">Last updated:</span> {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Today's Revenue</h5>
              <p className="text-2xl font-semibold">{formatCurrency(dailyReport.revenueGenerated)}</p>
              {dailyReport.periodComparison.salesGrowth !== 0 && (
                <p className={`text-sm ${dailyReport.periodComparison.salesGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {dailyReport.periodComparison.salesGrowth > 0 ? '↑' : '↓'} {Math.abs(dailyReport.periodComparison.salesGrowth).toFixed(1)}% vs yesterday
                </p>
              )}
            </div>
            
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Orders Today</h5>
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
              <h5 className="text-sm text-gray-400 mb-1">Ad Performance</h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">ROAS:</span>
                  <span className="text-sm font-medium">{dailyReport.averageRoas.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">CTR:</span>
                  <span className="text-sm font-medium">{dailyReport.ctr.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">CPA:</span>
                  <span className="text-sm font-medium">${(dailyReport.totalAdSpend / dailyReport.totalPurchases).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="font-medium mb-3 text-lg">Campaign Performance Today</h5>
              <div className="bg-[#222] p-4 rounded-lg space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{dailyReport.bestCampaign.name}</span>
                    <span className="text-sm text-green-500">ROAS: {dailyReport.bestCampaign.roas.toFixed(2)}x</span>
                  </div>
                  <div className="w-full bg-gray-700 h-2 rounded-full">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{dailyReport.underperformingCampaign.name}</span>
                    <span className="text-sm text-red-500">ROAS: {dailyReport.underperformingCampaign.roas.toFixed(2)}x</span>
                  </div>
                  <div className="w-full bg-gray-700 h-2 rounded-full">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium mb-3 text-lg">Quick Actions</h5>
              <div className="bg-[#222] p-4 rounded-lg">
                <div className="space-y-3">
                  {dailyReport.recommendations.slice(0, 4).map((recommendation, index) => (
                    <div key={index} className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span className="text-sm text-gray-300">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="font-medium mb-3 text-lg text-blue-400">Today's Highlights</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#222] p-4 rounded-lg">
                <h6 className="text-sm font-medium mb-2">Top Performing Products</h6>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Summer T-Shirt Collection</span>
                    <span>8 units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Beach Tote Bag</span>
                    <span>6 units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Sunglasses - Aviator</span>
                    <span>5 units</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#222] p-4 rounded-lg">
                <h6 className="text-sm font-medium mb-2">Key Metrics vs Yesterday</h6>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Conversion Rate</span>
                    <span className={dailyReport.periodComparison.conversionGrowth > 0 ? 'text-green-500' : 'text-red-500'}>
                      {dailyReport.periodComparison.conversionGrowth > 0 ? '↑' : '↓'} {Math.abs(dailyReport.periodComparison.conversionGrowth).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Average Order Value</span>
                    <span>${(dailyReport.revenueGenerated / dailyReport.totalPurchases).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Ad Spend</span>
                    <span>${dailyReport.totalAdSpend.toFixed(2)}</span>
                  </div>
                </div>
              </div>
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