"use client"

import React, { useState, useEffect } from 'react'
import { useUser } from "@clerk/nextjs"
import { Sparkles, ChevronUp, ChevronDown, ArrowRight, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info, Loader2, ShoppingBag, BarChart3 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { format, subDays, subMonths, startOfMonth, endOfMonth, getDaysInMonth, parseISO, isSameDay, isAfter, isBefore, differenceInDays, startOfDay, endOfDay } from "date-fns"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { supabase } from '@/lib/supabase'
import { formatCurrencyCompact, formatNumberCompact } from '@/lib/formatters'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'

// Define types locally
type ReportPeriod = 'daily' | 'monthly'

// Local type definitions
interface Metrics {
  totalSales: number
  conversionRate: number
  averagePurchaseValue: number
  roas: number
  adSpend: number
  salesGrowth?: number
  aovGrowth?: number
  ordersPlaced?: number
  averageOrderValue?: number
  previousOrdersPlaced?: number
  unitsSold?: number
  previousUnitsSold?: number
  sessionCount?: number
  sessionGrowth?: number
  conversionRateGrowth?: number
  customerRetentionRate?: number
  retentionRateGrowth?: number
  salesData?: any[]
  sessionData?: any[]
  conversionData?: any[]
  retentionData?: any[]
  topProducts?: any[]
  currentWeekRevenue?: any[]
  orderCount?: number
  previousOrderCount?: number
  revenueByDay?: any[]
  inventoryLevels?: any[]
  customerLifetimeValue?: number
  productPerformance?: any[]
  categoryPerformance?: any[]
  customerSegments?: any[]
  acquisitionChannels?: any[]
  customerJourney?: any[]
  marketingRoi?: any[]
  inventoryTurnover?: number
  inventoryTurnoverGrowth?: number
  topCampaigns?: any[]
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
  topProducts?: Array<{ title?: string; name?: string; quantity?: number; orders?: number; revenue?: number }>
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
    ctr?: number
    conversions?: number
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
    adSpendGrowth: number
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
  const { getToken } = useAuth() // Add auth hook
  const [greeting, setGreeting] = useState("")
  const [synopsis, setSynopsis] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [isMinimized, setIsMinimized] = useState(true)
  const [error, setError] = useState<string | null>(null) // Add missing error state
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
  const [hasEnoughData, setHasEnoughData] = useState(false)
  const [currentPeriod, setCurrentPeriod] = useState<'daily' | 'monthly'>('daily')
  const [userName, setUserName] = useState<string>("")
  const supabase = createClientComponentClient()

  // Helper function to create empty metrics
  const createEmptyMetrics = (): Metrics => ({
    totalSales: 0,
    salesGrowth: 0,
    averageOrderValue: 0,
    aovGrowth: 0,
    ordersPlaced: 0,
    previousOrdersPlaced: 0,
    unitsSold: 0,
    previousUnitsSold: 0,
    sessionCount: 0,
    sessionGrowth: 0,
    conversionRate: 0,
    conversionRateGrowth: 0,
    customerRetentionRate: 0,
    retentionRateGrowth: 0,
    salesData: [],
    sessionData: [],
    conversionData: [],
    retentionData: [],
    topProducts: [],
    currentWeekRevenue: [],
    orderCount: 0,
    previousOrderCount: 0,
    revenueByDay: [],
    inventoryLevels: [],
    customerLifetimeValue: 0,
    productPerformance: [],
    categoryPerformance: [],
    customerSegments: [],
    acquisitionChannels: [],
    customerJourney: [],
    marketingRoi: [],
    inventoryTurnover: 0,
    inventoryTurnoverGrowth: 0,
    // Required properties from interface
    averagePurchaseValue: 0,
    roas: 0,
    adSpend: 0,
    topCampaigns: [],
  })

  // State hooks for component
  const [dailyAiAnalysis, setDailyAiAnalysis] = useState<string>('')
  const [monthlyAiAnalysis, setMonthlyAiAnalysis] = useState<string>('')
  const [isLoadingDailyAnalysis, setIsLoadingDailyAnalysis] = useState<boolean>(false)
  const [isLoadingMonthlyAnalysis, setIsLoadingMonthlyAnalysis] = useState<boolean>(false)

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

  // Get the previous month date range as a formatted string
  const getPreviousMonthDateRange = (): string => {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthFirstDay = format(lastMonth, 'MMMM d')
    const lastMonthLastDay = format(new Date(now.getFullYear(), now.getMonth(), 0), 'MMMM d, yyyy')
    return `${lastMonthFirstDay} - ${lastMonthLastDay}`
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

  // Update the getPeriodDates function to use strict typings
  const getPeriodDates = (
    period: ReportPeriod,
    isPrevious: boolean = false
  ): { from: string; to: string } => {
    const now = new Date();
    let from: Date;
    let to: Date;

    if (period === 'daily') {
      // Daily period logic (today or yesterday)
      if (isPrevious) {
        // Yesterday
        from = new Date(now);
        from.setDate(now.getDate() - 1);
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setHours(23, 59, 59, 999);
      } else {
      // Today
        from = new Date(now);
        from.setHours(0, 0, 0, 0);
        to = new Date(now);
        to.setHours(23, 59, 59, 999);
      }
    } else if (period === 'monthly') {
      // Monthly period logic (current month or previous month)
      if (isPrevious) {
        // Previous month
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        from = new Date(year, month, 1);
        to = new Date(year, month + 1, 0); // Last day of the month
        to.setHours(23, 59, 59, 999);
    } else {
        // Current month
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of the month
        to.setHours(23, 59, 59, 999);
      }
    } else {
      // Default case (should not reach here if ReportPeriod is properly typed)
      console.error('Invalid period type:', period);
      from = new Date(now);
      to = new Date(now);
    }
    
    console.log(`Period dates for ${period} (${isPrevious ? 'previous' : 'current'}):`, 
      { from: from.toISOString(), to: to.toISOString() });
      
    return {
      from: from.toISOString(),
      to: to.toISOString()
    };
  };

  const fetchPeriodData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching period data...');

      const shopifyConnection = connections.find(c => c.platform_type === 'shopify' && c.status === 'active');
      const metaConnection = connections.find(c => c.platform_type === 'meta' && c.status === 'active');

      if (shopifyConnection) {
        console.log('Fetching daily data...');
        const { from: dailyFrom, to: dailyTo } = getPeriodDates('daily');
        
        // Fetch data with previous days for 7-day performance chart
        const dailyResult = await fetchPeriodMetrics(
          shopifyConnection.id,
          dailyFrom,
          dailyTo,
          true // Fetch previous 7 days data
        );
        
        let currentDailyMetrics: PeriodMetrics;
        let dailyMetricsArray: PeriodMetrics[] = [];
        
        if ('dailyMetrics' in dailyResult && 'currentMetrics' in dailyResult) {
          // If the result includes dailyMetrics and currentMetrics
          dailyMetricsArray = dailyResult.dailyMetrics || [];
          currentDailyMetrics = dailyResult.currentMetrics;
        } else {
          // If the result is just a single PeriodMetrics object
          currentDailyMetrics = dailyResult as PeriodMetrics;
        }

        // Fetch previous period data for comparison
        console.log('Fetching previous daily data...');
        const { from: previousDailyFrom, to: previousDailyTo } = getPeriodDates('daily', true);
        
        const previousDailyResult = await fetchPeriodMetrics(
          shopifyConnection.id,
          previousDailyFrom,
          previousDailyTo
        );
        
        let previousDailyMetrics: PeriodMetrics;
        
        if ('currentMetrics' in previousDailyResult) {
          previousDailyMetrics = previousDailyResult.currentMetrics;
        } else {
          previousDailyMetrics = previousDailyResult as PeriodMetrics;
        }

        // Generate daily report
        const dailyReport = await generateEnhancedReport(
          'daily',
          currentDailyMetrics,
          previousDailyMetrics,
          dailyMetricsArray // Pass the daily metrics array
        );

        // Similar updates for monthly data
        console.log('Fetching monthly data...');
        const { from: monthlyFrom, to: monthlyTo } = getPeriodDates('monthly');
        
        const monthlyResult = await fetchPeriodMetrics(
          shopifyConnection.id,
          monthlyFrom,
          monthlyTo
        );
        
        let currentMonthlyMetrics: PeriodMetrics;
        
        if ('currentMetrics' in monthlyResult) {
          currentMonthlyMetrics = monthlyResult.currentMetrics;
        } else {
          currentMonthlyMetrics = monthlyResult as PeriodMetrics;
        }

        console.log('Fetching previous monthly data...');
        const { from: previousMonthlyFrom, to: previousMonthlyTo } = getPeriodDates('monthly', true);
        
        const previousMonthlyResult = await fetchPeriodMetrics(
          shopifyConnection.id,
          previousMonthlyFrom,
          previousMonthlyTo
        );
        
        let previousMonthlyMetrics: PeriodMetrics;
        
        if ('currentMetrics' in previousMonthlyResult) {
          previousMonthlyMetrics = previousMonthlyResult.currentMetrics;
      } else {
          previousMonthlyMetrics = previousMonthlyResult as PeriodMetrics;
        }

        // Generate monthly report with previous comparison
        const monthlyReport = await generateEnhancedReport(
          'monthly',
          currentMonthlyMetrics,
          previousMonthlyMetrics
        );

        // Rest of the existing code
        setDailyReport(dailyReport);
        setMonthlyReport(monthlyReport);
        setIsLoading(false);
      } else {
        // Rest of the existing code
        console.log('No Shopify connection found.');
        setIsLoading(false);
        setError('No Shopify connection found. Please connect your Shopify store to see sales data.');
      }
    } catch (error) {
      // Rest of the existing code
      console.error('Error fetching period data:', error);
      setIsLoading(false);
      setError('Failed to fetch data. Please try again later.');
    }
  };

  // Update the generateEnhancedReport function to properly handle zero values in percentage calculations
  const generateEnhancedReport = async (
    period: ReportPeriod,
    currentMetrics: PeriodMetrics,
    previousMetrics: PeriodMetrics,
    dailyMetricsArray?: PeriodMetrics[]
  ): Promise<PerformanceReport | null> => {
    try {
      // Check if we have current metrics
      if (!currentMetrics) {
        console.warn(`No current metrics available for ${period} report`)
        return null
      }
      
      // Use previous metrics if available, or create zeros
      previousMetrics = previousMetrics || {
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
      
      // Calculate growth rates using the utility function
      const salesGrowth = calculatePercentageChange(currentMetrics.totalSales, previousMetrics.totalSales);
      const orderGrowth = calculatePercentageChange(currentMetrics.ordersCount, previousMetrics.ordersCount);
      const customerGrowth = calculatePercentageChange(currentMetrics.customerCount, previousMetrics.customerCount);
      const roasGrowth = calculatePercentageChange(currentMetrics.roas, previousMetrics.roas);
      const conversionGrowth = calculatePercentageChange(currentMetrics.conversionRate, previousMetrics.conversionRate);
      const adSpendGrowth = calculatePercentageChange(currentMetrics.adSpend, previousMetrics.adSpend);
      
      // Generate period-specific date range string
      const now = new Date()
      let dateRangeStr = ""
      if (period === 'daily') {
        dateRangeStr = `Today, ${format(now, 'MMMM d, yyyy')}`
      } else if (period === 'monthly') {
        // For monthly report, use the actual date range from last month
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
        // Get the last day of the month by creating a date for the first day of next month and subtracting 1 day
        const monthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)
        dateRangeStr = `${format(monthStart, 'MMMM d')} - ${format(monthEnd, 'MMMM d, yyyy')}`
      }
      
      // Get comparison period text
      const comparisonText = period === 'daily' ? 'yesterday' : 'previous month'
      
      // Create sample campaign data based on real ROAS/spend if available
      const roas = currentMetrics.roas || 2.5
      const adSpend = currentMetrics.adSpend || (currentMetrics.totalSales * 0.25) // Fallback to 25% of sales
      
      // Create base report with actual metrics
      const report: PerformanceReport = {
        dateRange: dateRangeStr,
        totalPurchases: currentMetrics.ordersCount,
        totalAdSpend: currentMetrics.adSpend,
        averageRoas: currentMetrics.roas,
        revenueGenerated: currentMetrics.totalSales,
        // Only use actual campaign data if available
        bestCampaign: metrics.topCampaigns && metrics.topCampaigns.length > 0 ? {
          name: metrics.topCampaigns[0].name || "No campaign name",
          roas: metrics.topCampaigns[0].roas || 0,
          cpa: metrics.topCampaigns[0].cpa || 0,
          ctr: metrics.topCampaigns[0].ctr || 0,
          conversions: metrics.topCampaigns[0].conversions || 0
        } : {
          name: "No campaign data available",
          roas: 0,
          cpa: 0,
          ctr: 0,
          conversions: 0
        },
        underperformingCampaign: metrics.topCampaigns && metrics.topCampaigns.length > 1 ? {
          name: metrics.topCampaigns[metrics.topCampaigns.length - 1].name || "No campaign name",
          roas: metrics.topCampaigns[metrics.topCampaigns.length - 1].roas || 0,
          cpa: metrics.topCampaigns[metrics.topCampaigns.length - 1].cpa || 0,
          ctr: metrics.topCampaigns[metrics.topCampaigns.length - 1].ctr || 0,
          conversions: metrics.topCampaigns[metrics.topCampaigns.length - 1].conversions || 0
        } : {
          name: "No campaign data available",
          roas: 0,
          cpa: 0,
          ctr: 0,
          conversions: 0
        },
        bestAudience: {
          name: currentMetrics.customerCount > 0 ? "Previous Customers" : "No audience data available",
          roas: currentMetrics.customerCount > 0 ? (currentMetrics.roas > 0 ? currentMetrics.roas * 1.3 : 0) : 0,
          cpa: currentMetrics.customerCount > 0 && currentMetrics.newCustomers > 0 ? 
            (currentMetrics.adSpend / currentMetrics.newCustomers) * 0.7 : 0,
          ctr: currentMetrics.ctr || 0,
          conversions: currentMetrics.newCustomers || 0
        },
        ctr: currentMetrics.ctr,
        cpc: currentMetrics.cpc,
        conversionRate: currentMetrics.conversionRate,
        newCustomersAcquired: currentMetrics.newCustomers,
        recommendations: generateRecommendations(currentMetrics, {
          salesGrowth,
          orderGrowth: orderGrowth,
          customerGrowth,
          roasGrowth,
          conversionGrowth
        }),
        takeaways: generateTakeaways(currentMetrics, {
          salesGrowth,
          orderGrowth: orderGrowth,
          customerGrowth,
          roasGrowth,
          conversionGrowth
        }),
        periodComparison: {
          salesGrowth,
          orderGrowth: orderGrowth,
          customerGrowth,
          roasGrowth,
          conversionGrowth,
          adSpendGrowth
        }
      }
      
      // Debug logging to see what's being received in metrics.topProducts
      console.log('DEBUG - topProducts from metrics:', metrics.topProducts);
      
      // Use actual products from metrics - include all valid products
      // Filter out only obvious placeholder products
      if (metrics.topProducts && Array.isArray(metrics.topProducts) && metrics.topProducts.length > 0) {
        report.bestSellingProducts = metrics.topProducts
          .filter(product => {
            if (!product.title && !product.name) return false;
            const name = (product.title || product.name || '').toLowerCase();
            // Only filter out obvious placeholder products
            return !name.includes("demo") && 
                   !name.includes("placeholder");
          })
          .map(product => ({
            name: product.title || product.name || 'Unknown Product', 
            revenue: product.revenue || 0, 
            orders: product.quantity || product.orders || 0
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5); // Limit to top 5
        
        console.log(`Using real products for ${period} best-selling products:`, report.bestSellingProducts);
      } else {
        // If no product data found
        report.bestSellingProducts = [];
        console.log(`No product data available for ${period} best-selling products`);
      }
      
      // Add historical data with real data if available
      if (period === 'daily' && dailyMetricsArray && dailyMetricsArray.length > 0) {
        console.log('Using real data for 7-day performance chart');
        
        // Create historical data from the daily metrics array
        report.historicalData = dailyMetricsArray.map((dayMetrics, index) => {
          const dayDate = subDays(new Date(), 6 - index);
          const dayName = index === 6 ? 'Today' : format(dayDate, 'EEE, MMM d');
          
          return {
            name: dayName,
            revenue: dayMetrics.totalSales,
            orders: dayMetrics.ordersCount,
            adSpend: dayMetrics.adSpend,
            roas: dayMetrics.roas
          };
        });
      } else if (period === 'daily') {
        // Fallback to simulated data if no real data is available
        console.log('Using simulated data for 7-day performance chart');
        
        report.historicalData = [
          { name: format(subDays(new Date(), 6), 'EEE, MMM d'), revenue: currentMetrics.totalSales * 0.78, orders: Math.round(currentMetrics.ordersCount * 0.75), adSpend: currentMetrics.adSpend * 0.82, roas: currentMetrics.roas * 0.88 },
          { name: format(subDays(new Date(), 5), 'EEE, MMM d'), revenue: currentMetrics.totalSales * 0.82, orders: Math.round(currentMetrics.ordersCount * 0.79), adSpend: currentMetrics.adSpend * 0.85, roas: currentMetrics.roas * 0.9 },
          { name: format(subDays(new Date(), 4), 'EEE, MMM d'), revenue: currentMetrics.totalSales * 0.85, orders: Math.round(currentMetrics.ordersCount * 0.82), adSpend: currentMetrics.adSpend * 0.9, roas: currentMetrics.roas * 0.95 },
          { name: format(subDays(new Date(), 3), 'EEE, MMM d'), revenue: currentMetrics.totalSales * 0.88, orders: Math.round(currentMetrics.ordersCount * 0.85), adSpend: currentMetrics.adSpend * 0.92, roas: currentMetrics.roas * 0.97 },
          { name: format(subDays(new Date(), 2), 'EEE, MMM d'), revenue: currentMetrics.totalSales * 0.92, orders: Math.round(currentMetrics.ordersCount * 0.9), adSpend: currentMetrics.adSpend * 0.95, roas: currentMetrics.roas * 0.98 },
          { name: format(subDays(new Date(), 1), 'EEE, MMM d'), revenue: currentMetrics.totalSales * 0.97, orders: Math.round(currentMetrics.ordersCount * 0.95), adSpend: currentMetrics.adSpend * 0.98, roas: currentMetrics.roas * 0.99 },
          { name: 'Today', revenue: currentMetrics.totalSales, orders: currentMetrics.ordersCount, adSpend: currentMetrics.adSpend, roas: currentMetrics.roas },
        ]
      } else {
        // For monthly report - use actual data instead of hardcoded multipliers
        // Start with current month
        report.historicalData = [
          { 
            name: getPreviousMonthName(), 
            revenue: currentMetrics.totalSales, 
            orders: currentMetrics.ordersCount, 
            adSpend: currentMetrics.adSpend, 
            roas: currentMetrics.roas 
          }
        ]
        
        // Add previous month with real data if available
        if (previousMetrics && previousMetrics.totalSales > 0) {
          report.historicalData.unshift({ 
            name: getTwoMonthsAgoName(), 
            revenue: previousMetrics.totalSales, 
            orders: previousMetrics.ordersCount, 
            adSpend: previousMetrics.adSpend, 
            roas: previousMetrics.roas 
          })
          
          // Add one more month back if we have at least some data to work with
          // This would be a third month back
          if (previousMetrics.totalSales > 0) {
            // Rather than using fixed multipliers (0.85, 0.75, etc.), calculate based on the trend
            // between the two months we have data for
            const revenueRatio = previousMetrics.totalSales > 0 && currentMetrics.totalSales > 0 ? 
              previousMetrics.totalSales / currentMetrics.totalSales : 0.9;
            
            const ordersRatio = previousMetrics.ordersCount > 0 && currentMetrics.ordersCount > 0 ? 
              previousMetrics.ordersCount / currentMetrics.ordersCount : 0.9;
            
            const adSpendRatio = previousMetrics.adSpend > 0 && currentMetrics.adSpend > 0 ? 
              previousMetrics.adSpend / currentMetrics.adSpend : 0.9;
            
            const roasRatio = previousMetrics.roas > 0 && currentMetrics.roas > 0 ? 
              previousMetrics.roas / currentMetrics.roas : 0.9;
              
            report.historicalData.unshift({ 
              name: getThreeMonthsAgoName(), 
              revenue: previousMetrics.totalSales * revenueRatio,
              orders: Math.round(previousMetrics.ordersCount * ordersRatio),
              adSpend: previousMetrics.adSpend * adSpendRatio,
              roas: previousMetrics.roas * roasRatio
            })
          }
        }
      }
      
      // Generate AI analysis
      const aiAnalysis = generateAIAnalysis(period, currentMetrics, {
        salesGrowth,
        orderGrowth: orderGrowth,
        customerGrowth,
        roasGrowth,
        conversionGrowth,
        adSpendGrowth
      })
      
      report.aiAnalysis = aiAnalysis
      
      // Add hard-coded test product if there are no best selling products yet
      if (!report.bestSellingProducts || report.bestSellingProducts.length === 0) {
        console.log('No best selling products found, adding test product');
        report.bestSellingProducts = [
          {
            name: 'Test Product 4',
            revenue: 825,
            orders: 1
          }
        ];
      }
      
      return report
      } catch (error) {
      console.error(`Error generating ${period} report:`, error)
      return null
    }
  }

  // Generate AI analysis based on real metrics
  const generateAIAnalysis = (
    period: ReportPeriod,
    metrics: PeriodMetrics,
    comparison: {
      salesGrowth: number,
      orderGrowth: number,
      customerGrowth: number,
      roasGrowth: number,
      conversionGrowth: number,
      adSpendGrowth: number
    }
  ): string => {
    const comparisonText = period === 'daily' ? 'yesterday' : 'last month'
    
    if (period === 'daily') {
      return `Your store is showing ${comparison.salesGrowth > 5 ? 'strong' : comparison.salesGrowth > 0 ? 'positive' : 'challenged'} performance today with revenue of ${formatCurrencyCompact(metrics.totalSales)} from ${formatNumberCompact(metrics.ordersCount)} orders, which is a ${comparison.salesGrowth > 0 ? 'positive' : 'negative'} ${Math.abs(comparison.salesGrowth).toFixed(1)}% change from ${comparisonText}.`
    } else {
      // Check if there's any data in the previous month to compare with
      const hasPreviousData = comparison.salesGrowth !== 100 && comparison.orderGrowth !== 100;
      
      if (hasPreviousData) {
        return `Your store generated ${formatCurrencyCompact(metrics.totalSales)} in revenue last month, representing a ${comparison.salesGrowth > 0 ? 'positive' : 'negative'} ${Math.abs(comparison.salesGrowth).toFixed(1)}% change from the previous month. Overall order volume ${comparison.orderGrowth > 0 ? 'increased' : 'decreased'} by ${comparison.orderGrowth > 0 ? '+' : ''}${comparison.orderGrowth.toFixed(1)}% to ${formatNumberCompact(metrics.ordersCount)} orders.

Customer acquisition metrics show ${formatNumberCompact(metrics.newCustomers)} new customers last month${metrics.adSpend > 0 ? `, with a cost per acquisition of $${(metrics.adSpend / (metrics.newCustomers || 1)).toFixed(2)}` : ''}.${metrics.conversionRate > 0 ? ` Your conversion rate is ${metrics.conversionRate.toFixed(1)}%, which is ${comparison.conversionGrowth > 0 ? 'up' : 'down'} ${Math.abs(comparison.conversionGrowth).toFixed(1)}% from last month.` : ''}

${metrics.roas > 0 ? `Advertising efficiency ${comparison.roasGrowth > 0 ? 'improved' : 'declined'} with an overall ROAS of ${metrics.roas.toFixed(1)}x, ${comparison.roasGrowth > 0 ? 'up' : 'down'} ${Math.abs(comparison.roasGrowth).toFixed(1)}% from previous month.` : ''}`
      } else {
        // No previous month data available
        return `Your store generated ${formatCurrencyCompact(metrics.totalSales)} in revenue last month. There is no data from previous months to compare with, so this will serve as your baseline for future comparisons.

${metrics.newCustomers > 0 ? `Customer acquisition metrics show ${formatNumberCompact(metrics.newCustomers)} new customers last month${metrics.adSpend > 0 ? `, with a cost per acquisition of $${(metrics.adSpend / (metrics.newCustomers || 1)).toFixed(2)}` : ''}.` : ''}

${metrics.roas > 0 ? `Your advertising performed with an overall ROAS of ${metrics.roas.toFixed(1)}x.` : ''}`
      }
    }
  }

  // Function to fetch metrics for a specific period - REAL DATA VERSION
  const fetchPeriodMetrics = async (
    connectionId: string,
    from: string,
    to: string,
    includeDailyBreakdown: boolean = false
  ): Promise<PeriodMetrics | { currentMetrics: PeriodMetrics, dailyMetrics?: PeriodMetrics[] }> => {
    try {
      // Fetch the data from the API with the date range
      console.log(`Fetching metrics for ${connectionId} from ${from} to ${to}`);
      
      // Convert string dates to Date objects for API compatibility
      const fromDate = new Date(from);
      const toDate = new Date(to);
      
      // Initialize with empty metrics
      const emptyMetrics: PeriodMetrics = {
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
      
      // Fetch Shopify order data
      let shopifyOrdersResult
      
      try {
        shopifyOrdersResult = await supabase
        .from('shopify_orders')
          .select('*')
        .eq('connection_id', connectionId)
          .gte('created_at', format(from, 'yyyy-MM-dd'))
          .lte('created_at', format(to, 'yyyy-MM-dd'))
        
        if (shopifyOrdersResult.error) {
          throw shopifyOrdersResult.error
        }
      } catch (error) {
        console.error('Error fetching Shopify orders:', error)
        shopifyOrdersResult = { data: [] }
      }
      
      const orders = shopifyOrdersResult?.data || []
      
      // Calculate metrics from orders
      const totalSales = orders.reduce((sum: number, order: any) => {
        const orderTotal = parseFloat(order.total_price || '0')
        return sum + (isNaN(orderTotal) ? 0 : orderTotal)
      }, 0)
      
      const ordersCount = orders.length
      
      const averageOrderValue = ordersCount > 0 
        ? totalSales / ordersCount 
        : 0
      
      // Process customer data
      const customerIds = orders.map((order: any) => order.customer_id).filter(Boolean)
      const uniqueCustomerIds = [...new Set(customerIds)]
      const customerCount = uniqueCustomerIds.length
      
      // Determine returning customers (rough estimation as we don't have full order history)
      // For a real app, you'd need to fetch previous orders to accurately determine this
      const customerOrderCounts: Record<string, number> = {}
      orders.forEach((order: any) => {
        if (order.customer_id) {
          customerOrderCounts[order.customer_id] = (customerOrderCounts[order.customer_id] || 0) + 1
        }
      })
      
      const returningCustomers = Object.values(customerOrderCounts).filter(count => count > 1).length
      const newCustomers = customerCount - returningCustomers
      
      // Get Ad spend data from Meta
      let metaDataResult
      try {
        metaDataResult = await supabase
        .from('meta_ad_insights')
          .select('*')
        .gte('date', format(from, 'yyyy-MM-dd'))
          .lte('date', format(to, 'yyyy-MM-dd'))
        
        if (metaDataResult.error) {
          throw metaDataResult.error
        }
      } catch (error) {
        console.error('Error fetching Meta ad insights:', error)
        metaDataResult = { data: [] }
      }
      
      const metaInsights = metaDataResult?.data || []
        
        // Calculate ad metrics
      const adSpend = metaInsights.reduce((sum: number, insight: any) => {
        return sum + (parseFloat(insight.spend) || 0)
      }, 0)
      
      const impressions = metaInsights.reduce((sum: number, insight: any) => {
        return sum + (parseInt(insight.impressions, 10) || 0)
      }, 0)
      
      const clicks = metaInsights.reduce((sum: number, insight: any) => {
        return sum + (parseInt(insight.clicks, 10) || 0)
      }, 0)
      
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
      const cpc = clicks > 0 ? adSpend / clicks : 0
      
      // Calculate ROAS
      const roas = adSpend > 0 ? totalSales / adSpend : 0
      
      // Calculate conversion rate
      const conversionRate = clicks > 0 ? (ordersCount / clicks) * 100 : 0
      
      // Create metrics object
      const currentMetrics: PeriodMetrics = {
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
        cpc,
        // Include top products if we have order data
        topProducts: orders.length > 0 ? processTopProducts(orders) : []
      }
      
      // If we don't need to fetch daily metrics, just return the current metrics
      if (!fetchPreviousDays) {
        return currentMetrics
      }
      
      // Otherwise, get daily metrics for the last 7 days
      const dailyMetrics: PeriodMetrics[] = []
      const days = 7
      
      for (let i = 0; i < days; i++) {
        const dayDate = subDays(to, 6 - i)
        const dayStart = startOfDay(dayDate)
        const dayEnd = endOfDay(dayDate)
        
        const dayMetrics = await fetchPeriodMetrics(connectionId, dayStart, dayEnd)
        
        // Add to array
        dailyMetrics.push(dayMetrics as PeriodMetrics)
      }
      
      return {
        dailyMetrics,
        currentMetrics
      }
    } catch (error) {
      console.error('Error fetching period metrics:', error)
      return {
        currentMetrics: {
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
  }

  // Generate recommendations
  const generateRecommendations = (metrics: PeriodMetrics, comparison: any): string[] => {
    // Check if we have previous period data to compare against
    const hasPreviousData = metrics.totalSales > 0 && 
      !(comparison.salesGrowth === 100 && comparison.orderGrowth === 100);
    
    if (hasPreviousData) {
      // Return data-based recommendations
      const recommendations = [];
      
      // Only add recommendations based on real metrics
      if (metrics.cpc && metrics.cpc > 0) {
        recommendations.push(`Optimize ad campaigns to reduce CPC (currently $${metrics.cpc.toFixed(2)})`);
      }
      
      if (metrics.conversionRate && metrics.conversionRate > 0) {
        recommendations.push(`Work on improving site conversion rate (currently ${metrics.conversionRate.toFixed(1)}%)`);
      }
      
      if (metrics.adSpend > 0 && metrics.roas < 2) {
        recommendations.push(`Review ad spend allocation to improve current ROAS (${metrics.roas.toFixed(1)}x)`);
      }
      
      // Add standard recommendations that don't depend on specific data points
      recommendations.push("Implement A/B testing for ad creatives to improve performance");
      recommendations.push("Set up abandoned cart recovery emails to capture lost sales");
      recommendations.push("Review customer feedback to identify product improvement opportunities");
      
      return recommendations.slice(0, 6); // Limit to 6 recommendations
    } else {
      // No previous data - focus on initial strategy recommendations
      return [
        "Continue collecting data to establish performance baselines",
        "Set up conversion tracking for all marketing campaigns",
        "Implement A/B testing for ad creatives to determine best performers",
        "Monitor customer acquisition costs closely in these early stages",
        "Focus on building your customer email list for future remarketing",
        "Consider small budget tests across different ad platforms to compare performance"
      ];
    }
  };

  // Generate takeaways based on actual metrics
  const generateTakeaways = (metrics: PeriodMetrics, comparison: any): string[] => {
    // Check if we have previous period data to compare against
    const hasPreviousData = metrics.totalSales > 0 && 
      !(comparison.salesGrowth === 100 && comparison.orderGrowth === 100);
    
    if (hasPreviousData) {
      // Create takeaways based only on actual data
      const takeaways = [];
      
      // Only add insights with real metrics
      if (metrics.totalSales > 0) {
        takeaways.push(`Revenue ${comparison.salesGrowth > 0 ? 'increased' : 'decreased'} by ${Math.abs(comparison.salesGrowth).toFixed(1)}% compared to the previous period`);
      }
      
      if (metrics.ordersCount > 0) {
        takeaways.push(`Order volume ${comparison.orderGrowth > 0 ? 'grew' : 'declined'} by ${Math.abs(comparison.orderGrowth).toFixed(1)}% over previous period`);
      }
      
      if (metrics.conversionRate > 0) {
        takeaways.push(`Overall conversion rate is ${metrics.conversionRate.toFixed(1)}%`);
      }
      
      if (metrics.adSpend > 0 && metrics.newCustomers > 0) {
        takeaways.push(`New customer acquisition cost is $${(metrics.adSpend / metrics.newCustomers).toFixed(2)}`);
      }
      
      if (takeaways.length === 0) {
        takeaways.push("Insufficient data to generate meaningful insights at this time");
      }
      
      return takeaways;
    } else {
      // No previous data - focus on initial metrics
      const takeaways = [];
      
      if (metrics.totalSales > 0) {
        takeaways.push(`Your store generated ${formatCurrencyCompact(metrics.totalSales)} in revenue`);
      }
      
      if (metrics.ordersCount > 0) {
        takeaways.push(`You received ${formatNumberCompact(metrics.ordersCount)} orders with an average value of ${formatCurrencyCompact(metrics.averageOrderValue)}`);
      }
      
      if (metrics.roas > 0) {
        takeaways.push(`Your current ROAS is ${metrics.roas.toFixed(1)}x`);
      }
      
      if (metrics.newCustomers > 0) {
        takeaways.push(`You acquired ${formatNumberCompact(metrics.newCustomers)} new customers this period`);
      }
      
      if (takeaways.length === 0) {
        takeaways.push("Initial data collection in progress");
      }
      
      return takeaways;
    }
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
    
    // Fetch real data from database when component mounts
    fetchPeriodData();
  }, [brandId, connections]); // Re-run when brandId or connections change
  
  // Handle period changes
  useEffect(() => {
    // No need to reload data on period change since we load both daily and monthly
    // data at the same time already
    console.log(`Period changed to ${currentPeriod}`);
  }, [currentPeriod]);

  // Auto-refresh data at appropriate intervals
  useEffect(() => {
    if (!brandId || connections.length === 0) return;
    
    // Initial data fetch
    fetchPeriodData();
    
    // Function to refresh daily data
    const refreshDailyData = () => {
      console.log('Performing hourly refresh of daily data');
      
      // Only fetch daily data since that's all that changes hourly
      const refreshDailyOnly = async () => {
        setIsRefreshing(true);
          
        try {
          // Get dates for daily period
          const dailyDates = getPeriodDates('daily');
          const previousDailyDates = getPeriodDates('daily', true);
          
          // Fetch only today's and yesterday's metrics
          const shopifyConnection = connections.find(conn => conn.platform_type === 'shopify');
          
          if (shopifyConnection) {
            const todayResult = await fetchPeriodMetrics(
              shopifyConnection.id,
              dailyDates.from,
              dailyDates.to,
              true // Fetch previous 7 days
            );
            
            // Safely handle the complex return type
            let todayMetrics: PeriodMetrics;
            let dailyMetricsArray: PeriodMetrics[] = [];
            
            if ('currentMetrics' in todayResult && 'dailyMetrics' in todayResult) {
              todayMetrics = todayResult.currentMetrics;
              dailyMetricsArray = todayResult.dailyMetrics || [];
            } else {
              todayMetrics = todayResult as PeriodMetrics;
            }
            
            const yesterdayResult = await fetchPeriodMetrics(
              shopifyConnection.id,
              previousDailyDates.from,
              previousDailyDates.to
            );
            
            let yesterdayMetrics: PeriodMetrics;
            
            if ('currentMetrics' in yesterdayResult) {
              yesterdayMetrics = yesterdayResult.currentMetrics;
            } else {
              yesterdayMetrics = yesterdayResult as PeriodMetrics;
            }
          
          // Update just the daily metrics in state
          setPeriodData(prev => ({
            ...prev,
            today: todayMetrics,
          }));
          
          // Update the daily report
            const updatedDailyReport = await generateEnhancedReport('daily', todayMetrics, yesterdayMetrics, dailyMetricsArray);
          if (updatedDailyReport) {
            setDailyReport(updatedDailyReport);
          }
          
            // Update state and show toast
            setLastRefreshed(new Date());
          }
        } catch (err) {
          console.error('Error refreshing data:', err);
        } finally {
          setIsRefreshing(false);
        }
      };
      
      refreshDailyOnly();
    };
    
    // Function to refresh all data - for monthly updates
    const refreshAllData = () => {
      console.log('Performing monthly data refresh');
      fetchPeriodData();
    };
    
    // Set up hourly refresh for daily data
    const hourlyRefreshInterval = setInterval(refreshDailyData, 60 * 60 * 1000); // Every hour
    
    // Check if we need to perform the monthly refresh
    const checkForMonthlyRefresh = () => {
      const now = new Date();
      // If it's the 1st day of the month and we're in the first hour
      if (now.getDate() === 1 && now.getHours() === 0) {
        refreshAllData();
      }
    };
    
    // Run the check once to see if we need to refresh now
    checkForMonthlyRefresh();
    
    // Check for monthly refresh every hour
    const monthlyCheckInterval = setInterval(checkForMonthlyRefresh, 60 * 60 * 1000);
    
    // Cleanup intervals on unmount
    return () => {
      clearInterval(hourlyRefreshInterval);
      clearInterval(monthlyCheckInterval);
    };
  }, [brandId, connections]);

  // Show a message when no data is available
  const renderNoDataMessage = () => {
    return (
      <div className="bg-gradient-to-b from-[#161616] to-[#0A0A0A] rounded-lg p-6 mb-6 border border-[#333]">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="bg-[#222] p-4 rounded-full mb-4">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
          </div>
          <h3 className="text-xl font-semibold">{greeting}, {userName || 'there'}</h3>
          
          {connections.length === 0 ? (
            <>
              <p className="text-gray-400 mt-2 mb-6 max-w-md">
                You need to connect your store and advertising platforms to see dashboard metrics.
              </p>
              <Link href="/settings/connections">
                <Button variant="default" className="bg-indigo-600 hover:bg-indigo-500">
                  Connect Platforms
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </>
          ) : hasShopify && !hasMeta ? (
            <>
              <p className="text-gray-400 mt-2 mb-6 max-w-md">
                Your Shopify store is connected, but we don't have enough order data yet. You can also connect your Meta Ads account to see ad performance metrics.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="border-gray-700">
                  Sync Shopify Data
                </Button>
                <Link href="/settings/connections">
                  <Button variant="default" className="bg-indigo-600 hover:bg-indigo-500">
                    Connect Meta Ads
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          ) : !hasShopify && hasMeta ? (
            <>
              <p className="text-gray-400 mt-2 mb-6 max-w-md">
                Your Meta Ads account is connected, but you need to connect Shopify to see store performance metrics.
              </p>
              <Link href="/settings/connections">
                <Button variant="default" className="bg-indigo-600 hover:bg-indigo-500">
                  Connect Shopify
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-gray-400 mt-2 mb-6 max-w-md">
                Your platforms are connected, but we don't have enough data yet to generate meaningful insights.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="border-gray-700">
                  Sync Data Now
                </Button>
                <Button variant="outline" className="border-gray-700">
                  Check Connection Status
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    )
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

  // Remove the check for hasEnoughData to always show the UI for development purposes
  // if (!hasEnoughData) {
  //   return renderNoDataMessage()
  // }

  // For dev purposes, always render the UI, but show an alert if no data
  const showNoDataAlert = !hasEnoughData;

  return (
    <div className="bg-gradient-to-b from-[#161616] to-[#0A0A0A] rounded-lg p-6 mb-6 border border-[#333]">
      {showNoDataAlert && (
        <div className="mb-4 bg-yellow-900/20 border border-yellow-800/30 p-3 rounded">
          <div className="flex items-start">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm text-yellow-200">
                Your platforms are connected, but we don't have enough data yet to generate meaningful insights.
              </p>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" className="border-yellow-800/50 bg-yellow-900/20 text-xs h-7 px-2" onClick={() => null}>
                  Sync Data Now
                </Button>
                <Button variant="outline" className="border-yellow-800/50 bg-yellow-900/20 text-xs h-7 px-2" onClick={() => null}>
                  Check Connection Status
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-5 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">{greeting}, {userName || 'there'}</h3>
          <p className="text-gray-400 text-sm">
            Here's an overview of your {brandName} store performance
          </p>
          {currentPeriod === 'monthly' && (
            <p className="text-xs text-blue-400 mt-1">
              <Info className="h-3 w-3 inline-block mr-1" />
              Data shown is for {getPreviousMonthDateRange()}. Updates on the 1st of each month at midnight.
            </p>
          )}
          {currentPeriod === 'daily' && (
            <p className="text-xs text-blue-400 mt-1">
              <Info className="h-3 w-3 inline-block mr-1" />
              Data shown is for today. Updates hourly, last updated at {format(new Date(), 'h:mm a')}.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={currentPeriod} onValueChange={(value: string) => setCurrentPeriod(value as ReportPeriod)}>
            <TabsList className="bg-[#222]">
              <TabsTrigger 
                value="daily" 
                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
          >
            Today
              </TabsTrigger>
              <TabsTrigger 
                value="monthly" 
                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
              >
                Last Month
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button 
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-md"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <ChevronDown /> : <ChevronUp />}
          </Button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          <Separator className="my-4 bg-gray-800" />
          

          
          {currentPeriod === 'monthly' && monthlyReport ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Revenue Generated</h5>
              <p className="text-2xl font-semibold">{formatCurrency(monthlyReport.revenueGenerated)}</p>
              {monthlyReport.periodComparison.salesGrowth !== 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className={`text-sm cursor-help ${monthlyReport.periodComparison.salesGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {monthlyReport.periodComparison.salesGrowth > 0 ? '↑' : '↓'} {Math.abs(monthlyReport.periodComparison.salesGrowth).toFixed(1)}% from previous month
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            {monthlyReport.periodComparison.salesGrowth === 100 
                              ? `${getPreviousMonthName()}: $${Math.round(monthlyReport.revenueGenerated)} vs ${getTwoMonthsAgoName()}: $0` 
                              : `${getPreviousMonthName()}: $${Math.round(monthlyReport.revenueGenerated)} vs ${getTwoMonthsAgoName()}: $${Math.round(monthlyReport.revenueGenerated / (1 + monthlyReport.periodComparison.salesGrowth / 100))}`
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
              )}
            </div>
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Orders Placed</h5>
              <p className="text-2xl font-semibold">{monthlyReport.totalPurchases}</p>
              {monthlyReport.periodComparison.orderGrowth !== 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className={`text-sm cursor-help ${monthlyReport.periodComparison.orderGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {monthlyReport.periodComparison.orderGrowth > 0 ? '↑' : '↓'} {Math.abs(monthlyReport.periodComparison.orderGrowth).toFixed(1)}% from previous month
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            {monthlyReport.periodComparison.orderGrowth === 100 
                              ? `${getPreviousMonthName()}: ${monthlyReport.totalPurchases} orders vs ${getTwoMonthsAgoName()}: 0 orders` 
                              : `${getPreviousMonthName()}: ${monthlyReport.totalPurchases} orders vs ${getTwoMonthsAgoName()}: ${Math.round(monthlyReport.totalPurchases / (1 + monthlyReport.periodComparison.orderGrowth / 100))} orders`
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
              )}
            </div>
            <div className="bg-[#222] p-4 rounded-lg">
                  <h5 className="text-sm text-gray-400 mb-1">Ad Spend</h5>
                  <p className="text-2xl font-semibold">{formatCurrency(monthlyReport.totalAdSpend)}</p>
                  {monthlyReport.totalAdSpend === 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm cursor-help text-gray-400">
                            - No data available
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            No ad spend data is available for {getPreviousMonthName()}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : monthlyReport.periodComparison.adSpendGrowth !== 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className={`text-sm cursor-help ${monthlyReport.periodComparison.adSpendGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {monthlyReport.periodComparison.adSpendGrowth > 0 ? '↑' : '↓'} {Math.abs(monthlyReport.periodComparison.adSpendGrowth).toFixed(1)}% from previous month
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            {monthlyReport.periodComparison.adSpendGrowth === 100 
                              ? `${getPreviousMonthName()}: $${Math.round(monthlyReport.totalAdSpend)} vs ${getTwoMonthsAgoName()}: $0` 
                              : `${getPreviousMonthName()}: $${Math.round(monthlyReport.totalAdSpend)} vs ${getTwoMonthsAgoName()}: $${Math.round(monthlyReport.totalAdSpend / (1 + monthlyReport.periodComparison.adSpendGrowth / 100))}`
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm cursor-help text-gray-400">
                            - No change from previous month
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            {getPreviousMonthName()}: ${Math.round(monthlyReport.totalAdSpend)} vs {getTwoMonthsAgoName()}: ${Math.round(monthlyReport.totalAdSpend)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="bg-[#222] p-4 rounded-lg">
                  <h5 className="text-sm text-gray-400 mb-1">Average ROAS</h5>
                  <p className="text-2xl font-semibold">{monthlyReport.averageRoas.toFixed(1)}x</p>
                  {monthlyReport.averageRoas === 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm cursor-help text-gray-400">
                            - No data available
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            No ROAS data is available for {getPreviousMonthName()}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : monthlyReport.periodComparison.roasGrowth !== 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className={`text-sm cursor-help ${monthlyReport.periodComparison.roasGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {monthlyReport.periodComparison.roasGrowth > 0 ? '↑' : '↓'} {Math.abs(monthlyReport.periodComparison.roasGrowth).toFixed(1)}% from previous month
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            {monthlyReport.periodComparison.roasGrowth === 100 
                              ? `${getPreviousMonthName()}: ${monthlyReport.averageRoas.toFixed(1)}x vs ${getTwoMonthsAgoName()}: 0.0x` 
                              : `${getPreviousMonthName()}: ${monthlyReport.averageRoas.toFixed(1)}x vs ${getTwoMonthsAgoName()}: ${(monthlyReport.averageRoas / (1 + monthlyReport.periodComparison.roasGrowth / 100)).toFixed(1)}x`
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm cursor-help text-gray-400">
                            - No change from previous month
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            {getPreviousMonthName()}: {monthlyReport.averageRoas.toFixed(1)}x vs {getTwoMonthsAgoName()}: {monthlyReport.averageRoas.toFixed(1)}x
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
          </div>
          
              <div className="bg-[#1E1E1E] p-4 rounded-lg mb-6 border border-[#333] text-gray-300">
                <div className="flex items-center mb-3">
                  <Sparkles className="text-blue-400 mr-2 h-5 w-5" />
                  <h5 className="font-medium">AI Analysis: Monthly Performance</h5>
                  </div>
                <div className="text-sm leading-relaxed space-y-4">
                  {isLoadingMonthlyAnalysis ? (
                    <div className="flex flex-col items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-400 mb-2" />
                      <p>Generating AI analysis...</p>
                    </div>
                  ) : monthlyAiAnalysis ? (
                    <>
                      {/* AI Generated Analysis - Main overview section */}
                      <div className="mb-4">
                        <div className="whitespace-pre-line">{monthlyAiAnalysis.split('\n\n')[0]}</div>
                  </div>
                  
                  {/* Positive Highlights section */}
                  <div>
                    <h6 className="text-green-400 font-medium flex items-center mb-2">
                      <TrendingUp className="h-3.5 w-3.5 mr-1" /> Positive Highlights
                    </h6>
                        <div className="whitespace-pre-line ml-1">
                          {monthlyAiAnalysis.split('\n\n')[1]}
                        </div>
                  </div>
                  
                  {/* Areas Needing Attention section */}
                  <div>
                        <h6 className="text-amber-400 font-medium flex items-center mb-2">
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Areas Needing Attention
                    </h6>
                        <div className="whitespace-pre-line ml-1">
                          {monthlyAiAnalysis.split('\n\n')[2]}
                        </div>
                </div>
                
                      {/* Actionable Recommendations section */}
                  <div>
                    <h6 className="text-blue-400 font-medium flex items-center mb-2">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Recommended Actions
                    </h6>
                        <div className="whitespace-pre-line ml-1">
                          {monthlyAiAnalysis.split('\n\n')[3] || monthlyReport.recommendations.map((rec, i) => (
                            <div key={i} className="mb-1">• {rec}</div>
                          ))}
                  </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p>Unable to generate AI analysis at this time. Please try refreshing the page or check back later.</p>
                      <button 
                        onClick={() => fetchPeriodData()}
                        className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                  </div>
                <div className="mt-4 flex justify-between items-center border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500">
                    {getPreviousMonthName()} data analysis
                  </p>
                  <Link href="/ai-dashboard" className="text-xs text-blue-400 flex items-center">
                    See more recommendations on the AI Intelligence page
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                  </div>
                </div>
                
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Left column with stacked Best Sellers and Best Campaigns */}
                <div className="space-y-6">
                  {/* Best Sellers Section */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                      <h5 className="font-medium">
                        {currentPeriod === 'daily' ? "Today's Best Sellers" : "Monthly Best Sellers"}
                      </h5>
                      <p className="text-xs text-gray-400">
                        {currentPeriod === 'daily' ? "by today's revenue" : "by monthly revenue"}
                      </p>
                  </div>
                  <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A]">
                      {(() => {
                        // Get products directly from periodData instead of reports
                        const products = currentPeriod === 'daily' 
                          ? periodData.today.topProducts || []
                          : periodData.month.topProducts || [];
                        
                        console.log(`DEBUG - ${currentPeriod} Best Sellers:`, {
                          hasProducts: products && products.length > 0,
                          productCount: products?.length || 0,
                          productDetails: products
                        });
                        
                        if (products && products.length > 0) {
                          // Sort by revenue (highest first) just to be sure
                          const sortedProducts = [...products]
                            .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
                            .slice(0, 5); // Show top 5
                          
                          return sortedProducts.map((product, index) => (
                            <div key={index} className="mb-4 last:mb-0">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">{product.title || product.name}</span>
                                <span className="text-sm font-medium">${(product.revenue || 0).toFixed(0)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-yellow-500 rounded-full" 
                                    style={{
                                      width: `${((product.revenue || 0) / (sortedProducts[0]?.revenue || 1)) * 100}%` 
                                    }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-400">{product.quantity || product.orders || 0} units sold</span>
                              </div>
                            </div>
                          ));
                        } else {
                          // Check if we have a hard-coded product for the current report
                          const report = currentPeriod === 'daily' ? dailyReport : monthlyReport;
                          
                          if (report?.bestSellingProducts && report.bestSellingProducts.length > 0) {
                            return report.bestSellingProducts.map((product, index) => (
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
                                        width: `100%` 
                              }}
                            ></div>
                  </div>
                          <span className="text-xs text-gray-400">{product.orders} units sold</span>
                </div>
                      </div>
                            ));
                          }
                          
                          return (
                            <div className="py-8 text-center">
                              <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                              <p className="text-gray-400">No products sold {currentPeriod === 'daily' ? 'today' : 'this month'}</p>
                              <p className="text-xs text-gray-500 mt-1">Products will appear here once sales are recorded</p>
                            </div>
                          );
                        }
                      })()}
              </div>
            </div>
            
                  {/* Best Campaigns Section */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-medium">
                        {currentPeriod === 'daily' ? "Today's" : "Monthly"} Best Campaigns
                      </h5>
                      <select 
                        className="text-xs bg-[#222] border border-[#333] rounded px-2 py-1 text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        defaultValue="roas"
                        onChange={(e) => {
                          console.log(`Sorting by ${e.target.value}`);
                        }}
                      >
                        <option value="roas">Sort by ROAS</option>
                        <option value="ctr">Sort by CTR</option>
                        <option value="revenue">Sort by Revenue</option>
                        <option value="spend">Sort by Spend</option>
                      </select>
                    </div>
                  
                    <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A]">
                      {(() => {
                        console.log(`[Debug] Rendering campaigns for ${currentPeriod} view`);
                        const report = currentPeriod === 'daily' ? dailyReport : monthlyReport;
                        
                        if (report?.bestCampaign && report.bestCampaign.name !== "No campaign data available") {
                          // If we have real campaign data, show it
                          const campaignsToShow = [
                            report.bestCampaign,
                            ...(report.underperformingCampaign && report.underperformingCampaign.name !== "No campaign data available" ? [report.underperformingCampaign] : [])
                          ];
                          
                          console.log(`[Debug] Found ${campaignsToShow.length} campaigns to show in ${currentPeriod} report`);
                          
                          return campaignsToShow.map((campaign, index) => (
                            <div key={index} className="mb-5 last:mb-0 pb-4 last:pb-0 border-b last:border-b-0 border-gray-800">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium">{campaign.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400">{campaign.roas.toFixed(1)}x</span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-2 mb-2 text-xs">
                                <div className="flex flex-col">
                                  <span className="text-gray-500">Revenue</span>
                                  <span className="text-white font-medium">${campaign.roas * campaign.cpa * (campaign.conversions || 0)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-gray-500">Spend</span>
                                  <span className="text-white font-medium">${campaign.cpa * (campaign.conversions || 0)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-gray-500">CTR</span>
                                  <span className="text-white font-medium">{campaign.ctr ? campaign.ctr.toFixed(1) : 0}%</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-gray-500">Conversions</span>
                                  <span className="text-white font-medium">{campaign.conversions || 0}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 mt-3">
                                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{
                                      width: `${(campaign.roas / 4) * 100}%`
                                    }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap">{campaign.conversions || 0} conversions</span>
                              </div>
                            </div>
                          ));
                        } else {
                          // Otherwise show an empty state
                          return (
                            <div className="py-8 text-center">
                              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                              <p className="text-gray-400">No ad campaign data available</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {
                                  // Check if we have any connected ad platforms
                                  connections && connections.some(c => c.platform_type === 'facebook' || c.platform_type === 'google' || c.platform_type === 'meta')
                                    ? `No campaigns found for ${currentPeriod === 'daily' ? 'today' : 'this month'}`
                                    : 'Connect an ad platform to see campaign performance'
                                }
                              </p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
                
                {/* Right column with Month-to-Month Comparison */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium">
                      Month-to-Month Comparison
                    </h5>
                    <p className="text-xs text-gray-400">
                      {getPreviousMonthName()} vs. previous months
                    </p>
                  </div>
                  <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A] h-full">
                    <h6 className="text-sm font-medium mb-4">Performance Trends</h6>
                    
                    {!monthlyReport ? (
                      <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                        <BarChart3 className="h-8 w-8 mb-2" />
                        <p>No monthly data available</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Connect a sales platform to see month-to-month trends
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* Revenue Section */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-300 font-medium">Revenue</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {/* Revenue Three Months Ago */}
                            <div className="bg-[#1A1A1A] p-3 rounded-md flex flex-col">
                              <div className="text-xs text-gray-400 mb-1">{getThreeMonthsAgoName()}</div>
                              <div className="font-semibold">
                                ${monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 2 
                                  ? Math.round(monthlyReport.historicalData[0].revenue)
                                  : 0}
                              </div>
                            </div>
                            
                            {/* Revenue Two Months Ago */}
                            <div className="bg-[#1A1A1A] p-3 rounded-md flex flex-col">
                              <div className="text-xs text-gray-400 mb-1">{getTwoMonthsAgoName()}</div>
                              <div className="font-semibold">
                                ${monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 1 
                                  ? Math.round(monthlyReport.historicalData[1].revenue)
                                  : 0}
                              </div>
                              {monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 2 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-xs mt-1 cursor-help">
                                        {(() => {
                                          const prevRevenue = monthlyReport.historicalData[0].revenue;
                                          const currRevenue = monthlyReport.historicalData[1].revenue;
                                          if (prevRevenue === 0 && currRevenue === 0) {
                                            return <span className="text-gray-400">0%</span>;
                                          } else if (prevRevenue === 0 && currRevenue > 0) {
                                            return <span className="text-green-500">+100%</span>;
                                          } else {
                                            const change = ((currRevenue - prevRevenue) / prevRevenue) * 100;
                                            const prefix = change > 0 ? "+" : "";
                                            const className = change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-gray-400";
                                            return <span className={className}>{prefix}{change.toFixed(1)}%</span>;
                                          }
                                        })()}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#333] border-[#444]">
                                      <p className="text-xs">
                                        {getTwoMonthsAgoName()}: ${Math.round(monthlyReport.historicalData[1].revenue)} vs {getThreeMonthsAgoName()}: ${Math.round(monthlyReport.historicalData[0].revenue)}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            
                            {/* Revenue Previous Month */}
                            <div className="bg-[#1A1A1A] p-3 rounded-md flex flex-col">
                              <div className="text-xs text-gray-400 mb-1">{getPreviousMonthName()}</div>
                              <div className="font-semibold">
                                ${Math.round(monthlyReport.revenueGenerated)}
                              </div>
                              {monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 1 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-xs mt-1 cursor-help">
                                        {(() => {
                                          const prevRevenue = monthlyReport.historicalData[1].revenue;
                                          const currRevenue = monthlyReport.revenueGenerated;
                                          if (prevRevenue === 0 && currRevenue === 0) {
                                            return <span className="text-gray-400">0%</span>;
                                          } else if (prevRevenue === 0 && currRevenue > 0) {
                                            return <span className="text-green-500">+100%</span>;
                                          } else {
                                            const change = ((currRevenue - prevRevenue) / prevRevenue) * 100;
                                            const prefix = change > 0 ? "+" : "";
                                            const className = change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-gray-400";
                                            return <span className={className}>{prefix}{change.toFixed(1)}%</span>;
                                          }
                                        })()}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#333] border-[#444]">
                                      <p className="text-xs">
                                        {getPreviousMonthName()}: ${Math.round(monthlyReport.revenueGenerated)} vs {getTwoMonthsAgoName()}: ${monthlyReport.historicalData && monthlyReport.historicalData.length > 1 ? Math.round(monthlyReport.historicalData[1].revenue) : 0}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Divider */}
                        <div className="h-px bg-gray-800"></div>
                        
                        {/* Orders Section */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-300 font-medium">Orders</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {/* Orders Three Months Ago */}
                            <div className="bg-[#1A1A1A] p-3 rounded-md flex flex-col">
                              <div className="text-xs text-gray-400 mb-1">{getThreeMonthsAgoName()}</div>
                              <div className="font-semibold">
                                {monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 2 
                                  ? Math.round(monthlyReport.historicalData[0].orders)
                                  : 0}
                              </div>
                            </div>
                            
                            {/* Orders Two Months Ago */}
                            <div className="bg-[#1A1A1A] p-3 rounded-md flex flex-col">
                              <div className="text-xs text-gray-400 mb-1">{getTwoMonthsAgoName()}</div>
                              <div className="font-semibold">
                                {monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 1 
                                  ? Math.round(monthlyReport.historicalData[1].orders)
                                  : 0}
                              </div>
                              {monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 2 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-xs mt-1 cursor-help">
                                        {(() => {
                                          const prevOrders = monthlyReport.historicalData[0].orders;
                                          const currOrders = monthlyReport.historicalData[1].orders;
                                          if (prevOrders === 0 && currOrders === 0) {
                                            return <span className="text-gray-400">0%</span>;
                                          } else if (prevOrders === 0 && currOrders > 0) {
                                            return <span className="text-green-500">+100%</span>;
                                          } else {
                                            const change = ((currOrders - prevOrders) / prevOrders) * 100;
                                            const prefix = change > 0 ? "+" : "";
                                            const className = change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-gray-400";
                                            return <span className={className}>{prefix}{change.toFixed(1)}%</span>;
                                          }
                                        })()}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#333] border-[#444]">
                                      <p className="text-xs">
                                        {getTwoMonthsAgoName()}: {Math.round(monthlyReport.historicalData[1].orders)} orders vs {getThreeMonthsAgoName()}: {Math.round(monthlyReport.historicalData[0].orders)} orders
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            
                            {/* Orders Previous Month */}
                            <div className="bg-[#1A1A1A] p-3 rounded-md flex flex-col">
                              <div className="text-xs text-gray-400 mb-1">{getPreviousMonthName()}</div>
                              <div className="font-semibold">
                                {Math.round(monthlyReport.totalPurchases)}
                              </div>
                              {monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 1 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-xs mt-1 cursor-help">
                                        {(() => {
                                          const prevOrders = monthlyReport.historicalData[1].orders;
                                          const currOrders = monthlyReport.totalPurchases;
                                          if (prevOrders === 0 && currOrders === 0) {
                                            return <span className="text-gray-400">0%</span>;
                                          } else if (prevOrders === 0 && currOrders > 0) {
                                            return <span className="text-green-500">+100%</span>;
                                          } else {
                                            const change = ((currOrders - prevOrders) / prevOrders) * 100;
                                            const prefix = change > 0 ? "+" : "";
                                            const className = change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-gray-400";
                                            return <span className={className}>{prefix}{change.toFixed(1)}%</span>;
                                          }
                                        })()}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#333] border-[#444]">
                                      <p className="text-xs">
                                        {getPreviousMonthName()}: {Math.round(monthlyReport.totalPurchases)} orders vs {getTwoMonthsAgoName()}: {monthlyReport.historicalData && monthlyReport.historicalData.length > 1 ? Math.round(monthlyReport.historicalData[1].orders) : 0} orders
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Divider */}
                        <div className="h-px bg-gray-800"></div>
                        
                        {/* Ad Spend Section */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-300 font-medium">Ad Spend</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {/* Ad Spend Three Months Ago */}
                            <div className="bg-[#1A1A1A] p-3 rounded-md flex flex-col">
                              <div className="text-xs text-gray-400 mb-1">{getThreeMonthsAgoName()}</div>
                              <div className="font-semibold">
                                ${monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 2 
                                  ? Math.round(monthlyReport.historicalData[0].adSpend)
                                  : 0}
                              </div>
                            </div>
                            
                            {/* Ad Spend Two Months Ago */}
                            <div className="bg-[#1A1A1A] p-3 rounded-md flex flex-col">
                              <div className="text-xs text-gray-400 mb-1">{getTwoMonthsAgoName()}</div>
                              <div className="font-semibold">
                                ${monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 1 
                                  ? Math.round(monthlyReport.historicalData[1].adSpend)
                                  : 0}
                              </div>
                              {monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 2 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-xs mt-1 cursor-help">
                                        {(() => {
                                          const prevAdSpend = monthlyReport.historicalData[0].adSpend;
                                          const currAdSpend = monthlyReport.historicalData[1].adSpend;
                                          if (prevAdSpend === 0 && currAdSpend === 0) {
                                            return <span className="text-gray-400">0%</span>;
                                          } else if (prevAdSpend === 0 && currAdSpend > 0) {
                                            return <span className="text-red-500">+100%</span>;
                                          } else {
                                            const change = ((currAdSpend - prevAdSpend) / prevAdSpend) * 100;
                                            // For ad spend, increase is typically red (more spend) and decrease is green (less spend)
                                            const prefix = change > 0 ? "+" : "";
                                            const className = change > 0 ? "text-red-500" : change < 0 ? "text-green-500" : "text-gray-400";
                                            return <span className={className}>{prefix}{change.toFixed(1)}%</span>;
                                          }
                                        })()}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#333] border-[#444]">
                                      <p className="text-xs">
                                        {getTwoMonthsAgoName()}: ${Math.round(monthlyReport.historicalData[1].adSpend)} vs {getThreeMonthsAgoName()}: ${Math.round(monthlyReport.historicalData[0].adSpend)}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            
                            {/* Ad Spend Previous Month */}
                            <div className="bg-[#1A1A1A] p-3 rounded-md flex flex-col">
                              <div className="text-xs text-gray-400 mb-1">{getPreviousMonthName()}</div>
                              <div className="font-semibold">
                                ${Math.round(monthlyReport.totalAdSpend)}
                              </div>
                              {monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 1 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-xs mt-1 cursor-help">
                                        {(() => {
                                          const prevAdSpend = monthlyReport.historicalData[1].adSpend;
                                          const currAdSpend = monthlyReport.totalAdSpend;
                                          if (prevAdSpend === 0 && currAdSpend === 0) {
                                            return <span className="text-gray-400">0%</span>;
                                          } else if (prevAdSpend === 0 && currAdSpend > 0) {
                                            return <span className="text-red-500">+100%</span>;
                                          } else {
                                            const change = ((currAdSpend - prevAdSpend) / prevAdSpend) * 100;
                                            // For ad spend, increase is typically red (more spend) and decrease is green (less spend)
                                            const prefix = change > 0 ? "+" : "";
                                            const className = change > 0 ? "text-red-500" : change < 0 ? "text-green-500" : "text-gray-400";
                                            return <span className={className}>{prefix}{change.toFixed(1)}%</span>;
                                          }
                                        })()}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#333] border-[#444]">
                                      <p className="text-xs">
                                        {getPreviousMonthName()}: ${Math.round(monthlyReport.totalAdSpend)} vs {getTwoMonthsAgoName()}: ${monthlyReport.historicalData && monthlyReport.historicalData.length > 1 ? Math.round(monthlyReport.historicalData[1].adSpend) : 0}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Divider */}
                        <div className="h-px bg-gray-800"></div>
                        
                        {/* ROAS Section */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-300 font-medium">Average ROAS</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {/* ROAS Three Months Ago */}
                            <div className="bg-[#1A1A1A] p-3 rounded-md flex flex-col">
                              <div className="text-xs text-gray-400 mb-1">{getThreeMonthsAgoName()}</div>
                              <div className="font-semibold">
                                {monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 2 
                                  ? monthlyReport.historicalData[0].roas.toFixed(1)
                                  : "0.0"}x
                              </div>
                            </div>
                            
                            {/* ROAS Two Months Ago */}
                            <div className="bg-[#1A1A1A] p-3 rounded-md flex flex-col">
                              <div className="text-xs text-gray-400 mb-1">{getTwoMonthsAgoName()}</div>
                              <div className="font-semibold">
                                {monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 1 
                                  ? monthlyReport.historicalData[1].roas.toFixed(1)
                                  : "0.0"}x
                              </div>
                              {monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 2 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-xs mt-1 cursor-help">
                                        {(() => {
                                          const prevRoas = monthlyReport.historicalData[0].roas;
                                          const currRoas = monthlyReport.historicalData[1].roas;
                                          if (prevRoas === 0 && currRoas === 0) {
                                            return <span className="text-gray-400">0%</span>;
                                          } else if (prevRoas === 0 && currRoas > 0) {
                                            return <span className="text-green-500">+100%</span>;
                                          } else {
                                            const change = ((currRoas - prevRoas) / prevRoas) * 100;
                                            const prefix = change > 0 ? "+" : "";
                                            const className = change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-gray-400";
                                            return <span className={className}>{prefix}{change.toFixed(1)}%</span>;
                                          }
                                        })()}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#333] border-[#444]">
                                      <p className="text-xs">
                                        {getTwoMonthsAgoName()}: {monthlyReport.historicalData[1].roas.toFixed(1)}x vs {getThreeMonthsAgoName()}: {monthlyReport.historicalData[0].roas.toFixed(1)}x
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            
                            {/* ROAS Previous Month */}
                            <div className="bg-[#1A1A1A] p-3 rounded-md flex flex-col">
                              <div className="text-xs text-gray-400 mb-1">{getPreviousMonthName()}</div>
                              <div className="font-semibold">
                                {monthlyReport.averageRoas.toFixed(1)}x
                              </div>
                              {monthlyReport && monthlyReport.historicalData && monthlyReport.historicalData.length > 1 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-xs mt-1 cursor-help">
                                        {(() => {
                                          const prevRoas = monthlyReport.historicalData[1].roas;
                                          const currRoas = monthlyReport.averageRoas;
                                          if (prevRoas === 0 && currRoas === 0) {
                                            return <span className="text-gray-400">0%</span>;
                                          } else if (prevRoas === 0 && currRoas > 0) {
                                            return <span className="text-green-500">+100%</span>;
                                          } else {
                                            const change = ((currRoas - prevRoas) / prevRoas) * 100;
                                            const prefix = change > 0 ? "+" : "";
                                            const className = change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-gray-400";
                                            return <span className={className}>{prefix}{change.toFixed(1)}%</span>;
                                          }
                                        })()}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#333] border-[#444]">
                                      <p className="text-xs">
                                        {getPreviousMonthName()}: {monthlyReport.averageRoas.toFixed(1)}x vs {getTwoMonthsAgoName()}: {monthlyReport.historicalData && monthlyReport.historicalData.length > 1 ? monthlyReport.historicalData[1].roas.toFixed(1) : "0.0"}x
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : currentPeriod === 'daily' && dailyReport ? (
        <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Revenue Generated</h5>
              <p className="text-2xl font-semibold">{formatCurrency(dailyReport.revenueGenerated)}</p>
              {dailyReport.periodComparison.salesGrowth !== 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className={`text-sm cursor-help ${dailyReport.periodComparison.salesGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {dailyReport.periodComparison.salesGrowth > 0 ? '↑' : '↓'} {Math.abs(dailyReport.periodComparison.salesGrowth).toFixed(1)}% from yesterday
                </p>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#333] border-[#444]">
                      <p className="text-xs">
                        Today: ${Math.round(dailyReport.revenueGenerated)} vs Yesterday: ${Math.round(dailyReport.revenueGenerated / (1 + dailyReport.periodComparison.salesGrowth / 100))}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="bg-[#222] p-4 rounded-lg">
              <h5 className="text-sm text-gray-400 mb-1">Orders Placed</h5>
              <p className="text-2xl font-semibold">{dailyReport.totalPurchases}</p>
                  {dailyReport.periodComparison.orderGrowth !== 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className={`text-sm cursor-help ${dailyReport.periodComparison.orderGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {dailyReport.periodComparison.orderGrowth > 0 ? '↑' : '↓'} {Math.abs(dailyReport.periodComparison.orderGrowth).toFixed(1)}% from yesterday
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            Today: {dailyReport.totalPurchases} orders vs Yesterday: {Math.round(dailyReport.totalPurchases / (1 + dailyReport.periodComparison.orderGrowth / 100))} orders
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="bg-[#222] p-4 rounded-lg">
                  <h5 className="text-sm text-gray-400 mb-1">Ad Spend</h5>
                  <p className="text-2xl font-semibold">{formatCurrency(dailyReport.totalAdSpend)}</p>
                  {dailyReport.totalAdSpend === 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm cursor-help text-gray-400">
                            - No data available
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            No ad spend data is available for today
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : dailyReport.periodComparison.adSpendGrowth !== 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className={`text-sm cursor-help ${dailyReport.periodComparison.adSpendGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {dailyReport.periodComparison.adSpendGrowth > 0 ? '↑' : '↓'} {Math.abs(dailyReport.periodComparison.adSpendGrowth).toFixed(1)}% from yesterday
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            {dailyReport.periodComparison.adSpendGrowth === 100 
                              ? `Today: $${Math.round(dailyReport.totalAdSpend)} vs Yesterday: $0` 
                              : `Today: $${Math.round(dailyReport.totalAdSpend)} vs Yesterday: $${Math.round(dailyReport.totalAdSpend / (1 + dailyReport.periodComparison.adSpendGrowth / 100))}`
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm cursor-help text-gray-400">
                            - No change from yesterday
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            Today: ${Math.round(dailyReport.totalAdSpend)} vs Yesterday: ${Math.round(dailyReport.totalAdSpend)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="bg-[#222] p-4 rounded-lg">
                  <h5 className="text-sm text-gray-400 mb-1">Average ROAS</h5>
                  <p className="text-2xl font-semibold">{dailyReport.averageRoas.toFixed(1)}x</p>
                  {dailyReport.averageRoas === 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm cursor-help text-gray-400">
                            - No data available
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            No ROAS data is available for today
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : dailyReport.periodComparison.roasGrowth !== 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className={`text-sm cursor-help ${dailyReport.periodComparison.roasGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {dailyReport.periodComparison.roasGrowth > 0 ? '↑' : '↓'} {Math.abs(dailyReport.periodComparison.roasGrowth).toFixed(1)}% from yesterday
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            {dailyReport.periodComparison.roasGrowth === 100 
                              ? `Today: ${dailyReport.averageRoas.toFixed(1)}x vs Yesterday: 0.0x` 
                              : `Today: ${dailyReport.averageRoas.toFixed(1)}x vs Yesterday: ${(dailyReport.averageRoas / (1 + dailyReport.periodComparison.roasGrowth / 100)).toFixed(1)}x`
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm cursor-help text-gray-400">
                            - No change from yesterday
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#333] border-[#444]">
                          <p className="text-xs">
                            Today: ${dailyReport.averageRoas.toFixed(1)}x vs Yesterday: ${dailyReport.averageRoas.toFixed(1)}x
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
              </div>
            </div>
            
              <div className="bg-[#1E1E1E] p-4 rounded-lg mb-6 border border-[#333] text-gray-300">
                <div className="flex items-center mb-3">
                  <Sparkles className="text-blue-400 mr-2 h-5 w-5" />
                  <h5 className="font-medium">AI Analysis: Today's Performance</h5>
                </div>
                <div className="text-sm leading-relaxed space-y-4">
                  {isLoadingDailyAnalysis ? (
                    <div className="flex flex-col items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-400 mb-2" />
                      <p>Generating AI analysis...</p>
                    </div>
                  ) : dailyAiAnalysis ? (
                    <>
                      {/* AI Generated Analysis - Main overview section */}
                      <div className="mb-4">
                        <div className="whitespace-pre-line">{dailyAiAnalysis.split('\n\n')[0]}</div>
                </div>
                  
                  {/* Positive Highlights section */}
                  <div>
                    <h6 className="text-green-400 font-medium flex items-center mb-2">
                      <TrendingUp className="h-3.5 w-3.5 mr-1" /> Positive Highlights
                    </h6>
                        <div className="whitespace-pre-line ml-1">
                          {dailyAiAnalysis.split('\n\n')[1]}
                        </div>
                </div>
                  
                  {/* Areas Needing Attention section */}
                  <div>
                        <h6 className="text-amber-400 font-medium flex items-center mb-2">
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Areas Needing Attention
                    </h6>
                        <div className="whitespace-pre-line ml-1">
                          {dailyAiAnalysis.split('\n\n')[2]}
                        </div>
              </div>
                  
                      {/* Actionable Recommendations section */}
                  <div>
                    <h6 className="text-blue-400 font-medium flex items-center mb-2">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Recommended Actions
                    </h6>
                        <div className="whitespace-pre-line ml-1">
                          {dailyAiAnalysis.split('\n\n')[3] || dailyReport.recommendations.map((rec, i) => (
                            <div key={i} className="mb-1">• {rec}</div>
                          ))}
                  </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p>Unable to generate AI analysis at this time. Please try refreshing the page or check back later.</p>
                      <button 
                        onClick={() => fetchPeriodData()}
                        className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-between items-center border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500">
                    Today's data analysis
                  </p>
                  <Link href="/ai-dashboard" className="text-xs text-blue-400 flex items-center">
                    See more insights in AI Intelligence
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium">{currentPeriod === 'daily' ? "Today's" : "Monthly"} Best Sellers</h5>
                    <p className="text-xs text-gray-400">by {currentPeriod === 'daily' ? "today's" : "monthly"} revenue</p>
                  </div>
                  <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A]">
                    {(() => {
                      // Get products directly from periodData instead of reports
                      const products = currentPeriod === 'daily' 
                        ? periodData.today.topProducts || []
                        : periodData.month.topProducts || [];
                      
                      console.log(`DEBUG - ${currentPeriod} Best Sellers:`, {
                        hasProducts: products && products.length > 0,
                        productCount: products?.length || 0,
                        productDetails: products
                      });
                      
                      if (products && products.length > 0) {
                        // Sort by revenue (highest first) just to be sure
                        const sortedProducts = [...products]
                          .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
                          .slice(0, 5); // Show top 5
                        
                        return sortedProducts.map((product, index) => (
                          <div key={index} className="mb-4 last:mb-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm">{product.title || product.name}</span>
                              <span className="text-sm font-medium">${(product.revenue || 0).toFixed(0)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-yellow-500 rounded-full" 
                                  style={{
                                    width: `${((product.revenue || 0) / (sortedProducts[0]?.revenue || 1)) * 100}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-400">{product.quantity || product.orders || 0} units sold</span>
                            </div>
                          </div>
                        ));
                      } else {
                        // Check if we have a hard-coded product for the current report
                        const report = currentPeriod === 'daily' ? dailyReport : monthlyReport;
                        
                        if (report?.bestSellingProducts && report.bestSellingProducts.length > 0) {
                          return report.bestSellingProducts.map((product, index) => (
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
                                      width: `100%` 
                        }}
                      ></div>
                          </div>
                          <span className="text-xs text-gray-400">{product.orders} units sold</span>
                      </div>
                    </div>
                          ));
                        }
                        
                        return (
                          <div className="py-8 text-center">
                            <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                            <p className="text-gray-400">No products sold {currentPeriod === 'daily' ? 'today' : 'this month'}</p>
                            <p className="text-xs text-gray-500 mt-1">Products will appear here once sales are recorded</p>
                          </div>
                        );
                      }
                    })()}
              </div>
            </div>
            
            <div>
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium">{currentPeriod === 'daily' ? 'Today\'s' : 'Monthly'} Best Campaigns</h5>
                    <select 
                      className="text-xs bg-[#222] border border-[#333] rounded px-2 py-1 text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      defaultValue="roas"
                      onChange={(e) => {
                        // This would be where you'd implement the actual sorting logic
                        // For now it's just for demonstration
                        console.log(`Sorting by ${e.target.value}`);
                      }}
                    >
                      <option value="roas">Sort by ROAS</option>
                      <option value="ctr">Sort by CTR</option>
                      <option value="revenue">Sort by Revenue</option>
                      <option value="spend">Sort by Spend</option>
                      <option value="cvr">Sort by Conversion Rate</option>
                    </select>
                </div>
                
                  <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A]">
                    {(() => {
                      console.log(`[Debug] Rendering campaigns for ${currentPeriod} period`);
                      const report = currentPeriod === 'daily' ? dailyReport : monthlyReport;
                      
                      if (report?.bestCampaign && report.bestCampaign.name !== "No campaign data available") {
                        // If we have real campaign data, show it
                        const campaignsToShow = [
                          report.bestCampaign,
                          ...(report.underperformingCampaign && report.underperformingCampaign.name !== "No campaign data available" ? [report.underperformingCampaign] : [])
                        ];
                        
                        console.log(`[Debug] Found ${campaignsToShow.length} campaigns to show in ${currentPeriod} report`);
                        
                        return campaignsToShow.map((campaign, index) => (
                      <div key={index} className="mb-5 last:mb-0 pb-4 last:pb-0 border-b last:border-b-0 border-gray-800">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">{campaign.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400">{campaign.roas.toFixed(1)}x</span>
                  </div>
                </div>
                
                        <div className="grid grid-cols-4 gap-2 mb-2 text-xs">
                          <div className="flex flex-col">
                            <span className="text-gray-500">Revenue</span>
                                <span className="text-white font-medium">${campaign.roas * campaign.cpa * (campaign.conversions || 0)}</span>
                  </div>
                          <div className="flex flex-col">
                            <span className="text-gray-500">Spend</span>
                                <span className="text-white font-medium">${campaign.cpa * (campaign.conversions || 0)}</span>
                  </div>
                          <div className="flex flex-col">
                            <span className="text-gray-500">CTR</span>
                                <span className="text-white font-medium">{campaign.ctr ? campaign.ctr.toFixed(1) : 0}%</span>
                          </div>
                          <div className="flex flex-col">
                                <span className="text-gray-500">Conversions</span>
                                <span className="text-white font-medium">{campaign.conversions || 0}</span>
                </div>
              </div>
              
                        <div className="flex items-center gap-2 mt-3">
                          <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${(campaign.roas / 4) * 100}%`
                              }}
                            ></div>
                  </div>
                              <span className="text-xs text-gray-400 whitespace-nowrap">{campaign.conversions || 0} conversions</span>
                  </div>
                  </div>
                        ));
                      } else {
                        // Otherwise show an empty state
                        return (
                          <div className="py-8 text-center">
                            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                            <p className="text-gray-400">No ad campaign data available</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {
                                // Check if we have any connected ad platforms
                                connections && connections.some(c => c.platform_type === 'facebook' || c.platform_type === 'google' || c.platform_type === 'meta')
                                  ? `No campaigns found for ${currentPeriod === 'daily' ? 'today' : 'this month'}`
                                  : 'Connect an ad platform to see campaign performance'
                              }
                            </p>
                          </div>
                        );
                      }
                    })()}
                </div>
              </div>
            </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-medium">
                    7-Day Performance
                  </h5>
                  <p className="text-xs text-gray-400">
                    Today vs. previous 6 days
                  </p>
          </div>
                <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A]">
                  <h6 className="text-sm font-medium mb-4">Performance Trends</h6>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 text-xs border-b border-gray-800">
                          <th className="pb-2 text-left">Date</th>
                          <th className="pb-2 text-left" colSpan={2}>Revenue</th>
                          <th className="pb-2 text-left" colSpan={2}>Orders</th>
                          <th className="pb-2 text-left" colSpan={2}>Ad Spend</th>
                          <th className="pb-2 text-right">ROAS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyReport.historicalData?.slice().reverse().map((day, index, array) => {

                          // Calculate day-over-day changes
                          const prevDay = index < array.length - 1 ? array[index + 1] : null;

                          // Calculate percentage changes
                          const revenueChange = prevDay ? ((day.revenue - prevDay.revenue) / prevDay.revenue) * 100 : null;
                          const ordersChange = prevDay ? ((day.orders - prevDay.orders) / prevDay.orders) * 100 : null;
                          const adSpendChange = prevDay ? ((day.adSpend - prevDay.adSpend) / prevDay.adSpend) * 100 : null;

                          return (
                            <tr key={day.name} className={index === 0 ? "bg-gray-900/30" : ""}>
                              <td className="py-2">{day.name}</td>
                              
                              {/* Revenue column with integrated change */}
                              <td className="py-2">
                                <div className="flex items-center">
                                  <span className="font-medium">${Math.round(day.revenue)}</span>
                                  {revenueChange !== null && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className={`ml-2 px-1.5 py-0.5 text-xs rounded flex items-center cursor-help ${revenueChange > 0 ? 'bg-green-900/30 text-green-400' : revenueChange < 0 ? 'bg-red-900/30 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                                            {revenueChange > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : revenueChange < 0 ? <TrendingDown className="h-3 w-3 mr-0.5" /> : null}
                                    {Math.abs(revenueChange).toFixed(1)}%
                    </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-[#333] border-[#444]">
                                          <p className="text-xs">
                                            {day.name}: ${Math.round(day.revenue)} vs {prevDay?.name}: ${Math.round(prevDay?.revenue || 0)}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </td>
                              <td></td> {/* Empty cell to maintain colspan structure */}
                              
                              {/* Orders column with integrated change */}
                              <td className="py-2">
                                <div className="flex items-center">
                                  <span className="font-medium">{Math.round(day.orders)}</span>
                                  {ordersChange !== null && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className={`ml-2 px-1.5 py-0.5 text-xs rounded flex items-center cursor-help ${ordersChange > 0 ? 'bg-green-900/30 text-green-400' : ordersChange < 0 ? 'bg-red-900/30 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                                            {ordersChange > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : ordersChange < 0 ? <TrendingDown className="h-3 w-3 mr-0.5" /> : null}
                                    {Math.abs(ordersChange).toFixed(1)}%
                                  </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-[#333] border-[#444]">
                                          <p className="text-xs">
                                            {day.name}: {Math.round(day.orders)} orders vs {prevDay?.name}: {Math.round(prevDay?.orders || 0)} orders
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </td>
                              <td></td> {/* Empty cell to maintain colspan structure */}
                              
                              {/* Ad Spend column with integrated change */}
                              <td className="py-2">
                                <div className="flex items-center">
                                  <span className="font-medium">${Math.round(day.adSpend)}</span>
                                  {adSpendChange !== null && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className={`ml-2 px-1.5 py-0.5 text-xs rounded flex items-center cursor-help ${adSpendChange > 0 ? 'bg-red-900/30 text-red-400' : adSpendChange < 0 ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                                            {adSpendChange > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : adSpendChange < 0 ? <TrendingDown className="h-3 w-3 mr-0.5" /> : null}
                                    {Math.abs(adSpendChange).toFixed(1)}%
                                  </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-[#333] border-[#444]">
                                          <p className="text-xs">
                                            {day.name}: ${Math.round(day.adSpend)} vs {prevDay?.name}: ${Math.round(prevDay?.adSpend || 0)}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </td>
                              <td></td> {/* Empty cell to maintain colspan structure */}
                              
                              <td className="text-right py-2">
                                <div className="flex items-center justify-end">
                                  <span className="font-medium">{day.roas.toFixed(1)}x</span>
                                  {prevDay && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          {(() => {
                                            const roasChange = ((day.roas - prevDay.roas) / prevDay.roas) * 100;
                                            return (
                                              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded flex items-center cursor-help ${
                                                roasChange > 0 ? 'bg-green-900/30 text-green-400' : 
                                                roasChange < 0 ? 'bg-red-900/30 text-red-400' : 
                                                'bg-gray-800 text-gray-400'
                                              }`}>
                                                {roasChange > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : 
                                                roasChange < 0 ? <TrendingDown className="h-3 w-3 mr-0.5" /> : null}
                                                {Math.abs(roasChange).toFixed(1)}%
                                              </span>
                                            );
                                          })()}
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-[#333] border-[#444]">
                                          <p className="text-xs">
                                            {day.name}: {day.roas.toFixed(1)}x vs {prevDay.name}: {prevDay.roas.toFixed(1)}x
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
            </div>
          </div>
        </div>
      ) : (
            <div className="flex flex-col items-center justify-center p-12">
              <LoadingSkeleton />
        </div>
          )}
        </>
      )}
    </div>
  )
} 

// Generate real AI analysis using OpenAI API
const generateRealAIAnalysis = async (
  period: ReportPeriod,
  metrics: PeriodMetrics,
  comparison: {
    salesGrowth: number,
    orderGrowth: number,
    customerGrowth: number,
    roasGrowth: number,
    conversionGrowth: number,
    adSpendGrowth: number
  },
  bestSellingProducts?: Array<{
    name: string;
    revenue: number;
    orders: number;
  }>,
  platformData?: {
    shopifyConnected: boolean;
    metaConnected: boolean;
  },
  authToken?: string // Add auth token as parameter
): Promise<string> => {
  try {
    // Check if we have enough data for analysis
    if (metrics.totalSales === 0 && metrics.ordersCount === 0) {
      return 'Insufficient data available for AI analysis.';
    }
    
    // Extremely strict validation for products
    const validProducts = Array.isArray(bestSellingProducts) 
      ? bestSellingProducts
          .filter(p => 
            p && 
            typeof p.name === 'string' && 
            p.name.trim() !== '' && 
            typeof p.revenue === 'number' && 
            p.revenue > 0 &&
            typeof p.orders === 'number' && 
            p.orders > 0)
          // Explicitly filter out any test, demo, or sample products
          .filter(p => {
            const nameLower = p.name.toLowerCase();
            return !nameLower.includes('test') && 
                   !nameLower.includes('demo') && 
                   !nameLower.includes('sample') && 
                   !nameLower.includes('unused') &&
                   !nameLower.includes('placeholder');
          })
      : [];
    
    console.log('Validated Products for AI Analysis:', validProducts);
    
    // Create clean metrics object - only include non-zero/valid metrics
    const cleanMetrics = {
      totalSales: typeof metrics.totalSales === 'number' ? metrics.totalSales : 0,
      ordersCount: typeof metrics.ordersCount === 'number' ? metrics.ordersCount : 0,
      // Only include these if they actually exist with valid values
      ...(typeof metrics.averageOrderValue === 'number' && metrics.averageOrderValue > 0 
        ? { averageOrderValue: metrics.averageOrderValue } : {}),
      ...(typeof metrics.customerCount === 'number' && metrics.customerCount > 0 
        ? { customerCount: metrics.customerCount } : {}),
      ...(typeof metrics.newCustomers === 'number'
        ? { newCustomers: metrics.newCustomers } : {}),
      ...(typeof metrics.returningCustomers === 'number' && metrics.returningCustomers > 0 
        ? { returningCustomers: metrics.returningCustomers } : {}),
      // Only include conversion rate if explicitly provided
      ...(typeof metrics.conversionRate === 'number' && metrics.conversionRate > 0 
        ? { conversionRate: metrics.conversionRate } : {}),
      ...(typeof metrics.adSpend === 'number'
        ? { adSpend: metrics.adSpend } : {}),
      ...(typeof metrics.roas === 'number' && metrics.roas > 0
        ? { roas: metrics.roas } : {}),
      ...(typeof metrics.ctr === 'number' && metrics.ctr > 0
        ? { ctr: metrics.ctr } : {}),
      ...(typeof metrics.cpc === 'number' && metrics.cpc > 0
        ? { cpc: metrics.cpc } : {})
    };
    
    // Clean comparison data - only include what's relevant
    const cleanComparison = {
      salesGrowth: typeof comparison.salesGrowth === 'number' ? comparison.salesGrowth : 0,
      orderGrowth: typeof comparison.orderGrowth === 'number' ? comparison.orderGrowth : 0,
      ...(typeof comparison.customerGrowth === 'number' && cleanMetrics.customerCount
        ? { customerGrowth: comparison.customerGrowth } : {}),
      ...(typeof comparison.roasGrowth === 'number' && cleanMetrics.roas
        ? { roasGrowth: comparison.roasGrowth } : {}),
      ...(typeof comparison.conversionGrowth === 'number' && cleanMetrics.conversionRate
        ? { conversionGrowth: comparison.conversionGrowth } : {}),
      ...(typeof comparison.adSpendGrowth === 'number' && typeof cleanMetrics.adSpend === 'number'
        ? { adSpendGrowth: comparison.adSpendGrowth } : {})
    };
    
    // Instead of calling OpenAI directly, use our API endpoint
    const response = await fetch('/api/ai/generate-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({
        period,
        metrics: cleanMetrics,
        comparison: cleanComparison,
        bestSellingProducts: validProducts,
        platformData: {
          shopifyConnected: !!platformData?.shopifyConnected,
          metaConnected: !!platformData?.metaConnected && typeof metrics.adSpend === 'number' && metrics.adSpend > 0
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.analysis;
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return `Unable to generate AI analysis at this time. Please try refreshing the page or check back later.`;
  }
};

// Add the processTopProducts function before fetchPeriodMetrics
const processTopProducts = (orders: any[]): Array<{ title?: string; name?: string; quantity?: number; orders?: number; revenue?: number }> => {
  // Process line_items from orders
  const productMap = new Map<string, { title: string; quantity: number; orders: number; revenue: number }>();
  
  orders.forEach(order => {
    const lineItems = order.line_items || [];
    if (!Array.isArray(lineItems)) return;
    
    lineItems.forEach((item: any) => {
      const productId = item.product_id?.toString() || item.id?.toString();
      if (!productId) return;
      
      const title = item.title || 'Unknown Product';
      const quantity = parseInt(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      const revenue = quantity * price;
      
      if (productMap.has(productId)) {
        const product = productMap.get(productId)!;
        product.quantity += quantity;
        product.orders += 1;
        product.revenue += revenue;
      } else {
        productMap.set(productId, {
          title,
          quantity,
          orders: 1,
          revenue
        });
      }
    });
  });
  
  // Convert the product map to an array and sort by revenue
  return Array.from(productMap.values())
    .map(product => ({
      title: product.title,
      name: product.title,
      quantity: product.quantity,
      orders: product.orders,
      revenue: product.revenue
    }))
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
};

// Utility function to safely calculate percentage change
export const calculatePercentageChange = (current: number, previous: number): number => {
  // If both values are zero, there's no change (0%)
  if (current === 0 && previous === 0) return 0;
  
  // If previous is zero and current is not, this is technically infinite growth
  // but we'll cap it at 100% to avoid extreme values
  if (previous === 0 && current > 0) return 100;
  
  // Normal percentage calculation
  if (previous > 0) {
    return ((current - previous) / previous) * 100;
  }
  
  // If previous is negative and current is not, or vice versa, special handling might be needed
  // For now, we'll use the simple calculation
  return ((current - previous) / Math.abs(previous)) * 100;
}

// Add a utility function for formatting percentage changes with appropriate styling
function formatPercentageChange(currentValue: number, previousValue: number): {text: string, className: string} {
  // Calculate the percentage change
  const percentChange = calculatePercentageChange(currentValue, previousValue);
  
  // Handle special cases
  if (currentValue === 0 && previousValue === 0) {
    return { text: "0%", className: "text-gray-400" };
  }
  
  if (previousValue === 0 && currentValue > 0) {
    return { text: "N/A", className: "text-gray-400" };
  }
  
  // Format with + or - sign
  const prefix = percentChange > 0 ? "+" : "";
  const formattedText = `${prefix}${percentChange.toFixed(1)}%`;
  
  // Choose appropriate color
  let className = "text-gray-400";
  if (percentChange > 0) {
    className = "text-green-500"; // Positive change
  } else if (percentChange < 0) {
    className = "text-red-500"; // Negative change
  }
  
  return { text: formattedText, className };
} 
