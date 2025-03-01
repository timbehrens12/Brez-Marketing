import React, { useState, useEffect } from 'react'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/formatters'
import { fetchMetaMetrics } from '@/lib/services/meta-service'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MetaBaselineMetricsProps {
  brandId: string
}

const MetaBaselineMetrics: React.FC<MetaBaselineMetricsProps> = ({ brandId }) => {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchMetaMetrics(brandId)
        setMetrics(data)
      } catch (err) {
        console.error('Error loading Meta metrics:', err)
        setError('Failed to load Meta metrics')
      } finally {
        setLoading(false)
      }
    }

    if (brandId) {
      loadMetrics()
    }
  }, [brandId])

  // Helper function to render growth indicators
  const renderGrowth = (value: number) => {
    if (value === 0) return null
    
    const arrow = value > 0 ? '▲' : '▼'
    const colorClass = value > 0 ? 'text-green-500' : 'text-red-500'
    
    return (
      <span className={`flex items-center ${colorClass} text-xs ml-2`}>
        <span className="mr-1">{arrow}</span>
        {formatPercentage(Math.abs(value))}
      </span>
    )
  }

  // Helper function to render a metric item
  const renderMetricItem = (
    label: string, 
    value: string | number | null, 
    growth: number = 0,
    isPercentage: boolean = false,
    isCurrency: boolean = false
  ) => {
    return (
      <div className="flex flex-col py-3 border-b border-gray-700 last:border-0">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">{label}</span>
          <div className="flex items-center">
            <span className="font-medium">
              {loading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                isPercentage 
                  ? formatPercentage(value as number) 
                  : isCurrency 
                    ? formatCurrency(value as number)
                    : formatNumber(value as number)
              )}
            </span>
            {!loading && renderGrowth(growth)}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Meta Ads Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Meta Ads Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        {renderMetricItem('Budget', metrics?.budget, 0, false, true)}
        {renderMetricItem('Amount Spent', metrics?.adSpend, metrics?.adSpendGrowth, false, true)}
        {renderMetricItem('Purchase ROAS', metrics?.roas, metrics?.roasGrowth, false, false)}
        {renderMetricItem('Conversion Value', metrics?.roas * metrics?.adSpend, 0, false, true)}
        {renderMetricItem('Results', metrics?.conversions, metrics?.conversionGrowth, false, false)}
        {renderMetricItem('Cost per Result', metrics?.costPerResult, metrics?.cprGrowth, false, true)}
        {renderMetricItem('CPC (Link)', metrics?.cpcLink, 0, false, true)}
        {renderMetricItem('CTR', metrics?.ctr, metrics?.ctrGrowth, true, false)}
        {renderMetricItem('Frequency', metrics?.frequency, 0, false, false)}
      </CardContent>
    </Card>
  )
}

export default MetaBaselineMetrics 