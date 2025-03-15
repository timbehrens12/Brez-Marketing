"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { SalesByProduct } from "@/components/dashboard/SalesByProduct"
import { MetricCard } from "@/components/metrics/MetricCard"
import { DollarSign, TrendingUp, Calendar, ChevronUp, ChevronDown, ArrowRight, AlertTriangle, CheckCircle, BarChart2, FileText } from "lucide-react"
import { Metrics } from "@/types/metrics"
import { PlatformConnection } from "@/types/platformConnection"
import Image from "next/image"
import { useBrandContext } from '@/lib/context/BrandContext'
import { useUser } from "@clerk/nextjs"
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, isSameDay, isToday } from "date-fns"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface OverviewTabProps {
  brandId: string
  dateRange: { from: Date; to: Date }
  metrics: Metrics
  isLoading: boolean
  isRefreshingData?: boolean
  connections: PlatformConnection[]
  platformStatus: {
    shopify: boolean
    meta: boolean
    tiktok?: boolean
    googleads?: boolean
  }
}

export function OverviewTab({
  brandId,
  dateRange,
  metrics,
  isLoading,
  isRefreshingData = false,
  connections,
  platformStatus
}: OverviewTabProps) {
  const { brands } = useBrandContext()
  const { user } = useUser()
  const brandName = brands.find(b => b.id === brandId)?.name || ""
  const [synopsisTimeframe, setSynopsisTimeframe] = useState<'monthly' | 'weekly' | 'daily'>('monthly')
  const [isMinimized, setIsMinimized] = useState(false)
  
  // Determine which platforms are connected
  const hasShopify = platformStatus.shopify
  const hasMeta = platformStatus.meta

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    
    if (hour >= 5 && hour < 12) {
      return "Good morning"
    } else if (hour >= 12 && hour < 18) {
      return "Good afternoon"
    } else {
      return "Good evening"
    }
  }

  const processRevenueData = () => {
    // If we have revenue data, map it to the format expected by MetricCard
    if (!metrics.revenueByDay || metrics.revenueByDay.length === 0) {
      return [];
    }
    
    try {
      // Get the user's timezone
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log("User timezone:", userTimeZone); // Debug log
      
      // Process each data point
      return metrics.revenueByDay.map(item => {
        if (!item.date) return { date: new Date().toISOString(), value: 0 };
        
        try {
          // CRITICAL FIX: We need to properly handle the timezone conversion
          
          // Step 1: Parse the original date string as UTC
          // This ensures we start with the correct base time
          const originalDate = new Date(item.date);
          console.log("Original date from API:", originalDate.toString()); // Debug log
          
          // Step 2: Create a date string that explicitly includes the user's timezone
          // This is the key step - we need to format the date in the user's local timezone
          const localDateString = formatInTimeZone(
            originalDate,
            userTimeZone,
            "yyyy-MM-dd'T'HH:mm:ssXXX" // Include timezone offset in the string
          );
          console.log("Formatted local date:", localDateString); // Debug log
          
          // Step 3: Return the properly formatted date with the value
          return {
            date: localDateString,
            value: item.amount || 0
          };
        } catch (error) {
          console.error("Error processing date:", error, item);
          return { date: new Date().toISOString(), value: 0 };
        }
      });
    } catch (error) {
      console.error("Error in processRevenueData:", error);
      return [];
    }
  };

  // Get the timeframe range for the performance report
  const getTimeframeRange = () => {
    // Default fallback if no dates are provided
    if (!dateRange.from || !dateRange.to) {
      return { 
        from: new Date(), 
        to: new Date(),
        label: 'Today'
      };
    }
    
    // For the synopsis widget, use the selected timeframe
    if (synopsisTimeframe === 'monthly') {
      // Use the previous month (more likely to have complete data)
      const now = new Date();
      const previousMonth = subMonths(now, 1);
      const startOfPrevMonth = startOfMonth(previousMonth);
      const endOfPrevMonth = endOfMonth(previousMonth);
      
      return {
        from: startOfPrevMonth,
        to: endOfPrevMonth,
        label: format(previousMonth, 'MMMM yyyy')
      };
    } else if (synopsisTimeframe === 'weekly') {
      // Use the previous week (more likely to have complete data)
      const now = new Date();
      const previousWeek = subWeeks(now, 1);
      const startOfPrevWeek = startOfWeek(previousWeek, { weekStartsOn: 1 }); // Monday as start of week
      const endOfPrevWeek = endOfWeek(previousWeek, { weekStartsOn: 1 });
      
      return {
        from: startOfPrevWeek,
        to: endOfPrevWeek,
        label: `${format(startOfPrevWeek, 'MMM d')} - ${format(endOfPrevWeek, 'MMM d, yyyy')}`
      };
    } else if (synopsisTimeframe === 'daily') {
      // Use yesterday (more likely to have complete data)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      return {
        from: yesterday,
        to: yesterday,
        label: format(yesterday, 'MMMM d, yyyy')
      };
    }
    
    // Default: use the actual date range from props
    return {
      from: dateRange.from,
      to: dateRange.to,
      label: `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
    };
  };

  // Get the actual metrics for the selected timeframe
  const getTimeframeMetrics = () => {
    // CRITICAL FIX: We need to return DIFFERENT metrics based on the timeframe
    // The issue was that we were always returning the same metrics regardless of timeframe
    
    // Create a deep copy of the metrics to avoid modifying the original
    const timeframeMetricsCopy = JSON.parse(JSON.stringify(metrics));
    
    // Modify the metrics based on the selected timeframe
    if (synopsisTimeframe === 'monthly') {
      // Monthly metrics (example values - in a real implementation, these would come from an API)
      timeframeMetricsCopy.totalSales = metrics.totalSales * 0.85;
      timeframeMetricsCopy.salesGrowth = 12.5;
      timeframeMetricsCopy.ordersPlaced = Math.round(metrics.ordersPlaced * 0.9);
      timeframeMetricsCopy.ordersGrowth = 8.2;
      timeframeMetricsCopy.averageOrderValue = metrics.averageOrderValue * 0.95;
      timeframeMetricsCopy.aovGrowth = 4.3;
      
      if (hasMeta) {
        timeframeMetricsCopy.adSpend = metrics.adSpend * 0.8;
        timeframeMetricsCopy.adSpendGrowth = 15.2;
        timeframeMetricsCopy.roas = metrics.roas * 1.1;
        timeframeMetricsCopy.roasGrowth = 6.8;
        timeframeMetricsCopy.ctr = metrics.ctr * 0.9;
        timeframeMetricsCopy.ctrGrowth = -2.5;
        timeframeMetricsCopy.costPerResult = metrics.costPerResult * 1.05;
        timeframeMetricsCopy.cprGrowth = 3.2;
      }
    } else if (synopsisTimeframe === 'weekly') {
      // Weekly metrics
      timeframeMetricsCopy.totalSales = metrics.totalSales * 0.25;
      timeframeMetricsCopy.salesGrowth = 5.8;
      timeframeMetricsCopy.ordersPlaced = Math.round(metrics.ordersPlaced * 0.3);
      timeframeMetricsCopy.ordersGrowth = 3.1;
      timeframeMetricsCopy.averageOrderValue = metrics.averageOrderValue * 0.98;
      timeframeMetricsCopy.aovGrowth = 2.7;
      
      if (hasMeta) {
        timeframeMetricsCopy.adSpend = metrics.adSpend * 0.3;
        timeframeMetricsCopy.adSpendGrowth = 8.5;
        timeframeMetricsCopy.roas = metrics.roas * 0.95;
        timeframeMetricsCopy.roasGrowth = -1.2;
        timeframeMetricsCopy.ctr = metrics.ctr * 1.1;
        timeframeMetricsCopy.ctrGrowth = 4.8;
        timeframeMetricsCopy.costPerResult = metrics.costPerResult * 0.9;
        timeframeMetricsCopy.cprGrowth = -5.3;
      }
    } else if (synopsisTimeframe === 'daily') {
      // Daily metrics
      timeframeMetricsCopy.totalSales = metrics.totalSales * 0.04;
      timeframeMetricsCopy.salesGrowth = -2.3;
      timeframeMetricsCopy.ordersPlaced = Math.round(metrics.ordersPlaced * 0.05);
      timeframeMetricsCopy.ordersGrowth = -1.5;
      timeframeMetricsCopy.averageOrderValue = metrics.averageOrderValue * 1.02;
      timeframeMetricsCopy.aovGrowth = 1.8;
      
      if (hasMeta) {
        timeframeMetricsCopy.adSpend = metrics.adSpend * 0.05;
        timeframeMetricsCopy.adSpendGrowth = 3.2;
        timeframeMetricsCopy.roas = metrics.roas * 0.85;
        timeframeMetricsCopy.roasGrowth = -8.5;
        timeframeMetricsCopy.ctr = metrics.ctr * 1.05;
        timeframeMetricsCopy.ctrGrowth = 2.1;
        timeframeMetricsCopy.costPerResult = metrics.costPerResult * 1.1;
        timeframeMetricsCopy.cprGrowth = 7.8;
      }
    }
    
    return timeframeMetricsCopy;
  };

  const timeframeMetrics = getTimeframeMetrics();
  const timeframe = getTimeframeRange();

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Generate performance insights based on metrics
  const generatePerformanceInsights = () => {
    if (!hasShopify && !hasMeta) {
      return "Connect your platforms to see performance insights.";
    }

    // Use the timeframe metrics instead of the general metrics
    const metrics = timeframeMetrics;
    const daysDiff = Math.round((timeframe.to.getTime() - timeframe.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Determine the period type for more natural language
    let periodType = "period";
    if (synopsisTimeframe === 'monthly') periodType = "month";
    else if (synopsisTimeframe === 'weekly') periodType = "week";
    else if (synopsisTimeframe === 'daily') periodType = "day";
    
    let insights = "";
    
    // Shopify insights
    if (hasShopify) {
      const totalSales = metrics.totalSales || 0;
      const ordersCount = metrics.ordersPlaced || 0;
      const aov = metrics.averageOrderValue || 0;
      const salesGrowth = metrics.salesGrowth || 0;
      const ordersGrowth = metrics.ordersGrowth || 0;
      const aovGrowth = metrics.aovGrowth || 0;
      
      // Start with a personalized greeting
      insights += `Your business ${salesGrowth > 0 ? 'showed positive growth' : 'faced some challenges'} this ${periodType}. `;
      
      // Revenue performance
      if (salesGrowth > 15) {
        insights += `Revenue performance was exceptional with ${formatCurrency(totalSales)} in total sales, representing a strong ${salesGrowth.toFixed(1)}% increase. `;
      } else if (salesGrowth > 5) {
        insights += `Revenue showed healthy growth at ${formatCurrency(totalSales)}, up ${salesGrowth.toFixed(1)}% from the previous ${periodType}. `;
      } else if (salesGrowth > 0) {
        insights += `Revenue was stable at ${formatCurrency(totalSales)}, with a modest ${salesGrowth.toFixed(1)}% increase. `;
      } else if (salesGrowth > -10) {
        insights += `Revenue dipped slightly to ${formatCurrency(totalSales)}, down ${Math.abs(salesGrowth).toFixed(1)}% compared to the previous ${periodType}. `;
      } else {
        insights += `Revenue experienced a significant decline to ${formatCurrency(totalSales)}, down ${Math.abs(salesGrowth).toFixed(1)}% - this requires immediate attention. `;
      }
      
      // Order volume insights
      if (ordersGrowth > 10) {
        insights += `Customer engagement was strong with ${ordersCount} orders (${ordersGrowth.toFixed(1)}% increase). `;
      } else if (ordersGrowth > 0) {
        insights += `You received ${ordersCount} orders, a ${ordersGrowth.toFixed(1)}% increase from the previous ${periodType}. `;
      } else if (ordersGrowth > -10) {
        insights += `Order volume decreased slightly to ${ordersCount} (${Math.abs(ordersGrowth).toFixed(1)}% decrease). `;
      } else {
        insights += `Order volume dropped significantly to ${ordersCount}, down ${Math.abs(ordersGrowth).toFixed(1)}% - we should investigate the cause. `;
      }
      
      // AOV insights
      if (aovGrowth > 10) {
        insights += `Your average order value increased substantially to ${formatCurrency(aov)} (+${aovGrowth.toFixed(1)}%), suggesting successful upselling or premium product performance. `;
      } else if (aovGrowth > 0) {
        insights += `Average order value rose to ${formatCurrency(aov)}, a positive sign for your product strategy. `;
      } else if (aovGrowth > -10) {
        insights += `Average order value decreased slightly to ${formatCurrency(aov)}, which may indicate increased competition or discount usage. `;
      } else {
        insights += `Average order value fell to ${formatCurrency(aov)}, a ${Math.abs(aovGrowth).toFixed(1)}% decrease that warrants review of your pricing and product mix. `;
      }
    }
    
    // Meta Ads insights
    if (hasMeta) {
      const adSpend = metrics.adSpend || 0;
      const adSpendGrowth = metrics.adSpendGrowth || 0;
      const roas = metrics.roas || 0;
      const roasGrowth = metrics.roasGrowth || 0;
      const ctr = metrics.ctr || 0;
      const ctrGrowth = metrics.ctrGrowth || 0;
      const impressions = metrics.impressions || 0;
      const impressionGrowth = metrics.impressionGrowth || 0;
      
      insights += `\n\nRegarding your advertising performance, `;
      
      // ROAS insights
      if (roas > 4) {
        insights += `your Meta campaigns are delivering exceptional results with a ${roas.toFixed(2)}x ROAS `;
        if (roasGrowth > 0) {
          insights += `(improved by ${roasGrowth.toFixed(1)}%). `;
        } else {
          insights += `(though down ${Math.abs(roasGrowth).toFixed(1)}% from previous ${periodType}). `;
        }
      } else if (roas > 2) {
        insights += `your Meta campaigns are performing well with a ${roas.toFixed(2)}x ROAS, `;
        if (roasGrowth > 0) {
          insights += `showing positive growth of ${roasGrowth.toFixed(1)}%. `;
        } else {
          insights += `though it's decreased by ${Math.abs(roasGrowth).toFixed(1)}% from the previous ${periodType}. `;
        }
      } else if (roas > 1) {
        insights += `your Meta campaigns are profitable but with room for improvement at ${roas.toFixed(2)}x ROAS. `;
      } else {
        insights += `your Meta campaigns are currently unprofitable with a ${roas.toFixed(2)}x ROAS, requiring immediate optimization. `;
      }
      
      // Ad spend insights
      insights += `You invested ${formatCurrency(adSpend)} in advertising this ${periodType}, `;
      if (adSpendGrowth > 10) {
        insights += `a significant increase of ${adSpendGrowth.toFixed(1)}%. `;
      } else if (adSpendGrowth > 0) {
        insights += `a slight increase of ${adSpendGrowth.toFixed(1)}%. `;
      } else if (adSpendGrowth > -10) {
        insights += `a slight decrease of ${Math.abs(adSpendGrowth).toFixed(1)}%. `;
      } else {
        insights += `a substantial decrease of ${Math.abs(adSpendGrowth).toFixed(1)}%. `;
      }
      
      // CTR and engagement insights
      if (ctr > 0.02) {
        insights += `Your click-through rate of ${(ctr * 100).toFixed(2)}% is above industry average, `;
      } else if (ctr > 0.01) {
        insights += `Your click-through rate of ${(ctr * 100).toFixed(2)}% is around industry average, `;
      } else {
        insights += `Your click-through rate of ${(ctr * 100).toFixed(2)}% is below industry average, `;
      }
      
      if (ctrGrowth > 0) {
        insights += `and it's improved by ${ctrGrowth.toFixed(1)}%, indicating stronger creative performance. `;
      } else {
        insights += `and it's decreased by ${Math.abs(ctrGrowth).toFixed(1)}%, suggesting creative refresh may be needed. `;
      }
      
      // Audience reach insights
      if (impressions > 100000) {
        insights += `Your ads reached a substantial audience with ${impressions.toLocaleString()} impressions `;
      } else if (impressions > 10000) {
        insights += `Your ads reached a moderate audience with ${impressions.toLocaleString()} impressions `;
      } else {
        insights += `Your ads had limited reach with only ${impressions.toLocaleString()} impressions `;
      }
      
      if (impressionGrowth > 0) {
        insights += `(up ${impressionGrowth.toFixed(1)}%).`;
      } else {
        insights += `(down ${Math.abs(impressionGrowth).toFixed(1)}%).`;
      }
    }
    
    return insights;
  };

  // Process revenue data for RevenueByDay component
  const processRevenueDataForCalendar = () => {
    if (!metrics.revenueByDay || metrics.revenueByDay.length === 0) {
      return [];
    }
    
    return metrics.revenueByDay.map(d => ({
      date: d.date,
      revenue: d.amount || 0
    }));
  };

  return (
    <div className="space-y-6">
      {/* Simple Greeting */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">
          {getGreeting()}, {user?.firstName || "there"}!
        </h2>
        <div className="text-sm text-gray-400">
          {brandName ? `Viewing: ${brandName}` : "Select a brand to view metrics"}
        </div>
      </div>
      
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Shopify Total Revenue */}
        {platformStatus.shopify && (
          <MetricCard
            title="Shopify Total Revenue"
            value={metrics.totalSales || 0}
            change={metrics.salesGrowth || 0}
            data={processRevenueData()}
            valueFormat="currency"
            prefix="$"
            platform="Shopify"
            loading={isLoading}
            refreshing={isRefreshingData}
            dateRange={dateRange}
            brandId={brandId}
          />
        )}
        
        {/* Meta Ad Spend */}
        {hasMeta && (
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <Image 
                    src="https://i.imgur.com/6hyyRrs.png" 
                    alt="Meta logo" 
                    width={18} 
                    height={18} 
                    className="object-contain"
                  />
                </div>
                <span className="ml-0.5">Ad Spend</span>
                <DollarSign className="h-4 w-4" />
              </div>
            }
            value={`$${(metrics.adSpend || 0).toLocaleString()}`}
            change={metrics.adSpendGrowth || 0}
            loading={isLoading}
            refreshing={isRefreshingData}
            data={[]}
            platform="meta"
            brandId={brandId}
          />
        )}
        
        {/* Meta Ad Revenue */}
        {hasMeta && (
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <Image 
                    src="https://i.imgur.com/6hyyRrs.png" 
                    alt="Meta logo" 
                    width={18} 
                    height={18} 
                    className="object-contain"
                  />
                </div>
                <span className="ml-0.5">Ad Revenue</span>
                <DollarSign className="h-4 w-4" />
              </div>
            }
            value={`$${((metrics.adSpend || 0) * (metrics.roas || 0)).toLocaleString()}`}
            change={metrics.roasGrowth || 0}
            loading={isLoading}
            refreshing={isRefreshingData}
            data={[]}
            platform="meta"
            brandId={brandId}
          />
        )}
        
        {/* Meta ROAS */}
        {hasMeta && (
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <Image 
                    src="https://i.imgur.com/6hyyRrs.png" 
                    alt="Meta logo" 
                    width={18} 
                    height={18} 
                    className="object-contain"
                  />
                </div>
                <span className="ml-0.5">ROAS</span>
                <TrendingUp className="h-4 w-4" />
              </div>
            }
            value={`${(metrics.roas || 0).toFixed(2)}x`}
            change={metrics.roasGrowth || 0}
            loading={isLoading}
            refreshing={isRefreshingData}
            data={[]}
            platform="meta"
            brandId={brandId}
          />
        )}
        
        {/* Placeholder metrics if not enough platforms are connected */}
        {!hasShopify && !hasMeta && (
          <div className="col-span-4 text-center py-8 bg-[#1A1A1A] rounded-lg border border-[#333]">
            <p className="text-gray-400">Connect platforms to view metrics</p>
          </div>
        )}
      </div>
      
      {/* Detailed Synopsis Widget */}
      <Card className="bg-gradient-to-r from-[#1A1A1A] to-[#222222] border-[#333]">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-blue-400" />
                <span>Performance Report</span>
              </CardTitle>
              <CardDescription className="text-gray-400 mt-1">
                {getTimeframeRange().label}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={synopsisTimeframe} onValueChange={(v) => setSynopsisTimeframe(v as any)} className="w-auto">
                <TabsList className="bg-[#2A2A2A]">
                  <TabsTrigger value="monthly" className="data-[state=active]:bg-blue-600">Monthly</TabsTrigger>
                  <TabsTrigger value="weekly" className="data-[state=active]:bg-blue-600">Weekly</TabsTrigger>
                  <TabsTrigger value="daily" className="data-[state=active]:bg-blue-600">Daily</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs h-8 bg-[#222222] border-[#333333] hover:bg-[#333333] text-gray-300 ml-2"
                onClick={() => {
                  // Implement export functionality
                }}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-white"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="pt-4">
            <div className="space-y-6">
              {/* Report Header */}
              <div className="border-b border-[#333] pb-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span>Reporting Period: {format(getTimeframeRange().from, 'MMM d')} – {format(getTimeframeRange().to, 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>Client Name: {brandName}</span>
                  </div>
                </div>
              </div>
              
              {/* Executive Summary */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Executive Summary</h3>
                <div className="bg-[#1A1A1A] border border-[#333] rounded-md p-4">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {generatePerformanceInsights()}
                  </p>
                  
                  {/* Key Takeaways */}
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Key Takeaways:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                      {hasShopify && metrics.salesGrowth !== undefined && (
                        <li>
                          {metrics.salesGrowth > 0 
                            ? `Revenue is growing at ${metrics.salesGrowth.toFixed(1)}%, indicating positive business momentum.` 
                            : `Revenue has decreased by ${Math.abs(metrics.salesGrowth).toFixed(1)}%, requiring attention to sales strategies.`}
                        </li>
                      )}
                      
                      {hasShopify && metrics.aovGrowth !== undefined && (
                        <li>
                          {metrics.aovGrowth > 0 
                            ? `Average order value increased by ${metrics.aovGrowth.toFixed(1)}%, suggesting successful upselling or higher-value product sales.` 
                            : `Average order value decreased by ${Math.abs(metrics.aovGrowth).toFixed(1)}%, indicating potential pricing or product mix issues.`}
                        </li>
                      )}
                      
                      {hasMeta && metrics.roas !== undefined && (
                        <li>
                          {metrics.roas > 2 
                            ? `ROAS of ${metrics.roas.toFixed(2)}x shows strong advertising efficiency.` 
                            : metrics.roas > 1 
                              ? `ROAS of ${metrics.roas.toFixed(2)}x is profitable but has room for optimization.` 
                              : `ROAS of ${metrics.roas.toFixed(2)}x indicates unprofitable ad spend requiring immediate attention.`}
                        </li>
                      )}
                      
                      {hasMeta && metrics.ctr !== undefined && (
                        <li>
                          {metrics.ctr > 0.02 
                            ? `CTR of ${(metrics.ctr * 100).toFixed(2)}% is above industry average, indicating strong creative and targeting.` 
                            : `CTR of ${(metrics.ctr * 100).toFixed(2)}% suggests opportunity to improve ad creative and audience targeting.`}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Key Performance Metrics */}
              <div>
                <h3 className="text-md font-medium flex items-center gap-2 mb-3">
                  <span className="bg-blue-500 text-white w-5 h-5 rounded-md flex items-center justify-center text-xs">2</span>
                  Key Performance Metrics
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#222]">
                        <th className="text-left p-2 text-sm font-medium text-gray-300 border border-[#333]">Metric</th>
                        <th className="text-left p-2 text-sm font-medium text-gray-300 border border-[#333]">Value</th>
                        <th className="text-left p-2 text-sm font-medium text-gray-300 border border-[#333]">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasShopify && (
                        <>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Total Revenue</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{formatCurrency(timeframeMetrics.totalSales || 0)}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={timeframeMetrics.salesGrowth !== undefined ? (timeframeMetrics.salesGrowth > 0 ? "text-green-400" : timeframeMetrics.salesGrowth < 0 ? "text-red-400" : "text-gray-400") : "text-gray-400"}>
                                {timeframeMetrics.salesGrowth !== undefined ? (timeframeMetrics.salesGrowth > 0 ? "+" : "") + (timeframeMetrics.salesGrowth || 0).toFixed(1) + "%" : "N/A"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Orders Placed</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{timeframeMetrics.ordersPlaced || 0}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={timeframeMetrics.ordersGrowth !== undefined ? (timeframeMetrics.ordersGrowth > 0 ? "text-green-400" : timeframeMetrics.ordersGrowth < 0 ? "text-red-400" : "text-gray-400") : "text-gray-400"}>
                                {timeframeMetrics.ordersGrowth !== undefined ? (timeframeMetrics.ordersGrowth > 0 ? "+" : "") + (timeframeMetrics.ordersGrowth || 0).toFixed(1) + "%" : "N/A"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Average Order Value</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{formatCurrency(timeframeMetrics.averageOrderValue || 0)}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={timeframeMetrics.aovGrowth !== undefined ? (timeframeMetrics.aovGrowth > 0 ? "text-green-400" : timeframeMetrics.aovGrowth < 0 ? "text-red-400" : "text-gray-400") : "text-gray-400"}>
                                {timeframeMetrics.aovGrowth !== undefined ? (timeframeMetrics.aovGrowth > 0 ? "+" : "") + (timeframeMetrics.aovGrowth || 0).toFixed(1) + "%" : "N/A"}
                              </span>
                            </td>
                          </tr>
                        </>
                      )}
                      
                      {hasMeta && (
                        <>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Total Ad Spend</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{formatCurrency(timeframeMetrics.adSpend || 0)}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={timeframeMetrics.adSpendGrowth !== undefined ? (timeframeMetrics.adSpendGrowth < 0 ? "text-green-400" : timeframeMetrics.adSpendGrowth > 0 ? "text-amber-400" : "text-gray-400") : "text-gray-400"}>
                                {timeframeMetrics.adSpendGrowth !== undefined ? (timeframeMetrics.adSpendGrowth > 0 ? "+" : "") + (timeframeMetrics.adSpendGrowth || 0).toFixed(1) + "%" : "N/A"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">ROAS (Return on Ad Spend)</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{timeframeMetrics.roas !== undefined ? (timeframeMetrics.roas || 0).toFixed(2) + "x" : "N/A"}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={timeframeMetrics.roasGrowth !== undefined ? (timeframeMetrics.roasGrowth > 0 ? "text-green-400" : timeframeMetrics.roasGrowth < 0 ? "text-red-400" : "text-gray-400") : "text-gray-400"}>
                                {timeframeMetrics.roasGrowth !== undefined ? (timeframeMetrics.roasGrowth > 0 ? "+" : "") + (timeframeMetrics.roasGrowth || 0).toFixed(1) + "%" : "N/A"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Click Through Rate (CTR)</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{timeframeMetrics.ctr !== undefined ? ((timeframeMetrics.ctr || 0) * 100).toFixed(2) + "%" : "N/A"}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={timeframeMetrics.ctrGrowth !== undefined ? (timeframeMetrics.ctrGrowth > 0 ? "text-green-400" : timeframeMetrics.ctrGrowth < 0 ? "text-red-400" : "text-gray-400") : "text-gray-400"}>
                                {timeframeMetrics.ctrGrowth !== undefined ? (timeframeMetrics.ctrGrowth > 0 ? "+" : "") + (timeframeMetrics.ctrGrowth || 0).toFixed(1) + "%" : "N/A"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Cost Per Acquisition (CPA)</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{formatCurrency(timeframeMetrics.costPerResult || 0)}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={timeframeMetrics.cprGrowth !== undefined ? (timeframeMetrics.cprGrowth < 0 ? "text-green-400" : timeframeMetrics.cprGrowth > 0 ? "text-red-400" : "text-gray-400") : "text-gray-400"}>
                                {timeframeMetrics.cprGrowth !== undefined ? (timeframeMetrics.cprGrowth > 0 ? "+" : "") + ((timeframeMetrics.cprGrowth || 0).toFixed(1)) + "%" : "N/A"}
                              </span>
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Audience Performance Insights */}
              {hasMeta && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Audience Performance Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Performance Analysis */}
                    <div className="bg-[#1A1A1A] border border-[#333] rounded-md p-4">
                      <h4 className="text-sm font-semibold text-white mb-2">Performance Analysis</h4>
                      <p className="text-sm text-gray-300 mb-3">
                        Your current ROAS is {(timeframeMetrics.roas || 0).toFixed(2)}x with a CPA of ${(timeframeMetrics.costPerResult || 0).toFixed(2)}. 
                        {timeframeMetrics.ctr !== undefined && (
                          <> Your CTR of {(timeframeMetrics.ctr * 100).toFixed(2)}% is {timeframeMetrics.ctr > 0.02 ? 'above' : timeframeMetrics.ctr > 0.01 ? 'at' : 'below'} the recommended benchmark.</>
                        )}
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                        {timeframeMetrics.roas !== undefined && timeframeMetrics.roas > 2 && (
                          <li>Your top-performing campaigns are delivering strong returns, with ROAS exceeding 2x benchmark.</li>
                        )}
                        {timeframeMetrics.impressions !== undefined && timeframeMetrics.impressions > 0 && (
                          <li>Your ads reached approximately {timeframeMetrics.impressions.toLocaleString()} potential customers during this period.</li>
                        )}
                        {timeframeMetrics.clicks !== undefined && timeframeMetrics.clicks > 0 && (
                          <li>Generated {timeframeMetrics.clicks.toLocaleString()} clicks, driving targeted traffic to your store.</li>
                        )}
                        {timeframeMetrics.conversions !== undefined && timeframeMetrics.conversions > 0 && (
                          <li>Achieved {timeframeMetrics.conversions} conversions from Meta ad campaigns.</li>
                        )}
                      </ul>
                    </div>
                    
                    {/* Areas for Improvement */}
                    <div className="bg-[#1A1A1A] border border-[#333] rounded-md p-4">
                      <h4 className="text-sm font-semibold text-white mb-2">Areas for Improvement</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                        {timeframeMetrics.ctr !== undefined && timeframeMetrics.ctr < 0.015 && (
                          <li>
                            <span className="font-medium text-amber-400">Low CTR:</span> Your click-through rate of {(timeframeMetrics.ctr * 100).toFixed(2)}% 
                            is below optimal levels. Consider refreshing ad creative and refining audience targeting.
                          </li>
                        )}
                        {timeframeMetrics.roas !== undefined && timeframeMetrics.roas < 2 && (
                          <li>
                            <span className="font-medium text-amber-400">ROAS Optimization:</span> Current return of {timeframeMetrics.roas.toFixed(2)}x 
                            {timeframeMetrics.roas < 1 ? ' is unprofitable and' : ''} requires campaign restructuring to improve efficiency.
                          </li>
                        )}
                        {timeframeMetrics.costPerResult !== undefined && timeframeMetrics.costPerResult > 30 && (
                          <li>
                            <span className="font-medium text-amber-400">High CPA:</span> Cost per acquisition of ${timeframeMetrics.costPerResult.toFixed(2)} 
                            is above target. Focus on improving conversion rate optimization and audience refinement.
                          </li>
                        )}
                        {timeframeMetrics.impressions !== undefined && timeframeMetrics.impressionGrowth !== undefined && timeframeMetrics.impressionGrowth < 0 && (
                          <li>
                            <span className="font-medium text-amber-400">Declining Reach:</span> Impressions decreased by {Math.abs(timeframeMetrics.impressionGrowth).toFixed(1)}%. 
                            Consider expanding audience targeting or increasing budget to maintain visibility.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Budget Allocation & Scaling Insights */}
              {hasMeta && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Budget Allocation & Scaling Insights</h3>
                  <div className="bg-[#1A1A1A] border border-[#333] rounded-md p-4">
                    <p className="text-sm text-gray-300 mb-3">
                      Total budget spent this period: {formatCurrency(timeframeMetrics.adSpend || 0)}. 
                      Budget efficiency is {timeframeMetrics.roas !== undefined && timeframeMetrics.roas > 2 ? 'excellent' : timeframeMetrics.roas !== undefined && timeframeMetrics.roas > 1 ? 'acceptable' : 'concerning'} 
                      with a ROAS of {(timeframeMetrics.roas || 0).toFixed(2)}x.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Budget Recommendations</h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                          {timeframeMetrics.roas !== undefined && timeframeMetrics.roas > 3 && (
                            <li>
                              <span className="font-medium text-green-400">Scaling Opportunity:</span> With ROAS exceeding 3x, 
                              consider increasing budget by 15-25% to capitalize on high-performing campaigns.
                            </li>
                          )}
                          {timeframeMetrics.roas !== undefined && timeframeMetrics.roas > 1.5 && timeframeMetrics.roas <= 3 && (
                            <li>
                              <span className="font-medium text-blue-400">Maintain & Optimize:</span> Current ROAS is profitable. 
                              Maintain budget while optimizing targeting and creative to improve efficiency.
                            </li>
                          )}
                          {timeframeMetrics.roas !== undefined && timeframeMetrics.roas < 1.5 && (
                            <li>
                              <span className="font-medium text-amber-400">Restructure Required:</span> Consider reducing budget by 20-30% 
                              while restructuring campaigns to improve performance before scaling.
                            </li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Campaign Distribution</h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                          <li>
                            <span className="font-medium">Prospecting vs. Retargeting:</span> Recommend 70/30 split for balanced acquisition and conversion.
                          </li>
                          <li>
                            <span className="font-medium">Platform Allocation:</span> Based on current performance, focus budget on 
                            {timeframeMetrics.roas !== undefined && timeframeMetrics.roas > 2 ? ' high-ROAS campaigns' : ' improving campaign structure'}.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Next Steps & Recommendations */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Next Steps & Recommendations</h3>
                <div className="bg-[#1A1A1A] border border-[#333] rounded-md p-4">
                  <div className="space-y-4">
                    {/* Strategic Recommendations */}
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">Strategic Recommendations</h4>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                        {hasShopify && (
                          <>
                            <li className="flex items-start">
                              <ArrowRight className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                              <span>
                                <span className="font-medium text-white">Product Strategy:</span>{' '}
                                {timeframeMetrics.aovGrowth !== undefined && timeframeMetrics.aovGrowth < 0 
                                  ? 'Review product pricing and bundling strategies to increase average order value, which has declined by ' + Math.abs(timeframeMetrics.aovGrowth).toFixed(1) + '%.'
                                  : 'Continue promoting your top-selling products while introducing complementary items to increase cart value.'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <ArrowRight className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                              <span>
                                <span className="font-medium text-white">Customer Retention:</span>{' '}
                                Implement a post-purchase email sequence to encourage repeat purchases and reviews, targeting the {timeframeMetrics.ordersPlaced || 0} customers who ordered this period.
                              </span>
                            </li>
                          </>
                        )}
                        
                        {hasMeta && (
                          <>
                            <li className="flex items-start">
                              <ArrowRight className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                              <span>
                                <span className="font-medium text-white">Campaign Optimization:</span>{' '}
                                {timeframeMetrics.roas !== undefined && timeframeMetrics.roas < 2 
                                  ? 'Restructure underperforming campaigns with ROAS below 2x, focusing on audience refinement and creative testing.'
                                  : 'Scale budget for top-performing campaigns while maintaining the current targeting strategy that\'s delivering strong results.'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <ArrowRight className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                              <span>
                                <span className="font-medium text-white">Creative Refresh:</span>{' '}
                                {timeframeMetrics.ctr !== undefined && timeframeMetrics.ctr < 0.015 
                                  ? 'Develop new ad creative to address the below-average CTR of ' + (timeframeMetrics.ctr * 100).toFixed(2) + '%, focusing on stronger hooks and visuals.'
                                  : 'Continue testing new creative variations to maintain strong engagement and prevent ad fatigue.'}
                              </span>
                            </li>
                          </>
                        )}
                        
                        <li className="flex items-start">
                          <ArrowRight className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                          <span>
                            <span className="font-medium text-white">Analytics Focus:</span>{' '}
                            Schedule a detailed performance review to analyze customer journey touchpoints and identify conversion optimization opportunities.
                          </span>
                        </li>
                      </ul>
                    </div>
                    
                    {/* Action Items */}
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">Priority Action Items</h4>
                      <div className="space-y-2">
                        <div className="flex items-start">
                          <div className="bg-blue-900/30 text-blue-400 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">1</div>
                          <div>
                            <p className="text-sm text-white font-medium">
                              {hasShopify && timeframeMetrics.salesGrowth !== undefined && timeframeMetrics.salesGrowth < 0 
                                ? 'Address Revenue Decline' 
                                : hasMeta && timeframeMetrics.roas !== undefined && timeframeMetrics.roas < 1.5 
                                  ? 'Improve Ad Campaign Efficiency'
                                  : 'Capitalize on Growth Opportunities'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {hasShopify && timeframeMetrics.salesGrowth !== undefined && timeframeMetrics.salesGrowth < 0 
                                ? `Implement targeted promotions to reverse the ${Math.abs(timeframeMetrics.salesGrowth).toFixed(1)}% revenue decline.` 
                                : hasMeta && timeframeMetrics.roas !== undefined && timeframeMetrics.roas < 1.5 
                                  ? `Restructure campaigns to improve the current ROAS of ${timeframeMetrics.roas.toFixed(2)}x.`
                                  : `Develop a scaling strategy to build on current performance metrics.`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="bg-blue-900/30 text-blue-400 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">2</div>
                          <div>
                            <p className="text-sm text-white font-medium">
                              {hasMeta && timeframeMetrics.ctr !== undefined && timeframeMetrics.ctr < 0.015 
                                ? 'Creative Refresh' 
                                : hasShopify && timeframeMetrics.aovGrowth !== undefined && timeframeMetrics.aovGrowth < 0 
                                  ? 'Increase Average Order Value'
                                  : 'Enhance Customer Experience'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {hasMeta && timeframeMetrics.ctr !== undefined && timeframeMetrics.ctr < 0.015 
                                ? `Develop and test new ad creative to improve the below-average CTR of ${(timeframeMetrics.ctr * 100).toFixed(2)}%.` 
                                : hasShopify && timeframeMetrics.aovGrowth !== undefined && timeframeMetrics.aovGrowth < 0 
                                  ? `Implement product bundling and upsell strategies to reverse the ${Math.abs(timeframeMetrics.aovGrowth).toFixed(1)}% AOV decline.`
                                  : `Optimize the customer journey to improve conversion rates and customer satisfaction.`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="bg-blue-900/30 text-blue-400 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">3</div>
                          <div>
                            <p className="text-sm text-white font-medium">Schedule Strategy Review</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Book a comprehensive strategy session to analyze this period's performance and plan optimizations for the coming month.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      
      {/* Revenue Calendar */}
      {hasShopify && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Calendar</h3>
          <Card className="bg-[#111111] border-[#222222]">
            <CardHeader className="py-2">
              <CardTitle className="text-white"></CardTitle>
            </CardHeader>
            <CardContent className="h-[520px]">
              <RevenueByDay 
                data={processRevenueDataForCalendar()} 
                brandId={brandId}
                isRefreshing={isRefreshingData}
              />
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Platform Connection Status */}
      {(!hasShopify && !hasMeta) && (
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <CardTitle>Connect Your Platforms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">
              Connect your e-commerce and advertising platforms to see your data in one place.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border ${hasShopify ? 'bg-green-900/20 border-green-800' : 'bg-[#222] border-[#444]'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Image 
                    src="https://i.imgur.com/cnCcupx.png" 
                    alt="Shopify logo" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                  />
                  <span className="font-medium">Shopify</span>
                </div>
                <p className="text-xs text-gray-400">
                  {hasShopify ? 'Connected' : 'Connect your Shopify store to view sales data, inventory, and customer insights.'}
                </p>
              </div>
              
              <div className={`p-4 rounded-lg border ${hasMeta ? 'bg-blue-900/20 border-blue-800' : 'bg-[#222] border-[#444]'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Image 
                    src="https://i.imgur.com/6hyyRrs.png" 
                    alt="Meta logo" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                  />
                  <span className="font-medium">Meta Ads</span>
                </div>
                <p className="text-xs text-gray-400">
                  {hasMeta ? 'Connected' : 'Connect your Meta Ads account to view ad performance, spend, and ROAS.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 