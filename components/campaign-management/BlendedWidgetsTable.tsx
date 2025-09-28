"use client"

import { useState, useEffect } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import Image from "next/image"
import { TrendingUp, TrendingDown, DollarSign, Target, Eye, MousePointer, PercentIcon as Percent, CreditCard, Layers, AlertTriangle, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'
import { getStandardSupabaseClient } from '@/lib/utils/unified-supabase'

interface MetaMetrics {
  adSpend: number
  adSpendGrowth: number
  impressions: number
  impressionGrowth: number
  clicks: number
  clickGrowth: number
  conversions: number
  conversionGrowth: number
  ctr: number
  ctrGrowth: number
  cpc: number
  cpcGrowth: number
  costPerResult: number
  cprGrowth: number
  roas: number
  roasGrowth: number
  frequency: number
  budget: number
  reach: number
  dailyData: any[]
  previousAdSpend: number
  previousImpressions: number
  previousClicks: number
  previousConversions: number
  previousCtr: number
  previousCpc: number
  previousRoas: number
}

interface BudgetData {
  totalBudget: number
  totalSpend: number
  budgetUsedPercentage: number
  brands: Array<{
    brand_id: string
    brand_name: string
    budget: number
    spend: number
    percentage: number
  }>
}

interface BlendedWidgetsTableProps {
  metaMetrics: MetaMetrics
  layout?: 'vertical' | 'horizontal'
  // Remove loading props
  // isLoadingMetrics: boolean
  // isRefreshingData: boolean
}

// Compact metric card component for modern blended metrics
function CompactMetricCard({
  icon: Icon,
  title,
  value,
  change,
  prefix,
  suffix,
  decimals = 0,
  isPercentage = false,
  platforms
}: {
  icon: any
  title: string
  value: number
  change: number | null
  prefix?: string
  suffix?: string
  decimals?: number
  isPercentage?: boolean
  platforms: { name: string; icon: string; value: string | number; active: boolean }[]
}) {
  const formatValue = (val: number) => {
    if (isPercentage) {
      return `${(val * 100).toFixed(decimals)}%`
    }
    if (prefix) {
      return `${prefix}${val.toFixed(decimals)}`
    }
    if (suffix) {
      return `${val.toFixed(decimals)}${suffix}`
    }
    return val.toLocaleString()
  }

  return (
    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0A0A0A] to-[#111] 
                    border border-[#222] hover:border-[#333] transition-all duration-300 p-4 h-24">
      {/* Background shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/2 to-transparent 
                     translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      
      <div className="relative z-10 h-full flex flex-col">
        {/* Header with icon and platforms */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-white/5">
              <Icon className="w-3.5 h-3.5 text-white/70" />
            </div>
            <span className="text-xs font-medium text-gray-400 tracking-wide uppercase">{title}</span>
          </div>
          
          {/* Platform indicators */}
          <div className="flex items-center gap-1">
            {platforms.map((platform) => (
              <TooltipProvider key={platform.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Image 
                        src={platform.icon} 
                        alt={platform.name} 
                        width={16} 
                        height={16} 
                        className={cn(
                          "object-contain rounded-sm transition-all duration-300",
                          platform.active 
                            ? "opacity-100" 
                            : "grayscale opacity-30"
                        )}
                      />
                      {platform.active && (
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#0A0A0A]" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="bg-[#1a1a1a] border-[#333] text-white p-2 rounded-lg text-xs"
                    sideOffset={4}
                  >
                    <span>{platform.name}: {platform.value}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
        
        {/* Value and change */}
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white tracking-tight">
              {formatValue(value)}
            </span>
            {change !== null && change !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md",
                change > 0 
                  ? "text-green-400 bg-green-500/10" 
                  : change < 0 
                    ? "text-red-400 bg-red-500/10" 
                    : "text-gray-400 bg-gray-500/10"
              )}>
                {change > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : change < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : null}
                <span>{change === 0 ? "0%" : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Budget usage card component
function BudgetUsageCard({ budgetData }: { budgetData: any }) {
  const usagePercentage = budgetData.budgetUsedPercentage || 0
  
  return (
    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0A0A0A] to-[#111] 
                    border border-[#222] hover:border-[#333] transition-all duration-300 p-4 h-24">
      {/* Background shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/2 to-transparent 
                     translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-white/5">
              <CreditCard className="w-3.5 h-3.5 text-white/70" />
            </div>
            <span className="text-xs font-medium text-gray-400 tracking-wide uppercase">Budget Usage</span>
          </div>
          <span className="text-xs text-gray-500">
            ${budgetData.totalSpend?.toFixed(0) || 0} / ${budgetData.totalBudget?.toFixed(0) || 0}
          </span>
        </div>
        
        {/* Progress and percentage */}
        <div className="flex items-end justify-between">
          <span className="text-xl font-bold text-white tracking-tight">
            {usagePercentage.toFixed(1)}%
          </span>
          <div className="flex-1 mx-3 mb-1">
            <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-gray-500 to-gray-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BlendedWidgetsTable({ 
  metaMetrics,
  layout = 'vertical'
  // Remove loading props
  // isLoadingMetrics, 
  // isRefreshingData 
}: BlendedWidgetsTableProps) {
  const { brands, selectedBrand } = useBrandContext()
  const { userId } = useAuth()
  const [budgetData, setBudgetData] = useState<BudgetData>({
    totalBudget: 0,
    totalSpend: 0,
    budgetUsedPercentage: 0,
    brands: []
  })

  // Remove loading state calculation
  // const loading = isLoadingMetrics || isRefreshingData

  useEffect(() => {
    if (!userId || !selectedBrand) return
    fetchBudgetData()
  }, [userId, selectedBrand, metaMetrics.adSpend])

  const fetchBudgetData = async () => {
    try {
      if (!selectedBrand) {
        // console.log(`[BlendedWidgets] No brand selected, skipping budget fetch`)
        return
      }

      // console.log(`[BlendedWidgets] ⭐ BUDGET FETCH STARTED ⭐ for selected brand: ${selectedBrand.name} (${selectedBrand.id})`, { selectedBrand, metaMetrics })
      const supabase = getStandardSupabaseClient()
      
      let totalBudget = 0
      let totalSpend = metaMetrics.adSpend
      const brandBudgets: BudgetData['brands'] = []

      // Only process the selected brand
      const brand = selectedBrand
        // console.log(`[BlendedWidgets] 🔍 Processing brand: ${brand.name} (${brand.id})`)
        try {
          // Get active campaigns for this brand using the same API as CampaignWidget
          const response = await fetch(`/api/meta/campaigns?brandId=${brand.id}&status=ACTIVE`)
          const apiData = await response.json()
          
          const campaigns = apiData.campaigns || []
          const error = response.ok ? null : { message: `HTTP ${response.status}` }

          // console.log(`[BlendedWidgets] API result for brand ${brand.name} (${brand.id}):`, { campaigns: campaigns.length, error, apiData })

          let budget = 0
          
          if (error) {
            // console.log(`[BlendedWidgets] Campaign budget query error for brand ${brand.name}:`, error)
          }
          
          if (error) {
            
            // Fallback to brand_budgets table if meta_campaigns fails
            try {
              const { data: brandBudgetConfig, error: budgetError } = await supabase
                .from('brand_budgets')
                .select('daily_budget')
                .eq('brand_id', brand.id)
                .eq('user_id', userId)
                .single()

              if (!budgetError && brandBudgetConfig?.daily_budget) {
                budget = brandBudgetConfig.daily_budget
                // console.log(`[BlendedWidgets] Using fallback budget from brand_budgets: $${budget}`)
              }
            } catch (fallbackError) {
              // console.log(`[BlendedWidgets] Fallback budget query also failed:`, fallbackError)
            }
          } else {
            // Filter and sum up all active campaign budgets for this brand
            const validCampaigns = campaigns.filter((campaign: any) => {
              const campaignBudget = parseFloat(campaign.budget || '0')
              return campaignBudget > 0
            })
            
            budget = validCampaigns.reduce((sum: number, campaign: any) => {
              const campaignBudget = parseFloat(campaign.budget || '0')
              return sum + campaignBudget
            }, 0)
            
            // console.log(`[BlendedWidgets] Brand ${brand.name}: Found ${campaigns.length} campaigns, ${validCampaigns.length} with valid budgets, total budget: $${budget}`)
            // console.log(`[BlendedWidgets] Valid campaigns:`, validCampaigns.map((c: any) => ({ name: c.campaign_name, budget: c.budget, status: c.status })))
          }
          totalBudget = budget  // Use this brand's budget as the total
          brandBudgets.push({
            brand_id: brand.id,
            brand_name: brand.name,
            budget,
            spend: totalSpend,
            percentage: budget > 0 ? (totalSpend / budget) * 100 : 0
          })
        } catch (brandError) {
          // console.log(`[BlendedWidgets] Error fetching budget for brand ${brand.name}:`, brandError)
          // Still add the brand with 0 budget
          brandBudgets.push({
            brand_id: brand.id,
            brand_name: brand.name,
            budget: 0,
            spend: 0,
            percentage: 0
          })
        }

      const budgetUsedPercentage = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0

      // console.log(`[BlendedWidgets] Budget calculation: Total Budget: $${totalBudget}, Total Spend: $${totalSpend}, Usage: ${budgetUsedPercentage.toFixed(1)}%`)

      setBudgetData({
        totalBudget,
        totalSpend,
        budgetUsedPercentage,
        brands: brandBudgets
      })

    } catch (error) {
      console.error('[BlendedWidgets] Error fetching budget data:', error)
      // Set fallback data
      setBudgetData({
        totalBudget: 0,
        totalSpend: metaMetrics.adSpend,
        budgetUsedPercentage: 0,
        brands: []
      })
    }
  }



  if (layout === 'horizontal') {
    return (
      <div className="relative bg-gradient-to-br from-[#0A0A0A] to-[#111] border border-[#222] rounded-2xl overflow-hidden">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] p-6 border-b border-[#333]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
                          flex items-center justify-center border border-white/10 shadow-lg">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Performance Overview</h2>
              <p className="text-gray-400 font-medium">Unified metrics across all advertising platforms</p>
            </div>
          </div>
        </div>
        
        {/* Compact Metrics Grid */}
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
            
            {/* Budget Usage Card */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-2 xl:col-span-2">
              <BudgetUsageCard budgetData={budgetData} />
            </div>

            {/* Spend */}
            <CompactMetricCard
              icon={DollarSign}
              title="Spend"
              value={metaMetrics.adSpend}
              change={metaMetrics.adSpendGrowth}
              prefix="$"
              decimals={2}
              platforms={[
                { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: `$${metaMetrics.adSpend.toFixed(2)}`, active: true },
                { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "$0.00", active: false },
                { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "$0.00", active: false }
              ]}
            />
            
            {/* ROAS */}
            <CompactMetricCard
              icon={TrendingUp}
              title="ROAS"
              value={metaMetrics.roas}
              change={metaMetrics.roasGrowth}
              suffix="x"
              decimals={2}
              platforms={[
                { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: `${metaMetrics.roas.toFixed(2)}x`, active: true },
                { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "0.00x", active: false },
                { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "0.00x", active: false }
              ]}
            />

            {/* Impressions */}
            <CompactMetricCard
              icon={Eye}
              title="Impressions"
              value={metaMetrics.impressions}
              change={metaMetrics.impressionGrowth}
              platforms={[
                { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: metaMetrics.impressions.toLocaleString(), active: true },
                { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "0", active: false },
                { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "0", active: false }
              ]}
            />

            {/* Clicks */}
            <CompactMetricCard
              icon={MousePointer}
              title="Clicks"
              value={metaMetrics.clicks}
              change={metaMetrics.clickGrowth}
              platforms={[
                { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: metaMetrics.clicks.toLocaleString(), active: true },
                { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "0", active: false },
                { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "0", active: false }
              ]}
            />

            {/* Conversions */}
            <CompactMetricCard
              icon={Target}
              title="Conversions"
              value={metaMetrics.conversions}
              change={metaMetrics.conversionGrowth}
              platforms={[
                { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: metaMetrics.conversions.toLocaleString(), active: true },
                { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "0", active: false },
                { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "0", active: false }
              ]}
            />

            {/* CTR */}
            <CompactMetricCard
              icon={Percent}
              title="CTR"
              value={metaMetrics.ctr}
              change={metaMetrics.ctrGrowth}
              suffix="%"
              decimals={2}
              platforms={[
                { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: `${metaMetrics.ctr.toFixed(2)}%`, active: true },
                { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "0.00%", active: false },
                { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "0.00%", active: false }
              ]}
            />

            {/* CPC */}
            <CompactMetricCard
              icon={DollarSign}
              title="CPC"
              value={metaMetrics.cpc}
              change={metaMetrics.cpcGrowth}
              prefix="$"
              decimals={2}
              platforms={[
                { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: `$${metaMetrics.cpc.toFixed(2)}`, active: true },
                { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "$0.00", active: false },
                { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "$0.00", active: false }
              ]}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-lg h-full flex flex-col">
      <div className="relative">
        {/* Header - matches AIDailyReport style */}
        <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] p-6 border-b border-[#333] rounded-t-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
                          flex items-center justify-center border border-white/10 shadow-lg">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Blended Performance Metrics</h2>
              <p className="text-gray-400 font-medium text-base">Unified view of performance across all advertising platforms</p>
            </div>
          </div>
        </div>
        

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* 2-column grid with modern cards */}
          <div className="grid grid-cols-2 gap-3">
          
          {/* Row 1 - Budget Usage (spanning 2 columns) */}
          <div className="col-span-2">
            <BlendedMetricCard
              icon={CreditCard}
              iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
              title="Total Blended Budget Usage"
              value={budgetData.budgetUsedPercentage / 100}
              change={null} // No change data for budget
              isPercentage={true}
              decimals={1}
              customContent={
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Spend: ${budgetData.totalSpend.toFixed(2)}</span>
                    <span className="text-gray-400">Budget: ${budgetData.totalBudget.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-[#333] rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-white transition-all duration-300"
                      style={{ width: `${Math.min(budgetData.budgetUsedPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              }
              platforms={[
                { 
                  name: "Meta", 
                  icon: "https://i.imgur.com/6hyyRrs.png", 
                  value: `$${budgetData.totalSpend.toFixed(2)} / $${budgetData.totalBudget.toFixed(2)}`,
                  active: budgetData.totalBudget > 0
                },
                { 
                  name: "TikTok", 
                  icon: "https://i.imgur.com/AXHa9UT.png", 
                  value: "$0.00 / $0.00",
                  active: false
                },
                { 
                  name: "Google Ads", 
                  icon: "https://i.imgur.com/TavV4UJ.png", 
                  value: "$0.00 / $0.00",
                  active: false
                }
              ]}
            />
          </div>
          
          {/* Row 2 - Spend & ROAS */}
          <BlendedMetricCard
            icon={DollarSign}
            iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
            title="Total Blended Spend"
            value={metaMetrics.adSpend}
            change={metaMetrics.adSpendGrowth}
            prefix="$"
            decimals={2}
            // Remove loading prop
            // loading={loading}
            platforms={[
              { 
                name: "Meta", 
                icon: "https://i.imgur.com/6hyyRrs.png", 
                value: `$${metaMetrics.adSpend?.toFixed(2) || '0.00'}`,
                active: true
              },
              { 
                name: "TikTok", 
                icon: "https://i.imgur.com/AXHa9UT.png", 
                value: "$0.00",
                active: false
              },
              { 
                name: "Google Ads", 
                icon: "https://i.imgur.com/TavV4UJ.png", 
                value: "$0.00",
                active: false
              }
            ]}
          />
          
          <BlendedMetricCard
            icon={Target}
            iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
            title="Total Blended ROAS"
            value={metaMetrics.roas}
            change={metaMetrics.roasGrowth}
            suffix="x"
            decimals={2}
            // Remove loading prop
            // loading={loading}
            platforms={[
              { 
                name: "Meta", 
                icon: "https://i.imgur.com/6hyyRrs.png", 
                value: `${metaMetrics.roas?.toFixed(2) || '0.00'}x`,
                active: true
              },
              { 
                name: "TikTok", 
                icon: "https://i.imgur.com/AXHa9UT.png", 
                value: "0.00x",
                active: false
              },
              { 
                name: "Google Ads", 
                icon: "https://i.imgur.com/TavV4UJ.png", 
                value: "0.00x",
                active: false
              }
            ]}
          />

          {/* Row 3 - Revenue & Conversions */}
          <BlendedMetricCard
            icon={CreditCard}
            iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
            title="Total Blended Revenue"
            value={metaMetrics.roas * metaMetrics.adSpend}
            change={metaMetrics.roasGrowth}
            prefix="$"
            decimals={2}
            // Remove loading prop
            // loading={loading}
            platforms={[
              { 
                name: "Meta", 
                icon: "https://i.imgur.com/6hyyRrs.png", 
                value: `$${((metaMetrics.roas || 0) * (metaMetrics.adSpend || 0)).toFixed(2)}`,
                active: true
              },
              { 
                name: "TikTok", 
                icon: "https://i.imgur.com/AXHa9UT.png", 
                value: "$0.00",
                active: false
              },
              { 
                name: "Google Ads", 
                icon: "https://i.imgur.com/TavV4UJ.png", 
                value: "$0.00",
                active: false
              }
            ]}
          />
          
          <BlendedMetricCard
            icon={Target}
            iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
            title="Total Blended Conversions"
            value={metaMetrics.conversions}
            change={metaMetrics.conversionGrowth}
            decimals={0}
            // Remove loading prop
            // loading={loading}
            platforms={[
              { 
                name: "Meta", 
                icon: "https://i.imgur.com/6hyyRrs.png", 
                value: metaMetrics.conversions?.toLocaleString() || '0',
                active: true
              },
              { 
                name: "TikTok", 
                icon: "https://i.imgur.com/AXHa9UT.png", 
                value: "0",
                active: false
              },
              { 
                name: "Google Ads", 
                icon: "https://i.imgur.com/TavV4UJ.png", 
                value: "0",
                active: false
              }
            ]}
          />

          {/* Row 4 - Impressions & Clicks */}
          <BlendedMetricCard
            icon={Eye}
            iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
            title="Total Blended Impressions"
            value={metaMetrics.impressions}
            change={metaMetrics.impressionGrowth}
            decimals={0}
            // Remove loading prop
            // loading={loading}
            platforms={[
              { 
                name: "Meta", 
                icon: "https://i.imgur.com/6hyyRrs.png", 
                value: metaMetrics.impressions?.toLocaleString() || '0',
                active: true
              },
              { 
                name: "TikTok", 
                icon: "https://i.imgur.com/AXHa9UT.png", 
                value: "0",
                active: false
              },
              { 
                name: "Google Ads", 
                icon: "https://i.imgur.com/TavV4UJ.png", 
                value: "0",
                active: false
              }
            ]}
          />
          
          <BlendedMetricCard
            icon={MousePointer}
            iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
            title="Total Blended Clicks"
            value={metaMetrics.clicks}
            change={metaMetrics.clickGrowth}
            decimals={0}
            // Remove loading prop
            // loading={loading}
            platforms={[
              { 
                name: "Meta", 
                icon: "https://i.imgur.com/6hyyRrs.png", 
                value: metaMetrics.clicks?.toLocaleString() || '0',
                active: true
              },
              { 
                name: "TikTok", 
                icon: "https://i.imgur.com/AXHa9UT.png", 
                value: "0",
                active: false
              },
              { 
                name: "Google Ads", 
                icon: "https://i.imgur.com/TavV4UJ.png", 
                value: "0",
                active: false
              }
            ]}
          />

          {/* Row 5 - CTR & CPC */}
          <BlendedMetricCard
            icon={Percent}
            iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
            title="Total Blended CTR"
            value={metaMetrics.ctr / 100}
            change={metaMetrics.ctrGrowth}
            isPercentage={true}
            decimals={2}
            // Remove loading prop
            // loading={loading}
            platforms={[
              { 
                name: "Meta", 
                icon: "https://i.imgur.com/6hyyRrs.png", 
                value: `${metaMetrics.ctr?.toFixed(2) || '0.00'}%`,
                active: true
              },
              { 
                name: "TikTok", 
                icon: "https://i.imgur.com/AXHa9UT.png", 
                value: "0.00%",
                active: false
              },
              { 
                name: "Google Ads", 
                icon: "https://i.imgur.com/TavV4UJ.png", 
                value: "0.00%",
                active: false
              }
            ]}
          />
          
          <BlendedMetricCard
            icon={DollarSign}
            iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
            title="Total Blended CPC"
            value={metaMetrics.cpc}
            change={metaMetrics.cpcGrowth}
            prefix="$"
            decimals={2}
            // Remove loading prop
            // loading={loading}
            platforms={[
              { 
                name: "Meta", 
                icon: "https://i.imgur.com/6hyyRrs.png", 
                value: `$${metaMetrics.cpc?.toFixed(2) || '0.00'}`,
                active: true
              },
              { 
                name: "TikTok", 
                icon: "https://i.imgur.com/AXHa9UT.png", 
                value: "$0.00",
                active: false
              },
              { 
                name: "Google Ads", 
                icon: "https://i.imgur.com/TavV4UJ.png", 
                value: "$0.00",
                active: false
              }
            ]}
          />
          

        </div>
        </div>
      </div>
    </div>
  )
} 