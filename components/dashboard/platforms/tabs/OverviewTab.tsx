"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GreetingWidget } from "@/components/dashboard/GreetingWidget"
import { RevenueCalendarNew } from "@/components/dashboard/RevenueCalendarNew"
import { SalesByProduct } from "@/components/dashboard/SalesByProduct"
import { InventorySummary } from "@/components/dashboard/InventorySummary"
import { MetricCard } from "@/components/metrics/MetricCard"
import { DollarSign, ShoppingBag, TrendingUp, Users, Eye, MousePointer } from "lucide-react"
import { Metrics } from "@/types/metrics"
import { PlatformConnection } from "@/types/platformConnection"
import Image from "next/image"
import { useBrandContext } from '@/lib/context/BrandContext'

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
  const brandName = brands.find(b => b.id === brandId)?.name || ""
  
  // Determine which platforms are connected
  const hasShopify = platformStatus.shopify
  const hasMeta = platformStatus.meta
  
  return (
    <div className="space-y-6">
      {/* Greeting Widget */}
      <GreetingWidget 
        brandId={brandId}
        brandName={brandName}
        metrics={metrics}
        connections={connections}
      />
      
      {/* Key Metrics Section */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Shopify Metrics */}
          {hasShopify && (
            <>
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
                    <span className="ml-0.5">Revenue</span>
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
                    <span className="ml-0.5">Orders</span>
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                }
                value={(metrics.ordersPlaced || 0).toString()}
                change={metrics.ordersGrowth || 0}
                loading={isLoading}
                refreshing={isRefreshingData}
                data={[]}
                platform="shopify"
                brandId={brandId}
              />
            </>
          )}
          
          {/* Meta Metrics */}
          {hasMeta && (
            <>
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
                value={`$${(metrics.adSpend || 0).toFixed(2)}`}
                change={metrics.adSpendGrowth || 0}
                loading={isLoading}
                refreshing={isRefreshingData}
                data={[]}
                platform="meta"
                brandId={brandId}
              />
              
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
                value={`${(metrics.roas || 0).toFixed(1)}x`}
                change={metrics.roasGrowth || 0}
                loading={isLoading}
                refreshing={isRefreshingData}
                data={[]}
                platform="meta"
                brandId={brandId}
              />
            </>
          )}
          
          {/* Placeholder metrics if not enough platforms are connected */}
          {!hasShopify && !hasMeta && (
            <div className="col-span-4 text-center py-8 bg-[#1A1A1A] rounded-lg border border-[#333]">
              <p className="text-gray-400">Connect platforms to view metrics</p>
            </div>
          )}
          
          {hasShopify && !hasMeta && (
            <>
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
                    <span className="ml-0.5">AOV</span>
                    <DollarSign className="h-4 w-4" />
                  </div>
                }
                value={`$${(metrics.averageOrderValue || 0).toFixed(2)}`}
                change={metrics.aovGrowth || 0}
                loading={isLoading}
                refreshing={isRefreshingData}
                data={[]}
                platform="shopify"
                brandId={brandId}
              />
              
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
                    <span className="ml-0.5">Units Sold</span>
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                }
                value={(metrics.unitsSold || 0).toString()}
                change={metrics.unitsGrowth || 0}
                loading={isLoading}
                refreshing={isRefreshingData}
                data={[]}
                platform="shopify"
                brandId={brandId}
              />
            </>
          )}
          
          {!hasShopify && hasMeta && (
            <>
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
                    <span className="ml-0.5">Impressions</span>
                    <Eye className="h-4 w-4" />
                  </div>
                }
                value={(metrics.impressions || 0).toLocaleString()}
                change={metrics.impressionGrowth || 0}
                loading={isLoading}
                refreshing={isRefreshingData}
                data={[]}
                platform="meta"
                brandId={brandId}
              />
              
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
                    <span className="ml-0.5">CTR</span>
                    <MousePointer className="h-4 w-4" />
                  </div>
                }
                value={`${(metrics.ctr || 0).toFixed(1)}%`}
                change={metrics.ctrGrowth || 0}
                loading={isLoading}
                refreshing={isRefreshingData}
                data={[]}
                platform="meta"
                brandId={brandId}
              />
            </>
          )}
        </div>
      </div>
      
      {/* Revenue Calendar and Sales by Product */}
      {hasShopify && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[400px]">
            <RevenueCalendarNew 
              brandId={brandId}
              isRefreshing={isRefreshingData}
            />
          </div>
          
          <div className="h-[400px]">
            <SalesByProduct 
              brandId={brandId}
              dateRange={dateRange}
              isRefreshing={isRefreshingData}
            />
          </div>
        </div>
      )}
      
      {/* Inventory Summary */}
      {hasShopify && (
        <div className="mt-6">
          <InventorySummary 
            brandId={brandId}
            isLoading={isLoading}
            isRefreshingData={isRefreshingData}
          />
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