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
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:bg-white/[0.04] transition-all duration-200">
      {/* Simple Header */}
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">{title}</span>
      </div>
        
      </div>

      {/* Simple Value and Change */}
      <div className="space-y-2">
        <div className="text-lg font-medium text-white">
          {customContent || formatValue(value)}
        </div>
        
        {change !== null && change !== undefined && (
          <div className={`inline-flex items-center gap-1 text-xs ${
            change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400'
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
      <div className="space-y-6">
        {/* Minimal Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-white">Performance</h2>
            <p className="text-sm text-gray-400">Current metrics</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            Live
          </div>
        </div>
        
        {/* Light Content Grid */}
        <div className="grid grid-cols-5 gap-6">
          
          {/* Budget Card - Minimal */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Budget</span>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-medium text-white">
                  {(budgetData.budgetUsedPercentage).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">
                  ${budgetData.totalSpend.toLocaleString()} / ${budgetData.totalBudget.toLocaleString()}
                </div>
                <div className="w-full bg-white/5 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all duration-300 ${
                      budgetData.budgetUsedPercentage >= 80 ? 'bg-orange-400' : 'bg-white/20'
                    }`}
                    style={{ width: `${Math.min(budgetData.budgetUsedPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Grid - Minimal Cards */}
          <div className="col-span-4 grid grid-cols-4 gap-4">
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
