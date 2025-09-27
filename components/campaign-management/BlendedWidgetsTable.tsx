"use client"

import { useState, useEffect } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import Image from "next/image"
import { TrendingUp, TrendingDown, DollarSign, Target, Eye, MousePointer, PercentIcon as Percent, CreditCard, Layers, AlertTriangle, Users, Minus } from "lucide-react"
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
}

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
    <div className="relative group h-full">
      <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#0F0F0F]/80 backdrop-blur-sm border border-white/10 rounded-xl p-5 h-full hover:border-white/20 transition-all duration-300 hover:transform hover:scale-105 overflow-hidden">
        {/* Subtle Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Header */}
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF2A2A]/20 to-[#FF2A2A]/5 rounded-xl flex items-center justify-center border border-[#FF2A2A]/20">
              <Icon className="w-5 h-5 text-[#FF2A2A]" />
            </div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">{title}</h3>
          </div>
        
          {/* Platform icons */}
          <div className="flex items-center gap-2">
            {platforms.map((platform) => (
              <TooltipProvider key={platform.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative group cursor-pointer">
                      <Image 
                        src={platform.icon} 
                        alt={platform.name} 
                        width={20} 
                        height={20} 
                        className={cn(
                          "object-contain transition-all duration-300 rounded-lg",
                          platform.active 
                            ? "opacity-100 hover:scale-110 shadow-lg" 
                            : "grayscale opacity-30 hover:opacity-50"
                        )}
                      />
                      {platform.active && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-[#1A1A1A]" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#444] text-white p-3 rounded-xl shadow-2xl"
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
                      <div className="text-sm text-gray-400">
                        {platform.active ? "Connected & Active" : "Not Connected"}
                      </div>
                      <div className="text-sm font-medium text-white">
                        {title}: {platform.value}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Enhanced Value and Change */}
        <div className="space-y-3 relative z-10">
          <div className="text-3xl font-black text-white tracking-tight leading-none">
            {customContent || formatValue(value)}
          </div>
          
          {change !== null && change !== undefined && (
            <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${
              change > 0 
                ? 'text-green-400 bg-green-500/10 border border-green-500/20' 
                : change < 0 
                ? 'text-red-400 bg-red-500/10 border border-red-500/20'
                : 'text-gray-400 bg-gray-500/10 border border-gray-500/20'
            }`}>
              {change > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : change < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              <span>{change === 0 ? "0.0%" : `${Math.abs(change).toFixed(1)}%`}</span>
            </div>
          )}
          
          {/* Custom content */}
          {customContent && (
            <div className="mt-3">
              {customContent}
            </div>
          )}
        </div>
        
        {/* Accent line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF2A2A] to-[#FF2A2A]/60"></div>
      </div>
    </div>
  )
}

export default function BlendedWidgetsTable({ 
  metaMetrics,
  layout = 'vertical'
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
        return
      }

      const supabase = getStandardSupabaseClient()
      
      let totalBudget = 0
      let totalSpend = metaMetrics.adSpend
      const brandBudgets: BudgetData['brands'] = []

      // Only process the selected brand
      const brand = selectedBrand
      try {
        // Get active campaigns for this brand using the same API as CampaignWidget
        const response = await fetch(`/api/meta/campaigns?brandId=${brand.id}&status=ACTIVE`)
        const apiData = await response.json()
        
        const campaigns = apiData.campaigns || []
        const error = response.ok ? null : { message: `HTTP ${response.status}` }

        let budget = 0
        
        if (error) {
          // Fallback to brand_budgets table
          try {
            const { data: brandBudgetConfig, error: budgetError } = await supabase
              .from('brand_budgets')
              .select('daily_budget')
              .eq('brand_id', brand.id)
              .eq('user_id', userId)
              .single()

            if (!budgetError && brandBudgetConfig?.daily_budget) {
              budget = brandBudgetConfig.daily_budget
            }
          } catch (fallbackError) {
            // Silent fallback
          }
        } else {
          // Calculate budget from active campaigns
          const validCampaigns = campaigns.filter((campaign: any) => {
            const campaignBudget = parseFloat(campaign.budget || '0')
            return campaignBudget > 0
          })
          
          budget = validCampaigns.reduce((sum: number, campaign: any) => {
            const campaignBudget = parseFloat(campaign.budget || '0')
            return sum + campaignBudget
          }, 0)
        }

        totalBudget += budget
        brandBudgets.push({
          brand_id: brand.id,
          brand_name: brand.name,
          budget: budget,
          spend: totalSpend,
          percentage: budget > 0 ? (totalSpend / budget) * 100 : 0
        })
      } catch (brandError) {
        // Still add the brand with 0 budget
        brandBudgets.push({
          brand_id: brand.id,
          brand_name: brand.name,
          budget: 0,
          spend: 0,
          percentage: 0
        })
      }

      // Calculate budget used percentage
      const budgetUsedPercentage = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0

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
      <div className="relative bg-gradient-to-br from-[#0D0D0D] via-[#111] to-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modern Header with Glass Effect */}
        <div className="bg-gradient-to-r from-[#111]/90 to-[#0A0A0A]/90 backdrop-blur-lg border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FF2A2A]/20 to-[#FF2A2A]/5 rounded-2xl flex items-center justify-center border border-[#FF2A2A]/20 shadow-lg">
                <Layers className="w-7 h-7 text-[#FF2A2A]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight mb-1">Performance Overview</h2>
                <p className="text-gray-400 font-medium">Unified view across all platforms</p>
              </div>
            </div>
            
            {/* Live Status Indicator */}
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">Live Data</span>
            </div>
          </div>
        </div>
        
        {/* Enhanced Content Section */}
        <div className="p-6 space-y-6">
          <div className="flex flex-col xl:flex-row gap-6">
            
            {/* Enhanced Budget Usage Card */}
            <div className="flex-shrink-0 xl:w-80 w-full">
              <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#0F0F0F]/80 backdrop-blur-sm border border-white/10 rounded-xl p-6 h-full">
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      budgetData.budgetUsedPercentage >= 80 
                        ? 'bg-orange-500/20 border border-orange-500/30' 
                        : 'bg-green-500/20 border border-green-500/30'
                    }`}>
                      <CreditCard className={`w-6 h-6 ${
                        budgetData.budgetUsedPercentage >= 80 ? 'text-orange-400' : 'text-green-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Budget Status</h3>
                      <p className="text-sm text-gray-400">Campaign spend tracking</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-black text-white mb-2">
                        {(budgetData.budgetUsedPercentage).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-400 font-medium">
                        ${budgetData.totalSpend.toLocaleString()} of ${budgetData.totalBudget.toLocaleString()}
                      </div>
                    </div>
                    
                    {/* Enhanced Progress Bar */}
                    <div className="space-y-2">
                      <div className="bg-[#0A0A0A] rounded-full h-3 overflow-hidden border border-white/5">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                            budgetData.budgetUsedPercentage >= 80 
                              ? 'bg-gradient-to-r from-orange-400 to-orange-500' 
                              : 'bg-gradient-to-r from-green-400 to-green-500'
                          }`}
                          style={{ width: `${Math.min(budgetData.budgetUsedPercentage, 100)}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Metrics Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 h-full">
                {/* Ad Spend */}
                <BlendedMetricCard
                  icon={DollarSign}
                  iconColor="bg-gradient-to-br from-gray-600/20 to-gray-700/30"
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
                
                {/* Impressions */}
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

                {/* Clicks */}
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

                {/* ROAS */}
                <BlendedMetricCard
                  icon={Target}
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
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vertical layout (original)
  return (
    <div className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-white/10 to-white/5 rounded-lg flex items-center justify-center border border-white/20">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Performance Metrics</h3>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Original vertical metric cards would go here */}
        <div className="text-center text-gray-400 col-span-full">
          Vertical layout - coming soon
        </div>
      </div>
    </div>
  )
}
