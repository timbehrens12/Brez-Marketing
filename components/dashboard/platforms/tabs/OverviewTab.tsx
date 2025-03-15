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
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, isSameDay } from "date-fns"
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
    if (metrics.revenueByDay && metrics.revenueByDay.length > 0) {
      // Check if we're looking at today's data
      const isToday = dateRange.from && dateRange.to && 
                      isSameDay(dateRange.from, new Date()) && 
                      isSameDay(dateRange.to, new Date());
      
      // Return data in the format expected by MetricCard
      return metrics.revenueByDay.map(item => {
        // Parse the date from the item
        const itemDate = new Date(item.date);
        
        // For today's data, preserve the hour information
        if (isToday) {
          return {
            date: format(itemDate, "yyyy-MM-dd'T'HH:mm:ss"),
            value: item.amount || 0
          };
        }
        
        // For other dates, just use the date part
        return {
          date: format(itemDate, "yyyy-MM-dd"),
          value: item.amount || 0
        };
      });
    }
    
    // Return empty array if no data
    return [];
  };

  // Get the timeframe range for the performance report
  const getTimeframeRange = () => {
    if (!dateRange.from || !dateRange.to) {
      return { 
        from: new Date(), 
        to: new Date(),
        label: 'Today'
      };
    }
    
    // Use the actual date range from props
    return {
      from: dateRange.from,
      to: dateRange.to,
      label: `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
    };
  };

  const timeframe = getTimeframeRange()

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

    let insights = "";
    const timeframe = getTimeframeRange();
    const daysDiff = Math.round((timeframe.to.getTime() - timeframe.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (hasShopify) {
      const totalSales = metrics.totalSales || 0;
      const ordersCount = metrics.ordersPlaced || 0;
      const aov = metrics.averageOrderValue || 0;
      
      insights += `Over the selected ${daysDiff} day${daysDiff !== 1 ? 's' : ''}, `;
      insights += `we generated ${ordersCount} total purchase${ordersCount !== 1 ? 's' : ''} `;
      
      if (hasMeta) {
        const roas = metrics.roas || 0;
        insights += `across various campaigns, with an average ROAS of ${roas.toFixed(2)}x `;
        insights += `and a total ad spend of ${formatCurrency(metrics.adSpend || 0)}. `;
      } else {
        insights += `with a total revenue of ${formatCurrency(totalSales)} `;
        insights += `and an average order value of ${formatCurrency(aov)}. `;
      }
    }
    
    if (hasMeta) {
      if (!hasShopify) {
        insights += `Over the selected ${daysDiff} day${daysDiff !== 1 ? 's' : ''}, `;
        insights += `your Meta Ads generated a total spend of ${formatCurrency(metrics.adSpend || 0)}. `;
      }
      
      const roasGrowth = metrics.roasGrowth || 0;
      const roas = metrics.roas || 0;
      insights += `Meta Ads ${roasGrowth > 0 ? 'are performing well' : 'need optimization'} `;
      insights += `with a ROAS of ${roas.toFixed(2)}x. `;
      
      if (metrics.ctr !== undefined && metrics.ctr !== null) {
        const ctr = metrics.ctr;
        const ctrGrowth = metrics.ctrGrowth || 0;
        insights += `Your click-through rate is ${(ctr * 100).toFixed(2)}% `;
        insights += `${ctrGrowth > 0 ? 'which is improving' : 'which could be improved'}. `;
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
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs h-8 bg-[#222222] border-[#333333] hover:bg-[#333333] text-gray-300"
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
                    <span>Reporting Period: {format(timeframe.from, 'MMM d')} – {format(timeframe.to, 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>Client Name: {brandName}</span>
                  </div>
                </div>
              </div>
              
              {/* Executive Summary */}
              <div>
                <h3 className="text-md font-medium flex items-center gap-2 mb-3">
                  <span className="bg-blue-500 text-white w-5 h-5 rounded-md flex items-center justify-center text-xs">1</span>
                  Executive Summary
                </h3>
                <p className="text-gray-300 text-sm mb-4">
                  {generatePerformanceInsights()}
                </p>
                
                <div className="bg-[#222] rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium mb-2">Key takeaways:</h4>
                  <ul className="space-y-2 text-sm">
                    {hasMeta && metrics.roas !== undefined && metrics.roas > 2 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-medium">Strong ROAS Performance:</span> Your ads are generating a {(metrics.roas || 0).toFixed(2)}x return on ad spend
                          {metrics.roasGrowth !== undefined && metrics.roasGrowth > 0 ? `, which is ${(metrics.roasGrowth || 0).toFixed(1)}% higher than the previous period.` : '.'}
                        </span>
                      </li>
                    )}
                    
                    {hasMeta && metrics.roas !== undefined && metrics.roas < 2 && (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-medium">ROAS Needs Improvement:</span> Your current ROAS is {(metrics.roas || 0).toFixed(2)}x, which is below the target of 2.0x.
                          Consider optimizing your ad campaigns or creative assets.
                        </span>
                      </li>
                    )}
                    
                    {hasShopify && metrics.salesGrowth !== undefined && metrics.salesGrowth > 0 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-medium">Revenue Growth:</span> Your sales have increased by {(metrics.salesGrowth || 0).toFixed(1)}% compared to the previous period,
                          reaching a total of {formatCurrency(metrics.totalSales || 0)}.
                        </span>
                      </li>
                    )}
                    
                    {hasShopify && metrics.salesGrowth !== undefined && metrics.salesGrowth < 0 && (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-medium">Revenue Decline:</span> Your sales have decreased by {Math.abs(metrics.salesGrowth || 0).toFixed(1)}% compared to the previous period.
                          Consider reviewing your marketing strategy and product offerings.
                        </span>
                      </li>
                    )}
                    
                    {hasShopify && metrics.aovGrowth !== undefined && metrics.aovGrowth > 5 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-medium">AOV Improvement:</span> Your average order value has increased by {(metrics.aovGrowth || 0).toFixed(1)}% to {formatCurrency(metrics.averageOrderValue || 0)},
                          indicating successful upselling or higher-value product purchases.
                        </span>
                      </li>
                    )}
                    
                    {hasMeta && metrics.ctr !== undefined && metrics.ctr < 0.01 && (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-medium">Low Click-Through Rate:</span> Your CTR is currently {((metrics.ctr || 0) * 100).toFixed(2)}%, which is below industry average.
                          Consider testing new ad creatives and messaging to improve engagement.
                        </span>
                      </li>
                    )}
                  </ul>
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
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{formatCurrency(metrics.totalSales || 0)}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={metrics.salesGrowth !== undefined ? (metrics.salesGrowth > 0 ? "text-green-400" : metrics.salesGrowth < 0 ? "text-red-400" : "text-gray-400") : "text-gray-400"}>
                                {metrics.salesGrowth !== undefined ? (metrics.salesGrowth > 0 ? "+" : "") + (metrics.salesGrowth || 0).toFixed(1) + "%" : "N/A"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Orders Placed</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{metrics.ordersPlaced || 0}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={metrics.ordersGrowth !== undefined ? (metrics.ordersGrowth > 0 ? "text-green-400" : metrics.ordersGrowth < 0 ? "text-red-400" : "text-gray-400") : "text-gray-400"}>
                                {metrics.ordersGrowth !== undefined ? (metrics.ordersGrowth > 0 ? "+" : "") + (metrics.ordersGrowth || 0).toFixed(1) + "%" : "N/A"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Average Order Value</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{formatCurrency(metrics.averageOrderValue || 0)}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={metrics.aovGrowth !== undefined ? (metrics.aovGrowth > 0 ? "text-green-400" : metrics.aovGrowth < 0 ? "text-red-400" : "text-gray-400") : "text-gray-400"}>
                                {metrics.aovGrowth !== undefined ? (metrics.aovGrowth > 0 ? "+" : "") + (metrics.aovGrowth || 0).toFixed(1) + "%" : "N/A"}
                              </span>
                            </td>
                          </tr>
                        </>
                      )}
                      
                      {hasMeta && (
                        <>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Total Ad Spend</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{formatCurrency(metrics.adSpend || 0)}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={metrics.adSpendGrowth !== undefined ? (metrics.adSpendGrowth < 0 ? "text-green-400" : metrics.adSpendGrowth > 0 ? "text-amber-400" : "text-gray-400") : "text-gray-400"}>
                                {metrics.adSpendGrowth !== undefined ? (metrics.adSpendGrowth > 0 ? "+" : "") + (metrics.adSpendGrowth || 0).toFixed(1) + "%" : "N/A"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">ROAS (Return on Ad Spend)</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{metrics.roas !== undefined ? (metrics.roas || 0).toFixed(2) + "x" : "N/A"}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={metrics.roasGrowth !== undefined ? (metrics.roasGrowth > 0 ? "text-green-400" : metrics.roasGrowth < 0 ? "text-red-400" : "text-gray-400") : "text-gray-400"}>
                                {metrics.roasGrowth !== undefined ? (metrics.roasGrowth > 0 ? "+" : "") + (metrics.roasGrowth || 0).toFixed(1) + "%" : "N/A"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Click Through Rate (CTR)</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{metrics.ctr !== undefined ? ((metrics.ctr || 0) * 100).toFixed(2) + "%" : "N/A"}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={metrics.ctrGrowth !== undefined ? (metrics.ctrGrowth > 0 ? "text-green-400" : metrics.ctrGrowth < 0 ? "text-red-400" : "text-gray-400") : "text-gray-400"}>
                                {metrics.ctrGrowth !== undefined ? (metrics.ctrGrowth > 0 ? "+" : "") + (metrics.ctrGrowth || 0).toFixed(1) + "%" : "N/A"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Cost Per Acquisition (CPA)</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{formatCurrency(metrics.costPerResult || 0)}</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">
                              <span className={metrics.cprGrowth !== undefined ? (metrics.cprGrowth < 0 ? "text-green-400" : metrics.cprGrowth > 0 ? "text-red-400" : "text-gray-400") : "text-gray-400"}>
                                {metrics.cprGrowth !== undefined ? (metrics.cprGrowth > 0 ? "+" : "") + ((metrics.cprGrowth || 0).toFixed(1)) + "%" : "N/A"}
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
                  <h3 className="text-md font-medium flex items-center gap-2 mb-3">
                    <span className="bg-blue-500 text-white w-5 h-5 rounded-md flex items-center justify-center text-xs">3</span>
                    Audience Performance Insights
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <span className="text-green-400">●</span> Performance Analysis:
                      </h4>
                      <ul className="space-y-2 text-sm pl-6">
                        <li className="text-gray-300">
                          Your Meta ads are currently achieving a ROAS of {metrics.roas !== undefined ? (metrics.roas || 0).toFixed(2) + "x" : "N/A"} with a CPA of {formatCurrency(metrics.costPerResult || 0)}.
                        </li>
                        <li className="text-gray-300">
                          Click-through rate is {metrics.ctr !== undefined ? ((metrics.ctr || 0) * 100).toFixed(2) + "%" : "N/A"}, which is 
                          {metrics.ctr !== undefined ? (metrics.ctr > 0.01 ? " good for e-commerce ads" : " below the recommended 1% benchmark") : ""}
                        </li>
                        {metrics.impressions !== undefined && (
                          <li className="text-gray-300">
                            Your ads received {metrics.impressions.toLocaleString()} impressions, 
                            {metrics.impressionGrowth !== undefined ? (metrics.impressionGrowth > 0 
                              ? ` which is ${(metrics.impressionGrowth || 0).toFixed(1)}% higher than the previous period.` 
                              : ` which is ${Math.abs(metrics.impressionGrowth || 0).toFixed(1)}% lower than the previous period.`) : ""}
                          </li>
                        )}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <span className="text-amber-400">⚠</span> Areas for Improvement:
                      </h4>
                      <ul className="space-y-2 text-sm pl-6">
                        {metrics.ctr !== undefined && metrics.ctr < 0.01 && (
                          <li className="text-gray-300">
                            <span className="font-medium">Low CTR:</span> Your click-through rate is below 1%, suggesting that your ad creative or targeting may need optimization.
                          </li>
                        )}
                        {metrics.roas !== undefined && metrics.roas < 2 && (
                          <li className="text-gray-300">
                            <span className="font-medium">ROAS Optimization:</span> Your return on ad spend is below the target of 2.0x. Consider reviewing your campaign structure and audience targeting.
                          </li>
                        )}
                        {metrics.costPerResult !== undefined && metrics.costPerResult > 30 && (
                          <li className="text-gray-300">
                            <span className="font-medium">High CPA:</span> Your cost per acquisition is {formatCurrency(metrics.costPerResult)}, which may be impacting your overall profitability.
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
                  <h3 className="text-md font-medium flex items-center gap-2 mb-3">
                    <span className="bg-blue-500 text-white w-5 h-5 rounded-md flex items-center justify-center text-xs">4</span>
                    Budget Allocation & Scaling Insights
                  </h3>
                  
                  <div className="bg-[#222] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-300 text-sm">Total Budget Spent: {formatCurrency(metrics.adSpend || 0)}</span>
                    </div>
                    <div className="text-gray-300 text-sm">
                      <span className="font-medium">Budget Efficiency:</span> {
                        metrics.roas !== undefined ? (metrics.roas > 3 
                          ? "Your ad spend is highly efficient with strong ROAS. Consider scaling your budget to capture more market share."
                          : metrics.roas > 2
                            ? "Your ad spend is performing well. Maintain current budget levels while optimizing underperforming campaigns."
                            : "Your ad spend efficiency needs improvement. Focus on optimizing campaigns before increasing budget."
                        ) : "Connect your platforms to see budget efficiency insights."
                      }
                    </div>
                  </div>
                </div>
              )}
              
              {/* Next Steps & Recommendations */}
              <div>
                <h3 className="text-md font-medium flex items-center gap-2 mb-3">
                  <span className="bg-blue-500 text-white w-5 h-5 rounded-md flex items-center justify-center text-xs">{hasMeta ? '5' : '3'}</span>
                  Next Steps & Recommendations
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Strategic Recommendations:</h4>
                    <ul className="space-y-2 text-sm pl-6 list-disc text-gray-300">
                      {hasMeta && metrics.roas !== undefined && metrics.roas > 3 && (
                        <li>Increase ad budget by 15-20% to capitalize on strong ROAS performance</li>
                      )}
                      {hasMeta && metrics.roas !== undefined && metrics.roas < 2 && (
                        <li>Review campaign structure and audience targeting to improve ROAS</li>
                      )}
                      {hasMeta && metrics.ctr !== undefined && metrics.ctr < 0.01 && (
                        <li>Test new ad creatives to improve click-through rates</li>
                      )}
                      {hasShopify && metrics.aovGrowth !== undefined && metrics.aovGrowth < 0 && (
                        <li>Implement upsell and cross-sell strategies to increase average order value</li>
                      )}
                      {hasShopify && metrics.salesGrowth !== undefined && metrics.salesGrowth < 0 && (
                        <li>Review product pricing and marketing strategy to address declining sales</li>
                      )}
                      {hasShopify && !hasMeta && (
                        <li>Consider implementing Meta Ads to drive additional traffic and sales</li>
                      )}
                      {!hasShopify && !hasMeta && (
                        <li>Connect your platforms to receive personalized recommendations</li>
                      )}
                    </ul>
                  </div>
                  
                  {hasMeta && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Creative Optimization:</h4>
                      <ul className="space-y-2 text-sm pl-6 list-disc text-gray-300">
                        {metrics.ctr !== undefined && metrics.ctr < 0.01 && (
                          <li>Develop new hooks and CTAs to improve engagement and click-through rates</li>
                        )}
                        <li>A/B test different ad formats (carousel vs. video vs. static images)</li>
                        <li>Implement urgency-driven messaging (limited-time offers, bundle deals)</li>
                      </ul>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Growth Opportunities:</h4>
                    <ul className="space-y-2 text-sm pl-6 list-disc text-gray-300">
                      {hasMeta && (
                        <>
                          <li>Implement retargeting campaigns for users who didn't convert</li>
                          <li>Build Lookalike Audiences (1%) of past customers to expand reach</li>
                        </>
                      )}
                      <li>Utilize email/SMS marketing to boost conversion rates</li>
                      {hasShopify && (
                        <li>Optimize product pages for higher conversion rates</li>
                      )}
                    </ul>
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