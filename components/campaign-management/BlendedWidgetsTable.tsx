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

// Modern metric card component
function ModernMetricCard({
  icon: Icon,
  title,
  value,
  change,
  color,
  iconColor,
  compact = false
}: {
  icon: any
  title: string
  value: string
  change: number | null
  color: string
  iconColor: string
  compact?: boolean
}) {
  return (
    <div className={cn(
      "relative bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#333] rounded-xl hover:border-[#444] transition-all duration-300 group overflow-hidden",
      compact ? "p-4" : "p-5"
    )}>
      {/* Background gradient */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", color)}></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("bg-gradient-to-br rounded-lg flex items-center justify-center", color, compact ? "w-8 h-8" : "w-10 h-10")}>
            <Icon className={cn("text-current", compact ? "w-4 h-4" : "w-5 h-5", iconColor)} />
          </div>
          
          {change !== null && change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-black/20",
              change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-gray-400"
            )}>
              {change > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : change < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : null}
              <span>{change === 0 ? "0.0%" : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}</span>
            </div>
          )}
        </div>
        
        <div>
          <p className={cn("text-gray-400 mb-1", compact ? "text-xs" : "text-sm")}>{title}</p>
          <p className={cn("font-bold text-white", compact ? "text-lg" : "text-2xl")}>{value}</p>
        </div>
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
    <div className="relative bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A] border border-[#1a1a1a] rounded-2xl h-full flex flex-col overflow-hidden">
      {/* Modern header with glass effect */}
      <div className="relative bg-gradient-to-r from-[#0f0f0f]/80 to-[#1a1a1a]/80 backdrop-blur-xl p-6 border-b border-[#222]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl 
                          flex items-center justify-center border border-blue-500/20 shadow-lg">
              <Layers className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Performance Metrics</h2>
              <p className="text-gray-400 text-sm">Multi-platform advertising insights</p>
            </div>
          </div>
          
          {/* Live status indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400">Live Data</span>
          </div>
        </div>
      </div>

      {/* Modern content with better spacing */}
      <div className="flex-1 p-4 overflow-auto">
        {/* Dynamic masonry-style grid */}
        <div className="grid grid-cols-6 gap-3 h-full">
          
          {/* Hero metric - Budget Usage (large, spans 3 cols) */}
          <div className="col-span-3 row-span-2">
            <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#333] rounded-xl p-6 h-full hover:border-[#444] transition-all duration-300 group overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Budget Usage</h3>
                      <p className="text-xs text-gray-400">Daily spend tracking</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-6 h-6 rounded-md overflow-hidden">
                      <Image src="https://i.imgur.com/6hyyRrs.png" alt="Meta" width={24} height={24} className="object-contain" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="text-4xl font-bold text-white">
                    {(budgetData.budgetUsedPercentage).toFixed(1)}%
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Spent Today</span>
                      <span className="text-white font-medium">${budgetData.totalSpend.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Daily Budget</span>
                      <span className="text-white font-medium">${budgetData.totalBudget.toFixed(2)}</span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-[#333] rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(budgetData.budgetUsedPercentage, 100)}%` }}
                      />
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      {budgetData.budgetUsedPercentage > 80 ? "⚠️ High usage" : 
                       budgetData.budgetUsedPercentage > 50 ? "✅ On track" : "📊 Low usage"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Spend & ROAS - Medium cards */}
          <div className="col-span-2">
            <ModernMetricCard
              icon={DollarSign}
              title="Total Spend"
              value={`$${metaMetrics.adSpend.toFixed(2)}`}
              change={metaMetrics.adSpendGrowth}
              color="from-green-500/20 to-emerald-600/20"
              iconColor="text-green-400"
            />
          </div>
          
          <div className="col-span-1">
            <ModernMetricCard
              icon={Target}
              title="ROAS"
              value={`${metaMetrics.roas.toFixed(2)}x`}
              change={metaMetrics.roasGrowth}
              color="from-orange-500/20 to-red-600/20"
              iconColor="text-orange-400"
              compact
            />
          </div>

          {/* Revenue - spans 2 cols */}
          <div className="col-span-2">
            <ModernMetricCard
              icon={CreditCard}
              title="Revenue Generated"
              value={`$${(metaMetrics.roas * metaMetrics.adSpend).toFixed(2)}`}
              change={metaMetrics.roasGrowth}
              color="from-purple-500/20 to-pink-600/20"
              iconColor="text-purple-400"
            />
          </div>
          
          {/* Conversions - compact */}
          <div className="col-span-1">
            <ModernMetricCard
              icon={Target}
              title="Conversions"
              value={metaMetrics.conversions.toLocaleString()}
              change={metaMetrics.conversionGrowth}
              color="from-cyan-500/20 to-blue-600/20"
              iconColor="text-cyan-400"
              compact
            />
          </div>

          {/* Bottom row - smaller metrics */}
          <div className="col-span-2">
            <ModernMetricCard
              icon={Eye}
              title="Impressions"
              value={metaMetrics.impressions.toLocaleString()}
              change={metaMetrics.impressionGrowth}
              color="from-gray-500/20 to-slate-600/20"
              iconColor="text-gray-400"
            />
          </div>
          
          <div className="col-span-2">
            <ModernMetricCard
              icon={MousePointer}
              title="Clicks"
              value={metaMetrics.clicks.toLocaleString()}
              change={metaMetrics.clickGrowth}
              color="from-indigo-500/20 to-blue-600/20"
              iconColor="text-indigo-400"
            />
          </div>

          <div className="col-span-1">
            <ModernMetricCard
              icon={PercentIcon}
              title="CTR"
              value={`${metaMetrics.ctr.toFixed(2)}%`}
              change={metaMetrics.ctrGrowth}
              color="from-yellow-500/20 to-orange-600/20"
              iconColor="text-yellow-400"
              compact
            />
          </div>
          
          <div className="col-span-1">
            <ModernMetricCard
              icon={DollarSign}
              title="CPC"
              value={`$${metaMetrics.cpc.toFixed(2)}`}
              change={metaMetrics.cpcGrowth}
              color="from-rose-500/20 to-pink-600/20"
              iconColor="text-rose-400"
              compact
            />
          </div>

        </div>
        </div>
      </div>
    </div>
  )
} 