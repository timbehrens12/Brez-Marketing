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

// Custom metric card component for blended metrics
function BlendedMetricCard({
  icon: Icon,
  iconColor,
  title,
  value,
  change,
  prefix,
  suffix,
  decimals = 0,
  isPercentage = false,
  customContent,
  // Remove loading prop
  // loading,
  platforms
}: {
  icon: any
  iconColor: string
  title: string
  value: number
  change: number | null
  prefix?: string
  suffix?: string
  decimals?: number
  isPercentage?: boolean
  customContent?: React.ReactNode
  // Remove loading prop
  // loading: boolean
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
    <div className="relative group">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      {/* Main card */}
      <div className="relative bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all duration-300 shadow-2xl hover:shadow-white/10 group-hover:scale-[1.02]">
        {/* Icon and Title */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-2xl shadow-lg", iconColor)}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>

          {/* Platform icons - Enhanced */}
          <div className="flex items-center gap-2">
            {platforms.map((platform) => (
              <TooltipProvider key={platform.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative group cursor-pointer">
                      <div className={cn(
                        "p-2 rounded-xl transition-all duration-300 border-2",
                        platform.active
                          ? "bg-white/10 border-white/30 hover:bg-white/20 hover:scale-110 shadow-lg"
                          : "bg-gray-800/50 border-gray-600/50 grayscale opacity-40 hover:opacity-60"
                      )}>
                        <Image
                          src={platform.icon}
                          alt={platform.name}
                          width={20}
                          height={20}
                          className="object-contain rounded"
                        />
                      </div>
                      {platform.active && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0A0A0A] animate-pulse" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#444] text-white p-4 rounded-xl shadow-2xl max-w-xs backdrop-blur-sm"
                    sideOffset={8}
                  >
                    <div className="space-y-3">
                      {/* Platform Header */}
                      <div className="flex items-center gap-3 pb-2 border-b border-[#333]">
                        <Image
                          src={platform.icon}
                          alt={platform.name}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                        <div>
                          <h4 className="font-semibold text-white">{platform.name}</h4>
                          <p className="text-xs text-gray-400">
                            {platform.active ? "Connected & Active" : "Not Connected"}
                          </p>
                        </div>
                      </div>

                      {/* Platform Value */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">{title} Value:</span>
                          <span className="font-semibold text-white">{platform.value}</span>
                        </div>

                        {platform.active ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-300">Contribution:</span>
                              <span className="font-semibold text-green-400">100%</span>
                            </div>
                            <div className="w-full bg-[#333] rounded-full h-2">
                              <div className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full w-full"></div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              Currently the only active platform contributing to this metric.
                            </p>
                          </>
                        ) : (
                          <div className="text-center py-2">
                            <p className="text-xs text-gray-400">
                              Connect {platform.name} to see contribution data
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Future Enhancement Note */}
                      {!platform.active && (
                        <div className="mt-3 p-2 bg-[#222] rounded-lg border-l-2 border-blue-500">
                          <p className="text-xs text-blue-300">
                            💡 Connect {platform.name} for blended analytics across all platforms
                          </p>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Value and Change - Enhanced */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white">
              {formatValue(value)}
            </span>
            {change !== null && change !== undefined && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium",
                change > 0 ? "text-green-400 bg-green-500/10" : change < 0 ? "text-red-400 bg-red-500/10" : "text-gray-400 bg-gray-500/10"
              )}>
                {change > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : change < 0 ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <div className="w-4 h-4" />
                )}
                <span>{change === 0 ? "0.0%" : `${Math.abs(change).toFixed(1)}%`}</span>
              </div>
            )}
          </div>

          {/* Custom content */}
          {customContent && (
            <div className="mt-4">
              {customContent}
            </div>
          )}
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
      <div className="relative">
        {/* Header - Enhanced with better visual hierarchy */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
              <Layers className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Blended Performance Metrics</h2>
              <p className="text-gray-400 font-medium text-lg">Unified view across all advertising platforms</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Data</span>
            </div>
            <div className="w-px h-4 bg-gray-600"></div>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="space-y-6">
          {/* Budget Usage Card - Enhanced design */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 via-transparent to-gray-600/5 rounded-3xl blur-xl"></div>
            <div className="relative bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                {/* Budget Icon & Title */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-gray-600/20 to-gray-700/30 rounded-2xl flex items-center justify-center border border-gray-500/30 shadow-lg">
                    <CreditCard className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Budget Utilization</h3>
                    <p className="text-gray-400 text-sm">Daily spend vs allocated budget</p>
                  </div>
                </div>

                {/* Budget Metrics */}
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="text-center lg:text-left">
                      <div className="text-2xl lg:text-3xl font-bold text-white mb-1">
                        {(budgetData.budgetUsedPercentage).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-400">Usage Rate</div>
                    </div>
                    <div className="text-center lg:text-left">
                      <div className="text-2xl lg:text-3xl font-bold text-white mb-1">
                        ${budgetData.totalSpend.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">Total Spend</div>
                    </div>
                    <div className="text-center lg:text-left">
                      <div className="text-2xl lg:text-3xl font-bold text-white mb-1">
                        ${budgetData.totalBudget.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">Total Budget</div>
                    </div>
                  </div>

                  {/* Progress Bar - Enhanced */}
                  <div className="relative">
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden backdrop-blur-sm border border-white/20">
                      <div
                        className="h-full bg-gradient-to-r from-gray-500 via-gray-400 to-white/60 rounded-full transition-all duration-1000 ease-out shadow-lg relative"
                        style={{ width: `${Math.min(budgetData.budgetUsedPercentage, 100)}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>0%</span>
                      <span className="font-medium">{Math.round(budgetData.budgetUsedPercentage)}% Used</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Grid - Enhanced with better cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            <BlendedMetricCard
              icon={DollarSign}
              iconColor="bg-gradient-to-br from-green-600/20 to-green-700/30 border-green-500/30"
              title="Ad Spend"
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

            <BlendedMetricCard
              icon={Eye}
              iconColor="bg-gradient-to-br from-blue-600/20 to-blue-700/30 border-blue-500/30"
              title="Impressions"
              value={metaMetrics.impressions}
              change={metaMetrics.impressionGrowth}
              platforms={[
                { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: metaMetrics.impressions.toLocaleString(), active: true },
                { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "0", active: false },
                { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "0", active: false }
              ]}
            />

            <BlendedMetricCard
              icon={MousePointer}
              iconColor="bg-gradient-to-br from-purple-600/20 to-purple-700/30 border-purple-500/30"
              title="Clicks"
              value={metaMetrics.clicks}
              change={metaMetrics.clickGrowth}
              platforms={[
                { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: metaMetrics.clicks.toLocaleString(), active: true },
                { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "0", active: false },
                { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "0", active: false }
              ]}
            />

            <BlendedMetricCard
              icon={Target}
              iconColor="bg-gradient-to-br from-orange-600/20 to-orange-700/30 border-orange-500/30"
              title="Conversions"
              value={metaMetrics.conversions}
              change={metaMetrics.conversionGrowth}
              platforms={[
                { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: metaMetrics.conversions.toLocaleString(), active: true },
                { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "0", active: false },
                { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "0", active: false }
              ]}
            />

            <BlendedMetricCard
              icon={Percent}
              iconColor="bg-gradient-to-br from-cyan-600/20 to-cyan-700/30 border-cyan-500/30"
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

            <BlendedMetricCard
              icon={DollarSign}
              iconColor="bg-gradient-to-br from-red-600/20 to-red-700/30 border-red-500/30"
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

            <BlendedMetricCard
              icon={TrendingUp}
              iconColor="bg-gradient-to-br from-emerald-600/20 to-emerald-700/30 border-emerald-500/30"
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

            <BlendedMetricCard
              icon={Users}
              iconColor="bg-gradient-to-br from-indigo-600/20 to-indigo-700/30 border-indigo-500/30"
              title="Frequency"
              value={metaMetrics.frequency}
              change={null}
              decimals={2}
              platforms={[
                { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: metaMetrics.frequency.toFixed(2), active: true },
                { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "0.00", active: false },
                { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "0.00", active: false }
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