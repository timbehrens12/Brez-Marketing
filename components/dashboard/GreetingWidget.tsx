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
        const weeklyDates = getPeriodDates('weekly')
        const monthlyDates = getPeriodDates('monthly')
        const previousMonthDates = getPreviousPeriodDates('monthly')
        
        // Generate simulated metrics for each period
        const todayMetrics = await fetchPeriodMetrics('simulation-id', dailyDates.from, dailyDates.to)
        const weekMetrics = await fetchPeriodMetrics('simulation-id', weeklyDates.from, weeklyDates.to)
        const monthMetrics = await fetchPeriodMetrics('simulation-id', monthlyDates.from, monthlyDates.to)
        const previousMonthMetrics = await fetchPeriodMetrics('simulation-id', previousMonthDates.from, previousMonthDates.to)
        
        // Update state with simulated metrics
        setPeriodData({
          today: todayMetrics,
          week: weekMetrics,
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
        
        const weeklyReportData = await generateSimulatedReport('weekly', weekMetrics, {
          salesGrowth: 8.3,
          orderGrowth: 6.7,
          customerGrowth: 5.2,
          roasGrowth: -1.5,
          conversionGrowth: 2.1
        });
        
        const monthlyReportData = await generateSimulatedReport('monthly', monthMetrics, {
          salesGrowth: 12.4,
          orderGrowth: 10.8,
          customerGrowth: 14.3,
          roasGrowth: 7.9,
          conversionGrowth: 6.2
        });
        
        if (dailyReportData) setDailyReport(dailyReportData);
        if (weeklyReportData) setWeeklyReport(weeklyReportData);
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
    } else if (period === 'weekly') {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      dateRangeStr = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      // For monthly, use a format like "Feb 11th - Mar 12th" to match screenshot
      const previousMonth = subMonths(now, 1);
      const monthStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 11);
      const monthEnd = new Date(now.getFullYear(), now.getMonth(), 12);
      dateRangeStr = `${format(monthStart, 'MMM d')} - ${format(monthEnd, 'MMM d')}`;
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
        <h3 className="text-2xl md:text-3xl font-bold">{getGreeting()}, {userName}</h3>
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
      
      {/* Subtitle showing synopsis */}
      <p className="text-gray-400 mb-6 text-lg">{synopsis}</p>
      
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
          {/* Report header with client info and prepared by */}
          <div className="mb-6 border-b border-gray-800 pb-4">
            <div className="flex items-center mb-1 text-blue-400">
              <span className="mr-3 text-gray-500">📊</span>
              <span>Reporting Period: {monthlyReport.dateRange}</span>
            </div>
            <div className="flex items-center mb-1 text-purple-400">
              <span className="mr-3 text-gray-500">👤</span>
              <span>Client Name: {monthlyReport.clientName}</span>
            </div>
            <div className="flex items-center text-gray-400">
              <span className="mr-3 text-gray-500">👨‍💻</span>
              <span>Prepared By: {monthlyReport.preparedBy}</span>
            </div>
          </div>
          
          <h4 className="text-xl font-bold mb-4">Executive Summary</h4>
          <p className="text-gray-400 mb-6">
            Over the last 30 days, we generated {monthlyReport.totalPurchases} total purchases across various campaigns, with an 
            average ROAS of {monthlyReport.averageRoas.toFixed(2)}x and a total ad spend of ${monthlyReport.totalAdSpend.toFixed(2)}.
          </p>
          
          <div className="mb-6">
            <h5 className="font-medium mb-3 text-lg">Key takeaways:</h5>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-green-500 font-medium mr-2">✓</span>
                <div>
                  <span className="font-medium">Best Performing Campaign:</span> {monthlyReport.bestCampaign.name} (ROAS {monthlyReport.bestCampaign.roas.toFixed(2)}x, CPA ${monthlyReport.bestCampaign.cpa.toFixed(2)})
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 font-medium mr-2">⚠</span>
                <div>
                  <span className="font-medium">Underperforming Campaign:</span> {monthlyReport.underperformingCampaign.name} (ROAS {monthlyReport.underperformingCampaign.roas.toFixed(2)}x, CPA ${monthlyReport.underperformingCampaign.cpa.toFixed(2)})
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 font-medium mr-2">→</span>
                <div>
                  <span className="font-medium">Scaling Opportunity:</span> {monthlyReport.scalingOpportunities[0].name} are performing at a {monthlyReport.scalingOpportunities[0].roas.toFixed(2)}x ROAS, indicating room for optimization
                </div>
              </li>
            </ul>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="font-medium mb-3 text-lg">Key Performance Metrics</h5>
              <div className="bg-[#222] p-4 rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-gray-400 pb-2">Metric</th>
                      <th className="text-right text-gray-400 pb-2">This Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 border-t border-gray-800">Total Ad Spend</td>
                      <td className="py-2 border-t border-gray-800 text-right">${monthlyReport.totalAdSpend.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 border-t border-gray-800">Revenue Generated</td>
                      <td className="py-2 border-t border-gray-800 text-right">${monthlyReport.revenueGenerated.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 border-t border-gray-800">ROAS (Return on Ad Spend)</td>
                      <td className="py-2 border-t border-gray-800 text-right">{monthlyReport.averageRoas.toFixed(2)}x</td>
                    </tr>
                    <tr>
                      <td className="py-2 border-t border-gray-800">Click Through Rate (CTR)</td>
                      <td className="py-2 border-t border-gray-800 text-right">{monthlyReport.ctr.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td className="py-2 border-t border-gray-800">Cost Per Acquisition (CPA)</td>
                      <td className="py-2 border-t border-gray-800 text-right">${(monthlyReport.totalAdSpend / monthlyReport.totalPurchases).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 border-t border-gray-800">New Customers Acquired</td>
                      <td className="py-2 border-t border-gray-800 text-right">{monthlyReport.newCustomersAcquired}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium mb-3 text-lg">Audience Performance Insights</h5>
              <div className="bg-[#222] p-4 rounded-lg space-y-4">
                <div>
                  <h6 className="text-sm font-medium mb-2">Best Performing Audiences:</h6>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <div className="flex-1">
                        <span className="font-medium">{monthlyReport.audienceInsights[0].name}</span> has the highest ROAS ({monthlyReport.audienceInsights[0].roas}x) and lowest CPA (${monthlyReport.audienceInsights[0].cpa}). {monthlyReport.audienceInsights[0].note}
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <div className="flex-1">
                        <span className="font-medium">{monthlyReport.audienceInsights[1].name}</span> campaigns are performing decently with a {monthlyReport.audienceInsights[1].roas}x ROAS, {monthlyReport.audienceInsights[1].note}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h6 className="text-sm font-medium mb-2">Low-Performing Audiences:</h6>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <span className="text-red-500 mr-2">×</span>
                      <div className="flex-1">
                        <span className="font-medium">{monthlyReport.audienceInsights[2].name}</span> campaigns have a high CPA (${monthlyReport.audienceInsights[2].cpa}) and low ROAS ({monthlyReport.audienceInsights[2].roas}x). {monthlyReport.audienceInsights[2].note}
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="text-yellow-500 mr-2">!</span>
                      <div className="flex-1">
                        <span className="font-medium">{monthlyReport.audienceInsights[3].name}</span> are mixed, with {monthlyReport.audienceInsights[3].note}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h5 className="font-medium mb-3 text-lg">Overall Client Impact & ROI</h5>
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="text-blue-400 mr-2">📊</span>
                <div>
                  <span className="font-medium">Total Revenue Generated:</span> ${monthlyReport.revenueGenerated.toFixed(2)}
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-green-400 mr-2">🏆</span>
                <div>
                  <span className="font-medium">Biggest Win:</span> {monthlyReport.bestCampaign.name} campaign dominating at {monthlyReport.bestCampaign.roas.toFixed(2)}x ROAS with the lowest CPA
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-red-400 mr-2">⚠</span>
                <div>
                  <span className="font-medium">Biggest Challenge:</span> High CPA in {monthlyReport.underperformingCampaign.name} and low CTR (&lt;1%) across campaigns, indicating a need for better hooks and creative testing
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="font-medium mb-3 text-lg text-blue-400">Next Steps & Recommendations</h5>
            <div className="space-y-4">
              <div>
                <h6 className="font-medium mb-2">Scaling Plan:</h6>
                <ul className="space-y-2">
                  {monthlyReport.nextSteps.slice(0, 3).map((step, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span className="text-gray-300">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h6 className="font-medium mb-2">Creative Direction:</h6>
                <ul className="space-y-2">
                  {monthlyReport.nextSteps.slice(3, 6).map((step, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span className="text-gray-300">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h6 className="font-medium mb-2">Additional Growth Strategies:</h6>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">Implement retargeting campaigns for users who didn't convert</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">Build Lookalike Audiences (1%) of past customers to expand reach</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">Utilize email/SMS marketing to boost conversion rates</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : currentPeriod === 'weekly' && weeklyReport ? (
        <div>
          <h4 className="font-medium text-lg mb-2">Weekly Performance Review</h4>
          <p className="text-gray-400 mb-4">
            Here's how your store performed in the last 7 days compared to the previous week.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Ad Spend ROI</h5>
              <p className="text-2xl font-semibold">{weeklyReport.averageRoas.toFixed(1)}x</p>
              {weeklyReport.periodComparison.roasGrowth !== 0 && (
                <p className={`text-sm ${weeklyReport.periodComparison.roasGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {weeklyReport.periodComparison.roasGrowth > 0 ? '↑' : '↓'} {Math.abs(weeklyReport.periodComparison.roasGrowth).toFixed(1)}% from previous week
                </p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="font-medium mb-3">Campaign Performance</h5>
              
              <div className="bg-[#222] p-4 rounded-lg space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Summer Collection</span>
                    <span className="text-sm text-green-500">ROAS: 3.2x</span>
                  </div>
                  <div className="w-full bg-gray-700 h-2 rounded-full">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Retargeting - Abandoned Cart</span>
                    <span className="text-sm text-green-500">ROAS: 2.8x</span>
                  </div>
                  <div className="w-full bg-gray-700 h-2 rounded-full">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '73%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Google Search - Brand Terms</span>
                    <span className="text-sm text-green-500">ROAS: 2.1x</span>
                  </div>
                  <div className="w-full bg-gray-700 h-2 rounded-full">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Google Search - Non-Brand</span>
                    <span className="text-sm text-red-500">ROAS: 0.9x</span>
                  </div>
                  <div className="w-full bg-gray-700 h-2 rounded-full">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium mb-3">Key Takeaways</h5>
              <ul className="space-y-2 bg-[#222] p-4 rounded-lg h-[calc(100%-28px)]">
                {weeklyReport.takeaways.map((takeaway, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300 text-sm">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div>
            <h5 className="font-medium mb-3">Recommendations</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weeklyReport.recommendations.slice(0, 4).map((recommendation, index) => (
                <div key={index} className="bg-[#222] p-3 rounded-lg">
                  <div className="flex items-start">
                    <span className={`rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2 ${index < 2 ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {index + 1}
                    </span>
                    <span className="text-gray-300 text-sm">{recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : currentPeriod === 'daily' && dailyReport ? (
        <div>
          <h4 className="font-medium text-lg mb-2">Today's Performance</h4>
          <p className="text-gray-400 mb-4">
            Here's how your store is performing today compared to yesterday.
            <span className="text-yellow-400 ml-2">
              <span className="font-medium">Last updated:</span> {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              <h5 className="text-sm text-gray-400 mb-1">Live Metrics</h5>
              <div className="space-y-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span>Active Visitors:</span>
                  <span className="font-medium">24</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Carts Created:</span>
                  <span className="font-medium">8</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Ad Clicks Today:</span>
                  <span className="font-medium">143</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="font-medium mb-3">Hourly Breakdown</h5>
              <div className="bg-[#222] p-4 rounded-lg h-[200px] relative">
                {/* Simulated hourly chart */}
                <div className="absolute bottom-0 left-0 w-full h-[160px] flex items-end px-2">
                  {Array.from({length: 12}).map((_, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-6 bg-blue-500 rounded-t"
                        style={{
                          height: `${Math.max(4, Math.min(140, index === 5 ? 120 : index === 6 ? 95 : index === 7 ? 80 : index === 8 ? 105 : index % 3 === 0 ? 50 : 30 + Math.random() * 50))}px`
                        }}
                      ></div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(index + 9) % 12 === 0 ? '12' : (index + 9) % 12}{(index + 9) < 12 ? 'am' : 'pm'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute top-2 left-3 text-xs text-gray-400">
                  Revenue by hour
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium mb-3">Platform Activity</h5>
              <div className="bg-[#222] p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">Shopify</div>
                    <div className="text-xs text-gray-400">{dailyReport.totalPurchases} orders today</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatCurrency(dailyReport.revenueGenerated)}</div>
                    <div className="text-xs text-green-500">+{dailyReport.periodComparison.salesGrowth.toFixed(1)}%</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">Meta Ads</div>
                    <div className="text-xs text-gray-400">87 clicks today</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">$186.32 spent</div>
                    <div className="text-xs text-green-500">ROAS: 2.8x</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">Google Ads</div>
                    <div className="text-xs text-gray-400">56 clicks today</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">$134.78 spent</div>
                    <div className="text-xs text-red-500">ROAS: 1.9x</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <h5 className="font-medium mb-2">Today's Top Products</h5>
                <div className="bg-[#222] p-3 rounded-lg space-y-2">
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
            </div>
          </div>
          
          <div>
            <h5 className="font-medium mb-3">Real-Time Recommendations</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dailyReport.recommendations.slice(0, 4).map((recommendation, index) => (
                <div key={index} className="bg-[#222] p-3 rounded-lg">
                  <div className="flex items-start">
                    <span className="rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2 bg-blue-500/20 text-blue-400">
                      {index + 1}
                    </span>
                    <span className="text-gray-300 text-sm">{recommendation}</span>
                  </div>
                </div>
              ))}
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