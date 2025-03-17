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

interface CampaignPerformance {
  name: string
  roas: number
  cpa: number
  ctr: number
  conversions: number
  spend: number
}

interface AudiencePerformance {
  name: string
  roas: number
  cpa: number
  ctr?: number
  conversions?: number
  notes?: string
}

interface PerformanceReport {
  dateRange: string
  totalPurchases: number
  totalAdSpend: number
  averageRoas: number
  revenueGenerated: number
  bestCampaign: CampaignPerformance
  underperformingCampaign: CampaignPerformance
  scalingOpportunity: {
    campaign: string
    roas: number
    notes: string
  }
  audiencePerformance: {
    best: AudiencePerformance[]
    low: AudiencePerformance[]
  }
  budgetAllocation: {
    totalSpent: number
    recommendations: string[]
  }
  creativeDirection: {
    ctr: number
    recommendations: string[]
  }
  additionalStrategies: string[]
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
  const [currentReport, setCurrentReport] = useState<PerformanceReport | null>(null)

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
          name: "Brez/Yordy - Adv+ Catalog",
          roas: 8.34,
          cpa: 7.81,
          ctr: 1.27,
          conversions: 81,
          spend: 632.61
        },
        underperformingCampaign: {
          name: "Brez/Yordy - New Strat - ABO",
          roas: 1.27,
          cpa: 47.96,
          ctr: 0.83,
          conversions: 44,
          spend: 2110.24
        },
        scalingOpportunity: {
          campaign: "Cold Conv CBO",
          roas: 1.72,
          notes: "campaigns are performing at a 1.72X ROAS, indicating room for optimization"
        },
        audiencePerformance: {
          best: [
            {
              name: "Adv+ Catalog",
              roas: 8.34,
              cpa: 7.81,
              notes: "has the highest ROAS (8.34X) and lowest CPA ($7.81). This audience should receive additional budget allocation."
            },
            {
              name: "Cold Conv - ABO",
              roas: 3.34,
              cpa: 22.45,
              notes: "campaigns are performing decently with a 3.34X ROAS, indicating a strong audience segment to optimize further."
            }
          ],
          low: [
            {
              name: "New Strat ABO",
              roas: 1.27,
              cpa: 47.96,
              notes: "campaigns have a high CPA ($47.96) and low ROAS (1.27X). Testing new creatives or audience segments may help."
            },
            {
              name: "Cold Interest-Based Audiences",
              roas: 1.15,
              cpa: 37.00,
              notes: "are mixed, with some converting well while others struggle with CPA above $37"
            }
          ]
        },
        budgetAllocation: {
          totalSpent: currentMetrics.adSpend,
          recommendations: [
            "Increase Adv+ Catalog spend by 15-20% since it's the best-performing campaign",
            "Optimize Cold Conv - ABO campaigns for improved efficiency",
            "Consider ADV+ for automated scaling while maintaining manual ABO testing"
          ]
        },
        creativeDirection: {
          ctr: 0.85,
          recommendations: [
            "Test new hooks & CTAs to improve CTR (currently below 1%)",
            "A/B test different formats (carousel vs. video vs. static images)",
            "Use urgency-driven messaging (limited-time offers, bundle deals)"
          ]
        },
        additionalStrategies: [
          "Implement retargeting campaigns for users who didn't convert",
          "Build Lookalike Audiences (1%) of past customers to expand reach",
          "Utilize email/SMS marketing to boost conversion rates"
        ],
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
      setHasEnoughData(false)
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
    comparison: any
  ): Promise<PerformanceReport> => {
    const report = {
      dateRange: "Feb 11th - Mar 12th",
      totalPurchases: 447,
      totalAdSpend: 10137.03,
      averageRoas: 2.59,
      revenueGenerated: 26260.15,
      bestCampaign: {
        name: "Brez/Yordy - Adv+ Catalog",
        roas: 8.34,
        cpa: 7.81,
        ctr: 1.27,
        conversions: 81,
        spend: 632.61
      },
      underperformingCampaign: {
        name: "Brez/Yordy - New Strat - ABO",
        roas: 1.27,
        cpa: 47.96,
        ctr: 0.83,
        conversions: 44,
        spend: 2110.24
      },
      scalingOpportunity: {
        campaign: "Cold Conv CBO",
        roas: 1.72,
        notes: "campaigns are performing at a 1.72X ROAS, indicating room for optimization"
      },
      audiencePerformance: {
        best: [
          {
            name: "Adv+ Catalog",
            roas: 8.34,
            cpa: 7.81,
            notes: "has the highest ROAS (8.34X) and lowest CPA ($7.81). This audience should receive additional budget allocation."
          },
          {
            name: "Cold Conv - ABO",
            roas: 3.34,
            cpa: 22.45,
            notes: "campaigns are performing decently with a 3.34X ROAS, indicating a strong audience segment to optimize further."
          }
        ],
        low: [
          {
            name: "New Strat ABO",
            roas: 1.27,
            cpa: 47.96,
            notes: "campaigns have a high CPA ($47.96) and low ROAS (1.27X). Testing new creatives or audience segments may help."
          },
          {
            name: "Cold Interest-Based Audiences",
            roas: 1.15,
            cpa: 37.00,
            notes: "are mixed, with some converting well while others struggle with CPA above $37"
          }
        ]
      },
      budgetAllocation: {
        totalSpent: 10137.03,
        recommendations: [
          "Increase Adv+ Catalog spend by 15-20% since it's the best-performing campaign",
          "Optimize Cold Conv - ABO campaigns for improved efficiency",
          "Consider ADV+ for automated scaling while maintaining manual ABO testing"
        ]
      },
      creativeDirection: {
        ctr: 0.85,
        recommendations: [
          "Test new hooks & CTAs to improve CTR (currently below 1%)",
          "A/B test different formats (carousel vs. video vs. static images)",
          "Use urgency-driven messaging (limited-time offers, bundle deals)"
        ]
      },
      additionalStrategies: [
        "Implement retargeting campaigns for users who didn't convert",
        "Build Lookalike Audiences (1%) of past customers to expand reach",
        "Utilize email/SMS marketing to boost conversion rates"
      ],
      periodComparison: comparison
    }

    setCurrentReport(report);
    return report;
  }

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
    <div className="space-y-6 p-6">
      {/* Larger greeting text */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-white mb-2">
          {getGreeting()}, {brandName}
        </h1>
        <p className="text-gray-400 text-lg">
          Here's your {currentPeriod} performance report
        </p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {/* ... loading states ... */}
        </div>
      ) : !hasEnoughData ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          {/* ... insufficient data message ... */}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4">Executive Summary</h2>
            <p className="text-gray-300 mb-4">
              Over the last {currentPeriod === 'monthly' ? '30 days' : currentPeriod === 'weekly' ? '7 days' : '24 hours'}, 
              we generated {currentReport?.totalPurchases} total purchases across various campaigns, with an
              average ROAS of {currentReport?.averageRoas.toFixed(2)}x and a total ad spend of {formatCurrency(currentReport?.totalAdSpend || 0)}.
            </p>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Key takeaways:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>Best Performing Campaign: {currentReport?.bestCampaign.name} (ROAS {currentReport?.bestCampaign.roas}X, CPA ${currentReport?.bestCampaign.cpa})</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Underperforming Campaign: {currentReport?.underperformingCampaign.name} (ROAS {currentReport?.underperformingCampaign.roas}X, CPA ${currentReport?.underperformingCampaign.cpa})</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Scaling Opportunity: {currentReport?.scalingOpportunity.campaign} campaigns are performing at a {currentReport?.scalingOpportunity.roas}X ROAS, indicating room for optimization</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Key Performance Metrics */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4">Key Performance Metrics (Month-over-Month Comparison)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-2 text-gray-400">Total Ad Spend</td>
                      <td className="py-2 text-right">{formatCurrency(currentReport?.totalAdSpend || 0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-400">Revenue Generated</td>
                      <td className="py-2 text-right">{formatCurrency(currentReport?.revenueGenerated || 0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-400">ROAS (Return on Ad Spend)</td>
                      <td className="py-2 text-right">{currentReport?.averageRoas.toFixed(2)}X</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-2 text-gray-400">Click-Through Rate (CTR)</td>
                      <td className="py-2 text-right">
                        {currentReport?.creativeDirection?.ctr ? 
                          `${(currentReport.creativeDirection.ctr * 100).toFixed(2)}%` : 
                          '-'
                        }
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-400">Cost Per Acquisition (CPA)</td>
                      <td className="py-2 text-right">${currentReport?.bestCampaign.cpa.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-400">Conversion Rate</td>
                      <td className="py-2 text-right">
                        {currentReport?.totalPurchases ? 
                          `${((currentReport.totalPurchases / (currentReport.totalPurchases * 100)) * 100).toFixed(2)}%` : 
                          '-'
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Audience Performance Insights */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4">Audience Performance Insights</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Best Performing Audiences:</h3>
                <ul className="space-y-2 text-sm">
                  {currentReport?.audiencePerformance.best.map((audience, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-400">•</span>
                      <span>{audience.name} has the highest ROAS ({audience.roas}X) and lowest CPA (${audience.cpa}). {audience.notes}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Low-Performing Audiences:</h3>
                <ul className="space-y-2 text-sm">
                  {currentReport?.audiencePerformance.low.map((audience, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-400">•</span>
                      <span>{audience.name} campaigns have {audience.notes}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Next Steps & Recommendations */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4">Next Steps & Recommendations</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Scaling Plan:</h3>
                <ul className="space-y-2 text-sm">
                  {currentReport?.budgetAllocation.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Creative Direction:</h3>
                <ul className="space-y-2 text-sm">
                  {currentReport?.creativeDirection.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-purple-400">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Additional Growth Strategies:</h3>
                <ul className="space-y-2 text-sm">
                  {currentReport?.additionalStrategies.map((strategy, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-yellow-400">•</span>
                      <span>{strategy}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 