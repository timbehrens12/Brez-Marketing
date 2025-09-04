"use client"

import { useState, useEffect } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import Image from "next/image"
import { TrendingUp, TrendingDown, DollarSign, Target, Eye, MousePointer, PercentIcon, CreditCard, Layers, AlertTriangle } from "lucide-react"
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
  metaMetrics
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



  return (
    <div className="h-full space-y-6 animate-in fade-in duration-500">
      {/* Hero Metrics - Hexagonal Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Primary Spend Metric - Large Hexagon */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="relative bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center border border-blue-500/30">
                <DollarSign className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Spend</div>
                <div className="text-3xl font-bold text-white">${metaMetrics.adSpend?.toFixed(2) || '0.00'}</div>
                {metaMetrics.adSpendGrowth !== null && (
                  <div className={`flex items-center justify-end gap-1 text-sm font-medium ${
                    metaMetrics.adSpendGrowth > 0 ? 'text-green-400' : metaMetrics.adSpendGrowth < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {metaMetrics.adSpendGrowth > 0 ? <TrendingUp className="w-4 h-4" /> : 
                     metaMetrics.adSpendGrowth < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                    {Math.abs(metaMetrics.adSpendGrowth).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Image src="https://i.imgur.com/6hyyRrs.png" alt="Meta" width={24} height={24} className="rounded-lg" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Meta</span>
                    <span className="text-sm font-medium text-white">${metaMetrics.adSpend?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                    <div className="bg-blue-400 h-1 rounded-full w-full"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 opacity-40">
                <Image src="https://i.imgur.com/AXHa9UT.png" alt="TikTok" width={24} height={24} className="rounded-lg grayscale" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">TikTok</span>
                    <span className="text-sm text-gray-500">$0.00</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1 mt-1"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary ROAS Metric - Large Hexagon */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="relative bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center border border-green-500/30">
                <Target className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total ROAS</div>
                <div className="text-3xl font-bold text-white">{metaMetrics.roas?.toFixed(2) || '0.00'}x</div>
                {metaMetrics.roasGrowth !== null && (
                  <div className={`flex items-center justify-end gap-1 text-sm font-medium ${
                    metaMetrics.roasGrowth > 0 ? 'text-green-400' : metaMetrics.roasGrowth < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {metaMetrics.roasGrowth > 0 ? <TrendingUp className="w-4 h-4" /> : 
                     metaMetrics.roasGrowth < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                    {Math.abs(metaMetrics.roasGrowth).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Image src="https://i.imgur.com/6hyyRrs.png" alt="Meta" width={24} height={24} className="rounded-lg" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Meta</span>
                    <span className="text-sm font-medium text-white">{metaMetrics.roas?.toFixed(2) || '0.00'}x</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                    <div className="bg-green-400 h-1 rounded-full w-full"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 opacity-40">
                <Image src="https://i.imgur.com/TavV4UJ.png" alt="Google" width={24} height={24} className="rounded-lg grayscale" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Google</span>
                    <span className="text-sm text-gray-500">0.00x</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1 mt-1"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Circular Progress Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {/* Budget Usage - Circular Progress */}
        <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(budgetData.budgetUsedPercentage / 100, 1))}`}
                    className="text-orange-400 transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{budgetData.budgetUsedPercentage.toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Budget Used</div>
              <div className="text-sm text-gray-300">${budgetData.totalSpend.toFixed(2)} / ${budgetData.totalBudget.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Conversions - Circular Progress */}
        <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min((metaMetrics.conversions || 0) / 100, 1))}`}
                    className="text-purple-400 transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Conversions</div>
              <div className="text-lg font-bold text-white">{metaMetrics.conversions?.toLocaleString() || '0'}</div>
              {metaMetrics.conversionGrowth !== null && (
                <div className={`text-xs font-medium ${
                  metaMetrics.conversionGrowth > 0 ? 'text-green-400' : metaMetrics.conversionGrowth < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {metaMetrics.conversionGrowth > 0 ? '+' : ''}{metaMetrics.conversionGrowth.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Revenue - Circular Progress */}
        <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(((metaMetrics.roas || 0) * (metaMetrics.adSpend || 0)) / 1000, 1))}`}
                    className="text-cyan-400 transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Revenue</div>
              <div className="text-lg font-bold text-white">${((metaMetrics.roas || 0) * (metaMetrics.adSpend || 0)).toFixed(2)}</div>
              {metaMetrics.roasGrowth !== null && (
                <div className={`text-xs font-medium ${
                  metaMetrics.roasGrowth > 0 ? 'text-green-400' : metaMetrics.roasGrowth < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {metaMetrics.roasGrowth > 0 ? '+' : ''}{metaMetrics.roasGrowth.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Bottom Row - Compact Metrics */}
      <div className="grid grid-cols-4 gap-3">
        {/* Impressions */}
        <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
              <Eye className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 uppercase tracking-wider">Impressions</div>
              <div className="text-sm font-bold text-white truncate">{metaMetrics.impressions?.toLocaleString() || '0'}</div>
              {metaMetrics.impressionGrowth !== null && (
                <div className={`text-xs font-medium ${
                  metaMetrics.impressionGrowth > 0 ? 'text-green-400' : metaMetrics.impressionGrowth < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {metaMetrics.impressionGrowth > 0 ? '+' : ''}{metaMetrics.impressionGrowth.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clicks */}
        <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500/20 to-rose-600/20 flex items-center justify-center border border-rose-500/30">
              <MousePointer className="w-5 h-5 text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 uppercase tracking-wider">Clicks</div>
              <div className="text-sm font-bold text-white truncate">{metaMetrics.clicks?.toLocaleString() || '0'}</div>
              {metaMetrics.clickGrowth !== null && (
                <div className={`text-xs font-medium ${
                  metaMetrics.clickGrowth > 0 ? 'text-green-400' : metaMetrics.clickGrowth < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {metaMetrics.clickGrowth > 0 ? '+' : ''}{metaMetrics.clickGrowth.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTR */}
        <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center border border-amber-500/30">
              <PercentIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 uppercase tracking-wider">CTR</div>
              <div className="text-sm font-bold text-white truncate">{(metaMetrics.ctr || 0).toFixed(2)}%</div>
              {metaMetrics.ctrGrowth !== null && (
                <div className={`text-xs font-medium ${
                  metaMetrics.ctrGrowth > 0 ? 'text-green-400' : metaMetrics.ctrGrowth < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {metaMetrics.ctrGrowth > 0 ? '+' : ''}{metaMetrics.ctrGrowth.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CPC */}
        <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center border border-emerald-500/30">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 uppercase tracking-wider">CPC</div>
              <div className="text-sm font-bold text-white truncate">${(metaMetrics.cpc || 0).toFixed(2)}</div>
              {metaMetrics.cpcGrowth !== null && (
                <div className={`text-xs font-medium ${
                  metaMetrics.cpcGrowth > 0 ? 'text-red-400' : metaMetrics.cpcGrowth < 0 ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {metaMetrics.cpcGrowth > 0 ? '+' : ''}{metaMetrics.cpcGrowth.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 