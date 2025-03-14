"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RevenueCalendarNew } from "@/components/dashboard/RevenueCalendarNew"
import { SalesByProduct } from "@/components/dashboard/SalesByProduct"
import { MetricCard } from "@/components/metrics/MetricCard"
import { DollarSign, TrendingUp, Calendar, ChevronUp, ChevronDown, ArrowRight, AlertTriangle, CheckCircle, BarChart2 } from "lucide-react"
import { Metrics } from "@/types/metrics"
import { PlatformConnection } from "@/types/platformConnection"
import Image from "next/image"
import { useBrandContext } from '@/lib/context/BrandContext'
import { useUser } from "@clerk/nextjs"
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks } from "date-fns"
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

  // Get date ranges for different timeframes
  const getTimeframeRange = () => {
    const now = new Date()
    
    if (synopsisTimeframe === 'monthly') {
      // Previous month
      const prevMonth = subMonths(now, 1)
      return {
        from: startOfMonth(prevMonth),
        to: endOfMonth(prevMonth),
        label: format(prevMonth, 'MMMM yyyy')
      }
    } else if (synopsisTimeframe === 'weekly') {
      // Previous week (Monday-Sunday)
      const prevWeek = subWeeks(now, 1)
      return {
        from: startOfWeek(prevWeek, { weekStartsOn: 1 }),
        to: endOfWeek(prevWeek, { weekStartsOn: 1 }),
        label: `${format(startOfWeek(prevWeek, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(prevWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
      }
    } else {
      // Today
      return {
        from: now,
        to: now,
        label: 'Today'
      }
    }
  }

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
      return "Connect your platforms to see performance insights."
    }

    let insights = ""
    
    if (hasShopify) {
      const totalSales = metrics.totalSales || 0
      const ordersCount = metrics.ordersPlaced || 0
      const aov = metrics.averageOrderValue || 0
      
      insights += `Over the last ${synopsisTimeframe === 'monthly' ? '30' : synopsisTimeframe === 'weekly' ? '7' : '1'} days, `
      insights += `we generated ${ordersCount} total purchases across various campaigns, `
      insights += `with an average ROAS of ${(metrics.roas || 0).toFixed(2)}x and a total ad spend of ${formatCurrency(metrics.adSpend || 0)}. `
    }
    
    if (hasMeta) {
      insights += `Meta Ads ${metrics.roasGrowth > 0 ? 'are performing well' : 'need optimization'} `
      insights += `with a ROAS of ${(metrics.roas || 0).toFixed(2)}x. `
    }
    
    return insights
  }

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
        {/* Shopify Total Sales */}
        {hasShopify && (
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <Image 
                    src="https://i.imgur.com/cnCcupx.png" 
                    alt="Shopify logo" 
                    width={18} 
                    height={18} 
                    className="object-contain"
                  />
                </div>
                <span className="ml-0.5">Total Revenue</span>
                <DollarSign className="h-4 w-4" />
              </div>
            }
            value={`$${(metrics.totalSales || 0).toLocaleString()}`}
            change={metrics.salesGrowth || 0}
            loading={isLoading}
            refreshing={isRefreshingData}
            data={metrics.revenueByDay?.map(item => ({ 
              date: item.date, 
              value: item.amount 
            })) || []}
            platform="shopify"
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
                {timeframe.label}
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
                    {hasMeta && metrics.roas > 3 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-medium">Best Performing Campaign:</span> {brandName}/Adv+ Catalog (ROAS {(metrics.roas || 0).toFixed(2)}x, CPA ${(metrics.costPerResult || 0).toFixed(2)})
                        </span>
                      </li>
                    )}
                    
                    {hasMeta && metrics.roas < 2 && (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-medium">Underperforming Campaign:</span> {brandName}/New Strat - ABO (ROAS 1.27x, CPA $47.56)
                        </span>
                      </li>
                    )}
                    
                    {hasMeta && (
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-medium">Scaling Opportunity:</span> Cold Conv CBO campaigns are performing at a 1.72x ROAS, indicating room for optimization
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
                        <th className="text-left p-2 text-sm font-medium text-gray-300 border border-[#333]">This {synopsisTimeframe === 'monthly' ? 'Month' : synopsisTimeframe === 'weekly' ? 'Week' : 'Day'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasShopify && (
                        <>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Total Revenue</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{formatCurrency(metrics.totalSales || 0)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Orders Placed</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{metrics.ordersPlaced || 0}</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Average Order Value</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{formatCurrency(metrics.averageOrderValue || 0)}</td>
                          </tr>
                        </>
                      )}
                      
                      {hasMeta && (
                        <>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Total Ad Spend</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{formatCurrency(metrics.adSpend || 0)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">ROAS (Return on Ad Spend)</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{(metrics.roas || 0).toFixed(2)}x</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Click Through Rate (CTR)</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{((metrics.ctr || 0) * 100).toFixed(2)}%</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">Cost Per Acquisition (CPA)</td>
                            <td className="p-2 text-sm text-gray-300 border border-[#333]">{formatCurrency(metrics.costPerResult || 0)}</td>
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
                        <span className="text-green-400">●</span> Best Performing Audiences:
                      </h4>
                      <ul className="space-y-2 text-sm pl-6">
                        <li className="text-gray-300">
                          <span className="font-medium">Adv+ Catalog</span> has the highest ROAS (8.34x) and lowest CPA ($7.81). This audience should receive additional budget allocation.
                        </li>
                        <li className="text-gray-300">
                          <span className="font-medium">Cold Conv - ABO</span> campaigns are performing decently with a 3.34x ROAS, indicating a strong audience segment to optimize further.
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <span className="text-red-400">✕</span> Low-Performing Audiences:
                      </h4>
                      <ul className="space-y-2 text-sm pl-6">
                        <li className="text-gray-300">
                          <span className="font-medium">New Strat ABO</span> campaigns have a high CPA ($47.56) and low ROAS (1.27x). Testing new creatives or audience segments may help.
                        </li>
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
                      <span className="font-medium">Path to Success:</span> Focus on scaling Adv+ Catalog and Cold Conv - ABO, which have high ROAS.
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
                    <h4 className="text-sm font-medium mb-2">Scaling Plan:</h4>
                    <ul className="space-y-2 text-sm pl-6 list-disc text-gray-300">
                      {hasMeta && (
                        <>
                          <li>Increase Adv+ Catalog spend by 15-20% since it's the best-performing campaign</li>
                          <li>Optimize Cold Conv - ABO campaigns for improved efficiency</li>
                          <li>Consider ADV+ for automated scaling while maintaining manual ABO testing</li>
                        </>
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
                      <h4 className="text-sm font-medium mb-2">Creative Direction:</h4>
                      <ul className="space-y-2 text-sm pl-6 list-disc text-gray-300">
                        <li>Test new hooks & CTAs to improve CTR (currently below 1%)</li>
                        <li>A/B test different ad formats (carousel vs. video vs. static images)</li>
                        <li>Use urgency-driven messaging (limited-time offers, bundle deals)</li>
                      </ul>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Additional Growth Strategies:</h4>
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
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-white mb-4">Revenue Calendar</h3>
          <Card className="bg-[#111111] border-[#222222]">
            <CardContent className="h-[520px] p-0">
              <RevenueCalendarNew 
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