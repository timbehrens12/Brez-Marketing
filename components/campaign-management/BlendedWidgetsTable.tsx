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

// Modern metric card component with enhanced design
function ModernMetricCard({
  icon: Icon,
  iconBg,
  title,
  value,
  change,
  prefix,
  suffix,
  decimals = 0,
  isPercentage = false,
  customContent,
  platforms,
  priority = false
}: {
  icon: any
  iconBg: string
  title: string
  value: number
  change: number | null
  prefix?: string
  suffix?: string
  decimals?: number
  isPercentage?: boolean
  customContent?: React.ReactNode
  platforms: { name: string; icon: string; value: string | number; active: boolean }[]
  priority?: boolean
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
    <div className={cn(
      "relative group overflow-hidden rounded-2xl border transition-all duration-500 hover:scale-[1.02]",
      priority 
        ? "bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent border-blue-500/20 hover:border-blue-400/40 shadow-lg hover:shadow-blue-500/10" 
        : "bg-gradient-to-br from-[#161b22] via-[#1c2128] to-[#0d1117] border-[#30363d] hover:border-[#444c56]"
    )}>
      {/* Background glow effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent"></div>
      {priority && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
      )}
      
      <div className="relative p-6 space-y-4">
        {/* Header with icon and platforms */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("relative p-3 rounded-xl", iconBg)}>
              <Icon className="w-5 h-5 text-white" />
              {priority && (
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl animate-pulse"></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{title}</h3>
              <div className="flex items-center gap-2 mt-1">
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
                                ? "opacity-100 hover:scale-110" 
                                : "grayscale opacity-30"
                            )}
                          />
                          {platform.active && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full border border-[#161b22]" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="bottom" 
                        className="bg-[#0d1117] border border-[#30363d] text-white p-3 rounded-xl shadow-2xl max-w-xs"
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
                            <span className="font-medium text-white text-sm">{platform.name}</span>
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full",
                              platform.active 
                                ? "bg-green-500/20 text-green-300" 
                                : "bg-gray-500/20 text-gray-400"
                            )}>
                              {platform.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-300">
                            {title}: <span className="text-white font-medium">{platform.value}</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Value and change */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <span className={cn(
              "font-bold tracking-tight",
              priority ? "text-3xl text-white" : "text-2xl text-white"
            )}>
              {formatValue(value)}
            </span>
            {change !== null && change !== undefined && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                change > 0 
                  ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                  : change < 0 
                  ? "bg-red-500/20 text-red-300 border border-red-500/30" 
                  : "bg-gray-500/20 text-gray-300 border border-gray-500/30"
              )}>
                {change > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : change < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : null}
                <span>{change === 0 ? "0.0%" : `${Math.abs(change).toFixed(1)}%`}</span>
              </div>
            )}
          </div>
          
          {/* Custom content */}
          {customContent && (
            <div className="pt-2 border-t border-[#30363d]">
              {customContent}
            </div>
          )}
        </div>

        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
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
    <div className="h-full">
      {/* Hero metrics - key performance indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ModernMetricCard
          icon={DollarSign}
          iconBg="bg-gradient-to-br from-green-500/20 to-emerald-600/20"
          title="Total Spend"
          value={metaMetrics.adSpend}
          change={metaMetrics.adSpendGrowth}
          prefix="$"
          decimals={2}
          priority={true}
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
        
        <ModernMetricCard
          icon={Target}
          iconBg="bg-gradient-to-br from-purple-500/20 to-indigo-600/20"
          title="ROAS"
          value={metaMetrics.roas}
          change={metaMetrics.roasGrowth}
          suffix="x"
          decimals={2}
          priority={true}
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
      </div>

      {/* Budget overview */}
      <div className="mb-6">
        <ModernMetricCard
          icon={CreditCard}
          iconBg="bg-gradient-to-br from-orange-500/20 to-red-600/20"
          title="Budget Usage"
          value={budgetData.budgetUsedPercentage / 100}
          change={null}
          isPercentage={true}
          decimals={1}
          customContent={
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-300">
                <span>Spend: <span className="text-white font-medium">${budgetData.totalSpend.toFixed(2)}</span></span>
                <span>Budget: <span className="text-white font-medium">${budgetData.totalBudget.toFixed(2)}</span></span>
              </div>
              <div className="w-full bg-[#30363d] rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${Math.min(budgetData.budgetUsedPercentage, 100)}%` }}
                />
              </div>
              {budgetData.budgetUsedPercentage > 80 && (
                <div className="flex items-center gap-2 text-orange-300 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>High budget usage detected</span>
                </div>
              )}
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

      {/* Secondary metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ModernMetricCard
          icon={CreditCard}
          iconBg="bg-gradient-to-br from-cyan-500/20 to-blue-600/20"
          title="Revenue"
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
        
        <ModernMetricCard
          icon={Target}
          iconBg="bg-gradient-to-br from-pink-500/20 to-rose-600/20"
          title="Conversions"
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

        <ModernMetricCard
          icon={Eye}
          iconBg="bg-gradient-to-br from-teal-500/20 to-cyan-600/20"
          title="Impressions"
          value={metaMetrics.impressions}
          change={metaMetrics.impressionGrowth}
          decimals={0}
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
        
        <ModernMetricCard
          icon={MousePointer}
          iconBg="bg-gradient-to-br from-violet-500/20 to-purple-600/20"
          title="Clicks"
          value={metaMetrics.clicks}
          change={metaMetrics.clickGrowth}
          decimals={0}
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
      </div>

      {/* Efficiency metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ModernMetricCard
          icon={PercentIcon}
          iconBg="bg-gradient-to-br from-yellow-500/20 to-orange-600/20"
          title="CTR"
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
        
        <ModernMetricCard
          icon={DollarSign}
          iconBg="bg-gradient-to-br from-lime-500/20 to-green-600/20"
          title="CPC"
          value={metaMetrics.cpc}
          change={metaMetrics.cpcGrowth}
          prefix="$"
          decimals={2}
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
  )
} 