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
    return (
      <div className="relative">
        {/* Modern Glass-morphism Card Container */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Animated Header Gradient */}
          <div className="relative bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 p-6 border-b border-white/10">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/10 rounded-xl
                              flex items-center justify-center border border-white/20 shadow-lg backdrop-blur-sm">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Performance Dashboard</h2>
                  <p className="text-blue-200 text-sm">Real-time blended metrics across all platforms</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full backdrop-blur-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-emerald-300 text-sm font-medium">Live Data</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {/* Budget Overview Card - Hero Style */}
            <div className="mb-8">
              <div className="relative backdrop-blur-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-6 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg flex items-center justify-center border border-emerald-500/30">
                        <CreditCard className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Budget Performance</h3>
                        <p className="text-slate-400 text-sm">Daily spending vs. budget allocation</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-1">
                        ${(budgetData.totalSpend || 0).toFixed(0)}
                      </div>
                      <div className="text-slate-400 text-sm">Spent Today</div>
                    </div>

                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-1">
                        ${(budgetData.totalBudget || 0).toFixed(0)}
                      </div>
                      <div className="text-slate-400 text-sm">Daily Budget</div>
                    </div>

                    <div className="text-center">
                      <div className="text-3xl font-bold mb-1"
                           style={{ color: budgetData.budgetUsedPercentage > 90 ? '#ef4444' :
                                          budgetData.budgetUsedPercentage > 75 ? '#f59e0b' : '#10b981' }}>
                        {budgetData.budgetUsedPercentage.toFixed(1)}%
                      </div>
                      <div className="text-slate-400 text-sm">Budget Used</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-400">Budget Utilization</span>
                      <span className="text-sm font-medium text-white">{budgetData.budgetUsedPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${Math.min(budgetData.budgetUsedPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Ad Spend */}
              <div className="group relative backdrop-blur-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-5 hover:border-green-400/30 transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-green-400" />
                    </div>
                    {metaMetrics.adSpendGrowth !== null && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        (metaMetrics.adSpendGrowth || 0) > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(metaMetrics.adSpendGrowth || 0) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(metaMetrics.adSpendGrowth || 0).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">${metaMetrics.adSpend.toFixed(0)}</div>
                  <div className="text-sm text-slate-400">Ad Spend</div>
                </div>
              </div>

              {/* ROAS */}
              <div className="group relative backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5 hover:border-purple-400/30 transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                    </div>
                    {metaMetrics.roasGrowth !== null && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        (metaMetrics.roasGrowth || 0) > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(metaMetrics.roasGrowth || 0) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(metaMetrics.roasGrowth || 0).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{metaMetrics.roas.toFixed(2)}x</div>
                  <div className="text-sm text-slate-400">ROAS</div>
                </div>
              </div>

              {/* Impressions */}
              <div className="group relative backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-5 hover:border-blue-400/30 transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Eye className="w-4 h-4 text-blue-400" />
                    </div>
                    {metaMetrics.impressionGrowth !== null && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        (metaMetrics.impressionGrowth || 0) > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(metaMetrics.impressionGrowth || 0) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(metaMetrics.impressionGrowth || 0).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{(metaMetrics.impressions / 1000).toFixed(0)}K</div>
                  <div className="text-sm text-slate-400">Impressions</div>
                </div>
              </div>

              {/* Conversions */}
              <div className="group relative backdrop-blur-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-5 hover:border-orange-400/30 transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-orange-400" />
                    </div>
                    {metaMetrics.conversionGrowth !== null && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        (metaMetrics.conversionGrowth || 0) > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(metaMetrics.conversionGrowth || 0) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(metaMetrics.conversionGrowth || 0).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{metaMetrics.conversions}</div>
                  <div className="text-sm text-slate-400">Conversions</div>
                </div>
              </div>

              {/* CTR */}
              <div className="group relative backdrop-blur-xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 rounded-xl p-5 hover:border-indigo-400/30 transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                      <Percent className="w-4 h-4 text-indigo-400" />
                    </div>
                    {metaMetrics.ctrGrowth !== null && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        (metaMetrics.ctrGrowth || 0) > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(metaMetrics.ctrGrowth || 0) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(metaMetrics.ctrGrowth || 0).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{metaMetrics.ctr.toFixed(2)}%</div>
                  <div className="text-sm text-slate-400">CTR</div>
                </div>
              </div>

              {/* CPC */}
              <div className="group relative backdrop-blur-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-5 hover:border-yellow-400/30 transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-yellow-400" />
                    </div>
                    {metaMetrics.cpcGrowth !== null && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        (metaMetrics.cpcGrowth || 0) < 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(metaMetrics.cpcGrowth || 0) < 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(metaMetrics.cpcGrowth || 0).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">${metaMetrics.cpc.toFixed(2)}</div>
                  <div className="text-sm text-slate-400">CPC</div>
                </div>
              </div>

              {/* Clicks */}
              <div className="group relative backdrop-blur-xl bg-gradient-to-br from-teal-500/10 to-green-500/10 border border-teal-500/20 rounded-xl p-5 hover:border-teal-400/30 transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-green-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center">
                      <MousePointer className="w-4 h-4 text-teal-400" />
                    </div>
                    {metaMetrics.clickGrowth !== null && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        (metaMetrics.clickGrowth || 0) > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(metaMetrics.clickGrowth || 0) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(metaMetrics.clickGrowth || 0).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{metaMetrics.clicks.toLocaleString()}</div>
                  <div className="text-sm text-slate-400">Clicks</div>
                </div>
              </div>

              {/* Frequency */}
              <div className="group relative backdrop-blur-xl bg-gradient-to-br from-slate-500/10 to-gray-500/10 border border-slate-500/20 rounded-xl p-5 hover:border-slate-400/30 transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-gray-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-slate-500/20 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{metaMetrics.frequency.toFixed(2)}</div>
                  <div className="text-sm text-slate-400">Frequency</div>
                </div>
              </div>
            </div>

            {/* Platform Status Footer */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <Image src="https://i.imgur.com/6hyyRrs.png" alt="Meta" width={20} height={20} className="object-contain" />
                  <span className="text-sm text-green-400 font-medium">Meta Active</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center gap-2">
                  <Image src="https://i.imgur.com/AXHa9UT.png" alt="TikTok" width={20} height={20} className="object-contain grayscale opacity-50" />
                  <span className="text-sm text-slate-500">TikTok</span>
                </div>
                <div className="flex items-center gap-2">
                  <Image src="https://i.imgur.com/TavV4UJ.png" alt="Google" width={20} height={20} className="object-contain grayscale opacity-50" />
                  <span className="text-sm text-slate-500">Google Ads</span>
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