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
}

export default function BlendedWidgetsTable({ 
  metaMetrics
}: BlendedWidgetsTableProps) {
  
  const { selectedBrand } = useBrandContext()
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
      
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('monthly_budget')
        .eq('id', brand.id)
        .single()

      if (brandError) {
        console.error(`[BlendedWidgets] Error fetching budget for brand ${brand.name}:`, brandError)
        return
      }

      const monthlyBudget = brandData?.monthly_budget || 0
      totalBudget += monthlyBudget

      brandBudgets.push({
        brand_id: brand.id,
        brand_name: brand.name,
        budget: monthlyBudget,
        spend: totalSpend,
        percentage: monthlyBudget > 0 ? (totalSpend / monthlyBudget) * 100 : 0
      })

      const budgetUsedPercentage = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0

      setBudgetData({
        totalBudget,
        totalSpend,
        budgetUsedPercentage,
        brands: brandBudgets
      })
    } catch (error) {
      console.error('[BlendedWidgets] Error in fetchBudgetData:', error)
      setBudgetData({
        totalBudget: 0,
        totalSpend: 0,
        budgetUsedPercentage: 0,
        brands: []
      })
    }
  }

  return (
    <div className="relative bg-gradient-to-br from-[#0f0f0f] via-[#111] to-[#0a0a0a] border border-[#333]/50 rounded-2xl shadow-2xl backdrop-blur-sm h-full flex flex-col">
      {/* Modern Header */}
      <div className="p-6 border-b border-[#333]/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl 
                        flex items-center justify-center border border-blue-500/20">
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Blended Performance Metrics</h2>
            <p className="text-gray-400 text-sm">Key indicators from all platforms</p>
          </div>
        </div>
      </div>

      {/* Modern Grid Content */}
      <div className="flex-1 p-6">
        {/* Hero Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Spend */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#333]/30 rounded-xl p-4 hover:border-[#444]/50 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-gray-300">Spend</span>
            </div>
            <div className="text-2xl font-bold text-white">${metaMetrics.adSpend.toFixed(2)}</div>
            {metaMetrics.adSpendGrowth !== null && (
              <div className={cn("flex items-center gap-1 text-xs mt-1", 
                metaMetrics.adSpendGrowth > 0 ? "text-red-400" : "text-green-400")}>
                {metaMetrics.adSpendGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{Math.abs(metaMetrics.adSpendGrowth).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* ROAS */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#333]/30 rounded-xl p-4 hover:border-[#444]/50 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">ROAS</span>
            </div>
            <div className="text-2xl font-bold text-white">{metaMetrics.roas.toFixed(2)}x</div>
            {metaMetrics.roasGrowth !== null && (
              <div className={cn("flex items-center gap-1 text-xs mt-1", 
                metaMetrics.roasGrowth > 0 ? "text-green-400" : "text-red-400")}>
                {metaMetrics.roasGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{Math.abs(metaMetrics.roasGrowth).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* Impressions */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#333]/30 rounded-xl p-4 hover:border-[#444]/50 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Impressions</span>
            </div>
            <div className="text-2xl font-bold text-white">{metaMetrics.impressions.toLocaleString()}</div>
            {metaMetrics.impressionGrowth !== null && (
              <div className={cn("flex items-center gap-1 text-xs mt-1", 
                metaMetrics.impressionGrowth > 0 ? "text-green-400" : "text-red-400")}>
                {metaMetrics.impressionGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{Math.abs(metaMetrics.impressionGrowth).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* CTR */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#333]/30 rounded-xl p-4 hover:border-[#444]/50 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <MousePointer className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-gray-300">CTR</span>
            </div>
            <div className="text-2xl font-bold text-white">{metaMetrics.ctr.toFixed(2)}%</div>
            {metaMetrics.ctrGrowth !== null && (
              <div className={cn("flex items-center gap-1 text-xs mt-1", 
                metaMetrics.ctrGrowth > 0 ? "text-green-400" : "text-red-400")}>
                {metaMetrics.ctrGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{Math.abs(metaMetrics.ctrGrowth).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Budget Usage - Full width modern card */}
        <div className="bg-gradient-to-r from-[#1a1a1a] via-[#1a1a1a] to-[#111] border border-[#333]/30 rounded-xl p-5 hover:border-[#444]/50 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <h3 className="text-base font-semibold text-white">Budget Usage</h3>
            </div>
            <div className="text-sm text-gray-400">
              ${budgetData.totalSpend.toFixed(2)} / ${budgetData.totalBudget.toFixed(2)}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-[#111] rounded-lg h-3 mb-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg transition-all duration-500"
              style={{ width: `${Math.min(budgetData.budgetUsedPercentage, 100)}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{budgetData.budgetUsedPercentage.toFixed(1)}% used</span>
            <span className={cn("font-medium", 
              budgetData.budgetUsedPercentage > 90 ? "text-red-400" : 
              budgetData.budgetUsedPercentage > 75 ? "text-yellow-400" : "text-green-400"
            )}>
              ${(budgetData.totalBudget - budgetData.totalSpend).toFixed(2)} remaining
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}