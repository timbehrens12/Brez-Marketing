"use client"

import { useState, useEffect } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Image from "next/image"
import { TrendingUp, TrendingDown, DollarSign, Target, Eye, MousePointer, Percent, CreditCard, Layers } from "lucide-react"
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
    <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#333] rounded-xl p-6 hover:border-[#444] transition-all duration-200 group">
      {/* Header with Icon and Title */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", iconColor)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
        </div>

        {/* Platform indicators */}
        <div className="flex items-center gap-1">
          {platforms.map((platform) => (
            <TooltipProvider key={platform.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative cursor-pointer">
                    <Image
                      src={platform.icon}
                      alt={platform.name}
                      width={20}
                      height={20}
                      className={cn(
                        "object-contain transition-all duration-300 rounded",
                        platform.active
                          ? "opacity-100"
                          : "grayscale opacity-40"
                      )}
                    />
                    {platform.active && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-[#1a1a1a]" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#444] text-white p-3 rounded-lg shadow-xl"
                  sideOffset={8}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Image
                        src={platform.icon}
                        alt={platform.name}
                        width={16}
                        height={16}
                        className="object-contain"
                      />
                      <span className="font-medium text-white">{platform.name}</span>
                    </div>
                    <div className="text-xs text-gray-300">
                      {platform.active ? "Connected & Active" : "Not Connected"}
                    </div>
                    <div className="text-xs text-gray-400">
                      Value: {platform.value}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Main Value Display */}
      <div className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-white">
            {formatValue(value)}
          </span>
          {change !== null && change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-gray-400"
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
          <div className="mt-3">
            {customContent}
          </div>
        )}

        {/* Subtle hover effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#2a2a2a] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
      </div>
    </div>
  )
}

export default function BlendedWidgetsTable({
  metaMetrics,
  layout = 'horizontal'
}: BlendedWidgetsTableProps) {
  const { brands, selectedBrand } = useBrandContext()
  const { userId } = useAuth()
  const [budgetData, setBudgetData] = useState<BudgetData>({
    totalBudget: 0,
    totalSpend: 0,
    budgetUsedPercentage: 0,
    brands: []
  })

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">Profitability Metrics</h2>
            <p className="text-sm text-gray-400">Key performance indicators for campaign profitability</p>
          </div>
          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
        
        {/* Profitability-Focused Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Primary Profitability Metrics */}
          <BlendedMetricCard
            icon={TrendingUp}
            iconColor="bg-gradient-to-br from-green-500/20 to-green-600/30"
            title="ROAS (Return on Ad Spend)"
            value={metaMetrics.roas}
            change={metaMetrics.roasGrowth}
            suffix="x"
            decimals={2}
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

          <BlendedMetricCard
            icon={CreditCard}
            iconColor="bg-gradient-to-br from-blue-500/20 to-blue-600/30"
            title="Total Revenue"
            value={metaMetrics.roas * metaMetrics.adSpend}
            change={metaMetrics.roasGrowth}
            prefix="$"
            decimals={2}
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
            iconColor="bg-gradient-to-br from-purple-500/20 to-purple-600/30"
            title="Total Conversions"
            value={metaMetrics.conversions}
            change={metaMetrics.conversionGrowth}
            decimals={0}
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

          {/* Efficiency Metrics */}
          <BlendedMetricCard
            icon={DollarSign}
            iconColor="bg-gradient-to-br from-orange-500/20 to-orange-600/30"
            title="Cost Per Conversion"
            value={metaMetrics.costPerResult}
            change={metaMetrics.cprGrowth}
            prefix="$"
            decimals={2}
            platforms={[
              {
                name: "Meta",
                icon: "https://i.imgur.com/6hyyRrs.png",
                value: `$${metaMetrics.costPerResult?.toFixed(2) || '0.00'}`,
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
            icon={Percent}
            iconColor="bg-gradient-to-br from-cyan-500/20 to-cyan-600/30"
            title="Click-Through Rate"
            value={metaMetrics.ctr / 100}
            change={metaMetrics.ctrGrowth}
            isPercentage={true}
            decimals={2}
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
            icon={Layers}
            iconColor="bg-gradient-to-br from-pink-500/20 to-pink-600/30"
            title="Budget Utilization"
            value={budgetData.budgetUsedPercentage}
            change={null}
            isPercentage={true}
            decimals={1}
            customContent={
              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Budget:</span>
                  <span className="text-white">${budgetData.totalBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Spent:</span>
                  <span className="text-white">${budgetData.totalSpend.toLocaleString()}</span>
                </div>
                <div className="w-full bg-[#333] rounded-full h-2 mt-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, budgetData.budgetUsedPercentage)}%` }}
                  ></div>
                </div>
              </div>
            }
            platforms={[
              {
                name: "Meta",
                icon: "https://i.imgur.com/6hyyRrs.png",
                value: `${budgetData.budgetUsedPercentage.toFixed(1)}%`,
                active: true
              },
              {
                name: "TikTok",
                icon: "https://i.imgur.com/AXHa9UT.png",
                value: "0.0%",
                active: false
              },
              {
                name: "Google Ads",
                icon: "https://i.imgur.com/TavV4UJ.png",
                value: "0.0%",
                active: false
              }
            ]}
          />
        </div>
      </div>
    )
  }
                      { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: `$${metaMetrics.adSpend.toFixed(2)}`, active: true },
                      { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "$0.00", active: false },
                      { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "$0.00", active: false }
                    ]}
                  />
                </div>
                
                <div>
                  <BlendedMetricCard
                    icon={Eye}
                    iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
                    title="Impressions"
                    value={metaMetrics.impressions}
                    change={metaMetrics.impressionGrowth}
                    platforms={[
                      { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: metaMetrics.impressions.toLocaleString(), active: true },
                      { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "0", active: false },
                      { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "0", active: false }
                    ]}
                  />
                </div>

                <div>
                  <BlendedMetricCard
                    icon={MousePointer}
                    iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
                    title="Clicks"
                    value={metaMetrics.clicks}
                    change={metaMetrics.clickGrowth}
                    platforms={[
                      { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: metaMetrics.clicks.toLocaleString(), active: true },
                      { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "0", active: false },
                      { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "0", active: false }
                    ]}
                  />
                </div>

                <div>
                  <BlendedMetricCard
                    icon={Target}
                    iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
                    title="Conversions"
                    value={metaMetrics.conversions}
                    change={metaMetrics.conversionGrowth}
                    platforms={[
                      { name: "Meta", icon: "https://i.imgur.com/6hyyRrs.png", value: metaMetrics.conversions.toLocaleString(), active: true },
                      { name: "TikTok", icon: "https://i.imgur.com/AXHa9UT.png", value: "0", active: false },
                      { name: "Google Ads", icon: "https://i.imgur.com/TavV4UJ.png", value: "0", active: false }
                    ]}
                  />
                </div>

                {/* Row 2 - Bottom 4 metrics */}
                <div>
                  <BlendedMetricCard
                    icon={Percent}
                    iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
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
                </div>

                <div>
                  <BlendedMetricCard
                    icon={DollarSign}
                    iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
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

                <div>
                  <BlendedMetricCard
                    icon={TrendingUp}
                    iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
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
                </div>

                <div>
                  <BlendedMetricCard
                    icon={Users}
                    iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
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