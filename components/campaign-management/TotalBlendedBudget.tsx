"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DollarSign, TrendingUp, AlertTriangle } from "lucide-react"
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'
import { getStandardSupabaseClient } from '@/lib/utils/unified-supabase'

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

export default function TotalBlendedBudget() {
  const { contextBrands } = useBrandContext()
  const { userId } = useAuth()
  const [budgetData, setBudgetData] = useState<BudgetData>({
    totalBudget: 0,
    totalSpend: 0,
    budgetUsedPercentage: 0,
    brands: []
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId || !contextBrands?.length) return

    const fetchBudgetData = async () => {
      try {
        setIsLoading(true)
        const supabase = getStandardSupabaseClient()

        // Get brand budgets
        const { data: brandBudgets, error: budgetError } = await supabase
          .from('brand_budgets')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)

        if (budgetError) throw budgetError

        // Get today's spend data for each brand
        const today = new Date().toISOString().split('T')[0]
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

        let totalBudget = 0
        let totalSpend = 0
        const brandData: BudgetData['brands'] = []

        for (const brand of contextBrands) {
          // Find budget for this brand
          const brandBudget = brandBudgets?.find(b => b.brand_id === brand.brand_id)
          const dailyBudget = brandBudget?.daily_budget || 0

          // Get today's spend
          const { data: metaData, error: metaError } = await supabase
            .from('meta_ad_insights')
            .select('spend')
            .eq('brand_id', brand.brand_id)
            .gte('date_start', today)
            .lt('date_start', tomorrow)

          if (metaError) {
            console.error('Error fetching Meta data for brand:', brand.brand_id, metaError)
          }

          const brandSpend = metaData?.reduce((sum, row) => sum + (parseFloat(row.spend) || 0), 0) || 0

          totalBudget += dailyBudget
          totalSpend += brandSpend

          if (dailyBudget > 0) {
            brandData.push({
              brand_id: brand.brand_id,
              brand_name: brand.brand_name,
              budget: dailyBudget,
              spend: brandSpend,
              percentage: (brandSpend / dailyBudget) * 100
            })
          }
        }

        setBudgetData({
          totalBudget,
          totalSpend,
          budgetUsedPercentage: totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0,
          brands: brandData
        })

      } catch (error) {
        console.error('Error fetching budget data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBudgetData()
  }, [userId, contextBrands])

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-orange-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <AlertTriangle className="w-4 h-4 text-red-500" />
    if (percentage >= 75) return <TrendingUp className="w-4 h-4 text-orange-500" />
    return <DollarSign className="w-4 h-4 text-green-500" />
  }

  if (isLoading) {
    return (
      <Card className="w-full bg-[#111] border-[#222]">
        <CardHeader className="pb-4">
          <div className="h-6 bg-[#333] rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-[#333] rounded animate-pulse"></div>
            <div className="h-6 bg-[#333] rounded animate-pulse"></div>
            <div className="h-4 bg-[#333] rounded animate-pulse w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full bg-[#111] border-[#222] hover:border-[#333] transition-colors">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-white text-lg">
          {getStatusIcon(budgetData.budgetUsedPercentage)}
          Total Blended Budget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main budget info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-white">
              ${budgetData.totalSpend.toFixed(2)} / ${budgetData.totalBudget.toFixed(2)}
            </p>
            <p className="text-sm text-gray-400">
              {budgetData.budgetUsedPercentage.toFixed(1)}% of daily budget used
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Remaining</p>
            <p className="text-lg font-semibold text-white">
              ${Math.max(0, budgetData.totalBudget - budgetData.totalSpend).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress 
            value={Math.min(100, budgetData.budgetUsedPercentage)} 
            className="h-3 bg-[#222]"
          />
          
          {/* Individual brand breakdown */}
          {budgetData.brands.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-medium">Brand Breakdown:</p>
              <div className="grid grid-cols-1 gap-1">
                {budgetData.brands.slice(0, 3).map((brand) => (
                  <div key={brand.brand_id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 truncate flex-1 mr-2">
                      {brand.brand_name}
                    </span>
                    <span className="text-white font-medium">
                      ${brand.spend.toFixed(0)}/${brand.budget.toFixed(0)}
                    </span>
                    <span className={`ml-2 px-1 py-0.5 rounded text-[10px] font-medium ${
                      brand.percentage >= 90 ? 'bg-red-500/20 text-red-400' :
                      brand.percentage >= 75 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {brand.percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
                {budgetData.brands.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{budgetData.brands.length - 3} more brands
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status message */}
        {budgetData.budgetUsedPercentage >= 90 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-red-400 text-sm font-medium">⚠️ Budget Alert</p>
            <p className="text-red-300 text-xs">You've used {budgetData.budgetUsedPercentage.toFixed(1)}% of your daily budget</p>
          </div>
        )}
        
        {budgetData.totalBudget === 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-400 text-sm font-medium">💡 Set Budget Limits</p>
            <p className="text-blue-300 text-xs">Configure daily budgets for your brands to track spending</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
