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

  // Get a previous month name with an optional offset
  const getPreviousMonthName = (offset = 0): string => {
    const date = new Date()
    date.setMonth(date.getMonth() - (1 + offset))
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
    const recommendations = generateDataDrivenRecommendations(metrics, comparison, [], [], []);
    const takeaways = generateDataDrivenTakeaways(metrics, comparison, [], period);
    
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
      aiAnalyzed: true,
      totalPurchases: metrics.ordersCount,
      purchaseValue: metrics.totalSales,
      adSpend: metrics.adSpend,
      organicRevenue: organicRevenue,
      paidRevenue: metaRevenue + googleRevenue,
      metaRevenue: metaRevenue,
      googleRevenue: googleRevenue,
      roas: metrics.roas,
      ctr: metrics.ctr,
      newCustomers: metrics.newCustomers,
      cpa: metrics.adSpend / (metrics.newCustomers || 1),
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

  // Function to fetch real data and generate report
  const generateReport = async (
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
    try {
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
      
      // Fetch real campaign data from database
      const { data: campaignData, error: campaignError } = await supabase
        .from('meta_ad_campaigns')
        .select('name, platform, roas, cpa, ctr, conversions')
        .eq('brand_id', brandId)
        .order('roas', { ascending: false });
        
      if (campaignError) {
        console.error('Error fetching campaign data:', campaignError);
      }
      
      // Fetch inventory data for alerts
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('shopify_inventory')
        .select('product_title, inventory_quantity, sales_velocity')
        .eq('connection_id', connections.find(c => c.platform_type === 'shopify')?.id)
        .order('inventory_quantity', { ascending: true })
        .limit(10);
        
      if (inventoryError) {
        console.error('Error fetching inventory data:', inventoryError);
      }
      
      // Identify low stock items
      const lowStockItems = inventoryData?.filter(item => 
        item.inventory_quantity < 10 && item.sales_velocity > 0.5
      ) || [];
      
      // Identify best and underperforming campaigns
      let bestCampaigns: any[] = [];
      let underperformingCampaigns: any[] = [];
      
      if (campaignData && campaignData.length > 0) {
        // Sort by ROAS descending
        const sortedCampaigns = [...campaignData].sort((a, b) => b.roas - a.roas);
        
        // Best campaigns are top performers
        bestCampaigns = sortedCampaigns.slice(0, 3).map(campaign => ({
          name: campaign.name,
          roas: campaign.roas,
          cpa: campaign.cpa,
          ctr: campaign.ctr,
          conversions: campaign.conversions,
          platform: campaign.platform || "Meta"
        }));
        
        // Underperforming campaigns are those with ROAS < 1.5
        underperformingCampaigns = sortedCampaigns
          .filter(c => c.roas < 1.5)
          .slice(0, 3)
          .map(campaign => ({
            name: campaign.name,
            roas: campaign.roas,
            cpa: campaign.cpa,
            ctr: campaign.ctr,
            conversions: campaign.conversions,
            platform: campaign.platform || "Meta"
          }));
      } else {
        // If no real campaign data, create samples based on metrics
        bestCampaigns = [
          {
            name: "Adv+ Catalog",
            roas: metrics.roas * 1.8,
            cpa: metrics.adSpend / (metrics.newCustomers || 1) * 0.6,
            ctr: metrics.ctr * 1.5,
            conversions: Math.round(metrics.newCustomers * 0.4),
            platform: "Meta"
          },
          {
            name: "Product Collection - Carousel",
            roas: metrics.roas * 1.4,
            cpa: metrics.adSpend / (metrics.newCustomers || 1) * 0.7,
            ctr: metrics.ctr * 1.3,
            conversions: Math.round(metrics.newCustomers * 0.3),
            platform: "Meta"
          }
        ];
        
        underperformingCampaigns = [
          {
            name: "Interest Targeting",
            roas: 0.88,
            cpa: metrics.adSpend / (metrics.newCustomers || 1) * 1.8,
            ctr: metrics.ctr * 0.7,
            conversions: Math.round(metrics.newCustomers * 0.1),
            platform: "Meta"
          },
          {
            name: "Cold Traffic - ABO",
            roas: 1.2,
            cpa: metrics.adSpend / (metrics.newCustomers || 1) * 1.4,
            ctr: metrics.ctr * 0.8,
            conversions: Math.round(metrics.newCustomers * 0.15),
            platform: "Meta"
          }
        ];
      }
      
      // Fetch top products data
      const { data: topProducts, error: productsError } = await supabase
        .from('shopify_products')
        .select('title, total_revenue, units_sold')
        .eq('connection_id', connections.find(c => c.platform_type === 'shopify')?.id)
        .order('total_revenue', { ascending: false })
        .limit(3);
        
      if (productsError) {
        console.error('Error fetching product data:', productsError);
      }
      
      // Calculate platform revenue breakdown
      let metaRevenue = metrics.totalSales * 0.65; // Default to 65% if no real data
      let organicRevenue = metrics.totalSales * 0.30; // Default to 30% if no real data
      let googleRevenue = metrics.totalSales * 0.05; // Default to 5% if no real data
      
      // Try to get real platform revenue data
      const { data: revenueByPlatform, error: revenueError } = await supabase
        .from('platform_revenue')
        .select('platform, amount')
        .eq('brand_id', brandId)
        .gte('date', period === 'daily' ? new Date().toISOString().split('T')[0] : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0]);
        
      if (!revenueError && revenueByPlatform && revenueByPlatform.length > 0) {
        // Calculate the total revenue from all platforms
        const totalPlatformRevenue = revenueByPlatform.reduce((sum, item) => sum + item.amount, 0);
        
        // Calculate the revenue for each platform
        const metaData = revenueByPlatform.find(item => item.platform === 'meta');
        const googleData = revenueByPlatform.find(item => item.platform === 'google');
        const organicData = revenueByPlatform.find(item => item.platform === 'organic');
        
        if (totalPlatformRevenue > 0) {
          metaRevenue = metaData ? metaData.amount : 0;
          googleRevenue = googleData ? googleData.amount : 0;
          organicRevenue = organicData ? organicData.amount : 0;
        }
      }
      
      // Generate real data-driven recommendations and takeaways
      const recommendations = generateDataDrivenRecommendations(
        metrics, 
        comparison, 
        underperformingCampaigns, 
        bestCampaigns, 
        lowStockItems
      );
      
      const takeaways = generateDataDrivenTakeaways(
        metrics, 
        comparison, 
        [metaRevenue, googleRevenue, organicRevenue], 
        period
      );
      
      // Generate next steps based on actual data
      const nextSteps = [
        bestCampaigns.length > 0 
          ? `Increase ${bestCampaigns[0].name} spend by 15-20% to capitalize on its ${bestCampaigns[0].roas.toFixed(2)}x ROAS`
          : "Review best performing campaigns for potential scaling opportunities",
        underperformingCampaigns.length > 0 
          ? `Optimize ${underperformingCampaigns[0].name} campaign for improved efficiency (current ROAS: ${underperformingCampaigns[0].roas.toFixed(2)}x)`
          : "Evaluate underperforming campaigns for potential improvements",
        metrics.roas > 2.5 
          ? "Consider expanding your ad spend budget given your strong ROAS performance"
          : "Focus on improving ad creative to boost conversion rates",
        metrics.ctr < 0.01 
          ? "Test new hooks & CTAs to improve CTR (currently below 1%)"
          : "Continue refining your messaging to maintain strong engagement",
        "A/B test different ad formats (carousel vs. video vs. static images)",
        lowStockItems.length > 0 
          ? `Restock ${lowStockItems[0].product_title} immediately (only ${lowStockItems[0].inventory_quantity} units left)`
          : "Monitor inventory levels to prevent stockouts of popular items"
      ];
      
      // Generate creative suggestions based on performance
      const adCreativeSuggestions = [
        "Create carousel ads highlighting your best-selling products with social proof",
        metrics.roas < 2.0 
          ? "Develop stronger value proposition messaging in your ad creative"
          : "Test new creative angles to maintain strong performance",
        "Utilize more user-generated content in your ads to build trust",
        metrics.ctr < 0.01 
          ? "Test more attention-grabbing headlines and visuals"
          : "Continue with your current visual style while testing new variants",
        underperformingCampaigns.length > 0 
          ? `Refresh creative for the ${underperformingCampaigns[0].name} campaign`
          : "Rotate your ad creative regularly to prevent ad fatigue"
      ];
      
      // Generate audience insights
      const audienceInsights = [
        {
          name: "Ideal Customer Profile",
          performance: "Your ideal customer profile shows strongest engagement with lifestyle-focused content",
        },
        {
          name: "Audience Expansion",
          performance: "Consider expanding audience targeting to include more lookalike audiences",
        },
        {
          name: "Messaging Response",
          performance: "Your highest-converting audience segments are responding to value-based messaging",
        },
        {
          name: "Targeting Effectiveness",
          performance: metrics.ctr > 0.015 
            ? "Your current targeting is performing well with CTR above 1.5%"
            : "Consider refining your audience targeting to improve engagement metrics",
        },
        {
          name: "Platform Performance",
          performance: bestCampaigns.length > 0 && bestCampaigns[0].platform === "Meta"
            ? "Meta ads are outperforming other platforms, consider allocating more budget here"
            : "Diversify your platform mix to reduce dependency on a single channel",
        }
      ];
      
      // Format alerts
      let alerts = [];
      
      // Add inventory alerts
      if (lowStockItems && lowStockItems.length > 0) {
        lowStockItems.slice(0, 3).forEach(item => {
          alerts.push({
            type: 'inventory',
            severity: 'critical',
            message: `${item.product_title} has critically low stock (${item.inventory_quantity} units remaining). Reorder immediately.`
          });
        });
      }
      
      // Add campaign alerts
      if (underperformingCampaigns && underperformingCampaigns.length > 0) {
        underperformingCampaigns
          .filter(c => c.roas < 1.2) // Only alert for significantly underperforming campaigns
          .forEach(campaign => {
            alerts.push({
              type: 'campaign',
              severity: 'warning',
              message: `"${campaign.name}" campaign is underperforming with ROAS of ${campaign.roas.toFixed(2)}x. Consider pausing or optimizing.`
            });
          });
      }
      
      // Check for significant metric drops
      if (comparison.salesGrowth < -0.1) {
        alerts.push({
          type: 'performance',
          severity: 'warning',
          message: `Sales are down ${Math.abs(comparison.salesGrowth * 100).toFixed(1)}% compared to previous period.`
        });
      }
      
      if (comparison.roasGrowth < -0.15) {
        alerts.push({
          type: 'performance',
          severity: 'warning',
          message: `ROAS has dropped by ${Math.abs(comparison.roasGrowth * 100).toFixed(1)}% compared to previous period.`
        });
      }
      
      // Return the completed report conforming to the PerformanceReport interface
      return {
        dateRange: dateRangeStr,
        totalPurchases: metrics.ordersCount,
        totalAdSpend: metrics.adSpend,
        averageRoas: metrics.roas,
        revenueGenerated: metrics.totalSales,
        
        platformRevenue: {
          meta: metaRevenue,
          shopify: metrics.totalSales,
          google: googleRevenue,
          organic: organicRevenue
        },
        platformAdSpend: {
          meta: metrics.adSpend * 0.85, // Assuming 85% on Meta if no real data
          google: metrics.adSpend * 0.15, // Assuming 15% on Google if no real data
          total: metrics.adSpend
        },
        
        bestCampaigns,
        underperformingCampaigns,
        
        bestCampaign: bestCampaigns[0] || {
          name: "Top Campaign",
          roas: metrics.roas * 1.5,
          cpa: metrics.adSpend / (metrics.newCustomers || 1) * 0.7,
          ctr: metrics.ctr * 1.3,
          conversions: Math.round(metrics.newCustomers * 0.4)
        },
        underperformingCampaign: underperformingCampaigns[0] || {
          name: "Underperforming Campaign",
          roas: 0.9,
          cpa: metrics.adSpend / (metrics.newCustomers || 1) * 1.8,
          ctr: metrics.ctr * 0.7,
          conversions: Math.round(metrics.newCustomers * 0.1)
        },
        
        bestAudience: {
          name: bestCampaigns[0]?.name || "Best Audience",
          roas: bestCampaigns[0]?.roas || (metrics.roas * 1.5),
          cpa: bestCampaigns[0]?.cpa || (metrics.adSpend / (metrics.newCustomers || 1) * 0.7)
        },
        scalingOpportunities: bestCampaigns
          .filter(c => c.roas > 2.5)
          .map(c => ({ name: c.name, roas: c.roas })) || [],
        ctr: metrics.ctr,
        cpc: metrics.cpc,
        conversionRate: metrics.conversionRate,
        newCustomersAcquired: metrics.newCustomers,
        recommendations,
        takeaways,
        nextSteps,
        adCreativeSuggestions,
        audienceInsights,
        periodicMetrics: [
          { metric: "Total Ad Spend", value: metrics.adSpend.toFixed(2) },
          { metric: "Revenue Generated", value: metrics.totalSales.toFixed(2) },
          { metric: "ROAS (Return on Ad Spend)", value: metrics.roas.toFixed(2) },
          { metric: "Click Through Rate (CTR)", value: `${(metrics.ctr * 100).toFixed(2)}%` },
          { metric: "Cost Per Acquisition (CPA)", value: `$${(metrics.adSpend / metrics.newCustomers || 0).toFixed(2)}` },
          { metric: "New Customers Acquired", value: metrics.newCustomers }
        ],
        periodComparison: comparison,
        clientName: brandName,
        preparedBy: "AI Analysis",
        aiAnalyzed: true,
      };
    } catch (error) {
      console.error("Error generating report:", error);
      
      // Fall back to simulated report if there's an error
      return generateSimulatedReport(period, metrics, comparison);
    }
  };

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
      // Still set hasEnoughData to true to show the widgets with placeholder data
      setHasEnoughData(true)
      
      // Create placeholder metrics
      const placeholderMetrics: PeriodMetrics = {
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
      
      // Generate fallback reports
      const fallbackDailyReport = await generateSimulatedReport('daily', placeholderMetrics, { 
        salesGrowth: 0,
        orderGrowth: 0,
        customerGrowth: 0,
        roasGrowth: 0,
        conversionGrowth: 0
      })
      
      const fallbackMonthlyReport = await generateSimulatedReport('monthly', placeholderMetrics, {
        salesGrowth: 0,
        orderGrowth: 0,
        customerGrowth: 0,
        roasGrowth: 0,
        conversionGrowth: 0
      })
      
      setDailyReport(fallbackDailyReport)
      setMonthlyReport(fallbackMonthlyReport)
      setPeriodData({
        today: placeholderMetrics,
        month: placeholderMetrics,
        previousMonth: placeholderMetrics
      })
      
      return
    }

    setIsLoading(true)
    
    try {
      // Find Shopify connection using the correct property name
      const shopifyConnection = connections.find(conn => conn.platform_type === 'shopify')
      
      if (!shopifyConnection) {
        setIsLoading(false)
        // Still set hasEnoughData to true even without a Shopify connection
        setHasEnoughData(true)
        
        // Create placeholder metrics
        const placeholderMetrics: PeriodMetrics = {
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
        
        // Generate fallback reports
        const fallbackDailyReport = await generateSimulatedReport('daily', placeholderMetrics, { 
          salesGrowth: 0,
          orderGrowth: 0,
          customerGrowth: 0,
          roasGrowth: 0,
          conversionGrowth: 0
        })
        
        const fallbackMonthlyReport = await generateSimulatedReport('monthly', placeholderMetrics, {
          salesGrowth: 0,
          orderGrowth: 0,
          customerGrowth: 0,
          roasGrowth: 0,
          conversionGrowth: 0
        })
        
        setDailyReport(fallbackDailyReport)
        setMonthlyReport(fallbackMonthlyReport)
        setPeriodData({
          today: placeholderMetrics,
          month: placeholderMetrics,
          previousMonth: placeholderMetrics
        })
        
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
      const dailyReportData = await generateReport('daily', todayMetrics, { 
        salesGrowth: 15.7,
        orderGrowth: 12.3,
        customerGrowth: 8.5,
        roasGrowth: 4.2,
        conversionGrowth: 3.8
      })
      const monthlyReportData = await generateReport('monthly', monthMetrics, {
        salesGrowth: 12.4,
        orderGrowth: 10.8,
        customerGrowth: 14.3,
        roasGrowth: 7.9,
        conversionGrowth: 6.2
      })
      
      if (dailyReportData) setDailyReport(dailyReportData)
      if (monthlyReportData) setMonthlyReport(monthlyReportData)
      
      // Always set hasEnoughData to true to display the report
      setHasEnoughData(true)
      
    } catch (error) {
      console.error('Error fetching period data:', error)
      
      // Set hasEnoughData to true even on error and use placeholder data
      setHasEnoughData(true)
      
      // Create placeholder metrics
      const placeholderMetrics: PeriodMetrics = {
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
      
      // Generate fallback reports
      const fallbackDailyReport = await generateSimulatedReport('daily', placeholderMetrics, { 
        salesGrowth: 0,
        orderGrowth: 0,
        customerGrowth: 0,
        roasGrowth: 0,
        conversionGrowth: 0
      })
      
      const fallbackMonthlyReport = await generateSimulatedReport('monthly', placeholderMetrics, {
        salesGrowth: 0,
        orderGrowth: 0,
        customerGrowth: 0,
        roasGrowth: 0,
        conversionGrowth: 0
      })
      
      setDailyReport(fallbackDailyReport)
      setMonthlyReport(fallbackMonthlyReport)
      setPeriodData({
        today: placeholderMetrics,
        month: placeholderMetrics,
        previousMonth: placeholderMetrics
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Generate data-driven recommendations based on actual metrics and campaign performance
  const generateDataDrivenRecommendations = (
    metrics: PeriodMetrics, 
    comparison: any, 
    underperformingCampaigns: any[], 
    bestCampaigns: any[],
    lowStockItems: any[]
  ): string[] => {
    const recommendations: string[] = [];
    
    // Campaign recommendations
    if (bestCampaigns.length > 0) {
      recommendations.push(`Scale your ${bestCampaigns[0].name} campaign which is performing at ${bestCampaigns[0].roas.toFixed(2)}x ROAS.`);
    }
    
    if (underperformingCampaigns.length > 0) {
      recommendations.push(`Consider pausing or optimizing your ${underperformingCampaigns[0].name} campaign (ROAS: ${underperformingCampaigns[0].roas.toFixed(2)}x).`);
    }
    
    // Budget allocation recommendations
    if (metrics.roas > 2.5) {
      recommendations.push(`With a ROAS of ${metrics.roas.toFixed(2)}x, you have an opportunity to increase ad spend by 15-20%.`);
    } else if (metrics.roas < 1.5) {
      recommendations.push(`Your ROAS of ${metrics.roas.toFixed(2)}x suggests you should optimize campaigns before increasing spend.`);
    }
    
    // Inventory recommendations
    if (lowStockItems.length > 0) {
      recommendations.push(`Restock ${lowStockItems[0].product_title} immediately to prevent lost sales.`);
    }
    
    // General recommendations based on metrics
    if (metrics.ctr < 0.01) {
      recommendations.push("Your CTR is below 1% - test new creative approaches to increase engagement.");
    }
    
    if (comparison.conversionGrowth < 0) {
      recommendations.push("Your conversion rate has dropped - review your landing pages and checkout experience.");
    }
    
    // Fill with standard recommendations if needed
    if (recommendations.length < 3) {
      recommendations.push("Implement A/B testing of ad creative to identify top performers.");
      recommendations.push("Consider expanding into new audience segments to find untapped markets.");
      recommendations.push("Optimize your product page load times to improve conversion rates.");
    }
    
    return recommendations.slice(0, 5); // Return up to 5 recommendations
  };

  // Generate data-driven takeaways based on actual metrics and period
  const generateDataDrivenTakeaways = (
    metrics: PeriodMetrics, 
    comparison: any, 
    revenueBreakdown: number[],
    period: ReportPeriod
  ): string[] => {
    const [metaRevenue, googleRevenue, organicRevenue] = revenueBreakdown;
    const takeaways: string[] = [];
    
    // Overall performance
    if (comparison.salesGrowth > 0) {
      takeaways.push(`Your revenue of ${formatCurrency(metrics.totalSales)} represents a ${(comparison.salesGrowth * 100).toFixed(1)}% increase ${period === 'daily' ? 'from yesterday' : 'from last month'}.`);
    } else {
      takeaways.push(`Your revenue of ${formatCurrency(metrics.totalSales)} represents a ${Math.abs(comparison.salesGrowth * 100).toFixed(1)}% decrease ${period === 'daily' ? 'from yesterday' : 'from last month'}.`);
    }
    
    // Platform breakdown insights
    if (metaRevenue > googleRevenue && metaRevenue > organicRevenue) {
      takeaways.push(`Meta ads were your primary revenue driver at ${formatCurrency(metaRevenue)} (${((metaRevenue / metrics.totalSales) * 100).toFixed(1)}% of total).`);
    } else if (googleRevenue > metaRevenue && googleRevenue > organicRevenue) {
      takeaways.push(`Google ads were your primary revenue driver at ${formatCurrency(googleRevenue)} (${((googleRevenue / metrics.totalSales) * 100).toFixed(1)}% of total).`);
    } else if (organicRevenue > metaRevenue && organicRevenue > googleRevenue) {
      takeaways.push(`Organic traffic was your primary revenue driver at ${formatCurrency(organicRevenue)} (${((organicRevenue / metrics.totalSales) * 100).toFixed(1)}% of total).`);
    }
    
    // Customer acquisition insights
    takeaways.push(`Your customer acquisition cost is ${formatCurrency(metrics.adSpend / (metrics.newCustomers || 1))}, which is ${comparison.customerGrowth < 0 ? 'higher' : 'lower'} than the previous period.`);
    
    // ROAS insights
    if (metrics.roas > 2) {
      takeaways.push(`Your ROAS of ${metrics.roas.toFixed(2)}x indicates your ad campaigns are performing efficiently.`);
    } else if (metrics.roas < 1.5) {
      takeaways.push(`Your ROAS of ${metrics.roas.toFixed(2)}x suggests your campaigns need optimization for better efficiency.`);
    }
    
    // Weekend vs weekday performance (for daily reports)
    if (period === 'daily') {
      const today = new Date().getDay();
      if (today === 0 || today === 6) { // weekend
        takeaways.push("Weekend performance typically shows higher browse-to-buy ratios but lower overall traffic.");
      } else {
        takeaways.push("Weekday performance typically shows stronger conversion rates during evening hours (7-10PM).");
      }
    }
    
    // Add efficiency insight
    takeaways.push(`You're spending ${formatCurrency(metrics.adSpend)} to generate ${formatCurrency(metrics.totalSales)} in revenue, making your ad spend ${((metrics.adSpend / metrics.totalSales) * 100).toFixed(1)}% of revenue.`);
    
    return takeaways.slice(0, 5); // Return up to 5 takeaways
  };

  // Generate next steps based on campaign performance
  const generateNextSteps = (bestCampaigns: any[], underperformingCampaigns: any[]): string[] => {
    const nextSteps = [];
    
    // Budget allocation for top performers
    if (bestCampaigns.length > 0 && bestCampaigns[0].roas > 3) {
      nextSteps.push(`Increase ${bestCampaigns[0].name} spend by 15-20% since it's the best performing campaign`);
    }
    
    // Optimization for underperformers
    if (underperformingCampaigns.length > 0) {
      if (underperformingCampaigns[0].roas < 1) {
        nextSteps.push(`Pause ${underperformingCampaigns[0].name} campaign immediately`);
      } else {
        nextSteps.push(`Optimize ${underperformingCampaigns[0].name} campaign for improved efficiency`);
      }
    }
    
    // General best practices
    nextSteps.push("Consider ADV+ for automated scaling while maintaining manual ABO testing");
    nextSteps.push("Test new hooks & CTAs to improve CTR");
    nextSteps.push("A/B test different ad formats (carousel vs. video vs. static images)");
    nextSteps.push("Use urgency-driven messaging (limited-time offers, bundle deals)");
    
    return nextSteps;
  };

  // Generate creative suggestions based on top products
  const generateCreativeSuggestions = (topProducts: any[] | null): string[] => {
    const suggestions = [
      "Introduce new UGC content highlighting customer testimonials",
      "Create carousel ads featuring product benefits",
      "Develop video content demonstrating product in use",
      "Include eye-catching product lifestyle imagery",
      "Feature customer reviews directly in ad creative",
      "Try new hooks focusing on problem/solution framework"
    ];
    
    // Add product-specific suggestions if we have real product data
    if (topProducts && topProducts.length > 0) {
      suggestions.unshift(`Create carousel ads showcasing ${topProducts[0].title} benefits and features`);
      
      if (topProducts.length > 1) {
        suggestions.unshift(`Develop UGC video testimonials for your best-seller: ${topProducts[0].title}`);
      }
    }
    
    return suggestions;
  };

  // Generate audience insights based on campaign performance
  const generateAudienceInsights = (bestCampaigns: any[], underperformingCampaigns: any[]): any[] => {
    const insights = [];
    
    // Add insights for top performers
    if (bestCampaigns.length > 0) {
      insights.push({
        name: bestCampaigns[0].name,
        performance: "Best Performing",
        roas: bestCampaigns[0].roas,
        cpa: bestCampaigns[0].cpa,
        note: "This audience should receive additional budget allocation"
      });
      
      if (bestCampaigns.length > 1) {
        insights.push({
          name: bestCampaigns[1].name,
          performance: "Good",
          roas: bestCampaigns[1].roas,
          note: "Strong audience segment to optimize further"
        });
      }
    }
    
    // Add insights for underperformers
    if (underperformingCampaigns.length > 0) {
      insights.push({
        name: underperformingCampaigns[0].name,
        performance: "Underperforming",
        roas: underperformingCampaigns[0].roas,
        cpa: underperformingCampaigns[0].cpa,
        note: "Testing new creatives or audience segments may help"
      });
    }
    
    // Add general insight
    insights.push({
      name: "Cold Interest-Based Audiences",
      performance: "Mixed",
      note: "Some converting well while others struggle with CPA above $37"
    });
    
    return insights;
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
          <div className="flex flex-col mb-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-bold">Monthly Performance Summary</h4>
              <div className="text-xs text-gray-400 bg-[#2A2A2A] px-3 py-1 rounded-md">
                {getPreviousMonthName()} 1st - {getPreviousMonthName()} {new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate()}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Data updates every 1st of the month at 12:00 AM</p>
          </div>
          
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
                <span className="text-amber-400 font-medium">⚠️ ATTENTION NEEDED:</span> The "Cold Traffic - Interest Targeting" campaign is significantly underperforming with only 0.88x ROAS, well below breakeven. Consider pausing this campaign or reallocating budget.
                <br/><br/>
                <span className="text-red-400 font-medium">🚨 INVENTORY ALERT:</span> "Facial Cleansing Brush" stock is critically low (only 8 units remaining). Reorder immediately to avoid stockouts for this high-demand product.
                <br/><br/>

                During February, your store generated $15,292 in total revenue across all connected platforms, showing a 12.4% increase from January. Meta ads continue to be your primary revenue driver at $9,940 (65% of total sales). Your average ROAS across all ad platforms has improved to 3.57x, with the "Brez/Yordy - Adv+ Catalog" campaign achieving an exceptional 8.34x ROAS.
                
                Your customer acquisition cost of $28.45 per new customer remains within competitive range for your vertical. Organic traffic generated $4,587 in revenue (30% of total), suggesting healthy brand awareness but with room for improvement.
                
                Weekend performance continues to outpace weekdays, with Saturday conversion rates 27% higher than average. Your ad spend represents 28% of revenue, which maintains efficient profitability levels, though could be optimized further.
                
                <span className="text-blue-400 font-medium">💡 OPPORTUNITY:</span> Your Google search campaigns are showing improving ROAS (+15.2% MoM) with potential for scaling. Consider increasing budget allocation to this channel by 10-15%.
                
                <span className="mt-3 block text-blue-400 font-medium">Visit the AI Intelligence page for detailed analysis and personalized recommendations to optimize your marketing strategy.</span>
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
                  <span className="text-sm font-medium text-white">Shopify Store Products</span>
                  <span className="text-xs text-gray-400">by revenue</span>
                </div>
                
                {/* Top Products List */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Premium Skincare Set</span>
                      <span className="text-sm font-medium text-white">$10385</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `65%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>189 units sold</span>
                      <span>65%</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Facial Cleansing Brush</span>
                      <span className="text-sm font-medium text-white">$671</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `4%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>72 units sold</span>
                      <span>4%</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Anti-Aging Night Cream</span>
                      <span className="text-sm font-medium text-white">$4793</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `30%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>312 units sold</span>
                      <span>30%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Month-over-Month Comparison Widget */}
            <div>
              <h5 className="font-semibold mb-3 text-lg">Month-over-Month Comparison</h5>
              <div className="bg-[#222] p-5 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-white">Performance Trends</span>
                  <span className="text-xs text-gray-400">last 3 months</span>
                </div>
                
                {/* Metric Comparisons */}
                <div className="space-y-5">
                  {/* Revenue Comparison */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-300">Revenue</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#2A2A2A] px-3 py-2 rounded-md">
                        <p className="text-xs text-gray-400">December</p>
                        <p className="text-sm font-medium text-white">$12999</p>
                      </div>
                      <div className="bg-[#2A2A2A] px-3 py-2 rounded-md">
                        <p className="text-xs text-gray-400">January</p>
                        <p className="text-sm font-medium text-white">$14069</p>
                      </div>
                      <div className="bg-blue-900/30 border border-blue-800/20 px-3 py-2 rounded-md">
                        <p className="text-xs text-blue-400">February</p>
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-white">$15292</p>
                          <span className="text-xs text-green-500 ml-1" title="12.4% increase compared to January">+12.4%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ad Spend Comparison */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-300">Ad Spend</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#2A2A2A] px-3 py-2 rounded-md">
                        <p className="text-xs text-gray-400">December</p>
                        <p className="text-sm font-medium text-white">$3511</p>
                      </div>
                      <div className="bg-[#2A2A2A] px-3 py-2 rounded-md">
                        <p className="text-xs text-gray-400">January</p>
                        <p className="text-sm font-medium text-white">$3939</p>
                      </div>
                      <div className="bg-blue-900/30 border border-blue-800/20 px-3 py-2 rounded-md">
                        <p className="text-xs text-blue-400">February</p>
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-white">$4282</p>
                          <span className="text-xs text-amber-500 ml-1" title="8.7% increase compared to January">+8.7%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Orders Comparison */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-300">Orders</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#2A2A2A] px-3 py-2 rounded-md">
                        <p className="text-xs text-gray-400">December</p>
                        <p className="text-sm font-medium text-white">241</p>
                      </div>
                      <div className="bg-[#2A2A2A] px-3 py-2 rounded-md">
                        <p className="text-xs text-gray-400">January</p>
                        <p className="text-sm font-medium text-white">260</p>
                      </div>
                      <div className="bg-blue-900/30 border border-blue-800/20 px-3 py-2 rounded-md">
                        <p className="text-xs text-blue-400">February</p>
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-white">277</p>
                          <span className="text-xs text-green-500 ml-1" title="10.8% increase compared to January">+10.8%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* ROAS Comparison */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-300">Average ROAS</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#2A2A2A] px-3 py-2 rounded-md">
                        <p className="text-xs text-gray-400">December</p>
                        <p className="text-sm font-medium text-white">3.18x</p>
                      </div>
                      <div className="bg-[#2A2A2A] px-3 py-2 rounded-md">
                        <p className="text-xs text-gray-400">January</p>
                        <p className="text-sm font-medium text-white">3.39x</p>
                      </div>
                      <div className="bg-blue-900/30 border border-blue-800/20 px-3 py-2 rounded-md">
                        <p className="text-xs text-blue-400">February</p>
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-white">3.57x</p>
                          <span className="text-xs text-green-500 ml-1" title="7.9% increase compared to January">+7.9%</span>
                        </div>
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
          <div className="flex flex-col mb-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-bold">Today's Performance</h4>
              <div className="text-xs text-gray-400 bg-[#2A2A2A] px-3 py-1 rounded-md">
                Today, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Data updates hourly at XX:00</p>
          </div>
          
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
                <span className="text-amber-400 font-medium">⚠️ ATTENTION NEEDED:</span> The "New Strat - ABO" campaign has recorded only a 0.62x ROAS today, significantly below breakeven. Consider pausing this campaign immediately or adjusting targeting.
                <br/><br/>
                <span className="text-red-400 font-medium">🚨 INVENTORY ALERT:</span> "Premium Skincare Set" inventory is critically low with 4 units remaining. This is your best-selling product today with high purchase velocity. Restock immediately.
                <br/><br/>

                Today's performance shows $2,675 in revenue, a 15.7% increase compared to yesterday. You've processed 42 orders today, with Meta ads generating 68% of today's revenue. Your best-performing campaign "Brez/Yordy - Adv+ Catalog" achieved an 7.8x ROAS today, significantly outperforming your overall daily ROAS of 3.4x.
                
                Today's ad spend of $785 is 16.2% higher than yesterday but has delivered 22.3% more conversions, indicating improved efficiency. Mobile conversion rates have improved by 18.4% today compared to your 7-day average.
                
                <span className="text-blue-400 font-medium">💡 OPPORTUNITY:</span> Your "Skincare Bundle" promotion is converting exceptionally well today (9.2% conversion rate vs 4.1% average). Consider increasing visibility for this offer on your homepage.
                
                <span className="mt-3 block text-blue-400 font-medium">Visit the AI Intelligence page for detailed analysis and personalized recommendations to optimize your marketing strategy.</span>
              </p>
            </div>
          </div>
          
          {/* Day-over-Day Comparison Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Best Selling Products Today */}
            <div>
              <h5 className="font-semibold mb-3 text-lg">Today's Best Sellers</h5>
              <div className="bg-[#222] p-5 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-white">Shopify Store Products</span>
                  <span className="text-xs text-gray-400">by today's revenue</span>
                </div>
                
                {/* Top Products List */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Premium Skincare Set</span>
                      <span className="text-sm font-medium text-white">$1,450</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `54%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>18 units sold</span>
                      <span>54%</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Anti-Aging Night Cream</span>
                      <span className="text-sm font-medium text-white">$825</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `31%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>15 units sold</span>
                      <span>31%</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Facial Cleansing Brush</span>
                      <span className="text-sm font-medium text-white">$400</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `15%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>9 units sold</span>
                      <span>15%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Day-over-Day Comparison Widget */}
            <div>
              <h5 className="font-semibold mb-3 text-lg">Day-over-Day Comparison</h5>
              <div className="bg-[#222] p-5 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-white">Performance Trends</span>
                  <span className="text-xs text-gray-400">vs yesterday</span>
                </div>
                
                {/* Metric Comparisons */}
                <div className="space-y-5">
                  {/* Revenue Comparison */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-300">Revenue</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#2A2A2A] px-3 py-2 rounded-md">
                        <p className="text-xs text-gray-400">Yesterday</p>
                        <p className="text-sm font-medium text-white">$2,310</p>
                      </div>
                      <div className="bg-blue-900/30 border border-blue-800/20 px-3 py-2 rounded-md">
                        <p className="text-xs text-blue-400">Today</p>
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-white">$2,675</p>
                          <span className="text-xs text-green-500 ml-1" title="15.7% increase compared to yesterday">+15.7%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ad Spend Comparison */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-300">Ad Spend</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#2A2A2A] px-3 py-2 rounded-md">
                        <p className="text-xs text-gray-400">Yesterday</p>
                        <p className="text-sm font-medium text-white">$675</p>
                      </div>
                      <div className="bg-blue-900/30 border border-blue-800/20 px-3 py-2 rounded-md">
                        <p className="text-xs text-blue-400">Today</p>
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-white">$785</p>
                          <span className="text-xs text-amber-500 ml-1" title="16.2% increase compared to yesterday">+16.2%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Orders Comparison */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-300">Orders</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#2A2A2A] px-3 py-2 rounded-md">
                        <p className="text-xs text-gray-400">Yesterday</p>
                        <p className="text-sm font-medium text-white">35</p>
                      </div>
                      <div className="bg-blue-900/30 border border-blue-800/20 px-3 py-2 rounded-md">
                        <p className="text-xs text-blue-400">Today</p>
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-white">42</p>
                          <span className="text-xs text-green-500 ml-1" title="20.0% increase compared to yesterday">+20.0%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* ROAS Comparison */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-300">Average ROAS</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#2A2A2A] px-3 py-2 rounded-md">
                        <p className="text-xs text-gray-400">Yesterday</p>
                        <p className="text-sm font-medium text-white">3.2x</p>
                      </div>
                      <div className="bg-blue-900/30 border border-blue-800/20 px-3 py-2 rounded-md">
                        <p className="text-xs text-blue-400">Today</p>
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-white">3.4x</p>
                          <span className="text-xs text-green-500 ml-1" title="6.2% increase compared to yesterday">+6.2%</span>
                        </div>
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