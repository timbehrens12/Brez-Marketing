'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Target, ShoppingCart, MousePointerClick, Eye, Users, TrendingUp, BarChart3 } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import BrandSelector from '@/components/BrandSelector'

interface MetaMetrics {
  totalSpend: number
  totalRevenue: number
  roas: number
  totalConversions: number
  cpc: number
  cpm: number
  ctr: number
  totalImpressions: number
  totalClicks: number
  totalReach: number
  frequency: number
  costPerConversion: number
}

interface MetricWidgetProps {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
}

function MetricWidget({ title, value, icon: Icon, change, changeType }: MetricWidgetProps) {
  const changeColor = changeType === 'positive' ? 'text-green-400' : 
                     changeType === 'negative' ? 'text-red-400' : 'text-gray-400'
  
  return (
    <Card className="bg-[#111] border-[#333] shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Icon className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">{title}</p>
              <p className="text-xl font-bold text-white">{value}</p>
            </div>
          </div>
          {change && (
            <div className={`text-xs font-medium ${changeColor}`}>
              {change}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MarketingPage() {
  const { userId } = useAuth()
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<MetaMetrics>({
    totalSpend: 0,
    totalRevenue: 0,
    roas: 0,
    totalConversions: 0,
    cpc: 0,
    cpm: 0,
    ctr: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalReach: 0,
    frequency: 0,
    costPerConversion: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetrics() {
      if (!selectedBrandId) return
      
      try {
        setLoading(true)
        const response = await fetch(`/api/analytics/meta?brandId=${selectedBrandId}`)
        const result = await response.json()
        
        if (result.error) {
          throw new Error(result.error)
        }
        
        if (result.data && result.data.length > 0) {
          const data = result.data
          
          // Calculate aggregated metrics
          const totalSpend = data.reduce((sum: number, item: any) => sum + (item.spend || 0), 0)
          const totalImpressions = data.reduce((sum: number, item: any) => sum + (item.impressions || 0), 0)
          const totalClicks = data.reduce((sum: number, item: any) => sum + (item.clicks || 0), 0)
          const totalReach = data.reduce((sum: number, item: any) => sum + (item.reach || 0), 0)
          const totalFrequency = data.reduce((sum: number, item: any) => sum + (item.frequency || 0), 0)
          
          // Calculate conversions from actions
          const totalConversions = data.reduce((sum: number, item: any) => {
            if (item.actions && Array.isArray(item.actions)) {
              const purchases = item.actions.filter((action: any) => 
                action.action_type === 'purchase' || 
                action.action_type === 'offsite_conversion.fb_pixel_purchase'
              )
              return sum + purchases.reduce((actionSum: number, action: any) => 
                actionSum + parseInt(action.value || '0'), 0)
            }
            return sum
          }, 0)
          
          // Calculate revenue from action_values
          const totalRevenue = data.reduce((sum: number, item: any) => {
            if (item.action_values && Array.isArray(item.action_values)) {
              const purchaseValues = item.action_values.filter((action: any) => 
                action.action_type === 'purchase' || 
                action.action_type === 'offsite_conversion.fb_pixel_purchase'
              )
              return sum + purchaseValues.reduce((valueSum: number, action: any) => 
                valueSum + parseFloat(action.value || '0'), 0)
            }
            return sum
          }, 0)
          
          // Calculate derived metrics
          const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
          const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
          const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
          const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
          const costPerConversion = totalConversions > 0 ? totalSpend / totalConversions : 0
          const frequency = totalReach > 0 ? totalImpressions / totalReach : totalFrequency / data.length
          
          setMetrics({
            totalSpend,
            totalRevenue,
            roas,
            totalConversions,
            cpc,
            cpm,
            ctr,
            totalImpressions,
            totalClicks,
            totalReach,
            frequency,
            costPerConversion
          })
        } else {
          // Set default values if no data
          setMetrics({
            totalSpend: 0,
            totalRevenue: 0,
            roas: 0,
            totalConversions: 0,
            cpc: 0,
            cpm: 0,
            ctr: 0,
            totalImpressions: 0,
            totalClicks: 0,
            totalReach: 0,
            frequency: 0,
            costPerConversion: 0
          })
        }
      } catch (err) {
        console.error('Error fetching metrics:', err)
        setError('Failed to load marketing metrics')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [selectedBrandId])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const formatDecimal = (value: number) => {
    return value.toFixed(2)
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400">Please sign in to access the marketing dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Marketing Dashboard</h1>
            <p className="text-gray-400 mt-2">Monitor your Meta advertising performance</p>
          </div>
          <BrandSelector 
            selectedBrandId={selectedBrandId} 
            onSelect={setSelectedBrandId}
          />
        </div>

        {!selectedBrandId ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Please select a brand to view marketing metrics</p>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-[#111] border-[#333] rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-[#222] rounded mb-2"></div>
                    <div className="h-6 bg-[#222] rounded"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-400">
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
                <MetricWidget
                  title="Total Spend"
                  value={formatCurrency(metrics.totalSpend)}
                  icon={DollarSign}
                />
                <MetricWidget
                  title="ROAS"
                  value={formatDecimal(metrics.roas)}
                  icon={TrendingUp}
                />
                <MetricWidget
                  title="Conversions"
                  value={formatNumber(metrics.totalConversions)}
                  icon={ShoppingCart}
                />
                <MetricWidget
                  title="CPC"
                  value={formatCurrency(metrics.cpc)}
                  icon={MousePointerClick}
                />
                <MetricWidget
                  title="CPM"
                  value={formatCurrency(metrics.cpm)}
                  icon={Target}
                />
                <MetricWidget
                  title="CTR"
                  value={formatPercentage(metrics.ctr)}
                  icon={BarChart3}
                />
                <MetricWidget
                  title="Impressions"
                  value={formatNumber(metrics.totalImpressions)}
                  icon={Eye}
                />
                <MetricWidget
                  title="Clicks"
                  value={formatNumber(metrics.totalClicks)}
                  icon={MousePointerClick}
                />
                <MetricWidget
                  title="Reach"
                  value={formatNumber(metrics.totalReach)}
                  icon={Users}
                />
                <MetricWidget
                  title="Frequency"
                  value={formatDecimal(metrics.frequency)}
                  icon={BarChart3}
                />
                <MetricWidget
                  title="Cost/Conversion"
                  value={formatCurrency(metrics.costPerConversion)}
                  icon={Target}
                />
                <MetricWidget
                  title="Revenue"
                  value={formatCurrency(metrics.totalRevenue)}
                  icon={DollarSign}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 