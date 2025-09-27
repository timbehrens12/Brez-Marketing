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
    <div className="relative bg-[#0A0A0A] border border-[#222] rounded-lg p-4 hover:border-[#444] transition-all duration-200 group">
      {/* Icon and Title */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md", iconColor)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-medium text-gray-300">{title}</h3>
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
                      width={32} 
                      height={32} 
                      className={cn(
                        "object-contain transition-all duration-300 rounded-lg",
                        platform.active 
                          ? "opacity-100 hover:scale-110 shadow-lg" 
                          : "grayscale opacity-30 hover:opacity-50"
                      )}
                    />
                    {platform.active && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0A0A0A]" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent 
                  side="bottom" 
                  className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#444] text-white p-4 rounded-xl shadow-2xl max-w-xs"
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

      {/* Value and Change */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          {/* Remove loading skeleton, always show actual content */}
          <span className="text-2xl font-semibold text-white">
            {formatValue(value)}
          </span>
          {change !== null && change !== undefined && (
            <div className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-gray-400"
            )}>
              {change > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : change < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <div className="w-3 h-3" /> /* Empty space for 0% change */
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
        
        {/* Subtle background pattern on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#1a1a1a] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none" />
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
    // Calculate profitability metrics
    const revenue = metaMetrics.roas * metaMetrics.adSpend
    const profit = revenue - metaMetrics.adSpend
    const profitMargin = metaMetrics.adSpend > 0 ? (profit / revenue) * 100 : 0

    return (
      <div className="relative bg-gradient-to-br from-[#0f0f0f]/50 to-[#1a1a1a]/50 backdrop-blur-xl border border-[#333]/50 rounded-3xl overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0a0a0a]/80 to-[#141414]/80 backdrop-blur-xl border-b border-[#333]/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl
                              flex items-center justify-center border border-[#333]/50 shadow-lg backdrop-blur-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Profitability Dashboard
                  </h2>
                  <p className="text-gray-400 text-sm">Real-time performance metrics across all campaigns</p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-400">Live Data</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6 space-y-6">

            {/* Primary KPI Cards - Profitability Focus */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Profit Card - Most Important */}
              <div className="group relative bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl p-6 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 mb-1">Today's Profit</div>
                    <div className={`text-xs font-medium ${profit >= 0 ? 'text-green-400' : 'text-red-400'} flex items-center gap-1`}>
                      {profit >= 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3" />
                          +{profitMargin.toFixed(1)}%
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3" />
                          {profitMargin.toFixed(1)}%
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className={`text-3xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${Math.abs(profit).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-400">
                    Revenue: ${revenue.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* ROAS Card - Key Performance Indicator */}
              <div className="group relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6 hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 mb-1">ROAS Change</div>
                    <div className={`text-xs font-medium ${metaMetrics.roasGrowth >= 0 ? 'text-green-400' : 'text-red-400'} flex items-center gap-1`}>
                      {metaMetrics.roasGrowth >= 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3" />
                          +{Math.abs(metaMetrics.roasGrowth || 0).toFixed(1)}%
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3" />
                          {Math.abs(metaMetrics.roasGrowth || 0).toFixed(1)}%
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className={`text-3xl font-bold ${metaMetrics.roas >= 2 ? 'text-green-400' : metaMetrics.roas >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {metaMetrics.roas.toFixed(2)}x
                  </div>
                  <div className="text-sm text-gray-400">
                    Break-even at 1.0x
                  </div>
                </div>
              </div>

              {/* Spend Efficiency Card */}
              <div className="group relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                    <MousePointer className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 mb-1">CTR Change</div>
                    <div className={`text-xs font-medium ${metaMetrics.ctrGrowth >= 0 ? 'text-green-400' : 'text-red-400'} flex items-center gap-1`}>
                      {metaMetrics.ctrGrowth >= 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3" />
                          +{Math.abs(metaMetrics.ctrGrowth || 0).toFixed(1)}%
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3" />
                          {Math.abs(metaMetrics.ctrGrowth || 0).toFixed(1)}%
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-purple-400">
                    {metaMetrics.ctr.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-400">
                    CPC: ${metaMetrics.cpc.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Budget Utilization Card */}
              <div className="group relative bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-6 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 mb-1">Budget Used</div>
                    <div className={`text-xs font-medium ${budgetData.budgetUsedPercentage <= 80 ? 'text-green-400' : budgetData.budgetUsedPercentage <= 95 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {budgetData.budgetUsedPercentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-orange-400">
                    ${budgetData.totalSpend.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-400">
                    of ${budgetData.totalBudget.toFixed(0)} budget
                  </div>
                </div>
                {/* Budget Progress Bar */}
                <div className="mt-3 w-full bg-gray-800/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      budgetData.budgetUsedPercentage <= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                      budgetData.budgetUsedPercentage <= 95 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                      'bg-gradient-to-r from-red-500 to-pink-500'
                    }`}
                    style={{ width: `${Math.min(budgetData.budgetUsedPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Secondary Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">Impressions</div>
                <div className="text-lg font-semibold text-white">{metaMetrics.impressions.toLocaleString()}</div>
                <div className={`text-xs ${metaMetrics.impressionGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {metaMetrics.impressionGrowth >= 0 ? '+' : ''}{metaMetrics.impressionGrowth?.toFixed(1) || 0}%
                </div>
              </div>

              <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">Clicks</div>
                <div className="text-lg font-semibold text-white">{metaMetrics.clicks.toLocaleString()}</div>
                <div className={`text-xs ${metaMetrics.clickGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {metaMetrics.clickGrowth >= 0 ? '+' : ''}{metaMetrics.clickGrowth?.toFixed(1) || 0}%
                </div>
              </div>

              <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">Conversions</div>
                <div className="text-lg font-semibold text-white">{metaMetrics.conversions.toLocaleString()}</div>
                <div className={`text-xs ${metaMetrics.conversionGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {metaMetrics.conversionGrowth >= 0 ? '+' : ''}{metaMetrics.conversionGrowth?.toFixed(1) || 0}%
                </div>
              </div>

              <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">Frequency</div>
                <div className="text-lg font-semibold text-white">{metaMetrics.frequency.toFixed(2)}</div>
                <div className="text-xs text-gray-500">Avg per user</div>
              </div>
            </div>

            {/* Platform Status */}
            <div className="bg-[#0f0f0f]/30 border border-[#333]/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-300">Platform Status</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Image src="https://i.imgur.com/6hyyRrs.png" alt="Meta" width={16} height={16} className="object-contain" />
                      <span className="text-xs text-green-400 font-medium">Meta Active</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-50">
                      <Image src="https://i.imgur.com/AXHa9UT.png" alt="TikTok" width={16} height={16} className="object-contain grayscale" />
                      <span className="text-xs text-gray-500">TikTok Coming Soon</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-50">
                      <Image src="https://i.imgur.com/TavV4UJ.png" alt="Google" width={16} height={16} className="object-contain grayscale" />
                      <span className="text-xs text-gray-500">Google Ads Coming Soon</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
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